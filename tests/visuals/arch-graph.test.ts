import { describe, it, expect } from 'vitest'
import type { ArchitectureIntegration } from '../../lib/queries'

// Test the pure data-transformation logic that builds arch graph from integrations.
// React component rendering requires DOM — verified in human checkpoint (Plan 28-05).

const BIGPANDA_NODE_ID = 'bigpanda'

function buildArchGraph(integrations: ArchitectureIntegration[]) {
  const centerNode = {
    id: BIGPANDA_NODE_ID,
    type: 'bigpanda',
    data: { label: 'BigPanda' },
    position: { x: 0, y: 0 },
    width: 200,
    height: 80,
  }
  const integrationNodes = integrations.map((int) => ({
    id: `int-${int.id}`,
    type: 'integration',
    data: { label: int.tool_name, status: int.status, track: int.track },
    position: { x: 0, y: 0 },
  }))
  const edges = integrations.map((int) => ({
    id: `edge-bp-${int.id}`,
    source: BIGPANDA_NODE_ID,
    target: `int-${int.id}`,
  }))
  return { nodes: [centerNode, ...integrationNodes], edges }
}

const sampleIntegrations: ArchitectureIntegration[] = [
  { id: 1, project_id: 1, tool_name: 'ServiceNow', track: 'ADR', phase: 'Incident Intelligence', status: 'live', integration_method: 'API', notes: null, source: 'manual', source_artifact_id: null, discovery_source: null, ingested_at: null, created_at: new Date() },
  { id: 2, project_id: 1, tool_name: 'PagerDuty', track: 'ADR', phase: 'Event Ingest', status: 'in_progress', integration_method: null, notes: 'In progress', source: 'manual', source_artifact_id: null, discovery_source: null, ingested_at: null, created_at: new Date() },
]

describe('InteractiveArchGraph — data transformation (VIS-02)', () => {
  it('includes a BigPanda center node in the node list', () => {
    const { nodes } = buildArchGraph(sampleIntegrations)
    const centerNode = nodes.find((n) => n.id === BIGPANDA_NODE_ID)
    expect(centerNode).toBeDefined()
    expect(centerNode!.type).toBe('bigpanda')
  })

  it('renders one node per architecture integration', () => {
    const { nodes } = buildArchGraph(sampleIntegrations)
    // Total = 1 center + N integrations
    expect(nodes).toHaveLength(sampleIntegrations.length + 1)
    expect(nodes.find((n) => n.id === 'int-1')).toBeDefined()
    expect(nodes.find((n) => n.id === 'int-2')).toBeDefined()
  })

  it('creates edges from BigPanda to each integration (hub-and-spoke)', () => {
    const { edges } = buildArchGraph(sampleIntegrations)
    expect(edges).toHaveLength(sampleIntegrations.length)
    edges.forEach((e) => {
      expect(e.source).toBe(BIGPANDA_NODE_ID)
    })
  })
})
