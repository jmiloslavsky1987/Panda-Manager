'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { cn } from '@/lib/utils'
import { getWizardSteps } from '../lib/scheduler-skills'
import { frequencyToCron, type Frequency } from '../lib/scheduler-utils'
import { JobSkillStep } from './wizard/JobSkillStep'
import { JobScheduleStep } from './wizard/JobScheduleStep'
import { JobParamsStep } from './wizard/JobParamsStep'
import type { ScheduledJob } from './SchedulerJobRow'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateJobWizardProps {
  open: boolean
  onClose: () => void
  onJobCreated: (job: ScheduledJob) => void
  initialJob?: ScheduledJob
}

interface WizardState {
  step: 1 | 2 | 3
  skillId: string
  jobName: string
  scope: 'global' | 'per-project'
  frequency: Frequency
  hour: number
  minute: number
  dayOfWeek: number
  dayOfMonth: number
  customCron: string
  timezone: string
  params: Record<string, unknown>
}

interface Project {
  id: string
  name: string
}

// ─── Step config for stepper header ──────────────────────────────────────────

const ALL_STEPS = [
  { num: 1, label: 'Skill' },
  { num: 2, label: 'Schedule' },
  { num: 3, label: 'Params' },
] as const

// ─── Initial state ────────────────────────────────────────────────────────────

function buildInitialState(initialJob?: ScheduledJob): WizardState {
  if (!initialJob) {
    return {
      step: 1,
      skillId: '',
      jobName: '',
      scope: 'global',
      frequency: 'daily',
      hour: 9,
      minute: 0,
      dayOfWeek: 1,
      dayOfMonth: 1,
      customCron: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      params: {},
    }
  }

  // Parse params from existing job
  const existingParams = initialJob.skill_params_json ?? {}
  const scope =
    (existingParams.scope as 'global' | 'per-project') ?? 'global'

  return {
    step: 1,
    skillId: initialJob.skill_name,
    jobName: initialJob.name,
    scope,
    frequency: 'daily',
    hour: 9,
    minute: 0,
    dayOfWeek: 1,
    dayOfMonth: 1,
    customCron: '',
    timezone: initialJob.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    params: { ...existingParams },
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateJobWizard({
  open,
  onClose,
  onJobCreated,
  initialJob,
}: CreateJobWizardProps) {
  const isEditMode = Boolean(initialJob)

  const [state, setState] = useState<WizardState>(() => buildInitialState(initialJob))
  const [submitting, setSubmitting] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])

  // Re-populate state when initialJob changes (edit mode)
  useEffect(() => {
    if (open) {
      setState(buildInitialState(initialJob))
    }
  }, [initialJob, open])

  // Fetch projects for JobParamsStep
  useEffect(() => {
    if (!open) return
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data: { projects?: Array<{ id: number; name: string }> }) => {
        const list = (data.projects ?? []).map((p) => ({
          id: String(p.id),
          name: p.name,
        }))
        setProjects(list)
      })
      .catch(() => {
        // Non-fatal: params step will show empty project list
      })
  }, [open])

  // Derived: which steps are active for this skill
  const wizardSteps = getWizardSteps(state.skillId)
  const hasParamsStep = wizardSteps.includes('params')

  // Effective last step
  const lastStep = hasParamsStep ? 3 : 2

  // ── Step validation ───────────────────────────────────────────────────────

  function isCurrentStepValid(): boolean {
    if (state.step === 1) {
      return Boolean(state.skillId) && state.jobName.trim().length > 0
    }
    return true // Steps 2 and 3 have no hard validation gate
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleBack() {
    setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) as 1 | 2 | 3 }))
  }

  function handleNext() {
    if (!isCurrentStepValid()) return
    // If step 2 and no params, jump directly to submit
    if (state.step === 2 && !hasParamsStep) {
      handleSubmit()
      return
    }
    setState((prev) => ({ ...prev, step: Math.min(3, prev.step + 1) as 1 | 2 | 3 }))
  }

  // ── Submit handler ────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const cron_expression =
        state.frequency === 'once' || state.frequency === 'biweekly'
          ? null
          : frequencyToCron(state.frequency, {
              hour: state.hour,
              minute: state.minute,
              dayOfWeek: state.dayOfWeek,
              dayOfMonth: state.dayOfMonth,
              cron: state.customCron,
            })

      const skill_params_json: Record<string, unknown> = {
        ...state.params,
        scope: state.scope,
      }

      // For biweekly/once: store frequency hint in params
      if (state.frequency === 'once' || state.frequency === 'biweekly') {
        skill_params_json._frequency = state.frequency
      }

      const payload = {
        name: state.jobName.trim(),
        skill_name: state.skillId,
        cron_expression,
        timezone: state.timezone,
        skill_params_json,
        enabled: true,
      }

      const url = isEditMode ? `/api/jobs/${initialJob!.id}` : '/api/jobs'
      const method = isEditMode ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Request failed: ${res.status}`)
      }

      const data = (await res.json()) as { job: ScheduledJob }
      onJobCreated(data.job)
      onClose()
      toast.success(isEditMode ? 'Job updated' : 'Job created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save job')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Step change handler ───────────────────────────────────────────────────

  function handleScheduleChange(field: string, value: unknown) {
    setState((prev) => ({ ...prev, [field]: value }))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="sr-only">
            {isEditMode ? 'Edit Scheduled Job' : 'Create Scheduled Job'}
          </DialogTitle>

          {/* Stepper header — follows ProjectWizard pattern */}
          <nav aria-label="Wizard steps" className="flex items-center gap-2">
            {ALL_STEPS.map((wizStep, idx) => {
              const stepNum = wizStep.num as 1 | 2 | 3

              // Step 3 hidden label when skill has no params
              const isUnavailable = stepNum === 3 && !hasParamsStep

              const isCompleted = state.step > stepNum
              const isActive = state.step === stepNum
              const isUpcoming = state.step < stepNum

              return (
                <div key={wizStep.num} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                        isCompleted && !isUnavailable && 'bg-green-500 text-white',
                        isActive && !isUnavailable && 'bg-blue-600 text-white',
                        (isUpcoming || isUnavailable) && 'bg-gray-200 text-gray-400',
                      )}
                      aria-current={isActive && !isUnavailable ? 'step' : undefined}
                    >
                      {isCompleted && !isUnavailable ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        wizStep.num
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm hidden sm:inline',
                        isActive && !isUnavailable && 'text-blue-600 font-medium',
                        isUpcoming && !isUnavailable && 'text-gray-400',
                        isCompleted && !isUnavailable && 'text-green-600',
                        isUnavailable && 'text-gray-300',
                      )}
                    >
                      {wizStep.label}
                    </span>
                  </div>

                  {/* Connector */}
                  {idx < ALL_STEPS.length - 1 && (
                    <div
                      className={cn(
                        'mx-2 h-px w-8 shrink-0',
                        state.step > stepNum ? 'bg-green-400' : 'bg-gray-200',
                      )}
                    />
                  )}
                </div>
              )
            })}
          </nav>
        </DialogHeader>

        {/* Step content area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {state.step === 1 && (
            <JobSkillStep
              selectedSkill={state.skillId}
              jobName={state.jobName}
              scope={state.scope}
              onSkillSelect={(id) => setState((prev) => ({ ...prev, skillId: id }))}
              onJobNameChange={(n) => setState((prev) => ({ ...prev, jobName: n }))}
              onScopeChange={(s) =>
                setState((prev) => ({
                  ...prev,
                  scope: s as 'global' | 'per-project',
                }))
              }
            />
          )}

          {state.step === 2 && (
            <JobScheduleStep
              frequency={state.frequency}
              hour={state.hour}
              minute={state.minute}
              dayOfWeek={state.dayOfWeek}
              dayOfMonth={state.dayOfMonth}
              customCron={state.customCron}
              timezone={state.timezone}
              onChange={handleScheduleChange}
            />
          )}

          {state.step === 3 && hasParamsStep && (
            <JobParamsStep
              skillId={state.skillId}
              params={state.params}
              projects={projects}
              onChange={(p) => setState((prev) => ({ ...prev, params: p }))}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          <div>
            {state.step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {state.step < lastStep ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!isCurrentStepValid() || submitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isCurrentStepValid() || submitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Job'}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
