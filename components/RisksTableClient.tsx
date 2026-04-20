'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { RiskEditModal } from '@/components/RiskEditModal'
import { SourceBadge } from '@/components/SourceBadge'
import { InlineSelectCell } from '@/components/InlineSelectCell'
import { OwnerCell } from '@/components/OwnerCell'
import { EmptyState } from '@/components/EmptyState'
import { AddRiskModal } from '@/components/AddRiskModal'
import { Checkbox } from '@/components/ui/checkbox'
import type { Risk, Artifact } from '@/lib/queries'

const RISK_STATUS_OPTIONS: { value: 'open' | 'mitigated' | 'resolved' | 'accepted'; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'accepted', label: 'Accepted' },
]

export const SEVERITY_OPTIONS: { value: 'low' | 'medium' | 'high' | 'critical'; label: string }[] = [
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
  const searchParams = useSearchParams()

  // URL param filters
  const statusFilter = searchParams.get('status') ?? ''
  const severityFilter = searchParams.get('severity') ?? ''
  const ownerFilter = searchParams.get('owner') ?? ''
  const fromDate = searchParams.get('from') ?? ''
  const toDate = searchParams.get('to') ?? ''

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [q, setQ] = useState('')

  // Update URL param callback
  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

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
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))
  }

  const artifactMap = new Map(artifacts.map((a) => [a.id, a.name]))

  // Compute unique owners for filter dropdown (from full list, not filtered)
  const uniqueOwners = useMemo(
    () => [...new Set(risks.map(r => r.owner).filter(Boolean) as string[])].sort(),
    [risks]
  )

  // Apply all filters
  const filteredRisks = useMemo(() => {
    let result = [...risks].sort((a, b) => {
      const aOrder = SEVERITY_ORDER[a.severity ?? 'low'] ?? 4
      const bOrder = SEVERITY_ORDER[b.severity ?? 'low'] ?? 4
      return aOrder - bOrder
    })

    // Text search on description and mitigation
    if (q) {
      const lowerQ = q.toLowerCase()
      result = result.filter(r =>
        (r.description?.toLowerCase().includes(lowerQ) ?? false) ||
        (r.mitigation?.toLowerCase().includes(lowerQ) ?? false)
      )
    }

    if (statusFilter) {
      result = result.filter(r => normaliseRiskStatus(r.status) === statusFilter)
    }
    if (severityFilter) {
      result = result.filter(r => normaliseSeverity(r.severity) === severityFilter)
    }
    if (ownerFilter) {
      result = result.filter(r => r.owner === ownerFilter)
    }
    if (fromDate) {
      result = result.filter(r => r.created_at.toISOString().split('T')[0] >= fromDate)
    }
    if (toDate) {
      result = result.filter(r => r.created_at.toISOString().split('T')[0] <= toDate)
    }

    return result
  }, [risks, q, statusFilter, severityFilter, ownerFilter, fromDate, toDate])

  // Multi-select functions
  function toggleSelection(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredRisks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRisks.map(r => r.id)))
    }
  }

  // Bulk update function
  async function bulkUpdateStatus(status: string) {
    await fetch('/api/risks/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ risk_ids: Array.from(selectedIds), patch: { status } }),
    })
    setSelectedIds(new Set())
    router.refresh()
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))
  }

  // Show empty state when no risks exist
  if (risks.length === 0) {
    return (
      <>
        <EmptyState
          title="No risks logged"
          description="Risks capture potential blockers and issues. Add the first risk to start tracking."
          action={{
            label: 'Add Risk',
            onClick: () => setAddModalOpen(true),
          }}
        />
        <AddRiskModal
          projectId={projectId}
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
        />
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Risks</h2>
        <AddRiskModal projectId={projectId} open={addModalOpen} onOpenChange={setAddModalOpen} />
      </div>

      {/* Floating bulk bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-zinc-50 border rounded px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <select
            onChange={e => {
              if (e.target.value) {
                bulkUpdateStatus(e.target.value)
                e.target.value = ''
              }
            }}
            className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          >
            <option value="">Change status...</option>
            <option value="open">Open</option>
            <option value="mitigated">Mitigated</option>
            <option value="resolved">Resolved</option>
            <option value="accepted">Accepted</option>
          </select>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-zinc-600 hover:text-zinc-800"
          >
            Clear
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search risks..."
          value={q}
          onChange={e => setQ(e.target.value)}
          className="h-8 w-48"
        />
        <select
          value={statusFilter}
          onChange={e => updateParam('status', e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="mitigated">Mitigated</option>
          <option value="resolved">Resolved</option>
          <option value="accepted">Accepted</option>
        </select>
        <select
          value={severityFilter}
          onChange={e => updateParam('severity', e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={ownerFilter}
          onChange={e => updateParam('owner', e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All owners</option>
          {uniqueOwners.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm text-zinc-600">
          From
          <input
            type="date"
            value={fromDate}
            onChange={e => updateParam('from', e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-1 text-sm text-zinc-600">
          To
          <input
            type="date"
            value={toDate}
            onChange={e => updateParam('to', e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </label>
        {(q || statusFilter || severityFilter || ownerFilter || fromDate || toDate) && (
          <button
            onClick={() => {
              setQ('')
              updateParam('status', '')
              updateParam('severity', '')
              updateParam('owner', '')
              updateParam('from', '')
              updateParam('to', '')
            }}
            className="text-sm text-zinc-500 hover:text-zinc-800 border rounded px-2 py-1"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="rounded-md border border-zinc-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedIds.size === filteredRisks.length && filteredRisks.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[110px]">Severity</TableHead>
              <TableHead className="w-[120px]">Owner</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead>Mitigation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRisks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-zinc-400 py-8">
                  No risks found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRisks.map((risk) => {
                const sevKey = normaliseSeverity(risk.severity)
                const badgeClass = severityBadgeColors[sevKey] ?? 'bg-zinc-100 text-zinc-700'
                const highlight = (sevKey === 'critical' || sevKey === 'high') && isUnresolved(risk.status)
                const mitigationText = risk.mitigation ?? ''
                const truncatedMitigation = mitigationText.length > 150
                  ? mitigationText.slice(0, 150) + '…'
                  : mitigationText
                return (
                  <TableRow key={risk.id} className={highlight ? 'bg-orange-50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(risk.id)}
                        onCheckedChange={() => toggleSelection(risk.id)}
                      />
                    </TableCell>
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
