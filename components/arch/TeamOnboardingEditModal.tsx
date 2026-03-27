'use client'
import { useState } from 'react'
import { TeamOnboardingStatus } from '@/lib/queries'

const STATUS_OPTIONS = [
  { value: '', label: '—' },
  { value: 'live', label: 'Live' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'planned', label: 'Planned' },
]

interface Props {
  projectId: number
  row?: TeamOnboardingStatus | null
  defaultTrack?: 'ADR' | 'Biggy'
  onSave: (row: TeamOnboardingStatus) => void
  onClose: () => void
}

export function TeamOnboardingEditModal({ projectId, row, defaultTrack, onSave, onClose }: Props) {
  const [teamName, setTeamName] = useState(row?.team_name ?? '')
  const [track, setTrack] = useState<'ADR' | 'Biggy'>(
    (row?.track as 'ADR' | 'Biggy') ?? defaultTrack ?? 'ADR'
  )
  const [ingestStatus, setIngestStatus] = useState(row?.ingest_status ?? '')
  const [correlationStatus, setCorrelationStatus] = useState(row?.correlation_status ?? '')
  const [incidentStatus, setIncidentStatus] = useState(row?.incident_intelligence_status ?? '')
  const [snAutomationStatus, setSnAutomationStatus] = useState(row?.sn_automation_status ?? '')
  const [biggyAiStatus, setBiggyAiStatus] = useState(row?.biggy_ai_status ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!teamName.trim()) { setError('Team name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const isEdit = !!row?.id
      const url = isEdit
        ? `/api/projects/${projectId}/team-onboarding-status/${row!.id}`
        : `/api/projects/${projectId}/team-onboarding-status`
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: teamName.trim(),
          track,
          ingest_status: ingestStatus || null,
          correlation_status: correlationStatus || null,
          incident_intelligence_status: incidentStatus || null,
          sn_automation_status: snAutomationStatus || null,
          biggy_ai_status: biggyAiStatus || null,
        }),
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

  function StatusSelect({
    label,
    value,
    onChange,
  }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem' }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 8,
          padding: 24,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
          {row ? 'Edit Team Row' : 'Add Team Row'}
        </h3>

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
            onChange={(e) => setTrack(e.target.value as 'ADR' | 'Biggy')}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem' }}
          >
            <option value="ADR">ADR</option>
            <option value="Biggy">Biggy</option>
          </select>
        </div>

        <StatusSelect label="Ingest & Normalization" value={ingestStatus ?? ''} onChange={setIngestStatus} />
        <StatusSelect label="Alert Correlation" value={correlationStatus ?? ''} onChange={setCorrelationStatus} />
        <StatusSelect label="Incident Intelligence" value={incidentStatus ?? ''} onChange={setIncidentStatus} />
        <StatusSelect label="SN Automation" value={snAutomationStatus ?? ''} onChange={setSnAutomationStatus} />
        <StatusSelect label="Biggy AI" value={biggyAiStatus ?? ''} onChange={setBiggyAiStatus} />

        {error && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 8 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Cancel
          </button>
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
