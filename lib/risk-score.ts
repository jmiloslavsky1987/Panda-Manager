export interface RiskScoreResult {
  score: number | null
  label: string
  colorClass: string
}

const WEIGHT: Record<string, number> = { low: 1, medium: 2, high: 3 }

export function computeRiskScore(
  likelihood: string | null | undefined,
  impact: string | null | undefined
): RiskScoreResult {
  const l = WEIGHT[likelihood?.toLowerCase() ?? ''] ?? null
  const i = WEIGHT[impact?.toLowerCase() ?? ''] ?? null

  if (l === null || i === null) {
    return { score: null, label: 'N/A', colorClass: 'bg-zinc-100 text-zinc-500' }
  }

  const score = l * i

  if (score <= 2) return { score, label: 'Low', colorClass: 'bg-green-100 text-green-800' }
  if (score <= 4) return { score, label: 'Medium', colorClass: 'bg-amber-100 text-amber-800' }
  if (score === 9) return { score, label: 'Critical', colorClass: 'bg-red-100 text-red-800' }
  return { score, label: 'High', colorClass: 'bg-red-100 text-red-800' }
}
