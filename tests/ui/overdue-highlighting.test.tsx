// @vitest-environment jsdom
// tests/ui/overdue-highlighting.test.tsx
// RED tests for UXPOL-02 — Overdue row highlighting
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActionsTableClient } from '../../components/ActionsTableClient'
import { MilestonesTableClient } from '../../components/MilestonesTableClient'
import type { Action, Milestone } from '@/lib/queries'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new Map(),
}))

describe('UXPOL-02 — Overdue Highlighting', () => {
  it('Actions table applies border-red-500 bg-red-50 to overdue open action', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]

    const overdueAction: Action = {
      id: 1,
      project_id: 123,
      description: 'Overdue action',
      owner: 'John',
      due: yesterdayISO,
      status: 'open',
      external_id: null,
      source: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    const { container } = render(<ActionsTableClient actions={[overdueAction]} projectId={123} />)
    const row = container.querySelector('tr[data-testid="action-row-1"]')
    expect(row?.classList.contains('border-red-500')).toBe(true)
    expect(row?.classList.contains('bg-red-50')).toBe(true)
  })

  it('Actions table does NOT apply overdue styling to completed action with past due date', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]

    const completedAction: Action = {
      id: 2,
      project_id: 123,
      description: 'Completed action',
      owner: 'Jane',
      due: yesterdayISO,
      status: 'completed',
      external_id: null,
      source: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    const { container } = render(<ActionsTableClient actions={[completedAction]} projectId={123} />)
    const row = container.querySelector('tr[data-testid="action-row-2"]')
    expect(row?.classList.contains('border-red-500')).toBe(false)
  })

  it('Milestones table applies border-red-500 bg-red-50 to overdue incomplete milestone', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]

    const overdueMilestone: Milestone = {
      id: 10,
      project_id: 123,
      name: 'Overdue milestone',
      target: yesterdayISO,
      status: 'in_progress',
      date: yesterdayISO,
      description: null,
      external_id: null,
      source: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    const { container } = render(<MilestonesTableClient milestones={[overdueMilestone]} artifacts={[]} projectId={123} />)
    const row = container.querySelector('tr[data-testid="milestone-row-10"]')
    expect(row?.classList.contains('border-red-500')).toBe(true)
    expect(row?.classList.contains('bg-red-50')).toBe(true)
  })

  it('Milestones table does NOT apply overdue styling to completed milestone', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayISO = yesterday.toISOString().split('T')[0]

    const completedMilestone: Milestone = {
      id: 11,
      project_id: 123,
      name: 'Completed milestone',
      target: yesterdayISO,
      status: 'completed',
      date: yesterdayISO,
      description: null,
      external_id: null,
      source: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    const { container } = render(<MilestonesTableClient milestones={[completedMilestone]} artifacts={[]} projectId={123} />)
    const row = container.querySelector('tr[data-testid="milestone-row-11"]')
    expect(row?.classList.contains('border-red-500')).toBe(false)
  })
})
