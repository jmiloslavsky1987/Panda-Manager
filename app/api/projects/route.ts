import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects } from '@/db/schema'

export async function POST(req: NextRequest) {
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
