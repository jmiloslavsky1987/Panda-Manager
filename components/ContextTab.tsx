'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { IngestionModal } from './IngestionModal'
import type { ProposedChange } from './IngestionModal'
import { ScanForUpdatesButton } from './ScanForUpdatesButton'
import type { ExtractionItem } from '@/lib/extraction-types'

interface ContextTabProps {
  projectId: string | number
}

interface UploadHistoryItem {
  id: number
  name: string
  createdAt: string
  status: string
}

interface CompletenessResult {
  tabId: string
  status: 'complete' | 'partial' | 'empty' | 'conflicting'
  score: number
  gaps: string[]
}

interface ExtractionJob {
  id: number
  status: string
  progress_pct: number
  current_chunk: number
  total_chunks: number
  filename?: string
  staged_items_json?: unknown
  proposed_changes_json?: unknown
  filtered_count?: number
  artifact_id?: number
}

interface ActiveBatch {
  batchId: string
  jobs: ExtractionJob[]
  batch_complete: boolean
  all_terminal: boolean
}

export function ContextTab({ projectId }: ContextTabProps) {
  const [isIngestionModalOpen, setIngestionModalOpen] = useState(false)
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([])
  const [completeness, setCompleteness] = useState<CompletenessResult[] | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set())
  const [schemaVersion, setSchemaVersion] = useState<string | null>(null)
  const [activeBatch, setActiveBatch] = useState<ActiveBatch | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const toastFiredRef = useRef<Set<string>>(new Set())
  const dismissedBatchesRef = useRef<Set<string>>(new Set())
  const [initialStage, setInitialStage] = useState<'uploading' | 'extracting' | 'reviewing'>('uploading')
  const [initialReviewItems, setInitialReviewItems] = useState<ExtractionItem[]>([])
  const [initialArtifactId, setInitialArtifactId] = useState<number | undefined>(undefined)
  const [initialFilteredCount, setInitialFilteredCount] = useState<number>(0)
  const [initialProposedChanges, setInitialProposedChanges] = useState<ProposedChange[]>([])
  const [modalKey, setModalKey] = useState(0)

  function toggleTab(tabId: string) {
    setExpandedTabs(prev => {
      const next = new Set(prev)
      if (next.has(tabId)) next.delete(tabId)
      else next.add(tabId)
      return next
    })
  }

  // Helper to open modal at review stage
  const openModalAtReview = (jobs: ExtractionJob[]) => {
    const allItems = jobs.flatMap(j =>
      Array.isArray(j.staged_items_json) ? j.staged_items_json : []
    )
    const allChanges = jobs.flatMap(j =>
      Array.isArray(j.proposed_changes_json) ? j.proposed_changes_json as ProposedChange[] : []
    )
    const totalFiltered = jobs.reduce((sum, j) => sum + (j.filtered_count ?? 0), 0)
    const firstArtifactId = jobs[0]?.artifact_id
    setInitialReviewItems(allItems as ExtractionItem[])
    setInitialProposedChanges(allChanges)
    setInitialFilteredCount(totalFiltered)
    setInitialArtifactId(firstArtifactId)
    setInitialStage('reviewing')
    setModalKey(k => k + 1); setIngestionModalOpen(true)
  }

  const retryExtraction = async (artifactId: number) => {
    try {
      const res = await fetch('/api/ingestion/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactIds: [artifactId], projectId: Number(projectId) }),
      })
      if (!res.ok) throw new Error('Failed to start extraction')
      setInitialStage('extracting')
      setInitialReviewItems([])
      setModalKey(k => k + 1)
      setIngestionModalOpen(true)
    } catch {
      toast.error('Failed to re-extract document')
    }
  }

  const cancelExtraction = async () => {
    if (!activeBatch || cancelling) return
    setCancelling(true)
    await Promise.allSettled(
      activeBatch.jobs.map(job => fetch(`/api/ingestion/jobs/${job.id}`, { method: 'DELETE' }))
    )
    setActiveBatch(null)
    setCancelling(false)
  }

  // Poll extraction status for background progress
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/extraction-status`)
        if (!res.ok) return
        const data = await res.json()

        // Find the most recent active batch (highest index)
        const batchEntries = Object.entries(data.batches ?? {})
        if (batchEntries.length === 0) {
          setActiveBatch(null)
          return
        }

        const [batchId, batch] = batchEntries[batchEntries.length - 1] as [string, any]
        if (dismissedBatchesRef.current.has(batchId)) return
        setActiveBatch({ batchId, ...batch })

        // Fire toast ONCE when batch_complete becomes true
        if (batch.batch_complete && !toastFiredRef.current.has(batchId)) {
          toastFiredRef.current.add(batchId)
          const totalItems = batch.jobs.reduce((sum: number, j: ExtractionJob) =>
            sum + (Array.isArray(j.staged_items_json) ? j.staged_items_json.length : 0), 0)
          toast.success(`Extraction complete — review ${totalItems} items`, {
            action: { label: 'Review', onClick: () => openModalAtReview(batch.jobs) },
          })
        }
      } catch (err) {
        console.error('Failed to check extraction status:', err)
      }
    }

    checkStatus() // Initial check on mount
    const interval = setInterval(checkStatus, 5000) // 5s background polling
    return () => clearInterval(interval)
  }, [projectId])

  // Load upload history from artifacts table
  const refreshHistory = () => {
    fetch(`/api/projects/${projectId}/artifacts`)
      .then(res => res.ok ? res.json() : [])
      .then((data: Array<{ id: number; name: string; status: string; createdAt: string }>) => {
        setUploadHistory(data.map(item => ({
          id: item.id,
          name: item.name,
          createdAt: item.createdAt,
          status: item.status ?? 'pending',
        })));
      })
      .catch(() => {/* silent — history is non-critical */});
  };
  useEffect(() => { refreshHistory(); }, [projectId]);

  // Completeness analysis handler (wired in Plan 05)
  async function handleAnalyze() {
    setIsAnalyzing(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/completeness`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Completeness analysis failed')
      const data = await res.json()
      // data is now { schemaVersion: string, results: CompletenessResult[] }
      setCompleteness(data.results)
      setSchemaVersion(data.schemaVersion ?? null)
    } catch (err) {
      console.error(err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handler for modal close — reset state
  const handleModalClose = (open: boolean) => {
    setIngestionModalOpen(open)
    if (!open) {
      // Reset modal state when closing
      setInitialStage('uploading')
      setInitialReviewItems([])
      setInitialArtifactId(undefined)
      setInitialFilteredCount(0)
      setInitialProposedChanges([])
      // If batch was completed and reviewed, clear it
      if (activeBatch?.batch_complete) {
        setActiveBatch(null)
      }
      refreshHistory()
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Section 0: Scan for Updates */}
      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Scan for Updates</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Scan connected sources (Slack, Gmail, Glean, Gong) for new project-relevant content.
            </p>
          </div>
          <ScanForUpdatesButton
            projectId={typeof projectId === 'string' ? parseInt(projectId, 10) : projectId}
          />
        </div>
      </section>

      {/* Section 1: Upload or Extraction Progress */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-2">Upload Documents</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upload meeting notes, status reports, or any project document. Claude will extract and route content to the correct workspace tabs for your review.
        </p>

        {/* Show extraction progress if active batch exists and not complete */}
        {activeBatch && !activeBatch.batch_complete && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-blue-900">Extraction in Progress</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setInitialStage('extracting'); setModalKey(k => k + 1); setIngestionModalOpen(true); }}
                  className="text-xs text-blue-700 hover:text-blue-900 underline underline-offset-2 transition-colors"
                >
                  View Progress
                </button>
                <button
                  onClick={cancelExtraction}
                  disabled={cancelling}
                  className="text-xs text-blue-500 hover:text-red-600 underline underline-offset-2 disabled:opacity-50 transition-colors"
                >
                  {cancelling ? 'Cancelling…' : 'Cancel extraction'}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {activeBatch.jobs.map((job, i) => {
                const filename = job.filename || `File ${i + 1}`
                const progress = job.progress_pct || 0
                const chunk = job.current_chunk || 0
                const total = job.total_chunks || 0

                return (
                  <div key={job.id} className="text-sm text-blue-800">
                    {total > 0
                      ? `${filename} — ${progress}% — Processing chunk ${chunk} of ${total}`
                      : `${filename} — Extracting...`}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Show ready-for-review card if batch complete */}
        {activeBatch && activeBatch.batch_complete && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-4">
            <h3 className="text-sm font-medium text-green-900 mb-2">Ready for Review</h3>
            <p className="text-sm text-green-700 mb-3">
              Extraction complete. Review and approve extracted items.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => openModalAtReview(activeBatch.jobs)}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Review Items
              </button>
              <button
                onClick={() => {
                  dismissedBatchesRef.current.add(activeBatch.batchId)
                  setActiveBatch(null)
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Show upload button if no active batch, or batch is terminal */}
        {(!activeBatch || activeBatch.all_terminal) && (
          <button
            onClick={() => {
              setInitialStage('uploading')
              setInitialReviewItems([])
              setModalKey(k => k + 1); setIngestionModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Upload Document
          </button>
        )}
      </section>

      {/* Section 2: Upload History */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Upload History</h2>
        {uploadHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Filename</th>
                <th className="pb-2 font-medium">Uploaded</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {uploadHistory.map(item => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === 'approved' ? 'bg-green-100 text-green-800' :
                      item.status === 'failed' ? 'bg-red-100 text-red-800' :
                      item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>{item.status}</span>
                  </td>
                  <td className="py-2">
                    {(item.status === 'pending' || item.status === 'failed') && (
                      <button
                        onClick={() => retryExtraction(item.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Re-extract
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Section 3: Completeness Panel */}
      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Workspace Completeness
            {schemaVersion && (
              <span className="text-xs text-muted-foreground font-normal ml-2">schema {schemaVersion}</span>
            )}
          </h2>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Completeness'}
          </button>
        </div>

        {!completeness && !isAnalyzing && (
          <p className="text-sm text-muted-foreground">
            Click "Analyze Completeness" to see which workspace tabs have quality gaps.
          </p>
        )}

        {isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="animate-spin">...</span>
            <span>Analyzing project data...</span>
          </div>
        )}

        {completeness && (
          <div className="flex flex-col gap-1">
            {completeness.map(tab => (
              <div key={tab.tabId} className="rounded-md border">
                <button
                  onClick={() => toggleTab(tab.tabId)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent"
                >
                  <span className="font-medium capitalize">{tab.tabId}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    tab.status === 'complete' ? 'bg-green-100 text-green-800' :
                    tab.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    tab.status === 'conflicting' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.status}{typeof tab.score === 'number' ? ` — ${tab.score}%` : ''}
                  </span>
                </button>
                {expandedTabs.has(tab.tabId) && tab.gaps.length > 0 && (
                  <div className="border-t px-4 py-3">
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {tab.gaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {expandedTabs.has(tab.tabId) && tab.gaps.length === 0 && (
                  <div className="border-t px-4 py-3 text-sm text-muted-foreground">
                    No specific gaps identified.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <IngestionModal
        key={modalKey}
        projectId={typeof projectId === 'string' ? parseInt(projectId, 10) : projectId}
        open={isIngestionModalOpen}
        onOpenChange={handleModalClose}
        initialStage={initialStage}
        initialReviewItems={initialReviewItems}
        initialArtifactId={initialArtifactId}
        initialFilteredCount={initialFilteredCount}
        initialProposedChanges={initialProposedChanges}
      />
    </div>
  )
}
