import { getTeamsTabData, getProjectById } from '@/lib/queries'
import { TeamEngagementMap } from '@/components/teams/TeamEngagementMap'
import { EmptyState } from '@/components/EmptyState'

export const dynamic = 'force-dynamic'

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = parseInt(id, 10)
  const [data, project] = await Promise.all([
    getTeamsTabData(projectId),
    getProjectById(projectId),
  ])

  // active_tracks from project settings (JSONB; default all false)
  const active_tracks = project.active_tracks ?? { adr: false, biggy: false, incident_prevention: false }

  // Column-name verification (checker W4):
  // risks table: has owner_id (FK to stakeholders), no team_name column
  // keyDecisions table: no team_name column
  // Neither table supports direct team grouping in v1 — stub both derived props.
  // Phase 88.2 or Wave 4 UAT will wire these via stakeholder->team mapping if needed.
  const teamNames = data.teamCards.map((c) => c.team_name)
  const openRisksByTeam: Record<string, number> = {}
  for (const t of teamNames) openRisksByTeam[t] = 0

  const recentDecisionByTeam: Record<string, string | null> = {}
  for (const t of teamNames) recentDecisionByTeam[t] = null

  // Check if truly empty (updated to use new entity arrays)
  const isEmpty =
    data.e2eWorkflows.length === 0 &&
    data.businessOutcomes.length === 0 &&
    data.architectureIntegrations.length === 0 &&
    data.teamCards.length === 0 &&
    data.milestones.length === 0

  if (isEmpty) {
    return (
      <div data-testid="teams-tab">
        <EmptyState
          title="No team data yet"
          description="The Teams tab captures team structure, workflows, and engagement. Data populates from document ingestion or manual entry."
          action={{ label: 'Upload Document', href: `/customer/${id}/context` }}
        />
      </div>
    )
  }

  return (
    <div data-testid="teams-tab" className="space-y-8">
      <TeamEngagementMap
        projectId={projectId}
        data={data}
        active_tracks={active_tracks}
        openRisksByTeam={openRisksByTeam}
        recentDecisionByTeam={recentDecisionByTeam}
      />
    </div>
  )
}
