import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { teamOnboardingStatus, auditLog } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const trackStatusEnum = z.enum(['live', 'in_progress', 'pilot', 'planned']).nullable().optional()

const patchSchema = z.object({
  team_name: z.string().min(1).optional(),
  track: z.string().nullable().optional(),
  ingest_status: trackStatusEnum,
  correlation_status: trackStatusEnum,
  incident_intelligence_status: trackStatusEnum,
  sn_automation_status: trackStatusEnum,
  biggy_ai_status: trackStatusEnum,
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericId = parseInt(id, 10)

  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const updateData: Partial<typeof teamOnboardingStatus.$inferInsert> = {}
  const {
    team_name,
    track,
    ingest_status,
    correlation_status,
    incident_intelligence_status,
    sn_automation_status,
    biggy_ai_status,
  } = parsed.data

  if (team_name !== undefined) updateData.team_name = team_name
  if (track !== undefined) updateData.track = track
  if (ingest_status !== undefined) updateData.ingest_status = ingest_status
  if (correlation_status !== undefined) updateData.correlation_status = correlation_status
  if (incident_intelligence_status !== undefined) updateData.incident_intelligence_status = incident_intelligence_status
  if (sn_automation_status !== undefined) updateData.sn_automation_status = sn_automation_status
  if (biggy_ai_status !== undefined) updateData.biggy_ai_status = biggy_ai_status

  // Read before-state for audit
  const [before] = await db.select().from(teamOnboardingStatus)
    .where(and(eq(teamOnboardingStatus.id, numericId), eq(teamOnboardingStatus.project_id, numericProjectId)))
  if (!before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      const updated = await tx
        .update(teamOnboardingStatus)
        .set(updateData)
        .where(
          and(
            eq(teamOnboardingStatus.id, numericId),
            eq(teamOnboardingStatus.project_id, numericProjectId)
          )
        )
        .returning()
      await tx.insert(auditLog).values({
        entity_type: 'team_onboarding_status',
        entity_id: numericId,
        action: 'update',
        actor_id: 'default',
        before_json: before as Record<string, unknown>,
        after_json: { ...before, ...updateData } as Record<string, unknown>,
      })
      return updated
    })

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ row: result[0] })
  } catch (err) {
    console.error('PATCH /api/projects/[projectId]/team-onboarding-status/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericId = parseInt(id, 10)

  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // Read before-state for audit
  const [beforeDelete] = await db.select().from(teamOnboardingStatus)
    .where(and(eq(teamOnboardingStatus.id, numericId), eq(teamOnboardingStatus.project_id, numericProjectId)))

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      if (beforeDelete) {
        await tx.insert(auditLog).values({
          entity_type: 'team_onboarding_status',
          entity_id: numericId,
          action: 'delete',
          actor_id: 'default',
          before_json: beforeDelete as Record<string, unknown>,
          after_json: null,
        })
      }

      await tx
        .delete(teamOnboardingStatus)
        .where(
          and(
            eq(teamOnboardingStatus.id, numericId),
            eq(teamOnboardingStatus.project_id, numericProjectId)
          )
        )
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/projects/[projectId]/team-onboarding-status/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
