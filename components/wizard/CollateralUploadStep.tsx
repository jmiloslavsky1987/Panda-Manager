'use client'

import { useState, useRef } from 'react'
import { Checkbox } from '@/components/ui/checkbox'

// ─── Collateral categories ────────────────────────────────────────────────────

export const COLLATERAL_CATEGORIES = [
  { key: 'sow',       label: 'SOW',                        keywords: ['sow', 'statement of work'] },
  { key: 'kickoff',   label: 'Kickoff Deck',               keywords: ['kickoff', 'kick-off', 'kick off'] },
  { key: 'discovery', label: 'Discovery Notes',            keywords: ['discovery'] },
  { key: 'presales',  label: 'Presales Notes',             keywords: ['presales', 'pre-sales', 'pre sales'] },
  { key: 'orgchart',  label: 'Customer Org Chart',         keywords: ['org', 'chart', 'orgchart'] },
  { key: 'tracker',   label: 'Prior Tracker',              keywords: ['tracker', 'prior'] },
  { key: 'gong',      label: 'Gong Transcripts',           keywords: ['gong', 'transcript'] },
  { key: 'arch',      label: 'Architecture Diagram Notes', keywords: ['arch', 'architecture'] },
  { key: 'budget',    label: 'Budget Sheet',               keywords: ['budget', 'finance'] },
]

/**
 * Returns the category key if the filename matches a collateral category, null otherwise.
 * Matching is case-insensitive and checks if any keyword is a substring of the filename.
 */
export function matchCollateralCategory(filename: string): string | null {
  const lower = filename.toLowerCase()
  for (const cat of COLLATERAL_CATEGORIES) {
    if (cat.keywords.some(kw => lower.includes(kw))) return cat.key
  }
  return null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadedFileStatus {
  name: string
  status: 'pending' | 'extracting' | 'done' | 'error'
  artifactId?: number
}

interface CollateralUploadStepProps {
  projectId: number
  fileStatuses: UploadedFileStatus[]
  checklistState: Record<string, boolean>
  onChecklistChange: (state: Record<string, boolean>) => void
  onFilesUploaded: (statuses: UploadedFileStatus[]) => void
  onSkip: () => void
  onContinue: () => void
}

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.xlsx', '.md', '.txt']

const STATUS_LABELS: Record<UploadedFileStatus['status'], string> = {
  pending: 'Pending',
  extracting: 'Processing',
  done: 'Uploaded',
  error: 'Error',
}

const STATUS_CLASSES: Record<UploadedFileStatus['status'], string> = {
  pending: 'bg-gray-100 text-gray-600',
  extracting: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CollateralUploadStep({
  projectId,
  fileStatuses,
  checklistState,
  onChecklistChange,
  onFilesUploaded,
  onSkip,
  onContinue,
}: CollateralUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Checklist toggle ──────────────────────────────────────────────────────

  function toggleChecklist(key: string, checked: boolean) {
    onChecklistChange({ ...checklistState, [key]: checked })
  }

  // ── Auto-check matching categories ───────────────────────────────────────

  function autoCheckFromFiles(files: File[], current: Record<string, boolean>): Record<string, boolean> {
    const updated = { ...current }
    for (const file of files) {
      const matchedKey = matchCollateralCategory(file.name)
      if (matchedKey) updated[matchedKey] = true
    }
    return updated
  }

  // ── Upload files ──────────────────────────────────────────────────────────

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return

    const valid = files.filter(f =>
      ALLOWED_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))
    )
    if (valid.length === 0) {
      setUploadError('No supported file types found. Accepted: PDF, DOCX, PPTX, XLSX, MD, TXT')
      return
    }

    setUploading(true)
    setUploadError(null)

    // Auto-check checklist for matching files
    const updatedChecklist = autoCheckFromFiles(valid, checklistState)
    onChecklistChange(updatedChecklist)

    // Add pending statuses immediately
    const pendingStatuses: UploadedFileStatus[] = [
      ...fileStatuses,
      ...valid.map(f => ({ name: f.name, status: 'pending' as const })),
    ]
    onFilesUploaded(pendingStatuses)

    const formData = new FormData()
    formData.append('project_id', String(projectId))
    valid.forEach(f => formData.append('files', f))

    try {
      const res = await fetch('/api/ingestion/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      // API returns { artifacts: [{ id, name, ingestion_status }] }
      const artifacts: Array<{ id: number; name: string }> = data.artifacts ?? []

      const newStatuses: UploadedFileStatus[] = valid.map((f, i) => ({
        name: f.name,
        status: 'done' as const,
        artifactId: artifacts[i]?.id,
      }))

      onFilesUploaded([...fileStatuses, ...newStatuses])
    } catch (err) {
      // Mark files as error
      const errorStatuses: UploadedFileStatus[] = valid.map(f => ({
        name: f.name,
        status: 'error' as const,
      }))
      onFilesUploaded([...fileStatuses, ...errorStatuses])
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    void uploadFiles(files)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) void uploadFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasFiles = fileStatuses.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Upload Collateral Documents</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload documents to help AI extract project details. All items are optional.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recommended Documents</h3>
          <ul className="space-y-2">
            {COLLATERAL_CATEGORIES.map(cat => (
              <li key={cat.key} className="flex items-center gap-3">
                <Checkbox
                  id={`checklist-${cat.key}`}
                  checked={!!checklistState[cat.key]}
                  onCheckedChange={(checked) => toggleChecklist(cat.key, !!checked)}
                />
                <label
                  htmlFor={`checklist-${cat.key}`}
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  {cat.label}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* Drop zone */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Upload Files</h3>

          <div
            role="region"
            aria-label="File drop zone"
            className={[
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-150 cursor-pointer',
              isDragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400',
              uploading ? 'pointer-events-none opacity-60' : '',
            ].join(' ')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {uploading ? 'Uploading…' : 'Drag and drop files here, or click to browse'}
              </p>
              <p className="text-xs text-gray-400">
                PDF, DOCX, PPTX, XLSX, MD, TXT
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.xlsx,.md,.txt"
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          {/* Upload error */}
          {uploadError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700" role="alert">
              {uploadError}
            </div>
          )}

          {/* File list */}
          {hasFiles && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded Files</h4>
              <ul className="space-y-1">
                {fileStatuses.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 py-1">
                    <span className="text-sm text-gray-700 truncate">{file.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLASSES[file.status]}`}
                    >
                      {STATUS_LABELS[file.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <button
          type="button"
          onClick={onSkip}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          disabled={uploading}
        >
          Skip this step
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={uploading}
          className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
