'use client'

import { SourceBadge } from '@/components/SourceBadge'

interface StatusPillProps {
  status: string | null
}

function StatusPill({ status }: StatusPillProps) {
  if (!status) return null

  const normalized = status.toLowerCase()
  let bg: string
  let color: string
  let label: string

  if (normalized === 'live') {
    bg = '#dcfce7'
    color = '#14532d'
    label = 'Live'
  } else if (normalized === 'in_progress' || normalized === 'in progress') {
    bg = '#fef3c7'
    color = '#92400e'
    label = 'In Progress'
  } else if (normalized === 'pilot') {
    bg = '#fef3c7'
    color = '#92400e'
    label = 'Pilot'
  } else if (normalized === 'planned') {
    bg = '#f1f5f9'
    color = '#475569'
    label = 'Planned'
  } else {
    bg = '#f1f5f9'
    color = '#475569'
    label = status
  }

  return (
    <span
      style={{
        background: bg,
        color: color,
        fontSize: '0.7rem',
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: '9999px',
        display: 'inline-block',
        marginTop: 2,
      }}
    >
      {label}
    </span>
  )
}

interface IntegrationNodeProps {
  toolName: string
  integrationMethod?: string | null
  status: string | null
  track: 'ADR' | 'Biggy'
  onEdit?: () => void
  source?: string | null
  discoverySource?: string | null
}

export function IntegrationNode({ toolName, integrationMethod, status, track, onEdit, source, discoverySource }: IntegrationNodeProps) {
  const trackBg = track === 'ADR' ? '#eff6ff' : '#f5f3ff'
  const trackBorder = track === 'ADR' ? '#bfdbfe' : '#ddd6fe'

  return (
    <div
      style={{
        background: trackBg,
        border: `1px solid ${trackBorder}`,
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 6,
        minWidth: 120,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b', margin: 0, wordBreak: 'break-word' }}>
            {toolName}
          </p>
          {integrationMethod && (
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0 0' }}>{integrationMethod}</p>
          )}
          <StatusPill status={status} />
          {source && (
            <div className="mt-1">
              <SourceBadge
                source={source}
                artifactName={null}
                discoverySource={discoverySource ?? null}
              />
            </div>
          )}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '0.75rem',
              padding: '0 2px',
              flexShrink: 0,
            }}
            title="Edit"
          >
            ✎
          </button>
        )}
      </div>
    </div>
  )
}

export { StatusPill }
