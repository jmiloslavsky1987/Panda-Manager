'use client'
import { useState, useMemo } from 'react'
import type { TeamOnboardingStatus } from '@/lib/queries'
import type { TrackWorkstreamStage, TeamOnboardingStageStatus } from '@/db/schema'
import { StatusPill } from './IntegrationNode'
import { TeamOnboardingEditModal } from './TeamOnboardingEditModal'
import { DEFAULT_TRACK_WORKSTREAM_STAGES, type TrackKey } from '@/lib/constants/track-workstream-stages'

interface Props {
  projectId: number
  rows: TeamOnboardingStatus[]
  stages: TrackWorkstreamStage[]
  stageStatus: TeamOnboardingStageStatus[]
  active_tracks: { adr: boolean; biggy: boolean; incident_prevention: boolean } | null
  onUpdate: (rows: TeamOnboardingStatus[]) => void
}

// No global COLUMNS constant. Headers come from `stages` prop per track section.
//
// Per-track stage keys used for fallback (when track_workstream_stages not yet seeded):
// ADR:                 discovery_kickoff, integrations, platform_configuration, teams, uat
// Biggy (AI):         discovery_kickoff, it_knowledge_graph, platform_configuration, teams, validation
// Incident Prevention: discovery_kickoff, change_risk_data_sources, platform_configuration, teams, validation
//
// active_tracks flags: active_tracks.adr, active_tracks.biggy, active_tracks.incident_prevention
// When any flag is false, that section is hidden (XCUT-88-02).

const TRACK_DEFS: Array<{
  key: TrackKey
  label: string
  bg: string
  flag: 'adr' | 'biggy' | 'incident_prevention'
  addKey: 'new-adr' | 'new-biggy' | 'new-ip'
}> = [
  { key: 'ADR',                 label: 'ADR Track',                 bg: '#1e40af', flag: 'adr',                 addKey: 'new-adr'   },
  { key: 'Biggy',               label: 'AI Assistant Track',        bg: '#d97706', flag: 'biggy',               addKey: 'new-biggy' },
  { key: 'Incident Prevention', label: 'Incident Prevention Track', bg: '#7c3aed', flag: 'incident_prevention', addKey: 'new-ip'    },
]

export function TeamOnboardingTable({ projectId, rows, stages, stageStatus, active_tracks, onUpdate }: Props) {
  const [editRow, setEditRow] = useState<TeamOnboardingStatus | null | 'new-adr' | 'new-biggy' | 'new-ip'>(null)

  // Build per-track stage lists (fallback to defaults if not seeded yet — backwards-compat race window)
  function stagesForTrack(track: TrackKey): TrackWorkstreamStage[] {
    const fromDb = stages.filter((s) => s.track === track).sort((a, b) => a.display_order - b.display_order)
    if (fromDb.length > 0) return fromDb
    // Fallback: project not yet seeded (e.g. created before migration 0055). Render defaults.
    return DEFAULT_TRACK_WORKSTREAM_STAGES[track].map((s, i) => ({
      id: -1 - i,            // synthetic negative id to indicate fallback
      project_id: projectId,
      track,
      stage_key: s.stage_key,
      stage_label: s.stage_label,
      display_order: s.display_order,
      source: 'fallback',
      created_at: new Date(),
    }))
  }

  // O(1) cell status lookup
  const stageStatusMap = useMemo(() => {
    const m = new Map<string, TeamOnboardingStageStatus>()
    for (const s of stageStatus) m.set(`${s.team_onboarding_id}:${s.stage_key}`, s)
    return m
  }, [stageStatus])

  // Per-track row filters (matches existing logic from the original component)
  const rowsByTrack = {
    'ADR':                 rows.filter((r) => !r.track || r.track === 'ADR'),
    'Biggy':               rows.filter((r) => r.track === 'Biggy'),
    'Incident Prevention': rows.filter((r) => r.track === 'Incident Prevention'),
  } as const

  function handleSave(saved: TeamOnboardingStatus) {
    const existing = rows.find((r) => r.id === saved.id)
    if (existing) onUpdate(rows.map((r) => (r.id === saved.id ? saved : r)))
    else onUpdate([...rows, saved])
    setEditRow(null)
  }

  function renderStatusCell(row: TeamOnboardingStatus, stage: TrackWorkstreamStage) {
    const lookup = stageStatusMap.get(`${row.id}:${stage.stage_key}`)
    return (
      <td
        key={stage.stage_key}
        style={{ padding: '8px 12px', textAlign: 'center', cursor: 'pointer' }}
        onClick={() => setEditRow(row)}
        title="Click to edit"
      >
        {lookup?.status ? <StatusPill status={lookup.status} /> : (
          <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>
        )}
      </td>
    )
  }

  function renderTrackSection(def: typeof TRACK_DEFS[number]) {
    // active_tracks filter (XCUT-88-02 carry-over)
    // Explicit flag checks: active_tracks.adr, active_tracks.biggy, active_tracks.incident_prevention
    const trackEnabled =
      !active_tracks ||
      (def.flag === 'adr' ? active_tracks.adr :
       def.flag === 'biggy' ? active_tracks.biggy :
       active_tracks.incident_prevention)
    if (!trackEnabled) return null

    const sectionStages = stagesForTrack(def.key)
    const sectionRows = rowsByTrack[def.key]
    const colCount = 1 + sectionStages.length

    return (
      <div key={def.key} style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: def.bg, color: 'white' }}>
              <td colSpan={colCount} style={{ fontWeight: 700, padding: '6px 12px', fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {def.label}
              </td>
            </tr>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Team</th>
              {sectionStages.map((stage) => (
                <th key={stage.stage_key} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                  {stage.stage_label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sectionRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} style={{ padding: '10px 12px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  No {def.label} teams recorded yet.
                </td>
              </tr>
            ) : (
              sectionRows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td
                    style={{ padding: '8px 12px', fontWeight: 500, color: '#1e293b', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    onClick={() => setEditRow(row)}
                  >
                    {row.team_name}
                  </td>
                  {sectionStages.map((stage) => renderStatusCell(row, stage))}
                </tr>
              ))
            )}
            <tr>
              <td colSpan={colCount} style={{ padding: '6px 12px' }}>
                <button
                  onClick={() => setEditRow(def.addKey)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: def.bg, fontSize: '0.78rem', fontWeight: 600, padding: 0 }}
                >
                  + Add {def.label} Team Row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Team Onboarding Status
      </h4>

      {TRACK_DEFS.map(renderTrackSection)}

      {/* Legend (unchanged from original) */}
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
            editRow === 'new-ip' ? 'Incident Prevention' :
            (editRow as TeamOnboardingStatus).track as TrackKey | undefined
          }
          stages={stages}
          stageStatusForRow={
            typeof editRow === 'string' || editRow === null
              ? []
              : stageStatus.filter((s) => s.team_onboarding_id === (editRow as TeamOnboardingStatus).id)
          }
          onSave={handleSave}
          onClose={() => setEditRow(null)}
        />
      )}
    </div>
  )
}
