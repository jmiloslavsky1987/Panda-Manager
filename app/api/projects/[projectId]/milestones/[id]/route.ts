import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import db from '@/db';
import { milestones } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const PatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    target: z.string().optional().nullable(),
    status: z.string().optional(),
    owner: z.string().optional().nullable(),
    owner_id: z.number().int().optional().nullable(),
    linked_track: z.string().nullable().optional(), // Phase 88.1 — nullable TEXT (no enum constraint)
    source: z.enum(['manual', 'context_upload']).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId: pidStr, id: idStr } = await params;
  const projectId = Number(pidStr);
  const id = Number(idStr);
  if (isNaN(projectId) || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  const [row] = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.id, id), eq(milestones.project_id, projectId)));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ milestone: row });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId: pidStr, id: idStr } = await params;
  const projectId = Number(pidStr);
  const id = Number(idStr);
  if (isNaN(projectId) || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parse = PatchSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parse.error.issues }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parse.data.title !== undefined) updates.title = parse.data.title;
  if (parse.data.target !== undefined) updates.target = parse.data.target;
  if (parse.data.status !== undefined) updates.status = parse.data.status;
  if (parse.data.owner !== undefined) updates.owner = parse.data.owner;
  if (parse.data.owner_id !== undefined) updates.owner_id = parse.data.owner_id;
  if (parse.data.linked_track !== undefined) updates.linked_track = parse.data.linked_track;
  if (parse.data.source !== undefined) updates.source = parse.data.source;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const [updated] = await db
    .update(milestones)
    .set(updates)
    .where(and(eq(milestones.id, id), eq(milestones.project_id, projectId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ milestone: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId: pidStr, id: idStr } = await params;
  const projectId = Number(pidStr);
  const id = Number(idStr);
  if (isNaN(projectId) || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  const [existing] = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(eq(milestones.id, id), eq(milestones.project_id, projectId)));
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.delete(milestones).where(and(eq(milestones.id, id), eq(milestones.project_id, projectId)));
  return new NextResponse(null, { status: 204 });
}
