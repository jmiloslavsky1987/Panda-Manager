import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { weeklyReportNotes } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'
import { z } from 'zod'

const schema = z.object({
  project_id: z.number().int(),
  week_of: z.string().min(1),
  notes: z.string(),
})

export async function POST(req: NextRequest) {
  const { redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { project_id, week_of, notes } = parsed.data

  await db
    .insert(weeklyReportNotes)
    .values({ project_id, week_of, notes })
    .onConflictDoUpdate({
      target: [weeklyReportNotes.project_id, weeklyReportNotes.week_of],
      set: { notes, updated_at: sql`now()` },
    })

  return NextResponse.json({ ok: true })
}
