import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, gte, lte, isNull } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import db from '@/db'
import { timeEntries } from '@/db/schema'
import { writeAuditLog } from '@/lib/audit'

const SubmitSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'week_start must be YYYY-MM-DD'),
  submitted_by: z.string().optional(),
})

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * POST /api/projects/[projectId]/time-entries/submit
 *
 * Submits all draft time entries for a given week for approval.
 * Body: { week_start: YYYY-MM-DD, submitted_by?: string }
 * Returns: { submitted_count: N, entries: [...] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { week_start, submitted_by } = parsed.data
  const week_end = addDays(week_start, 6)
  const submittedByValue = submitted_by ?? 'user'
  const now = new Date()

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      // Fetch all draft entries for the specified week
      const draftEntries = await tx
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.project_id, numericId),
            gte(timeEntries.date, week_start),
            lte(timeEntries.date, week_end),
            isNull(timeEntries.submitted_on)
          )
        )

      if (draftEntries.length === 0) {
        return null
      }

      const ids = draftEntries.map((e) => e.id)

      // Batch-update all matching draft entries
      const updated: typeof draftEntries = []
      for (const id of ids) {
        const [entry] = await tx
          .update(timeEntries)
          .set({
            submitted_on: now,
            submitted_by: submittedByValue,
            updated_at: now,
          })
          .where(eq(timeEntries.id, id))
          .returning()
        updated.push(entry)
      }

      return { before: draftEntries, after: updated }
    })

    if (!result) {
      return NextResponse.json(
        { error: 'No draft entries found for this week' },
        { status: 400 }
      )
    }

    await writeAuditLog({
      entityType: 'time_entry_batch',
      entityId: null,
      action: 'create',
      actorId: submittedByValue,
      beforeJson: {
        week_start,
        week_end,
        project_id: numericId,
        entry_ids: result.before.map((e) => e.id),
        status: 'draft',
      },
      afterJson: {
        week_start,
        week_end,
        project_id: numericId,
        entry_ids: result.after.map((e) => e.id),
        submitted_by: submittedByValue,
        status: 'submitted',
      },
    })

    return NextResponse.json({
      submitted_count: result.after.length,
      entries: result.after,
    })
  } catch (err) {
    console.error('POST time-entries/submit error:', err)
    return NextResponse.json({ error: 'Failed to submit time entries' }, { status: 500 })
  }
}
