import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'
import { seedIncidentPreventionForProject } from '@/lib/seed-incident-prevention'

// Active-tracks shape (mirrors db/schema.ts after Phase 87-01).
// All three keys REQUIRED inside the object — the form must always send a
// complete 3-key payload (Pitfall 2 in RESEARCH.md: JSONB-merge would otherwise
// silently drop keys). The outer .optional() allows callers to omit
// active_tracks entirely (e.g. name-only renames).
const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  go_live_target: z.string().nullable().optional(),
  active_tracks: z.object({
    adr: z.boolean(),
    biggy: z.boolean(),
    incident_prevention: z.boolean(),
  }).optional(),
})

type ActiveTracks = { adr: boolean; biggy: boolean; incident_prevention: boolean }

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: rawId } = await params
  const projectId = parseInt(rawId, 10)
  if (isNaN(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })

  const { redirectResponse } = await requireProjectRole(projectId, 'admin')
  if (redirectResponse) return redirectResponse

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patch = parsed.data

  // Read current active_tracks so we can diff and detect false→true flips.
  // Without the prior value we cannot tell a retroactive enable apart from a
  // re-save of an already-active track.
  const [current] = await db
    .select({ active_tracks: projects.active_tracks })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!current) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const currentTracks: ActiveTracks =
    (current.active_tracks as ActiveTracks | null) ?? {
      adr: false,
      biggy: false,
      incident_prevention: false,
    }

  // false→true detection. Only Incident Prevention is wired here; ADR/Biggy
  // retroactive seeding is out of scope for Plan 87-05 (those tracks are
  // opted in at project-create time via the wizard — see 87-04). If a future
  // plan needs ADR/Biggy retroactive seeding, mirror this pattern with the
  // appropriate seeder helper.
  const flippedOnIP = Boolean(
    patch.active_tracks &&
      !currentTracks.incident_prevention &&
      patch.active_tracks.incident_prevention,
  )

  // Single transaction: project update + (conditional) retroactive seed.
  // Per RESEARCH.md "Transaction safety" — the original route did NOT use a
  // transaction; wrapping is part of this plan so a partial failure (e.g.
  // seeder throws halfway through arch_nodes) rolls back the active_tracks
  // flip too, preventing an inconsistent "IP=true but no IP rows" state.
  let updated: typeof projects.$inferSelect | undefined
  await db.transaction(async (tx) => {
    const [u] = await tx.update(projects)
      .set({ ...patch, updated_at: new Date() })
      .where(eq(projects.id, projectId))
      .returning()
    updated = u

    if (flippedOnIP) {
      await seedIncidentPreventionForProject(tx, projectId)
    }
  })

  if (!updated) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  return NextResponse.json({ ok: true, project: updated })
}
