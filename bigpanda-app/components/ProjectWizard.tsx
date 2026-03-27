'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import type { ReviewItem } from './IngestionModal'
import { cn } from '@/lib/utils'
import { BasicInfoStep } from './wizard/BasicInfoStep'
import { CollateralUploadStep } from './wizard/CollateralUploadStep'
import { AiPreviewStep } from './wizard/AiPreviewStep'
import { ManualEntryStep } from './wizard/ManualEntryStep'
import { LaunchStep } from './wizard/LaunchStep'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WizardStep = 'basic-info' | 'upload' | 'ai-preview' | 'manual-entry' | 'launch'

export interface ManualItem {
  entityType: string
  fields: Record<string, string>
}

export interface FileStatus {
  name: string
  status: 'pending' | 'extracting' | 'done' | 'error'
  artifactId?: number
}

export interface WizardState {
  step: WizardStep
  projectId: number | null
  reviewItems: ReviewItem[]
  manualItems: ManualItem[]
  fileStatuses: FileStatus[]
  extractionStage: 'idle' | 'uploading' | 'extracting' | 'done'
  checklistState: Record<string, boolean>
}

// ─── Step Config ──────────────────────────────────────────────────────────────

const WIZARD_STEPS: Array<{ id: WizardStep; label: string; num: number }> = [
  { id: 'basic-info',    label: 'Project Info',  num: 1 },
  { id: 'upload',        label: 'Upload Files',  num: 2 },
  { id: 'ai-preview',   label: 'AI Preview',    num: 3 },
  { id: 'manual-entry', label: 'Manual Entry',  num: 4 },
  { id: 'launch',       label: 'Launch',         num: 5 },
]

const STEP_ORDER: WizardStep[] = ['basic-info', 'upload', 'ai-preview', 'manual-entry', 'launch']

function nextStep(current: WizardStep): WizardStep {
  const idx = STEP_ORDER.indexOf(current)
  return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)]
}

function stepIndex(step: WizardStep): number {
  return STEP_ORDER.indexOf(step)
}

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_STATE: WizardState = {
  step: 'basic-info',
  projectId: null,
  reviewItems: [],
  manualItems: [],
  fileStatuses: [],
  extractionStage: 'idle',
  checklistState: {},
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectWizard({ open, onOpenChange }: ProjectWizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE)

  // ── State machine ─────────────────────────────────────────────────────────

  function handleStepComplete(step: WizardStep, data?: Partial<WizardState>) {
    setState(prev => ({
      ...prev,
      ...(data ?? {}),
      step: nextStep(step),
    }))
  }

  function handleSkip() {
    setState(prev => ({
      ...prev,
      step: nextStep(prev.step),
    }))
  }

  const router = useRouter()

  function handleClose() {
    router.refresh()
    onOpenChange(false)
    setState(INITIAL_STATE)
  }

  // ── Step progress header ──────────────────────────────────────────────────

  const currentStepIndex = stepIndex(state.step)

  // ── Footer button label ───────────────────────────────────────────────────

  function getPrimaryLabel(): string {
    if (state.step === 'launch') return 'Launch Project'
    if (state.step === 'manual-entry') return 'Continue'
    return 'Next'
  }

  function handlePrimaryClick() {
    if (state.step === 'basic-info') return // Step 1 has its own submit
    handleStepComplete(state.step)
  }

  const showSkip = state.step === 'upload'
  // Steps 3-5 manage their own navigation buttons; only show generic footer for step 2 (upload)
  const showFooter = state.step === 'upload'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-screen-lg w-full h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="sr-only">New Project Wizard</DialogTitle>

          {/* Step progress strip */}
          <nav aria-label="Wizard steps" className="flex items-center gap-2">
            {WIZARD_STEPS.map((wizStep, idx) => {
              const isCompleted = idx < currentStepIndex
              const isActive = idx === currentStepIndex
              const isUpcoming = idx > currentStepIndex

              return (
                <div key={wizStep.id} className="flex items-center">
                  {/* Step circle */}
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                        isCompleted && 'bg-green-500 text-white',
                        isActive && 'bg-blue-600 text-white',
                        isUpcoming && 'bg-gray-200 text-gray-500',
                      )}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : wizStep.num}
                    </div>
                    <span
                      className={cn(
                        'text-sm hidden sm:inline',
                        isActive && 'text-blue-600 font-medium',
                        isUpcoming && 'text-gray-400',
                        isCompleted && 'text-green-600',
                      )}
                    >
                      {wizStep.label}
                    </span>
                  </div>

                  {/* Connector */}
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div
                      className={cn(
                        'mx-2 h-px w-8 shrink-0',
                        idx < currentStepIndex ? 'bg-green-400' : 'bg-gray-200',
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
          {state.step === 'basic-info' && (
            <BasicInfoStep
              onComplete={(projectId) => handleStepComplete('basic-info', { projectId })}
            />
          )}
          {state.step === 'upload' && (
            <CollateralUploadStep
              projectId={state.projectId!}
              fileStatuses={state.fileStatuses}
              checklistState={state.checklistState}
              onChecklistChange={(checklistState) =>
                setState(prev => ({ ...prev, checklistState }))
              }
              onFilesUploaded={(statuses) =>
                setState(prev => ({ ...prev, fileStatuses: statuses }))
              }
              onSkip={handleSkip}
              onContinue={() => handleStepComplete('upload')}
            />
          )}
          {state.step === 'ai-preview' && (
            <AiPreviewStep
              projectId={state.projectId!}
              fileStatuses={state.fileStatuses}
              reviewItems={state.reviewItems}
              onReviewItemsChange={(items) => setState(prev => ({ ...prev, reviewItems: items }))}
              onApprove={(approvedItems) => {
                setState(prev => ({ ...prev, reviewItems: approvedItems, step: 'manual-entry' }))
              }}
              onSkip={() => setState(prev => ({ ...prev, step: 'manual-entry' }))}
            />
          )}
          {state.step === 'manual-entry' && (
            <ManualEntryStep
              projectId={state.projectId!}
              approvedItems={state.reviewItems.filter(i => i.approved)}
              manualItems={state.manualItems}
              onManualItemsChange={(items) => setState(prev => ({ ...prev, manualItems: items }))}
              onContinue={() => setState(prev => ({ ...prev, step: 'launch' }))}
              onSkip={() => setState(prev => ({ ...prev, step: 'launch' }))}
            />
          )}
          {state.step === 'launch' && (
            <LaunchStep
              projectId={state.projectId!}
              approvedItems={state.reviewItems.filter(i => i.approved)}
              manualItems={state.manualItems}
            />
          )}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0">
            {showSkip && (
              <button
                type="button"
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={handlePrimaryClick}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              {getPrimaryLabel()}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
