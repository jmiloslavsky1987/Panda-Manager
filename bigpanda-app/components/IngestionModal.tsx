'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { IngestionStepper } from './IngestionStepper'
import { ExtractionPreview } from './ExtractionPreview'
import type { ExtractionItem } from '@/app/api/ingestion/extract/route'

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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IngestionModal({ open, onOpenChange, projectId, artifactId }: IngestionModalProps) {
  const [stage, setStage] = useState<Stage>('uploading')
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [extractionMessage, setExtractionMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // ── Upload all files upfront ──────────────────────────────────────────────
  async function handleFileDrop(acceptedFiles: File[]) {
    if (acceptedFiles.length === 0) return

    setStage('uploading')
    setFileStatuses(acceptedFiles.map(f => ({ name: f.name, status: 'pending' })))
    setCurrentFileIndex(0)
    setReviewItems([])
    setError(null)

    const formData = new FormData()
    formData.append('projectId', String(projectId))
    if (artifactId != null) formData.append('artifactId', String(artifactId))
    acceptedFiles.forEach(f => formData.append('files', f))

    let uploadedIds: string[] = []
    try {
      const res = await fetch('/api/ingestion/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      // Expect { fileIds: string[] } — one per uploaded file in order
      uploadedIds = data.fileIds ?? acceptedFiles.map((_: File, i: number) => String(i))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      return
    }

    setFileStatuses(acceptedFiles.map((f, i) => ({
      name: f.name,
      status: 'pending',
      fileId: uploadedIds[i],
    })))
    setStage('extracting')
    // Trigger extraction for first file
    await extractFile(0, acceptedFiles.map((f, i) => ({
      name: f.name,
      status: 'pending' as const,
      fileId: uploadedIds[i],
    })))
  }

  // ── Extract a single file via SSE ─────────────────────────────────────────
  const extractFile = useCallback(async (idx: number, statuses: FileStatus[]) => {
    const file = statuses[idx]
    if (!file) return

    setCurrentFileIndex(idx)
    setFileStatuses(prev => prev.map((f, i) =>
      i === idx ? { ...f, status: 'extracting' } : f
    ))
    setExtractionMessage(`Extracting ${file.name}…`)

    const fileId = file.fileId ?? ''
    const params = new URLSearchParams({ fileId, projectId: String(projectId) })
    if (artifactId != null) params.set('artifactId', String(artifactId))

    try {
      const es = new EventSource(`/api/ingestion/extract?${params}`)

      const items: ReviewItem[] = await new Promise((resolve, reject) => {
        const accumulated: ReviewItem[] = []

        es.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data)
            if (parsed.type === 'progress') {
              setExtractionMessage(parsed.message ?? `Extracting ${file.name}…`)
            } else if (parsed.type === 'item') {
              const item: ReviewItem = {
                ...(parsed.item as ExtractionItem),
                approved: true,
                edited: false,
                conflict: parsed.item.conflict,
              }
              accumulated.push(item)
            } else if (parsed.type === 'done') {
              resolve(accumulated)
              es.close()
            } else if (parsed.type === 'error') {
              reject(new Error(parsed.message ?? 'Extraction error'))
              es.close()
            }
          } catch {
            // ignore malformed SSE frames
          }
        }

        es.onerror = () => {
          reject(new Error(`Extraction failed for ${file.name}`))
          es.close()
        }
      })

      setReviewItems(prev => [...prev, ...items])
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
          artifactId,
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
                <ExtractionPreview
                  items={reviewItems}
                  onItemChange={handleItemChange}
                  onApprove={handleApprove}
                />
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
