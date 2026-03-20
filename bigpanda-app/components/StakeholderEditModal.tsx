'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import type { Stakeholder } from '../lib/queries'

interface StakeholderEditModalProps {
  stakeholder?: Stakeholder
  projectId: number
  trigger: React.ReactNode
}

export function StakeholderEditModal({ stakeholder, projectId, trigger }: StakeholderEditModalProps) {
  const router = useRouter()
  const isEdit = stakeholder !== undefined
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(stakeholder?.name ?? '')
  const [role, setRole] = useState(stakeholder?.role ?? '')
  const [company, setCompany] = useState(stakeholder?.company ?? '')
  const [email, setEmail] = useState(stakeholder?.email ?? '')
  const [slackId, setSlackId] = useState(stakeholder?.slack_id ?? '')
  const [notes, setNotes] = useState(stakeholder?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let res: Response
      if (isEdit) {
        res = await fetch(`/api/stakeholders/${stakeholder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, role, company, email, slack_id: slackId, notes }),
        })
      } else {
        res = await fetch('/api/stakeholders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            name,
            role,
            company,
            email,
            slack_id: slackId,
            notes,
            source: 'manual_entry',
          }),
        })
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save')
        return
      }
      if (!isEdit) {
        // Reset form on create
        setName('')
        setRole('')
        setCompany('')
        setEmail('')
        setSlackId('')
        setNotes('')
      }
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
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="stakeholder-edit-modal">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Stakeholder' : 'Add Stakeholder'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="stakeholder-name">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="stakeholder-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="stakeholder-role">
                Role
              </label>
              <input
                id="stakeholder-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Implementation Lead"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="stakeholder-company">
                Company
              </label>
              <input
                id="stakeholder-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="stakeholder-email">
                Email
              </label>
              <input
                id="stakeholder-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="stakeholder-slack">
                Slack ID
              </label>
              <input
                id="stakeholder-slack"
                type="text"
                value={slackId}
                onChange={(e) => setSlackId(e.target.value)}
                placeholder="@username or user ID"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700" htmlFor="stakeholder-notes">
                Notes
              </label>
              <textarea
                id="stakeholder-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
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
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : isEdit ? 'Save' : 'Add Stakeholder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
