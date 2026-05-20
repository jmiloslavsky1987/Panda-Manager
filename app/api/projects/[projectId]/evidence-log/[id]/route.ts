import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import db from '@/db';
import { evidenceLog, businessOutcomes } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId: projectIdStr, id: idStr } = await params;
  const projectId = Number(projectIdStr);
  const id = Number(idStr);
  if (isNaN(projectId) || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  const [row] = await db.select().from(evidenceLog).where(eq(evidenceLog.id, id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify the row's outcome belongs to this project
  const [outcome] = await db
    .select({ id: businessOutcomes.id, project_id: businessOutcomes.project_id })
    .from(businessOutcomes)
    .where(eq(businessOutcomes.id, row.business_outcome_id));
  if (!outcome || outcome.project_id !== projectId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(row);
}

// Append-only: NO PATCH export, NO DELETE export.
// DB trigger prevents UPDATE/DELETE at the database level.
