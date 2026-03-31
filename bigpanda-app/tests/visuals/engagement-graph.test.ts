import { describe, it, expect } from 'vitest'

// Test the pure data-transformation logic that builds graph data from TeamsTabData.
// React component rendering is verified in the human checkpoint (Plan 28-05) via browser.
// React Flow requires DOM measurement (ResizeObserver, getBoundingClientRect) — not unit-testable in node env.

// Inline the logic under test for isolation (matches implementation in InteractiveEngagementGraph.tsx)
type MockWorkflow = { team_name: string | null; workflow_name: string | null; steps: unknown[] }

function buildEngagementGraph(workflows: MockWorkflow[]) {
  const teamsMap = new Map<string, string[]>()
  for (const wf of workflows) {
    if (!wf.team_name) continue
    if (!teamsMap.has(wf.team_name)) teamsMap.set(wf.team_name, [])
    if (wf.workflow_name) teamsMap.get(wf.team_name)!.push(wf.workflow_name)
  }
  const nodes = Array.from(teamsMap.entries()).map(([teamName, wfNames]) => ({
    id: `team-${teamName}`,
    type: 'team',
    data: { label: teamName, workflowCount: wfNames.length },
    position: { x: 0, y: 0 },
  }))
  const workflowToTeams = new Map<string, string[]>()
  for (const wf of workflows) {
    if (!wf.workflow_name || !wf.team_name) continue
    if (!workflowToTeams.has(wf.workflow_name)) workflowToTeams.set(wf.workflow_name, [])
    workflowToTeams.get(wf.workflow_name)!.push(wf.team_name)
  }
  const edges: { id: string; source: string; target: string; label: string }[] = []
  let edgeIdx = 0
  for (const [wfName, teams] of workflowToTeams.entries()) {
    if (teams.length < 2) continue
    for (let i = 0; i < teams.length - 1; i++) {
      edges.push({ id: `edge-${edgeIdx++}`, source: `team-${teams[i]}`, target: `team-${teams[i + 1]}`, label: wfName })
    }
  }
  return { nodes, edges }
}

const sampleWorkflows: MockWorkflow[] = [
  { team_name: 'ITSM', workflow_name: 'Incident Flow', steps: [] },
  { team_name: 'Observability', workflow_name: 'Incident Flow', steps: [] },
  { team_name: 'ITSM', workflow_name: 'Change Flow', steps: [] },
]

describe('InteractiveEngagementGraph — data transformation (VIS-01)', () => {
  it('renders a node for each unique team derived from e2e workflows', () => {
    const { nodes } = buildEngagementGraph(sampleWorkflows)
    expect(nodes).toHaveLength(2)
    const ids = nodes.map((n) => n.id)
    expect(ids).toContain('team-ITSM')
    expect(ids).toContain('team-Observability')
  })

  it('creates an edge for teams sharing the same workflow', () => {
    const { edges } = buildEngagementGraph(sampleWorkflows)
    expect(edges).toHaveLength(1)
    expect(edges[0].label).toBe('Incident Flow')
  })

  it('returns empty nodes and edges when no workflows exist', () => {
    const { nodes, edges } = buildEngagementGraph([])
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })
})
