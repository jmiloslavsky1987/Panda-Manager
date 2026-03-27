'use client'

import { useState } from 'react'
import type { E2eWorkflowWithSteps, WorkflowStep } from '@/lib/queries'
import { WarnBanner } from './WarnBanner'
import { InlineEditModal } from './InlineEditModal'
import { SourceBadge } from '@/components/SourceBadge'

// Design tokens
const ADR = { text: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' }
const BIGGY = { text: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' }

function stepTokens(track: string) {
  if (track === 'Biggy') return BIGGY
  return ADR
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
        <h2 className="text-lg font-semibold text-zinc-900">End-to-End Workflows</h2>
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
            <div key={wf.id} className="border border-zinc-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-zinc-800 text-sm">{wf.team_name}</p>
                    <SourceBadge
                      source={wf.source ?? 'manual'}
                      artifactName={null}
                      discoverySource={wf.discovery_source}
                    />
                  </div>
                  {wf.workflow_name && (
                    <p className="text-xs text-zinc-500">{wf.workflow_name}</p>
                  )}
                </div>
                <button
                  onClick={() => setStepModal({ workflowId: wf.id, open: true })}
                  className="text-xs px-2 py-1 rounded border border-zinc-300 hover:bg-zinc-50"
                >
                  + Add Step
                </button>
              </div>

              {/* Steps flow */}
              {wf.steps.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  {wf.steps.map((step, idx) => {
                    const tk = stepTokens(step.track ?? 'ADR')
                    const pill = stepStatusPill(step.status ?? 'planned')
                    return (
                      <div key={step.id} className="flex items-center gap-1">
                        {idx > 0 && (
                          <span className="text-zinc-400 text-sm select-none">&rarr;</span>
                        )}
                        <div
                          className="flex flex-col items-center px-3 py-1.5 rounded-md border text-xs"
                          style={{ background: tk.bg, borderColor: tk.border, color: tk.text }}
                        >
                          <span className="font-medium">{step.label}</span>
                          <span
                            className="mt-0.5 px-1.5 rounded-full text-xs"
                            style={{ background: pill.bg, color: pill.text }}
                          >
                            {pill.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
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
