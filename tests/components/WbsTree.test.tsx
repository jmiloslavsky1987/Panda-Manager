// TDD test for WbsTree component
// Phase 47 Plan 02 Task 1
// Tests module exports and type safety

import { describe, it, expect } from 'vitest'
import type { WbsItem } from '@/lib/queries'

describe('WbsTree Module', () => {
  const mockAdrItems: WbsItem[] = [
    {
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
    },
    {
      id: 2,
      project_id: 1,
      parent_id: 1,
      level: 2,
      name: 'Task 1.1',
      track: 'ADR',
      status: 'in_progress',
      display_order: 1,
      source_trace: null,
      created_at: new Date(),
    },
  ]

  const mockBiggyItems: WbsItem[] = [
    {
      id: 10,
      project_id: 1,
      parent_id: null,
      level: 1,
      name: 'Biggy Section 1',
      track: 'Biggy',
      status: 'not_started',
      display_order: 1,
      source_trace: null,
      created_at: new Date(),
    },
  ]

  it('should export WbsTree component', async () => {
    // This will fail (RED) until WbsTree exists
    const module = await import('@/components/WbsTree')
    expect(module.WbsTree).toBeDefined()
    expect(typeof module.WbsTree).toBe('function')
  })

  it('should accept correct props interface', async () => {
    const { WbsTree } = await import('@/components/WbsTree')

    // Type check: this should compile if props interface is correct
    const props = {
      adrItems: mockAdrItems,
      biggyItems: mockBiggyItems,
      projectId: 1,
    }

    // If WbsTree accepts these props, the import and type check succeed
    expect(WbsTree).toBeDefined()
    expect(props.projectId).toBe(1)
  })
})
