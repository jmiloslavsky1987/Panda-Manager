// CRITICAL: <Outlet /> must be present — missing it produces blank child routes with no error
import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar — implemented in Phase 2 */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 shrink-0">
        <p className="text-sm text-gray-400">Sidebar (Phase 2)</p>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
