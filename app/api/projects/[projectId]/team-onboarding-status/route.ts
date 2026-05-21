import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teamOnboardingStatus, teamOnboardingStageStatus } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireProjectRole } from "@/lib/auth-server";

const trackStatusEnum = z.enum(['live', 'in_progress', 'complete', 'planned']).nullable().optional()

const onboardingStatusEnum = z.enum(['not-started', 'in-progress', 'complete', 'blocked']).optional()

// Phase 88.1 G1: per-stage status entry for the new pivot table
const stageStatusEntry = z.object({
  stage_key: z.string().min(1),
  status:    z.enum(['live', 'in_progress', 'complete', 'planned']).nullable(),
})

const postSchema = z.object({
  team_name: z.string().min(1),
  track: z.string().nullable().optional(),
  status: onboardingStatusEnum,
  // Legacy 5 fields — still accepted for backwards compat during transition
  ingest_status: trackStatusEnum,
  correlation_status: trackStatusEnum,
  incident_intelligence_status: trackStatusEnum,
  sn_automation_status: trackStatusEnum,
  biggy_ai_status: trackStatusEnum,
  // Phase 88.1 G1: new per-track stages array
  stage_status: z.array(stageStatusEntry).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      return tx
        .select()
        .from(teamOnboardingStatus)
        .where(eq(teamOnboardingStatus.project_id, numericId))
        .orderBy(asc(teamOnboardingStatus.team_name))
    })

    return NextResponse.json({ rows: result })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/team-onboarding-status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const {
    team_name,
    track,
    status,
    ingest_status,
    correlation_status,
    incident_intelligence_status,
    sn_automation_status,
    biggy_ai_status,
    stage_status,
  } = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      const inserted = await tx
        .insert(teamOnboardingStatus)
        .values({
          project_id: numericId,
          team_name,
          track: track ?? null,
          status: status ?? 'not-started',
          ingest_status: ingest_status ?? null,
          correlation_status: correlation_status ?? null,
          incident_intelligence_status: incident_intelligence_status ?? null,
          sn_automation_status: sn_automation_status ?? null,
          biggy_ai_status: biggy_ai_status ?? null,
          source: 'manual',
        })
        .returning()

      const newRow = inserted[0]
      // Phase 88.1 G1: write per-stage pivot rows when stage_status array provided
      if (stage_status && stage_status.length > 0 && newRow) {
        await tx.insert(teamOnboardingStageStatus).values(
          stage_status.map((s) => ({
            team_onboarding_id: newRow.id,
            stage_key: s.stage_key,
            status: s.status,
            source: 'manual',
          }))
        ).onConflictDoNothing()
      }

      return inserted
    })

    return NextResponse.json({ row: result[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/team-onboarding-status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
