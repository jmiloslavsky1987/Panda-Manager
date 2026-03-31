import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teamOnboardingStatus } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireSession } from "@/lib/auth-server";

const trackStatusEnum = z.enum(['live', 'in_progress', 'pilot', 'planned']).nullable().optional()

const postSchema = z.object({
  team_name: z.string().min(1),
  track: z.string().nullable().optional(),
  ingest_status: trackStatusEnum,
  correlation_status: trackStatusEnum,
  incident_intelligence_status: trackStatusEnum,
  sn_automation_status: trackStatusEnum,
  biggy_ai_status: trackStatusEnum,
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

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
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

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
    ingest_status,
    correlation_status,
    incident_intelligence_status,
    sn_automation_status,
    biggy_ai_status,
  } = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      return tx
        .insert(teamOnboardingStatus)
        .values({
          project_id: numericId,
          team_name,
          track: track ?? null,
          ingest_status: ingest_status ?? null,
          correlation_status: correlation_status ?? null,
          incident_intelligence_status: incident_intelligence_status ?? null,
          sn_automation_status: sn_automation_status ?? null,
          biggy_ai_status: biggy_ai_status ?? null,
          source: 'manual',
        })
        .returning()
    })

    return NextResponse.json({ row: result[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/team-onboarding-status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
