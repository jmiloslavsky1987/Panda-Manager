// bigpanda-app/worker/jobs/workflow-diagram.ts
// On-demand BullMQ handler — delegates to SkillOrchestrator + registers output
import type { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import db from '../../db';
import { skillRuns, outputs } from '../../db/schema';
import { SkillOrchestrator } from '../../lib/skill-orchestrator';
import { readSettings } from '../../lib/settings-core';
import { resolveSkillsDir } from '../../lib/skill-path';

function extractHtmlFromRaw(raw: string): string {
  let s = raw.trim().replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
  if (s.startsWith('<')) return s;
  try {
    const parsed = JSON.parse(s);
    if (typeof parsed?.html === 'string') return parsed.html;
  } catch { /* not JSON */ }
  return raw;
}

const orchestrator = new SkillOrchestrator();

export default async function workflowDiagramJob(job: Job): Promise<{ status: string }> {
  const { projectId, input, runId: existingRunId } = job.data as {
    projectId: number;
    input?: Record<string, string>;
    runId?: number; // Set by skill-run.ts for on-demand invocations
  };

  // runId is required — set by skill-run.ts before enqueueing
  const runId = existingRunId;
  if (!runId) {
    console.error('[workflow-diagram] runId required in job.data');
    return { status: 'failed' };
  }

  try {
    const settings = await readSettings();
    const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');

    await orchestrator.run({
      skillName: 'workflow-diagram',
      projectId,
      runId,
      input,
      skillsDir: SKILLS_DIR,
    });

    const [completedRun] = await db.select().from(skillRuns).where(eq(skillRuns.id, runId));
    const rawOutput = completedRun?.full_output ?? '';
    const runUuid = completedRun?.run_id ?? randomUUID();

    // Extract raw HTML from JSON envelope so run page and output library render it directly
    const htmlOutput = extractHtmlFromRaw(rawOutput);
    if (htmlOutput !== rawOutput) {
      await db.update(skillRuns).set({ full_output: htmlOutput }).where(eq(skillRuns.id, runId));
    }

    await db.insert(outputs).values({
      project_id: projectId,
      skill_name: 'workflow-diagram',
      idempotency_key: runUuid,
      status: 'complete',
      content: htmlOutput,
      completed_at: new Date(),
    }).onConflictDoNothing();

    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[workflow-diagram] failed:', message);
    return { status: 'failed' };
  }
}
