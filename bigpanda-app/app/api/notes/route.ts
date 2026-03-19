import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../db'
import { engagementHistory } from '../../../db/schema'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, content, date } = body

    if (!projectId || typeof projectId !== 'number' || projectId <= 0) {
      return NextResponse.json({ error: 'projectId must be a positive integer' }, { status: 400 })
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content must be a non-empty string' }, { status: 400 })
    }

    await db.insert(engagementHistory).values({
      project_id: projectId,
      content: content.trim(),
      source: 'manual_entry',
      date: date ?? new Date().toISOString().split('T')[0],
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/notes] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
