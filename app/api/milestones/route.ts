import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { milestones, auditLog } from '@/db/schema'
import { requireSession } from "@/lib/auth-server";

const postSchema = z.object({
  project_id: z.number().int().positive(),
  name: z.string().min(1, 'Name is required'),
  target: z.string().optional(),
  owner: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'blocked']).optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { project_id, name, target, owner, status, notes } = parsed.data

  const [newRecord] = await db.insert(milestones).values({
    project_id,
    name: name.trim(),
    target: target?.trim() ?? null,
    owner: owner?.trim() ?? null,
    status: status ?? 'not_started',
    notes: notes?.trim() ?? null,
    source: 'manual_entry',
    external_id: `MAN-MST-${Date.now()}`,
  }).returning()

  await db.insert(auditLog).values({
    entity_type: 'milestone',
    entity_id: newRecord.id,
    action: 'create',
    actor_id: 'default',
    before_json: null,
    after_json: newRecord as Record<string, unknown>,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
