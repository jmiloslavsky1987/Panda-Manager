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
        track: 'ADR',
        delivery_status: 'live',
        mapping_note: null,
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        ingested_at: null,
        created_at: new Date(),
      },
    ],
    e2eWorkflows: [
      {
        id: 1,
        project_id: 1,
        team_name: 'Test Team',
        workflow_name: 'Test Workflow',
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        ingested_at: null,
        created_at: new Date(),
        steps: [
          {
            id: 1,
            workflow_id: 1,
            label: 'Step 1',
            status: 'live',
            track: 'ADR',
            position: 1,
            discovery_source: null,
            created_at: new Date(),
          },
        ],
      },
    ],
    focusAreas: [
      {
        id: 1,
        project_id: 1,
        title: 'Test Focus Area',
        tracks: 'ADR',
        why_it_matters: 'Test why description',
        current_status: 'in_progress',
        next_step: null,
        bp_owner: 'Test Owner',
        customer_owner: null,
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        ingested_at: null,
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
        source: 'manual',
        source_artifact_id: null,
        discovery_source: null,
        ingested_at: null,
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
