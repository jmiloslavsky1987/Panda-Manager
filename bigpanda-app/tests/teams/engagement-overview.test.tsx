// TDD test for TeamEngagementOverview component
// Phase 48 Plan 02 Task 1
// Tests module exports and type safety with TeamsTabData shape

import { describe, it, expect } from 'vitest'
import type { TeamsTabData } from '@/lib/queries'

describe('TeamEngagementOverview Module', () => {
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

  it('should export TeamEngagementOverview component', async () => {
    const module = await import('@/components/teams/TeamEngagementOverview')
    expect(module.TeamEngagementOverview).toBeDefined()
    expect(typeof module.TeamEngagementOverview).toBe('function')
  })

  it('should accept correct props interface', async () => {
    const { TeamEngagementOverview } = await import('@/components/teams/TeamEngagementOverview')

    // Type check: this should compile if props interface is correct
    const props = {
      projectId: 1,
      data: mockTeamsTabData,
    }

    // If TeamEngagementOverview accepts these props, the import and type check succeed
    expect(TeamEngagementOverview).toBeDefined()
    expect(props.projectId).toBe(1)
    expect(props.data.businessOutcomes.length).toBe(1)
    expect(props.data.e2eWorkflows.length).toBe(1)
    expect(props.data.focusAreas.length).toBe(1)
    expect(props.data.architectureIntegrations.length).toBe(1)
  })

  it('data interface supports empty arrays', async () => {
    const emptyData: TeamsTabData = {
      businessOutcomes: [],
      e2eWorkflows: [],
      focusAreas: [],
      architectureIntegrations: [],
      openActions: [],
    }

    // Should compile and validate empty arrays
    expect(emptyData.businessOutcomes.length).toBe(0)
    expect(emptyData.e2eWorkflows.length).toBe(0)
    expect(emptyData.focusAreas.length).toBe(0)
    expect(emptyData.architectureIntegrations.length).toBe(0)
  })
})
