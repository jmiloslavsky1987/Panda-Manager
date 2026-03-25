import { getWorkspaceData } from '../../../../lib/queries'
import { Badge } from '../../../../components/ui/badge'
import { WorkstreamTableClient } from '@/components/WorkstreamTableClient'

const STALL_DAYS = 14

function isStalled(lastUpdated: string | null | undefined, state: string | null | undefined): boolean {
  if (!lastUpdated || !/^\d{4}-\d{2}-\d{2}/.test(lastUpdated)) return false
  const s = (state ?? '').toLowerCase()
  if (['complete', 'done', 'closed', 'completed'].some((k) => s.includes(k))) return false
  const d = new Date(lastUpdated)
  if (isNaN(d.getTime())) return false
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - STALL_DAYS)
  return d < cutoff
}

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getWorkspaceData(parseInt(id, 10))
  const { workstreams } = data

  const adrStreams = workstreams.filter((w) => w.track === 'ADR')
  const biggyStreams = workstreams.filter((w) => w.track === 'Biggy')
  const otherStreams = workstreams.filter((w) => w.track !== 'ADR' && w.track !== 'Biggy')

  return (
    <div data-testid="teams-tab" className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Team Onboarding Velocity</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Workstreams not updated in 14+ days and not yet complete are flagged as stalled.
        </p>
      </div>

      {/* ADR Track */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
          <Badge className="text-xs bg-blue-100 text-blue-800">ADR Track</Badge>
        </h3>
        <WorkstreamTableClient
          streams={adrStreams}
          emptyMessage="No workstreams in this track."
        />
      </div>

      {/* Biggy Track */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
          <Badge className="text-xs bg-purple-100 text-purple-800">Biggy Track</Badge>
        </h3>
        <WorkstreamTableClient
          streams={biggyStreams}
          emptyMessage="No workstreams in this track."
        />
      </div>

      {/* Other Track */}
      {otherStreams.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Badge className="text-xs bg-zinc-100 text-zinc-700">Other</Badge>
          </h3>
          <WorkstreamTableClient
            streams={otherStreams}
            emptyMessage="No workstreams in this track."
          />
        </div>
      )}

      {workstreams.length === 0 && (
        <p className="text-sm text-zinc-400">No workstreams found for this project.</p>
      )}
    </div>
  )
}
