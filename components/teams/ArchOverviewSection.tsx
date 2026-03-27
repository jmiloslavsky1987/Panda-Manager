'use client'

import type { ArchitectureIntegration } from '@/lib/queries'
import { WarnBanner } from './WarnBanner'

// Design tokens
const ADR = { text: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' }
const BIGGY = { text: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' }

function statusPill(status: string) {
  switch (status) {
    case 'live':
      return { bg: '#dcfce7', text: '#14532d', label: 'Live' }
    case 'in_progress':
      return { bg: '#fef3c7', text: '#92400e', label: 'In Progress' }
    case 'pilot':
      return { bg: '#fef3c7', text: '#92400e', label: 'Pilot' }
    case 'planned':
    default:
      return { bg: '#f1f5f9', text: '#475569', label: 'Planned' }
  }
}

interface Props {
  integrations: ArchitectureIntegration[]
}

interface PanelProps {
  title: string
  tokens: typeof ADR
  nodes: ArchitectureIntegration[]
  emptyMessage: string
}

function IntegrationPanel({ title, tokens, nodes, emptyMessage }: PanelProps) {
  return (
    <div
      className="flex-1 rounded-lg border p-4 space-y-3"
      style={{ background: tokens.bg, borderColor: tokens.border }}
    >
      <h3 className="text-sm font-semibold" style={{ color: tokens.text }}>
        {title}
      </h3>
      {nodes.length === 0 ? (
        <WarnBanner message={emptyMessage} />
      ) : (
        <ul className="space-y-2">
          {nodes.map((node) => {
            const pill = statusPill(node.status ?? 'planned')
            return (
              <li key={node.id} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-800">{node.tool_name}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ background: pill.bg, color: pill.text }}
                >
                  {pill.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function ArchOverviewSection({ integrations }: Props) {
  const adrNodes = integrations.filter((i) => i.track === 'ADR')
  const biggyNodes = integrations.filter((i) => i.track === 'Biggy')

  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Architecture Overview</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <IntegrationPanel
          title="ADR Track"
          tokens={ADR}
          nodes={adrNodes}
          emptyMessage="No ADR integrations recorded."
        />
        <IntegrationPanel
          title="Biggy AI Track"
          tokens={BIGGY}
          nodes={biggyNodes}
          emptyMessage="No Biggy integrations recorded."
        />
      </div>
    </section>
  )
}
