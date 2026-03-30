import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '../../../db'
import { stakeholders, auditLog } from '../../../db/schema'

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

export async function POST(request: NextRequest) {
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
