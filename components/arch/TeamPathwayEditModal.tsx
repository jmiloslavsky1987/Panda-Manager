'use client'
import { useState } from 'react'
import type { TeamPathway } from '@/lib/queries'

const STATUS_OPTIONS = [
  { value: 'planned',     label: 'Planned' },
  { value: 'pilot',       label: 'Pilot' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'live',        label: 'Live' },
]

interface Props {
  projectId: number
  pathway?:  TeamPathway | null
  onSave:    (p: TeamPathway) => void
  onDelete?: (id: number) => void
  onClose:   () => void
}

export function TeamPathwayEditModal({ projectId, pathway, onSave, onDelete, onClose }: Props) {
  const [teamName, setTeamName] = useState(pathway?.team_name ?? '')
  const [routeText, setRouteText] = useState(
    () => {
      if (!pathway) return ''
      const steps = pathway.route_steps as Array<{ label: string }>
      return Array.isArray(steps) ? steps.map(s => s.label).join(' → ') : ''
    }
  )
  const [status, setStatus] = useState<string>(pathway?.status ?? 'planned')
  const [notes, setNotes]   = useState(pathway?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSave() {
    if (!teamName.trim()) { setError('Team name is required'); return }
    const steps = routeText
      .split(' → ')
      .map(s => s.trim())
      .filter(Boolean)
      .map(label => ({ label }))

    setSaving(true)
    setError(null)
    try {
      const isEdit = !!pathway?.id
      const url    = isEdit
        ? `/api/projects/${projectId}/team-pathways/${pathway!.id}`
        : `/api/projects/${projectId}/team-pathways`
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name:   teamName.trim(),
          route_steps: steps,
          status,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      onSave(result.pathway)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!pathway?.id) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/team-pathways/${pathway.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
      onDelete?.(pathway.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
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
          maxWidth: 520,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
          {pathway ? 'Edit Team Pathway' : 'Add Team Pathway'}
        </h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Team Name *</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Mission Control"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
            Pathway <span style={{ fontWeight: 400, color: '#6b7280' }}>(steps separated by &nbsp;→)</span>
          </label>
          <input
            type="text"
            value={routeText}
            onChange={(e) => setRouteText(e.target.value)}
            placeholder="e.g. AutoShare P1+P2 → Slack → Channel Hawk → Biggy MIM"
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
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
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

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          {pathway ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: '6px 14px', border: '1px solid #fca5a5', borderRadius: 4, background: '#fff', color: '#dc2626', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: deleting ? 0.7 : 1 }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{ padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '6px 16px', border: 'none', borderRadius: 4, background: '#d97706', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
