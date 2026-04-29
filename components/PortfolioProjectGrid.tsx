/**
 * Kata Design System — PortfolioProjectGrid
 * Phase 81: KDS-05
 *
 * 2-column health-accented project card grid for the Portfolio Dashboard.
 *
 * Each card:
 * - 3px left accent border per project.health RAG color
 * - Project name, health badge, go-live date, current phase
 * - Open risks + overdue actions as small stat chips
 * - Progress bar (h-[3px]) at card bottom
 * - Entire card is a Link → /customer/{id}/overview
 *
 * Server Component — receives pre-fetched projects from parent.
 */

import Link from 'next/link';
import type { PortfolioProject } from '@/lib/queries';

const ACCENT: Record<'green' | 'yellow' | 'red', string> = {
  green: 'var(--kata-status-green, #27BE69)',
  yellow: 'var(--kata-status-amber, #FF8E21)',
  red: 'var(--kata-status-red, #D60028)',
};

const HEALTH_LABEL: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Healthy',
  yellow: 'At Risk',
  red: 'Critical',
};

interface PortfolioProjectGridProps {
  projects: PortfolioProject[];
}

function HealthBadge({ health }: { health: 'green' | 'yellow' | 'red' }) {
  const accent = ACCENT[health];
  return (
    <span
      className="text-xs font-medium rounded px-1.5 py-0.5"
      style={{
        background: `color-mix(in srgb, ${accent} 15%, transparent)`,
        color: accent,
      }}
    >
      {HEALTH_LABEL[health]}
    </span>
  );
}

interface StatChipProps {
  value: number;
  label: string;
  warn?: boolean;
}

function StatChip({ value, label, warn }: StatChipProps) {
  return (
    <span
      className="text-xs rounded px-1.5 py-0.5 font-medium"
      style={{
        background: warn && value > 0
          ? 'color-mix(in srgb, var(--kata-status-red, #D60028) 12%, transparent)'
          : 'var(--kata-surface-subtle, color-mix(in srgb, var(--muted) 50%, transparent))',
        color: warn && value > 0
          ? 'var(--kata-status-red, #D60028)'
          : 'var(--kata-text-muted, var(--muted-foreground))',
      }}
    >
      {value} {label}
    </span>
  );
}

function ProjectCard({ project }: { project: PortfolioProject }) {
  const accent = ACCENT[project.health];
  const pct = project.percentComplete ?? 0;

  return (
    <Link
      href={`/customer/${project.id}/overview`}
      className="block rounded-lg border overflow-hidden hover:shadow-sm transition-shadow"
      style={{
        background: 'var(--kata-surface-container, var(--card))',
        borderColor: 'var(--kata-stroke-subtle, var(--border))',
        borderLeft: `3px solid ${accent}`,
        textDecoration: 'none',
      }}
    >
      <div className="px-4 pt-3 pb-2 space-y-2">
        {/* Top row: name + health badge */}
        <div className="flex items-start justify-between gap-2">
          <span
            className="font-semibold text-sm leading-snug"
            style={{ color: 'var(--kata-text-primary, inherit)' }}
          >
            {project.customer}
          </span>
          <HealthBadge health={project.health} />
        </div>

        {/* Meta row: go-live date + current phase */}
        <div className="flex items-center gap-2 flex-wrap">
          {project.go_live_target && (
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--kata-text-muted, var(--muted-foreground))' }}
            >
              Go-live: {project.go_live_target}
            </span>
          )}
          {project.currentPhase && (
            <span
              className="text-xs"
              style={{ color: 'var(--kata-text-muted, var(--muted-foreground))' }}
            >
              {project.go_live_target ? '·' : ''} {project.currentPhase}
            </span>
          )}
        </div>

        {/* Stat chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatChip value={project.openRiskCount} label="risks" warn />
          <StatChip value={project.overdueActions} label="overdue" warn />
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 3,
          background: 'var(--kata-stroke-subtle, var(--border))',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: accent,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </Link>
  );
}

export function PortfolioProjectGrid({ projects }: PortfolioProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div
        className="rounded-lg border px-6 py-8 text-center text-sm"
        style={{
          borderColor: 'var(--kata-stroke-subtle, var(--border))',
          color: 'var(--kata-text-muted, var(--muted-foreground))',
        }}
      >
        No active projects yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
