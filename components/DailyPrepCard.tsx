'use client'

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { ConfidenceBadge } from './ConfidenceBadge';
import { CalendarEventItem } from '@/app/api/time-entries/calendar-import/route';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Project {
  id: number;
  name: string;
}

export interface EventCardState {
  event: CalendarEventItem;
  selectedProjectId: number | null;
  selected: boolean;
  briefStatus: 'idle' | 'loading' | 'done' | 'error';
  briefContent: string | null;
  expanded: boolean;
  availability: Record<string, 'free' | 'busy' | 'loading' | 'unknown'>;
}

export interface DailyPrepCardProps {
  card: EventCardState;
  projects: Project[];
  onToggleSelect: (eventId: string) => void;
  onProjectChange: (eventId: string, projectId: number | null) => void;
  onToggleExpand: (eventId: string) => void;
  onCopy: (eventId: string) => void;
  onExport?: (eventId: string) => void;
  matchedStakeholders?: Array<{ email: string; name: string }>;
}

const ATTENDEE_DISPLAY_LIMIT = 8;

// ─── Component ───────────────────────────────────────────────────────────────

export function DailyPrepCard({
  card,
  projects,
  onToggleSelect,
  onProjectChange,
  onToggleExpand,
  onCopy,
  onExport,
  matchedStakeholders,
}: DailyPrepCardProps) {
  const { event } = card;
  const [copied, setCopied] = useState(false);

  // Build attendee list for right column: prefer matchedStakeholders (has emails + availability)
  const attendeeList: Array<{ name: string; email?: string }> =
    matchedStakeholders && matchedStakeholders.length > 0
      ? matchedStakeholders
      : event.attendee_names.map((name) => ({ name }));

  const displayAttendees = attendeeList.slice(0, ATTENDEE_DISPLAY_LIMIT);
  const attendeeOverflow = attendeeList.length - ATTENDEE_DISPLAY_LIMIT;

  return (
    <div
      className="border border-zinc-200 rounded-lg p-4 bg-white shadow-sm"
      data-testid="daily-prep-card"
      data-event-id={event.event_id}
    >
      {/* Print-only header */}
      <div className="hidden print:block mb-2 text-sm font-medium">
        {event.summary} &mdash; {event.start_time}&ndash;{event.end_time} ({event.duration_hours}h)
        {event.attendee_names.length > 0 && (
          <div className="text-xs font-normal text-zinc-600 mt-0.5">
            {event.attendee_names.join(', ')}
          </div>
        )}
      </div>

      {/* Main two-column layout */}
      <div className="flex gap-4">

        {/* Left: checkbox + event details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={card.selected}
            onChange={() => onToggleSelect(event.event_id)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 shrink-0"
          />

          <div className="flex-1 min-w-0">
            {/* Title row: time pill + title + duration + badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs tabular-nums px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-mono">
                {event.start_time}&ndash;{event.end_time}
              </span>
              <span className="text-sm font-semibold text-zinc-900">
                {event.summary}
              </span>
              <span className="text-xs text-zinc-400">{event.duration_hours}h</span>
              <ConfidenceBadge confidence={event.match_confidence} />
              {event.recurrence_flag && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-violet-100 text-violet-700">
                  ↻ Recurring
                </span>
              )}
            </div>

            {/* Project dropdown */}
            <div className="mt-2">
              <select
                data-testid="project-dropdown"
                value={card.selectedProjectId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onProjectChange(event.event_id, val ? Number(val) : null);
                }}
                className="text-sm border border-zinc-200 rounded px-2 py-1 bg-white text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">— assign project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expand/collapse */}
          <button
            onClick={() => onToggleExpand(event.event_id)}
            className="text-xs text-zinc-400 hover:text-zinc-600 shrink-0 mt-0.5"
          >
            {card.expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {/* Right: attendees column */}
        {attendeeList.length > 0 && (
          <div className="shrink-0 w-44 border-l border-zinc-100 pl-3">
            <div className="text-[10px] uppercase tracking-wider font-medium text-zinc-400 mb-1.5">
              Attendees
            </div>
            <ul className="space-y-1.5">
              {displayAttendees.map(({ name, email }, idx) => {
                const status = email ? (card.availability[email] ?? 'unknown') : undefined;
                const dotColor =
                  status === 'free' ? 'bg-green-500' :
                  status === 'busy' ? 'bg-red-500' :
                  status === 'loading' ? 'bg-zinc-300 animate-pulse' :
                  'bg-zinc-200';
                return (
                  <li
                    key={idx}
                    className="flex items-center gap-1.5 text-xs text-zinc-600"
                    title={email ? `${name} — ${status}` : name}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${status !== undefined ? dotColor : 'bg-zinc-200'}`} />
                    <span className="truncate">{name}</span>
                  </li>
                );
              })}
              {attendeeOverflow > 0 && (
                <li className="text-xs text-zinc-400 pl-3.5">+{attendeeOverflow} more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Brief section */}
      {(card.briefStatus === 'loading' || card.briefStatus === 'done' || card.briefStatus === 'error') && (
        <div className="mt-3 border-t border-zinc-100 pt-3" data-testid="brief-section" data-print-visible>
          {card.briefStatus === 'loading' && (
            <div className="text-sm text-zinc-500 animate-pulse">Generating brief…</div>
          )}
          {card.briefStatus === 'error' && (
            <div className="text-sm text-red-500">Generation failed. Try again.</div>
          )}
          {card.briefStatus === 'done' && card.expanded && card.briefContent && (
            <>
              <div className="prose prose-zinc prose-sm max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{card.briefContent}</ReactMarkdown>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    onCopy(event.event_id);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="no-print text-xs px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                  data-testid="copy-brief-button"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => onToggleExpand(event.event_id)}
                  className="no-print text-xs px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                >
                  Collapse
                </button>
                <button
                  onClick={() => onExport?.(event.event_id)}
                  className="no-print text-xs text-zinc-500 hover:text-zinc-800 underline"
                >
                  Export
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
