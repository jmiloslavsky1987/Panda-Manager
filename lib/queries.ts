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
  knowledgeBase,
  businessOutcomes,
  e2eWorkflows,
  workflowSteps,
  focusAreas,
  architectureIntegrations,
  beforeState,
  teamOnboardingStatus,
  teamPathways,
} from '../db/schema';
import { eq, and, inArray, lt, ne, gt, or, desc, asc } from 'drizzle-orm';
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
          AND status NOT IN ('resolved', 'closed', 'accepted')
      `
    );
    const openRiskCount = Number(openNowRows[0]?.count ?? 0);

    // ── Open risk count (last week: created before 7 days ago, still open) ──
    const openLastWeekRows = await tx.execute<{ count: number }>(
      sql`
        SELECT count(*)::int AS count
        FROM risks
        WHERE project_id = ${projectId}
          AND status NOT IN ('resolved', 'closed', 'accepted')
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

  return { health, overdueActions, highRisks, stalledMilestones, stalledWorkstreams };
}

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * Returns all active and draft projects with computed RAG health score.
 * Draft projects with no data return neutral health (green, all counts 0).
 */
export async function getActiveProjects(): Promise<ProjectWithHealth[]> {
  const activeProjects = await db
    .select()
    .from(projects)
    .where(inArray(projects.status, ['active', 'draft']));

  const projectsWithHealth = await Promise.all(
    activeProjects.map(async (p) => {
      const healthData = await computeHealth(p.id);
      const analyticsData = await computeProjectAnalytics(p.id);
      return { ...p, ...healthData, ...analyticsData };
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
  const analyticsData = await computeProjectAnalytics(projectId);
  return { ...project, ...healthData, ...analyticsData };
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
  type?: string;
  from?: string;
  to?: string;
}): Promise<SearchResult[]> {
  const { q, account, type, from, to } = params;

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
// ArchitectureIntegration: { id, project_id, tool_name, track, phase, status, integration_method, notes, created_at }
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
}

// ─── Teams Tab Query ──────────────────────────────────────────────────────────

/**
 * Returns all data needed for the Teams tab page (RSC call).
 * Fetches business outcomes, e2e workflows with nested steps, focus areas,
 * architecture integrations (for the Architecture Overview section),
 * and open/in_progress actions (for the Teams & Engagement Status section).
 */
export async function getTeamsTabData(projectId: number): Promise<TeamsTabData> {
  const [outcomes, workflows, steps, areas, archIntegrations, openActs] = await Promise.all([
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
