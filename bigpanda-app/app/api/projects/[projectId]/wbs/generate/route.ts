// bigpanda-app/app/api/projects/[projectId]/wbs/generate/route.ts
// POST /api/projects/:projectId/wbs/generate — WBS Generate Plan endpoint.
// Returns proposals for preview modal (synchronous, no BullMQ).

import { NextRequest, NextResponse } from 'next/server';
import { requireProjectRole } from '@/lib/auth-server';
import db from '@/db';
import { wbsItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildWbsProposals } from '@/worker/jobs/wbs-generate-plan';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: projectIdStr } = await params;
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: 'Invalid project id' }, { status: 400 });
  }

  const { session, redirectResponse } = await requireProjectRole(projectId, 'user');
  if (redirectResponse) return redirectResponse;

  try {
    // Fetch all existing WBS items (both tracks, all levels)
    const existingItems = await db
      .select()
      .from(wbsItems)
      .where(eq(wbsItems.project_id, projectId));

    // Call buildWbsProposals (synchronous — no BullMQ needed)
    const proposals = await buildWbsProposals(projectId, existingItems);

    return NextResponse.json({ proposals });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[wbs/generate] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
