import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { onboardingPhases, onboardingSteps } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireProjectRole } from "@/lib/auth-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  try {
    const grouped = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      const phaseRows = await tx
        .select()
        .from(onboardingPhases)
        .where(eq(onboardingPhases.project_id, numericId))
        .orderBy(asc(onboardingPhases.display_order))

      const phasesWithSteps = await Promise.all(
        phaseRows.map(async (phase) => {
          const steps = await tx
            .select()
            .from(onboardingSteps)
            .where(eq(onboardingSteps.phase_id, phase.id))
            .orderBy(asc(onboardingSteps.display_order))
          return { ...phase, steps }
        })
      )

      // Group by track
      const adr = phasesWithSteps.filter((p) => p.track === 'ADR')
      const biggy = phasesWithSteps.filter((p) => p.track === 'Biggy')

      return { adr, biggy }
    })

    return NextResponse.json(grouped)
  } catch (err) {
    console.error('GET /api/projects/[projectId]/onboarding error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
