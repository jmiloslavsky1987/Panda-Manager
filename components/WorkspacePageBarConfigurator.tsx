'use client'

/**
 * WorkspacePageBarConfigurator
 * Phase 81: KDS-06
 *
 * Client component that renders a 44px workspace page-bar and also injects
 * title + ctaSlot into PageBarContext (for any consumers that read context).
 *
 * Why not the global PageBar? PageBar.tsx suppresses itself on /customer/ routes
 * by design (Plan 81-02). The workspace layout renders this component instead,
 * giving the project workspace its own 44px bar with project name + health badge.
 *
 * Props:
 *   title    — project customer name
 *   health   — RAG health status
 *   ctaSlot  — optional ReactNode rendered to the right of the health badge
 */

import { useEffect, type ReactNode } from 'react'
import { usePageBar } from './PageBarContext'
import { Badge } from './ui/badge'

const RAG_CLASSES: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
}

const RAG_LABELS: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Healthy',
  yellow: 'At Risk',
  red: 'Critical',
}

export function WorkspacePageBarConfigurator({
  title,
  health,
  ctaSlot,
}: {
  title: string
  health: 'green' | 'yellow' | 'red'
  ctaSlot?: ReactNode
}) {
  const { setTitle, setCtaSlot } = usePageBar()

  // Inject into PageBarContext (consumed by any context-aware consumer)
  useEffect(() => {
    setTitle(title)
    setCtaSlot(
      <div className="flex items-center gap-3">
        <Badge className={RAG_CLASSES[health]}>{RAG_LABELS[health]}</Badge>
        {ctaSlot}
      </div>
    )
    return () => {
      setTitle('')
      setCtaSlot(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, health])

  // Render the visible 44px workspace page-bar directly
  // (Global PageBar suppresses itself on /customer/ routes)
  return (
    <div
      className="flex items-center justify-between px-4 border-b"
      style={{
        height: 44,
        background: 'var(--kata-surface-container)',
        borderColor: 'var(--kata-stroke-subtle)',
        flexShrink: 0,
      }}
    >
      {/* Left: project name + health badge */}
      <div className="flex items-center gap-3">
        <span
          className="text-sm font-medium truncate"
          style={{ color: 'var(--kata-on-canvas)' }}
        >
          {title}
        </span>
        <Badge className={RAG_CLASSES[health]}>{RAG_LABELS[health]}</Badge>
      </div>

      {/* Right: ctaSlot */}
      {ctaSlot && (
        <div className="flex items-center gap-2">
          {ctaSlot}
        </div>
      )}
    </div>
  )
}
