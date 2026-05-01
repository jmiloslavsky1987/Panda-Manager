/* server-only omitted — see STATE.md 2026-03-19 01-02 */

import db from '../db';
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
  knowledgeBase,
  businessOutcomes,
  e2eWorkflows,
  workflowSteps,
  focusAreas,
  architectureIntegrations,
  beforeState,
  teamOnboardingStatus,
  teamPathways,
  auditLog,
  wbsItems,
  wbsTaskAssignments,
  archTracks,
  archNodes,
  archTeamStatus,
  onboardingPhases,
  projectMembers,
} from '../db/schema';
import { eq, and, inArray, ne, gt, or, desc, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { skillRuns } from '../db/schema';

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
export type WbsItem = typeof wbsItems.$inferSelect;
export type ArchTrack = typeof archTracks.$inferSelect;
export type ArchNode = typeof archNodes.$inferSelect;
export type ArchTeamStatus = typeof archTeamStatus.$inferSelect;

export interface ProjectQueryOpts {
  userId?: string;
  isGlobalAdmin?: boolean;
}

export interface ProjectWithHealth extends Project {
  health: 'green' | 'yellow' | 'red';
  overdueActions: number;
  highRisks: number;
  stalledMilestones: number;
  stalledWorkstreams: number;
  // Phase 14 analytics:
  velocityWeeks: number[];       // [oldest, ..., newest] — 4 elements
  actionTrend: 'up' | 'flat' | 'down';
  openRiskCount: number;
  riskTrend: 'up' | 'flat' | 'down';
  // KPI strip fields (computed in getProjectWithHealth, optional elsewhere):
  currentPhase?: string | null;
  percentComplete?: number | null;
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

// ─── Helper: Compute trend direction ─────────────────────────────────────────

function computeTrend(current: number, prior: number): 'up' | 'flat' | 'down' {
  const diff = current - prior;
  if (Math.abs(diff) <= 1) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

// ─── Helper: Compute project analytics (Phase 14) ────────────────────────────

export async function computeProjectAnalytics(projectId: number): Promise<{
  velocityWeeks: number[];
  actionTrend: 'up' | 'flat' | 'down';
  openRiskCount: number;
  riskTrend: 'up' | 'flat' | 'down';
}> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${projectId}`));

    // ── Velocity: completed actions per week over last 4 weeks ──────────────
    const velocityRows = await tx.execute<{ week_start: string; count: number }>(
      sql`
        SELECT
          date_trunc('week', created_at)::date::text AS week_start,
          count(*)::int AS count
        FROM actions
        WHERE project_id = ${projectId}
          AND status = 'completed'
          AND created_at >= now() - interval '4 weeks'
        GROUP BY week_start
        ORDER BY week_start ASC
      `
    );

    // Build lookup from SQL results
    const lookup = new Map<string, number>();
    for (const row of velocityRows) {
      lookup.set(row.week_start, Number(row.count));
    }

    // Generate 4 expected week-start dates (Monday of each of last 4 weeks)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysToMonday = (dayOfWeek + 6) % 7;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysToMonday);
    thisMonday.setHours(0, 0, 0, 0);

    const velocityWeeks: number[] = [];
    // oldest first: -3w, -2w, -1w, current
    for (let i = 3; i >= 0; i--) {
      const slotDate = new Date(thisMonday);
      slotDate.setDate(thisMonday.getDate() - i * 7);
      const key = slotDate.toISOString().split('T')[0]; // YYYY-MM-DD
      velocityWeeks.push(lookup.get(key) ?? 0);
    }

    // actionTrend: compare current week vs prior week
    const currentWeek = velocityWeeks[3] ?? 0;
    const priorWeek = velocityWeeks[2] ?? 0;
    const actionTrend = computeTrend(currentWeek, priorWeek);

    // ── Open risk count (now) ───────────────────────────────────────────────
    const openNowRows = await tx.execute<{ count: number }>(
      sql`
        SELECT count(*)::int AS count
        FROM risks
        WHERE project_id = ${projectId}
          AND status NOT IN ('resolved', 'accepted')
      `
    );
    const openRiskCount = Number(openNowRows[0]?.count ?? 0);

    // ── Open risk count (last week: created before 7 days ago, still open) ──
    const openLastWeekRows = await tx.execute<{ count: number }>(
      sql`
        SELECT count(*)::int AS count
        FROM risks
        WHERE project_id = ${projectId}
          AND status NOT IN ('resolved', 'accepted')
          AND created_at < now() - interval '7 days'
      `
    );
    const openLastWeek = Number(openLastWeekRows[0]?.count ?? 0);

    const riskTrend = computeTrend(openRiskCount, openLastWeek);

    return { velocityWeeks, actionTrend, openRiskCount, riskTrend };
  });
}

// ─── Helper: Compute health score ────────────────────────────────────────────

async function computeHealth(projectId: number): Promise<{
  health: 'green' | 'yellow' | 'red';
  overdueActions: number;
  highRisks: number;
  stalledMilestones: number;
  stalledWorkstreams: number;
}> {
  // Mirror the HealthDashboard formula exactly so sidebar dot and dashboard always agree.
  // Formula: any open critical risk → red; any open high risk OR overdue milestone → yellow; else green.

  // Open critical risks
  const criticalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(risks)
    .where(and(
      eq(risks.project_id, projectId),
      eq(risks.severity, 'critical'),
      eq(risks.status, 'open'),
    ));
  const criticalRisks = criticalResult[0]?.count ?? 0;

  // Open high risks
  const highRisksResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(risks)
    .where(and(
      eq(risks.project_id, projectId),
      eq(risks.severity, 'high'),
      eq(risks.status, 'open'),
    ));
  const highRisks = highRisksResult[0]?.count ?? 0;

  // Overdue milestones: not complete, parseable ISO date in the past
  const overdueMilestonesResult = await db.execute<{ count: string | number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM milestones
    WHERE project_id = ${projectId}
      AND (status IS NULL OR status != 'complete')
      AND date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND date::date < CURRENT_DATE
  `);
  const overdueMilestones = Number(Array.from(overdueMilestonesResult)[0]?.count ?? 0);

  const health: 'green' | 'yellow' | 'red' =
    criticalRisks > 0 ? 'red'
    : (highRisks > 0 || overdueMilestones > 0) ? 'yellow'
    : 'green';

  return { health, overdueActions: 0, highRisks: highRisks + criticalRisks, stalledMilestones: overdueMilestones, stalledWorkstreams: 0 };
}

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * Returns all active and draft projects with computed RAG health score.
 * Draft projects with no data return neutral health (green, all counts 0).
 */
export async function getActiveProjects(opts?: ProjectQueryOpts): Promise<ProjectWithHealth[]> {
  let activeProjects;

  if (!opts?.userId || opts.isGlobalAdmin) {
    // Global admin or unauthenticated: return all active/draft projects
    activeProjects = await db
      .select()
      .from(projects)
      .where(inArray(projects.status, ['active', 'draft']));
  } else {
    // Membership filter: subquery approach (avoids row multiplication from M:N join)
    activeProjects = await db
      .select()
      .from(projects)
      .where(
        and(
          inArray(projects.status, ['active', 'draft']),
          inArray(
            projects.id,
            db.select({ id: projectMembers.project_id })
              .from(projectMembers)
              .where(eq(projectMembers.user_id, opts.userId))
          )
        )
      );
  }

  const projectsWithHealth = [];
  for (const p of activeProjects) {
    const healthData = await computeHealth(p.id);
    const analyticsData = await computeProjectAnalytics(p.id);
    projectsWithHealth.push({ ...p, ...healthData, ...analyticsData });
  }

  return projectsWithHealth;
}

/**
 * Returns archived projects (no health computation needed — sidebar display only).
 * No RBAC filter — archived view is admin/full-access only in UI layer.
 */
export async function getArchivedProjects(): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.status, 'archived'));
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
  const analyticsData = await computeProjectAnalytics(projectId);

  const [onboardingRows, workstreamRows] = await Promise.all([
    db.select({ name: onboardingPhases.name })
      .from(onboardingPhases)
      .where(eq(onboardingPhases.project_id, projectId))
      .limit(1),
    db.select({ percent_complete: workstreams.percent_complete })
      .from(workstreams)
      .where(eq(workstreams.project_id, projectId)),
  ]);

  const currentPhase = onboardingRows[0]?.name ?? null;
  const workstreamsWithProgress = workstreamRows.filter(w => w.percent_complete !== null);
  const percentComplete = workstreamsWithProgress.length > 0
    ? Math.round(
        workstreamsWithProgress.reduce((sum, w) => sum + (w.percent_complete ?? 0), 0) /
        workstreamsWithProgress.length
      )
    : null;

  return { ...project, ...healthData, ...analyticsData, currentPhase, percentComplete };
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
 * Extends Task with computed fields:
 * - is_blocked: true when blocked_by != null AND the blocking task's status != 'done'
 * - milestone_name: the linked milestone's name, or null if no milestone is set
 */
export interface TaskWithBlockedStatus extends Task {
  is_blocked: boolean
  milestone_name: string | null
}

/**
 * Returns all tasks for a project, ordered by created_at.
 * Includes blocked_by, milestone_id, start_date from Phase 3 migration.
 * Each task has:
 *   - is_blocked: true when blocked_by != null and the blocking task's status != 'done'
 *   - milestone_name: left-joined from milestones table (null when milestone_id is null)
 */
export async function getTasksForProject(projectId: number): Promise<TaskWithBlockedStatus[]> {
  const rows = await db
    .select({
      // All task columns
      id: tasks.id,
      project_id: tasks.project_id,
      workstream_id: tasks.workstream_id,
      title: tasks.title,
      description: tasks.description,
      owner: tasks.owner,
      owner_id: tasks.owner_id,
      due: tasks.due,
      start_date: tasks.start_date,
      priority: tasks.priority,
      type: tasks.type,
      phase: tasks.phase,
      status: tasks.status,
      blocked_by: tasks.blocked_by,
      milestone_id: tasks.milestone_id,
      source: tasks.source,
      source_artifact_id: tasks.source_artifact_id,
      ingested_at: tasks.ingested_at,
      created_at: tasks.created_at,
      // Left-joined milestone name
      milestone_name: milestones.name,
    })
    .from(tasks)
    .leftJoin(milestones, eq(tasks.milestone_id, milestones.id))
    .where(eq(tasks.project_id, projectId))
    .orderBy(tasks.created_at)

  // Build id→status map for blocked_by resolution
  const statusMap = new Map(rows.map(t => [t.id, t.status]))

  return rows.map(t => ({
    ...t,
    milestone_name: t.milestone_name ?? null,
    is_blocked: t.blocked_by !== null &&
      (statusMap.get(t.blocked_by) ?? 'done') !== 'done',
  }))
}

/**
 * Returns all milestones for a project, ordered by created_at.
 * Used by the Gantt page to pass milestone markers to GanttChart (GNTT-01, GNTT-03).
 * Note: milestone.date is TEXT ('TBD', '2026-Q3', or ISO date) — callers must filter for renderable dates.
 */
export async function getMilestonesForProject(projectId: number): Promise<Milestone[]> {
  return db.select().from(milestones).where(eq(milestones.project_id, projectId))
    .orderBy(milestones.created_at)
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

export type SkillRun = typeof skillRuns.$inferSelect;

/**
 * Get recent skill runs for a project (for Skills tab Recent Runs section).
 */
export async function getSkillRuns(projectId: number, limit = 10): Promise<SkillRun[]> {
  return db
    .select()
    .from(skillRuns)
    .where(eq(skillRuns.project_id, projectId))
    .orderBy(desc(skillRuns.created_at))
    .limit(limit);
}

/**
 * Get the latest completed morning briefing output for the Dashboard panel.
 * Returns null if no completed morning briefing exists.
 */
export async function getLatestMorningBriefing(): Promise<SkillRun | null> {
  const [row] = await db
    .select()
    .from(skillRuns)
    .where(
      and(
        eq(skillRuns.skill_name, 'morning-briefing'),
        eq(skillRuns.status, 'completed')
      )
    )
    .orderBy(desc(skillRuns.completed_at))
    .limit(1);
  return row ?? null;
}

// ─── Full-Text Search ─────────────────────────────────────────────────────────

export interface SearchResult {
  id: number;
  table: string;        // 'actions' | 'risks' | 'key_decisions' | 'engagement_history' | 'stakeholders' | 'tasks' | 'artifacts' | 'knowledge_base' | 'onboarding_steps' | 'onboarding_phases' | 'integrations' | 'time_entries'
  section: string;      // human-readable: 'Actions' | 'Risks' | ...
  project_id: number | null;
  project_name: string; // project.name, or 'Knowledge Base' for null project_id
  customer: string;     // project.customer, or '' for null project_id
  date: string | null;
  title: string;        // primary text field
  snippet: string;      // secondary text, truncated to 200 chars
}

/**
 * Full-text search across all 12 project data tables using PostgreSQL tsvector/tsquery.
 *
 * Filters:
 *   - q:       Required, min 2 chars — used with plainto_tsquery
 *   - account: Case-insensitive ILIKE match on projects.customer
 *   - type:    Exact table name match (e.g. 'actions', 'risks')
 *   - from/to: ISO date strings — inclusive bounds on the table's primary date field
 *
 * Returns up to 100 results ordered by date DESC.
 * Archived/closed projects excluded (status IN active, draft) except knowledge_base entries
 * with null project_id which are always included (KB-03 spec).
 */
export async function searchAllRecords(params: {
  q: string;
  account?: string;
  projectId?: number;
  type?: string;
  from?: string;
  to?: string;
}): Promise<SearchResult[]> {
  const { q, account, projectId, type, from, to } = params;

  // Guard: no full-table scans on empty / single-char queries
  if (!q || q.trim().length < 2) return [];

  // Sanitize: replace single quotes to prevent SQL injection in raw template
  const safeQ = q.replace(/'/g, "''");
  const safeAccount = account ? account.replace(/'/g, "''") : null;

  // Build individual UNION arms. Each arm returns the same 9-column shape.
  // Arms are omitted when type filter is set and doesn't match.
  const arms: string[] = [];

  // Helper: wrap a value so it appears as a SQL literal
  function dateBounds(dateCol: string): string {
    const parts: string[] = [];
    if (from) parts.push(`${dateCol} >= '${from.replace(/'/g, "''")}'`);
    if (to)   parts.push(`${dateCol} <= '${to.replace(/'/g, "''")}'`);
    return parts.length ? ' AND ' + parts.join(' AND ') : '';
  }

  function accountFilter(customerCol: string): string {
    return safeAccount ? ` AND ${customerCol} ILIKE '%${safeAccount}%'` : '';
  }

  function projectFilter(col: string): string {
    return projectId ? ` AND ${col} = ${projectId}` : '';
  }

  // ─── 1. actions ───────────────────────────────────────────────────────────
  if (!type || type === 'actions') {
    arms.push(`
      SELECT
        a.id,
        'actions'::text AS "table",
        'Actions'::text AS section,
        a.project_id,
        p.name AS project_name,
        p.customer,
        a.due AS date,
        a.description AS title,
        SUBSTRING(COALESCE(a.notes, ''), 1, 200) AS snippet
      FROM actions a
      JOIN projects p ON p.id = a.project_id
      WHERE p.status IN ('active', 'draft')
        AND a.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('a.project_id')}
        ${dateBounds('a.due')}
    `);
  }

  // ─── 2. risks ─────────────────────────────────────────────────────────────
  if (!type || type === 'risks') {
    arms.push(`
      SELECT
        r.id,
        'risks'::text AS "table",
        'Risks'::text AS section,
        r.project_id,
        p.name AS project_name,
        p.customer,
        r.last_updated AS date,
        r.description AS title,
        SUBSTRING(COALESCE(r.mitigation, ''), 1, 200) AS snippet
      FROM risks r
      JOIN projects p ON p.id = r.project_id
      WHERE p.status IN ('active', 'draft')
        AND r.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('r.project_id')}
        ${dateBounds('r.last_updated')}
    `);
  }

  // ─── 3. key_decisions ─────────────────────────────────────────────────────
  if (!type || type === 'key_decisions') {
    arms.push(`
      SELECT
        kd.id,
        'key_decisions'::text AS "table",
        'Key Decisions'::text AS section,
        kd.project_id,
        p.name AS project_name,
        p.customer,
        kd.date AS date,
        kd.decision AS title,
        SUBSTRING(COALESCE(kd.context, ''), 1, 200) AS snippet
      FROM key_decisions kd
      JOIN projects p ON p.id = kd.project_id
      WHERE p.status IN ('active', 'draft')
        AND kd.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('kd.project_id')}
        ${dateBounds('kd.date')}
    `);
  }

  // ─── 4. engagement_history ────────────────────────────────────────────────
  if (!type || type === 'engagement_history') {
    arms.push(`
      SELECT
        eh.id,
        'engagement_history'::text AS "table",
        'Engagement History'::text AS section,
        eh.project_id,
        p.name AS project_name,
        p.customer,
        eh.date AS date,
        SUBSTRING(eh.content, 1, 120) AS title,
        SUBSTRING(eh.content, 1, 200) AS snippet
      FROM engagement_history eh
      JOIN projects p ON p.id = eh.project_id
      WHERE p.status IN ('active', 'draft')
        AND eh.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('eh.project_id')}
        ${dateBounds('eh.date')}
    `);
  }

  // ─── 5. stakeholders ──────────────────────────────────────────────────────
  if (!type || type === 'stakeholders') {
    arms.push(`
      SELECT
        s.id,
        'stakeholders'::text AS "table",
        'Stakeholders'::text AS section,
        s.project_id,
        p.name AS project_name,
        p.customer,
        NULL::text AS date,
        s.name AS title,
        SUBSTRING(COALESCE(s.role, '') || ' ' || COALESCE(s.notes, ''), 1, 200) AS snippet
      FROM stakeholders s
      JOIN projects p ON p.id = s.project_id
      WHERE p.status IN ('active', 'draft')
        AND s.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('s.project_id')}
    `);
  }

  // ─── 6. tasks ─────────────────────────────────────────────────────────────
  if (!type || type === 'tasks') {
    arms.push(`
      SELECT
        t.id,
        'tasks'::text AS "table",
        'Tasks'::text AS section,
        t.project_id,
        p.name AS project_name,
        p.customer,
        t.due AS date,
        t.title AS title,
        SUBSTRING(COALESCE(t.description, ''), 1, 200) AS snippet
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.status IN ('active', 'draft')
        AND t.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('t.project_id')}
        ${dateBounds('t.due')}
    `);
  }

  // ─── 7. artifacts ─────────────────────────────────────────────────────────
  if (!type || type === 'artifacts') {
    arms.push(`
      SELECT
        a.id,
        'artifacts'::text AS "table",
        'Artifacts'::text AS section,
        a.project_id,
        p.name AS project_name,
        p.customer,
        NULL::text AS date,
        a.name AS title,
        SUBSTRING(COALESCE(a.description, ''), 1, 200) AS snippet
      FROM artifacts a
      JOIN projects p ON p.id = a.project_id
      WHERE p.status IN ('active', 'draft')
        AND a.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('a.project_id')}
    `);
  }

  // ─── 8. knowledge_base ────────────────────────────────────────────────────
  // KB-03: entries with null project_id are always included (cross-project knowledge).
  // Entries from archived projects remain searchable (KB-03 spec).
  // Account filter only applies when project_id IS NOT NULL.
  if (!type || type === 'knowledge_base') {
    const kbAccountFilter = safeAccount
      ? ` AND (kb.project_id IS NULL OR p2.customer ILIKE '%${safeAccount}%')`
      : '';
    const kbProjectFilter = projectId
      ? ` AND (kb.project_id IS NULL OR kb.project_id = ${projectId})`
      : '';
    const kbDateBounds = dateBounds('kb.linked_date');

    arms.push(`
      SELECT
        kb.id,
        'knowledge_base'::text AS "table",
        'Knowledge Base'::text AS section,
        kb.project_id,
        COALESCE(p2.name, 'Knowledge Base') AS project_name,
        COALESCE(p2.customer, '') AS customer,
        kb.linked_date AS date,
        kb.title AS title,
        SUBSTRING(kb.content, 1, 200) AS snippet
      FROM knowledge_base kb
      LEFT JOIN projects p2 ON p2.id = kb.project_id
      WHERE kb.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${kbAccountFilter}
        ${kbProjectFilter}
        ${kbDateBounds}
    `);
  }

  // ─── 9. onboarding_steps ──────────────────────────────────────────────────
  if (!type || type === 'onboarding_steps') {
    arms.push(`
      SELECT
        os.id,
        'onboarding_steps'::text AS "table",
        'Onboarding Steps'::text AS section,
        os.project_id,
        p.name AS project_name,
        p.customer,
        os.updated_at::text AS date,
        os.name AS title,
        SUBSTRING(COALESCE(os.owner, ''), 1, 200) AS snippet
      FROM onboarding_steps os
      JOIN projects p ON p.id = os.project_id
      WHERE p.status IN ('active', 'draft')
        AND os.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('os.project_id')}
        ${dateBounds("to_char(os.updated_at, 'YYYY-MM-DD')")}
    `);
  }

  // ─── 10. onboarding_phases ────────────────────────────────────────────────
  if (!type || type === 'onboarding_phases') {
    arms.push(`
      SELECT
        op.id,
        'onboarding_phases'::text AS "table",
        'Onboarding Phases'::text AS section,
        op.project_id,
        p.name AS project_name,
        p.customer,
        op.created_at::text AS date,
        op.name AS title,
        ''::text AS snippet
      FROM onboarding_phases op
      JOIN projects p ON p.id = op.project_id
      WHERE p.status IN ('active', 'draft')
        AND op.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('op.project_id')}
        ${dateBounds("to_char(op.created_at, 'YYYY-MM-DD')")}
    `);
  }

  // ─── 11. integrations ─────────────────────────────────────────────────────
  if (!type || type === 'integrations') {
    arms.push(`
      SELECT
        i.id,
        'integrations'::text AS "table",
        'Integrations'::text AS section,
        i.project_id,
        p.name AS project_name,
        p.customer,
        i.updated_at::text AS date,
        i.tool AS title,
        SUBSTRING(COALESCE(i.notes, ''), 1, 200) AS snippet
      FROM integrations i
      JOIN projects p ON p.id = i.project_id
      WHERE p.status IN ('active', 'draft')
        AND i.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('i.project_id')}
        ${dateBounds("to_char(i.updated_at, 'YYYY-MM-DD')")}
    `);
  }

  // ─── 12. time_entries ─────────────────────────────────────────────────────
  if (!type || type === 'time_entries') {
    arms.push(`
      SELECT
        te.id,
        'time_entries'::text AS "table",
        'Time Entries'::text AS section,
        te.project_id,
        p.name AS project_name,
        p.customer,
        te.date AS date,
        te.description AS title,
        ''::text AS snippet
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      WHERE p.status IN ('active', 'draft')
        AND te.search_vec @@ plainto_tsquery('english', '${safeQ}')
        ${accountFilter('p.customer')}
        ${projectFilter('te.project_id')}
        ${dateBounds('te.date')}
    `);
  }

  if (arms.length === 0) return [];

  const unionQuery = arms.join('\nUNION ALL\n');
  const finalQuery = `
    SELECT * FROM (
      ${unionQuery}
    ) combined
    ORDER BY date DESC NULLS LAST
    LIMIT 100
  `;

  const rows = await db.execute(sql.raw(finalQuery));

  return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: Number(row.id),
    table: String(row.table),
    section: String(row.section),
    project_id: row.project_id != null ? Number(row.project_id) : null,
    project_name: String(row.project_name ?? ''),
    customer: String(row.customer ?? ''),
    date: row.date != null ? String(row.date) : null,
    title: String(row.title ?? ''),
    snippet: String(row.snippet ?? ''),
  }));
}

// ─── Teams Tab Types ──────────────────────────────────────────────────────────

export type BusinessOutcome = typeof businessOutcomes.$inferSelect;
export type E2eWorkflow = typeof e2eWorkflows.$inferSelect;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type FocusArea = typeof focusAreas.$inferSelect;
export type ArchitectureIntegration = typeof architectureIntegrations.$inferSelect;
// ArchitectureIntegration: { id, project_id, tool_name, track, phase, integration_group, status, integration_method, notes, created_at }
// track: 'ADR' | 'Biggy'; status: 'live' | 'in_progress' | 'pilot' | 'planned'

export interface E2eWorkflowWithSteps extends E2eWorkflow {
  steps: WorkflowStep[];
}

// OpenAction: a subset of the actions row — only what TeamsEngagementSection needs for display.
// actions table has NO team field; open actions are shown as project-level open items, not per-team.
export interface OpenAction {
  id: number;
  description: string;  // the plain-text item label (no ticket IDs rendered in UI)
  owner: string | null;
  status: string;
}

export interface TeamsTabData {
  businessOutcomes: BusinessOutcome[];
  e2eWorkflows: E2eWorkflowWithSteps[];
  focusAreas: FocusArea[];
  architectureIntegrations: ArchitectureIntegration[];
  openActions: OpenAction[];  // open + in_progress actions for the project, sorted by id asc
  teamOnboardingStatus: TeamOnboardingStatus[];
  stakeholders: Stakeholder[];
}

// ─── Teams Tab Query ──────────────────────────────────────────────────────────

/**
 * Returns all data needed for the Teams tab page (RSC call).
 * Fetches business outcomes, e2e workflows with nested steps, focus areas,
 * architecture integrations (for the Architecture Overview section),
 * and open/in_progress actions (for the Teams & Engagement Status section).
 */
export async function getTeamsTabData(projectId: number): Promise<TeamsTabData> {
  const [outcomes, workflows, steps, areas, archIntegrations, openActs, onboardingRows, stakeholderRows] = await Promise.all([
    db.select().from(businessOutcomes).where(eq(businessOutcomes.project_id, projectId)),
    db.select().from(e2eWorkflows).where(eq(e2eWorkflows.project_id, projectId)),
    db.select().from(workflowSteps)
      .innerJoin(e2eWorkflows, eq(workflowSteps.workflow_id, e2eWorkflows.id))
      .where(eq(e2eWorkflows.project_id, projectId))
      .orderBy(asc(workflowSteps.position)),
    db.select().from(focusAreas).where(eq(focusAreas.project_id, projectId)),
    db.select().from(architectureIntegrations).where(eq(architectureIntegrations.project_id, projectId)),
    // Open actions: status is 'open' or 'in_progress' (not 'completed' or 'cancelled').
    // actions has no team field — all open actions are returned for client-side display.
    db.select({
      id: actions.id,
      description: actions.description,
      owner: actions.owner,
      status: actions.status,
    }).from(actions).where(
      and(
        eq(actions.project_id, projectId),
        inArray(actions.status, ['open', 'in_progress'])
      )
    ).orderBy(asc(actions.id)),
    db.select().from(teamOnboardingStatus).where(eq(teamOnboardingStatus.project_id, projectId)).orderBy(asc(teamOnboardingStatus.team_name)),
    db.select().from(stakeholders).where(eq(stakeholders.project_id, projectId)).orderBy(asc(stakeholders.name)),
  ]);

  const stepsMap = new Map<number, WorkflowStep[]>();
  for (const row of steps) {
    const wfId = row.workflow_steps.workflow_id;
    if (!stepsMap.has(wfId)) stepsMap.set(wfId, []);
    stepsMap.get(wfId)!.push(row.workflow_steps);
  }

  return {
    businessOutcomes: outcomes,
    e2eWorkflows: workflows.map(wf => ({ ...wf, steps: stepsMap.get(wf.id) ?? [] })),
    focusAreas: areas,
    architectureIntegrations: archIntegrations,
    openActions: openActs,
    teamOnboardingStatus: onboardingRows,
    stakeholders: stakeholderRows,
  };
}

// ─── Architecture Tab Types ───────────────────────────────────────────────────

export type BeforeState = typeof beforeState.$inferSelect;
export type TeamOnboardingStatus = typeof teamOnboardingStatus.$inferSelect;
export type TeamPathway = typeof teamPathways.$inferSelect;

export interface ArchTabData {
  architectureIntegrations: ArchitectureIntegration[];
  beforeState: BeforeState | null;
  teamOnboardingStatus: TeamOnboardingStatus[];
  teamPathways: TeamPathway[];
}

// ─── Architecture Tab Query ───────────────────────────────────────────────────

/**
 * Returns all data needed for the Architecture tab page (RSC call).
 * Fetches architecture integrations, before-state (single row or null),
 * and team onboarding status rows for the project.
 */
export async function getArchTabData(projectId: number): Promise<ArchTabData> {
  const [integrations, beforeStateRows, onboardingRows, pathwaysRows] = await Promise.all([
    db.select().from(architectureIntegrations)
      .where(eq(architectureIntegrations.project_id, projectId))
      .orderBy(asc(architectureIntegrations.phase), asc(architectureIntegrations.tool_name)),
    db.select().from(beforeState).where(eq(beforeState.project_id, projectId)).limit(1),
    db.select().from(teamOnboardingStatus)
      .where(eq(teamOnboardingStatus.project_id, projectId))
      .orderBy(asc(teamOnboardingStatus.team_name)),
    db.select().from(teamPathways)
      .where(eq(teamPathways.project_id, projectId))
      .orderBy(asc(teamPathways.team_name)),
  ]);
  return {
    architectureIntegrations: integrations,
    beforeState: beforeStateRows[0] ?? null,
    teamOnboardingStatus: onboardingRows,
    teamPathways: pathwaysRows,
  };
}

// ─── Extracted Entities Query (ARTF-01) ──────────────────────────────────────

export interface ExtractedEntities {
  risks: Risk[]
  actions: Action[]
  milestones: Milestone[]
  decisions: KeyDecision[]
}

/**
 * Returns all entities extracted from a specific artifact.
 * Used by the "Extracted Entities" tab in ArtifactEditModal (ARTF-01).
 */
export async function getEntitiesExtractedFromArtifact(artifactId: number): Promise<ExtractedEntities> {
  const [extractedRisks, extractedActions, extractedMilestones, extractedDecisions] = await Promise.all([
    db.select().from(risks).where(eq(risks.source_artifact_id, artifactId)),
    db.select().from(actions).where(eq(actions.source_artifact_id, artifactId)),
    db.select().from(milestones).where(eq(milestones.source_artifact_id, artifactId)),
    db.select().from(keyDecisions).where(eq(keyDecisions.source_artifact_id, artifactId)),
  ])
  return {
    risks: extractedRisks,
    actions: extractedActions,
    milestones: extractedMilestones,
    decisions: extractedDecisions,
  }
}

// ─── Audit Log Query (HIST-01) ───────────────────────────────────────────────

export interface AuditLogEntry {
  id: number
  entity_type: string
  entity_id: number
  external_id: string | null
  action: string
  actor_id: string | null
  before_json: Record<string, any> | null
  after_json: Record<string, any> | null
  created_at: Date
  [key: string]: unknown
}

/**
 * Returns audit log entries for all entities belonging to a project.
 * Joins to each entity type to filter by project_id (audit_log has no direct project_id column).
 */
export async function getAuditLogForProject(projectId: number): Promise<AuditLogEntry[]> {
  const results = await db.execute<AuditLogEntry>(sql`
    SELECT
      a.id,
      a.entity_type,
      a.entity_id,
      a.action,
      a.actor_id,
      a.before_json,
      a.after_json,
      a.created_at,
      CASE
        WHEN a.entity_type = 'risks' THEN r.external_id
        WHEN a.entity_type = 'actions' THEN ac.external_id
        WHEN a.entity_type = 'milestones' THEN m.external_id
        WHEN a.entity_type = 'tasks' THEN CAST(t.id AS TEXT)
        WHEN a.entity_type = 'stakeholders' THEN CAST(s.id AS TEXT)
        WHEN a.entity_type = 'artifacts' THEN CAST(art.id AS TEXT)
        WHEN a.entity_type = 'decisions' THEN CAST(kd.id AS TEXT)
        ELSE NULL
      END as external_id
    FROM audit_log a
    LEFT JOIN risks r ON a.entity_type = 'risks' AND a.entity_id = r.id
    LEFT JOIN actions ac ON a.entity_type = 'actions' AND a.entity_id = ac.id
    LEFT JOIN milestones m ON a.entity_type = 'milestones' AND a.entity_id = m.id
    LEFT JOIN tasks t ON a.entity_type = 'tasks' AND a.entity_id = t.id
    LEFT JOIN stakeholders s ON a.entity_type = 'stakeholders' AND a.entity_id = s.id
    LEFT JOIN artifacts art ON a.entity_type = 'artifacts' AND a.entity_id = art.id
    LEFT JOIN key_decisions kd ON a.entity_type = 'decisions' AND a.entity_id = kd.id
    WHERE
      (r.project_id = ${projectId} OR
       ac.project_id = ${projectId} OR
       m.project_id = ${projectId} OR
       t.project_id = ${projectId} OR
       s.project_id = ${projectId} OR
       art.project_id = ${projectId} OR
       kd.project_id = ${projectId})
    ORDER BY a.created_at DESC
  `)

  return results as AuditLogEntry[]
}

// ─── Audit Diff Computation (HIST-01) ────────────────────────────────────────

const AUDIT_SYSTEM_FIELDS = new Set([
  'id', 'project_id', 'created_at', 'updated_at', 'external_id',
  'source_artifact_id', 'source', 'discovery_source', 'tsvector',
])

/**
 * Computes human-readable field-level diff from audit log before/after JSON.
 * Returns "Created" if before is null, "Deleted" if after is null,
 * otherwise returns changed fields as "field: oldVal → newVal, ..."
 * System fields are excluded from the diff.
 */
export function computeAuditDiff(
  before: Record<string, any> | null,
  after: Record<string, any> | null
): string {
  if (!before) return 'Created'
  if (!after) return 'Deleted'

  const changes: string[] = []
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    if (AUDIT_SYSTEM_FIELDS.has(key)) continue
    if (before[key] !== after[key]) {
      changes.push(`${key}: ${before[key] ?? 'null'} → ${after[key] ?? 'null'}`)
    }
  }

  return changes.length > 0 ? changes.join(', ') : 'No changes'
}

// ─── v6.0 Queries ─────────────────────────────────────────────────────────────

/**
 * Returns WBS items for a project filtered by track, ordered by level then display_order.
 * Used by Phase 47 WBS UI to render hierarchical task structures.
 */
export async function getWbsItems(projectId: number, track: string): Promise<WbsItem[]> {
  return db
    .select()
    .from(wbsItems)
    .where(and(eq(wbsItems.project_id, projectId), eq(wbsItems.track, track)))
    .orderBy(asc(wbsItems.level), asc(wbsItems.display_order));
}

/**
 * Returns WBS-to-task assignments for a project across all tracks.
 * Used by Phase 68 Gantt WBS row model to group tasks under their WBS parents.
 */
export async function getWbsTaskAssignments(
  projectId: number
): Promise<Array<{ wbs_item_id: number; task_id: number }>> {
  return db
    .select({
      wbs_item_id: wbsTaskAssignments.wbs_item_id,
      task_id: wbsTaskAssignments.task_id,
    })
    .from(wbsTaskAssignments)
    .innerJoin(wbsItems, eq(wbsTaskAssignments.wbs_item_id, wbsItems.id))
    .where(eq(wbsItems.project_id, projectId));
}

/**
 * Recursively deletes a wbs_item and all its descendants.
 * Fetches all items for the project, builds descendant set via BFS, deletes all in one batch.
 * Used by Phase 47 WBS DELETE route and UI cleanup.
 */
export async function deleteWbsSubtree(itemId: number): Promise<void> {
  // First get the item to find its project_id
  const [item] = await db
    .select({ project_id: wbsItems.project_id })
    .from(wbsItems)
    .where(eq(wbsItems.id, itemId))
    .limit(1);

  if (!item) {
    // Item doesn't exist, nothing to delete
    return;
  }

  // Fetch all items for the project to build the tree
  const allItems = await db
    .select({ id: wbsItems.id, parent_id: wbsItems.parent_id })
    .from(wbsItems)
    .where(eq(wbsItems.project_id, item.project_id));

  // Build children map for BFS traversal
  const childrenMap = new Map<number | null, number[]>();
  for (const wbsItem of allItems) {
    const parentId = wbsItem.parent_id;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(wbsItem.id);
  }

  // BFS to collect all descendant IDs
  const idsToDelete: number[] = [itemId];
  const queue = [itemId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = childrenMap.get(currentId) || [];

    for (const childId of children) {
      idsToDelete.push(childId);
      queue.push(childId);
    }
  }

  // Delete all items in one batch
  if (idsToDelete.length > 0) {
    await db.delete(wbsItems).where(inArray(wbsItems.id, idsToDelete));
  }
}


/**
 * Returns architecture tracks and nodes for a project.
 * Used by Phase 48 Architecture UI to render track flows.
 */
export async function getArchNodes(projectId: number): Promise<{ tracks: ArchTrack[]; nodes: ArchNode[] }> {
  const tracks = await db
    .select()
    .from(archTracks)
    .where(eq(archTracks.project_id, projectId))
    .orderBy(asc(archTracks.display_order));
  const nodes = await db
    .select()
    .from(archNodes)
    .where(eq(archNodes.project_id, projectId))
    .orderBy(asc(archNodes.display_order));
  return { tracks, nodes };
}

/**
 * Returns architecture team status rows for a project.
 * Used by Phase 48 Architecture Team Status section.
 */
export async function getArchTeamStatus(projectId: number): Promise<ArchTeamStatus[]> {
  return db
    .select()
    .from(archTeamStatus)
    .where(eq(archTeamStatus.project_id, projectId));
}

// ─── Phase 49: Portfolio Dashboard ───────────────────────────────────────────

export interface PortfolioProject extends ProjectWithHealth {
  owner: string | null;
  tracks: string;
  currentPhase: string | null;
  percentComplete: number | null;
  nextMilestone: string | null;
  nextMilestoneDate: string | null;
  riskLevel: 'None' | 'Medium' | 'High';
  dependencyStatus: 'Clear' | 'Blocked';
  overdueMilestones: number;
}

/**
 * Returns enriched portfolio data for all active projects.
 * Used by Phase 49 Portfolio Dashboard.
 *
 * Fetches all active projects with health data, then enriches with:
 * - Owner (from ADR workstream lead)
 * - Tracks (distinct workstream tracks)
 * - Current onboarding phase
 * - Percent complete (average of workstreams)
 * - Next milestone and date
 * - Risk level (derived from highRisks count)
 * - Dependency status (from blocked tasks)
 */
export async function getPortfolioData(opts?: ProjectQueryOpts): Promise<PortfolioProject[]> {
  // Fetch all active projects with health data first
  const projectsWithHealth = await getActiveProjects(opts);

  // Enrich each project sequentially to avoid connection pool exhaustion
  const portfolioProjects = [];
  for (const project of projectsWithHealth) {
    const [
      workstreamData,
      onboardingData,
      milestoneData,
      blockedTaskData,
    ] = await Promise.all([
        // Query 1: Workstreams for owner and tracks
        db
          .select()
          .from(workstreams)
          .where(eq(workstreams.project_id, project.id)),

        // Query 2: Onboarding phases for current phase
        db
          .select()
          .from(onboardingPhases)
          .where(eq(onboardingPhases.project_id, project.id))
          .orderBy(asc(onboardingPhases.display_order)),

        // Query 3: Milestones for next upcoming milestone
        db
          .select()
          .from(milestones)
          .where(eq(milestones.project_id, project.id)),

        // Query 4: Tasks with blocked_by for dependency status
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(
            and(
              eq(tasks.project_id, project.id),
              sql`${tasks.blocked_by} IS NOT NULL`,
              ne(tasks.status, 'completed')
            )
          ),
      ]);

      // Derive owner: first ADR workstream with non-null lead
      const adrWorkstream = workstreamData.find(w => w.track === 'ADR' && w.lead);
      const owner = adrWorkstream?.lead ?? null;

      // Derive tracks: distinct track values joined
      const uniqueTracks = [...new Set(workstreamData.map(w => w.track).filter(Boolean))];
      const tracks = uniqueTracks.join(' + ');

      // Derive current phase: first phase that's not completed, or last phase if all complete
      // For now, we'll use the first phase (Phase 49 hasn't implemented onboarding_phases.status yet)
      const currentPhase = onboardingData[0]?.name ?? null;

      // Derive percent complete: average of workstreams.percent_complete
      const workstreamsWithProgress = workstreamData.filter(w => w.percent_complete !== null);
      const percentComplete = workstreamsWithProgress.length > 0
        ? Math.round(
            workstreamsWithProgress.reduce((sum, w) => sum + (w.percent_complete ?? 0), 0) /
            workstreamsWithProgress.length
          )
        : null;

      // Derive next milestone: nearest upcoming milestone (date >= today, status !== 'complete')
      const today = new Date().toISOString().split('T')[0];
      const upcomingMilestones = milestoneData.filter(m => {
        if (m.status === 'complete') return false;
        if (!m.date) return false;
        // Only consider ISO-ish dates (YYYY-MM-DD format)
        if (!/^\d{4}-\d{2}-\d{2}/.test(m.date)) return false;
        return m.date >= today;
      }).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

      const nextMilestone = upcomingMilestones[0]?.name ?? null;
      const nextMilestoneDate = upcomingMilestones[0]?.date ?? null;

      // Derive risk level: highRisks === 0 → 'None', 1-2 → 'Medium', 3+ → 'High'
      const riskLevel: 'None' | 'Medium' | 'High' =
        project.highRisks === 0 ? 'None' :
        project.highRisks <= 2 ? 'Medium' :
        'High';

      // Derive dependency status: any blocked task → 'Blocked', else 'Clear'
      const blockedCount = blockedTaskData[0]?.count ?? 0;
      const dependencyStatus: 'Clear' | 'Blocked' = blockedCount > 0 ? 'Blocked' : 'Clear';

      // Derive overdue milestones: date < today AND status !== 'complete'
      const overdueMilestones = milestoneData.filter(m => {
        if (m.status === 'complete') return false;
        if (!m.date) return false;
        if (!/^\d{4}-\d{2}-\d{2}/.test(m.date)) return false;
        return m.date < today;
      }).length;

    const enriched = {
      ...project,
      owner,
      tracks,
      currentPhase,
      percentComplete,
      nextMilestone,
      nextMilestoneDate,
      riskLevel,
      dependencyStatus,
      overdueMilestones,
    };
    portfolioProjects.push(enriched);
  }

  return portfolioProjects;
}

// ─── Phase 81: Portfolio Dashboard Rebuild (KDS-05) ──────────────────────────

export interface PortfolioWeekMetrics {
  tasksClosedThisWeek: number;
  milestonesHitThisWeek: number;
  overdueTasks: number;
  updatesLogged: number;
}

export interface ProjectGoLive {
  id: number;
  customer: string;
  go_live_target: string;
}

export interface RiskEntry {
  id: number;
  title: string;
  projectCustomer: string;
}

export interface AttentionProject {
  id: number;
  customer: string;
  reason: 'red-health' | 'stale';
}

export interface PortfolioBriefingData {
  upcomingGoLives: ProjectGoLive[];
  highSeverityRisks: RiskEntry[];
  needsAttention: AttentionProject[];
}

/**
 * Returns week metrics for the Portfolio hero stat band.
 * Gracefully returns zeros on any DB error.
 */
export async function getPortfolioWeekMetrics(
  opts?: ProjectQueryOpts
): Promise<PortfolioWeekMetrics> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Determine accessible project ids
    let accessibleProjectIds: number[] | null = null;
    if (opts?.userId && !opts.isGlobalAdmin) {
      const memberRows = await db
        .select({ id: projectMembers.project_id })
        .from(projectMembers)
        .where(eq(projectMembers.user_id, opts.userId));
      accessibleProjectIds = memberRows.map((r) => r.id);
    }

    // Tasks closed this week
    const tasksClosedRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .innerJoin(projects, eq(tasks.project_id, projects.id))
      .where(
        and(
          eq(tasks.status, 'completed'),
          gt(tasks.created_at, sevenDaysAgo),
          inArray(projects.status, ['active', 'draft']),
          accessibleProjectIds !== null
            ? inArray(tasks.project_id, accessibleProjectIds)
            : undefined
        )
      );
    const tasksClosedThisWeek = Number(tasksClosedRows[0]?.count ?? 0);

    // Milestones hit this week (status = 'Complete' and updated within last 7 days)
    // Milestones use text 'complete' (milestoneStatusEnum), check both casings
    const milestonesHitRows = await db.execute<{ count: number }>(
      sql`
        SELECT count(*)::int AS count
        FROM milestones m
        JOIN projects p ON p.id = m.project_id
        WHERE p.status IN ('active', 'draft')
          AND m.status = 'complete'
          AND m.created_at >= ${sevenDaysAgo.toISOString()}
          ${accessibleProjectIds !== null
            ? sql`AND m.project_id = ANY(ARRAY[${sql.join(accessibleProjectIds.map(id => sql`${id}`), sql`, `)}]::int[])`
            : sql``}
      `
    );
    const milestonesHitThisWeek = Number(milestonesHitRows[0]?.count ?? 0);

    // Overdue tasks: due < today and status != 'completed' across user's projects
    const today = new Date().toISOString().split('T')[0];
    const overdueTasksRows = await db.execute<{ count: number }>(
      sql`
        SELECT count(*)::int AS count
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        WHERE p.status IN ('active', 'draft')
          AND t.status != 'completed'
          AND t.due IS NOT NULL
          AND t.due ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
          AND t.due < ${today}
          ${accessibleProjectIds !== null
            ? sql`AND t.project_id = ANY(ARRAY[${sql.join(accessibleProjectIds.map(id => sql`${id}`), sql`, `)}]::int[])`
            : sql``}
      `
    );
    const overdueTasks = Number(overdueTasksRows[0]?.count ?? 0);

    // Updates logged: engagement_history entries in last 7 days
    const updatesLoggedRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(engagementHistory)
      .innerJoin(projects, eq(engagementHistory.project_id, projects.id))
      .where(
        and(
          gt(engagementHistory.created_at, sevenDaysAgo),
          inArray(projects.status, ['active', 'draft']),
          accessibleProjectIds !== null
            ? inArray(engagementHistory.project_id, accessibleProjectIds)
            : undefined
        )
      );
    const updatesLogged = Number(updatesLoggedRows[0]?.count ?? 0);

    return { tasksClosedThisWeek, milestonesHitThisWeek, overdueTasks, updatesLogged };
  } catch (err) {
    console.error('[getPortfolioWeekMetrics] error:', err);
    return { tasksClosedThisWeek: 0, milestonesHitThisWeek: 0, overdueTasks: 0, updatesLogged: 0 };
  }
}

/**
 * Returns briefing data for the Portfolio 3-column briefing strip.
 * All data computed from DB — no AI calls.
 * Gracefully returns empty arrays on any DB error.
 */
export async function getPortfolioBriefingData(
  opts?: ProjectQueryOpts
): Promise<PortfolioBriefingData> {
  try {
    // Determine accessible project ids
    let accessibleProjectIds: number[] | null = null;
    if (opts?.userId && !opts.isGlobalAdmin) {
      const memberRows = await db
        .select({ id: projectMembers.project_id })
        .from(projectMembers)
        .where(eq(projectMembers.user_id, opts.userId));
      accessibleProjectIds = memberRows.map((r) => r.id);
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const fourWeeksOut = new Date(today);
    fourWeeksOut.setDate(today.getDate() + 28);
    const fourWeeksOutStr = fourWeeksOut.toISOString().split('T')[0];

    // Query 1: Upcoming go-lives (next 28 days)
    let upcomingGoLives: ProjectGoLive[] = [];
    try {
      const goLiveRows = await db.execute<{ id: number; customer: string; go_live_target: string }>(
        sql`
          SELECT id, customer, go_live_target
          FROM projects
          WHERE status IN ('active', 'draft')
            AND go_live_target IS NOT NULL
            AND go_live_target ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            AND go_live_target >= ${todayStr}
            AND go_live_target <= ${fourWeeksOutStr}
            ${accessibleProjectIds !== null
              ? sql`AND id = ANY(ARRAY[${sql.join(accessibleProjectIds.map(id => sql`${id}`), sql`, `)}]::int[])`
              : sql``}
          ORDER BY go_live_target ASC
        `
      );
      upcomingGoLives = goLiveRows.map((r) => ({
        id: Number(r.id),
        customer: String(r.customer),
        go_live_target: String(r.go_live_target),
      }));
    } catch (e) {
      console.error('[getPortfolioBriefingData] upcomingGoLives error:', e);
    }

    // Query 2: High severity risks (open, high or critical severity)
    let highSeverityRisks: RiskEntry[] = [];
    try {
      const riskRows = await db.execute<{ id: number; description: string; customer: string }>(
        sql`
          SELECT r.id, r.description, p.customer
          FROM risks r
          JOIN projects p ON p.id = r.project_id
          WHERE p.status IN ('active', 'draft')
            AND r.status = 'open'
            AND r.severity IN ('high', 'critical')
            ${accessibleProjectIds !== null
              ? sql`AND r.project_id = ANY(ARRAY[${sql.join(accessibleProjectIds.map(id => sql`${id}`), sql`, `)}]::int[])`
              : sql``}
          ORDER BY r.created_at DESC
        `
      );
      highSeverityRisks = riskRows.map((r) => ({
        id: Number(r.id),
        title: String(r.description),
        projectCustomer: String(r.customer),
      }));
    } catch (e) {
      console.error('[getPortfolioBriefingData] highSeverityRisks error:', e);
    }

    // Query 3: Projects needing attention (red health OR stale — no engagement in last 7 days)
    let needsAttention: AttentionProject[] = [];
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Red health projects
      const redHealthRows = await db.execute<{ id: number; customer: string; severity: string }>(
        sql`
          SELECT DISTINCT p.id, p.customer
          FROM projects p
          JOIN risks r ON r.project_id = p.id
          WHERE p.status IN ('active', 'draft')
            AND r.status = 'open'
            AND r.severity = 'critical'
            ${accessibleProjectIds !== null
              ? sql`AND p.id = ANY(ARRAY[${sql.join(accessibleProjectIds.map(id => sql`${id}`), sql`, `)}]::int[])`
              : sql``}
        `
      );
      const redHealthIds = new Set(redHealthRows.map((r) => Number(r.id)));

      // Stale projects: active/draft with no engagement_history entry in last 7 days
      const staleRows = await db.execute<{ id: number; customer: string }>(
        sql`
          SELECT p.id, p.customer
          FROM projects p
          WHERE p.status IN ('active', 'draft')
            ${accessibleProjectIds !== null
              ? sql`AND p.id = ANY(ARRAY[${sql.join(accessibleProjectIds.map(id => sql`${id}`), sql`, `)}]::int[])`
              : sql``}
            AND NOT EXISTS (
              SELECT 1 FROM engagement_history eh
              WHERE eh.project_id = p.id
                AND eh.created_at >= ${sevenDaysAgo.toISOString()}
            )
        `
      );

      // Build combined list, red-health first, de-duplication by id
      const seen = new Set<number>();
      for (const r of redHealthRows) {
        const id = Number(r.id);
        if (!seen.has(id)) {
          seen.add(id);
          needsAttention.push({ id, customer: String(r.customer), reason: 'red-health' });
        }
      }
      for (const r of staleRows) {
        const id = Number(r.id);
        if (!seen.has(id)) {
          seen.add(id);
          needsAttention.push({ id, customer: String(r.customer), reason: 'stale' });
        }
      }
    } catch (e) {
      console.error('[getPortfolioBriefingData] needsAttention error:', e);
    }

    return { upcomingGoLives, highSeverityRisks, needsAttention };
  } catch (err) {
    console.error('[getPortfolioBriefingData] error:', err);
    return { upcomingGoLives: [], highSeverityRisks: [], needsAttention: [] };
  }
}
