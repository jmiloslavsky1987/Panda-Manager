'use client'
import { useState } from 'react'
import { TeamOnboardingStatus } from '@/lib/queries'
import { StatusPill } from './IntegrationNode'
import { TeamOnboardingEditModal } from './TeamOnboardingEditModal'

interface Props {
  projectId: number
  rows: TeamOnboardingStatus[]
  onUpdate: (rows: TeamOnboardingStatus[]) => void
}

const COLUMNS = [
  { key: 'ingest_status', label: 'Ingest & Normalization' },
  { key: 'correlation_status', label: 'Alert Correlation' },
  { key: 'incident_intelligence_status', label: 'Incident Intelligence' },
  { key: 'sn_automation_status', label: 'SN Automation' },
  { key: 'biggy_ai_status', label: 'Biggy AI' },
] as const

type StatusKey = typeof COLUMNS[number]['key']

export function TeamOnboardingTable({ projectId, rows, onUpdate }: Props) {
  const [editRow, setEditRow] = useState<TeamOnboardingStatus | null | 'new-adr' | 'new-biggy'>(null)

  const adrRows = rows.filter((r) => !r.track || r.track === 'ADR')
  const biggyRows = rows.filter((r) => r.track === 'Biggy')

  function handleSave(saved: TeamOnboardingStatus) {
    const existing = rows.find((r) => r.id === saved.id)
    if (existing) {
      onUpdate(rows.map((r) => (r.id === saved.id ? saved : r)))
    } else {
      onUpdate([...rows, saved])
    }
    setEditRow(null)
  }

  function renderStatusCell(row: TeamOnboardingStatus, key: StatusKey) {
    const val = row[key]
    return (
      <td
        key={key}
        style={{ padding: '8px 12px', textAlign: 'center', cursor: 'pointer' }}
        onClick={() => setEditRow(row)}
        title="Click to edit"
      >
        {val ? <StatusPill status={val} /> : (
          <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>
        )}
      </td>
    )
  }

  function SectionHeader({ label, bg }: { label: string; bg: string }) {
    return (
      <tr>
        <td
          colSpan={6}
          style={{
            background: bg,
            color: 'white',
            fontWeight: 700,
            padding: '6px 12px',
            fontSize: '0.8rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </td>
      </tr>
    )
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Team Onboarding Status
      </h4>

      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                Team
              </th>
              {COLUMNS.map((col) => (
                <th key={col.key} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ADR Track section */}
            <SectionHeader label="ADR Track" bg="#1e40af" />
            {adrRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '10px 12px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  No ADR teams recorded yet.
                </td>
              </tr>
            ) : (
              adrRows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td
                    style={{ padding: '8px 12px', fontWeight: 500, color: '#1e293b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={() => setEditRow(row)}
                  >
                    {row.team_name}
                  </td>
                  {COLUMNS.map((col) => renderStatusCell(row, col.key))}
                </tr>
              ))
            )}
            <tr>
              <td colSpan={6} style={{ padding: '6px 12px' }}>
                <button
                  onClick={() => setEditRow('new-adr')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', fontSize: '0.78rem', fontWeight: 600, padding: 0 }}
                >
                  + Add ADR Team Row
                </button>
              </td>
            </tr>

            {/* Biggy AI Track section */}
            <SectionHeader label="Biggy AI Track" bg="#d97706" />
            {biggyRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '10px 12px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  No Biggy AI teams recorded yet.
                </td>
              </tr>
            ) : (
              biggyRows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td
                    style={{ padding: '8px 12px', fontWeight: 500, color: '#1e293b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={() => setEditRow(row)}
                  >
                    {row.team_name}
                  </td>
                  {COLUMNS.map((col) => renderStatusCell(row, col.key))}
                </tr>
              ))
            )}
            <tr>
              <td colSpan={6} style={{ padding: '6px 12px' }}>
                <button
                  onClick={() => setEditRow('new-biggy')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d97706', fontSize: '0.78rem', fontWeight: 600, padding: 0 }}
                >
                  + Add Biggy AI Team Row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.75rem', color: '#64748b' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#14532d', display: 'inline-block' }} /> Live
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#92400e', display: 'inline-block' }} /> In Progress / Pilot
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#475569', display: 'inline-block' }} /> Planned
        </span>
      </div>

      {editRow !== null && (
        <TeamOnboardingEditModal
          projectId={projectId}
          row={typeof editRow === 'string' ? null : editRow}
          defaultTrack={
            editRow === 'new-adr' ? 'ADR' :
            editRow === 'new-biggy' ? 'Biggy' :
            (editRow as TeamOnboardingStatus).track as 'ADR' | 'Biggy' | undefined
          }
          onSave={handleSave}
          onClose={() => setEditRow(null)}
        />
      )}
    </div>
  )
}
