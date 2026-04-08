'use client'

// Stub implementation for Task 1 GREEN phase
// Full implementation in Task 2

import type { WbsItem } from '@/lib/queries'

interface WbsNodeProps {
  node: WbsItem
  childrenMap: Map<number | null, WbsItem[]>
  expandedIds: Set<number>
  onToggleExpand: (id: number) => void
  onExpandedIdsChange: (updater: (prev: Set<number>) => Set<number>) => void
  projectId: number
  track: 'ADR' | 'Biggy'
}

export function WbsNode({ node }: WbsNodeProps) {
  return <div data-testid={`wbs-node-${node.id}`}>{node.name}</div>
}
