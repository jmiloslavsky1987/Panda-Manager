'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RiskEditModal } from '@/components/RiskEditModal'
import { SourceBadge } from '@/components/SourceBadge'
import { InlineSelectCell } from '@/components/InlineSelectCell'
import { OwnerCell } from '@/components/OwnerCell'
import type { Risk, Artifact } from '@/lib/queries'

const RISK_STATUS_OPTIONS: { value: 'open' | 'mitigated' | 'resolved' | 'accepted'; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'accepted', label: 'Accepted' },
]

const SEVERITY_OPTIONS: { value: 'low' | 'medium' | 'high' | 'critical'; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const RISK_STATUS_VALUES = ['open', 'mitigated', 'resolved', 'accepted'] as const
type RiskStatus = typeof RISK_STATUS_VALUES[number]

const SEVERITY_VALUES = ['low', 'medium', 'high', 'critical'] as const
type Severity = typeof SEVERITY_VALUES[number]

function normaliseRiskStatus(s: string | null | undefined): RiskStatus {
  return RISK_STATUS_VALUES.includes(s as RiskStatus) ? (s as RiskStatus) : 'open'
}

function normaliseSeverity(s: string | null | undefined): Severity {
  return SEVERITY_VALUES.includes(s as Severity) ? (s as Severity) : 'low'
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const severityBadgeColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
}

function isUnresolved(status: string | null | undefined): boolean {
  return !['resolved', 'closed'].includes((status ?? '').toLowerCase())
}

interface RisksTableClientProps {
  risks: Risk[]
  artifacts: Artifact[]
  projectId: number
}

export function RisksTableClient({ risks, artifacts, projectId }: RisksTableClientProps) {
  const router = useRouter()

  async function patchRisk(id: number, patch: Record<string, unknown>) {
    const res = await fetch(`/api/risks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Save failed' }))
      throw new Error(err.error ?? 'Save failed')
    }
    router.refresh()
  }

  const artifactMap = new Map(artifacts.map((a) => [a.id, a.name]))

  const sortedRisks = [...risks].sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity ?? 'low'] ?? 4
    const bOrder = SEVERITY_ORDER[b.severity ?? 'low'] ?? 4
    return aOrder - bOrder
  })

  return (
    <div className="space-y-4">
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
                const sevKey = normaliseSeverity(risk.severity)
                const badgeClass = severityBadgeColors[sevKey] ?? 'bg-zinc-100 text-zinc-700'
                const highlight = (sevKey === 'critical' || sevKey === 'high') && isUnresolved(risk.status)
                const mitigationText = risk.mitigation ?? ''
                const truncatedMitigation = mitigationText.length > 150
                  ? mitigationText.slice(0, 150) + '…'
                  : mitigationText
                return (
                  <TableRow key={risk.id} className={highlight ? 'bg-orange-50' : ''}>
                    <TableCell className="font-mono text-xs text-zinc-500">{risk.external_id}</TableCell>
                    <TableCell className="text-sm">
                      <div className="space-y-1">
                        <span>{risk.description.length > 100
                          ? risk.description.slice(0, 100) + '…'
                          : risk.description}
                        </span>
                        <div>
                          <SourceBadge
                            source={risk.source}
                            artifactName={risk.source_artifact_id ? (artifactMap.get(risk.source_artifact_id) ?? null) : null}
                            discoverySource={risk.discovery_source}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <InlineSelectCell
                        value={sevKey}
                        options={SEVERITY_OPTIONS}
                        onSave={(v) => patchRisk(risk.id, { severity: v })}
                        className={`text-xs font-medium ${badgeClass} px-2 py-0.5 rounded-full`}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      <OwnerCell
                        value={risk.owner}
                        projectId={projectId}
                        onSave={(v) => patchRisk(risk.id, { owner: v })}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-zinc-600">
                      <InlineSelectCell
                        value={normaliseRiskStatus(risk.status)}
                        options={RISK_STATUS_OPTIONS}
                        onSave={(v) => patchRisk(risk.id, { status: v })}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">
                      <RiskEditModal
                        risk={risk}
                        trigger={
                          <span className="cursor-pointer hover:bg-zinc-100 rounded px-1 py-0.5">
                            {truncatedMitigation || 'Add mitigation…'}
                          </span>
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="rounded-md bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm text-zinc-500">
        Click any cell to edit severity, status, or owner inline. Click the mitigation column to add notes.
      </div>
    </div>
  )
}
