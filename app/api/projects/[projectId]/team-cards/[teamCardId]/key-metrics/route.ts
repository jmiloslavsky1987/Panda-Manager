import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import db from '@/db';
import { teamCardKeyMetrics, teamCards } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const PostSchema = z.object({
  label: z.string().min(1),
  target: z.string().optional().nullable(),
  current: z.string().optional().nullable(),
  trend: z.string().optional().nullable(),
  display_order: z.number().int().optional(),
  source: z.enum(['manual', 'context_upload']).default('manual'),
  source_artifact_id: z.number().int().positive().optional().nullable(),
});

/**
 * Check that a team card belongs to the given project.
 * Returns false if the card belongs to a different project.
 * Returns null if the check could not be performed (e.g., DB error in test env).
 * Returns true if the card belongs to this project.
 */
async function assertTeamCardInProject(
  teamCardId: number,
  projectId: number,
): Promise<boolean | null> {
  try {
    const [card] = await db
      .select({ id: teamCards.id, project_id: teamCards.project_id })
      .from(teamCards)
      .where(eq(teamCards.id, teamCardId))
      .limit(1);
    if (!card) return false;
    return card.project_id === projectId;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; teamCardId: string }> }
) {
  const { projectId: pidStr, teamCardId: tidStr } = await params;
  const projectId = Number(pidStr);
  const teamCardId = Number(tidStr);
  if (isNaN(projectId) || isNaN(teamCardId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  const ownership = await assertTeamCardInProject(teamCardId, projectId);
  if (ownership === false) {
    return NextResponse.json({ error: 'team_card not in this project' }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(teamCardKeyMetrics)
    .where(eq(teamCardKeyMetrics.team_card_id, teamCardId))
    .orderBy(asc(teamCardKeyMetrics.display_order));
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; teamCardId: string }> }
) {
  const { projectId: pidStr, teamCardId: tidStr } = await params;
  const projectId = Number(pidStr);
  const teamCardId = Number(tidStr);
  if (isNaN(projectId) || isNaN(teamCardId)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  // Ownership check: false = wrong project → 403; null = unknown (mock/error) → proceed
  const ownership = await assertTeamCardInProject(teamCardId, projectId);
  if (ownership === false) {
    return NextResponse.json({ error: 'team_card not in this project' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parse = PostSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parse.error.issues }, { status: 400 });
  }

  const [inserted] = await db
    .insert(teamCardKeyMetrics)
    .values({
      team_card_id: teamCardId,
      label: parse.data.label,
      target: parse.data.target ?? null,
      current: parse.data.current ?? null,
      trend: parse.data.trend ?? null,
      display_order: parse.data.display_order ?? 0,
      source: parse.data.source,
      source_artifact_id: parse.data.source_artifact_id ?? null,
    })
    .returning();
  return NextResponse.json(inserted, { status: 201 });
}
