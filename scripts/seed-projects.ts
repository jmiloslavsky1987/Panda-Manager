/**
 * scripts/seed-projects.ts
 * Seeds 3 realistic projects with full data across all tabs.
 * Run: DATABASE_URL="postgresql://..." npx tsx scripts/seed-projects.ts
 */

import db from '../db';
import {
  projects, workstreams, tasks, milestones, risks, actions, stakeholders,
  engagementHistory, keyDecisions, wbsItems, businessOutcomes, focusAreas,
  architectureIntegrations, archTracks, archNodes, archTeamStatus,
  teamEngagementSections, artifacts, teamOnboardingStatus, e2eWorkflows, workflowSteps,
} from '../db/schema';
import { eq } from 'drizzle-orm';

const TODAY = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

async function clearProject(id: number) {
  // Delete in FK-safe order
  // workflow_steps has no project_id — cascade-delete via parent e2e_workflows
  const wfs = await db.select({ id: e2eWorkflows.id }).from(e2eWorkflows).where(eq(e2eWorkflows.project_id, id));
  for (const wf of wfs) {
    await db.delete(workflowSteps).where(eq(workflowSteps.workflow_id, wf.id));
  }
  await db.delete(e2eWorkflows).where(eq(e2eWorkflows.project_id, id));
  await db.delete(teamOnboardingStatus).where(eq(teamOnboardingStatus.project_id, id));
  await db.delete(archNodes).where(eq(archNodes.project_id, id));
  await db.delete(archTracks).where(eq(archTracks.project_id, id));
  await db.delete(archTeamStatus).where(eq(archTeamStatus.project_id, id));
  await db.delete(teamEngagementSections).where(eq(teamEngagementSections.project_id, id));
  await db.delete(architectureIntegrations).where(eq(architectureIntegrations.project_id, id));
  await db.delete(focusAreas).where(eq(focusAreas.project_id, id));
  await db.delete(businessOutcomes).where(eq(businessOutcomes.project_id, id));
  await db.delete(wbsItems).where(eq(wbsItems.project_id, id));
  await db.delete(actions).where(eq(actions.project_id, id));
  await db.delete(risks).where(eq(risks.project_id, id));
  await db.delete(tasks).where(eq(tasks.project_id, id));
  await db.delete(milestones).where(eq(milestones.project_id, id));
  await db.delete(workstreams).where(eq(workstreams.project_id, id));
  await db.delete(engagementHistory).where(eq(engagementHistory.project_id, id));
  await db.delete(keyDecisions).where(eq(keyDecisions.project_id, id));
  await db.delete(stakeholders).where(eq(stakeholders.project_id, id));
  await db.delete(artifacts).where(eq(artifacts.project_id, id));
}

async function seedProject(def: {
  id: number;
  name: string;
  description: string;
  goLive: string;
  overallStatus: string;
  statusSummary: string;
}) {
  const { id } = def;

  await clearProject(id);

  await db.update(projects).set({
    name: def.name,
    customer: def.name,
    description: def.description,
    go_live_target: def.goLive,
    overall_status: def.overallStatus,
    status_summary: def.statusSummary,
    start_date: fmt(addDays(TODAY, -60)),
    end_date: fmt(addDays(TODAY, 120)),
    weekly_hour_target: '40',
    seeded: true,
  }).where(eq(projects.id, id));

  // ── Stakeholders ────────────────────────────────────────────────────────────
  const [sh1] = await db.insert(stakeholders).values([
    { project_id: id, name: 'Sarah Chen', role: 'Project Sponsor', company: def.name, email: 'sarah.chen@example.com', source: 'seed' },
    { project_id: id, name: 'Marcus Webb', role: 'Technical Lead', company: def.name, email: 'marcus.webb@example.com', source: 'seed' },
    { project_id: id, name: 'Lisa Park', role: 'Change Manager', company: def.name, email: 'lisa.park@example.com', source: 'seed' },
    { project_id: id, name: 'James O\'Brien', role: 'IT Director', company: def.name, email: 'james.obrien@example.com', source: 'seed' },
  ]).returning();

  // ── Workstreams ─────────────────────────────────────────────────────────────
  const [ws1, ws2, ws3] = await db.insert(workstreams).values([
    { project_id: id, name: 'Infrastructure', track: 'ADR', current_status: 'on_track', lead: 'Marcus Webb', percent_complete: 35, source: 'seed' },
    { project_id: id, name: 'Data Migration', track: 'ADR', current_status: 'at_risk', lead: 'Sarah Chen', percent_complete: 20, source: 'seed' },
    { project_id: id, name: 'Change Management', track: 'Biggy', current_status: 'on_track', lead: 'Lisa Park', percent_complete: 50, source: 'seed' },
  ]).returning();

  // ── Milestones ──────────────────────────────────────────────────────────────
  const [m1, m2, m3] = await db.insert(milestones).values([
    { project_id: id, external_id: `M-${id}-001`, name: 'Kickoff & Discovery Complete', status: 'complete', date: fmt(addDays(TODAY, -45)), source: 'seed' },
    { project_id: id, external_id: `M-${id}-002`, name: 'UAT Sign-off', status: 'on_track', date: fmt(addDays(TODAY, 30)), source: 'seed' },
    { project_id: id, external_id: `M-${id}-003`, name: 'Go-Live', status: 'on_track', date: fmt(addDays(TODAY, 90)), source: 'seed' },
  ]).returning();

  // ── Tasks ───────────────────────────────────────────────────────────────────
  await db.insert(tasks).values([
    { project_id: id, title: 'Complete environment provisioning', owner: 'Marcus Webb', due: fmt(addDays(TODAY, 7)), status: 'in_progress', priority: 'high', phase: 'Infrastructure', workstream_id: ws1.id, milestone_id: m2.id, source: 'seed' },
    { project_id: id, title: 'Finalize data mapping document', owner: 'Sarah Chen', due: fmt(addDays(TODAY, 5)), status: 'todo', priority: 'critical', phase: 'Data Migration', workstream_id: ws2.id, milestone_id: m2.id, source: 'seed' },
    { project_id: id, title: 'Conduct end-user training sessions', owner: 'Lisa Park', due: fmt(addDays(TODAY, 21)), status: 'todo', priority: 'medium', phase: 'Change Management', workstream_id: ws3.id, milestone_id: m3.id, source: 'seed' },
    { project_id: id, title: 'Security review sign-off', owner: 'James O\'Brien', due: fmt(addDays(TODAY, 14)), status: 'todo', priority: 'high', phase: 'Infrastructure', workstream_id: ws1.id, milestone_id: m2.id, source: 'seed' },
    { project_id: id, title: 'Performance baseline testing', owner: 'Marcus Webb', due: fmt(addDays(TODAY, 10)), status: 'in_progress', priority: 'medium', phase: 'Infrastructure', workstream_id: ws1.id, source: 'seed' },
    { project_id: id, title: 'Stakeholder communication plan', owner: 'Lisa Park', due: fmt(addDays(TODAY, -5)), status: 'done', priority: 'low', phase: 'Change Management', workstream_id: ws3.id, source: 'seed' },
  ]);

  // ── Risks ───────────────────────────────────────────────────────────────────
  await db.insert(risks).values([
    { project_id: id, external_id: `R-${id}-001`, description: 'Data migration complexity may cause delays', severity: 'high', owner: 'Sarah Chen', mitigation: 'Engage specialist contractor, add 2-week buffer', status: 'open', likelihood: 'medium', impact: 'high', target_date: fmt(addDays(TODAY, 14)), source: 'seed' },
    { project_id: id, external_id: `R-${id}-002`, description: 'User adoption resistance from legacy system users', severity: 'medium', owner: 'Lisa Park', mitigation: 'Expand training program, identify change champions', status: 'open', likelihood: 'high', impact: 'medium', source: 'seed' },
    { project_id: id, external_id: `R-${id}-003`, description: 'Third-party vendor API deprecation', severity: 'critical', owner: 'Marcus Webb', mitigation: 'Evaluate alternative vendors, accelerate integration timeline', status: 'open', likelihood: 'low', impact: 'critical', source: 'seed' },
  ]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  await db.insert(actions).values([
    { project_id: id, external_id: `A-${id}-001`, description: 'Schedule architecture review with security team', owner: 'Marcus Webb', due: fmt(addDays(TODAY, 5)), status: 'open', source: 'seed' },
    { project_id: id, external_id: `A-${id}-002`, description: 'Confirm go-live date with executive sponsors', owner: 'Sarah Chen', due: fmt(addDays(TODAY, 3)), status: 'in_progress', source: 'seed' },
    { project_id: id, external_id: `A-${id}-003`, description: 'Share updated project charter with all stakeholders', owner: 'Lisa Park', due: fmt(addDays(TODAY, -2)), status: 'completed', source: 'seed' },
    { project_id: id, external_id: `A-${id}-004`, description: 'Review and approve data migration runbook', owner: 'James O\'Brien', due: fmt(addDays(TODAY, 10)), status: 'open', source: 'seed' },
  ]);

  // ── Engagement History ──────────────────────────────────────────────────────
  await db.insert(engagementHistory).values([
    { project_id: id, date: fmt(addDays(TODAY, -45)), content: 'Project kickoff meeting held. All workstream leads confirmed. Initial risks logged.', source: 'seed' },
    { project_id: id, date: fmt(addDays(TODAY, -21)), content: 'Sprint review: Infrastructure workstream on track. Data migration flagged as at-risk due to schema complexity.', source: 'seed' },
    { project_id: id, date: fmt(addDays(TODAY, -7)), content: 'Executive steering committee update delivered. Sponsor approved additional headcount for data migration workstream.', source: 'seed' },
    { project_id: id, date: fmt(TODAY), content: 'Weekly standup: UAT planning underway. Change management training materials 80% complete.', source: 'seed' },
  ]);

  // ── Key Decisions ───────────────────────────────────────────────────────────
  await db.insert(keyDecisions).values([
    { project_id: id, date: fmt(addDays(TODAY, -40)), decision: 'Phased rollout approach approved over big-bang cutover', context: 'Risk of business disruption too high for single cutover event', source: 'seed' },
    { project_id: id, date: fmt(addDays(TODAY, -15)), decision: 'Snowflake selected as data warehouse platform', context: 'Evaluated 3 vendors; Snowflake scored highest on scalability and cost', source: 'seed' },
  ]);

  // ── WBS — Standard BigPanda structure ───────────────────────────────────────
  // ADR Track: Discovery & Kickoff → Platform Configuration → UAT → Go-Live
  // Biggy Track: Discovery & Kickoff → Platform Configuration → Validation → Go-Live

  // ADR L1
  const [adr_dk] = await db.insert(wbsItems).values({ project_id: id, parent_id: null, level: 1, name: 'Discovery & Kickoff', track: 'ADR', status: 'complete', display_order: 0, start_date: fmt(addDays(TODAY, -60)), due_date: fmt(addDays(TODAY, -30)) }).returning();
  const [adr_pc] = await db.insert(wbsItems).values({ project_id: id, parent_id: null, level: 1, name: 'Platform Configuration', track: 'ADR', status: 'in_progress', display_order: 1, start_date: fmt(addDays(TODAY, -20)), due_date: fmt(addDays(TODAY, 30)) }).returning();
  const [adr_uat] = await db.insert(wbsItems).values({ project_id: id, parent_id: null, level: 1, name: 'UAT', track: 'ADR', status: 'not_started', display_order: 2, start_date: fmt(addDays(TODAY, 30)), due_date: fmt(addDays(TODAY, 60)) }).returning();
  const [adr_gl] = await db.insert(wbsItems).values({ project_id: id, parent_id: null, level: 1, name: 'Go-Live', track: 'ADR', status: 'not_started', display_order: 3, start_date: fmt(addDays(TODAY, 60)), due_date: fmt(addDays(TODAY, 90)) }).returning();

  // ADR L2 — Discovery & Kickoff steps
  await db.insert(wbsItems).values([
    { project_id: id, parent_id: adr_dk.id, level: 2, name: 'Kickoff', track: 'ADR', status: 'complete', display_order: 0, start_date: fmt(addDays(TODAY, -60)), due_date: fmt(addDays(TODAY, -55)) },
    { project_id: id, parent_id: adr_dk.id, level: 2, name: 'Workflow Discovery', track: 'ADR', status: 'complete', display_order: 1, start_date: fmt(addDays(TODAY, -55)), due_date: fmt(addDays(TODAY, -40)) },
    { project_id: id, parent_id: adr_dk.id, level: 2, name: 'Solution Design', track: 'ADR', status: 'complete', display_order: 2, start_date: fmt(addDays(TODAY, -40)), due_date: fmt(addDays(TODAY, -32)) },
    { project_id: id, parent_id: adr_dk.id, level: 2, name: 'Single Sign-On', track: 'ADR', status: 'complete', display_order: 3, start_date: fmt(addDays(TODAY, -35)), due_date: fmt(addDays(TODAY, -30)) },
  ]);

  // ADR L2 — Platform Configuration steps
  await db.insert(wbsItems).values([
    { project_id: id, parent_id: adr_pc.id, level: 2, name: 'Data Normalization', track: 'ADR', status: 'complete', display_order: 0, start_date: fmt(addDays(TODAY, -20)), due_date: fmt(addDays(TODAY, -10)) },
    { project_id: id, parent_id: adr_pc.id, level: 2, name: 'Environments', track: 'ADR', status: 'in_progress', display_order: 1, start_date: fmt(addDays(TODAY, -10)), due_date: fmt(addDays(TODAY, 5)) },
    { project_id: id, parent_id: adr_pc.id, level: 2, name: 'Incident Tags', track: 'ADR', status: 'in_progress', display_order: 2, start_date: fmt(addDays(TODAY, -5)), due_date: fmt(addDays(TODAY, 10)) },
    { project_id: id, parent_id: adr_pc.id, level: 2, name: 'Correlation', track: 'ADR', status: 'not_started', display_order: 3, start_date: fmt(addDays(TODAY, 10)), due_date: fmt(addDays(TODAY, 30)) },
  ]);

  // ADR L2 — UAT steps
  await db.insert(wbsItems).values([
    { project_id: id, parent_id: adr_uat.id, level: 2, name: 'Documentation', track: 'ADR', status: 'not_started', display_order: 0, start_date: fmt(addDays(TODAY, 30)), due_date: fmt(addDays(TODAY, 40)) },
    { project_id: id, parent_id: adr_uat.id, level: 2, name: 'Go-Live Prep', track: 'ADR', status: 'not_started', display_order: 1, start_date: fmt(addDays(TODAY, 40)), due_date: fmt(addDays(TODAY, 55)) },
    { project_id: id, parent_id: adr_uat.id, level: 2, name: 'UAT', track: 'ADR', status: 'not_started', display_order: 2, start_date: fmt(addDays(TODAY, 50)), due_date: fmt(addDays(TODAY, 60)) },
  ]);

  // ADR L2 — Go-Live
  await db.insert(wbsItems).values([
    { project_id: id, parent_id: adr_gl.id, level: 2, name: 'Go Live', track: 'ADR', status: 'not_started', display_order: 0, start_date: fmt(addDays(TODAY, 60)), due_date: fmt(addDays(TODAY, 90)) },
  ]);

  // Biggy L1
  const [big_dk] = await db.insert(wbsItems).values({ project_id: id, parent_id: null, level: 1, name: 'Discovery & Kickoff', track: 'Biggy', status: 'complete', display_order: 0, start_date: fmt(addDays(TODAY, -60)), due_date: fmt(addDays(TODAY, -35)) }).returning();
  const [big_pc] = await db.insert(wbsItems).values({ project_id: id, parent_id: null, level: 1, name: 'Platform Configuration', track: 'Biggy', status: 'in_progress', display_order: 1, start_date: fmt(addDays(TODAY, -20)), due_date: fmt(addDays(TODAY, 25)) }).returning();
  const [big_val] = await db.insert(wbsItems).values({ project_id: id, parent_id: null, level: 1, name: 'Validation', track: 'Biggy', status: 'not_started', display_order: 2, start_date: fmt(addDays(TODAY, 25)), due_date: fmt(addDays(TODAY, 60)) }).returning();
  const [big_gl] = await db.insert(wbsItems).values({ project_id: id, parent_id: null, level: 1, name: 'Go-Live', track: 'Biggy', status: 'not_started', display_order: 3, start_date: fmt(addDays(TODAY, 60)), due_date: fmt(addDays(TODAY, 90)) }).returning();

  // Biggy L2 — Discovery & Kickoff steps
  await db.insert(wbsItems).values([
    { project_id: id, parent_id: big_dk.id, level: 2, name: 'Kickoff', track: 'Biggy', status: 'complete', display_order: 0, start_date: fmt(addDays(TODAY, -60)), due_date: fmt(addDays(TODAY, -55)) },
    { project_id: id, parent_id: big_dk.id, level: 2, name: 'Single Sign-On', track: 'Biggy', status: 'complete', display_order: 1, start_date: fmt(addDays(TODAY, -50)), due_date: fmt(addDays(TODAY, -40)) },
    { project_id: id, parent_id: big_dk.id, level: 2, name: 'Security & Approvals', track: 'Biggy', status: 'complete', display_order: 2, start_date: fmt(addDays(TODAY, -40)), due_date: fmt(addDays(TODAY, -35)) },
  ]);

  // Biggy L2 — Platform Configuration steps
  await db.insert(wbsItems).values([
    { project_id: id, parent_id: big_pc.id, level: 2, name: 'Action Plans', track: 'Biggy', status: 'in_progress', display_order: 0, start_date: fmt(addDays(TODAY, -20)), due_date: fmt(addDays(TODAY, 0)) },
    { project_id: id, parent_id: big_pc.id, level: 2, name: 'Workflows', track: 'Biggy', status: 'in_progress', display_order: 1, start_date: fmt(addDays(TODAY, -10)), due_date: fmt(addDays(TODAY, 10)) },
    { project_id: id, parent_id: big_pc.id, level: 2, name: 'Managed Incident Channels', track: 'Biggy', status: 'not_started', display_order: 2, start_date: fmt(addDays(TODAY, 10)), due_date: fmt(addDays(TODAY, 25)) },
  ]);

  // Biggy L2 — Validation steps
  await db.insert(wbsItems).values([
    { project_id: id, parent_id: big_val.id, level: 2, name: 'Testing', track: 'Biggy', status: 'not_started', display_order: 0, start_date: fmt(addDays(TODAY, 25)), due_date: fmt(addDays(TODAY, 40)) },
    { project_id: id, parent_id: big_val.id, level: 2, name: 'Validation', track: 'Biggy', status: 'not_started', display_order: 1, start_date: fmt(addDays(TODAY, 40)), due_date: fmt(addDays(TODAY, 55)) },
    { project_id: id, parent_id: big_val.id, level: 2, name: 'Team Launch Prep', track: 'Biggy', status: 'not_started', display_order: 2, start_date: fmt(addDays(TODAY, 55)), due_date: fmt(addDays(TODAY, 60)) },
  ]);

  // Biggy L2 — Go-Live
  await db.insert(wbsItems).values([
    { project_id: id, parent_id: big_gl.id, level: 2, name: 'Go Live', track: 'Biggy', status: 'not_started', display_order: 0, start_date: fmt(addDays(TODAY, 60)), due_date: fmt(addDays(TODAY, 90)) },
  ]);

  // ── Business Outcomes ───────────────────────────────────────────────────────
  await db.insert(businessOutcomes).values([
    { project_id: id, title: 'Reduce manual processing time by 40%', track: 'ADR', delivery_status: 'in_progress', description: 'Automation of key workflows to reduce ops burden', source: 'seed' },
    { project_id: id, title: 'Achieve 99.9% system uptime SLA', track: 'ADR', delivery_status: 'planned', description: 'Infrastructure reliability target for production environment', source: 'seed' },
    { project_id: id, title: 'User adoption rate >80% within 30 days of go-live', track: 'Biggy', delivery_status: 'planned', description: 'Change management success metric', source: 'seed' },
  ]);

  // ── Focus Areas ─────────────────────────────────────────────────────────────
  await db.insert(focusAreas).values([
    { project_id: id, title: 'Data Migration Risk', tracks: 'ADR', why_it_matters: 'Schema complexity risks timeline', current_status: 'Mapping 60% complete, specialist engaged', next_step: 'Complete mapping by EOW', bp_owner: 'Sarah Chen', customer_owner: 'Marcus Webb', source: 'seed' },
    { project_id: id, title: 'User Adoption', tracks: 'Biggy', why_it_matters: 'Low adoption would undermine ROI', current_status: 'Training materials in draft', next_step: 'Schedule pilot training cohort', bp_owner: 'Lisa Park', customer_owner: 'James O\'Brien', source: 'seed' },
  ]);

  // ── Architecture ────────────────────────────────────────────────────────────
  // Track names must match component expectations: 'ADR' and 'Biggy AI'
  // Node names must match integration phase values for cards to appear in correct columns
  // Track names must exactly match what the component expects for color/icon routing
  const [adrTrack] = await db.insert(archTracks).values({ project_id: id, name: 'ADR Track', display_order: 1 }).returning();
  const [aiTrack]  = await db.insert(archTracks).values({ project_id: id, name: 'AI Assistant Track', display_order: 2 }).returning();

  // Insert ADR section nodes first (capturing IDs for parent_id references)
  const [sectionAI] = await db.insert(archNodes).values({
    project_id: id, track_id: adrTrack.id, name: 'Alert Intelligence',
    display_order: 10, status: 'planned', node_type: 'section', source_trace: 'seed',
  }).returning({ id: archNodes.id });

  const [sectionII] = await db.insert(archNodes).values({
    project_id: id, track_id: adrTrack.id, name: 'Incident Intelligence',
    display_order: 20, status: 'planned', node_type: 'section', source_trace: 'seed',
  }).returning({ id: archNodes.id });

  const [sectionWA] = await db.insert(archNodes).values({
    project_id: id, track_id: adrTrack.id, name: 'Workflow Automation',
    display_order: 30, status: 'planned', node_type: 'section', source_trace: 'seed',
  }).returning({ id: archNodes.id });

  // Insert Console node (between II and WA by display_order)
  await db.insert(archNodes).values({
    project_id: id, track_id: adrTrack.id, name: 'Console',
    display_order: 25, status: 'planned', node_type: 'console', source_trace: 'seed',
  });

  // Insert all 11 sub-capability nodes with parent_id references
  await db.insert(archNodes).values([
    { project_id: id, track_id: adrTrack.id, parent_id: sectionAI.id, name: 'Monitoring Integrations', display_order: 1, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionAI.id, name: 'Alert Normalization', display_order: 2, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionAI.id, name: 'Alert Enrichment', display_order: 3, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionII.id, name: 'Alert Correlation', display_order: 1, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionII.id, name: 'Incident Enrichment', display_order: 2, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionII.id, name: 'Incident Classification', display_order: 3, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionII.id, name: 'Suggested Root Cause', display_order: 4, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionWA.id, name: 'Environments', display_order: 1, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionWA.id, name: 'Automated Incident Creation', display_order: 2, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionWA.id, name: 'Automated Incident Notification', display_order: 3, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
    { project_id: id, track_id: adrTrack.id, parent_id: sectionWA.id, name: 'Automated Incident Remediation', display_order: 4, status: 'planned', node_type: 'sub-capability', source_trace: 'seed' },
  ]);

  // Insert AI Assistant Track nodes (unchanged flat structure)
  await db.insert(archNodes).values([
    { project_id: id, track_id: aiTrack.id,  name: 'Knowledge Sources',     status: 'planned', display_order: 1 },
    { project_id: id, track_id: aiTrack.id,  name: 'Real-Time Query',       status: 'planned', display_order: 2 },
    { project_id: id, track_id: aiTrack.id,  name: 'AI Capabilities',       status: 'planned', display_order: 3 },
    { project_id: id, track_id: aiTrack.id,  name: 'Console',               status: 'planned', display_order: 4 },
    { project_id: id, track_id: aiTrack.id,  name: 'Outputs & Actions',     status: 'planned', display_order: 5 },
  ]);

  await db.insert(architectureIntegrations).values([
    { project_id: id, tool_name: 'Datadog',    track: 'ADR Track',          phase: 'Monitoring Integrations',          integration_group: 'Monitoring', status: 'live',        integration_method: 'REST API', source: 'seed' },
    { project_id: id, tool_name: 'PagerDuty',  track: 'ADR Track',          phase: 'Monitoring Integrations',          integration_group: 'Alerting',   status: 'in_progress', integration_method: 'Webhook',  source: 'seed' },
    { project_id: id, tool_name: 'ServiceNow', track: 'ADR Track',          phase: 'Automated Incident Creation',      integration_group: 'ITSM',       status: 'planned',     integration_method: 'REST API', source: 'seed' },
    { project_id: id, tool_name: 'Confluence', track: 'AI Assistant Track', phase: 'Knowledge Sources',                integration_group: 'Docs',       status: 'in_progress', integration_method: 'REST API', source: 'seed' },
    { project_id: id, tool_name: 'Slack',      track: 'AI Assistant Track', phase: 'Outputs & Actions',                integration_group: 'Actions',    status: 'live',        integration_method: 'Webhook',  source: 'seed' },
  ]);

  // ── Team Onboarding Status ───────────────────────────────────────────────────
  await db.insert(teamOnboardingStatus).values([
    { project_id: id, team_name: 'Team Alpha', track: 'ADR',   source: 'seed' },
    { project_id: id, team_name: 'Team Beta',  track: 'Biggy', source: 'seed' },
  ]);

  // ── E2E Workflows ────────────────────────────────────────────────────────────
  const [wf1] = await db.insert(e2eWorkflows).values({ project_id: id, team_name: 'Team Alpha', workflow_name: 'Alert to Incident Resolution', source: 'seed' }).returning();
  const [wf2] = await db.insert(e2eWorkflows).values({ project_id: id, team_name: 'Team Beta',  workflow_name: 'Automated Runbook Execution',  source: 'seed' }).returning();

  await db.insert(workflowSteps).values([
    { workflow_id: wf1.id, label: 'Alert fires in source system',       track: 'ADR',   status: 'live',        position: 1 },
    { workflow_id: wf1.id, label: 'Normalized in BigPanda',             track: 'ADR',   status: 'live',        position: 2 },
    { workflow_id: wf1.id, label: 'Correlated to incident',             track: 'ADR',   status: 'in_progress', position: 3 },
    { workflow_id: wf1.id, label: 'Routed via action plan',             track: 'ADR',   status: 'planned',     position: 4 },
    { workflow_id: wf2.id, label: 'Incident triggers runbook',          track: 'Biggy', status: 'live',        position: 1 },
    { workflow_id: wf2.id, label: 'Biggy identifies resolution steps',  track: 'Biggy', status: 'in_progress', position: 2 },
    { workflow_id: wf2.id, label: 'Actions dispatched to integrations', track: 'Biggy', status: 'planned',     position: 3 },
  ]);

  // ── Team Engagement ─────────────────────────────────────────────────────────
  await db.insert(teamEngagementSections).values([
    { project_id: id, name: 'Current Blockers', content: 'Data mapping sign-off delayed pending legal review of data residency requirements.', display_order: 0 },
    { project_id: id, name: 'Wins This Week', content: 'Environment provisioning completed 3 days ahead of schedule. Security baseline passed initial review.', display_order: 1 },
    { project_id: id, name: 'Next Week Priorities', content: '1. Complete data mapping document\n2. Schedule UAT kickoff\n3. Distribute training materials for pilot group', display_order: 2 },
  ]);

  console.log(`  ✓ Project ${id}: ${def.name}`);
}

async function main() {
  console.log('Seeding projects...');

  await seedProject({
    id: 1,
    name: 'Acme Corp',
    description: 'Cloud infrastructure migration from on-premises data center to AWS. Includes lift-and-shift of 40 applications with re-platforming of 8 core systems.',
    goLive: fmt(addDays(TODAY, 90)),
    overallStatus: 'on_track',
    statusSummary: 'Infrastructure workstream progressing well. Data migration flagged at-risk due to schema complexity. Change management on track.',
  });

  await seedProject({
    id: 2,
    name: 'Globex Inc',
    description: 'Enterprise Salesforce CRM deployment replacing legacy system. Covers Sales Cloud, Service Cloud, and custom CPQ configuration for 500 users.',
    goLive: fmt(addDays(TODAY, 120)),
    overallStatus: 'at_risk',
    statusSummary: 'CRM configuration 45% complete. Integration with ERP behind schedule. User adoption program requires acceleration.',
  });

  await seedProject({
    id: 3,
    name: 'Initech',
    description: 'Snowflake data warehouse implementation consolidating 6 source systems. Includes ETL pipeline build, BI dashboard migration, and self-service analytics enablement.',
    goLive: fmt(addDays(TODAY, 150)),
    overallStatus: 'on_track',
    statusSummary: 'Discovery phase complete. ETL design approved. Pipeline development begins next sprint. Strong executive support.',
  });

  console.log('\nDone. All 3 projects fully seeded.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
