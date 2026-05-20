'use client';

import { useState } from 'react';
import TeamCard from './TeamCard';
import TeamCardDrawer from './TeamCardDrawer';
import { TeamOnboardingTable } from '@/components/arch/TeamOnboardingTable';
import type { TeamCard as TeamCardType, TeamCardKeyMetric } from '@/db/schema';
import type { Milestone, TeamOnboardingStatus } from '@/lib/queries';

interface Props {
  projectId: number;
  teamCards: TeamCardType[];
  teamCardKeyMetrics: TeamCardKeyMetric[];
  milestonesByTeam: Record<string, Milestone[]>;
  // active_tracks from projects table — named with underscore to match XCUT-88-02 source-scan
  active_tracks: { adr: boolean; biggy: boolean; incident_prevention: boolean };
  trackProgressByTeam: Record<
    string,
    {
      adr?: { live: number; total: number };
      biggy?: { live: number; total: number };
      incident_prevention?: { live: number; total: number };
    }
  >;
  openRisksByTeam: Record<string, number>;
  recentDecisionByTeam: Record<string, string | null>;
  teamOnboardingStatusRows: TeamOnboardingStatus[];
}

export function TeamsEngagementSection(props: Props) {
  const [editingCard, setEditingCard] = useState<TeamCardType | null>(null);
  // TeamOnboardingTable requires managed state for optimistic updates
  const [onboardingRows, setOnboardingRows] = useState<TeamOnboardingStatus[]>(
    props.teamOnboardingStatusRows,
  );

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold">Teams &amp; Engagement Status</h2>

      {/* Preserved: TeamOnboardingTable rendering (per CONTEXT.md — keep in Teams tab) */}
      <TeamOnboardingTable
        projectId={props.projectId}
        rows={onboardingRows}
        onUpdate={setOnboardingRows}
      />

      {/* Team Card grid */}
      {props.teamCards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No team cards yet. Add team cards via context upload or manual entry.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {props.teamCards.map((c) => (
            <TeamCard
              key={c.id}
              projectId={props.projectId}
              card={c}
              keyMetrics={props.teamCardKeyMetrics.filter((m) => m.team_card_id === c.id)}
              nextMilestone={props.milestonesByTeam[c.team_name]?.[0] ?? null}
              active_tracks={props.active_tracks}
              trackProgress={props.trackProgressByTeam[c.team_name] ?? {}}
              openRisksCount={props.openRisksByTeam[c.team_name] ?? 0}
              recentDecisionSnippet={props.recentDecisionByTeam[c.team_name] ?? null}
              onEdit={setEditingCard}
            />
          ))}
        </div>
      )}

      {/* Singleton drawer — at most one open at a time */}
      <TeamCardDrawer
        projectId={props.projectId}
        card={editingCard}
        onClose={() => setEditingCard(null)}
        onSaved={() => {
          // Page will router.refresh() for SSR-driven update on next interaction;
          // for now, just close the drawer (Wave 4 UAT decides if optimistic update needed)
          setEditingCard(null);
        }}
      />
    </section>
  );
}
