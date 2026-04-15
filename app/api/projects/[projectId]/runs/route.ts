/**
 * GET /api/projects/[projectId]/runs — recent skill runs for a project
 *
 * Used by SkillsTabClient to refresh the Recent Runs list on mount,
 * bypassing the Next.js Router Cache that serves stale RSC payloads.
 */

import 'server-only';
import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { skillRuns } from '@/db/schema';
import { requireProjectRole } from '@/lib/auth-server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId } = await params;
  const numericId = parseInt(projectId, 10);

  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;

  try {
    const runs = await db
      .select()
      .from(skillRuns)
      .where(eq(skillRuns.project_id, numericId))
      .orderBy(desc(skillRuns.created_at))
      .limit(10);

    return NextResponse.json({ runs }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
