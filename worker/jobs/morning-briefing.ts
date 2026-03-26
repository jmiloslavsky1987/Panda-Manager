// bigpanda-app/worker/jobs/morning-briefing.ts
// Scheduled BullMQ handler — delegates to SkillOrchestrator + stores output for Dashboard panel
import type { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { sql, eq } from 'drizzle-orm';
import db from '../../db';
import { skillRuns, outputs } from '../../db/schema';
import { SkillOrchestrator } from '../../lib/skill-orchestrator';
import { MCPClientPool } from '../../lib/mcp-config';
import { getActiveProjects } from '../../lib/queries';
import { readSettings } from '../../lib/settings-core';
import { resolveSkillsDir } from './skill-run';

const orchestrator = new SkillOrchestrator();

export default async function morningBriefingJob(job: Job): Promise<{ status: string }> {
  const settings = await readSettings();
  const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');

  const projectId = job.data?.projectId as number | undefined;
  const projects = projectId ? [{ id: projectId }] : await getActiveProjects();

  // Morning briefing generates one output per project
  for (const project of projects) {
    const runUuid = randomUUID();
    const [runRow] = await db.insert(skillRuns).values({
      run_id: runUuid,
      project_id: project.id,
      skill_name: 'morning-briefing',
      status: 'running',
      started_at: new Date(),
    }).returning({ id: skillRuns.id });

    try {
      const mcpServers = await MCPClientPool.getInstance().getServersForSkill('morning-briefing');

      await orchestrator.run({
        skillName: 'morning-briefing',
        projectId: project.id,
        runId: runRow.id,
        skillsDir: SKILLS_DIR,
        mcpServers,
      });

      const [completedRun] = await db.select().from(skillRuns).where(eq(skillRuns.id, runRow.id));

      await db.update(skillRuns)
        .set({ status: 'completed', completed_at: new Date() })
        .where(sql`id = ${runRow.id}`);

      await db.insert(outputs).values({
        project_id: project.id,
        skill_name: 'morning-briefing',
        idempotency_key: runUuid,
        status: 'complete',
        content: completedRun?.full_output ?? '',
        completed_at: new Date(),
      }).onConflictDoNothing();

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.update(skillRuns)
        .set({ status: 'failed', completed_at: new Date(), error_message: message })
        .where(sql`id = ${runRow.id}`);
      console.error(`[morning-briefing] project ${project.id} failed:`, message);
    }
  }

  return { status: 'completed' };
}
