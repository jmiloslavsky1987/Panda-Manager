'use client'

/**
 * Shared status pill — used by BusinessOutcomesSection (outcome variant)
 * AND MilestoneTrackerSection (milestone variant) for consistent visual
 * vocabulary across all three Teams tab sections (Phase 88.1 G3).
 *
 * Pattern reference: BusinessOutcomesSection STATUS_CONFIG (Plan 02) — outcome variant
 * color tokens preserved verbatim to avoid Plan 02 test regression.
 */

type Variant = 'outcome' | 'milestone'

interface Props {
  variant: Variant
  status: string
}

const OUTCOME_CLASS: Record<string, string> = {
  not_started:        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  in_progress:        'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  partially_achieved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  achieved:           'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  blocked:            'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

const MILESTONE_CLASS: Record<string, string> = {
  complete:    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  on_track:    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  at_risk:     'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  delayed:     'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  missed:      'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  planned:     'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  not_started: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
}

const FALLBACK = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'

function toTitleCase(snake: string): string {
  return snake
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function StatusPill({ variant, status }: Props) {
  const map = variant === 'outcome' ? OUTCOME_CLASS : MILESTONE_CLASS
  const colorClass = map[status] ?? FALLBACK
  return (
    <span
      data-testid={`status-pill-${variant}`}
      data-status={status}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {toTitleCase(status)}
    </span>
  )
}
