import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { artifacts } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET /api/artifacts?projectId=X
export async function GET(req: NextRequest) {
  const projectId = parseInt(req.nextUrl.searchParams.get('projectId') ?? '', 10)
  if (isNaN(projectId)) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const rows = await db.select().from(artifacts).where(eq(artifacts.project_id, projectId)).orderBy(artifacts.external_id)
  return NextResponse.json(rows)
}

// POST /api/artifacts — creates new artifact with auto-assigned X-NNN external_id
const postSchema = z.object({
  project_id: z.number().int().positive(),
  name: z.string().min(1, 'Name is required'),
  status: z.string().optional().default('not-started'),
  owner: z.string().optional().default(''),
  description: z.string().optional().default(''),
})

export async function POST(req: NextRequest) {
  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { project_id, name, status, owner, description } = parsed.data

  // Auto-assign next sequential X-NNN external_id for this project
  // Only consider rows with X-NNN format (numeric suffix) — skip X-KAISER-NNN style from migration
  const existing = await db
    .select({ external_id: artifacts.external_id })
    .from(artifacts)
    .where(eq(artifacts.project_id, project_id))
    .orderBy(desc(artifacts.external_id))

  const nums = existing
    .map(r => parseInt(r.external_id.replace(/^X-/, ''), 10))
    .filter(n => !isNaN(n) && n < 1000) // X-NNN range only; X-KAISER-NNN parses as NaN or large
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  const external_id = `X-${String(next).padStart(3, '0')}`

  const [created] = await db.insert(artifacts).values({
    project_id,
    external_id,
    name,
    status,
    owner,
    description,
    source: 'ui',
  }).returning({ id: artifacts.id, external_id: artifacts.external_id })

  return NextResponse.json({ ok: true, id: created.id, external_id: created.external_id }, { status: 201 })
}
