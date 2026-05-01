import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { integrations } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireProjectRole } from "@/lib/auth-server";

const ADR_TYPES = ['Inbound', 'Outbound', 'Enrichment'] as const
const BIGGY_TYPES = ['Real-time', 'Context', 'Knowledge', 'UDC'] as const

const postSchema = z.object({
  tool: z.string().min(1, 'Tool name is required'),
  category: z.string().optional(),
  status: z.enum(['not-started', 'in-progress', 'complete', 'blocked']).optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  display_order: z.number().optional(),
  track: z.enum(['ADR', 'Biggy']).nullable().optional(),
  integration_type: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.track === 'ADR' && data.integration_type != null && !ADR_TYPES.includes(data.integration_type as any)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['integration_type'], message: 'ADR integrations must use: Inbound, Outbound, or Enrichment' })
  }
  if (data.track === 'Biggy' && data.integration_type != null && !BIGGY_TYPES.includes(data.integration_type as any)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['integration_type'], message: 'Biggy integrations must use: Real-time, Context, Knowledge, or UDC' })
  }
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      return tx
        .select()
        .from(integrations)
        .where(eq(integrations.project_id, numericId))
        .orderBy(asc(integrations.display_order))
    })

    return NextResponse.json({ integrations: result })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/integrations error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

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

  const { tool, category, status, color, notes, display_order, track, integration_type } = parsed.data

  const insertData: typeof integrations.$inferInsert = {
    project_id: numericId,
    tool,
    category: category || null,
    status: status || 'not-started',
    color: color || null,
    notes: notes || null,
    display_order: display_order ?? 0,
    track: track ?? null,
    integration_type: integration_type ?? null,
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      const [inserted] = await tx
        .insert(integrations)
        .values(insertData)
        .returning()

      return inserted
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/integrations error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
