import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { onboardingPhases, onboardingSteps } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireProjectRole } from '@/lib/auth-server'
import { ADR_ONBOARDING_CONFIG, BIGGY_ONBOARDING_CONFIG, PhaseConfig } from '@/lib/onboarding-config'

/**
 * POST /api/projects/[projectId]/onboarding/seed
 *
 * Idempotently seeds standard phases + steps for a project.
 * Only creates what doesn't already exist — safe to call multiple times.
 * Returns the full updated phase data (same shape as GET /onboarding).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  const { redirectResponse } = await requireProjectRole(numericId, 'user')
  if (redirectResponse) return redirectResponse

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      async function seedTrack(config: PhaseConfig[], track: string) {
        for (const phaseConfig of config) {
          // Find or create the phase
          let [phase] = await tx
            .select()
            .from(onboardingPhases)
            .where(
              and(
                eq(onboardingPhases.project_id, numericId),
                eq(onboardingPhases.name, phaseConfig.name)
              )
            )

          if (!phase) {
            ;[phase] = await tx
              .insert(onboardingPhases)
              .values({
                project_id: numericId,
                name: phaseConfig.name,
                display_order: phaseConfig.display_order,
                track,
              })
              .returning()
          }

          // Seed missing steps
          const existingSteps = await tx
            .select({ name: onboardingSteps.name })
            .from(onboardingSteps)
            .where(eq(onboardingSteps.phase_id, phase.id))

          const existingNames = new Set(existingSteps.map(s => s.name))

          for (let i = 0; i < phaseConfig.steps.length; i++) {
            const stepName = phaseConfig.steps[i]
            if (!existingNames.has(stepName)) {
              await tx.insert(onboardingSteps).values({
                phase_id: phase.id,
                project_id: numericId,
                name: stepName,
                display_order: i + 1,
                track,
              })
            }
          }
        }
      }

      await seedTrack(ADR_ONBOARDING_CONFIG, 'ADR')
      await seedTrack(BIGGY_ONBOARDING_CONFIG, 'Biggy')
    })

    // Return full updated data (same shape as GET /onboarding)
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

      return {
        adr: phasesWithSteps.filter(p => p.track === 'ADR'),
        biggy: phasesWithSteps.filter(p => p.track === 'Biggy'),
      }
    })

    return NextResponse.json(grouped)
  } catch (err) {
    console.error('POST /api/projects/[projectId]/onboarding/seed error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
