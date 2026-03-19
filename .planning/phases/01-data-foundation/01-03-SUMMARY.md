---
phase: 01-data-foundation
plan: 03
subsystem: settings
tags: [settings, typescript, node-test, server-only, env-local, next-js, api-route]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Wave 0 test stubs including tests/settings.test.ts"
provides:
  - "lib/settings.ts: readSettings() / writeSettings() backed by ~/.bigpanda-app/settings.json"
  - "bigpanda-app/lib/settings.ts: server-only settings service for Next.js"
  - "bigpanda-app/app/api/settings/route.ts: GET + POST settings API route"
  - "AppSettings interface with workspace_path, skill_path, and 6 schedule cron fields"
  - "Atomic write guarantee: write-to-temp + renameSync"
  - "ANTHROPIC_API_KEY isolation: stored in .env.local only, never in settings.json"
affects: [01-04, 01-05, 01-06, 02-app-shell-read-surface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Settings stored in ~/.bigpanda-app/settings.json (non-sensitive), .env.local (sensitive)"
    - "Atomic write pattern: writeFile to temp path, then fs.renameSync to final path"
    - "API key exposure prevention: GET returns has_api_key boolean, never key value"
    - "readSettings/writeSettings accept optional path arg for test isolation"
    - "Zod input validation on POST /api/settings body"

key-files:
  created:
    - lib/settings.ts
    - bigpanda-app/lib/settings.ts
    - bigpanda-app/app/api/settings/route.ts
  modified: []

key-decisions:
  - "Settings library lives at project root lib/settings.ts (no server-only) for test access; bigpanda-app/lib/settings.ts wraps it with server-only import"
  - "readSettings/writeSettings accept optional settingsPath arg enabling test isolation without mocking"
  - "ANTHROPIC_API_KEY written to .env.local via regex replace/append — never touches settings.json"
  - "Default workspace_path='/Documents/PM Application' — locked per CONTEXT.md"

patterns-established:
  - "Test isolation pattern: pass temp path to readSettings/writeSettings instead of mocking fs"
  - "api_key field stripped from any settings write path at library level (defensive delete)"

requirements-completed: [SET-01, SET-02, SET-03, SET-04]

# Metrics
duration: 8min
completed: 2026-03-19
---

# Phase 1 Plan 03: Settings Service Summary

**File-based settings service with atomic writes and ANTHROPIC_API_KEY isolation via .env.local, exposing GET/POST /api/settings route with Zod validation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-19T03:00:00Z
- **Completed:** 2026-03-19T03:08:00Z
- **Tasks:** 1 of 1
- **Files modified:** 3

## Accomplishments
- Implemented `readSettings()` and `writeSettings()` at project root with optional path override for test isolation — all 4 Wave 0 test assertions GREEN
- Created `bigpanda-app/lib/settings.ts` with `server-only` import guard for Next.js usage
- Created `bigpanda-app/app/api/settings/route.ts` with GET (returns `has_api_key: boolean`, never key value) and POST (writes `api_key` to `.env.local` only; Zod-validates all other fields)
- Atomic write guarantee via write-to-temp + `renameSync` — no partial write risk
- Default `workspace_path='/Documents/PM Application'` confirmed with all 6 schedule cron strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement settings service and API route** - `7775160` (feat)

## Files Created/Modified
- `lib/settings.ts` — readSettings(), writeSettings(), AppSettings interface, SETTINGS_PATH constant (no server-only; used by tests)
- `bigpanda-app/lib/settings.ts` — server-only version with 'server-only' import at top; full implementation for Next.js
- `bigpanda-app/app/api/settings/route.ts` — GET /api/settings returns settings + has_api_key; POST writes api_key to .env.local only; Zod validation

## Decisions Made
- Settings library exists at both project root (for test access without Next.js) and `bigpanda-app/lib/` (with `server-only` for production). The two implementations are identical except for the `server-only` guard.
- `readSettings` and `writeSettings` accept an optional `settingsPath` argument — tests pass temp paths instead of mocking `fs`, which is cleaner and more realistic.
- Defensive `delete safe['api_key']` in `writeSettings` ensures the key can never end up in settings.json even if called incorrectly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used `npx tsx --test` instead of `node --import tsx/esm --test`**
- **Found during:** Task 1 (verification)
- **Issue:** The plan's verify command `node --import tsx/esm --test tests/settings.test.ts` produces `ERR_REQUIRE_CYCLE_MODULE` on Node.js v24.14.0 — a known regression documented in 01-01 SUMMARY. Tests show `tests 1, suites 0, pass 0, fail 1` (file-level failure, assertions never run).
- **Fix:** Used `npx tsx --test tests/settings.test.ts` which runs all assertions correctly (4/4 pass).
- **Files modified:** None (runner invocation only)
- **Verification:** `npx tsx --test tests/settings.test.ts` shows `pass 4, fail 0`
- **Committed in:** N/A (no code change required)

---

**Total deviations:** 1 (1 blocking — test runner invocation workaround)
**Impact on plan:** No code changes; npx tsx --test is equivalent to node --import tsx/esm --test in semantics and is already the established workaround from Plan 01-01.

## Issues Encountered
- Node.js v24.14.0 + tsx/esm produces `ERR_REQUIRE_CYCLE_MODULE` for the verify command. This is pre-existing and documented in 01-01. Using `npx tsx --test` resolves it. Tests pass cleanly.

## User Setup Required
None — no external service configuration required for this plan. ANTHROPIC_API_KEY can be set later via POST /api/settings.

## Next Phase Readiness
- `readSettings()` and `writeSettings()` ready for consumption by Plan 01-04 (YAML service) and all subsequent plans needing workspace_path
- `bigpanda-app/app/api/settings/route.ts` ready for use once Next.js app is running (Plan 01-02 completion)
- No blockers for any remaining data foundation plans

## Self-Check: PASSED

All files present and commit verified.

---
*Phase: 01-data-foundation*
*Completed: 2026-03-19*
