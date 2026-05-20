'use client';

import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { SourceBadge } from '@/components/SourceBadge';
import type { TeamCard, TeamCardKeyMetric } from '@/db/schema';
import type { Milestone } from '@/lib/queries';

interface Props {
  projectId: number;
  card: TeamCard;
  keyMetrics: TeamCardKeyMetric[];
  nextMilestone: Milestone | null;
  // active_tracks JSONB shape from projects table — named with underscore to match source-scan pattern (XCUT-88-02)
  active_tracks: { adr: boolean; biggy: boolean; incident_prevention: boolean };
  trackProgress: {
    adr?: { live: number; total: number };
    biggy?: { live: number; total: number };
    incident_prevention?: { live: number; total: number };
  };
  openRisksCount: number;
  recentDecisionSnippet: string | null;
  onEdit: (card: TeamCard) => void;
}

const TRAFFIC_LIGHT_CLASS: Record<string, string> = {
  on_track:    'bg-emerald-500',
  at_risk:     'bg-amber-500',
  blocked:     'bg-red-500',
  not_started: 'bg-zinc-300',
};

const TRACKS: Array<{ key: 'adr' | 'biggy' | 'incident_prevention'; label: string }> = [
  { key: 'adr', label: 'ADR' },
  { key: 'biggy', label: 'Biggy' },
  { key: 'incident_prevention', label: 'Incident Prevention' },
];

export default function TeamCard({
  projectId,
  card,
  keyMetrics,
  nextMilestone,
  active_tracks,
  trackProgress,
  openRisksCount,
  recentDecisionSnippet,
  onEdit,
}: Props) {
  return (
    <article className="relative rounded-md border border-border bg-card p-4 shadow-sm">
      {/* Header: team name left, traffic light + edit button right */}
      <header className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{card.team_name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="traffic-light"
            aria-label={`Status: ${card.overall_status}`}
            className={`inline-block h-3 w-3 rounded-full ${TRAFFIC_LIGHT_CLASS[card.overall_status] ?? TRAFFIC_LIGHT_CLASS.not_started}`}
          />
          <button
            type="button"
            onClick={() => onEdit(card)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Edit team card"
          >
            <Icon name="edit" size={16} />
          </button>
        </div>
      </header>

      {/* Per-track Progress Bars — active_tracks render-layer filter (XCUT-88-02) */}
      <div className="space-y-1.5 mb-3">
        {TRACKS.map((t) => {
          if (!active_tracks[t.key]) return null; // hide if track OFF (XCUT-88-02)
          const progress = trackProgress[t.key];
          if (!progress) return null;
          const pct = progress.total > 0 ? Math.round((progress.live / progress.total) * 100) : 0;
          return (
            <Link
              key={t.key}
              href={`/customer/${projectId}/architecture?team=${encodeURIComponent(card.team_name)}`}
              className="block hover:opacity-80"
            >
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="font-medium">{t.label}</span>
                <span className="font-mono text-muted-foreground">
                  {progress.live} / {progress.total} live
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${pct}%` }}
                  aria-label={`${pct}% live`}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Success Definition */}
      {card.success_definition && (
        <p className="text-xs text-foreground/80 mb-3">{card.success_definition}</p>
      )}

      {/* Key Metrics table — SourceBadge per row (XCUT-88-04) */}
      {keyMetrics.length > 0 && (
        <table className="w-full text-xs mb-3">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Metric</th>
              <th>Target</th>
              <th>Current</th>
              <th>Trend</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keyMetrics.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="py-1">{m.label}</td>
                <td className="font-mono">{m.target ?? '—'}</td>
                <td className="font-mono">{m.current ?? '—'}</td>
                <td>
                  {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : m.trend === 'flat' ? '→' : ''}
                </td>
                <td>
                  <SourceBadge source={m.source} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Latest Activity — SourceBadge (XCUT-88-04) */}
      {card.latest_activity_text && (
        <div className="flex items-start gap-2 text-xs mb-2">
          <SourceBadge source={card.latest_activity_source ?? 'manual'} />
          {card.latest_activity_date && (
            <span className="font-mono text-muted-foreground">{card.latest_activity_date}:</span>
          )}
          <span className="flex-1">{card.latest_activity_text}</span>
        </div>
      )}

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="text-xs mb-2">
          <span className="text-muted-foreground">Next: </span>
          {nextMilestone.date && (
            <span className="font-mono">{nextMilestone.date}</span>
          )}
          <span> — {nextMilestone.name}</span>
        </div>
      )}

      {/* Inline Risks + Decisions deep-link summaries */}
      <div className="border-t border-border pt-2 space-y-1 text-xs">
        <Link
          href={`/customer/${projectId}/risks?team=${encodeURIComponent(card.team_name)}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Icon name="warning" size={14} />
          <span>Risks &amp; Blockers</span>
          <span className="font-mono">{openRisksCount} open</span>
          <span className="ml-auto">view in Risks &rarr;</span>
        </Link>
        <Link
          href={`/customer/${projectId}/decisions?team=${encodeURIComponent(card.team_name)}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Icon name="check_circle" size={14} />
          <span>Decisions</span>
          {recentDecisionSnippet && (
            <span className="truncate">{recentDecisionSnippet}</span>
          )}
          <span className="ml-auto">view in Decisions &rarr;</span>
        </Link>
      </div>
    </article>
  );
}
