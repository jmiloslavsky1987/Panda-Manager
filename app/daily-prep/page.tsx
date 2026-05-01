'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { DailyPrepCard, EventCardState, Project } from '@/components/DailyPrepCard';
import { CalendarEventItem } from '@/app/api/time-entries/calendar-import/route';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbBriefs {
  [eventId: string]: { content: string; generatedAt: string; };
}

// matchedStakeholders per event: attendees with their freebusy status
type MatchedStakeholderMap = Record<string, Array<{ email: string; name: string }>>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailyPrepPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [cards, setCards] = useState<EventCardState[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [matchedStakeholderMap, setMatchedStakeholderMap] = useState<MatchedStakeholderMap>({});
  const [scopeBanner, setScopeBanner] = useState(false);

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
        const list = Array.isArray(data) ? data : (data?.projects ?? []);
        setProjects(list);
      })
      .catch(() => {/* non-critical */});
  }, []);

  // ── Fetch events when date changes (and calendar is connected) ────────────
  useEffect(() => {
    if (connected === null || connected === false) return;

    let cancelled = false;
    setLoading(true);

    async function loadEvents() {
      try {
        const [eventsData, storedBriefs] = await Promise.all([
          fetch(`/api/time-entries/calendar-import?date=${selectedDate}`).then((r) => r.json()),
          fetch(`/api/daily-prep/briefs?date=${selectedDate}`)
            .then((r) => r.json())
            .catch(() => ({} as DbBriefs)),
        ]);
        const events: CalendarEventItem[] = eventsData;
        const stored: DbBriefs = storedBriefs;

        if (cancelled) return;

        const initialCards: EventCardState[] = events.map((event) => ({
          event,
          selectedProjectId: event.matched_project_id,
          selected: false,
          briefStatus: stored[event.event_id] ? 'done' : 'idle',
          briefContent: stored[event.event_id]?.content ?? null,
          expanded: !!stored[event.event_id],
          availability: {},
        }));

        if (!cancelled) setCards(initialCards);
      } catch {
        if (!cancelled) setCards([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => { cancelled = true; };
  }, [selectedDate, connected]);

  // ── Freebusy fetch — runs after events are loaded ──────────────────────────
  useEffect(() => {
    if (cards.length === 0) return;

    // Collect timed events (all-day events have no dateTime)
    const eventsForFreebusy = cards
      .filter((c) => c.event.start_datetime && c.event.end_datetime)
      .map((c) => ({
        event_id: c.event.event_id,
        start_datetime: c.event.start_datetime,
        end_datetime: c.event.end_datetime,
        // Use all attendees directly, capped at 10 to stay within Google API limits
        attendee_emails: (c.event.attendee_emails ?? []).slice(0, 10),
        attendee_names: c.event.attendee_names ?? [],
      }));

    if (eventsForFreebusy.length === 0) return;

    // Build per-event matched map: all attendees with name fallback to email prefix
    const newMatchedMap: MatchedStakeholderMap = {};
    const allAttendeeEmails = new Set<string>();

    for (const ev of eventsForFreebusy) {
      const matched: Array<{ email: string; name: string }> = [];
      ev.attendee_emails.forEach((email, idx) => {
        const lower = email.toLowerCase();
        const name = ev.attendee_names[idx] ?? lower.split('@')[0];
        matched.push({ email: lower, name });
        allAttendeeEmails.add(lower);
      });
      newMatchedMap[ev.event_id] = matched;
    }

    if (allAttendeeEmails.size === 0) return;

    let cancelled = false;

    async function runFreebusy() {
      try {
        setMatchedStakeholderMap(newMatchedMap);

        // Set availability to 'loading' for all attendees
        setCards((prev) =>
          prev.map((c) => {
            const matched = newMatchedMap[c.event.event_id] ?? [];
            if (matched.length === 0) return c;
            const loadingMap: Record<string, 'free' | 'busy' | 'loading' | 'unknown'> = {};
            for (const { email } of matched) loadingMap[email] = 'loading';
            return { ...c, availability: loadingMap };
          }),
        );

        // POST to freebusy API
        const res = await fetch('/api/calendar/freebusy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            events: eventsForFreebusy.map((e) => ({
              event_id: e.event_id,
              start_datetime: e.start_datetime,
              end_datetime: e.end_datetime,
            })),
            stakeholder_emails: [...allAttendeeEmails],
          }),
        });

        if (cancelled) return;

        const data = await res.json();

        if (data.error === 'scope_insufficient') {
          setScopeBanner(true);
          setCards((prev) => prev.map((c) => ({ ...c, availability: {} })));
          return;
        }

        if (data.error === 'not_connected') {
          setCards((prev) => prev.map((c) => ({ ...c, availability: {} })));
          return;
        }

        // Success — update per-card availability maps
        if (!cancelled) {
          setCards((prev) =>
            prev.map((c) => {
              const eventResult = data[c.event.event_id];
              if (!eventResult) return c;
              const newAvail: Record<string, 'free' | 'busy' | 'loading' | 'unknown'> = { ...c.availability };
              for (const [email, status] of Object.entries(eventResult)) {
                newAvail[email] = status as 'free' | 'busy';
              }
              return { ...c, availability: newAvail };
            }),
          );
        }
      } catch {
        if (!cancelled) {
          setCards((prev) => prev.map((c) => ({ ...c, availability: {} })));
        }
      }
    }

    runFreebusy();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, selectedDate]);

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
        let lineBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          // Keep the last (possibly incomplete) line in the buffer
          lineBuffer = lines.pop() ?? '';
          for (const line of lines) {
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
              // Brief is now persisted to DB by the generate route — no localStorage write needed
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

  // ── Export handlers ──────────────────────────────────────────────────────

  function handleExportCard(eventId: string) {
    if (typeof window === 'undefined') return;
    const cardEl = document.querySelector(`[data-event-id="${eventId}"]`);
    if (cardEl) cardEl.classList.add('print-target');
    document.body.classList.add('print-single');
    window.print();
    window.addEventListener(
      'afterprint',
      () => {
        document.body.classList.remove('print-single');
        if (cardEl) cardEl.classList.remove('print-target');
      },
      { once: true },
    );
  }

  function handleExportAll() {
    if (typeof window === 'undefined') return;
    document.body.classList.add('printing-all');
    window.print();
    window.addEventListener(
      'afterprint',
      () => {
        document.body.classList.remove('printing-all');
      },
      { once: true },
    );
  }

  const anySelected = cards.some((c) => c.selected);
  const anyLoading = cards.some((c) => c.briefStatus === 'loading');
  const anyDone = cards.some((c) => c.briefStatus === 'done');

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
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-zinc-500">Connect your Google Calendar to use Daily Prep.</p>
          <a
            href="/api/oauth/calendar"
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Connect Google Calendar
          </a>
        </div>
      )}

      {/* Soft banner: scope insufficient for freebusy */}
      {scopeBanner && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <span>Reconnect your Google Calendar to enable availability view.</span>
          <a
            href="/api/oauth/calendar"
            className="underline font-medium shrink-0 hover:text-amber-900"
          >
            Reconnect
          </a>
        </div>
      )}

      {/* Select All + Generate Prep + Export All bar */}
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
          <div className="flex items-center gap-2">
            {anyDone && (
              <button
                onClick={handleExportAll}
                className="no-print text-sm px-3 py-1.5 rounded border border-zinc-300 hover:bg-zinc-50 text-zinc-700"
              >
                Export All
              </button>
            )}
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleGenerate}
                disabled={!anySelected || anyLoading}
                className="no-print text-sm px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
              >
                Generate Prep
              </button>
              {!anySelected && cards.length > 0 && (
                <p className="text-xs text-zinc-400 no-print">Select events above first</p>
              )}
            </div>
          </div>
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
            onExport={handleExportCard}
            matchedStakeholders={matchedStakeholderMap[card.event.event_id]}
          />
        ))}
      </div>
    </div>
  );
}
