import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import db from '@/db'
import { timeEntries, projects } from '@/db/schema'

const TimeEntryPostSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  hours: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
    message: 'Hours must be a positive number',
  }),
  description: z.string().min(1, 'Description is required'),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? ''
  const to   = searchParams.get('to')   ?? ''

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      // Get project name for CSV export
      const [project] = await tx.select({ customer: projects.customer })
        .from(projects).where(eq(projects.id, numericId))
      const projectName = project?.customer ?? ''

      // Build conditions
      const conditions = [eq(timeEntries.project_id, numericId)]
      if (from) conditions.push(gte(timeEntries.date, from))
      if (to)   conditions.push(lte(timeEntries.date, to))

      const entries = await tx.select()
        .from(timeEntries)
        .where(and(...conditions))
        .orderBy(desc(timeEntries.date))

      return { entries, projectName }
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('GET time-entries error:', err)
    return NextResponse.json({ error: 'Failed to load time entries' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)

  const body = await req.json()
  const parsed = TimeEntryPostSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    const [created] = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))
      return tx.insert(timeEntries).values({
        project_id:  numericId,
        date:        parsed.data.date,
        hours:       parsed.data.hours,
        description: parsed.data.description,
      }).returning()
    })
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('POST time-entries error:', err)
    return NextResponse.json({ error: 'Failed to create time entry' }, { status: 500 })
  }
}
