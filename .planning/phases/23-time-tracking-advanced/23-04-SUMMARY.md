---
phase: 23-time-tracking-advanced
plan: "04"
subsystem: api
tags: [google-calendar, oauth, googleapis, next.js, time-tracking]

# Dependency graph
requires:
  - phase: 23-03
    provides: TimeTab.tsx with Submit Week button and status badges; user_source_tokens DB table from 19.1
  - phase: 19.1-source-integrations
    provides: user_source_tokens table schema and Gmail OAuth pattern to mirror
provides:
  - "GET /api/oauth/calendar — Google Calendar OAuth initiation with calendar.events.readonly scope"
  - "GET /api/oauth/calendar/callback — token exchange + upsert to user_source_tokens (source='calendar')"
  - "GET /api/oauth/calendar/status — connection status check"
  - "GET /api/projects/[id]/time-entries/calendar-import — fetch week events with attendee-based project matching"
  - "POST /api/projects/[id]/time-entries/calendar-import — import selected events as draft time entries"
  - "CalendarImportModal.tsx — per-event project override, skip, confidence badges"
  - "TimeTab.tsx updated — Import from Calendar button in toolbar"
affects: [23-05, 23-06, 23-07, 23-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Calendar OAuth: setCredentials() + 'tokens' event for auto-refresh (NOT deprecated refreshAccessToken)"
    - "Dedicated GOOGLE_CALENDAR_REDIRECT_URI env var — never falls back to Gmail's GOOGLE_REDIRECT_URI"
    - "Separate CSRF cookie 'oauth_calendar_state' — isolated from Gmail's 'oauth_state' cookie"
    - "All-day event filter: check event.start.dateTime !== undefined before processing"
    - "Attendee-based project matching: count email overlaps with stakeholders per project"

key-files:
  created:
    - bigpanda-app/app/api/oauth/calendar/route.ts
    - bigpanda-app/app/api/oauth/calendar/callback/route.ts
    - bigpanda-app/app/api/oauth/calendar/status/route.ts
    - bigpanda-app/app/api/projects/[projectId]/time-entries/calendar-import/route.ts
    - bigpanda-app/components/CalendarImportModal.tsx
  modified:
    - bigpanda-app/components/TimeTab.tsx

key-decisions:
  - "Used GOOGLE_CALENDAR_REDIRECT_URI exclusively — no fallback to GOOGLE_REDIRECT_URI (Gmail callback URI) which would mis-route calendar OAuth"
  - "Token refresh via setCredentials() + 'tokens' event per googleapis Pattern 2 — refreshAccessToken() is deprecated"
  - "Separate oauth_calendar_state cookie name to avoid CSRF token collision with Gmail OAuth flow"
  - "All-day events filtered by absence of event.start.dateTime (all-day events only have event.start.date)"
  - "CalendarImportModal is self-contained (manages own open/close) — TimeTab renders it without local modal state"

patterns-established:
  - "Calendar OAuth pattern: mirror Gmail OAuth but with GOOGLE_CALENDAR_REDIRECT_URI + separate state cookie"
  - "Project matching: stakeholder email overlap counting, confidence high(2+)/low(1)/none(0)"

requirements-completed: [TTADV-11, TTADV-12, TTADV-13, TTADV-14]

# Metrics
duration: 4min
completed: "2026-03-28"
---

# Phase 23 Plan 04: Google Calendar OAuth + Import Summary

**Google Calendar OAuth with attendee-based project auto-matching: 3 OAuth routes + calendar-import API + CalendarImportModal, importing events as draft time entries on their original event dates**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T02:15:48Z
- **Completed:** 2026-03-28T02:19:48Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Google Calendar OAuth flow (initiate + callback + status) mirroring Gmail OAuth pattern with correct scopes and dedicated env vars
- Token refresh via setCredentials() + 'tokens' event — documented correct pattern from research, no deprecated API usage
- Calendar event import with attendee-based project matching (high/low/none confidence from stakeholder email overlap)
- TTADV-14 compliance: entries use event.start.dateTime date, not import date
- CalendarImportModal with per-event project override, skip checkbox, confidence badges, connect-to-calendar prompt
- TimeTab updated with "Import from Calendar" button in toolbar

## Task Commits

Each task was committed atomically:

1. **Task 1: Google Calendar OAuth routes** - `710c7dd` (feat)
2. **Task 2: Calendar import API route + CalendarImportModal** - `1bb3e3d` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `bigpanda-app/app/api/oauth/calendar/route.ts` — GET: redirect to Google OAuth with calendar.events.readonly scope, GOOGLE_CALENDAR_REDIRECT_URI exclusive
- `bigpanda-app/app/api/oauth/calendar/callback/route.ts` — GET: exchange code, CSRF check on oauth_calendar_state cookie, guard on missing refresh_token, upsert to user_source_tokens
- `bigpanda-app/app/api/oauth/calendar/status/route.ts` — GET: returns { connected, expires_at } from DB
- `bigpanda-app/app/api/projects/[projectId]/time-entries/calendar-import/route.ts` — GET: list events with project matching; POST: import as draft entries
- `bigpanda-app/components/CalendarImportModal.tsx` — Import review modal with project override, skip, confidence badges
- `bigpanda-app/components/TimeTab.tsx` — Added CalendarImportModal to toolbar

## Decisions Made
- GOOGLE_CALENDAR_REDIRECT_URI is a dedicated env var with no fallback to GOOGLE_REDIRECT_URI — using the Gmail callback URI for calendar would route calendar OAuth back to the Gmail callback handler (correctness bug identified in research)
- Token refresh uses setCredentials() + 'tokens' event (googleapis Pattern 2), not the deprecated refreshAccessToken() method
- Separate 'oauth_calendar_state' CSRF cookie prevents token collision with Gmail's 'oauth_state' cookie
- CalendarImportModal is self-contained with its own open/close state — TimeTab only renders it, no showCalendarModal flag needed in TimeTab

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `payload` variable and dead code in CalendarImportModal**
- **Found during:** Task 2 (CalendarImportModal creation)
- **Issue:** Two near-identical mapping blocks — `payload` (unused) and `correctedPayload` (used) — the unused block also had `row.event.event.summary` (wrong nesting)
- **Fix:** Removed the unused `payload` variable, kept `correctedPayload` with correct `row.event.summary`
- **Files modified:** bigpanda-app/components/CalendarImportModal.tsx
- **Verification:** No unused variable, correct property access
- **Committed in:** 1bb3e3d (Task 2 commit)

**2. [Rule 3 - Blocking] Removed invalid `import type { DB } from '@/db'`**
- **Found during:** Task 2 (calendar-import route creation)
- **Issue:** db/index.ts does not export a `DB` type — import would cause TypeScript compile error
- **Fix:** Removed the invalid import; function parameter typed as `typeof db` directly
- **Files modified:** bigpanda-app/app/api/projects/[projectId]/time-entries/calendar-import/route.ts
- **Verification:** Import removed; `typeof db` used consistently
- **Committed in:** 1bb3e3d (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking import error)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered
- Plan verification script used string matching including code comments — false positive on `refreshAccessToken` appearing in a comment ("NOT refreshAccessToken() — deprecated"). Fixed by stripping comments before checking.

## User Setup Required
External services require manual configuration before Google Calendar import will work:

1. **Environment variable:** Add `GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/oauth/calendar/callback` to `.env.local`
2. **Google Cloud Console:** Add `http://localhost:3000/api/oauth/calendar/callback` to Authorized Redirect URIs on the existing OAuth 2.0 credential
3. **Google Cloud Console:** Enable Google Calendar API (APIs & Services → Enable APIs → "Google Calendar API")
4. **OAuth Consent Screen:** Add scope `https://www.googleapis.com/auth/calendar.events.readonly`
5. **Publishing status:** Must be "In Production" (not "Testing") to avoid 7-day refresh token expiry

## Next Phase Readiness
- All TTADV-11/12/13/14 requirements implemented
- Calendar OAuth flow ready for manual testing once env vars and Google Cloud Console configured
- CalendarImportModal integrates cleanly with TimeTab — ready for Phase 23 subsequent plans

## Self-Check: PASSED

All 6 created files confirmed present on disk. Commits 710c7dd and 1bb3e3d verified in git log.

---
*Phase: 23-time-tracking-advanced*
*Completed: 2026-03-28*
