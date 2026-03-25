---
phase: 08-cross-project-features-+-polish
plan: 03
subsystem: api
tags: [postgresql, full-text-search, tsvector, tsquery, drizzle-orm, nextjs, search]

# Dependency graph
requires:
  - phase: 08-02
    provides: search_vec tsvector columns on all 8 tables via PostgreSQL triggers; knowledge_base KB link columns

provides:
  - GET /api/search endpoint supporting q, account, type, from, to filters
  - searchAllRecords() query function — UNION ALL across 8 tables using plainto_tsquery
  - SearchResult TypeScript interface exported from lib/queries.ts

affects:
  - 08-05-search-ui (calls /api/search endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw SQL UNION ALL via sql.raw() for tsvector queries Drizzle cannot express natively"
    - "Dynamic WHERE arms via string interpolation in raw SQL (safe: sanitized input, no user-structured SQL)"
    - "Arms omitted entirely when type filter set — avoids running unnecessary table scans"
    - "LEFT JOIN for knowledge_base null project_id — KB entries always included regardless of project status"

key-files:
  created:
    - bigpanda-app/app/api/search/route.ts
  modified:
    - bigpanda-app/lib/queries.ts

key-decisions:
  - "Raw SQL UNION ALL preferred over Promise.all(8 queries) for single round-trip and ORDER BY across all arms"
  - "safeQ string sanitization (single-quote escaping) instead of parameterized query — Drizzle sql.raw() does not support positional params in UNION ALL context"
  - "knowledge_base arm uses LEFT JOIN (not INNER JOIN) — null project_id entries must be included per KB-03 spec"
  - "Account filter skipped for null-project KB entries — no customer column to filter on; filter applies when project_id IS NOT NULL"
  - "No server-only import in route — consistent with db/index.ts worker/test context compat decision (STATE.md 2026-03-19)"

patterns-established:
  - "UNION ALL raw SQL pattern: build arm strings, join with UNION ALL, wrap in SELECT * FROM (...) combined ORDER BY ... LIMIT"
  - "SearchResult interface co-located in queries.ts (not a separate types file) per plan spec"

requirements-completed:
  - SRCH-01
  - SRCH-02
  - SRCH-03

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 8 Plan 03: Full-Text Search API Summary

**PostgreSQL UNION ALL tsvector search across all 8 project tables via GET /api/search with account, type, and date-range filtering**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-25T02:20:09Z
- **Completed:** 2026-03-25T02:21:56Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments
- `searchAllRecords()` function runs a single UNION ALL query across all 8 data tables using `search_vec @@ plainto_tsquery('english', ...)` tsvector matching
- `SearchResult` interface exported from `lib/queries.ts` provides the shape the UI (plan 08-05) will consume
- GET /api/search endpoint parses q, account, type, from, to params and returns `{ results, total }` — empty results for short queries, 500 with error field on DB failure
- Archived projects excluded via `projects.status = 'active'` JOIN; KB entries with null project_id always included per KB-03 spec

## Task Commits

1. **Task 1: Add searchAllRecords() to queries.ts** - `d2a9a18` (feat)
2. **Task 2: Create GET /api/search route** - `497ea25` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `bigpanda-app/lib/queries.ts` - Added `SearchResult` interface and `searchAllRecords()` with 8-arm UNION ALL query; also imported `knowledgeBase` table
- `bigpanda-app/app/api/search/route.ts` - New route: parses searchParams, delegates to searchAllRecords, returns JSON

## Decisions Made
- Used `sql.raw()` for the full UNION ALL query — Drizzle ORM has no native tsvector/tsquery support and `db.execute(sql.raw(...))` is the established pattern (used in risks-heatmap and other routes)
- Single UNION ALL query preferred over `Promise.all(8 queries)` — one DB round-trip, enables cross-arm ORDER BY and LIMIT 100
- String sanitization via single-quote escaping for `q` and `account` in raw SQL — `sql.raw()` does not support positional parameters in this context
- KB entries with null `project_id` included via `LEFT JOIN projects` — these are global knowledge base entries that belong to no specific project and must remain searchable regardless of account filter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - TypeScript compiled cleanly (only pre-existing Redis/js-yaml errors from STATE.md context).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/api/search` endpoint is ready for plan 08-05 (Search UI) to integrate
- `SearchResult` interface is exported from `lib/queries.ts` for type-safe use in UI components
- Endpoint returns well-formed JSON for empty DB (results: [], total: 0) — safe to test before data is seeded

---
*Phase: 08-cross-project-features-+-polish*
*Completed: 2026-03-25*
