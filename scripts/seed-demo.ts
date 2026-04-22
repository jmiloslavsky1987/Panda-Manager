/**
 * seed-demo.ts — Create and populate a showcase "GlobalBank" demo project.
 *
 * Run (local): npx tsx scripts/seed-demo.ts
 * Run (Docker): docker exec install-app-1 npx tsx scripts/seed-demo.ts
 *
 * Creates a new project named "GlobalBank — AIOps Transformation" if it
 * doesn't exist, then seeds every workspace tab with realistic data.
 *
 * Idempotent: finds or creates the project by name, then uses external_id
 * checks before each insert.
 */

import { db } from '../db/index';
import {
  projects,
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
  timeEntries,
  wbsItems,
  archTracks,
  archNodes,
  beforeState,
  teamPathways,
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const PROJECT_NAME = 'GlobalBank — AIOps Transformation';

async function seed() {
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
      customer: 'GlobalBank',
      overall_status: 'yellow',
      status_summary: 'Phase 1 ADR pipeline live and stable. Correlation quality improving — FP rate down to 18%. Biggy AI pilot delayed by 3 weeks pending CISO sign-off. ServiceNow automation deployed to UAT. Strong executive sponsorship from CTO office.',
      go_live_target: '2026-09-30',
      last_updated: '2026-04-18',
      description: 'End-to-end AIOps transformation for GlobalBank covering real-time alert correlation, Biggy AI incident intelligence, ServiceNow automation, and Slack-based NOC workflows. Six operations teams onboarding across three phases.',
      start_date: '2026-01-05',
      end_date: '2026-11-30',
    }).returning({ id: projects.id });
    projectId = row.id;
    console.log(`Created new project: "${PROJECT_NAME}" (id=${projectId})`);
  }

  // Update project fields for showcase quality
  await db.update(projects).set({
    overall_status: 'yellow',
    status_summary: 'Phase 1 ADR pipeline live and stable. Correlation quality improving — FP rate down to 18%. Biggy AI pilot delayed by 3 weeks pending CISO sign-off. ServiceNow automation deployed to UAT. Strong executive sponsorship from CTO office.',
    go_live_target: '2026-09-30',
    last_updated: '2026-04-18',
    description: 'End-to-end AIOps transformation for GlobalBank covering real-time alert correlation, Biggy AI incident intelligence, ServiceNow automation, and Slack-based NOC workflows. Six operations teams onboarding across three phases.',
    start_date: '2026-01-05',
    end_date: '2026-11-30',
  }).where(eq(projects.id, projectId));

  // ─── Before State ─────────────────────────────────────────────────────────
  const existingBefore = await db.select({ id: beforeState.id })
    .from(beforeState).where(eq(beforeState.project_id, projectId)).limit(1);
  if (existingBefore.length === 0) {
    await db.insert(beforeState).values({
      project_id: projectId,
      aggregation_hub_name: 'Splunk ITSI',
      alert_to_ticket_problem: 'NOC receives 25,000+ raw alerts per day across 14 monitoring tools. Operators manually correlate related alerts and create SNOW tickets by hand — taking 35-50 minutes per P1 incident. Alert storms during peak trading hours overwhelm the team and cause P1 escalation delays.',
      pain_points_json: [
        'Manual alert triage takes 35-50 min per P1 — MTTA target is <8 min',
        'SNOW tickets created manually for every alert — ~120 tickets/day with no correlation',
        'No cross-tool correlation: Dynatrace, Nagios, and Splunk alerts treated independently',
        'Alert fatigue causing NOC to miss genuine P1s in noise — 3 SLA breaches in Q1 2026',
        'Tier 2 escalations at 41% — NOC lacks context to resolve independently',
      ],
      source: 'manual',
    });
    console.log('  ✓ Before State');
  }

  // ─── Artifacts ────────────────────────────────────────────────────────────
  const artifactDefs = [
    { external_id: 'X-GB-001', name: 'GlobalBank AIOps Kickoff Deck', status: 'approved', owner: 'Alex Chen', description: 'Kickoff presentation covering project scope, team assignments, and 3-phase delivery timeline.' },
    { external_id: 'X-GB-002', name: 'Alert Correlation Architecture — Phase 1', status: 'approved', owner: 'Maria Santos', description: 'Architecture diagram: alert ingestion pipeline, correlation engine config, SNOW webhook integration.' },
    { external_id: 'X-GB-003', name: 'CISO Security Review — Biggy AI (v2)', status: 'in_progress', owner: 'GlobalBank CISO Office', description: 'Updated security questionnaire for Biggy AI. Addresses data residency and model training concerns from v1 review.' },
    { external_id: 'X-GB-004', name: 'NOC Team Onboarding Playbook', status: 'approved', owner: 'Ryan Park', description: 'Step-by-step onboarding guide for GlobalBank NOC. Covers BigPanda UI, alert triage workflow, and SNOW integration.' },
    { external_id: 'X-GB-005', name: 'Weekly Status — Week of 2026-04-14', status: 'sent', owner: 'Alex Chen', description: 'Weekly status update covering Phase 1 milestones, Biggy AI delay, and upcoming P1 correlation UAT.' },
    { external_id: 'X-GB-006', name: 'Correlation Policy Workshop Notes', status: 'approved', owner: 'Maria Santos', description: 'Workshop output: 18 correlation rules defined across 5 alert domains. FP rate baseline 28% → target <10%.' },
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

  // ─── Actions ──────────────────────────────────────────────────────────────
  const actionDefs = [
    {
      external_id: 'A-GB-001',
      description: 'Complete UAT validation of SNOW bi-directional webhook — confirm ticket auto-create and auto-close flow end-to-end',
      owner: 'Maria Santos',
      due: '2026-04-25',
      status: 'in_progress' as const,
      notes: 'UAT environment ready. Running test cases with GlobalBank ITSM team this week.',
      type: 'action',
    },
    {
      external_id: 'A-GB-002',
      description: 'Follow up with CISO office on Biggy AI security review — request updated ETA and any outstanding data points needed',
      owner: 'Alex Chen',
      due: '2026-04-22',
      status: 'open' as const,
      notes: 'v2 questionnaire submitted April 8. No response yet. Will escalate to CTO sponsor if no update by April 22.',
      type: 'action',
    },
    {
      external_id: 'A-GB-003',
      description: 'Run correlation policy tuning session with Payments Operations team — target FP rate <12% for trading hours window',
      owner: 'Ryan Park',
      due: '2026-04-30',
      status: 'open' as const,
      notes: 'Currently at 18% FP overall; Payments team window spikes to 28% during 09:00-11:00 EST. Dedicated tuning needed.',
      type: 'action',
    },
    {
      external_id: 'A-GB-004',
      description: 'Deliver Slack-to-BigPanda NOC workflow training for Tier 2 escalation team',
      owner: 'Alex Chen',
      due: '2026-05-09',
      status: 'open' as const,
      notes: 'Phase 2 enablement item. Slack workflow for ack/resolve configured in sandbox. Training deck in draft.',
      type: 'action',
    },
    {
      external_id: 'A-GB-005',
      description: 'Validate PagerDuty → BigPanda → SNOW full chain for Critical Payments alerts in production',
      owner: 'GlobalBank NOC — Sam O.',
      due: '2026-04-14',
      status: 'completed' as const,
      notes: 'Completed 2026-04-12. 14 P1 alerts validated end-to-end. 2 routing tweaks applied post-validation.',
      type: 'action',
    },
    {
      external_id: 'A-GB-006',
      description: 'Onboard Cloud Platform team — complete ingestion setup for AWS CloudWatch and Azure Monitor',
      owner: 'Maria Santos',
      due: '2026-06-06',
      status: 'open' as const,
      notes: 'Phase 2 item. Dependent on NOC team Phase 1 completion (milestone M-GB-003).',
      type: 'action',
    },
    {
      external_id: 'Q-GB-001',
      description: 'Does GlobalBank require Biggy AI incident summaries to be masked before they appear in SNOW tickets for compliance reasons?',
      owner: 'GlobalBank Compliance',
      due: 'TBD',
      status: 'open' as const,
      notes: 'Raised in Biggy AI design session. Compliance team reviewing. May affect SNOW enrichment field mapping.',
      type: 'question',
    },
    {
      external_id: 'Q-GB-002',
      description: 'Should GlobalBank enable automatic SNOW incident resolution when BigPanda incident resolves, or require manual NOC confirmation?',
      owner: 'GlobalBank NOC Lead',
      due: 'TBD',
      status: 'open' as const,
      notes: 'Two options presented on 2026-03-28. NOC Lead wants 30-day pilot of auto-resolve before committing.',
      type: 'question',
    },
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
    {
      external_id: 'R-GB-001',
      description: 'CISO security review for Biggy AI may extend timeline by 4-6 weeks — v1 review returned 8 open data residency questions in February',
      severity: 'high' as const,
      owner: 'Alex Chen',
      mitigation: 'Submitted v2 questionnaire on April 8 addressing all v1 gaps. CTO sponsor briefed. Weekly follow-up cadence in place.',
      status: 'open',
      last_updated: '2026-04-18',
    },
    {
      external_id: 'R-GB-002',
      description: 'Payments Operations trading-hours FP rate (28%) risks NOC team losing confidence in BigPanda correlation before tuning is complete',
      severity: 'medium' as const,
      owner: 'Ryan Park',
      mitigation: 'Dedicated tuning session scheduled April 30. Nagios noise suppression policy deployed as interim measure (reduced storm volume 40%).',
      status: 'open',
      last_updated: '2026-04-15',
    },
    {
      external_id: 'R-GB-003',
      description: 'GlobalBank ITSM team bandwidth constraint — ServiceNow admin team at 120% capacity during Q2 system upgrade',
      severity: 'medium' as const,
      owner: 'GlobalBank ITSM — Carla V.',
      mitigation: 'Scoped SNOW work to webhook config only during freeze. Full CMDB enrichment deferred to Phase 2. UAT validated in parallel using non-freeze environment.',
      status: 'mitigated',
      last_updated: '2026-04-10',
    },
    {
      external_id: 'R-GB-004',
      description: 'Data residency requirement: Biggy AI must process all incident data within EU region — current model serving is US-based',
      severity: 'critical' as const,
      owner: 'GlobalBank Legal & Compliance',
      mitigation: 'Escalated to BigPanda Product. EU model serving capacity being evaluated for Q3. May require architecture change or delayed EU-team rollout.',
      status: 'open',
      last_updated: '2026-04-18',
    },
    {
      external_id: 'R-GB-005',
      description: 'Alert volume spikes during month-end batch processing (3,000+ alerts/hour) may degrade correlation performance',
      severity: 'low' as const,
      owner: 'Maria Santos',
      mitigation: 'Load test completed April 1 at 4,500 alerts/hour with no degradation. Monitoring alerts configured for >5,000/hour. Contingency runbook drafted.',
      status: 'resolved',
      last_updated: '2026-04-05',
    },
    {
      external_id: 'R-GB-006',
      description: 'Key GlobalBank contact (NOC Lead Daniel R.) scheduled to depart June 15 — transition plan not yet in place',
      severity: 'medium' as const,
      owner: 'GlobalBank IT Director',
      mitigation: 'Warm handoff requested. All decisions and runbooks documented. Successor candidate identified but not yet confirmed.',
      status: 'open',
      last_updated: '2026-04-18',
    },
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
    { external_id: 'M-GB-001', name: 'Phase 1 ADR Pipeline — Production Go-Live', status: 'completed', date: '2026-03-15', owner: 'Maria Santos', notes: 'All 14 alert sources connected. NOC operating independently. FP rate at 18% (target <10% by June).' },
    { external_id: 'M-GB-002', name: 'ServiceNow Automation — UAT Complete', status: 'in_progress', date: '2026-04-30', owner: 'Maria Santos', notes: 'UAT in progress. Full production cutover dependent on ITSM team bandwidth post-upgrade freeze.' },
    { external_id: 'M-GB-003', name: 'NOC Team Phase 1 Enablement Complete', status: 'completed', date: '2026-04-01', owner: 'Ryan Park', notes: 'All NOC operators trained. BigPanda-primary triage process adopted. MTTA improving from 48 min to 22 min.' },
    { external_id: 'M-GB-004', name: 'Biggy AI Pilot — Payments & NOC Teams', status: 'blocked', date: '2026-06-01', owner: 'Alex Chen', notes: 'Blocked by CISO security review (R-GB-001, R-GB-004). Original target was May 15. Revised to June 1.' },
    { external_id: 'M-GB-005', name: 'Cloud Platform Team Onboarded', status: 'not_started', date: '2026-07-15', owner: 'Maria Santos', notes: 'Phase 2. AWS CloudWatch + Azure Monitor ingestion. Dependent on NOC Phase 1 complete.' },
    { external_id: 'M-GB-006', name: 'AIOps Full Production Go-Live', status: 'not_started', date: '2026-09-30', owner: 'Alex Chen', notes: 'All 6 teams live, Biggy AI operational, SNOW automation running, Slack workflows deployed.' },
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

  // ─── Stakeholders ─────────────────────────────────────────────────────────
  const stakeholderDefs = [
    { name: 'Alex Chen', role: 'BigPanda PS Lead', company: 'BigPanda', email: 'alex.chen@bigpanda.io', notes: 'Primary delivery lead. Weekly syncs with CTO office and NOC leadership.' },
    { name: 'Maria Santos', role: 'BigPanda Integration Engineer', company: 'BigPanda', email: 'maria.santos@bigpanda.io', notes: 'Owns ADR pipeline, SNOW integration, and Phase 2 cloud integrations.' },
    { name: 'Ryan Park', role: 'BigPanda Solutions Architect', company: 'BigPanda', email: 'ryan.park@bigpanda.io', notes: 'Correlation policy design, Biggy AI architecture, Slack workflow integration.' },
    { name: 'Victor Osei', role: 'CTO', company: 'GlobalBank', email: 'v.osei@globalbank.com', notes: 'Executive sponsor. Monthly ELT briefings. Champion for Biggy AI initiative.' },
    { name: 'Daniel Rivera', role: 'NOC Operations Lead', company: 'GlobalBank', email: 'd.rivera@globalbank.com', notes: 'Primary ops contact. Leaving GlobalBank June 15. Transition plan in progress.' },
    { name: 'Carla Vance', role: 'ITSM / ServiceNow Admin', company: 'GlobalBank', email: 'c.vance@globalbank.com', notes: 'SNOW admin lead. Owns UAT environment. Q2 upgrade freeze constraints.' },
    { name: 'Priya Nair', role: 'CISO', company: 'GlobalBank', email: 'p.nair@globalbank.com', notes: 'Reviews Biggy AI security questionnaire. Owns data residency and compliance decisions.' },
    { name: 'Sam Okafor', role: 'Payments Operations Lead', company: 'GlobalBank', email: 's.okafor@globalbank.com', notes: 'Trading-hours correlation tuning sponsor. P1 alert volume owner for Payments domain.' },
    { name: 'Jess Kim', role: 'Cloud Platform Engineer', company: 'GlobalBank', email: 'j.kim@globalbank.com', notes: 'Phase 2 contact for Cloud Platform team. Owns AWS CloudWatch + Azure Monitor.' },
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

  // ─── Engagement History ───────────────────────────────────────────────────
  const historyDefs = [
    {
      date: '2026-04-18',
      content: 'Weekly sync with GlobalBank NOC team and ITSM. SNOW UAT progressing — 6 of 10 test scenarios passing. Two routing issues identified and fixed. Biggy AI security review still pending CISO response. Alex escalated to Victor Osei (CTO) for support.',
    },
    {
      date: '2026-04-08',
      content: 'Biggy AI design session with Ryan P. and GlobalBank NOC leads. Agreed enrichment fields: incident summary, probable cause, blast radius, and suggested remediation. Compliance question raised re: AI summaries in SNOW tickets (open question Q-GB-001). Submitted v2 CISO questionnaire.',
    },
    {
      date: '2026-04-01',
      content: 'M-GB-003 closed: NOC Phase 1 enablement complete. All 24 NOC operators trained. BigPanda is now primary triage interface. MTTA measured at 22 min (down from 48 min baseline). FP rate at 18% — Payments window still elevated.',
    },
    {
      date: '2026-03-28',
      content: 'SNOW integration planning session with Carla Vance. Confirmed UAT approach. ITSM upgrade freeze runs until April 30 — production cutover will follow. Webhook testing in UAT environment approved to proceed. Auto-resolve behavior decision deferred pending Q-GB-002 answer.',
    },
    {
      date: '2026-03-15',
      content: 'M-GB-001 closed: Phase 1 ADR pipeline in production. All 14 alert sources confirmed live. PagerDuty, Dynatrace, Splunk, Nagios, and 10 additional sources feeding BigPanda. Correlation engine active. Load test validated at 4,500 alerts/hour.',
    },
    {
      date: '2026-02-20',
      content: 'Correlation policy workshop completed. Maria S. and Ryan P. facilitated. 18 correlation rules defined across 5 domains: Payments, Cloud Infrastructure, Application Delivery, Security Ops, and Database. Nagios noise filter policy approved — implemented March 1.',
    },
    {
      date: '2026-01-20',
      content: 'Staging environment validation completed. All 14 alert sources ingesting to staging BigPanda. SNOW webhook tested in UAT (ticket create and update confirmed). Load test at 2x expected volume passed. Green light to proceed to Phase 1 production.',
    },
    {
      date: '2026-01-05',
      content: 'Project kickoff at GlobalBank HQ. Victor Osei (CTO) opened session and confirmed full executive commitment. Scope, timeline, and three-phase delivery plan agreed. Weekly Tuesday syncs established. NOC team introductions and initial alert inventory completed.',
    },
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
    {
      date: '2026-04-08',
      decision: 'Biggy AI enrichment fields scoped to: incident summary, probable cause, blast radius, and suggested remediation — NOT auto-resolve',
      context: 'Agreed in Biggy AI design session. Auto-resolve will be evaluated in 30-day pilot. AI summaries subject to compliance masking TBD (Q-GB-001).',
    },
    {
      date: '2026-03-28',
      decision: 'SNOW integration will use bi-directional webhook (not polling) with UAT-first approach before production cutover',
      context: 'Polling rejected due to ITSM API rate limits. Webhook validated in UAT. Production cutover post-upgrade freeze (post April 30).',
    },
    {
      date: '2026-02-20',
      decision: 'Nagios noise suppression policy applied globally — suppress checks with no state change in prior 10 minutes',
      context: 'Agreed in correlation workshop. Reduces Nagios volume ~55% based on 60-day historical analysis. Exception list maintained by NOC team.',
    },
    {
      date: '2026-01-20',
      decision: 'Phase 2 Cloud Platform team onboarding will not begin until NOC Phase 1 enablement is complete and FP rate is <15%',
      context: 'Risk-based decision: starting Phase 2 before correlation quality is proven would undermine confidence of new teams. Threshold agreed with Victor Osei.',
    },
    {
      date: '2026-01-05',
      decision: 'ADR correlation and NOC enablement precedes Biggy AI — foundational data quality required before AI can produce reliable summaries',
      context: 'Agreed at kickoff. Minimum 90 days of production alert data required for Biggy AI baseline. Kickoff set ADR-first sequence.',
    },
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
    { name: 'ADR — Alert Ingestion & Correlation', track: 'ADR', current_status: 'Production live. 14 sources ingesting. Correlation engine active. FP rate 18%, target <10% by June via ongoing tuning.', lead: 'Maria Santos', last_updated: '2026-04-18', state: 'green' },
    { name: 'ADR — ServiceNow Automation', track: 'ADR', current_status: 'UAT in progress. 6/10 test scenarios passing. Production cutover after ITSM upgrade freeze (post April 30).', lead: 'Maria Santos', last_updated: '2026-04-18', state: 'yellow' },
    { name: 'Biggy AI — Incident Intelligence Pilot', track: 'Biggy', current_status: 'Blocked by CISO security review. Data residency concern (R-GB-004) may require EU serving architecture. Design complete, pilot ready pending approval.', lead: 'Ryan Park', last_updated: '2026-04-18', state: 'red' },
    { name: 'NOC Enablement — Phase 1 Teams', track: 'ADR', current_status: 'Complete. 24 NOC operators trained. MTTA at 22 min. FP tuning ongoing for Payments window.', lead: 'Ryan Park', last_updated: '2026-04-01', state: 'green' },
    { name: 'Slack Workflow Integration', track: 'Biggy', current_status: 'Phase 2 item. Sandbox configured. Awaiting Phase 1 ServiceNow completion before enablement.', lead: 'Ryan Park', last_updated: '2026-04-08', state: 'grey' },
    { name: 'Phase 2 — Cloud Platform & Security Ops', track: 'ADR', current_status: 'Not started. Planning begins after NOC Phase 1 FP rate target met (<15%). Estimated start June 2026.', lead: 'Maria Santos', last_updated: '2026-04-01', state: 'grey' },
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
    { title: 'Reduce P1 MTTA from 48 min to <8 min', track: 'ADR', description: 'Alert correlation surfaces root cause incidents — eliminating manual triage and alert storm distraction.', delivery_status: 'in_progress' as const, mapping_note: 'Current MTTA: 22 min (down from 48 min baseline at kickoff). Target: <8 min by June 2026. ServiceNow auto-create will remove the remaining manual step.' },
    { title: 'Eliminate manual SNOW ticket creation for P1/P2 incidents', track: 'ADR', description: 'Automated SNOW ticket creation from BigPanda incidents removes NOC manual entry — ~80 tickets/day.', delivery_status: 'in_progress' as const, mapping_note: 'UAT in progress. Manual SNOW creation still active in production. Full automation expected post-April 30.' },
    { title: 'Reduce Tier 2 escalations from 41% to <20%', track: 'Biggy', description: 'Biggy AI provides guided remediation steps enabling NOC Tier 1 to resolve more incidents independently.', delivery_status: 'planned' as const, mapping_note: 'Blocked by Biggy AI approval. Baseline: 41% of incidents escalate to Tier 2. Target: <20% within 90 days of pilot.' },
    { title: 'AI-generated incident summaries in every P1/P2 SNOW ticket', track: 'Biggy', description: 'Biggy AI enriches SNOW tickets with probable cause, blast radius, and remediation steps at incident creation.', delivery_status: 'planned' as const, mapping_note: 'Design complete. Compliance masking question (Q-GB-001) may affect field visibility. Blocked by CISO approval.' },
    { title: 'Zero SLA breaches in P1 incident response by end of 2026', track: 'ADR', description: 'Combination of correlation, automation, and AI context eliminates conditions that caused Q1 2026 SLA misses.', delivery_status: 'in_progress' as const, mapping_note: 'Q1 2026: 3 SLA breaches. Q2 2026 (so far): 0 breaches since BigPanda go-live. Sustained performance needed.' },
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
    { team_name: 'NOC Operations', track: 'ADR', ingest_status: 'live' as const, correlation_status: 'live' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'in_progress' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'Payments Operations', track: 'ADR', ingest_status: 'live' as const, correlation_status: 'in_progress' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'in_progress' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'Cloud Platform', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'Application Delivery', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'Security Operations', track: 'Biggy', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'Database Operations', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
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
  const archIntegDefs = [
    { tool_name: 'PagerDuty', track: 'ADR', phase: 'Phase 1', status: 'live' as const, integration_method: 'REST API v2', notes: 'Primary alerting — ~9,000 alerts/day. NOC + Payments teams.' },
    { tool_name: 'Dynatrace', track: 'ADR', phase: 'Phase 1', status: 'live' as const, integration_method: 'Webhook + DT API', notes: 'APM + infrastructure. SmartScape correlation enabled.' },
    { tool_name: 'Splunk', track: 'ADR', phase: 'Phase 1', status: 'live' as const, integration_method: 'Splunk Alert Actions', notes: 'SIEM alerts and log anomaly detection events.' },
    { tool_name: 'Nagios', track: 'ADR', phase: 'Phase 1', status: 'live' as const, integration_method: 'SNMP Trap + REST', notes: 'Legacy infra monitoring. Noise suppression policy active.' },
    { tool_name: 'ServiceNow', track: 'ADR', phase: 'Phase 1', status: 'in_progress' as const, integration_method: 'Bi-directional Webhook', notes: 'UAT validated. Production cutover post-ITSM freeze (May 2026).' },
    { tool_name: 'Slack', track: 'Biggy', phase: 'Phase 2', status: 'planned' as const, integration_method: 'Slack Workflow Builder + API', notes: 'NOC ack/resolve workflow. Biggy AI summary delivery channel.' },
    { tool_name: 'AWS CloudWatch', track: 'ADR', phase: 'Phase 2', status: 'planned' as const, integration_method: 'AWS EventBridge + REST', notes: 'Cloud Platform team. Multi-region config needed.' },
    { tool_name: 'Azure Monitor', track: 'ADR', phase: 'Phase 2', status: 'planned' as const, integration_method: 'Azure Event Hub', notes: 'Cloud Platform team Azure workloads.' },
    { tool_name: 'Biggy AI', track: 'Biggy', phase: 'Phase 2', status: 'planned' as const, integration_method: 'BigPanda Native', notes: 'Blocked by CISO review. EU data residency architecture under evaluation.' },
  ];

  for (const ai of archIntegDefs) {
    const ex = await db.select({ id: architectureIntegrations.id }).from(architectureIntegrations)
      .where(sql`${architectureIntegrations.project_id} = ${projectId} AND ${architectureIntegrations.tool_name} = ${ai.tool_name} AND ${architectureIntegrations.track} = ${ai.track}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(architectureIntegrations).values({ project_id: projectId, source: 'manual', ...ai });
      console.log(`  ✓ Arch Integration: ${ai.tool_name} (${ai.track})`);
    }
  }

  // ─── Arch Tracks + Nodes (Architecture tab) ───────────────────────────────
  const trackDefs = [
    { name: 'Alert Pipeline', display_order: 1 },
    { name: 'AI & Automation', display_order: 2 },
    { name: 'ITSM & Workflows', display_order: 3 },
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
    // Alert Pipeline
    { track: 'Alert Pipeline', name: 'PagerDuty', display_order: 1, status: 'live' as const, notes: '9k alerts/day — primary NOC source.' },
    { track: 'Alert Pipeline', name: 'Dynatrace', display_order: 2, status: 'live' as const, notes: 'APM + SmartScape. Full topology correlation.' },
    { track: 'Alert Pipeline', name: 'Splunk', display_order: 3, status: 'live' as const, notes: 'SIEM events and log anomalies.' },
    { track: 'Alert Pipeline', name: 'Nagios', display_order: 4, status: 'live' as const, notes: 'Legacy infra. Noise filter active.' },
    { track: 'Alert Pipeline', name: 'BigPanda Correlation Engine', display_order: 5, status: 'live' as const, notes: '18 correlation rules across 5 domains. FP rate 18%.' },
    { track: 'Alert Pipeline', name: 'AWS CloudWatch', display_order: 6, status: 'planned' as const, notes: 'Phase 2 — Cloud Platform team.' },
    { track: 'Alert Pipeline', name: 'Azure Monitor', display_order: 7, status: 'planned' as const, notes: 'Phase 2 — Cloud Platform team Azure.' },
    // AI & Automation
    { track: 'AI & Automation', name: 'Biggy AI — Incident Intelligence', display_order: 1, status: 'planned' as const, notes: 'Blocked by CISO review. EU serving architecture pending.' },
    { track: 'AI & Automation', name: 'Biggy AI — SNOW Enrichment', display_order: 2, status: 'planned' as const, notes: 'Will inject AI summaries into SNOW P1/P2 tickets.' },
    { track: 'AI & Automation', name: 'Slack Workflow — NOC Ack/Resolve', display_order: 3, status: 'planned' as const, notes: 'Phase 2. Sandbox configured. Launch post-SNOW automation.' },
    // ITSM & Workflows
    { track: 'ITSM & Workflows', name: 'ServiceNow Webhook (Inbound)', display_order: 1, status: 'in_progress' as const, notes: 'UAT passing. Production cutover May 2026.' },
    { track: 'ITSM & Workflows', name: 'ServiceNow Webhook (Outbound)', display_order: 2, status: 'in_progress' as const, notes: 'Auto-close confirmed in UAT. Production pending.' },
    { track: 'ITSM & Workflows', name: 'CMDB Enrichment', display_order: 3, status: 'planned' as const, notes: 'Phase 2 item — deferred from SNOW integration scope.' },
  ];

  for (const n of nodeDefs) {
    const trackId = trackIds[n.track];
    if (!trackId) continue;
    const ex = await db.select({ id: archNodes.id }).from(archNodes)
      .where(sql`${archNodes.project_id} = ${projectId} AND ${archNodes.track_id} = ${trackId} AND ${archNodes.name} = ${n.name}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(archNodes).values({ project_id: projectId, track_id: trackId, display_order: n.display_order, name: n.name, status: n.status, notes: n.notes });
      console.log(`  ✓ Arch Node: ${n.name}`);
    }
  }

  // ─── E2E Workflows ────────────────────────────────────────────────────────
  const workflowDefs = [
    {
      workflow_name: 'P1 Incident — Alert to Resolution',
      team_name: 'NOC Operations',
      steps: [
        { label: 'PagerDuty / Dynatrace fire P1 alert', track: 'ADR', status: 'live', position: 1 },
        { label: 'BigPanda correlates with related alerts', track: 'ADR', status: 'live', position: 2 },
        { label: 'BigPanda incident created with root-cause context', track: 'ADR', status: 'live', position: 3 },
        { label: 'SNOW P1 ticket auto-created via webhook', track: 'ADR', status: 'in_progress', position: 4 },
        { label: 'Biggy AI enriches ticket with summary + remediation', track: 'Biggy', status: 'planned', position: 5 },
        { label: 'NOC resolves incident with AI-guided context', track: 'Biggy', status: 'planned', position: 6 },
        { label: 'BigPanda + SNOW auto-close on resolution', track: 'ADR', status: 'planned', position: 7 },
      ],
    },
    {
      workflow_name: 'Payments Alert Handling — Trading Hours',
      team_name: 'Payments Operations',
      steps: [
        { label: 'PagerDuty fires Payments domain alert', track: 'ADR', status: 'live', position: 1 },
        { label: 'BigPanda applies trading-hours correlation rules', track: 'ADR', status: 'in_progress', position: 2 },
        { label: 'Incident routed to Payments Operations queue', track: 'ADR', status: 'live', position: 3 },
        { label: 'Biggy AI identifies blast radius across payment services', track: 'Biggy', status: 'planned', position: 4 },
        { label: 'Payments Ops resolves and updates SNOW', track: 'ADR', status: 'in_progress', position: 5 },
      ],
    },
    {
      workflow_name: 'Cloud Platform Alert Ingestion',
      team_name: 'Cloud Platform',
      steps: [
        { label: 'AWS CloudWatch / Azure Monitor fire alerts', track: 'ADR', status: 'planned', position: 1 },
        { label: 'BigPanda ingests and correlates cloud alerts', track: 'ADR', status: 'planned', position: 2 },
        { label: 'SNOW ticket created with cloud topology context', track: 'ADR', status: 'planned', position: 3 },
        { label: 'Biggy AI identifies affected cloud services', track: 'Biggy', status: 'planned', position: 4 },
        { label: 'Cloud Platform team resolves and closes', track: 'ADR', status: 'planned', position: 5 },
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
    {
      title: 'Unblock Biggy AI — Drive CISO Review to Completion by May 15',
      tracks: 'Biggy',
      why_it_matters: 'Biggy AI is the primary value differentiator. A 6-week further delay pushes the Payments team pilot to Q3 and risks CTO sponsor confidence.',
      current_status: 'V2 questionnaire submitted April 8. CISO silent since. Alex Chen escalated to Victor Osei (CTO) on April 18 for support.',
      next_step: 'Victor Osei to request CISO ETA by April 25. If approval expected post-May 15, re-scope pilot to Phase 3 and adjust June go-live milestone.',
      bp_owner: 'Alex Chen',
      customer_owner: 'Priya Nair (CISO)',
    },
    {
      title: 'Correlation Quality — Reduce FP Rate to <10% by June 2026',
      tracks: 'ADR',
      why_it_matters: 'FP rate at 18% overall (28% in Payments trading window) causes alert fatigue and undermines NOC confidence. This is the #1 adoption quality metric.',
      current_status: 'Nagios noise filter deployed. 18 correlation rules configured. Payments tuning session scheduled April 30. FP rate down from 28% at go-live.',
      next_step: 'Run Payments-specific tuning session April 30. Ryan Park to define 3 additional correlation rules for trading-hours window. Re-measure FP rate May 7.',
      bp_owner: 'Ryan Park',
      customer_owner: 'Sam Okafor (Payments Ops Lead)',
    },
    {
      title: 'ServiceNow Production Automation — Complete by May 31',
      tracks: 'ADR',
      why_it_matters: 'Manual SNOW ticket creation is the last significant NOC friction point. Auto-creation removes ~80 manual tickets/day and is required to achieve MTTA <8 min target.',
      current_status: 'UAT passing (6/10 scenarios). ITSM upgrade freeze ends April 30. Production cutover window: May 1-7.',
      next_step: 'Carla Vance to confirm production change window for May 1. Alex Chen to send pre-cutover readiness checklist May 3.',
      bp_owner: 'Maria Santos',
      customer_owner: 'Carla Vance (ITSM Admin)',
    },
    {
      title: 'Prepare for NOC Lead Transition — Daniel Rivera Departing June 15',
      tracks: 'ADR',
      why_it_matters: 'Daniel Rivera owns all BigPanda operational knowledge for the NOC team. His departure without a successor plan is a delivery continuity risk (R-GB-006).',
      current_status: 'Successor candidate identified but not confirmed. Warm handoff requested. All runbooks and decision log documented.',
      next_step: 'Request successor confirmation from GlobalBank IT Director by May 1. Schedule joint handover session with Daniel and successor by May 15.',
      bp_owner: 'Alex Chen',
      customer_owner: 'GlobalBank IT Director',
    },
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
      .where(sql`${onboardingPhases.project_id} = ${projectId} AND ${onboardingPhases.name} = ${'Phase 1 — ADR Foundation & NOC Enablement'}`)
      .limit(1);
    if (ex.length > 0) return ex[0].id;
    const [row] = await db.insert(onboardingPhases).values({ project_id: projectId, name: 'Phase 1 — ADR Foundation & NOC Enablement', display_order: 1 }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 1');
    return row.id;
  })();

  const phase2Id = await (async () => {
    const ex = await db.select({ id: onboardingPhases.id }).from(onboardingPhases)
      .where(sql`${onboardingPhases.project_id} = ${projectId} AND ${onboardingPhases.name} = ${'Phase 2 — ServiceNow & Biggy AI Activation'}`)
      .limit(1);
    if (ex.length > 0) return ex[0].id;
    const [row] = await db.insert(onboardingPhases).values({ project_id: projectId, name: 'Phase 2 — ServiceNow & Biggy AI Activation', display_order: 2 }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 2');
    return row.id;
  })();

  const phase3Id = await (async () => {
    const ex = await db.select({ id: onboardingPhases.id }).from(onboardingPhases)
      .where(sql`${onboardingPhases.project_id} = ${projectId} AND ${onboardingPhases.name} = ${'Phase 3 — Cloud Platform & Full Scale'}`)
      .limit(1);
    if (ex.length > 0) return ex[0].id;
    const [row] = await db.insert(onboardingPhases).values({ project_id: projectId, name: 'Phase 3 — Cloud Platform & Full Scale', display_order: 3 }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 3');
    return row.id;
  })();

  const stepDefs = [
    { phase_id: phase1Id, name: 'All 14 Alert Sources Connected', status: 'complete' as const, owner: 'Maria Santos', display_order: 1, dependencies: [] as string[], updates: [{ date: '2026-03-15', note: 'All sources live in production. Go-live milestone M-GB-001 closed.' }] },
    { phase_id: phase1Id, name: 'Correlation Policy Baseline Configured (18 rules)', status: 'complete' as const, owner: 'Ryan Park', display_order: 2, dependencies: ['All 14 Alert Sources Connected'], updates: [{ date: '2026-02-20', note: 'Workshop complete. 18 rules across 5 domains.' }] },
    { phase_id: phase1Id, name: 'Nagios Noise Suppression Policy Active', status: 'complete' as const, owner: 'Ryan Park', display_order: 3, dependencies: ['All 14 Alert Sources Connected'], updates: [{ date: '2026-03-01', note: 'Noise filter live. Nagios volume reduced ~55%.' }] },
    { phase_id: phase1Id, name: 'NOC Team Training Complete (24 operators)', status: 'complete' as const, owner: 'Ryan Park', display_order: 4, dependencies: [] as string[], updates: [{ date: '2026-04-01', note: 'All 24 NOC operators trained. M-GB-003 closed.' }] },
    { phase_id: phase1Id, name: 'Correlation FP Rate Below 15%', status: 'in-progress' as const, owner: 'Ryan Park', display_order: 5, dependencies: ['Correlation Policy Baseline Configured (18 rules)'], updates: [{ date: '2026-04-18', note: 'Currently at 18%. Payments tuning session April 30.' }] },
    { phase_id: phase2Id, name: 'SNOW UAT Completed (All Scenarios)', status: 'in-progress' as const, owner: 'Maria Santos', display_order: 1, dependencies: [] as string[], updates: [{ date: '2026-04-18', note: '6/10 test scenarios passing. Target: complete by April 25.' }] },
    { phase_id: phase2Id, name: 'SNOW Production Cutover', status: 'not-started' as const, owner: 'Maria Santos', display_order: 2, dependencies: ['SNOW UAT Completed (All Scenarios)'], updates: [] },
    { phase_id: phase2Id, name: 'CISO Approval — Biggy AI', status: 'blocked' as const, owner: 'Alex Chen', display_order: 3, dependencies: [] as string[], updates: [{ date: '2026-04-18', note: 'V2 questionnaire under review. Escalated to CTO.' }] },
    { phase_id: phase2Id, name: 'Biggy AI Pilot — NOC & Payments Teams', status: 'not-started' as const, owner: 'Ryan Park', display_order: 4, dependencies: ['CISO Approval — Biggy AI', 'SNOW Production Cutover'], updates: [] },
    { phase_id: phase2Id, name: 'Slack Workflow Integration Live', status: 'not-started' as const, owner: 'Ryan Park', display_order: 5, dependencies: ['Biggy AI Pilot — NOC & Payments Teams'], updates: [] },
    { phase_id: phase3Id, name: 'Cloud Platform Team Alert Ingestion (AWS + Azure)', status: 'not-started' as const, owner: 'Maria Santos', display_order: 1, dependencies: ['Correlation FP Rate Below 15%'], updates: [] },
    { phase_id: phase3Id, name: 'Security Operations Team Onboarding', status: 'not-started' as const, owner: 'Alex Chen', display_order: 2, dependencies: [] as string[], updates: [] },
    { phase_id: phase3Id, name: 'Full Production Go-Live Sign-Off', status: 'not-started' as const, owner: 'Alex Chen', display_order: 3, dependencies: ['Cloud Platform Team Alert Ingestion (AWS + Azure)', 'Security Operations Team Onboarding'], updates: [] },
  ];

  for (const step of stepDefs) {
    const ex = await db.select({ id: onboardingSteps.id }).from(onboardingSteps)
      .where(sql`${onboardingSteps.project_id} = ${projectId} AND ${onboardingSteps.phase_id} = ${step.phase_id} AND ${onboardingSteps.name} = ${step.name}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(onboardingSteps).values({ project_id: projectId, phase_id: step.phase_id, name: step.name, status: step.status, owner: step.owner, display_order: step.display_order, dependencies: step.dependencies, updates: step.updates });
      console.log(`  ✓ Step: ${step.name.substring(0, 55)}`);
    }
  }

  // ─── Integrations ─────────────────────────────────────────────────────────
  const integrationDefs = [
    { tool: 'PagerDuty', category: 'Alerting', status: 'production' as const, color: '#06B6D4', notes: 'Live. ~9k alerts/day. NOC + Payments teams.', display_order: 1 },
    { tool: 'Dynatrace', category: 'APM', status: 'production' as const, color: '#8B5CF6', notes: 'Live. APM + SmartScape topology correlation.', display_order: 2 },
    { tool: 'Splunk', category: 'SIEM', status: 'production' as const, color: '#F59E0B', notes: 'Live. SIEM events + log anomalies.', display_order: 3 },
    { tool: 'Nagios', category: 'Infrastructure Monitoring', status: 'production' as const, color: '#EF4444', notes: 'Live. Noise filter active. Legacy system.', display_order: 4 },
    { tool: 'ServiceNow', category: 'ITSM', status: 'configured' as const, color: '#10B981', notes: 'UAT passing. Production May 2026.', display_order: 5 },
    { tool: 'Slack', category: 'Collaboration', status: 'not-connected' as const, color: '#4A154B', notes: 'Phase 2 — NOC workflow integration.', display_order: 6 },
    { tool: 'AWS CloudWatch', category: 'Cloud Monitoring', status: 'not-connected' as const, color: '#FF9900', notes: 'Phase 3 — Cloud Platform team.', display_order: 7 },
    { tool: 'Azure Monitor', category: 'Cloud Monitoring', status: 'not-connected' as const, color: '#0078D4', notes: 'Phase 3 — Cloud Platform team Azure.', display_order: 8 },
    { tool: 'Biggy AI', category: 'AI Incident Intelligence', status: 'not-connected' as const, color: '#6366F1', notes: 'Phase 2 — Pending CISO approval.', display_order: 9 },
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

  // ─── Tasks (Plan / Gantt tabs) ────────────────────────────────────────────
  const taskDefs = [
    // Phase 1 milestones
    { title: 'Configure PagerDuty + Dynatrace alert ingestion to staging', milestone_id: milestoneIds['M-GB-001'], start_date: '2026-01-06', due: '2026-01-20', status: 'done', owner: 'Maria Santos', priority: 'high', phase: 'integration' },
    { title: 'Configure Splunk + Nagios + 10 secondary sources to staging', milestone_id: milestoneIds['M-GB-001'], start_date: '2026-01-21', due: '2026-02-07', status: 'done', owner: 'Maria Santos', priority: 'high', phase: 'integration' },
    { title: 'Staging load test at 2x expected volume', milestone_id: milestoneIds['M-GB-001'], start_date: '2026-01-15', due: '2026-01-20', status: 'done', owner: 'Ryan Park', priority: 'medium', phase: 'integration' },
    { title: 'Correlation policy workshop — define 18 rules', milestone_id: milestoneIds['M-GB-001'], start_date: '2026-02-10', due: '2026-02-20', status: 'done', owner: 'Ryan Park', priority: 'high', phase: 'integration' },
    { title: 'Production go-live — all 14 sources', milestone_id: milestoneIds['M-GB-001'], start_date: '2026-03-10', due: '2026-03-15', status: 'done', owner: 'Maria Santos', priority: 'high', phase: 'integration' },
    // SNOW UAT
    { title: 'ServiceNow OAuth + webhook configuration in UAT', milestone_id: milestoneIds['M-GB-002'], start_date: '2026-03-17', due: '2026-04-04', status: 'done', owner: 'Maria Santos', priority: 'high', phase: 'integration' },
    { title: 'SNOW UAT test scenario execution (10 scenarios)', milestone_id: milestoneIds['M-GB-002'], start_date: '2026-04-07', due: '2026-04-25', status: 'in_progress', owner: 'Maria Santos', priority: 'high', phase: 'integration' },
    { title: 'SNOW production cutover', milestone_id: milestoneIds['M-GB-002'], start_date: '2026-05-01', due: '2026-05-07', status: 'todo', owner: 'Maria Santos', priority: 'high', phase: 'integration' },
    // NOC enablement
    { title: 'NOC team onboarding sessions (3 cohorts)', milestone_id: milestoneIds['M-GB-003'], start_date: '2026-03-01', due: '2026-03-28', status: 'done', owner: 'Ryan Park', priority: 'high', phase: 'onboarding' },
    { title: 'NOC runbook sign-off and distribution', milestone_id: milestoneIds['M-GB-003'], start_date: '2026-03-17', due: '2026-03-31', status: 'done', owner: 'Alex Chen', priority: 'medium', phase: 'onboarding' },
    // Biggy AI
    { title: 'CISO v2 security questionnaire — respond to all open items', milestone_id: milestoneIds['M-GB-004'], start_date: '2026-02-15', due: '2026-04-08', status: 'done', owner: 'Alex Chen', priority: 'high', phase: 'ai_pilot' },
    { title: 'Biggy AI enrichment field mapping + compliance review', milestone_id: milestoneIds['M-GB-004'], start_date: '2026-04-01', due: '2026-04-30', status: 'in_progress', owner: 'Ryan Park', priority: 'high', phase: 'ai_pilot' },
    { title: 'Biggy AI staging enablement and test', milestone_id: milestoneIds['M-GB-004'], start_date: '2026-05-01', due: '2026-05-16', status: 'todo', owner: 'Ryan Park', priority: 'medium', phase: 'ai_pilot' },
    { title: 'NOC + Payments Biggy AI pilot kick-off', milestone_id: milestoneIds['M-GB-004'], start_date: '2026-05-19', due: '2026-05-31', status: 'todo', owner: 'Alex Chen', priority: 'high', phase: 'ai_pilot' },
    // Cloud Platform
    { title: 'Cloud Platform team intro session + scope agreement', milestone_id: milestoneIds['M-GB-005'], start_date: '2026-06-01', due: '2026-06-14', status: 'todo', owner: 'Alex Chen', priority: 'medium', phase: 'onboarding' },
    { title: 'AWS CloudWatch + Azure Monitor integration config', milestone_id: milestoneIds['M-GB-005'], start_date: '2026-06-15', due: '2026-07-07', status: 'todo', owner: 'Maria Santos', priority: 'high', phase: 'integration' },
    { title: 'Cloud Platform team enablement and sign-off', milestone_id: milestoneIds['M-GB-005'], start_date: '2026-07-08', due: '2026-07-15', status: 'todo', owner: 'Ryan Park', priority: 'medium', phase: 'onboarding' },
    // Go-live
    { title: 'Full regression test — all integrations + AI workflows', milestone_id: milestoneIds['M-GB-006'], start_date: '2026-09-01', due: '2026-09-12', status: 'todo', owner: 'Maria Santos', priority: 'high', phase: 'golive' },
    { title: 'Hypercare monitoring plan finalized', milestone_id: milestoneIds['M-GB-006'], start_date: '2026-09-15', due: '2026-09-22', status: 'todo', owner: 'Ryan Park', priority: 'medium', phase: 'golive' },
    { title: 'Go-live announcement and handover to GlobalBank IT', milestone_id: milestoneIds['M-GB-006'], start_date: '2026-09-28', due: '2026-09-30', status: 'todo', owner: 'Alex Chen', priority: 'high', phase: 'golive' },
    // Unassigned
    { title: 'Correlation FP rate tuning — Payments trading-hours window', milestone_id: null, start_date: '2026-04-28', due: '2026-05-07', status: 'todo', owner: 'Ryan Park', priority: 'high', phase: null },
    { title: 'NOC Lead transition plan — Daniel Rivera handover', milestone_id: null, start_date: '2026-05-01', due: '2026-05-15', status: 'todo', owner: 'Alex Chen', priority: 'medium', phase: null },
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
  // L1 → L2 → L3 hierarchy with source_trace='seed' (not 'template') so dedup works correctly
  const wbsL1s = [
    { name: 'ADR Pipeline — Alert Ingestion', track: 'ADR', display_order: 1 },
    { name: 'ADR Pipeline — Correlation Engine', track: 'ADR', display_order: 2 },
    { name: 'ServiceNow Automation', track: 'ADR', display_order: 3 },
    { name: 'Biggy AI — Incident Intelligence', track: 'Biggy', display_order: 4 },
    { name: 'Team Onboarding', track: 'ADR', display_order: 5 },
  ];
  const wbsL1Ids: Record<string, number> = {};
  for (const l1 of wbsL1s) {
    const ex = await db.select({ id: wbsItems.id }).from(wbsItems)
      .where(sql`${wbsItems.project_id} = ${projectId} AND ${wbsItems.name} = ${l1.name} AND ${wbsItems.level} = 1`)
      .limit(1);
    if (ex.length === 0) {
      const [row] = await db.insert(wbsItems).values({ project_id: projectId, level: 1, parent_id: null, source_trace: 'seed', status: 'not_started', ...l1 }).returning({ id: wbsItems.id });
      wbsL1Ids[l1.name] = row.id;
      console.log(`  ✓ WBS L1: ${l1.name}`);
    } else {
      wbsL1Ids[l1.name] = ex[0].id;
    }
  }

  const wbsL2s = [
    { parent: 'ADR Pipeline — Alert Ingestion', name: 'Primary Sources (PagerDuty, Dynatrace, Splunk)', track: 'ADR', display_order: 1 },
    { parent: 'ADR Pipeline — Alert Ingestion', name: 'Secondary Sources (Nagios + 10 others)', track: 'ADR', display_order: 2 },
    { parent: 'ADR Pipeline — Alert Ingestion', name: 'Phase 2 Cloud Sources (AWS + Azure)', track: 'ADR', display_order: 3 },
    { parent: 'ADR Pipeline — Correlation Engine', name: 'Correlation Policy Configuration', track: 'ADR', display_order: 1 },
    { parent: 'ADR Pipeline — Correlation Engine', name: 'Noise Suppression Policies', track: 'ADR', display_order: 2 },
    { parent: 'ADR Pipeline — Correlation Engine', name: 'FP Rate Tuning & Optimization', track: 'ADR', display_order: 3 },
    { parent: 'ServiceNow Automation', name: 'Webhook Configuration', track: 'ADR', display_order: 1 },
    { parent: 'ServiceNow Automation', name: 'UAT & Validation', track: 'ADR', display_order: 2 },
    { parent: 'ServiceNow Automation', name: 'Production Cutover', track: 'ADR', display_order: 3 },
    { parent: 'Biggy AI — Incident Intelligence', name: 'CISO Security Approval', track: 'Biggy', display_order: 1 },
    { parent: 'Biggy AI — Incident Intelligence', name: 'Enrichment Design & Compliance', track: 'Biggy', display_order: 2 },
    { parent: 'Biggy AI — Incident Intelligence', name: 'Pilot Activation', track: 'Biggy', display_order: 3 },
    { parent: 'Team Onboarding', name: 'NOC Operations Team', track: 'ADR', display_order: 1 },
    { parent: 'Team Onboarding', name: 'Payments Operations Team', track: 'ADR', display_order: 2 },
    { parent: 'Team Onboarding', name: 'Cloud Platform Team', track: 'ADR', display_order: 3 },
  ];
  const wbsL2Ids: Record<string, number> = {};
  for (const l2 of wbsL2s) {
    const parentId = wbsL1Ids[l2.parent];
    if (!parentId) continue;
    const ex = await db.select({ id: wbsItems.id }).from(wbsItems)
      .where(sql`${wbsItems.project_id} = ${projectId} AND ${wbsItems.name} = ${l2.name} AND ${wbsItems.level} = 2`)
      .limit(1);
    if (ex.length === 0) {
      const [row] = await db.insert(wbsItems).values({ project_id: projectId, level: 2, parent_id: parentId, source_trace: 'seed', status: 'not_started', track: l2.track, name: l2.name, display_order: l2.display_order }).returning({ id: wbsItems.id });
      wbsL2Ids[l2.name] = row.id;
      console.log(`  ✓ WBS L2: ${l2.name}`);
    } else {
      wbsL2Ids[l2.name] = ex[0].id;
    }
  }

  // ─── Time Entries (Time tab) ──────────────────────────────────────────────
  const timeEntryDefs = [
    { date: '2026-04-14', hours: '2.5', description: 'Weekly NOC sync + action item follow-up', user_id: 'default' },
    { date: '2026-04-14', hours: '3.0', description: 'SNOW UAT scenario execution — 3 test cases', user_id: 'default' },
    { date: '2026-04-15', hours: '1.5', description: 'CISO escalation prep — updated briefing doc for CTO', user_id: 'default' },
    { date: '2026-04-15', hours: '4.0', description: 'Correlation tuning analysis — Payments trading window FP data', user_id: 'default' },
    { date: '2026-04-16', hours: '2.0', description: 'Weekly status report drafting and customer review', user_id: 'default' },
    { date: '2026-04-16', hours: '3.5', description: 'SNOW webhook debugging — two routing edge cases resolved', user_id: 'default' },
    { date: '2026-04-17', hours: '2.0', description: 'Biggy AI pilot planning session with Ryan Park', user_id: 'default' },
    { date: '2026-04-17', hours: '1.5', description: 'Risk register review — R-GB-004 data residency follow-up', user_id: 'default' },
    { date: '2026-04-18', hours: '3.0', description: 'Weekly exec sync with Victor Osei — Biggy AI escalation', user_id: 'default' },
    { date: '2026-04-18', hours: '2.5', description: 'NOC lead transition planning — documentation review', user_id: 'default' },
  ];

  for (const te of timeEntryDefs) {
    const ex = await db.select({ id: timeEntries.id }).from(timeEntries)
      .where(sql`${timeEntries.project_id} = ${projectId} AND ${timeEntries.date} = ${te.date} AND ${timeEntries.description} = ${te.description}`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(timeEntries).values({ project_id: projectId, ...te });
      console.log(`  ✓ Time Entry: ${te.date} — ${te.description.substring(0, 45)}`);
    }
  }

  // ─── Team Pathways ────────────────────────────────────────────────────────
  const pathwayDefs = [
    {
      team_name: 'NOC Operations',
      status: 'live' as const,
      notes: 'Fully onboarded. Running BigPanda as primary triage interface. MTTA improving.',
      route_steps: [
        { label: 'Alert Ingestion (14 sources)' },
        { label: 'BigPanda Correlation' },
        { label: 'NOC Triage + Ack' },
        { label: 'SNOW Ticket (manual → auto)' },
        { label: 'Resolution + Close' },
      ],
    },
    {
      team_name: 'Payments Operations',
      status: 'in_progress' as const,
      notes: 'Ingestion live. Correlation tuning in progress for trading hours window.',
      route_steps: [
        { label: 'PagerDuty Payments Alerts' },
        { label: 'BigPanda Correlation (tuning)' },
        { label: 'Payments Queue Routing' },
        { label: 'Analyst Triage' },
        { label: 'SNOW Ticket' },
      ],
    },
    {
      team_name: 'Cloud Platform',
      status: 'planned' as const,
      notes: 'Phase 3 onboarding. Starts after NOC FP rate <15%.',
      route_steps: [
        { label: 'AWS CloudWatch + Azure Monitor' },
        { label: 'BigPanda Ingestion' },
        { label: 'Cloud Correlation Policy' },
        { label: 'SNOW Auto-Ticket' },
        { label: 'Biggy AI Enrichment' },
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

  console.log(`\n✅ GlobalBank demo seed complete! Project id=${projectId}`);
  console.log(`   Navigate to: /customer/${projectId}/overview`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
