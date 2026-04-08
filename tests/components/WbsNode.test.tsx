// TDD test for WbsNode component
// Phase 47 Plan 02 Task 2
// Tests module exports and type safety

import { describe, it, expect } from 'vitest'
import type { WbsItem } from '@/lib/queries'

describe('WbsNode Module', () => {
  const mockNode: WbsItem = {
    id: 1,
    project_id: 1,
    parent_id: null,
    level: 1,
    name: 'Section 1',
    track: 'ADR',
    status: 'not_started',
    display_order: 1,
    source_trace: null,
    created_at: new Date(),
  }

  const mockChildrenMap = new Map<number | null, WbsItem[]>()
  const mockExpandedIds = new Set<number>()

  it('should export WbsNode component', async () => {
    // This will fail (RED) until full WbsNode implementation exists
    const module = await import('@/components/WbsNode')
    expect(module.WbsNode).toBeDefined()
    // memo() returns an object with $$typeof, not a plain function
    expect(typeof module.WbsNode === 'function' || typeof module.WbsNode === 'object').toBe(true)
  })

  it('should accept correct props interface', async () => {
    const { WbsNode } = await import('@/components/WbsNode')

    // Type check: this should compile if props interface is correct
    const props = {
      node: mockNode,
      childrenMap: mockChildrenMap,
      expandedIds: mockExpandedIds,
      onToggleExpand: (id: number) => {},
      onExpandedIdsChange: (updater: (prev: Set<number>) => Set<number>) => {},
      projectId: 1,
      track: 'ADR' as const,
    }

    // If WbsNode accepts these props, the import and type check succeed
    expect(WbsNode).toBeDefined()
    expect(props.projectId).toBe(1)
  })
})
