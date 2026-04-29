'use client'
import { Icon } from '../Icon'
import type { ArchitectureIntegration } from '@/lib/queries'

interface Props {
  integration: ArchitectureIntegration
  onClose: () => void
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    live: 'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    pilot: 'bg-blue-100 text-blue-800',
    planned: 'bg-zinc-100 text-zinc-500',
  }
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${variants[status] ?? 'bg-zinc-100 text-zinc-500'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function IntegrationDetailDrawer({ integration, onClose }: Props) {
  const trackColor = integration.track === 'ADR' ? 'text-blue-700' : 'text-purple-700'

  return (
    <div className="w-[380px] border border-zinc-200 rounded-lg bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div>
          <div className={`text-xs font-bold uppercase tracking-wide ${trackColor}`}>
            {integration.track} Track
          </div>
          <h3 className="font-semibold text-zinc-900 text-sm leading-tight">
            {integration.tool_name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 p-1 rounded"
          aria-label="Close drawer"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div>
          <div className="text-xs font-medium text-zinc-500 mb-1">Status</div>
          <StatusBadge status={integration.status} />
        </div>
        {integration.phase && (
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-1">Phase</div>
            <div className="text-sm text-zinc-900">{integration.phase}</div>
          </div>
        )}
        {integration.integration_method && (
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-1">Integration Method</div>
            <div className="text-sm text-zinc-900">{integration.integration_method}</div>
          </div>
        )}
        {integration.notes && (
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-1">Notes</div>
            <div className="text-sm text-zinc-900 whitespace-pre-wrap">{integration.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}
