import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import db from '@/db'
import { timeEntries } from '@/db/schema'
import { getEntryStatus } from '@/lib/time-tracking'
import { writeAuditLog } from '@/lib/audit'
import { buildRejectionNotification } from '@/lib/time-tracking-notifications'

const RejectSchema = z.object({
  rejected_by: z.string().optional(),
  reason: z.string().min(1, 'Rejection reason is required (TTADV-08)'),
})

/**
 * POST /api/projects/[projectId]/time-entries/[entryId]/reject
 *
 * Rejects a single submitted time entry with a mandatory reason.
 * Body: { rejected_by?: string, reason: string }
 * - Sets rejected_on=NOW(), rejected_by
 * - Appends [Rejected: reason] to the entry description
 * - Does NOT lock — rejected entries return to editable/resubmittable state
 * Returns updated entry.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  const { projectId, entryId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericEntryId = parseInt(entryId, 10)

  if (isNaN(numericProjectId) || isNaN(numericEntryId)) {
    return NextResponse.json({ error: 'Invalid projectId or entryId' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = RejectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { reason, rejected_by } = parsed.data
  const rejectedBy = rejected_by ?? 'approver'
  const now = new Date()

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      // Fetch the entry to validate status
      const [entry] = await tx
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.id, numericEntryId))

      if (!entry) {
        return { error: 'Entry not found', status: 404 }
      }

      if (entry.project_id !== numericProjectId) {
        return { error: 'Entry does not belong to this project', status: 403 }
      }

      const status = getEntryStatus(entry)
      if (status !== 'submitted') {
        return {
          error: `Entry is in '${status}' status; only 'submitted' entries can be rejected`,
          status: 409,
        }
      }

      // Append rejection reason to description
      const updatedDescription = `${entry.description} [Rejected: ${reason}]`

      // Apply rejection — do NOT set locked (rejected entries are editable/resubmittable)
      const [updated] = await tx
        .update(timeEntries)
        .set({
          rejected_on: now,
          rejected_by: rejectedBy,
          description: updatedDescription,
          updated_at: now,
        })
        .where(eq(timeEntries.id, numericEntryId))
        .returning()

      return { entry: updated, before: entry }
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await writeAuditLog({
      entityType: 'time_entry',
      entityId: numericEntryId,
      action: 'update',
      actorId: rejectedBy,
      beforeJson: result.before as Record<string, unknown>,
      afterJson: result.entry as Record<string, unknown>,
    })

    // TTADV-19: notify user that their entry was rejected with reason
    await buildRejectionNotification(result.entry, rejectedBy, reason).catch((err) => {
      console.error('[reject] notification write failed (non-fatal):', err)
    })

    return NextResponse.json(result.entry)
  } catch (err) {
    console.error('POST time-entries/reject error:', err)
    return NextResponse.json({ error: 'Failed to reject time entry' }, { status: 500 })
  }
}
