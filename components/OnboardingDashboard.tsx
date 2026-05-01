'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Type definitions ────────────────────────────────────────────────────────

interface Step {
  id: number
  phase_id: number
  project_id: number
  name: string
  description: string | null
  status: 'not-started' | 'in-progress' | 'complete' | 'blocked'
  owner: string | null
  dependencies: string[]
  updates: { timestamp: string; text: string }[]
  display_order: number
}

interface PhaseWithSteps {
  id: number
  name: string
  display_order: number
  steps: Step[]
}

interface Integration {
  id: number
  project_id: number
  tool: string
  category: string | null
  status: 'not-started' | 'in-progress' | 'complete' | 'blocked'
  color: string | null
  notes: string | null
  display_order: number
  track: 'ADR' | 'Biggy' | null
  integration_type: string | null
}

interface Risk {
  id: number
  description: string
  severity: string | null
  mitigation: string | null
}

interface Milestone {
  id: number
  name: string
  date: string | null
  target?: string | null
  status: string | null
}

interface ProjectSummary {
  id: number
  name: string
  customer: string
  status_summary: string | null
  go_live_target: string | null
}

interface TeamOnboardingRow {
  id: number
  project_id: number
  team_name: string
  track: string | null
  status: string
  ingest_status: string | null
  correlation_status: string | null
  incident_intelligence_status: string | null
  sn_automation_status: string | null
  biggy_ai_status: string | null
}

interface OnboardingDashboardProps {
  projectId: number
}

// ─── Status cycles ────────────────────────────────────────────────────────────

const STEP_STATUS_CYCLE = ['not-started', 'in-progress', 'complete', 'blocked'] as const
const INTEG_STATUS_CYCLE = ['not-started', 'in-progress', 'complete', 'blocked'] as const

const ADR_TYPES = ['Inbound', 'Outbound', 'Enrichment'] as const
const BIGGY_TYPES = ['Real-time', 'Context', 'Knowledge', 'UDC'] as const

// Static track configuration — phase names must match DB exactly.
// Only the 3 content phases per track (live cards and Go-Live are rendered separately).
const STATIC_ADR_TRACKS = [
  { name: 'Discovery & Kickoff', display_order: 1 },
  { name: 'Platform Configuration', display_order: 3 },
  { name: 'UAT', display_order: 5 },
] as const

const STATIC_BIGGY_TRACKS = [
  { name: 'Discovery & Kickoff', display_order: 1 },
  { name: 'Platform Configuration', display_order: 3 },
  { name: 'Validation', display_order: 5 },
] as const

// ─── Status badge colors ──────────────────────────────────────────────────────

const STEP_STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-zinc-100 text-zinc-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  'complete': 'bg-green-100 text-green-700',
  'blocked': 'bg-red-100 text-red-700',
}

const INTEG_STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-zinc-100 text-zinc-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  'complete': 'bg-green-100 text-green-700',
  'blocked': 'bg-red-100 text-red-700',
}

const RISK_SEVERITY_COLORS: Record<string, string> = {
  'critical': 'bg-red-100 text-red-800',
  'high': 'bg-orange-100 text-orange-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'low': 'bg-zinc-100 text-zinc-600',
}

// ─── Pipeline stages ──────────────────────────────────────────────────────────

const ONBOARDING_STATUSES = ['not-started', 'in-progress', 'complete', 'blocked'] as const

// ─── Progress ring constants ───────────────────────────────────────────────────

const circumference = 138.23

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const offset = circumference * (1 - pct / 100)
  return (
    <div data-testid="progress-ring" className="relative flex items-center justify-center">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle
          r="22"
          cx="26"
          cy="26"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="5"
          strokeDasharray={circumference}
        />
        <circle
          r="22"
          cx="26"
          cy="26"
          fill="none"
          stroke="#22c55e"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.5s ease',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-zinc-700">{Math.round(pct)}%</span>
    </div>
  )
}

function StepOwnerField({
  stepId,
  phaseId,
  initialOwner,
  projectId,
  onSave,
}: {
  stepId: number
  phaseId: number
  initialOwner: string | null
  projectId: number
  onSave: (phaseId: number, stepId: number, owner: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialOwner ?? '')

  const handleBlur = async () => {
    setEditing(false)
    onSave(phaseId, stepId, value)
    await fetch(`/api/projects/${projectId}/onboarding/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: value }),
    })
  }

  if (editing) {
    return (
      <input
        data-testid="step-owner"
        className="text-xs border border-zinc-300 rounded px-1 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
      />
    )
  }
  return (
    <span
      data-testid="step-owner"
      className="text-xs text-zinc-500 cursor-pointer hover:underline min-w-[80px]"
      onClick={() => setEditing(true)}
    >
      {value || 'No owner'}
    </span>
  )
}

// ─── Module-level seed guard ──────────────────────────────────────────────────
// Prevents React strict-mode's double-effect from calling the seed endpoint
// twice concurrently and creating duplicate steps.
const _seedCalledForProject = new Set<number>()

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingDashboard({ projectId }: OnboardingDashboardProps) {
  const [adrPhases, setAdrPhases] = useState<PhaseWithSteps[]>([])
  const [biggyPhases, setBiggyPhases] = useState<PhaseWithSteps[]>([])
  // rawAdrPhases / rawBiggyPhases hold ALL phases from DB before static filtering.
  // REQUIRED: Teams phase is not in STATIC_ADR_TRACKS/STATIC_BIGGY_TRACKS, so
  // adrPhases/biggyPhases will never contain it. rawAdrPhases/rawBiggyPhases are
  // the source of truth for the Teams dynamic summary cards.
  const [rawAdrPhases, setRawAdrPhases] = useState<PhaseWithSteps[]>([])
  const [rawBiggyPhases, setRawBiggyPhases] = useState<PhaseWithSteps[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null)
  const [adrGoLivePhase, setAdrGoLivePhase] = useState<PhaseWithSteps | null>(null)
  const [biggyGoLivePhase, setBiggyGoLivePhase] = useState<PhaseWithSteps | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string | number, boolean>>({})
  const [noteInputs, setNoteInputs] = useState<Record<number, string>>({})
  const [integNotes, setIntegNotes] = useState<Record<number, string>>({})
  const [teams, setTeams] = useState<TeamOnboardingRow[]>([])
  const [addingTeam, setAddingTeam] = useState<{ ADR: boolean; Biggy: boolean }>({ ADR: false, Biggy: false })
  const [newTeamName, setNewTeamName] = useState<{ ADR: string; Biggy: string }>({ ADR: '', Biggy: '' })

  useEffect(() => {
    const load = async () => {
      try {
    const [ob, ig, rk, ml, ps, tm] = await Promise.all([
      fetch(`/api/projects/${projectId}/onboarding`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/integrations`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/risks`).then((r) => (r.ok ? r.json() : { risks: [] })),
      fetch(`/api/projects/${projectId}/milestones`).then((r) =>
        r.ok ? r.json() : { milestones: [] }
      ),
      fetch(`/api/projects/${projectId}`).then((r) => (r.ok ? r.json() : { project: null })),
      fetch(`/api/projects/${projectId}/team-onboarding-status`).then((r) => (r.ok ? r.json() : { rows: [] })),
    ])

        let fetchedAdr: PhaseWithSteps[] = ob.adr ?? []
        let fetchedBiggy: PhaseWithSteps[] = ob.biggy ?? []
        const fetchedIntegrations: Integration[] = ig.integrations ?? []
        const fetchedRisks: Risk[] = rk.risks ?? rk ?? []
        const fetchedMilestones: Milestone[] = ml.milestones ?? ml ?? []

        // Seed standard steps if any standard phase is missing steps
        const standardAdrNames = ['Discovery & Kickoff', 'Platform Configuration', 'UAT']
        const standardBiggyNames = ['Discovery & Kickoff', 'Platform Configuration', 'Validation']
        const needsSeed =
          standardAdrNames.some(n => {
            const p = fetchedAdr.find(x => x.name === n)
            return !p || p.steps.length === 0
          }) ||
          standardBiggyNames.some(n => {
            const p = fetchedBiggy.find(x => x.name === n)
            return !p || p.steps.length === 0
          })
        if (needsSeed && !_seedCalledForProject.has(projectId)) {
          _seedCalledForProject.add(projectId)
          const seeded = await fetch(`/api/projects/${projectId}/onboarding/seed`, {
            method: 'POST',
          }).then(r => r.json())
          if (seeded.adr) fetchedAdr = seeded.adr
          if (seeded.biggy) fetchedBiggy = seeded.biggy
        }

        // Capture raw DB phases for Teams live card data
        setRawAdrPhases(fetchedAdr)
        setRawBiggyPhases(fetchedBiggy)

        // Extract Go-Live phases (rendered as special cards, not regular phase cards)
        setAdrGoLivePhase(fetchedAdr.find(p => p.name === 'Go-Live') ?? null)
        setBiggyGoLivePhase(fetchedBiggy.find(p => p.name === 'Go-Live') ?? null)

        // Map static config → DB phases matched by name
        const staticAdrPhases = STATIC_ADR_TRACKS.map(track => {
          const dbPhase = fetchedAdr.find((p: PhaseWithSteps) => p.name === track.name)
          return dbPhase ?? { id: -track.display_order, name: track.name, display_order: track.display_order, steps: [] }
        })
        const staticBiggyPhases = STATIC_BIGGY_TRACKS.map(track => {
          const dbPhase = fetchedBiggy.find((p: PhaseWithSteps) => p.name === track.name)
          return dbPhase ?? { id: -track.display_order, name: track.name, display_order: track.display_order, steps: [] }
        })
        setAdrPhases(staticAdrPhases)
        setBiggyPhases(staticBiggyPhases)

        setIntegrations(fetchedIntegrations)
        setRisks(Array.isArray(fetchedRisks) ? fetchedRisks : [])
        setMilestones(Array.isArray(fetchedMilestones) ? fetchedMilestones : [])
        setProjectSummary(ps.project ?? null)
        setTeams(tm.rows ?? [])

        // Default: all phases collapsed
        const collapseMap: Record<string | number, boolean> = {}
        ;[...staticAdrPhases, ...staticBiggyPhases].forEach((p) => {
          collapseMap[p.id] = true
        })
        setCollapsed(collapseMap)

        // Seed integration notes
        const notesMap: Record<number, string> = {}
        fetchedIntegrations.forEach((i) => {
          notesMap[i.id] = i.notes ?? ''
        })
        setIntegNotes(notesMap)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  // ─── Derived stats ──────────────────────────────────────────────────────────

  // Exclude Go-Live phase from progress rings (it's a milestone, not a step)
  const adrSteps = adrPhases.flatMap((p) => p.steps)
  const adrTotal = adrSteps.length
  const adrComplete = adrSteps.filter((s) => s.status === 'complete').length
  const adrPct = adrTotal > 0 ? (adrComplete / adrTotal) * 100 : 0

  const biggySteps = biggyPhases.flatMap((p) => p.steps)
  const biggyTotal = biggySteps.length
  const biggyComplete = biggySteps.filter((s) => s.status === 'complete').length
  const biggyPct = biggyTotal > 0 ? (biggyComplete / biggyTotal) * 100 : 0

  const totalSteps = adrTotal + biggyTotal
  const completedSteps = adrComplete + biggyComplete
  const pct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  // ─── Optimistic handlers ────────────────────────────────────────────────────

  const cycleStepStatus = async (phaseId: number, stepId: number, currentStatus: string) => {
    const idx = STEP_STATUS_CYCLE.indexOf(currentStatus as (typeof STEP_STATUS_CYCLE)[number])
    const nextStatus = STEP_STATUS_CYCLE[(idx + 1) % STEP_STATUS_CYCLE.length]

    // Update in ADR array
    setAdrPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, status: nextStatus } : s)) }
          : p
      )
    )

    // Update in Biggy array
    setBiggyPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, status: nextStatus } : s)) }
          : p
      )
    )

    // Update Go-Live phases
    setAdrGoLivePhase((prev) =>
      prev?.id === phaseId
        ? { ...prev, steps: prev.steps.map((s) => (s.id === stepId ? { ...s, status: nextStatus } : s)) }
        : prev
    )
    setBiggyGoLivePhase((prev) =>
      prev?.id === phaseId
        ? { ...prev, steps: prev.steps.map((s) => (s.id === stepId ? { ...s, status: nextStatus } : s)) }
        : prev
    )

    await fetch(`/api/projects/${projectId}/onboarding/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))
  }

  const cycleIntegStatus = async (integId: number, newStatus: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === integId ? { ...i, status: newStatus as Integration['status'] } : i))
    )
    await fetch(`/api/projects/${projectId}/integrations/${integId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    window.dispatchEvent(new CustomEvent('metrics:invalidate'))
  }

  const updateStepOwner = (phaseId: number, stepId: number, owner: string) => {
    // Update in ADR array
    setAdrPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, owner } : s)) }
          : p
      )
    )

    // Update in Biggy array
    setBiggyPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, owner } : s)) }
          : p
      )
    )
  }

  const submitNote = async (phaseId: number, stepId: number) => {
    const text = noteInputs[stepId]?.trim()
    if (!text) return
    const timestamp = new Date().toISOString()
    const newUpdate = { timestamp, text }

    // Update in ADR array
    setAdrPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              steps: p.steps.map((s) =>
                s.id === stepId ? { ...s, updates: [...(s.updates ?? []), newUpdate] } : s
              ),
            }
          : p
      )
    )

    // Update in Biggy array
    setBiggyPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              steps: p.steps.map((s) =>
                s.id === stepId ? { ...s, updates: [...(s.updates ?? []), newUpdate] } : s
              ),
            }
          : p
      )
    )

    setNoteInputs((prev) => ({ ...prev, [stepId]: '' }))
    await fetch(`/api/projects/${projectId}/onboarding/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates_append: text }),
    })
  }

  const saveIntegNotes = async (integId: number) => {
    const notes = integNotes[integId] ?? ''
    setIntegrations((prev) => prev.map((i) => (i.id === integId ? { ...i, notes } : i)))
    await fetch(`/api/projects/${projectId}/integrations/${integId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
  }

  const saveIntegTrack = async (integId: number, track: 'ADR' | 'Biggy' | null, integration_type: string | null) => {
    // Store previous state for rollback
    const prevIntegrations = integrations

    // Optimistic update
    setIntegrations((prev) => prev.map((i) => (i.id === integId ? { ...i, track, integration_type } : i)))

    // Persist to API
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations/${integId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, integration_type }),
      })

      if (!res.ok) {
        console.error('Failed to update integration track:', await res.text())
        // Rollback on failure
        setIntegrations(prevIntegrations)
      }
    } catch (err) {
      console.error('Error updating integration track:', err)
      // Rollback on error
      setIntegrations(prevIntegrations)
    }
  }

  const deleteIntegration = async (integId: number) => {
    // Optimistic remove
    setIntegrations((prev) => prev.filter((i) => i.id !== integId))
    try {
      await fetch(`/api/projects/${projectId}/integrations/${integId}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete integration:', err)
      // On error, refetch integrations to restore state
      const res = await fetch(`/api/projects/${projectId}/integrations`)
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations ?? [])
      }
    }
  }

  // ─── Team handlers ──────────────────────────────────────────────────────────

  const addTeam = async (track: 'ADR' | 'Biggy') => {
    const name = newTeamName[track].trim()
    if (!name) return
    try {
      const res = await fetch(`/api/projects/${projectId}/team-onboarding-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: name, track }),
      })
      if (res.ok) {
        const data = await res.json()
        setTeams(prev => [...prev, data.row])
        setNewTeamName(prev => ({ ...prev, [track]: '' }))
        setAddingTeam(prev => ({ ...prev, [track]: false }))
      }
    } catch (err) {
      console.error('Failed to add team:', err)
    }
  }

  const updateTeamStatus = async (teamId: number, status: string) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, status } : t))
    try {
      await fetch(`/api/projects/${projectId}/team-onboarding-status/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      window.dispatchEvent(new CustomEvent('metrics:invalidate'))
    } catch (err) {
      console.error('Failed to update team status:', err)
    }
  }

  const deleteTeam = async (teamId: number) => {
    setTeams(prev => prev.filter(t => t.id !== teamId))
    try {
      await fetch(`/api/projects/${projectId}/team-onboarding-status/${teamId}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Failed to delete team:', err)
      const res = await fetch(`/api/projects/${projectId}/team-onboarding-status`)
      if (res.ok) {
        const data = await res.json()
        setTeams(data.rows ?? [])
      }
    }
  }

  // ─── Filter helpers ─────────────────────────────────────────────────────────

  const stepMatchesFilter = (step: Step): boolean => {
    const statusMatch = filterStatus === 'all' || step.status === filterStatus
    const searchMatch =
      searchQuery === '' || step.name.toLowerCase().includes(searchQuery.toLowerCase())
    return statusMatch && searchMatch
  }

  const visibleSteps = (phase: PhaseWithSteps): Step[] => phase.steps.filter(stepMatchesFilter)

  // ─── Integration grouping ───────────────────────────────────────────────────

  const adrIntegrations = integrations.filter(i => i.track === 'ADR')
  const biggyIntegrations = integrations.filter(i => i.track === 'Biggy')
  const unassignedIntegrations = integrations.filter(i => !i.track)

  // ─── Integration card renderer ──────────────────────────────────────────────

  const renderIntegCard = (integ: Integration) => {
    const typeOptions = integ.track === 'ADR'
      ? ADR_TYPES
      : integ.track === 'Biggy'
      ? BIGGY_TYPES
      : []

    return (
      <div
        key={integ.id}
        data-testid="integration-card"
        className="border border-zinc-200 rounded-lg p-3 space-y-3 bg-white"
      >
        {/* Tool name + category badge + delete button */}
        <div className="space-y-1">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-zinc-900 block">{integ.tool}</span>
            <button
              data-testid="delete-integration-btn"
              onClick={() => deleteIntegration(integ.id)}
              className="ml-auto p-1 text-zinc-400 hover:text-red-500 transition-colors"
              title="Delete integration"
              aria-label={`Delete ${integ.tool}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          {integ.category && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: integ.color ? `${integ.color}20` : '#f4f4f5',
                color: integ.color ?? '#52525b',
              }}
            >
              {integ.category}
            </span>
          )}
        </div>

        {/* Status dropdown */}
        <select
          value={integ.status}
          onChange={(e) => cycleIntegStatus(integ.id, e.target.value)}
          className={`w-full text-xs border rounded px-2 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
            INTEG_STATUS_COLORS[integ.status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
          }`}
        >
          {ONBOARDING_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>

        {/* Track + Type assignment */}
        <div className="flex gap-2">
          <select
            value={integ.track ?? ''}
            onChange={(e) => {
              const newTrack = e.target.value === '' ? null : (e.target.value as 'ADR' | 'Biggy')
              saveIntegTrack(integ.id, newTrack, integ.integration_type)
            }}
            className="flex-1 text-xs border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            <option value="">Unassigned</option>
            <option value="ADR">ADR</option>
            <option value="Biggy">Biggy</option>
          </select>
          {integ.track && (
            <select
              value={integ.integration_type ?? ''}
              onChange={(e) => {
                const newType = e.target.value === '' ? null : e.target.value
                saveIntegTrack(integ.id, integ.track, newType)
              }}
              className="flex-1 text-xs border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              <option value="">No type</option>
              {typeOptions.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          )}
        </div>

        {/* Notes textarea */}
        <textarea
          data-testid="integration-notes"
          rows={2}
          placeholder="Integration notes…"
          value={integNotes[integ.id] ?? ''}
          onChange={(e) =>
            setIntegNotes((prev) => ({ ...prev, [integ.id]: e.target.value }))
          }
          onBlur={() => saveIntegNotes(integ.id)}
          className="w-full text-xs border border-zinc-200 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
      </div>
    )
  }

  // ─── Track section renderer ─────────────────────────────────────────────────

  const renderTrackSection = (
    label: string,
    trackIntegrations: Integration[],
    types: readonly string[]
  ) => {
    const byType = types
      .map(type => ({ type, items: trackIntegrations.filter(i => i.integration_type === type) }))
      .filter(group => group.items.length > 0)
    const typeless = trackIntegrations.filter(i => !i.integration_type)

    if (trackIntegrations.length === 0) return null

    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</h3>
        {byType.map(group => (
          <div key={group.type} className="space-y-2">
            <h4 className="text-xs font-medium text-zinc-400 pl-2">{group.type}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.items.map(integ => renderIntegCard(integ))}
            </div>
          </div>
        ))}
        {typeless.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {typeless.map(integ => renderIntegCard(integ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Phase card renderer (DRY) ──────────────────────────────────────────────

  // ─── Live card renderers ─────────────────────────────────────────────────────

  const renderIntegrationsCard = (track: 'ADR' | 'Biggy') => {
    const key = `integrations-${track}`
    const isCollapsed = collapsed[key] ?? true
    const trackIntegrations = integrations.filter(i => i.track === track)
    const complete = trackIntegrations.filter(i => i.status === 'complete').length
    const inProgress = trackIntegrations.filter(i => i.status === 'in-progress').length
    const blocked = trackIntegrations.filter(i => i.status === 'blocked').length
    const total = trackIntegrations.length
    const label = track === 'ADR' ? 'Integrations' : 'IT Knowledge Graph'
    return (
      <div key={key} className="border border-zinc-200 rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
          onClick={() => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-900">{label}</span>
            <span className="text-xs text-zinc-500">{complete}/{total} complete</span>
          </div>
          <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {!isCollapsed && (
          <div className="px-4 py-3 space-y-1">
            {total === 0 ? (
              <p className="text-xs text-zinc-400">No integrations yet — add from the Integrations tab.</p>
            ) : (
              <>
                <p className="text-xs text-zinc-700"><span className="font-medium text-green-700">{complete}</span> complete</p>
                <p className="text-xs text-zinc-700"><span className="font-medium text-blue-700">{inProgress}</span> in progress</p>
                {blocked > 0 && <p className="text-xs text-zinc-700"><span className="font-medium text-red-600">{blocked}</span> blocked</p>}
                <p className="text-xs text-zinc-400 pt-1">{total - complete - inProgress - blocked} not started</p>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderTeamsCard = (track: 'ADR' | 'Biggy') => {
    const key = `teams-${track}`
    const isCollapsed = collapsed[key] ?? true
    const trackTeams = teams.filter(t => t.track === track)
    const total = trackTeams.length
    const complete = trackTeams.filter(t => t.status === 'complete').length
    return (
      <div key={key} className="border border-zinc-200 rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
          onClick={() => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-900">Teams</span>
            <span className="text-xs text-zinc-500">{complete}/{total} complete</span>
          </div>
          <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {!isCollapsed && (
          <div className="px-4 py-3 space-y-2">
            {trackTeams.length === 0 && !addingTeam[track] && (
              <p className="text-xs text-zinc-400">No teams added yet.</p>
            )}
            {trackTeams.map(team => (
              <div key={team.id} className="flex items-center gap-2 py-1">
                <span className="text-xs text-zinc-700 flex-1 min-w-0 truncate">{team.team_name}</span>
                <select
                  value={team.status ?? 'not-started'}
                  onChange={(e) => updateTeamStatus(team.id, e.target.value)}
                  className={`text-xs border rounded px-2 py-0.5 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 shrink-0 ${
                    INTEG_STATUS_COLORS[team.status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  }`}
                >
                  {ONBOARDING_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
                <button
                  onClick={() => deleteTeam(team.id)}
                  className="p-1 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                  title="Remove team"
                  aria-label={`Remove ${team.team_name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {addingTeam[track] ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Team name…"
                  value={newTeamName[track]}
                  autoFocus
                  onChange={e => setNewTeamName(prev => ({ ...prev, [track]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addTeam(track); if (e.key === 'Escape') setAddingTeam(prev => ({ ...prev, [track]: false })) }}
                  className="flex-1 text-xs border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <button onClick={() => addTeam(track)} className="text-xs px-2 py-1 bg-zinc-900 text-white rounded hover:bg-zinc-700">Add</button>
                <button onClick={() => setAddingTeam(prev => ({ ...prev, [track]: false }))} className="text-xs px-2 py-1 border border-zinc-200 rounded hover:bg-zinc-50">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTeam(prev => ({ ...prev, [track]: true }))}
                className="text-xs text-blue-600 hover:underline pt-1"
              >
                + Add team
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderGoLiveCard = (track: 'ADR' | 'Biggy') => {
    const phase = track === 'ADR' ? adrGoLivePhase : biggyGoLivePhase
    const step = phase?.steps[0] ?? null
    const isLive = step?.status === 'complete'
    return (
      <div className={`border-2 rounded-lg overflow-hidden transition-colors ${isLive ? 'border-green-400 bg-green-50' : 'border-zinc-200 bg-white'}`}>
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500' : 'bg-zinc-300'}`} />
            <span className={`text-sm font-semibold ${isLive ? 'text-green-800' : 'text-zinc-500'}`}>
              {track} — Go Live
            </span>
          </div>
          {step && (
            <button
              onClick={() => cycleStepStatus(phase!.id, step.id, step.status)}
              className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors ${
                isLive
                  ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:bg-zinc-200'
              }`}
            >
              {isLive ? 'Live ✓' : 'Mark Live'}
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderPhaseCard = (phase: PhaseWithSteps) => {
    const matching = visibleSteps(phase)
    const isCollapsed = collapsed[phase.id] ?? true
    const phaseCompleted = phase.steps.filter((s) => s.status === 'complete').length
    const phaseTotal = phase.steps.length

    return (
      <div
        key={phase.id}
        data-testid="phase-card"
        className="border border-zinc-200 rounded-lg overflow-hidden"
      >
        {/* Phase header */}
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
          onClick={() => setCollapsed((prev) => ({ ...prev, [phase.id]: !prev[phase.id] }))}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-900">{phase.name}</span>
            <span className="text-xs text-zinc-500">
              {phaseCompleted}/{phaseTotal}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Phase steps */}
        {!isCollapsed && (
          <div className="divide-y divide-zinc-100">
            {matching.length === 0 ? (
              <p className="text-sm text-zinc-400 px-4 py-3">No matching steps.</p>
            ) : (
              matching.map((step) => (
                <div key={step.id} className="px-4 py-3 space-y-2">
                  <div className="flex flex-wrap items-start gap-3">
                    {/* Name + description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{step.name}</p>
                      {step.description && (
                        <p className="text-xs text-zinc-500 mt-0.5">{step.description}</p>
                      )}
                    </div>

                    {/* Status badge */}
                    <button
                      data-testid="step-status-badge"
                      className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${
                        STEP_STATUS_COLORS[step.status] ?? 'bg-zinc-100 text-zinc-600'
                      }`}
                      onClick={() => cycleStepStatus(phase.id, step.id, step.status)}
                    >
                      {step.status.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </button>

                    {/* Owner */}
                    <StepOwnerField
                      stepId={step.id}
                      phaseId={phase.id}
                      initialOwner={step.owner}
                      projectId={projectId}
                      onSave={updateStepOwner}
                    />
                  </div>

                  {/* Dependencies */}
                  {step.dependencies && step.dependencies.length > 0 && (
                    <p className="text-xs text-zinc-400">
                      Depends on: {step.dependencies.join(', ')}
                    </p>
                  )}

                  {/* Update notes log */}
                  {step.updates && step.updates.length > 0 && (
                    <ul className="space-y-1 pl-2 border-l-2 border-zinc-100">
                      {step.updates.map((u, i) => (
                        <li key={i} className="text-xs text-zinc-500">
                          <span className="text-zinc-300 mr-1">
                            {new Date(u.timestamp).toLocaleDateString()}
                          </span>
                          {u.text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add note */}
                  <div className="flex items-center gap-2">
                    <input
                      data-testid="step-update-notes"
                      type="text"
                      placeholder="Add note…"
                      value={noteInputs[step.id] ?? ''}
                      onChange={(e) =>
                        setNoteInputs((prev) => ({ ...prev, [step.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitNote(phase.id, step.id)
                      }}
                      className="flex-1 text-xs border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    />
                    <button
                      onClick={() => submitNote(phase.id, step.id)}
                      className="text-xs px-2 py-1 bg-zinc-800 text-white rounded hover:bg-zinc-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div data-testid="onboarding-dashboard" className="space-y-6 pb-10">
      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div className="sticky top-0 z-[5] bg-white border-b px-4 py-3 flex items-center gap-6">
        {loading ? (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-[52px] h-[52px] rounded-full bg-zinc-200" />
            <div className="h-4 w-40 bg-zinc-200 rounded" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <ProgressRing pct={adrPct} />
              <div>
                <p className="text-xs font-semibold text-zinc-900">ADR</p>
                <p className="text-xs text-zinc-500">{adrComplete}/{adrTotal} steps</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ProgressRing pct={biggyPct} />
              <div>
                <p className="text-xs font-semibold text-zinc-900">Biggy</p>
                <p className="text-xs text-zinc-500">{biggyComplete}/{biggyTotal} steps</p>
              </div>
            </div>
            <div data-testid="project-summary" className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {projectSummary?.customer ?? 'Loading…'}
              </p>
              <p className="text-xs text-zinc-500">
                {completedSteps} of {totalSteps} total steps
              </p>
              {projectSummary?.status_summary && (
                <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">
                  {projectSummary.status_summary}
                </p>
              )}
              {projectSummary?.go_live_target && (
                <span className="inline-block mt-1 text-[10px] bg-zinc-100 text-zinc-600 rounded px-1.5 py-0.5">
                  Go-Live: {projectSummary.go_live_target}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div data-testid="filter-bar" className="px-4 flex flex-wrap items-center gap-2">
        {(['all', 'not-started', 'in-progress', 'complete', 'blocked'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filterStatus === status
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search steps…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-xs border border-zinc-200 rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400 w-40"
        />
      </div>

      {/* ── Onboarding Phases section (dual-track) ───────────────────────── */}
      <div data-testid="onboarding-phases" className="px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ADR Column — interleaved: phase cards + live cards + go-live */}
        <section data-testid="adr-track" className="space-y-4 border-l-4 border-blue-200 pl-4">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            ADR Onboarding
          </h2>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-14 bg-zinc-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {renderPhaseCard(adrPhases.find(p => p.name === 'Discovery & Kickoff') ?? { id: -1, name: 'Discovery & Kickoff', display_order: 1, steps: [] })}
              {renderIntegrationsCard('ADR')}
              {renderPhaseCard(adrPhases.find(p => p.name === 'Platform Configuration') ?? { id: -3, name: 'Platform Configuration', display_order: 3, steps: [] })}
              {renderTeamsCard('ADR')}
              {renderPhaseCard(adrPhases.find(p => p.name === 'UAT') ?? { id: -5, name: 'UAT', display_order: 5, steps: [] })}
              {renderGoLiveCard('ADR')}
            </>
          )}
        </section>

        {/* Biggy Column — interleaved: phase cards + live cards + go-live */}
        <section data-testid="biggy-track" className="space-y-4 border-l-4 border-green-200 pl-4">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Biggy Onboarding
          </h2>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-14 bg-zinc-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {renderPhaseCard(biggyPhases.find(p => p.name === 'Discovery & Kickoff') ?? { id: -11, name: 'Discovery & Kickoff', display_order: 1, steps: [] })}
              {renderIntegrationsCard('Biggy')}
              {renderPhaseCard(biggyPhases.find(p => p.name === 'Platform Configuration') ?? { id: -13, name: 'Platform Configuration', display_order: 3, steps: [] })}
              {renderTeamsCard('Biggy')}
              {renderPhaseCard(biggyPhases.find(p => p.name === 'Validation') ?? { id: -15, name: 'Validation', display_order: 5, steps: [] })}
              {renderGoLiveCard('Biggy')}
            </>
          )}
        </section>
      </div>

      <hr className="border-zinc-200 mx-4" />

      {/* ── Integration Tracker section ──────────────────────────────────── */}
      <section data-testid="integration-tracker" className="px-4 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          Integration Tracker
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-32 bg-zinc-100 rounded-lg" />
            <div className="h-32 bg-zinc-100 rounded-lg" />
          </div>
        ) : integrations.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No integrations found — check the Integrations tab.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-l-4 border-blue-200 pl-4">
                {adrIntegrations.length === 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">ADR</h3>
                    <p className="text-sm text-zinc-400">No ADR integrations — assign from Unassigned below.</p>
                  </div>
                ) : renderTrackSection('ADR', adrIntegrations, ADR_TYPES)}
              </div>
              <div className="border-l-4 border-orange-200 pl-4">
                {biggyIntegrations.length === 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Biggy</h3>
                    <p className="text-sm text-zinc-400">No Biggy integrations — assign from Unassigned below.</p>
                  </div>
                ) : renderTrackSection('Biggy', biggyIntegrations, BIGGY_TYPES)}
              </div>
            </div>
            {unassignedIntegrations.length > 0 && renderTrackSection('Unassigned', unassignedIntegrations, [])}
          </div>
        )}
      </section>

      <hr className="border-zinc-200 mx-4" />

      {/* ── Risks & Blockers section ─────────────────────────────────────── */}
      <section data-testid="risks-section" className="px-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          Risks & Blockers
        </h2>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-16 bg-zinc-100 rounded-lg" />
          </div>
        ) : risks.length === 0 ? (
          <p className="text-sm text-zinc-400">No risks recorded — check the Risks tab.</p>
        ) : (
          <div className="space-y-2">
            {risks.map((risk) => {
              const sev = (risk.severity ?? 'low').toLowerCase()
              return (
                <div key={risk.id} className="border border-zinc-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm text-zinc-900">{risk.description}</p>
                      {risk.mitigation && (
                        <p className="text-xs text-zinc-500">Mitigation: {risk.mitigation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          RISK_SEVERITY_COLORS[sev] ?? 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {risk.severity ?? 'Low'}
                      </span>
                      <Link
                        href={`/customer/${projectId}/risks`}
                        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                      >
                        Edit in Risks tab →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <hr className="border-zinc-200 mx-4" />

      {/* ── Milestone Timeline section ───────────────────────────────────── */}
      <section data-testid="milestones-section" className="px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
            Milestone Timeline
          </h2>
          <Link
            href={`/customer/${projectId}/milestones`}
            className="text-xs text-blue-600 hover:underline"
          >
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="h-16 bg-zinc-100 rounded-lg animate-pulse" />
        ) : milestones.length === 0 ? (
          <p className="text-sm text-zinc-400">No milestones recorded.</p>
        ) : (
          <div className="relative overflow-x-auto pb-2">
            {/* Horizontal spine */}
            <div className="absolute top-5 left-0 right-0 h-px bg-zinc-200" />
            <ol className="relative flex gap-0 min-w-max">
              {milestones.slice(0, 10).map((m) => {
                const statusKey = (m.status ?? '').toLowerCase().replace(/\s+/g, '_')
                const dotColors: Record<string, string> = {
                  completed:    'bg-green-500 border-green-500',
                  complete:     'bg-green-500 border-green-500',
                  in_progress:  'bg-blue-500 border-blue-500',
                  upcoming:     'bg-white border-zinc-400',
                  not_started:  'bg-white border-zinc-400',
                  blocked:      'bg-red-500 border-red-500',
                }
                const labelColors: Record<string, string> = {
                  completed:    'bg-green-100 text-green-800',
                  complete:     'bg-green-100 text-green-800',
                  in_progress:  'bg-blue-100 text-blue-800',
                  upcoming:     'bg-zinc-100 text-zinc-600',
                  not_started:  'bg-zinc-100 text-zinc-600',
                  blocked:      'bg-red-100 text-red-800',
                }
                const dotClass   = dotColors[statusKey]   ?? 'bg-white border-zinc-400'
                const labelClass = labelColors[statusKey] ?? 'bg-zinc-100 text-zinc-600'
                return (
                  <li key={m.id} className="flex flex-col items-center w-36 px-2">
                    {/* Dot on the spine */}
                    <div className={`w-3.5 h-3.5 rounded-full border-2 ${dotClass} z-10 mt-[11px] shrink-0`} />
                    {/* Label card below */}
                    <div className="mt-3 text-center space-y-1 w-full">
                      <p className="text-xs font-medium text-zinc-800 leading-tight line-clamp-2">{m.name}</p>
                      {(m.target ?? m.date) && (
                        <p className="text-xs text-zinc-400">{m.target ?? m.date}</p>
                      )}
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${labelClass}`}>
                        {m.status ?? 'unknown'}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </section>
    </div>
  )
}
