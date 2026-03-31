'use client'
import '@xyflow/react/dist/style.css'
import { useState, useCallback, useMemo } from 'react'
import { ReactFlow, Background, Controls, type Node, type Edge, applyNodeChanges, applyEdgeChanges, type OnNodesChange, type OnEdgesChange } from '@xyflow/react'
import type { ArchitectureIntegration } from '@/lib/queries'
import { archNodeTypes } from '@/components/graph/CustomNodes'
import { getLayoutedElements } from '@/components/graph/useGraphLayout'
import { IntegrationDetailDrawer } from './IntegrationDetailDrawer'

interface Props {
  integrations: ArchitectureIntegration[]
}

const BIGPANDA_NODE_ID = 'bigpanda'

function buildArchGraph(integrations: ArchitectureIntegration[]): { nodes: Node[]; edges: Edge[] } {
  const centerNode: Node = {
    id: BIGPANDA_NODE_ID,
    type: 'bigpanda',
    data: { label: 'BigPanda' },
    position: { x: 0, y: 0 },
    width: 200,
    height: 80,
  }

  const integrationNodes: Node[] = integrations.map((int) => ({
    id: `int-${int.id}`,
    type: 'integration',
    data: {
      label: int.tool_name,
      status: int.status,
      track: int.track,
      integrationMethod: int.integration_method ?? null,
    },
    position: { x: 0, y: 0 },
    width: 172,
    height: 60,
  }))

  const edges: Edge[] = integrations.map((int) => ({
    id: `edge-bp-${int.id}`,
    source: BIGPANDA_NODE_ID,
    target: `int-${int.id}`,
  }))

  return { nodes: [centerNode, ...integrationNodes], edges }
}

export function InteractiveArchGraph({ integrations }: Props) {
  const { nodes: rawNodes, edges: rawEdges } = useMemo(
    () => buildArchGraph(integrations),
    [integrations],
  )

  // Layout computed before first render to prevent position "jump"
  const layoutedNodes = useMemo(
    () => getLayoutedElements(rawNodes, rawEdges, 'LR'),
    [rawNodes, rawEdges],
  )

  const [nodes, setNodes] = useState<Node[]>(layoutedNodes)
  const [edges, setEdges] = useState<Edge[]>(rawEdges)
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<number | null>(null)

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id === BIGPANDA_NODE_ID) return // Center node has no drawer
    const intId = parseInt(node.id.replace('int-', ''), 10)
    setSelectedIntegrationId((prev) => (prev === intId ? null : intId))
  }, [])

  const selectedIntegration = selectedIntegrationId !== null
    ? integrations.find((i) => i.id === selectedIntegrationId) ?? null
    : null

  if (integrations.length === 0) {
    return (
      <div className="h-[400px] border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 text-sm">
        Add integrations to see the architecture diagram
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[580px]">
      <div className="flex-1 border border-zinc-200 rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={archNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background variant={"dots" as any} gap={16} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {selectedIntegration && (
        <IntegrationDetailDrawer
          integration={selectedIntegration}
          onClose={() => setSelectedIntegrationId(null)}
        />
      )}
    </div>
  )
}
