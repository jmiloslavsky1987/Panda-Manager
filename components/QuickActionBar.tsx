import { Button } from '@/components/ui/button';
import type { ProjectWithHealth } from '@/lib/queries';

interface QuickActionBarProps {
  projects: ProjectWithHealth[];
}

const QUICK_ACTIONS = [
  { label: 'Run Tracker' },
  { label: 'Generate Briefing' },
  { label: 'Weekly Status Draft' },
] as const;

export function QuickActionBar({ projects }: QuickActionBarProps) {
  if (projects.length === 0) {
    return (
      <div data-testid="quick-action-bar" className="text-sm text-zinc-400 italic">
        No active projects.
      </div>
    );
  }

  return (
    <div data-testid="quick-action-bar" className="flex flex-col gap-3">
      {projects.map((project) => (
        <div
          key={project.id}
          className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3"
        >
          <span className="text-sm font-medium text-zinc-700 min-w-[120px]">
            {project.customer}
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                disabled
                className="opacity-50 cursor-not-allowed"
                title="Available in Phase 5"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
