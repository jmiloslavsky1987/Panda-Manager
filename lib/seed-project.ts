import 'server-only'
import { db } from '@/db'
import {
  actions, risks, milestones, engagementHistory, keyDecisions,
  stakeholders, businessOutcomes, teamOnboardingStatus, projects,
  trackWorkstreamStages,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { TAB_TEMPLATE_REGISTRY } from './tab-template-registry'
import { DEFAULT_TRACK_WORKSTREAM_STAGES, type TrackKey } from './constants/track-workstream-stages'

/**
 * Seeds default track_workstream_stages rows for the given project + enabled tracks.
 * Idempotent via onConflictDoNothing — safe to call multiple times.
 * Phase 88.1 G1 gap closure: replaces the global COLUMNS constant with a data-driven model.
 */
async function seedTrackWorkstreamStages(projectId: number, enabledTracks: Set<TrackKey>): Promise<void> {
  const rows = Array.from(enabledTracks).flatMap((track) =>
    DEFAULT_TRACK_WORKSTREAM_STAGES[track].map((s) => ({
      project_id: projectId,
      track,
      stage_key: s.stage_key,
      stage_label: s.stage_label,
      display_order: s.display_order,
      source: 'seed' as const,
    }))
  )
  if (rows.length === 0) return
  await db.insert(trackWorkstreamStages).values(rows).onConflictDoNothing()
}

export async function seedProjectFromRegistry(projectId: number): Promise<void> {
  // Idempotency check — skip if already seeded
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { seeded: true, active_tracks: true },
  })
  if (!project || project.seeded) return

  // --- actions tab ---
  const actionsTemplate = TAB_TEMPLATE_REGISTRY.actions
  for (let i = 0; i < actionsTemplate.sections.length; i++) {
    const section = actionsTemplate.sections[i]
    await db.insert(actions).values({
      project_id: projectId,
      external_id: `TEMPLATE-ACTION-${String(i + 1).padStart(3, '0')}`,
      description: section.placeholderText,
      owner: 'TBD',
      due: 'TBD',
      status: 'open',
      source: 'template',
    })
  }

  // --- risks tab ---
  const risksTemplate = TAB_TEMPLATE_REGISTRY.risks
  for (let i = 0; i < risksTemplate.sections.length; i++) {
    const section = risksTemplate.sections[i]
    await db.insert(risks).values({
      project_id: projectId,
      external_id: `TEMPLATE-RISK-${String(i + 1).padStart(3, '0')}`,
      description: section.placeholderText,
      severity: 'medium',
      owner: 'TBD',
      status: 'open',
      source: 'template',
    })
  }

  // --- milestones tab ---
  const milestonesTemplate = TAB_TEMPLATE_REGISTRY.milestones
  for (let i = 0; i < milestonesTemplate.sections.length; i++) {
    const section = milestonesTemplate.sections[i]
    await db.insert(milestones).values({
      project_id: projectId,
      external_id: `TEMPLATE-MILESTONE-${String(i + 1).padStart(3, '0')}`,
      name: section.placeholderText,
      status: 'on_track',
      target: 'TBD',
      source: 'template',
    })
  }

  // --- decisions tab (APPEND ONLY — INSERT is allowed, UPDATE/DELETE are not) ---
  const decisionsTemplate = TAB_TEMPLATE_REGISTRY.decisions
  for (const section of decisionsTemplate.sections) {
    await db.insert(keyDecisions).values({
      project_id: projectId,
      decision: section.placeholderText,
      date: 'TBD',
      source: 'template',
    })
  }

  // --- history tab (APPEND ONLY) ---
  const historyTemplate = TAB_TEMPLATE_REGISTRY.history
  for (const section of historyTemplate.sections) {
    await db.insert(engagementHistory).values({
      project_id: projectId,
      content: section.placeholderText,
      date: 'TBD',
      source: 'template',
    })
  }

  // --- stakeholders tab ---
  const stakeholdersTemplate = TAB_TEMPLATE_REGISTRY.stakeholders
  for (const section of stakeholdersTemplate.sections) {
    await db.insert(stakeholders).values({
      project_id: projectId,
      name: section.placeholderText,
      role: 'TBD',
      source: 'template',
    })
  }

  // --- teams tab — insert placeholder teamOnboardingStatus rows (one per ACTIVE track) ---
  // Phase 87: All three placeholder team inserts (Alpha/ADR, Beta/Biggy, Gamma/Incident Prevention)
  // are now conditional on active_tracks[trackKey] === true. Honors the wizard-driven track-selection
  // rule (Plan 87-04) that a project may have only 1-3 tracks active at creation time. The seeded:false
  // gate above keeps this fully scoped to initial creation — Plan 87-05 owns retroactive seeding
  // for false→true Settings toggles via the dedicated seedIncidentPreventionForProject helper.
  const tracks = (project.active_tracks as { adr: boolean; biggy: boolean; incident_prevention: boolean } | null)
    ?? { adr: false, biggy: false, incident_prevention: false }

  const teamRows = [
    tracks.adr                 && { project_id: projectId, team_name: 'Team Alpha', track: 'ADR',                  source: 'template' as const },
    tracks.biggy               && { project_id: projectId, team_name: 'Team Beta',  track: 'Biggy',                source: 'template' as const },
    tracks.incident_prevention && { project_id: projectId, team_name: 'Team Gamma', track: 'Incident Prevention', source: 'template' as const },
  ].filter(Boolean) as typeof teamOnboardingStatus.$inferInsert[]

  if (teamRows.length > 0) {
    await db.insert(teamOnboardingStatus).values(teamRows)
  }

  // --- teams tab: seed default track_workstream_stages for each enabled track ---
  // Phase 88.1 G1 gap closure: replaces global COLUMNS constant with per-project stage config.
  // Idempotent via UNIQUE (project_id, track, stage_key) index + onConflictDoNothing.
  const enabledTracks = new Set<TrackKey>([
    ...(tracks.adr                 ? ['ADR']                  as TrackKey[] : []),
    ...(tracks.biggy               ? ['Biggy']                as TrackKey[] : []),
    ...(tracks.incident_prevention ? ['Incident Prevention']  as TrackKey[] : []),
  ])
  await seedTrackWorkstreamStages(projectId, enabledTracks)

  // --- plan tab — insert business_outcomes placeholder (Business Outcomes section) ---
  const planTemplate = TAB_TEMPLATE_REGISTRY.plan
  for (const section of planTemplate.sections) {
    await db.insert(businessOutcomes).values({
      project_id: projectId,
      title: section.placeholderText,
      track: 'template',
      source: 'template',
    })
  }

  // --- overview: no DB writes — completeness derived from projects record ---
  // --- skills: no DB writes — read-only execution log ---
  // --- architecture: no placeholder rows — complex nested structure; skip for MVP seeding ---

  // Mark project as seeded (idempotency)
  await db.update(projects)
    .set({ seeded: true, updated_at: new Date() })
    .where(eq(projects.id, projectId))
}
