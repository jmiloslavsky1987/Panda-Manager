'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from './ui/badge';
import type { SkillMeta } from '../types/skills';
import { PromptEditModal } from './PromptEditModal';
import type { ScheduledJob } from './SchedulerJobRow';
import { SchedulerJobTable } from './SchedulerJobTable';
import { useSearchParams, usePathname } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SkillRun {
  id: number;
  run_id: string;
  project_id: number | null;
  skill_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: string | null;
  full_output: string | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

interface RunningJob {
  runId: string;
  startedAt: Date;
}

interface SkillsTabClientProps {
  projectId: number;
  recentRuns: SkillRun[];
  skills: SkillMeta[];
  promptEditingEnabled: boolean;
  isAdmin: boolean;
  initialJobs: ScheduledJob[];
}

// ── Status badge helpers ───────────────────────────────────────────────────────

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed': return 'default';
    case 'running': return 'secondary';
    case 'failed': return 'destructive';
    default: return 'outline';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'running': return 'Running';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    default: return status;
  }
}

// ── ElapsedTime sub-component ──────────────────────────────────────────────────

function ElapsedTime({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span className="text-xs text-zinc-500">{m}m {s}s</span>;
}

// ── ProjectSchedulerSection sub-component ─────────────────────────────────────

function ProjectSchedulerSection({
  initialJobs,
  projectId,
  isAdmin,
}: {
  initialJobs: ScheduledJob[];
  projectId: number;
  isAdmin: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Live jobs state — seeded from server, refreshed client-side on mount
  // so run history written between navigations is always visible.
  const [liveJobs, setLiveJobs] = useState<ScheduledJob[]>(initialJobs);
  const [tableKey, setTableKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/jobs`)
      .then((r) => r.json())
      .then((data: { jobs?: ScheduledJob[] }) => {
        if (!cancelled && data.jobs) {
          setLiveJobs(data.jobs);
          setTableKey((k) => k + 1); // remount SchedulerJobTable with fresh initialJobs
        }
      })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [projectId]);

  // Expanded row — read from URL param first, then restore from sessionStorage
  // via useEffect (sessionStorage is not available during SSR, so we can't use
  // the useState initializer for it — React reuses the SSR null on hydration).
  const ssKey = `sched_expanded_${projectId}`;
  const [expandedId, setExpandedId] = useState<number | null>(() => {
    const param = searchParams.get('sched_expanded');
    if (param) return parseInt(param, 10);
    return null;
  });

  // Restore expanded row from sessionStorage after hydration
  useEffect(() => {
    if (expandedId === null) {
      try {
        const stored = sessionStorage.getItem(ssKey);
        if (stored) setExpandedId(parseInt(stored, 10));
      } catch { /* non-fatal */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ssKey]);

  function handleToggleExpand(id: number) {
    const newExpandedId = expandedId === id ? null : id;
    setExpandedId(newExpandedId);

    // Persist to sessionStorage so navigation away + back restores expanded row
    try {
      if (newExpandedId !== null) {
        sessionStorage.setItem(ssKey, String(newExpandedId));
      } else {
        sessionStorage.removeItem(ssKey);
      }
    } catch { /* non-fatal */ }

    // Update URL param
    const params = new URLSearchParams(searchParams.toString());
    if (newExpandedId !== null) {
      params.set('sched_expanded', newExpandedId.toString());
    } else {
      params.delete('sched_expanded');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <SchedulerJobTable
      key={tableKey}
      initialJobs={liveJobs}
      projectId={projectId}
      readOnly={!isAdmin}
      expandedId={expandedId}
      onToggleExpand={handleToggleExpand}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const TERMINAL_STATES = new Set(['completed', 'failed', 'cancelled']);

export function SkillsTabClient({ projectId, recentRuns, skills, promptEditingEnabled, isAdmin, initialJobs }: SkillsTabClientProps) {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [liveRecentRuns, setLiveRecentRuns] = useState<SkillRun[]>(recentRuns);

  // Refresh recent runs on mount — bypasses Next.js Router Cache serving stale RSC
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/runs`)
      .then((r) => r.json())
      .then((data: { runs?: SkillRun[] }) => {
        if (!cancelled && data.runs) setLiveRecentRuns(data.runs);
      })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [projectId]);
  const [runningJobs, setRunningJobs] = useState<Map<string, RunningJob>>(new Map());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missingBadge, setMissingBadge] = useState<Set<string>>(new Set());
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [expandedInput, setExpandedInput] = useState<string | null>(null);

  async function triggerSkill(skillName: string) {
    setErrors(prev => { const n = { ...prev }; delete n[skillName]; return n; });
    setMissingBadge(prev => { const n = new Set(prev); n.delete(skillName); return n; });

    try {
      const res = await fetch(`/api/skills/${skillName}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          input: skills.find(s => s.name === skillName)?.inputRequired
            ? { transcript: inputs[skillName] ?? '' }
            : undefined,
        }),
      });

      const data = await res.json() as { runId?: string; error?: string };

      if (res.status === 422) {
        setMissingBadge(prev => new Set(prev).add(skillName));
        setErrors(prev => ({ ...prev, [skillName]: data.error ?? 'SKILL.md not found' }));
        return;
      }

      if (!res.ok || !data.runId) {
        setErrors(prev => ({ ...prev, [skillName]: data.error ?? 'Failed to start skill' }));
        return;
      }

      // Store runId and start tracking progress (no navigation)
      setRunningJobs(prev => {
        const next = new Map(prev);
        next.set(skillName, { runId: data.runId!, startedAt: new Date() });
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setErrors(prev => ({ ...prev, [skillName]: msg }));
    }
  }

  async function cancelJob(skillName: string) {
    const job = runningJobs.get(skillName);
    if (!job) return;
    await fetch(`/api/skills/runs/${job.runId}/cancel`, { method: 'POST' });
    setRunningJobs(prev => {
      const next = new Map(prev);
      next.delete(skillName);
      return next;
    });
    router.refresh();
  }

  // Clear initial loading state after mount (for SSR scenarios where data is already available)
  useEffect(() => {
    if (liveRecentRuns.length > 0) {
      setIsInitialLoading(false);
    }
  }, [liveRecentRuns]);

  // Status polling effect
  useEffect(() => {
    if (runningJobs.size === 0) return;
    const interval = setInterval(async () => {
      for (const [skillName, { runId }] of runningJobs) {
        try {
          const res = await fetch(`/api/skills/runs/${runId}`);
          const data = await res.json();
          if (TERMINAL_STATES.has(data.status)) {
            setRunningJobs(prev => {
              const next = new Map(prev);
              next.delete(skillName);
              return next;
            });
            if (data.status === 'completed') {
              router.push(`/customer/${projectId}/skills/${runId}`);
            } else {
              router.refresh();
            }
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, 5000);
    return () => clearInterval(interval); // CRITICAL: prevent unmount leak
  }, [runningJobs, router]);

  function handleRunClick(skillName: string) {
    const skill = skills.find(s => s.name === skillName);
    if (skill?.inputRequired) {
      if (expandedInput === skillName) {
        // Already expanded — trigger with current input
        triggerSkill(skillName);
        setExpandedInput(null);
      } else {
        setExpandedInput(skillName);
      }
    } else {
      triggerSkill(skillName);
    }
  }

  // Show loading skeleton on initial mount when no data
  if (isInitialLoading) {
    return (
      <div className="p-6 max-w-4xl space-y-3">
        <div className="h-6 w-48 bg-zinc-100 rounded animate-pulse" />
        <div className="h-40 bg-zinc-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* ── Skill list ────────────────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold mb-4">Skills</h2>
      <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden mb-8">
        {skills.map((skill) => {
          const isRunning = runningJobs.has(skill.name);
          const hasError = !!errors[skill.name];
          const hasMissing = missingBadge.has(skill.name);
          const isInputExpanded = expandedInput === skill.name;

          return (
            <div
              key={skill.name}
              data-testid="skill-card"
              data-skill={skill.name}
              className={`flex flex-col gap-2 px-4 py-3 bg-white ${!skill.compliant ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{skill.label}</span>
                  <p className="text-zinc-500 text-xs mt-0.5">{skill.description}</p>
                </div>

                {/* Fix required badge for non-compliant skills */}
                {!skill.compliant && (
                  <span
                    className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full"
                    title="Front-matter missing or invalid — see SKILLS-DESIGN-STANDARD.md"
                  >
                    Fix required
                  </span>
                )}

                {/* Error badge for missing SKILL.md */}
                {hasMissing && (
                  <span
                    data-testid="skill-missing-badge"
                    className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 whitespace-nowrap"
                  >
                    SKILL.md not found
                  </span>
                )}

                {/* Progress indicator + Cancel button for running jobs */}
                {isRunning && (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <ElapsedTime startedAt={runningJobs.get(skill.name)!.startedAt} />
                    <button
                      onClick={() => cancelJob(skill.name)}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      data-testid={`cancel-skill-${skill.name}`}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Edit button — shown for admins when prompt editing is enabled */}
                {promptEditingEnabled && isAdmin && !isRunning && (
                  <PromptEditModal
                    skill={skill}
                    trigger={
                      <button
                        className="shrink-0 text-sm px-2 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition-colors"
                        title={`Edit prompt for ${skill.label}`}
                      >
                        Edit
                      </button>
                    }
                    onSaved={() => { /* no router refresh needed — prompt content only */ }}
                  />
                )}

                {/* Run button — always shown when NOT running (all skills from server are runnable) */}
                {!isRunning && (
                  <button
                    data-run={skill.name}
                    onClick={() => handleRunClick(skill.name)}
                    className="shrink-0 text-sm px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isInputExpanded ? 'Run' : 'Run'}
                  </button>
                )}
              </div>

              {/* Inline input textarea (expand on click for input-required skills) */}
              {skill.inputRequired && isInputExpanded && (
                <textarea
                  autoFocus
                  placeholder={skill.inputLabel ? `${skill.inputLabel}…` : "Paste input here…"}
                  value={inputs[skill.name] ?? ''}
                  onChange={(e) => setInputs(prev => ({ ...prev, [skill.name]: e.target.value }))}
                  className="w-full text-sm p-2 border border-zinc-200 rounded-md resize-y min-h-24 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              )}

              {/* Inline error display */}
              {hasError && !hasMissing && (
                <p className="text-xs text-red-600">{errors[skill.name]}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Recent Runs ───────────────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold mb-3">Recent Runs</h2>
      {liveRecentRuns.length === 0 ? (
        <p className="text-sm text-zinc-500">No runs yet. Select a skill above to get started.</p>
      ) : (
        <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
          {liveRecentRuns.map((run) => (
            <Link
              key={run.run_id}
              href={`/customer/${projectId}/skills/${run.run_id}`}
              className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-zinc-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm capitalize">
                  {run.skill_name.replace(/-/g, ' ')}
                </span>
                <p className="text-zinc-400 text-xs mt-0.5">
                  {new Date(run.created_at).toLocaleString()}
                </p>
              </div>
              <Badge variant={statusVariant(run.status)} className="shrink-0 text-xs">
                {statusLabel(run.status)}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* ── Project Scheduler ───────────────────────────────────────────────── */}
      <div className="mt-8 pt-6 border-t border-zinc-200">
        <h2 className="text-base font-semibold text-zinc-800 mb-4">Project Scheduler</h2>
        <ProjectSchedulerSection initialJobs={initialJobs} projectId={projectId} isAdmin={isAdmin} />
      </div>

    </div>
  );
}
