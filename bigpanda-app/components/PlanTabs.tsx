'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PLAN_TABS = [
  { label: 'Phase Board', segment: 'board' },
  { label: 'Task Board', segment: 'tasks' },
  { label: 'Gantt', segment: 'gantt' },
  { label: 'Swimlane', segment: 'swimlane' },
] as const

interface PlanTabsProps {
  projectId: string
}

export function PlanTabs({ projectId }: PlanTabsProps) {
  const pathname = usePathname()

  return (
    <nav className="flex border-b bg-white px-4 gap-1" data-testid="plan-tabs-nav">
      {PLAN_TABS.map((tab) => {
        const href = `/customer/${projectId}/plan/${tab.segment}`
        const isActive = pathname.endsWith('/' + tab.segment)
        return (
          <Link
            key={tab.segment}
            href={href}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
