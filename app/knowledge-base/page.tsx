'use client'
import { useState, useEffect, useCallback } from 'react'
import { AddKbEntryModal } from '../../components/AddKbEntryModal'
import { KnowledgeBaseEntry } from '../../components/KnowledgeBaseEntry'

interface KBEntryWithProject {
  id: number
  project_id: number | null
  title: string
  content: string
  source_trace: string | null
  linked_risk_id: number | null
  linked_history_id: number | null
  linked_date: string | null
  created_at: string
  project_name: string | null
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KBEntryWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/knowledge-base')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setEntries(data.entries ?? data ?? [])
    } catch {
      setError('Failed to load knowledge base entries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Knowledge Base</h1>
        <button
          data-testid="add-kb-entry-btn"
          onClick={() => setShowModal(true)}
          className="rounded bg-zinc-900 text-white px-4 py-2 text-sm hover:bg-zinc-700 transition-colors"
        >
          Add Entry
        </button>
      </div>

      {loading && (
        <p className="text-zinc-500 text-sm">Loading...</p>
      )}

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="text-zinc-500 text-sm">
          No knowledge base entries yet. Add the first one.
        </p>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => (
            <KnowledgeBaseEntry
              key={entry.id}
              entry={entry}
              onUpdated={fetchEntries}
            />
          ))}
        </div>
      )}

      <AddKbEntryModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          setShowModal(false)
          fetchEntries()
        }}
      />
    </div>
  )
}
