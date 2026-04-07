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
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface AddRiskModalProps {
  projectId: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddRiskModal({ projectId, open: controlledOpen, onOpenChange }: AddRiskModalProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    setInternalOpen(value)
    onOpenChange?.(value)
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('')
  const [owner, setOwner] = useState('')
  const [mitigation, setMitigation] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          description,
          severity: severity || undefined,
          owner: owner || undefined,
          mitigation: mitigation || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Save failed')
        setSaving(false)
        return
      }

      setOpen(false)
      setDescription('')
      setSeverity('')
      setOwner('')
      setMitigation('')
      router.refresh()
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span data-testid="add-risk-trigger">
          <Button data-testid="add-risk-btn">Add Risk</Button>
        </span>
      </DialogTrigger>
      <DialogContent data-testid="add-risk-modal">
        <DialogHeader>
          <DialogTitle>Add Risk</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              required
              placeholder="Describe the risk..."
              className="w-full border rounded p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Severity <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="">— select —</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Owner <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              placeholder="Who owns this risk?"
              className="w-full border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Mitigation <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={mitigation}
              onChange={e => setMitigation(e.target.value)}
              rows={3}
              placeholder="How will this risk be mitigated?"
              className="w-full border rounded p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          {error && (
            <p data-testid="error-toast" className="text-red-600 text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            {saving && (
              <p data-testid="saving-indicator" className="text-sm text-zinc-500 self-center mr-auto">
                Saving...
              </p>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !description.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
