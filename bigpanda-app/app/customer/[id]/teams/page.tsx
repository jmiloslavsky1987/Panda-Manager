import { getWorkspaceData } from '../../../../lib/queries'
import { Badge } from '../../../../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table'

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

function WorkstreamTable({
  streams,
  trackLabel,
  trackBadgeClass,
}: {
  streams: { id: number; name: string; state: string | null; current_status: string | null; lead: string | null; last_updated: string | null }[]
  trackLabel: string
  trackBadgeClass: string
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
        <Badge className={`text-xs ${trackBadgeClass}`}>{trackLabel}</Badge>
      </h3>
      {streams.length === 0 ? (
        <p className="text-sm text-zinc-400 px-1">No workstreams in this track.</p>
      ) : (
        <div className="rounded-md border border-zinc-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workstream</TableHead>
                <TableHead className="w-[140px]">State / Status</TableHead>
                <TableHead className="w-[120px]">Lead</TableHead>
                <TableHead className="w-[130px]">Last Updated</TableHead>
                <TableHead className="w-[160px]">Stall Indicator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {streams.map((ws) => {
                const stateDisplay = ws.state ?? ws.current_status ?? '—'
                const stalled = isStalled(ws.last_updated, ws.state ?? ws.current_status)
                return (
                  <TableRow key={ws.id}>
                    <TableCell className="text-sm font-medium">{ws.name}</TableCell>
                    <TableCell className="text-sm text-zinc-600">{stateDisplay}</TableCell>
                    <TableCell className="text-sm text-zinc-600">{ws.lead ?? '—'}</TableCell>
                    <TableCell className="text-sm text-zinc-500">{ws.last_updated ?? '—'}</TableCell>
                    <TableCell>
                      {stalled ? (
                        <Badge className="text-xs bg-amber-100 text-amber-800">
                          Stalled 14+ days
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
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

      <WorkstreamTable
        streams={adrStreams}
        trackLabel="ADR Track"
        trackBadgeClass="bg-blue-100 text-blue-800"
      />
      <WorkstreamTable
        streams={biggyStreams}
        trackLabel="Biggy Track"
        trackBadgeClass="bg-purple-100 text-purple-800"
      />
      {otherStreams.length > 0 && (
        <WorkstreamTable
          streams={otherStreams}
          trackLabel="Other"
          trackBadgeClass="bg-zinc-100 text-zinc-700"
        />
      )}

      {workstreams.length === 0 && (
        <p className="text-sm text-zinc-400">No workstreams found for this project.</p>
      )}
    </div>
  )
}
