import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects, onboardingPhases } from '@/db/schema'
import { requireSession } from "@/lib/auth-server";
import { getActiveProjects } from '@/lib/queries'

export async function GET(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  try {
    const activeProjects = await getActiveProjects()
    return NextResponse.json({ projects: activeProjects })
  } catch (err) {
    console.error('GET /api/projects error:', err)
    return NextResponse.json(
      { error: 'Failed to load projects' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const body = await req.json()
  const { name, customer, description, start_date, end_date } = body

  if (!name || !customer) {
    return NextResponse.json(
      { error: 'name and customer are required' },
      { status: 400 }
    )
  }

  // Standardized ADR phases from 33-CONTEXT.md
  const adrPhases = [
    { name: 'Discovery & Kickoff', display_order: 1 },
    { name: 'Integrations', display_order: 2 },
    { name: 'Platform Configuration', display_order: 3 },
    { name: 'Teams', display_order: 4 },
    { name: 'UAT', display_order: 5 },
  ]

  // Standardized Biggy phases from 33-CONTEXT.md
  const biggyPhases = [
    { name: 'Discovery & Kickoff', display_order: 1 },
    { name: 'IT Knowledge Graph', display_order: 2 },
    { name: 'Platform Configuration', display_order: 3 },
    { name: 'Teams', display_order: 4 },
    { name: 'Validation', display_order: 5 },
  ]

  // Atomic transaction: project creation + phase seeding
  const result = await db.transaction(async (tx) => {
    // Insert project
    const [inserted] = await tx
      .insert(projects)
      .values({
        name: String(name),
        customer: String(customer),
        status: 'draft',
        description: description ? String(description) : null,
        start_date: start_date ? String(start_date) : null,
        end_date: end_date ? String(end_date) : null,
      })
      .returning({ id: projects.id })

    // Seed ADR phases
    await tx.insert(onboardingPhases).values(
      adrPhases.map((p) => ({
        project_id: inserted.id,
        track: 'ADR',
        name: p.name,
        display_order: p.display_order,
      }))
    )

    // Seed Biggy phases
    await tx.insert(onboardingPhases).values(
      biggyPhases.map((p) => ({
        project_id: inserted.id,
        track: 'Biggy',
        name: p.name,
        display_order: p.display_order,
      }))
    )

    return inserted
  })

  return NextResponse.json({ project: result }, { status: 201 })
}
