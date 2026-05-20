import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, inArray, desc } from 'drizzle-orm';
import db from '@/db';
import { evidenceLog, businessOutcomes } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const PostSchema = z.object({
  business_outcome_id: z.number().int().positive(),
  date: z.string().min(1),
  source: z.enum(['manual', 'context_upload']).default('manual'),
  source_artifact_id: z.number().int().positive().optional().nullable(),
  text: z.string().min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: projectIdStr } = await params;
  const projectId = Number(projectIdStr);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  const url = new URL(req.url);
  const outcomeIdParam = url.searchParams.get('business_outcome_id');

  if (outcomeIdParam) {
    const outcomeId = Number(outcomeIdParam);
    const [outcome] = await db.select({ id: businessOutcomes.id, project_id: businessOutcomes.project_id })
      .from(businessOutcomes)
      .where(eq(businessOutcomes.id, outcomeId));
    if (!outcome || outcome.project_id !== projectId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const rows = await db.select().from(evidenceLog)
      .where(eq(evidenceLog.business_outcome_id, outcomeId))
      .orderBy(desc(evidenceLog.date));
    return NextResponse.json(rows);
  }

  // No filter: return all evidence_log rows for this project (via outcomes join)
  const outcomesForProject = await db
    .select({ id: businessOutcomes.id })
    .from(businessOutcomes)
    .where(eq(businessOutcomes.project_id, projectId));
  const outcomeIds = outcomesForProject.map((o) => o.id);
  const rows =
    outcomeIds.length > 0
      ? await db
          .select()
          .from(evidenceLog)
          .where(inArray(evidenceLog.business_outcome_id, outcomeIds))
          .orderBy(desc(evidenceLog.date))
      : [];
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: projectIdStr } = await params;
  const projectId = Number(projectIdStr);
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

  const [inserted] = await db
    .insert(evidenceLog)
    .values({
      business_outcome_id: parse.data.business_outcome_id,
      date: parse.data.date,
      source: parse.data.source,
      source_artifact_id: parse.data.source_artifact_id ?? null,
      text: parse.data.text,
    })
    .returning();
  return NextResponse.json(inserted, { status: 201 });
}

// NO export of PATCH or DELETE — append-only at the API layer.
// DB trigger (enforce_append_only) prevents UPDATE/DELETE at the database level too.
