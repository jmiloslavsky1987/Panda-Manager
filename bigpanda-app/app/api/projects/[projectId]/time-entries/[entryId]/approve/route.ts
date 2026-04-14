import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import db from '@/db'
import { timeEntries } from '@/db/schema'
import { getEntryStatus } from '@/lib/time-tracking'
import { writeAuditLog } from '@/lib/audit'
import { buildApprovalNotification } from '@/lib/time-tracking-notifications'
import { requireProjectRole } from "@/lib/auth-server";

const ApproveSchema = z.object({
  approved_by: z.string().optional(),
})

/**
 * POST /api/projects/[projectId]/time-entries/[entryId]/approve
 *
 * Approves a single submitted time entry.
 * Body: { approved_by?: string }
 * - Sets approved_on=NOW(), approved_by
 * - Sets locked=true if lock_after_approval is configured
 * Returns updated entry.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  const { projectId, entryId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericEntryId = parseInt(entryId, 10)
  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { session, redirectResponse } = await requireProjectRole(numericProjectId, 'user');
  if (redirectResponse) return redirectResponse;

  if (isNaN(numericProjectId) || isNaN(numericEntryId)) {
    return NextResponse.json({ error: 'Invalid projectId or entryId' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json().catch(() => ({}))
  } catch {
    body = {}
  }

  const parsed = ApproveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const approvedBy = parsed.data.approved_by ?? 'approver'
  const now = new Date()

  try {
    // Fetch lock_after_approval from time_tracking_config (id=1).
    // Defaults to false if the table doesn't exist yet (plan 23-02 not yet run).
    let lockAfterApproval = false
    try {
      const configResult = await db.execute(
        sql`SELECT lock_after_approval FROM time_tracking_config WHERE id = 1 LIMIT 1`
      )
      const rows = configResult as unknown as Array<Record<string, unknown>>
      if (rows && rows.length > 0) {
        lockAfterApproval = Boolean(rows[0].lock_after_approval)
      }
    } catch {
      // time_tracking_config table not yet created — use default false
    }

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
          error: `Entry is in '${status}' status; only 'submitted' entries can be approved`,
          status: 409,
        }
      }

      // Apply approval
      const [updated] = await tx
        .update(timeEntries)
        .set({
          approved_on: now,
          approved_by: approvedBy,
          locked: lockAfterApproval,
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
      actorId: approvedBy,
      beforeJson: result.before as Record<string, unknown>,
      afterJson: result.entry as Record<string, unknown>,
    })

    // TTADV-19: notify user that their entry was approved
    await buildApprovalNotification(result.entry, approvedBy).catch((err) => {
      console.error('[approve] notification write failed (non-fatal):', err)
    })

    return NextResponse.json(result.entry)
  } catch (err) {
    console.error('POST time-entries/approve error:', err)
    return NextResponse.json({ error: 'Failed to approve time entry' }, { status: 500 })
  }
}
