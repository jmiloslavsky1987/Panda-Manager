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
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import type { ExtractedEntities } from '@/lib/queries'

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
  const [extracted, setExtracted] = useState<ExtractedEntities | null>(null)
  const [extractedLoading, setExtractedLoading] = useState(false)

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

  async function loadExtracted() {
    if (!artifact || extracted) return
    setExtractedLoading(true)
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}/extracted`)
      const data = await res.json()
      setExtracted(data)
    } catch (err) {
      console.error('Failed to load extracted entities:', err)
    } finally {
      setExtractedLoading(false)
    }
  }

  function handleEntityClick(tabPath: string) {
    setOpen(false)
    router.push(`/customer/${projectId}/${tabPath}`)
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
        <Tabs defaultValue="details">
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="extracted" onClick={loadExtracted} disabled={!artifact}>
              Extracted Entities
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details">
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
          </TabsContent>
          <TabsContent value="extracted">
            {extractedLoading && <p className="text-sm text-zinc-500">Loading...</p>}
            {!extractedLoading && !extracted && <p className="text-sm text-zinc-500">Click the tab to load extracted entities.</p>}
            {!extractedLoading && extracted && (
              <div className="space-y-4">
                {extracted.risks.length === 0 && extracted.actions.length === 0 &&
                 extracted.milestones.length === 0 && extracted.decisions.length === 0 ? (
                  <p className="text-sm text-zinc-500">No entities extracted from this artifact yet.</p>
                ) : (
                  <>
                    {extracted.risks.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-zinc-700 mb-1">Risks ({extracted.risks.length})</h4>
                        {extracted.risks.map(r => (
                          <button
                            key={r.id}
                            onClick={() => handleEntityClick('risks')}
                            className="block w-full text-left text-sm text-blue-600 hover:underline py-0.5"
                          >
                            {r.external_id}: {r.description?.slice(0, 80)}
                          </button>
                        ))}
                      </div>
                    )}
                    {extracted.actions.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-zinc-700 mb-1">Actions ({extracted.actions.length})</h4>
                        {extracted.actions.map(a => (
                          <button
                            key={a.id}
                            onClick={() => handleEntityClick('actions')}
                            className="block w-full text-left text-sm text-blue-600 hover:underline py-0.5"
                          >
                            {a.external_id}: {a.description?.slice(0, 80)}
                          </button>
                        ))}
                      </div>
                    )}
                    {extracted.milestones.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-zinc-700 mb-1">Milestones ({extracted.milestones.length})</h4>
                        {extracted.milestones.map(m => (
                          <button
                            key={m.id}
                            onClick={() => handleEntityClick('milestones')}
                            className="block w-full text-left text-sm text-blue-600 hover:underline py-0.5"
                          >
                            {m.external_id}: {m.name?.slice(0, 80)}
                          </button>
                        ))}
                      </div>
                    )}
                    {extracted.decisions.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-zinc-700 mb-1">Decisions ({extracted.decisions.length})</h4>
                        {extracted.decisions.map(d => (
                          <button
                            key={d.id}
                            onClick={() => handleEntityClick('decisions')}
                            className="block w-full text-left text-sm text-blue-600 hover:underline py-0.5"
                          >
                            {d.id}: {d.decision.slice(0, 80)}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
