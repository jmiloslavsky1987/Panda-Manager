import { describe, it, expect } from 'vitest'

describe('Package Installation and Mock (Task 1 GREEN)', () => {
  it('can import @xyflow/react via vitest alias mock', async () => {
    const { ReactFlow, Position } = await import('@xyflow/react')
    expect(ReactFlow).toBeDefined()
    expect(Position).toBeDefined()
    expect(Position.Top).toBe('top')
  })

  it('can import @dagrejs/dagre directly in node env', async () => {
    const dagre = await import('@dagrejs/dagre')
    expect(dagre).toBeDefined()
    expect(dagre.graphlib).toBeDefined()
  })
})
