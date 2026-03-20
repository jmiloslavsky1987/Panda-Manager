/* server-only omitted — see STATE.md 2026-03-19 01-02 */

import { db } from '../db';
import {
  projects,
  actions,
  risks,
  milestones,
  workstreams,
  engagementHistory,
  keyDecisions,
  stakeholders,
  artifacts,
  outputs,
  tasks,
  planTemplates,
} from '../db/schema';
import { eq, and, inArray, lt, ne, gt, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export type Project = typeof projects.$inferSelect;
export type Action = typeof actions.$inferSelect;
export type Risk = typeof risks.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Workstream = typeof workstreams.$inferSelect;
export type EngagementHistoryRow = typeof engagementHistory.$inferSelect;
export type KeyDecision = typeof keyDecisions.$inferSelect;
export type Stakeholder = typeof stakeholders.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type Output = typeof outputs.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type PlanTemplate = typeof planTemplates.$inferSelect;

export interface ProjectWithHealth extends Project {
  health: 'green' | 'yellow' | 'red';
  overdueActions: number;
  highRisks: number;
  stalledMilestones: number;
}

export interface ActivityItem {
  type: 'output' | 'history';
  label: string;
  date: Date;
  project_id: number | null;
}

export interface DashboardData {
  projects: ProjectWithHealth[];
  recentActivity: ActivityItem[];
  notifications: {
    overdueCount: number;
    approachingGoLive: string[];
  };
}

export interface WorkspaceData {
  workstreams: Workstream[];
  actions: Action[];
  risks: Risk[];
  milestones: Milestone[];
  engagementHistory: EngagementHistoryRow[];
  keyDecisions: KeyDecision[];
  stakeholders: Stakeholder[];
  artifacts: Artifact[];
}

// ─── Helper: Compute health score ────────────────────────────────────────────

async function computeHealth(projectId: number): Promise<{
  health: 'green' | 'yellow' | 'red';
  overdueActions: number;
  highRisks: number;
  stalledMilestones: number;
}> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Count overdue actions: open or in_progress with a real due date that is past today
  // Exclude 'TBD', 'N/A', and other non-date strings by checking format
  const overdueResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(actions)
    .where(
      and(
        eq(actions.project_id, projectId),
        inArray(actions.status, ['open', 'in_progress']),
        // Only real ISO-ish dates: must look like YYYY-MM-DD (10 chars starting with digit)
        sql`length(${actions.due}) >= 10 AND ${actions.due} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'`,
        lt(actions.due, today),
      )
    );
  const overdueActions = overdueResult[0]?.count ?? 0;

  // Count stalled milestones: not completed, created 14+ days ago (no last_updated col)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const stalledResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(milestones)
    .where(
      and(
        eq(milestones.project_id, projectId),
        ne(milestones.status, 'completed'),
        lt(milestones.created_at, fourteenDaysAgo),
      )
    );
  const stalledMilestones = stalledResult[0]?.count ?? 0;

  // Count unresolved high/critical risks
  const highRisksResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(risks)
    .where(
      and(
        eq(risks.project_id, projectId),
        inArray(risks.severity, ['high', 'critical']),
        // status is not 'resolved' or 'closed'
        sql`${risks.status} NOT IN ('resolved', 'closed')`,
      )
    );
  const highRisks = highRisksResult[0]?.count ?? 0;

  // Count workstreams with tracked progress that are critically behind (< 30%)
  // Only workstreams that have had tasks assigned (percent_complete IS NOT NULL) contribute.
  const stalledWorkstreamsResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workstreams)
    .where(
      and(
        eq(workstreams.project_id, projectId),
        sql`${workstreams.percent_complete} IS NOT NULL`,
        sql`${workstreams.percent_complete} < 30`,
      )
    );
  const stalledWorkstreams = stalledWorkstreamsResult[0]?.count ?? 0;
  // Contribute at most 1 point so a single behind team doesn't push to red alone
  const workstreamSignal = stalledWorkstreams > 0 ? 1 : 0;

  const score = overdueActions + stalledMilestones + highRisks + workstreamSignal;
  const health: 'green' | 'yellow' | 'red' =
    score >= 2 ? 'red' : score === 1 ? 'yellow' : 'green';

  return { health, overdueActions, highRisks, stalledMilestones };
}

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * Returns all active projects with computed RAG health score.
 */
export async function getActiveProjects(): Promise<ProjectWithHealth[]> {
  const activeProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.status, 'active'));

  const projectsWithHealth = await Promise.all(
    activeProjects.map(async (p) => {
      const healthData = await computeHealth(p.id);
      return { ...p, ...healthData };
    })
  );

  return projectsWithHealth;
}

/**
 * Returns a single project by id. Throws if not found.
 */
export async function getProjectById(projectId: number): Promise<Project> {
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (result.length === 0) {
    throw new Error(`Project not found: ${projectId}`);
  }

  return result[0];
}

/**
 * Returns a single project with computed RAG health score. Throws if not found.
 */
export async function getProjectWithHealth(projectId: number): Promise<ProjectWithHealth> {
  const project = await getProjectById(projectId);
  const healthData = await computeHealth(projectId);
  return { ...project, ...healthData };
}

/**
 * Returns data needed for the Dashboard page.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const activeProjects = await getActiveProjects();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Recent outputs
  const recentOutputs = await db
    .select()
    .from(outputs)
    .where(gt(outputs.created_at, sevenDaysAgo));

  // Recent engagement history
  const recentHistory = await db
    .select()
    .from(engagementHistory)
    .where(gt(engagementHistory.created_at, sevenDaysAgo));

  const activityItems: ActivityItem[] = [
    ...recentOutputs.map((o) => ({
      type: 'output' as const,
      label: `${o.skill_name} output`,
      date: o.created_at,
      project_id: o.project_id,
    })),
    ...recentHistory.map((h) => ({
      type: 'history' as const,
      label: h.content.slice(0, 80),
      date: h.created_at,
      project_id: h.project_id,
    })),
  ];

  // Sort by date DESC, limit 50
  activityItems.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentActivity = activityItems.slice(0, 50);

  // Notifications
  const overdueCount = activeProjects.reduce(
    (sum, p) => sum + p.overdueActions,
    0
  );

  const today = new Date();
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(today.getDate() + 14);

  const approachingGoLive = activeProjects
    .filter((p) => {
      if (!p.go_live_target) return false;
      // Try parsing — skip TBD/N/A strings
      const d = new Date(p.go_live_target);
      if (isNaN(d.getTime())) return false;
      return d >= today && d <= fourteenDaysFromNow;
    })
    .map((p) => p.customer);

  return {
    projects: activeProjects,
    recentActivity,
    notifications: {
      overdueCount,
      approachingGoLive,
    },
  };
}

/**
 * Returns all workspace tab data for a single project.
 * Sets RLS session variable before parallel queries.
 */
export async function getWorkspaceData(projectId: number): Promise<WorkspaceData> {
  // All queries run inside a transaction so they share one connection.
  // SET LOCAL pins app.current_project_id for the duration of the transaction —
  // safe with connection pooling (pool hands same connection to all tx queries).
  return await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${projectId}`));

    const [
      workstreamsData,
      actionsData,
      risksData,
      milestonesData,
      historyData,
      decisionsData,
      stakeholdersData,
      artifactsData,
    ] = await Promise.all([
      tx.select().from(workstreams).where(eq(workstreams.project_id, projectId)),
      tx.select().from(actions).where(eq(actions.project_id, projectId)),
      tx.select().from(risks).where(eq(risks.project_id, projectId)),
      tx.select().from(milestones).where(eq(milestones.project_id, projectId)),
      tx.select().from(engagementHistory).where(eq(engagementHistory.project_id, projectId)),
      tx.select().from(keyDecisions).where(eq(keyDecisions.project_id, projectId)),
      tx.select().from(stakeholders).where(eq(stakeholders.project_id, projectId)),
      tx.select().from(artifacts).where(eq(artifacts.project_id, projectId)),
    ]);

    return {
      workstreams: workstreamsData,
      actions: actionsData,
      risks: risksData,
      milestones: milestonesData,
      engagementHistory: historyData,
      keyDecisions: decisionsData,
      stakeholders: stakeholdersData,
      artifacts: artifactsData,
    };
  });
}

/**
 * Returns all tasks for a project, ordered by created_at.
 * Includes blocked_by, milestone_id, start_date from Phase 3 migration.
 */
export async function getTasksForProject(projectId: number): Promise<Task[]> {
  return db.select().from(tasks).where(eq(tasks.project_id, projectId))
    .orderBy(tasks.created_at)
}

/**
 * Returns workstreams for a project with percent_complete.
 * Used by progress rollup (PLAN-09).
 */
export async function getWorkstreamsWithProgress(projectId: number): Promise<Workstream[]> {
  return db.select().from(workstreams).where(eq(workstreams.project_id, projectId))
}

/**
 * Updates workstream percent_complete based on completed task ratio.
 * Called after any task status change. PLAN-09 progress rollup.
 * percent_complete = (completed tasks / total tasks) * 100, rounded.
 */
export async function updateWorkstreamProgress(workstreamId: number): Promise<void> {
  const allTasks = await db.select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.workstream_id, workstreamId))

  if (allTasks.length === 0) return

  const completed = allTasks.filter(t => t.status === 'done' || t.status === 'completed').length
  const pct = Math.round((completed / allTasks.length) * 100)

  await db.update(workstreams)
    .set({ percent_complete: pct })
    .where(eq(workstreams.id, workstreamId))
}

/**
 * Returns all plan templates (for PLAN-08 template instantiation).
 */
export async function getPlanTemplates(): Promise<PlanTemplate[]> {
  return db.select().from(planTemplates)
}
