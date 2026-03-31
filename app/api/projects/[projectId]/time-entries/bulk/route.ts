import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, inArray, sql } from 'drizzle-orm'
import db from '@/db'
import { timeEntries } from '@/db/schema'
import { canEdit, isLocked, getEntryStatus } from '@/lib/time-tracking'
import { writeAuditLog } from '@/lib/audit'
import { buildApprovalNotification } from '@/lib/time-tracking-notifications'
import { requireSession } from "@/lib/auth-server";

// ─── Request schema ────────────────────────────────────────────────────────────

const BulkSchema = z.object({
  action: z.enum(['approve', 'reject', 'move', 'delete']),
  entry_ids: z.array(z.number()).min(1).max(100),
  // action-specific fields:
  approved_by: z.string().optional(),      // for approve
  rejected_by: z.string().optional(),      // for reject
  reason: z.string().optional(),           // for reject (required if action=reject)
  target_project_id: z.number().optional(), // for move (required if action=move)
})

/**
 * POST /api/projects/[projectId]/time-entries/bulk
 *
 * Bulk approve / reject / move / delete time entries.
 * Ineligible entries are skipped gracefully; the response reports processed+skipped counts.
 * Role guard: callers should only call this when role=approver or role=admin (enforced by UI).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params
  const numericProjectId = parseInt(projectId, 10)

  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = BulkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { action, entry_ids } = parsed.data

  // ─── Validate action-specific required fields ──────────────────────────────
  if (action === 'reject' && !parsed.data.reason?.trim()) {
    return NextResponse.json({ error: 'reason is required for bulk reject' }, { status: 400 })
  }
  if (action === 'move' && parsed.data.target_project_id == null) {
    return NextResponse.json({ error: 'target_project_id is required for bulk move' }, { status: 400 })
  }

  const now = new Date()

  try {
    switch (action) {
      // ─── APPROVE ────────────────────────────────────────────────────────────
      case 'approve': {
        const approvedBy = parsed.data.approved_by ?? 'approver'

        // Fetch lock_after_approval from config (graceful fallback)
        let lockAfterApproval = false
        try {
          const configResult = await db.execute(
            sql`SELECT lock_after_approval FROM time_tracking_config WHERE id = 1 LIMIT 1`
          )
          if (configResult.rows && configResult.rows.length > 0) {
            lockAfterApproval = Boolean(
              (configResult.rows[0] as Record<string, unknown>).lock_after_approval
            )
          }
        } catch {
          // time_tracking_config not yet created — default false
        }

        const updatedEntries = await db.transaction(async (tx) => {
          await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

          // Fetch all requested entries for this project
          const candidates = await tx
            .select()
            .from(timeEntries)
            .where(
              and(
                eq(timeEntries.project_id, numericProjectId),
                inArray(timeEntries.id, entry_ids)
              )
            )

          // Filter to only submitted entries (skip others gracefully)
          const eligible = candidates.filter((e) => getEntryStatus(e) === 'submitted')
          if (eligible.length === 0) return []

          const eligibleIds = eligible.map((e) => e.id)

          const updated = await tx
            .update(timeEntries)
            .set({
              approved_on: now,
              approved_by: approvedBy,
              locked: lockAfterApproval,
              updated_at: now,
            })
            .where(
              and(
                eq(timeEntries.project_id, numericProjectId),
                inArray(timeEntries.id, eligibleIds)
              )
            )
            .returning()

          return updated
        })

        // Write audit log for the batch
        await writeAuditLog({
          entityType: 'time_entry_batch',
          entityId: null,
          action: 'update',
          actorId: approvedBy,
          beforeJson: { ids: entry_ids, action: 'approve' },
          afterJson: { processed_ids: updatedEntries.map((e) => e.id) },
        })

        // Dispatch per-entry approval notifications (best-effort — errors do not roll back approval)
        for (const entry of updatedEntries) {
          await buildApprovalNotification(entry, approvedBy).catch((err) =>
            console.error('[bulk/approve] notification failed for entry', entry.id, err)
          )
        }

        return NextResponse.json({
          processed: updatedEntries.length,
          skipped: entry_ids.length - updatedEntries.length,
        })
      }

      // ─── REJECT ─────────────────────────────────────────────────────────────
      case 'reject': {
        const rejectedBy = parsed.data.rejected_by ?? 'approver'
        const reason = parsed.data.reason!

        const updatedEntries = await db.transaction(async (tx) => {
          await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

          const candidates = await tx
            .select()
            .from(timeEntries)
            .where(
              and(
                eq(timeEntries.project_id, numericProjectId),
                inArray(timeEntries.id, entry_ids)
              )
            )

          // Filter to only submitted entries
          const eligible = candidates.filter((e) => getEntryStatus(e) === 'submitted')
          if (eligible.length === 0) return []

          // Reject each eligible entry individually to update description per-entry
          const results = []
          for (const entry of eligible) {
            const updatedDescription = `${entry.description} [Rejected: ${reason}]`
            const [updated] = await tx
              .update(timeEntries)
              .set({
                rejected_on: now,
                rejected_by: rejectedBy,
                description: updatedDescription,
                updated_at: now,
              })
              .where(eq(timeEntries.id, entry.id))
              .returning()
            results.push(updated)
          }

          return results
        })

        await writeAuditLog({
          entityType: 'time_entry_batch',
          entityId: null,
          action: 'update',
          actorId: rejectedBy,
          beforeJson: { ids: entry_ids, action: 'reject', reason },
          afterJson: { processed_ids: updatedEntries.map((e) => e.id) },
        })

        return NextResponse.json({
          processed: updatedEntries.length,
          skipped: entry_ids.length - updatedEntries.length,
        })
      }

      // ─── MOVE ───────────────────────────────────────────────────────────────
      case 'move': {
        const targetProjectId = parsed.data.target_project_id!

        const updatedEntries = await db.transaction(async (tx) => {
          await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

          const candidates = await tx
            .select()
            .from(timeEntries)
            .where(
              and(
                eq(timeEntries.project_id, numericProjectId),
                inArray(timeEntries.id, entry_ids)
              )
            )

          // Only canEdit entries (draft or rejected) — cannot move submitted/approved/locked
          const eligible = candidates.filter((e) => canEdit(e))
          if (eligible.length === 0) return []

          const eligibleIds = eligible.map((e) => e.id)

          const updated = await tx
            .update(timeEntries)
            .set({
              project_id: targetProjectId,
              updated_at: now,
            })
            .where(
              and(
                eq(timeEntries.project_id, numericProjectId),
                inArray(timeEntries.id, eligibleIds)
              )
            )
            .returning()

          return updated
        })

        await writeAuditLog({
          entityType: 'time_entry_batch',
          entityId: null,
          action: 'update',
          actorId: 'approver',
          beforeJson: { ids: entry_ids, action: 'move', source_project_id: numericProjectId },
          afterJson: { processed_ids: updatedEntries.map((e) => e.id), target_project_id: targetProjectId },
        })

        return NextResponse.json({
          processed: updatedEntries.length,
          skipped: entry_ids.length - updatedEntries.length,
        })
      }

      // ─── DELETE ─────────────────────────────────────────────────────────────
      case 'delete': {
        const deletedEntries = await db.transaction(async (tx) => {
          await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

          const candidates = await tx
            .select()
            .from(timeEntries)
            .where(
              and(
                eq(timeEntries.project_id, numericProjectId),
                inArray(timeEntries.id, entry_ids)
              )
            )

          // Skip locked entries — cannot delete without unlock
          const eligible = candidates.filter((e) => !isLocked(e))
          if (eligible.length === 0) return []

          const eligibleIds = eligible.map((e) => e.id)

          await tx
            .delete(timeEntries)
            .where(
              and(
                eq(timeEntries.project_id, numericProjectId),
                inArray(timeEntries.id, eligibleIds)
              )
            )

          return eligible
        })

        // Write audit log for the bulk delete
        await writeAuditLog({
          entityType: 'time_entry_batch',
          entityId: null,
          action: 'delete',
          actorId: 'approver',
          beforeJson: { ids: deletedEntries.map((e) => e.id) },
          afterJson: null,
        })

        return NextResponse.json({
          deleted: deletedEntries.length,
          skipped: entry_ids.length - deletedEntries.length,
        })
      }
    }
  } catch (err) {
    console.error('[bulk] error:', err)
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 })
  }
}
