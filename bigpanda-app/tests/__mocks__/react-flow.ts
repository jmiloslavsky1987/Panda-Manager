// tests/__mocks__/react-flow.ts
// Stubs for @xyflow/react in vitest node environment.
// React Flow uses ResizeObserver and getBoundingClientRect — unavailable in Node.js.
// This mock prevents import errors so logic tests can run without DOM.
import { vi } from 'vitest'

export const ReactFlow = vi.fn(() => null)
export const Background = vi.fn(() => null)
export const Controls = vi.fn(() => null)
export const Handle = vi.fn(() => null)
export const useNodesState = vi.fn(() => [[], vi.fn(), vi.fn()])
export const useEdgesState = vi.fn(() => [[], vi.fn(), vi.fn()])
export const applyNodeChanges = vi.fn((changes: unknown[], nodes: unknown[]) => nodes)
export const applyEdgeChanges = vi.fn((changes: unknown[], edges: unknown[]) => edges)
export const Position = { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' }
export const MarkerType = { Arrow: 'arrow', ArrowClosed: 'arrowclosed' }
export type Node = { id: string; type?: string; data: Record<string, unknown>; position: { x: number; y: number }; width?: number; height?: number }
export type Edge = { id: string; source: string; target: string; label?: string }
export type OnNodesChange = (changes: unknown[]) => void
export type OnEdgesChange = (changes: unknown[]) => void
