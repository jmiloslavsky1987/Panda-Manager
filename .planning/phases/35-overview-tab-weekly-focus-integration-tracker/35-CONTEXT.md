# Phase 35: Overview Tab — Weekly Focus & Integration Tracker - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two new sections to the Overview tab: (1) a Weekly Focus section showing AI-generated weekly priority bullets with a circular progress bar, refreshed per-project every Monday via a BullMQ scheduled job; (2) a redesigned Integration Tracker split into ADR, Biggy, and Unassigned sections with type categorization. The Integrations tab editor also gets track + integration_type fields. No new tabs, no new routes — all changes are within the existing Overview tab and Integrations tab.

</domain>

<decisions>
## Implementation Decisions

### Integration Tracker — workstream assignment
- Add `track` column (TEXT, nullable: 'ADR' | 'Biggy') to the `integrations` table via a new migration
- Consistent with the pattern from Phase 33 (onboarding_phases and onboarding_steps both have track)
- Existing integrations with track=null appear in an **Unassigned** section on the Overview tracker until a user assigns them
- No backfill heuristic — user assigns explicitly via the Integrations tab

### Integration Tracker — type field
- Add `integration_type` column (TEXT, nullable) to `integrations` table in the same migration
- Valid types are track-dependent:
  - **ADR:** Inbound | Outbound | Enrichment
  - **Biggy:** Real-time | Context | Knowledge | UDC
- On the Integrations tab add/edit form: selecting a track **filters the type dropdown** to only show valid types for that track — prevents mis-categorization

### Integration Tracker — Overview section layout
- Split into three sections: **ADR**, **Biggy**, **Unassigned** (Unassigned only shown if any exist)
- Each section groups integrations by their `integration_type`, then lists integrations within each type group
- Inline editing preserved: pipeline bar (status cycle) + notes textarea remain in the Overview view — same interaction model as today, reorganized into the new sections

### Weekly Focus — progress bar
- The circular `ProgressRing` shows **overall onboarding completion** — average of ADR + Biggy step completion %
- Reuses the same `overview-metrics` API endpoint already returning per-track step counts from Phase 34
- `ProgressRing` component already exists in `OverviewMetrics.tsx` — reuse directly

### Weekly Focus — AI generation
- **Scope (per-project):** Each active project gets its own 3–5 priority bullets, generated independently
- **Data sent to Claude (full delivery snapshot):**
  - Blocked onboarding steps (ADR + Biggy)
  - Open high/critical risks
  - Integrations not yet validated or production
  - Actions overdue or due within the current week
  - Next upcoming milestone and its ETA
- **Cadence:** BullMQ scheduled job runs every Monday 6am, loops over all active projects
- **Storage:** Redis key `weekly_focus:{projectId}` with 7-day TTL — fast reads, auto-evicts, no DB migration needed
- **Rendering:** React Suspense boundary — AI content does NOT block page render; fetched from a `/api/projects/[projectId]/weekly-focus` polling endpoint

### Weekly Focus — empty state
- When cache is empty (new project or TTL expired): show placeholder message + **"Generate Now" button** that triggers the job on demand for that project
- On-demand trigger calls the same job logic as the scheduled run, just for a single project

### Claude's Discretion
- Exact Redis key structure (e.g., whether to namespace by week number alongside projectId)
- Bullet formatting (plain strings vs structured JSON with priority metadata)
- Whether to use the existing `weekly-briefing.ts` stub job or create a new `weekly-focus.ts` job
- Visual layout of the Weekly Focus section (card, banner, or inline block)
- How the type group headers render within each ADR/Biggy section (collapsible or always expanded)

</decisions>

<specifics>
## Specific Ideas

- The `overview-metrics` endpoint from Phase 34 already returns ADR/Biggy step counts — reuse to avoid a second API call for the progress ring
- The existing Integration Tracker in `OnboardingDashboard.tsx` (lines ~643–740) is the section being reorganized — do not keep the old flat grid alongside the new grouped layout
- Pattern for new job: advisory lock + `job_runs` record (matching `weekly-briefing.ts`, `health-refresh.ts` pattern) — idempotent, skips if already running

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProgressRing` (OverviewMetrics.tsx:26) — reuse directly for overall onboarding completion in Weekly Focus
- `overview-metrics` endpoint (`GET /api/projects/[projectId]/overview-metrics`) — already returns ADR/Biggy step counts; add weekly_focus bullets to response or keep separate endpoint
- `worker/jobs/weekly-briefing.ts` — advisory lock + job_runs pattern to copy for weekly focus job
- `INTEG_STATUS_COLORS`, pipeline bar, notes textarea in `OnboardingDashboard.tsx` — reuse for the reorganized integration cards
- `scheduledJobs` table + scheduler infrastructure — already supports cron registration; register the new job at Monday 6am

### Established Patterns
- `track` column pattern: TEXT nullable ('ADR' | 'Biggy') — matches onboarding_phases and onboarding_steps (Phase 33)
- BullMQ advisory lock: `pg_try_advisory_xact_lock(LOCK_IDS.*)` before executing — prevents duplicate runs
- Redis caching: `ioredis` client already available in worker; existing jobs use it for context caching
- `requireSession()` at every API route handler — security boundary (CVE-2025-29927)
- Drizzle ORM with `db.select()` / `db.transaction()` for atomic writes

### Integration Points
- `db/schema.ts` — add `track` TEXT and `integration_type` TEXT columns to `integrations` table
- `app/customer/[id]/overview/page.tsx` — add `<WeeklyFocus projectId={projectId} />` component
- `components/OnboardingDashboard.tsx` — replace flat integration grid (~lines 643–740) with grouped ADR/Biggy/Unassigned layout
- `app/customer/[id]/integrations/` or integration add/edit modal — add track dropdown + filtered type dropdown
- `worker/jobs/` — new weekly-focus job (or extend weekly-briefing stub)
- `worker/index.ts` — register new job with Monday 6am cron

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-overview-tab-weekly-focus-integration-tracker*
*Context gathered: 2026-04-03*
