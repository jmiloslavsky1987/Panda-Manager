import { getDashboardData, getLatestMorningBriefing } from '../lib/queries';
import { HealthCard } from '../components/HealthCard';
import { ActivityFeed } from '../components/ActivityFeed';
import { QuickActionBar } from '../components/QuickActionBar';
import { NotificationBadge } from '../components/NotificationBadge';
import { DraftsInbox } from '../components/DraftsInbox';
import { RiskHeatMap } from '../components/RiskHeatMap';
import { WatchList } from '../components/WatchList';

export default async function DashboardPage() {
  const [data, latestBriefing] = await Promise.all([
    getDashboardData(),
    getLatestMorningBriefing().catch(() => null),
  ]);

  return (
    <div className="p-6 space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <NotificationBadge count={data.notifications.overdueCount} />
      </div>

      {/* Morning Briefing panel — SKILL-11 */}
      <section data-testid="morning-briefing-panel" className="rounded-lg border bg-white p-4">
        <h2 className="font-medium text-zinc-700 mb-2">Morning Briefing</h2>
        {latestBriefing?.full_output ? (
          <p className="text-zinc-700 text-sm whitespace-pre-wrap">{latestBriefing.full_output.slice(0, 500)}{latestBriefing.full_output.length > 500 ? '…' : ''}</p>
        ) : (
          <p className="text-zinc-500 text-sm italic">No briefing yet — will run at 8am</p>
        )}
      </section>

      {/* Cross-Project Risk Heat Map — DASH-04 */}
      <section data-testid="risk-heat-map-section">
        <h2 className="font-medium text-zinc-700 mb-4">Risk Heat Map</h2>
        <RiskHeatMap />
      </section>

      {/* Cross-Account Watch List — DASH-05 */}
      <section data-testid="watch-list-section">
        <h2 className="font-medium text-zinc-700 mb-4">Escalated Risks</h2>
        <WatchList />
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
