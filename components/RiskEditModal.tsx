'use client'

import { useState, useEffect, cloneElement, isValidElement } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import type { Risk } from '../lib/queries'

interface RiskEditModalProps {
  risk: Risk
  trigger: React.ReactNode
}

export function RiskEditModal({ risk, trigger }: RiskEditModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState(risk.description ?? '')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>(risk.severity ?? 'medium')
  const [status, setStatus] = useState<'open' | 'mitigated' | 'resolved' | 'accepted'>(
    (['open', 'mitigated', 'resolved', 'accepted'].includes(risk.status ?? '') ? risk.status : 'open') as 'open' | 'mitigated' | 'resolved' | 'accepted'
  )
  const [mitigationAppend, setMitigationAppend] = useState('')
  const [likelihood, setLikelihood] = useState(risk.likelihood ?? '')
  const [impact, setImpact] = useState(risk.impact ?? '')
  const [targetDate, setTargetDate] = useState(risk.target_date ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync state when modal opens (risk prop may have updated after a previous save + router.refresh())
  useEffect(() => {
    if (!open) return
    setDescription(risk.description ?? '')
    setSeverity(risk.severity ?? 'medium')
    setStatus((['open', 'mitigated', 'resolved', 'accepted'].includes(risk.status ?? '') ? risk.status : 'open') as 'open' | 'mitigated' | 'resolved' | 'accepted')
    setLikelihood(risk.likelihood ?? '')
    setImpact(risk.impact ?? '')
    setTargetDate(risk.target_date ?? '')
    setMitigationAppend('')
    setError(null)
  }, [open, risk])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/risks/${risk.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim() || undefined,
          severity,
          status,
          mitigation_append: mitigationAppend || undefined,
          likelihood: likelihood || null,
          impact: impact || null,
          target_date: targetDate || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save')
        return
      }
      setMitigationAppend('')
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {isValidElement(trigger)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? cloneElement(trigger as React.ReactElement<any>, { onClick: () => setOpen(true), className: ['cursor-pointer', (trigger as React.ReactElement<any>).props.className].filter(Boolean).join(' ') })
        : <div onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</div>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="risk-edit-modal" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Risk</DialogTitle>
            <p className="text-xs text-zinc-500 font-mono">{risk.external_id}</p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="risk-description">Description</label>
              <textarea
                id="risk-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700" htmlFor="risk-severity">Severity</label>
                <select
                  id="risk-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700" htmlFor="risk-status">Status</label>
                <select
                  id="risk-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'open' | 'mitigated' | 'resolved' | 'accepted')}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="open">Open</option>
                  <option value="mitigated">Mitigated</option>
                  <option value="resolved">Resolved</option>
                  <option value="accepted">Accepted</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700" htmlFor="risk-likelihood">Likelihood</label>
                <select
                  id="risk-likelihood"
                  value={likelihood}
                  onChange={e => setLikelihood(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="">— select —</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700" htmlFor="risk-impact">Impact</label>
                <select
                  id="risk-impact"
                  value={impact}
                  onChange={e => setImpact(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="">— select —</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="risk-target-date">Target Date</label>
              <input
                id="risk-target-date"
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">
                Add mitigation note (appended to existing)
              </label>
              <pre className="text-xs bg-zinc-50 p-2 rounded mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">
                {risk.mitigation ?? 'No mitigation history'}
              </pre>
              <textarea
                value={mitigationAppend}
                onChange={(e) => setMitigationAppend(e.target.value)}
                placeholder="Add a new mitigation note..."
                rows={3}
                className="w-full border rounded px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
