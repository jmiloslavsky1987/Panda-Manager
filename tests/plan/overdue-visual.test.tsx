// @vitest-environment jsdom
// tests/plan/overdue-visual.test.tsx
// RED tests for PLAN-01 — overdue card styling in TaskBoard and PhaseBoard
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskBoard } from '@/components/TaskBoard'
import { PhaseBoard } from '@/components/PhaseBoard'
import type { Task } from '@/lib/queries'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

describe('PLAN-01: overdue visual styling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TaskCard renders with red border and bg-red-50 when task is overdue', () => {
    const overdueTask: Task = {
      id: 1,
      project_id: 1,
      title: 'Overdue task',
      description: null,
      owner: 'Alice',
      due: '2020-01-01', // Past date
      priority: null,
      type: null,
      phase: null,
      workstream_id: null,
      blocked_by: null,
      milestone_id: null,
      start_date: null,
      status: 'todo',
      source: 'manual',
      source_artifact_id: null,
      ingested_at: null,
      created_at: new Date('2026-04-01'),
    }

    render(<TaskBoard tasks={[overdueTask]} projectId={1} />)

    // This will FAIL because TaskCard doesn't have overdue styling yet
    const card = screen.getByTestId('task-card')
    expect(card.className).toContain('border-red-500')
    expect(card.className).toContain('bg-red-50')
  })

  it('TaskCard does NOT render red styling when task is done even if past due', () => {
    const doneTask: Task = {
      id: 2,
      project_id: 1,
      title: 'Done task',
      description: null,
      owner: 'Bob',
      due: '2020-01-01', // Past date
      priority: null,
      type: null,
      phase: null,
      workstream_id: null,
      blocked_by: null,
      milestone_id: null,
      start_date: null,
      status: 'done',
      source: 'manual',
      source_artifact_id: null,
      ingested_at: null,
      created_at: new Date('2026-04-01'),
    }

    render(<TaskBoard tasks={[doneTask]} projectId={1} />)

    // Should NOT have red styling
    const card = screen.getByTestId('task-card')
    expect(card.className).not.toContain('border-red-500')
    expect(card.className).not.toContain('bg-red-50')
  })

  it('TaskCard does NOT render red styling when task has no due date', () => {
    const noDueTask: Task = {
      id: 3,
      project_id: 1,
      title: 'No due date task',
      description: null,
      owner: 'Charlie',
      due: null,
      priority: null,
      type: null,
      phase: null,
      workstream_id: null,
      blocked_by: null,
      milestone_id: null,
      start_date: null,
      status: 'todo',
      source: 'manual',
      source_artifact_id: null,
      ingested_at: null,
      created_at: new Date('2026-04-01'),
    }

    render(<TaskBoard tasks={[noDueTask]} projectId={1} />)

    // Should NOT have red styling
    const card = screen.getByTestId('task-card')
    expect(card.className).not.toContain('border-red-500')
    expect(card.className).not.toContain('bg-red-50')
  })

  it('PhaseBoard PhaseCard renders with red border when task is overdue', () => {
    const overdueTask: Task = {
      id: 4,
      project_id: 1,
      title: 'Overdue phase task',
      description: null,
      owner: 'Diana',
      due: '2020-01-01', // Past date
      priority: null,
      type: null,
      phase: 'Discovery',
      workstream_id: null,
      blocked_by: null,
      milestone_id: null,
      start_date: null,
      status: 'in_progress',
      source: 'manual',
      source_artifact_id: null,
      ingested_at: null,
      created_at: new Date('2026-04-01'),
    }

    render(<PhaseBoard tasks={[overdueTask]} projectId={1} templates={[]} />)

    // This will FAIL because PhaseCard doesn't have overdue styling yet
    const card = screen.getByTestId('task-card')
    expect(card.className).toContain('border-red-500')
  })
})
