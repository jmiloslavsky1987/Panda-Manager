'use client';

import { useState } from 'react';
import { TeamsEngagementSection } from './TeamsEngagementSection';
import MilestoneTrackerSection from './MilestoneTrackerSection';
import { BusinessOutcomesSection } from './BusinessOutcomesSection';
// Removed sections: E2e Workflows + Focus Areas no longer rendered on Teams tab (TEAM-88-06).
// Their data (e2e_workflows, focus_areas tables) is preserved at DB layer per TEAM-88-07.
import type { TeamsTabData } from '@/lib/queries';
import type { TeamCard } from '@/db/schema';

interface Props {
  projectId: number;
  data: TeamsTabData;
  active_tracks: { adr: boolean; biggy: boolean; incident_prevention: boolean };
  // Derived props for inline Risks/Decisions summaries — stubbed v1; checker W4
  openRisksByTeam: Record<string, number>;
  recentDecisionByTeam: Record<string, string | null>;
}

export function TeamEngagementMap({
  projectId,
  data,
  active_tracks,
  openRisksByTeam,
  recentDecisionByTeam,
}: Props) {
  const [teamCards, setTeamCards] = useState<TeamCard[]>(data.teamCards);

  // milestonesByTeam: group milestones by linked_track as a proxy for team name.
  // Wave 4 UAT decides whether a direct team_name field on milestones is needed.
  const milestonesByTeam: Record<string, typeof data['milestones']> = {};
  for (const m of data.milestones) {
    if (m.linked_track) {
      (milestonesByTeam[m.linked_track] ??= []).push(m);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Teams & Engagement Status */}
      <TeamsEngagementSection
        projectId={projectId}
        teamCards={teamCards}
        teamCardKeyMetrics={data.teamCardKeyMetrics}
        teamOnboardingStatusRows={data.teamOnboardingStatus}
        active_tracks={active_tracks}
        milestonesByTeam={milestonesByTeam}
        trackProgressByTeam={{}} // v1 stub — Phase 88.2 wires real arch integration counts
        openRisksByTeam={openRisksByTeam}
        recentDecisionByTeam={recentDecisionByTeam}
      />

      {/* 2. Milestone & Go-Live Tracker (new section per spec) */}
      <MilestoneTrackerSection
        projectId={projectId}
        milestones={data.milestones}
      />

      {/* 3. Business Value & Expected Outcomes */}
      <BusinessOutcomesSection
        projectId={projectId}
        outcomes={data.businessOutcomes}
        evidenceLog={data.evidenceLog}
        onUpdate={() => {/* parent router.refresh() on next interaction */}}
      />
    </div>
  );
}
