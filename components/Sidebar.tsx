import Link from 'next/link';
import { BookOpen, CalendarClock, Clock, Library, Settings } from 'lucide-react';
import { getActiveProjects, getArchivedProjects } from '../lib/queries';
import { SidebarProjectItem } from './SidebarProjectItem';
import { SidebarUserIsland } from './SidebarUserIsland';

export async function Sidebar() {
  const [projects, archivedProjects] = await Promise.all([
    getActiveProjects(),
    getArchivedProjects(),
  ]);

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-zinc-900 text-zinc-100 flex flex-col z-40">
      <div className="px-4 py-5 border-b border-zinc-700">
        <span className="font-semibold text-base tracking-tight">BigPanda PS</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-2">
          <Link
            href="/"
            className="block text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1.5 text-sm transition-colors"
          >
            Dashboard
          </Link>
        </div>
        <div className="px-4 mt-4 mb-2">
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
            Projects
          </span>
        </div>
        <ul className="space-y-0.5 px-2">
          {projects.map((p) => (
            <SidebarProjectItem key={p.id} project={p} />
          ))}
        </ul>
        {archivedProjects.length > 0 && (
          <details className="px-2 mt-2">
            <summary className="px-2 py-1.5 text-xs uppercase tracking-wider text-zinc-500 cursor-pointer select-none hover:text-zinc-400 list-none flex items-center justify-between">
              <span>Archived ({archivedProjects.length})</span>
            </summary>
            <ul className="space-y-0.5 mt-1">
              {archivedProjects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/customer/${p.id}/overview`}
                    className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-zinc-800 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
                  >
                    {p.customer}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className="px-4 mt-6 border-t border-zinc-700 pt-4 space-y-1">
          <Link
            href="/knowledge-base"
            className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1.5 text-sm transition-colors"
            data-testid="sidebar-knowledge-base-link"
          >
            <BookOpen className="w-4 h-4" />
            Knowledge Base
          </Link>
          <Link
            href="/outputs"
            className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1.5 text-sm transition-colors"
            data-testid="sidebar-outputs-link"
          >
            <Library className="w-4 h-4" />
            Outputs
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1.5 text-sm transition-colors"
            data-testid="sidebar-settings-link"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <Link
            href="/scheduler"
            className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1.5 text-sm transition-colors"
            data-testid="sidebar-scheduler-link"
          >
            <CalendarClock className="w-4 h-4" />
            Scheduler
          </Link>
          <Link
            href="/time-tracking"
            className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded px-2 py-1.5 text-sm transition-colors"
            data-testid="sidebar-time-tracking-link"
          >
            <Clock className="w-4 h-4" />
            Time Tracking
          </Link>
        </div>
      </nav>
      <SidebarUserIsland />
    </aside>
  );
}
