---
phase: 074-deployment-readiness
plan: "01"
subsystem: infrastructure
tags: [deployment, configuration, docker]
dependency_graph:
  requires: [074-00-RESEARCH.md]
  provides: [production-ready configuration, Docker standalone output]
  affects: [Redis connection handling, auth URL configuration, SSR fetch behavior]
tech_stack:
  added: []
  patterns: [fail-fast configuration, standalone Docker output]
key_files:
  created: []
  modified:
    - path: bigpanda-app/worker/connection.ts
      summary: "Removed localhost fallbacks from Redis connection functions, added explicit REDIS_URL checks"
    - path: bigpanda-app/app/api/settings/users/route.ts
      summary: "Removed localhost fallback from BETTER_AUTH_URL, returns 500 if missing"
    - path: bigpanda-app/app/scheduler/page.tsx
      summary: "Removed localhost fallback from SSR fetch, logs warning if NEXT_PUBLIC_BASE_URL unset"
    - path: bigpanda-app/app/customer/[id]/skills/page.tsx
      summary: "Removed localhost fallback from SSR fetch, logs warning if NEXT_PUBLIC_BASE_URL unset"
    - path: bigpanda-app/next.config.ts
      summary: "Added output: standalone for Docker deployment"
decisions:
  - context: "Server Components cannot use window.location.origin"
    decision: "Check NEXT_PUBLIC_BASE_URL explicitly and skip SSR fetch if unset (non-fatal for pages that degrade gracefully)"
    rationale: "SSR pages can render with empty job lists; localhost fallback would mask misconfiguration in production"
    alternatives: ["Use window.location.origin (invalid for SSR)", "Make env var required (breaks build)"]
metrics:
  duration_seconds: 163
  tasks_completed: 2
  files_modified: 5
  commits: 2
  completed_date: "2026-04-21"
---

# Phase 074 Plan 01: Remove Localhost Fallbacks & Enable Standalone Output Summary

**One-liner:** Eliminated all hardcoded localhost references from production code and configured Next.js for standalone Docker deployment with fail-fast environment variable validation.

## What Was Done

### Task 1: Remove localhost fallbacks from worker and API routes
- **Files modified:** `worker/connection.ts`, `app/api/settings/users/route.ts`
- **Commit:** `87e4d3a`

Updated both Redis connection functions (`createRedisConnection` and `createApiRedisConnection`) to require `REDIS_URL` environment variable. Both functions now throw clear error messages if the variable is missing, preventing silent localhost fallback in production.

Updated invite email route to require `BETTER_AUTH_URL` environment variable. Route now returns HTTP 500 with clear error message if missing, preventing invite emails with incorrect callback URLs.

### Task 2: Remove localhost fallbacks from SSR pages + enable standalone output
- **Files modified:** `app/scheduler/page.tsx`, `app/customer/[id]/skills/page.tsx`, `next.config.ts`
- **Commit:** `6bf5e92`

Updated both Server Components to check `NEXT_PUBLIC_BASE_URL` explicitly before attempting SSR fetch. If unset, logs warning and skips fetch (pages degrade gracefully with empty job lists).

Added `output: "standalone"` to `next.config.ts` to enable Docker standalone output mode. Build now creates `.next/standalone` directory with minimal production bundle.

## Verification Results

**Static analysis:**
```bash
grep -r "localhost" bigpanda-app/app bigpanda-app/worker bigpanda-app/lib --include="*.ts" --include="*.tsx" | grep -v test
```
Result: No matches (all localhost references removed from production code)

**Build verification:**
```bash
npm run build
```
Result: Build passed with no TypeScript errors, `.next/standalone` directory created successfully

**Environment variable behavior:**
- Redis connections: Throw clear error if `REDIS_URL` missing
- Invite route: Returns HTTP 500 if `BETTER_AUTH_URL` missing
- SSR pages: Log warning and degrade gracefully if `NEXT_PUBLIC_BASE_URL` missing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SSR components cannot use window.location.origin**
- **Found during:** Task 2 implementation
- **Issue:** Plan suggested using `window.location.origin` as fallback for client pages, but both `scheduler/page.tsx` and `customer/[id]/skills/page.tsx` are Server Components that run during SSR where `window` is undefined
- **Fix:** Changed approach to explicitly check for `NEXT_PUBLIC_BASE_URL` and log warning + skip fetch if unset. Pages degrade gracefully (render with empty job lists). This is production-safe because the env var should always be set in production, and build-time SSR can gracefully handle missing data.
- **Files modified:** `app/scheduler/page.tsx`, `app/customer/[id]/skills/page.tsx`
- **Commit:** `6bf5e92` (same commit as Task 2)

## Key Decisions

**1. SSR fetch behavior when NEXT_PUBLIC_BASE_URL missing**
- **Context:** Server Components do SSR fetch at build time, but REDIS_URL may not be available during build
- **Decision:** Check env var explicitly, log warning if missing, skip fetch (non-fatal)
- **Rationale:** Pages render fine with empty job lists. Failing build would prevent deployment. Localhost fallback would mask production misconfiguration.
- **Trade-off:** Build-time SSR doesn't populate job lists, but runtime client-side code can still function correctly

**2. Fail-fast for critical infrastructure vs graceful degradation for UI features**
- **Context:** Redis connections are critical for worker/queue operation; SSR job lists are nice-to-have UI enhancements
- **Decision:** Redis connections throw errors (fail-fast), SSR pages log warnings (degrade gracefully)
- **Rationale:** Worker cannot function without Redis. Pages can still render without pre-populated job data.

## Success Criteria Met

- [x] All 4 production files updated (worker/connection.ts, app/api/settings/users/route.ts, scheduler/page.tsx, customer/[id]/skills/page.tsx)
- [x] No hardcoded localhost strings remain in non-test code
- [x] Redis connection functions throw clear error if REDIS_URL missing
- [x] Invite route returns 500 with clear message if BETTER_AUTH_URL missing
- [x] SSR pages check NEXT_PUBLIC_BASE_URL (production-safe warning pattern)
- [x] next.config.ts has output: "standalone"
- [x] Build passes and creates .next/standalone directory
- [x] DEPLOY-01 requirement satisfied: "No hardcoded localhost URLs, filesystem paths, or secrets exist anywhere in application code"

## Impact

**Before:**
- 4 production files with localhost fallbacks
- Silent failures in production (wrong Redis server, wrong auth URLs)
- No standalone output for Docker deployment

**After:**
- 0 production files with localhost fallbacks
- Clear error messages when required env vars missing
- Standalone output ready for minimal Docker images
- Production deployments fail fast with actionable error messages

## Next Steps

Plan 074-02 will implement environment variable documentation and validation, ensuring all required configuration is documented in `.env.example` with clear descriptions of each variable's purpose and production requirements.

## Self-Check: PASSED

All claimed files and commits verified:
- ✓ bigpanda-app/worker/connection.ts
- ✓ bigpanda-app/app/api/settings/users/route.ts
- ✓ bigpanda-app/app/scheduler/page.tsx
- ✓ bigpanda-app/app/customer/[id]/skills/page.tsx
- ✓ bigpanda-app/next.config.ts
- ✓ Commit 87e4d3a (Task 1)
- ✓ Commit 6bf5e92 (Task 2)
