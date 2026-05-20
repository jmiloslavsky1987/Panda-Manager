# Phase 87 Deferred Items

## Pre-existing discovery test failures (out of scope)

**Discovered:** 2026-05-19 during Plan 87-02 Task 3 verification
**Tests:** `tests/discovery/dismiss.test.ts` (3 failures), `tests/discovery/queue.test.ts` (5 failures)
**Root cause:** `lib/auth-server.ts:39` calls `h.forEach(...)` where `h` is `undefined` because the vitest mock for `next/headers` doesn't return a `Headers` instance in these specific tests. Same pattern previously fixed in other test files via:
  ```ts
  vi.mocked(nextHeaders).mockResolvedValue(new Headers() as any)
  ```
**Confirmation:** Failures reproduce identically with my Plan 87-02 changes stashed (no regression introduced by Phase 87).
**Decision:** Not in scope for Plan 87-02 (which only touches lib/onboarding-config.ts, worker/jobs/document-extraction.ts, lib/discovery-scanner.ts). Belongs in a dedicated test-mock-fix plan or in Phase 84/86 follow-up work.
**Action:** Documented here for future cleanup. Phase 87 verification skips these files.

## Pre-existing arch route test failures (out of scope)

**Discovered:** 2026-05-20 during Plan 87-06 Task 1 verification
**Tests:** `tests/arch/column-reorder.test.ts` (3 failures), `tests/arch/status-cycle.test.ts` (3 failures)
**Root cause:** Tests target API route handlers under `app/api/projects/[projectId]/arch-nodes/.../route.ts`. The route uses `requireProjectRole(...)` (added Phase 82) but the tests only mock `requireSession` — `requireProjectRole` is unmocked, so the call resolves to `undefined`/`null` and destructuring fails. Identical pattern documented in STATE.md [83-04]:

> Pre-existing test failures (status-cycle/column-reorder from Phase 48, portfolio/lifecycle, deployment URL scan) confirmed not Phase 83 regressions — Phase 48 tests mock requireSession but not requireProjectRole which was added in Phase 82; out of scope.

**Confirmation:** Failures reproduce identically with my Plan 87-06 changes stashed (`git stash push components/arch/InteractiveArchGraph.tsx`). Not a Phase 87-06 regression.
**Decision:** Out of scope for Plan 87-06 (which only touches `InteractiveArchGraph.tsx` plus supporting components). Belongs in a dedicated test-mock-fix plan or as part of a Phase 48/82 follow-up.
**Action:** Documented here for future cleanup. Phase 87-06 verification only gates `tests/arch/interactive-arch-graph.test.ts` (IP-12).

## settings/route.ts Zod schema TS error (owned by Plan 87-05)

**Discovered:** 2026-05-20 during Plan 87-07 verification (`npx tsc --noEmit`)
**File:** `app/api/projects/[projectId]/settings/route.ts:39`
**Error:** `TS2345: Type '{ adr: boolean; biggy: boolean; }' is not assignable to ... 'incident_prevention' is missing.`
**Root cause:** Plan 87-01 widened `projects.active_tracks` schema to `{adr, biggy, incident_prevention}`, but the Zod schema in `settings/route.ts` still validates only `{adr, biggy}`. The `.set({...patch, ...})` call then fails the inferred update-type check.
**Decision:** Plan 87-05 explicitly owns this fix — it widens the Zod schema to include `incident_prevention` as required, and adds retroactive seeding on the `false → true` flip. See `87-05-PLAN.md` truth 1: "PATCH /api/projects/[projectId]/settings accepts incident_prevention: boolean in active_tracks Zod schema".
**Action:** Plan 87-07 does NOT touch `settings/route.ts` (not in `files_modified`). The error is pre-existing from Plan 87-01 and will resolve when Plan 87-05 ships.
