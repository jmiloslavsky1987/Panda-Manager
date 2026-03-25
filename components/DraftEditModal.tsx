'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'

interface Draft {
  id: number
  draft_type: string
  recipient: string | null
  subject: string | null
  content: string
  status: string
  created_at: string
  project_name: string | null
}

interface DraftEditModalProps {
  draft: Draft
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: (updated: Draft) => void
  onDismissed: (id: number) => void
}

export function DraftEditModal({ draft, open, onOpenChange, onSaved, onDismissed }: DraftEditModalProps) {
  const [subject, setSubject] = useState(draft.subject ?? '')
  const [recipient, setRecipient] = useState(draft.recipient ?? '')
  const [content, setContent] = useState(draft.content)
  const [saving, setSaving] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', subject, content, recipient }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Save failed')
        setSaving(false)
        return
      }

      toast.success('Draft saved')
      onSaved({ ...draft, subject, content, recipient, updated_at: new Date() } as Draft & { updated_at: Date })
      onOpenChange(false)
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  async function handleDismiss() {
    setDismissing(true)
    setError(null)

    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Dismiss failed')
        setDismissing(false)
        return
      }

      onDismissed(draft.id)
      onOpenChange(false)
    } catch {
      setError('Network error — please try again')
      setDismissing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="draft-edit-modal" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit Draft
            {draft.draft_type && (
              <span className="ml-2 font-mono text-sm text-zinc-400">{draft.draft_type}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Subject</label>
            <input
              type="text"
              data-testid="draft-subject-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Recipient</label>
            <input
              type="text"
              data-testid="draft-recipient-input"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient email"
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Content</label>
            <textarea
              data-testid="draft-content-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full border rounded p-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="draft-dismiss-btn"
              onClick={handleDismiss}
              disabled={saving || dismissing}
              className="text-red-600 border-red-200 hover:bg-red-50 mr-auto"
            >
              {dismissing ? 'Dismissing...' : 'Dismiss Draft'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving || dismissing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || dismissing}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
