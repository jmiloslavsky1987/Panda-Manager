import { getDashboardData } from '../lib/queries';
import { HealthCard } from '../components/HealthCard';
import { ActivityFeed } from '../components/ActivityFeed';
import { QuickActionBar } from '../components/QuickActionBar';
import { NotificationBadge } from '../components/NotificationBadge';
import { DraftsInbox } from '../components/DraftsInbox';

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="p-6 space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <NotificationBadge count={data.notifications.overdueCount} />
      </div>

      {/* Briefing panel — DASH-01 */}
      <section data-testid="briefing-panel" className="rounded-lg border bg-white p-4">
        <h2 className="font-medium text-zinc-700 mb-2">Today&apos;s Briefing</h2>
        <p className="text-zinc-500 text-sm italic">No briefing generated yet — available in Phase 5.</p>
      </section>

      {/* Health cards grid — DASH-02/03 */}
      <section>
        <h2 className="font-medium text-zinc-700 mb-4">Project Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.projects.map(p => <HealthCard key={p.id} project={p} />)}
        </div>
        {data.projects.length === 0 && (
          <p className="text-zinc-500">No active projects found.</p>
        )}
      </section>

      {/* Quick Action Bar — DASH-07 */}
      <section>
        <h2 className="font-medium text-zinc-700 mb-4">Quick Actions</h2>
        <QuickActionBar projects={data.projects} />
      </section>

      {/* Recent Activity Feed — DASH-06 */}
      <section>
        <h2 className="font-medium text-zinc-700 mb-4">Recent Activity (last 7 days)</h2>
        <ActivityFeed items={data.recentActivity} />
      </section>

      {/* Approaching go-live notices — supplementary for DASH-08 */}
      {data.notifications.approachingGoLive.length > 0 && (
        <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-yellow-800 font-medium">
            Go-live within 14 days: {data.notifications.approachingGoLive.join(', ')}
          </p>
        </section>
      )}

      {/* Drafts Inbox — DASH-09 */}
      <DraftsInbox />
    </div>
  );
}
