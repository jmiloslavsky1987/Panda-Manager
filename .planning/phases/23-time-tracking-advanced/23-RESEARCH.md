# Phase 23: Time Tracking Advanced — Research

**Researched:** 2026-03-27
**Domain:** OAuth2 / Google Calendar API / Approval Workflows / PostgreSQL State Machines / Next.js App Router
**Confidence:** HIGH for OAuth patterns (verified against live codebase), MEDIUM for notification approach, HIGH for state machine

---

## Summary

Phase 23 transforms the basic time logging tab into a team-grade system with approval workflows, Google Calendar import, admin configuration, bulk operations, export with audit fields, and in-app notifications. The highest technical risk is the Google Calendar OAuth flow — not because the pattern is complex, but because Plan 23-04 contains a correctness bug: it calls `oauth2Client.refreshAccessToken()`, which is **deprecated** in the `googleapis` library. The correct approach is `setCredentials()` with automatic refresh, using the `'tokens'` event to persist updated tokens back to the database.

The existing Gmail OAuth implementation in the codebase is the correct pattern to follow — it correctly uses `prompt: 'consent'`, CSRF state cookies, and upserts into `user_source_tokens`. The Calendar OAuth flow mirrors this pattern exactly, adding only the `calendar.events.readonly` scope (the narrowest scope that allows `events.list`).

For in-app notifications, simple polling (30–60 second interval) against a DB-backed `app_notifications` table is the right approach for this single-user app. SSE would work but adds connection management complexity with zero benefit in a single-user context. Polling is what Plan 23-07 already specifies and it is correct.

The approval state machine in Plan 23-01 and 23-03 correctly models state as derived from nullable timestamp fields (submitted_on, approved_on, rejected_on) plus an explicit `locked` boolean. This is the right approach for an audit-friendly system — timestamps are immutable evidence, not just flags.

**Primary recommendation:** Fix the deprecated `refreshAccessToken()` call in Plan 23-04. All other architectural decisions in the existing plans are sound. The OAuth consent screen MUST be set to "In Production" (not "Testing") or all calendar tokens will expire after 7 days.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TTADV-01 | Admin enable/disable time tracking globally from Settings | time_tracking_config single-row table (Plan 23-02) — correct pattern |
| TTADV-02 | Admin configure weekly capacity, working days, submission due date/time, reminder frequency | Schema fields: weekly_capacity_hours, working_days, submission_due_day, submission_due_time, reminder_days_before |
| TTADV-03 | Admin create/manage custom time entry categories | categories TEXT[] in time_tracking_config |
| TTADV-04 | Admin restrict time entry to assigned projects, filter by status | restrict_to_assigned, active_projects_only booleans in config |
| TTADV-05 | Admin designate exempt users | exempt_users TEXT[] in time_tracking_config |
| TTADV-06 | Admin lock timesheets after approval | lock_after_approval boolean; checked in approve route |
| TTADV-07 | User submit week for approval | POST /time-entries/submit → sets submitted_on on draft entries |
| TTADV-08 | Approver approve/reject individual entries, bulk operations | approve/reject routes + bulk route; rejection requires reason field |
| TTADV-09 | Approver submit on behalf of team member | Submit Week dialog with "Submit for:" selector when ?role=approver |
| TTADV-10 | Approved entries locked for editing | canEdit() returns false for approved/locked; edit button hidden |
| TTADV-11 | User authenticate with Google Calendar via OAuth and import events | OAuth flow via /api/oauth/calendar — mirrors Gmail pattern |
| TTADV-12 | Auto-match calendar events to projects via attendee overlap | Attendee email vs stakeholder email comparison in calendar-import GET |
| TTADV-13 | User override auto-matched project or mark as non-project | CalendarImportModal project dropdown per event |
| TTADV-14 | Imported entries use event date, not import date | event.start.dateTime split to YYYY-MM-DD (critical correctness check) |
| TTADV-15 | Approver bulk-approve, bulk-reject, bulk-move, bulk-delete | POST /time-entries/bulk with action enum |
| TTADV-16 | Export to CSV and Excel with audit fields | GET /time-entries/export?format=csv|xlsx — xlsx package already installed |
| TTADV-17 | Grouping by project/team_member/status/date with subtotals | groupEntries() + computeSubtotals(); role/phase/task NOT in schema |
| TTADV-18 | Submission reminder notifications before and after due date | computePendingReminders() job handler + app_notifications table |
| TTADV-19 | Approval/rejection notifications with reason | buildApprovalNotification() / buildRejectionNotification() wired into routes |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | already installed | Google Calendar API + OAuth2 client | Official Google Node.js client; handles token refresh automatically |
| drizzle-orm | already installed | DB queries, transactions, bulk updates | Project standard; inArray() for bulk operations |
| xlsx | already installed | CSV and Excel export | Already used in plan-export; no new dependency |
| zod | already installed | Request body validation | Project standard for all API routes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/headers cookies() | built-in | CSRF state cookie in OAuth callback | Only needed in OAuth routes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| polling (60s interval) | SSE | SSE adds connection lifecycle management with zero benefit for single-user; polling is simpler and sufficient |
| polling (60s interval) | WebSockets | Even more infrastructure overhead; completely unnecessary |
| calendar.events.readonly scope | calendar.readonly scope | Both work for events.list; calendar.events.readonly is more specific and shows narrower intent to users |

**Installation:**
```bash
# No new packages required — googleapis, xlsx, drizzle-orm, zod all already installed
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 23 additions)
```
bigpanda-app/
├── app/api/
│   ├── oauth/calendar/
│   │   ├── route.ts           # GET → redirect to Google consent
│   │   ├── callback/route.ts  # GET → exchange code, store token
│   │   └── status/route.ts    # GET → connection status
│   ├── settings/time-tracking/route.ts   # GET/PATCH admin config
│   ├── notifications/time-tracking/route.ts  # GET/PATCH notification list
│   └── projects/[projectId]/time-entries/
│       ├── submit/route.ts    # POST → submit week
│       ├── bulk/route.ts      # POST → bulk approve/reject/move/delete
│       ├── export/route.ts    # GET → CSV/Excel download
│       ├── calendar-import/route.ts  # GET list events, POST import
│       └── [entryId]/
│           ├── approve/route.ts
│           └── reject/route.ts
├── components/
│   ├── TimeTab.tsx            # Central UI — modified across waves 1-2
│   ├── TimeTrackingSettings.tsx
│   └── CalendarImportModal.tsx
├── lib/
│   ├── time-tracking.ts       # Pure state helpers — no DB imports
│   └── time-tracking-notifications.ts  # DB-backed notification functions
├── db/
│   └── migrations/
│       ├── 0015_time_tracking_config.sql
│       └── 0016_notifications.sql
└── app/api/jobs/handlers/
    └── timesheet-reminder.ts  # BullMQ handler
```

### Pattern 1: Google Calendar OAuth2 — Correct Token Management
**What:** OAuth2 Authorization Code flow using existing Gmail OAuth client (same GOOGLE_CLIENT_ID/SECRET), different scope, different redirect URI, same `user_source_tokens` table with `source='calendar'`.
**When to use:** Any Google API token acquisition — identical flow for all Google OAuth in this codebase.

```typescript
// Source: googleapis official docs + existing bigpanda-app/app/api/oauth/gmail/route.ts

// INITIATE ROUTE (app/api/oauth/calendar/route.ts)
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',       // REQUIRED for refresh token
  scope: ['https://www.googleapis.com/auth/calendar.events.readonly'],
  prompt: 'consent',            // REQUIRED — ensures refresh_token always returned
  state,                        // CSRF token stored in HttpOnly cookie
});

// CALLBACK ROUTE (app/api/oauth/calendar/callback/route.ts)
// Exchange code for tokens
const { tokens } = await oauth2Client.getToken(code);
if (!tokens.refresh_token) {
  // Guard: should not happen with prompt: 'consent' — but handle it
  return redirect('/settings?error=calendar_no_refresh');
}
// Store in user_source_tokens (upsert on user_id + source unique constraint)
await db.insert(userSourceTokens).values({
  user_id: 'default',
  source: 'calendar',
  access_token: tokens.access_token ?? null,
  refresh_token: tokens.refresh_token,
  expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  updated_at: new Date(),
}).onConflictDoUpdate({ ... });

// Clear CSRF cookie + redirect — use NextResponse.redirect with { status: 302 }
// to avoid cookie/redirect race condition
const response = NextResponse.redirect(successUrl, { status: 302 });
response.cookies.set('oauth_calendar_state', '', { maxAge: 0 });
return response;
```

### Pattern 2: Calendar Token Usage — Correct Refresh (NOT refreshAccessToken)
**What:** Load stored token, call `setCredentials()`, let googleapis auto-refresh. Listen for `'tokens'` event to persist new tokens back to DB.
**When to use:** Every calendar-import API call.

```typescript
// Source: googleapis official docs (refreshAccessToken is deprecated)
// DO NOT use: oauth2Client.refreshAccessToken() — DEPRECATED

async function getCalendarClient(db: DB): Promise<calendar_v3.Calendar> {
  const [tokenRow] = await db
    .select()
    .from(userSourceTokens)
    .where(and(eq(userSourceTokens.user_id, 'default'), eq(userSourceTokens.source, 'calendar')))
    .limit(1);

  if (!tokenRow) throw new Error('Calendar not connected');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ?? process.env.GOOGLE_REDIRECT_URI,
  );

  // setCredentials — automatic refresh is built in; no manual refresh call needed
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expires_at?.getTime(),
  });

  // Persist updated tokens back to DB when googleapis auto-refreshes
  oauth2Client.on('tokens', async (newTokens) => {
    await db.update(userSourceTokens)
      .set({
        access_token: newTokens.access_token ?? tokenRow.access_token,
        expires_at: newTokens.expiry_date ? new Date(newTokens.expiry_date) : null,
        updated_at: new Date(),
        // refresh_token only present on first auth — don't overwrite if absent
        ...(newTokens.refresh_token ? { refresh_token: newTokens.refresh_token } : {}),
      })
      .where(and(
        eq(userSourceTokens.user_id, 'default'),
        eq(userSourceTokens.source, 'calendar'),
      ));
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}
```

### Pattern 3: Approval State Machine — Derived from Timestamps
**What:** Status derived by inspecting nullable timestamp fields in priority order. `locked` boolean takes highest priority.
**When to use:** All state-dependent UI and API logic in Phase 23.

```typescript
// Source: Plan 23-01 TDD contract — implemented in lib/time-tracking.ts
export function getEntryStatus(entry: TimeEntry): 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked' {
  if (entry.locked)          return 'locked';    // explicit lock highest priority
  if (entry.approved_on)     return 'approved';
  if (entry.rejected_on)     return 'rejected';
  if (entry.submitted_on)    return 'submitted';
  return 'draft';
}
```

### Pattern 4: Bulk Operations — Partial Failure Handling
**What:** Bulk endpoints filter ineligible entries silently and return `{ processed: N, skipped: M }`. No 400 error for partial skip — only 400 for completely invalid requests (missing required field, empty entry_ids).
**When to use:** Bulk approve, reject, move, delete.

```typescript
// Source: existing project bulk pattern (Plan 23-05) — Drizzle inArray
import { inArray, and } from 'drizzle-orm';

// Always run bulk mutations inside a transaction
await db.transaction(async (tx) => {
  // Filter in application code before DB call — avoids partial DB state
  const eligibleIds = allEntries
    .filter(entry => canEdit(entry))  // use lib/time-tracking.ts helpers
    .map(e => e.id);
  const skipped = entry_ids.length - eligibleIds.length;

  if (eligibleIds.length > 0) {
    await tx.update(timeEntries)
      .set({ project_id: targetProjectId })
      .where(and(
        eq(timeEntries.project_id, numericProjectId),
        inArray(timeEntries.id, eligibleIds)
      ));
  }
  return { processed: eligibleIds.length, skipped };
});
```

### Pattern 5: CSRF Cookie + Redirect in App Router OAuth Callback
**What:** Use `NextResponse.redirect(url, { status: 302 })` (explicit 302) and clear the CSRF cookie via `response.cookies.set()` on the response object. Do NOT use `response.headers.set('Set-Cookie', ...)` for the clear — use the NextResponse cookie API.
**When to use:** All OAuth callbacks.

```typescript
// Source: GitHub discussion #48434 — confirmed working pattern
const response = NextResponse.redirect(successUrl, { status: 302 }); // { status: 302 } is REQUIRED
response.cookies.set('oauth_calendar_state', '', { maxAge: 0, path: '/' });
return response;
```

### Anti-Patterns to Avoid
- **Using `refreshAccessToken()`:** This method is deprecated in googleapis. Use `setCredentials()` + automatic refresh + `'tokens'` event listener instead.
- **SSE for notification polling in single-user app:** The notification polling every 60 seconds is simpler, has no connection state to manage, and is completely adequate. SSE would require cleanup logic and adds no benefit here.
- **Using `calendar.readonly` scope:** While it works, `calendar.events.readonly` is more targeted. However, if the OAuth client already has `calendar.readonly` authorized, that also works — both scopes satisfy `events.list` authorization.
- **Using `calendar` (full) scope:** Restricted by Google; requires security assessment for production. Do not use — read-only import never needs write access.
- **Using `pgEnum` for approval status:** The current approach of nullable timestamps is better for this use case — it stores the actual event time, not just current state, which is critical for audit log accuracy.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Google OAuth token auto-refresh | Manual expiry check + refreshAccessToken() call | googleapis setCredentials() + 'tokens' event | refreshAccessToken() is deprecated; library auto-refreshes when token expires |
| Excel generation | Custom XLSX byte writer | xlsx package (already installed) | Edge cases: date serialization, cell types, encoding — xlsx handles all of it |
| Bulk DB update | Loop of individual UPDATE calls | Drizzle inArray() + single UPDATE | N+1 queries; inArray() generates a single `WHERE id IN (...)` |
| CSRF protection in OAuth | Custom token scheme | crypto.randomUUID() + HttpOnly cookie | Already established pattern in Gmail OAuth — consistent and secure |
| Approval state logic | Inline if-else chains in route handlers | lib/time-tracking.ts pure functions | Centralizes logic tested by Wave 0 TDD; routes stay thin |

---

## Common Pitfalls

### Pitfall 1: Google OAuth App in "Testing" Mode — 7-Day Token Expiry
**What goes wrong:** Calendar tokens silently expire after 7 days. Users get logged-out errors, cannot import events. Error appears as `invalid_grant` or `token_expired`.
**Why it happens:** Google Cloud OAuth consent screen set to "Testing" (external user type) limits refresh token lifetime to exactly 7 days.
**How to avoid:** In Google Cloud Console → APIs & Services → OAuth consent screen → Publishing status → Click "Publish App" to move to "In Production". This is required before any real use. During pure local dev testing, this is acceptable but must be resolved before any real usage.
**Warning signs:** Calendar integration works for exactly one week then fails for all users simultaneously.

### Pitfall 2: Missing `prompt: 'consent'` → No Refresh Token
**What goes wrong:** OAuth callback receives `access_token` but no `refresh_token`. Token expires in 1 hour, user must re-authorize.
**Why it happens:** Google only returns `refresh_token` on first authorization unless `prompt: 'consent'` is forced.
**How to avoid:** Always include `prompt: 'consent'` in `generateAuthUrl()`. The Gmail OAuth route already does this correctly — calendar route must do the same.
**Warning signs:** `tokens.refresh_token` is `undefined` in callback handler (guard already exists in Gmail callback).

### Pitfall 3: Calling `refreshAccessToken()` — Deprecated API
**What goes wrong:** `refreshAccessToken()` may be removed in future googleapis versions. Current behavior varies by library version. More importantly, it bypasses the automatic refresh + token event system.
**Why it happens:** Plan 23-04 specifies `oauth2Client.refreshAccessToken()` in the calendar-import route.
**How to avoid:** Use `setCredentials({ access_token, refresh_token, expiry_date })` and let googleapis refresh automatically. Wire `oauth2Client.on('tokens', ...)` to update the DB when a new token is issued.
**Warning signs:** Access token expired errors after 1 hour despite having a valid refresh token in DB.

### Pitfall 4: CSRF State Cookie Not Cleared After OAuth Callback
**What goes wrong:** Old state cookie persists, causing the next OAuth attempt to fail CSRF validation (cookies match the wrong state).
**Why it happens:** `oauth_state` cookie not cleared in callback route. Gmail callback sets `Max-Age=0` correctly — calendar callback must do the same.
**How to avoid:** In callback route, always clear the state cookie: `response.cookies.set('oauth_calendar_state', '', { maxAge: 0, path: '/' })`.

### Pitfall 5: Cookie + Redirect Race in Next.js App Router
**What goes wrong:** CSRF state cookie set in initiate route is not sent to browser before redirect, OR clearing cookie in callback is not applied before redirect.
**Why it happens:** Using bare `Response.redirect()` (without `{ status: 302 }`) can cause the response to hang or the browser to not process `Set-Cookie` headers.
**How to avoid:** Always use `NextResponse.redirect(url, { status: 302 })` and set cookies via `response.cookies.set()` on the NextResponse object (not via raw `Set-Cookie` headers).

### Pitfall 6: All-Day Calendar Events Have No Duration
**What goes wrong:** `event.start.dateTime` is `undefined` for all-day events; accessing it causes TypeError; duration computation fails.
**Why it happens:** Google Calendar API returns `start.date` (YYYY-MM-DD) for all-day events and `start.dateTime` (ISO string) for timed events — not both.
**How to avoid:** Filter out all-day events before duration computation. Plan 23-04 correctly specifies: "skip all-day events with no time component". Implementation must check `event.start.dateTime !== undefined` before proceeding.
**Warning signs:** TypeError in calendar-import GET when a user has any all-day events in their calendar.

### Pitfall 7: Bulk Operations Without Transaction — Partial State
**What goes wrong:** Bulk approve of 10 entries processes entries 1-7, then a DB error occurs. Entries 8-10 remain in submitted state. UI shows inconsistent data.
**Why it happens:** Running individual updates in a loop without a transaction.
**How to avoid:** Always wrap bulk mutations in `db.transaction()`. The Drizzle `inArray()` approach does the entire batch in one statement, making partial failure impossible at the DB level.

### Pitfall 8: TTADV-17 Scope Gap — role/phase/task Grouping Not in Schema
**What goes wrong:** Requirement says "grouping by role, phase, or task" but `time_entries` table has no such columns.
**Why it happens:** SCHEMA-03 (Phase 17) only added approval fields. role/phase/task are not per-entry metadata.
**How to avoid:** Plans 23-01 and 23-06 both correctly document this as a known gap. Implement 4 dimensions: project, team_member (submitted_by), status, date. Document role/phase/task as requiring schema extension. Do not attempt to infer these from other tables.

---

## Code Examples

### Calendar Event Fetching (Verified API Shape)
```typescript
// Source: googleapis official docs — google.calendar v3 events.list
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const events = await calendar.events.list({
  calendarId: 'primary',
  timeMin: weekStart.toISOString(),
  timeMax: weekEnd.toISOString(),
  singleEvents: true,
  orderBy: 'startTime',
});

// event.start.dateTime — present for timed events (ISO string)
// event.start.date    — present for all-day events (YYYY-MM-DD)
// event.attendees     — [{ email: string, displayName?: string }]
// event.summary       — event title
// Duration computation from timed events only:
const durationMs = new Date(event.end!.dateTime!).getTime() -
                   new Date(event.start!.dateTime!).getTime();
const durationHours = (durationMs / 3600000).toFixed(2);
const date = event.start!.dateTime!.split('T')[0]; // TTADV-14: use event date
```

### Drizzle inArray Bulk Update
```typescript
// Source: Drizzle ORM official docs
import { inArray, and, eq } from 'drizzle-orm';

await db.transaction(async (tx) => {
  await tx.update(timeEntries)
    .set({
      approved_on: new Date(),
      approved_by: approvedBy,
      locked: lockAfterApproval,
    })
    .where(and(
      eq(timeEntries.project_id, numericProjectId),
      inArray(timeEntries.id, eligibleIds),
    ));
});
```

### app_notifications Table Insert Pattern
```typescript
// Source: Plan 23-07 specification
await db.insert(appNotifications).values({
  user_id: 'default',
  type: 'timesheet_approved',
  title: 'Time Entry Approved',
  body: `Your entry "${entry.description}" on ${entry.date} has been approved by ${approvedBy}`,
  read: false,
  data: { project_id: entry.project_id, entry_id: entry.id },
});
```

### TimeTab Notification Polling (60s interval)
```typescript
// Source: Plan 23-07 specification — confirmed correct approach for single-user app
// In CalendarImportModal or TimeTab client component:
useEffect(() => {
  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications/time-tracking');
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unread_count);
  };
  fetchNotifications(); // fetch immediately on mount
  const interval = setInterval(fetchNotifications, 60_000); // then every 60s
  return () => clearInterval(interval); // cleanup on unmount
}, []);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| refreshAccessToken() | setCredentials() + 'tokens' event | googleapis v6+ | Deprecated method removed in recent versions; auto-refresh is built-in |
| pgEnum for status | Nullable timestamp fields (submitted_on, approved_on, etc.) | N/A | Timestamps are immutable audit evidence; derived status reduces schema mutations |
| response.headers.set('Set-Cookie') for redirect | NextResponse.redirect({ status: 302 }) + response.cookies.set() | Next.js 13+ App Router | Raw Set-Cookie headers can race with redirect in App Router |

**Deprecated/outdated:**
- `oauth2Client.refreshAccessToken()`: Deprecated — do not use; `setCredentials()` + auto-refresh is the current pattern.
- `getServerSession()` from next-auth/next: Not relevant here (project uses direct OAuth, not NextAuth), but noted for awareness.

---

## Open Questions

1. **Google Cloud Console — OAuth consent screen publishing status**
   - What we know: If set to "Testing", all calendar tokens expire after 7 days regardless of user behavior
   - What's unclear: Current status of the project's OAuth consent screen (has it been set to Production for Gmail already?)
   - Recommendation: Verify in Google Cloud Console before Plan 23-04 runs. Executor must note this check in the plan or task.

2. **user_source_tokens unique constraint**
   - What we know: Gmail OAuth uses `onConflictDoUpdate` targeting `[user_id, source]` — implies unique constraint exists
   - What's unclear: Whether a database-level unique constraint on `(user_id, source)` exists or just relies on Drizzle upsert semantics
   - Recommendation: Check the migration SQL for user_source_tokens. If no unique constraint exists, add one for the calendar upsert to work reliably. If constraint is missing, the `onConflictDoUpdate` will fail silently (no conflict detected = duplicate rows possible).

3. **`calendar.events.readonly` vs `calendar.readonly` scope — which is already enabled?**
   - What we know: Gmail OAuth client is already configured in Google Cloud Console. Adding calendar scope requires enabling the Google Calendar API and adding the scope to the OAuth consent screen.
   - What's unclear: Whether the user will choose `calendar.events.readonly` (sensitive, but less broad) or `calendar.readonly` (also sensitive, covers all calendar data including settings).
   - Recommendation: Use `calendar.events.readonly` — it is the most narrow scope that supports `events.list`. Both are classified as "sensitive" (not "restricted"), so no security assessment is required for either.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | bigpanda-app/vitest.config.ts |
| Quick run command | `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TTADV-07 | getEntryStatus, canSubmit state transitions | unit | `npx vitest run __tests__/time-tracking-advanced/approval-state.test.ts` | ❌ Wave 0 |
| TTADV-08 | canEdit, reject path state | unit | `npx vitest run __tests__/time-tracking-advanced/approval-state.test.ts` | ❌ Wave 0 |
| TTADV-10 | isLocked, canOverrideLock, buildLockPayload | unit | `npx vitest run __tests__/time-tracking-advanced/entry-locking.test.ts` | ❌ Wave 0 |
| TTADV-15 | groupEntries (all 4 dimensions), computeSubtotals | unit | `npx vitest run __tests__/time-tracking-advanced/grouping.test.ts` | ❌ Wave 0 |
| TTADV-17 | groupEntries + computeSubtotals edge cases | unit | `npx vitest run __tests__/time-tracking-advanced/grouping.test.ts` | ❌ Wave 0 |
| TTADV-11–14 | Calendar OAuth + event import | manual-only | N/A — requires live Google Calendar credentials | N/A |
| TTADV-16 | Export format correctness | manual-only | N/A — file download verification requires browser | N/A |
| TTADV-18–19 | Notification delivery and content | manual-only | N/A — requires running app + approval action | N/A |
| TTADV-01–06 | Admin settings persistence | manual-only | N/A — DB-backed config, verified via browser | N/A |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run __tests__/time-tracking-advanced/`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `bigpanda-app/__tests__/time-tracking-advanced/approval-state.test.ts` — covers TTADV-07, TTADV-08
- [ ] `bigpanda-app/__tests__/time-tracking-advanced/entry-locking.test.ts` — covers TTADV-10
- [ ] `bigpanda-app/__tests__/time-tracking-advanced/grouping.test.ts` — covers TTADV-15, TTADV-17
- [ ] `bigpanda-app/__tests__/time-tracking-advanced/` directory itself

---

## Plan Audit

### Plan 23-04 — CORRECTNESS BUG (HIGH severity)

**Issue 1: `refreshAccessToken()` is deprecated**

The calendar-import GET route (Task 2) specifies:
```typescript
// As written in Plan 23-04:
oauth2Client.refreshAccessToken()
```
This method is deprecated in the googleapis library. The correct pattern is `setCredentials()` + automatic refresh + `'tokens'` event. The executor MUST use Pattern 2 from this research document instead.

**Fix:** Replace the calendar-import route's token refresh logic with:
1. `oauth2Client.setCredentials({ access_token, refresh_token, expiry_date: expires_at?.getTime() })`
2. `oauth2Client.on('tokens', async (newTokens) => { /* upsert back to DB */ })`
3. No manual `refreshAccessToken()` call — googleapis handles this automatically

**Issue 2: CSRF cookie state name inconsistency**

Plan 23-04 Task 1 uses cookie name `oauth_calendar_state` in the initiate route but the Gmail callback reads `oauth_state`. These are intentionally different (different OAuth flows) — this is CORRECT. The calendar flow correctly uses a separate `oauth_calendar_state` cookie to avoid colliding with a concurrent Gmail OAuth flow. No change needed here.

**Issue 3: Redirect destination after calendar OAuth**

Plan 23-04 redirects to `/settings?calendar_connected=true` after successful calendar auth. However, the user initiates the OAuth flow from the TimeTab (clicking "Connect Google Calendar" in CalendarImportModal). Returning to `/settings` instead of back to the time tab may be disorienting. This is a UX concern, not a correctness bug. The plan is functionally correct — the user can navigate back. Low priority to address.

**Issue 4: `GOOGLE_CALENDAR_REDIRECT_URI` env var vs reusing `GOOGLE_REDIRECT_URI`**

Plan 23-04 uses `process.env.GOOGLE_CALENDAR_REDIRECT_URI ?? process.env.GOOGLE_REDIRECT_URI`. The `GOOGLE_REDIRECT_URI` is the Gmail callback URI (`/api/oauth/gmail/callback`). The calendar callback is `/api/oauth/calendar/callback`. These are different URIs. Using `GOOGLE_REDIRECT_URI` as a fallback for calendar is WRONG — it would redirect calendar auth back to the Gmail callback handler.

**Fix:** The calendar OAuth client MUST use a dedicated `GOOGLE_CALENDAR_REDIRECT_URI` pointing to `/api/oauth/calendar/callback`. The fallback to `GOOGLE_REDIRECT_URI` must be removed. The user_setup section in Plan 23-04 already correctly identifies that `GOOGLE_REDIRECT_URI` needs `http://localhost:3000/api/oauth/calendar/callback` added to authorized URIs — but the code logic must also use a SEPARATE env var (not fall back to the Gmail one).

**Correction for executor:**
```typescript
// In app/api/oauth/calendar/route.ts:
const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
if (!redirectUri) {
  return redirect('/time?calendar_error=GOOGLE_CALENDAR_REDIRECT_URI not set');
}
// No fallback to GOOGLE_REDIRECT_URI — that is the Gmail callback URI
```

---

### Plan 23-07 — MINOR NOTE

**Issue: Notification polling interval**

Plan 23-07 Task 2 specifies "Auto-refresh notifications every 60 seconds while component is mounted." This is correct and confirmed as the right approach for this single-user app. No SSE complexity needed. No change required.

**Issue: app_notifications migration number**

Plan 23-07 uses migration `0016_notifications.sql`. Plan 23-02 uses `0015_time_tracking_config.sql`. These are sequential — correct. No issue.

---

### Plans 23-01, 23-02, 23-03, 23-05, 23-06, 23-08 — NO ISSUES FOUND

- Plan 23-01: TDD RED tests — function signatures match implementation in 23-03. Wave 0 approach is correct.
- Plan 23-02: Admin settings schema — single-row config table pattern is correct. Drizzle schema syntax is valid.
- Plan 23-03: Approval workflow — state helpers implementation matches TDD contract. Audit log wiring is correct. TTADV-09 approver-submit-on-behalf approach via ?role=approver is appropriate for single-user context.
- Plan 23-05: Bulk operations — `inArray()` pattern with filter-before-update is correct. Transaction wrapping is specified. Partial failure returns `{ processed, skipped }` is the right API contract.
- Plan 23-06: Export — xlsx usage matches existing project pattern. TTADV-17 scope gap acknowledged correctly in the plan's objective note.
- Plan 23-08: Human verification checkpoint — verification steps are complete and match all 19 requirements.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `bigpanda-app/app/api/oauth/gmail/route.ts` + `callback/route.ts` — verified OAuth pattern in production code
- Existing codebase: `bigpanda-app/db/schema.ts` (lines 597-611) — `user_source_tokens` table with `expires_at` column
- [googleapis official docs — OAuth2 setCredentials + tokens event](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API scopes — calendar.events.readonly](https://developers.google.com/workspace/calendar/api/auth)
- [googleapis GitHub — refreshAccessToken deprecated](https://github.com/googleapis/google-api-nodejs-client)

### Secondary (MEDIUM confidence)
- [Google OAuth Testing vs Production — 7-day refresh token expiry](https://forums.homeseer.com/forum/internet-or-network-related-plug-ins/internet-or-network-discussion/ak-google-calendar-alexbk66/1545936-refresh-token-expires-in-7-days-if-oauth-consent-screen-publishing-status-is-testing)
- [Next.js App Router cookie + redirect pattern](https://github.com/vercel/next.js/discussions/48434) — confirmed working pattern for OAuth callbacks
- [Drizzle ORM PostgreSQL patterns 2025](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)

### Tertiary (LOW confidence)
- WebSearch findings on SSE vs polling for single-user in-app notifications — general ecosystem consensus, not official benchmark

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; googleapis pattern verified against live Gmail code
- Google Calendar OAuth flow: HIGH — verified against existing Gmail OAuth implementation; bugs in Plan 23-04 identified and documented
- Approval state machine: HIGH — TDD RED tests in Plan 23-01 fully specify function signatures; implementation in 23-03 is consistent
- Bulk operations: HIGH — Drizzle inArray pattern is standard; transaction wrapping confirmed
- In-app notification approach: MEDIUM — polling confirmed correct for single-user; SSE comparison based on WebSearch consensus
- TTADV-17 schema gap: HIGH — schema read directly from db/schema.ts; role/phase/task columns absent confirmed

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable libraries — googleapis OAuth2 pattern changes infrequently; Next.js App Router cookie behavior may change in minor versions)
