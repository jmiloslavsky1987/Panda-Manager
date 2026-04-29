import Link from 'next/link';
import type { ProjectWithHealth } from '../lib/queries';

const ragColorMap: Record<'green' | 'yellow' | 'red', string> = {
  green: 'var(--kata-status-green)',
  yellow: 'var(--kata-status-amber)',
  red: 'var(--kata-status-red)',
};

interface Props {
  project: ProjectWithHealth;
}

export function SidebarProjectItem({ project }: Props) {
  const dotColor = ragColorMap[project.health] ?? 'rgba(255,255,255,0.3)';

  return (
    <li>
      <Link
        href={`/customer/${project.id}/overview`}
        className="flex items-start gap-2.5 px-2 py-2 rounded transition-colors group"
        style={{ color: 'rgba(255,255,255,0.7)' }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ background: dotColor }}
          aria-label={`${project.health} status`}
        />
        <div className="min-w-0">
          <p
            className="text-sm truncate leading-snug group-hover:text-white transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            {project.customer}
          </p>
          {project.go_live_target && (
            <p
              className="text-xs truncate font-mono"
              style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}
            >
              Go-live: {project.go_live_target}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
