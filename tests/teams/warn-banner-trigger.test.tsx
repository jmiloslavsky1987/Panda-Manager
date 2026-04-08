// TDD test for WarnBanner appearance on zero-length arrays
// Phase 48 Plan 02 Task 1
// Tests defensive checks for missing data

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamEngagementOverview } from '@/components/teams/TeamEngagementOverview'
import type { TeamsTabData } from '@/lib/queries'

describe('TeamEngagementOverview WarnBanner Triggers', () => {
  const emptyTeamsTabData: TeamsTabData = {
    businessOutcomes: [],
    e2eWorkflows: [],
    focusAreas: [],
    architectureIntegrations: [],
    openActions: [],
  }

  it('shows WarnBanner when businessOutcomes array is empty', () => {
    render(<TeamEngagementOverview projectId={1} data={emptyTeamsTabData} />)

    expect(screen.getByText(/No business outcomes/i)).toBeInTheDocument()
  })

  it('shows WarnBanner when e2eWorkflows array is empty', () => {
    render(<TeamEngagementOverview projectId={1} data={emptyTeamsTabData} />)

    expect(screen.getByText(/No E2E workflows/i)).toBeInTheDocument()
  })

  it('shows WarnBanner when focusAreas array is empty', () => {
    render(<TeamEngagementOverview projectId={1} data={emptyTeamsTabData} />)

    expect(screen.getByText(/No focus areas/i)).toBeInTheDocument()
  })

  it('shows WarnBanner when architectureIntegrations array is empty', () => {
    render(<TeamEngagementOverview projectId={1} data={emptyTeamsTabData} />)

    expect(screen.getByText(/No team engagement data/i)).toBeInTheDocument()
  })

  it('handles undefined businessOutcomes defensively', () => {
    const dataWithUndefined = {
      ...emptyTeamsTabData,
      // @ts-expect-error Testing defensive check for undefined
      businessOutcomes: undefined,
    }

    // Should not throw error; should render WarnBanner
    expect(() => {
      render(<TeamEngagementOverview projectId={1} data={dataWithUndefined} />)
    }).not.toThrow()

    expect(screen.getByText(/No business outcomes/i)).toBeInTheDocument()
  })

  it('handles undefined e2eWorkflows defensively', () => {
    const dataWithUndefined = {
      ...emptyTeamsTabData,
      // @ts-expect-error Testing defensive check for undefined
      e2eWorkflows: undefined,
    }

    expect(() => {
      render(<TeamEngagementOverview projectId={1} data={dataWithUndefined} />)
    }).not.toThrow()

    expect(screen.getByText(/No E2E workflows/i)).toBeInTheDocument()
  })

  it('handles undefined focusAreas defensively', () => {
    const dataWithUndefined = {
      ...emptyTeamsTabData,
      // @ts-expect-error Testing defensive check for undefined
      focusAreas: undefined,
    }

    expect(() => {
      render(<TeamEngagementOverview projectId={1} data={dataWithUndefined} />)
    }).not.toThrow()

    expect(screen.getByText(/No focus areas/i)).toBeInTheDocument()
  })

  it('handles undefined architectureIntegrations defensively', () => {
    const dataWithUndefined = {
      ...emptyTeamsTabData,
      // @ts-expect-error Testing defensive check for undefined
      architectureIntegrations: undefined,
    }

    expect(() => {
      render(<TeamEngagementOverview projectId={1} data={dataWithUndefined} />)
    }).not.toThrow()

    expect(screen.getByText(/No team engagement data/i)).toBeInTheDocument()
  })
})
