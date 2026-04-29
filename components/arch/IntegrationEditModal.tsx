'use client'
import { useState } from 'react'
import { ArchitectureIntegration } from '@/lib/queries'

const ADR_PHASES = [
  'Alert Intelligence',
  'Incident Intelligence',
  'Console',
  'Workflow Automation',
]

const BIGGY_PHASES = [
  'Knowledge Sources',
  'Real-Time Query',
  'AI Capabilities',
  'Console',
  'Outputs & Actions',
]

const STATUS_OPTIONS = [
  { value: 'live', label: 'Live' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'planned', label: 'Planned' },
]

interface Props {
  projectId: number
  integration?: ArchitectureIntegration | null
  defaultTrack?: 'ADR' | 'Biggy'
  onSave: (integration: ArchitectureIntegration) => void
  onClose: () => void
}

export function IntegrationEditModal({ projectId, integration, defaultTrack, onSave, onClose }: Props) {
  const [toolName, setToolName] = useState(integration?.tool_name ?? '')
  const [track, setTrack] = useState<'ADR' | 'Biggy'>(
    (integration?.track as 'ADR' | 'Biggy') ?? defaultTrack ?? 'ADR'
  )
  const [phase, setPhase] = useState(integration?.phase ?? ADR_PHASES[0])
  const [group, setGroup] = useState(integration?.integration_group ?? '')
  const [status, setStatus] = useState<string>(integration?.status ?? 'planned')
  const [integrationMethod, setIntegrationMethod] = useState(integration?.integration_method ?? '')
  const [notes, setNotes] = useState(integration?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const phases = track === 'ADR' ? ADR_PHASES : BIGGY_PHASES

  function handleTrackChange(newTrack: 'ADR' | 'Biggy') {
    setTrack(newTrack)
    const newPhases = newTrack === 'ADR' ? ADR_PHASES : BIGGY_PHASES
    if (!newPhases.includes(phase)) {
      setPhase(newPhases[0])
    }
  }

  async function handleSave() {
    if (!toolName.trim()) { setError('Tool name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const isEdit = !!integration?.id
      const url = isEdit
        ? `/api/projects/${projectId}/architecture-integrations/${integration!.id}`
        : `/api/projects/${projectId}/architecture-integrations`
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: toolName.trim(),
          track,
          phase,
          integration_group: group || null,
          status,
          integration_method: integrationMethod || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      onSave(result.integration ?? result)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
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
          maxWidth: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
          {integration ? 'Edit Integration' : 'Add Integration'}
        </h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Tool Name *</label>
          <input
            type="text"
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
            placeholder="e.g. Splunk, ServiceNow"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Track</label>
            <select
              value={track}
              onChange={(e) => handleTrackChange(e.target.value as 'ADR' | 'Biggy')}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem' }}
            >
              <option value="ADR">ADR</option>
              <option value="Biggy">Biggy</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Phase</label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem' }}
            >
              {phases.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Group <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
          <input
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="e.g. ALERT NORMALIZATION"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem' }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Integration Method</label>
          <input
            type="text"
            value={integrationMethod}
            onChange={(e) => setIntegrationMethod(e.target.value)}
            placeholder="e.g. REST API, Webhook, Agent"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 8 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
