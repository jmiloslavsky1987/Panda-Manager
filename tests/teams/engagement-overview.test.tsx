// TDD test for TeamEngagementOverview component
// Phase 48 Plan 02 Task 1
// Tests 4-section render with TeamsTabData shape

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamEngagementOverview } from '@/components/teams/TeamEngagementOverview'
import type { TeamsTabData } from '@/lib/queries'

describe('TeamEngagementOverview Component', () => {
  const mockTeamsTabData: TeamsTabData = {
    businessOutcomes: [
      {
        id: 1,
        project_id: 1,
        title: 'Test Outcome',
        description: 'Test outcome description',
        outcome_type: 'ADR',
        status: 'live',
        icon: '🎯',
        source_trace: null,
        created_at: new Date(),
      },
    ],
    e2eWorkflows: [
      {
        id: 1,
        project_id: 1,
        name: 'Test Workflow',
        description: 'Test workflow description',
        status: 'in_progress',
        track: 'ADR',
        source_trace: null,
        created_at: new Date(),
        steps: [
          {
            id: 1,
            workflow_id: 1,
            name: 'Step 1',
            status: 'live',
            track: 'ADR',
            position: 1,
          },
        ],
      },
    ],
    focusAreas: [
      {
        id: 1,
        project_id: 1,
        title: 'Test Focus Area',
        why: 'Test why description',
        status: 'in_progress',
        owners: 'Test Owner',
        source_trace: null,
        created_at: new Date(),
      },
    ],
    architectureIntegrations: [
      {
        id: 1,
        project_id: 1,
        tool_name: 'Test Tool',
        track: 'ADR',
        phase: 'Ingest',
        status: 'live',
        integration_method: 'API',
        notes: null,
        created_at: new Date(),
      },
    ],
    openActions: [],
  }

  it('renders all 4 section headings when given full TeamsTabData', () => {
    render(<TeamEngagementOverview projectId={1} data={mockTeamsTabData} />)

    expect(screen.getByText('Business Value & Expected Outcomes')).toBeInTheDocument()
    expect(screen.getByText('End-to-End Workflows')).toBeInTheDocument()
    expect(screen.getByText('Teams & Engagement Status')).toBeInTheDocument()
    expect(screen.getByText('Top Focus Areas')).toBeInTheDocument()
  })

  it('does NOT render Architecture section heading', () => {
    render(<TeamEngagementOverview projectId={1} data={mockTeamsTabData} />)

    // Architecture section explicitly excluded per CONTEXT.md
    expect(screen.queryByText(/architecture/i)).not.toBeInTheDocument()
  })

  it('renders business outcome data when provided', () => {
    render(<TeamEngagementOverview projectId={1} data={mockTeamsTabData} />)

    expect(screen.getByText('Test Outcome')).toBeInTheDocument()
  })

  it('renders workflow data when provided', () => {
    render(<TeamEngagementOverview projectId={1} data={mockTeamsTabData} />)

    expect(screen.getByText('Test Workflow')).toBeInTheDocument()
  })

  it('renders focus area data when provided', () => {
    render(<TeamEngagementOverview projectId={1} data={mockTeamsTabData} />)

    expect(screen.getByText('Test Focus Area')).toBeInTheDocument()
  })
})
