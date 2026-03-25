'use client'
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'

interface Project {
  id: number
  customer: string
}

interface AddKbEntryModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function AddKbEntryModal({ open, onClose, onCreated }: AddKbEntryModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [sourceTrace, setSourceTrace] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetch('/api/projects')
        .then((r) => r.json())
        .then((data) => setProjects(Array.isArray(data) ? data : data.projects ?? []))
        .catch(() => setProjects([]))
    }
  }, [open])

  function reset() {
    setTitle('')
    setContent('')
    setProjectId('')
    setSourceTrace('')
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
      }
      if (projectId) body.project_id = parseInt(projectId)
      if (sourceTrace.trim()) body.source_trace = sourceTrace.trim()

      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create entry')
        return
      }
      reset()
      onCreated()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Knowledge Base Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="Entry title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="Entry content..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Project (optional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">— No project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.customer}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Source Trace (optional)
              </label>
              <input
                type="text"
                value={sourceTrace}
                onChange={(e) => setSourceTrace(e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                placeholder="e.g. KAISER risk R-001, 2026-03-24 — leave blank to auto-generate"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
              {saving ? 'Saving...' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
