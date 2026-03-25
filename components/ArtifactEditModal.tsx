'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'

// Type matches the artifacts DB row shape returned by getWorkspaceData()
interface Artifact {
  id: number
  external_id: string
  name: string
  status: string | null
  owner: string | null
  description: string | null
  project_id: number
}

interface ArtifactEditModalProps {
  artifact?: Artifact     // undefined = create mode, defined = edit mode
  projectId: number
  trigger: React.ReactNode
}

export function ArtifactEditModal({ artifact, projectId, trigger }: ArtifactEditModalProps) {
  const isEdit = artifact !== undefined
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(artifact?.name ?? '')
  const [status, setStatus] = useState(artifact?.status ?? 'not-started')
  const [owner, setOwner] = useState(artifact?.owner ?? '')
  const [description, setDescription] = useState(artifact?.description ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

    const url = isEdit ? `/api/artifacts/${artifact!.id}` : '/api/artifacts'
    const method = isEdit ? 'PATCH' : 'POST'
    const body = isEdit
      ? { name: name.trim(), status, owner: owner.trim(), description: description.trim() }
      : { project_id: projectId, name: name.trim(), status, owner: owner.trim(), description: description.trim() }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Save failed')
      setSaving(false)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span data-testid={isEdit ? 'artifact-edit-trigger' : 'artifact-create-trigger'}>{trigger}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Artifact ${artifact!.external_id}` : 'New Artifact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name *</label>
            <input
              id="artifact-name"
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
            <input
              id="artifact-status"
              type="text"
              value={status}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatus(e.target.value)}
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Owner</label>
            <input
              id="artifact-owner"
              type="text"
              value={owner}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOwner(e.target.value)}
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <textarea
              id="artifact-description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
              className="w-full border rounded p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          {error && <p data-testid="error-toast" className="text-red-600 text-sm">{error}</p>}
          <DialogFooter>
            {saving && <p data-testid="saving-indicator" className="text-sm text-zinc-500 self-center mr-auto">Saving...</p>}
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
