// bigpanda-app/app/api/skills/[skillName]/run/route.ts
// POST — create skill_runs row + enqueue BullMQ skill-run job, returns { runId }
import { NextResponse } from 'next/server';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { createApiRedisConnection } from '../../../../../worker/connection';
import db from '../../../../../db';
import { skillRuns } from '../../../../../db/schema';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ skillName: string }> }
) {
  try {
    const { skillName } = await params;
    const body = await request.json() as { projectId: number; input?: Record<string, string> };

    if (!body.projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Pre-flight SKILL.md check — return 422 if missing so UI can show error badge
    const skillPath = path.join(process.cwd(), 'skills', skillName + '.md');
    if (!existsSync(skillPath)) {
      return NextResponse.json({ error: 'SKILL.md not found', skillName }, { status: 422 });
    }

    // Create skill_runs row with UUID idempotency key — before enqueuing so run page has a valid row immediately
    const runId = randomUUID();
    const [runRow] = await db.insert(skillRuns).values({
      run_id: runId,
      project_id: body.projectId,
      skill_name: skillName,
      status: 'pending',
      input: body.input ? JSON.stringify(body.input) : null,
    }).returning({ id: skillRuns.id });

    // Enqueue BullMQ job — uses existing 'scheduled-jobs' queue + new 'skill-run' handler
    const queue = new Queue('scheduled-jobs', { connection: createApiRedisConnection() });
    await queue.add(
      'skill-run',
      { runId: runRow.id, skillName, projectId: body.projectId, input: body.input },
      { jobId: `skill-run-${runId}` }
    );
    await queue.close();

    return NextResponse.json({ runId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
