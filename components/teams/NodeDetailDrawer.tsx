'use client'
import { X } from 'lucide-react'

interface DrawerNode {
  id: string
  type?: string
  data: Record<string, unknown>
}

interface Props {
  node: DrawerNode
  onClose: () => void
}

export function NodeDetailDrawer({ node, onClose }: Props) {
  const isTeam = node.type === 'team'
  const isStakeholder = node.type === 'stakeholder'

  return (
    <div className="w-[380px] border border-zinc-200 rounded-lg bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div>
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
            {node.type ?? 'Node'}
          </div>
          <h3 className="font-semibold text-zinc-900 text-sm leading-tight">
            {String(node.data.label ?? node.id)}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 p-1 rounded"
          aria-label="Close drawer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isTeam && (
          <>
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1">Workflows</div>
              <div className="text-sm text-zinc-900">
                {Number(node.data.workflowCount) > 0
                  ? String(node.data.workflowNames)
                  : <span className="text-zinc-400">No workflows</span>
                }
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1">Workflow Count</div>
              <div className="text-sm text-zinc-900">{String(node.data.workflowCount ?? 0)}</div>
            </div>
          </>
        )}
        {isStakeholder && (
          <>
            {node.data.role && (
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-1">Role</div>
                <div className="text-sm text-zinc-900">{String(node.data.role)}</div>
              </div>
            )}
            {node.data.company && (
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-1">Company</div>
                <div className="text-sm text-zinc-900">{String(node.data.company)}</div>
              </div>
            )}
          </>
        )}
        {!isTeam && !isStakeholder && (
          <div className="text-sm text-zinc-400">No additional details available.</div>
        )}
      </div>
    </div>
  )
}
