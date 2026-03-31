import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { beforeState } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireSession } from "@/lib/auth-server";

const putSchema = z.object({
  aggregation_hub_name: z.string().nullable().optional(),
  alert_to_ticket_problem: z.string().nullable().optional(),
  pain_points_json: z.array(z.string()).optional(),
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
        .from(beforeState)
        .where(eq(beforeState.project_id, numericId))
        .limit(1)
    })

    return NextResponse.json({ beforeState: result[0] ?? null })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/before-state error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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

  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { aggregation_hub_name, alert_to_ticket_problem, pain_points_json } = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      // Check if a row exists for this project
      const existing = await tx
        .select()
        .from(beforeState)
        .where(eq(beforeState.project_id, numericId))
        .limit(1)

      if (existing.length > 0) {
        // UPDATE existing row
        const updateData: Partial<typeof beforeState.$inferInsert> = {}
        if (aggregation_hub_name !== undefined) updateData.aggregation_hub_name = aggregation_hub_name
        if (alert_to_ticket_problem !== undefined) updateData.alert_to_ticket_problem = alert_to_ticket_problem
        if (pain_points_json !== undefined) updateData.pain_points_json = pain_points_json

        const updated = await tx
          .update(beforeState)
          .set(updateData)
          .where(eq(beforeState.project_id, numericId))
          .returning()

        return updated[0]
      } else {
        // INSERT new row
        const inserted = await tx
          .insert(beforeState)
          .values({
            project_id: numericId,
            aggregation_hub_name: aggregation_hub_name ?? null,
            alert_to_ticket_problem: alert_to_ticket_problem ?? null,
            pain_points_json: pain_points_json ?? [],
            source: 'manual',
          })
          .returning()

        return inserted[0]
      }
    })

    return NextResponse.json({ beforeState: result })
  } catch (err) {
    console.error('PUT /api/projects/[projectId]/before-state error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
