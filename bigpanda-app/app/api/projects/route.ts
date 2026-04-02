import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects } from '@/db/schema'
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

  const [inserted] = await db
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

  return NextResponse.json({ project: inserted }, { status: 201 })
}
