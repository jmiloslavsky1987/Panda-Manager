import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '../../../db'
import { stakeholders, auditLog } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { requireSession } from "@/lib/auth-server";

const postSchema = z.object({
  project_id: z.number(),
  name: z.string().min(1, 'Name is required'),
  role: z.string().optional(),
  company: z.string().optional(),
  email: z.string().optional(),
  slack_id: z.string().optional(),
  notes: z.string().optional(),
  source: z.string(),
})

export async function GET(request: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const projectId = parseInt(request.nextUrl.searchParams.get('project_id') ?? '', 10)
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  try {
    const rows = await db
      .select({ id: stakeholders.id, name: stakeholders.name, role: stakeholders.role, email: stakeholders.email })
      .from(stakeholders)
      .where(eq(stakeholders.project_id, projectId))

    return NextResponse.json(rows)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { session, redirectResponse } = await requireSession();
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

  const { project_id, name, role, company, email, slack_id, notes, source } = parsed.data

  try {
    let insertedRow: typeof stakeholders.$inferSelect | undefined
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(stakeholders)
        .values({
          project_id,
          name,
          role: role ?? null,
          company: company ?? null,
          email: email ?? null,
          slack_id: slack_id ?? null,
          notes: notes ?? null,
          source,
        })
        .returning()
      await tx.insert(auditLog).values({
        entity_type: 'stakeholder',
        entity_id: row.id,
        action: 'create',
        actor_id: 'default',
        before_json: null,
        after_json: row as Record<string, unknown>,
      })
      insertedRow = row
    })
    return NextResponse.json(insertedRow!, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Insert failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
