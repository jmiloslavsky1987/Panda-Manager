import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import db from '@/db';
import { teamCards } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const PostSchema = z.object({
  team_name: z.string().min(1).max(200),
  success_definition: z.string().optional().nullable(),
  overall_status: z.enum(['on_track', 'at_risk', 'blocked', 'not_started']).default('not_started'),
  latest_activity_date: z.string().optional().nullable(),
  latest_activity_text: z.string().optional().nullable(),
  latest_activity_source: z.enum(['manual', 'context_upload']).optional().nullable(),
  next_milestone_id: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.enum(['manual', 'context_upload']).default('manual'),
  source_artifact_id: z.number().int().positive().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId: pidStr } = await params;
  const projectId = Number(pidStr);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  }
  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;
  const rows = await db.select().from(teamCards).where(eq(teamCards.project_id, projectId));
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId: pidStr } = await params;
  const projectId = Number(pidStr);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  }
  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

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

  try {
    const [inserted] = await db
      .insert(teamCards)
      .values({
        project_id: projectId,
        team_name: parse.data.team_name,
        success_definition: parse.data.success_definition ?? null,
        overall_status: parse.data.overall_status,
        latest_activity_date: parse.data.latest_activity_date ?? null,
        latest_activity_text: parse.data.latest_activity_text ?? null,
        latest_activity_source: parse.data.latest_activity_source ?? null,
        next_milestone_id: parse.data.next_milestone_id ?? null,
        notes: parse.data.notes ?? null,
        source: parse.data.source,
        source_artifact_id: parse.data.source_artifact_id ?? null,
      })
      .returning();
    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique/i.test(msg)) {
      return NextResponse.json(
        { error: 'team_name already exists for this project' },
        { status: 409 },
      );
    }
    console.error('POST /api/projects/[projectId]/team-cards error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
