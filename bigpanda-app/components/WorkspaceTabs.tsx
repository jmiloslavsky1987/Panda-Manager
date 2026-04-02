'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SubTabBar, SubTabItem } from './SubTabBar'

interface SubTab {
  id: string
  label: string
  segment: string
}

interface TabGroup {
  id: string
  label: string
  standalone?: true
  children?: SubTab[]
}

export const TAB_GROUPS: TabGroup[] = [
  { id: 'overview', label: 'Overview', standalone: true },
  {
    id: 'delivery',
    label: 'Delivery',
    children: [
      { id: 'actions', label: 'Actions', segment: 'actions' },
      { id: 'risks', label: 'Risks', segment: 'risks' },
      { id: 'milestones', label: 'Milestones', segment: 'milestones' },
      { id: 'plan', label: 'Plan', segment: 'plan' },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    children: [
      { id: 'teams', label: 'Teams', segment: 'teams' },
      { id: 'architecture', label: 'Architecture', segment: 'architecture' },
      { id: 'stakeholders', label: 'Stakeholders', segment: 'stakeholders' },
    ],
  },
  {
    id: 'intel',
    label: 'Intel',
    children: [
      { id: 'decisions', label: 'Decisions', segment: 'decisions' },
      { id: 'history', label: 'Engagement History', segment: 'history' },
    ],
  },
  { id: 'skills', label: 'Skills', standalone: true },
  { id: 'chat', label: 'Chat', standalone: true },
  { id: 'context', label: 'Context', standalone: true },
  {
    id: 'admin',
    label: 'Admin',
    children: [
      { id: 'artifacts', label: 'Artifacts', segment: 'artifacts' },
      { id: 'queue', label: 'Review Queue', segment: 'queue' },
    ],
  },
]

interface WorkspaceTabsProps {
  projectId: string | number
}

export function WorkspaceTabs({ projectId }: WorkspaceTabsProps) {
  const searchParams = useSearchParams()
  const [pendingCount, setPendingCount] = useState(0)

  const activeTab = searchParams.get('tab') ?? 'overview'
  const activeSubtab = searchParams.get('subtab')

  // Find the active group
  const activeGroup = TAB_GROUPS.find((g) =>
    g.standalone
      ? g.id === activeTab
      : g.id === activeTab || g.children?.some((c) => c.id === activeSubtab)
  )

  useEffect(() => {
    let cancelled = false

    async function fetchPendingCount() {
      try {
        const res = await fetch(`/api/discovery/queue?projectId=${projectId}`)
        if (!res.ok) return
        const data = (await res.json()) as { items?: { id: number }[] }
        if (!cancelled && Array.isArray(data.items)) {
          setPendingCount(data.items.length)
        }
      } catch {
        // silently ignore — badge is non-critical
      }
    }

    fetchPendingCount()
    return () => {
      cancelled = true
    }
  }, [projectId])

  return (
    <>
      <nav className="sticky top-0 bg-white z-10 border-b border-zinc-200 overflow-x-auto">
        <div className="flex flex-row px-6">
          {TAB_GROUPS.map((group) => {
            const isActive = activeGroup?.id === group.id
            let href: string

            if (group.standalone) {
              // Standalone tabs (Overview, Skills)
              href = `/customer/${projectId}/${group.id}?tab=${group.id}`
            } else {
              // Groups with children - link to first child
              const firstChild = group.children![0]
              href = `/customer/${projectId}/${firstChild.segment}?tab=${group.id}&subtab=${firstChild.id}`
            }

            return (
              <Link
                key={group.id}
                href={href}
                className={
                  isActive
                    ? 'text-zinc-900 border-b-2 border-zinc-900 px-4 py-2 font-medium whitespace-nowrap flex items-center gap-1'
                    : 'text-zinc-500 hover:text-zinc-900 border-b-2 border-transparent px-4 py-2 whitespace-nowrap flex items-center gap-1'
                }
              >
                {group.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Render SubTabBar if active group has children */}
      {activeGroup && !activeGroup.standalone && activeGroup.children && (
        <SubTabBar
          items={activeGroup.children.map((child) => ({
            id: child.id,
            label: child.label,
            href: `/customer/${projectId}/${child.segment}?tab=${activeGroup.id}&subtab=${child.id}`,
            badge:
              activeGroup.id === 'admin' && child.id === 'queue'
                ? pendingCount
                : undefined,
          }))}
          activeSubtab={activeSubtab}
        />
      )}
    </>
  )
}
