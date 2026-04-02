---
phase: 32-time-tracking-global-view
plan: "02"
subsystem: time-tracking-api
tags: [api, cross-project, export, calendar-import]
dependency_graph:
  requires: [32-01]
  provides: [time-entries-api, projects-list-api]
  affects: [time-entries-schema]
tech_stack:
  added: []
  patterns: [drizzle-left-join, user-scoping, no-rls]
key_files:
  created:
    - bigpanda-app/app/api/time-entries/route.ts
    - bigpanda-app/app/api/time-entries/export/route.ts
    - bigpanda-app/app/api/time-entries/calendar-import/route.ts
    - bigpanda-app/db/migrations/0025_time_entries_user_id.sql
  modified:
    - bigpanda-app/app/api/projects/route.ts
    - bigpanda-app/db/schema.ts
    - bigpanda-app/tests/time-tracking-global/api-endpoint.test.ts
decisions:
  - Added user_id column to time_entries for multi-user isolation (security requirement)
  - Global endpoints filter by session.user.id to enforce user scoping
  - Export route places Project column first (cross-project context)
  - Calendar import POST sets user_id when creating entries
  - No RLS on time_entries - user filtering done at query level
metrics:
  duration_minutes: 6
  tasks_completed: 2
  files_created: 4
  files_modified: 3
  commits: 2
  completed_date: "2026-04-02"
---

# Phase 32 Plan 02: Global Time Tracking API Endpoints Summary

**One-liner:** Cross-project time entries API with user scoping, LEFT JOIN project names, and global export/calendar-import endpoints

## Overview

Created all API infrastructure needed for the global time tracking view: a cross-project GET endpoint for time entries, a global export endpoint supporting CSV/XLSX, a global calendar import endpoint, and a GET handler for active projects listing. Added user_id column to time_entries table with migration to enable multi-user isolation (missing security feature from Phase 5.2).

## Tasks Completed

### Task 1: Create GET /api/time-entries cross-project endpoint + GET /api/projects handler
**Status:** Complete
**Commit:** 482fae5

**Implementation:**
- Added migration 0025 to add user_id column to time_entries with indexes
- Updated db/schema.ts to include user_id field
- Created GET /api/time-entries endpoint with:
  - User filtering via session.user.id (security boundary)
  - LEFT JOIN to projects table for project_name field
  - Optional filters: project_id, from (date), to (date)
  - No RLS setup (time_entries has no RLS policies)
  - DESC ordering by date
- Added GET handler to /api/projects route:
  - Calls getActiveProjects() from lib/queries
  - Returns { projects: [...] } shape
  - Protected by requireSession()
- Updated api-endpoint.test.ts to verify handler existence (tests GREEN)

**Files:**
- Created: bigpanda-app/app/api/time-entries/route.ts
- Created: bigpanda-app/db/migrations/0025_time_entries_user_id.sql
- Modified: bigpanda-app/db/schema.ts
- Modified: bigpanda-app/app/api/projects/route.ts
- Modified: bigpanda-app/tests/time-tracking-global/api-endpoint.test.ts

### Task 2: Create global export and calendar import endpoints
**Status:** Complete
**Commit:** 2e8e346

**Implementation:**
- Created GET /api/time-entries/export:
  - Adapted from per-project export route
  - Project column moved to first position in export
  - Uses cross-project query with same filters (project_id, from, to)
  - Filters by session.user.id for user scoping
  - Supports CSV and XLSX formats
  - Group-by support: project, team_member, status, date
  - Includes summary sheet with status rollups
- Created GET/POST /api/time-entries/calendar-import:
  - No projectId path parameter (global route)
  - GET: Lists Google Calendar events for week with project matching
  - POST: Imports selected events as draft time entries
  - Sets user_id field when creating entries (Phase 32 addition)
  - Per-event project_id in request body
  - Validates all non-skipped items have project_id
- Added null session guards for TypeScript safety

**Files:**
- Created: bigpanda-app/app/api/time-entries/export/route.ts
- Created: bigpanda-app/app/api/time-entries/calendar-import/route.ts
- Modified: bigpanda-app/app/api/time-entries/route.ts (added session guard)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added user_id column to time_entries table**
- **Found during:** Task 1 implementation
- **Issue:** time_entries table created in Phase 5.2 (v1.0) before multi-user auth was added in Phase 26 (v3.0). Table lacked user_id column required for user scoping. Plan specified filtering by user_id but schema didn't support it.
- **Fix:**
  - Created migration 0025_time_entries_user_id.sql to add user_id TEXT NOT NULL DEFAULT 'default'
  - Added two indexes: idx_time_entries_user_id and idx_time_entries_user_project_date
  - Updated db/schema.ts with user_id field
  - Ran migration against local PostgreSQL database
  - All endpoints filter by session.user.id for security isolation
- **Files modified:**
  - bigpanda-app/db/migrations/0025_time_entries_user_id.sql (created)
  - bigpanda-app/db/schema.ts
  - All new API routes
- **Commit:** 482fae5
- **Why critical:** Without user_id, multi-user application would show all users' time entries to everyone (security vulnerability). Users must only see their own entries per requirements.

## Verification Results

**Automated tests:**
- api-endpoint.test.ts: 3/3 tests GREEN (handler existence verified)
- TypeScript compilation: No errors on new routes
- Migration: Successfully applied to local database

**Manual verification:**
- user_id column exists in time_entries table with indexes
- GET /api/time-entries returns { entries: [...] } with project_name field
- GET /api/projects returns { projects: [...] }
- Export endpoint compiles without errors
- Calendar import endpoint compiles without errors

## Technical Decisions

1. **User scoping via user_id column:** Added to time_entries table with migration rather than using RLS. Consistent with existing pattern - time_entries has no RLS policies (confirmed in all 24 migration files).

2. **LEFT JOIN for project names:** Cross-project query uses LEFT JOIN to include project_name from projects.customer. Handles orphaned entries gracefully (project_name null if project deleted).

3. **No SET LOCAL app.current_project_id:** time_entries has no RLS, so no transaction wrapper or SET LOCAL needed. Direct query with WHERE conditions.

4. **Project column first in export:** Export row shape places Project as first column since entries span multiple projects. Per-project export has Project column but it's constant for all rows.

5. **Session null guards:** Added explicit `if (!session) return 401` after requireSession guard for TypeScript's control flow analysis.

6. **Default user_id = 'default':** Migration uses DEFAULT 'default' for existing rows, matching auth system's default user convention.

## Performance Notes

- Added composite index on (user_id, project_id, date DESC) for optimal query performance on common filter patterns
- Single index on user_id for user-only filtering
- Cross-project query is single DB round-trip (not N fetches per project)

## Next Steps

Plan 32-03 will create the redirect from /customer/[id]/time to /time-tracking?project=:id and remove the time subtab from WorkspaceTabs.

Plan 32-04 will build the GlobalTimeView React component that consumes these endpoints.

## Self-Check: PASSED

**Created files exist:**
- FOUND: bigpanda-app/app/api/time-entries/route.ts
- FOUND: bigpanda-app/app/api/time-entries/export/route.ts
- FOUND: bigpanda-app/app/api/time-entries/calendar-import/route.ts
- FOUND: bigpanda-app/db/migrations/0025_time_entries_user_id.sql

**Commits exist:**
- FOUND: 482fae5 (Task 1)
- FOUND: 2e8e346 (Task 2)

**Database changes:**
- FOUND: user_id column in time_entries table
- FOUND: idx_time_entries_user_id index
- FOUND: idx_time_entries_user_project_date index
