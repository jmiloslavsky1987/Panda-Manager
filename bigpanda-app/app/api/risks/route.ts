import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { risks, auditLog } from '@/db/schema'
import { requireSession } from "@/lib/auth-server";

const postSchema = z.object({
  project_id: z.number().int().positive(),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  owner: z.string().optional(),
  status: z.string().optional(),
  mitigation: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { project_id, description, severity, owner, status, mitigation } = parsed.data
  const today = new Date().toISOString().split('T')[0]

  const [newRecord] = await db.insert(risks).values({
    project_id,
    description: description.trim(),
    severity: severity ?? null,
    owner: owner?.trim() ?? null,
    status: status ?? 'open',
    mitigation: mitigation?.trim() ?? null,
    source: 'manual_entry',
    external_id: `MAN-RSK-${Date.now()}`,
    last_updated: today,
  }).returning()

  await db.insert(auditLog).values({
    entity_type: 'risk',
    entity_id: newRecord.id,
    action: 'create',
    actor_id: 'default',
    before_json: null,
    after_json: newRecord as Record<string, unknown>,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
