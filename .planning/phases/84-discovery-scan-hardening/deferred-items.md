# Deferred Items — Phase 84

## Pre-existing Test Failures (Out of Scope)

These test failures existed before Phase 84 began and are not regressions from Phase 84-00 work.

### tests/discovery/dismiss.test.ts (3 tests all failing)
- **Root cause:** `next/headers` mock does not restore `headers()` mock in `beforeEach` after `vi.resetAllMocks()` — same pattern issue as approve.test.ts which was fixed in 84-00
- **Impact:** dismiss.test.ts tests fail with `TypeError: Cannot read properties of undefined (reading 'forEach')` in requireSession
- **Deferred to:** Phase 84 implementation waves (or dedicated test-fix pass)
- **Fix pattern:** Add `vi.mocked(nextHeaders).mockResolvedValue(new Headers() as any)` restoration in beforeEach, same as approve.test.ts fix applied in 84-00

### tests/discovery/queue.test.ts (5 tests all failing)
- **Root cause:** Same `next/headers` mock restoration issue as dismiss.test.ts
- **Impact:** All 5 queue tests fail
- **Deferred to:** Phase 84 implementation waves
