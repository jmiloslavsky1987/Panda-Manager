'use client'

import type { PortfolioProject } from '@/lib/queries'

interface PortfolioSummaryChipsProps {
  projects: PortfolioProject[]
}

export function PortfolioSummaryChips({ projects }: PortfolioSummaryChipsProps) {
  // Compute summary stats from projects array
  const totalActive = projects.length
  const onTrack = projects.filter(p => p.health === 'green').length
  const atRisk = projects.filter(p => p.health === 'yellow').length
  const offTrack = projects.filter(p => p.health === 'red').length
  const blocked = projects.filter(p => p.dependencyStatus === 'Blocked').length
  const overdueMilestonesCount = projects.reduce((sum, p) => sum + (p.overdueMilestones ?? 0), 0)

  const chips = [
    {
      label: 'Total Active',
      count: totalActive,
      colorClasses: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      label: 'On Track',
      count: onTrack,
      colorClasses: 'bg-green-100 text-green-800 border-green-200',
    },
    {
      label: 'At Risk',
      count: atRisk,
      colorClasses: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    {
      label: 'Off Track',
      count: offTrack,
      colorClasses: 'bg-red-100 text-red-800 border-red-200',
    },
    {
      label: 'Blocked',
      count: blocked,
      colorClasses: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    {
      label: 'Overdue Milestones',
      count: overdueMilestonesCount,
      colorClasses: 'bg-red-100 text-red-800 border-red-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      {chips.map((chip) => (
        <div
          key={chip.label}
          className={`flex flex-col items-center justify-center rounded-lg border p-4 ${chip.colorClasses}`}
        >
          <div className="text-3xl font-bold">{chip.count}</div>
          <div className="text-sm font-medium mt-2 text-center">{chip.label}</div>
        </div>
      ))}
    </div>
  )
}
