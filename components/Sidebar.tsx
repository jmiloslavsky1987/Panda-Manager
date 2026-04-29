import Link from 'next/link';
import { getActiveProjects, getArchivedProjects } from '../lib/queries';
import { SidebarProjectItem } from './SidebarProjectItem';
import { SidebarUserIsland } from './SidebarUserIsland';
import { Icon } from './Icon';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { resolveRole } from '@/lib/auth-utils';

export async function Sidebar() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  const isGlobalAdmin = session ? resolveRole(session) === 'admin' : false;

  const [projects, archivedProjects] = await Promise.all([
    getActiveProjects({ userId, isGlobalAdmin }),
    getArchivedProjects(),
  ]);

  return (
    <aside
      data-theme="dark"
      className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40 overflow-hidden"
      style={{ background: 'var(--kata-gray-950)', borderRight: '1px solid var(--kata-gray-800)' }}
    >
      {/* Header: logo + name */}
      <div
        className="flex items-center gap-2 px-4 py-3.5 border-b"
        style={{ borderColor: 'var(--kata-gray-800)' }}
      >
        <span className="text-[22px] font-bold" style={{ color: 'var(--kata-indigo-500)' }}>P</span>
        <span className="font-semibold text-sm text-white">Panda Manager</span>
      </div>

      {/* ⌘K search pill */}
      <div className="px-3 py-2.5">
        <div
          className="flex items-center gap-2 h-7 px-2 rounded-md"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Icon name="search" size={14} className="opacity-40" />
          <span className="text-xs flex-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Jump to…</span>
          <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>⌘K</span>
        </div>
      </div>

      {/* Top nav: Portfolio / Today / Daily Prep */}
      <nav className="px-2 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Icon name="grid_view" size={16} />
          Portfolio
        </Link>
        <Link
          href="/time-tracking"
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Icon name="today" size={16} />
          Today
        </Link>
        <Link
          href="/daily-prep"
          data-testid="sidebar-daily-prep-link"
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Icon name="event_note" size={16} />
          Daily Prep
        </Link>
      </nav>

      {/* Projects section — label must contain "uppercase tracking-wider" */}
      <div className="px-4 mt-4 mb-1">
        <span
          className="text-xs uppercase tracking-wider font-medium"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Projects
        </span>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {projects.map((p) => (
            <SidebarProjectItem key={p.id} project={p} />
          ))}
        </ul>
        {archivedProjects.length > 0 && (
          <details className="px-2 mt-2">
            <summary
              className="px-2 py-1.5 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-white/50 list-none"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Archived ({archivedProjects.length})
            </summary>
            <ul className="space-y-0.5 mt-1">
              {archivedProjects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/customer/${p.id}/overview`}
                    className="flex items-center gap-2.5 px-2 py-2 rounded text-sm transition-colors"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    {p.customer}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Additional nav links */}
      <div className="px-2 pb-1 space-y-0.5 border-t" style={{ borderColor: 'var(--kata-gray-800)' }}>
        <Link
          href="/knowledge-base"
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          data-testid="sidebar-knowledge-base-link"
        >
          <Icon name="book" size={16} />
          Knowledge Base
        </Link>
        <Link
          href="/outputs"
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          data-testid="sidebar-outputs-link"
        >
          <Icon name="library_books" size={16} />
          Outputs
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          data-testid="sidebar-settings-link"
        >
          <Icon name="settings" size={16} />
          Settings
        </Link>
        <Link
          href="/scheduler"
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          data-testid="sidebar-scheduler-link"
        >
          <Icon name="calendar_clock" size={16} />
          Scheduler
        </Link>
        <Link
          href="/time-tracking"
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          data-testid="sidebar-time-tracking-link"
        >
          <Icon name="schedule" size={16} />
          Time Tracking
        </Link>
      </div>

      {/* User footer */}
      <SidebarUserIsland />
    </aside>
  );
}
