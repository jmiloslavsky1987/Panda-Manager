// bigpanda-app/worker/jobs/meeting-summary.ts
// On-demand BullMQ handler — delegates to SkillOrchestrator + registers output
import type { Job } from 'bullmq';
import path from 'path';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import db from '../../db';
import { skillRuns, outputs } from '../../db/schema';
import { SkillOrchestrator } from '../../lib/skill-orchestrator';

const orchestrator = new SkillOrchestrator();
const SKILLS_DIR = path.join(__dirname, '../../skills');

export default async function meetingSummaryJob(job: Job): Promise<{ status: string }> {
  const { projectId, input, runId: existingRunId } = job.data as {
    projectId: number;
    input?: Record<string, string>;
    runId?: number; // Set by skill-run.ts for on-demand invocations
  };

  // runId is required — set by skill-run.ts before enqueueing
  const runId = existingRunId;
  if (!runId) {
    console.error('[meeting-summary] runId required in job.data');
    return { status: 'failed' };
  }

  try {
    await orchestrator.run({
      skillName: 'meeting-summary',
      projectId,
      runId,
      input,
      skillsDir: SKILLS_DIR,
    });

    const [completedRun] = await db.select().from(skillRuns).where(eq(skillRuns.id, runId));
    const outputText = completedRun?.full_output ?? '';
    const runUuid = completedRun?.run_id ?? randomUUID();

    await db.insert(outputs).values({
      project_id: projectId,
      skill_name: 'meeting-summary',
      idempotency_key: runUuid,
      status: 'complete',
      content: outputText,
      completed_at: new Date(),
    }).onConflictDoNothing();

    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[meeting-summary] failed:', message);
    return { status: 'failed' };
  }
}
