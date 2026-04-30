import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects, onboardingPhases, onboardingSteps, wbsItems, teamEngagementSections, archTracks, archNodes, projectMembers, scheduledJobs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireSession } from "@/lib/auth-server";
import { getActiveProjects } from '@/lib/queries'
import { resolveRole } from '@/lib/auth-utils'
import { ADR_ONBOARDING_CONFIG, BIGGY_ONBOARDING_CONFIG } from '@/lib/onboarding-config'

export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  try {
    const role = resolveRole(session!);
    const activeProjects = await getActiveProjects({
      userId: session!.user.id,
      isGlobalAdmin: role === 'admin',
    });
    return NextResponse.json({ projects: activeProjects })
  } catch (err) {
    console.error('GET /api/projects error:', err)
    return NextResponse.json(
      { error: 'Failed to load projects' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const body = await req.json()
  const { name, customer, description, start_date, end_date } = body

  if (!name || !customer) {
    return NextResponse.json(
      { error: 'name and customer are required' },
      { status: 400 }
    )
  }

  // Full phase list — standard phases + live-track phases (Integrations, Teams, IT Knowledge Graph)
  const adrPhases = [
    { name: 'Discovery & Kickoff', display_order: 1 },
    { name: 'Integrations', display_order: 2 },
    { name: 'Platform Configuration', display_order: 3 },
    { name: 'Teams', display_order: 4 },
    { name: 'UAT', display_order: 5 },
    { name: 'Go-Live', display_order: 6 },
  ]

  const biggyPhases = [
    { name: 'Discovery & Kickoff', display_order: 1 },
    { name: 'IT Knowledge Graph', display_order: 2 },
    { name: 'Platform Configuration', display_order: 3 },
    { name: 'Teams', display_order: 4 },
    { name: 'Validation', display_order: 5 },
    { name: 'Go-Live', display_order: 6 },
  ]

  // Atomic transaction: project creation + phase seeding
  const result = await db.transaction(async (tx) => {
    // Insert project
    const [inserted] = await tx
      .insert(projects)
      .values({
        name: String(name),
        customer: String(customer),
        status: 'draft',
        description: description ? String(description) : null,
        start_date: start_date ? String(start_date) : null,
        end_date: end_date ? String(end_date) : null,
      })
      .returning({ id: projects.id })

    // Seed ADR phases
    await tx.insert(onboardingPhases).values(
      adrPhases.map((p) => ({
        project_id: inserted.id,
        track: 'ADR',
        name: p.name,
        display_order: p.display_order,
      }))
    )

    // Seed Biggy phases
    await tx.insert(onboardingPhases).values(
      biggyPhases.map((p) => ({
        project_id: inserted.id,
        track: 'Biggy',
        name: p.name,
        display_order: p.display_order,
      }))
    )

    // ─── Onboarding Step Seeding ──────────────────────────────────────────

    // Fetch all just-inserted phases with track so we can match by name+track
    const insertedPhases = await tx
      .select({ id: onboardingPhases.id, name: onboardingPhases.name, track: onboardingPhases.track })
      .from(onboardingPhases)
      .where(eq(onboardingPhases.project_id, inserted.id))

    async function seedSteps(config: typeof ADR_ONBOARDING_CONFIG, track: string) {
      for (const phaseConfig of config) {
        // Must match both name AND track — ADR and Biggy share phase names
        const phase = insertedPhases.find(
          p => p.name === phaseConfig.name && p.track === track
        )
        if (!phase || phaseConfig.steps.length === 0) continue
        await tx.insert(onboardingSteps).values(
          phaseConfig.steps.map((stepName, i) => ({
            phase_id: phase.id,
            project_id: inserted.id,
            name: stepName,
            display_order: i + 1,
            track,
          }))
        ).onConflictDoNothing()
      }
    }

    await seedSteps(ADR_ONBOARDING_CONFIG, 'ADR')
    await seedSteps(BIGGY_ONBOARDING_CONFIG, 'Biggy')

    // ─── WBS Template Seeding ─────────────────────────────────────────────

    // ADR WBS Level 1 seeding (10 parent items)
    const adrWbsL1 = await tx.insert(wbsItems).values([
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'Discovery & Kickoff', display_order: 1, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'Solution Design', display_order: 2, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'Alert Source Integration', display_order: 3, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'Alert Enrichment & Normalization', display_order: 4, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'Platform Configuration', display_order: 5, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'Correlation', display_order: 6, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'Routing & Escalation', display_order: 7, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'Teams & Training', display_order: 8, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'UAT & Go-Live Preparation', display_order: 9, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'ADR', name: 'Go-Live', display_order: 10, status: 'not_started' as const, source_trace: 'template' },
    ]).returning({ id: wbsItems.id, name: wbsItems.name });

    // ADR WBS Level 2 seeding (25 child items)
    const adrChildRows = [
      { parentName: 'Solution Design', children: ['Ops Shadowing / Current State', 'Future State Workflow', 'ADR Process Consulting'] },
      { parentName: 'Alert Source Integration', children: ['Outbound Integrations', 'Inbound Integrations'] },
      { parentName: 'Alert Enrichment & Normalization', children: ['Tag Documentation', 'Normalization Configuration', 'CMDB'] },
      { parentName: 'Platform Configuration', children: ['Environments', 'Incident Tags', 'Role Based Access Control', 'Incident Routing', 'Maintenance Plans', 'Single Sign-On', 'Admin / Reporting'] },
      { parentName: 'Correlation', children: ['Use Case Discovery', 'Correlation Configuration'] },
      { parentName: 'Teams & Training', children: ['User Training'] },
      { parentName: 'UAT & Go-Live Preparation', children: ['UAT', 'Documentation', 'Go-Live Prep'] },
      { parentName: 'Go-Live', children: ['Go Live', 'Post Go-Live Survey', 'Unified Analytics', 'Project Closure'] },
    ].flatMap(({ parentName, children }) => {
      const parent = adrWbsL1.find(p => p.name === parentName);
      if (!parent) return [];
      return children.map((name, i) => ({
        project_id: inserted.id,
        parent_id: parent.id,
        level: 2,
        track: 'ADR',
        name,
        display_order: i + 1,
        status: 'not_started' as const,
        source_trace: 'template',
      }));
    });

    if (adrChildRows.length > 0) {
      await tx.insert(wbsItems).values(adrChildRows);
    }

    // Biggy WBS Level 1 seeding (5 parent items)
    const biggyWbsL1 = await tx.insert(wbsItems).values([
      { project_id: inserted.id, level: 1, track: 'Biggy', name: 'Discovery & Kickoff', display_order: 1, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'Biggy', name: 'Integrations', display_order: 2, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'Biggy', name: 'Workflow', display_order: 3, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'Biggy', name: 'Teams & Training', display_order: 4, status: 'not_started' as const, source_trace: 'template' },
      { project_id: inserted.id, level: 1, track: 'Biggy', name: 'Deploy', display_order: 5, status: 'not_started' as const, source_trace: 'template' },
    ]).returning({ id: wbsItems.id, name: wbsItems.name });

    // Biggy WBS Level 2 seeding (9 child items)
    const biggyChildRows = [
      { parentName: 'Integrations', children: ['Real-Time Integrations', 'Context Integrations', 'UDC'] },
      { parentName: 'Workflow', children: ['Action Plans', 'Workflows', 'Managed Incident Channels'] },
      { parentName: 'Teams & Training', children: ['Team-Specific Workflow Enablement', 'Workflow Automations', 'Training'] },
    ].flatMap(({ parentName, children }) => {
      const parent = biggyWbsL1.find(p => p.name === parentName);
      if (!parent) return [];
      return children.map((name, i) => ({
        project_id: inserted.id,
        parent_id: parent.id,
        level: 2,
        track: 'Biggy',
        name,
        display_order: i + 1,
        status: 'not_started' as const,
        source_trace: 'template',
      }));
    });

    if (biggyChildRows.length > 0) {
      await tx.insert(wbsItems).values(biggyChildRows);
    }

    // ─── Team Engagement Sections Seeding ─────────────────────────────────

    await tx.insert(teamEngagementSections).values([
      { project_id: inserted.id, name: 'Business Outcomes', content: '', display_order: 1, source_trace: 'template' },
      { project_id: inserted.id, name: 'Architecture', content: '', display_order: 2, source_trace: 'template' },
      { project_id: inserted.id, name: 'E2E Workflows', content: '', display_order: 3, source_trace: 'template' },
      { project_id: inserted.id, name: 'Teams & Engagement', content: '', display_order: 4, source_trace: 'template' },
      { project_id: inserted.id, name: 'Top Focus Areas', content: '', display_order: 5, source_trace: 'template' },
    ]);

    // ─── Architecture Tracks & Nodes Seeding ──────────────────────────────

    // ADR Track
    const [adrTrack] = await tx.insert(archTracks).values({
      project_id: inserted.id,
      name: 'ADR Track',
      display_order: 1,
    }).returning({ id: archTracks.id });

    // Insert ADR section nodes first (capturing IDs for parent_id references)
    const [sectionAI] = await tx.insert(archNodes).values({
      track_id: adrTrack.id, project_id: inserted.id, name: 'Alert Intelligence',
      display_order: 10, status: 'planned' as const, node_type: 'section', source_trace: 'template',
    }).returning({ id: archNodes.id });

    const [sectionII] = await tx.insert(archNodes).values({
      track_id: adrTrack.id, project_id: inserted.id, name: 'Incident Intelligence',
      display_order: 20, status: 'planned' as const, node_type: 'section', source_trace: 'template',
    }).returning({ id: archNodes.id });

    const [sectionWA] = await tx.insert(archNodes).values({
      track_id: adrTrack.id, project_id: inserted.id, name: 'Workflow Automation',
      display_order: 30, status: 'planned' as const, node_type: 'section', source_trace: 'template',
    }).returning({ id: archNodes.id });

    // Insert Console node (between II and WA by display_order)
    await tx.insert(archNodes).values({
      track_id: adrTrack.id, project_id: inserted.id, name: 'Console',
      display_order: 25, status: 'planned' as const, node_type: 'console', source_trace: 'template',
    });

    // Insert all 11 sub-capability nodes with parent_id references
    await tx.insert(archNodes).values([
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionAI.id, name: 'Monitoring Integrations', display_order: 1, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionAI.id, name: 'Alert Normalization', display_order: 2, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionAI.id, name: 'Alert Enrichment', display_order: 3, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionII.id, name: 'Alert Correlation', display_order: 1, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionII.id, name: 'Incident Enrichment', display_order: 2, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionII.id, name: 'Incident Classification', display_order: 3, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionII.id, name: 'Suggested Root Cause', display_order: 4, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionWA.id, name: 'Environments', display_order: 1, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionWA.id, name: 'Automated Incident Creation', display_order: 2, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionWA.id, name: 'Automated Incident Notification', display_order: 3, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
      { track_id: adrTrack.id, project_id: inserted.id, parent_id: sectionWA.id, name: 'Automated Incident Remediation', display_order: 4, status: 'planned' as const, node_type: 'sub-capability', source_trace: 'template' },
    ]);

    // AI Assistant Track
    const [aiTrack] = await tx.insert(archTracks).values({
      project_id: inserted.id,
      name: 'AI Assistant Track',
      display_order: 2,
    }).returning({ id: archTracks.id });

    await tx.insert(archNodes).values([
      { track_id: aiTrack.id, project_id: inserted.id, name: 'Knowledge Sources', display_order: 1, status: 'planned' as const, source_trace: 'template' },
      { track_id: aiTrack.id, project_id: inserted.id, name: 'Real-Time Query', display_order: 2, status: 'planned' as const, source_trace: 'template' },
      { track_id: aiTrack.id, project_id: inserted.id, name: 'AI Capabilities', display_order: 3, status: 'planned' as const, source_trace: 'template' },
      { track_id: aiTrack.id, project_id: inserted.id, name: 'Console', display_order: 4, status: 'planned' as const, source_trace: 'template' },
      { track_id: aiTrack.id, project_id: inserted.id, name: 'Outputs & Actions', display_order: 5, status: 'planned' as const, source_trace: 'template' },
    ]);

    // Seed creator as Admin in project_members
    await tx.insert(projectMembers).values({
      project_id: inserted.id,
      user_id: session!.user.id,
      role: 'admin',
    });

    return inserted
  })

  // Auto-register weekly-focus repeatable job for new project (OVRVW-03)
  // Creates a scheduled_jobs DB row so it appears in the scheduler UI, then
  // registers the BullMQ repeatable scheduler.
  try {
    const [jobRow] = await db
      .insert(scheduledJobs)
      .values({
        name: `Weekly Focus — project ${result.id}`,
        skill_name: 'weekly-focus',
        cron_expression: '0 6 * * 1',
        enabled: true,
        project_id: result.id,
        skill_params_json: { projectId: result.id, triggeredBy: 'scheduled' },
      })
      .returning({ id: scheduledJobs.id })

    const { Queue } = await import('bullmq');
    const { createApiRedisConnection } = await import('@/worker/connection');
    const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() as any });
    await queue.upsertJobScheduler(
      `db-job-${jobRow.id}`,          // Match the ID pattern used by registerDbSchedulers
      { pattern: '0 6 * * 1' },
      {
        name: 'weekly-focus',
        data: { triggeredBy: 'scheduled', projectId: result.id, jobId: jobRow.id },
        opts: { removeOnComplete: 100, removeOnFail: 50 },
      }
    );
    await queue.close();
  } catch (queueErr) {
    console.error('[api/projects POST] Weekly-focus BullMQ registration failed (non-fatal):', queueErr);
  }

  return NextResponse.json({ project: result }, { status: 201 })
}
