// @vitest-environment jsdom
/**
 * Test scaffold for SRCH-02: Decisions Table Client-side Filtering
 *
 * Covers: text filter, date range filter, URL param sync
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DecisionsTableClient from '@/components/DecisionsTableClient'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => {
    const params = new URLSearchParams()
    return {
      get: (key: string) => params.get(key),
      toString: () => params.toString(),
    }
  },
}))

const mockDecisions = [
  {
    id: 1,
    decision: 'Use PostgreSQL for data storage',
    context: 'We need a reliable database',
    date: '2026-03-15',
    created_at: new Date('2026-03-15T10:00:00Z'),
    source: 'manual',
    source_artifact_id: null,
  },
  {
    id: 2,
    decision: 'Budget approved for Q2',
    context: 'Financial planning complete',
    date: '2026-02-20',
    created_at: new Date('2026-02-20T10:00:00Z'),
    source: 'manual',
    source_artifact_id: null,
  },
  {
    id: 3,
    decision: 'Migrate to Next.js',
    context: 'Better performance and SEO',
    date: '2026-04-01',
    created_at: new Date('2026-04-01T10:00:00Z'),
    source: 'manual',
    source_artifact_id: null,
  },
]

describe('DecisionsTableClient (SRCH-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all decisions without filter', () => {
    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    expect(screen.getByText('Use PostgreSQL for data storage')).toBeInTheDocument()
    expect(screen.getByText('Budget approved for Q2')).toBeInTheDocument()
    expect(screen.getByText('Migrate to Next.js')).toBeInTheDocument()
  })

  it('text filter narrows to matching decisions', () => {
    // Mock useSearchParams to return 'q=budget'
    vi.mocked(require('next/navigation').useSearchParams).mockReturnValue({
      get: (key: string) => (key === 'q' ? 'budget' : null),
      toString: () => 'q=budget',
    })

    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    // Only the budget decision should be visible
    expect(screen.getByText('Budget approved for Q2')).toBeInTheDocument()
    expect(screen.queryByText('Use PostgreSQL for data storage')).not.toBeInTheDocument()
    expect(screen.queryByText('Migrate to Next.js')).not.toBeInTheDocument()
  })

  it('from date filter excludes earlier decisions', () => {
    // Mock useSearchParams to return 'from=2026-03-01'
    vi.mocked(require('next/navigation').useSearchParams).mockReturnValue({
      get: (key: string) => (key === 'from' ? '2026-03-01' : null),
      toString: () => 'from=2026-03-01',
    })

    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    // Should show PostgreSQL (03-15) and Next.js (04-01), but not Budget (02-20)
    expect(screen.getByText('Use PostgreSQL for data storage')).toBeInTheDocument()
    expect(screen.getByText('Migrate to Next.js')).toBeInTheDocument()
    expect(screen.queryByText('Budget approved for Q2')).not.toBeInTheDocument()
  })

  it('to date filter excludes later decisions', () => {
    // Mock useSearchParams to return 'to=2026-02-28'
    vi.mocked(require('next/navigation').useSearchParams).mockReturnValue({
      get: (key: string) => (key === 'to' ? '2026-02-28' : null),
      toString: () => 'to=2026-02-28',
    })

    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    // Should only show Budget (02-20)
    expect(screen.getByText('Budget approved for Q2')).toBeInTheDocument()
    expect(screen.queryByText('Use PostgreSQL for data storage')).not.toBeInTheDocument()
    expect(screen.queryByText('Migrate to Next.js')).not.toBeInTheDocument()
  })

  it('combined filters apply together', () => {
    // Mock useSearchParams to return 'q=PostgreSQL&from=2026-03-01'
    vi.mocked(require('next/navigation').useSearchParams).mockReturnValue({
      get: (key: string) => {
        if (key === 'q') return 'PostgreSQL'
        if (key === 'from') return '2026-03-01'
        return null
      },
      toString: () => 'q=PostgreSQL&from=2026-03-01',
    })

    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    // Should only show PostgreSQL decision (matches text AND date range)
    expect(screen.getByText('Use PostgreSQL for data storage')).toBeInTheDocument()
    expect(screen.queryByText('Budget approved for Q2')).not.toBeInTheDocument()
    expect(screen.queryByText('Migrate to Next.js')).not.toBeInTheDocument()
  })
})
