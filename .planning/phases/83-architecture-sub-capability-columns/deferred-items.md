# Phase 83 Deferred Items

## Out-of-Scope Pre-existing Test Failures

Discovered during 83-00 Wave 0 execution. These failures pre-exist Phase 83 and are unrelated to sub-capability column work.

### 1. tests/arch/column-reorder.test.ts

**Error:** `No "requireProjectRole" export is defined on the "@/lib/auth-server" mock`

All 3 tests fail. The mock in the test file does not export `requireProjectRole` which was added to `lib/auth-server.ts` in Phase 82. The mock needs to be updated to include this export.

**Fix needed:** Add `requireProjectRole: vi.fn().mockResolvedValue({ session: { user: { id: 'u1' } }, redirectResponse: null })` to the `vi.mock('@/lib/auth-server')` block in column-reorder.test.ts.

### 2. tests/arch/status-cycle.test.ts

**Error:** Same `requireProjectRole` mock gap

All 3 tests fail for the same reason as column-reorder.test.ts.

**Fix needed:** Same pattern — add `requireProjectRole` to the auth-server mock.
