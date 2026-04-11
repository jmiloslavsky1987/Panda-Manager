'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from './ui/badge';

// ── Skill catalog ──────────────────────────────────────────────────────────────

const WIRED_SKILLS = new Set([
  'weekly-customer-status',
  'meeting-summary',
  'morning-briefing',
  'context-updater',
  'handoff-doc-generator',
  'customer-project-tracker',
  'elt-external-status',       // Phase 7
  'elt-internal-status',       // Phase 7
  'team-engagement-map',       // Phase 7
  'workflow-diagram',          // Phase 7
  // DO NOT add 'biggy-weekly-briefing' — remains grayed out per locked decision
]);

// Skills requiring user-provided input before running
const INPUT_REQUIRED_SKILLS = new Set(['meeting-summary', 'context-updater']);

const ALL_SKILLS = [
  { name: 'weekly-customer-status', label: 'Weekly Customer Status', description: 'Generate a customer-facing weekly status email from project context' },
  { name: 'meeting-summary', label: 'Meeting Summary', description: 'Generate a meeting summary from notes or transcript', inputRequired: 'transcript' },
  { name: 'morning-briefing', label: 'Morning Briefing', description: 'Daily briefing: priorities, overdue items, approaching deadlines' },
  { name: 'context-updater', label: 'Context Updater', description: 'Apply meeting notes to update all 14 project context sections', inputRequired: 'transcript' },
  { name: 'handoff-doc-generator', label: 'Handoff Doc Generator', description: 'Generate a structured handoff/coverage doc' },
  { name: 'elt-external-status', label: 'ELT External Status', description: 'Generate 5-slide external ELT deck (coming soon)' },
  { name: 'elt-internal-status', label: 'ELT Internal Status', description: 'Generate internal ELT status deck (coming soon)' },
  { name: 'team-engagement-map', label: 'Team Engagement Map', description: 'Generate team engagement HTML map (coming soon)' },
  { name: 'workflow-diagram', label: 'Workflow Diagram', description: 'Generate before/after workflow diagram (coming soon)' },
  { name: 'biggy-weekly-briefing', label: 'Biggy Weekly Briefing', description: 'Generate weekly briefing with docx + drafts (coming soon)' },
  { name: 'customer-project-tracker', label: 'Customer Project Tracker', description: 'Sweep Gmail/Slack for updates (requires MCP, coming soon)' },
  { name: 'risk-assessment', label: 'Risk Assessment', description: 'Generate risk assessment report (coming soon)' },
  { name: 'stakeholder-comms', label: 'Stakeholder Comms', description: 'Generate stakeholder communication plan (coming soon)' },
  { name: 'qbr-prep', label: 'QBR Prep', description: 'Generate QBR preparation materials (coming soon)' },
  { name: 'onboarding-checklist', label: 'Onboarding Checklist', description: 'Generate team onboarding checklist (coming soon)' },
];

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

// ── Main component ─────────────────────────────────────────────────────────────

const TERMINAL_STATES = new Set(['completed', 'failed', 'cancelled']);

export function SkillsTabClient({ projectId, recentRuns }: SkillsTabClientProps) {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(false);
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
          input: INPUT_REQUIRED_SKILLS.has(skillName)
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
    if (recentRuns.length > 0) {
      setIsInitialLoading(false);
    }
  }, [recentRuns]);

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
    if (INPUT_REQUIRED_SKILLS.has(skillName)) {
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
        {ALL_SKILLS.map((skill) => {
          const isWired = WIRED_SKILLS.has(skill.name);
          const isRunning = runningJobs.has(skill.name);
          const hasError = !!errors[skill.name];
          const hasMissing = missingBadge.has(skill.name);
          const isInputExpanded = expandedInput === skill.name;

          return (
            <div
              key={skill.name}
              data-testid="skill-card"
              data-skill={skill.name}
              className={`flex flex-col gap-2 px-4 py-3 bg-white ${!isWired ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{skill.label}</span>
                  <p className="text-zinc-500 text-xs mt-0.5">{skill.description}</p>
                </div>

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

                {/* Run button — wired skills only, shown when NOT running */}
                {isWired && !isRunning && (
                  <button
                    data-run={skill.name}
                    onClick={() => handleRunClick(skill.name)}
                    className="shrink-0 text-sm px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isInputExpanded ? 'Run' : 'Run'}
                  </button>
                )}

                {/* Disabled Run button for unwired skills */}
                {!isWired && (
                  <span
                    title="Coming in a future update"
                    className="shrink-0 text-sm px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-400 cursor-not-allowed"
                  >
                    Run
                  </span>
                )}
              </div>

              {/* Inline input textarea (expand on click for input-required skills) */}
              {isWired && INPUT_REQUIRED_SKILLS.has(skill.name) && isInputExpanded && (
                <textarea
                  autoFocus
                  placeholder="Paste transcript or meeting notes here…"
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
      {recentRuns.length === 0 ? (
        <p className="text-sm text-zinc-500">No runs yet. Select a skill above to get started.</p>
      ) : (
        <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
          {recentRuns.map((run) => (
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

    </div>
  );
}
