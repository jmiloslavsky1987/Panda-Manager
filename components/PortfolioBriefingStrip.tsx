'use client';

/**
 * Kata Design System — PortfolioBriefingStrip
 * Phase 81: KDS-05
 *
 * 3-column briefing cards for the Portfolio Dashboard.
 * All data is pre-fetched by the server parent (no AI calls).
 *
 * Cards:
 *  1. Upcoming Go-Lives
 *  2. Open High-Severity Risks
 *  3. Projects Needing Attention
 *
 * Each card toggles an inline expandable list on click (expandedId pattern).
 * Client Component — needs expandedId state.
 */

import { useState } from 'react';
import type { PortfolioBriefingData } from '@/lib/queries';
import { Icon } from './Icon';

interface PortfolioBriefingStripProps {
  data: PortfolioBriefingData;
}

interface BriefingCardProps {
  id: string;
  iconName: string;
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function BriefingCard({ id: _id, iconName, title, count, expanded, onToggle, children }: BriefingCardProps) {
  return (
    <div
      className="rounded-lg border cursor-pointer select-none"
      style={{
        background: 'var(--kata-surface-container, var(--card))',
        borderColor: 'var(--kata-stroke-subtle, var(--border))',
      }}
      onClick={onToggle}
      role="button"
      aria-expanded={expanded}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="shrink-0" style={{ color: 'var(--kata-text-muted, var(--muted-foreground))' }}>
          <Icon name={iconName} size={18} />
        </span>
        <span
          className="font-mono font-semibold tabular-nums"
          style={{
            fontSize: 22,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--kata-text-primary, inherit)',
          }}
        >
          {count}
        </span>
        <span
          className="font-semibold text-sm flex-1"
          style={{ color: 'var(--kata-text-primary, inherit)' }}
        >
          {title}
        </span>
        <span className="shrink-0" style={{ color: 'var(--kata-text-muted, var(--muted-foreground))' }}>
          <Icon name={expanded ? 'expand_less' : 'expand_more'} size={18} />
        </span>
      </div>

      {/* Expanded list */}
      {expanded && count > 0 && (
        <div
          className="border-t px-4 py-3 space-y-1"
          style={{ borderColor: 'var(--kata-stroke-subtle, var(--border))' }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}

      {expanded && count === 0 && (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: 'var(--kata-stroke-subtle, var(--border))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm" style={{ color: 'var(--kata-text-muted, var(--muted-foreground))' }}>
            Nothing to show.
          </span>
        </div>
      )}
    </div>
  );
}

export function PortfolioBriefingStrip({ data }: PortfolioBriefingStripProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const { upcomingGoLives, highSeverityRisks, needsAttention } = data;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Card 1: Upcoming Go-Lives */}
      <BriefingCard
        id="go-lives"
        iconName="event_note"
        title="Upcoming Go-Lives"
        count={upcomingGoLives.length}
        expanded={expandedId === 'go-lives'}
        onToggle={() => toggle('go-lives')}
      >
        {upcomingGoLives.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm py-0.5">
            <span style={{ color: 'var(--kata-text-primary, inherit)' }}>{item.customer}</span>
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--kata-text-muted, var(--muted-foreground))' }}
            >
              {item.go_live_target}
            </span>
          </div>
        ))}
      </BriefingCard>

      {/* Card 2: Open High-Severity Risks */}
      <BriefingCard
        id="high-risks"
        iconName="warning"
        title="Open High-Severity Risks"
        count={highSeverityRisks.length}
        expanded={expandedId === 'high-risks'}
        onToggle={() => toggle('high-risks')}
      >
        {highSeverityRisks.map((item) => (
          <div key={item.id} className="flex flex-col text-sm py-0.5">
            <span style={{ color: 'var(--kata-text-primary, inherit)' }} className="line-clamp-1">
              {item.title}
            </span>
            <span
              className="text-xs"
              style={{ color: 'var(--kata-text-muted, var(--muted-foreground))' }}
            >
              {item.projectCustomer}
            </span>
          </div>
        ))}
      </BriefingCard>

      {/* Card 3: Projects Needing Attention */}
      <BriefingCard
        id="needs-attention"
        iconName="flag"
        title="Projects Needing Attention"
        count={needsAttention.length}
        expanded={expandedId === 'needs-attention'}
        onToggle={() => toggle('needs-attention')}
      >
        {needsAttention.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm py-0.5">
            <span style={{ color: 'var(--kata-text-primary, inherit)' }}>{item.customer}</span>
            <span
              className="text-xs rounded px-1.5 py-0.5 font-medium"
              style={
                item.reason === 'red-health'
                  ? {
                      background: 'color-mix(in srgb, var(--kata-status-red, #D60028) 15%, transparent)',
                      color: 'var(--kata-status-red, #D60028)',
                    }
                  : {
                      background: 'color-mix(in srgb, var(--kata-status-amber, #FF8E21) 15%, transparent)',
                      color: 'var(--kata-status-amber, #FF8E21)',
                    }
              }
            >
              {item.reason === 'red-health' ? 'Red health' : 'Stale'}
            </span>
          </div>
        ))}
      </BriefingCard>
    </div>
  );
}
