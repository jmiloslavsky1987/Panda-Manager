import 'server-only'
import { db } from '@/db'
import {
  actions, risks, milestones, engagementHistory, keyDecisions,
  stakeholders, businessOutcomes, teamOnboardingStatus, projects
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { TAB_TEMPLATE_REGISTRY } from './tab-template-registry'

export async function seedProjectFromRegistry(projectId: number): Promise<void> {
  // Idempotency check — skip if already seeded
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { seeded: true },
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
      status: 'planned',
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

  // --- teams tab — insert placeholder teamOnboardingStatus rows ---
  const teamsTemplate = TAB_TEMPLATE_REGISTRY.teams
  for (const section of teamsTemplate.sections) {
    await db.insert(teamOnboardingStatus).values({
      project_id: projectId,
      team_name: section.placeholderText,
      track: 'template',
      source: 'template',
    })
  }

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
