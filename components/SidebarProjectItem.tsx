import Link from 'next/link';
import type { ProjectWithHealth } from '../lib/queries';

const ragColorMap: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
};

interface Props {
  project: ProjectWithHealth;
}

export function SidebarProjectItem({ project }: Props) {
  const dotColor = ragColorMap[project.health];

  return (
    <li>
      <Link
        href={`/customer/${project.id}/overview`}
        className="flex items-start gap-2.5 px-2 py-2 rounded hover:bg-zinc-800 transition-colors group"
      >
        <span
          className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`}
          aria-label={`${project.health} status`}
        />
        <div className="min-w-0">
          <p className="text-sm text-zinc-200 group-hover:text-zinc-100 truncate leading-snug">
            {project.customer}
          </p>
          {project.go_live_target && (
            <p className="text-xs text-zinc-500 truncate">
              Go-live: {project.go_live_target}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
