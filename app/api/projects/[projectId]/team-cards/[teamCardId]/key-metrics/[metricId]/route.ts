import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import db from '@/db';
import { teamCardKeyMetrics, teamCards } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const PatchSchema = z
  .object({
    label: z.string().min(1).optional(),
    target: z.string().optional().nullable(),
    current: z.string().optional().nullable(),
    trend: z.string().optional().nullable(),
    display_order: z.number().int().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

/**
 * Verify ownership chain: metric → team_card → project.
 * Returns false if mismatched, null if check could not be performed, true if valid.
 */
async function assertMetricInProject(
  metricId: number,
  projectId: number,
): Promise<boolean | null> {
  try {
    const [metric] = await db
      .select({ team_card_id: teamCardKeyMetrics.team_card_id })
      .from(teamCardKeyMetrics)
      .where(eq(teamCardKeyMetrics.id, metricId))
      .limit(1);
    if (!metric) return false;

    const [card] = await db
      .select({ project_id: teamCards.project_id })
      .from(teamCards)
      .where(eq(teamCards.id, metric.team_card_id))
      .limit(1);
    if (!card) return false;
    return card.project_id === projectId;
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; teamCardId: string; metricId: string }> }
) {
  const { projectId: pidStr, metricId: midStr } = await params;
  const projectId = Number(pidStr);
  const metricId = Number(midStr);
  if (isNaN(projectId) || isNaN(metricId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  const ownership = await assertMetricInProject(metricId, projectId);
  if (ownership === false) {
    return NextResponse.json({ error: 'metric not in this project' }, { status: 403 });
  }

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
  if (parse.data.label !== undefined) updates.label = parse.data.label;
  if (parse.data.target !== undefined) updates.target = parse.data.target;
  if (parse.data.current !== undefined) updates.current = parse.data.current;
  if (parse.data.trend !== undefined) updates.trend = parse.data.trend;
  if (parse.data.display_order !== undefined) updates.display_order = parse.data.display_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const [updated] = await db
    .update(teamCardKeyMetrics)
    .set({ ...updates, updated_at: new Date() })
    .where(eq(teamCardKeyMetrics.id, metricId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; teamCardId: string; metricId: string }> }
) {
  const { projectId: pidStr, metricId: midStr } = await params;
  const projectId = Number(pidStr);
  const metricId = Number(midStr);
  if (isNaN(projectId) || isNaN(metricId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  const ownership = await assertMetricInProject(metricId, projectId);
  if (ownership === false) {
    return NextResponse.json({ error: 'metric not in this project' }, { status: 403 });
  }

  await db.delete(teamCardKeyMetrics).where(eq(teamCardKeyMetrics.id, metricId));
  return new NextResponse(null, { status: 204 });
}
