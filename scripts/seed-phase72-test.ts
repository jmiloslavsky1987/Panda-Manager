/**
 * seed-phase72-test.ts — Create test projects for Phase 72 UAT
 *
 * Creates:
 *   - "Nexus Platform Migration" (ProjectA) — full data: risks, milestones,
 *     actions, workstreams, decisions. Tests text search + filter UX.
 *   - "Delta Rollout" (ProjectB) — NO workstreams. Tests EmptyState component.
 *
 * Run: npx tsx scripts/seed-phase72-test.ts
 * Idempotent: skips if projects already exist by name.
 */

import { db } from '../db/index';
import {
  projects,
  projectMembers,
  risks,
  milestones,
  actions,
  workstreams,
  keyDecisions,
  engagementHistory,
  wbsItems,
  archTracks,
  archNodes,
  teamEngagementSections,
  businessOutcomes,
  e2eWorkflows,
  workflowSteps,
  focusAreas,
  teamOnboardingStatus,
  stakeholders,
} from '../db/schema';
import { eq } from 'drizzle-orm';

const USER_ID = '0a45b68c-277c-4c5c-ae4c-06def1f65d2b';

// ── WBS template seeding (mirrors app/api/projects/route.ts) ─────────────────
async function seedWbsTemplate(projectId: number) {
  const existing = await db.select().from(wbsItems).where(eq(wbsItems.project_id, projectId));
  if (existing.length > 0) {
    console.log(`WBS items already exist for project ${projectId} (${existing.length} rows), skipping`);
    return;
  }

  // ADR Level 1
  const adrL1 = await db.insert(wbsItems).values([
    { project_id: projectId, level: 1, track: 'ADR', name: 'Discovery & Kickoff',             display_order: 1,  status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'ADR', name: 'Solution Design',                 display_order: 2,  status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'ADR', name: 'Alert Source Integration',        display_order: 3,  status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'ADR', name: 'Alert Enrichment & Normalization', display_order: 4, status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'ADR', name: 'Platform Configuration',          display_order: 5,  status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'ADR', name: 'Correlation',                     display_order: 6,  status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'ADR', name: 'Routing & Escalation',            display_order: 7,  status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'ADR', name: 'Teams & Training',                display_order: 8,  status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'ADR', name: 'UAT & Go-Live Preparation',       display_order: 9,  status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'ADR', name: 'Go-Live',                         display_order: 10, status: 'not_started', source_trace: 'template' },
  ]).returning({ id: wbsItems.id, name: wbsItems.name });

  // ADR Level 2
  const adrL2Defs = [
    { parentName: 'Solution Design',                  children: ['Ops Shadowing / Current State', 'Future State Workflow', 'ADR Process Consulting'] },
    { parentName: 'Alert Source Integration',          children: ['Outbound Integrations', 'Inbound Integrations'] },
    { parentName: 'Alert Enrichment & Normalization',  children: ['Tag Documentation', 'Normalization Configuration', 'CMDB'] },
    { parentName: 'Platform Configuration',            children: ['Environments', 'Incident Tags', 'Role Based Access Control', 'Incident Routing', 'Maintenance Plans', 'Single Sign-On', 'Admin / Reporting'] },
    { parentName: 'Correlation',                       children: ['Use Case Discovery', 'Correlation Configuration'] },
    { parentName: 'Teams & Training',                  children: ['User Training'] },
    { parentName: 'UAT & Go-Live Preparation',         children: ['UAT', 'Documentation', 'Go-Live Prep'] },
    { parentName: 'Go-Live',                           children: ['Go Live', 'Post Go-Live Survey', 'Unified Analytics', 'Project Closure'] },
  ];
  const adrL2Rows = adrL2Defs.flatMap(({ parentName, children }) => {
    const parent = adrL1.find(p => p.name === parentName);
    if (!parent) return [];
    return children.map((name, i) => ({
      project_id: projectId, parent_id: parent.id, level: 2, track: 'ADR',
      name, display_order: i + 1, status: 'not_started' as const, source_trace: 'template',
    }));
  });
  if (adrL2Rows.length > 0) await db.insert(wbsItems).values(adrL2Rows);

  // Biggy Level 1
  const biggyL1 = await db.insert(wbsItems).values([
    { project_id: projectId, level: 1, track: 'Biggy', name: 'Discovery & Kickoff', display_order: 1, status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'Biggy', name: 'Integrations',        display_order: 2, status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'Biggy', name: 'Workflow',             display_order: 3, status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'Biggy', name: 'Teams & Training',    display_order: 4, status: 'not_started', source_trace: 'template' },
    { project_id: projectId, level: 1, track: 'Biggy', name: 'Deploy',              display_order: 5, status: 'not_started', source_trace: 'template' },
  ]).returning({ id: wbsItems.id, name: wbsItems.name });

  // Biggy Level 2
  const biggyL2Defs = [
    { parentName: 'Integrations',     children: ['Real-Time Integrations', 'Context Integrations', 'UDC'] },
    { parentName: 'Workflow',         children: ['Action Plans', 'Workflows', 'Managed Incident Channels'] },
    { parentName: 'Teams & Training', children: ['Team-Specific Workflow Enablement', 'Workflow Automations', 'Training'] },
  ];
  const biggyL2Rows = biggyL2Defs.flatMap(({ parentName, children }) => {
    const parent = biggyL1.find(p => p.name === parentName);
    if (!parent) return [];
    return children.map((name, i) => ({
      project_id: projectId, parent_id: parent.id, level: 2, track: 'Biggy',
      name, display_order: i + 1, status: 'not_started' as const, source_trace: 'template',
    }));
  });
  if (biggyL2Rows.length > 0) await db.insert(wbsItems).values(biggyL2Rows);

  console.log(`Seeded WBS template for project ${projectId} (ADR: 10+${adrL2Rows.length}, Biggy: 5+${biggyL2Rows.length})`);
}

// ── Architecture tracks/nodes template (mirrors app/api/projects/route.ts) ────
async function seedArchTemplate(projectId: number) {
  const existing = await db.select().from(archTracks).where(eq(archTracks.project_id, projectId));
  if (existing.length > 0) {
    console.log(`Arch tracks already exist for project ${projectId}, skipping`);
    return;
  }

  const [adrTrack] = await db.insert(archTracks).values({
    project_id: projectId, name: 'ADR Track', display_order: 1,
  }).returning({ id: archTracks.id });

  await db.insert(archNodes).values([
    { track_id: adrTrack.id, project_id: projectId, name: 'Event Ingest',          display_order: 1, status: 'planned', source_trace: 'template' },
    { track_id: adrTrack.id, project_id: projectId, name: 'Alert Intelligence',    display_order: 2, status: 'planned', source_trace: 'template' },
    { track_id: adrTrack.id, project_id: projectId, name: 'Incident Intelligence', display_order: 3, status: 'planned', source_trace: 'template' },
    { track_id: adrTrack.id, project_id: projectId, name: 'Console',               display_order: 4, status: 'planned', source_trace: 'template' },
    { track_id: adrTrack.id, project_id: projectId, name: 'Workflow Automation',   display_order: 5, status: 'planned', source_trace: 'template' },
  ]);

  const [aiTrack] = await db.insert(archTracks).values({
    project_id: projectId, name: 'AI Assistant Track', display_order: 2,
  }).returning({ id: archTracks.id });

  await db.insert(archNodes).values([
    { track_id: aiTrack.id, project_id: projectId, name: 'Knowledge Sources', display_order: 1, status: 'planned', source_trace: 'template' },
    { track_id: aiTrack.id, project_id: projectId, name: 'Real-Time Query',   display_order: 2, status: 'planned', source_trace: 'template' },
    { track_id: aiTrack.id, project_id: projectId, name: 'AI Capabilities',   display_order: 3, status: 'planned', source_trace: 'template' },
    { track_id: aiTrack.id, project_id: projectId, name: 'Console',           display_order: 4, status: 'planned', source_trace: 'template' },
    { track_id: aiTrack.id, project_id: projectId, name: 'Outputs & Actions', display_order: 5, status: 'planned', source_trace: 'template' },
  ]);

  await db.insert(teamEngagementSections).values([
    { project_id: projectId, name: 'Business Outcomes',  content: '', display_order: 1, source_trace: 'template' },
    { project_id: projectId, name: 'Architecture',       content: '', display_order: 2, source_trace: 'template' },
    { project_id: projectId, name: 'E2E Workflows',      content: '', display_order: 3, source_trace: 'template' },
    { project_id: projectId, name: 'Teams & Engagement', content: '', display_order: 4, source_trace: 'template' },
    { project_id: projectId, name: 'Top Focus Areas',    content: '', display_order: 5, source_trace: 'template' },
  ]);

  console.log(`Seeded arch tracks/nodes + team engagement sections for project ${projectId}`);
}

// ── Teams tab data (business outcomes, workflows, focus areas, onboarding) ────
async function seedTeamsTemplate(projectId: number, projectName: string) {
  const existing = await db.select().from(businessOutcomes).where(eq(businessOutcomes.project_id, projectId));
  if (existing.length > 0) {
    console.log(`Teams data already exists for project ${projectId}, skipping`);
    return;
  }

  // Business outcomes
  await db.insert(businessOutcomes).values([
    { project_id: projectId, title: 'Reduce alert noise by 70%', track: 'ADR', description: 'Consolidate 12 monitoring tools into BigPanda. Target: NOC handles 30% fewer tickets per week.', delivery_status: 'in_progress', source: 'seed' },
    { project_id: projectId, title: 'Automate incident routing to ServiceNow', track: 'ADR', description: 'Auto-create SNOW tickets for P1/P2 incidents. Eliminate manual triage step for NOC team.', delivery_status: 'planned', source: 'seed' },
    { project_id: projectId, title: `${projectName} — Biggy AI incident summaries`, track: 'Biggy', description: 'AI-generated incident summaries surfaced in SNOW tickets. Target: reduce MTTR by 25%.', delivery_status: 'planned', source: 'seed' },
  ]);

  // E2E workflows
  const [w1] = await db.insert(e2eWorkflows).values({
    project_id: projectId, team_name: 'NOC Team', workflow_name: 'P1 Incident Response', source: 'seed',
  }).returning({ id: e2eWorkflows.id });
  await db.insert(workflowSteps).values([
    { workflow_id: w1.id, label: 'Alert fires in Dynatrace', track: 'ADR', status: 'live', position: 1 },
    { workflow_id: w1.id, label: 'BigPanda correlates & enriches', track: 'ADR', status: 'in_progress', position: 2 },
    { workflow_id: w1.id, label: 'SNOW ticket auto-created', track: 'ADR', status: 'planned', position: 3 },
    { workflow_id: w1.id, label: 'On-call engineer notified', track: 'ADR', status: 'planned', position: 4 },
  ]);

  const [w2] = await db.insert(e2eWorkflows).values({
    project_id: projectId, team_name: 'Platform Engineering', workflow_name: 'Infrastructure Change Review', source: 'seed',
  }).returning({ id: e2eWorkflows.id });
  await db.insert(workflowSteps).values([
    { workflow_id: w2.id, label: 'Change ticket raised in SNOW', track: 'ADR', status: 'live', position: 1 },
    { workflow_id: w2.id, label: 'Maintenance window set in BigPanda', track: 'ADR', status: 'planned', position: 2 },
    { workflow_id: w2.id, label: 'Alert suppression active during window', track: 'ADR', status: 'planned', position: 3 },
  ]);

  // Focus areas
  await db.insert(focusAreas).values([
    {
      project_id: projectId,
      title: 'Correlation policy tuning',
      tracks: 'ADR',
      why_it_matters: 'Current FP rate 28% — target 10%. Every false positive costs NOC 8 mins avg.',
      current_status: 'Correlation policies drafted for top 5 use cases',
      next_step: 'Run 2-week shadow mode to validate FP rate before go-live',
      bp_owner: 'Sarah Chen',
      customer_owner: 'Mike Torres (NOC Lead)',
      source: 'seed',
    },
    {
      project_id: projectId,
      title: 'ServiceNow integration sign-off',
      tracks: 'ADR',
      why_it_matters: 'Blocking go-live. Auto-ticket creation requires SNOW admin approval.',
      current_status: 'SNOW webhook configured, pending approval from SNOW admin team',
      next_step: 'Schedule SNOW admin review session — target week of Apr 28',
      bp_owner: 'Marcus Webb',
      customer_owner: 'Dana Lee (VP IT Ops)',
      source: 'seed',
    },
  ]);

  // Team onboarding status
  await db.insert(teamOnboardingStatus).values([
    { project_id: projectId, team_name: 'NOC Team', track: 'ADR', ingest_status: 'in_progress', correlation_status: 'planned', incident_intelligence_status: 'planned', sn_automation_status: 'planned', source: 'seed' },
    { project_id: projectId, team_name: 'Platform Engineering', track: 'ADR', ingest_status: 'live', correlation_status: 'in_progress', incident_intelligence_status: 'planned', sn_automation_status: 'planned', source: 'seed' },
    { project_id: projectId, team_name: 'Cloud Infrastructure', track: 'Biggy', biggy_ai_status: 'planned', source: 'seed' },
  ]);

  // Stakeholders (needed for Teams & Engagement section)
  const existingStakeholders = await db.select().from(stakeholders).where(eq(stakeholders.project_id, projectId));
  if (existingStakeholders.length === 0) {
    await db.insert(stakeholders).values([
      { project_id: projectId, name: 'Dana Lee', role: 'VP IT Operations', company: 'Nexus Corp', source: 'seed' },
      { project_id: projectId, name: 'Mike Torres', role: 'NOC Lead', company: 'Nexus Corp', source: 'seed' },
      { project_id: projectId, name: 'Rachel Green', role: 'InfoSec Lead', company: 'Nexus Corp', source: 'seed' },
    ]);
  }

  console.log(`Seeded Teams tab data for project ${projectId}`);
}

async function main() {
  // ── Project A: Nexus Platform Migration ──────────────────────────────────────
  let projectAId: number;
  const existingA = await db.select().from(projects).where(eq(projects.name, 'Nexus Platform Migration'));
  if (existingA.length > 0) {
    projectAId = existingA[0].id;
    console.log(`Project A already exists (id=${projectAId}), skipping project insert`);
  } else {
    const [projectA] = await db.insert(projects).values({
      name: 'Nexus Platform Migration',
      customer: 'Nexus Corp',
      status: 'active',
      overall_status: 'yellow',
      status_summary: 'On track with minor risks. Authentication service migration delayed by 2 weeks.',
      go_live_target: '2026-07-15',
      description: 'Full-stack migration of legacy Nexus monolith to microservices. Covers auth, billing, and data platform.',
      start_date: '2026-01-10',
      end_date: '2026-07-15',
      seeded: true,
    }).returning({ id: projects.id });
    projectAId = projectA.id;
    console.log(`Created Project A: Nexus Platform Migration (id=${projectAId})`);
  }

  await db.insert(projectMembers).values({ project_id: projectAId, user_id: USER_ID, role: 'admin' })
    .onConflictDoNothing();

  // ── Risks for Project A ───────────────────────────────────────────────────────
  const existingRisks = await db.select().from(risks).where(eq(risks.project_id, projectAId));
  if (existingRisks.length === 0) {
    await db.insert(risks).values([
      {
        project_id: projectAId,
        external_id: 'R-NEX-001',
        description: 'Authentication service migration may break SSO for 3,000 enterprise users',
        severity: 'high',
        owner: 'Sarah Chen',
        mitigation: 'Parallel run both auth systems for 30 days, with automatic fallback to legacy on error',
        status: 'open',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'R-NEX-002',
        description: 'Database schema migration could cause data loss in billing records',
        severity: 'critical',
        owner: 'Marcus Webb',
        mitigation: 'Full database snapshot before migration, 48-hour rollback window, dry-run in staging',
        status: 'mitigated',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'R-NEX-003',
        description: 'Third-party payment processor API deprecation in Q2 conflicts with go-live date',
        severity: 'medium',
        owner: 'Lisa Park',
        mitigation: 'Contacted vendor — deprecation extended to Q4. Low urgency now.',
        status: 'resolved',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'R-NEX-004',
        description: 'New microservices architecture increases operational complexity for on-call team',
        severity: 'low',
        owner: 'DevOps Team',
        mitigation: 'Runbooks created, PagerDuty routing updated, chaos engineering drills scheduled',
        status: 'accepted',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'R-NEX-005',
        description: 'Legacy authentication tokens expire during migration window, forcing re-login',
        severity: 'medium',
        owner: 'Sarah Chen',
        mitigation: 'Token refresh logic to be deployed 48 hours before migration starts',
        status: 'open',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'R-NEX-006',
        description: 'Billing service performance degradation under load — observed 4x slowdown in staging',
        severity: 'high',
        owner: 'Marcus Webb',
        mitigation: 'Query optimization in progress, Redis caching layer added, load test scheduled',
        status: 'open',
        source: 'seed',
      },
    ]);
    console.log('Inserted 6 risks for Project A');
  } else {
    console.log(`Risks already exist for Project A (${existingRisks.length} rows), skipping`);
  }

  // ── Milestones for Project A ──────────────────────────────────────────────────
  const existingMilestones = await db.select().from(milestones).where(eq(milestones.project_id, projectAId));
  if (existingMilestones.length === 0) {
    await db.insert(milestones).values([
      {
        project_id: projectAId,
        external_id: 'M-NEX-001',
        name: 'Authentication service deployed to production',
        status: 'in_progress',
        target: '2026-05-01',
        owner: 'Sarah Chen',
        notes: 'OAuth 2.0 + SAML flows complete. LDAP connector in final testing. Blocked by security audit.',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'M-NEX-002',
        name: 'Billing platform migration complete',
        status: 'not_started',
        target: '2026-06-15',
        owner: 'Marcus Webb',
        notes: 'Waiting on authentication milestone completion before billing migration can proceed',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'M-NEX-003',
        name: 'Legacy monolith decommissioned',
        status: 'not_started',
        target: '2026-07-10',
        owner: 'DevOps Team',
        notes: 'Final milestone — shut down all legacy services and remove from infrastructure',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'M-NEX-004',
        name: 'Data platform schema migration',
        status: 'completed',
        target: '2026-03-20',
        owner: 'Lisa Park',
        notes: 'All 47 tables migrated successfully. Zero data loss confirmed via checksum validation.',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'M-NEX-005',
        name: 'Staging environment fully operational',
        status: 'completed',
        target: '2026-02-28',
        owner: 'DevOps Team',
        notes: 'All 12 microservices running in staging with production parity config',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'M-NEX-006',
        name: 'Security penetration test sign-off',
        status: 'blocked',
        target: '2026-04-30',
        owner: 'Sarah Chen',
        notes: 'External pen-test vendor scheduling delayed 3 weeks. Critical path item — unblocks production auth deployment.',
        source: 'seed',
      },
    ]);
    console.log('Inserted 6 milestones for Project A');
  } else {
    console.log(`Milestones already exist for Project A (${existingMilestones.length} rows), skipping`);
  }

  // ── Actions for Project A ────────────────────────────────────────────────────
  const existingActions = await db.select().from(actions).where(eq(actions.project_id, projectAId));
  if (existingActions.length === 0) {
    await db.insert(actions).values([
      {
        project_id: projectAId,
        external_id: 'A-NEX-001',
        description: 'Schedule kickoff meeting with pen-test vendor to unblock security milestone',
        owner: 'Sarah Chen',
        due: '2026-04-25',
        status: 'open',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'A-NEX-002',
        description: 'Complete Redis caching layer implementation for billing service',
        owner: 'Marcus Webb',
        due: '2026-04-28',
        status: 'in_progress',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'A-NEX-003',
        description: 'Review and merge token refresh PR before migration window',
        owner: 'Sarah Chen',
        due: '2026-04-22',
        status: 'completed',
        source: 'seed',
      },
      {
        project_id: projectAId,
        external_id: 'A-NEX-004',
        description: 'Update runbooks with new microservices on-call procedures',
        owner: 'DevOps Team',
        due: '2026-05-05',
        status: 'open',
        source: 'seed',
      },
    ]);
    console.log('Inserted 4 actions for Project A');
  } else {
    console.log(`Actions already exist for Project A (${existingActions.length} rows), skipping`);
  }

  // ── Workstreams for Project A ────────────────────────────────────────────────
  const existingWorkstreams = await db.select().from(workstreams).where(eq(workstreams.project_id, projectAId));
  if (existingWorkstreams.length === 0) {
    await db.insert(workstreams).values([
      {
        project_id: projectAId,
        name: 'Authentication & Identity',
        current_status: 'yellow',
        lead: 'Sarah Chen',
        last_updated: '2026-04-18',
        state: 'in_progress',
        percent_complete: 65,
        source: 'seed',
      },
      {
        project_id: projectAId,
        name: 'Billing Platform',
        current_status: 'red',
        lead: 'Marcus Webb',
        last_updated: '2026-04-17',
        state: 'in_progress',
        percent_complete: 20,
        source: 'seed',
      },
      {
        project_id: projectAId,
        name: 'Data Platform',
        current_status: 'green',
        lead: 'Lisa Park',
        last_updated: '2026-04-10',
        state: 'complete',
        percent_complete: 100,
        source: 'seed',
      },
      {
        project_id: projectAId,
        name: 'Infrastructure & DevOps',
        current_status: 'green',
        lead: 'DevOps Team',
        last_updated: '2026-04-15',
        state: 'in_progress',
        percent_complete: 80,
        source: 'seed',
      },
    ]);
    console.log('Inserted 4 workstreams for Project A');
  } else {
    console.log(`Workstreams already exist for Project A (${existingWorkstreams.length} rows), skipping`);
  }

  // ── Key Decisions for Project A ──────────────────────────────────────────────
  const existingDecisions = await db.select().from(keyDecisions).where(eq(keyDecisions.project_id, projectAId));
  if (existingDecisions.length === 0) {
    await db.insert(keyDecisions).values([
      {
        project_id: projectAId,
        date: '2026-02-14',
        decision: 'Adopt OAuth 2.0 + SAML dual-protocol support for enterprise SSO',
        context: 'Enterprise customers require SAML; greenfield customers prefer OAuth. Dual support adds 3 weeks but avoids customer churn.',
        source: 'seed',
      },
      {
        project_id: projectAId,
        date: '2026-03-01',
        decision: 'Delay monolith decommission by 6 weeks to allow parallel-run validation',
        context: 'Risk of silent billing errors too high without extended parallel run. Board approved timeline extension.',
        source: 'seed',
      },
      {
        project_id: projectAId,
        date: '2026-03-20',
        decision: 'Use Redis for billing service caching layer instead of Memcached',
        context: 'Redis supports complex data structures needed for rate-limit counters. Team already has Redis expertise from auth service.',
        source: 'seed',
      },
      {
        project_id: projectAId,
        date: '2026-04-10',
        decision: 'Rollback window extended from 24 to 48 hours for production migration',
        context: 'SRE team requested extra window due to timezone coverage gaps. Minimal cost, significant risk reduction.',
        source: 'seed',
      },
    ]);
    console.log('Inserted 4 key decisions for Project A');
  } else {
    console.log(`Key decisions already exist for Project A (${existingDecisions.length} rows), skipping`);
  }

  // ── Engagement History for Project A ────────────────────────────────────────
  const existingHistory = await db.select().from(engagementHistory).where(eq(engagementHistory.project_id, projectAId));
  if (existingHistory.length === 0) {
    await db.insert(engagementHistory).values([
      {
        project_id: projectAId,
        date: '2026-04-18',
        content: 'Weekly sync: Authentication milestone moved to yellow — pen-test vendor scheduling delayed. Token refresh PR approved and merged.',
        source: 'seed',
      },
      {
        project_id: projectAId,
        date: '2026-04-11',
        content: 'Billing performance issue escalated to red. Redis caching in progress. Estimated fix: 1 week.',
        source: 'seed',
      },
    ]);
    console.log('Inserted 2 engagement history entries for Project A');
  } else {
    console.log(`Engagement history already exists for Project A (${existingHistory.length} rows), skipping`);
  }

  // ── Project B: Delta Rollout (no workstreams — tests EmptyState) ─────────────
  let projectBId: number;
  const existingB = await db.select().from(projects).where(eq(projects.name, 'Delta Rollout'));
  if (existingB.length > 0) {
    projectBId = existingB[0].id;
    console.log(`Project B already exists (id=${projectBId}), skipping project insert`);
  } else {
    const [projectB] = await db.insert(projects).values({
      name: 'Delta Rollout',
      customer: 'Delta Systems',
      status: 'active',
      overall_status: 'green',
      status_summary: 'Early stage. Workstream structure not yet defined.',
      go_live_target: '2026-09-01',
      description: 'Initial deployment of Delta analytics platform. Discovery phase — no workstreams defined yet.',
      start_date: '2026-04-01',
      seeded: true,
    }).returning({ id: projects.id });
    projectBId = projectB.id;
    console.log(`Created Project B: Delta Rollout (id=${projectBId})`);
  }

  await db.insert(projectMembers).values({ project_id: projectBId, user_id: USER_ID, role: 'admin' })
    .onConflictDoNothing();

  // Project B intentionally has NO workstreams — tests EmptyState component

  // ── WBS + arch + team engagement template for both projects ─────────────────
  await seedWbsTemplate(projectAId);
  await seedWbsTemplate(projectBId);
  await seedArchTemplate(projectAId);
  await seedArchTemplate(projectBId);
  await seedTeamsTemplate(projectAId, 'Nexus Platform Migration');
  await seedTeamsTemplate(projectBId, 'Delta Rollout');

  console.log('\n✓ Seed complete');
  console.log(`  Project A: "Nexus Platform Migration" (id=${projectAId}) — full data`);
  console.log(`    Risks: 6 | Milestones: 6 | Actions: 4 | Workstreams: 4 | Decisions: 4`);
  console.log(`  Project B: "Delta Rollout" (id=${projectBId}) — no workstreams (EmptyState test)`);
  console.log('\nVerification steps:');
  console.log('  1. Open Nexus → Delivery → Risks: search "auth" or "billing" to test text search');
  console.log('  2. Open Nexus → Delivery → Milestones: search "auth" or "billing" to test text search');
  console.log('  3. Open Delta Rollout → Delivery → Workstreams: should show EmptyState card');
  console.log('  4. Open Nexus → Delivery → Decisions: apply a filter that returns no results');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
