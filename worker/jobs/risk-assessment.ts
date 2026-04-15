// bigpanda-app/worker/jobs/risk-assessment.ts
// On-demand BullMQ handler — delegates to SkillOrchestrator + registers output
import type { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import db from '../../db';
import { skillRuns, outputs } from '../../db/schema';
import { SkillOrchestrator } from '../../lib/skill-orchestrator';
import { readSettings } from '../../lib/settings-core';
import { resolveSkillsDir } from '../../lib/skill-path';

const orchestrator = new SkillOrchestrator();

export default async function riskAssessmentJob(job: Job): Promise<{ status: string }> {
  const { projectId, input, runId: existingRunId } = job.data as {
    projectId: number;
    input?: Record<string, string>;
    runId?: number; // Set by skill-run.ts for on-demand invocations
  };

  // runId is required — set by skill-run.ts before enqueueing
  const runId = existingRunId;
  if (!runId) {
    console.error('[risk-assessment] runId required in job.data');
    return { status: 'failed' };
  }

  try {
    const settings = await readSettings();
    const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');

    await orchestrator.run({
      skillName: 'risk-assessment',
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
      skill_name: 'risk-assessment',
      idempotency_key: runUuid,
      status: 'complete',
      content: outputText,
      completed_at: new Date(),
    }).onConflictDoNothing();

    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[risk-assessment] failed:', message);
    return { status: 'failed' };
  }
}
