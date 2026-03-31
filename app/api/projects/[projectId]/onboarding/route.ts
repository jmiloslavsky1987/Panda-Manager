import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { onboardingPhases, onboardingSteps } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireSession } from "@/lib/auth-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  try {
    const phases = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      const phaseRows = await tx
        .select()
        .from(onboardingPhases)
        .where(eq(onboardingPhases.project_id, numericId))
        .orderBy(asc(onboardingPhases.display_order))

      const result = await Promise.all(
        phaseRows.map(async (phase) => {
          const steps = await tx
            .select()
            .from(onboardingSteps)
            .where(eq(onboardingSteps.phase_id, phase.id))
            .orderBy(asc(onboardingSteps.display_order))
          return { ...phase, steps }
        })
      )

      return result
    })

    return NextResponse.json({ phases })
  } catch (err) {
    console.error('GET /api/projects/[projectId]/onboarding error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
