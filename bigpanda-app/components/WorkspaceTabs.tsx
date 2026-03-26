'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const TABS = [
  { label: 'Overview', segment: 'overview' },
  { label: 'Actions', segment: 'actions' },
  { label: 'Risks', segment: 'risks' },
  { label: 'Milestones', segment: 'milestones' },
  { label: 'Teams', segment: 'teams' },
  { label: 'Architecture', segment: 'architecture' },
  { label: 'Decisions', segment: 'decisions' },
  { label: 'Engagement History', segment: 'history' },
  { label: 'Stakeholders', segment: 'stakeholders' },
  { label: 'Plan', segment: 'plan', subRoute: true },   // 10th tab
  { label: 'Skills', segment: 'skills', subRoute: true }, // 11th tab
  { label: 'Time', segment: 'time' },                    // 12th tab
  { label: 'Artifacts', segment: 'artifacts' },          // 13th tab
  { label: 'Review Queue', segment: 'queue' },           // 14th tab
] satisfies Array<{ label: string; segment: string; subRoute?: boolean }>

interface WorkspaceTabsProps {
  projectId: string | number
}

export function WorkspaceTabs({ projectId }: WorkspaceTabsProps) {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchPendingCount() {
      try {
        const res = await fetch(`/api/discovery/queue?projectId=${projectId}`)
        if (!res.ok) return
        const data = await res.json() as { items?: { id: number }[] }
        if (!cancelled && Array.isArray(data.items)) {
          setPendingCount(data.items.length)
        }
      } catch {
        // silently ignore — badge is non-critical
      }
    }

    fetchPendingCount()
    return () => { cancelled = true }
  }, [projectId])

  return (
    <nav className="sticky top-0 bg-white z-10 border-b border-zinc-200 overflow-x-auto">
      <div className="flex flex-row px-6">
        {TABS.map((tab) => {
          const href = `/customer/${projectId}/${tab.segment}`
          const isActive = tab.subRoute
            ? pathname.includes('/' + tab.segment)
            : pathname.endsWith('/' + tab.segment)
          const isQueueTab = tab.segment === 'queue'
          return (
            <Link
              key={tab.segment}
              href={href}
              className={
                isActive
                  ? 'text-zinc-900 border-b-2 border-zinc-900 px-4 py-2 font-medium whitespace-nowrap flex items-center gap-1'
                  : 'text-zinc-500 hover:text-zinc-900 border-b-2 border-transparent px-4 py-2 whitespace-nowrap flex items-center gap-1'
              }
            >
              {tab.label}
              {isQueueTab && pendingCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 text-white text-xs px-1.5 py-0.5">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
