'use client'
import '@xyflow/react/dist/style.css'
import { useState, useCallback, useMemo } from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge, applyNodeChanges, applyEdgeChanges, type OnNodesChange, type OnEdgesChange } from '@xyflow/react'
import type { TeamsTabData, E2eWorkflowWithSteps } from '@/lib/queries'
import { teamNodeTypes } from '@/components/graph/CustomNodes'
import { getLayoutedElements } from '@/components/graph/useGraphLayout'
import { NodeDetailDrawer } from './NodeDetailDrawer'

interface Props {
  data: TeamsTabData
}

function buildEngagementGraph(workflows: E2eWorkflowWithSteps[]): { nodes: Node[]; edges: Edge[] } {
  // Derive unique teams
  const teamsMap = new Map<string, string[]>()
  for (const wf of workflows) {
    if (!wf.team_name) continue
    if (!teamsMap.has(wf.team_name)) teamsMap.set(wf.team_name, [])
    if (wf.workflow_name) teamsMap.get(wf.team_name)!.push(wf.workflow_name)
  }

  const nodes: Node[] = Array.from(teamsMap.entries()).map(([teamName, wfNames]) => ({
    id: `team-${teamName}`,
    type: 'team',
    data: { label: teamName, workflowCount: wfNames.length, workflowNames: wfNames.join(', ') },
    position: { x: 0, y: 0 },
  }))

  // Edges: teams sharing the same workflow_name
  const edges: Edge[] = []
  const workflowToTeams = new Map<string, string[]>()
  for (const wf of workflows) {
    if (!wf.workflow_name || !wf.team_name) continue
    if (!workflowToTeams.has(wf.workflow_name)) workflowToTeams.set(wf.workflow_name, [])
    workflowToTeams.get(wf.workflow_name)!.push(wf.team_name)
  }
  let edgeIdx = 0
  for (const [wfName, teams] of workflowToTeams.entries()) {
    if (teams.length < 2) continue
    for (let i = 0; i < teams.length - 1; i++) {
      edges.push({
        id: `edge-${edgeIdx++}`,
        source: `team-${teams[i]}`,
        target: `team-${teams[i + 1]}`,
        label: wfName,
      })
    }
  }

  return { nodes, edges }
}

export function InteractiveEngagementGraph({ data }: Props) {
  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => buildEngagementGraph(data.e2eWorkflows),
    [data.e2eWorkflows],
  )

  // Layout computed before first render — no layout "jump"
  const layoutedNodes = useMemo(
    () => getLayoutedElements(rawNodes, rawEdges),
    [rawNodes, rawEdges],
  )

  const [nodes, setNodes] = useState<Node[]>(layoutedNodes)
  const [edges, setEdges] = useState<Edge[]>(rawEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
  }, [])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  if (nodes.length === 0) {
    return (
      <div className="h-96 border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 text-sm">
        Add teams and stakeholders to see the engagement map
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[520px]">
      <div className="flex-1 border border-zinc-200 rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={teamNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background variant={"dots" as any} gap={16} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {selectedNode && (
        <NodeDetailDrawer
          node={selectedNode as any}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  )
}
