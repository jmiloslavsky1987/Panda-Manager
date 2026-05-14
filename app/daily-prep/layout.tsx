'use client'
// Phase 85.2 — Layout wraps /daily-prep and /daily-prep/briefing with the persistent SubTabBar.
// Active tab is derived from usePathname() — URL is the canonical signal, no query params.

import { usePathname } from 'next/navigation'
import { SubTabBar, type SubTabItem } from '@/components/SubTabBar'

const ITEMS: SubTabItem[] = [
  { id: 'calendar', label: 'Calendar',         href: '/daily-prep' },
  { id: 'briefing', label: "Today's Briefing",  href: '/daily-prep/briefing' },
]

export default function DailyPrepLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Exact match → calendar; anything starting with /daily-prep/briefing → briefing.
  const activeSubtab: 'calendar' | 'briefing' =
    pathname?.startsWith('/daily-prep/briefing') ? 'briefing' : 'calendar'

  return (
    <>
      <SubTabBar items={ITEMS} activeSubtab={activeSubtab} />
      {children}
    </>
  )
}
