'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Icon } from './Icon'

interface WbsProposal {
  parent_section_name: string
  level: 2 | 3
  name: string
  track: 'ADR' | 'Biggy'
  parent_id: number
}

interface WbsGeneratePlanModalProps {
  projectId: number
  onConfirmed: (newParentIds: number[]) => void
}

export function WbsGeneratePlanModal({ projectId, onConfirmed }: WbsGeneratePlanModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [proposals, setProposals] = useState<WbsProposal[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/wbs/generate`, { method: 'POST' })
      if (!res.ok) {
        throw new Error('Generation failed')
      }
      const { proposals: newProposals } = await res.json()
      setProposals(newProposals)
      setOpen(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Generation failed'
      setError(message)
      toast.error('Generate Plan failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const parentIds: number[] = []
      for (const proposal of proposals) {
        const res = await fetch(`/api/projects/${projectId}/wbs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: proposal.name,
            parent_id: proposal.parent_id,
            level: proposal.level,
            track: proposal.track,
          }),
        })
        if (!res.ok) {
          throw new Error('Failed to save proposal')
        }
        parentIds.push(proposal.parent_id)
      }
      setOpen(false)
      setProposals([])
      onConfirmed([...new Set(parentIds)]) // deduplicated parent IDs to auto-expand
      toast.success(`${proposals.length} task${proposals.length === 1 ? '' : 's'} added to WBS`)
    } catch (e) {
      toast.error('Failed to save some tasks — please try again')
    } finally {
      setLoading(false)
    }
  }

  // Group proposals by track then section
  const grouped = proposals.reduce((acc, p) => {
    if (!acc[p.track]) acc[p.track] = {}
    if (!acc[p.track][p.parent_section_name]) acc[p.track][p.parent_section_name] = []
    acc[p.track][p.parent_section_name].push(p)
    return acc
  }, {} as Record<string, Record<string, WbsProposal[]>>)

  return (
    <>
      {/* Generate Plan button (outside Dialog) */}
      <Button onClick={handleGenerate} disabled={loading} variant="default" size="sm">
        {loading ? (
          <>
            <Icon name="progress_activity" size={16} className="mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Icon name="auto_awesome" size={16} className="mr-2" />
            Generate Plan
          </>
        )}
      </Button>

      {/* Dialog (controlled by open state) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-Generated WBS Proposals</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {proposals.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <Icon name="auto_awesome" size={48} className="mx-auto mb-3 text-zinc-300" />
                <p className="text-sm font-medium">No new tasks to suggest</p>
                <p className="text-xs mt-1">Your WBS is up to date!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(grouped).map(([track, sections]) => (
                  <div key={track}>
                    <h3 className="text-sm font-semibold text-zinc-800 mb-3">{track} Track</h3>
                    <div className="space-y-4">
                      {Object.entries(sections).map(([sectionName, items]) => (
                        <div key={sectionName} className="border-l-2 border-zinc-200 pl-4">
                          <h4 className="text-xs font-medium text-zinc-600 mb-2">{sectionName}</h4>
                          <ul className="space-y-1">
                            {items.map((item, idx) => (
                              <li key={idx} className="text-sm text-zinc-700 flex items-center gap-2">
                                <span className="text-xs font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-500">
                                  L{item.level}
                                </span>
                                {item.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading || proposals.length === 0}>
              {loading ? (
                <>
                  <Icon name="progress_activity" size={16} className="mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>Add {proposals.length} task{proposals.length === 1 ? '' : 's'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
