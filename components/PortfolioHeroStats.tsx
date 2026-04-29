/**
 * Kata Design System — PortfolioHeroStats
 * Phase 81: KDS-05
 *
 * Hero stat band for the Portfolio Dashboard.
 * - JBM 64px project count (padded to 2 digits)
 * - RAG breakdown: green/yellow/red dot + JBM 22px count + 12px label
 * - Week metrics: 4 small stat columns
 *
 * Server Component — receives computed data from parent (app/page.tsx).
 */

import type { PortfolioProject } from '@/lib/queries';
import type { PortfolioWeekMetrics } from '@/lib/queries';

interface PortfolioHeroStatsProps {
  projects: PortfolioProject[];
  weekMetrics: PortfolioWeekMetrics;
}

function RAGDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

interface RAGGroupProps {
  color: string;
  count: number;
  label: string;
}

function RAGGroup({ color, count, label }: RAGGroupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', minWidth: 52 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <RAGDot color={color} />
        <span
          style={{
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: 'var(--kata-text-primary, inherit)',
            tabularNums: 'tabular-nums',
          } as React.CSSProperties}
        >
          {count}
        </span>
      </div>
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--kata-text-muted, var(--kata-text-secondary))',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

interface WeekStatProps {
  value: number;
  label: string;
}

function WeekStat({ value, label }: WeekStatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', minWidth: 64 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: 'var(--kata-text-primary, inherit)',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--kata-text-muted, var(--kata-text-secondary))',
          lineHeight: 1.2,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function PortfolioHeroStats({ projects, weekMetrics }: PortfolioHeroStatsProps) {
  const greenCount = projects.filter((p) => p.health === 'green').length;
  const yellowCount = projects.filter((p) => p.health === 'yellow').length;
  const redCount = projects.filter((p) => p.health === 'red').length;

  const countStr = String(projects.length).padStart(2, '0');

  return (
    <div
      className="flex items-end gap-12 px-8 py-8 border-b"
      style={{
        borderColor: 'var(--kata-stroke-subtle, var(--border))',
        background: 'var(--kata-surface-canvas, var(--background))',
      }}
    >
      {/* Big project count */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--kata-text-muted, var(--kata-text-secondary))',
            lineHeight: 1,
          }}
        >
          Active engagements
        </span>
        <span
          className="font-mono font-semibold tabular-nums"
          style={{
            fontSize: 64,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: 'var(--kata-text-primary, inherit)',
          }}
        >
          {countStr}
        </span>
      </div>

      {/* RAG breakdown */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', paddingBottom: 4 }}>
        <RAGGroup
          color="var(--kata-status-green, #27BE69)"
          count={greenCount}
          label="Healthy"
        />
        <RAGGroup
          color="var(--kata-status-amber, #FF8E21)"
          count={yellowCount}
          label="At Risk"
        />
        <RAGGroup
          color="var(--kata-status-red, #D60028)"
          count={redCount}
          label="Critical"
        />
      </div>

      {/* Vertical divider */}
      <div
        style={{
          width: 1,
          height: 48,
          background: 'var(--kata-stroke-subtle, var(--border))',
          alignSelf: 'center',
        }}
      />

      {/* Week metrics */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', paddingBottom: 4 }}>
        <WeekStat value={weekMetrics.tasksClosedThisWeek} label="Tasks closed" />
        <WeekStat value={weekMetrics.milestonesHitThisWeek} label="Milestones hit" />
        <WeekStat value={weekMetrics.overdueTasks} label="Overdue" />
        <WeekStat value={weekMetrics.updatesLogged} label="Updates logged" />
      </div>
    </div>
  );
}
