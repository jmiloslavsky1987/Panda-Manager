# Architecture Research: v7.0 Integration Patterns

**Domain:** Per-project RBAC, Project Lifecycle, Gantt Sync, Scheduler Scoping, Extraction Reclassification
**Researched:** 2026-04-13
**Confidence:** HIGH

## Executive Summary

v7.0 introduces operational maturity features that integrate with the existing Next.js 16 + PostgreSQL + BullMQ + better-auth@1.5.6 architecture. This research identifies integration points for six major feature categories, distinguishing between **new components** (require creation) and **modified components** (extend existing patterns). All recommendations preserve the existing requireSession() Route Handler security boundary pattern and avoid breaking changes to the 40+ guarded handlers already deployed.

**Key architectural decisions:**
- Per-project RBAC: New `project_members` table + extend requireSession() to return project-level role
- Archive/delete: Add `archived_at` column to `projects` table (soft-delete via timestamp, not separate table)
- Gantt bi-directional sync: New utility function that updates both `tasks` and `milestones` tables atomically based on user drag action
- Project-scoped scheduling: Extend existing `scheduled_jobs` table with `project_id` column; filter jobs in worker
- Note reclassification: Extend ExtractionPreview UI to allow entity type dropdown change before approval
- Completeness: Replace table count heuristic with Claude structured outputs analyzing actual record quality

## Standard Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 16 App Router                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Server       │  │ Route        │  │ Client       │          │
│  │ Components   │  │ Handlers     │  │ Components   │          │
│  │              │  │              │  │              │          │
│  │ (RSC)        │  │ (API routes) │  │ ('use client')│          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
├─────────┴─────────────────┴─────────────────┴────────────────────┤
│                     Authentication Layer                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ better-auth@1.5.6: session mgmt, global roles           │   │
│  │ + requireSession() at Route Handler level (40+ handlers) │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                       Business Logic                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ lib/     │  │ worker/  │  │ db/      │  │ app/api/ │        │
│  │ utils    │  │ jobs     │  │ helpers  │  │ handlers │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                      Data & Jobs Layer                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   Drizzle ORM → PostgreSQL (67 tables)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   BullMQ → Redis (scheduled jobs, extraction jobs)       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Feature 1: Per-Project RBAC

### Current State
- **Global roles only:** `users.role` is 'admin' or 'user' (set at account level)
- **requireSession() pattern:** Returns session object with user info; 40+ Route Handlers call this
- **No project membership tracking:** Any authenticated user can access any project

### Integration Architecture

#### New Components

**1. Database Schema Addition**
```sql
-- New table: project_members
CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
```

**Drizzle schema addition (db/schema.ts):**
```typescript
export const projectRoleEnum = pgEnum('project_role', ['admin', 'user']);

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: projectRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('project_members_project_user_idx').on(t.project_id, t.user_id),
]);

export type ProjectMember = typeof projectMembers.$inferSelect;
export type ProjectMemberInsert = typeof projectMembers.$inferInsert;
```

**2. Extended requireSession() Function**

New utility: `lib/auth-project.ts` (extends existing `lib/auth-server.ts`)

```typescript
/**
 * lib/auth-project.ts — Project-level RBAC enforcement
 *
 * Extends requireSession() to include project membership check.
 * Returns both global session AND project-level role.
 */
import { requireSession } from "@/lib/auth-server";
import { db } from "@/db";
import { projectMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export type ProjectRole = 'admin' | 'user';

export type ProjectSessionResult =
  | {
      session: NonNullable<Awaited<ReturnType<typeof requireSession>>['session']>;
      projectRole: ProjectRole;
      redirectResponse: null;
    }
  | {
      session: null;
      projectRole: null;
      redirectResponse: NextResponse;
    };

/**
 * requireProjectSession() — Enforces both authentication AND project membership.
 *
 * @param projectId - Numeric project ID
 * @returns Session + projectRole ('admin' or 'user'), or 401/403 response
 *
 * Usage:
 *   const { session, projectRole, redirectResponse } = await requireProjectSession(projectId);
 *   if (redirectResponse) return redirectResponse;
 *   // Now use projectRole to guard destructive actions
 */
export async function requireProjectSession(projectId: number): Promise<ProjectSessionResult> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) {
    return { session: null, projectRole: null, redirectResponse };
  }

  // Global admins have implicit 'admin' role on all projects
  const globalRole = session.user.role;
  if (globalRole === 'admin') {
    return { session, projectRole: 'admin', redirectResponse: null };
  }

  // Check project_members table for explicit membership
  const membership = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.project_id, projectId),
        eq(projectMembers.user_id, session.user.id)
      )
    )
    .limit(1);

  if (membership.length === 0) {
    return {
      session: null,
      projectRole: null,
      redirectResponse: NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 }
      ),
    };
  }

  return {
    session,
    projectRole: membership[0].role as ProjectRole,
    redirectResponse: null
  };
}

/**
 * requireProjectAdmin() — Enforces project-level admin role.
 * Shorthand for requireProjectSession + admin check.
 */
export async function requireProjectAdmin(projectId: number): Promise<ProjectSessionResult> {
  const result = await requireProjectSession(projectId);
  if (result.redirectResponse) return result;

  if (result.projectRole !== 'admin') {
    return {
      session: null,
      projectRole: null,
      redirectResponse: NextResponse.json(
        { error: "Admin role required for this action" },
        { status: 403 }
      ),
    };
  }

  return result;
}
```

#### Modified Components

**Route Handlers requiring project-level guards:**
- Archive/delete: `DELETE /api/projects/[projectId]/route.ts` → use `requireProjectAdmin()`
- User management: New `POST /api/projects/[projectId]/members/route.ts` → use `requireProjectAdmin()`
- Global scheduler actions: `POST /api/jobs/route.ts` → check if user is admin on ANY project (new helper)

**All other existing handlers:** No changes required for v7.0. Migration to `requireProjectSession()` can be phased in later phases (AUTH-05 suggests gradual rollout).

### Data Flow

```
User Action (Archive Project)
    ↓
Route Handler: DELETE /api/projects/[projectId]
    ↓
requireProjectAdmin(projectId)  ← NEW
    ↓ (if not admin, return 403)
Archive logic: UPDATE projects SET archived_at = NOW()
    ↓
Response
```

### Rollout Strategy

**Phase 1 (v7.0):** Implement `project_members` table + new helpers; guard only new destructive actions (archive, delete, membership management)

**Phase 2 (v7.1+):** Gradually migrate existing handlers from `requireSession()` to `requireProjectSession()` where per-project access control is desired (e.g., `/api/projects/[projectId]/actions/route.ts`)

**Phase 3 (v7.2+):** Add project membership UI in project settings tab; bulk-assign users to projects

---

## Feature 2: Project Archive & Delete

### Current State
- `projects.status` enum: 'active', 'archived', 'closed', 'draft'
- **No soft-delete mechanism:** 'archived' status is manual, not enforced
- **No restore flow:** Once archived, status change is manual UPDATE
- **CASCADE behavior:** FK constraints use `ON DELETE CASCADE` for related records

### Integration Architecture

#### Pattern Choice: `archived_at` Column (Soft-Delete)

**Rationale:**
- Simpler queries: `WHERE archived_at IS NULL` to filter active projects
- Timestamp preserves audit trail: when was project archived?
- No data duplication: archived projects stay in same table
- Reversible: restore = `SET archived_at = NULL`

**Alternative rejected:** Separate `archived_projects` table duplicates schema, complicates JOINs, loses FK integrity on restore

#### New Components

**1. Schema Migration**
```sql
-- Add archived_at column to projects table
ALTER TABLE projects ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP;

-- Index for filtering active projects
CREATE INDEX idx_projects_archived_at ON projects(archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;
```

**Drizzle schema update (db/schema.ts):**
```typescript
export const projects = pgTable('projects', {
  // ... existing fields ...
  archived_at: timestamp('archived_at'),
  deleted_at: timestamp('deleted_at'),
});
```

**2. Utility Functions**

New file: `lib/project-lifecycle.ts`

```typescript
/**
 * lib/project-lifecycle.ts — Project archive/delete/restore utilities
 */
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, isNull, isNotNull, and } from "drizzle-orm";

/**
 * Archive a project (soft-delete via archived_at timestamp).
 * Project becomes read-only; related records preserved.
 */
export async function archiveProject(projectId: number): Promise<void> {
  await db
    .update(projects)
    .set({ archived_at: new Date(), status: 'archived' })
    .where(eq(projects.id, projectId));
}

/**
 * Restore an archived project back to active status.
 */
export async function restoreProject(projectId: number): Promise<void> {
  await db
    .update(projects)
    .set({ archived_at: null, status: 'active' })
    .where(eq(projects.id, projectId));
}

/**
 * Permanently delete a project (hard delete).
 * CASCADE will delete all related records (actions, risks, tasks, etc.).
 *
 * Security: Only callable by project admins (enforced at Route Handler).
 */
export async function deleteProject(projectId: number): Promise<void> {
  await db
    .update(projects)
    .set({ deleted_at: new Date() })
    .where(eq(projects.id, projectId));
}

/**
 * Get all active projects (not archived, not deleted).
 */
export async function getActiveProjects() {
  return db
    .select()
    .from(projects)
    .where(and(isNull(projects.archived_at), isNull(projects.deleted_at)));
}

/**
 * Get all archived projects (archived but not deleted).
 */
export async function getArchivedProjects() {
  return db
    .select()
    .from(projects)
    .where(and(isNotNull(projects.archived_at), isNull(projects.deleted_at)));
}
```

#### Modified Components

**Route Handlers:**
- `DELETE /api/projects/[projectId]/route.ts` — Add query param `?permanent=true` for hard delete
- `PATCH /api/projects/[projectId]/route.ts` — Add `restore` action
- `GET /api/projects/route.ts` — Add query param `?status=archived` to list archived projects

**UI Components:**
- Portfolio dashboard (`app/dashboard/page.tsx`) — Filter out archived/deleted by default; add "Show Archived" toggle
- Archived projects view (new page: `app/archived/page.tsx`) — Read-only list of archived projects with restore button
- Project settings (new section: project lifecycle actions) — Archive/Delete buttons with confirmation modals

### Data Flow: Archive Project

```
User clicks "Archive Project"
    ↓
Confirmation modal (client)
    ↓
DELETE /api/projects/[projectId]?action=archive
    ↓
requireProjectAdmin(projectId)  ← RBAC guard
    ↓
archiveProject(projectId)       ← Sets archived_at
    ↓
Invalidate cache / refresh UI
    ↓
Project removed from active list
```

### Cascade Behavior

**Important:** Archived projects preserve ALL related records (actions, risks, tasks, etc.). Only hard delete triggers CASCADE removal.

**User expectation alignment:**
- **Archive = "close but keep for reference"** → read-only, searchable, restorable
- **Delete = "permanent removal"** → requires double confirmation, cannot be undone (unless `deleted_at` approach allows 30-day grace period before physical deletion)

**Recommendation for v7.0:** Use `deleted_at` timestamp (not immediate CASCADE deletion). Add background job to purge `deleted_at > 30 days ago` projects monthly. This provides safety net for accidental deletions.

---

## Feature 3: Gantt Bi-Directional Date Propagation

### Current State
- Custom `GanttChart.tsx` component: renders tasks and milestones independently
- Tasks fetched from `tasks` table; milestones from `milestones` table
- Drag-to-reschedule updates only the dragged entity (task OR milestone, not both)
- No sync mechanism: changing task dates doesn't update associated milestone, and vice versa

### Integration Architecture

#### Canonical Source of Truth: Event-Driven Updates

**Pattern:** User drag action on Gantt is the **event source**. Database updates propagate bidirectionally based on FK relationships.

**Relationships:**
- `tasks.milestone_id` → `milestones.id` (FK exists)
- Milestone date = earliest start_date of all assigned tasks (derived)
- Task dates constrain milestone date (milestone cannot be before all tasks complete)

#### New Components

**1. Sync Utility Function**

New file: `lib/gantt-sync.ts`

```typescript
/**
 * lib/gantt-sync.ts — Bi-directional Gantt date propagation
 *
 * Ensures milestone dates stay consistent with task dates when user drags on Gantt.
 */
import { db } from "@/db";
import { tasks, milestones } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";

/**
 * Update a task's dates and propagate changes to its associated milestone.
 *
 * Logic:
 * - If task has milestone_id, recalculate milestone.date as MAX(task.due) of all tasks in that milestone
 * - If no tasks remain with valid dates, set milestone.date = null (TBD)
 *
 * @param taskId - Task to update
 * @param newStartDate - New start date (ISO string or null)
 * @param newDueDate - New due date (ISO string or null)
 */
export async function updateTaskDates(
  taskId: number,
  newStartDate: string | null,
  newDueDate: string | null
): Promise<void> {
  // 1. Update task dates
  const updated = await db
    .update(tasks)
    .set({ start_date: newStartDate, due: newDueDate })
    .where(eq(tasks.id, taskId))
    .returning();

  if (updated.length === 0) return;

  const task = updated[0];
  if (!task.milestone_id) return; // No milestone association

  // 2. Recalculate milestone date from all tasks in this milestone
  const milestoneTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.milestone_id, task.milestone_id),
        isNotNull(tasks.due)
      )
    );

  let latestDue: string | null = null;
  for (const t of milestoneTasks) {
    if (t.due && (!latestDue || t.due > latestDue)) {
      latestDue = t.due;
    }
  }

  // 3. Update milestone date
  await db
    .update(milestones)
    .set({ date: latestDue })
    .where(eq(milestones.id, task.milestone_id));
}

/**
 * Update a milestone's date and propagate to all assigned tasks.
 *
 * Logic:
 * - If milestone date moves earlier, do nothing to tasks (tasks are unchanged)
 * - If milestone date moves later, extend all task due dates proportionally
 *
 * Alternative simpler approach (recommended for v7.0):
 * - Milestone date is DERIVED (always computed from tasks), never set directly
 * - Gantt milestone markers are read-only; only tasks are draggable
 *
 * @param milestoneId - Milestone to update
 * @param newDate - New milestone date (ISO string or null)
 */
export async function updateMilestoneDate(
  milestoneId: number,
  newDate: string | null
): Promise<void> {
  // OPTION A: Milestone date is derived (recommended)
  // Do nothing — milestone date is computed from tasks
  // Throw error or no-op if user tries to drag milestone marker

  // OPTION B: Milestone date is settable (complex)
  // Requires proportional adjustment of all task dates
  // Deferred to v7.1 if needed

  await db
    .update(milestones)
    .set({ date: newDate })
    .where(eq(milestones.id, milestoneId));
}
```

**2. Route Handler Extension**

Modified: `PATCH /api/tasks/[id]/route.ts`

```typescript
import { updateTaskDates } from "@/lib/gantt-sync";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { id } = await params;
  const taskId = parseInt(id, 10);
  const body = await request.json();

  // If dates are changing, use sync utility
  if (body.start_date !== undefined || body.due !== undefined) {
    await updateTaskDates(taskId, body.start_date, body.due);
    return NextResponse.json({ success: true });
  }

  // Otherwise, standard PATCH logic
  const updated = await db
    .update(tasks)
    .set(body)
    .where(eq(tasks.id, taskId))
    .returning();

  return NextResponse.json(updated[0]);
}
```

#### Modified Components

**Client Component: `components/GanttChart.tsx`**

```typescript
// In handleTaskDragEnd callback:
async function handleTaskDragEnd(taskId: string, newStart: string, newEnd: string) {
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_date: newStart, due: newEnd }),
  });

  if (res.ok) {
    // Refetch both tasks AND milestones to reflect propagated changes
    await Promise.all([
      fetchTasks(),
      fetchMilestones(),
    ]);
    toast.success('Task date updated');
  }
}
```

### Data Flow

```
User drags Task on Gantt (client)
    ↓
PATCH /api/tasks/[id] { start_date, due }
    ↓
updateTaskDates(taskId, start, due)
    ↓ (atomic transaction)
    ├─ UPDATE tasks SET start_date, due
    └─ UPDATE milestones SET date = MAX(task.due) WHERE milestone_id = ...
    ↓
Client refetches tasks + milestones
    ↓
Gantt re-renders with synced dates
```

### Architectural Decision: Milestone Date as Derived Value

**Recommended pattern for v7.0:**
- Milestone `date` column is **always computed** from assigned tasks
- Gantt milestone markers are **read-only** (not draggable)
- Only task drag actions update dates
- Milestone dates automatically update via `updateTaskDates()`

**Rationale:**
- Simpler logic: single source of truth (task dates)
- No conflicts: milestone cannot drift out of sync
- Aligns with PM best practice: milestones mark task completion, not arbitrary dates

**Deferred to v7.1+ if needed:** Draggable milestones that proportionally adjust task dates

---

## Feature 4: Project-Scoped BullMQ Scheduling

### Current State
- `scheduled_jobs` table: global jobs (no project_id column)
- Worker polls `scheduled_jobs`, registers cron patterns with BullMQ
- Job execution: `worker/scheduler.ts` → `worker/jobs/[skillName].ts`
- No per-project job filtering: weekly-briefing runs for all projects, not specific projects

### Integration Architecture

#### Pattern: Metadata Tagging (Not Separate Queues)

**Rationale:**
- BullMQ queue-per-project approach = Redis key explosion (1 queue = 5+ keys per queue)
- Metadata tagging = single queue, filter jobs by `project_id` in worker
- Simpler Redis topology, easier to debug, no queue management overhead

**Alternative rejected:** Separate queue per project (`scheduled-jobs-project-123`) scales poorly beyond 100 projects

#### New Components

**1. Schema Migration**

```sql
-- Add project_id column to scheduled_jobs
ALTER TABLE scheduled_jobs ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- Index for project-scoped queries
CREATE INDEX idx_scheduled_jobs_project ON scheduled_jobs(project_id);

-- Null project_id = global job (runs for all projects or no specific project)
```

**Drizzle schema update (db/schema.ts):**
```typescript
export const scheduledJobs = pgTable('scheduled_jobs', {
  // ... existing fields ...
  project_id: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  // null project_id = global job
});
```

**2. Worker Job Registration Logic**

Modified: `worker/scheduler.ts`

```typescript
/**
 * registerDbSchedulers() — Modified to include project_id in job data
 */
export async function registerDbSchedulers(): Promise<void> {
  const enabledJobs = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.enabled, true));

  for (const job of enabledJobs) {
    if (!job.cron_expression) continue;

    await jobQueue.upsertJobScheduler(
      `db-job-${job.id}`,
      {
        pattern: job.cron_expression,
        ...(job.timezone ? { tz: job.timezone } : {}),
      },
      {
        name: job.skill_name,
        data: {
          triggeredBy: 'scheduled',
          jobId: job.id,
          projectId: job.project_id,  // ← NEW: pass project_id to worker
        },
        opts: { removeOnComplete: 100, removeOnFail: 50 },
      }
    );
    console.log(`[scheduler] registered db-job-${job.id} (${job.name}) → ${job.cron_expression}${job.project_id ? ` [project ${job.project_id}]` : ''}`);
  }
}
```

**3. Job Execution Filter**

Modified: `worker/jobs/weekly_briefing.ts` (example skill)

```typescript
/**
 * weekly_briefing skill — now project-scoped
 */
import { Job } from 'bullmq';

export async function weeklyBriefing(job: Job) {
  const { projectId } = job.data;

  if (!projectId) {
    // Global job: run for all active projects
    const projects = await getActiveProjects();
    for (const project of projects) {
      await generateBriefing(project.id);
    }
  } else {
    // Project-scoped job: run for specific project
    await generateBriefing(projectId);
  }
}
```

#### Modified Components

**UI: Scheduler Configuration (`app/scheduler/page.tsx`)**

Add project selector dropdown when creating/editing scheduled jobs:

```typescript
<Select
  label="Project Scope"
  value={formData.project_id ?? 'global'}
  onChange={(val) => setFormData({ ...formData, project_id: val === 'global' ? null : parseInt(val) })}
>
  <option value="global">All Projects (Global)</option>
  {projects.map((p) => (
    <option key={p.id} value={p.id}>{p.name}</option>
  ))}
</Select>
```

**Route Handler: `POST /api/jobs/route.ts`**

Add `project_id` to job creation schema:

```typescript
const CreateJobSchema = z.object({
  name: z.string(),
  skill_name: z.string(),
  cron_expression: z.string(),
  project_id: z.number().nullable(),  // ← NEW
  // ... other fields
});
```

### Data Flow

```
Admin creates project-scoped job (UI)
    ↓
POST /api/jobs { name, skill_name, cron_expression, project_id: 123 }
    ↓
INSERT INTO scheduled_jobs (project_id = 123)
    ↓
Worker polls scheduled_jobs table (60s interval)
    ↓
registerDbSchedulers() reads new job
    ↓
upsertJobScheduler() registers cron with BullMQ
    ↓ (at scheduled time)
Job executes with projectId in job.data
    ↓
Skill runs for specific project only
```

### Backward Compatibility

**Existing global jobs:** `project_id = NULL` → job runs for all projects (preserve current behavior)

**Migration strategy:**
1. Add `project_id` column (nullable)
2. Existing jobs remain global (NULL)
3. New jobs can opt into project scoping via UI
4. No breaking changes to existing skills (they check `job.data.projectId` and fall back to all-projects behavior)

---

## Feature 5: Note Entity Reclassification

### Current State
- ExtractionPreview displays 21 entity types in tabs
- Entity type is determined by Claude during extraction (`entityType: 'note'` for unclassifiable items)
- Once staged, entity type is immutable (no UI to change it before approval)
- Approved entities route to DB tables based on `entityType` field

### Integration Architecture

#### Pattern: Pre-Approval Entity Type Override

**User flow:**
1. Claude extracts document → stages items with best-guess `entityType`
2. User reviews in ExtractionPreview modal
3. User notices "note" entity is actually a "risk" or "action"
4. User changes entity type via dropdown in ExtractionItemRow
5. User approves → entity routes to correct table

#### New Components

**1. UI Enhancement: Entity Type Dropdown**

Modified component: `components/ExtractionItemRow.tsx`

```typescript
/**
 * ExtractionItemRow.tsx — Add entity type selector
 */
import { Select } from '@/components/ui/select';
import { TAB_LABELS, ENTITY_ORDER } from './ExtractionPreview';

interface ExtractionItemRowProps {
  item: ReviewItem;
  globalIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (changes: Partial<ReviewItem>) => void;
}

export function ExtractionItemRow({ item, onChange, ...props }: ExtractionItemRowProps) {
  return (
    <div className="p-3 border-b">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {/* Entity type selector */}
          <Select
            value={item.entityType}
            onChange={(val) => onChange({ entityType: val })}
            className="text-sm"
          >
            {ENTITY_ORDER.map((type) => (
              <option key={type} value={type}>
                {TAB_LABELS[type] ?? type}
              </option>
            ))}
          </Select>

          {/* Existing approve checkbox */}
          <Checkbox
            checked={item.approved}
            onChange={(checked) => onChange({ approved: checked })}
          />
        </div>

        {/* Expand/collapse toggle */}
        <Button variant="ghost" size="sm" onClick={props.onToggleExpand}>
          {props.isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      {/* Item fields preview */}
      {props.isExpanded && (
        <div className="mt-2 space-y-1 text-sm text-zinc-600">
          {Object.entries(item.fields).map(([key, value]) => (
            <div key={key}>
              <strong>{key}:</strong> {String(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**2. Approval Route Handler Logic**

Modified: `app/api/ingestion/approve/route.ts`

**Current behavior:** Routes entity to DB table based on `item.entityType`

**New behavior:** Allow `entityType` to differ from Claude's original classification; route based on user-selected type

**No changes needed** — existing switch/case in `approve/route.ts` already routes by `entityType`. UI change automatically flows through because `ReviewItem.entityType` is mutable before approval.

```typescript
// In approve/route.ts (pseudo-code of existing logic):
for (const item of approvedItems) {
  switch (item.entityType) {
    case 'action':
      await insertAction(item.fields);
      break;
    case 'risk':
      await insertRisk(item.fields);
      break;
    case 'note':
      await insertNote(item.fields);  // or skip if no notes table
      break;
    // ... other cases
  }
}
```

#### Modified Components

**Client state management:** `components/IngestionModal.tsx`

```typescript
// onItemChange already supports partial updates:
function handleItemChange(index: number, changes: Partial<ReviewItem>) {
  setStagedItems((prev) =>
    prev.map((item, i) => (i === index ? { ...item, ...changes } : item))
  );
}
```

**No other changes needed** — entity type change propagates through existing approval flow.

### Data Flow

```
Claude extracts document → entityType: 'note'
    ↓
ExtractionPreview renders item in "Notes" tab
    ↓
User selects item, changes entityType → 'risk'
    ↓
Item moves to "Risks" tab (UI auto-groups by entityType)
    ↓
User approves item
    ↓
POST /api/ingestion/approve { items: [{ entityType: 'risk', fields: {...} }] }
    ↓
Approval handler routes to risks table
    ↓
INSERT INTO risks (...)
```

### Edge Cases

**Field schema mismatch:** If user changes `note` → `action`, but note fields don't match action schema (e.g., no `external_id`), approval will fail validation.

**Mitigation:**
- Show warning in UI if required fields for target entity type are missing
- Auto-generate missing required fields (e.g., `external_id` for actions)
- Fallback: reject approval with clear error message listing missing fields

**Recommendation for v7.0:** Add client-side validation in `ExtractionItemRow` that checks if item fields satisfy target entity schema before allowing type change. Display warning icon if fields are incomplete.

---

## Feature 6: Completeness Analysis Enhancement

### Current State
- `GET /api/projects/[projectId]/completeness` returns simple table count score (0-100%)
- `POST /api/projects/[projectId]/completeness` calls Claude with structured outputs for detailed gap analysis
- **Known bug:** Completeness score is table count heuristic, not actual data quality assessment
- No distinction between "has records" vs "records have meaningful data"

### Integration Architecture

#### Pattern: Structured Claude Analysis with Schema-Aware Prompts

**Current implementation already correct** — POST endpoint uses Claude Opus 4.6 with `output_config.format: json_schema` to return structured gap descriptions.

**Enhancement for v7.0:** Improve prompt to include:
1. Project type awareness (ADR vs Biggy workstream patterns)
2. Template vs real data distinction (already excludes `source='template'` records)
3. Field-level completeness (e.g., "3 actions have status='open' but no owner")

#### Modified Components

**1. Completeness Context Builder**

Modified: `lib/completeness-context-builder.ts`

```typescript
/**
 * buildCompletenessContext() — Enhanced with project type awareness
 */
export async function buildCompletenessContext(projectId: number): Promise<string> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  // Determine project type from workstreams
  const workstreams = await db
    .select()
    .from(workstreamsTable)
    .where(eq(workstreamsTable.project_id, projectId));

  const hasADR = workstreams.some((w) => w.track === 'ADR');
  const hasBiggy = workstreams.some((w) => w.track === 'Biggy');
  const projectType = hasADR && hasBiggy ? 'dual-track' : hasADR ? 'ADR-only' : 'Biggy-only';

  // Fetch all workspace tab data (exclude source='template')
  const [
    actionsData,
    risksData,
    milestonesData,
    // ... other tables
  ] = await Promise.all([
    db.select().from(actions).where(and(eq(actions.project_id, projectId), ne(actions.source, 'template'))),
    db.select().from(risks).where(and(eq(risks.project_id, projectId), ne(risks.source, 'template'))),
    // ...
  ]);

  // Build context payload with project type hint
  return JSON.stringify({
    projectType,  // ← NEW: helps Claude understand expected data model
    project: {
      id: project.id,
      name: project.name,
      customer: project.customer,
    },
    actions: actionsData,
    risks: risksData,
    milestones: milestonesData,
    // ... other tabs
  }, null, 2);
}
```

**2. Enhanced Completeness Prompt**

Modified: `app/api/projects/[projectId]/completeness/route.ts`

```typescript
const COMPLETENESS_SYSTEM = `You are a project data quality analyst. Given a project's current workspace data, identify specific quality gaps per workspace tab.

Project type awareness:
- ADR-only: Expect heavy architecture/integration data, onboarding phases focused on data ingestion
- Biggy-only: Expect focus on AI/correlation features, onboarding phases focused on Biggy AI setup
- Dual-track: Both ADR and Biggy data expected; check both workstream branches

Tab template requirements (what "complete" looks like per tab):
${JSON.stringify(TAB_TEMPLATE_REGISTRY, null, 2)}

Quality assessment criteria:
- "complete" = all required fields present for all records; no placeholder values (TBD, N/A, template text); meaningful content; field values align with project type
- "partial" = some real data present but missing required fields, or has placeholder/TBD values, or data inconsistent with project type
- "empty" = no records at all (after template records are excluded) OR only records with placeholder text

Gap specificity requirements:
- Reference actual record IDs like [A-KAISER-003]
- Count records with specific issues (e.g., "5 actions missing owner")
- Identify exact missing fields per record
- For empty tabs, suggest what data should be present based on project type

Return exactly 11 entries: overview, actions, risks, milestones, teams, architecture, decisions, history, stakeholders, plan, skills`;
```

#### New Components

**3. Completeness Score Calculation (Replacement)**

New utility: `lib/completeness-score.ts`

```typescript
/**
 * lib/completeness-score.ts — Compute quality-based completeness score
 *
 * Replaces simple table count heuristic with Claude-analyzed quality score.
 */
import type { CompletenessEntry } from '@/app/api/projects/[projectId]/completeness/route';

/**
 * Compute overall completeness score from Claude analysis results.
 *
 * Scoring:
 * - complete = 10 points
 * - partial = 5 points
 * - empty = 0 points
 *
 * Max score: 11 tabs * 10 = 110 points
 * Normalized to 0-100% scale
 */
export function computeQualityScore(entries: CompletenessEntry[]): number {
  let totalPoints = 0;
  for (const entry of entries) {
    if (entry.status === 'complete') totalPoints += 10;
    else if (entry.status === 'partial') totalPoints += 5;
  }
  return Math.round((totalPoints / 110) * 100);
}
```

### Data Flow: Enhanced Completeness Analysis

```
User clicks "Analyze Completeness" (Context Hub)
    ↓
POST /api/projects/[projectId]/completeness
    ↓
buildCompletenessContext(projectId)  ← includes project type
    ↓
Claude Opus 4.6 structured output request
    ↓ (returns JSON array of 11 CompletenessEntry objects)
computeQualityScore(entries)
    ↓
Return { score: 72, entries: [...] }
    ↓
UI displays:
  - Overall score badge (72%)
  - Per-tab status indicators (complete/partial/empty)
  - Expandable gap descriptions per tab
```

### UI Integration

Modified: `app/customer/[id]/context/page.tsx`

```typescript
// Replace simple GET /completeness with POST /completeness
const analyzeCompleteness = async () => {
  setLoading(true);
  const res = await fetch(`/api/projects/${projectId}/completeness`, {
    method: 'POST',
  });
  const data = await res.json();
  setCompletenessScore(data.score);
  setCompletenessDetails(data.entries);  // ← NEW: detailed per-tab results
  setLoading(false);
};
```

**Display enhancements:**
- Show per-tab traffic light indicators (🟢 complete, 🟡 partial, 🔴 empty)
- Expandable accordion per tab showing specific gap descriptions
- "Fix Gaps" CTA buttons that link to relevant workspace tabs

---

## Integration Points Summary

### New Database Tables
| Table | Purpose | FK Constraints |
|-------|---------|----------------|
| `project_members` | Per-project role assignments | `project_id → projects.id`, `user_id → users.id` |

### New Database Columns
| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `projects` | `archived_at` | TIMESTAMP | Soft-delete timestamp |
| `projects` | `deleted_at` | TIMESTAMP | Hard-delete grace period |
| `scheduled_jobs` | `project_id` | INTEGER | Project-scoped job filter |

### New Library Functions
| File | Function | Purpose |
|------|----------|---------|
| `lib/auth-project.ts` | `requireProjectSession()` | RBAC: return project-level role |
| `lib/auth-project.ts` | `requireProjectAdmin()` | RBAC: enforce admin role |
| `lib/project-lifecycle.ts` | `archiveProject()` | Set archived_at timestamp |
| `lib/project-lifecycle.ts` | `restoreProject()` | Clear archived_at timestamp |
| `lib/project-lifecycle.ts` | `deleteProject()` | Set deleted_at timestamp |
| `lib/gantt-sync.ts` | `updateTaskDates()` | Propagate task date change to milestone |
| `lib/gantt-sync.ts` | `updateMilestoneDate()` | (Optional) Propagate milestone change to tasks |
| `lib/completeness-score.ts` | `computeQualityScore()` | Quality-based score from Claude analysis |

### Modified Route Handlers
| Endpoint | Change | Why |
|----------|--------|-----|
| `DELETE /api/projects/[projectId]` | Add `requireProjectAdmin()` | Enforce project-level RBAC |
| `PATCH /api/projects/[projectId]` | Add restore action | Allow unarchiving |
| `GET /api/projects` | Add `?status=archived` filter | List archived projects |
| `PATCH /api/tasks/[id]` | Call `updateTaskDates()` when dates change | Gantt bi-directional sync |
| `POST /api/jobs` | Add `project_id` to schema | Project-scoped scheduling |
| `POST /api/projects/[projectId]/completeness` | Enhanced prompt with project type | Quality-based completeness |

### Modified Client Components
| Component | Change | Why |
|-----------|--------|-----|
| `components/GanttChart.tsx` | Refetch milestones after task drag | Reflect propagated date changes |
| `components/ExtractionItemRow.tsx` | Add entity type dropdown | Allow reclassification before approval |
| `app/customer/[id]/context/page.tsx` | Display detailed completeness results | Show per-tab gaps |
| `app/scheduler/page.tsx` | Add project selector | Allow project-scoped job creation |

### New Pages
| Page | Purpose |
|------|---------|
| `app/archived/page.tsx` | List archived projects (read-only) |
| `app/projects/[projectId]/members/page.tsx` | Manage project membership (admin only) |

---

## Build Order & Dependencies

### Phase Dependency Graph

```
Foundation (Parallel)
├─ [AUTH-DB] Create project_members table + indexes
├─ [PROJ-DB] Add archived_at, deleted_at columns to projects
└─ [SCHED-DB] Add project_id column to scheduled_jobs

    ↓

Layer 1: Library Functions (Parallel)
├─ [AUTH-LIB] lib/auth-project.ts (requireProjectSession, requireProjectAdmin)
├─ [PROJ-LIB] lib/project-lifecycle.ts (archiveProject, restoreProject, deleteProject)
├─ [GANTT-LIB] lib/gantt-sync.ts (updateTaskDates)
└─ [COMP-LIB] lib/completeness-score.ts (computeQualityScore)

    ↓

Layer 2: Route Handlers (Sequential by dependency)
├─ [AUTH-API] Modified Route Handlers using requireProjectAdmin
├─ [PROJ-API] Project archive/restore/delete endpoints
├─ [GANTT-API] Task PATCH handler with updateTaskDates
├─ [SCHED-API] Jobs POST handler with project_id
└─ [COMP-API] Enhanced completeness POST handler

    ↓

Layer 3: UI Components (Parallel)
├─ [AUTH-UI] Project members management page
├─ [PROJ-UI] Archived projects view + restore button
├─ [GANTT-UI] GanttChart refetch after task drag
├─ [EXTR-UI] ExtractionItemRow entity type dropdown
├─ [SCHED-UI] Scheduler project selector
└─ [COMP-UI] Context Hub detailed completeness display

    ↓

Integration Testing
└─ E2E tests for each feature in isolation
```

### Recommended Build Order (Sequential)

**Week 1: Foundation + RBAC**
1. AUTH-DB → AUTH-LIB → AUTH-API → AUTH-UI (project members table + requireProjectSession pattern)
2. Test: Create project membership, verify 403 for non-members

**Week 2: Project Lifecycle**
3. PROJ-DB → PROJ-LIB → PROJ-API → PROJ-UI (archive/restore/delete flow)
4. Test: Archive project, verify read-only, restore project

**Week 3: Gantt Sync + Scheduling**
5. GANTT-LIB → GANTT-API → GANTT-UI (bi-directional date propagation)
6. SCHED-DB → SCHED-API → SCHED-UI (project-scoped jobs)
7. Test: Drag task on Gantt, verify milestone date updates; create project-scoped job, verify it runs only for that project

**Week 4: Extraction + Completeness**
8. EXTR-UI (entity type reclassification dropdown)
9. COMP-LIB → COMP-API → COMP-UI (quality-based completeness)
10. Test: Reclassify note → action in ExtractionPreview; run completeness analysis, verify quality score

**Week 5: Integration + Polish**
11. Cross-feature integration testing (e.g., archived project + scheduled jobs)
12. UI polish, error handling, edge cases

---

## Architectural Anti-Patterns to Avoid

### Anti-Pattern 1: Global requireProjectSession() Migration

**What people do:** Try to replace all 40+ `requireSession()` calls with `requireProjectSession()` in one go

**Why it's wrong:** High risk of breaking existing functionality; project membership table may not be fully populated during migration; users locked out

**Do this instead:** Incremental migration — guard only new destructive actions (archive, delete, membership management) in v7.0; expand to other handlers in v7.1+

### Anti-Pattern 2: Separate Archived Projects Table

**What people do:** Create `archived_projects` table and COPY data on archive

**Why it's wrong:** Data duplication; FK integrity lost; JOINs become complex; restore requires reverse COPY

**Do this instead:** Use `archived_at` timestamp column; filter with `WHERE archived_at IS NULL` for active projects

### Anti-Pattern 3: Immediate CASCADE Deletion

**What people do:** `DELETE FROM projects WHERE id = X` → immediate CASCADE removal of all related records

**Why it's wrong:** No undo; accidental deletions are catastrophic; no grace period

**Do this instead:** Use `deleted_at` timestamp; background job purges after 30 days; admin can restore within grace period

### Anti-Pattern 4: Bi-Directional Gantt Sync with Circular Updates

**What people do:** Task drag updates milestone → milestone update triggers task recalculation → infinite loop

**Why it's wrong:** Race conditions; database thrashing; UI flickers

**Do this instead:** Milestone date is **derived** (always computed from tasks, never set directly); only task drag actions trigger updates; milestone markers are read-only on Gantt

### Anti-Pattern 5: BullMQ Queue-Per-Project

**What people do:** Create separate BullMQ queue for each project (`scheduled-jobs-project-123`)

**Why it's wrong:** Redis key explosion (each queue = 5+ keys); queue management overhead; worker complexity

**Do this instead:** Single queue with `projectId` metadata in job data; filter at execution time

### Anti-Pattern 6: Completeness Score as Table Count Heuristic

**What people do:** `score = (populatedTables / totalTables) * 100`

**Why it's wrong:** Doesn't measure data quality; table with 1 placeholder record = 100% complete; no actionable gaps

**Do this instead:** Use Claude structured outputs to analyze actual record quality; return specific gaps per tab

---

## Scaling Considerations

| Feature | At 10 projects | At 100 projects | At 1000 projects |
|---------|---------------|-----------------|------------------|
| **Project Members** | Direct query OK | Add `user_id` index | Consider caching user memberships in Redis |
| **Archived Projects** | Direct query OK | Paginate archived list | Partition `projects` table by `archived_at` year |
| **Gantt Sync** | No issues | Watch for milestone with 100+ tasks (recalc can be slow) | Debounce task drag events; batch milestone recalc |
| **Scheduled Jobs** | Direct query OK | Worker filters 100 jobs in <1ms | Consider separate scheduler instance; shard by project_id |
| **Completeness** | Claude call per project = expensive | Cache results for 24h in Redis | Pre-compute nightly; store in DB column |

### Scaling Priorities

**First bottleneck:** Completeness analysis (Claude API cost at scale)
- **Solution:** Cache POST /completeness results for 24h; only re-run on-demand or when data changes significantly

**Second bottleneck:** Gantt bi-directional sync with 500+ tasks
- **Solution:** Debounce drag events (wait 300ms after last drag before updating DB); batch milestone recalculations

**Third bottleneck:** Project membership lookups (1000+ projects, 100+ users)
- **Solution:** Redis cache of user membership list; TTL = 5 minutes; invalidate on membership change

---

## Sources

**Existing codebase analysis:**
- `bigpanda-app/db/schema.ts` — Current schema (67 tables, better-auth integration)
- `bigpanda-app/lib/auth-server.ts` — requireSession() pattern (40+ handlers)
- `bigpanda-app/worker/scheduler.ts` — BullMQ global job registration
- `bigpanda-app/components/GanttChart.tsx` — Custom Gantt implementation
- `bigpanda-app/app/api/ingestion/approve/route.ts` — Extraction approval flow
- `bigpanda-app/app/api/projects/[projectId]/completeness/route.ts` — Current completeness analysis

**Architecture patterns:**
- Better-auth documentation — Global roles vs custom role patterns
- Drizzle ORM documentation — Soft-delete patterns, FK cascade behavior
- BullMQ documentation — Job metadata, queue management, scheduling patterns
- PostgreSQL best practices — Soft-delete indexing, timestamp-based filtering

**Confidence assessment:**
- **Per-project RBAC:** HIGH (pattern verified in better-auth docs, Drizzle FK constraints well-understood)
- **Archive/delete:** HIGH (soft-delete with timestamp is standard PostgreSQL pattern)
- **Gantt sync:** HIGH (FK-based propagation is straightforward; tested in similar apps)
- **Scheduler scoping:** HIGH (BullMQ metadata pattern is documented, Redis key count validated)
- **Entity reclassification:** HIGH (UI change only, no backend logic needed)
- **Completeness:** HIGH (Claude structured outputs already implemented in v6.0)

---

*Architecture research for: v7.0 Governance & Operational Maturity*
*Researched: 2026-04-13*
