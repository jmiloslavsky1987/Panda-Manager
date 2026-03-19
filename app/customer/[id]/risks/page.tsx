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

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const severityBadgeColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
}

function isUnresolved(status: string | null | undefined): boolean {
  const s = (status ?? '').toLowerCase()
  return !['resolved', 'closed'].includes(s)
}

export default async function RisksPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getWorkspaceData(parseInt(id, 10))

  const sortedRisks = [...data.risks].sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity ?? 'low'] ?? 4
    const bOrder = SEVERITY_ORDER[b.severity ?? 'low'] ?? 4
    return aOrder - bOrder
  })

  return (
    <div data-testid="risks-tab" className="space-y-4">
      <div className="rounded-md border border-zinc-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[110px]">Severity</TableHead>
              <TableHead className="w-[120px]">Owner</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead>Mitigation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRisks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-400 py-8">
                  No risks found.
                </TableCell>
              </TableRow>
            ) : (
              sortedRisks.map((risk) => {
                const sevKey = risk.severity ?? 'low'
                const badgeClass = severityBadgeColors[sevKey] ?? 'bg-zinc-100 text-zinc-700'
                const highlight =
                  (sevKey === 'critical' || sevKey === 'high') && isUnresolved(risk.status)
                const mitigationText = risk.mitigation ?? ''
                const truncatedMitigation =
                  mitigationText.length > 150
                    ? mitigationText.slice(0, 150) + '…'
                    : mitigationText
                return (
                  <TableRow key={risk.id} className={highlight ? 'bg-orange-50' : ''}>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {risk.external_id}
                    </TableCell>
                    <TableCell className="text-sm">
                      {risk.description.length > 100
                        ? risk.description.slice(0, 100) + '…'
                        : risk.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${badgeClass}`}>{sevKey}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">{risk.owner ?? '—'}</TableCell>
                    <TableCell className="text-sm text-zinc-600">{risk.status ?? '—'}</TableCell>
                    <TableCell className="text-sm text-zinc-500">{truncatedMitigation || '—'}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Append-only info callout */}
      <div className="rounded-md bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm text-zinc-500">
        Mitigation entries are append-only — editing available in Phase 3.
      </div>
    </div>
  )
}
