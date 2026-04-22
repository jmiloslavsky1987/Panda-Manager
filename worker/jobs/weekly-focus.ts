// bigpanda-app/worker/jobs/weekly-focus.ts
// Scheduled BullMQ handler — generates 3-5 AI priority bullets per project, caches in Redis
import type { Job } from 'bullmq';
import { sql, eq, lte, inArray, and } from 'drizzle-orm';
import { Redis } from 'ioredis';
import Anthropic from '@anthropic-ai/sdk';
import db from '../../db';
import { jobRuns, onboardingSteps, risks, actions, milestones, integrations } from '../../db/schema';
import { LOCK_IDS } from '../lock-ids';
import { getActiveProjects } from '../../lib/queries';
import { createRedisConnection } from '../connection';

interface DeliverySnapshot {
  blockedSteps: Array<{ name: string; track: string | null }>;
  openRisks: Array<{ description: string; severity: string | null }>;
  unvalidatedIntegrations: Array<{ tool: string; status: string }>;
  overdueActions: Array<{ description: string; due: string | null }>;
  nextMilestone: { name: string; date: string | null } | null;
}

async function buildDeliverySnapshot(projectId: number): Promise<DeliverySnapshot> {
  // Blocked onboarding steps (ADR + Biggy)
  const blockedSteps = await db
    .select({ name: onboardingSteps.name, track: onboardingSteps.track })
    .from(onboardingSteps)
    .where(and(
      eq(onboardingSteps.project_id, projectId),
      eq(onboardingSteps.status, 'blocked')
    ));

  // Open high/critical risks
  const openRisks = await db
    .select({ description: risks.description, severity: risks.severity })
    .from(risks)
    .where(and(
      eq(risks.project_id, projectId),
      inArray(risks.severity, ['high', 'critical']),
      sql`${risks.status} = 'open'`
    ));

  // Integrations not yet validated or production
  const unvalidatedIntegrations = await db
    .select({ tool: integrations.tool, status: integrations.status })
    .from(integrations)
    .where(and(
      eq(integrations.project_id, projectId),
      sql`${integrations.status} NOT IN ('validated', 'production')`
    ));

  // Actions overdue or due within 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const overdueActions = await db
    .select({ description: actions.description, due: actions.due })
    .from(actions)
    .where(and(
      eq(actions.project_id, projectId),
      sql`${actions.due} IS NOT NULL`,
      eq(actions.status, 'open')
    ));

  // Next upcoming milestone (first by date where status != 'complete')
  const [nextMilestone] = await db
    .select({ name: milestones.name, date: milestones.date })
    .from(milestones)
    .where(and(
      eq(milestones.project_id, projectId),
      sql`${milestones.status} != 'completed'`
    ))
    .orderBy(milestones.date)
    .limit(1);

  return {
    blockedSteps,
    openRisks,
    unvalidatedIntegrations,
    overdueActions,
    nextMilestone: nextMilestone || null,
  };
}

function buildWeeklyFocusPrompt(snapshot: DeliverySnapshot): string {
  let prompt = `You are a professional services delivery advisor. Based on the following project snapshot, provide exactly 3-5 concise priority bullet points for this week. Focus on what requires immediate attention.

PROJECT SNAPSHOT:

`;

  if (snapshot.blockedSteps.length > 0) {
    prompt += `Blocked Onboarding Steps (${snapshot.blockedSteps.length}):\n`;
    snapshot.blockedSteps.forEach(step => {
      prompt += `- ${step.name}${step.track ? ` [${step.track}]` : ''}\n`;
    });
    prompt += '\n';
  }

  if (snapshot.openRisks.length > 0) {
    prompt += `Open High/Critical Risks (${snapshot.openRisks.length}):\n`;
    snapshot.openRisks.forEach(risk => {
      prompt += `- ${risk.description} [${risk.severity || 'unknown'}]\n`;
    });
    prompt += '\n';
  }

  if (snapshot.unvalidatedIntegrations.length > 0) {
    prompt += `Integrations Not Yet Validated (${snapshot.unvalidatedIntegrations.length}):\n`;
    snapshot.unvalidatedIntegrations.forEach(integ => {
      prompt += `- ${integ.tool} [${integ.status}]\n`;
    });
    prompt += '\n';
  }

  if (snapshot.overdueActions.length > 0) {
    prompt += `Overdue or Due This Week (${snapshot.overdueActions.length}):\n`;
    snapshot.overdueActions.forEach(action => {
      prompt += `- ${action.description}${action.due ? ` (${action.due})` : ''}\n`;
    });
    prompt += '\n';
  }

  if (snapshot.nextMilestone) {
    prompt += `Next Milestone:\n`;
    prompt += `- ${snapshot.nextMilestone.name}${snapshot.nextMilestone.date ? ` (ETA: ${snapshot.nextMilestone.date})` : ''}\n\n`;
  }

  prompt += `Provide 3-5 priority bullets for this week. Be concise and actionable. Format as plain text, one bullet per line starting with "- ". No preamble, no conclusion.`;

  return prompt;
}

function parseWeeklyFocusBullets(content: Anthropic.ContentBlock[]): string[] {
  const text = content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');

  const lines = text.split('\n').filter(line => line.trim().length > 0);

  return lines.map(line => {
    // Trim bullet characters (-, *, •) from the start
    return line.trim().replace(/^[-*•]\s*/, '');
  }).filter(line => line.length > 0);
}

export default async function weeklyFocusJob(job: Job): Promise<{ status: string }> {
  // 1. Acquire transaction-scoped advisory lock (auto-releases at transaction end)
  const [row] = await db.execute(
    sql`SELECT pg_try_advisory_xact_lock(${LOCK_IDS.WEEKLY_FOCUS}) AS acquired`
  );
  const acquired = (row as Record<string, unknown>).acquired === true;

  if (!acquired) {
    console.log(`[weekly-focus] skipped: advisory lock ${LOCK_IDS.WEEKLY_FOCUS} held`);
    await db.insert(jobRuns).values({
      job_name: 'weekly-focus',
      status: 'skipped',
      triggered_by: (job.data?.triggeredBy as string) ?? 'scheduled',
      completed_at: new Date(),
    });
    return { status: 'skipped' };
  }

  // 2. Record job start
  const [runRecord] = await db.insert(jobRuns).values({
    job_name: 'weekly-focus',
    status: 'running',
    triggered_by: (job.data?.triggeredBy as string) ?? 'scheduled',
  }).returning({ id: jobRuns.id });

  let redis: Redis | null = null;

  try {
    redis = createRedisConnection();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // 3. Resolve project scope (on-demand: single project; scheduled: all active)
    const projectId = job.data?.projectId as number | undefined;
    const projects = projectId ? [{ id: projectId }] : await getActiveProjects();

    console.log(`[weekly-focus] processing ${projects.length} project(s)`);

    for (const project of projects) {
      console.log(`[weekly-focus] generating focus for project ${project.id}`);

      // 4. Query delivery snapshot
      const snapshot = await buildDeliverySnapshot(project.id);

      // 5. Call Claude — non-streaming (short output)
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: buildWeeklyFocusPrompt(snapshot) }],
      });

      const bullets = parseWeeklyFocusBullets(message.content);
      console.log(`[weekly-focus] project ${project.id}: generated ${bullets.length} bullets`);

      // 6. Cache in Redis with 7-day TTL
      const TTL_7_DAYS = 7 * 24 * 60 * 60;
      await redis.setex(`weekly_focus:${project.id}`, TTL_7_DAYS, JSON.stringify(bullets));
    }

    // 4. Mark completed
    await db.update(jobRuns)
      .set({ status: 'completed', completed_at: new Date() })
      .where(sql`id = ${runRecord.id}`);

    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[weekly-focus] error:', message);
    await db.update(jobRuns)
      .set({ status: 'failed', completed_at: new Date(), error_message: message })
      .where(sql`id = ${runRecord.id}`);
    throw err; // re-throw so BullMQ marks the job as failed in Redis
  } finally {
    // Always close Redis connection to prevent leak
    if (redis) {
      await redis.quit();
    }
  }
}
