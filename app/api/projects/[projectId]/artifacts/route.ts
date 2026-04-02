import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { artifacts } from '@/db/schema';
import { requireSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  await requireSession();
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const rows = await db
    .select({
      id: artifacts.id,
      name: artifacts.name,
      status: artifacts.status,
      createdAt: artifacts.created_at,
    })
    .from(artifacts)
    .where(
      and(
        eq(artifacts.project_id, projectIdNum),
        eq(artifacts.source, 'upload'),
      ),
    )
    .orderBy(desc(artifacts.created_at))
    .limit(20);

  return NextResponse.json(rows);
}
