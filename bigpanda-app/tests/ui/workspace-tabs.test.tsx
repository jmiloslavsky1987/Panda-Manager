// @vitest-environment jsdom
// tests/ui/workspace-tabs.test.tsx
// GREEN tests for UI-01 — WorkspaceTabs navigation behaviors
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkspaceTabs } from '../../components/WorkspaceTabs'

// Mock useSearchParams hook
const mockSearchParams = new Map<string, string | null>()

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) ?? null,
  }),
}))

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ items: [] }),
  } as Response)
)

describe('WorkspaceTabs — UI-01', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.clear()
    mockSearchParams.set('tab', 'overview')
  })

  it('renders 6 top-level tab groups (not 14)', () => {
    render(<WorkspaceTabs projectId="123" />)

    // Primary tabs
    expect(screen.getByText('Overview')).toBeDefined()
    expect(screen.getByText('Delivery')).toBeDefined()
    expect(screen.getByText('Team')).toBeDefined()
    expect(screen.getByText('Intel')).toBeDefined()
    expect(screen.getByText('Skills')).toBeDefined()
    expect(screen.getByText('Admin')).toBeDefined()
  })

  it('renders secondary tab bar when Delivery is active', () => {
    mockSearchParams.set('tab', 'delivery')
    mockSearchParams.set('subtab', 'actions')

    render(<WorkspaceTabs projectId="123" />)

    // Sub-tabs should be rendered
    expect(screen.getByText('Actions')).toBeDefined()
    expect(screen.getByText('Risks')).toBeDefined()
    expect(screen.getByText('Milestones')).toBeDefined()
    expect(screen.getByText('Plan')).toBeDefined()
  })

  it('URL uses ?tab=delivery&subtab=actions pattern', () => {
    mockSearchParams.set('tab', 'delivery')
    mockSearchParams.set('subtab', 'actions')

    render(<WorkspaceTabs projectId="123" />)

    const actionsLink = screen.getByText('Actions').closest('a')
    expect(actionsLink?.getAttribute('href')).toContain('tab=delivery')
    expect(actionsLink?.getAttribute('href')).toContain('subtab=actions')
  })

  it('clicking Overview (standalone) shows no secondary bar', () => {
    mockSearchParams.set('tab', 'overview')

    render(<WorkspaceTabs projectId="123" />)

    // Sub-tabs should NOT be rendered
    expect(screen.queryByText('Actions')).toBeNull()
    expect(screen.queryByText('Risks')).toBeNull()
  })

  it('clicking Delivery parent navigates to ?tab=delivery&subtab=actions', () => {
    mockSearchParams.set('tab', 'overview')

    render(<WorkspaceTabs projectId="123" />)

    const deliveryLink = screen.getByText('Delivery').closest('a')
    expect(deliveryLink?.getAttribute('href')).toContain('tab=delivery')
    expect(deliveryLink?.getAttribute('href')).toContain('subtab=actions')
  })
})
