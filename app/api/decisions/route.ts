import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { keyDecisions } from '@/db/schema'

const postSchema = z.object({
  project_id: z.number().int().positive(),
  decision: z.string().min(1, 'Decision text is required'),
  context: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { project_id, decision, context } = parsed.data
  const today = new Date().toISOString().split('T')[0]

  await db.insert(keyDecisions).values({
    project_id,
    decision: decision.trim(),
    context: context?.trim() ?? null,
    source: 'manual_entry',
    date: today,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
