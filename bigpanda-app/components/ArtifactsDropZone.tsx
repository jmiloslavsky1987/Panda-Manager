'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { IngestionModal } from '@/components/IngestionModal'

// Supported file extensions — mirrors ALLOWED_EXTENSIONS in lib/document-extractor.ts
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.xlsx', '.md', '.txt']

interface ArtifactsDropZoneProps {
  projectId: number
  children: React.ReactNode
}

/**
 * ArtifactsDropZone wraps the Artifacts tab content area with drag-and-drop support.
 * Dropping supported files triggers the IngestionModal automatically.
 * A visible dotted border and hint text indicate the zone is droppable.
 * An "Upload Documents" button provides a fallback browse flow for non-drag users.
 */
export function ArtifactsDropZone({ projectId, children }: ArtifactsDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rejectedMessage, setRejectedMessage] = useState<string | null>(null)

  // ── Drag handlers ────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Only clear dragging state when leaving the root drop zone, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    setRejectedMessage(null)

    const files = Array.from(e.dataTransfer.files)
    const valid = files.filter(f =>
      ALLOWED_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))
    )
    const rejected = files.filter(f =>
      !ALLOWED_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))
    )

    if (rejected.length > 0 && valid.length === 0) {
      // All dropped files are unsupported — show error, do not open modal
      const names = rejected.map(f => f.name).join(', ')
      setRejectedMessage(`Unsupported file type(s): ${names}. Allowed: PDF, DOCX, PPTX, XLSX, MD, TXT`)
      return
    }

    if (rejected.length > 0) {
      // Mixed: warn about unsupported but proceed with valid ones
      const names = rejected.map(f => f.name).join(', ')
      setRejectedMessage(`Skipped unsupported file(s): ${names}`)
    }

    if (valid.length > 0) {
      setSelectedFiles(valid)
      setModalOpen(true)
    }
  }

  // ── File browse fallback ─────────────────────────────────────────────────

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      setSelectedFiles(files)
      setModalOpen(true)
    }
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleModalClose(open: boolean) {
    setModalOpen(open)
    if (!open) {
      setSelectedFiles([])
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={[
        'relative min-h-full',
        'border-2 border-dashed transition-colors duration-150',
        isDragging
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-200',
      ].join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Upload Documents button — top-right corner of the drop zone */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Documents
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.xlsx,.md,.txt"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Children: existing artifact list content */}
      {children}

      {/* Hint text — only shown when not actively dragging */}
      {!isDragging && (
        <p className="mt-4 pb-4 text-center text-gray-400 text-sm">
          Drop PDF, DOCX, PPTX, XLSX, MD, or TXT files here to extract project data
        </p>
      )}

      {/* Rejection message for unsupported files */}
      {rejectedMessage && (
        <div
          className="mx-6 mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-center"
          role="alert"
        >
          {rejectedMessage}
        </div>
      )}

      {/* Ingestion modal — opens with pre-validated files */}
      <IngestionModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        projectId={projectId}
        initialFiles={selectedFiles}
      />
    </div>
  )
}
