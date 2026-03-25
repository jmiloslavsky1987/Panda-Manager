// bigpanda-app/worker/jobs/weekly-customer-status.ts
// Scheduled BullMQ handler — delegates to SkillOrchestrator + writes email draft
import type { Job } from 'bullmq';
import path from 'path';
import { randomUUID } from 'crypto';
import { sql, eq } from 'drizzle-orm';
import db from '../../db';
import { skillRuns, outputs, drafts } from '../../db/schema';
import { SkillOrchestrator } from '../../lib/skill-orchestrator';
import { MCPClientPool } from '../../lib/mcp-config';
import { getActiveProjects } from '../../lib/queries';

const orchestrator = new SkillOrchestrator();
const SKILLS_DIR = path.join(__dirname, '../../skills');

export default async function weeklyCustomerStatusJob(job: Job): Promise<{ status: string }> {
  // Scheduled: run for all active projects (or specific projectId from job.data)
  const projects = job.data?.projectId
    ? [{ id: job.data.projectId as number }]
    : await getActiveProjects();

  for (const project of projects) {
    const runUuid = randomUUID();
    const [runRow] = await db.insert(skillRuns).values({
      run_id: runUuid,
      project_id: project.id,
      skill_name: 'weekly-customer-status',
      status: 'running',
      started_at: new Date(),
    }).returning({ id: skillRuns.id });

    try {
      const mcpServers = await MCPClientPool.getInstance().getServersForSkill('weekly-customer-status');

      await orchestrator.run({
        skillName: 'weekly-customer-status',
        projectId: project.id,
        runId: runRow.id,
        skillsDir: SKILLS_DIR,
        mcpServers,
      });

      // Read full output after orchestrator completes
      const [completedRun] = await db.select().from(skillRuns).where(eq(skillRuns.id, runRow.id));
      const outputText = completedRun?.full_output ?? '';

      await db.update(skillRuns)
        .set({ status: 'completed', completed_at: new Date() })
        .where(sql`id = ${runRow.id}`);

      // Register in Output Library
      await db.insert(outputs).values({
        project_id: project.id,
        skill_name: 'weekly-customer-status',
        idempotency_key: runUuid,
        status: 'complete',
        content: outputText,
        completed_at: new Date(),
      }).onConflictDoNothing();

      // Write to Drafts Inbox — email draft for human review
      if (outputText) {
        await db.insert(drafts).values({
          project_id: project.id,
          run_id: runRow.id,
          draft_type: 'email',
          subject: 'Weekly Customer Status',
          content: outputText,
          status: 'pending',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.update(skillRuns)
        .set({ status: 'failed', completed_at: new Date(), error_message: message })
        .where(sql`id = ${runRow.id}`);
      console.error(`[weekly-customer-status] project ${project.id} failed:`, message);
    }
  }

  return { status: 'completed' };
}
