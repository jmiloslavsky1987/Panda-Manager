// bigpanda-app/app/api/skills/runs/[runId]/route.ts
// GET — returns skill run status + full_output for deduplication check (completed = no SSE needed)
import { NextResponse } from 'next/server';
import db from '../../../../../db';
import { skillRuns } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from "@/lib/auth-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { runId } = await params;
  const [run] = await db.select().from(skillRuns).where(eq(skillRuns.run_id, runId));
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(run);
}
