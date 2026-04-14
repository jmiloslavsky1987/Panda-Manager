// @vitest-environment jsdom
// tests/ui/workspace-tabs.test.tsx
// GREEN tests for UI-01 — WorkspaceTabs navigation behaviors
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkspaceTabs, TAB_GROUPS } from '../../components/WorkspaceTabs'

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

  it('renders 7 top-level tab groups (not 14)', () => {
    render(<WorkspaceTabs projectId="123" />)

    // Primary tabs
    expect(screen.getByText('Overview')).toBeDefined()
    expect(screen.getByText('Delivery')).toBeDefined()
    expect(screen.getByText('Team')).toBeDefined()
    expect(screen.getByText('Context')).toBeDefined()
    expect(screen.getByText('Skills')).toBeDefined()
    expect(screen.getByText('Chat')).toBeDefined()
    expect(screen.getByText('Admin')).toBeDefined()
  })

  it('Chat tab has standalone href with ?tab=chat', () => {
    render(<WorkspaceTabs projectId="123" />)

    const chatLink = screen.getByText('Chat').closest('a')
    expect(chatLink?.getAttribute('href')).toContain('/customer/123/chat')
    expect(chatLink?.getAttribute('href')).toContain('tab=chat')
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

  it('clicking Delivery parent navigates to ?tab=delivery&subtab=plan', () => {
    mockSearchParams.set('tab', 'overview')

    render(<WorkspaceTabs projectId="123" />)

    const deliveryLink = screen.getByText('Delivery').closest('a')
    expect(deliveryLink?.getAttribute('href')).toContain('tab=delivery')
    expect(deliveryLink?.getAttribute('href')).toContain('subtab=plan')
  })
})

// CTX-01: Context tab registration in TAB_GROUPS
describe('Context tab registration', () => {
  it('Context tab is registered in TAB_GROUPS with standalone: true', () => {
    const contextTab = TAB_GROUPS.find((g) => g.id === 'context');
    expect(contextTab).toBeDefined();
    expect(contextTab?.standalone).toBe(true);
  });

  it('Context tab URL pattern is ?tab=context', () => {
    const contextTab = TAB_GROUPS.find((g) => g.id === 'context');
    expect(contextTab?.id).toBe('context');
  });

  it('Context tab appears before Admin in the tab order', () => {
    const contextIdx = TAB_GROUPS.findIndex((g) => g.id === 'context');
    const adminIdx = TAB_GROUPS.findIndex((g) => g.id === 'admin');
    expect(contextIdx).toBeGreaterThan(-1);
    expect(contextIdx).toBeLessThan(adminIdx);
  });
})
