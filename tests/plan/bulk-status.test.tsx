// @vitest-environment jsdom
// tests/plan/bulk-status.test.tsx
// RED tests for PLAN-02 — bulk status mode in TaskBoard and PhaseBoard
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  } as Response)
)

describe('PLAN-02: bulk status mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockTasks: Task[] = [
    {
      id: 1,
      project_id: 1,
      title: 'Task One',
      description: null,
      owner: 'Alice',
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
    },
    {
      id: 2,
      project_id: 1,
      title: 'Task Two',
      description: null,
      owner: 'Bob',
      due: null,
      priority: null,
      type: null,
      phase: null,
      workstream_id: null,
      blocked_by: null,
      milestone_id: null,
      start_date: null,
      status: 'in_progress',
      source: 'manual',
      source_artifact_id: null,
      ingested_at: null,
      created_at: new Date('2026-04-01'),
    },
    {
      id: 3,
      project_id: 1,
      title: 'Task Three',
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
      status: 'blocked',
      source: 'manual',
      source_artifact_id: null,
      ingested_at: null,
      created_at: new Date('2026-04-01'),
    },
  ]

  it('TaskBoard BulkToolbar shows "Change Status" button in default mode', async () => {
    const user = userEvent.setup()

    render(<TaskBoard tasks={mockTasks} projectId={1} />)

    // Select 2 tasks
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1]) // First task checkbox (skip "select all")
    await user.click(checkboxes[2]) // Second task checkbox

    // Wait for bulk toolbar to appear
    await waitFor(() => {
      expect(screen.getByTestId('bulk-toolbar')).toBeDefined()
    })

    // This will FAIL because "Change Status" button doesn't exist yet
    expect(screen.getByText('Change Status')).toBeDefined()
  })

  it('TaskBoard BulkToolbar status mode renders status dropdown with 4 options', async () => {
    const user = userEvent.setup()

    render(<TaskBoard tasks={mockTasks} projectId={1} />)

    // Select 2 tasks
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1])
    await user.click(checkboxes[2])

    await waitFor(() => {
      expect(screen.getByTestId('bulk-toolbar')).toBeDefined()
    })

    // Click "Change Status" button
    const changeStatusBtn = screen.getByText('Change Status')
    await user.click(changeStatusBtn)

    // This will FAIL because status dropdown doesn't exist yet
    const statusSelect = screen.getByRole('combobox', { name: /status/i })
    expect(statusSelect).toBeDefined()

    // Should have 4 status options
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThanOrEqual(4)
    expect(screen.getByText('todo')).toBeDefined()
    expect(screen.getByText('in_progress')).toBeDefined()
    expect(screen.getByText('blocked')).toBeDefined()
    expect(screen.getByText('done')).toBeDefined()
  })

  it('TaskBoard BulkToolbar status mode calls /api/tasks-bulk with status patch on submit', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(global, 'fetch')

    render(<TaskBoard tasks={mockTasks} projectId={1} />)

    // Select 2 tasks
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1])
    await user.click(checkboxes[2])

    await waitFor(() => {
      expect(screen.getByTestId('bulk-toolbar')).toBeDefined()
    })

    // Click "Change Status" button
    await user.click(screen.getByText('Change Status'))

    // Select status 'done'
    const statusSelect = screen.getByRole('combobox', { name: /status/i })
    await user.selectOptions(statusSelect, 'done')

    // Submit
    await user.click(screen.getByText('Apply'))

    // This will FAIL because the status mode doesn't exist yet
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/tasks-bulk',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"status":"done"'),
        })
      )
    })
  })

  it('PhaseBoard renders checkboxes on phase cards', () => {
    const phaseTasks: Task[] = mockTasks.map(t => ({ ...t, phase: 'Discovery' }))

    render(<PhaseBoard tasks={phaseTasks} projectId={1} templates={[]} />)

    // This will FAIL because PhaseCard doesn't have checkboxes yet
    const taskCards = screen.getAllByTestId('task-card')
    expect(taskCards.length).toBeGreaterThan(0)

    // Each card should have a checkbox
    taskCards.forEach(card => {
      const checkbox = card.querySelector('input[type="checkbox"]')
      expect(checkbox).toBeDefined()
    })
  })

  it('PhaseBoard shows bulk status toolbar when 2+ phases selected', async () => {
    const user = userEvent.setup()
    const phaseTasks: Task[] = mockTasks.map(t => ({ ...t, phase: 'Discovery' }))

    render(<PhaseBoard tasks={phaseTasks} projectId={1} templates={[]} />)

    // Select 2 checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(2)

    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    // This will FAIL because PhaseBoard bulk toolbar doesn't exist yet
    await waitFor(() => {
      expect(screen.getByText(/selected/i)).toBeDefined()
    })

    // Should have status options
    expect(screen.getByText(/status/i)).toBeDefined()
  })

  it('PhaseBoard bulk status toolbar calls /api/tasks-bulk on apply', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(global, 'fetch')
    const phaseTasks: Task[] = mockTasks.map(t => ({ ...t, phase: 'Build' }))

    render(<PhaseBoard tasks={phaseTasks} projectId={1} templates={[]} />)

    // Select 2 checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    await waitFor(() => {
      expect(screen.getByText(/selected/i)).toBeDefined()
    })

    // Select status and apply
    const statusSelect = screen.getByRole('combobox')
    await user.selectOptions(statusSelect, 'done')
    await user.click(screen.getByText('Apply'))

    // This will FAIL because the bulk update logic doesn't exist yet
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/tasks-bulk',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })
})
