// client/src/components/StatusBadge.jsx — UI-01
// CRITICAL: NEVER construct class names dynamically ('bg-' + color + '-100').
// Tailwind v4 purges dynamically constructed strings. All class strings must be complete literals.
import clsx from 'clsx';

const VARIANTS = {
  on_track:  'bg-green-100 text-green-800',
  at_risk:   'bg-yellow-100 text-yellow-800',
  off_track: 'bg-red-100 text-red-800',
  // History entry status aliases
  green:     'bg-green-100 text-green-800',
  yellow:    'bg-yellow-100 text-yellow-800',
  red:       'bg-red-100 text-red-800',
  // Milestone/risk status values
  not_started:  'bg-gray-100 text-gray-600',
  in_progress:  'bg-blue-100 text-blue-800',
  complete:     'bg-green-100 text-green-800',
  completed:    'bg-green-100 text-green-800',
  delayed:      'bg-orange-100 text-orange-800',
  open:         'bg-yellow-100 text-yellow-800',
  closed:       'bg-gray-100 text-gray-600',
  mitigated:    'bg-blue-100 text-blue-800',
  high:         'bg-red-100 text-red-800',
  medium:       'bg-yellow-100 text-yellow-800',
  low:          'bg-gray-100 text-gray-600',
};

const LABELS = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
  green: 'On Track',
  yellow: 'At Risk',
  red: 'Off Track',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
  completed: 'Completed',
  delayed: 'Delayed',
  open: 'Open',
  closed: 'Closed',
  mitigated: 'Mitigated',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export default function StatusBadge({ status }) {
  const cls = VARIANTS[status] ?? 'bg-gray-100 text-gray-600';
  const label = LABELS[status] ?? status;
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      cls
    )}>
      {label}
    </span>
  );
}
