/**
 * seed-apex.ts — Create and populate "Apex Financial — AIOps Transformation" demo project.
 *
 * Run (Docker): docker exec install-app-1 npx tsx scripts/seed-apex.ts
 *
 * Scenario: Mid-size financial services company. ADR pipeline live for core IT; Splunk trading
 * system integration just completed staging. Biggy AI pilot planned for NOC. ServiceNow
 * automation in UAT. Project is yellow: Splunk security review caused a 2-week delay
 * now resolved, and a new PS engineer (Alex Chen) is finishing onboarding.
 *
 * Every UI tab is covered: WBS (ADR + Biggy L1/L2), Architecture (ADR Track + Biggy AI Track),
 * Teams, Stakeholders, Actions, Risks, Milestones, Decisions, Focus Areas, Onboarding, etc.
 *
 * Idempotent: finds or creates by name, uses external_id / name uniqueness checks.
 */

import { db } from '../db/index';
import {
  projects,
  projectMembers,
  actions,
  risks,
  milestones,
  artifacts,
  engagementHistory,
  keyDecisions,
  stakeholders,
  workstreams,
  businessOutcomes,
  e2eWorkflows,
  workflowSteps,
  focusAreas,
  architectureIntegrations,
  teamOnboardingStatus,
  onboardingPhases,
  onboardingSteps,
  integrations,
  tasks,
  wbsItems,
  archTracks,
  archNodes,
  beforeState,
  teamPathways,
  knowledgeBase,
  users,
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const PROJECT_NAME = 'Apex Financial — AIOps Transformation';

async function seed() {
  // ── Find admin user ───────────────────────────────────────────────────────
  const [adminUser] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'admin@localhost.dev'))
    .limit(1);
  const adminUserId = adminUser?.id ?? null;

  // ── Find or create project ────────────────────────────────────────────────
  let projectId: number;
  const existing = await db.select({ id: projects.id })
    .from(projects)
    .where(eq(projects.name, PROJECT_NAME))
    .limit(1);

  if (existing.length > 0) {
    projectId = existing[0].id;
    console.log(`Found existing project: "${PROJECT_NAME}" (id=${projectId})`);
  } else {
    const [row] = await db.insert(projects).values({
      name: PROJECT_NAME,
      customer: 'Apex Financial Services',
      overall_status: 'yellow',
      status_summary: 'Core IT alert pipeline live. Splunk trading system integration completed staging — production cutover targeting May 30. Biggy AI pilot design in progress. ServiceNow webhook UAT underway. New PS engineer Alex Chen fully onboarded after knowledge transfer from original lead.',
      go_live_target: '2026-09-01',
      last_updated: '2026-04-28',
      description: 'AIOps transformation for Apex Financial covering alert correlation across core banking, trading platform, and network infrastructure. Phase 1 delivers ADR correlation and ServiceNow automation for the IT Operations Center. Phase 2 adds Biggy AI incident intelligence and extends coverage to trading system alerts.',
      start_date: '2026-01-15',
      end_date: '2026-10-31',
      active_tracks: { adr: true, biggy: true },
    }).returning({ id: projects.id });
    projectId = row.id;
    console.log(`Created new project: "${PROJECT_NAME}" (id=${projectId})`);
  }

  await db.update(projects).set({
    overall_status: 'yellow',
    status_summary: 'Core IT alert pipeline live. Splunk trading system integration completed staging — production cutover targeting May 30. Biggy AI pilot design in progress. ServiceNow webhook UAT underway. New PS engineer Alex Chen fully onboarded after knowledge transfer from original lead.',
    go_live_target: '2026-09-01',
    last_updated: '2026-04-28',
    description: 'AIOps transformation for Apex Financial covering alert correlation across core banking, trading platform, and network infrastructure. Phase 1 delivers ADR correlation and ServiceNow automation for the IT Operations Center. Phase 2 adds Biggy AI incident intelligence and extends coverage to trading system alerts.',
    start_date: '2026-01-15',
    end_date: '2026-10-31',
    active_tracks: { adr: true, biggy: true },
  }).where(eq(projects.id, projectId));

  // ── Add admin as project member ───────────────────────────────────────────
  if (adminUserId) {
    const existingMember = await db.select({ id: projectMembers.id })
      .from(projectMembers)
      .where(sql`${projectMembers.project_id} = ${projectId} AND ${projectMembers.user_id} = ${adminUserId}`)
      .limit(1);
    if (existingMember.length === 0) {
      await db.insert(projectMembers).values({ project_id: projectId, user_id: adminUserId, role: 'admin' });
      console.log('  ✓ Admin project member');
    }
  }

  // ─── Before State ─────────────────────────────────────────────────────────
  const existingBefore = await db.select({ id: beforeState.id })
    .from(beforeState).where(eq(beforeState.project_id, projectId)).limit(1);
  if (existingBefore.length === 0) {
    await db.insert(beforeState).values({
      project_id: projectId,
      aggregation_hub_name: 'Splunk ITSI',
      alert_to_ticket_problem: 'IT Operations Center receives 12,000+ alerts per day from banking, trading, and network systems. Splunk ITSI correlation rules are manually maintained and stale. NOC analysts manually create ServiceNow tickets for every escalation — average 4.2 tickets per P1 incident due to duplication. Trading system alerts arrive through a separate Splunk instance with no integration to the main NOC workflow.',
      pain_points_json: [
        'Manual Splunk ITSI correlation rules not updated in 18 months — 58% false positive rate on trading alerts',
        'P1 MTTA averaging 45 minutes against a 20-minute SLA target — 4 SLA misses in Q1 2026',
        'Trading system alerts completely siloed from NOC — no cross-domain visibility between banking and trading platform incidents',
        'ServiceNow ticket duplication: average 4.2 tickets per P1 incident across NOC, application support, and trading ops teams',
        'No enrichment: alerts arrive with no business context — NOC analysts must manually look up affected services in CMDB',
        'On-call escalation still manual — PagerDuty not integrated with NOC workflow',
      ],
      source: 'manual',
    });
    console.log('  ✓ Before State');
  }

  // ─── Artifacts ────────────────────────────────────────────────────────────
  const artifactDefs = [
    { external_id: 'X-APEX-001', name: 'Apex Financial AIOps Kickoff Deck', status: 'approved', owner: 'Rachel Kim', description: 'Kickoff presentation: project scope, two-phase delivery plan, team onboarding sequence, and SLA improvement targets.' },
    { external_id: 'X-APEX-002', name: 'ADR Correlation Policy Design — v1.0', status: 'approved', owner: 'Daniel Park', description: 'Correlation policy design covering 4 alert domains: core banking infrastructure, network, trading platform, and application layer.' },
    { external_id: 'X-APEX-003', name: 'Splunk Integration Security Review Package', status: 'approved', owner: 'Rachel Kim', description: 'Security documentation submitted to Apex InfoSec team. Covers data handling, PCI-DSS field exclusion design, and BigPanda network access requirements.' },
    { external_id: 'X-APEX-004', name: 'ServiceNow Webhook UAT Plan', status: 'in_progress', owner: 'Daniel Park', description: 'UAT test plan for ServiceNow bi-directional integration: incident create, update, and auto-close scenarios.' },
    { external_id: 'X-APEX-005', name: 'Weekly Status — Week of 2026-04-21', status: 'sent', owner: 'Rachel Kim', description: 'Status update: Splunk security approval received, Alex Chen onboarding complete, ServiceNow UAT in progress.' },
    { external_id: 'X-APEX-006', name: 'Biggy AI Pilot Design Document', status: 'in_progress', owner: 'Daniel Park', description: 'Pilot design for Biggy AI incident intelligence — NOC team. Incident types, enrichment fields, accuracy measurement methodology.' },
  ];

  const artifactIds: Record<string, number> = {};
  for (const art of artifactDefs) {
    const ex = await db.select({ id: artifacts.id }).from(artifacts)
      .where(sql`${artifacts.project_id} = ${projectId} AND ${artifacts.external_id} = ${art.external_id}`)
      .limit(1);
    if (ex.length === 0) {
      const [row] = await db.insert(artifacts).values({ project_id: projectId, source: 'manual', ...art }).returning({ id: artifacts.id });
      artifactIds[art.external_id] = row.id;
      console.log(`  ✓ Artifact ${art.external_id}`);
    } else {
      artifactIds[art.external_id] = ex[0].id;
    }
  }

  // ─── Stakeholders ─────────────────────────────────────────────────────────
  const stakeholderDefs = [
    { name: 'Rachel Kim', role: 'BigPanda PS Lead', company: 'BigPanda', email: 'rachel.kim@bigpanda.io', notes: 'Primary delivery lead. Owns executive relationship and weekly status distribution.' },
    { name: 'Daniel Park', role: 'BigPanda Integration Engineer', company: 'BigPanda', email: 'daniel.park@bigpanda.io', notes: 'Alert source integrations, Splunk design, ServiceNow webhook owner.' },
    { name: 'Alex Chen', role: 'BigPanda PS Engineer', company: 'BigPanda', email: 'alex.chen@bigpanda.io', notes: 'New PS engineer replacing original tech lead. Knowledge transfer from Rachel Kim completed April 28. Primary technical lead for trading system integration.' },
    { name: 'Marcus Okafor', role: 'VP IT Operations', company: 'Apex Financial', email: 'm.okafor@apexfinancial.com', notes: 'Executive sponsor. P1 SLA accountability. Quarterly business reviews.' },
    { name: 'Priya Sharma', role: 'IT Operations Center Manager', company: 'Apex Financial', email: 'p.sharma@apexfinancial.com', notes: 'NOC primary contact. Day-to-day delivery partner. Championing BigPanda adoption.' },
    { name: 'Kevin Walsh', role: 'InfoSec Director', company: 'Apex Financial', email: 'k.walsh@apexfinancial.com', notes: 'Owns security review for all new integrations. PCI-DSS compliance authority. Approved Splunk integration April 25.' },
    { name: 'Sandra Torres', role: 'ITSM Manager (ServiceNow)', company: 'Apex Financial', email: 's.torres@apexfinancial.com', notes: 'ServiceNow webhook owner. Manages change windows and production approval.' },
    { name: 'James Liu', role: 'Trading Platform Infrastructure Lead', company: 'Apex Financial', email: 'j.liu@apexfinancial.com', notes: 'Splunk trading instance owner. SME for trading system alert taxonomy and blast radius mapping.' },
  ];

  for (const s of stakeholderDefs) {
    const ex = await db.select({ id: stakeholders.id }).from(stakeholders)
      .where(sql`${stakeholders.project_id} = ${projectId} AND ${stakeholders.name} = ${s.name}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(stakeholders).values({ project_id: projectId, source: 'manual', ...s });
      console.log(`  ✓ Stakeholder ${s.name}`);
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  const actionDefs = [
    { external_id: 'A-APEX-001', description: 'Configure Splunk HEC integration for trading system alerts — deliver BigPanda data handling documentation and obtain InfoSec approval', owner: 'Daniel Park', due: '2026-04-25', status: 'in_progress' as const, notes: 'InfoSec review submitted April 15. Kevin Walsh scheduled final review April 25. Blocking Splunk production cutover.', type: 'action' },
    { external_id: 'A-APEX-002', description: 'Run correlation policy design workshop with NOC team — define alert grouping rules for core banking, trading, and network domains', owner: 'Rachel Kim', due: '2026-04-24', status: 'open' as const, notes: 'Workshop scheduled April 24 with Priya Sharma and NOC team leads. Agenda and pre-read sent April 21.', type: 'action' },
    { external_id: 'A-APEX-003', description: 'Complete ServiceNow webhook UAT — validate incident create, update, and auto-close flows across all 6 test scenarios', owner: 'Daniel Park', due: '2026-05-09', status: 'open' as const, notes: 'UAT environment configured. Test scenarios defined in X-APEX-004. Sandra Torres confirmed UAT window May 5–9.', type: 'action' },
    { external_id: 'A-APEX-004', description: 'Finalize Biggy AI pilot scope with Marcus Okafor — confirm incident types, NOC team participants, and success metrics before pilot launch', owner: 'Rachel Kim', due: '2026-05-16', status: 'open' as const, notes: 'Pilot design document (X-APEX-006) in progress. Daniel Park drafting incident type recommendations. Meeting with Marcus Okafor targeting May 14.', type: 'action' },
    { external_id: 'A-APEX-005', description: 'Prepare Q2 2026 executive business review deck — include SLA improvement metrics, Splunk integration progress, and Phase 2 roadmap', owner: 'Rachel Kim', due: '2026-05-20', status: 'open' as const, notes: 'QBR scheduled with Marcus Okafor for May 22. Deck to cover Phase 1 metrics and Phase 2 Biggy AI timeline.', type: 'action' },
    { external_id: 'A-APEX-006', description: 'Complete knowledge transfer for new PS engineer (Alex Chen) — deliver full project briefing, integration design walkthroughs, and trading system context sessions', owner: 'Rachel Kim', due: '2026-04-28', status: 'in_progress' as const, notes: 'Alex Chen joined team April 14. Rachel Kim running 4 knowledge transfer sessions. Final session on Splunk trading integration design scheduled April 28.', type: 'action' },
    { external_id: 'Q-APEX-001', description: 'Should Splunk trading alerts include PCI-DSS cardholder data fields (card BIN, transaction amounts) or must masking be applied at Splunk forwarder level before BigPanda ingestion?', owner: 'Kevin Walsh (InfoSec)', due: 'TBD', status: 'open' as const, notes: 'Raised during InfoSec review. Kevin Walsh to confirm PCI-DSS field policy with compliance team. Impacts enrichment field design for trading alerts.', type: 'question' },
  ];

  for (const a of actionDefs) {
    const ex = await db.select({ id: actions.id }).from(actions)
      .where(sql`${actions.project_id} = ${projectId} AND ${actions.external_id} = ${a.external_id}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(actions).values({ project_id: projectId, source: 'manual', ...a });
      console.log(`  ✓ Action ${a.external_id}`);
    }
  }

  // ─── Risks ────────────────────────────────────────────────────────────────
  const riskDefs = [
    { external_id: 'R-APEX-001', description: 'Splunk security review may delay trading system alert integration 3–4 weeks, pushing Phase 1 correlation baseline and Splunk production cutover', severity: 'medium' as const, owner: 'Kevin Walsh', mitigation: 'InfoSec review package submitted April 15. Rachel Kim escalated to Marcus Okafor for prioritization. Parallel configuration work in staging to maintain momentum during review period.', status: 'open', last_updated: '2026-04-21', likelihood: 'medium', impact: 'medium', target_date: '2026-04-25' },
    { external_id: 'R-APEX-002', description: 'PCI-DSS compliance requirements may restrict Biggy AI enrichment fields from referencing cardholder transaction data in ServiceNow ticket descriptions', severity: 'medium' as const, owner: 'Kevin Walsh', mitigation: 'Designed masked enrichment mode as default for all trading alerts — transaction amounts and card BINs omitted from ITSM ticket fields. Full data available in BigPanda incident context for authorized NOC users only. Question Q-APEX-001 raised with compliance team.', status: 'open', last_updated: '2026-04-18', likelihood: 'low', impact: 'high', target_date: '2026-05-15' },
    { external_id: 'R-APEX-003', description: 'PS engineer transition (original tech lead replaced by Alex Chen) creates knowledge gap risk for Splunk trading system integration — potential 2-week schedule impact', severity: 'high' as const, owner: 'Rachel Kim', mitigation: 'Structured 4-session knowledge transfer plan designed by Rachel Kim. Sessions cover: project context, ADR correlation design, Splunk integration architecture, and trading system alert taxonomy. Documentation of all integration decisions being compiled in shared runbook.', status: 'open', last_updated: '2026-04-21', likelihood: 'medium', impact: 'high', target_date: '2026-04-28' },
    { external_id: 'R-APEX-004', description: 'ServiceNow upgrade scheduled Q3 2026 may require BigPanda webhook reconfiguration during peak delivery period', severity: 'low' as const, owner: 'Sandra Torres', mitigation: 'Confirmed ServiceNow upgrade will not change webhook REST interface. Sandra Torres to notify BigPanda PS 4 weeks before upgrade window. No action required until Q3. Accepted risk — no impact to Phase 1 timeline.', status: 'accepted', last_updated: '2026-04-10', likelihood: 'low', impact: 'low', target_date: 'TBD' },
    { external_id: 'R-APEX-005', description: 'James Liu (Trading Platform Infrastructure Lead) is sole SME for Splunk trading instance configuration — single point of failure for correlation policy tuning', severity: 'medium' as const, owner: 'Rachel Kim', mitigation: 'Requesting backup SME from Trading Platform team. James Liu documenting alarm taxonomy in shared runbook. Knowledge transfer session with Alex Chen scheduled for May 3.', status: 'open', last_updated: '2026-04-21', likelihood: 'low', impact: 'high', target_date: '2026-05-10' },
  ];

  for (const r of riskDefs) {
    const ex = await db.select({ id: risks.id }).from(risks)
      .where(sql`${risks.project_id} = ${projectId} AND ${risks.external_id} = ${r.external_id}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(risks).values({ project_id: projectId, source: 'manual', ...r });
      console.log(`  ✓ Risk ${r.external_id}`);
    }
  }

  // ─── Milestones ───────────────────────────────────────────────────────────
  const milestoneDefs = [
    { external_id: 'M-APEX-001', name: 'Phase 1 Kickoff & Discovery Complete', status: 'complete' as const, date: '2026-02-14', owner: 'Rachel Kim', notes: 'Kickoff deck delivered. Current state discovery complete. Alert source inventory confirmed: Dynatrace, SolarWinds, Nagios, PagerDuty, Splunk (trading).' },
    { external_id: 'M-APEX-002', name: 'Core IT Alert Sources — Staging Integration Complete', status: 'complete' as const, date: '2026-03-28', owner: 'Daniel Park', notes: 'Dynatrace, SolarWinds, Nagios, and PagerDuty all live in staging. Correlation policy baseline tested at 2x expected volume. Splunk trading instance pending InfoSec approval.' },
    { external_id: 'M-APEX-003', name: 'Splunk Trading System Integration — Production Cutover', status: 'at_risk' as const, date: '2026-05-30', owner: 'Daniel Park', notes: 'InfoSec approval received April 25. Staging integration complete. Production cutover targeting May 30 — 2 weeks later than original May 15 target due to security review delay.' },
    { external_id: 'M-APEX-004', name: 'Correlation Policy Baseline — Production Go-Live', status: 'on_track' as const, date: '2026-06-15', owner: 'Rachel Kim', notes: 'Correlation workshop scheduled April 24. Policy design (X-APEX-002) approved. Production go-live dependent on Splunk trading integration completing first.' },
    { external_id: 'M-APEX-005', name: 'ServiceNow Automation — Production Go-Live', status: 'on_track' as const, date: '2026-07-01', owner: 'Daniel Park', notes: 'UAT environment configured. Test window May 5–9. Production cutover targeting July 1 pending UAT sign-off from Sandra Torres.' },
    { external_id: 'M-APEX-006', name: 'Biggy AI Pilot — NOC Team (6-week pilot)', status: 'on_track' as const, date: '2026-08-01', owner: 'Rachel Kim', notes: 'Pilot design in progress. Scope to be finalized with Marcus Okafor (May 14). Pilot launch targeting June 16 after correlation baseline is stable.' },
    { external_id: 'M-APEX-007', name: 'Full Production Go-Live — All Systems', status: 'on_track' as const, date: '2026-09-01', owner: 'Rachel Kim', notes: 'All Phase 1 + Phase 2 systems live. Biggy AI pilot complete and production rollout confirmed. ServiceNow automation running. Splunk trading integration stable.' },
  ];

  const milestoneIds: Record<string, number> = {};
  for (const m of milestoneDefs) {
    const ex = await db.select({ id: milestones.id }).from(milestones)
      .where(sql`${milestones.project_id} = ${projectId} AND ${milestones.external_id} = ${m.external_id}`)
      .limit(1);
    if (ex.length === 0) {
      const [row] = await db.insert(milestones).values({ project_id: projectId, source: 'manual', ...m }).returning({ id: milestones.id });
      milestoneIds[m.external_id] = row.id;
      console.log(`  ✓ Milestone ${m.external_id}`);
    } else {
      milestoneIds[m.external_id] = ex[0].id;
    }
  }

  // ─── Engagement History ───────────────────────────────────────────────────
  const historyDefs = [
    { date: '2026-04-21', content: 'Weekly sync with Apex Financial IT Operations team. Rachel Kim presented project status. Kevin Walsh confirmed InfoSec review of Splunk integration package on track for April 25 decision. Alex Chen introduced as new PS engineer. Priya Sharma confirmed ServiceNow UAT window May 5–9 with Sandra Torres.' },
    { date: '2026-04-14', content: 'Alex Chen onboarding session 1 of 4: project context, stakeholder map, and delivery timeline walkthrough. Rachel Kim delivered full project briefing and BigPanda architecture overview. Alex reviewed all 6 artifact documents.' },
    { date: '2026-04-10', content: 'InfoSec review submission meeting with Kevin Walsh. Rachel Kim and Daniel Park presented BigPanda data handling documentation, PCI-DSS field masking design, and network access requirements. Kevin Walsh requested additional documentation on Splunk HEC encryption method. Daniel Park to deliver by April 14.' },
    { date: '2026-03-28', content: 'M-APEX-002 closed: Dynatrace, SolarWinds, Nagios, and PagerDuty all live in BigPanda staging. Correlation policy baseline tested at 2x expected volume — 94% correlation accuracy on test incident set. Splunk trading instance delayed due to InfoSec review. Rachel Kim notified Marcus Okafor of 2-week risk.' },
    { date: '2026-03-14', content: 'Solution design review with Priya Sharma and James Liu. ADR correlation policy design (X-APEX-002) reviewed and approved. James Liu confirmed Splunk trading instance alert taxonomy — 8 primary alert categories, 240+ alert types. PCI-DSS masking requirement for cardholder fields confirmed.' },
    { date: '2026-02-14', content: 'M-APEX-001 closed: kickoff and discovery complete. Alert source inventory confirmed. Current state: Splunk ITSI as primary aggregation hub, 4.2 ServiceNow tickets per P1 incident, 45-minute MTTA. Go-live target September 1 confirmed with Marcus Okafor.' },
    { date: '2026-01-15', content: 'Project kickoff at Apex Financial New York headquarters. Marcus Okafor opened with business case: 4 P1 SLA misses in Q1 2025, $1.8M in operational penalties, zero cross-domain visibility between banking and trading IT. Two-phase delivery plan agreed. Weekly Monday sync cadence set. Team introductions completed.' },
  ];

  for (const h of historyDefs) {
    const ex = await db.select({ id: engagementHistory.id }).from(engagementHistory)
      .where(sql`${engagementHistory.project_id} = ${projectId} AND ${engagementHistory.date} = ${h.date}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(engagementHistory).values({ project_id: projectId, source: 'manual', ...h });
      console.log(`  ✓ History ${h.date}`);
    }
  }

  // ─── Key Decisions ────────────────────────────────────────────────────────
  const decisionDefs = [
    { date: '2026-04-10', decision: 'PCI-DSS masked enrichment mode adopted as default for all Splunk trading alerts — cardholder transaction fields excluded from ServiceNow ticket descriptions', context: 'Decision made in InfoSec review prep session with Kevin Walsh and Daniel Park. Full transaction data retained in BigPanda incident context for authorized NOC users. Masked mode ensures PCI-DSS compliance while preserving alert intelligence for triage.' },
    { date: '2026-03-14', decision: 'Splunk trading instance integrated via HEC (HTTP Event Collector) directly into BigPanda — not via Splunk ITSI forwarding', context: 'James Liu confirmed ITSI forwarding would include aggregated ITSI episodes rather than raw events, losing alert-level fidelity. Direct HEC integration preserves granular alert context needed for BigPanda correlation. Daniel Park to design HEC integration per X-APEX-003 (referenced as X-APEX-002 in design doc).' },
    { date: '2026-02-14', decision: 'Phase 2 Biggy AI pilot scoped to NOC team only — trading ops team deferred to Phase 2b', context: 'Risk-based scoping decision made in kickoff. NOC team has cleaner data and more standardized incident types. Trading ops team has PCI-DSS complexity that requires full correlation baseline before AI can be safely applied. Phase 2b explicitly scoped to trading ops after NOC pilot results are in.' },
    { date: '2026-01-15', decision: 'BigPanda will replace Splunk ITSI as the primary alert correlation layer — Splunk remains as event forwarder only', context: 'Marcus Okafor confirmed IT Operations budget includes Splunk ITSI decommission by Dec 2026. BigPanda correlation engine will replace all ITSI episode-based alerting. Splunk retained as a log and event source only (HEC forwarding to BigPanda). NOC team will migrate from ITSI console to BigPanda console.' },
  ];

  for (const d of decisionDefs) {
    const ex = await db.select({ id: keyDecisions.id }).from(keyDecisions)
      .where(sql`${keyDecisions.project_id} = ${projectId} AND ${keyDecisions.decision} = ${d.decision}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(keyDecisions).values({ project_id: projectId, source: 'manual', ...d });
      console.log(`  ✓ Decision: ${d.decision.substring(0, 60)}...`);
    }
  }

  // ─── Workstreams ──────────────────────────────────────────────────────────
  const workstreamDefs = [
    { name: 'ADR — Core IT Alert Correlation', track: 'ADR', current_status: 'Core IT sources live in staging. Dynatrace, SolarWinds, Nagios, PagerDuty all ingesting. Correlation baseline tested. Production go-live June 15 pending Splunk trading integration.', lead: 'Daniel Park', last_updated: '2026-04-21', state: 'green', percent_complete: 65 },
    { name: 'ADR — Splunk Trading System Integration', track: 'ADR', current_status: 'InfoSec approval received April 25. Staging HEC integration complete. Production cutover targeting May 30. 2-week delay from original plan due to security review.', lead: 'Daniel Park', last_updated: '2026-04-25', state: 'yellow', percent_complete: 55 },
    { name: 'ADR — ServiceNow ITSM Automation', track: 'ADR', current_status: 'UAT environment configured. Test window May 5–9 with Sandra Torres. Production targeting July 1.', lead: 'Daniel Park', last_updated: '2026-04-21', state: 'green', percent_complete: 45 },
    { name: 'Biggy AI — NOC Pilot', track: 'Biggy', current_status: 'Pilot design document in progress. Incident type scope being finalized. Scope review with Marcus Okafor targeting May 14. Pilot launch planned June 16.', lead: 'Rachel Kim', last_updated: '2026-04-21', state: 'green', percent_complete: 15 },
  ];

  for (const ws of workstreamDefs) {
    const ex = await db.select({ id: workstreams.id }).from(workstreams)
      .where(sql`${workstreams.project_id} = ${projectId} AND ${workstreams.name} = ${ws.name}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(workstreams).values({ project_id: projectId, source: 'manual', ...ws });
      console.log(`  ✓ Workstream: ${ws.name}`);
    }
  }

  // ─── Business Outcomes ────────────────────────────────────────────────────
  const outcomeDefs = [
    { title: 'Reduce P1 MTTA from 45 min to under 20 min', track: 'ADR', description: 'Alert correlation eliminates manual alert storm triage. Biggy AI guided remediation provides instant context at acknowledge time.', delivery_status: 'in_progress' as const, mapping_note: 'Current MTTA: 45 min. Target: 20 min. Correlation baseline required first (M-APEX-004). Biggy AI pilot (M-APEX-006) adds additional MTTA reduction. Full improvement expected after both milestones.' },
    { title: 'Eliminate ServiceNow ticket duplication — one incident, one ticket', track: 'ADR', description: 'BigPanda correlation groups related alerts into a single incident. ServiceNow automation creates one ticket per incident, not per alert.', delivery_status: 'in_progress' as const, mapping_note: 'Pre-BigPanda: 4.2 tickets per P1. Current: still manual. ServiceNow automation (M-APEX-005) will deliver this. Expected ticket reduction 75%+ after go-live.' },
    { title: 'Unify banking and trading alert visibility in single NOC console', track: 'ADR', description: 'Splunk trading alerts currently completely siloed from banking and network monitoring. BigPanda provides unified correlation across all domains.', delivery_status: 'in_progress' as const, mapping_note: 'Core IT sources unified in staging. Splunk trading (M-APEX-003) will complete the unified view. Full delivery after May 30 production cutover.' },
    { title: 'Zero P1 SLA breaches for FY2026 H2', track: 'Biggy', description: 'Combination of ADR correlation, Biggy AI context, and ServiceNow automation removes the conditions causing SLA breaches.', delivery_status: 'planned' as const, mapping_note: 'H1 2026: 4 SLA misses (Q1). H2 target: 0 breaches. Requires Biggy AI pilot success and full production rollout (M-APEX-007) to deliver.' },
    { title: 'Decommission Splunk ITSI as aggregation hub by Dec 2026', track: 'ADR', description: 'Full migration from Splunk ITSI correlation to BigPanda. Splunk retained as event forwarder only.', delivery_status: 'planned' as const, mapping_note: 'Decision confirmed at kickoff. Splunk ITSI dark by Dec 2026. Dependent on BigPanda correlation baseline stable and NOC team fully migrated to BigPanda console.' },
  ];

  for (const o of outcomeDefs) {
    const ex = await db.select({ id: businessOutcomes.id }).from(businessOutcomes)
      .where(sql`${businessOutcomes.project_id} = ${projectId} AND ${businessOutcomes.title} = ${o.title}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(businessOutcomes).values({ project_id: projectId, source: 'manual', ...o });
      console.log(`  ✓ Outcome: ${o.title.substring(0, 55)}`);
    }
  }

  // ─── Team Onboarding Status ───────────────────────────────────────────────
  const teamDefs = [
    { team_name: 'IT Operations Center (NOC)', track: 'ADR', ingest_status: 'in_progress' as const, correlation_status: 'in_progress' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'in_progress' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'Trading Operations', track: 'ADR', ingest_status: 'in_progress' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'Application Support', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
  ];

  for (const t of teamDefs) {
    const ex = await db.select({ id: teamOnboardingStatus.id }).from(teamOnboardingStatus)
      .where(sql`${teamOnboardingStatus.project_id} = ${projectId} AND ${teamOnboardingStatus.team_name} = ${t.team_name}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(teamOnboardingStatus).values({ project_id: projectId, source: 'manual', ...t });
      console.log(`  ✓ Team: ${t.team_name}`);
    }
  }

  // ─── Architecture Integrations ────────────────────────────────────────────
  // track must match arch_tracks.name exactly; phase must match arch_nodes.name exactly
  const archIntegDefs = [
    // ADR Track — Event Ingest
    { tool_name: 'Dynatrace', track: 'ADR Track', phase: 'Event Ingest', status: 'live' as const, integration_method: 'Webhook + OneAgent', notes: 'Live in staging. APM + infrastructure for banking application layer.' },
    { tool_name: 'SolarWinds NPM', track: 'ADR Track', phase: 'Event Ingest', status: 'live' as const, integration_method: 'SNMP Trap + REST API', notes: 'Live in staging. Network infrastructure — core banking and trading network.' },
    { tool_name: 'Nagios', track: 'ADR Track', phase: 'Event Ingest', status: 'live' as const, integration_method: 'SNMP Trap', notes: 'Live in staging. Legacy server checks. Noise suppression policy active.' },
    { tool_name: 'PagerDuty', track: 'ADR Track', phase: 'Event Ingest', status: 'live' as const, integration_method: 'REST API v2', notes: 'Live in staging. On-call escalation and P1/P2 alerting.' },
    { tool_name: 'Splunk (Trading System)', track: 'ADR Track', phase: 'Event Ingest', status: 'in_progress' as const, integration_method: 'HTTP Event Collector (HEC)', notes: 'Staging HEC integration complete. InfoSec approved April 25. Production cutover targeting May 30.' },
    // ADR Track — Alert Intelligence
    { tool_name: 'Apex CMDB (ServiceNow)', track: 'ADR Track', phase: 'Alert Intelligence', status: 'live' as const, integration_method: 'ServiceNow REST API', notes: 'Live in staging. Enriching alerts with CI name, business service, and support group.' },
    { tool_name: 'Trading System CMDB', track: 'ADR Track', phase: 'Alert Intelligence', status: 'in_progress' as const, integration_method: 'Internal REST API', notes: 'Trading platform asset registry. PCI-DSS masking mode applied for cardholder-adjacent enrichment fields.' },
    // ADR Track — Workflow Automation
    { tool_name: 'ServiceNow ITSM', track: 'ADR Track', phase: 'Workflow Automation', status: 'in_progress' as const, integration_method: 'Bi-directional REST Webhook', notes: 'UAT environment configured. Test window May 5–9. Production targeting July 1.' },
    // AI Assistant Track — Knowledge Sources
    { tool_name: 'Alert History & Correlation Patterns', track: 'AI Assistant Track', phase: 'Knowledge Sources', status: 'planned' as const, integration_method: 'BigPanda Native', notes: 'Will ingest Phase 1 incident history after correlation baseline is stable (June 15). 90-day lookback planned.' },
    { tool_name: 'Runbooks & Escalation Procedures', track: 'AI Assistant Track', phase: 'Knowledge Sources', status: 'planned' as const, integration_method: 'Document Ingestion', notes: 'Priya Sharma to provide NOC runbook library. PCI-DSS masking applied for trading runbooks.' },
    // AI Assistant Track — Real-Time Query Sources
    { tool_name: 'Live Incident Context (ADR Pipeline)', track: 'AI Assistant Track', phase: 'Real-Time Query Sources', status: 'planned' as const, integration_method: 'BigPanda Native', notes: 'Live alert and incident context from ADR pipeline. Available after correlation baseline go-live June 15.' },
    // AI Assistant Track — Biggy AI Capabilities
    { tool_name: 'Biggy AI', track: 'AI Assistant Track', phase: 'Biggy AI Capabilities', status: 'planned' as const, integration_method: 'BigPanda Native', notes: 'Pilot design in progress. Scope review with Marcus Okafor May 14. Pilot launch planned June 16.' },
    // AI Assistant Track — Outputs & Actions
    { tool_name: 'ServiceNow Ticket Enrichment', track: 'AI Assistant Track', phase: 'Outputs & Actions', status: 'planned' as const, integration_method: 'ServiceNow REST API', notes: 'Post-pilot: inject Biggy AI incident summary into ServiceNow ticket description. PCI-DSS masked mode for trading incidents.' },
  ];

  for (const ai of archIntegDefs) {
    const ex = await db.select({ id: architectureIntegrations.id }).from(architectureIntegrations)
      .where(sql`${architectureIntegrations.project_id} = ${projectId} AND ${architectureIntegrations.tool_name} = ${ai.tool_name} AND ${architectureIntegrations.track} = ${ai.track}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(architectureIntegrations).values({ project_id: projectId, source: 'manual', ...ai });
      console.log(`  ✓ Arch Integration: ${ai.tool_name}`);
    }
  }

  // ─── Arch Tracks + Nodes ──────────────────────────────────────────────────
  const trackDefs = [
    { name: 'ADR Track', display_order: 1 },
    { name: 'AI Assistant Track', display_order: 2 },
  ];
  const trackIds: Record<string, number> = {};
  for (const t of trackDefs) {
    const ex = await db.select({ id: archTracks.id }).from(archTracks)
      .where(sql`${archTracks.project_id} = ${projectId} AND ${archTracks.name} = ${t.name}`)
      .limit(1);
    if (ex.length === 0) {
      const [row] = await db.insert(archTracks).values({ project_id: projectId, ...t }).returning({ id: archTracks.id });
      trackIds[t.name] = row.id;
      console.log(`  ✓ Arch Track: ${t.name}`);
    } else {
      trackIds[t.name] = ex[0].id;
    }
  }

  const nodeDefs = [
    // ADR Track nodes
    { track: 'ADR Track', name: 'Event Ingest', display_order: 1, status: 'live' as const, notes: 'Dynatrace, SolarWinds, Nagios, PagerDuty live in staging. Splunk trading HEC integration in progress — production May 30.' },
    { track: 'ADR Track', name: 'Alert Intelligence', display_order: 2, status: 'in_progress' as const, notes: 'Correlation policy workshop April 24. Apex CMDB enrichment live. Trading CMDB integration in progress. Production June 15.' },
    { track: 'ADR Track', name: 'Incident Intelligence', display_order: 3, status: 'in_progress' as const, notes: 'Incidents enriched with cross-domain context. PCI-DSS masking applied for trading incidents.' },
    { track: 'ADR Track', name: 'Console', display_order: 4, status: 'in_progress' as const, notes: 'NOC team in BigPanda console training. Console configured with role-based views for NOC vs trading ops.' },
    { track: 'ADR Track', name: 'Workflow Automation', display_order: 5, status: 'in_progress' as const, notes: 'ServiceNow ITSM webhook — UAT May 5–9. Production July 1.' },
    // AI Assistant Track nodes
    { track: 'AI Assistant Track', name: 'Knowledge Sources', display_order: 1, status: 'planned' as const, notes: 'Alert history and runbook ingestion planned after correlation baseline go-live June 15.' },
    { track: 'AI Assistant Track', name: 'Real-Time Query Sources', display_order: 2, status: 'planned' as const, notes: 'Live incident context from ADR pipeline. Available after June 15 go-live.' },
    { track: 'AI Assistant Track', name: 'Biggy AI Capabilities', display_order: 3, status: 'planned' as const, notes: 'NOC pilot scope review May 14. Pilot launch June 16.' },
    { track: 'AI Assistant Track', name: 'Console', display_order: 4, status: 'planned' as const, notes: 'NOC team Biggy AI console access with pilot launch.' },
    { track: 'AI Assistant Track', name: 'Outputs & Actions', display_order: 5, status: 'planned' as const, notes: 'ServiceNow ticket enrichment post-pilot. PCI-DSS masked mode for trading incidents.' },
  ];

  for (const n of nodeDefs) {
    const trackId = trackIds[n.track];
    if (!trackId) continue;
    const ex = await db.select({ id: archNodes.id }).from(archNodes)
      .where(sql`${archNodes.project_id} = ${projectId} AND ${archNodes.track_id} = ${trackId} AND ${archNodes.name} = ${n.name}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(archNodes).values({ project_id: projectId, track_id: trackId, display_order: n.display_order, name: n.name, status: n.status, notes: n.notes });
      console.log(`  ✓ Arch Node: [${n.track}] ${n.name}`);
    }
  }

  // ─── E2E Workflows ────────────────────────────────────────────────────────
  const workflowDefs = [
    {
      workflow_name: 'P1 Banking Alert — IT Ops Triage to Resolution',
      team_name: 'IT Operations Center (NOC)',
      steps: [
        { label: 'Dynatrace / SolarWinds fires alert', track: 'ADR', status: 'live', position: 1 },
        { label: 'BigPanda correlates related alerts into incident', track: 'ADR', status: 'in_progress', position: 2 },
        { label: 'Apex CMDB enrichment applied', track: 'ADR', status: 'in_progress', position: 3 },
        { label: 'Biggy AI enriches with incident summary', track: 'Biggy', status: 'planned', position: 4 },
        { label: 'ServiceNow P1 ticket auto-created', track: 'ADR', status: 'in_progress', position: 5 },
        { label: 'NOC triage and resolution with AI context', track: 'Biggy', status: 'planned', position: 6 },
        { label: 'Incident resolved — BigPanda + ServiceNow auto-close', track: 'ADR', status: 'planned', position: 7 },
      ],
    },
    {
      workflow_name: 'Trading System Alert — Cross-Domain Correlation',
      team_name: 'Trading Operations',
      steps: [
        { label: 'Splunk trading alert via HEC', track: 'ADR', status: 'in_progress', position: 1 },
        { label: 'BigPanda correlates with banking/network events', track: 'ADR', status: 'planned', position: 2 },
        { label: 'PCI-DSS masked enrichment applied', track: 'ADR', status: 'in_progress', position: 3 },
        { label: 'Trading Ops notified via unified incident console', track: 'ADR', status: 'planned', position: 4 },
        { label: 'ServiceNow ticket with masked enrichment fields', track: 'ADR', status: 'planned', position: 5 },
      ],
    },
  ];

  for (const wf of workflowDefs) {
    const ex = await db.select({ id: e2eWorkflows.id }).from(e2eWorkflows)
      .where(sql`${e2eWorkflows.project_id} = ${projectId} AND ${e2eWorkflows.workflow_name} = ${wf.workflow_name}`)
      .limit(1);
    let wfId: number;
    if (ex.length === 0) {
      const [row] = await db.insert(e2eWorkflows).values({ project_id: projectId, team_name: wf.team_name, workflow_name: wf.workflow_name, source: 'manual' }).returning({ id: e2eWorkflows.id });
      wfId = row.id;
      console.log(`  ✓ Workflow: ${wf.workflow_name}`);
    } else {
      wfId = ex[0].id;
    }
    for (const step of wf.steps) {
      const exStep = await db.select({ id: workflowSteps.id }).from(workflowSteps)
        .where(sql`${workflowSteps.workflow_id} = ${wfId} AND ${workflowSteps.label} = ${step.label}`)
        .limit(1);
      if (exStep.length === 0) {
        await db.insert(workflowSteps).values({ workflow_id: wfId, ...step });
      }
    }
  }

  // ─── Focus Areas ──────────────────────────────────────────────────────────
  const focusDefs = [
    { title: 'Land Splunk Trading Integration in Production by May 30', tracks: 'ADR', why_it_matters: 'Splunk trading is the last Phase 1 source. Without it, the unified NOC view is incomplete and the correlation policy baseline cannot be finalized. Unified visibility is the primary customer outcome for Q2.', current_status: 'InfoSec approval received April 25. Staging HEC integration validated. Alex Chen leading production cutover with James Liu supporting.', next_step: 'Daniel Park to complete production configuration checklist by May 15. James Liu to confirm trading system maintenance window for cutover May 28–30.', bp_owner: 'Daniel Park', customer_owner: 'James Liu (Trading Platform Lead)' },
    { title: 'ServiceNow UAT Sign-Off by May 9 — Unblock July 1 Production Date', tracks: 'ADR', why_it_matters: 'ServiceNow automation is the mechanism for eliminating 4.2 tickets per P1. Without production cutover by July 1, the ticket duplication business outcome cannot be delivered in H1.', current_status: 'UAT environment configured. Sandra Torres confirmed test window May 5–9. 6 test scenarios defined in X-APEX-004.', next_step: 'Daniel Park to run all 6 UAT scenarios with Sandra Torres May 5–9. Confirm auto-close behavior for P1s before signing off.', bp_owner: 'Daniel Park', customer_owner: 'Sandra Torres (ITSM Manager)' },
    { title: 'Finalize Biggy AI Pilot Scope Before May 14 Review', tracks: 'Biggy', why_it_matters: 'Pilot launch is blocked until Marcus Okafor approves scope. June 16 launch date requires scope confirmed by May 14. Late scope definition cascades to H2 SLA target delivery.', current_status: 'Pilot design document 60% complete. Daniel Park finalizing incident type recommendations. PCI-DSS masking requirements identified for trading incident types.', next_step: 'Daniel Park to complete pilot design document (X-APEX-006) by May 10. Rachel Kim to schedule scope review with Marcus Okafor for May 14.', bp_owner: 'Rachel Kim', customer_owner: 'Marcus Okafor (VP IT Ops)' },
    { title: 'Resolve PCI-DSS Enrichment Policy for Trading Alerts (Q-APEX-001)', tracks: 'ADR', why_it_matters: 'Without a clear compliance ruling, all trading alert enrichment must remain in masked mode. Full enrichment (with trading platform context) would significantly improve MTTA for trading-related incidents.', current_status: 'Question Q-APEX-001 opened with Kevin Walsh. Masked mode deployed as interim default. Compliance team review in progress.', next_step: 'Kevin Walsh to deliver compliance ruling by May 15. If full enrichment approved: Daniel Park to update trading CMDB integration to include unmasked fields.', bp_owner: 'Rachel Kim', customer_owner: 'Kevin Walsh (InfoSec Director)' },
  ];

  for (const fa of focusDefs) {
    const ex = await db.select({ id: focusAreas.id }).from(focusAreas)
      .where(sql`${focusAreas.project_id} = ${projectId} AND ${focusAreas.title} = ${fa.title}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(focusAreas).values({ project_id: projectId, source: 'manual', ...fa });
      console.log(`  ✓ Focus Area: ${fa.title.substring(0, 55)}`);
    }
  }

  // ─── Onboarding Phases + Steps ────────────────────────────────────────────
  const phase1Id = await (async () => {
    const ex = await db.select({ id: onboardingPhases.id }).from(onboardingPhases)
      .where(sql`${onboardingPhases.project_id} = ${projectId} AND ${onboardingPhases.name} = ${'Phase 1 — ADR Correlation & ServiceNow Automation'}`)
      .limit(1);
    if (ex.length > 0) return ex[0].id;
    const [row] = await db.insert(onboardingPhases).values({ project_id: projectId, name: 'Phase 1 — ADR Correlation & ServiceNow Automation', display_order: 1 }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 1');
    return row.id;
  })();

  const phase2Id = await (async () => {
    const ex = await db.select({ id: onboardingPhases.id }).from(onboardingPhases)
      .where(sql`${onboardingPhases.project_id} = ${projectId} AND ${onboardingPhases.name} = ${'Phase 2 — Biggy AI Incident Intelligence'}`)
      .limit(1);
    if (ex.length > 0) return ex[0].id;
    const [row] = await db.insert(onboardingPhases).values({ project_id: projectId, name: 'Phase 2 — Biggy AI Incident Intelligence', display_order: 2 }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 2');
    return row.id;
  })();

  const stepDefs = [
    { phase_id: phase1Id, name: 'Discovery & Current State Mapping', status: 'complete' as const, owner: 'Rachel Kim', display_order: 1, dependencies: [] as string[], updates: [{ date: '2026-02-14', note: 'Current state documented. Alert source inventory and CMDB integration confirmed.' }] },
    { phase_id: phase1Id, name: 'Core IT Alert Source Integrations (Dynatrace, SolarWinds, Nagios, PagerDuty)', status: 'complete' as const, owner: 'Daniel Park', display_order: 2, dependencies: ['Discovery & Current State Mapping'], updates: [{ date: '2026-03-28', note: 'All 4 core sources live in staging. M-APEX-002 closed.' }] },
    { phase_id: phase1Id, name: 'Splunk Trading System HEC Integration', status: 'in-progress' as const, owner: 'Daniel Park', display_order: 3, dependencies: ['Core IT Alert Source Integrations (Dynatrace, SolarWinds, Nagios, PagerDuty)'], updates: [{ date: '2026-04-25', note: 'InfoSec approved. Staging complete. Production targeting May 30.' }] },
    { phase_id: phase1Id, name: 'Apex CMDB & Trading CMDB Enrichment Integration', status: 'in-progress' as const, owner: 'Daniel Park', display_order: 4, dependencies: ['Core IT Alert Source Integrations (Dynatrace, SolarWinds, Nagios, PagerDuty)'], updates: [{ date: '2026-04-14', note: 'Apex CMDB live. Trading CMDB in progress with PCI-DSS masking.' }] },
    { phase_id: phase1Id, name: 'Correlation Policy Workshop & Baseline Configuration', status: 'in-progress' as const, owner: 'Rachel Kim', display_order: 5, dependencies: ['Core IT Alert Source Integrations (Dynatrace, SolarWinds, Nagios, PagerDuty)'], updates: [{ date: '2026-04-28', note: 'Workshop completed April 24. Policy design finalized. Production go-live June 15.' }] },
    { phase_id: phase1Id, name: 'ServiceNow ITSM Webhook Integration (UAT + Production)', status: 'in-progress' as const, owner: 'Daniel Park', display_order: 6, dependencies: [] as string[], updates: [{ date: '2026-04-21', note: 'UAT environment ready. Test window May 5–9 with Sandra Torres.' }] },
    { phase_id: phase1Id, name: 'NOC Team Training & Console Cutover', status: 'in-progress' as const, owner: 'Rachel Kim', display_order: 7, dependencies: ['Correlation Policy Workshop & Baseline Configuration'], updates: [] },
    { phase_id: phase1Id, name: 'Phase 1 Full Production Go-Live Sign-Off', status: 'not-started' as const, owner: 'Rachel Kim', display_order: 8, dependencies: ['Splunk Trading System HEC Integration', 'ServiceNow ITSM Webhook Integration (UAT + Production)', 'NOC Team Training & Console Cutover'], updates: [] },
    { phase_id: phase2Id, name: 'Biggy AI Pilot Design & Scope Approval', status: 'in-progress' as const, owner: 'Rachel Kim', display_order: 1, dependencies: [] as string[], updates: [{ date: '2026-04-21', note: 'Design document 60% complete. Scope review with Marcus Okafor May 14.' }] },
    { phase_id: phase2Id, name: 'Knowledge Sources Ingestion (Alert History + Runbooks)', status: 'not-started' as const, owner: 'Daniel Park', display_order: 2, dependencies: ['Phase 1 Full Production Go-Live Sign-Off'], updates: [] },
    { phase_id: phase2Id, name: 'Biggy AI NOC Pilot (6 weeks)', status: 'not-started' as const, owner: 'Rachel Kim', display_order: 3, dependencies: ['Biggy AI Pilot Design & Scope Approval', 'Knowledge Sources Ingestion (Alert History + Runbooks)'], updates: [] },
    { phase_id: phase2Id, name: 'ServiceNow Ticket Enrichment (Post-Pilot Rollout)', status: 'not-started' as const, owner: 'Daniel Park', display_order: 4, dependencies: ['Biggy AI NOC Pilot (6 weeks)'], updates: [] },
    { phase_id: phase2Id, name: 'Phase 2 Full Production Go-Live Sign-Off', status: 'not-started' as const, owner: 'Rachel Kim', display_order: 5, dependencies: ['ServiceNow Ticket Enrichment (Post-Pilot Rollout)'], updates: [] },
  ];

  for (const step of stepDefs) {
    const ex = await db.select({ id: onboardingSteps.id }).from(onboardingSteps)
      .where(sql`${onboardingSteps.project_id} = ${projectId} AND ${onboardingSteps.phase_id} = ${step.phase_id} AND ${onboardingSteps.name} = ${step.name}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(onboardingSteps).values({ project_id: projectId, ...step });
      console.log(`  ✓ Step: ${step.name.substring(0, 55)}`);
    }
  }

  // ─── Integrations ─────────────────────────────────────────────────────────
  const integrationDefs = [
    { tool: 'Dynatrace', category: 'APM', status: 'production' as const, color: '#8B5CF6', notes: 'Live in staging. Banking app + infrastructure APM.', display_order: 1 },
    { tool: 'SolarWinds NPM', category: 'Network Monitoring', status: 'production' as const, color: '#F59E0B', notes: 'Live in staging. Network infrastructure monitoring.', display_order: 2 },
    { tool: 'Nagios', category: 'Infrastructure Monitoring', status: 'production' as const, color: '#EF4444', notes: 'Live in staging. Legacy server checks. Noise filter active.', display_order: 3 },
    { tool: 'PagerDuty', category: 'Alerting', status: 'production' as const, color: '#06B6D4', notes: 'Live in staging. On-call + P1/P2 escalation.', display_order: 4 },
    { tool: 'Splunk (Trading)', category: 'Log Management / SIEM', status: 'validated' as const, color: '#F97316', notes: 'Staging HEC integration validated. Production May 30.', display_order: 5 },
    { tool: 'ServiceNow ITSM', category: 'ITSM', status: 'configured' as const, color: '#0EA5E9', notes: 'UAT configured. Test window May 5–9. Production July 1.', display_order: 6 },
    { tool: 'Apex CMDB (ServiceNow)', category: 'CMDB / Enrichment', status: 'production' as const, color: '#10B981', notes: 'Live. CI enrichment for banking alerts.', display_order: 7 },
    { tool: 'Biggy AI', category: 'AI Incident Intelligence', status: 'not-connected' as const, color: '#6366F1', notes: 'Pilot design in progress. Launch June 16.', display_order: 8 },
  ];

  for (const integ of integrationDefs) {
    const ex = await db.select({ id: integrations.id }).from(integrations)
      .where(sql`${integrations.project_id} = ${projectId} AND ${integrations.tool} = ${integ.tool}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(integrations).values({ project_id: projectId, ...integ });
      console.log(`  ✓ Integration: ${integ.tool}`);
    }
  }

  // ─── Tasks ────────────────────────────────────────────────────────────────
  const taskDefs = [
    { title: 'Configure Dynatrace + SolarWinds + Nagios staging ingestion', start_date: '2026-02-18', due: '2026-03-14', status: 'done', owner: 'Daniel Park', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-002'] },
    { title: 'Configure PagerDuty staging ingestion and on-call routing', start_date: '2026-03-01', due: '2026-03-21', status: 'done', owner: 'Daniel Park', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-002'] },
    { title: 'Apex CMDB enrichment integration and CI mapping', start_date: '2026-03-14', due: '2026-03-28', status: 'done', owner: 'Daniel Park', priority: 'medium', phase: 'integration', milestone_id: milestoneIds['M-APEX-002'] },
    { title: 'Staging load test at 2x expected volume', start_date: '2026-03-25', due: '2026-03-28', status: 'done', owner: 'Daniel Park', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-002'] },
    { title: 'Prepare and submit InfoSec review package for Splunk integration', start_date: '2026-04-07', due: '2026-04-15', status: 'done', owner: 'Rachel Kim', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-003'] },
    { title: 'Splunk HEC staging integration and validation', start_date: '2026-04-07', due: '2026-04-25', status: 'in_progress', owner: 'Daniel Park', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-003'] },
    { title: 'Splunk production cutover', start_date: '2026-05-28', due: '2026-05-30', status: 'todo', owner: 'Daniel Park', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-003'] },
    { title: 'Correlation policy workshop — define 4-domain alert grouping rules', start_date: '2026-04-21', due: '2026-04-24', status: 'done', owner: 'Rachel Kim', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-004'] },
    { title: 'Correlation policy configuration in staging', start_date: '2026-04-24', due: '2026-05-30', status: 'in_progress', owner: 'Daniel Park', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-004'] },
    { title: 'Correlation policy production go-live', start_date: '2026-06-01', due: '2026-06-15', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-004'] },
    { title: 'ServiceNow webhook UAT — 6 test scenarios', start_date: '2026-05-05', due: '2026-05-09', status: 'todo', owner: 'Daniel Park', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-005'] },
    { title: 'ServiceNow production cutover', start_date: '2026-06-24', due: '2026-07-01', status: 'todo', owner: 'Daniel Park', priority: 'high', phase: 'integration', milestone_id: milestoneIds['M-APEX-005'] },
    { title: 'Biggy AI pilot design document completion', start_date: '2026-04-21', due: '2026-05-10', status: 'in_progress', owner: 'Daniel Park', priority: 'medium', phase: 'ai_pilot', milestone_id: milestoneIds['M-APEX-006'] },
    { title: 'Biggy AI scope review with Marcus Okafor', start_date: '2026-05-12', due: '2026-05-14', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: 'ai_pilot', milestone_id: milestoneIds['M-APEX-006'] },
    { title: 'Biggy AI pilot launch — NOC team (6-week pilot)', start_date: '2026-06-16', due: '2026-07-31', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: 'ai_pilot', milestone_id: milestoneIds['M-APEX-006'] },
    { title: 'Alex Chen knowledge transfer sessions (4 sessions)', start_date: '2026-04-14', due: '2026-04-28', status: 'in_progress', owner: 'Rachel Kim', priority: 'high', phase: null, milestone_id: null },
    { title: 'Trading system data classification policy definition for Biggy AI', start_date: '2026-05-01', due: '2026-05-15', status: 'todo', owner: 'Alex Chen', priority: 'medium', phase: null, milestone_id: null },
  ];

  for (const task of taskDefs) {
    const ex = await db.select({ id: tasks.id }).from(tasks)
      .where(sql`${tasks.project_id} = ${projectId} AND ${tasks.title} = ${task.title}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(tasks).values({ project_id: projectId, source: 'manual', ...task });
      console.log(`  ✓ Task: ${task.title.substring(0, 55)}`);
    }
  }

  // ─── WBS Items ────────────────────────────────────────────────────────────
  // ADR track L1 sections
  const wbsL1s = [
    { name: 'Discovery & Kickoff', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-01-15', due_date: '2026-02-14' },
    { name: 'Solution Design', track: 'ADR', display_order: 2, status: 'complete' as const, start_date: '2026-02-10', due_date: '2026-03-07' },
    { name: 'Alert Source Integration', track: 'ADR', display_order: 3, status: 'in_progress' as const, start_date: '2026-02-18', due_date: '2026-05-30' },
    { name: 'Alert Enrichment & Normalization', track: 'ADR', display_order: 4, status: 'in_progress' as const, start_date: '2026-03-01', due_date: '2026-05-30' },
    { name: 'Platform Configuration', track: 'ADR', display_order: 5, status: 'complete' as const, start_date: '2026-03-01', due_date: '2026-03-28' },
    { name: 'Correlation', track: 'ADR', display_order: 6, status: 'in_progress' as const, start_date: '2026-04-01', due_date: '2026-06-15' },
    { name: 'Routing & Escalation', track: 'ADR', display_order: 7, status: 'in_progress' as const, start_date: '2026-04-14', due_date: '2026-07-01' },
    { name: 'Teams & Training', track: 'ADR', display_order: 8, status: 'in_progress' as const, start_date: '2026-03-28', due_date: '2026-08-01' },
    { name: 'UAT & Go-Live Preparation', track: 'ADR', display_order: 9, status: 'in_progress' as const, start_date: '2026-05-05', due_date: '2026-08-15' },
    { name: 'Go-Live', track: 'ADR', display_order: 10, status: 'not_started' as const, start_date: '2026-08-15', due_date: '2026-09-01' },
    // Biggy track L1 sections
    { name: 'Discovery & Kickoff', track: 'Biggy', display_order: 1, status: 'in_progress' as const, start_date: '2026-04-14', due_date: '2026-05-14' },
    { name: 'Integrations', track: 'Biggy', display_order: 2, status: 'not_started' as const, start_date: '2026-06-01', due_date: '2026-07-01' },
    { name: 'Workflow', track: 'Biggy', display_order: 3, status: 'not_started' as const, start_date: '2026-06-16', due_date: '2026-07-31' },
    { name: 'Teams & Training', track: 'Biggy', display_order: 4, status: 'not_started' as const, start_date: '2026-06-16', due_date: '2026-08-01' },
    { name: 'Deploy', track: 'Biggy', display_order: 5, status: 'not_started' as const, start_date: '2026-08-01', due_date: '2026-09-01' },
  ];

  const wbsL1Ids: Record<string, number> = {};
  for (const l1 of wbsL1s) {
    const ex = await db.select({ id: wbsItems.id }).from(wbsItems)
      .where(sql`${wbsItems.project_id} = ${projectId} AND ${wbsItems.name} = ${l1.name} AND ${wbsItems.track} = ${l1.track} AND ${wbsItems.level} = 1`)
      .limit(1);
    if (ex.length === 0) {
      const [row] = await db.insert(wbsItems).values({ project_id: projectId, level: 1, parent_id: null, source_trace: 'seed', ...l1 }).returning({ id: wbsItems.id });
      wbsL1Ids[`${l1.track}:${l1.name}`] = row.id;
      console.log(`  ✓ WBS L1: [${l1.track}] ${l1.name}`);
    } else {
      wbsL1Ids[`${l1.track}:${l1.name}`] = ex[0].id;
    }
  }

  const wbsL2s = [
    // ADR: Solution Design
    { parent: 'ADR:Solution Design', name: 'Ops Shadowing / Current State', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-02-10', due_date: '2026-02-21' },
    { parent: 'ADR:Solution Design', name: 'Future State Workflow', track: 'ADR', display_order: 2, status: 'complete' as const, start_date: '2026-02-18', due_date: '2026-02-28' },
    { parent: 'ADR:Solution Design', name: 'ADR Process Consulting', track: 'ADR', display_order: 3, status: 'complete' as const, start_date: '2026-02-24', due_date: '2026-03-07' },
    // ADR: Alert Source Integration
    { parent: 'ADR:Alert Source Integration', name: 'Outbound Integrations', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-02-18', due_date: '2026-03-28' },
    { parent: 'ADR:Alert Source Integration', name: 'Inbound Integrations', track: 'ADR', display_order: 2, status: 'in_progress' as const, start_date: '2026-04-07', due_date: '2026-05-30' },
    // ADR: Alert Enrichment & Normalization
    { parent: 'ADR:Alert Enrichment & Normalization', name: 'Tag Documentation', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-03-01', due_date: '2026-03-14' },
    { parent: 'ADR:Alert Enrichment & Normalization', name: 'Normalization Configuration', track: 'ADR', display_order: 2, status: 'in_progress' as const, start_date: '2026-03-14', due_date: '2026-05-30' },
    { parent: 'ADR:Alert Enrichment & Normalization', name: 'CMDB', track: 'ADR', display_order: 3, status: 'in_progress' as const, start_date: '2026-03-14', due_date: '2026-05-30' },
    // ADR: Platform Configuration
    { parent: 'ADR:Platform Configuration', name: 'Environments', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-03-01', due_date: '2026-03-10' },
    { parent: 'ADR:Platform Configuration', name: 'Incident Tags', track: 'ADR', display_order: 2, status: 'complete' as const, start_date: '2026-03-07', due_date: '2026-03-14' },
    { parent: 'ADR:Platform Configuration', name: 'Role Based Access Control', track: 'ADR', display_order: 3, status: 'complete' as const, start_date: '2026-03-10', due_date: '2026-03-21' },
    { parent: 'ADR:Platform Configuration', name: 'Incident Routing', track: 'ADR', display_order: 4, status: 'complete' as const, start_date: '2026-03-14', due_date: '2026-03-21' },
    { parent: 'ADR:Platform Configuration', name: 'Single Sign-On', track: 'ADR', display_order: 5, status: 'complete' as const, start_date: '2026-03-14', due_date: '2026-03-28' },
    { parent: 'ADR:Platform Configuration', name: 'Admin / Reporting', track: 'ADR', display_order: 6, status: 'complete' as const, start_date: '2026-03-21', due_date: '2026-03-28' },
    // ADR: Correlation
    { parent: 'ADR:Correlation', name: 'Use Case Discovery', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-04-01', due_date: '2026-04-24' },
    { parent: 'ADR:Correlation', name: 'Correlation Configuration', track: 'ADR', display_order: 2, status: 'in_progress' as const, start_date: '2026-04-24', due_date: '2026-06-15' },
    // ADR: Routing & Escalation
    { parent: 'ADR:Routing & Escalation', name: 'Outbound Integrations Configuration', track: 'ADR', display_order: 1, status: 'in_progress' as const, start_date: '2026-04-14', due_date: '2026-07-01' },
    // ADR: Teams & Training
    { parent: 'ADR:Teams & Training', name: 'User Training', track: 'ADR', display_order: 1, status: 'in_progress' as const, start_date: '2026-04-21', due_date: '2026-08-01' },
    // ADR: UAT & Go-Live Preparation
    { parent: 'ADR:UAT & Go-Live Preparation', name: 'UAT', track: 'ADR', display_order: 1, status: 'in_progress' as const, start_date: '2026-05-05', due_date: '2026-08-01' },
    { parent: 'ADR:UAT & Go-Live Preparation', name: 'Documentation', track: 'ADR', display_order: 2, status: 'in_progress' as const, start_date: '2026-04-14', due_date: '2026-08-15' },
    { parent: 'ADR:UAT & Go-Live Preparation', name: 'Go-Live Prep', track: 'ADR', display_order: 3, status: 'not_started' as const, start_date: '2026-08-01', due_date: '2026-08-15' },
    // ADR: Go-Live
    { parent: 'ADR:Go-Live', name: 'Go Live', track: 'ADR', display_order: 1, status: 'not_started' as const, start_date: '2026-09-01', due_date: '2026-09-01' },
    { parent: 'ADR:Go-Live', name: 'Post Go-Live Survey', track: 'ADR', display_order: 2, status: 'not_started' as const, start_date: '2026-09-01', due_date: '2026-09-15' },
    { parent: 'ADR:Go-Live', name: 'Unified Analytics', track: 'ADR', display_order: 3, status: 'not_started' as const, start_date: '2026-09-01', due_date: '2026-10-01' },
    { parent: 'ADR:Go-Live', name: 'Project Closure', track: 'ADR', display_order: 4, status: 'not_started' as const, start_date: '2026-10-01', due_date: '2026-10-31' },
    // Biggy: Integrations
    { parent: 'Biggy:Integrations', name: 'Real-Time Integrations', track: 'Biggy', display_order: 1, status: 'not_started' as const, start_date: '2026-06-01', due_date: '2026-06-30' },
    { parent: 'Biggy:Integrations', name: 'Context Integrations', track: 'Biggy', display_order: 2, status: 'not_started' as const, start_date: '2026-06-01', due_date: '2026-07-01' },
    // Biggy: Workflow
    { parent: 'Biggy:Workflow', name: 'Action Plans', track: 'Biggy', display_order: 1, status: 'not_started' as const, start_date: '2026-06-16', due_date: '2026-07-15' },
    { parent: 'Biggy:Workflow', name: 'Workflows', track: 'Biggy', display_order: 2, status: 'not_started' as const, start_date: '2026-06-16', due_date: '2026-07-31' },
    { parent: 'Biggy:Workflow', name: 'Managed Incident Channels', track: 'Biggy', display_order: 3, status: 'not_started' as const, start_date: '2026-07-15', due_date: '2026-08-01' },
    // Biggy: Teams & Training
    { parent: 'Biggy:Teams & Training', name: 'Team-Specific Workflow Enablement', track: 'Biggy', display_order: 1, status: 'not_started' as const, start_date: '2026-06-16', due_date: '2026-07-31' },
    { parent: 'Biggy:Teams & Training', name: 'Training', track: 'Biggy', display_order: 2, status: 'not_started' as const, start_date: '2026-06-16', due_date: '2026-08-01' },
  ];

  for (const l2 of wbsL2s) {
    const parentId = wbsL1Ids[l2.parent];
    if (!parentId) { console.warn(`  ⚠ WBS L1 not found for parent: ${l2.parent}`); continue; }
    const ex = await db.select({ id: wbsItems.id }).from(wbsItems)
      .where(sql`${wbsItems.project_id} = ${projectId} AND ${wbsItems.name} = ${l2.name} AND ${wbsItems.parent_id} = ${parentId} AND ${wbsItems.level} = 2`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(wbsItems).values({ project_id: projectId, level: 2, parent_id: parentId, source_trace: 'seed', track: l2.track, name: l2.name, display_order: l2.display_order, status: l2.status, start_date: l2.start_date, due_date: l2.due_date });
      console.log(`  ✓ WBS L2: [${l2.track}] ${l2.name}`);
    }
  }

  // ─── Team Pathways ────────────────────────────────────────────────────────
  const pathwayDefs = [
    {
      team_name: 'IT Operations Center (NOC)',
      status: 'in_progress' as const,
      notes: 'Core IT ingestion live in staging. ServiceNow UAT in progress. Biggy AI pilot planned June.',
      route_steps: [
        { label: 'Dynatrace / SolarWinds / PagerDuty Alert' },
        { label: 'BigPanda Correlation + CMDB Enrichment' },
        { label: 'Biggy AI Incident Summary (post-pilot)' },
        { label: 'NOC Triage & Acknowledge' },
        { label: 'ServiceNow Ticket (auto-create → July 1)' },
        { label: 'Resolution + Close' },
      ],
    },
    {
      team_name: 'Trading Operations',
      status: 'planned' as const,
      notes: 'Splunk HEC integration production May 30. Trading ops workflow pending correlation baseline.',
      route_steps: [
        { label: 'Splunk Trading Alert (HEC)' },
        { label: 'BigPanda Correlation (cross-domain)' },
        { label: 'PCI-DSS Masked Enrichment' },
        { label: 'Trading Ops Triage in BigPanda Console' },
        { label: 'ServiceNow Ticket (masked fields)' },
      ],
    },
  ];

  for (const p of pathwayDefs) {
    const ex = await db.select({ id: teamPathways.id }).from(teamPathways)
      .where(sql`${teamPathways.project_id} = ${projectId} AND ${teamPathways.team_name} = ${p.team_name}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(teamPathways).values({ project_id: projectId, source: 'manual', ...p });
      console.log(`  ✓ Team Pathway: ${p.team_name}`);
    }
  }

  // ─── Knowledge Base ───────────────────────────────────────────────────────
  const kbDefs = [
    { title: 'PCI-DSS Masking Policy for Splunk Trading Alerts', content: 'All trading alerts ingested via Splunk HEC must have cardholder data fields (card BIN ranges, transaction amounts, merchant IDs, PAN segments) masked before appearance in ServiceNow ticket descriptions or Biggy AI enrichment output. Full transaction context is retained in BigPanda incident payload for authorized NOC users with appropriate ServiceNow ITSM roles. Masked mode: replace sensitive field values with [MASKED-PCI] token in all ITSM and AI output fields. Compliance ruling (Q-APEX-001) may permit full enrichment for authorized NOC roles — monitor for update.', source_trace: 'seed' },
    { title: 'Splunk ITSI Decommission Plan', content: 'Splunk ITSI is to be decommissioned as the primary correlation hub by December 2026 per the decision made at the January 15 kickoff. Migration path: all ITSI episode rules replaced by BigPanda correlation policies. Splunk retained as an event forwarder only (HEC to BigPanda for trading alerts, raw log forwarding for SIEM). NOC team migrates from ITSI console to BigPanda console no later than the September 1 go-live gate. ITSI license contract renewal decision: do NOT renew. Decommission sign-off requires confirmation from Marcus Okafor and Sandra Torres.', source_trace: 'seed' },
  ];

  for (const kb of kbDefs) {
    const ex = await db.select({ id: knowledgeBase.id }).from(knowledgeBase)
      .where(sql`${knowledgeBase.project_id} = ${projectId} AND ${knowledgeBase.title} = ${kb.title}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(knowledgeBase).values({ project_id: projectId, ...kb });
      console.log(`  ✓ KB: ${kb.title.substring(0, 55)}`);
    }
  }

  console.log(`\n✅ Apex Financial demo seed complete! Project id=${projectId}`);
  console.log(`   Navigate to: /customer/${projectId}/overview`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
