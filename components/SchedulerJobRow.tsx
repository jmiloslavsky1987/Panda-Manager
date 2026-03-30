'use client';

/**
 * SchedulerJobRow — individual table row for a scheduled job.
 *
 * Renders all 7 columns, handles inline expand panel, enable/disable toggle,
 * trigger button, delete with confirmation, and run history list.
 * Plan 24-03.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { SKILL_LIST } from '../lib/scheduler-skills';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RunHistoryEntry {
  timestamp: string;
  outcome: 'success' | 'failure' | 'partial';
  duration_ms: number;
  artifact_link: string | null;
  error?: string;
}

export interface ScheduledJob {
  id: number;
  name: string;
  skill_name: string;
  cron_expression: string | null;
  enabled: boolean;
  timezone: string | null;
  skill_params_json: Record<string, unknown>;
  last_run_at: string | null;
  last_run_outcome: 'success' | 'failure' | 'partial' | null;
  run_history_json: RunHistoryEntry[];
  next_run: string | null;
}

interface SchedulerJobRowProps {
  job: ScheduledJob;
  expanded: boolean;
  onToggleExpand: () => void;
  onJobUpdate: (j: ScheduledJob) => void;
  onJobDelete: (id: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSkillLabel(skillId: string): string {
  return SKILL_LIST.find((s) => s.id === skillId)?.label ?? skillId;
}

function formatCron(expr: string | null): string {
  if (!expr) return '—';
  const LABELS: Record<string, string> = {
    '0 8 * * *':   'Daily 8am',
    '0 8 * * 1':   'Weekly Mon 8am',
    '0 8 1 * *':   'Monthly 1st 8am',
    '0 8 * * 1,15':'Bi-weekly',
    '@once':       'Once',
  };
  return LABELS[expr] ?? expr;
}

function formatDatetime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function OutcomeCell({ outcome }: { outcome: ScheduledJob['last_run_outcome'] }) {
  if (outcome === 'success') return <span className="text-green-600 font-medium">&#10003;</span>;
  if (outcome === 'failure') return <span className="text-red-600 font-medium">&#10007;</span>;
  if (outcome === 'partial') return <span className="text-amber-500 font-medium">~</span>;
  return <span className="text-zinc-400">—</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SchedulerJobRow({
  job,
  expanded,
  onToggleExpand,
  onJobUpdate,
  onJobDelete,
}: SchedulerJobRowProps) {
  const [toggling, setToggling] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Enable / Disable toggle ────────────────────────────────────────────────

  async function handleToggleEnabled() {
    const newEnabled = !job.enabled;
    // Optimistic update
    onJobUpdate({ ...job, enabled: newEnabled });
    setToggling(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
      const data = (await res.json()) as { job?: ScheduledJob };
      if (data.job) onJobUpdate(data.job);
    } catch {
      // Revert on error
      onJobUpdate({ ...job, enabled: !newEnabled });
      toast.error('Failed to update job status');
    } finally {
      setToggling(false);
    }
  }

  // ── Trigger button ─────────────────────────────────────────────────────────

  async function handleTrigger() {
    setTriggering(true);
    try {
      const res = await fetch('/api/jobs/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, skillName: job.skill_name }),
      });
      if (!res.ok) throw new Error(`Trigger failed: ${res.status}`);
      toast.success(`Job "${job.name}" triggered successfully`);
    } catch {
      toast.error(`Failed to trigger job "${job.name}"`);
    } finally {
      setTriggering(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
      onJobDelete(job.id);
      toast.success(`Job "${job.name}" deleted`);
    } catch {
      toast.error(`Failed to delete job "${job.name}"`);
      setDeleting(false);
    }
  }

  // ── Run history ────────────────────────────────────────────────────────────

  const runHistory = Array.isArray(job.run_history_json) ? job.run_history_json.slice(0, 10) : [];

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function outcomeLabel(o: RunHistoryEntry['outcome']): string {
    if (o === 'success') return 'success';
    if (o === 'failure') return 'failure';
    return 'partial';
  }

  function outcomeBadgeClass(o: RunHistoryEntry['outcome']): string {
    if (o === 'success') return 'bg-green-100 text-green-700';
    if (o === 'failure') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <tr
        className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
        onClick={onToggleExpand}
        data-testid={`job-row-${job.id}`}
      >
        {/* Expand indicator + Name */}
        <td className="px-3 py-2 text-sm text-zinc-900 font-medium">
          <span className="inline-flex items-center gap-1">
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
            {job.name}
          </span>
        </td>

        {/* Skill */}
        <td className="px-3 py-2 text-sm text-zinc-700">
          {getSkillLabel(job.skill_name)}
        </td>

        {/* Schedule */}
        <td className="px-3 py-2 text-sm text-zinc-500 font-mono">
          {formatCron(job.cron_expression)}
        </td>

        {/* Next Run */}
        <td className="px-3 py-2 text-sm text-zinc-500">
          {formatDatetime(job.next_run)}
        </td>

        {/* Last Outcome */}
        <td className="px-3 py-2 text-sm">
          <OutcomeCell outcome={job.last_run_outcome} />
        </td>

        {/* Enabled toggle */}
        <td
          className="px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            role="switch"
            aria-checked={job.enabled}
            disabled={toggling}
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              job.enabled ? 'bg-blue-600' : 'bg-zinc-300'
            } ${toggling ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
            aria-label={job.enabled ? 'Disable job' : 'Enable job'}
            data-testid={`toggle-${job.id}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                job.enabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </td>

        {/* Trigger button */}
        <td
          className="px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            disabled={triggering}
            onClick={handleTrigger}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-wait transition-colors"
            data-testid={`trigger-${job.id}`}
          >
            {triggering ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Run
          </button>
        </td>
      </tr>

      {/* Expanded panel */}
      {expanded && (
        <tr data-testid={`job-row-${job.id}-expanded`}>
          <td colSpan={7} className="bg-zinc-50 border-b border-zinc-200 px-4 py-3">
            <div className="space-y-3">
              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Edit — stub for Plan 04 */}
                <button
                  disabled
                  className="text-xs px-3 py-1.5 rounded border border-zinc-300 text-zinc-400 cursor-not-allowed"
                  title="Edit (coming in Plan 04)"
                >
                  Edit
                </button>

                {/* Enable / Disable */}
                <button
                  onClick={handleToggleEnabled}
                  disabled={toggling}
                  className="text-xs px-3 py-1.5 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
                >
                  {job.enabled ? 'Disable' : 'Enable'}
                </button>

                {/* Delete */}
                {confirmDelete ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-red-600 font-medium">Are you sure?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Run history */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Run History
                </p>
                {runHistory.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No runs yet.</p>
                ) : (
                  <div
                    className="overflow-y-auto rounded border border-zinc-200 bg-white divide-y divide-zinc-100"
                    style={{ maxHeight: 200 }}
                  >
                    {runHistory.map((entry, idx) => (
                      <div key={idx} className="flex items-start gap-3 px-3 py-2 text-xs">
                        <span className="text-zinc-400 whitespace-nowrap">
                          {formatDatetime(entry.timestamp)}
                        </span>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${outcomeBadgeClass(entry.outcome)}`}
                        >
                          {outcomeLabel(entry.outcome)}
                        </span>
                        <span className="text-zinc-500">{formatDuration(entry.duration_ms)}</span>
                        {entry.artifact_link && (
                          <a
                            href={entry.artifact_link}
                            className="text-blue-600 underline truncate max-w-[120px]"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            output
                          </a>
                        )}
                        {entry.error && (
                          <span className="text-red-500 truncate" title={entry.error}>
                            {entry.error.slice(0, 80)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
