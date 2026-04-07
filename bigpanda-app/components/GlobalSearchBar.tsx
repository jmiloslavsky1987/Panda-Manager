'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/lib/queries'

const TABLE_TO_TAB: Record<string, string> = {
  'actions': 'actions',
  'risks': 'risks',
  'key_decisions': 'decisions',
  'milestones': 'milestones',
  'tasks': 'plan',
  'stakeholders': 'stakeholders',
  'artifacts': 'context',
  'engagement_history': 'history',
}

interface GlobalSearchBarProps {
  projectId: number
}

export default function GlobalSearchBar({ projectId }: GlobalSearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&projectId=${projectId}`, {})
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(true)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, projectId])

  const handleResultClick = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    const tab = TABLE_TO_TAB[result.table] ?? result.table
    router.push(`/customer/${projectId}/${tab}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="w-64 px-3 py-1.5 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && (
        <div className="absolute top-full left-0 mt-1 w-96 max-h-96 overflow-y-auto bg-white border border-zinc-200 rounded-md shadow-lg z-50">
          {loading && (
            <div className="px-4 py-3 text-sm text-zinc-500">Searching...</div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-zinc-500">No results found</div>
          )}
          {!loading && results.length > 0 && (
            <div className="py-2">
              {Object.entries(groupBySection(results)).map(([section, items]) => (
                <div key={section} className="mb-3 last:mb-0">
                  <h3 className="px-4 text-xs font-semibold text-zinc-700 mb-1">
                    {section} ({items.length})
                  </h3>
                  <div>
                    {items.map((item) => (
                      <button
                        key={`${item.table}-${item.id}`}
                        onClick={() => handleResultClick(item)}
                        data-testid={`search-result-${item.table}-${item.id}`}
                        className="w-full text-left px-4 py-2 hover:bg-zinc-100 transition-colors"
                      >
                        <div className="font-medium text-sm">{item.title}</div>
                        {item.snippet && (
                          <div className="text-xs text-zinc-500 truncate mt-0.5">
                            {item.snippet}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function groupBySection(results: SearchResult[]): Record<string, SearchResult[]> {
  return results.reduce((acc, r) => {
    if (!acc[r.section]) acc[r.section] = []
    acc[r.section].push(r)
    return acc
  }, {} as Record<string, SearchResult[]>)
}
