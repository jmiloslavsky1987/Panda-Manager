/**
 * seed-firstenergy.ts — Create and populate "FirstEnergy — AIOps Modernisation" demo project.
 *
 * Run (local): npx tsx scripts/seed-firstenergy.ts
 * Run (Docker): docker exec install-app-1 npx tsx scripts/seed-firstenergy.ts
 *
 * Scenario: US utility company in mid-deployment. ADR foundation complete, Biggy AI
 * pilot active, two teams live, three more onboarding. Project is on-track overall
 * with one medium risk around a legacy SCADA integration.
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
  timeEntries,
  wbsItems,
  archTracks,
  archNodes,
  beforeState,
  teamPathways,
  knowledgeBase,
  users,
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const PROJECT_NAME = 'FirstEnergy — AIOps Modernisation';

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
      customer: 'FirstEnergy',
      overall_status: 'green',
      status_summary: 'ADR pipeline live across all 5 primary sources. Biggy AI pilot active with NOC and Grid Operations teams — 89% incident summary accuracy reported. OT Network SCADA integration delayed 2 weeks due to firewall change control window. All other milestones on track.',
      go_live_target: '2026-08-15',
      last_updated: '2026-04-20',
      description: 'AIOps transformation for FirstEnergy covering real-time alert correlation across generation, transmission, and distribution infrastructure. Five operations teams onboarding over two phases, with Biggy AI incident intelligence active in Phase 1 for NOC and Grid Operations.',
      start_date: '2026-02-03',
      end_date: '2026-10-31',
      active_tracks: { adr: true, biggy: true },
    }).returning({ id: projects.id });
    projectId = row.id;
    console.log(`Created new project: "${PROJECT_NAME}" (id=${projectId})`);
  }

  await db.update(projects).set({
    overall_status: 'green',
    status_summary: 'ADR pipeline live across all 5 primary sources. Biggy AI pilot active with NOC and Grid Operations teams — 89% incident summary accuracy reported. OT Network SCADA integration delayed 2 weeks due to firewall change control window. All other milestones on track.',
    go_live_target: '2026-08-15',
    last_updated: '2026-04-20',
    description: 'AIOps transformation for FirstEnergy covering real-time alert correlation across generation, transmission, and distribution infrastructure. Five operations teams onboarding over two phases, with Biggy AI incident intelligence active in Phase 1 for NOC and Grid Operations.',
    start_date: '2026-02-03',
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
      aggregation_hub_name: 'IBM Tivoli Netcool',
      alert_to_ticket_problem: 'Grid and generation operations teams receive 18,000+ alerts per day from OT and IT monitoring tools. Tivoli correlations are hand-maintained rule files — last updated 2023. NOC operators manually create Remedy tickets for every escalation. P1 MTTA averaging 52 minutes against a 15-minute SLA target. Grid operations team bypassing Netcool entirely and reacting directly to source alerts.',
      pain_points_json: [
        'Manual Tivoli correlation rules stale since 2023 — 62% of correlated incidents are false positives',
        'P1 MTTA at 52 min vs 15 min SLA — 6 SLA breaches in Q1 2026',
        'Grid Ops team bypasses NOC tooling entirely — creating shadow ticketing in spreadsheets',
        'No cross-domain visibility: OT (SCADA) and IT (Dynatrace/SolarWinds) alerts treated as silos',
        'Remedy ticket duplication: same incident creates 3-8 tickets across NOC, Grid Ops, and Field teams',
      ],
      source: 'manual',
    });
    console.log('  ✓ Before State');
  }

  // ─── Artifacts ────────────────────────────────────────────────────────────
  const artifactDefs = [
    { external_id: 'X-FE-001', name: 'FirstEnergy AIOps Kickoff Deck', status: 'approved', owner: 'Jordan Lee', description: 'Kickoff presentation: project scope, two-phase delivery plan, team assignments, and success metrics.' },
    { external_id: 'X-FE-002', name: 'ADR Correlation Policy Design — v1.2', status: 'approved', owner: 'Sofia Reyes', description: 'Correlation policy architecture covering 5 alert domains, SCADA integration patterns, and cross-domain correlation rules.' },
    { external_id: 'X-FE-003', name: 'Biggy AI Pilot Results — Week 4 Report', status: 'approved', owner: 'Marcus Webb', description: 'Week 4 pilot metrics: 89% incident summary accuracy, 31-minute MTTA reduction (52→21 min), 94 Remedy tickets eliminated in pilot window.' },
    { external_id: 'X-FE-004', name: 'OT Network SCADA Integration Design', status: 'in_progress', owner: 'Sofia Reyes', description: 'Technical design for SCADA-to-BigPanda integration via OSIsoft PI + OPC-UA bridge. Pending OT security team sign-off.' },
    { external_id: 'X-FE-005', name: 'Weekly Status — Week of 2026-04-14', status: 'sent', owner: 'Jordan Lee', description: 'Status update covering Biggy AI pilot progress, SCADA delay, Phase 2 planning kick-off.' },
    { external_id: 'X-FE-006', name: 'Remedy Automation Runbook', status: 'approved', owner: 'Sofia Reyes', description: 'Step-by-step runbook for Remedy bi-directional webhook: incident create, update, and auto-close flows.' },
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
    { external_id: 'A-FE-001', description: 'Resolve SCADA firewall change control — get OT security team to approve BigPanda outbound rules for PI server', owner: 'Sofia Reyes', due: '2026-04-28', status: 'in_progress' as const, notes: 'Change control ticket submitted April 16. OT security review scheduled April 24. Two-week delay expected vs original plan.', type: 'action' },
    { external_id: 'A-FE-002', description: 'Expand Biggy AI pilot to Transmission Operations team — prepare context briefing and schedule onboarding session', owner: 'Marcus Webb', due: '2026-05-05', status: 'open' as const, notes: 'Phase 2 preparation. Transmission team lead confirmed interest April 18. Pilot kit ready.', type: 'action' },
    { external_id: 'A-FE-003', description: 'Tune correlation FP rate for Generation domain — current rate 14%, target <8% before Phase 2 expansion', owner: 'Sofia Reyes', due: '2026-05-02', status: 'open' as const, notes: 'Generation domain alerts have high seasonality in spring (load shedding tests). Custom tuning session needed with Grid Ops team.', type: 'action' },
    { external_id: 'A-FE-004', description: 'Deliver Remedy automation go-live sign-off — confirm production webhook with ITSM team post-UAT completion', owner: 'Jordan Lee', due: '2026-04-30', status: 'open' as const, notes: 'UAT complete. Waiting on ITSM change window approval. Jordan to confirm date with Tom Callahan.', type: 'action' },
    { external_id: 'A-FE-005', description: 'Quarterly business review deck — prepare executive summary with Biggy AI pilot metrics for SVP Operations', owner: 'Jordan Lee', due: '2026-05-12', status: 'open' as const, notes: 'QBR scheduled May 14. Deck due May 12. Include MTTA improvement, ticket reduction, and Phase 2 roadmap.', type: 'action' },
    { external_id: 'A-FE-006', description: 'Configure SolarWinds NPM integration for Distribution network monitoring', owner: 'Sofia Reyes', due: '2026-06-01', status: 'open' as const, notes: 'Phase 2 item. SolarWinds admin credentials obtained. Integration design in X-FE-002.', type: 'action' },
    { external_id: 'A-FE-007', description: 'Validate Dynatrace APM correlation with SAP ERP alerts — confirm blast radius accuracy for financial system incidents', owner: 'Marcus Webb', due: '2026-04-16', status: 'completed' as const, notes: 'Completed 2026-04-14. 12 test incidents validated. Blast radius accuracy confirmed at 91%. Two enrichment field adjustments made.', type: 'action' },
    { external_id: 'Q-FE-001', description: 'Should Biggy AI incident summaries reference NERC CIP asset classifications in the generated text, or is that data considered restricted for SNOW ticket visibility?', owner: 'FirstEnergy Compliance', due: 'TBD', status: 'open' as const, notes: 'NERC CIP compliance question raised in Biggy AI pilot review. Compliance team reviewing asset classification policy.', type: 'question' },
    { external_id: 'Q-FE-002', description: 'Does FirstEnergy want Remedy tickets auto-closed when BigPanda incident resolves, or require NOC confirmation for P1s specifically?', owner: 'Tom Callahan (ITSM)', due: 'TBD', status: 'open' as const, notes: 'Discussed in Remedy UAT planning. NOC prefers manual confirmation for P1s only. Tom to confirm ITSM policy with ops director.', type: 'question' },
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
    { external_id: 'R-FE-001', description: 'SCADA firewall change control delay may push OT Network integration 2–3 weeks, affecting Phase 2 expansion timeline', severity: 'medium' as const, owner: 'Sofia Reyes', mitigation: 'Submitted OT security change ticket April 16. Escalated to VP of Grid Operations. Parallel work on non-OT Phase 2 sources to maintain momentum.', status: 'open', last_updated: '2026-04-20', likelihood: 'medium', impact: 'medium', target_date: '2026-05-01' },
    { external_id: 'R-FE-002', description: 'NERC CIP compliance requirements may restrict Biggy AI from referencing certain asset classifications in SNOW ticket enrichment fields', severity: 'medium' as const, owner: 'FirstEnergy Compliance', mitigation: 'Opened question Q-FE-001 with compliance team. Designed fallback: masked enrichment mode that omits CIP asset IDs from public ticket fields.', status: 'open', last_updated: '2026-04-18', likelihood: 'low', impact: 'high', target_date: '2026-05-15' },
    { external_id: 'R-FE-003', description: 'Key SME (Grid Ops Technical Lead) is sole owner of SCADA alarm configuration — single point of failure for correlation policy tuning', severity: 'high' as const, owner: 'Jordan Lee', mitigation: 'Requested backup SME assignment from VP Grid Ops. Documenting all SCADA alarm taxonomy in shared runbook. Knowledge transfer session scheduled May 3.', status: 'open', last_updated: '2026-04-20', likelihood: 'medium', impact: 'high', target_date: '2026-05-10' },
    { external_id: 'R-FE-004', description: 'Legacy Tivoli Netcool decommission timeline unknown — dual-running both platforms may cause alert duplication if not managed carefully', severity: 'medium' as const, owner: 'Sofia Reyes', mitigation: 'Implemented alert source tagging to deduplicate cross-platform events. Tivoli decommission date being tracked with infrastructure team. Target: Tivoli dark by July 2026.', status: 'mitigated', last_updated: '2026-04-10', likelihood: 'low', impact: 'medium', target_date: '2026-07-01' },
    { external_id: 'R-FE-005', description: 'Spring load-shedding tests (May 2–5) will generate 4x normal alert volume — correlation performance under load not yet validated for this event type', severity: 'low' as const, owner: 'Marcus Webb', mitigation: 'Load test scheduled April 28 at 3x volume. Contingency runbook drafted. Tivoli kept on standby for May 2–5 window as fallback.', status: 'open', last_updated: '2026-04-19', likelihood: 'low', impact: 'low', target_date: '2026-04-28' },
    { external_id: 'R-FE-006', description: 'Remedy ITSM upgrade scheduled Q3 2026 may require BigPanda webhook reconfiguration mid-delivery', severity: 'low' as const, owner: 'Tom Callahan (ITSM)', mitigation: 'Confirmed webhook interface is stable across Remedy upgrade. IT team to notify BigPanda PS 4 weeks before upgrade window. No action needed until Q3.', status: 'accepted', last_updated: '2026-04-05', likelihood: 'low', impact: 'low', target_date: 'TBD' },
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
    { external_id: 'M-FE-001', name: 'Phase 1 ADR Pipeline — Production Go-Live', status: 'complete' as const, date: '2026-03-10', owner: 'Sofia Reyes', notes: 'All 5 primary sources live. NOC and Grid Ops ingesting. Load test at 3x volume passed. Tivoli running in parallel for validation.' },
    { external_id: 'M-FE-002', name: 'Biggy AI Pilot — NOC & Grid Operations', status: 'on_track' as const, date: '2026-05-15', owner: 'Marcus Webb', notes: 'Week 4 metrics: 89% summary accuracy, MTTA 21 min. Expanding pilot scope to 2 additional incident types. Full rollout after 8-week pilot window.' },
    { external_id: 'M-FE-003', name: 'Remedy Automation — Production Go-Live', status: 'on_track' as const, date: '2026-04-30', owner: 'Sofia Reyes', notes: 'UAT complete (all scenarios passing). Production change window targeting May 1. Pending ITSM director sign-off (Q-FE-002).' },
    { external_id: 'M-FE-004', name: 'OT Network SCADA Integration Live', status: 'at_risk' as const, date: '2026-05-20', owner: 'Sofia Reyes', notes: 'Delayed 2 weeks by OT firewall change control. Original target was May 6. Revised to May 20. No downstream cascade if SCADA in by May 20.' },
    { external_id: 'M-FE-005', name: 'Phase 2 — Transmission & Distribution Teams Live', status: 'on_track' as const, date: '2026-07-15', owner: 'Jordan Lee', notes: 'Phase 2 kick-off meeting held April 18. Transmission team onboarding starting May 5. Distribution team following June.' },
    { external_id: 'M-FE-006', name: 'Full AIOps Production Go-Live — All Teams', status: 'on_track' as const, date: '2026-08-15', owner: 'Jordan Lee', notes: 'All 5 teams live, Biggy AI operational, Remedy automation running, Tivoli decommissioned. Phase 2 completion gate.' },
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
    { name: 'Jordan Lee', role: 'BigPanda PS Lead', company: 'BigPanda', email: 'jordan.lee@bigpanda.io', notes: 'Primary delivery lead. Owns executive relationship and QBR cadence.' },
    { name: 'Sofia Reyes', role: 'BigPanda Integration Engineer', company: 'BigPanda', email: 'sofia.reyes@bigpanda.io', notes: 'ADR pipeline, SCADA integration design, Remedy automation owner.' },
    { name: 'Marcus Webb', role: 'BigPanda Solutions Architect', company: 'BigPanda', email: 'marcus.webb@bigpanda.io', notes: 'Biggy AI design, correlation policy, pilot measurement.' },
    { name: 'Diana Huang', role: 'SVP Operations', company: 'FirstEnergy', email: 'd.huang@firstenergy.com', notes: 'Executive sponsor. Quarterly business reviews. P1 SLA accountability owner.' },
    { name: 'Roy Garrett', role: 'NOC Operations Manager', company: 'FirstEnergy', email: 'r.garrett@firstenergy.com', notes: 'NOC primary contact. Championing BigPanda adoption with NOC team. Biggy AI pilot owner.' },
    { name: 'Leila Vasquez', role: 'Grid Operations Technical Lead', company: 'FirstEnergy', email: 'l.vasquez@firstenergy.com', notes: 'SCADA alarm taxonomy SME. Only person who can modify SCADA correlation policies. Backup SME needed (R-FE-003).' },
    { name: 'Tom Callahan', role: 'ITSM Manager', company: 'FirstEnergy', email: 't.callahan@firstenergy.com', notes: 'Remedy ITSM owner. Owns production change windows and webhook sign-off.' },
    { name: 'Aisha Thompson', role: 'OT Security Lead', company: 'FirstEnergy', email: 'a.thompson@firstenergy.com', notes: 'Owns OT firewall change control approvals. NERC CIP compliance authority.' },
    { name: 'Chris Mendez', role: 'Transmission Operations Lead', company: 'FirstEnergy', email: 'c.mendez@firstenergy.com', notes: 'Phase 2 primary contact for Transmission team. Confirmed for pilot expansion May 5.' },
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
    { date: '2026-04-20', content: 'Weekly sync with FirstEnergy NOC and Grid Ops teams. Biggy AI Week 4 results presented: 89% summary accuracy, MTTA at 21 min (down from 52 min). Diana Huang joined the call and approved Phase 2 expansion. SCADA delay confirmed — Aisha Thompson expects OT firewall approval April 24.' },
    { date: '2026-04-14', content: 'Remedy UAT sign-off meeting with Tom Callahan and ITSM team. All 8 test scenarios passed. Production change window targeting May 1. Open question Q-FE-002 (auto-close behavior for P1s) to be answered before production cutover.' },
    { date: '2026-04-08', content: 'Biggy AI pilot Week 2 review. Week 2 metrics: 84% accuracy, 18 incidents processed, 47 Remedy tickets eliminated. Leila Vasquez raised NERC CIP compliance question about asset classification in ticket enrichment. Action Q-FE-001 opened with compliance team.' },
    { date: '2026-03-28', content: 'Phase 2 scoping session with Jordan Lee and Diana Huang. Agreed on Transmission team starting May 5, Distribution team in June. QBR date set for May 14. Jordan to prepare Phase 2 timeline and resource plan.' },
    { date: '2026-03-20', content: 'Biggy AI pilot kickoff — NOC and Grid Operations teams. Marcus Webb led pilot design session. 15 incident types selected for pilot. Enrichment fields defined: incident summary, probable cause, affected systems, and recommended action. Pilot window: 8 weeks.' },
    { date: '2026-03-10', content: 'M-FE-001 closed: Phase 1 ADR pipeline in production. All 5 sources confirmed live (PagerDuty, Dynatrace, SolarWinds Orion, Nagios, IBM Tivoli Netcool bridge). Load test at 3x volume passed. Tivoli running in parallel for 30-day validation window.' },
    { date: '2026-02-20', content: 'Correlation policy workshop with Sofia Reyes, Leila Vasquez (Grid Ops), and Roy Garrett (NOC). 22 correlation rules defined across 5 domains: Generation, Transmission, Distribution, IT Applications, and Network. Tivoli rule export reviewed — 67 rules deemed redundant and excluded.' },
    { date: '2026-02-03', content: 'Project kickoff at FirstEnergy Columbus HQ. Diana Huang opened with business case and SLA miss impact ($2.1M in penalties Q1 2025 and Q1 2026). Scope, two-phase timeline, and weekly Tuesday sync cadence agreed. NOC and Grid Ops team introductions completed.' },
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
    { date: '2026-04-08', decision: 'Biggy AI enrichment will use masked mode for NERC CIP asset references — full asset IDs omitted from SNOW ticket fields pending compliance ruling', context: 'Raised by Leila Vasquez in Week 2 pilot review. Masked mode implemented as default to unblock pilot. Compliance review (Q-FE-001) ongoing.' },
    { date: '2026-03-28', decision: 'Phase 2 expansion sequence: Transmission team first (May), then Distribution (June) — not simultaneous', context: 'Risk-based: running parallel team onboarding increases support load and correlation policy complexity. Sequential approach agreed with Diana Huang in Phase 2 scoping session.' },
    { date: '2026-03-10', decision: 'Tivoli Netcool bridge retained for 30-day parallel run after Phase 1 go-live — not decommissioned immediately', context: 'FirstEnergy ops team requires validation period before Tivoli dark. Bridge approach allows side-by-side comparison without service risk. Tivoli dark target: July 2026.' },
    { date: '2026-02-20', decision: '67 legacy Tivoli correlation rules excluded from BigPanda migration — replaced by 22 AI-assisted correlation policies', context: 'Sofia Reyes and Leila Vasquez reviewed all 134 Tivoli rules. 67 were redundant duplicates or suppression workarounds. Clean redesign preferred over direct migration.' },
    { date: '2026-02-03', decision: 'OT Network (SCADA) integration scoped to Phase 1 but placed last — ADR and Biggy AI value delivered before SCADA complexity resolved', context: 'Kickoff decision: SCADA integration is highest technical risk. Delivering IT-domain value first reduces dependency on OT security timelines. SCADA added after NOC and Grid Ops are stable.' },
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
    { name: 'ADR — Alert Ingestion & Correlation', track: 'ADR', current_status: 'Production live. 5 sources active. 22 correlation rules across 5 domains. FP rate 11% overall (Generation domain 14% — tuning in progress).', lead: 'Sofia Reyes', last_updated: '2026-04-20', state: 'green', percent_complete: 85 },
    { name: 'ADR — OT Network (SCADA) Integration', track: 'ADR', current_status: 'Delayed 2 weeks by OT firewall change control. SCADA design approved (X-FE-004). OSIsoft PI bridge configured in staging. OT security approval expected April 24.', lead: 'Sofia Reyes', last_updated: '2026-04-20', state: 'yellow', percent_complete: 40 },
    { name: 'ADR — Remedy ITSM Automation', track: 'ADR', current_status: 'UAT complete. All 8 test scenarios passing. Production cutover targeting May 1 pending ITSM change window sign-off.', lead: 'Sofia Reyes', last_updated: '2026-04-14', state: 'green', percent_complete: 90 },
    { name: 'Biggy AI — Incident Intelligence Pilot', track: 'Biggy', current_status: 'Week 4 pilot metrics: 89% summary accuracy, MTTA at 21 min (down from 52 min). 94 Remedy tickets eliminated. Expanding to Transmission team May 5.', lead: 'Marcus Webb', last_updated: '2026-04-20', state: 'green', percent_complete: 60 },
    { name: 'Phase 2 — Transmission & Distribution Onboarding', track: 'ADR', current_status: 'Kick-off complete. Transmission team starting May 5. Distribution team starting June 2. SolarWinds NPM integration design in progress.', lead: 'Jordan Lee', last_updated: '2026-04-18', state: 'green', percent_complete: 10 },
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
    { title: 'Reduce P1 MTTA from 52 min to <15 min', track: 'ADR', description: 'Alert correlation and Biggy AI guided remediation eliminate manual triage and alert storm distraction.', delivery_status: 'in_progress' as const, mapping_note: 'Current MTTA: 21 min in pilot window. Non-pilot NOC teams still at ~40 min. Remedy automation (M-FE-003) required to close the final gap.' },
    { title: 'Eliminate Remedy ticket duplication — one incident, one ticket', track: 'ADR', description: 'BigPanda correlation ensures a single P1 incident creates one Remedy ticket, not 3–8 duplicates across teams.', delivery_status: 'in_progress' as const, mapping_note: 'Pilot window: ticket duplication rate down 78%. Remedy auto-create (M-FE-003) will complete this. Production automation still manual.' },
    { title: 'Bring Grid Operations team back into centralized NOC tooling', track: 'ADR', description: 'Grid Ops team was bypassing Tivoli entirely. BigPanda correlation provides domain-specific views that make centralized tooling viable for OT teams.', delivery_status: 'in_progress' as const, mapping_note: 'Grid Ops team fully onboarded to BigPanda. Using centralized triage for 87% of incidents. SCADA integration (M-FE-004) required for the remaining 13% OT-only alerts.' },
    { title: 'Zero SLA breaches in P1 response for FY2026 H2', track: 'Biggy', description: 'Combination of ADR correlation, Biggy AI context, and Remedy automation removes the conditions that caused Q1 SLA breaches.', delivery_status: 'planned' as const, mapping_note: 'Q1 2026: 6 SLA breaches. April 2026 (pilot period): 0 breaches. Sustained performance required beyond pilot to count as delivered.' },
    { title: 'Decommission IBM Tivoli Netcool by July 2026', track: 'ADR', description: 'Full migration from legacy Tivoli to BigPanda eliminates dual-platform maintenance cost and complexity.', delivery_status: 'in_progress' as const, mapping_note: 'Tivoli in parallel run since March 10. Target dark date July 1 2026. Dependent on SCADA integration completing and 30-day stability confirmation.' },
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
    { team_name: 'NOC Operations', track: 'ADR', ingest_status: 'live' as const, correlation_status: 'live' as const, incident_intelligence_status: 'in_progress' as const, sn_automation_status: 'in_progress' as const, biggy_ai_status: 'pilot' as const },
    { team_name: 'Grid Operations', track: 'ADR', ingest_status: 'live' as const, correlation_status: 'in_progress' as const, incident_intelligence_status: 'pilot' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'pilot' as const },
    { team_name: 'OT Network (SCADA)', track: 'ADR', ingest_status: 'in_progress' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'Transmission Operations', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'Distribution Network', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
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
    // Event Ingest — all alert sources
    { tool_name: 'PagerDuty', track: 'ADR', phase: 'Event Ingest', status: 'live' as const, integration_method: 'REST API v2', notes: 'Primary IT alerting — ~6,200 alerts/day. NOC + Grid Ops.' },
    { tool_name: 'Dynatrace', track: 'ADR', phase: 'Event Ingest', status: 'live' as const, integration_method: 'Webhook + OneAgent', notes: 'APM + infrastructure. Full-stack correlation for SAP/ERP systems.' },
    { tool_name: 'SolarWinds Orion', track: 'ADR', phase: 'Event Ingest', status: 'live' as const, integration_method: 'SNMP Trap + REST API', notes: 'Network and infrastructure monitoring. NOC primary dashboard.' },
    { tool_name: 'Nagios', track: 'ADR', phase: 'Event Ingest', status: 'live' as const, integration_method: 'SNMP Trap', notes: 'Legacy check framework. Noise suppression policy active.' },
    { tool_name: 'IBM Tivoli Netcool (Bridge)', track: 'ADR', phase: 'Event Ingest', status: 'live' as const, integration_method: 'ObjectServer REST Bridge', notes: 'Parallel run only. Target decommission July 2026.' },
    { tool_name: 'OSIsoft PI (SCADA)', track: 'ADR', phase: 'Event Ingest', status: 'in_progress' as const, integration_method: 'OPC-UA + PI Web API', notes: 'OT firewall change control pending. Integration design approved (X-FE-004).' },
    { tool_name: 'SolarWinds NPM', track: 'ADR', phase: 'Event Ingest', status: 'planned' as const, integration_method: 'REST API', notes: 'Phase 2 — Distribution network monitoring.' },
    // Alert Intelligence — enrichment and CMDB context
    { tool_name: 'Grid Asset CMDB', track: 'ADR', phase: 'Alert Intelligence', status: 'live' as const, integration_method: 'REST API', notes: 'FirstEnergy asset registry — enriches alerts with grid topology, circuit IDs, and asset ownership.' },
    { tool_name: 'Dynatrace Topology', track: 'ADR', phase: 'Alert Intelligence', status: 'live' as const, integration_method: 'Smartscape API', notes: 'Full-stack dependency map for SAP/ERP alert blast radius enrichment.' },
    // Incident Intelligence — incident context and routing
    { tool_name: 'NERC CIP Asset Classifier', track: 'ADR', phase: 'Incident Intelligence', status: 'in_progress' as const, integration_method: 'Internal API', notes: 'Applies CIP asset classification to incidents. PHI-equivalent masking active pending compliance ruling (Q-FE-001).' },
    // Workflow Automation — ITSM
    { tool_name: 'Remedy ITSM', track: 'ADR', phase: 'Workflow Automation', status: 'in_progress' as const, integration_method: 'Bi-directional REST Webhook', notes: 'UAT complete. Production cutover May 1. Auto-create + auto-close for P2/P3. P1 manual confirm (Q-FE-002).' },
    // Biggy AI — Knowledge Sources
    { tool_name: 'Alert History & Correlation Patterns', track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'in_progress' as const, integration_method: 'BigPanda Native', notes: 'Phase 1 incident history ingested. 12 weeks of NOC and Grid Ops correlation patterns.' },
    { tool_name: 'Grid Operations Runbooks', track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'in_progress' as const, integration_method: 'Document Ingestion', notes: 'SCADA alarm runbooks and escalation procedures. NERC CIP masked mode applied.' },
    // Biggy AI — Real-Time Query Sources
    { tool_name: 'Live Incident Context (ADR Pipeline)', track: 'Biggy AI', phase: 'Real-Time Query Sources', status: 'in_progress' as const, integration_method: 'BigPanda Native', notes: 'Live alert correlation and incident state from ADR pipeline feeds Biggy AI context window.' },
    { tool_name: 'Dynatrace APM (Live)', track: 'Biggy AI', phase: 'Real-Time Query Sources', status: 'in_progress' as const, integration_method: 'Dynatrace API', notes: 'Real-time SAP/ERP application topology query for probable cause enrichment.' },
    // Biggy AI — Biggy Capabilities
    { tool_name: 'Biggy AI', track: 'Biggy AI', phase: 'Biggy Capabilities', status: 'pilot' as const, integration_method: 'BigPanda Native', notes: 'Active 8-week pilot — NOC & Grid Ops. Week 4: 89% summary accuracy, MTTA 21 min.' },
    // Biggy AI — Outputs & Actions
    { tool_name: 'Remedy ITSM Enrichment', track: 'Biggy AI', phase: 'Outputs & Actions', status: 'planned' as const, integration_method: 'Remedy REST API', notes: 'Post-pilot: inject AI incident summary into Remedy ticket description. NERC CIP masking required.' },
    { tool_name: 'Slack NOC Channel', track: 'Biggy AI', phase: 'Outputs & Actions', status: 'planned' as const, integration_method: 'Slack Workflow Builder', notes: 'Phase 2 — NOC ack/resolve workflow with Biggy AI summary in thread.' },
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
    { name: 'ADR', display_order: 1 },
    { name: 'Biggy AI', display_order: 2 },
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
    // ADR phases
    { track: 'ADR', name: 'Event Ingest', display_order: 1, status: 'live' as const, notes: 'PagerDuty, Dynatrace, SolarWinds, Nagios, Tivoli bridge — all live. OSIsoft PI (SCADA) in progress.' },
    { track: 'ADR', name: 'Alert Intelligence', display_order: 2, status: 'live' as const, notes: '22 correlation rules across 5 domains. FP rate 11%. Generation domain tuning in progress.' },
    { track: 'ADR', name: 'Incident Intelligence', display_order: 3, status: 'live' as const, notes: 'Incidents enriched with cross-domain context. SCADA incidents pending OT integration.' },
    { track: 'ADR', name: 'Console', display_order: 4, status: 'live' as const, notes: 'NOC and Grid Ops teams operating in BigPanda console.' },
    { track: 'ADR', name: 'Workflow Automation', display_order: 5, status: 'in_progress' as const, notes: 'Remedy ITSM webhook — UAT complete, production cutover May 1.' },
    // Biggy AI phases
    { track: 'Biggy AI', name: 'Knowledge Sources (Ingested)', display_order: 1, status: 'in_progress' as const, notes: 'Alert history and correlation patterns from Phase 1. NERC CIP asset classification pending compliance ruling.' },
    { track: 'Biggy AI', name: 'Real-Time Query Sources', display_order: 2, status: 'in_progress' as const, notes: 'Live incident context from ADR pipeline feeding Biggy AI enrichment.' },
    { track: 'Biggy AI', name: 'Biggy Capabilities', display_order: 3, status: 'in_progress' as const, notes: 'Active 8-week pilot — NOC & Grid Ops. Week 4: 89% summary accuracy, MTTA 21 min.' },
    { track: 'Biggy AI', name: 'Console', display_order: 4, status: 'in_progress' as const, notes: 'NOC and Grid Ops accessing Biggy AI incident summaries in BigPanda console.' },
    { track: 'Biggy AI', name: 'Outputs & Actions', display_order: 5, status: 'planned' as const, notes: 'Remedy ticket enrichment post-pilot. NERC CIP masking mode pending compliance ruling (Q-FE-001).' },
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
      workflow_name: 'P1 Incident — Grid Alert to Resolution',
      team_name: 'Grid Operations',
      steps: [
        { label: 'PagerDuty / SolarWinds fires grid alert', track: 'ADR', status: 'live', position: 1 },
        { label: 'BigPanda correlates with related grid events', track: 'ADR', status: 'live', position: 2 },
        { label: 'Incident created with cross-domain context', track: 'ADR', status: 'live', position: 3 },
        { label: 'Biggy AI enriches incident with probable cause', track: 'Biggy', status: 'in_progress', position: 4 },
        { label: 'Remedy P1 ticket auto-created via webhook', track: 'ADR', status: 'in_progress', position: 5 },
        { label: 'Grid Ops resolves with AI-guided context', track: 'Biggy', status: 'in_progress', position: 6 },
        { label: 'BigPanda + Remedy auto-close on resolution', track: 'ADR', status: 'planned', position: 7 },
      ],
    },
    {
      workflow_name: 'OT SCADA Alarm — Field Dispatch',
      team_name: 'OT Network (SCADA)',
      steps: [
        { label: 'SCADA alarm fires via OSIsoft PI', track: 'ADR', status: 'in_progress', position: 1 },
        { label: 'OPC-UA bridge forwards to BigPanda', track: 'ADR', status: 'in_progress', position: 2 },
        { label: 'BigPanda correlates OT + IT alerts', track: 'ADR', status: 'planned', position: 3 },
        { label: 'Grid Ops team notified via unified incident', track: 'ADR', status: 'planned', position: 4 },
        { label: 'Field dispatch decision with full context', track: 'ADR', status: 'planned', position: 5 },
      ],
    },
    {
      workflow_name: 'Transmission Alert Handling',
      team_name: 'Transmission Operations',
      steps: [
        { label: 'SolarWinds NPM fires transmission alert', track: 'ADR', status: 'planned', position: 1 },
        { label: 'BigPanda ingests and correlates', track: 'ADR', status: 'planned', position: 2 },
        { label: 'Transmission queue routing', track: 'ADR', status: 'planned', position: 3 },
        { label: 'Biggy AI incident summary', track: 'Biggy', status: 'planned', position: 4 },
        { label: 'Analyst resolves and closes Remedy ticket', track: 'ADR', status: 'planned', position: 5 },
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
    { title: 'Close SCADA Integration — Resolve OT Firewall Approval by April 28', tracks: 'ADR', why_it_matters: 'SCADA integration is the last Phase 1 gap. Without it, 13% of Grid Ops incidents remain outside BigPanda, and Tivoli decommission is blocked.', current_status: 'OT security change ticket submitted April 16. Aisha Thompson review scheduled April 24. Sofia Reyes escalated to VP Grid Operations for support.', next_step: 'Aisha Thompson to approve firewall change by April 24. Sofia to validate OPC-UA bridge connectivity and move to production integration by April 28.', bp_owner: 'Sofia Reyes', customer_owner: 'Aisha Thompson (OT Security)' },
    { title: 'Extend Biggy AI Pilot to Transmission Team — Launch May 5', tracks: 'Biggy', why_it_matters: 'Week 4 pilot results (89% accuracy, 21 min MTTA) provide strong business case for Phase 2 expansion. Transmission team has already expressed interest.', current_status: 'Pilot kit ready. Chris Mendez (Transmission Lead) confirmed April 18. Incident types to be piloted: equipment fault, protection relay, and line outage events.', next_step: 'Marcus Webb to run Transmission team pilot onboarding session May 5. Define 10 incident types for pilot. Measure accuracy and MTTA weekly for 4 weeks.', bp_owner: 'Marcus Webb', customer_owner: 'Chris Mendez (Transmission Ops)' },
    { title: 'Complete Remedy Automation Production Cutover by May 7', tracks: 'ADR', why_it_matters: 'Remedy auto-create is the last step to eliminate manual SNOW ticket creation. Required to achieve MTTA <15 min goal and eliminate ticket duplication.', current_status: 'UAT complete. Tom Callahan aligning production change window. Jordan Lee to send readiness checklist May 3. Q-FE-002 (auto-close behavior) needs answer before go-live.', next_step: 'Jordan to confirm production window with Tom by April 25. Get Q-FE-002 answer from ITSM director. Go-live targeting May 1–7.', bp_owner: 'Jordan Lee', customer_owner: 'Tom Callahan (ITSM)' },
    { title: 'Document SCADA Alarm Taxonomy — Reduce Single-Point-of-Failure Risk', tracks: 'ADR', why_it_matters: 'Leila Vasquez is the only person who understands SCADA alarm configurations. R-FE-003 is high severity. Her departure would stall Phase 2 correlation tuning.', current_status: 'Knowledge transfer session scheduled May 3. Runbook template drafted. Backup SME candidate (OT Network team) identified but not yet confirmed.', next_step: 'Jordan Lee to request backup SME confirmation from VP Grid Ops by May 1. Schedule joint documentation session with Leila and backup May 3.', bp_owner: 'Jordan Lee', customer_owner: 'Leila Vasquez (Grid Ops Tech Lead)' },
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
      .where(sql`${onboardingPhases.project_id} = ${projectId} AND ${onboardingPhases.name} = ${'Phase 1 — ADR Foundation & Biggy AI Pilot'}`)
      .limit(1);
    if (ex.length > 0) return ex[0].id;
    const [row] = await db.insert(onboardingPhases).values({ project_id: projectId, name: 'Phase 1 — ADR Foundation & Biggy AI Pilot', display_order: 1 }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 1');
    return row.id;
  })();

  const phase2Id = await (async () => {
    const ex = await db.select({ id: onboardingPhases.id }).from(onboardingPhases)
      .where(sql`${onboardingPhases.project_id} = ${projectId} AND ${onboardingPhases.name} = ${'Phase 2 — Transmission, Distribution & Full Scale'}`)
      .limit(1);
    if (ex.length > 0) return ex[0].id;
    const [row] = await db.insert(onboardingPhases).values({ project_id: projectId, name: 'Phase 2 — Transmission, Distribution & Full Scale', display_order: 2 }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 2');
    return row.id;
  })();

  const stepDefs = [
    { phase_id: phase1Id, name: 'All 5 Primary Alert Sources Connected', status: 'complete' as const, owner: 'Sofia Reyes', display_order: 1, dependencies: [] as string[], updates: [{ date: '2026-03-10', note: 'All sources live in production. M-FE-001 closed.' }] },
    { phase_id: phase1Id, name: 'Correlation Policy Baseline (22 rules)', status: 'complete' as const, owner: 'Sofia Reyes', display_order: 2, dependencies: ['All 5 Primary Alert Sources Connected'], updates: [{ date: '2026-02-20', note: '22 rules across 5 domains defined in workshop.' }] },
    { phase_id: phase1Id, name: 'Tivoli Netcool Parallel Run Validation', status: 'complete' as const, owner: 'Sofia Reyes', display_order: 3, dependencies: ['All 5 Primary Alert Sources Connected'], updates: [{ date: '2026-04-10', note: '30-day validation complete. BigPanda results confirmed superior.' }] },
    { phase_id: phase1Id, name: 'Biggy AI Pilot — NOC & Grid Ops (8 weeks)', status: 'in-progress' as const, owner: 'Marcus Webb', display_order: 4, dependencies: ['Correlation Policy Baseline (22 rules)'], updates: [{ date: '2026-04-20', note: 'Week 4: 89% accuracy, MTTA 21 min. 4 weeks remaining.' }] },
    { phase_id: phase1Id, name: 'OT Network SCADA Integration', status: 'in-progress' as const, owner: 'Sofia Reyes', display_order: 5, dependencies: ['All 5 Primary Alert Sources Connected'], updates: [{ date: '2026-04-20', note: 'OT firewall approval pending (April 24). 2-week delay.' }] },
    { phase_id: phase1Id, name: 'Remedy ITSM Automation Production Cutover', status: 'in-progress' as const, owner: 'Sofia Reyes', display_order: 6, dependencies: [] as string[], updates: [{ date: '2026-04-14', note: 'UAT complete. Production change window targeting May 1.' }] },
    { phase_id: phase1Id, name: 'Correlation FP Rate Below 10%', status: 'in-progress' as const, owner: 'Sofia Reyes', display_order: 7, dependencies: ['Correlation Policy Baseline (22 rules)'], updates: [{ date: '2026-04-20', note: 'Overall 11%. Generation domain at 14% — tuning session May 2.' }] },
    { phase_id: phase2Id, name: 'Transmission Team Alert Ingestion', status: 'not-started' as const, owner: 'Sofia Reyes', display_order: 1, dependencies: [] as string[], updates: [] },
    { phase_id: phase2Id, name: 'Distribution Network Team Onboarding', status: 'not-started' as const, owner: 'Jordan Lee', display_order: 2, dependencies: ['Transmission Team Alert Ingestion'], updates: [] },
    { phase_id: phase2Id, name: 'SolarWinds NPM Integration', status: 'not-started' as const, owner: 'Sofia Reyes', display_order: 3, dependencies: [] as string[], updates: [] },
    { phase_id: phase2Id, name: 'Biggy AI Full Rollout — All Teams', status: 'not-started' as const, owner: 'Marcus Webb', display_order: 4, dependencies: ['Biggy AI Pilot — NOC & Grid Ops (8 weeks)', 'Transmission Team Alert Ingestion'], updates: [] },
    { phase_id: phase2Id, name: 'Tivoli Netcool Decommission', status: 'not-started' as const, owner: 'Sofia Reyes', display_order: 5, dependencies: ['OT Network SCADA Integration', 'Correlation FP Rate Below 10%'], updates: [] },
    { phase_id: phase2Id, name: 'Full Production Go-Live Sign-Off', status: 'not-started' as const, owner: 'Jordan Lee', display_order: 6, dependencies: ['Distribution Network Team Onboarding', 'Biggy AI Full Rollout — All Teams', 'Tivoli Netcool Decommission'], updates: [] },
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
    { tool: 'PagerDuty', category: 'Alerting', status: 'production' as const, color: '#06B6D4', notes: 'Live. ~6.2k alerts/day.', display_order: 1 },
    { tool: 'Dynatrace', category: 'APM', status: 'production' as const, color: '#8B5CF6', notes: 'Live. SAP/ERP APM + full-stack.', display_order: 2 },
    { tool: 'SolarWinds Orion', category: 'Network Monitoring', status: 'production' as const, color: '#F59E0B', notes: 'Live. Network + infrastructure.', display_order: 3 },
    { tool: 'Nagios', category: 'Infrastructure Monitoring', status: 'production' as const, color: '#EF4444', notes: 'Live. Legacy checks. Noise filter.', display_order: 4 },
    { tool: 'IBM Tivoli Netcool', category: 'Legacy Aggregation', status: 'production' as const, color: '#6B7280', notes: 'Parallel run. Dark July 2026.', display_order: 5 },
    { tool: 'OSIsoft PI (SCADA)', category: 'OT / ICS Monitoring', status: 'configured' as const, color: '#10B981', notes: 'Staged. OT firewall approval pending.', display_order: 6 },
    { tool: 'Remedy ITSM', category: 'ITSM', status: 'validated' as const, color: '#0EA5E9', notes: 'UAT complete. Production May 1.', display_order: 7 },
    { tool: 'Biggy AI', category: 'AI Incident Intelligence', status: 'configured' as const, color: '#6366F1', notes: 'Active pilot — NOC and Grid Ops.', display_order: 8 },
    { tool: 'SolarWinds NPM', category: 'Network Monitoring', status: 'not-connected' as const, color: '#D97706', notes: 'Phase 2 — Distribution team.', display_order: 9 },
    { tool: 'Slack', category: 'Collaboration', status: 'not-connected' as const, color: '#4A154B', notes: 'Phase 2 — NOC workflow.', display_order: 10 },
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
    // Phase 1 — ADR go-live
    { title: 'Configure PagerDuty + Dynatrace alert ingestion to staging', milestone_id: milestoneIds['M-FE-001'], start_date: '2026-02-04', due: '2026-02-18', status: 'done', owner: 'Sofia Reyes', priority: 'high', phase: 'integration' },
    { title: 'Configure SolarWinds + Nagios + Tivoli bridge to staging', milestone_id: milestoneIds['M-FE-001'], start_date: '2026-02-18', due: '2026-03-04', status: 'done', owner: 'Sofia Reyes', priority: 'high', phase: 'integration' },
    { title: 'Correlation policy workshop — define 22 rules across 5 domains', milestone_id: milestoneIds['M-FE-001'], start_date: '2026-02-10', due: '2026-02-20', status: 'done', owner: 'Marcus Webb', priority: 'high', phase: 'integration' },
    { title: 'Staging load test at 3x expected volume (18k alerts/hr)', milestone_id: milestoneIds['M-FE-001'], start_date: '2026-03-04', due: '2026-03-09', status: 'done', owner: 'Marcus Webb', priority: 'medium', phase: 'integration' },
    { title: 'Production go-live — all 5 primary sources', milestone_id: milestoneIds['M-FE-001'], start_date: '2026-03-09', due: '2026-03-10', status: 'done', owner: 'Sofia Reyes', priority: 'high', phase: 'integration' },
    // Biggy AI Pilot
    { title: 'Biggy AI pilot design — select 15 incident types with NOC & Grid Ops', milestone_id: milestoneIds['M-FE-002'], start_date: '2026-03-10', due: '2026-03-20', status: 'done', owner: 'Marcus Webb', priority: 'high', phase: 'ai_pilot' },
    { title: 'Biggy AI enrichment field mapping — define 4 output fields', milestone_id: milestoneIds['M-FE-002'], start_date: '2026-03-10', due: '2026-03-20', status: 'done', owner: 'Marcus Webb', priority: 'high', phase: 'ai_pilot' },
    { title: 'Week 1–4 pilot execution — NOC and Grid Ops teams', milestone_id: milestoneIds['M-FE-002'], start_date: '2026-03-20', due: '2026-04-20', status: 'in_progress', owner: 'Marcus Webb', priority: 'high', phase: 'ai_pilot' },
    { title: 'Week 5–8 pilot execution + accuracy reporting', milestone_id: milestoneIds['M-FE-002'], start_date: '2026-04-21', due: '2026-05-15', status: 'todo', owner: 'Marcus Webb', priority: 'high', phase: 'ai_pilot' },
    // Remedy Automation
    { title: 'Remedy OAuth + webhook configuration in UAT', milestone_id: milestoneIds['M-FE-003'], start_date: '2026-03-17', due: '2026-04-01', status: 'done', owner: 'Sofia Reyes', priority: 'high', phase: 'integration' },
    { title: 'Remedy UAT test scenarios (8 scenarios)', milestone_id: milestoneIds['M-FE-003'], start_date: '2026-04-01', due: '2026-04-14', status: 'done', owner: 'Sofia Reyes', priority: 'high', phase: 'integration' },
    { title: 'Remedy production cutover', milestone_id: milestoneIds['M-FE-003'], start_date: '2026-05-01', due: '2026-05-07', status: 'todo', owner: 'Sofia Reyes', priority: 'high', phase: 'integration' },
    // SCADA
    { title: 'OSIsoft PI + OPC-UA bridge staging configuration', milestone_id: milestoneIds['M-FE-004'], start_date: '2026-03-25', due: '2026-04-14', status: 'done', owner: 'Sofia Reyes', priority: 'high', phase: 'integration' },
    { title: 'OT firewall change control submission + approval', milestone_id: milestoneIds['M-FE-004'], start_date: '2026-04-14', due: '2026-04-28', status: 'in_progress', owner: 'Sofia Reyes', priority: 'high', phase: 'integration' },
    { title: 'SCADA production connectivity validation', milestone_id: milestoneIds['M-FE-004'], start_date: '2026-04-28', due: '2026-05-06', status: 'todo', owner: 'Sofia Reyes', priority: 'high', phase: 'integration' },
    { title: 'OT correlation policy tuning — SCADA alarm taxonomy', milestone_id: milestoneIds['M-FE-004'], start_date: '2026-05-06', due: '2026-05-20', status: 'todo', owner: 'Marcus Webb', priority: 'medium', phase: 'integration' },
    // Phase 2
    { title: 'Transmission team onboarding + SolarWinds NPM integration', milestone_id: milestoneIds['M-FE-005'], start_date: '2026-05-05', due: '2026-06-14', status: 'todo', owner: 'Sofia Reyes', priority: 'high', phase: 'onboarding' },
    { title: 'Distribution network team onboarding', milestone_id: milestoneIds['M-FE-005'], start_date: '2026-06-02', due: '2026-07-15', status: 'todo', owner: 'Jordan Lee', priority: 'high', phase: 'onboarding' },
    // Go-live
    { title: 'Full regression test — all integrations', milestone_id: milestoneIds['M-FE-006'], start_date: '2026-08-01', due: '2026-08-12', status: 'todo', owner: 'Sofia Reyes', priority: 'high', phase: 'golive' },
    { title: 'Tivoli Netcool decommission sign-off', milestone_id: milestoneIds['M-FE-006'], start_date: '2026-07-15', due: '2026-08-01', status: 'todo', owner: 'Sofia Reyes', priority: 'medium', phase: 'golive' },
    { title: 'Go-live announcement + hypercare plan activation', milestone_id: milestoneIds['M-FE-006'], start_date: '2026-08-13', due: '2026-08-15', status: 'todo', owner: 'Jordan Lee', priority: 'high', phase: 'golive' },
    // Unassigned
    { title: 'Generation domain FP rate tuning — spring load-shedding window', milestone_id: null, start_date: '2026-04-28', due: '2026-05-07', status: 'todo', owner: 'Marcus Webb', priority: 'high', phase: null },
    { title: 'SCADA alarm taxonomy documentation — knowledge transfer', milestone_id: null, start_date: '2026-05-01', due: '2026-05-10', status: 'todo', owner: 'Jordan Lee', priority: 'medium', phase: null },
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
  const wbsL1s = [
    // ADR track — 10 standard delivery phases
    { name: 'Discovery & Kickoff', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-02-03', due_date: '2026-02-14' },
    { name: 'Solution Design', track: 'ADR', display_order: 2, status: 'complete' as const, start_date: '2026-02-10', due_date: '2026-02-28' },
    { name: 'Alert Source Integration', track: 'ADR', display_order: 3, status: 'in_progress' as const, start_date: '2026-02-18', due_date: '2026-05-20' },
    { name: 'Alert Enrichment & Normalization', track: 'ADR', display_order: 4, status: 'in_progress' as const, start_date: '2026-02-20', due_date: '2026-04-30' },
    { name: 'Platform Configuration', track: 'ADR', display_order: 5, status: 'complete' as const, start_date: '2026-02-24', due_date: '2026-03-14' },
    { name: 'Correlation', track: 'ADR', display_order: 6, status: 'in_progress' as const, start_date: '2026-03-01', due_date: '2026-05-07' },
    { name: 'Routing & Escalation', track: 'ADR', display_order: 7, status: 'in_progress' as const, start_date: '2026-03-10', due_date: '2026-05-01' },
    { name: 'Teams & Training', track: 'ADR', display_order: 8, status: 'in_progress' as const, start_date: '2026-03-10', due_date: '2026-07-15' },
    { name: 'UAT & Go-Live Preparation', track: 'ADR', display_order: 9, status: 'in_progress' as const, start_date: '2026-04-01', due_date: '2026-08-01' },
    { name: 'Go-Live', track: 'ADR', display_order: 10, status: 'not_started' as const, start_date: '2026-08-01', due_date: '2026-08-15' },
    // Biggy AI track — 5 standard delivery phases
    { name: 'Discovery & Kickoff', track: 'Biggy', display_order: 1, status: 'complete' as const, start_date: '2026-03-10', due_date: '2026-03-20' },
    { name: 'Integrations', track: 'Biggy', display_order: 2, status: 'in_progress' as const, start_date: '2026-03-20', due_date: '2026-05-15' },
    { name: 'Workflow', track: 'Biggy', display_order: 3, status: 'in_progress' as const, start_date: '2026-04-01', due_date: '2026-06-01' },
    { name: 'Teams & Training', track: 'Biggy', display_order: 4, status: 'in_progress' as const, start_date: '2026-03-20', due_date: '2026-07-15' },
    { name: 'Deploy', track: 'Biggy', display_order: 5, status: 'not_started' as const, start_date: '2026-07-15', due_date: '2026-08-15' },
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
    { parent: 'ADR:Solution Design', name: 'Ops Shadowing / Current State', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-02-10', due_date: '2026-02-14' },
    { parent: 'ADR:Solution Design', name: 'Future State Workflow', track: 'ADR', display_order: 2, status: 'complete' as const, start_date: '2026-02-14', due_date: '2026-02-24' },
    { parent: 'ADR:Solution Design', name: 'ADR Process Consulting', track: 'ADR', display_order: 3, status: 'complete' as const, start_date: '2026-02-20', due_date: '2026-02-28' },
    // ADR: Alert Source Integration
    { parent: 'ADR:Alert Source Integration', name: 'Outbound Integrations', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-02-18', due_date: '2026-03-10' },
    { parent: 'ADR:Alert Source Integration', name: 'Inbound Integrations', track: 'ADR', display_order: 2, status: 'in_progress' as const, start_date: '2026-04-14', due_date: '2026-05-20' },
    // ADR: Alert Enrichment & Normalization
    { parent: 'ADR:Alert Enrichment & Normalization', name: 'Tag Documentation', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-02-20', due_date: '2026-03-01' },
    { parent: 'ADR:Alert Enrichment & Normalization', name: 'Normalization Configuration', track: 'ADR', display_order: 2, status: 'in_progress' as const, start_date: '2026-03-01', due_date: '2026-04-30' },
    { parent: 'ADR:Alert Enrichment & Normalization', name: 'CMDB', track: 'ADR', display_order: 3, status: 'in_progress' as const, start_date: '2026-03-10', due_date: '2026-05-15' },
    // ADR: Platform Configuration
    { parent: 'ADR:Platform Configuration', name: 'Environments', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-02-24', due_date: '2026-03-01' },
    { parent: 'ADR:Platform Configuration', name: 'Incident Tags', track: 'ADR', display_order: 2, status: 'complete' as const, start_date: '2026-02-24', due_date: '2026-03-07' },
    { parent: 'ADR:Platform Configuration', name: 'Role Based Access Control', track: 'ADR', display_order: 3, status: 'complete' as const, start_date: '2026-03-01', due_date: '2026-03-10' },
    { parent: 'ADR:Platform Configuration', name: 'Incident Routing', track: 'ADR', display_order: 4, status: 'complete' as const, start_date: '2026-03-01', due_date: '2026-03-10' },
    { parent: 'ADR:Platform Configuration', name: 'Maintenance Plans', track: 'ADR', display_order: 5, status: 'complete' as const, start_date: '2026-03-07', due_date: '2026-03-14' },
    { parent: 'ADR:Platform Configuration', name: 'Single Sign-On', track: 'ADR', display_order: 6, status: 'complete' as const, start_date: '2026-03-01', due_date: '2026-03-14' },
    { parent: 'ADR:Platform Configuration', name: 'Admin / Reporting', track: 'ADR', display_order: 7, status: 'complete' as const, start_date: '2026-03-07', due_date: '2026-03-14' },
    // ADR: Correlation
    { parent: 'ADR:Correlation', name: 'Use Case Discovery', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-03-01', due_date: '2026-03-14' },
    { parent: 'ADR:Correlation', name: 'Correlation Configuration', track: 'ADR', display_order: 2, status: 'in_progress' as const, start_date: '2026-03-14', due_date: '2026-05-07' },
    // ADR: Routing & Escalation
    // (no L2s in framework — parent carries dates)
    // ADR: Teams & Training
    { parent: 'ADR:Teams & Training', name: 'User Training', track: 'ADR', display_order: 1, status: 'in_progress' as const, start_date: '2026-03-10', due_date: '2026-07-15' },
    // ADR: UAT & Go-Live Preparation
    { parent: 'ADR:UAT & Go-Live Preparation', name: 'UAT', track: 'ADR', display_order: 1, status: 'in_progress' as const, start_date: '2026-04-01', due_date: '2026-07-15' },
    { parent: 'ADR:UAT & Go-Live Preparation', name: 'Documentation', track: 'ADR', display_order: 2, status: 'in_progress' as const, start_date: '2026-04-01', due_date: '2026-08-01' },
    { parent: 'ADR:UAT & Go-Live Preparation', name: 'Go-Live Prep', track: 'ADR', display_order: 3, status: 'not_started' as const, start_date: '2026-07-15', due_date: '2026-08-01' },
    // ADR: Go-Live
    { parent: 'ADR:Go-Live', name: 'Go Live', track: 'ADR', display_order: 1, status: 'not_started' as const, start_date: '2026-08-15', due_date: '2026-08-15' },
    { parent: 'ADR:Go-Live', name: 'Post Go-Live Survey', track: 'ADR', display_order: 2, status: 'not_started' as const, start_date: '2026-08-15', due_date: '2026-08-29' },
    { parent: 'ADR:Go-Live', name: 'Unified Analytics', track: 'ADR', display_order: 3, status: 'not_started' as const, start_date: '2026-08-15', due_date: '2026-09-15' },
    { parent: 'ADR:Go-Live', name: 'Project Closure', track: 'ADR', display_order: 4, status: 'not_started' as const, start_date: '2026-09-15', due_date: '2026-10-31' },
    // Biggy: Integrations
    { parent: 'Biggy:Integrations', name: 'Real-Time Integrations', track: 'Biggy', display_order: 1, status: 'in_progress' as const, start_date: '2026-03-20', due_date: '2026-05-15' },
    { parent: 'Biggy:Integrations', name: 'Context Integrations', track: 'Biggy', display_order: 2, status: 'in_progress' as const, start_date: '2026-03-20', due_date: '2026-05-15' },
    { parent: 'Biggy:Integrations', name: 'UDC', track: 'Biggy', display_order: 3, status: 'not_started' as const, start_date: '2026-05-15', due_date: '2026-06-01' },
    // Biggy: Workflow
    { parent: 'Biggy:Workflow', name: 'Action Plans', track: 'Biggy', display_order: 1, status: 'in_progress' as const, start_date: '2026-04-01', due_date: '2026-05-15' },
    { parent: 'Biggy:Workflow', name: 'Workflows', track: 'Biggy', display_order: 2, status: 'in_progress' as const, start_date: '2026-04-01', due_date: '2026-06-01' },
    { parent: 'Biggy:Workflow', name: 'Managed Incident Channels', track: 'Biggy', display_order: 3, status: 'not_started' as const, start_date: '2026-06-01', due_date: '2026-07-01' },
    // Biggy: Teams & Training
    { parent: 'Biggy:Teams & Training', name: 'Team-Specific Workflow Enablement', track: 'Biggy', display_order: 1, status: 'in_progress' as const, start_date: '2026-03-20', due_date: '2026-06-01' },
    { parent: 'Biggy:Teams & Training', name: 'Workflow Automations', track: 'Biggy', display_order: 2, status: 'not_started' as const, start_date: '2026-06-01', due_date: '2026-07-15' },
    { parent: 'Biggy:Teams & Training', name: 'Training', track: 'Biggy', display_order: 3, status: 'in_progress' as const, start_date: '2026-03-20', due_date: '2026-07-15' },
  ];

  for (const l2 of wbsL2s) {
    const parentId = wbsL1Ids[l2.parent];
    if (!parentId) continue;
    const ex = await db.select({ id: wbsItems.id }).from(wbsItems)
      .where(sql`${wbsItems.project_id} = ${projectId} AND ${wbsItems.name} = ${l2.name} AND ${wbsItems.parent_id} = ${parentId} AND ${wbsItems.level} = 2`)
      .limit(1);
    if (ex.length === 0) {
      await db.insert(wbsItems).values({ project_id: projectId, level: 2, parent_id: parentId, source_trace: 'seed', track: l2.track, name: l2.name, display_order: l2.display_order, status: l2.status, start_date: l2.start_date, due_date: l2.due_date });
      console.log(`  ✓ WBS L2: ${l2.name}`);
    }
  }

  // ─── Time Entries ─────────────────────────────────────────────────────────
  const timeEntryDefs = [
    { date: '2026-04-14', hours: '3.0', description: 'Remedy UAT sign-off meeting — all 8 scenarios passing with ITSM team', user_id: 'default' },
    { date: '2026-04-14', hours: '2.0', description: 'Biggy AI Week 3 analysis — accuracy metrics and MTTA measurement', user_id: 'default' },
    { date: '2026-04-15', hours: '1.5', description: 'OT firewall change control ticket preparation and submission', user_id: 'default' },
    { date: '2026-04-15', hours: '3.5', description: 'SCADA OPC-UA bridge staging configuration and testing', user_id: 'default' },
    { date: '2026-04-16', hours: '2.0', description: 'Weekly status report drafting and Diana Huang review call', user_id: 'default' },
    { date: '2026-04-16', hours: '2.5', description: 'Dynatrace SAP blast radius accuracy validation — 12 test incidents', user_id: 'default' },
    { date: '2026-04-17', hours: '4.0', description: 'Biggy AI Week 4 pilot execution and enrichment quality review', user_id: 'default' },
    { date: '2026-04-17', hours: '1.5', description: 'R-FE-003 mitigation planning — SCADA SME knowledge transfer session design', user_id: 'default' },
    { date: '2026-04-20', hours: '2.5', description: 'Weekly NOC and Grid Ops sync — Phase 2 expansion confirmed by Diana Huang', user_id: 'default' },
    { date: '2026-04-20', hours: '3.0', description: 'Phase 2 planning — Transmission team onboarding prep and timeline', user_id: 'default' },
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
      notes: 'Fully onboarded. BigPanda is primary triage interface. Biggy AI pilot active.',
      route_steps: [
        { label: 'PagerDuty / SolarWinds Alert' },
        { label: 'BigPanda Correlation' },
        { label: 'Biggy AI Incident Summary' },
        { label: 'NOC Triage + Ack' },
        { label: 'Remedy Ticket (auto-create → production soon)' },
        { label: 'Resolution + Close' },
      ],
    },
    {
      team_name: 'Grid Operations',
      status: 'in_progress' as const,
      notes: 'Ingestion live. Biggy AI pilot active. SCADA integration pending OT firewall approval.',
      route_steps: [
        { label: 'PagerDuty / Dynatrace Alert' },
        { label: 'BigPanda Correlation (IT domain)' },
        { label: 'Biggy AI Incident Summary' },
        { label: 'Grid Ops Triage' },
        { label: 'SCADA Alert (OT — pending)' },
        { label: 'Remedy Ticket' },
      ],
    },
    {
      team_name: 'Transmission Operations',
      status: 'planned' as const,
      notes: 'Phase 2 onboarding starting May 5.',
      route_steps: [
        { label: 'SolarWinds NPM Alert' },
        { label: 'BigPanda Ingestion' },
        { label: 'Transmission Correlation Policy' },
        { label: 'Biggy AI Summary (post-pilot)' },
        { label: 'Remedy Auto-Ticket' },
        { label: 'Analyst Resolution' },
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
    { title: 'NERC CIP Asset Classification Policy — Biggy AI Enrichment', content: 'FirstEnergy is subject to NERC CIP-002 through CIP-014 for bulk electric system assets. Biggy AI enrichment fields must not expose BES Cyber Asset IDs or Critical Asset designations in externally visible ITSM ticket fields. Compliance ruling pending (Q-FE-001). Interim: masked mode omits asset IDs from SNOW ticket enrichment while retaining them in BigPanda incident context for internal NOC use only.', source_trace: 'seed' },
    { title: 'OT / IT Alert Deduplication Pattern — Tivoli Bridge Period', content: 'During the Tivoli parallel run (March 10 – July 2026), alerts may arrive from both Tivoli Netcool bridge and direct source integrations (PagerDuty, SolarWinds). Deduplication rule: BigPanda tags all direct-source alerts with source:direct and all Tivoli bridge alerts with source:tivoli. Same-source alerts within a 5-minute window are deduplicated by alert tag match. Cross-source duplicates are surfaced as a single incident with both source tags visible in the incident payload.', source_trace: 'seed' },
    { title: 'Biggy AI Pilot Measurement Methodology', content: 'Pilot accuracy is measured weekly by Marcus Webb using a sample of 30 incidents reviewed by NOC and Grid Ops team leads. Each incident is rated: Accurate (summary matches root cause), Partially Accurate (summary correct but incomplete), or Inaccurate (summary incorrect or misleading). MTTA improvement measured by comparing mean time-to-acknowledge for BigPanda incidents during pilot window vs prior 30-day baseline. Ticket elimination count = (incidents processed by Biggy AI) × (average duplicate tickets per incident in pre-BigPanda baseline = 3.1).', source_trace: 'seed' },
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

  console.log(`\n✅ FirstEnergy demo seed complete! Project id=${projectId}`);
  console.log(`   Navigate to: /customer/${projectId}/overview`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
