'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@/db/schema'

interface ProjectSettingsFormProps {
  project: Project
  projectId: number
  isAdmin: boolean
}

export function ProjectSettingsForm({ project, projectId, isAdmin }: ProjectSettingsFormProps) {
  const router = useRouter()
  const [name, setName] = useState(project.name ?? '')
  const [goLive, setGoLive] = useState(project.go_live_target ?? '')
  const [description, setDescription] = useState(project.description ?? '')
  const activeTracks = (project.active_tracks as { adr: boolean; biggy: boolean } | null) ?? { adr: true, biggy: true }
  const [adrEnabled, setAdrEnabled] = useState(activeTracks.adr)
  const [biggyEnabled, setBiggyEnabled] = useState(activeTracks.biggy)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          go_live_target: goLive.trim() || null,
          description: description.trim() || null,
          active_tracks: { adr: adrEnabled, biggy: biggyEnabled },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save')
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = `w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 ${!isAdmin ? 'bg-zinc-50 text-zinc-400 cursor-not-allowed' : ''}`

  return (
    <div className="space-y-6 mb-8">
      {/* Project Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700" htmlFor="project-name">Project Name</label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isAdmin}
          className={fieldClass}
        />
      </div>

      {/* Go-Live Date */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700" htmlFor="go-live-date">Go-Live Date</label>
        <input
          id="go-live-date"
          type="text"
          value={goLive}
          onChange={(e) => setGoLive(e.target.value)}
          disabled={!isAdmin}
          placeholder="YYYY-MM-DD or TBD"
          className={fieldClass}
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700" htmlFor="project-description">Description / Notes</label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!isAdmin}
          rows={4}
          placeholder="Project notes..."
          className={`${fieldClass} resize-y`}
        />
      </div>

      {/* Track Toggles */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-700">Active Tracks</p>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={adrEnabled}
            onChange={(e) => setAdrEnabled(e.target.checked)}
            disabled={!isAdmin}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-900">ADR Track</span>
        </label>
        <p className="text-xs text-zinc-500 ml-7">Disabling this track hides it from WBS, Gantt, and Overview for all project members.</p>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={biggyEnabled}
            onChange={(e) => setBiggyEnabled(e.target.checked)}
            disabled={!isAdmin}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-900">Biggy Track</span>
        </label>
        <p className="text-xs text-zinc-500 ml-7">Disabling this track hides it from WBS, Gantt, and Overview for all project members.</p>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {saved && <p className="text-green-600 text-sm">Settings saved.</p>}

      {isAdmin && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      )}
    </div>
  )
}
