'use client'

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
] satisfies Array<{ label: string; segment: string; subRoute?: boolean }>

interface WorkspaceTabsProps {
  projectId: string | number
}

export function WorkspaceTabs({ projectId }: WorkspaceTabsProps) {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 bg-white z-10 border-b border-zinc-200 overflow-x-auto">
      <div className="flex flex-row px-6">
        {TABS.map((tab) => {
          const href = `/customer/${projectId}/${tab.segment}`
          const isActive = tab.subRoute
            ? pathname.includes('/' + tab.segment)
            : pathname.endsWith('/' + tab.segment)
          return (
            <Link
              key={tab.segment}
              href={href}
              className={
                isActive
                  ? 'text-zinc-900 border-b-2 border-zinc-900 px-4 py-2 font-medium whitespace-nowrap'
                  : 'text-zinc-500 hover:text-zinc-900 border-b-2 border-transparent px-4 py-2 whitespace-nowrap'
              }
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
