/**
 * Idempotent seeder for the Incident Prevention track (Phase 87, Plan 04).
 *
 * Used by:
 *   - POST /api/projects (new-project flow when active_tracks.incident_prevention === true)
 *   - PATCH /api/projects/[projectId]/settings (retroactive seeding when the IP track
 *     flips false → true; wired by Plan 87-05).
 *
 * Safe to call multiple times for the same project — every insert uses either
 * `onConflictDoNothing()` (where a unique index backs the column tuple) or a
 * `select-then-insert` guard. Re-calling produces zero new rows for a project
 * that has already been seeded.
 *
 * Idempotency guards by table:
 *   - arch_tracks         → select-then-insert on (project_id, name)
 *   - arch_nodes          → onConflictDoNothing (unique idx on project_id+track_id+name)
 *   - wbs_items           → select-then-insert (no unique idx — track+parent+name guard)
 *   - onboarding_phases   → select-then-insert (no unique idx — track+name guard)
 *   - onboarding_steps    → select-then-insert (no unique idx — phase_id+name guard)
 *   - team_onboarding_status → select-then-insert (no unique idx — team_name+track guard)
 *
 * Architecture seed mirrors `db/migrations/0052_*.sql` (section/sub-cap/console
 * shape) and `lib/onboarding-config.ts:INCIDENT_PREVENTION_ONBOARDING_CONFIG`
 * — single source of truth for IP onboarding phases/steps.
 */
import { and, eq, isNull } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import {
  archNodes,
  archTracks,
  onboardingPhases,
  onboardingSteps,
  teamOnboardingStatus,
  trackWorkstreamStages,
  wbsItems,
} from '@/db/schema'
import { INCIDENT_PREVENTION_ONBOARDING_CONFIG } from '@/lib/onboarding-config'
import { DEFAULT_TRACK_WORKSTREAM_STAGES } from '@/lib/constants/track-workstream-stages'

/**
 * Seeds the full Incident Prevention track surface for a project:
 *   - arch_track + 3 section nodes + Change Risk Console + 13 sub-capability nodes
 *   - 10 WBS L1 phases + 33 WBS L2 sub-tasks (track='Incident Prevention')
 *   - 4 onboarding_phases + 13 onboarding_steps (from INCIDENT_PREVENTION_ONBOARDING_CONFIG)
 *   - 1 Team Gamma teamOnboardingStatus row
 *
 * @param tx        Drizzle transaction handle (caller MUST wrap in db.transaction).
 * @param projectId Target project id.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedIncidentPreventionForProject(
  tx: PgTransaction<any, any, any>,
  projectId: number,
): Promise<void> {
  // ─── 1. arch_track ────────────────────────────────────────────────────────
  // select-then-insert on (project_id, name) — no unique index on this tuple.
  const existingTrack = await tx
    .select({ id: archTracks.id })
    .from(archTracks)
    .where(and(eq(archTracks.project_id, projectId), eq(archTracks.name, 'Incident Prevention Track')))
    .limit(1)

  let ipTrackId: number
  if (existingTrack.length === 0) {
    const [inserted] = await tx
      .insert(archTracks)
      .values({ project_id: projectId, name: 'Incident Prevention Track', display_order: 30 })
      .returning({ id: archTracks.id })
    ipTrackId = inserted.id
  } else {
    ipTrackId = existingTrack[0].id
  }

  // ─── 2. Section arch_nodes (parent_id=NULL, node_type='section') ──────────
  // arch_nodes_project_track_name_idx covers (project_id, track_id, name) — onConflictDoNothing safe.
  async function upsertNode(values: {
    name: string
    display_order: number
    node_type: 'section' | 'sub-capability' | 'console'
    parent_id?: number | null
  }): Promise<number> {
    const inserted = await tx
      .insert(archNodes)
      .values({
        project_id: projectId,
        track_id: ipTrackId,
        name: values.name,
        display_order: values.display_order,
        status: 'planned' as const,
        node_type: values.node_type,
        parent_id: values.parent_id ?? null,
        source_trace: 'template',
      })
      .onConflictDoNothing()
      .returning({ id: archNodes.id })

    if (inserted.length > 0) return inserted[0].id

    // Conflict path — fetch the existing row's id.
    const [existing] = await tx
      .select({ id: archNodes.id })
      .from(archNodes)
      .where(and(
        eq(archNodes.project_id, projectId),
        eq(archNodes.track_id, ipTrackId),
        eq(archNodes.name, values.name),
      ))
      .limit(1)
    return existing.id
  }

  const sectionDiId = await upsertNode({ name: 'Data Ingestion',         display_order: 10, node_type: 'section' })
  const sectionReId = await upsertNode({ name: 'Risk Engine',            display_order: 20, node_type: 'section' })
  const sectionDwId = await upsertNode({ name: 'Decision & Write-Back',  display_order: 30, node_type: 'section' })

  // ─── 3. Change Risk Console (parent_id=NULL, node_type='console') ────────
  await upsertNode({ name: 'Change Risk Console', display_order: 15, node_type: 'console' })

  // ─── 4. Sub-capability arch_nodes (4 + 5 + 4 = 13) ───────────────────────
  const subCaps: { parent: number; name: string; order: number }[] = [
    // Data Ingestion (4)
    { parent: sectionDiId, name: 'ITSM Connectors',                  order: 1 },
    { parent: sectionDiId, name: 'CMDB Connectors',                  order: 2 },
    { parent: sectionDiId, name: 'Monitoring Connectors',            order: 3 },
    { parent: sectionDiId, name: 'Deployment History Connectors',    order: 4 },
    // Risk Engine (5)
    { parent: sectionReId, name: 'Change History Risk',              order: 1 },
    { parent: sectionReId, name: 'Blast Radius Risk',                order: 2 },
    { parent: sectionReId, name: 'CI Criticality Risk',              order: 3 },
    { parent: sectionReId, name: 'Timing & Freeze Window Risk',      order: 4 },
    { parent: sectionReId, name: 'Team Performance Risk',            order: 5 },
    // Decision & Write-Back (4)
    { parent: sectionDwId, name: 'Risk Threshold Rules',             order: 1 },
    { parent: sectionDwId, name: 'ITSM Write-Back (ServiceNow / JSM)', order: 2 },
    { parent: sectionDwId, name: 'CAB Notifications',                order: 3 },
    { parent: sectionDwId, name: 'Reporting & Dashboards',           order: 4 },
  ]
  for (const sc of subCaps) {
    await upsertNode({
      name: sc.name,
      display_order: sc.order,
      node_type: 'sub-capability',
      parent_id: sc.parent,
    })
  }

  // ─── 5. WBS L1 items (10) — select-then-insert (no unique idx) ────────────
  const wbsL1: { name: string; display_order: number }[] = [
    { name: 'Kickoff & Scope',                       display_order: 1 },
    { name: 'Change Process Discovery',              display_order: 2 },
    { name: 'Single Sign-On',                        display_order: 3 },
    { name: 'ITSM Integration (ServiceNow / JSM)',   display_order: 4 },
    { name: 'Data Source Connectors',                display_order: 5 },
    { name: 'Risk Categories & Weights',             display_order: 6 },
    { name: 'Write-Back Configuration',              display_order: 7 },
    { name: 'CAB Workflow Enablement',               display_order: 8 },
    { name: 'UAT & Threshold Tuning',                display_order: 9 },
    { name: 'Go-Live & CAB Enablement',              display_order: 10 },
  ]
  const l1IdMap = new Map<string, number>()
  for (const l1 of wbsL1) {
    const existing = await tx
      .select({ id: wbsItems.id })
      .from(wbsItems)
      .where(and(
        eq(wbsItems.project_id, projectId),
        eq(wbsItems.track, 'Incident Prevention'),
        isNull(wbsItems.parent_id),
        eq(wbsItems.name, l1.name),
      ))
      .limit(1)
    if (existing.length > 0) {
      l1IdMap.set(l1.name, existing[0].id)
      continue
    }
    const [inserted] = await tx
      .insert(wbsItems)
      .values({
        project_id: projectId,
        track: 'Incident Prevention',
        name: l1.name,
        display_order: l1.display_order,
        level: 1,
        parent_id: null,
        status: 'not_started' as const,
        source_trace: 'template',
      })
      .returning({ id: wbsItems.id })
    l1IdMap.set(l1.name, inserted.id)
  }

  // ─── 6. WBS L2 sub-tasks (33) ─────────────────────────────────────────────
  const wbsL2: { parentName: string; subs: string[] }[] = [
    { parentName: 'Kickoff & Scope',                     subs: ['Stakeholder Identification', 'Success Criteria Definition', 'Change Volume Baseline'] },
    { parentName: 'Change Process Discovery',            subs: ['Current Workflow Mapping', 'Approval Chain Audit', 'Change Categories Inventory'] },
    { parentName: 'Single Sign-On',                      subs: ['SSO Provider Selection', 'IdP Configuration', 'Test User Provisioning'] },
    { parentName: 'ITSM Integration (ServiceNow / JSM)', subs: ['ServiceNow/JSM API Credentials', 'Change Table Schema Mapping', 'Webhook Configuration', 'Connection Validation'] },
    { parentName: 'Data Source Connectors',              subs: ['CMDB Connector Setup', 'Monitoring Tool Connector', 'Deployment History Connector'] },
    { parentName: 'Risk Categories & Weights',           subs: ['Category Weighting Workshop', 'Historical Pattern Review', 'Threshold Calibration', 'Weight Validation'] },
    { parentName: 'Write-Back Configuration',            subs: ['Risk Score Field Mapping', 'Update Rules Definition', 'Write-Back Sandbox Test'] },
    { parentName: 'CAB Workflow Enablement',             subs: ['Approval Routing Rules', 'Auto-Gate Configuration', 'Notification Templates'] },
    { parentName: 'UAT & Threshold Tuning',              subs: ['Historical Backtest Run', 'Live Scoring Trial', 'Threshold Adjustment Cycles'] },
    { parentName: 'Go-Live & CAB Enablement',            subs: ['CAB Training Sessions', 'Score Interpretation Guide', 'Production Cutover', 'Post-Launch Review'] },
  ]
  for (const group of wbsL2) {
    const parentId = l1IdMap.get(group.parentName)
    if (!parentId) continue
    for (let i = 0; i < group.subs.length; i++) {
      const subName = group.subs[i]
      const existingSub = await tx
        .select({ id: wbsItems.id })
        .from(wbsItems)
        .where(and(
          eq(wbsItems.project_id, projectId),
          eq(wbsItems.track, 'Incident Prevention'),
          eq(wbsItems.parent_id, parentId),
          eq(wbsItems.name, subName),
        ))
        .limit(1)
      if (existingSub.length > 0) continue
      await tx.insert(wbsItems).values({
        project_id: projectId,
        track: 'Incident Prevention',
        name: subName,
        display_order: i + 1,
        level: 2,
        parent_id: parentId,
        status: 'not_started' as const,
        source_trace: 'template',
      })
    }
  }

  // ─── 7. Onboarding phases + steps from INCIDENT_PREVENTION_ONBOARDING_CONFIG ──
  for (const phase of INCIDENT_PREVENTION_ONBOARDING_CONFIG) {
    // Phase: select-then-insert on (project_id, track, name)
    const existingPhase = await tx
      .select({ id: onboardingPhases.id })
      .from(onboardingPhases)
      .where(and(
        eq(onboardingPhases.project_id, projectId),
        eq(onboardingPhases.track, 'Incident Prevention'),
        eq(onboardingPhases.name, phase.name),
      ))
      .limit(1)

    let phaseId: number
    if (existingPhase.length > 0) {
      phaseId = existingPhase[0].id
    } else {
      const [inserted] = await tx
        .insert(onboardingPhases)
        .values({
          project_id: projectId,
          track: 'Incident Prevention',
          name: phase.name,
          display_order: phase.display_order,
        })
        .returning({ id: onboardingPhases.id })
      phaseId = inserted.id
    }

    // Steps: select-then-insert on (phase_id, name)
    for (let i = 0; i < phase.steps.length; i++) {
      const stepName = phase.steps[i]
      const existingStep = await tx
        .select({ id: onboardingSteps.id })
        .from(onboardingSteps)
        .where(and(
          eq(onboardingSteps.phase_id, phaseId),
          eq(onboardingSteps.name, stepName),
        ))
        .limit(1)
      if (existingStep.length > 0) continue
      await tx.insert(onboardingSteps).values({
        phase_id: phaseId,
        project_id: projectId,
        name: stepName,
        display_order: i + 1,
        track: 'Incident Prevention',
      })
    }
  }

  // ─── 8. teamOnboardingStatus — Team Gamma placeholder (idempotent) ────────
  // Plan 87-03's seed-project.ts already inserts Team Gamma when active_tracks
  // .incident_prevention is true at project-create time. This guard makes the
  // helper safe to call from PATCH-settings retroactive-seeding (Plan 87-05)
  // even when Plan 03 already inserted the row.
  const existingTeam = await tx
    .select({ id: teamOnboardingStatus.id })
    .from(teamOnboardingStatus)
    .where(and(
      eq(teamOnboardingStatus.project_id, projectId),
      eq(teamOnboardingStatus.team_name, 'Team Gamma'),
      eq(teamOnboardingStatus.track, 'Incident Prevention'),
    ))
    .limit(1)
  if (existingTeam.length === 0) {
    await tx.insert(teamOnboardingStatus).values({
      project_id: projectId,
      team_name: 'Team Gamma',
      track: 'Incident Prevention',
      source: 'template',
    })
  }

  // ─── 9. track_workstream_stages — Incident Prevention stages (idempotent) ─
  // Phase 88.1 G1 gap closure: seed the 5 Incident Prevention workstream stage rows
  // so the TeamOnboardingTable has column headers for this track on retroactive enable.
  // Idempotent via UNIQUE (project_id, track, stage_key) index + onConflictDoNothing.
  const ipStages = DEFAULT_TRACK_WORKSTREAM_STAGES['Incident Prevention'].map((s) => ({
    project_id: projectId,
    track: 'Incident Prevention' as const,
    stage_key: s.stage_key,
    stage_label: s.stage_label,
    display_order: s.display_order,
    source: 'seed' as const,
  }))
  await tx.insert(trackWorkstreamStages).values(ipStages).onConflictDoNothing()
}
