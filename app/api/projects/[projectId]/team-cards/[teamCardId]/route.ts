import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import db from '@/db';
import { teamCards } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const PatchSchema = z
  .object({
    team_name: z.string().min(1).max(200).optional(),
    success_definition: z.string().optional().nullable(),
    overall_status: z.enum(['on_track', 'at_risk', 'blocked', 'not_started']).optional(),
    latest_activity_date: z.string().optional().nullable(),
    latest_activity_text: z.string().optional().nullable(),
    latest_activity_source: z.enum(['manual', 'context_upload']).optional().nullable(),
    next_milestone_id: z.number().int().positive().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'at least one field required' });

async function loadIfInProject(
  teamCardId: number,
  projectId: number,
) {
  const [card] = await db
    .select()
    .from(teamCards)
    .where(eq(teamCards.id, teamCardId))
    .limit(1);
  return card && card.project_id === projectId ? card : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; teamCardId: string }> },
) {
  const { projectId: pidStr, teamCardId: tidStr } = await params;
  const projectId = Number(pidStr);
  const teamCardId = Number(tidStr);
  if (isNaN(projectId) || isNaN(teamCardId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;
  const card = await loadIfInProject(teamCardId, projectId);
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(card);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; teamCardId: string }> },
) {
  const { projectId: pidStr, teamCardId: tidStr } = await params;
  const projectId = Number(pidStr);
  const teamCardId = Number(tidStr);
  if (isNaN(projectId) || isNaN(teamCardId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  const existing = await loadIfInProject(teamCardId, projectId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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

  const [updated] = await db
    .update(teamCards)
    .set({ ...parse.data, updated_at: new Date() })
    .where(eq(teamCards.id, teamCardId))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; teamCardId: string }> },
) {
  const { projectId: pidStr, teamCardId: tidStr } = await params;
  const projectId = Number(pidStr);
  const teamCardId = Number(tidStr);
  if (isNaN(projectId) || isNaN(teamCardId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }
  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  const existing = await loadIfInProject(teamCardId, projectId);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(teamCards).where(eq(teamCards.id, teamCardId));
  return new NextResponse(null, { status: 204 });
}
