import { describe, it, expect } from 'vitest'
import { getLayoutedElements, type LayoutNode, type LayoutEdge } from '../../components/graph/useGraphLayout'

const nodes: LayoutNode[] = [
  { id: 'bigpanda', position: { x: 0, y: 0 }, width: 200, height: 80 },
  { id: 'int-1', position: { x: 0, y: 0 } },
  { id: 'int-2', position: { x: 0, y: 0 } },
]

const edges: LayoutEdge[] = [
  { id: 'e1', source: 'bigpanda', target: 'int-1' },
  { id: 'e2', source: 'bigpanda', target: 'int-2' },
]

describe('getLayoutedElements (VIS-02 layout)', () => {
  it('returns nodes with numeric x,y positions after dagre layout', () => {
    const result = getLayoutedElements(nodes, edges, 'LR')
    result.forEach((n) => {
      expect(typeof n.position.x).toBe('number')
      expect(typeof n.position.y).toBe('number')
      expect(isFinite(n.position.x)).toBe(true)
      expect(isFinite(n.position.y)).toBe(true)
    })
  })

  it('returns all input nodes — no nodes are dropped by layout', () => {
    const result = getLayoutedElements(nodes, edges, 'LR')
    expect(result.length).toBe(nodes.length)
    const ids = result.map((n) => n.id)
    expect(ids).toContain('bigpanda')
    expect(ids).toContain('int-1')
    expect(ids).toContain('int-2')
  })
})
