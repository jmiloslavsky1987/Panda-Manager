---
phase: 84-discovery-scan-hardening
plan: "02"
subsystem: api
tags: [slack, oauth, search-messages, source-adapters, tdd]

# Dependency graph
requires:
  - phase: 84-00
    provides: Wave 0 RED test scaffolds for slack-adapter (lib/__tests__/slack-adapter.test.ts)
provides:
  - SlackAdapter dual-mode: OAuth path uses search.messages with xoxp- user token; legacy path preserves conversations.history with bot token + channel IDs
  - resolveAdapter Slack priority: userToken (DB) checked before org bot token before MCP
affects: [84-03, 84-04, 84-05, discovery-scan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SlackAdapterInput union type with 'channels' discriminant for dual-mode constructor
    - UTC date parsing for date-filter query modifiers (getUTCFullYear/Month/Date avoids timezone shift)
    - encodeURIComponent instead of URLSearchParams for Slack query strings (preserves %20 for test decodeURIComponent compatibility)

key-files:
  created: []
  modified:
    - lib/source-adapters/slack-adapter.ts
    - lib/source-adapters/index.ts
    - lib/source-adapters/index.test.ts

key-decisions:
  - "SlackAdapter constructor discriminated by 'channels' key presence — UserSourceToken has no 'channels' field; legacy { token, channels } always has it"
  - "Use getUTCFullYear/getUTCMonth/getUTCDate instead of local equivalents — ISO timestamps like 2026-04-27T00:00:00Z would shift to 2026-04-26 in negative UTC offset zones"
  - "Build search.messages URL with encodeURIComponent for query param — URLSearchParams encodes spaces as + which decodeURIComponent does not reverse; tests and Slack accept %20"
  - "resolveAdapter Slack priority: userToken.source === 'slack' guard added to prevent gmail/gong tokens being passed as Slack tokens"

patterns-established:
  - "Dual-mode adapter pattern: union input type + 'channels' in input discriminant; each mode has its own private fetch method"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-05-05
---

# Phase 84 Plan 02: Slack Adapter search.messages Rewrite Summary

**SlackAdapter rewritten with dual-mode constructor: xoxp- OAuth token uses search.messages API with after:YYYY-MM-DD query; legacy bot token preserves conversations.history; resolveAdapter now checks userToken before org bot token for Slack**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-05T04:05:00Z
- **Completed:** 2026-05-05T04:07:57Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Rewrote SlackAdapter with `UserSourceToken` constructor path: calls `search.messages` with `Bearer xoxp-` token and `after:YYYY-MM-DD` date filter derived from the `since` ISO string
- Preserved full legacy `{ token, channels }` path — conversations.history loop per channel unchanged
- Updated `resolveAdapter` in `index.ts`: Slack source checks `userToken` (DB, `source === 'slack'`) before org bot token before MCP fallback
- All 7 Wave 0 RED tests now GREEN; 4 adapter test files (18 tests) all pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite SlackAdapter with dual-mode OAuth + legacy paths** - `ffe14fc5` (feat)
2. **Task 2: Update resolveAdapter to prioritize Slack user OAuth token** - `8a2cf838` (feat)

**Plan metadata:** (docs commit, see below)

_Note: TDD tasks have RED confirmation before implementation._

## Files Created/Modified
- `lib/source-adapters/slack-adapter.ts` - Rewritten: dual-mode constructor, _fetchOAuth (search.messages), _fetchLegacy (conversations.history)
- `lib/source-adapters/index.ts` - resolveAdapter: Slack userToken priority check added before org bot token
- `lib/source-adapters/index.test.ts` - Added 3 new TDD tests for Slack userToken priority behavior

## Decisions Made
- **UTC date parsing:** Used `getUTCFullYear/getUTCMonth/getUTCDate` — local methods would shift `2026-04-27T00:00:00Z` to `2026-04-26` in UTC-offset timezones, causing test failures and wrong Slack query dates.
- **encodeURIComponent for query string:** `URLSearchParams` encodes spaces as `+`; `decodeURIComponent` does not reverse `+` to space. Tests use `decodeURIComponent(url)` to check for project name — using `encodeURIComponent` ensures `%20` encoding which round-trips correctly.
- **Constructor discriminant:** `'channels' in input` distinguishes legacy `{ token, channels }` from `UserSourceToken` — clean without instanceof and handles the shape reliably.
- **`userToken.source === 'slack'` guard:** Prevents a gmail or gong UserSourceToken (passed generically) from being mistakenly routed to SlackAdapter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UTC date parsing to avoid timezone date shift**
- **Found during:** Task 1 (first test run showed `after:2026-04-26` instead of expected `after:2026-04-27`)
- **Issue:** `new Date('2026-04-27T00:00:00Z').getDate()` returns 26 in negative UTC offset timezones; local date methods shift the date back
- **Fix:** Replaced `getFullYear/getMonth/getDate` with `getUTCFullYear/getUTCMonth/getUTCDate`
- **Files modified:** `lib/source-adapters/slack-adapter.ts`
- **Verification:** Test "includes after:YYYY-MM-DD date filter" passes GREEN
- **Committed in:** `ffe14fc5` (Task 1 commit)

**2. [Rule 1 - Bug] Use encodeURIComponent instead of URLSearchParams for query string**
- **Found during:** Task 1 (test "includes projectName in query param" failed — `BigPanda+Onboarding` != `BigPanda Onboarding` after decodeURIComponent)
- **Issue:** `URLSearchParams` encodes space as `+`; test uses `decodeURIComponent(url)` which only decodes `%XX` escapes, not `+`
- **Fix:** Replaced `new URLSearchParams({query: searchQuery, ...})` with manual URL string using `encodeURIComponent(searchQuery)` for the query param; kept sort/count params as literals
- **Files modified:** `lib/source-adapters/slack-adapter.ts`
- **Verification:** All 7 Wave 0 tests pass GREEN
- **Committed in:** `ffe14fc5` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Both were correctness bugs discovered during TDD RED→GREEN cycle. No scope creep.

## Issues Encountered
None beyond the two auto-fixed bugs above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SlackAdapter OAuth mode is ready to receive tokens produced by Plan 84-01 (Slack OAuth routes)
- `resolveAdapter` will use the user token stored in `userSourceTokens` table once 84-01 is complete
- Plans 84-03 through 84-05 can proceed — adapter layer is fully wired

---
*Phase: 84-discovery-scan-hardening*
*Completed: 2026-05-05*
