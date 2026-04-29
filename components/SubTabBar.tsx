'use client'
import Link from 'next/link'

export interface SubTabItem {
  id: string
  label: string
  href: string
  badge?: number
}

interface SubTabBarProps {
  items: SubTabItem[]
  activeSubtab: string | null
}

export function SubTabBar({ items, activeSubtab }: SubTabBarProps) {
  return (
    <nav className="sticky top-[41px] bg-zinc-50 dark:bg-zinc-800 z-10 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
      <div className="flex flex-row px-6">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={
              activeSubtab === item.id
                ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center gap-1'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border-b-2 border-transparent px-4 py-2 text-sm whitespace-nowrap flex items-center gap-1'
            }
          >
            {item.label}
            {item.badge && item.badge > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white text-xs px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
