import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { artifacts } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { session, redirectResponse } = await requireProjectRole(projectIdNum, 'user');
  if (redirectResponse) return redirectResponse;

  const rows = await db
    .select({
      id: artifacts.id,
      name: artifacts.name,
      status: artifacts.ingestion_status,
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

const PatchSchema = z.object({
  artifactId: z.number().int().positive(),
  ingestion_status: z.enum(['pending', 'extracting', 'preview', 'approved', 'failed']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  const { projectId } = await params;
  const projectIdNum = parseInt(projectId, 10);
  if (isNaN(projectIdNum)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectIdNum, 'user');
  if (redirectResponse) return redirectResponse;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { artifactId, ingestion_status } = parsed.data;
  await db.update(artifacts)
    .set({ ingestion_status })
    .where(and(eq(artifacts.id, artifactId), eq(artifacts.project_id, projectIdNum)));

  return NextResponse.json({ ok: true });
}
