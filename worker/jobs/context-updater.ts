// bigpanda-app/worker/jobs/context-updater.ts
// Scheduled BullMQ handler — delegates to SkillOrchestrator + registers output
import type { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { sql, eq } from 'drizzle-orm';
import db from '../../db';
import { skillRuns, outputs } from '../../db/schema';
import { LOCK_IDS } from '../lock-ids';
import { SkillOrchestrator } from '../../lib/skill-orchestrator';
import { MCPClientPool } from '../../lib/mcp-config';
import { getActiveProjects } from '../../lib/queries';
import { readSettings } from '../../lib/settings-core';
import { resolveSkillsDir } from './skill-run';

const orchestrator = new SkillOrchestrator();

export default async function contextUpdaterJob(job: Job): Promise<{ status: string }> {
  // Acquire advisory lock to prevent concurrent runs — FIRST async operation
  const [lockRow] = await db.execute(
    sql`SELECT pg_try_advisory_xact_lock(${LOCK_IDS.CONTEXT_UPDATER}) AS acquired`
  );
  const acquired = (lockRow as Record<string, unknown>).acquired === true;

  if (!acquired) {
    console.log(`[context-updater] skipped: advisory lock ${LOCK_IDS.CONTEXT_UPDATER} held`);
    return { status: 'skipped' };
  }

  const settings = await readSettings();
  const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');

  const projectId = job.data?.projectId as number | undefined;
  const input = job.data?.input as Record<string, string> | undefined;
  const projects = projectId ? [{ id: projectId }] : await getActiveProjects();

  for (const project of projects) {
    const runUuid = randomUUID();
    const [runRow] = await db.insert(skillRuns).values({
      run_id: runUuid,
      project_id: project.id,
      skill_name: 'context-updater',
      status: 'running',
      started_at: new Date(),
    }).returning({ id: skillRuns.id });

    try {
      const mcpServers = await MCPClientPool.getInstance().getServersForSkill('context-updater');

      await orchestrator.run({
        skillName: 'context-updater',
        projectId: project.id,
        runId: runRow.id,
        input,
        skillsDir: SKILLS_DIR,
        mcpServers,
      });

      const [completedRun] = await db.select().from(skillRuns).where(eq(skillRuns.id, runRow.id));
      const outputText = completedRun?.full_output ?? '';

      await db.update(skillRuns)
        .set({ status: 'completed', completed_at: new Date() })
        .where(sql`id = ${runRow.id}`);

      await db.insert(outputs).values({
        project_id: project.id,
        skill_name: 'context-updater',
        idempotency_key: runUuid,
        status: 'complete',
        content: outputText,
        completed_at: new Date(),
      }).onConflictDoNothing();

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.update(skillRuns)
        .set({ status: 'failed', completed_at: new Date(), error_message: message })
        .where(sql`id = ${runRow.id}`);
      console.error(`[context-updater] project ${project.id} failed:`, message);
    }
  }

  return { status: 'completed' };
}
