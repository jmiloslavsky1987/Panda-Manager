'use client'

import { useState } from 'react'
import type { E2eWorkflowWithSteps, WorkflowStep } from '@/lib/queries'
import { WarnBanner } from './WarnBanner'
import { InlineEditModal } from './InlineEditModal'

// Track colors for step cards
function stepTrackStyle(track: string) {
  switch (track) {
    case 'ADR':
      return { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', label: 'ADR' }
    case 'Biggy':
      return { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', label: 'BIGGY' }
    case 'E2E':
      return { bg: '#dcfce7', border: '#bbf7d0', text: '#14532d', label: 'E2E' }
    case 'CILA':
      return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151', label: 'CILA' }
    default:
      return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151', label: track }
  }
}

function stepStatusPill(status: string) {
  switch (status) {
    case 'live':
      return { bg: '#dcfce7', text: '#14532d', label: 'Live' }
    case 'in_progress':
      return { bg: '#fef3c7', text: '#92400e', label: 'In Progress' }
    case 'planned':
    default:
      return { bg: '#f1f5f9', text: '#475569', label: 'Planned' }
  }
}

const STEP_FIELDS = [
  { name: 'label', label: 'Label', type: 'text' as const },
  { name: 'track', label: 'Track', type: 'select' as const, options: ['ADR', 'Biggy'] },
  {
    name: 'status',
    label: 'Status',
    type: 'select' as const,
    options: ['live', 'in_progress', 'planned'],
  },
  { name: 'position', label: 'Position', type: 'number' as const },
]

const WORKFLOW_FIELDS = [
  { name: 'team_name', label: 'Team Name', type: 'text' as const },
  { name: 'workflow_name', label: 'Workflow Name', type: 'text' as const },
]

interface Props {
  projectId: number
  workflows: E2eWorkflowWithSteps[]
  onUpdate: (workflows: E2eWorkflowWithSteps[]) => void
}

interface StepModalState {
  workflowId: number
  open: boolean
}

export function E2eWorkflowsSection({ projectId, workflows, onUpdate }: Props) {
  const [stepModal, setStepModal] = useState<StepModalState | null>(null)
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false)

  async function handleAddStep(workflowId: number, values: Record<string, string>) {
    const optimistic: WorkflowStep = {
      id: Date.now(),
      workflow_id: workflowId,
      label: values.label ?? '',
      track: (values.track as WorkflowStep['track']) ?? 'ADR',
      status: (values.status as WorkflowStep['status']) ?? 'planned',
      position: parseInt(values.position ?? '0', 10),
      discovery_source: null,
      created_at: new Date(),
    }
    const updated = workflows.map((wf) =>
      wf.id === workflowId
        ? { ...wf, steps: [...wf.steps, optimistic].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) }
        : wf
    )
    onUpdate(updated)
    setStepModal(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/e2e-workflows/${workflowId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed to save step')
    } catch {
      onUpdate(workflows)
    }
  }

  async function handleAddWorkflow(values: Record<string, string>) {
    const optimistic: E2eWorkflowWithSteps = {
      id: Date.now(),
      project_id: projectId,
      team_name: values.team_name ?? '',
      workflow_name: values.workflow_name ?? '',
      source: 'manual',
      source_artifact_id: null,
      discovery_source: null,
      ingested_at: null,
      created_at: new Date(),
      steps: [],
    }
    onUpdate([...workflows, optimistic])
    setWorkflowModalOpen(false)

    try {
      const res = await fetch(`/api/projects/${projectId}/e2e-workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed to save workflow')
      const saved = await res.json()
      onUpdate([...workflows, { ...saved, steps: [] }])
    } catch {
      onUpdate(workflows)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWorkflowModalOpen(true)}
          className="text-sm px-3 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-50"
        >
          + Add Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <WarnBanner message="No E2E workflows recorded." />
      ) : (
        <div className="space-y-6">
          {workflows.map((wf) => (
            <div key={wf.id} className="border border-zinc-200 rounded-xl bg-white p-4 space-y-3">
              {/* Header row: E2E pill + workflow name + team name */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-bold">
                    E2E
                  </span>
                  <div>
                    <p className="font-bold text-zinc-900 text-sm">{wf.workflow_name || 'Unnamed Workflow'}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{wf.team_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setStepModal({ workflowId: wf.id, open: true })}
                  className="text-xs px-2 py-1 rounded border border-zinc-300 hover:bg-zinc-50"
                >
                  + Add Step
                </button>
              </div>

              {/* Steps flow - horizontal scrollable */}
              {wf.steps.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="flex items-stretch gap-2">
                    {wf.steps.map((step, idx) => {
                      const trackStyle = stepTrackStyle(step.track ?? 'ADR')
                      const pill = stepStatusPill(step.status ?? 'planned')
                      return (
                        <div key={step.id} className="flex items-center gap-2">
                          {idx > 0 && (
                            <span className="text-zinc-400 text-lg select-none">→</span>
                          )}
                          <div
                            className="rounded-lg border p-3 min-w-[140px] flex flex-col gap-1"
                            style={{ borderColor: trackStyle.border, background: trackStyle.bg }}
                          >
                            {/* Track label */}
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ color: trackStyle.text }}
                            >
                              {trackStyle.label}
                            </span>
                            {/* Step name */}
                            <span className="font-semibold text-sm text-zinc-900">{step.label}</span>
                            {/* Status pill at bottom */}
                            <span
                              className="mt-auto px-2 py-0.5 rounded-full text-xs font-medium text-center"
                              style={{ background: pill.bg, color: pill.text }}
                            >
                              {pill.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">No steps yet — click "+ Add Step" to begin.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {stepModal && (
        <InlineEditModal
          title="Add Workflow Step"
          fields={STEP_FIELDS}
          initialValues={{ position: String(workflows.find((w) => w.id === stepModal.workflowId)?.steps.length ?? 0) }}
          onSave={(values) => handleAddStep(stepModal.workflowId, values)}
          onClose={() => setStepModal(null)}
        />
      )}

      {workflowModalOpen && (
        <InlineEditModal
          title="Add E2E Workflow"
          fields={WORKFLOW_FIELDS}
          initialValues={{}}
          onSave={handleAddWorkflow}
          onClose={() => setWorkflowModalOpen(false)}
        />
      )}
    </section>
  )
}
