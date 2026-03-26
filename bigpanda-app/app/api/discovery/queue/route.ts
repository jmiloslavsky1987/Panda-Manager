import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { discoveryItems } from '@/db/schema';

export const dynamic = 'force-dynamic';

/**
 * GET /api/discovery/queue?projectId=N
 *
 * Returns all pending discovery items for a project.
 * DISC-16: No time-based expiry — items remain pending until explicitly acted upon.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const projectIdParam = searchParams.get('projectId');

  if (!projectIdParam) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const projectId = parseInt(projectIdParam, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'projectId must be a number' }, { status: 400 });
  }

  const items = await db
    .select()
    .from(discoveryItems)
    .where(and(eq(discoveryItems.project_id, projectId), eq(discoveryItems.status, 'pending')))
    .orderBy(desc(discoveryItems.created_at));

  return NextResponse.json({ items });
}
