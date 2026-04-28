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
  hasTemplate: boolean;
  templateContent: string | null;
  availability: Record<string, 'free' | 'busy' | 'loading' | 'unknown'>;
}

export interface DailyPrepCardProps {
  card: EventCardState;
  projects: Project[];
  onToggleSelect: (eventId: string) => void;
  onProjectChange: (eventId: string, projectId: number | null) => void;
  onToggleExpand: (eventId: string) => void;
  onCopy: (eventId: string) => void;
  onSaveTemplate?: (seriesId: string, content: string) => void;
  onLoadTemplate?: (eventId: string) => void;
  onExport?: (eventId: string) => void;
  matchedStakeholders?: Array<{ email: string; name: string }>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DailyPrepCard({
  card,
  projects,
  onToggleSelect,
  onProjectChange,
  onToggleExpand,
  onCopy,
  onSaveTemplate,
  onLoadTemplate,
  onExport,
  matchedStakeholders,
}: DailyPrepCardProps) {
  const { event } = card;
  const [copied, setCopied] = useState(false);

  // Attendee display: up to 3 names, "+N more" overflow
  const displayAttendees = event.attendee_names.slice(0, 3);
  const overflow = event.attendee_names.length - 3;

  return (
    <div
      className="border border-zinc-200 rounded-lg p-4 bg-white"
      data-testid="daily-prep-card"
      data-event-id={event.event_id}
    >
      {/* Print-only event header — hidden on screen, visible in print output */}
      <div className="hidden print:block mb-2 text-sm font-medium">
        {event.summary} &mdash; {event.start_time}&ndash;{event.end_time} ({event.duration_hours}h)
        {event.attendee_names.length > 0 && (
          <div className="text-xs font-normal text-zinc-600 mt-0.5">
            {event.attendee_names.join(', ')}
          </div>
        )}
      </div>

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

          {/* Availability chips — only when matchedStakeholders non-empty and availability map populated */}
          {matchedStakeholders && matchedStakeholders.length > 0 && Object.keys(card.availability).length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5" data-testid="availability-chips">
              {matchedStakeholders.map(({ email, name }) => {
                const status = card.availability[email] ?? 'unknown';
                const dotColor =
                  status === 'free'
                    ? 'bg-green-500'
                    : status === 'busy'
                    ? 'bg-red-500'
                    : 'bg-zinc-400';
                return (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-50 border border-zinc-200 text-zinc-700"
                    title={`${name} — ${status}`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
                    {name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={() => onToggleExpand(event.event_id)}
          className="text-xs text-zinc-400 hover:text-zinc-600 shrink-0"
        >
          {card.expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Template controls for recurring events (idle/collapsed state) */}
      {event.recurring_event_id !== null && card.hasTemplate && card.briefStatus === 'idle' && (
        <div className="mt-3 border-t border-zinc-100 pt-3" data-testid="brief-section">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-zinc-100 text-zinc-600">
              Template saved
            </span>
            <button
              onClick={() => onLoadTemplate?.(event.event_id)}
              className="text-xs px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
              data-testid="load-template-button"
            >
              Load template
            </button>
          </div>
        </div>
      )}

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
              {/* Template saved badge (recurring events with saved template) */}
              {event.recurring_event_id !== null && card.hasTemplate && (
                <div className="mb-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-zinc-100 text-zinc-600">
                    Template saved
                  </span>
                </div>
              )}
              <div className="prose prose-zinc prose-sm max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{card.briefContent}</ReactMarkdown>
              </div>
              <div className="flex gap-2 mt-2">
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
                {/* Export button — hidden in print, triggers per-card print */}
                <button
                  onClick={() => onExport?.(event.event_id)}
                  className="no-print text-xs text-zinc-500 hover:text-zinc-800 underline"
                >
                  Export
                </button>
                {/* Save as template — only for recurring events that don't yet have a template */}
                {event.recurring_event_id !== null && !card.hasTemplate && (
                  <button
                    onClick={() => onSaveTemplate?.(event.recurring_event_id!, card.briefContent!)}
                    className="no-print text-xs px-2 py-1 rounded bg-green-50 hover:bg-green-100 text-green-700 border border-green-200"
                    data-testid="save-template-button"
                  >
                    Save as template
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
