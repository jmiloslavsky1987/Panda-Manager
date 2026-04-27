'use client'

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
}

export interface DailyPrepCardProps {
  card: EventCardState;
  projects: Project[];
  onToggleSelect: (eventId: string) => void;
  onProjectChange: (eventId: string, projectId: number | null) => void;
  onToggleExpand: (eventId: string) => void;
  onCopy: (eventId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DailyPrepCard({
  card,
  projects,
  onToggleSelect,
  onProjectChange,
  onToggleExpand,
  onCopy,
}: DailyPrepCardProps) {
  const { event } = card;

  // Attendee display: up to 3 names, "+N more" overflow
  const displayAttendees = event.attendee_names.slice(0, 3);
  const overflow = event.attendee_names.length - 3;

  return (
    <div
      className="border border-zinc-200 rounded-lg p-4 bg-white"
      data-testid="daily-prep-card"
    >
      {/* Top row: checkbox + time/title/duration + badges */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={card.selected}
          onChange={() => onToggleSelect(event.event_id)}
          className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600"
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Time range */}
            <span className="text-sm text-zinc-500 tabular-nums">
              {event.start_time}&ndash;{event.end_time}
            </span>

            {/* Title */}
            <span className="text-sm font-medium text-zinc-900 truncate">
              {event.summary}
            </span>

            {/* Duration */}
            <span className="text-xs text-zinc-400">
              {event.duration_hours}h
            </span>

            {/* Confidence badge */}
            <ConfidenceBadge confidence={event.match_confidence} />

            {/* Recurring badge */}
            {event.recurrence_flag && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-zinc-100 text-zinc-600">
                Recurring
              </span>
            )}
          </div>

          {/* Second row: project + attendees */}
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {/* Project: dropdown if unmatched, text if matched */}
            {event.matched_project_id === null ? (
              <select
                data-testid="project-dropdown"
                value={card.selectedProjectId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onProjectChange(event.event_id, val ? Number(val) : null);
                }}
                className="text-sm border border-zinc-300 rounded px-2 py-1 bg-white text-zinc-700"
              >
                <option value="">— assign project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-zinc-700 font-medium">
                {event.matched_project_name}
              </span>
            )}

            {/* Attendees */}
            {event.attendee_names.length > 0 && (
              <span className="text-xs text-zinc-500">
                {displayAttendees.join(', ')}
                {overflow > 0 ? ` +${overflow} more` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={() => onToggleExpand(event.event_id)}
          className="text-xs text-zinc-400 hover:text-zinc-600 shrink-0"
        >
          {card.expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Brief section — rendered when expanded (plan 79-04 fills in generation logic) */}
      {card.expanded && (
        <div className="mt-3 border-t border-zinc-100 pt-3" data-testid="brief-section">
          {card.briefStatus === 'loading' && (
            <p className="text-sm text-zinc-400">Generating...</p>
          )}
          {card.briefStatus === 'done' && card.briefContent && (
            <div className="flex items-start justify-between gap-2">
              <div className="prose prose-sm max-w-none text-zinc-700 whitespace-pre-wrap">
                {card.briefContent}
              </div>
              <button
                onClick={() => onCopy(event.event_id)}
                className="text-xs text-zinc-400 hover:text-zinc-600 shrink-0"
              >
                Copy
              </button>
            </div>
          )}
          {card.briefStatus === 'error' && (
            <p className="text-sm text-red-500">Failed to generate brief.</p>
          )}
        </div>
      )}
    </div>
  );
}
