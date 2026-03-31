/**
 * seed-acme.ts — Populate ACME Corp (id=4) with demo data across all tabs.
 *
 * Run: npx tsx scripts/seed-acme.ts
 *
 * Idempotent: checks for existing rows before inserting.
 * Uses project_id=4 (ACME Corp, the Test Wizard Project).
 */

import { db } from '../db/index';
import {
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
  projects,
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const PROJECT_ID = 4;
const CUSTOMER = 'ACME';

async function seed() {
  // ── Verify project exists ─────────────────────────────────────────────────
  const [proj] = await db.select().from(projects).where(eq(projects.id, PROJECT_ID));
  if (!proj) {
    console.error(`Project id=${PROJECT_ID} not found. Aborting.`);
    process.exit(1);
  }
  console.log(`Seeding project: "${proj.name}" (id=${PROJECT_ID})`);

  // Update project-level fields to look realistic
  await db.update(projects).set({
    name: 'ACME Corp PA 3.0',
    customer: 'ACME',
    overall_status: 'yellow',
    status_summary: 'Integration track is on schedule. Biggy AI pilot delayed pending security review approval from ACME InfoSec team. Weekly syncs continue with strong stakeholder engagement.',
    go_live_target: '2026-06-30',
    last_updated: '2026-03-25',
    description: 'PA 3.0 implementation covering ADR pipeline, Biggy AI incident intelligence, and ServiceNow automation for ACME Corp. Two parallel tracks with 6 teams onboarding.',
    start_date: '2025-11-01',
    end_date: '2026-08-31',
  }).where(eq(projects.id, PROJECT_ID));

  // ─── Artifacts (insert first so other tables can reference) ───────────────
  const artifactRows = [
    {
      external_id: 'X-ACME-001',
      name: 'ACME PA 3.0 Kickoff Deck',
      description: 'Slide deck from November 2025 kickoff session covering project scope, timeline, and team structure.',
      status: 'approved',
      owner: 'Josh M.',
      source: 'manual',
    },
    {
      external_id: 'X-ACME-002',
      name: 'Integration Architecture Diagram',
      description: 'Technical diagram showing ACME\'s alert pipeline, correlation flow, and ServiceNow ticketing integration.',
      status: 'draft',
      owner: 'Sarah K.',
      source: 'manual',
    },
    {
      external_id: 'X-ACME-003',
      name: 'ACME NOC Team Onboarding Runbook',
      description: 'Step-by-step runbook for the NOC team to operate BigPanda in production.',
      status: 'in_progress',
      owner: 'Tom R.',
      source: 'manual',
    },
    {
      external_id: 'X-ACME-004',
      name: 'Security Review Questionnaire — Biggy AI',
      description: 'InfoSec questionnaire submitted for Biggy AI pilot approval. Awaiting ACME InfoSec response.',
      status: 'pending',
      owner: 'ACME InfoSec',
      source: 'manual',
    },
    {
      external_id: 'X-ACME-005',
      name: 'Weekly Status Report — Week of 2026-03-24',
      description: 'Most recent weekly customer status email covering actions, risks, and milestone progress.',
      status: 'sent',
      owner: 'Josh M.',
      source: 'manual',
    },
  ];

  const insertedArtifactIds: Record<string, number> = {};
  for (const art of artifactRows) {
    const existing = await db.select({ id: artifacts.id }).from(artifacts)
      .where(sql`${artifacts.project_id} = ${PROJECT_ID} AND ${artifacts.external_id} = ${art.external_id}`)
      .limit(1);
    if (existing.length === 0) {
      const [row] = await db.insert(artifacts).values({ project_id: PROJECT_ID, ...art }).returning({ id: artifacts.id });
      insertedArtifactIds[art.external_id] = row.id;
      console.log(`  ✓ Artifact ${art.external_id}`);
    } else {
      insertedArtifactIds[art.external_id] = existing[0].id;
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  const actionRows = [
    {
      external_id: 'A-ACME-001',
      description: 'Complete ServiceNow webhook configuration for bi-directional sync — test with NOC team',
      owner: 'Sarah K.',
      due: '2026-04-04',
      status: 'in_progress' as const,
      notes: 'SNOW admin access confirmed. Webhook endpoint deployed to staging.',
      type: 'action',
      source: 'manual',
    },
    {
      external_id: 'A-ACME-002',
      description: 'Schedule Biggy AI pilot kickoff with NOC leads — pending InfoSec security review approval',
      owner: 'Josh M.',
      due: '2026-04-11',
      status: 'open' as const,
      notes: 'Blocked by X-ACME-004 (security questionnaire). Will reschedule once approved.',
      type: 'action',
      source: 'manual',
    },
    {
      external_id: 'A-ACME-003',
      description: 'Deliver correlation policy tuning session — reduce false positive rate below 15%',
      owner: 'Tom R.',
      due: '2026-03-28',
      status: 'open' as const,
      notes: 'Current FP rate ~22%. Session booked with ACME NOC team lead.',
      type: 'action',
      source: 'manual',
    },
    {
      external_id: 'A-ACME-004',
      description: 'Validate PagerDuty → BigPanda alert ingestion in production environment',
      owner: 'ACME Ops — Mike T.',
      due: '2026-03-31',
      status: 'completed' as const,
      notes: 'Completed 2026-03-21. 14,000+ alerts per day flowing correctly.',
      type: 'action',
      source: 'manual',
    },
    {
      external_id: 'A-ACME-005',
      description: 'Review and approve architecture diagram with ACME architecture team',
      owner: 'ACME Arch — Dana L.',
      due: '2026-04-07',
      status: 'open' as const,
      notes: 'Sent X-ACME-002 for review on 2026-03-20. Awaiting feedback.',
      type: 'action',
      source: 'manual',
    },
    {
      external_id: 'A-ACME-006',
      description: 'Complete tagging taxonomy workshop with platform team',
      owner: 'Tom R.',
      due: '2026-04-18',
      status: 'open' as const,
      notes: 'Platform team identified 6 environment tags and 3 severity override rules needed.',
      type: 'action',
      source: 'manual',
    },
    {
      external_id: 'A-ACME-007',
      description: 'Onboard Cloud Infrastructure team to BigPanda — complete initial correlation setup',
      owner: 'Sarah K.',
      due: '2026-05-02',
      status: 'open' as const,
      notes: 'This is the second team in Phase 2. NOC team onboarding completes April 15.',
      type: 'action',
      source: 'manual',
    },
    {
      external_id: 'Q-ACME-001',
      description: 'What is ACME\'s policy on AI-generated incident summaries being visible in ServiceNow tickets?',
      owner: 'ACME InfoSec',
      due: 'TBD',
      status: 'open' as const,
      notes: 'Raised during Biggy AI design session. Needed to finalize enrichment field mapping.',
      type: 'question',
      source: 'manual',
    },
    {
      external_id: 'Q-ACME-002',
      description: 'Should BigPanda handle auto-close of SNOW incidents when BigPanda incident resolves?',
      owner: 'ACME NOC Lead',
      due: 'TBD',
      status: 'open' as const,
      notes: 'Discussed in 2026-03-10 sync. ACME wants to evaluate both options.',
      type: 'question',
      source: 'manual',
    },
  ];

  for (const action of actionRows) {
    const existing = await db.select({ id: actions.id }).from(actions)
      .where(sql`${actions.project_id} = ${PROJECT_ID} AND ${actions.external_id} = ${action.external_id}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(actions).values({ project_id: PROJECT_ID, ...action });
      console.log(`  ✓ Action ${action.external_id}`);
    }
  }

  // ─── Risks ────────────────────────────────────────────────────────────────
  const riskRows = [
    {
      external_id: 'R-ACME-001',
      description: 'Biggy AI security review may extend timeline by 4–6 weeks if ACME InfoSec requests architectural changes',
      severity: 'high' as const,
      owner: 'Josh M.',
      mitigation: 'Submitted full questionnaire proactively. Pre-briefed CISO team on data handling model. Weekly follow-up cadence established.',
      status: 'open',
      last_updated: '2026-03-25',
      source: 'manual',
    },
    {
      external_id: 'R-ACME-002',
      description: 'ServiceNow integration depends on ACME SNOW admin bandwidth — currently constrained by Q2 upgrade freeze',
      severity: 'medium' as const,
      owner: 'ACME SNOW Admin — Pete W.',
      mitigation: 'Staging environment configured. Production work deferred to post-freeze (April 7). Will not block NOC onboarding.',
      status: 'open',
      last_updated: '2026-03-18',
      source: 'manual',
    },
    {
      external_id: 'R-ACME-003',
      description: 'High alert volume from legacy Nagios instance may degrade correlation quality during initial tuning',
      severity: 'medium' as const,
      owner: 'Tom R.',
      mitigation: 'Alert filter policy drafted to suppress known noisy checks. Will review with ACME NOC before enabling in production.',
      status: 'mitigated',
      last_updated: '2026-03-10',
      source: 'manual',
    },
    {
      external_id: 'R-ACME-004',
      description: 'Cloud Infrastructure team sponsor leaving ACME in May — successor not yet identified',
      severity: 'low' as const,
      owner: 'ACME VP IT Ops',
      mitigation: 'Documenting all decisions and progress. Will request warm handoff introduction before departure date.',
      status: 'monitoring',
      last_updated: '2026-03-20',
      source: 'manual',
    },
    {
      external_id: 'R-ACME-005',
      description: 'Data residency requirements may restrict Biggy AI model training data — GDPR compliance review pending',
      severity: 'critical' as const,
      owner: 'ACME Legal',
      mitigation: 'Opened compliance review with ACME Legal on 2026-03-15. Anthropic data processing agreement being reviewed.',
      status: 'open',
      last_updated: '2026-03-25',
      source: 'manual',
    },
  ];

  for (const risk of riskRows) {
    const existing = await db.select({ id: risks.id }).from(risks)
      .where(sql`${risks.project_id} = ${PROJECT_ID} AND ${risks.external_id} = ${risk.external_id}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(risks).values({ project_id: PROJECT_ID, ...risk });
      console.log(`  ✓ Risk ${risk.external_id}`);
    }
  }

  // ─── Milestones ───────────────────────────────────────────────────────────
  const milestoneRows = [
    {
      external_id: 'M-ACME-001',
      name: 'BigPanda Production Go-Live — ADR Pipeline',
      status: 'completed',
      date: '2026-03-01',
      notes: 'Alert ingestion live for NOC team. PagerDuty + Dynatrace + Nagios feeding production.',
      owner: 'Sarah K.',
      source: 'manual',
    },
    {
      external_id: 'M-ACME-002',
      name: 'ServiceNow Bi-Directional Integration Live',
      status: 'in_progress',
      date: '2026-04-15',
      notes: 'Staging configured. Production blocked by SNOW upgrade freeze until April 7.',
      owner: 'Sarah K.',
      source: 'manual',
    },
    {
      external_id: 'M-ACME-003',
      name: 'Biggy AI Pilot Launch — NOC Team',
      status: 'at_risk',
      date: '2026-05-01',
      notes: 'Dependent on InfoSec security review (R-ACME-001). Original target was April 15.',
      owner: 'Josh M.',
      source: 'manual',
    },
    {
      external_id: 'M-ACME-004',
      name: 'Cloud Infrastructure Team Onboarded',
      status: 'planned',
      date: '2026-06-01',
      notes: 'Second team in Phase 2. Onboarding plan to be finalized after NOC team completion.',
      owner: 'Tom R.',
      source: 'manual',
    },
    {
      external_id: 'M-ACME-005',
      name: 'PA 3.0 Full Production Go-Live',
      status: 'planned',
      date: '2026-06-30',
      notes: 'All 6 teams onboarded, Biggy AI live, ServiceNow automation operational.',
      owner: 'Josh M.',
      source: 'manual',
    },
  ];

  for (const ms of milestoneRows) {
    const existing = await db.select({ id: milestones.id }).from(milestones)
      .where(sql`${milestones.project_id} = ${PROJECT_ID} AND ${milestones.external_id} = ${ms.external_id}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(milestones).values({ project_id: PROJECT_ID, ...ms });
      console.log(`  ✓ Milestone ${ms.external_id}`);
    }
  }

  // ─── Stakeholders ─────────────────────────────────────────────────────────
  const stakeholderRows = [
    {
      name: 'Josh Miloslavsky',
      role: 'BigPanda PS Lead',
      company: 'BigPanda',
      email: 'josh.m@bigpanda.io',
      notes: 'Primary delivery contact. Leads weekly syncs and executive briefings.',
      source: 'manual',
    },
    {
      name: 'Sarah Kim',
      role: 'BigPanda Integration Engineer',
      company: 'BigPanda',
      email: 'sarah.k@bigpanda.io',
      notes: 'ADR pipeline and ServiceNow integration lead.',
      source: 'manual',
    },
    {
      name: 'Tom Rivera',
      role: 'BigPanda Solutions Architect',
      company: 'BigPanda',
      email: 'tom.r@bigpanda.io',
      notes: 'Handles correlation policy, tagging taxonomy, and Biggy AI architecture.',
      source: 'manual',
    },
    {
      name: 'Dana Lee',
      role: 'VP IT Operations',
      company: 'ACME Corp',
      email: 'dana.l@acme.com',
      notes: 'Executive sponsor. Attends bi-weekly ELT briefings. Final approver on go-live.',
      source: 'manual',
    },
    {
      name: 'Mike Torres',
      role: 'NOC Team Lead',
      company: 'ACME Corp',
      email: 'mike.t@acme.com',
      notes: 'Primary operator contact. Owns daily BigPanda operations post-go-live.',
      source: 'manual',
    },
    {
      name: 'Pete Wilson',
      role: 'ServiceNow Administrator',
      company: 'ACME Corp',
      email: 'pete.w@acme.com',
      notes: 'SNOW admin responsible for webhook configuration and integration setup.',
      source: 'manual',
    },
    {
      name: 'Rachel Green',
      role: 'InfoSec Engineer',
      company: 'ACME Corp',
      email: 'rachel.g@acme.com',
      notes: 'Owns Biggy AI security review. Primary contact for compliance/data questions.',
      source: 'manual',
    },
    {
      name: 'James Park',
      role: 'Cloud Infrastructure Team Lead',
      company: 'ACME Corp',
      email: 'james.p@acme.com',
      notes: 'Will sponsor Phase 2 Cloud Infrastructure team onboarding. Leaving ACME in May.',
      source: 'manual',
    },
  ];

  for (const sh of stakeholderRows) {
    const existing = await db.select({ id: stakeholders.id }).from(stakeholders)
      .where(sql`${stakeholders.project_id} = ${PROJECT_ID} AND ${stakeholders.name} = ${sh.name}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(stakeholders).values({ project_id: PROJECT_ID, ...sh });
      console.log(`  ✓ Stakeholder ${sh.name}`);
    }
  }

  // ─── Engagement History ───────────────────────────────────────────────────
  const historyRows = [
    {
      date: '2026-03-25',
      content: 'Weekly sync with ACME NOC team. Reviewed correlation policy tuning progress — FP rate down from 28% to 22%. Agreed on April 4 target for webhook configuration. Biggy AI security review still in progress with InfoSec.',
      source: 'manual',
    },
    {
      date: '2026-03-18',
      content: 'ELT briefing with Dana Lee (VP IT Ops). Presented ADR go-live metrics. Dana approved Phase 2 scope expansion to include Cloud Infrastructure team. ServiceNow upgrade freeze discussed — production work pushed to April 7.',
      source: 'manual',
    },
    {
      date: '2026-03-10',
      content: 'Biggy AI design session with Tom R. and ACME NOC leads. Agreed on enrichment field mapping for incident summaries. Two open questions raised (auto-close behavior, AI summary visibility in SNOW tickets). Security questionnaire submitted to Rachel G. (InfoSec).',
      source: 'manual',
    },
    {
      date: '2026-03-01',
      content: 'ADR production go-live completed successfully. M-ACME-001 closed. PagerDuty, Dynatrace, and Nagios ingesting to BigPanda. Mike Torres (NOC Lead) confirmed team has access and received training walkthrough.',
      source: 'manual',
    },
    {
      date: '2026-02-18',
      content: 'Correlation policy workshop with ACME NOC. Defined 12 correlation rules across 4 teams. Nagios noise filter drafted (R-ACME-003 mitigation in progress). Tagging taxonomy workshop scheduled for April.',
      source: 'manual',
    },
    {
      date: '2026-01-15',
      content: 'Staging environment validated. All three alert sources (PagerDuty, Dynatrace, Nagios) confirmed ingesting to staging BigPanda. SNOW webhook tested end-to-end in staging. Ready to proceed to production.',
      source: 'manual',
    },
    {
      date: '2025-11-15',
      content: 'Project kickoff completed. Dana Lee opened session. Scope, timeline, and team assignments confirmed. Both ADR and Biggy AI tracks formally initiated. Weekly sync cadence established (Tuesdays 10am PT).',
      source: 'manual',
    },
  ];

  for (const h of historyRows) {
    const existing = await db.select({ id: engagementHistory.id }).from(engagementHistory)
      .where(sql`${engagementHistory.project_id} = ${PROJECT_ID} AND ${engagementHistory.date} = ${h.date}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(engagementHistory).values({ project_id: PROJECT_ID, ...h });
      console.log(`  ✓ History ${h.date}`);
    }
  }

  // ─── Key Decisions ────────────────────────────────────────────────────────
  const decisionRows = [
    {
      date: '2026-03-18',
      decision: 'Phase 2 scope expanded to include Cloud Infrastructure team',
      context: 'Dana Lee (VP IT Ops) approved scope expansion during ELT briefing. Cloud Infra adds 3 additional integration sources. Target onboarding completion June 2026.',
      source: 'manual',
    },
    {
      date: '2026-03-10',
      decision: 'Biggy AI enrichment fields will include: incident summary, probable cause, and suggested remediation — but NOT auto-close trigger',
      context: 'Agreed during Biggy AI design session. Auto-close will be evaluated in 90-day post-go-live review. AI summaries will be visible in SNOW tickets pending InfoSec approval.',
      source: 'manual',
    },
    {
      date: '2026-02-18',
      decision: 'Nagios noise filter will be applied before alert ingestion — suppress checks older than 5 minutes with no state change',
      context: 'Agreed during correlation policy workshop. Reduces Nagios alert volume by ~60% based on 30-day historical analysis.',
      source: 'manual',
    },
    {
      date: '2025-12-10',
      decision: 'ServiceNow integration will use bi-directional webhook sync (not polling)',
      context: 'Polling approach evaluated but rejected due to ACME SNOW API rate limits. Webhook approach provides real-time sync and avoids SNOW performance impact.',
      source: 'manual',
    },
    {
      date: '2025-11-15',
      decision: 'ADR track precedes Biggy AI track — NOC team onboarding before AI enablement',
      context: 'Agreed at kickoff. Ensures operational foundation is stable before introducing AI capabilities. Biggy AI pilot requires 60+ days of production alert data.',
      source: 'manual',
    },
  ];

  for (const d of decisionRows) {
    const existing = await db.select({ id: keyDecisions.id }).from(keyDecisions)
      .where(sql`${keyDecisions.project_id} = ${PROJECT_ID} AND ${keyDecisions.decision} = ${d.decision}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(keyDecisions).values({ project_id: PROJECT_ID, ...d });
      console.log(`  ✓ Decision: ${d.decision.substring(0, 50)}...`);
    }
  }

  // ─── Workstreams ──────────────────────────────────────────────────────────
  const workstreamRows = [
    {
      name: 'ADR — Alert Ingestion & Correlation',
      track: 'ADR',
      current_status: 'Production live. PagerDuty, Dynatrace, Nagios ingesting. Correlation policy tuning in progress (FP rate 22%, target <15%).',
      lead: 'Sarah K.',
      last_updated: '2026-03-25',
      state: 'green',
      source: 'manual',
    },
    {
      name: 'ADR — ServiceNow Integration',
      track: 'ADR',
      current_status: 'Staging complete. Production blocked by ACME SNOW upgrade freeze. Resuming April 7.',
      lead: 'Sarah K.',
      last_updated: '2026-03-18',
      state: 'yellow',
      source: 'manual',
    },
    {
      name: 'Biggy AI — Incident Intelligence Pilot',
      track: 'Biggy',
      current_status: 'Blocked pending InfoSec security review (R-ACME-001). Estimated 4-6 week delay from original April 15 target.',
      lead: 'Tom R.',
      last_updated: '2026-03-25',
      state: 'red',
      source: 'manual',
    },
    {
      name: 'Team Onboarding — NOC',
      track: 'ADR',
      current_status: 'ADR training completed. Biggy AI training on hold. Daily operations running independently.',
      lead: 'Tom R.',
      last_updated: '2026-03-20',
      state: 'green',
      source: 'manual',
    },
    {
      name: 'Team Onboarding — Cloud Infrastructure',
      track: 'ADR',
      current_status: 'Not started. Planning phase begins after NOC team fully complete (target May 2026).',
      lead: 'Sarah K.',
      last_updated: '2026-03-18',
      state: 'grey',
      source: 'manual',
    },
  ];

  for (const ws of workstreamRows) {
    const existing = await db.select({ id: workstreams.id }).from(workstreams)
      .where(sql`${workstreams.project_id} = ${PROJECT_ID} AND ${workstreams.name} = ${ws.name}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(workstreams).values({ project_id: PROJECT_ID, ...ws });
      console.log(`  ✓ Workstream: ${ws.name}`);
    }
  }

  // ─── Business Outcomes ────────────────────────────────────────────────────
  const outcomeRows = [
    {
      title: 'Reduce MTTA from 45 min to <10 min via alert correlation',
      track: 'ADR',
      description: 'Intelligent correlation reduces mean time to acknowledge by eliminating alert storms and surfacing root cause.',
      delivery_status: 'in_progress' as const,
      mapping_note: 'Baseline captured (45 min). Post-go-live MTTA at 18 min. Target not yet achieved — correlation policy tuning in progress.',
      source: 'manual',
    },
    {
      title: 'Eliminate manual SNOW ticket creation for P1/P2 incidents',
      track: 'ADR',
      description: 'Automated SNOW ticket creation from BigPanda incidents removes NOC manual step.',
      delivery_status: 'in_progress' as const,
      mapping_note: 'ServiceNow integration in staging. Manual creation still happening in production until April 15.',
      source: 'manual',
    },
    {
      title: 'AI-generated incident summaries in every P1 SNOW ticket',
      track: 'Biggy',
      description: 'Biggy AI enriches SNOW tickets with probable cause, impacted services, and suggested remediation.',
      delivery_status: 'planned' as const,
      mapping_note: 'Blocked by InfoSec security review (R-ACME-001). Design finalized.',
      source: 'manual',
    },
    {
      title: 'Reduce NOC escalations to Tier 3 by 40%',
      track: 'Biggy',
      description: 'Biggy AI provides guided remediation steps that empower Tier 1/2 to resolve more incidents independently.',
      delivery_status: 'planned' as const,
      mapping_note: 'Baseline: 34% of NOC incidents escalate to Tier 3. Target: <20%.',
      source: 'manual',
    },
  ];

  for (const outcome of outcomeRows) {
    const existing = await db.select({ id: businessOutcomes.id }).from(businessOutcomes)
      .where(sql`${businessOutcomes.project_id} = ${PROJECT_ID} AND ${businessOutcomes.title} = ${outcome.title}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(businessOutcomes).values({ project_id: PROJECT_ID, ...outcome });
      console.log(`  ✓ Outcome: ${outcome.title.substring(0, 50)}`);
    }
  }

  // ─── Team Onboarding Status ───────────────────────────────────────────────
  const teamRows = [
    {
      team_name: 'NOC Team',
      track: 'ADR',
      ingest_status: 'live' as const,
      correlation_status: 'in_progress' as const,
      incident_intelligence_status: 'planned' as const,
      sn_automation_status: 'in_progress' as const,
      biggy_ai_status: 'planned' as const,
      source: 'manual',
    },
    {
      team_name: 'Cloud Infrastructure',
      track: 'ADR',
      ingest_status: 'planned' as const,
      correlation_status: 'planned' as const,
      incident_intelligence_status: 'planned' as const,
      sn_automation_status: 'planned' as const,
      biggy_ai_status: 'planned' as const,
      source: 'manual',
    },
    {
      team_name: 'Application Delivery',
      track: 'ADR',
      ingest_status: 'planned' as const,
      correlation_status: 'planned' as const,
      incident_intelligence_status: 'planned' as const,
      sn_automation_status: 'planned' as const,
      biggy_ai_status: 'planned' as const,
      source: 'manual',
    },
    {
      team_name: 'Security Operations (SOC)',
      track: 'Biggy',
      ingest_status: 'planned' as const,
      correlation_status: 'planned' as const,
      incident_intelligence_status: 'planned' as const,
      sn_automation_status: 'planned' as const,
      biggy_ai_status: 'planned' as const,
      source: 'manual',
    },
  ];

  for (const team of teamRows) {
    const existing = await db.select({ id: teamOnboardingStatus.id }).from(teamOnboardingStatus)
      .where(sql`${teamOnboardingStatus.project_id} = ${PROJECT_ID} AND ${teamOnboardingStatus.team_name} = ${team.team_name}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(teamOnboardingStatus).values({ project_id: PROJECT_ID, ...team });
      console.log(`  ✓ Team: ${team.team_name}`);
    }
  }

  // ─── Architecture Integrations ────────────────────────────────────────────
  const archRows = [
    // ADR track
    { tool_name: 'PagerDuty', track: 'ADR', phase: 'Phase 1', status: 'live' as const, integration_method: 'REST API v2', notes: 'Primary alerting source. ~8,000 alerts/day.', source: 'manual' },
    { tool_name: 'Dynatrace', track: 'ADR', phase: 'Phase 1', status: 'live' as const, integration_method: 'Webhook + API', notes: 'APM alerts and infrastructure anomaly detection.', source: 'manual' },
    { tool_name: 'Nagios', track: 'ADR', phase: 'Phase 1', status: 'live' as const, integration_method: 'SNMP Trap + REST', notes: 'Legacy monitoring. Noise filter policy applied.', source: 'manual' },
    { tool_name: 'ServiceNow', track: 'ADR', phase: 'Phase 1', status: 'in_progress' as const, integration_method: 'Bi-directional Webhook', notes: 'Staging validated. Production delayed to April 7 (SNOW upgrade freeze).', source: 'manual' },
    { tool_name: 'Splunk', track: 'ADR', phase: 'Phase 2', status: 'planned' as const, integration_method: 'REST API', notes: 'Cloud Infrastructure team scope. Starts Phase 2.', source: 'manual' },
    { tool_name: 'AWS CloudWatch', track: 'ADR', phase: 'Phase 2', status: 'planned' as const, integration_method: 'AWS EventBridge', notes: 'Cloud Infrastructure team AWS monitoring.', source: 'manual' },
    // Biggy track
    { tool_name: 'Biggy AI — Incident Intelligence', track: 'Biggy', phase: 'Phase 1', status: 'planned' as const, integration_method: 'BigPanda Native', notes: 'Blocked by InfoSec security review. Design complete.', source: 'manual' },
    { tool_name: 'Biggy AI — SNOW Enrichment', track: 'Biggy', phase: 'Phase 1', status: 'planned' as const, integration_method: 'SNOW Table API', notes: 'Will inject AI summaries into SNOW P1/P2 tickets.', source: 'manual' },
  ];

  for (const arch of archRows) {
    const existing = await db.select({ id: architectureIntegrations.id }).from(architectureIntegrations)
      .where(sql`${architectureIntegrations.project_id} = ${PROJECT_ID} AND ${architectureIntegrations.tool_name} = ${arch.tool_name} AND ${architectureIntegrations.track} = ${arch.track}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(architectureIntegrations).values({ project_id: PROJECT_ID, ...arch });
      console.log(`  ✓ Arch: ${arch.tool_name} (${arch.track})`);
    }
  }

  // ─── E2E Workflows ────────────────────────────────────────────────────────
  const workflow1 = await (async () => {
    const existing = await db.select({ id: e2eWorkflows.id }).from(e2eWorkflows)
      .where(sql`${e2eWorkflows.project_id} = ${PROJECT_ID} AND ${e2eWorkflows.workflow_name} = ${'P1 Incident — Alert to Resolution'}`)
      .limit(1);
    if (existing.length > 0) return existing[0].id;
    const [row] = await db.insert(e2eWorkflows).values({
      project_id: PROJECT_ID,
      team_name: 'NOC Team',
      workflow_name: 'P1 Incident — Alert to Resolution',
      source: 'manual',
    }).returning({ id: e2eWorkflows.id });
    console.log('  ✓ Workflow: P1 Incident — Alert to Resolution');
    return row.id;
  })();

  const wf1Steps = [
    { label: 'PagerDuty fires P1 alert', track: 'ADR', status: 'live', position: 1 },
    { label: 'BigPanda correlates with Dynatrace + Nagios', track: 'ADR', status: 'live', position: 2 },
    { label: 'Incident created in BigPanda with context', track: 'ADR', status: 'live', position: 3 },
    { label: 'SNOW P1 ticket auto-created (webhook)', track: 'ADR', status: 'in_progress', position: 4 },
    { label: 'Biggy AI enriches SNOW ticket', track: 'Biggy', status: 'planned', position: 5 },
    { label: 'NOC resolves via guided remediation', track: 'Biggy', status: 'planned', position: 6 },
    { label: 'BigPanda + SNOW auto-close on resolution', track: 'ADR', status: 'planned', position: 7 },
  ];
  for (const step of wf1Steps) {
    const existing = await db.select({ id: workflowSteps.id }).from(workflowSteps)
      .where(sql`${workflowSteps.workflow_id} = ${workflow1} AND ${workflowSteps.label} = ${step.label}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(workflowSteps).values({ workflow_id: workflow1, ...step });
    }
  }

  const workflow2 = await (async () => {
    const existing = await db.select({ id: e2eWorkflows.id }).from(e2eWorkflows)
      .where(sql`${e2eWorkflows.project_id} = ${PROJECT_ID} AND ${e2eWorkflows.workflow_name} = ${'Cloud Infrastructure Alert Handling'}`)
      .limit(1);
    if (existing.length > 0) return existing[0].id;
    const [row] = await db.insert(e2eWorkflows).values({
      project_id: PROJECT_ID,
      team_name: 'Cloud Infrastructure',
      workflow_name: 'Cloud Infrastructure Alert Handling',
      source: 'manual',
    }).returning({ id: e2eWorkflows.id });
    console.log('  ✓ Workflow: Cloud Infrastructure Alert Handling');
    return row.id;
  })();

  const wf2Steps = [
    { label: 'AWS CloudWatch / Splunk fire alert', track: 'ADR', status: 'planned', position: 1 },
    { label: 'BigPanda ingests and correlates', track: 'ADR', status: 'planned', position: 2 },
    { label: 'SNOW ticket created with cloud context', track: 'ADR', status: 'planned', position: 3 },
    { label: 'Biggy AI identifies blast radius', track: 'Biggy', status: 'planned', position: 4 },
    { label: 'Cloud Infra team resolves and closes', track: 'ADR', status: 'planned', position: 5 },
  ];
  for (const step of wf2Steps) {
    const existing = await db.select({ id: workflowSteps.id }).from(workflowSteps)
      .where(sql`${workflowSteps.workflow_id} = ${workflow2} AND ${workflowSteps.label} = ${step.label}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(workflowSteps).values({ workflow_id: workflow2, ...step });
    }
  }
  console.log('  ✓ Workflow steps inserted');

  // ─── Focus Areas ──────────────────────────────────────────────────────────
  const focusRows = [
    {
      title: 'Correlation Quality — Reduce False Positive Rate to <15%',
      tracks: 'ADR',
      why_it_matters: 'High FP rate (currently 22%) causes alert fatigue and undermines NOC team confidence in BigPanda. This is the #1 adoption blocker.',
      current_status: 'Policy tuning session scheduled for March 28. Nagios noise filter deployed. FP rate down from 28% to 22%.',
      next_step: 'Complete correlation policy session with NOC team on March 28. Target FP <15% by April 15.',
      bp_owner: 'Tom R.',
      customer_owner: 'Mike Torres (NOC Lead)',
      source: 'manual',
    },
    {
      title: 'Unblock Biggy AI — Drive InfoSec Security Review to Completion',
      tracks: 'Biggy',
      why_it_matters: 'Biggy AI is ACME\'s primary value driver. 6-week delay has downstream impact on M-ACME-003 and the June go-live milestone.',
      current_status: 'Security questionnaire submitted. Rachel G. (InfoSec) confirmed review in progress. Weekly follow-up established.',
      next_step: 'Follow up with Rachel G. on April 1. If no update, escalate to Dana Lee (VP IT Ops).',
      bp_owner: 'Josh M.',
      customer_owner: 'Rachel Green (InfoSec)',
      source: 'manual',
    },
    {
      title: 'ServiceNow Production Integration — Complete by April 15',
      tracks: 'ADR',
      why_it_matters: 'Manual SNOW ticket creation is the last major friction point for NOC team. Auto-creation is a key outcome deliverable.',
      current_status: 'Staging validated. Blocked by ACME SNOW upgrade freeze (ends April 7). Production work scheduled for April 8-11.',
      next_step: 'Confirm SNOW freeze lift date with Pete Wilson on April 5. Execute production webhook configuration April 8.',
      bp_owner: 'Sarah K.',
      customer_owner: 'Pete Wilson (SNOW Admin)',
      source: 'manual',
    },
  ];

  for (const fa of focusRows) {
    const existing = await db.select({ id: focusAreas.id }).from(focusAreas)
      .where(sql`${focusAreas.project_id} = ${PROJECT_ID} AND ${focusAreas.title} = ${fa.title}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(focusAreas).values({ project_id: PROJECT_ID, ...fa });
      console.log(`  ✓ Focus Area: ${fa.title.substring(0, 50)}`);
    }
  }

  // ─── Onboarding Phases ────────────────────────────────────────────────────
  const phase1Id = await (async () => {
    const existing = await db.select({ id: onboardingPhases.id }).from(onboardingPhases)
      .where(sql`${onboardingPhases.project_id} = ${PROJECT_ID} AND ${onboardingPhases.name} = ${'Phase 1 — ADR Foundation & NOC Onboarding'}`)
      .limit(1);
    if (existing.length > 0) return existing[0].id;
    const [row] = await db.insert(onboardingPhases).values({
      project_id: PROJECT_ID,
      name: 'Phase 1 — ADR Foundation & NOC Onboarding',
      display_order: 1,
    }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 1');
    return row.id;
  })();

  const phase2Id = await (async () => {
    const existing = await db.select({ id: onboardingPhases.id }).from(onboardingPhases)
      .where(sql`${onboardingPhases.project_id} = ${PROJECT_ID} AND ${onboardingPhases.name} = ${'Phase 2 — Biggy AI & Cloud Infra Expansion'}`)
      .limit(1);
    if (existing.length > 0) return existing[0].id;
    const [row] = await db.insert(onboardingPhases).values({
      project_id: PROJECT_ID,
      name: 'Phase 2 — Biggy AI & Cloud Infra Expansion',
      display_order: 2,
    }).returning({ id: onboardingPhases.id });
    console.log('  ✓ Onboarding Phase 2');
    return row.id;
  })();

  const stepRows = [
    // Phase 1
    { phase_id: phase1Id, name: 'Alert Sources Connected (PagerDuty, Dynatrace, Nagios)', status: 'complete' as const, owner: 'Sarah K.', display_order: 1, dependencies: [] as string[], updates: [{ date: '2026-03-01', note: 'All three sources live in production.' }] },
    { phase_id: phase1Id, name: 'Correlation Policy Baseline Configured', status: 'in-progress' as const, owner: 'Tom R.', display_order: 2, dependencies: ['Alert Sources Connected (PagerDuty, Dynatrace, Nagios)'], updates: [{ date: '2026-03-25', note: 'FP rate at 22%. Tuning session March 28.' }] },
    { phase_id: phase1Id, name: 'NOC Team Training Complete', status: 'complete' as const, owner: 'Tom R.', display_order: 3, dependencies: [] as string[], updates: [{ date: '2026-03-05', note: 'Training session completed with 8 NOC operators.' }] },
    { phase_id: phase1Id, name: 'ServiceNow Integration Live', status: 'in-progress' as const, owner: 'Sarah K.', display_order: 4, dependencies: ['Alert Sources Connected (PagerDuty, Dynatrace, Nagios)'], updates: [{ date: '2026-03-18', note: 'Staging done. Production delayed to April 7.' }] },
    // Phase 2
    { phase_id: phase2Id, name: 'Biggy AI InfoSec Approval Received', status: 'blocked' as const, owner: 'Josh M.', display_order: 1, dependencies: [] as string[], updates: [{ date: '2026-03-25', note: 'Security questionnaire under review by Rachel G.' }] },
    { phase_id: phase2Id, name: 'Biggy AI Pilot — NOC Team', status: 'not-started' as const, owner: 'Tom R.', display_order: 2, dependencies: ['Biggy AI InfoSec Approval Received'], updates: [] },
    { phase_id: phase2Id, name: 'Cloud Infrastructure Team Onboarding', status: 'not-started' as const, owner: 'Sarah K.', display_order: 3, dependencies: ['ServiceNow Integration Live'], updates: [] },
  ];

  for (const step of stepRows) {
    const existing = await db.select({ id: onboardingSteps.id }).from(onboardingSteps)
      .where(sql`${onboardingSteps.project_id} = ${PROJECT_ID} AND ${onboardingSteps.phase_id} = ${step.phase_id} AND ${onboardingSteps.name} = ${step.name}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(onboardingSteps).values({
        project_id: PROJECT_ID,
        phase_id: step.phase_id,
        name: step.name,
        status: step.status,
        owner: step.owner,
        display_order: step.display_order,
        dependencies: step.dependencies,
        updates: step.updates,
      });
      console.log(`  ✓ Step: ${step.name.substring(0, 50)}`);
    }
  }

  // ─── Integrations ─────────────────────────────────────────────────────────
  const integrationRows = [
    { tool: 'PagerDuty', category: 'Alerting', status: 'production' as const, color: '#06B6D4', notes: 'Live. ~8,000 alerts/day.', display_order: 1 },
    { tool: 'Dynatrace', category: 'APM', status: 'production' as const, color: '#8B5CF6', notes: 'Live. APM + infra anomaly detection.', display_order: 2 },
    { tool: 'Nagios', category: 'Infrastructure Monitoring', status: 'production' as const, color: '#EF4444', notes: 'Live with noise filter. Legacy system.', display_order: 3 },
    { tool: 'ServiceNow', category: 'ITSM', status: 'configured' as const, color: '#10B981', notes: 'Staging validated. Production April 15.', display_order: 4 },
    { tool: 'Splunk', category: 'SIEM / Log Management', status: 'not-connected' as const, color: '#F59E0B', notes: 'Phase 2 — Cloud Infrastructure team.', display_order: 5 },
    { tool: 'AWS CloudWatch', category: 'Cloud Monitoring', status: 'not-connected' as const, color: '#FF9900', notes: 'Phase 2 — Cloud Infrastructure team.', display_order: 6 },
    { tool: 'Biggy AI', category: 'AI Incident Intelligence', status: 'not-connected' as const, color: '#6366F1', notes: 'Phase 2 — Pending InfoSec approval.', display_order: 7 },
  ];

  for (const integ of integrationRows) {
    const existing = await db.select({ id: integrations.id }).from(integrations)
      .where(sql`${integrations.project_id} = ${PROJECT_ID} AND ${integrations.tool} = ${integ.tool}`)
      .limit(1);
    if (existing.length === 0) {
      await db.insert(integrations).values({ project_id: PROJECT_ID, ...integ });
      console.log(`  ✓ Integration: ${integ.tool}`);
    }
  }

  console.log('\n✅ ACME Corp seed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
