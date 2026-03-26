'use client'

interface DiffViewProps {
  existing: string
  discovered: string
  onMerge: () => void
  onReplace: () => void
  onSkip: () => void
}

export function DiffView({ existing, discovered, onMerge, onReplace, onSkip }: DiffViewProps) {
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <p className="mb-3 text-sm font-medium text-amber-800">
        Conflict detected — this item overlaps with an existing record. How would you like to proceed?
      </p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="mb-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Current value in DB
          </p>
          <div className="rounded bg-zinc-100 p-3 text-sm text-zinc-700 whitespace-pre-wrap">
            {existing}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Discovered value
          </p>
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-zinc-700 whitespace-pre-wrap">
            {discovered}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onMerge}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Merge
        </button>
        <button
          onClick={onReplace}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Replace
        </button>
        <button
          onClick={onSkip}
          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-600"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
