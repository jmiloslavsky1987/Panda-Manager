// @vitest-environment jsdom
/**
 * Test scaffold for SRCH-02: Decisions Table Client-side Filtering
 *
 * Covers: text filter, date range filter, URL param sync
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import DecisionsTableClient from '@/components/DecisionsTableClient'

// Mock searchParams that can be updated per test
const mockSearchParams = new Map<string, string | null>()

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) ?? null,
    toString: () => {
      const params = new URLSearchParams()
      mockSearchParams.forEach((value, key) => {
        if (value) params.set(key, value)
      })
      return params.toString()
    },
  }),
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
    mockSearchParams.clear()
  })

  it('renders all decisions without filter', () => {
    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    expect(screen.getByText('Use PostgreSQL for data storage')).toBeInTheDocument()
    expect(screen.getByText('Budget approved for Q2')).toBeInTheDocument()
    expect(screen.getByText('Migrate to Next.js')).toBeInTheDocument()
  })

  it('text filter narrows to matching decisions', () => {
    mockSearchParams.set('q', 'budget')

    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    // Only the budget decision should be visible
    expect(screen.getByText('Budget approved for Q2')).toBeInTheDocument()
    expect(screen.queryByText('Use PostgreSQL for data storage')).not.toBeInTheDocument()
    expect(screen.queryByText('Migrate to Next.js')).not.toBeInTheDocument()
  })

  it('from date filter excludes earlier decisions', () => {
    mockSearchParams.set('from', '2026-03-01')

    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    // Should show PostgreSQL (03-15) and Next.js (04-01), but not Budget (02-20)
    expect(screen.getByText('Use PostgreSQL for data storage')).toBeInTheDocument()
    expect(screen.getByText('Migrate to Next.js')).toBeInTheDocument()
    expect(screen.queryByText('Budget approved for Q2')).not.toBeInTheDocument()
  })

  it('to date filter excludes later decisions', () => {
    mockSearchParams.set('to', '2026-02-28')

    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    // Should only show Budget (02-20)
    expect(screen.getByText('Budget approved for Q2')).toBeInTheDocument()
    expect(screen.queryByText('Use PostgreSQL for data storage')).not.toBeInTheDocument()
    expect(screen.queryByText('Migrate to Next.js')).not.toBeInTheDocument()
  })

  it('combined filters apply together', () => {
    mockSearchParams.set('q', 'PostgreSQL')
    mockSearchParams.set('from', '2026-03-01')

    render(<DecisionsTableClient decisions={mockDecisions} projectId={1} />)

    // Should only show PostgreSQL decision (matches text AND date range)
    expect(screen.getByText('Use PostgreSQL for data storage')).toBeInTheDocument()
    expect(screen.queryByText('Budget approved for Q2')).not.toBeInTheDocument()
    expect(screen.queryByText('Migrate to Next.js')).not.toBeInTheDocument()
  })
})
