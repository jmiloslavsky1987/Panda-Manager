import { NextResponse } from 'next/server'
import { getEntitiesExtractedFromArtifact } from '@/lib/queries'
import { requireSession } from '@/lib/auth-server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  const { id } = await params
  const artifactId = parseInt(id, 10)

  if (isNaN(artifactId)) {
    return NextResponse.json({ error: 'Invalid artifact ID' }, { status: 400 })
  }

  try {
    const data = await getEntitiesExtractedFromArtifact(artifactId)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
