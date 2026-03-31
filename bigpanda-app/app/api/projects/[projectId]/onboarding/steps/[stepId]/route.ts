import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { onboardingSteps } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireSession } from "@/lib/auth-server";

const patchSchema = z.object({
  status: z.enum(['not-started', 'in-progress', 'complete', 'blocked']).optional(),
  owner: z.string().optional(),
  updates_append: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; stepId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId, stepId } = await params
  const numericProjectId = parseInt(projectId, 10)
  const numericStepId = parseInt(stepId, 10)

  if (isNaN(numericProjectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }
  if (isNaN(numericStepId)) {
    return NextResponse.json({ error: 'Invalid stepId' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { status, owner, updates_append } = parsed.data

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))

      if (updates_append && updates_append.trim()) {
        // JSONB array append — must use sql template to avoid overwriting existing array
        const newEntry = { timestamp: new Date().toISOString(), text: updates_append.trim() }
        await tx
          .update(onboardingSteps)
          .set({
            ...(status !== undefined ? { status } : {}),
            ...(owner !== undefined ? { owner } : {}),
            updates: sql`${onboardingSteps.updates} || ${JSON.stringify([newEntry])}::jsonb`,
            updated_at: new Date(),
          })
          .where(eq(onboardingSteps.id, numericStepId))
      } else {
        const updateData: Partial<typeof onboardingSteps.$inferInsert> & { updated_at: Date } = {
          updated_at: new Date(),
        }
        if (status !== undefined) updateData.status = status
        if (owner !== undefined) updateData.owner = owner

        await tx
          .update(onboardingSteps)
          .set(updateData)
          .where(eq(onboardingSteps.id, numericStepId))
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/projects/[projectId]/onboarding/steps/[stepId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
