import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import db from '@/db'
import { timeEntries } from '@/db/schema'
import { requireProjectRole } from "@/lib/auth-server";

const TimeEntryPatchSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  hours:       z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
                 message: 'Hours must be a positive number',
               }).optional(),
  description: z.string().min(1, 'Description is required').optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' })

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  const { projectId, entryId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericEntryId   = parseInt(entryId, 10)
  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { session, redirectResponse } = await requireProjectRole(numericProjectId, 'user');
  if (redirectResponse) return redirectResponse;

  const body = await req.json()
  const parsed = TimeEntryPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    const updated = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      const rows = await tx.update(timeEntries)
        .set({ ...parsed.data, updated_at: new Date() })
        .where(and(
          eq(timeEntries.id, numericEntryId),
          eq(timeEntries.project_id, numericProjectId)
        ))
        .returning()
      return rows
    })
    if (!updated.length) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    return NextResponse.json(updated[0])
  } catch (err) {
    console.error('PATCH time-entry error:', err)
    return NextResponse.json({ error: 'Failed to update time entry' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  const { projectId, entryId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericEntryId   = parseInt(entryId, 10)
  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { session, redirectResponse } = await requireProjectRole(numericProjectId, 'user');
  if (redirectResponse) return redirectResponse;

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
      await tx.delete(timeEntries).where(
        and(
          eq(timeEntries.id, numericEntryId),
          eq(timeEntries.project_id, numericProjectId)
        )
      )
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE time-entry error:', err)
    return NextResponse.json({ error: 'Failed to delete time entry' }, { status: 500 })
  }
}
