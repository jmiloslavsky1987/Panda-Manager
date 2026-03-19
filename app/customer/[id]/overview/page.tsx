import Link from 'next/link'
import { getWorkspaceData, getProjectWithHealth } from '../../../../lib/queries'
import { Badge } from '../../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'

function stateToColor(state: string | null | undefined): string {
  const s = (state ?? '').toLowerCase()
  if (s.includes('complete') || s.includes('done') || s.includes('closed')) return 'bg-green-500'
  if (s.includes('block')) return 'bg-red-500'
  if (s.includes('progress') || s.includes('active')) return 'bg-blue-500'
  return 'bg-zinc-400'
}

function stateLabel(state: string | null | undefined): string {
  const s = (state ?? '').toLowerCase()
  if (s.includes('complete') || s.includes('done') || s.includes('closed')) return 'Done'
  if (s.includes('block')) return 'Blocked'
  if (s.includes('progress') || s.includes('active')) return 'In Progress'
  if (s) return state!
  return 'Not Started'
}

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const [data, project] = await Promise.all([
    getWorkspaceData(projectId),
    getProjectWithHealth(projectId),
  ])
  const { workstreams, milestones } = data

  // Health banner config
  const healthConfig = {
    green: { label: 'Healthy', banner: 'bg-green-50 border-green-200 text-green-800' },
    yellow: { label: 'At Risk', banner: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
    red: { label: 'Critical', banner: 'bg-red-50 border-red-200 text-red-800' },
  }
  const hc = healthConfig[project.health]

  // Group workstreams by track
  const adrStreams = workstreams.filter((w) => w.track === 'ADR')
  const biggyStreams = workstreams.filter((w) => w.track === 'Biggy')
  const otherStreams = workstreams.filter((w) => w.track !== 'ADR' && w.track !== 'Biggy')

  // 5 most recent milestones by date descending (skip TBD/null)
  const recentMilestones = [...milestones]
    .filter((m) => m.date && m.date.length >= 10 && /^\d{4}/.test(m.date))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 5)

  const milestoneStatusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    not_started: 'bg-zinc-100 text-zinc-700',
    blocked: 'bg-red-100 text-red-800',
  }

  return (
    <div data-testid="overview-tab" className="space-y-6">
      {/* Go-live target */}
      {project.go_live_target && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-500">Go-live target:</span>
          <span className="text-lg font-semibold text-zinc-900">{project.go_live_target}</span>
        </div>
      )}

      {/* Health banner */}
      <div className={`rounded-lg border px-4 py-3 ${hc.banner}`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-base">Project is {hc.label}</span>
          <span className="text-sm">
            {project.overdueActions} overdue action{project.overdueActions !== 1 ? 's' : ''}
          </span>
          <span className="text-sm">
            {project.highRisks} high/critical risk{project.highRisks !== 1 ? 's' : ''}
          </span>
          <span className="text-sm">
            {project.stalledMilestones} stalled milestone{project.stalledMilestones !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Workstreams */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workstreams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { label: 'ADR Track', streams: adrStreams, variant: 'bg-blue-100 text-blue-800' },
            { label: 'Biggy Track', streams: biggyStreams, variant: 'bg-purple-100 text-purple-800' },
            ...(otherStreams.length > 0
              ? [{ label: 'Other', streams: otherStreams, variant: 'bg-zinc-100 text-zinc-700' }]
              : []),
          ].map(({ label, streams, variant }) => (
            <div key={label}>
              <h3 className="text-sm font-semibold text-zinc-700 mb-2">{label}</h3>
              {streams.length === 0 ? (
                <p className="text-sm text-zinc-400">No workstreams</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {streams.map((ws) => (
                    <div key={ws.id} className="flex items-center gap-3 py-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${stateToColor(ws.state ?? ws.current_status)}`}
                      />
                      <span className="flex-1 text-sm font-medium text-zinc-900">{ws.name}</span>
                      <Badge className={`text-xs ${variant}`}>{ws.track ?? 'Unknown'}</Badge>
                      <span className="text-xs text-zinc-500 min-w-[80px]">
                        {stateLabel(ws.state ?? ws.current_status)}
                      </span>
                      {ws.lead && (
                        <span className="text-xs text-zinc-400 min-w-[80px]">{ws.lead}</span>
                      )}
                      {ws.last_updated && (
                        <span className="text-xs text-zinc-300">{ws.last_updated}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {workstreams.length === 0 && (
            <p className="text-sm text-zinc-400">No workstreams found for this project.</p>
          )}
        </CardContent>
      </Card>

      {/* Milestone summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Milestones</CardTitle>
          <Link
            href={`/customer/${id}/milestones`}
            className="text-sm text-blue-600 hover:underline"
          >
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {recentMilestones.length === 0 ? (
            <p className="text-sm text-zinc-400">No dated milestones found.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {recentMilestones.map((m) => {
                const statusKey = (m.status ?? '').toLowerCase().replace(/\s+/g, '_')
                const colorClass = milestoneStatusColors[statusKey] ?? 'bg-zinc-100 text-zinc-700'
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2">
                    <span className="flex-1 text-sm text-zinc-900">{m.name}</span>
                    <Badge className={`text-xs ${colorClass}`}>{m.status ?? 'Unknown'}</Badge>
                    <span className="text-xs text-zinc-400 min-w-[90px] text-right">{m.date}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
