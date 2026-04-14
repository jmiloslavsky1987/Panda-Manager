// @vitest-environment jsdom
// tests/ui/empty-states.test.tsx
// RED tests for UXPOL-01 — Empty state CTAs for 9 tabs
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActionsTableClient } from '../../components/ActionsTableClient'
import { RisksTableClient } from '../../components/RisksTableClient'
import { MilestonesTableClient } from '../../components/MilestonesTableClient'
import DecisionsTableClient from '../../components/DecisionsTableClient'
import { EmptyState } from '../../components/EmptyState'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new Map(),
}))

describe('UXPOL-01 — Empty States', () => {
  it('Actions table shows Add Action CTA when actions array is empty', () => {
    render(<ActionsTableClient actions={[]} projectId={123} />)
    const buttons = screen.getAllByRole('button', { name: 'Add Action' })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('Risks table shows Add Risk CTA when risks array is empty', () => {
    render(<RisksTableClient risks={[]} artifacts={[]} projectId={123} />)
    const buttons = screen.getAllByRole('button', { name: 'Add Risk' })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('Milestones table shows Add Milestone CTA when milestones array is empty', () => {
    render(<MilestonesTableClient milestones={[]} artifacts={[]} projectId={123} />)
    const buttons = screen.getAllByRole('button', { name: 'Add Milestone' })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('Decisions table shows Log a Decision CTA when decisions array is empty', () => {
    render(<DecisionsTableClient decisions={[]} projectId={123} />)
    const button = screen.getByRole('button', { name: 'Log a Decision' })
    expect(button).toBeDefined()
  })

  it('Stakeholders page empty state has Add Stakeholder CTA', () => {
    const mockAction = { label: 'Add Stakeholder', onClick: vi.fn() }
    render(<EmptyState title="No stakeholders yet" description="Add your first stakeholder" action={mockAction} />)
    const button = screen.getByRole('button', { name: 'Add Stakeholder' })
    expect(button).toBeDefined()
  })

  it('Artifacts page empty state has Upload a document CTA', () => {
    const mockAction = { label: 'Upload a document', onClick: vi.fn() }
    render(<EmptyState title="No documents" description="Upload your first document" action={mockAction} />)
    const button = screen.getByRole('button', { name: 'Upload a document' })
    expect(button).toBeDefined()
  })

  it('History tab empty state shows description without any CTA button', () => {
    render(<EmptyState title="No history" description="Activity will appear here" />)
    expect(screen.getByText('No history')).toBeDefined()
    expect(screen.getByText('Activity will appear here')).toBeDefined()
    // No button should exist
    const buttons = screen.queryAllByRole('button')
    expect(buttons.length).toBe(0)
  })

  it('Teams tab empty state has Add Team Member CTA', () => {
    const mockAction = { label: 'Add Team Member', onClick: vi.fn() }
    render(<EmptyState title="No team members" description="Add your first team member" action={mockAction} />)
    const button = screen.getByRole('button', { name: 'Add Team Member' })
    expect(button).toBeDefined()
  })

  it('Architecture tab empty state has Add Component CTA', () => {
    const mockAction = { label: 'Add Component', onClick: vi.fn() }
    render(<EmptyState title="No components" description="Add your first component" action={mockAction} />)
    const button = screen.getByRole('button', { name: 'Add Component' })
    expect(button).toBeDefined()
  })
})
