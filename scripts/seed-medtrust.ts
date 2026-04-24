/**
 * seed-medtrust.ts — Create and populate "MedTrust Health System — AIOps Foundation" demo project.
 *
 * Run (local): DATABASE_URL="postgresql://jmiloslavsky@localhost:5432/bigpanda_app" npx tsx scripts/seed-medtrust.ts
 *
 * Scenario: Multi-hospital health system at early-deployment stage. Project just kicked off,
 * ADR design workshops completed, first integrations being configured. Project is yellow overall
 * due to HIPAA compliance review blocking some cloud integrations and a key technical contact
 * recently changing roles. No Biggy AI yet — scoped for Phase 2 after ADR stabilizes.
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

const PROJECT_NAME = 'MedTrust Health System — AIOps Foundation';

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
      customer: 'MedTrust Health System',
      overall_status: 'yellow',
      status_summary: 'ADR integration design workshops complete across 3 facilities. First 2 integrations (ServiceNow + Datadog) configured in staging. HIPAA compliance review blocking Splunk cloud integration — awaiting security team sign-off. Technical lead change in IT Operations has delayed project onboarding schedule by 3 weeks. Recovery plan in progress.',
      go_live_target: '2026-11-01',
      last_updated: '2026-04-20',
      description: 'AIOps deployment for MedTrust Health System — a regional health system with 4 hospitals and 18 outpatient clinics. Consolidating alert monitoring from Datadog, ServiceNow, Splunk, and legacy PRTG into BigPanda ADR. Focus on clinical operations uptime and faster P1 response for EHR system incidents. Biggy AI scoped for Phase 2 after ADR stabilizes.',
      start_date: '2026-03-10',
      end_date: '2026-12-31',
      active_tracks: { adr: true, biggy: false },
    }).returning({ id: projects.id });
    projectId = row.id;
    console.log(`Created new project: "${PROJECT_NAME}" (id=${projectId})`);
  }

  await db.update(projects).set({
    overall_status: 'yellow',
    status_summary: 'ADR integration design workshops complete across 3 facilities. First 2 integrations (ServiceNow + Datadog) configured in staging. HIPAA compliance review blocking Splunk cloud integration — awaiting security team sign-off. Technical lead change in IT Operations has delayed project onboarding schedule by 3 weeks. Recovery plan in progress.',
    go_live_target: '2026-11-01',
    last_updated: '2026-04-20',
    description: 'AIOps deployment for MedTrust Health System — a regional health system with 4 hospitals and 18 outpatient clinics. Consolidating alert monitoring from Datadog, ServiceNow, Splunk, and legacy PRTG into BigPanda ADR. Focus on clinical operations uptime and faster P1 response for EHR system incidents. Biggy AI scoped for Phase 2 after ADR stabilizes.',
    start_date: '2026-03-10',
    end_date: '2026-12-31',
    active_tracks: { adr: true, biggy: false },
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
      aggregation_hub_name: 'PRTG Network Monitor + Splunk SIEM (fragmented)',
      alert_to_ticket_problem: 'MedTrust operates 4 hospitals with separate IT teams monitoring their own infrastructure. No centralized alert aggregation — each facility runs its own PRTG instance and escalates manually to a shared ServiceNow queue. EHR system (Epic) incidents average 68-minute MTTA against a 20-minute internal SLA. Clinical staff frequently report downtime via email because IT monitoring detects issues too late. Night-shift NOC team of 2 covering all 4 facilities lacks visibility into cross-facility patterns.',
      pain_points_json: [
        'No centralized visibility — 4 separate PRTG instances, no cross-facility alert correlation',
        'Epic EHR MTTA at 68 min vs 20 min SLA — causes clinical workflow disruption across facilities',
        'Night-shift NOC (2 staff) covering 4 hospitals with no unified dashboard — relying on phone calls from facilities',
        'ServiceNow ticket duplication: same Epic incident creates 3-12 tickets across facilities, applications, and network teams',
        'Splunk SIEM generates 22,000+ security events/day — no correlation with infrastructure alerts creates split attention',
        'No business impact context: IT cannot tell whether a network alert affects clinical systems or back-office only',
      ],
      source: 'manual',
    });
    console.log('  ✓ Before State');
  }

  // ─── Artifacts ────────────────────────────────────────────────────────────
  const artifactDefs = [
    { external_id: 'X-MT-001', name: 'MedTrust AIOps Project Charter', status: 'approved', owner: 'Rachel Kim', description: 'Project charter covering scope, success metrics, governance model, HIPAA compliance requirements, and two-phase delivery plan.' },
    { external_id: 'X-MT-002', name: 'Integration Design Workshop — Facility Assessment', status: 'approved', owner: 'Daniel Park', description: 'Findings from 3-facility workshops: alert source inventory, alert volume baseline (42k/day), Epic EHR dependency map, and ServiceNow ITSM integration requirements.' },
    { external_id: 'X-MT-003', name: 'HIPAA Compliance Review — BigPanda Cloud Integration', status: 'in_progress', owner: 'Rachel Kim', description: 'Security review for Splunk cloud integration — assessing whether PHI could appear in alert payloads. MedTrust CISO review in progress.' },
    { external_id: 'X-MT-004', name: 'ADR Correlation Policy Design v0.8', status: 'draft', owner: 'Daniel Park', description: 'Initial correlation policy design covering Epic EHR, Citrix, network, and storage alert domains. Draft — pending HIPAA review for final data field decisions.' },
    { external_id: 'X-MT-005', name: 'Weekly Status — Week of 2026-04-14', status: 'sent', owner: 'Rachel Kim', description: 'Status covering: integration workshop completion, HIPAA review progress, technical lead transition impact, recovery plan.' },
    { external_id: 'X-MT-006', name: 'Epic EHR Alert Taxonomy — Current State', status: 'approved', owner: 'Daniel Park', description: 'Inventory of all Epic EHR monitoring alerts across 4 facilities: alert types, volumes, severity classifications, and current escalation paths.' },
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
    { external_id: 'A-MT-001', description: 'Resolve HIPAA compliance review for Splunk cloud integration — provide BigPanda data handling documentation and PHI field exclusion design to MedTrust CISO team', owner: 'Rachel Kim', due: '2026-05-02', status: 'in_progress' as const, notes: 'CISO team requested: data flow diagram, field exclusion list, and encryption confirmation. Documentation package sent April 18. Review meeting scheduled April 28.', type: 'action' },
    { external_id: 'A-MT-002', description: 'Complete onboarding of new technical lead (Ryan Torres) — schedule knowledge transfer sessions and provide project briefing package', owner: 'Rachel Kim', due: '2026-04-28', status: 'in_progress' as const, notes: 'Ryan Torres started April 14 replacing departed Michael Chen. Three briefing sessions scheduled: project overview (April 21), integration design (April 23), and staging environment (April 25).', type: 'action' },
    { external_id: 'A-MT-003', description: 'Configure Datadog integration in staging — validate metric and log alert ingestion for Citrix and Epic EHR application monitoring', owner: 'Daniel Park', due: '2026-04-25', status: 'open' as const, notes: 'Datadog API key provisioned. Integration design complete per workshop output. Staging tenant ready. Daniel to execute configuration and validate alert payloads.', type: 'action' },
    { external_id: 'A-MT-004', description: 'Define Epic EHR correlation policy — priority alert types, blast radius mapping, and clinical impact tags', owner: 'Daniel Park', due: '2026-05-09', status: 'open' as const, notes: 'Dependent on: Datadog integration in staging + HIPAA review final answer on PHI field handling. Clinical impact tag design pending CISO approval.', type: 'action' },
    { external_id: 'A-MT-005', description: 'Set up BigPanda staging environment for facility 2 (MedTrust Riverside) — provision integration access and team workspace', owner: 'Daniel Park', due: '2026-05-05', status: 'open' as const, notes: 'Facility 1 (MedTrust Central) staging complete. Riverside team identified, access provisioning underway.', type: 'action' },
    { external_id: 'A-MT-006', description: 'Finalize recovery plan for 3-week schedule delay — present revised milestones to Nancy Walsh (CIO) for approval', owner: 'Rachel Kim', due: '2026-04-25', status: 'open' as const, notes: 'Recovery plan drafted. Options: parallel facility onboarding or extended staging window. Presenting to Nancy Walsh April 25. Decision will reset milestone dates.', type: 'action' },
    { external_id: 'A-MT-007', description: 'ServiceNow integration staging validation — verify bi-directional alert-to-ticket workflow end-to-end', owner: 'Daniel Park', due: '2026-04-12', status: 'completed' as const, notes: 'Completed April 12. ServiceNow integration validated: alert → ticket create working. Update and close flows tested. 3 minor field mapping corrections applied.', type: 'action' },
    { external_id: 'Q-MT-001', description: 'Can clinical system alerts (Epic EHR, Citrix) that reference patient care areas (e.g., "ICU-floor-3-network") be ingested by BigPanda, or do location tags constitute PHI under HIPAA?', owner: 'MedTrust CISO', due: 'TBD', status: 'open' as const, notes: 'Raised in HIPAA review. Location strings referencing patient care units may be PHI-adjacent under HIPAA. CISO team reviewing. Blocking: clinical impact tag design in correlation policies.', type: 'question' },
    { external_id: 'Q-MT-002', description: 'Will BigPanda replace ServiceNow as the primary incident triage interface for NOC staff, or is ServiceNow the system of record and BigPanda feeds it?', owner: 'Nancy Walsh (CIO)', due: '2026-04-25', status: 'open' as const, notes: 'Critical UX and workflow design question. Impacts NOC training plan and change management approach. To be answered in recovery plan meeting April 25.', type: 'question' },
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
    { external_id: 'R-MT-001', description: 'HIPAA compliance review blocking Splunk cloud integration may extend 4–6 weeks, delaying Phase 1 correlation policy baseline and pushing go-live', severity: 'high' as const, owner: 'Rachel Kim', mitigation: 'Submitted full documentation package to CISO team April 18. Parallel path: design correlation policy using Datadog + ServiceNow only, add Splunk post-approval. No blockers for first 3 integrations.', status: 'open', last_updated: '2026-04-20', likelihood: 'medium', impact: 'high', target_date: '2026-05-02' },
    { external_id: 'R-MT-002', description: 'Technical lead change (Michael Chen → Ryan Torres) creates knowledge gap for Epic EHR integration design — 3-week schedule impact already realized', severity: 'high' as const, owner: 'Rachel Kim', mitigation: 'Ryan Torres briefing sessions scheduled April 21–25. Michael Chen provided 2-hour knowledge transfer April 15. Epic EHR design documentation being completed by Daniel Park independently.', status: 'open', last_updated: '2026-04-20', likelihood: 'low', impact: 'high', target_date: '2026-04-28' },
    { external_id: 'R-MT-003', description: 'PRTG alert volume from 4 facilities (42k/day) may exceed initial BigPanda tenant sizing — correlation performance not validated at full load', severity: 'medium' as const, owner: 'Daniel Park', mitigation: 'Load test planned during staging phase. BigPanda tenant pre-provisioned at 2x baseline (84k/day capacity). Facilities will be onboarded sequentially to allow incremental load validation.', status: 'open', last_updated: '2026-04-18', likelihood: 'medium', impact: 'medium', target_date: '2026-06-15' },
    { external_id: 'R-MT-004', description: 'Clinical staff at Facility 2 (Riverside) are resistant to changes in IT incident reporting process — may undermine adoption of BigPanda-driven workflows', severity: 'medium' as const, owner: 'Rachel Kim', mitigation: 'Stakeholder engagement session planned for Riverside IT director and clinical ops manager. Change management plan being drafted. Success story from Facility 1 will be used in communications.', status: 'open', last_updated: '2026-04-19', likelihood: 'medium', impact: 'medium', target_date: '2026-05-30' },
    { external_id: 'R-MT-005', description: 'Legacy PRTG instances at Facilities 3 and 4 running end-of-life versions — may not support modern API integration methods', severity: 'medium' as const, owner: 'Daniel Park', mitigation: 'PRTG version audit scheduled for Facility 3 visit May 6. If API limitation confirmed, fallback approach: SNMP trap forwarding to BigPanda. Known pattern from similar deployments.', status: 'open', last_updated: '2026-04-15', likelihood: 'medium', impact: 'medium', target_date: '2026-05-10' },
    { external_id: 'R-MT-006', description: 'Executive sponsor (Nancy Walsh, CIO) is in organizational restructuring — reporting line for IT Operations may change, affecting project authority and budget sign-off', severity: 'low' as const, owner: 'Rachel Kim', mitigation: 'Maintaining dual executive relationship: Nancy Walsh (CIO) and Dr. Patel (CMO, clinical ops champion). Project charter signed by both. Budget already approved — restructuring affects future phases only.', status: 'open', last_updated: '2026-04-10', likelihood: 'low', impact: 'medium', target_date: 'TBD' },
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
    { external_id: 'M-MT-001', name: 'Integration Design Workshops — All Facilities', status: 'complete' as const, date: '2026-04-10', owner: 'Daniel Park', notes: 'Workshops completed at MedTrust Central (March 22), Riverside (March 29), and North Shore (April 10). Facility 4 (Westgate) workshop to be added as Phase 2 scope — smaller facility.' },
    { external_id: 'M-MT-002', name: 'ServiceNow + Datadog — Staging Integration Complete', status: 'on_track' as const, date: '2026-04-30', owner: 'Daniel Park', notes: 'ServiceNow validated April 12. Datadog configuration in progress (A-MT-003). On track for April 30 staging sign-off.' },
    { external_id: 'M-MT-003', name: 'HIPAA Compliance Sign-Off — Splunk Integration', status: 'at_risk' as const, date: '2026-05-09', owner: 'Rachel Kim', notes: 'CISO review in progress. Q-MT-001 (PHI location tags) is blocking correlation policy design. If CISO approval slips past May 2, milestone at risk.' },
    { external_id: 'M-MT-004', name: 'Facility 1 (MedTrust Central) — Production Go-Live', status: 'on_track' as const, date: '2026-07-01', owner: 'Rachel Kim', notes: 'Phase 1 primary go-live. Recovery plan may adjust to July 15. Pending A-MT-006 (Nancy Walsh decision April 25).' },
    { external_id: 'M-MT-005', name: 'Facility 2 (MedTrust Riverside) — Production Go-Live', status: 'on_track' as const, date: '2026-08-15', owner: 'Daniel Park', notes: 'Phase 1 second facility. Sequential approach agreed. Start dependent on Facility 1 stabilization.' },
    { external_id: 'M-MT-006', name: 'All Phase 1 Facilities Live — ADR Operational', status: 'on_track' as const, date: '2026-11-01', owner: 'Rachel Kim', notes: 'Facilities 1, 2, and 3 live. All primary integrations active. NOC team trained and using BigPanda as primary triage interface. Biggy AI assessment begins.' },
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
    { name: 'Rachel Kim', role: 'BigPanda PS Lead', company: 'BigPanda', email: 'rachel.kim@bigpanda.io', notes: 'Primary delivery lead. Executive relationship owner. Managing HIPAA review coordination.' },
    { name: 'Daniel Park', role: 'BigPanda Integration Engineer', company: 'BigPanda', email: 'daniel.park@bigpanda.io', notes: 'Integration design, staging configuration, Epic EHR correlation policy lead.' },
    { name: 'Nancy Walsh', role: 'Chief Information Officer', company: 'MedTrust Health System', email: 'n.walsh@medtrust.org', notes: 'Executive sponsor. Budget authority. Decision-maker for ServiceNow vs BigPanda triage interface question (Q-MT-002).' },
    { name: 'Dr. Anita Patel', role: 'Chief Medical Officer (Clinical Ops Champion)', company: 'MedTrust Health System', email: 'a.patel@medtrust.org', notes: 'Clinical champion. Driving urgency behind Epic EHR uptime improvements. Directly impacted by P1 MTTA misses.' },
    { name: 'Ryan Torres', role: 'IT Operations Technical Lead', company: 'MedTrust Health System', email: 'r.torres@medtrust.org', notes: 'Replaced Michael Chen (departed April 10). Just onboarding — briefing sessions April 21–25. Will own integration configuration and NOC tooling.' },
    { name: 'Sandra Okafor', role: 'CISO', company: 'MedTrust Health System', email: 's.okafor@medtrust.org', notes: 'HIPAA compliance authority. Reviewing Splunk cloud integration data handling. Q-MT-001 (PHI location tags) with her team.' },
    { name: 'Ben Ashworth', role: 'NOC Manager', company: 'MedTrust Health System', email: 'b.ashworth@medtrust.org', notes: 'Manages 2-person night-shift NOC covering all 4 facilities. Primary end-user of BigPanda. Champion for centralized visibility.' },
    { name: 'Priya Nair', role: 'Facility IT Lead — MedTrust Central', company: 'MedTrust Health System', email: 'p.nair@medtrust.org', notes: 'Facility 1 technical point of contact. Knowledgeable about Epic EHR integration. Involved in Phase 1 go-live planning.' },
    { name: 'James Ortega', role: 'Facility IT Lead — MedTrust Riverside', company: 'MedTrust Health System', email: 'j.ortega@medtrust.org', notes: 'Facility 2 contact. Resistant to process changes — flagged in R-MT-004. Needs stakeholder engagement session.' },
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
    { date: '2026-04-20', content: 'Weekly sync with Rachel Kim and Ryan Torres (new tech lead). Ryan completed first two briefing sessions. HIPAA review documentation package submitted April 18 — Sandra Okafor team reviewing. Recovery plan draft shared with team for April 25 CIO meeting. A-MT-003 (Datadog staging) on track for April 25.' },
    { date: '2026-04-14', content: 'Technical lead transition debrief with Rachel Kim. Michael Chen departure confirmed permanent. Ryan Torres joining April 14. Rachel conducting parallel path: briefing Ryan while Daniel Park progresses staging independently. 3-week schedule impact acknowledged and documented.' },
    { date: '2026-04-10', content: 'Facility 3 (North Shore) integration design workshop — completed M-MT-001. 14 attendees including Facility IT team, Epic EHR admin (Sarah Ng), and network team. Alert inventory: 8,400 daily alerts at North Shore. Key finding: PRTG version 19.x — needs API compatibility check before integration design finalized.' },
    { date: '2026-04-08', content: 'HIPAA review kickoff with Sandra Okafor (CISO) team. BigPanda data handling overview presented by Rachel Kim. CISO team identified Q-MT-001: clinical location strings in alert names may be PHI-adjacent. Three deliverables requested: data flow diagram, field exclusion design, encryption documentation. Rachel to prepare package by April 18.' },
    { date: '2026-03-29', content: 'Facility 2 (Riverside) integration design workshop. James Ortega (Facility IT Lead) showed some reluctance to BigPanda workflow changes — prefers keeping ServiceNow as the primary interface. Rachel noted concern in risk register (R-MT-004). Workshop productive overall — alert inventory complete, ServiceNow integration design agreed.' },
    { date: '2026-03-22', content: 'Facility 1 (MedTrust Central) integration design workshop. Priya Nair and Epic EHR admin team highly engaged. Epic alert taxonomy documented (X-MT-006). ServiceNow ITSM integration design agreed — BigPanda to be primary triage, ServiceNow for ticket tracking. Datadog API access provisioned.' },
    { date: '2026-03-10', content: 'Project kickoff at MedTrust Health System headquarters. Nancy Walsh opened with business case: $4.2M in clinical workflow disruption costs attributed to IT downtime in 2025. Dr. Patel emphasized Epic EHR uptime as patient safety priority. Scope, phased timeline, and weekly Wednesday sync cadence agreed. HIPAA requirements flagged as key constraint for cloud integrations.' },
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
    { date: '2026-04-08', decision: 'All alert fields that could contain clinical location strings (e.g. floor, unit, room) will be excluded from BigPanda ingest until HIPAA review concludes — correlation policies to be redesigned post-ruling', context: 'CISO team flagged clinical location strings as potentially PHI-adjacent under HIPAA. Precautionary exclusion agreed to unblock staging progress. Full design pending Q-MT-001 resolution.' },
    { date: '2026-03-29', decision: 'Facilities onboarded sequentially (Central → Riverside → North Shore) rather than in parallel — single-facility staging reduces risk and allows recovery plan flexibility', context: 'Raised by Rachel Kim after Riverside workshop surfaced adoption resistance (R-MT-004). Sequential approach accepted by Nancy Walsh. Adds 6 weeks to total timeline vs parallel approach.' },
    { date: '2026-03-22', decision: 'BigPanda to be the primary NOC triage interface — ServiceNow retained as system of record for ticketing, not for triage', context: 'Agreed with Priya Nair and Ben Ashworth at Facility 1 workshop. Q-MT-002 will formalize this with Nancy Walsh April 25. James Ortega (Riverside) prefers ServiceNow-first — his concern noted in risk register.' },
    { date: '2026-03-22', decision: 'Epic EHR alerts are the highest-priority domain — correlation policies for Epic to be designed and validated before any other application domain', context: 'Dr. Patel (CMO) and Nancy Walsh emphasized clinical impact of Epic downtime as the primary business driver. Epic-first sequencing agreed at kickoff and confirmed in Facility 1 workshop.' },
    { date: '2026-03-10', decision: 'Biggy AI scoped to Phase 2 — ADR must be stable for 60+ days before introducing AI incident intelligence', context: 'BigPanda best practice for healthcare environments: AI incident intelligence is most accurate when correlation policies are mature and alert noise is reduced. Phase 1 focuses entirely on ADR stabilization.' },
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
    { name: 'ADR — Alert Ingestion (Facility 1 & 2)', track: 'ADR', current_status: 'ServiceNow integration validated (April 12). Datadog staging in progress. Splunk blocked by HIPAA review. PRTG integration design complete — Facility 1 implementation starting May.', lead: 'Daniel Park', last_updated: '2026-04-20', state: 'yellow', percent_complete: 25 },
    { name: 'ADR — Epic EHR Correlation Policies', track: 'ADR', current_status: 'Alert taxonomy documented (X-MT-006). Policy design blocked by HIPAA PHI field ruling (Q-MT-001). Design in progress for non-PHI-sensitive fields. Target: draft policy v1.0 by May 9.', lead: 'Daniel Park', last_updated: '2026-04-20', state: 'yellow', percent_complete: 15 },
    { name: 'ADR — ServiceNow ITSM Integration', track: 'ADR', current_status: 'Staging validated. Bi-directional webhook working (alert create, update, close). Production cutover scoped for Facility 1 go-live (July 1). Q-MT-002 answer needed for NOC workflow design.', lead: 'Daniel Park', last_updated: '2026-04-12', state: 'green', percent_complete: 45 },
    { name: 'HIPAA Compliance & Security Review', track: 'ADR', current_status: 'CISO review in progress. Data flow documentation submitted April 18. Review meeting April 28. Q-MT-001 (clinical location strings) is the key open item blocking correlation policy finalization.', lead: 'Rachel Kim', last_updated: '2026-04-20', state: 'yellow', percent_complete: 40 },
    { name: 'Change Management & Facility Onboarding', track: 'ADR', current_status: 'Facility 1 and 3 workshops complete with positive engagement. Facility 2 (Riverside) has adoption risk (R-MT-004). Stakeholder engagement plan for James Ortega in progress. Technical lead transition being managed.', lead: 'Rachel Kim', last_updated: '2026-04-20', state: 'yellow', percent_complete: 20 },
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
    { title: 'Reduce Epic EHR MTTA from 68 min to <20 min', track: 'ADR', description: 'ADR correlation surfaces Epic incidents before clinical staff report them. Centralized alert context removes manual escalation chain.', delivery_status: 'planned' as const, mapping_note: 'Current baseline: 68 min across 4 facilities. Target: 20 min (internal SLA). Requires: all Epic alert integrations live + correlation policies tuned. Projected: Q4 2026.' },
    { title: 'Eliminate ServiceNow ticket duplication for shared-infrastructure incidents', track: 'ADR', description: 'BigPanda correlation maps infrastructure incidents to single canonical ServiceNow ticket, ending 3–12 ticket duplication pattern.', delivery_status: 'planned' as const, mapping_note: 'Current: same Epic incident creates 3–12 duplicate tickets. ServiceNow integration staging complete — full deduplication requires correlation policies. Projected post Facility 1 go-live.' },
    { title: 'Give NOC night-shift team cross-facility visibility in a single interface', track: 'ADR', description: 'Two-person NOC team currently spans 4 facilities via phone calls. BigPanda unified view eliminates blind spots.', delivery_status: 'in_progress' as const, mapping_note: 'ServiceNow integration validated. First two facilities in staging. NOC team will have unified view as each facility goes live. Partial delivery by July 2026 (Facility 1 go-live).' },
    { title: 'Reduce $4.2M annual clinical workflow disruption cost by 40%+', track: 'ADR', description: 'Faster MTTA and reduced duplicate ticket noise directly reduces IT downtime impact on clinical operations.', delivery_status: 'planned' as const, mapping_note: 'Business case established at kickoff by Nancy Walsh. Measurement approach: Epic EHR downtime minutes per quarter × clinical impact factor. Baseline established. Assessment at 6-month post-go-live.' },
    { title: 'Decommission per-facility PRTG instances — one consolidated monitoring hub', track: 'ADR', description: 'Four separate PRTG instances replaced by BigPanda as the centralized aggregation hub for all facilities.', delivery_status: 'planned' as const, mapping_note: 'PRTG decommission planned as facilities go live and BigPanda stability is confirmed. Earliest decommission: Facility 1 PRTG at 60 days post go-live (September 2026). Full PRTG dark: 2027.' },
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
    { team_name: 'MedTrust Central (Facility 1)', track: 'ADR', ingest_status: 'in_progress' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'in_progress' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'MedTrust Riverside (Facility 2)', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'MedTrust North Shore (Facility 3)', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'MedTrust Westgate (Facility 4)', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
    { team_name: 'NOC Operations (All Facilities)', track: 'ADR', ingest_status: 'planned' as const, correlation_status: 'planned' as const, incident_intelligence_status: 'planned' as const, sn_automation_status: 'planned' as const, biggy_ai_status: 'planned' as const },
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
    // Event Ingest — alert sources
    { tool_name: 'Datadog', track: 'ADR', phase: 'Event Ingest', status: 'in_progress' as const, integration_method: 'Datadog Webhook + API', notes: 'APM + infrastructure. API key provisioned. Staging configuration in progress.' },
    { tool_name: 'Splunk Cloud', track: 'ADR', phase: 'Event Ingest', status: 'planned' as const, integration_method: 'Splunk HEC + Alert Actions', notes: 'Blocked by HIPAA compliance review. Unblock target: May 9 (M-MT-003).' },
    { tool_name: 'PRTG Network Monitor (Facility 1)', track: 'ADR', phase: 'Event Ingest', status: 'planned' as const, integration_method: 'REST API v2', notes: 'MedTrust Central. Implementation starts after Datadog staging complete.' },
    { tool_name: 'PRTG Network Monitor (Facilities 2–4)', track: 'ADR', phase: 'Event Ingest', status: 'planned' as const, integration_method: 'REST API v2 / SNMP Trap fallback', notes: 'Facilities 3 and 4 may require SNMP fallback (legacy PRTG versions). Audit May 6.' },
    { tool_name: 'Epic EHR Monitoring', track: 'ADR', phase: 'Event Ingest', status: 'planned' as const, integration_method: 'Datadog + Custom Alert Webhook', notes: 'Depends on HIPAA PHI field ruling (Q-MT-001) and correlation policy design (A-MT-004).' },
    { tool_name: 'Citrix DaaS Monitoring', track: 'ADR', phase: 'Event Ingest', status: 'planned' as const, integration_method: 'Datadog APM', notes: 'Clinical workstation monitoring. Phase 1.' },
    // Alert Intelligence — enrichment and CMDB context
    { tool_name: 'Epic EHR Asset Inventory', track: 'ADR', phase: 'Alert Intelligence', status: 'in_progress' as const, integration_method: 'Manual Import', notes: 'Epic server and application tier asset map (X-MT-006). Enriches alerts with clinical impact classification.' },
    { tool_name: 'Clinical Impact Tagger', track: 'ADR', phase: 'Alert Intelligence', status: 'planned' as const, integration_method: 'BigPanda Tag Policy', notes: 'Tags incidents by clinical impact: ICU > ER > OR > Inpatient > Outpatient. Blocked on HIPAA PHI field ruling (Q-MT-001).' },
    // Incident Intelligence — incident routing and context
    { tool_name: 'HIPAA PHI Field Filter', track: 'ADR', phase: 'Incident Intelligence', status: 'in_progress' as const, integration_method: 'BigPanda Field Policy', notes: 'Precautionary exclusion of clinical location strings pending CISO ruling. Applied to all incident payloads.' },
    // Workflow Automation — ITSM
    { tool_name: 'ServiceNow ITSM', track: 'ADR', phase: 'Workflow Automation', status: 'in_progress' as const, integration_method: 'Bi-directional REST Webhook', notes: 'Staging validated April 12. Production cutover at Facility 1 go-live (July). Q-MT-002 open: primary triage interface decision.' },
    // Biggy AI — Knowledge Sources
    { tool_name: 'Epic EHR Incident History', track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'planned' as const, integration_method: 'Document Ingestion', notes: 'Phase 2 — 12 months of EHR outage incident history. HIPAA PHI review required before ingestion.' },
    { tool_name: 'NOC Runbooks & Escalation Procedures', track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'planned' as const, integration_method: 'Document Ingestion', notes: 'Phase 2 — Clinical system escalation runbooks to train Biggy AI on healthcare-specific response patterns.' },
    // Biggy AI — Real-Time Query Sources
    { tool_name: 'Live Incident Context (ADR Pipeline)', track: 'Biggy AI', phase: 'Real-Time Query Sources', status: 'planned' as const, integration_method: 'BigPanda Native', notes: 'Phase 2 — Requires ADR 60-day stability window. Live correlation data feeds Biggy AI context.' },
    // Biggy AI — Biggy Capabilities
    { tool_name: 'Biggy AI', track: 'Biggy AI', phase: 'Biggy Capabilities', status: 'planned' as const, integration_method: 'BigPanda Native', notes: 'Phase 2 — pending ADR 60-day stability window. Epic EHR incident summaries and clinical impact context generation.' },
    // Biggy AI — Outputs & Actions
    { tool_name: 'ServiceNow P1/P2 Enrichment', track: 'Biggy AI', phase: 'Outputs & Actions', status: 'planned' as const, integration_method: 'ServiceNow REST API', notes: 'Phase 2 — AI-generated incident summary injected into ServiceNow P1/P2 ticket description.' },
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
    { track: 'ADR', name: 'Event Ingest', display_order: 1, status: 'in_progress' as const, notes: 'ServiceNow staging validated. Datadog configuration in progress. Splunk blocked by HIPAA review. PRTG integration design complete.' },
    { track: 'ADR', name: 'Alert Intelligence', display_order: 2, status: 'planned' as const, notes: 'Epic EHR correlation policy design blocked pending HIPAA PHI field ruling (Q-MT-001).' },
    { track: 'ADR', name: 'Incident Intelligence', display_order: 3, status: 'planned' as const, notes: 'Planned for Facility 1 go-live. Clinical impact tags pending CISO sign-off.' },
    { track: 'ADR', name: 'Console', display_order: 4, status: 'planned' as const, notes: 'NOC team training and BigPanda console rollout planned for July 2026 (Facility 1 go-live).' },
    { track: 'ADR', name: 'Workflow Automation', display_order: 5, status: 'in_progress' as const, notes: 'ServiceNow webhook staging validated April 12. Production cutover at Facility 1 go-live.' },
    // Biggy AI phases
    { track: 'Biggy AI', name: 'Knowledge Sources (Ingested)', display_order: 1, status: 'planned' as const, notes: 'Phase 2 — requires ADR 60-day stability window. HIPAA PHI considerations apply to ingested context.' },
    { track: 'Biggy AI', name: 'Real-Time Query Sources', display_order: 2, status: 'planned' as const, notes: 'Phase 2 — will draw from live ADR pipeline alert and incident data.' },
    { track: 'Biggy AI', name: 'Biggy Capabilities', display_order: 3, status: 'planned' as const, notes: 'Phase 2 — Epic EHR incident summaries and clinical impact context generation.' },
    { track: 'Biggy AI', name: 'Console', display_order: 4, status: 'planned' as const, notes: 'Phase 2 — NOC team access to Biggy AI incident summaries in BigPanda console.' },
    { track: 'Biggy AI', name: 'Outputs & Actions', display_order: 5, status: 'planned' as const, notes: 'Phase 2 — ServiceNow P1/P2 ticket enrichment with AI-generated incident summaries.' },
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
      workflow_name: 'Epic EHR Outage — Detection to Resolution',
      team_name: 'NOC Operations (All Facilities)',
      steps: [
        { label: 'Datadog detects Epic EHR performance degradation', track: 'ADR', status: 'planned', position: 1 },
        { label: 'PRTG fires network alert for same facility', track: 'ADR', status: 'planned', position: 2 },
        { label: 'BigPanda correlates Epic + network alerts into single incident', track: 'ADR', status: 'planned', position: 3 },
        { label: 'Clinical impact tag applied (ICU/ER priority)', track: 'ADR', status: 'planned', position: 4 },
        { label: 'ServiceNow P1 ticket auto-created', track: 'ADR', status: 'in_progress', position: 5 },
        { label: 'NOC triage with full correlated context', track: 'ADR', status: 'planned', position: 6 },
        { label: 'Resolution + auto-close across all correlated alerts', track: 'ADR', status: 'planned', position: 7 },
      ],
    },
    {
      workflow_name: 'Cross-Facility Network Alert — Shared Infrastructure',
      team_name: 'MedTrust Central (Facility 1)',
      steps: [
        { label: 'PRTG fires WAN link alert at Facility 1', track: 'ADR', status: 'planned', position: 1 },
        { label: 'PRTG fires secondary alert at Facility 2 (same WAN segment)', track: 'ADR', status: 'planned', position: 2 },
        { label: 'BigPanda correlates to single cross-facility incident', track: 'ADR', status: 'planned', position: 3 },
        { label: 'NOC sees single incident instead of 2 separate tickets', track: 'ADR', status: 'planned', position: 4 },
        { label: 'Network team dispatched with full context', track: 'ADR', status: 'planned', position: 5 },
      ],
    },
    {
      workflow_name: 'Security Alert — Splunk to BigPanda Correlation',
      team_name: 'NOC Operations (All Facilities)',
      steps: [
        { label: 'Splunk fires security event', track: 'ADR', status: 'planned', position: 1 },
        { label: 'BigPanda correlates with infrastructure alerts in same window', track: 'ADR', status: 'planned', position: 2 },
        { label: 'Combined security + infrastructure incident created', track: 'ADR', status: 'planned', position: 3 },
        { label: 'Security team and NOC joint triage', track: 'ADR', status: 'planned', position: 4 },
        { label: 'Incident closed with security + infrastructure resolution noted', track: 'ADR', status: 'planned', position: 5 },
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
    { title: 'Unblock HIPAA Review — Get CISO Sign-Off by May 2', tracks: 'ADR', why_it_matters: 'Splunk integration and clinical location tags in correlation policies are blocked until compliance ruling. Without Splunk, security alert correlation cannot start. Without PHI ruling, Epic EHR policies cannot be finalized.', current_status: 'Documentation package delivered to Sandra Okafor team April 18. Review meeting April 28. Rachel Kim leading. Q-MT-001 answer needed first.', next_step: 'Rachel to follow up with Sandra before April 28 meeting. If April 28 meeting resolves Q-MT-001, Daniel Park to begin clinical correlation policy design same week.', bp_owner: 'Rachel Kim', customer_owner: 'Sandra Okafor (CISO)' },
    { title: 'Complete Ryan Torres Onboarding — Minimize Technical Continuity Risk', tracks: 'ADR', why_it_matters: 'Ryan Torres is the new technical lead replacing Michael Chen. Without him fully briefed and engaged, Epic EHR integration design and NOC workflow decisions will remain blocked on the BigPanda team side.', current_status: 'Three briefing sessions scheduled April 21–25. Daniel Park providing parallel documentation support. Ryan joins weekly sync starting April 23.', next_step: 'Rachel to confirm Ryan Torres is cleared and confident to own integration decisions after April 25 staging session. Assign A-MT-003 (Datadog) to Ryan post-onboarding.', bp_owner: 'Rachel Kim', customer_owner: 'Ryan Torres (IT Ops Tech Lead)' },
    { title: 'Present Recovery Plan to Nancy Walsh — Get Revised Milestones Approved', tracks: 'ADR', why_it_matters: 'Three-week schedule delay from technical lead change needs formal CIO acknowledgment. Recovery plan options need executive decision on parallel vs sequential facility onboarding. A-MT-006 drives all downstream milestone dates.', current_status: 'Recovery plan drafted. Two options: (A) sequential approach as planned, accept July 15 Facility 1 go-live; (B) parallel Facility 1+2 onboarding, hold July 1 date with higher resource risk.', next_step: 'Rachel Kim to present recovery plan April 25. Recommend Option A (sequential, lower risk). Get Nancy Walsh approval. Update all milestones post-meeting.', bp_owner: 'Rachel Kim', customer_owner: 'Nancy Walsh (CIO)' },
    { title: 'Address Riverside Adoption Risk — Stakeholder Engagement for James Ortega', tracks: 'ADR', why_it_matters: 'James Ortega (Facility 2 IT Lead) has expressed preference for ServiceNow as primary interface, in conflict with the project direction. If not resolved before Facility 2 go-live, adoption failure risk is high.', current_status: 'Stakeholder engagement plan in progress. Q-MT-002 answer from Nancy Walsh (April 25) will clarify interface strategy — may resolve James\'s concern if ServiceNow is confirmed as system of record.', next_step: 'Rachel Kim to brief James Ortega on Q-MT-002 answer and NOC workflow design immediately after April 25 CIO meeting. Schedule Facility 2 change management session for May.', bp_owner: 'Rachel Kim', customer_owner: 'James Ortega (Riverside IT Lead)' },
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
      .where(sql`${onboardingPhases.project_id} = ${projectId} AND ${onboardingPhases.name} = ${'Phase 1 — ADR Foundation (Facilities 1–3)'}`)
      .limit(1);
    if (ex.length > 0) return ex[0].id;
    const [row] = await db.insert(onboardingPhases).values({ project_id: projectId, name: 'Phase 1 — ADR Foundation (Facilities 1–3)', display_order: 1 }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 1');
    return row.id;
  })();

  const phase2Id = await (async () => {
    const ex = await db.select({ id: onboardingPhases.id }).from(onboardingPhases)
      .where(sql`${onboardingPhases.project_id} = ${projectId} AND ${onboardingPhases.name} = ${'Phase 2 — Biggy AI + Facility 4 Expansion'}`)
      .limit(1);
    if (ex.length > 0) return ex[0].id;
    const [row] = await db.insert(onboardingPhases).values({ project_id: projectId, name: 'Phase 2 — Biggy AI + Facility 4 Expansion', display_order: 2 }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 2');
    return row.id;
  })();

  const stepDefs = [
    { phase_id: phase1Id, name: 'HIPAA Compliance Sign-Off', status: 'in-progress' as const, owner: 'Rachel Kim', display_order: 1, dependencies: [] as string[], updates: [{ date: '2026-04-20', note: 'Documentation package submitted. CISO review April 28.' }] },
    { phase_id: phase1Id, name: 'ServiceNow Integration — Staging Validated', status: 'complete' as const, owner: 'Daniel Park', display_order: 2, dependencies: [] as string[], updates: [{ date: '2026-04-12', note: 'All 3 workflow scenarios validated in staging.' }] },
    { phase_id: phase1Id, name: 'Datadog Integration — Staging Validated', status: 'in-progress' as const, owner: 'Daniel Park', display_order: 3, dependencies: [] as string[], updates: [{ date: '2026-04-20', note: 'Configuration in progress. Target April 25.' }] },
    { phase_id: phase1Id, name: 'Splunk Integration — Staging Validated', status: 'not-started' as const, owner: 'Daniel Park', display_order: 4, dependencies: ['HIPAA Compliance Sign-Off'], updates: [] },
    { phase_id: phase1Id, name: 'PRTG Integration — All Facilities', status: 'not-started' as const, owner: 'Daniel Park', display_order: 5, dependencies: ['Datadog Integration — Staging Validated'], updates: [] },
    { phase_id: phase1Id, name: 'Epic EHR Correlation Policies — v1.0', status: 'in-progress' as const, owner: 'Daniel Park', display_order: 6, dependencies: ['HIPAA Compliance Sign-Off'], updates: [{ date: '2026-04-20', note: 'Design 30% complete. Blocked on PHI field ruling.' }] },
    { phase_id: phase1Id, name: 'Facility 1 (Central) Production Go-Live', status: 'not-started' as const, owner: 'Rachel Kim', display_order: 7, dependencies: ['Epic EHR Correlation Policies — v1.0', 'PRTG Integration — All Facilities'], updates: [] },
    { phase_id: phase1Id, name: 'Facility 2 (Riverside) Production Go-Live', status: 'not-started' as const, owner: 'Daniel Park', display_order: 8, dependencies: ['Facility 1 (Central) Production Go-Live'], updates: [] },
    { phase_id: phase1Id, name: 'Facility 3 (North Shore) Production Go-Live', status: 'not-started' as const, owner: 'Daniel Park', display_order: 9, dependencies: ['Facility 2 (Riverside) Production Go-Live'], updates: [] },
    { phase_id: phase2Id, name: 'ADR 60-Day Stability Review', status: 'not-started' as const, owner: 'Rachel Kim', display_order: 1, dependencies: [] as string[], updates: [] },
    { phase_id: phase2Id, name: 'Biggy AI Pilot Design', status: 'not-started' as const, owner: 'Daniel Park', display_order: 2, dependencies: ['ADR 60-Day Stability Review'], updates: [] },
    { phase_id: phase2Id, name: 'Facility 4 (Westgate) Onboarding', status: 'not-started' as const, owner: 'Daniel Park', display_order: 3, dependencies: ['Facility 3 (North Shore) Production Go-Live'], updates: [] },
    { phase_id: phase2Id, name: 'Full Production Sign-Off — All Facilities + Biggy AI', status: 'not-started' as const, owner: 'Rachel Kim', display_order: 4, dependencies: ['Biggy AI Pilot Design', 'Facility 4 (Westgate) Onboarding'], updates: [] },
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
    { tool: 'ServiceNow ITSM', category: 'ITSM', status: 'validated' as const, color: '#0EA5E9', notes: 'Staging validated. Production: July go-live.', display_order: 1 },
    { tool: 'Datadog', category: 'APM / Infrastructure', status: 'configured' as const, color: '#632CA6', notes: 'API key provisioned. Staging in progress.', display_order: 2 },
    { tool: 'Splunk Cloud', category: 'SIEM', status: 'not-connected' as const, color: '#E20082', notes: 'Blocked by HIPAA review. Target unblock May 9.', display_order: 3 },
    { tool: 'PRTG Network Monitor', category: 'Network Monitoring', status: 'not-connected' as const, color: '#2563EB', notes: 'Design complete. Implementation after Datadog done.', display_order: 4 },
    { tool: 'Epic EHR Monitoring', category: 'Clinical Application', status: 'not-connected' as const, color: '#DC2626', notes: 'Depends on HIPAA sign-off + correlation design.', display_order: 5 },
    { tool: 'Citrix DaaS', category: 'Virtual Desktop', status: 'not-connected' as const, color: '#0F766E', notes: 'Phase 1 — clinical workstation monitoring.', display_order: 6 },
    { tool: 'Biggy AI', category: 'AI Incident Intelligence', status: 'not-connected' as const, color: '#6366F1', notes: 'Phase 2 — pending ADR 60-day stability.', display_order: 7 },
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
    // Design workshops
    { title: 'Facility 1 (MedTrust Central) integration design workshop', milestone_id: milestoneIds['M-MT-001'], start_date: '2026-03-20', due: '2026-03-22', status: 'done', owner: 'Daniel Park', priority: 'high', phase: 'design' },
    { title: 'Facility 2 (Riverside) integration design workshop', milestone_id: milestoneIds['M-MT-001'], start_date: '2026-03-27', due: '2026-03-29', status: 'done', owner: 'Daniel Park', priority: 'high', phase: 'design' },
    { title: 'Facility 3 (North Shore) integration design workshop', milestone_id: milestoneIds['M-MT-001'], start_date: '2026-04-08', due: '2026-04-10', status: 'done', owner: 'Daniel Park', priority: 'high', phase: 'design' },
    { title: 'Epic EHR alert taxonomy documentation (X-MT-006)', milestone_id: milestoneIds['M-MT-001'], start_date: '2026-03-22', due: '2026-04-01', status: 'done', owner: 'Daniel Park', priority: 'medium', phase: 'design' },
    // Staging
    { title: 'ServiceNow ITSM staging configuration and validation', milestone_id: milestoneIds['M-MT-002'], start_date: '2026-03-25', due: '2026-04-12', status: 'done', owner: 'Daniel Park', priority: 'high', phase: 'integration' },
    { title: 'Datadog staging configuration — Citrix and Epic monitoring', milestone_id: milestoneIds['M-MT-002'], start_date: '2026-04-15', due: '2026-04-25', status: 'in_progress', owner: 'Daniel Park', priority: 'high', phase: 'integration' },
    // HIPAA
    { title: 'HIPAA compliance documentation package — data flow, field exclusions, encryption', milestone_id: milestoneIds['M-MT-003'], start_date: '2026-04-08', due: '2026-04-18', status: 'done', owner: 'Rachel Kim', priority: 'high', phase: 'compliance' },
    { title: 'CISO review meeting and sign-off — Splunk cloud integration', milestone_id: milestoneIds['M-MT-003'], start_date: '2026-04-28', due: '2026-05-09', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: 'compliance' },
    // Recovery plan
    { title: 'Recovery plan draft — revised milestone schedule options', milestone_id: null, start_date: '2026-04-14', due: '2026-04-23', status: 'in_progress', owner: 'Rachel Kim', priority: 'high', phase: null },
    { title: 'Recovery plan presentation to Nancy Walsh (CIO)', milestone_id: null, start_date: '2026-04-25', due: '2026-04-25', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: null },
    // Epic EHR correlation design
    { title: 'Epic EHR correlation policy design — v1.0 draft', milestone_id: milestoneIds['M-MT-004'], start_date: '2026-05-09', due: '2026-05-30', status: 'todo', owner: 'Daniel Park', priority: 'high', phase: 'design' },
    { title: 'PRTG Facility 1 integration configuration', milestone_id: milestoneIds['M-MT-004'], start_date: '2026-05-15', due: '2026-06-15', status: 'todo', owner: 'Daniel Park', priority: 'high', phase: 'integration' },
    { title: 'PRTG version audit — Facilities 3 and 4', milestone_id: milestoneIds['M-MT-004'], start_date: '2026-05-05', due: '2026-05-10', status: 'todo', owner: 'Daniel Park', priority: 'medium', phase: 'integration' },
    { title: 'Splunk Cloud integration configuration (post-HIPAA)', milestone_id: milestoneIds['M-MT-004'], start_date: '2026-05-12', due: '2026-06-01', status: 'todo', owner: 'Daniel Park', priority: 'high', phase: 'integration' },
    { title: 'Staging load test — full Facility 1 alert volume', milestone_id: milestoneIds['M-MT-004'], start_date: '2026-06-15', due: '2026-06-25', status: 'todo', owner: 'Daniel Park', priority: 'high', phase: 'integration' },
    { title: 'NOC team training — BigPanda triage interface', milestone_id: milestoneIds['M-MT-004'], start_date: '2026-06-20', due: '2026-07-01', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: 'onboarding' },
    { title: 'Facility 1 (MedTrust Central) production go-live', milestone_id: milestoneIds['M-MT-004'], start_date: '2026-07-01', due: '2026-07-01', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: 'golive' },
    // Facility 2
    { title: 'Facility 2 (Riverside) PRTG + Datadog integration', milestone_id: milestoneIds['M-MT-005'], start_date: '2026-07-05', due: '2026-08-01', status: 'todo', owner: 'Daniel Park', priority: 'high', phase: 'integration' },
    { title: 'Riverside change management session — James Ortega', milestone_id: milestoneIds['M-MT-005'], start_date: '2026-05-15', due: '2026-05-30', status: 'todo', owner: 'Rachel Kim', priority: 'medium', phase: 'onboarding' },
    { title: 'Facility 2 (Riverside) production go-live', milestone_id: milestoneIds['M-MT-005'], start_date: '2026-08-10', due: '2026-08-15', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: 'golive' },
    // Phase 1 completion
    { title: 'Facility 3 (North Shore) production go-live', milestone_id: milestoneIds['M-MT-006'], start_date: '2026-09-15', due: '2026-10-15', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: 'golive' },
    { title: 'Phase 1 sign-off — all facilities live, NOC trained, ADR operational', milestone_id: milestoneIds['M-MT-006'], start_date: '2026-10-20', due: '2026-11-01', status: 'todo', owner: 'Rachel Kim', priority: 'high', phase: 'golive' },
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
    // ADR track — 10 standard delivery phases (early-stage, most work ahead)
    { name: 'Discovery & Kickoff', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-03-10', due_date: '2026-03-22' },
    { name: 'Solution Design', track: 'ADR', display_order: 2, status: 'complete' as const, start_date: '2026-03-22', due_date: '2026-04-10' },
    { name: 'Alert Source Integration', track: 'ADR', display_order: 3, status: 'in_progress' as const, start_date: '2026-04-01', due_date: '2026-06-15' },
    { name: 'Alert Enrichment & Normalization', track: 'ADR', display_order: 4, status: 'in_progress' as const, start_date: '2026-04-08', due_date: '2026-06-30' },
    { name: 'Platform Configuration', track: 'ADR', display_order: 5, status: 'in_progress' as const, start_date: '2026-04-15', due_date: '2026-06-01' },
    { name: 'Correlation', track: 'ADR', display_order: 6, status: 'not_started' as const, start_date: '2026-05-09', due_date: '2026-07-01' },
    { name: 'Routing & Escalation', track: 'ADR', display_order: 7, status: 'not_started' as const, start_date: '2026-06-01', due_date: '2026-07-01' },
    { name: 'Teams & Training', track: 'ADR', display_order: 8, status: 'not_started' as const, start_date: '2026-06-15', due_date: '2026-10-15' },
    { name: 'UAT & Go-Live Preparation', track: 'ADR', display_order: 9, status: 'not_started' as const, start_date: '2026-08-01', due_date: '2026-10-15' },
    { name: 'Go-Live', track: 'ADR', display_order: 10, status: 'not_started' as const, start_date: '2026-10-15', due_date: '2026-11-01' },
    // Biggy AI track — 5 standard delivery phases (Phase 2, all planned)
    { name: 'Discovery & Kickoff', track: 'Biggy', display_order: 1, status: 'not_started' as const, start_date: '2026-11-01', due_date: '2026-11-15' },
    { name: 'Integrations', track: 'Biggy', display_order: 2, status: 'not_started' as const, start_date: '2026-11-15', due_date: '2026-12-15' },
    { name: 'Workflow', track: 'Biggy', display_order: 3, status: 'not_started' as const, start_date: '2026-12-01', due_date: '2027-01-15' },
    { name: 'Teams & Training', track: 'Biggy', display_order: 4, status: 'not_started' as const, start_date: '2026-12-15', due_date: '2027-02-01' },
    { name: 'Deploy', track: 'Biggy', display_order: 5, status: 'not_started' as const, start_date: '2027-02-01', due_date: '2027-02-28' },
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
    { parent: 'ADR:Solution Design', name: 'Ops Shadowing / Current State', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-03-22', due_date: '2026-03-29' },
    { parent: 'ADR:Solution Design', name: 'Future State Workflow', track: 'ADR', display_order: 2, status: 'complete' as const, start_date: '2026-03-29', due_date: '2026-04-05' },
    { parent: 'ADR:Solution Design', name: 'ADR Process Consulting', track: 'ADR', display_order: 3, status: 'complete' as const, start_date: '2026-04-01', due_date: '2026-04-10' },
    // ADR: Alert Source Integration
    { parent: 'ADR:Alert Source Integration', name: 'Outbound Integrations', track: 'ADR', display_order: 1, status: 'in_progress' as const, start_date: '2026-04-01', due_date: '2026-05-09' },
    { parent: 'ADR:Alert Source Integration', name: 'Inbound Integrations', track: 'ADR', display_order: 2, status: 'not_started' as const, start_date: '2026-05-09', due_date: '2026-06-15' },
    // ADR: Alert Enrichment & Normalization
    { parent: 'ADR:Alert Enrichment & Normalization', name: 'Tag Documentation', track: 'ADR', display_order: 1, status: 'in_progress' as const, start_date: '2026-04-08', due_date: '2026-05-01' },
    { parent: 'ADR:Alert Enrichment & Normalization', name: 'Normalization Configuration', track: 'ADR', display_order: 2, status: 'not_started' as const, start_date: '2026-05-09', due_date: '2026-06-15' },
    { parent: 'ADR:Alert Enrichment & Normalization', name: 'CMDB', track: 'ADR', display_order: 3, status: 'not_started' as const, start_date: '2026-05-15', due_date: '2026-06-30' },
    // ADR: Platform Configuration
    { parent: 'ADR:Platform Configuration', name: 'Environments', track: 'ADR', display_order: 1, status: 'complete' as const, start_date: '2026-04-15', due_date: '2026-04-22' },
    { parent: 'ADR:Platform Configuration', name: 'Incident Tags', track: 'ADR', display_order: 2, status: 'in_progress' as const, start_date: '2026-04-22', due_date: '2026-05-15' },
    { parent: 'ADR:Platform Configuration', name: 'Role Based Access Control', track: 'ADR', display_order: 3, status: 'not_started' as const, start_date: '2026-05-01', due_date: '2026-05-15' },
    { parent: 'ADR:Platform Configuration', name: 'Incident Routing', track: 'ADR', display_order: 4, status: 'not_started' as const, start_date: '2026-05-15', due_date: '2026-06-01' },
    { parent: 'ADR:Platform Configuration', name: 'Maintenance Plans', track: 'ADR', display_order: 5, status: 'not_started' as const, start_date: '2026-05-15', due_date: '2026-06-01' },
    { parent: 'ADR:Platform Configuration', name: 'Single Sign-On', track: 'ADR', display_order: 6, status: 'not_started' as const, start_date: '2026-05-01', due_date: '2026-06-01' },
    { parent: 'ADR:Platform Configuration', name: 'Admin / Reporting', track: 'ADR', display_order: 7, status: 'not_started' as const, start_date: '2026-05-15', due_date: '2026-06-01' },
    // ADR: Correlation
    { parent: 'ADR:Correlation', name: 'Use Case Discovery', track: 'ADR', display_order: 1, status: 'not_started' as const, start_date: '2026-05-09', due_date: '2026-05-30' },
    { parent: 'ADR:Correlation', name: 'Correlation Configuration', track: 'ADR', display_order: 2, status: 'not_started' as const, start_date: '2026-05-30', due_date: '2026-07-01' },
    // ADR: Teams & Training
    { parent: 'ADR:Teams & Training', name: 'User Training', track: 'ADR', display_order: 1, status: 'not_started' as const, start_date: '2026-06-15', due_date: '2026-10-15' },
    // ADR: UAT & Go-Live Preparation
    { parent: 'ADR:UAT & Go-Live Preparation', name: 'UAT', track: 'ADR', display_order: 1, status: 'not_started' as const, start_date: '2026-08-01', due_date: '2026-09-30' },
    { parent: 'ADR:UAT & Go-Live Preparation', name: 'Documentation', track: 'ADR', display_order: 2, status: 'not_started' as const, start_date: '2026-08-01', due_date: '2026-10-15' },
    { parent: 'ADR:UAT & Go-Live Preparation', name: 'Go-Live Prep', track: 'ADR', display_order: 3, status: 'not_started' as const, start_date: '2026-09-30', due_date: '2026-10-15' },
    // ADR: Go-Live
    { parent: 'ADR:Go-Live', name: 'Go Live', track: 'ADR', display_order: 1, status: 'not_started' as const, start_date: '2026-11-01', due_date: '2026-11-01' },
    { parent: 'ADR:Go-Live', name: 'Post Go-Live Survey', track: 'ADR', display_order: 2, status: 'not_started' as const, start_date: '2026-11-01', due_date: '2026-11-15' },
    { parent: 'ADR:Go-Live', name: 'Unified Analytics', track: 'ADR', display_order: 3, status: 'not_started' as const, start_date: '2026-11-15', due_date: '2026-12-01' },
    { parent: 'ADR:Go-Live', name: 'Project Closure', track: 'ADR', display_order: 4, status: 'not_started' as const, start_date: '2026-12-01', due_date: '2026-12-31' },
    // Biggy: Integrations
    { parent: 'Biggy:Integrations', name: 'Real-Time Integrations', track: 'Biggy', display_order: 1, status: 'not_started' as const, start_date: '2026-11-15', due_date: '2026-12-15' },
    { parent: 'Biggy:Integrations', name: 'Context Integrations', track: 'Biggy', display_order: 2, status: 'not_started' as const, start_date: '2026-11-15', due_date: '2026-12-15' },
    { parent: 'Biggy:Integrations', name: 'UDC', track: 'Biggy', display_order: 3, status: 'not_started' as const, start_date: '2026-12-01', due_date: '2026-12-31' },
    // Biggy: Workflow
    { parent: 'Biggy:Workflow', name: 'Action Plans', track: 'Biggy', display_order: 1, status: 'not_started' as const, start_date: '2026-12-01', due_date: '2027-01-15' },
    { parent: 'Biggy:Workflow', name: 'Workflows', track: 'Biggy', display_order: 2, status: 'not_started' as const, start_date: '2026-12-15', due_date: '2027-01-15' },
    { parent: 'Biggy:Workflow', name: 'Managed Incident Channels', track: 'Biggy', display_order: 3, status: 'not_started' as const, start_date: '2027-01-01', due_date: '2027-01-31' },
    // Biggy: Teams & Training
    { parent: 'Biggy:Teams & Training', name: 'Team-Specific Workflow Enablement', track: 'Biggy', display_order: 1, status: 'not_started' as const, start_date: '2026-12-15', due_date: '2027-02-01' },
    { parent: 'Biggy:Teams & Training', name: 'Workflow Automations', track: 'Biggy', display_order: 2, status: 'not_started' as const, start_date: '2027-01-01', due_date: '2027-02-01' },
    { parent: 'Biggy:Teams & Training', name: 'Training', track: 'Biggy', display_order: 3, status: 'not_started' as const, start_date: '2026-12-15', due_date: '2027-02-01' },
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
    { date: '2026-04-10', hours: '4.5', description: 'Facility 3 (North Shore) integration design workshop', user_id: 'default' },
    { date: '2026-04-10', hours: '2.0', description: 'M-MT-001 completion documentation and milestone close-out notes', user_id: 'default' },
    { date: '2026-04-12', hours: '3.0', description: 'ServiceNow staging validation — all 3 scenarios complete', user_id: 'default' },
    { date: '2026-04-14', hours: '2.0', description: 'Technical lead transition planning — Michael Chen debrief', user_id: 'default' },
    { date: '2026-04-15', hours: '3.5', description: 'Datadog staging configuration — Citrix alert integration setup', user_id: 'default' },
    { date: '2026-04-16', hours: '2.5', description: 'Weekly status report and Nancy Walsh executive update', user_id: 'default' },
    { date: '2026-04-17', hours: '4.0', description: 'HIPAA compliance documentation package — data flow diagram and field exclusion list', user_id: 'default' },
    { date: '2026-04-18', hours: '1.5', description: 'HIPAA package delivery meeting with Sandra Okafor CISO team', user_id: 'default' },
    { date: '2026-04-20', hours: '3.0', description: 'Recovery plan draft — two-option analysis for Nancy Walsh presentation', user_id: 'default' },
    { date: '2026-04-20', hours: '2.0', description: 'Ryan Torres briefing session 1 — project overview and context', user_id: 'default' },
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
      status: 'planned' as const,
      notes: 'Will be primary BigPanda users across all facilities. Training planned for July 2026.',
      route_steps: [
        { label: 'Alert fires in source tool (Datadog/PRTG/Splunk)' },
        { label: 'BigPanda ADR correlates cross-facility alerts' },
        { label: 'Clinical impact tag applied (Epic/ICU/ER priority)' },
        { label: 'NOC triage in BigPanda unified interface' },
        { label: 'ServiceNow P1 ticket auto-created' },
        { label: 'Engineer dispatched with full context' },
        { label: 'Resolution + auto-close' },
      ],
    },
    {
      team_name: 'MedTrust Central (Facility 1)',
      status: 'in_progress' as const,
      notes: 'Phase 1 lead facility. ServiceNow + Datadog staging complete. PRTG configuration coming May.',
      route_steps: [
        { label: 'Datadog detects Epic / infrastructure alert' },
        { label: 'PRTG fires network alert (same facility)' },
        { label: 'BigPanda correlates into unified incident' },
        { label: 'ServiceNow ticket auto-created' },
        { label: 'Facility IT team + NOC joint triage' },
        { label: 'Resolution and close' },
      ],
    },
    {
      team_name: 'MedTrust Riverside (Facility 2)',
      status: 'planned' as const,
      notes: 'Phase 1 second facility. Onboarding Q3 2026. Change management session planned May.',
      route_steps: [
        { label: 'PRTG / Datadog alert fires at Riverside' },
        { label: 'BigPanda ADR ingests and correlates' },
        { label: 'Incident surfaced in unified NOC view' },
        { label: 'ServiceNow ticket created' },
        { label: 'Riverside IT + NOC triage' },
        { label: 'Resolution and close' },
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
    { title: 'HIPAA PHI Considerations for Alert Field Ingestion', content: 'MedTrust Health System is subject to HIPAA Privacy Rule and Security Rule. BigPanda alert ingestion must ensure no Protected Health Information (PHI) appears in alert payload fields that are stored or transmitted. Known PHI risk areas in alert data: (1) clinical location strings referencing patient care units (e.g., "ICU-3-bed12-monitor"), (2) device names that encode patient identifiers, (3) application error messages that may contain patient IDs in Epic EHR log events. Current approach: precautionary exclusion of all clinical location strings pending CISO ruling on Q-MT-001. Field exclusion list maintained by Rachel Kim in compliance documentation (X-MT-003).', source_trace: 'seed' },
    { title: 'Epic EHR Alert Architecture — MedTrust Monitoring Stack', content: 'MedTrust uses Epic EHR version 2024.1 across all 4 facilities on a shared cloud infrastructure. Epic EHR monitoring routes through three paths: (1) Datadog APM agent monitors Epic web tier and database performance — fires on latency thresholds; (2) Epic\'s built-in monitoring tool (Epic Hyperspace) sends SMTP alerts to a shared mailbox that currently goes unmonitored; (3) Windows Event Log alerts from Epic application servers forwarded to PRTG. BigPanda integration design targets paths 1 and 3. Path 2 (SMTP) will be replaced by direct webhook from Datadog in the new model. Clinical alert priority: ICU > ER > OR > Inpatient > Outpatient for P1 determination.', source_trace: 'seed' },
    { title: 'PRTG Integration Approach — Version Compatibility Notes', content: 'PRTG Network Monitor versions vary across MedTrust facilities. Facility 1 (Central): PRTG v23.4 — REST API v2 supported, JSON alert export. Facility 2 (Riverside): PRTG v22.1 — REST API v1 only, limited JSON support. Facilities 3 and 4: version audit scheduled May 6 — expected to be PRTG v19.x (EOL). Fallback approach for EOL PRTG versions: SNMP trap forwarding to BigPanda via SNMP listener. This is a supported pattern and produces equivalent alert data. All PRTG integration designs should include SNMP fallback as a parallel path until version audit confirms API compatibility.', source_trace: 'seed' },
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

  console.log(`\n✅ MedTrust demo seed complete! Project id=${projectId}`);
  console.log(`   Navigate to: /customer/${projectId}/overview`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
