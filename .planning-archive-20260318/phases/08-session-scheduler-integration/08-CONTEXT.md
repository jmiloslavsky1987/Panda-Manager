# Phase 8: Session Scheduler Integration - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning
**Source:** Conversation context + dual codebase exploration

<domain>
## Phase Boundary

Port the standalone session-scheduler app (Python/FastAPI at ~/Desktop/session-scheduler) into
the Project Intelligence Express/React app as a new Sessions view. The scheduler finds mutual
Google Calendar availability across attendees and creates calendar events.

**Scope:**
- Google Calendar OAuth token management (one-time setup, local file storage, silent thereafter)
- Port slot-finding algorithm from Python to JavaScript
- New server routes: calendar auth, availability search, event creation
- New Sessions view with customer-context-aware attendee pre-fill
- Save scheduled sessions as artifacts in customer YAML
- Graceful degradation when Calendar not yet authorized

**Out of scope:**
- Multi-user authentication (single-user app, only Josh authorizes)
- Recurring event support
- Calendar creation/management
- Any paid API calls (Google Calendar API is free)

</domain>

<decisions>
## Implementation Decisions

### Authentication
- **Single-user OAuth only** — Josh authorizes once via Google Calendar OAuth. No other users ever log in.
- **Token storage** — `server/calendar-token.json` (local file, gitignored). Store full OAuth2 token including refresh_token.
- **Token refresh** — Use `googleapis` npm (already installed for Drive) with `google.auth.OAuth2`. Refresh happens automatically via `oauth2Client.credentials` when token expires.
- **OAuth routes** on Express: `GET /auth/calendar` (redirect to Google) + `GET /auth/calendar/callback` (handle code, write token file, redirect to app)
- **Auth check middleware** — `requireCalendarAuth` middleware reads token file; if missing, responds 401 with `{ error: 'calendar_not_authorized' }` sentinel that client checks
- **Scopes needed**: `https://www.googleapis.com/auth/calendar.readonly` (free/busy) + `https://www.googleapis.com/auth/calendar.events` (create events)
- **Credentials source**: reuse existing `.env` — add `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` (separate from Drive service account)

### Slot-Finding Algorithm (port from Python `google_calendar.py`)
- Port `find_available_slots()` to `server/services/calendarService.js`
- **Input**: `{ calendarIds: string[], durationMinutes: number, weeksAhead: number, slotIncrement?: number }`
- **Output**: `{ slots: Array<{start, end, start_local, end_local, date}>, errors: Record<string, string> }`
- Use Google Calendar `freebusy().query()` — same API, same logic
- Working hours: 8am–6pm (adjust from Python's 7am–7pm to more typical business hours)
- Weekdays only (Mon–Fri)
- Timezone: detect from `calendar.settings.get({ setting: 'timezone' })` on first call; cache in response
- Merge busy intervals before gap detection (same `_merge_busy` logic)
- Inaccessible calendars → add to `errors` object, don't crash

### Server Routes (new file: `server/routes/calendar.js`)
- `GET  /api/calendar/status`             → `{ authorized: bool }` — client polls this on load
- `GET  /api/calendar/auth`               → redirect to Google OAuth consent screen
- `GET  /api/calendar/callback`           → receive code, store token, redirect to `/`
- `POST /api/calendar/availability`       → body: `{ calendarIds, durationMinutes, weeksAhead }` → slots
- `POST /api/calendar/events`             → body: `{ slot, title, attendees, description }` → created event
- Mount in `server/index.js` at `/api/calendar`
- All routes except `/status`, `/auth`, `/callback` use `requireCalendarAuth` middleware

### Customer Contact Pre-fill
- Customer YAML has `customer.contact` and `customer.email` fields (from schema)
- Sessions view reads these via `useOutletContext()` — pre-populates attendee list
- User can add/remove additional email addresses in the view

### Sessions View (`client/src/views/SessionScheduler.jsx`)
- Route: `/customer/:customerId/sessions`
- Sidebar entry: "Sessions" in the customer sub-nav (NAV_LINKS in Sidebar.jsx)
- **Unauthenticated state**: Show "Connect Google Calendar" card with link to `/api/calendar/auth` — no crash
- **Authenticated state**: Full scheduler UI
  - Attendees list (pre-filled + editable)
  - Duration select: 30 / 45 / 60 / 90 / 120 min
  - Weeks ahead: 1 / 2 / 3 / 4
  - "Find Available Slots" button → POST to `/api/calendar/availability`
  - Slots grouped by date, selectable
  - Title input + "Create Event" button → POST to `/api/calendar/events`
- **Post-schedule**: Save to YAML as artifact (`type: 'session'`)
- Uses TanStack Query `useMutation` pattern matching existing views
- No streaming, no AI — pure calendar API

### Save Sessions as Artifacts
- After successful event creation, POST to existing `/api/customers/:id/artifacts`
- Artifact shape: `{ type: 'session', title, description: attendees list, status: 'active', owner: '', date: slot.date }`
- Uses existing `postArtifact` in `api.js` — no new endpoint needed
- `type: 'session'` is a new artifact type — add to `ARTIFACT_TYPE_OPTIONS` in ArtifactManager

### YAML Schema
- No new top-level keys — sessions are stored under existing `artifacts` array
- `type: 'session'` is the discriminator

### Google OAuth App Setup Note
- Requires a Google Cloud project with Calendar API enabled + OAuth2 credentials
- User must add `http://localhost:3001/api/calendar/callback` as authorized redirect URI
- This is a one-time setup in Google Cloud Console — document in server README or `.env.example`

### Testing
- `server/routes/calendar.test.js` — mock `calendarService`, test `/status` and `/availability` + `/events` with auth middleware
- `calendarService.test.js` — unit test slot algorithm with mock freebusy data (known busy periods → expected slots)

### Dependencies
- `googleapis` npm already installed (for Drive) — Calendar API uses the same client
- No new npm packages needed

</decisions>

<specifics>
## Reference: Python Algorithm Source
`~/Desktop/session-scheduler/google_calendar.py` — `find_available_slots()` lines 59–143
`~/Desktop/session-scheduler/main.py` — route handlers for reference on request/response shapes

## Reference: Existing Patterns to Follow
- Auth middleware pattern: see `server/middleware/asyncWrapper.js`
- Service pattern: see `server/services/driveService.js` (googleapis client setup)
- Route pattern: see `server/routes/artifacts.js` (standard CRUD)
- React view pattern: see `client/src/views/ArtifactManager.jsx` (useMutation + optimistic UI)
- API layer: see `client/src/api.js` (apiFetch wrapper)

## Brand / UI
- Tailwind v4: all classNames must be complete string literals (no dynamic construction)
- Color palette: teal-600 primary, gray-200 borders, red-600 errors — match existing views
- "Connect Google Calendar" unauthenticated state: use the same empty-state card pattern as other views

</specifics>

<deferred>
## Deferred

- Recurring events
- Calendar management (create/delete calendars)
- Multi-timezone display (show each attendee's local time)
- Email draft generation (session-scheduler feature — out of scope here)
- Support for coworkers who aren't in YAML contact list (can manually add emails, but no lookup)

</deferred>

---

*Phase: 08-session-scheduler-integration*
*Context gathered: 2026-03-06 via conversation + codebase exploration*
