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
