'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from './Icon'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PortfolioProject } from '@/lib/queries'

interface PortfolioExceptionsPanelProps {
  projects: PortfolioProject[]
}

interface ExceptionRow {
  projectId: number
  projectName: string
  exceptionType: 'overdue' | 'stale' | 'blocker' | 'ownership' | 'dependency'
  description: string
  severity: 1 | 2 | 3 | 4 | 5
}

function computeExceptions(projects: PortfolioProject[]): ExceptionRow[] {
  const exceptions: ExceptionRow[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const project of projects) {
    // 1. Overdue milestones (severity 2)
    if (project.nextMilestone && project.nextMilestoneDate) {
      const milestoneDate = new Date(project.nextMilestoneDate)
      if (milestoneDate < today) {
        const diffDays = Math.floor((today.getTime() - milestoneDate.getTime()) / (1000 * 60 * 60 * 24))
        exceptions.push({
          projectId: project.id,
          projectName: project.customer,
          exceptionType: 'overdue',
          description: `Milestone '${project.nextMilestone}' was due ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`,
          severity: 2,
        })
      }
    }

    // 2. Stale updates (severity 4)
    const lastUpdate = new Date(project.updated_at)
    const daysSinceUpdate = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceUpdate > 14) {
      exceptions.push({
        projectId: project.id,
        projectName: project.customer,
        exceptionType: 'stale',
        description: `No updates in ${daysSinceUpdate} ${daysSinceUpdate === 1 ? 'day' : 'days'}`,
        severity: 4,
      })
    }

    // 3. Open blockers (severity 1 - highest priority)
    const alreadyHasBlockerException = project.dependencyStatus === 'Blocked'
    if (alreadyHasBlockerException) {
      exceptions.push({
        projectId: project.id,
        projectName: project.customer,
        exceptionType: 'blocker',
        description: 'Tasks blocked by dependencies',
        severity: 1,
      })
    }

    // 4. Missing ownership (severity 3)
    if (!project.owner) {
      exceptions.push({
        projectId: project.id,
        projectName: project.customer,
        exceptionType: 'ownership',
        description: 'No project owner assigned',
        severity: 3,
      })
    }

    // 5. Unresolved dependencies (severity 5 - same signal as blockers, different labeling)
    // Skip if already flagged as blocker to avoid duplicates
    if (project.dependencyStatus === 'Blocked' && !alreadyHasBlockerException) {
      exceptions.push({
        projectId: project.id,
        projectName: project.customer,
        exceptionType: 'dependency',
        description: 'Unresolved cross-project dependencies',
        severity: 5,
      })
    }
  }

  // Sort by severity ASC (highest priority first), then projectName ASC
  return exceptions.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity - b.severity
    return a.projectName.localeCompare(b.projectName)
  })
}

const exceptionTypeBadges: Record<ExceptionRow['exceptionType'], { label: string; colorClasses: string }> = {
  overdue: { label: 'Overdue', colorClasses: 'bg-red-100 text-red-800' },
  stale: { label: 'Stale', colorClasses: 'bg-yellow-100 text-yellow-800' },
  blocker: { label: 'Blocker', colorClasses: 'bg-orange-100 text-orange-800' },
  ownership: { label: 'Ownership', colorClasses: 'bg-amber-100 text-amber-800' },
  dependency: { label: 'Dependency', colorClasses: 'bg-orange-100 text-orange-800' },
}

export function PortfolioExceptionsPanel({ projects }: PortfolioExceptionsPanelProps) {
  const exceptions = computeExceptions(projects)
  const [isExpanded, setIsExpanded] = useState(exceptions.length > 0)

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-lg font-semibold text-zinc-900">
          Exceptions {exceptions.length > 0 && `(${exceptions.length})`}
        </h2>
        {isExpanded ? (
          <Icon name="expand_less" size={20} className="text-zinc-500" />
        ) : (
          <Icon name="expand_more" size={20} className="text-zinc-500" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-2">
          {exceptions.length === 0 ? (
            <p className="text-zinc-500 text-sm">No exceptions — all projects healthy</p>
          ) : (
            exceptions.map((exception, idx) => {
              const badgeConfig = exceptionTypeBadges[exception.exceptionType]
              return (
                <div
                  key={`${exception.projectId}-${exception.exceptionType}-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
                >
                  <Link
                    href={`/customer/${exception.projectId}`}
                    className="font-medium text-zinc-900 hover:text-blue-600 underline"
                  >
                    {exception.projectName}
                  </Link>
                  <Badge className={badgeConfig.colorClasses}>{badgeConfig.label}</Badge>
                  <span className="text-sm text-zinc-700">{exception.description}</span>
                </div>
              )
            })
          )}
        </div>
      )}
    </Card>
  )
}
