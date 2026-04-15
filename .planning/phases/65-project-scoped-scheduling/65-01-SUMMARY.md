---
phase: 65-project-scoped-scheduling
plan: 01
subsystem: scheduling
tags: [schema, migration, api, tdd]
dependency_graph:
  requires: []
  provides:
    - scheduled_jobs.project_id nullable FK
    - GET /api/jobs project filtering
    - POST /api/jobs project_id field
  affects:
    - Phase 65-02 (project jobs API)
    - Phase 65-04 (UI scheduling)
tech_stack:
  added: []
  patterns:
    - "TDD RED-GREEN cycle for schema changes"
    - "Optional query params for API filtering"
    - "isNull() and eq() for Drizzle WHERE clauses"
key_files:
  created:
    - bigpanda-app/db/migrations/0034_scheduled_jobs_project_id.sql
    - bigpanda-app/__tests__/scheduled-jobs-schema.test.ts
  modified:
    - bigpanda-app/db/schema.ts
    - bigpanda-app/app/api/jobs/route.ts
    - bigpanda-app/components/Sidebar.tsx
decisions:
  - decision: "Use ON DELETE SET NULL for project_id FK"
    rationale: "If a project is deleted, jobs become global rather than being deleted or orphaned"
    alternatives: ["ON DELETE CASCADE (too destructive)", "ON DELETE RESTRICT (blocks project deletion)"]
  - decision: "Global view (no projectId param) filters to IS NULL, not all jobs"
    rationale: "Separates global and project-scoped jobs; prevents project jobs from appearing in global scheduler"
    alternatives: ["Show all jobs in global view (rejected: breaks scoping model)"]
  - decision: "Remove NotificationBadge from Scheduler sidebar link"
    rationale: "Failures will be per-project in future phases; global badge no longer appropriate"
    alternatives: ["Keep badge until Phase 65-03 (rejected: creates UX confusion during transition)"]
metrics:
  duration_seconds: 299
  completed_at: "2026-04-15T19:56:14Z"
---

# Phase 65 Plan 01: Schema and API Foundation for Project-Scoped Scheduling — Summary

**One-liner:** Added nullable project_id FK to scheduled_jobs, implemented GET/POST filtering by project (IS NULL for global), removed scheduler failure badge from nav.

## Objective Recap

Add project_id to the scheduled_jobs schema, update the global jobs API to support project-scoped filtering, and remove the nav badge from the Scheduler sidebar link. This is the schema and API foundation that all project-scoped scheduling features depend on. Without project_id on the table, no filtering is possible.

## What Was Built

### Task 1: Schema + Migration (TDD)
- **RED:** Created test verifying `scheduledJobs.project_id` exists and is nullable
- **GREEN:** Added `project_id: integer('project_id').references(() => projects.id, { onDelete: 'set null' })` to schema
- **Migration:** `0034_scheduled_jobs_project_id.sql` with `ALTER TABLE ADD COLUMN` + FK constraint
- **Result:** Existing jobs automatically get `project_id = NULL` (become global jobs)

### Task 2: API Filtering
- **GET /api/jobs:**
  - Added optional `?projectId=N` query param
  - If present: filter to `WHERE project_id = N` using `eq()`
  - If absent: filter to `WHERE project_id IS NULL` using `isNull()` (global jobs only)
- **POST /api/jobs:**
  - Added optional `project_id` field to `CreateJobSchema` (zod validation)
  - Insert includes `project_id: project_id ?? null`
- **Imports:** Added `isNull` and `eq` from `drizzle-orm`

### Task 3: Sidebar Badge Removal
- Removed `<NotificationBadge count={schedulerFailureCount} />` from Scheduler link JSX
- Removed `schedulerFailureRows` query from `Promise.all` destructure
- Removed unused imports: `NotificationBadge`, `appNotifications`, `eq`, `and`, `db`
- Clean TypeScript compilation with no unused variable warnings

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

All verification steps passed:

1. **TypeScript compilation:** No new errors introduced; baseline errors unrelated to changes
2. **Migration file exists:** `bigpanda-app/db/migrations/0034_scheduled_jobs_project_id.sql` (484 bytes)
3. **Schema type includes project_id:** `scheduledJobs.$inferSelect` now has `project_id: number | null`
4. **TDD test passes:** `__tests__/scheduled-jobs-schema.test.ts` GREEN (2/2 tests pass)
5. **API route compiles:** No TypeScript errors in `app/api/jobs/route.ts`
6. **Sidebar compiles:** No unused variable warnings in `components/Sidebar.tsx`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (RED) | 80c22c8 | test(65-01): add failing test for scheduledJobs.project_id field |
| 1 (GREEN) | bc2e93b | feat(65-01): implement project_id on scheduledJobs schema |
| 2 | 5a8802a | feat(65-01): add project-scoped filtering to GET/POST /api/jobs |
| 3 | 494438e | refactor(65-01): remove NotificationBadge from Scheduler nav link |

## Key Technical Details

### Schema Change
```typescript
// Before (line 656-669)
export const scheduledJobs = pgTable('scheduled_jobs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  // ... other fields
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// After
export const scheduledJobs = pgTable('scheduled_jobs', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  // ... other fields
  skill_params_json: jsonb('skill_params_json').default({}).notNull(),
  project_id: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  last_run_at: timestamp('last_run_at'),
  // ... remaining fields
});
```

### API Filtering Pattern
```typescript
// GET handler (lines 45-74)
const url = new URL(request.url);
const projectIdParam = url.searchParams.get('projectId');

let query = db.select().from(scheduledJobs);

if (projectIdParam) {
  const projectId = parseInt(projectIdParam, 10);
  if (!isNaN(projectId)) {
    query = query.where(eq(scheduledJobs.project_id, projectId));
  }
} else {
  // Global view: only jobs with project_id IS NULL
  query = query.where(isNull(scheduledJobs.project_id));
}
```

### Migration SQL
```sql
ALTER TABLE "scheduled_jobs"
  ADD COLUMN "project_id" integer REFERENCES "projects"("id") ON DELETE SET NULL;
```

## Next Steps (Phase 65 Continuation)

- **Plan 02:** Project-scoped jobs API (`/api/projects/[id]/jobs`) with RBAC enforcement
- **Plan 03:** UI updates (add/edit modal, project dropdown, filtering)
- **Plan 04:** Scheduler worker integration (pass project context to BullMQ jobs)

## Blockers

None.

## Notes

- **Backward compatibility:** All existing jobs become global (project_id = NULL) automatically
- **Admin-only enforcement:** Current global API remains admin-only; per-project RBAC added in Plan 02
- **ON DELETE SET NULL semantics:** If project is deleted, its jobs become global instead of being cascade-deleted
- **Badge removal:** Scheduler failure notifications will be per-project in future phases; global badge no longer fits the model

---

## Self-Check: PASSED

All created files exist:
- bigpanda-app/db/migrations/0034_scheduled_jobs_project_id.sql ✓
- bigpanda-app/__tests__/scheduled-jobs-schema.test.ts ✓

All commits exist:
- 80c22c8 ✓
- bc2e93b ✓
- 5a8802a ✓
- 494438e ✓

---

**Phase 65-01 complete.** Schema and API foundation in place for project-scoped scheduling.
