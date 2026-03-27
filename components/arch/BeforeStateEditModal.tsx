'use client'
import { useState } from 'react'
import { BeforeState } from '@/lib/queries'

interface Props {
  projectId: number
  beforeState: BeforeState | null
  onUpdate: (updated: BeforeState) => void
  onClose: () => void
}

export function BeforeStateEditModal({ projectId, beforeState, onUpdate, onClose }: Props) {
  const [aggregationHubName, setAggregationHubName] = useState(beforeState?.aggregation_hub_name ?? '')
  const [alertToTicketProblem, setAlertToTicketProblem] = useState(beforeState?.alert_to_ticket_problem ?? '')
  const [painPointsText, setPainPointsText] = useState(
    Array.isArray(beforeState?.pain_points_json)
      ? (beforeState.pain_points_json as string[]).join('\n')
      : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const pain_points_json = painPointsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await fetch(`/api/projects/${projectId}/before-state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregation_hub_name: aggregationHubName || null,
          alert_to_ticket_problem: alertToTicketProblem || null,
          pain_points_json,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      onUpdate(result.beforeState ?? result)
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
          maxWidth: 520,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Edit Before-State</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
            Aggregation Hub Name
          </label>
          <input
            type="text"
            value={aggregationHubName}
            onChange={(e) => setAggregationHubName(e.target.value)}
            placeholder="e.g. Sahara, Moogsoft"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
            Alert-to-Ticket Problem Description
          </label>
          <textarea
            value={alertToTicketProblem}
            onChange={(e) => setAlertToTicketProblem(e.target.value)}
            rows={3}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 10px', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
            Pain Points (one per line)
          </label>
          <textarea
            value={painPointsText}
            onChange={(e) => setPainPointsText(e.target.value)}
            rows={5}
            placeholder="Alert storm — 50k alerts/day&#10;Manual triage taking 3+ hours&#10;No correlation across tools"
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
