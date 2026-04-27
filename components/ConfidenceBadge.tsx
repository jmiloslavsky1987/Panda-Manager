'use client'

export function ConfidenceBadge({ confidence }: { confidence: 'high' | 'low' | 'none' }) {
  const styles = {
    high: 'bg-green-100 text-green-700',
    low: 'bg-amber-100 text-amber-700',
    none: 'bg-zinc-100 text-zinc-500',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${styles[confidence]}`}>
      {confidence}
    </span>
  )
}
