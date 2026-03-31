// components/graph/useGraphLayout.ts
// Pure dagre layout function — no React, no side effects, fully testable.
// Used by InteractiveEngagementGraph and InteractiveArchGraph.
import dagre from '@dagrejs/dagre'

// Matches @xyflow/react Node shape (positional fields only)
export interface LayoutNode {
  id: string
  width?: number
  height?: number
  position: { x: number; y: number }
  [key: string]: unknown
}

export interface LayoutEdge {
  id: string
  source: string
  target: string
  [key: string]: unknown
}

/**
 * Runs dagre layout on nodes/edges, returns nodes with updated positions.
 * Call BEFORE passing to ReactFlow — positions must be pre-computed to avoid layout jump.
 * @param direction - 'TB' (top-bottom, default) for engagement map; 'LR' (left-right) for arch hub-and-spoke
 */
export function getLayoutedElements(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  direction: 'TB' | 'LR' = 'TB',
): LayoutNode[] {
  if (nodes.length === 0) return nodes

  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const ranksep = direction === 'LR' ? 150 : 100
  const nodesep = direction === 'LR' ? 100 : 80
  dagreGraph.setGraph({ rankdir: direction, ranksep, nodesep })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.width ?? 172,
      height: node.height ?? 60,
    })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  return nodes.map((node) => {
    const pos = dagreGraph.node(node.id)
    const w = node.width ?? 172
    const h = node.height ?? 60
    return {
      ...node,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    }
  })
}
