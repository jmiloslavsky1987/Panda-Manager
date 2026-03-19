import Link from 'next/link';
import { getActiveProjects } from '../lib/queries';
import { SidebarProjectItem } from './SidebarProjectItem';

export async function Sidebar() {
  const projects = await getActiveProjects();

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
      </nav>
    </aside>
  );
}
