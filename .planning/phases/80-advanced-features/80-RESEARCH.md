# Phase 80: Advanced Features - Research

**Researched:** 2026-04-28
**Domain:** Google Calendar freebusy API, browser print/PDF, BullMQ scheduled jobs, Drizzle ORM DB migrations, React state management for template UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Recurring Meeting Templates**
- What's stored: The generated brief content (output text), keyed by Google Calendar `recurringEventId` (series ID)
- Identification: Series ID is the primary and only key — no title-matching fallback
- Save trigger: A "Save as template" button appears on the generated brief section (same area as Copy/Collapse buttons) — explicit user action, not auto-save
- Future card state: Template indicator badge shown on the card (e.g., "Template saved"), but NOT auto-expanded. User clicks "Load template" to expand the saved brief, keeping cards compact by default
- Regenerate option: After loading template, user can still hit "Regenerate" to produce a fresh brief

**PDF Export**
- Approach: Browser `window.print()` — zero new dependencies, leverages existing markdown rendering. A print-specific CSS stylesheet hides navigation and non-brief UI
- Scope: Both options available — per-brief "Export" button on each generated card AND a page-level "Export All" button for all generated briefs for the selected day
- PDF content: Each brief section includes an event header (time range, title, duration, attendees) followed by the generated brief text. No confidence badges, project assignment dropdowns, or interactive UI elements in the print view

**Stakeholder Availability**
- Who is shown: Only project stakeholders matched as attendees in the event — cross-reference attendee email list against project stakeholders table. Not all project stakeholders
- Data source: Google Calendar freebusy API (`calendar.freebusy.query`) — already authenticated via existing OAuth tokens. Accepts email list + time range, returns per-email busy intervals
- Display: Name chip per matched stakeholder with a green dot (free during event time) or red dot (busy). Shown inline below or beside the attendee list on the card
- Fetch timing: On page load for all cards together — one batched freebusy request covering all events' time ranges and all matched stakeholder emails. Cards show a loading state then update

**Auto-Prep Job**
- Scope: Global — one BullMQ job covering all meetings for the day across all projects
- Trigger: Daily cron at a user-configured time (e.g., 7:00am). "N hours before" means the job is configured to run N hours before the user's typical first meeting — it's a fixed daily time, not per-meeting dynamic scheduling
- Location: Global `/scheduler` page, new skill type `meeting-prep-daily` in the existing `CreateJobWizard`. Appears alongside other global scheduled jobs
- Output persistence: Briefs are written to a server-side DB table (new `daily_prep_briefs` table) keyed by `(user_id, event_id, date)`. When `/daily-prep` loads, it checks this table first — if briefs exist for the day, cards open pre-populated and expanded
- Manual generation still works: If user manually generates on `/daily-prep`, those briefs also persist to the same DB table (replacing LocalStorage as persistence layer for briefs)

### Claude's Discretion
- Exact print CSS for the PDF print view (page breaks, margins, header styling)
- How the freebusy API response maps to free/busy status (handle overlapping busy intervals correctly)
- DB migration specifics for `daily_prep_briefs` and `meeting_prep_templates` tables
- How stale templates are handled (no explicit expiry — keep last saved brief indefinitely)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RECUR-01 | System detects recurring meetings (by event series ID); user can save a prep template for a meeting series and have it pre-populate future prep runs | `recurringEventId` already surfaced as `recurrence_flag` boolean in `CalendarEventItem`; raw string not yet exposed — must add `recurring_event_id: string \| null` field. New `meeting_prep_templates` DB table keyed by `(user_id, recurring_event_id)`. GET/POST/DELETE routes at `/api/daily-prep/templates`. UI: "Save as template" / "Load template" / template badge in `DailyPrepCard` |
| OUT-01 | User can export a prep brief (or set of briefs for the day) as a PDF | Zero-dep: `window.print()` with `@media print` CSS. No new npm packages. Print CSS hides nav, dropdowns, badges; per-card export button + page-level "Export All". Brief content uses existing `prose prose-zinc prose-sm` Tailwind classes |
| AVAIL-01 | Daily Prep page shows team availability context around each meeting — who from matched project stakeholders is free/busy at that time | **CRITICAL SCOPE ISSUE:** Current OAuth scope is `calendar.events.readonly` only. FreeBusy API requires `calendar.freebusy` (or broader). Existing tokens will NOT work. OAuth re-auth required OR add freebusy scope to existing connect flow. New `/api/calendar/freebusy` proxy route. Batched single request on page load |
| SCHED-01 | User can configure auto-generation of meeting prep N hours before each meeting; system creates a scheduled job that generates prep on the configured schedule | New `meeting-prep-daily` entry in `SKILL_LIST` (lib/scheduler-skills.ts) + `hasParams: true` for hour config. New worker job `worker/jobs/meeting-prep-daily.ts` following `weekly-focus.ts` pattern. New `daily_prep_briefs` table for output persistence. Replaces LocalStorage as source of truth |

</phase_requirements>

---

## Summary

Phase 80 layers four distinct power-user capabilities onto the Phase 79 foundation. All four features require careful attention to existing patterns: the BullMQ job infrastructure, the Google Calendar OAuth integration, and the DailyPrepCard/EventCardState shape.

The most significant constraint discovered during research is an **OAuth scope gap for AVAIL-01**: the current calendar OAuth flow requests only `calendar.events.readonly`, but the Google Calendar freebusy API requires `calendar.freebusy` or `calendar.readonly`. Existing connected users will need to re-authorize with the broader scope. This must be handled as part of the AVAIL-01 plan — either by updating the OAuth initiation route to request both scopes simultaneously, or by detecting scope insufficiency and prompting re-auth.

The auto-prep job (SCHED-01) introduces the `daily_prep_briefs` DB table, which also replaces LocalStorage as the brief persistence mechanism for manual generation. This creates a coupling between SCHED-01 and the existing `/daily-prep` page code: the page's `useEffect` that reads from `localStorage` must be updated to fetch from the DB instead. This is a behavior-preserving replacement, not a new feature.

**Primary recommendation:** Plan in this order — (1) DB migrations + schema (both new tables), (2) recurring templates (RECUR-01 — self-contained, no scope issue), (3) freebusy API + OAuth scope fix (AVAIL-01), (4) auto-prep job + DB persistence replacement (SCHED-01 + LocalStorage migration), (5) PDF export (OUT-01 — purely frontend, no dependencies).

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Relevance to Phase 80 |
|---------|---------|---------|----------------------|
| `googleapis` | ^171.4.0 | Google APIs client | freebusy.query call via existing `calendar_v3.Calendar` client |
| `drizzle-orm` | ^0.45.1 | ORM + migrations | New `daily_prep_briefs` and `meeting_prep_templates` tables |
| `bullmq` | ^5.71.0 | Job queue | Auto-prep worker job following existing `weekly-focus.ts` pattern |
| `@anthropic-ai/sdk` | ^0.80.0 | Claude calls | Auto-prep job uses direct (non-streaming) `client.messages.create` |
| `react-markdown` + `rehype-sanitize` | ^10.1.0 / ^6.0.0 | Markdown render | Brief content in print view uses existing prose classes |

### Supporting (no new packages needed)
| Library | Purpose | Usage |
|---------|---------|-------|
| `@tailwindcss/typography` | Prose styling | Already installed; `prose prose-zinc prose-sm max-w-none` for print brief content |
| `better-auth` / `requireSession` | Auth guard | All new routes follow `requireSession()` pattern |
| `zod` | Route validation | Template routes validate body with Zod schema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.print()` | `jsPDF` or `puppeteer` | window.print() has zero deps and leverages existing markdown rendering; jsPDF requires re-rendering content to canvas/PDF primitives; puppeteer requires server-side headless browser (heavy, Docker complexity) |
| freebusy batched on page load | Per-card lazy fetch | Batched single request is more efficient; lazy fetch avoids N+1 Google API calls but creates staggered card updates |

**Installation:** No new packages required for this phase.

## Architecture Patterns

### Recommended Project Structure (new files only)

```
app/
├── api/
│   ├── daily-prep/
│   │   ├── generate/route.ts        # EXISTING — extend to persist to DB
│   │   ├── templates/route.ts       # NEW — GET/POST/DELETE meeting_prep_templates
│   │   └── briefs/route.ts          # NEW — GET briefs for (user, date)
│   └── calendar/
│       └── freebusy/route.ts        # NEW — proxy to Google freebusy API
├── daily-prep/
│   └── page.tsx                     # EXISTING — extend with template UX, freebusy, DB persistence, print button
db/
└── migrations/
    └── 0045_daily_prep_tables.sql   # NEW — daily_prep_briefs + meeting_prep_templates
worker/
└── jobs/
    └── meeting-prep-daily.ts        # NEW — BullMQ job handler
lib/
└── scheduler-skills.ts              # EXISTING — add meeting-prep-daily to SKILL_LIST
components/
└── DailyPrepCard.tsx                # EXISTING — extend with template controls + freebusy chips
```

### Pattern 1: Google Calendar freebusy API Call

**What:** Batch POST to Google Calendar freebusy endpoint to check free/busy status for multiple email addresses over multiple time ranges in a single request.

**When to use:** On `/daily-prep` page load, after events are fetched. One request per day view, covering all event time windows and all matched stakeholder emails.

**Critical:** The current OAuth scope `calendar.events.readonly` does NOT cover freebusy. Must add `calendar.freebusy` scope to the OAuth initiation route.

```typescript
// Source: https://developers.google.com/calendar/api/v3/reference/freebusy/query
// Reuse existing getCalendarClient() from calendar-import/route.ts

const freebusyResponse = await calendar.freebusy.query({
  requestBody: {
    timeMin: dayStart.toISOString(),  // covering full day or earliest event start
    timeMax: dayEnd.toISOString(),    // latest event end
    timeZone: 'UTC',
    items: stakeholderEmails.map(email => ({ id: email })),
    // calendarExpansionMax: 50 (default)
  },
});

// Response shape:
// freebusyResponse.data.calendars: Record<email, { busy: Array<{start: string, end: string}> }>
// Check if event time window overlaps any busy interval for each email
```

**OAuth scope update required in `/api/oauth/calendar/route.ts`:**
```typescript
scope: [
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.freebusy',
],
```

**NOTE:** Existing tokens only have `calendar.events.readonly`. After adding the new scope, users who have already connected will need to re-authorize. The callback stores tokens by upsert — re-auth replaces tokens cleanly. The UI should handle the case where freebusy returns a 403 (token lacks scope) gracefully by showing stakeholders without availability indicators rather than breaking the page.

### Pattern 2: DB-Backed Brief Persistence (replaces LocalStorage)

**What:** `daily_prep_briefs` table stores generated brief content keyed by `(user_id, event_id, date)`. Page loads check this table first; LocalStorage is removed.

**Schema:**
```sql
-- 0045_daily_prep_tables.sql
CREATE TABLE daily_prep_briefs (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  date        TEXT NOT NULL,          -- YYYY-MM-DD
  brief_content TEXT NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id, date)     -- upsert key
);

CREATE TABLE meeting_prep_templates (
  id                  SERIAL PRIMARY KEY,
  user_id             TEXT NOT NULL,
  recurring_event_id  TEXT NOT NULL,  -- Google Calendar recurringEventId
  brief_content       TEXT NOT NULL,
  saved_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, recurring_event_id) -- one template per series per user
);
```

**Drizzle schema additions in `db/schema.ts`:**
```typescript
export const dailyPrepBriefs = pgTable('daily_prep_briefs', {
  id:           serial('id').primaryKey(),
  user_id:      text('user_id').notNull(),
  event_id:     text('event_id').notNull(),
  date:         text('date').notNull(),
  brief_content: text('brief_content').notNull(),
  generated_at: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('daily_prep_briefs_user_event_date').on(t.user_id, t.event_id, t.date),
}));

export const meetingPrepTemplates = pgTable('meeting_prep_templates', {
  id:                 serial('id').primaryKey(),
  user_id:            text('user_id').notNull(),
  recurring_event_id: text('recurring_event_id').notNull(),
  brief_content:      text('brief_content').notNull(),
  saved_at:           timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex('meeting_prep_templates_user_series').on(t.user_id, t.recurring_event_id),
}));
```

### Pattern 3: Auto-Prep BullMQ Worker Job

**What:** New `worker/jobs/meeting-prep-daily.ts` following the `weekly-focus.ts` pattern exactly. Uses direct (non-streaming) Claude API call. Fetches today's calendar events, generates briefs for each, persists to `daily_prep_briefs`.

**Worker registration:** Add to `JOB_HANDLERS` in `worker/index.ts` and import.

**SKILL_LIST entry (lib/scheduler-skills.ts):**
```typescript
{
  id: 'meeting-prep-daily',
  label: 'Meeting Prep (Daily)',
  description: 'Auto-generates prep briefs for all meetings of the day at a configured time.',
  hasParams: true,  // Params step: "Run time" (hour) description
},
```

**Params wizard UI (`components/wizard/JobParamsStep.tsx`):** Add a case for `meeting-prep-daily` showing a description of how it works (no project picker needed — global scope only).

**`/api/jobs/route.ts` validation:** `skill_name` is validated against `SKILL_LIST.map(s => s.id)` — adding to `SKILL_LIST` automatically allows it through validation.

### Pattern 4: CalendarEventItem Extension

**What:** Add `recurring_event_id: string | null` to the `CalendarEventItem` interface (currently only `recurrence_flag: boolean` is exposed).

**Change in `app/api/time-entries/calendar-import/route.ts`:**
```typescript
export interface CalendarEventItem {
  // ... existing fields ...
  recurrence_flag: boolean;          // !!e.recurringEventId (unchanged)
  recurring_event_id: string | null; // e.recurringEventId ?? null  (NEW)
}

// In the items mapping:
recurring_event_id: e.recurringEventId ?? null,
```

### Pattern 5: EventCardState Extension

**What:** Add template-related fields to `EventCardState` in `DailyPrepCard.tsx`.

```typescript
export interface EventCardState {
  // existing fields preserved
  event: CalendarEventItem;
  selectedProjectId: number | null;
  selected: boolean;
  briefStatus: 'idle' | 'loading' | 'done' | 'error';
  briefContent: string | null;
  expanded: boolean;
  // NEW for Phase 80
  hasTemplate: boolean;
  templateContent: string | null;
  availability: Record<string, 'free' | 'busy' | 'loading' | 'unknown'>;
  // availability: map from stakeholder email → status
}
```

### Pattern 6: Print CSS via @media print

**What:** No new stylesheet file needed — add `@media print` rules inline in `app/globals.css` or as a `<style>` block in the daily-prep page. Hides navigation, interactive controls; shows only brief content with event headers.

**Key print CSS patterns:**
```css
@media print {
  /* Hide all non-brief UI */
  nav,
  [data-testid="project-dropdown"],
  input[type="checkbox"],
  button:not([data-print-visible]),
  .no-print {
    display: none !important;
  }

  /* Each card breaks cleanly */
  [data-testid="daily-prep-card"] {
    break-inside: avoid;
    page-break-inside: avoid;
    border: 1px solid #e4e4e7 !important;
    margin-bottom: 1rem;
  }

  /* Ensure all brief sections are expanded (force visibility) */
  [data-testid="brief-section"] {
    display: block !important;
  }

  @page {
    margin: 1.5cm;
  }
}
```

**JavaScript for "Export" button:**
```typescript
function handleExportPDF(eventId?: string) {
  if (eventId) {
    // Mark only this card for printing, hide others
    // Simplest: add a CSS class, print, remove class
    document.body.classList.add(`print-single-${eventId}`);
  }
  window.print();
  if (eventId) {
    document.body.classList.remove(`print-single-${eventId}`);
  }
}
```

### Anti-Patterns to Avoid

- **Using EventSource for the generate endpoint:** EventSource only supports GET. The existing endpoint is POST. Client must use `fetch + ReadableStream`. Already implemented correctly in Phase 79 — do not regress.
- **Calling freebusy once per event:** Use a single batched request covering all events' time ranges for all stakeholder emails. Google allows up to 50 calendars per request.
- **Module-scope DB/Redis imports in API routes:** All DB/Redis access must be inside handler functions (not module scope) to avoid build-time failures in Docker. See existing pattern in `generate/route.ts`.
- **Dynamic require in worker jobs:** Always use static imports + dispatch map in `worker/index.ts` — dynamic require fails with tsx. See existing `JOB_HANDLERS` pattern.
- **Storing templates by event title:** Series ID (`recurringEventId`) is the only key. Title-based matching is explicitly out of scope per CONTEXT.md.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom PDF renderer, canvas drawing | `window.print()` with `@media print` CSS | Zero dependencies; browsers handle page layout, fonts, and pagination; existing markdown rendering is preserved |
| Freebusy interval overlap detection | Custom interval math | Simple ISO datetime comparison: check if event `[start, end]` overlaps any `[busy.start, busy.end]` | The API returns RFC3339 datetimes; `new Date(a) < new Date(b)` is sufficient |
| OAuth token refresh | Manual refresh call | `oauth2Client.setCredentials()` + `'tokens'` event listener | googleapis auto-refreshes; manual refresh is deprecated; pattern already in `calendar-import/route.ts` |
| BullMQ scheduler registration | Custom cron runner | `jobQueue.upsertJobScheduler()` + `registerDbSchedulers()` poll | Already implemented in `worker/scheduler.ts`; adding a new skill just requires registering in `SKILL_LIST` and `JOB_HANDLERS` |

**Key insight:** The entire scheduler infrastructure already exists. Adding the auto-prep job requires: 1 new entry in `SKILL_LIST`, 1 new worker file, 1 import + `JOB_HANDLERS` entry, and 1 params UI case. The scheduler, BullMQ wiring, and DB job storage are already complete.

## Common Pitfalls

### Pitfall 1: OAuth Scope Insufficient for freebusy
**What goes wrong:** The freebusy API call returns a 403 "insufficientPermissions" error for users who connected their calendar before Phase 80. The `calendar.events.readonly` scope does not cover freebusy.
**Why it happens:** Each new Google API surface requires an explicit scope. `calendar.events.readonly` is a narrow read-only scope for event data only.
**How to avoid:** Update `/api/oauth/calendar/route.ts` to request both `calendar.events.readonly` AND `calendar.freebusy` scopes. Handle the case where an existing token lacks the freebusy scope — catch the 403 at the `/api/calendar/freebusy` route and return `{ error: 'scope_insufficient' }` so the page can degrade gracefully (show stakeholders without availability rather than crash).
**Warning signs:** Error log shows `insufficientPermissions` from Google API; freebusy API returns 401/403.

### Pitfall 2: recurringEventId Not Exposed in CalendarEventItem
**What goes wrong:** Template save/load silently does nothing because `recurring_event_id` is null for all events — only the boolean `recurrence_flag` is currently surfaced in `CalendarEventItem`.
**Why it happens:** Phase 79 only needed to show the Recurring badge, not key templates by series. The raw ID was not included.
**How to avoid:** Add `recurring_event_id: string | null` to `CalendarEventItem` interface and to the event mapping in `calendar-import/route.ts`. The raw value is `e.recurringEventId`.
**Warning signs:** Template badge never appears even for known recurring meetings.

### Pitfall 3: LocalStorage → DB Migration Creates State Inconsistency
**What goes wrong:** After SCHED-01 lands, the page reads from DB but old briefs are still in LocalStorage. Users who generated briefs before the migration see their briefs disappear.
**Why it happens:** Replacing the persistence layer without a transition path leaves stale client-side data.
**How to avoid:** The simplest approach (consistent with project scope) is to simply stop writing to LocalStorage and read from DB. Since briefs have no cross-session persistence expectation (they are ephemeral prep notes), losing pre-migration briefs is acceptable. Document this in the plan.
**Warning signs:** Old briefs reappear after page refresh (would indicate DB read isn't working and localStorage fallback crept back in).

### Pitfall 4: Print CSS Doesn't Expand Collapsed Briefs
**What goes wrong:** "Export All" prints only the currently expanded cards; collapsed cards show nothing in the PDF.
**Why it happens:** The `briefStatus === 'done' && card.expanded` conditional in `DailyPrepCard.tsx` hides content when `expanded` is false. `@media print` CSS cannot override JavaScript-controlled conditional rendering.
**How to avoid:** The Export All function must first programmatically set `expanded: true` for all cards with `briefStatus === 'done'` before calling `window.print()`, then restore original state in the `afterprint` event listener. Alternatively, use a separate CSS class `printing-all` on `<body>` and override the conditional display in CSS: `.printing-all [data-testid="brief-section"] { display: block !important }`.
**Warning signs:** PDF export shows empty cards for recurring brief content.

### Pitfall 5: Freebusy Request Covers Wrong Time Range
**What goes wrong:** A stakeholder appears as "free" during a meeting even though they have a busy block — because the freebusy query uses a time range that doesn't cover the event's exact window.
**Why it happens:** Time zone mismatch between event `start_time`/`end_time` strings (which are HH:MM local strings in the existing `CalendarEventItem`) and the UTC ISO datetimes the freebusy API expects.
**How to avoid:** Store the full RFC3339 datetime strings from calendar events (`e.start.dateTime`, `e.end.dateTime`) directly — not just the parsed HH:MM strings — in `CalendarEventItem`. This requires adding `start_datetime: string` and `end_datetime: string` fields OR using the existing event_id to re-query. Alternatively, reconstruct ISO datetimes from date + time fields with the user's timezone. The cleanest fix is to add the full ISO datetimes to `CalendarEventItem`.
**Warning signs:** Free/busy indicators seem wrong compared to the user's actual Google Calendar.

### Pitfall 6: BullMQ Job Handler Not Registered
**What goes wrong:** The `meeting-prep-daily` skill appears in the scheduler UI and can be created as a job, but when the cron fires, the worker logs `[worker] no handler for job: meeting-prep-daily` and returns `{ status: 'unknown-job' }`.
**Why it happens:** The `JOB_HANDLERS` dispatch map in `worker/index.ts` requires an explicit entry for each job name. Missing entry = silent no-op.
**How to avoid:** The job name in `JOB_HANDLERS` must exactly match the `skill_name` stored in `scheduledJobs.skill_name` which is set from `SKILL_LIST[n].id`. Verify the string `'meeting-prep-daily'` is consistent across `SKILL_LIST`, `JOB_HANDLERS`, and the worker filename.
**Warning signs:** Job shows as "running" in scheduler but completes with no output; no `daily_prep_briefs` rows written.

## Code Examples

### Example 1: freebusy Overlap Check
```typescript
// Source: Google Calendar freebusy API response mapping
// Determine if a stakeholder is busy during an event window
function isBusyDuringEvent(
  busyIntervals: Array<{ start: string; end: string }>,
  eventStartISO: string,
  eventEndISO: string,
): boolean {
  const eventStart = new Date(eventStartISO).getTime();
  const eventEnd = new Date(eventEndISO).getTime();
  return busyIntervals.some(({ start, end }) => {
    const busyStart = new Date(start).getTime();
    const busyEnd = new Date(end).getTime();
    // Overlap: not (busyEnd <= eventStart || busyStart >= eventEnd)
    return busyEnd > eventStart && busyStart < eventEnd;
  });
}
```

### Example 2: Template Save Route Pattern
```typescript
// /api/daily-prep/templates/route.ts — follows requireSession() pattern
export async function POST(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { recurring_event_id, brief_content } = await request.json();

  await db
    .insert(meetingPrepTemplates)
    .values({
      user_id: session.user.id,
      recurring_event_id,
      brief_content,
      saved_at: new Date(),
    })
    .onConflictDoUpdate({
      target: [meetingPrepTemplates.user_id, meetingPrepTemplates.recurring_event_id],
      set: { brief_content, saved_at: new Date() },
    });

  return NextResponse.json({ ok: true });
}
```

### Example 3: Auto-Prep Worker Job Structure
```typescript
// worker/jobs/meeting-prep-daily.ts — follows weekly-focus.ts pattern
export default async function meetingPrepDailyJob(job: Job): Promise<{ status: string }> {
  // 1. Advisory lock (LOCK_IDS.MEETING_PREP_DAILY)
  // 2. Record job start in jobRuns
  // 3. Fetch today's calendar events via getCalendarClient()
  // 4. For each event with a project match: buildMeetingPrepContext() + client.messages.create() (NON-streaming)
  // 5. Upsert each result into daily_prep_briefs (user_id, event_id, date)
  // 6. Mark job complete
}
```

### Example 4: DB Brief Persistence in Generate Route
```typescript
// Extend app/api/daily-prep/generate/route.ts — after streaming completes
// Add after: await msgStream.finalMessage();
const finalText = msgStream.finalText ?? accumulated;
if (finalText) {
  await db
    .insert(dailyPrepBriefs)
    .values({
      user_id: session.user.id,
      event_id: eventId,
      date: new Date().toISOString().slice(0, 10),
      brief_content: finalText,
    })
    .onConflictDoUpdate({
      target: [dailyPrepBriefs.user_id, dailyPrepBriefs.event_id, dailyPrepBriefs.date],
      set: { brief_content: finalText, generated_at: new Date() },
    });
}
```

### Example 5: Page Load — Check DB Before LocalStorage
```typescript
// In app/daily-prep/page.tsx — replace localStorage reads with DB fetch
// New endpoint: GET /api/daily-prep/briefs?date=YYYY-MM-DD
// Returns: { [eventId: string]: { content: string; generatedAt: string } }

const [eventsRes, briefsRes] = await Promise.all([
  fetch(`/api/time-entries/calendar-import?date=${selectedDate}`),
  fetch(`/api/daily-prep/briefs?date=${selectedDate}`),
]);
const events: CalendarEventItem[] = await eventsRes.json();
const storedBriefs: StoredBriefs = await briefsRes.json();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LocalStorage brief persistence | DB-backed `daily_prep_briefs` table | Phase 80 (SCHED-01) | Briefs survive across browsers/devices; auto-prep job can pre-populate; single source of truth |
| `calendar.events.readonly` only | + `calendar.freebusy` scope | Phase 80 (AVAIL-01) | Enables freebusy API; requires user re-auth |
| No recurring series awareness | `recurring_event_id` exposed in `CalendarEventItem` | Phase 80 (RECUR-01) | Enables template keying by series |

**Deprecated in this phase:**
- LocalStorage usage in `/daily-prep/page.tsx` — replaced by DB reads from `/api/daily-prep/briefs`

## Open Questions

1. **User re-auth for freebusy scope**
   - What we know: Existing tokens lack `calendar.freebusy` scope; Google does not auto-upgrade token scopes
   - What's unclear: Should we prompt re-auth automatically or show a "Connect Calendar with extended permissions" banner?
   - Recommendation: Add `calendar.freebusy` to the OAuth initiate route so any new connect gets both scopes. For existing users: catch the freebusy 403 silently, show stakeholders without availability indicators, and show a soft banner "Reconnect calendar to enable availability view." Avoid forced re-auth.

2. **`user_id` in `daily_prep_briefs` — multi-user vs. single-user**
   - What we know: The app currently uses `user_id = 'default'` in `userSourceTokens` (single-user pattern). The auto-prep job is global with no per-user scope in job.data.
   - What's unclear: Should `daily_prep_briefs.user_id` use `session.user.id` (multi-user aware) or `'default'`?
   - Recommendation: Use `session.user.id` from `requireSession()` for manual generation routes. The auto-prep job should use a hardcoded `'default'` user ID (matching the calendar token user) since it runs without a session. This is consistent with the existing single-user calendar auth model.

3. **Full ISO datetimes in CalendarEventItem for freebusy precision**
   - What we know: `CalendarEventItem` currently stores `start_time: string` (HH:MM) and `date: string` (YYYY-MM-DD), not full ISO datetimes. freebusy API needs RFC3339 for precision.
   - What's unclear: Can we reconstruct accurate ISO datetimes from date + HH:MM without timezone info? (The original raw `e.start.dateTime` includes timezone offset.)
   - Recommendation: Add `start_datetime: string` and `end_datetime: string` (the raw `e.start.dateTime` and `e.end.dateTime` from Google) to `CalendarEventItem`. This is a small, non-breaking addition to the interface and avoids timezone reconstruction errors.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run lib/__tests__/daily-prep-generate.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RECUR-01 | `CalendarEventItem` exposes `recurring_event_id: string \| null` | unit (source check) | `npx vitest run lib/__tests__/recur-template.test.ts -x` | ❌ Wave 0 |
| RECUR-01 | `/api/daily-prep/templates` GET/POST/DELETE route exists and uses `requireSession` | unit (source check) | `npx vitest run tests/api/daily-prep-templates.test.ts -x` | ❌ Wave 0 |
| RECUR-01 | `DailyPrepCard` renders template badge and "Load template" / "Save as template" buttons | unit (source check) | `npx vitest run lib/__tests__/recur-template.test.ts -x` | ❌ Wave 0 |
| OUT-01 | `window.print()` is called by export handler; print buttons present in page source | unit (source check) | `npx vitest run lib/__tests__/pdf-export.test.ts -x` | ❌ Wave 0 |
| OUT-01 | `@media print` CSS rules exist hiding nav/interactive elements | unit (source check) | `npx vitest run lib/__tests__/pdf-export.test.ts -x` | ❌ Wave 0 |
| AVAIL-01 | `/api/calendar/freebusy` route exists, uses `requireSession`, proxies to Google freebusy API | unit (source check) | `npx vitest run tests/api/calendar-freebusy.test.ts -x` | ❌ Wave 0 |
| AVAIL-01 | OAuth initiate route requests `calendar.freebusy` scope in addition to `calendar.events.readonly` | unit (source check) | `npx vitest run tests/api/calendar-freebusy.test.ts -x` | ❌ Wave 0 |
| AVAIL-01 | `DailyPrepCard` renders availability chips when `availability` map is populated | unit (source check) | `npx vitest run lib/__tests__/availability.test.ts -x` | ❌ Wave 0 |
| SCHED-01 | `meeting-prep-daily` appears in `SKILL_LIST` with `hasParams: true` | unit (source check) | `npx vitest run lib/__tests__/meeting-prep-daily.test.ts -x` | ❌ Wave 0 |
| SCHED-01 | `worker/jobs/meeting-prep-daily.ts` exists and is imported in `worker/index.ts` | unit (source check) | `npx vitest run lib/__tests__/meeting-prep-daily.test.ts -x` | ❌ Wave 0 |
| SCHED-01 | `daily_prep_briefs` table referenced in Drizzle schema and migration file exists | unit (source check) | `npx vitest run lib/__tests__/meeting-prep-daily.test.ts -x` | ❌ Wave 0 |
| SCHED-01 | `/daily-prep/page.tsx` no longer reads from `localStorage` for briefs | unit (source check) | `npx vitest run lib/__tests__/meeting-prep-daily.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/__tests__/ tests/api/calendar-freebusy.test.ts -x` (quick — source-check tests are near-instant)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/__tests__/recur-template.test.ts` — source-check tests for RECUR-01 (CalendarEventItem field, templates route, DailyPrepCard template UI)
- [ ] `lib/__tests__/pdf-export.test.ts` — source-check tests for OUT-01 (print handler, print CSS, export buttons)
- [ ] `tests/api/calendar-freebusy.test.ts` — source-check tests for AVAIL-01 (freebusy route, OAuth scope, availability chips)
- [ ] `lib/__tests__/meeting-prep-daily.test.ts` — source-check tests for SCHED-01 (SKILL_LIST entry, worker file, DB schema, LocalStorage removal)

All test files follow the established source-check pattern from `lib/__tests__/daily-prep-generate.test.ts`: use `readFileSync` + `existsSync` to verify source artifacts without running the actual code.

## Sources

### Primary (HIGH confidence)
- Codebase read — `app/api/time-entries/calendar-import/route.ts` — current `CalendarEventItem` shape and `recurringEventId` handling
- Codebase read — `app/api/oauth/calendar/route.ts` — current OAuth scope (`calendar.events.readonly` only)
- Codebase read — `worker/jobs/weekly-focus.ts` — canonical BullMQ job handler pattern
- Codebase read — `worker/index.ts` + `worker/scheduler.ts` — dispatch map and DB-driven scheduler registration
- Codebase read — `lib/scheduler-skills.ts` — SKILL_LIST structure and `getWizardSteps()` function
- Codebase read — `components/CreateJobWizard.tsx` + `components/wizard/JobParamsStep.tsx` — wizard skill/params pattern
- Codebase read — `app/daily-prep/page.tsx` — current LocalStorage persistence and SSE consumption pattern
- Codebase read — `components/DailyPrepCard.tsx` — current `EventCardState` shape
- Codebase read — `app/api/jobs/route.ts` — Zod validation against `SKILL_LIST` (skill_name allowlist)
- Google Calendar API docs — https://developers.google.com/calendar/api/v3/reference/freebusy/query — freebusy request/response shape and required scopes
- MDN CSS Print media queries — `@media print` patterns, `break-inside`, `@page` margins

### Secondary (MEDIUM confidence)
- `db/schema.ts` scan — existing table patterns (serial PK, text user_id, timestamptz, uniqueIndex) for new table design
- `lib/__tests__/daily-prep-generate.test.ts` — established source-check test pattern for Wave 0 test design

### Tertiary (LOW confidence)
- None — all critical claims verified from codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in package.json; verified in codebase
- Architecture: HIGH — patterns verified from existing code; no speculation
- Pitfalls: HIGH — OAuth scope gap confirmed by reading actual OAuth route source; other pitfalls derived from confirmed code patterns
- freebusy API behavior: HIGH — verified from official Google Calendar API docs

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (stable APIs; freebusy API is mature; no fast-moving dependencies)
