'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { DailyPrepCard, EventCardState, Project } from '@/components/DailyPrepCard';
import { CalendarEventItem } from '@/app/api/time-entries/calendar-import/route';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredBriefs {
  [eventId: string]: { content: string; generatedAt: string; };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyPrepPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [cards, setCards] = useState<EventCardState[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Calendar connection status (once on mount) ────────────────────────────
  useEffect(() => {
    fetch('/api/oauth/calendar/status')
      .then((r) => r.json())
      .then((d) => setConnected(d.connected))
      .catch(() => setConnected(false));
  }, []);

  // ── Fetch projects once on mount ──────────────────────────────────────────
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => {/* non-critical */});
  }, []);

  // ── Fetch events when date changes (and calendar is connected) ────────────
  useEffect(() => {
    if (connected === null || connected === false) return;

    setLoading(true);
    fetch(`/api/time-entries/calendar-import?date=${selectedDate}`)
      .then((r) => r.json())
      .then((events: CalendarEventItem[]) => {
        // Load stored briefs from localStorage
        const storageKey = `daily-prep-briefs:${selectedDate}`;
        let stored: StoredBriefs = {};
        try {
          stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
        } catch {/* ignore parse errors */}

        setCards(
          events.map((event) => ({
            event,
            selectedProjectId: event.matched_project_id,
            selected: false,
            briefStatus: stored[event.event_id] ? 'done' : 'idle',
            briefContent: stored[event.event_id]?.content ?? null,
            expanded: !!stored[event.event_id],
          })),
        );
      })
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [selectedDate, connected]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleToggleSelect(eventId: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.event.event_id === eventId ? { ...c, selected: !c.selected } : c,
      ),
    );
  }

  function handleProjectChange(eventId: string, projectId: number | null) {
    setCards((prev) =>
      prev.map((c) =>
        c.event.event_id === eventId ? { ...c, selectedProjectId: projectId } : c,
      ),
    );
  }

  function handleToggleExpand(eventId: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.event.event_id === eventId ? { ...c, expanded: !c.expanded } : c,
      ),
    );
  }

  function handleSelectAll() {
    const allSelected = cards.every((c) => c.selected);
    setCards((prev) => prev.map((c) => ({ ...c, selected: !allSelected })));
  }

  function handleCopy(eventId: string) {
    const card = cards.find((c) => c.event.event_id === eventId);
    if (card?.briefContent) {
      navigator.clipboard.writeText(card.briefContent).catch(() => {/* ignore */});
    }
  }

  async function handleGenerate() {
    const selectedCards = cards.filter((c) => c.selected);
    if (!selectedCards.length) return;

    // Fire all requests in parallel — do NOT await one before starting the next
    selectedCards.forEach(async (card) => {
      const eventId = card.event.event_id;
      const projectId = card.selectedProjectId;

      // Set loading state
      setCards((prev) =>
        prev.map((c) =>
          c.event.event_id === eventId
            ? { ...c, briefStatus: 'loading', briefContent: '' }
            : c,
        ),
      );

      try {
        const response = await fetch('/api/daily-prep/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            eventTitle: card.event.summary,
            projectId,
            attendees: card.event.attendee_names,
            durationHours: card.event.duration_hours,
            recurrenceFlag: card.event.recurrence_flag,
            eventDescription: card.event.event_description,
          }),
        });

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.text) {
                  accumulated += parsed.text;
                  setCards((prev) =>
                    prev.map((c) =>
                      c.event.event_id === eventId
                        ? { ...c, briefContent: accumulated }
                        : c,
                    ),
                  );
                }
              } catch {
                /* incomplete SSE chunk — skip */
              }
            }
            if (line.startsWith('event: done')) {
              setCards((prev) =>
                prev.map((c) =>
                  c.event.event_id === eventId
                    ? { ...c, briefStatus: 'done', selected: false, expanded: true }
                    : c,
                ),
              );
              // Persist to LocalStorage keyed by selectedDate
              const storageKey = `daily-prep-briefs:${selectedDate}`;
              const existing: StoredBriefs = JSON.parse(
                localStorage.getItem(storageKey) ?? '{}',
              );
              existing[eventId] = {
                content: accumulated,
                generatedAt: new Date().toISOString(),
              };
              localStorage.setItem(storageKey, JSON.stringify(existing));
            }
          }
        }
      } catch {
        setCards((prev) =>
          prev.map((c) =>
            c.event.event_id === eventId
              ? { ...c, briefStatus: 'error' }
              : c,
          ),
        );
      }
    });
  }

  const anySelected = cards.some((c) => c.selected);
  const anyLoading = cards.some((c) => c.briefStatus === 'loading');

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Daily Prep</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm border border-zinc-300 rounded px-2 py-1 text-zinc-700"
        />
      </div>

      {/* Not connected state */}
      {connected === false && (
        <p className="text-sm text-zinc-500">
          Connect your Google Calendar to use Daily Prep.{' '}
          <a href="/settings" className="text-blue-600 underline">
            Settings
          </a>
        </p>
      )}

      {/* Select All + Generate Prep bar */}
      {connected && cards.length > 0 && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={cards.every((c) => c.selected)}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600"
            />
            Select All
          </label>
          <button
            onClick={handleGenerate}
            disabled={!anySelected || anyLoading}
            className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Generate Prep
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <p className="text-sm text-zinc-400">Loading events...</p>
      )}

      {/* Empty state */}
      {!loading && connected && cards.length === 0 && (
        <p className="text-sm text-zinc-500">No meetings on {selectedDate}</p>
      )}

      {/* Event cards */}
      <div className="space-y-3">
        {cards.map((card) => (
          <DailyPrepCard
            key={card.event.event_id}
            card={card}
            projects={projects}
            onToggleSelect={handleToggleSelect}
            onProjectChange={handleProjectChange}
            onToggleExpand={handleToggleExpand}
            onCopy={handleCopy}
          />
        ))}
      </div>
    </div>
  );
}
