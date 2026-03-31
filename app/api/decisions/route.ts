import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { keyDecisions, auditLog } from '@/db/schema'
import { requireSession } from "@/lib/auth-server";

const postSchema = z.object({
  project_id: z.number().int().positive(),
  decision: z.string().min(1, 'Decision text is required'),
  context: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { project_id, decision, context } = parsed.data
  const today = new Date().toISOString().split('T')[0]

  const [newRecord] = await db.insert(keyDecisions).values({
    project_id,
    decision: decision.trim(),
    context: context?.trim() ?? null,
    source: 'manual_entry',
    date: today,
  }).returning()

  await db.insert(auditLog).values({
    entity_type: 'key_decision',
    entity_id: newRecord.id,
    action: 'create',
    actor_id: 'default',
    before_json: null,
    after_json: newRecord as Record<string, unknown>,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
