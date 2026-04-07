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
      external_id: 'TASK-001',
      title: 'Overdue task',
      status: 'todo',
      due: '2020-01-01', // Past date
      owner: 'Alice',
      priority: null,
      phase: null,
      milestone_id: null,
      blocked_by: null,
      notes: null,
      source: 'manual',
      source_artifact_id: null,
      discovery_source: null,
      project_id: 1,
      created_at: '2026-04-01',
      updated_at: '2026-04-01',
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
      external_id: 'TASK-002',
      title: 'Done task',
      status: 'done',
      due: '2020-01-01', // Past date
      owner: 'Bob',
      priority: null,
      phase: null,
      milestone_id: null,
      blocked_by: null,
      notes: null,
      source: 'manual',
      source_artifact_id: null,
      discovery_source: null,
      project_id: 1,
      created_at: '2026-04-01',
      updated_at: '2026-04-01',
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
      external_id: 'TASK-003',
      title: 'No due date task',
      status: 'todo',
      due: null,
      owner: 'Charlie',
      priority: null,
      phase: null,
      milestone_id: null,
      blocked_by: null,
      notes: null,
      source: 'manual',
      source_artifact_id: null,
      discovery_source: null,
      project_id: 1,
      created_at: '2026-04-01',
      updated_at: '2026-04-01',
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
      external_id: 'TASK-004',
      title: 'Overdue phase task',
      status: 'in_progress',
      due: '2020-01-01', // Past date
      owner: 'Diana',
      priority: null,
      phase: 'Discovery',
      milestone_id: null,
      blocked_by: null,
      notes: null,
      source: 'manual',
      source_artifact_id: null,
      discovery_source: null,
      project_id: 1,
      created_at: '2026-04-01',
      updated_at: '2026-04-01',
    }

    render(<PhaseBoard tasks={[overdueTask]} projectId={1} templates={[]} />)

    // This will FAIL because PhaseCard doesn't have overdue styling yet
    const card = screen.getByTestId('task-card')
    expect(card.className).toContain('border-red-500')
  })
})
