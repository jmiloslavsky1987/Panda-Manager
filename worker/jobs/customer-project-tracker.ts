// bigpanda-app/worker/jobs/customer-project-tracker.ts
// Scheduled BullMQ handler for SKILL-10 — Customer Project Tracker.
// Sweeps Gmail, Slack, and Glean via MCP for customer activity and updates actions table.
// Pattern: follows morning-briefing.ts exactly, with MCPClientPool integration.

import type { Job } from 'bullmq';
import path from 'path';
import { randomUUID } from 'crypto';
import { sql, eq } from 'drizzle-orm';
import db from '../../db';
import { skillRuns, outputs, actions } from '../../db/schema';
import { SkillOrchestrator } from '../../lib/skill-orchestrator';
import { MCPClientPool } from '../../lib/mcp-config';
import { getActiveProjects } from '../../lib/queries';

const orchestrator = new SkillOrchestrator();
const SKILLS_DIR = path.join(__dirname, '../../skills');

export default async function customerProjectTrackerJob(job: Job): Promise<{ status: string }> {
  const projectId = job.data?.projectId as number | undefined;
  const projects = projectId ? [{ id: projectId }] : await getActiveProjects();

  for (const project of projects) {
    const runUuid = randomUUID();
    const [runRow] = await db.insert(skillRuns).values({
      run_id: runUuid,
      project_id: project.id,
      skill_name: 'customer-project-tracker',
      status: 'running',
      started_at: new Date(),
    }).returning({ id: skillRuns.id });

    try {
      // Resolve MCP servers at runtime — reads live settings, no restart required.
      // Returns [] if no servers configured — orchestrator takes non-MCP path gracefully.
      const mcpServers = await MCPClientPool.getInstance().getServersForSkill('customer-project-tracker');

      await orchestrator.run({
        skillName: 'customer-project-tracker',
        projectId: project.id,
        runId: runRow.id,
        skillsDir: SKILLS_DIR,
        mcpServers,
      });

      const [completedRun] = await db.select().from(skillRuns).where(eq(skillRuns.id, runRow.id));

      await db.update(skillRuns)
        .set({ status: 'completed', completed_at: new Date() })
        .where(sql`id = ${runRow.id}`);

      // Register in Output Library
      await db.insert(outputs).values({
        project_id: project.id,
        skill_name: 'customer-project-tracker',
        idempotency_key: runUuid,
        status: 'complete',
        content: completedRun?.full_output ?? '',
        completed_at: new Date(),
      }).onConflictDoNothing();

      // Extract and insert actions from JSON fence in output
      const jsonMatch = completedRun?.full_output?.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]) as {
            actions?: Array<{
              description: string;
              owner?: string | null;
              due_date?: string | null;
              priority?: string;
              source?: string;
            }>;
          };
          for (const action of parsed.actions ?? []) {
            await db.insert(actions).values({
              project_id: project.id,
              external_id: `A-CPT-${Date.now()}`,
              description: action.description,
              owner: action.owner ?? null,
              due: action.due_date ?? null,
              status: 'open',
              source: action.source ?? 'customer-project-tracker',
            }).onConflictDoNothing();
          }
        } catch (e) {
          console.error('[customer-project-tracker] JSON parse error:', e);
          // Non-fatal: skill output saved, action extraction failed
        }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db.update(skillRuns)
        .set({ status: 'failed', completed_at: new Date(), error_message: message })
        .where(sql`id = ${runRow.id}`);
      console.error(`[customer-project-tracker] project ${project.id} failed:`, message);
    }
  }

  return { status: 'completed' };
}
