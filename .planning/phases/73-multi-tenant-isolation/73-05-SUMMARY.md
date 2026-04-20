---
plan: "73-05"
status: complete
completed: "2026-04-20"
---

# Plan 73-05 Summary — Final Verification & Human Checkpoint

## What Was Done

1. **Full auth test suite** — 51 tests across 15 files, all GREEN
2. **Test file fixes** — Fixed 3 test files broken by Phase 73 pipeline changes:
   - `document-extraction-passes.test.ts` — updated to `messages.stream` mock, fixed call counts and progress assertions
   - `write.test.ts` — added `extractionJobs`, `beforeState` to schema mock; added `or`, `inArray`, `sql`, `asc` to drizzle mock
   - `dedup.test.ts` — same schema and drizzle mock additions
3. **Bug discovered and fixed** — `Sidebar` component called `getActiveProjects()` with no arguments, bypassing membership filter entirely. Every user saw every project in the sidebar regardless of membership.
   - Fixed: `Sidebar.tsx` now reads session and passes `{ userId, isGlobalAdmin }` to `getActiveProjects()`
4. **Human verification** — Test user (`testuser@localhost.dev`) confirmed:
   - Empty sidebar and empty portfolio after fix
   - Previously saw ALL projects due to Sidebar bug

## Requirements Verified

- TENANT-01 ✅ — Portfolio shows only user's own projects (Sidebar + portfolio page both scoped)
- TENANT-02 ✅ — Non-member API access returns 403
- TENANT-03 ✅ — Redis cache scoped to project
- TENANT-04 ✅ — BullMQ job results scoped to project
- TENANT-05 ✅ — New user sees empty portfolio on first login

## Key Bug Note

The Sidebar was the root cause of TENANT-01 failure during human verification. The portfolio page query was correct (0 projects for test user confirmed via logging), but the Sidebar rendered all projects server-side unconditionally. Fix was a 3-line addition to Sidebar.tsx.
