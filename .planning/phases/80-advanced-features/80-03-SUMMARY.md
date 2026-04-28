---
phase: 80-advanced-features
plan: "03"
subsystem: ui
tags: [google-calendar, freebusy, oauth, react, typescript, availability]

# Dependency graph
requires:
  - phase: 80-01
    provides: CalendarEventItem with start_datetime/end_datetime + DB schema for daily_prep_briefs
  - phase: 80-02
    provides: EventCardState with hasTemplate/templateContent; DailyPrepCard template UX
provides:
  - app/api/calendar/freebusy/route.ts — POST proxy to Google Calendar freebusy.query API
  - OAuth initiation now requests calendar.freebusy scope alongside calendar.events.readonly
  - EventCardState.availability map (per-email free/busy/loading/unknown status)
  - DailyPrepCard availability chips with green/red/gray dots per matched stakeholder
  - Page freebusy batched fetch on load with loading states and graceful 403 degradation
  - attendee_emails added to CalendarEventItem for client-side stakeholder cross-reference
affects:
  - 80-04 (SCHED-01) — auto-prep job reads events with same CalendarEventItem shape
  - future calendar features — freebusy pattern established

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "POST /api/calendar/freebusy: lazy DB import inside handler (Docker compatibility); Zod validation; isBusyDuringEvent overlap helper; 403/401 error mapped to { error: 'scope_insufficient' | 'not_connected' }"
    - "Freebusy batched on page load: single useEffect fires after cards.length changes; stakeholder emails fetched per matched project; all emails cross-referenced with attendee_emails"
    - "Graceful degradation: scope_insufficient → amber banner + empty availability maps; not_connected → silent empty maps"

key-files:
  created:
    - app/api/calendar/freebusy/route.ts
  modified:
    - app/api/oauth/calendar/route.ts
    - app/api/time-entries/calendar-import/route.ts
    - components/DailyPrepCard.tsx
    - app/daily-prep/page.tsx
    - app/api/stakeholders/route.ts

key-decisions:
  - "freebusy route uses lazy dynamic imports (import('@/db').default) inside handler body — avoids module-scope DB initialization for Docker compatibility"
  - "attendee_emails added to CalendarEventItem so page can cross-reference with project stakeholder emails client-side without extra API calls"
  - "Stakeholders GET route extended to include email in response (previously returned only id/name/role)"
  - "Freebusy useEffect keyed on [cards.length, selectedDate] — fires once after events load without re-running on availability state updates"
  - "matchedStakeholders passed as prop to DailyPrepCard from page state — card renders chips only when both prop is non-empty AND availability map is non-empty (prevents flash before fetch)"

requirements-completed:
  - AVAIL-01

# Metrics
duration: 7min
completed: 2026-04-28
---

# Phase 80 Plan 03: Stakeholder Availability Indicators Summary

**Google Calendar freebusy proxy route + availability chips on Daily Prep cards, with OAuth scope upgrade and graceful 403 degradation for existing tokens**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-28T18:05:10Z
- **Completed:** 2026-04-28T18:11:08Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `app/api/calendar/freebusy/route.ts`: POST handler proxying to Google Calendar freebusy.query, Zod validation, isBusyDuringEvent overlap helper, 403/401 error shaping
- Extended OAuth initiation to request `calendar.freebusy` scope alongside `calendar.events.readonly`
- Added `availability` field to `EventCardState` and availability chips in `DailyPrepCard` (green/red/gray dots per matched stakeholder)
- Page batches a single freebusy request on load; loading states shown while in-flight; 403 scope error shows soft reconnect banner

## Task Commits

Each task was committed atomically:

1. **Task 1: OAuth scope upgrade + /api/calendar/freebusy proxy route** - `5c15ab2d` (feat)
2. **Task 2: EventCardState availability field + availability chips + page load fetch** - `018fdc1b` (feat)

**Plan metadata:** `[pending docs commit]`

## Files Created/Modified

- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/calendar/freebusy/route.ts` — New POST proxy to Google freebusy.query; isBusyDuringEvent helper; Zod validation; 403/401 error shaping
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/oauth/calendar/route.ts` — Added `calendar.freebusy` scope to OAuth initiation
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/time-entries/calendar-import/route.ts` — Added `attendee_emails: string[]` to CalendarEventItem interface and mapping
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/DailyPrepCard.tsx` — Added `availability` to EventCardState; `matchedStakeholders` prop; availability chips section
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/daily-prep/page.tsx` — Added freebusy useEffect: stakeholder fetch → email cross-ref → POST to freebusy → update availability maps; scope banner state
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/stakeholders/route.ts` — Added `email` to GET response fields

## Decisions Made

- Lazy dynamic imports inside freebusy handler body (`import('@/db').default`) to avoid module-scope DB initialization — required for Docker build compatibility
- Added `attendee_emails` to `CalendarEventItem` so the page can cross-reference attendees with project stakeholders without extra server round-trips
- Stakeholders GET route returns `email` now — additive change, no breaking impact on existing consumers
- Freebusy `useEffect` keyed on `[cards.length, selectedDate]` to fire once after events load and re-fire on date change, without infinite loops from availability state updates
- Availability chips only shown when `Object.keys(card.availability).length > 0` (after fetch resolves) AND `matchedStakeholders` is non-empty — prevents flash of empty chips

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added attendee_emails field to CalendarEventItem**
- **Found during:** Task 2 (page freebusy fetch implementation)
- **Issue:** Plan required page to cross-reference attendee emails with project stakeholder emails, but `CalendarEventItem` only had `attendee_names` (display names), not emails
- **Fix:** Added `attendee_emails: string[]` to `CalendarEventItem` interface and to the event mapping in `calendar-import/route.ts`
- **Files modified:** `app/api/time-entries/calendar-import/route.ts`
- **Verification:** TypeScript clean; tests pass
- **Committed in:** `5c15ab2d` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added email to stakeholders GET response**
- **Found during:** Task 2 (freebusy stakeholder fetch implementation)
- **Issue:** `GET /api/stakeholders?project_id=X` returned only `id, name, role` — no email; the freebusy feature requires stakeholder emails to cross-reference with attendees
- **Fix:** Added `email: stakeholders.email` to the Drizzle select in the GET handler
- **Files modified:** `app/api/stakeholders/route.ts`
- **Verification:** TypeScript clean; additive change; existing consumers unaffected
- **Committed in:** `018fdc1b` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both fixes essential for the feature to work. No scope creep.

## Issues Encountered

- Plans 80-02 and 80-04 had already been committed before this plan ran (out-of-order execution). The `availability: {}` initializer in `EventCardState` was already present from 80-02's linter-merged state. The freebusy `useEffect` in `page.tsx` was absorbed into the 80-04 commit by the linter. All functionality is correctly committed and present.

## User Setup Required

None — no external service configuration required. Existing users will see availability chips only after re-authorizing Google Calendar (to grant the new `calendar.freebusy` scope). The page degrades gracefully with a "Reconnect calendar" banner for existing tokens.

## Next Phase Readiness

- AVAIL-01 fully delivered: OAuth scope, freebusy proxy, availability chips, graceful degradation
- 80-04 (SCHED-01) is already complete
- Phase 80 is fully complete

## Self-Check: PASSED

- FOUND: app/api/calendar/freebusy/route.ts
- FOUND: 80-03-SUMMARY.md
- FOUND commit: 5c15ab2d (Task 1)
- FOUND commit: 018fdc1b (Task 2)

---
*Phase: 80-advanced-features*
*Completed: 2026-04-28*
