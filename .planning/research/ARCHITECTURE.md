# Architecture Integration — v4.0 Features

**Domain:** BigPanda Project Assistant v4.0 Infrastructure & UX Foundations
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

v4.0 introduces three major architectural changes to the existing Next.js 16 / PostgreSQL / BullMQ stack:

1. **BullMQ extraction job**: Move document extraction from SSE (Server-Sent Events) to background job queue with job status polling and Redis-based progress tracking
2. **Time tracking redesign**: Move from per-project tab (`/customer/[id]/time`) to global top-level route (`/time-tracking`) with cross-project visibility
3. **Overview tab overhaul**: Add ADR/Biggy workstream separation, Health Dashboard, Metrics sections, and weekly focus summary (scheduled AI job)

All features integrate cleanly with existing infrastructure. No breaking changes to core systems. Primary challenge: DB schema for workstream track attribution and progress state management for chunked extraction jobs.

## Current Architecture Snapshot

### Route Structure
```
/app
  /dashboard (root)                     — all projects view
  /customer/[id]                        — project workspace hub
    /overview                           — completeness + onboarding dashboard (v3.0)
    /actions, /risks, /milestones       — workspace tabs
    /time                               — per-project time entries (v2.0 Phase 23)
    /context-hub                        — document upload + extraction (v3.0 Phase 30)
  /settings
    /time-tracking                      — admin config (v2.0 Phase 23)
  /scheduler                            — job management UI (v2.0 Phase 24)
```

### BullMQ Infrastructure (v1.0 Phase 4, v2.0 Phase 24)
- **Queue**: `scheduled-jobs` (single queue, multiple job types)
- **Worker**: `worker/index.ts` — dispatches to `worker/jobs/*.ts` handlers
- **Redis**: Local Redis 7.2.4 via `tools/redis/redis-7.2.4/src/redis-server`
- **Connection factory**: `worker/connection.ts` — separate connections for Queue vs Worker (BullMQ requirement)
- **Scheduler**: DB-driven via `scheduled_jobs` table; 60s polling loop re-registers cron jobs

### DB Schema (PostgreSQL + Drizzle ORM)
- **Projects**: `projects` table (id, name, customer, status, seeded)
- **Workspace entities**: `actions`, `risks`, `milestones`, `stakeholders`, `key_decisions`, `tasks`, `business_outcomes`
- **Onboarding**: `onboarding_phases`, `onboarding_steps`, `integrations` (v2.0 Phase 21)
- **Workstreams**: `workstreams` table (id, project_id, name, track, current_status, percent_complete) — v2.0 Phase 17
- **Time tracking**: `time_entries` (id, project_id, date, hours, description, submitted_by, approval fields) — v2.0 Phase 23
- **Jobs**: `scheduled_jobs` (id, name, skill_name, cron_expression, enabled, run_history_json) — v2.0 Phase 24
- **Artifacts**: `artifacts` (id, project_id, name, ingestion_status, ingestion_log_json) — v2.0 Phase 18

### Extraction System (v3.0 Phase 30)
- **Route**: `POST /api/ingestion/extract` — SSE stream
- **Flow**: Upload → extract text → Claude entity extraction (chunked, 80K chars/chunk) → dedup → preview UI → approve/dismiss
- **Storage**: Files in `{workspace_path}/ingestion/{projectId}/{filename}`
- **Status**: `artifacts.ingestion_status` enum (pending, extracting, preview, approved, failed)

## Feature 1: BullMQ Extraction Job

### Problem Statement
Current SSE extraction is synchronous and vulnerable to browser refresh. Large documents (>50KB) take 4-6 minutes; if user closes tab, extraction fails silently and `ingestion_status` remains `extracting` indefinitely.

### Architectural Integration

#### New Components

| Component | Type | Purpose |
|-----------|------|---------|
| `POST /api/ingestion/extract-job` | API route | Enqueues extraction job, returns `{ jobId }` |
| `GET /api/ingestion/extract-job/[jobId]` | API route | Job status polling endpoint |
| `worker/jobs/document-extraction.ts` | BullMQ job handler | Processes extraction in background |
| `ExtractionJobStatus` React component | Client UI | Polls job status, shows progress |

#### Modified Components

| Component | Change | Impact |
|-----------|--------|--------|
| `POST /api/ingestion/extract` | Mark deprecated or remove | Breaking change: clients switch to new route |
| `ContextHub` component | Replace SSE `EventSource` with polling `useEffect` | UI refactor — no backend change |
| `artifacts` table | Already has `ingestion_status` and `ingestion_log_json` | No schema change needed |

#### Data Flow

```
Client                 API Route                 Redis                 Worker
  |                       |                        |                      |
  | POST /extract-job     |                        |                      |
  |--------------------->|                         |                      |
  |                      | enqueue job             |                      |
  |                      |------------------------>|                      |
  |                      | return { jobId }        |                      |
  |<---------------------|                         |                      |
  |                      |                         |                      |
  | GET /extract-job/:id |                         |                      |
  |--------------------->|                         |                      |
  |                      | get job from queue      |                      |
  |                      |------------------------>|                      |
  |                      | return { status, progress } |                  |
  |<---------------------|                         |                      |
  |                      |                         |                      |
  |                      |                         | pick up job          |
  |                      |                         |--------------------->|
  |                      |                         |                      | update DB status
  |                      |                         |                      | extract chunk 1/N
  |                      |                         |                      | set Redis progress
  |                      |                         |                      | extract chunk 2/N
  |                      |                         |                      | ...
  |                      |                         |                      | dedup + store preview
  |                      |                         |                      | mark complete
  |                      |                         |<---------------------|
```

#### Progress State Management

**Redis keys (ephemeral, TTL 1 hour):**
```
extraction:{artifactId}:progress    — JSON: { current: 2, total: 5, status: 'extracting' }
```

**DB state (persistent):**
- `artifacts.ingestion_status`: `pending` → `extracting` → `preview` (or `failed`)
- `artifacts.ingestion_log_json`: Array of `{ timestamp, chunk, items_extracted }` entries

**Polling strategy:**
- Client polls every 2s while status = `extracting`
- Worker updates Redis progress after each chunk
- Worker updates DB status at start (`extracting`) and end (`preview` or `failed`)

#### Job Handler Signature

```typescript
// worker/jobs/document-extraction.ts
export default async function documentExtractionJob(job: Job): Promise<{ status: string }> {
  const { artifactId, projectId } = job.data;

  // 1. Update artifacts.ingestion_status = 'extracting'
  // 2. Read file from disk
  // 3. Extract text (PDF as base64 doc block, others as text chunks)
  // 4. For each chunk:
  //    - Call Claude extraction API
  //    - Store progress in Redis: extraction:{artifactId}:progress
  //    - Append to artifacts.ingestion_log_json
  // 5. Dedup (isAlreadyIngested for each item)
  // 6. Store preview items in Redis: extraction:{artifactId}:items (JSON array)
  // 7. Update artifacts.ingestion_status = 'preview'
  // 8. Return { status: 'complete' }
}
```

**Reuse existing logic:**
- Chunking: `splitIntoChunks()` from current `/api/ingestion/extract`
- Extraction: `extractDocumentText()`, `runClaudeCall()`, `parseClaudeResponse()`
- Dedup: `isAlreadyIngested()` — already exported from current route

#### Schema Changes

**None required.** Existing `artifacts` table already has:
- `ingestion_status` enum (pending, extracting, preview, approved, failed)
- `ingestion_log_json` JSONB field (can store chunk progress)

**Optional enhancement (deferred to v5.0):**
- New table `extraction_jobs` for job metadata (jobId, artifactId, queuedAt, startedAt, completedAt, errorMessage)

### Testing Strategy

**Integration test:**
1. Upload 200-page PDF via `POST /api/ingestion/upload`
2. Trigger extraction job via `POST /api/ingestion/extract-job`
3. Poll status every 2s, verify Redis progress updates
4. After completion, verify DB status = `preview` and items present

**Failure scenarios:**
- Worker crash mid-extraction: Job retries (BullMQ retry policy), Redis progress cleared on retry
- Redis unavailable: Worker logs error, falls back to DB-only progress (no intermediate updates)

### Migration Path

1. **Phase 1**: New `/api/ingestion/extract-job` route + worker handler (coexists with old SSE route)
2. **Phase 2**: Update Context Hub UI to use polling (feature flag toggles between SSE and polling)
3. **Phase 3**: Remove old `/api/ingestion/extract` route after UAT confirms new flow works

---

## Feature 2: Time Tracking Redesign

### Problem Statement
Current time tracking is siloed per-project (`/customer/[id]/time`). Users managing multiple projects must navigate to each project individually to log time. No global view of weekly hours across all projects.

### Architectural Integration

#### New Components

| Component | Type | Purpose |
|-----------|------|---------|
| `/app/time-tracking/page.tsx` | Route page | Global time entry view (all projects) |
| `/app/time-tracking/layout.tsx` | Route layout | Optional: breadcrumb + week navigation UI |
| `GET /api/time-tracking/entries` | API route | Fetch time entries across all projects (with filters) |
| `POST /api/time-tracking/entries` | API route | Create time entry (requires `project_id` in body) |
| `PATCH /api/time-tracking/entries/[id]` | API route | Update entry |
| `DELETE /api/time-tracking/entries/[id]` | API route | Delete entry |
| `TimeTrackingGrid` React component | Client UI | Weekly calendar grid with project assignment |

#### Modified Components

| Component | Change | Impact |
|-----------|--------|--------|
| `/app/customer/[id]/time/page.tsx` | Convert to read-only summary OR remove entirely | Breaking change: redirect to `/time-tracking?project={id}` |
| `/app/settings/time-tracking/page.tsx` | No change | Admin config remains in Settings |
| Sidebar navigation | Add "Time Tracking" top-level link | UI-only change |

#### Data Model Changes

**No schema changes required.** `time_entries` table already has:
- `project_id` FK (attribution to project)
- `date` (ISO 'YYYY-MM-DD')
- `hours` (decimal string)
- `description` (text)
- `submitted_by`, `approved_by` (approval workflow fields from v2.0 Phase 23)

**Query patterns:**

```sql
-- Global view: all entries for current user for a given week
SELECT te.*, p.name as project_name, p.customer
FROM time_entries te
JOIN projects p ON p.id = te.project_id
WHERE te.submitted_by = 'user@example.com'
  AND te.date BETWEEN '2026-03-31' AND '2026-04-06'
ORDER BY te.date, p.name;

-- Project summary: total hours per project for a week
SELECT p.id, p.name, SUM(te.hours::numeric) as total_hours
FROM time_entries te
JOIN projects p ON p.id = te.project_id
WHERE te.submitted_by = 'user@example.com'
  AND te.date BETWEEN '2026-03-31' AND '2026-04-06'
GROUP BY p.id, p.name;
```

#### UI Architecture

**Global Time Tracking View** (`/time-tracking`)

```
┌─────────────────────────────────────────────────────────────┐
│ Time Tracking — Week of Apr 1, 2026         [← Prev] [Next →]│
├─────────────────────────────────────────────────────────────┤
│ Project              │ Mon │ Tue │ Wed │ Thu │ Fri │ Total  │
├──────────────────────┼─────┼─────┼─────┼─────┼─────┼────────┤
│ BigPanda (Kaiser)    │ 4.0 │ 6.0 │ 5.0 │ 8.0 │ 4.0 │ 27.0h │
│ Acme Corp (Pilot)    │ 2.0 │ 2.0 │ 3.0 │ 0   │ 4.0 │ 11.0h │
│ [+ Add Project]      │     │     │     │     │     │        │
├──────────────────────┴─────┴─────┴─────┴─────┴─────┼────────┤
│ Weekly Total                                        │ 38.0h  │
│ Target (from config)                                │ 40.0h  │
└─────────────────────────────────────────────────────┴────────┘

Click cell to edit entry (inline modal: hours, description, category)
```

**Project Time Tab** (`/customer/[id]/time`) — **Two Options**

**Option A: Read-only summary (recommended)**
- Show total hours logged for this project (this week, last 4 weeks, all time)
- Link to `/time-tracking?project={id}` for editing
- Display recent entries (last 10)

**Option B: Remove entirely**
- Redirect `/customer/[id]/time` → `/time-tracking?project={id}`
- Remove from tab navigation

**Recommendation:** Option A — preserves existing route structure, avoids breaking bookmarks, provides project-scoped context.

#### Route Parameter Strategy

**Filter by project:**
```
/time-tracking?project=3           — pre-filter to project ID 3
/time-tracking?week=2026-W14       — specific week
/time-tracking?project=3&week=2026-W14
```

**API route mirrors filters:**
```
GET /api/time-tracking/entries?project_id=3&week=2026-W14
```

#### Authentication & Authorization

- **Session requirement**: `requireSession()` at API route level (same as existing routes)
- **User isolation**: Filter `time_entries` by `submitted_by = session.user.email`
- **Admin view**: If `session.user.role = 'admin'`, allow `?user={email}` query param to view other users' entries

### Testing Strategy

**Integration test:**
1. Create 3 projects
2. Log time entries for 2 projects across a week via `POST /api/time-tracking/entries`
3. `GET /time-tracking` — verify grid shows all entries
4. Filter by project: `GET /time-tracking?project=1` — verify only project 1 entries shown
5. Edit entry via `PATCH /api/time-tracking/entries/[id]` — verify update reflected in grid

**Edge cases:**
- User has 0 time entries: Show empty state with "Log your first entry" CTA
- User has 20 active projects: Pagination or collapsible project list

### Migration Path

1. **Phase 1**: Create `/time-tracking` route + API handlers (coexists with old per-project tab)
2. **Phase 2**: Convert `/customer/[id]/time` to read-only summary with link to new route
3. **Phase 3**: Update sidebar navigation to promote `/time-tracking` to top-level

---

## Feature 3: Overview Tab Overhaul

### Problem Statement
Current Overview tab (`/customer/[id]/overview`) shows:
- Completeness score (< 60% warning banner)
- Onboarding Dashboard (phases/steps/integrations)

v4.0 requirements add:
1. **ADR/Biggy workstream separation**: Onboarding phases/steps must be grouped by track (ADR vs Biggy)
2. **Health Dashboard**: Key project health metrics (risks, blockers, velocity)
3. **Metrics section**: Numeric KPIs (hours logged, completion %, SLA compliance)
4. **Integration Tracker redesign**: Replace current flat list with track-aware grouping
5. **Weekly focus summary**: AI-generated 3-bullet summary of this week's priorities (scheduled BullMQ job)
6. **Visual milestone timeline**: Horizontal timeline with milestones + dates
7. **Remove Project Completeness**: Completeness score moved to Context Hub or removed entirely

### Architectural Integration

#### Schema Changes Required

**Problem:** Current `onboarding_phases` and `onboarding_steps` tables lack explicit track attribution.

**Current schema:**
```typescript
onboardingPhases = {
  id: serial,
  project_id: integer,
  name: text,
  display_order: integer,
}

onboardingSteps = {
  id: serial,
  phase_id: integer,
  project_id: integer,
  name: text,
  status: enum('not-started', 'in-progress', 'complete', 'blocked'),
  owner: text,
  dependencies: text[],
  updates: jsonb,
  display_order: integer,
}
```

**Option 1: Add `track` column to existing tables (recommended)**

```sql
-- Migration: Add track field to onboarding_phases
ALTER TABLE onboarding_phases ADD COLUMN track TEXT;
UPDATE onboarding_phases SET track = 'ADR' WHERE name ILIKE '%ADR%';
UPDATE onboarding_phases SET track = 'Biggy' WHERE name ILIKE '%Biggy%';

-- Migration: Add track field to onboarding_steps (denormalized for query performance)
ALTER TABLE onboarding_steps ADD COLUMN track TEXT;
UPDATE onboarding_steps SET track = (
  SELECT track FROM onboarding_phases WHERE id = onboarding_steps.phase_id
);
```

**Benefits:**
- Backward compatible (nullable field, existing rows work without track)
- Fast queries: `SELECT * FROM onboarding_steps WHERE project_id = ? AND track = 'ADR'`
- Denormalized `track` on steps avoids JOIN overhead

**Option 2: Separate `workstream` FK on onboarding_steps**

```sql
-- Migration: Add workstream_id FK to onboarding_steps
ALTER TABLE onboarding_steps ADD COLUMN workstream_id INTEGER REFERENCES workstreams(id);
```

**Drawbacks:**
- Requires `workstreams` table to be populated for every project
- Breaking change: existing steps have `workstream_id = NULL`
- More complex queries: must JOIN workstreams to get track

**Recommendation:** **Option 1** — simpler migration, faster queries, no breaking changes.

#### New Components

| Component | Type | Purpose |
|-----------|------|---------|
| `HealthDashboard` React component | Client UI | Risk count, blocker count, velocity trend |
| `MetricsSection` React component | Client UI | Numeric KPIs grid |
| `WeeklyFocusSummary` React component | Client UI | 3-bullet AI summary (fetches from cache) |
| `MilestoneTimeline` React component | Client UI | Horizontal timeline with milestones |
| `GET /api/projects/[projectId]/weekly-focus` | API route | Returns cached weekly focus summary |
| `worker/jobs/weekly-focus-generator.ts` | BullMQ job handler | Generates AI summary every Monday 6am |

#### Modified Components

| Component | Change | Impact |
|-----------|--------|--------|
| `/app/customer/[id]/overview/page.tsx` | Remove completeness score, add new sections | UI refactor — no breaking API changes |
| `OnboardingDashboard` component | Add track filtering (ADR vs Biggy tabs) | UI enhancement — existing data model works |
| `onboarding_phases` table | Add `track` column (nullable) | Migration required |
| `onboarding_steps` table | Add `track` column (nullable, denormalized) | Migration required |

#### Weekly Focus Summary Architecture

**Problem:** Overview tab needs a "What's the focus this week?" section with 3 AI-generated bullets. This could be:
1. On-demand (user clicks "Generate Focus" button, waits 5-10s)
2. Scheduled (BullMQ cron job runs every Monday 6am, caches result)

**Recommendation:** **Scheduled job** — consistent UX, no wait time, leverages existing BullMQ infrastructure.

**Data Flow:**

```
Monday 6am (cron)       Worker                 Claude API            Cache
      |                   |                        |                    |
      | trigger job       |                        |                    |
      |------------------>|                        |                    |
      |                   | fetch project context  |                    |
      |                   | (actions, milestones)  |                    |
      |                   | build prompt           |                    |
      |                   |----------------------->|                    |
      |                   |                        | return 3 bullets   |
      |                   |<-----------------------|                    |
      |                   | store in Redis         |                    |
      |                   |-------------------------------------->|     |
      |                   |                        |                    |

User opens Overview     API Route               Redis
      |                   |                        |
      | GET /weekly-focus |                        |
      |------------------>| check cache            |
      |                   |----------------------->|
      |                   | return cached value    |
      |<------------------|<-----------------------|
```

**Redis cache key:**
```
weekly-focus:{projectId}:{weekNumber}    — TTL 7 days
Example: weekly-focus:3:2026-W14
```

**Cache structure:**
```json
{
  "week": "2026-W14",
  "generatedAt": "2026-03-31T06:00:00Z",
  "bullets": [
    "Complete ADR integration testing (M-KAISER-003 due Friday)",
    "Resolve 3 high-severity risks in Risk Dashboard",
    "Ship Biggy pilot to 5 test users"
  ],
  "sources": ["actions", "milestones", "risks"]
}
```

**Job handler signature:**

```typescript
// worker/jobs/weekly-focus-generator.ts
export default async function weeklyFocusJob(job: Job): Promise<{ status: string }> {
  const { projectId } = job.data;

  // 1. Fetch context: open actions, upcoming milestones (next 7 days), high-severity risks
  // 2. Build Claude prompt:
  //    "Based on the following project data, generate 3 bullet points summarizing
  //     the top priorities for this week. Focus on deadlines, blockers, and critical risks."
  // 3. Call Claude API (model: claude-sonnet-4-6, max_tokens: 512)
  // 4. Parse response (expect markdown list)
  // 5. Store in Redis: weekly-focus:{projectId}:{weekNumber}, TTL 7 days
  // 6. Return { status: 'complete' }
}
```

**Prompt template:**

```markdown
You are a project manager summarizing weekly priorities.

# Project Data

## Open Actions (due this week)
- A-KAISER-001: Complete ADR testing (Owner: John, Due: 2026-04-05)
- A-KAISER-007: Deploy Biggy pilot (Owner: Sarah, Due: 2026-04-03)

## Upcoming Milestones (next 7 days)
- M-KAISER-003: ADR Integration Complete (Target: 2026-04-05, Status: in-progress)

## High-Severity Risks
- R-KAISER-002: API rate limit risk (Severity: high, Mitigation: pending)

# Task
Generate exactly 3 bullet points summarizing the top priorities for this week.
Focus on:
1. Upcoming deadlines (actions, milestones)
2. Critical risks that need mitigation
3. Key deliverables

Output format (plain text, no markdown):
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]
```

**Scheduled job registration:**

```sql
-- Migration: Add weekly-focus-generator to scheduled_jobs
INSERT INTO scheduled_jobs (name, skill_name, cron_expression, enabled, timezone)
VALUES (
  'Weekly Focus Summary',
  'weekly-focus-generator',
  '0 6 * * 1',                -- Every Monday at 6am
  true,
  'America/Los_Angeles'
);
```

**API route:**

```typescript
// app/api/projects/[projectId]/weekly-focus/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const { projectId } = await params;
  const { session } = await requireSession();

  const weekNumber = getWeekNumber(new Date()); // e.g., "2026-W14"
  const cacheKey = `weekly-focus:${projectId}:${weekNumber}`;

  // Try Redis cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return Response.json(JSON.parse(cached));
  }

  // Cache miss: return empty state with "Generating..." message
  return Response.json({
    week: weekNumber,
    bullets: [],
    generatedAt: null,
    status: 'pending',
  });
}
```

**Fallback behavior:**
- If cache miss (job hasn't run yet or Redis cleared): Show "Focus summary will be available Monday morning"
- If job fails: Show last successful week's summary with "(as of [date])" timestamp

#### Health Dashboard Metrics

**Data sources (all existing tables):**

```typescript
interface HealthMetrics {
  openHighSeverityRisks: number;        // COUNT(*) FROM risks WHERE severity IN ('high', 'critical') AND status != 'resolved'
  overdueActions: number;               // COUNT(*) FROM actions WHERE status != 'completed' AND due < TODAY
  blockedTasks: number;                 // COUNT(*) FROM tasks WHERE status = 'blocked'
  milestonesAtRisk: number;             // COUNT(*) FROM milestones WHERE target < TODAY + 7 AND status != 'complete'
  weeklyVelocity: number;               // COUNT(*) FROM actions WHERE completed_at BETWEEN LAST_7_DAYS / 7
}
```

**UI layout:**

```
┌──────────────────── Health Dashboard ────────────────────┐
│ [!] 3 High-Severity Risks    [⚠] 2 Overdue Actions      │
│ [🚧] 1 Blocked Task           [📅] 1 Milestone At Risk   │
│ [📈] Velocity: 4.2 actions/week (trending ↑)             │
└──────────────────────────────────────────────────────────┘
```

**No new DB tables required** — all metrics computable from existing data.

#### Metrics Section

**Data sources:**

```typescript
interface ProjectMetrics {
  totalHoursLogged: number;             // SUM(hours) FROM time_entries WHERE project_id = ?
  completionPercentage: number;         // (completed_tasks / total_tasks) * 100
  avgRiskMitigationTime: number;        // AVG(resolved_at - created_at) FROM risks WHERE status = 'resolved'
  onboardingStepsComplete: number;      // COUNT(*) FROM onboarding_steps WHERE status = 'complete'
  integrationLiveCount: number;         // COUNT(*) FROM integrations WHERE status = 'production'
}
```

**UI layout:**

```
┌─────────────────────── Metrics ──────────────────────────┐
│ Hours Logged: 127.5h   │ Completion: 68%                 │
│ Onboarding: 12/18      │ Integrations Live: 5/8          │
│ Avg Risk Resolution: 3.2 days                            │
└──────────────────────────────────────────────────────────┘
```

**No new DB tables required** — all metrics computable from existing data.

### Migration Path

1. **Phase 1**: Add `track` column to `onboarding_phases` and `onboarding_steps` tables
2. **Phase 2**: Create Health Dashboard, Metrics, and Milestone Timeline components (read-only, no state changes)
3. **Phase 3**: Implement weekly focus job + API route + Redis caching
4. **Phase 4**: Integrate all new components into Overview tab, remove completeness score

---

## Cross-Feature Dependencies

### Build Order (Topological)

```
Feature 2 (Time Tracking)  →  Feature 3 (Metrics Section)
       ↓                              ↓
Feature 1 (BullMQ Extraction)  →  Feature 3 (Weekly Focus Job)
```

**Rationale:**
1. **Time Tracking first**: No dependencies, enables Metrics Section in Feature 3
2. **BullMQ Extraction second**: Establishes job patterns reused by Weekly Focus Job
3. **Overview Tab last**: Depends on Time Tracking data (hours logged metric) and BullMQ job infrastructure

**Parallel workstreams:**
- Feature 1 and Feature 2 can be built in parallel (no shared components)
- Feature 3 Phase 1-2 (schema + read-only components) can start before Feature 1/2 complete
- Feature 3 Phase 3 (weekly focus job) requires Feature 1 (BullMQ patterns) to be validated first

### Shared Infrastructure

**BullMQ patterns:**
- Feature 1 (extraction job) establishes Redis progress tracking pattern
- Feature 3 (weekly focus job) reuses scheduled job pattern from v2.0 Phase 24

**Redis usage:**
- Feature 1: `extraction:{artifactId}:progress` (ephemeral, TTL 1 hour)
- Feature 3: `weekly-focus:{projectId}:{weekNumber}` (cached, TTL 7 days)
- No key conflicts, separate namespaces

**API route conventions:**
- Feature 1: Job-based routes (`POST /api/ingestion/extract-job`, `GET /api/ingestion/extract-job/[jobId]`)
- Feature 2: RESTful resource routes (`GET /api/time-tracking/entries`, `POST /api/time-tracking/entries`)
- Feature 3: Project-scoped routes (`GET /api/projects/[projectId]/weekly-focus`)

---

## Schema Change Summary

### Required Migrations

**Migration 1: Add `track` field to onboarding tables**

```sql
-- File: db/migrations/00XX_add_track_to_onboarding.sql

BEGIN;

-- Add track column to onboarding_phases
ALTER TABLE onboarding_phases ADD COLUMN track TEXT;

-- Add track column to onboarding_steps (denormalized)
ALTER TABLE onboarding_steps ADD COLUMN track TEXT;

-- Backfill track from phase names (example heuristic)
UPDATE onboarding_phases SET track = 'ADR'
WHERE name ILIKE '%ADR%' OR name ILIKE '%alert%' OR name ILIKE '%detection%';

UPDATE onboarding_phases SET track = 'Biggy'
WHERE name ILIKE '%Biggy%' OR name ILIKE '%AI%' OR name ILIKE '%copilot%';

-- Propagate track from phases to steps
UPDATE onboarding_steps os
SET track = (SELECT track FROM onboarding_phases op WHERE op.id = os.phase_id);

-- Add index for track-filtered queries
CREATE INDEX idx_onboarding_steps_track ON onboarding_steps(project_id, track);

COMMIT;
```

**Migration 2: Add weekly focus scheduled job**

```sql
-- File: db/migrations/00XX_add_weekly_focus_job.sql

INSERT INTO scheduled_jobs (name, skill_name, cron_expression, enabled, timezone, skill_params_json)
VALUES (
  'Weekly Focus Summary Generator',
  'weekly-focus-generator',
  '0 6 * * 1',                     -- Every Monday at 6am
  true,
  'America/Los_Angeles',
  '{}'::jsonb
);
```

### Optional Enhancements (Deferred to v5.0)

**New table: `extraction_jobs`**

```sql
CREATE TABLE extraction_jobs (
  id SERIAL PRIMARY KEY,
  artifact_id INTEGER NOT NULL REFERENCES artifacts(id),
  job_id TEXT NOT NULL UNIQUE,           -- BullMQ job ID
  queued_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  chunks_total INTEGER,
  chunks_processed INTEGER
);
```

**Benefits:**
- Persistent job history (Redis is ephemeral)
- Allows retry logic on worker restart
- Enables job analytics (avg processing time, failure rate)

**Deferred because:**
- v4.0 can use `artifacts.ingestion_log_json` for basic tracking
- Redis progress is sufficient for real-time polling
- Job history not a current requirement

---

## Testing Strategy

### Unit Tests

**Feature 1 (BullMQ Extraction):**
- Mock Redis client, verify progress updates
- Mock Claude API, verify chunking logic
- Test dedup function with existing DB records

**Feature 2 (Time Tracking):**
- Test API route filters (project_id, week, user)
- Test weekly total calculations
- Test approval workflow state transitions

**Feature 3 (Overview Overhaul):**
- Test track filtering on onboarding steps
- Test weekly focus cache hit/miss behavior
- Test health metric calculations with edge cases (0 risks, no milestones)

### Integration Tests

**Feature 1:**
1. Upload 100-page PDF
2. Enqueue extraction job
3. Poll status until complete
4. Verify DB status = `preview` and Redis progress cleared

**Feature 2:**
1. Create 3 time entries across 2 projects
2. `GET /time-tracking` — verify all 3 entries returned
3. Filter by project — verify only matching entries returned
4. Update entry — verify change persisted

**Feature 3:**
1. Create onboarding phases with track = 'ADR', track = 'Biggy'
2. Fetch Overview tab — verify phases grouped by track
3. Trigger weekly focus job manually
4. Verify Redis cache populated
5. Fetch `/api/projects/[id]/weekly-focus` — verify cached response

### End-to-End UAT

**Scenario 1: Large Document Extraction**
- User uploads 500KB PPTX
- Extraction runs in background
- User navigates away, returns 5 minutes later
- Preview UI shows extracted items (no data loss)

**Scenario 2: Multi-Project Time Tracking**
- User logs time for 3 projects in a single week
- Opens `/time-tracking` — sees all entries in weekly grid
- Edits entry for Project A — change saved
- Opens `/customer/2/time` — sees read-only summary for Project B

**Scenario 3: Overview Tab Walkthrough**
- User opens Overview tab
- Sees ADR phase group (4 steps, 2 complete)
- Sees Biggy phase group (3 steps, 0 complete)
- Sees Health Dashboard (1 overdue action, 2 high-severity risks)
- Sees Weekly Focus summary (3 bullets, generated Monday 6am)

---

## Risks & Mitigations

### Risk 1: Redis Unavailability

**Impact:** Extraction job progress not visible, weekly focus cache misses

**Mitigation:**
- Feature 1: Fall back to DB polling (`artifacts.ingestion_status`) if Redis unavailable
- Feature 3: Show last successful week's summary with stale indicator

**Probability:** Low (Redis runs locally, rarely fails)

### Risk 2: Long-Running Extraction Jobs (>10 minutes)

**Impact:** BullMQ job timeout, partial extraction stored

**Mitigation:**
- Set BullMQ job timeout to 15 minutes (default is 30s)
- Store partial progress in DB after each chunk
- Allow manual retry from last successful chunk

**Probability:** Medium (1000-page PDFs exist in enterprise environments)

### Risk 3: Weekly Focus Job Failures

**Impact:** No focus summary on Monday morning, user sees empty state

**Mitigation:**
- Store last successful summary with timestamp
- Fall back to showing previous week's summary with "(as of [date])" indicator
- Add admin UI to manually trigger weekly focus job

**Probability:** Low (job is simple, no external dependencies beyond Claude API)

### Risk 4: Track Backfill Accuracy

**Impact:** Phases/steps assigned wrong track (ADR vs Biggy) during migration

**Mitigation:**
- Migration script uses heuristic (name matching) for initial backfill
- Add admin UI to manually reassign phase track
- Track field is nullable — missing track = "Unassigned" group in UI

**Probability:** Medium (heuristic may misclassify 10-20% of phases)

---

## Success Criteria

### Feature 1 (BullMQ Extraction)

- [ ] Extraction of 200-page PDF completes successfully in background
- [ ] Browser refresh during extraction does not lose progress
- [ ] Redis progress updates visible to polling client every 2s
- [ ] DB status transitions: `pending` → `extracting` → `preview` (or `failed`)
- [ ] Dedup logic filters out already-ingested items

### Feature 2 (Time Tracking)

- [ ] `/time-tracking` route shows all time entries across all projects
- [ ] Weekly grid allows inline editing of hours + description
- [ ] Filter by project works (`?project=3`)
- [ ] Total hours calculation matches DB sum
- [ ] Approval workflow (submit → approve) state transitions work

### Feature 3 (Overview Overhaul)

- [ ] Onboarding phases/steps grouped by track (ADR vs Biggy)
- [ ] Health Dashboard metrics accurate (counts match DB queries)
- [ ] Metrics section shows correct totals (hours logged, completion %, etc.)
- [ ] Weekly focus summary generated every Monday 6am and cached
- [ ] Milestone timeline renders all milestones with correct dates
- [ ] Completeness score removed from Overview tab (or moved to Context Hub)

---

## Sources

- [BullMQ Documentation — Job Progress](https://docs.bullmq.io/guide/jobs/progress) — Redis progress tracking pattern (HIGH confidence — official docs)
- [BullMQ Documentation — Repeatable Jobs](https://docs.bullmq.io/guide/jobs/repeatable) — Cron job scheduling (HIGH confidence — official docs)
- [ioredis Documentation](https://github.com/redis/ioredis) — Redis client for Node.js (HIGH confidence — official repo)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) — API route patterns (HIGH confidence — official docs)
- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations) — Schema migration patterns (HIGH confidence — official docs)
- Existing codebase: `worker/index.ts`, `worker/scheduler.ts`, `app/api/ingestion/extract/route.ts` — Internal architecture patterns (HIGH confidence — direct code inspection)

---

*Architecture research for: BigPanda AI Project Management App — v4.0 Infrastructure & UX Foundations*
*Researched: 2026-04-01*
