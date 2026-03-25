'use client'
import { useState } from 'react'

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

interface KnowledgeBaseEntryProps {
  entry: KBEntryWithProject
  onUpdated: () => void
}

export function KnowledgeBaseEntry({ entry, onUpdated }: KnowledgeBaseEntryProps) {
  const [linkingRisk, setLinkingRisk] = useState(false)
  const [linkingHistory, setLinkingHistory] = useState(false)
  const [riskInput, setRiskInput] = useState('')
  const [historyInput, setHistoryInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const contentPreview =
    entry.content.length > 150 ? entry.content.slice(0, 150) + '...' : entry.content

  async function handleLinkRisk(e: React.FormEvent) {
    e.preventDefault()
    const id = parseInt(riskInput)
    if (!id || isNaN(id)) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/knowledge-base/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linked_risk_id: id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to link risk')
        return
      }
      setRiskInput('')
      setLinkingRisk(false)
      onUpdated()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleLinkHistory(e: React.FormEvent) {
    e.preventDefault()
    const id = parseInt(historyInput)
    if (!id || isNaN(id)) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/knowledge-base/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linked_history_id: id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to link history')
        return
      }
      setHistoryInput('')
      setLinkingHistory(false)
      onUpdated()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-2">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-zinc-900">{entry.title}</span>
        {entry.project_name && (
          <span className="shrink-0 text-xs bg-zinc-100 text-zinc-600 rounded px-2 py-0.5 font-medium">
            {entry.project_name}
          </span>
        )}
      </div>

      {/* Source trace */}
      <span
        data-testid="source-trace"
        className="block text-xs text-zinc-500"
      >
        {entry.source_trace ?? 'No source trace'}
      </span>

      {/* Content preview */}
      <p className="text-sm text-zinc-700">{contentPreview}</p>

      {/* Linked items */}
      {(entry.linked_risk_id || entry.linked_history_id) && (
        <div className="text-xs text-zinc-500 space-y-0.5">
          {entry.linked_risk_id && (
            <div>Linked Risk: #{entry.linked_risk_id}</div>
          )}
          {entry.linked_history_id && (
            <div>Linked History: #{entry.linked_history_id}</div>
          )}
          {entry.linked_date && (
            <div>Linked: {entry.linked_date}</div>
          )}
        </div>
      )}

      {/* Error */}
      {error && <p className="text-red-600 text-xs">{error}</p>}

      {/* Link actions */}
      <div className="flex items-center gap-2 pt-1">
        {!linkingRisk ? (
          <button
            data-testid="link-risk-btn"
            onClick={() => { setLinkingRisk(true); setLinkingHistory(false) }}
            className="text-xs text-zinc-500 hover:text-zinc-900 underline-offset-2 hover:underline transition-colors"
          >
            Link to Risk
          </button>
        ) : (
          <form onSubmit={handleLinkRisk} className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={riskInput}
              onChange={(e) => setRiskInput(e.target.value)}
              className="border rounded px-2 py-0.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              placeholder="Risk ID"
              autoFocus
            />
            <button
              type="submit"
              disabled={saving || !riskInput}
              className="text-xs text-zinc-700 hover:text-zinc-900 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setLinkingRisk(false); setRiskInput('') }}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </form>
        )}

        {!linkingHistory ? (
          <button
            onClick={() => { setLinkingHistory(true); setLinkingRisk(false) }}
            className="text-xs text-zinc-500 hover:text-zinc-900 underline-offset-2 hover:underline transition-colors"
          >
            Link to History
          </button>
        ) : (
          <form onSubmit={handleLinkHistory} className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={historyInput}
              onChange={(e) => setHistoryInput(e.target.value)}
              className="border rounded px-2 py-0.5 text-xs w-20 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              placeholder="History ID"
              autoFocus
            />
            <button
              type="submit"
              disabled={saving || !historyInput}
              className="text-xs text-zinc-700 hover:text-zinc-900 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setLinkingHistory(false); setHistoryInput('') }}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
