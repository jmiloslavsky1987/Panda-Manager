'use client'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'

interface AddNotesModalProps {
  projectId: number
}

export function AddNotesModal({ projectId }: AddNotesModalProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, content }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save')
        return
      }
      setContent('')
      setOpen(false)
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        data-testid="add-notes-btn"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-zinc-900 text-white px-4 py-2 shadow-lg z-50 hover:bg-zinc-700 transition-colors"
      >
        + Add Notes
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notes</DialogTitle>
          </DialogHeader>
          <textarea
            className="w-full h-40 border rounded p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="Paste meeting notes, email content, or any project update..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            data-testid="add-notes-textarea"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <p className="text-xs text-zinc-400">
            Notes are saved to Engagement History. Skill routing available in Phase 5.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !content.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
