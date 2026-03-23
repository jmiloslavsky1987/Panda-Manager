// bigpanda-app/worker/jobs/skill-run.ts
// BullMQ job handler for skill-run queue entries.
// Follows health-refresh.ts pattern exactly:
//   1. Update status to running
//   2. Invoke SkillOrchestrator
//   3. Update status to completed
//   try/catch → update status to failed, re-throw

import type { Job } from 'bullmq';
import path from 'path';
import { sql, eq } from 'drizzle-orm';
import db from '../../db';
import { skillRuns, outputs, drafts } from '../../db/schema';
import { SkillOrchestrator } from '../../lib/skill-orchestrator';

// Worker-context skills directory — anchored to this file's location, not cwd
// This ensures SKILL.md files are resolved correctly regardless of npm run invocation directory.
const SKILLS_DIR = path.join(__dirname, '../../skills');

// Singleton orchestrator — reused across job invocations within the same worker process
const orchestrator = new SkillOrchestrator();

export default async function skillRunJob(job: Job): Promise<{ status: string }> {
  const { runId, skillName, projectId, input } = job.data as {
    runId: number;
    skillName: string;
    projectId: number;
    input?: Record<string, string>;
  };

  // Mark run as started
  await db.update(skillRuns)
    .set({ status: 'running', started_at: new Date() })
    .where(sql`id = ${runId}`);

  try {
    await orchestrator.run({ skillName, projectId, runId, input, skillsDir: SKILLS_DIR });

    await db.update(skillRuns)
      .set({ status: 'completed', completed_at: new Date() })
      .where(sql`id = ${runId}`);

    // Read full output for post-run side effects
    const [completedRun] = await db.select().from(skillRuns).where(eq(skillRuns.id, runId));
    const outputText = completedRun?.full_output ?? '';
    const runUuid = completedRun?.run_id ?? '';

    // Register in Output Library for all skills
    if (outputText) {
      await db.insert(outputs).values({
        project_id: projectId,
        skill_name: skillName,
        idempotency_key: runUuid,
        status: 'complete',
        content: outputText,
        completed_at: new Date(),
      }).onConflictDoNothing();
    }

    // Write to Drafts Inbox for skills that produce email-style output
    if (outputText && skillName === 'weekly-customer-status') {
      await db.insert(drafts).values({
        project_id: projectId,
        run_id: runId,
        draft_type: 'email',
        subject: 'Weekly Customer Status',
        content: outputText,
        status: 'pending',
      });
    }

    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(skillRuns)
      .set({ status: 'failed', completed_at: new Date(), error_message: message })
      .where(sql`id = ${runId}`);
    throw err; // re-throw so BullMQ marks the job as failed in Redis
  }
}
