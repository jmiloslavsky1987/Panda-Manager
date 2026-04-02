'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { IngestionStepper } from './IngestionStepper'
import { ExtractionPreview } from './ExtractionPreview'
import type { ExtractionItem } from '@/lib/extraction-types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewItem extends ExtractionItem {
  approved: boolean
  edited: boolean
  conflict?: {
    existingId: number
    existingRecord: Record<string, string>
    resolution?: 'merge' | 'replace' | 'skip'
  }
}

type Stage = 'uploading' | 'extracting' | 'reviewing' | 'submitting' | 'done'

interface FileStatus {
  name: string
  status: 'pending' | 'extracting' | 'done' | 'error'
  fileId?: string  // returned by upload endpoint
}

interface IngestionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  artifactId?: number
  /** Pre-populate the upload queue with files (e.g. from drag-and-drop on the Artifacts tab) */
  initialFiles?: File[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IngestionModal({ open, onOpenChange, projectId, artifactId, initialFiles }: IngestionModalProps) {
  const [stage, setStage] = useState<Stage>('uploading')
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [filteredCount, setFilteredCount] = useState<number>(0)
  // Track the artifact ID used during extraction (drop-zone flow has no prop-level artifactId)
  const [lastExtractedArtifactId, setLastExtractedArtifactId] = useState<number | null>(null)
  const [extractionMessage, setExtractionMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  // Ref prevents double-firing in React StrictMode
  const autoStartedRef = useRef(false)

  // ── Upload all files upfront ──────────────────────────────────────────────
  const handleFileDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setStage('uploading')
    setFileStatuses(acceptedFiles.map(f => ({ name: f.name, status: 'pending' })))
    setCurrentFileIndex(0)
    setReviewItems([])
    setFilteredCount(0)
    setError(null)

    const formData = new FormData()
    formData.append('project_id', String(projectId))
    if (artifactId != null) formData.append('artifact_id', String(artifactId))
    acceptedFiles.forEach(f => formData.append('files', f))

    let uploadedIds: string[] = []
    try {
      const res = await fetch('/api/ingestion/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      // API returns { artifacts: [{ id, name, ingestion_status }] }
      uploadedIds = (data.artifacts ?? []).map((a: { id: number }) => String(a.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      return
    }

    const newStatuses: FileStatus[] = acceptedFiles.map((f, i) => ({
      name: f.name,
      status: 'pending',
      fileId: uploadedIds[i],
    }))
    setFileStatuses(newStatuses)
    setStage('extracting')
    // Trigger extraction for first file
    await extractFile(0, newStatuses)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, artifactId])

  // Auto-start upload when modal opens with initialFiles from ArtifactsDropZone
  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0 && !autoStartedRef.current) {
      autoStartedRef.current = true
      handleFileDrop(initialFiles)
    }
    // Reset when modal closes so next open can re-trigger
    if (!open) {
      autoStartedRef.current = false
    }
  }, [open, initialFiles, handleFileDrop])

  // ── Extract a single file via SSE ─────────────────────────────────────────
  const extractFile = useCallback(async (idx: number, statuses: FileStatus[]) => {
    const file = statuses[idx]
    if (!file) return

    setCurrentFileIndex(idx)
    setFileStatuses(prev => prev.map((f, i) =>
      i === idx ? { ...f, status: 'extracting' } : f
    ))
    setExtractionMessage(`Extracting ${file.name}…`)

    const artifactIdForExtract = file.fileId ? Number(file.fileId) : (artifactId ?? null)
    if (!artifactIdForExtract) {
      setError(`No artifact ID available for ${file.name}`)
      return
    }

    try {
      // Extract route is POST+SSE — use fetch streaming (EventSource is GET-only)
      const res = await fetch('/api/ingestion/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId: artifactIdForExtract, projectId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Extraction failed (${res.status})`)
      }

      const items: ReviewItem[] = await new Promise((resolve, reject) => {
        const accumulated: ReviewItem[] = []
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        async function pump() {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) { resolve(accumulated); break }
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() ?? ''
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue
                try {
                  const parsed = JSON.parse(line.slice(6))
                  if (parsed.type === 'progress') {
                    setExtractionMessage(parsed.message ?? `Extracting ${file.name}…`)
                  } else if (parsed.type === 'item') {
                    // Individual item streaming (future use)
                    const item: ReviewItem = {
                      ...(parsed.item as ExtractionItem),
                      approved: true,
                      edited: false,
                      conflict: parsed.item.conflict,
                    }
                    accumulated.push(item)
                  } else if (parsed.type === 'complete') {
                    // Bulk completion — extract route sends all items in one event
                    if (parsed.filteredCount) {
                      setFilteredCount(prev => prev + (parsed.filteredCount as number))
                    }
                    for (const raw of (parsed.items ?? [])) {
                      accumulated.push({
                        ...(raw as ExtractionItem),
                        approved: true,
                        edited: false,
                        conflict: (raw as ExtractionItem & { conflict?: ReviewItem['conflict'] }).conflict,
                      })
                    }
                    resolve(accumulated); return
                  } else if (parsed.type === 'done') {
                    resolve(accumulated); return
                  } else if (parsed.type === 'error') {
                    reject(new Error(parsed.message ?? 'Extraction error')); return
                  }
                } catch { /* ignore malformed SSE frames */ }
              }
            }
          } catch (err) {
            reject(err)
          }
        }
        pump()
      })

      setReviewItems(prev => [...prev, ...items])
      setLastExtractedArtifactId(artifactIdForExtract)
      setFileStatuses(prev => prev.map((f, i) =>
        i === idx ? { ...f, status: 'done' } : f
      ))

      // Advance to next file or move to reviewing stage
      const nextIdx = idx + 1
      if (nextIdx < statuses.length) {
        setCurrentFileIndex(nextIdx)
        // Wait for user to navigate to next file — extraction is triggered on demand
        setStage('extracting')
      } else {
        setStage('reviewing')
      }
    } catch (err) {
      setFileStatuses(prev => prev.map((f, i) =>
        i === idx ? { ...f, status: 'error' } : f
      ))
      setError(err instanceof Error ? err.message : 'Extraction failed')
    }
  }, [projectId, artifactId])

  // ── User selects a file in the stepper ────────────────────────────────────
  async function handleSelectFile(idx: number) {
    const file = fileStatuses[idx]
    if (!file || file.status === 'extracting') return

    if (file.status === 'pending') {
      // Trigger extraction on demand
      await extractFile(idx, fileStatuses)
    } else {
      setCurrentFileIndex(idx)
    }
  }

  // ── Item change handler from ExtractionPreview ────────────────────────────
  function handleItemChange(index: number, changes: Partial<ReviewItem>) {
    setReviewItems(prev => prev.map((item, i) => i === index ? { ...item, ...changes } : item))
  }

  // ── Final approve submission ───────────────────────────────────────────────
  async function handleApprove(approvedItems: ReviewItem[]) {
    setStage('submitting')
    setError(null)

    try {
      const res = await fetch('/api/ingestion/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          artifactId: artifactId ?? lastExtractedArtifactId,
          items: approvedItems,
          totalExtracted: reviewItems.length,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Approve failed')
      setStage('done')
      setTimeout(() => onOpenChange(false), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
      setStage('reviewing')
    }
  }

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    handleFileDrop(files)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    handleFileDrop(files)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Document Ingestion</DialogTitle>
        </DialogHeader>

        {/* Upload drop zone — shown before files are loaded */}
        {(stage === 'uploading' && fileStatuses.length === 0) && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-4"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="border-2 border-dashed border-zinc-300 rounded-xl p-16 text-center space-y-3 hover:border-zinc-400 transition-colors">
              <p className="text-lg font-medium text-zinc-600">
                Drop files here to ingest
              </p>
              <p className="text-sm text-zinc-400">
                Supported: PDF, DOCX, PPTX, XLSX, MD, TXT
              </p>
              <label className="inline-block cursor-pointer mt-2">
                <span className="text-sm text-blue-600 underline">or browse files</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.xlsx,.md,.txt"
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </label>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
        )}

        {/* Main layout: sidebar + content */}
        {fileStatuses.length > 0 && (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar — file stepper */}
            <div className="w-64 border-r bg-zinc-50 overflow-y-auto shrink-0">
              <IngestionStepper
                files={fileStatuses}
                currentIndex={currentFileIndex}
                onSelectFile={handleSelectFile}
              />
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Extracting stage: progress message + pulsing skeleton */}
              {(stage === 'extracting' || stage === 'uploading') && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600 animate-pulse">{extractionMessage || 'Uploading files…'}</p>
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 bg-zinc-100 rounded animate-pulse"
                        style={{ opacity: 1 - i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Reviewing stage: extraction preview */}
              {stage === 'reviewing' && (
                <>
                  {filteredCount > 0 && (
                    <div className="mb-3 px-3 py-2 bg-zinc-100 border border-zinc-200 rounded text-xs text-zinc-500">
                      <span className="font-medium text-zinc-700">{filteredCount} item{filteredCount !== 1 ? 's' : ''} already in your project</span> — skipped as duplicates and not shown below.
                    </div>
                  )}
                  <ExtractionPreview
                    items={reviewItems}
                    onItemChange={handleItemChange}
                    onApprove={handleApprove}
                  />
                </>
              )}

              {/* Submitting stage */}
              {stage === 'submitting' && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-zinc-500 animate-pulse">Saving approved items…</p>
                </div>
              )}

              {/* Done stage */}
              {stage === 'done' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <p className="text-green-600 font-medium">Ingestion complete!</p>
                    <p className="text-sm text-zinc-500">Items saved to your project.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
