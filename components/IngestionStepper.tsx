'use client'

import { Loader2, CheckCircle, XCircle, Circle } from 'lucide-react'

interface StepperFile {
  name: string
  status: 'pending' | 'extracting' | 'done' | 'error'
}

interface IngestionStepperProps {
  files: StepperFile[]
  currentIndex: number
  onSelectFile: (index: number) => void
}

function StatusBadge({ status }: { status: StepperFile['status'] }) {
  if (status === 'extracting') {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
        <Loader2 className="h-3 w-3 animate-spin" />
        Extracting
      </span>
    )
  }
  if (status === 'done') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle className="h-3 w-3" />
        Done
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <XCircle className="h-3 w-3" />
        Error
      </span>
    )
  }
  // pending
  return (
    <span className="flex items-center gap-1 text-xs text-zinc-400 font-medium">
      <Circle className="h-3 w-3" />
      Pending
    </span>
  )
}

export function IngestionStepper({ files, currentIndex, onSelectFile }: IngestionStepperProps) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide px-3 mb-2">
        Files ({files.length})
      </p>
      {files.map((file, idx) => {
        const isActive = idx === currentIndex
        const isClickable = file.status === 'done' || file.status === 'error'

        return (
          <button
            key={idx}
            type="button"
            disabled={!isClickable}
            onClick={() => isClickable && onSelectFile(idx)}
            className={[
              'flex flex-col items-start gap-0.5 px-3 py-2 rounded text-left transition-colors w-full',
              isActive
                ? 'bg-blue-50 border-l-2 border-blue-500'
                : 'border-l-2 border-transparent hover:bg-zinc-50',
              !isClickable ? 'cursor-default' : 'cursor-pointer',
            ].join(' ')}
            aria-current={isActive ? 'step' : undefined}
          >
            <span
              className={[
                'text-sm font-medium truncate max-w-full',
                isActive ? 'text-blue-700' : 'text-zinc-700',
              ].join(' ')}
              title={file.name}
            >
              {file.name}
            </span>
            <StatusBadge status={file.status} />
          </button>
        )
      })}
    </div>
  )
}
