# Phase 80: Advanced Features - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Layer power-user capabilities onto the Phase 79 Daily Prep foundation: recurring meeting prep templates (save and reuse briefs per series), PDF export of day briefs via browser print, stakeholder availability indicators on event cards via Google Calendar freebusy API, and a global auto-prep BullMQ job that generates briefs on a daily schedule and persists them server-side. No new calendar integration work — Phase 79 laid the full foundation.

</domain>

<decisions>
## Implementation Decisions

### Recurring Meeting Templates
- **What's stored:** The generated brief content (output text), keyed by Google Calendar `recurringEventId` (series ID)
- **Identification:** Series ID is the primary and only key — no title-matching fallback
- **Save trigger:** A "Save as template" button appears on the generated brief section (same area as Copy/Collapse buttons) — explicit user action, not auto-save
- **Future card state:** Template indicator badge shown on the card (e.g., "Template saved"), but NOT auto-expanded. User clicks "Load template" to expand the saved brief, keeping cards compact by default
- **Regenerate option:** After loading template, user can still hit "Regenerate" to produce a fresh brief

### PDF Export
- **Approach:** Browser `window.print()` — zero new dependencies, leverages existing markdown rendering. A print-specific CSS stylesheet hides navigation and non-brief UI
- **Scope:** Both options available — per-brief "Export" button on each generated card AND a page-level "Export All" button for all generated briefs for the selected day
- **PDF content:** Each brief section includes an event header (time range, title, duration, attendees) followed by the generated brief text. No confidence badges, project assignment dropdowns, or interactive UI elements in the print view

### Stakeholder Availability
- **Who is shown:** Only project stakeholders matched as attendees in the event — cross-reference attendee email list against project stakeholders table. Not all project stakeholders
- **Data source:** Google Calendar freebusy API (`calendar.freebusy.query`) — already authenticated via existing OAuth tokens. Accepts email list + time range, returns per-email busy intervals
- **Display:** Name chip per matched stakeholder with a green dot (free during event time) or red dot (busy). Shown inline below or beside the attendee list on the card
- **Fetch timing:** On page load for all cards together — one batched freebusy request covering all events' time ranges and all matched stakeholder emails. Cards show a loading state then update

### Auto-Prep Job
- **Scope:** Global — one BullMQ job covering all meetings for the day across all projects
- **Trigger:** Daily cron at a user-configured time (e.g., 7:00am). "N hours before" means the job is configured to run N hours before the user's typical first meeting — it's a fixed daily time, not per-meeting dynamic scheduling
- **Location:** Global `/scheduler` page, new skill type `meeting-prep-daily` in the existing `CreateJobWizard`. Appears alongside other global scheduled jobs
- **Output persistence:** Briefs are written to a server-side DB table (new `daily_prep_briefs` table) keyed by `(user_id, event_id, date)`. When `/daily-prep` loads, it checks this table first — if briefs exist for the day, cards open pre-populated and expanded
- **Manual generation still works:** If user manually generates on `/daily-prep`, those briefs also persist to the same DB table (replacing LocalStorage as persistence layer for briefs)

### Claude's Discretion
- Exact print CSS for the PDF print view (page breaks, margins, header styling)
- How the freebusy API response maps to free/busy status (handle overlapping busy intervals correctly)
- DB migration specifics for `daily_prep_briefs` and `meeting_prep_templates` tables
- How stale templates are handled (no explicit expiry — keep last saved brief indefinitely)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/DailyPrepCard.tsx`: EventCardState already has `briefContent`, `briefStatus`, `expanded` — template loading maps directly to this state shape. Add `hasTemplate: boolean` and `templateContent: string | null` to EventCardState
- `app/api/time-entries/calendar-import/route.ts`: `CalendarEventItem.recurrence_flag` = `!!e.recurringEventId` — the raw `recurringEventId` string needs to be added to CalendarEventItem for template keying (currently only boolean flag is exposed)
- `app/api/daily-prep/generate/route.ts`: POST endpoint already streams SSE brief generation. Extend to also persist output to `daily_prep_briefs` table on completion
- `components/SchedulerJobTable.tsx` + `CreateJobWizard`: Full wizard infrastructure ready. Add `meeting-prep-daily` as a new skill type option
- `components/SchedulerJobRow.tsx`: Existing enabled/disabled toggle and expand pattern — auto-prep job reuses this

### Established Patterns
- `expandedId` toggle pattern (Outputs Library, DailyPrepCard): Same show/hide pattern for template load UX
- `prose prose-zinc prose-sm max-w-none` Tailwind classes: Use for brief content in print view
- BullMQ background job pattern (extraction, weekly-focus): Auto-prep job follows same worker + queue architecture
- SSE streaming: Keep for manual generation; auto-prep job uses direct Claude call (no streaming needed for background job)
- `requireSession()` at all route handlers: New `/api/daily-prep/templates` and `/api/daily-prep/auto-prep` routes must follow this pattern

### Integration Points
- `CalendarEventItem` type: Add `recurring_event_id: string | null` field (the raw ID, not just the boolean flag)
- `/api/daily-prep/generate`: Extend to write to `daily_prep_briefs` table after streaming completes
- New route `/api/daily-prep/templates`: GET (load template for series ID), POST (save template), DELETE (remove template)
- New route `/api/calendar/freebusy`: POST with email list + time range, proxies to Google Calendar freebusy API using existing OAuth token
- `/daily-prep` page: Replace LocalStorage brief persistence with DB-backed reads from `daily_prep_briefs`; load freebusy data on mount alongside events

</code_context>

<specifics>
## Specific Ideas

- The shift from LocalStorage to DB persistence for briefs is a side effect of auto-prep — both manual and auto-generated briefs should write to the same `daily_prep_briefs` table so the page always has one source of truth
- The `recurringEventId` raw value must be exposed in CalendarEventItem (not just the boolean flag) — this is the stable key for template matching
- Print view should be a separate print-optimized render mode, not a new route — CSS `@media print` with `display: none` on non-brief UI elements is sufficient

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 80-advanced-features*
*Context gathered: 2026-04-28*
