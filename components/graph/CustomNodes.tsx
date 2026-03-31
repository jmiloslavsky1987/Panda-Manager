// components/graph/CustomNodes.tsx
// Custom React Flow node components for Teams and Architecture graphs.
// All node components follow the zinc/white card pattern from TeamsEngagementSection.
// IMPORTANT: teamNodeTypes and archNodeTypes are defined at module level — never inside a render function.
'use client'
import { Handle, Position } from '@xyflow/react'

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    live: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    pilot: 'bg-blue-100 text-blue-800',
    planned: 'bg-zinc-100 text-zinc-500',
  }
  const cls = variants[status] ?? 'bg-zinc-100 text-zinc-500'
  const label = status.replace('_', ' ')
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ─── TeamNode ─────────────────────────────────────────────────────────────────

interface TeamNodeData {
  label: string
  workflowCount: number
}

export function TeamNode({ data }: { data: TeamNodeData }) {
  return (
    <div className="border border-zinc-300 rounded-lg bg-white px-3 py-2 shadow-sm min-w-[140px]">
      <Handle type="target" position={Position.Top} className="!bg-zinc-400" />
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Team</div>
      <div className="font-semibold text-sm text-zinc-900 leading-tight">{data.label}</div>
      {data.workflowCount > 0 && (
        <div className="text-xs text-zinc-400 mt-1">{data.workflowCount} workflow{data.workflowCount > 1 ? 's' : ''}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400" />
    </div>
  )
}

// ─── StakeholderNode ──────────────────────────────────────────────────────────

interface StakeholderNodeData {
  label: string
  role: string | null
}

export function StakeholderNode({ data }: { data: StakeholderNodeData }) {
  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50 px-3 py-2 shadow-sm min-w-[140px]">
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />
      <div className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-0.5">Stakeholder</div>
      <div className="font-semibold text-sm text-zinc-900 leading-tight">{data.label}</div>
      {data.role && (
        <div className="text-xs text-zinc-400 mt-1">{data.role}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
    </div>
  )
}

// ─── BigPandaNode (center node for architecture hub-and-spoke) ────────────────

interface BigPandaNodeData {
  label: string
}

export function BigPandaNode({ data }: { data: BigPandaNodeData }) {
  return (
    <div className="border-2 border-zinc-900 rounded-xl bg-zinc-900 text-white px-4 py-3 shadow-lg min-w-[180px] text-center">
      <div className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Platform</div>
      <div className="font-bold text-base leading-tight">{data.label}</div>
      <Handle type="source" position={Position.Right} className="!bg-zinc-400" />
      <Handle type="target" position={Position.Left} className="!bg-zinc-400" />
    </div>
  )
}

// ─── IntegrationNode (peripheral nodes for architecture graph) ────────────────

interface IntegrationNodeData {
  label: string
  status: string
  track: string
  integrationMethod: string | null
}

export function IntegrationNode({ data }: { data: IntegrationNodeData }) {
  const trackColor = data.track === 'ADR' ? 'border-blue-200' : 'border-purple-200'
  return (
    <div className={`border ${trackColor} rounded-lg bg-white px-3 py-2 shadow-sm min-w-[150px]`}>
      <Handle type="target" position={Position.Left} className="!bg-zinc-400" />
      <div className="font-semibold text-sm text-zinc-900 leading-tight mb-1">{data.label}</div>
      <StatusBadge status={data.status} />
      {data.integrationMethod && (
        <div className="text-xs text-zinc-400 mt-1">{data.integrationMethod}</div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-zinc-400" />
    </div>
  )
}

// ─── nodeTypes registries ─────────────────────────────────────────────────────
// Defined at MODULE level — never inside a component — to prevent React Flow re-initialization.

export const teamNodeTypes = {
  team: TeamNode,
  stakeholder: StakeholderNode,
} as const

export const archNodeTypes = {
  bigpanda: BigPandaNode,
  integration: IntegrationNode,
} as const
