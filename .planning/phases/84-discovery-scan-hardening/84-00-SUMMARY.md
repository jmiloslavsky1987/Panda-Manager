---
phase: 84-discovery-scan-hardening
plan: "00"
subsystem: testing
tags: [vitest, tdd, slack, oauth, discovery-scanner, wave-0]

# Dependency graph
requires: []
provides:
  - "Wave 0 RED test scaffolds gating all 5 implementation plans in Phase 84"
  - "slack-oauth tests (MODULE_NOT_FOUND) gating Plan 84-01 OAuth routes"
  - "slack-adapter tests (assertion failures) gating Plan 84-02 search.messages rewrite"
  - "scan-config lookback tests gating Plan 84-03 lookback field addition"
  - "approve entity-type tests gating Plan 84-04 new entity cases"
  - "scan sourceSummary tests gating Plan 84-05 return shape change"
affects: [84-01, 84-02, 84-03, 84-04, 84-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 stub-pattern: import MODULE_NOT_FOUND = RED gate for non-existent routes"
    - "Behavior-change pattern: import succeeds but assertions fail for SlackAdapter rewrite gate"
    - "next/headers mock restoration in beforeEach required after vi.resetAllMocks() (fixes auth-server TypeError)"

key-files:
  created:
    - lib/__tests__/slack-adapter.test.ts
    - tests/discovery/slack-oauth.test.ts (gitignored, exists on-disk)
    - tests/discovery/scan-config.test.ts (gitignored, exists on-disk)
  modified:
    - tests/discovery/approve.test.ts (gitignored, extended on-disk)
    - tests/discovery/scan.test.ts (gitignored, extended on-disk)

key-decisions:
  - "[84-00] tests/ dir gitignored — only lib/__tests__/slack-adapter.test.ts committed to git; all other Wave 0 test files exist on-disk only"
  - "[84-00] next/headers mock must be restored in beforeEach: vi.mocked(nextHeaders).mockResolvedValue(new Headers()) after vi.resetAllMocks() — required for requireSession() to work in tests"
  - "[84-00] Pre-existing failures in tests/discovery/dismiss.test.ts and queue.test.ts (8 tests) are not Phase 84 regressions — same headers mock issue, deferred to Phase 84 implementation waves"
  - "[84-00] businessOutcomes schema shape has {title, track} (not {outcome}) — tests gate on title/track fields to ensure correct table is targeted at approve time"

patterns-established:
  - "Wave 0 RED gate: 3 new test files + 2 extended files = 5 test files covering all 5 implementation plans"
  - "Auth-server headers mock pattern for vitest: always restore nextHeaders mock in beforeEach"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-05-05
---

# Phase 84 Plan 00: Discovery Scan Hardening Wave 0 Summary

**Wave 0 RED test scaffolds created for all 5 Phase 84 implementation plans — 3 new test files (slack-oauth, slack-adapter, scan-config) and 2 extended files (approve, scan) establishing automated gates before any production code is written**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-05T03:54:18Z
- **Completed:** 2026-05-05T04:02:21Z
- **Tasks:** 2
- **Files modified:** 3 tracked (lib/__tests__/slack-adapter.test.ts) + 4 on-disk gitignored

## Accomplishments
- Created 3 new test files gating Plan 84-01 (Slack OAuth routes), 84-02 (SlackAdapter rewrite), and 84-03 (scan-config lookback) with proper RED failures
- Extended approve.test.ts with 6 new RED tests for 5 new entity types (task, arch_node, workflow_step, team_engagement, business_outcome) gating Plan 84-04
- Extended scan.test.ts with 2 new RED tests for sourceSummary return shape gating Plan 84-05
- Fixed pre-existing next/headers mock restoration issue in approve.test.ts that caused original DISC-14 tests to fail

## Task Commits

Each task was committed atomically:

1. **Task 1: New test files — Slack OAuth + new SlackAdapter + scan-config lookback** - `368bb52b` (test)
2. **Task 2: Extend approve.test.ts and scan.test.ts** - (gitignored files, no tracked commit)

## Files Created/Modified
- `lib/__tests__/slack-adapter.test.ts` - 7 RED tests for new search.messages-based SlackAdapter behavior (gating Plan 84-02)
- `tests/discovery/slack-oauth.test.ts` - RED test suite for Slack OAuth initiate/callback/status routes (gating Plan 84-01, gitignored)
- `tests/discovery/scan-config.test.ts` - 3 RED tests for lookback field in scan-config GET/POST (gating Plan 84-03, gitignored)
- `tests/discovery/approve.test.ts` - Extended with 6 new RED entity-type tests (gating Plan 84-04, gitignored)
- `tests/discovery/scan.test.ts` - Extended with 2 new RED sourceSummary tests (gating Plan 84-05, gitignored)

## Decisions Made
- tests/ directory is gitignored by project design (established in Phase 79-00) — only lib/__tests__/ commits; approve, scan, slack-oauth, scan-config test files are disk-only
- Fixed next/headers mock restoration in approve.test.ts: `vi.mocked(nextHeaders).mockResolvedValue(new Headers() as any)` must be called in beforeEach after vi.resetAllMocks() — this was a pre-existing test infrastructure bug
- businessOutcomes table has `{title, track}` schema (not an `outcome` field) — test checks for these fields to properly gate Plan 84-04's table routing logic

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed next/headers mock restoration in approve.test.ts**
- **Found during:** Task 2 (extending approve.test.ts)
- **Issue:** Pre-existing tests (DISC-14 x3, DISC-13) were ALL failing with TypeError on `h.forEach` because `vi.resetAllMocks()` in beforeEach cleared the `headers()` mock, leaving it returning undefined instead of a Headers object
- **Fix:** Added `import { headers as nextHeaders } from 'next/headers'` and `vi.mocked(nextHeaders).mockResolvedValue(new Headers() as any)` in beforeEach
- **Files modified:** tests/discovery/approve.test.ts (gitignored)
- **Verification:** Pre-existing tests (DISC-14 x3, DISC-13) now pass GREEN while new DISC-84-04 tests are RED
- **Committed in:** gitignored file, disk-only

**2. [Rule 1 - Bug] Fixed missing afterEach import in slack-adapter.test.ts**
- **Found during:** Task 1 (creating lib/__tests__/slack-adapter.test.ts)
- **Issue:** Used `afterEach` in test without importing it from vitest
- **Fix:** Added `afterEach` to the vitest import statement
- **Files modified:** lib/__tests__/slack-adapter.test.ts
- **Verification:** Tests run without ReferenceError; 7 assertion failures confirm RED state
- **Committed in:** 368bb52b

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes required for correct test execution. No scope creep.

## Issues Encountered
- Pre-existing failures in tests/discovery/dismiss.test.ts (3 tests) and tests/discovery/queue.test.ts (5 tests) — same next/headers mock restoration issue. These are out of scope for Plan 84-00 and documented in deferred-items.md. These were failing before Phase 84 began.
- businessOutcomes schema has `title` + `track` fields, not an `outcome` field as the plan suggested. Test was updated to gate on `{title, track}` which is the actual table shape (will cause the approve route's business_outcome case to use these fields).

## Next Phase Readiness
- All 5 RED gates established — Plans 84-01 through 84-05 each have test files that will turn GREEN when their respective implementations ship
- Plan 84-01 (Slack OAuth routes) can proceed: slack-oauth.test.ts provides exact behavioral spec
- lib/__tests__/slack-adapter.test.ts is committed to git and will run in CI to block premature merges of Plan 84-02

---
*Phase: 84-discovery-scan-hardening*
*Completed: 2026-05-05*
