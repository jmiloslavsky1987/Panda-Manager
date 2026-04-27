# Phase 79: Core Calendar + Daily Prep - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Full calendar + daily prep experience end-to-end: CalendarImportModal wired into GlobalTimeView with cross-project event matching; /daily-prep page with event cards, project matching, multi-select, and Meeting Prep brief generation inline; Meeting Prep skill enhanced with calendar metadata; sidebar nav entry added. Recurring templates, PDF export, team availability, and auto-scheduling are Phase 80.

</domain>

<decisions>
## Implementation Decisions

### CalendarImportModal — Global Scope
- Open with no projectId — cross-project API endpoint replaces the per-project one
- Matching uses both event title keywords (against project/customer names) AND attendee emails (against stakeholders) — title as primary, attendees as tiebreaker
- Confidence badges displayed per event (High/Low/None) — same badge component already exists
- All active projects available in the assignment dropdown for unmatched or manually-reassigned events
- Week picker navigation: same as existing per-project modal — no changes to the week-start behavior

### Daily Prep — Event Cards
- Each card shows: time, title, duration, matched project, attendees, and recurrence indicator (visual flag if recurring series)
- Recurrence indicator is display-only in Phase 79 — no template saving (that's Phase 80)
- Unmatched events: inline project dropdown directly on the card; user assigns project before selecting for prep generation
- Selection: checkboxes on each card + "Select All" header; "Generate Prep" button activates when 1+ are selected
- Empty state for days with no events: "No meetings on [date]" — no next-day navigation shortcut

### Meeting Prep — Inline Output
- Generated brief expands below the card, pushing content down — same expand pattern as Outputs Library (expandedId toggle)
- For batch-selected events: all fire simultaneously (parallel generation), each card shows its own loading state
- After generation: brief stays expanded, checkbox deselects. Collapse button available on the card
- Brief persistence: LocalStorage keyed by today's date (ISO format). Survives navigation and page reloads within the same day. Date key changes at midnight so next day always starts fresh — no explicit cleanup needed

### Skill Infrastructure — Daily Prep
- Direct API call, no BullMQ: new `/api/daily-prep/generate` endpoint calls Claude directly
- Output streams via SSE (same pattern as existing skill runner) — progressive text rendering as brief generates
- No skill run record created, no redirect to /skills/[runId] — output lives inline on /daily-prep only

### Meeting Prep Skill — Calendar Metadata Enhancement
- Skill context builder receives: attendees, duration, recurrence flag, AND event description/body (if present)
- Event description passed as-is; skill prompt should treat it as optional context (may be empty)
- Structured output sections: Context, Desired Outcome, 2–3 bullet Agenda — consistent headers from both /daily-prep and Skills tab

### Claude's Discretion
- Exact LocalStorage key structure and serialization format for brief persistence
- SSE implementation on the new /api/daily-prep/generate endpoint (follow existing skill SSE pattern)
- How "recurrence flag" is detected from Google Calendar event data (series ID or recurrence field)
- Exact matching query JOIN shape for cross-project title + attendee heuristic
- Loading skeleton vs spinner for per-card generation state

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/CalendarImportModal.tsx`: Existing modal with ConfidenceBadge, week picker, EventRow state. Needs projectId made optional + new cross-project API endpoint. ConfidenceBadge component can be imported directly in /daily-prep cards.
- `components/GlobalTimeView.tsx`: Has a TODO comment noting CalendarImportModal not yet wired. Target integration point is clear.
- `app/api/time-entries/calendar-import/route.ts`: Existing per-project calendar import API. Cross-project version needs a new route at `/api/time-entries/calendar-import` (without project scope) or a new `/api/calendar/events` endpoint.
- `app/api/oauth/calendar/status/route.ts`: Status check already exists — /daily-prep can reuse this to gate the page if not connected.
- `skills/meeting-summary.md`: Structural template for the Meeting Prep skill's YAML front-matter and markdown output format.
- Outputs Library `expandedId` pattern (`app/outputs/page.tsx`): Reuse the same toggle pattern for per-card brief expand/collapse.

### Established Patterns
- SSE streaming: Already used by skill runner. New /api/daily-prep/generate should follow the same pattern.
- `prose prose-zinc prose-sm max-w-none` Tailwind prose classes: Use for rendering streamed markdown output inline.
- `input_required: false` with optional notes: Meeting Prep already has this from Phase 78 — don't change it.
- Confidence badge: `ConfidenceBadge` component in CalendarImportModal already handles High/Low/None styling — reuse on /daily-prep cards.

### Integration Points
- `components/Sidebar.tsx`: Add "Daily Prep" link directly below Dashboard (above project list). Use a calendar or sun icon from lucide-react.
- `components/GlobalTimeView.tsx`: Wire CalendarImportModal — remove the TODO comment, import the component, add the trigger button.
- `/daily-prep` route: New Next.js app route (`app/daily-prep/page.tsx`). No project scoping needed.
- `/api/daily-prep/generate`: New endpoint for SSE brief generation. Receives event metadata + projectId.
- Meeting Prep skill context builder (existing from Phase 78): Extend to accept and pass calendar metadata fields to the skill prompt.

</code_context>

<specifics>
## Specific Ideas

- Brief state must survive full page navigation (not just tab switches) and persist across browser reloads for the whole day — LocalStorage keyed by ISO date is the right call (clears naturally at midnight when the date key changes)
- Recurrence indicator on cards is display-only in this phase — shows the user it's a recurring meeting but doesn't trigger any special behavior yet (Phase 80 adds template saving)
- Event description passed to skill even if potentially empty — treat it as optional enrichment in the prompt

</specifics>

<deferred>
## Deferred Ideas

- Recurring meeting template saving — Phase 80
- PDF export of day's briefs — Phase 80
- Team/stakeholder availability view per event — Phase 80
- Auto-prep job (N hours before meetings) — Phase 80

</deferred>

---

*Phase: 79-core-calendar-daily-prep*
*Context gathered: 2026-04-27*
