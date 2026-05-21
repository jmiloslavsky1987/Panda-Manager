'use client'
import { useState, useMemo } from 'react'
import type { TeamOnboardingStatus } from '@/lib/queries'
import type { TrackWorkstreamStage, TeamOnboardingStageStatus } from '@/db/schema'
import { DEFAULT_TRACK_WORKSTREAM_STAGES, type TrackKey } from '@/lib/constants/track-workstream-stages'

const STATUS_OPTIONS = [
  { value: '',            label: '—' },
  { value: 'live',        label: 'Live' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pilot',       label: 'Pilot' },
  { value: 'planned',     label: 'Planned' },
]

type IntegrationTrackStatus = 'live' | 'in_progress' | 'pilot' | 'planned'

interface Props {
  projectId: number
  row?: TeamOnboardingStatus | null
  defaultTrack?: TrackKey
  stages: TrackWorkstreamStage[]
  stageStatusForRow: TeamOnboardingStageStatus[]
  onSave: (row: TeamOnboardingStatus) => void
  onClose: () => void
}

export function TeamOnboardingEditModal({ projectId, row, defaultTrack, stages, stageStatusForRow, onSave, onClose }: Props) {
  const [teamName, setTeamName] = useState(row?.team_name ?? '')
  const [track, setTrack]     = useState<TrackKey>((row?.track as TrackKey) ?? defaultTrack ?? 'ADR')

  // Dynamic per-track stage state — Record<stage_key, status>
  const [stageStatusState, setStageStatusState] = useState<Record<string, IntegrationTrackStatus | ''>>(() => {
    const initial: Record<string, IntegrationTrackStatus | ''> = {}
    for (const s of stageStatusForRow) initial[s.stage_key] = (s.status ?? '') as IntegrationTrackStatus | ''
    return initial
  })

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Compute stages for the currently-selected track, with DEFAULT fallback
  const stagesForTrack = useMemo<TrackWorkstreamStage[]>(() => {
    const fromDb = stages.filter((s) => s.track === track).sort((a, b) => a.display_order - b.display_order)
    if (fromDb.length > 0) return fromDb
    return DEFAULT_TRACK_WORKSTREAM_STAGES[track].map((s, i) => ({
      id: -1 - i,
      project_id: projectId,
      track,
      stage_key: s.stage_key,
      stage_label: s.stage_label,
      display_order: s.display_order,
      source: 'fallback',
      created_at: new Date(),
    }))
  }, [stages, track, projectId])

  async function handleSave() {
    if (!teamName.trim()) { setError('Team name is required'); return }
    setSaving(true); setError(null)
    try {
      const isEdit = !!row?.id
      const url    = isEdit
        ? `/api/projects/${projectId}/team-onboarding-status/${row!.id}`
        : `/api/projects/${projectId}/team-onboarding-status`
      const method = isEdit ? 'PATCH' : 'POST'

      // New body shape: team_name + track + stage_status array (Task 3 route accepts both legacy + new)
      const stage_status = Object.entries(stageStatusState)
        .filter(([, v]) => v !== '')
        .map(([stage_key, status]) => ({ stage_key, status }))

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: teamName.trim(), track, stage_status }),
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      onSave(result.row ?? result)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function setStageValue(stage_key: string, v: string) {
    setStageStatusState((prev) => ({ ...prev, [stage_key]: v as IntegrationTrackStatus | '' }))
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'white', borderRadius: 8, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>{row ? 'Edit Team Row' : 'Add Team Row'}</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Team Name *</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Platform Engineering"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Track</label>
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value as TrackKey)}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem' }}
          >
            <option value="ADR">ADR</option>
            <option value="Biggy">AI Assistant (Biggy)</option>
            <option value="Incident Prevention">Incident Prevention</option>
          </select>
        </div>

        {/* Dynamic stage field set per selected track */}
        {stagesForTrack.map((stage) => (
          <div key={stage.stage_key} style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>{stage.stage_label}</label>
            <select
              value={stageStatusState[stage.stage_key] ?? ''}
              onChange={(e) => setStageValue(stage.stage_key, e.target.value)}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem' }}
            >
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        ))}

        {error && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 8 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '6px 16px', border: 'none', borderRadius: 4, background: '#1e40af', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
