# Phase 66: Overview Tracks Redesign - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the Overview tab to display a hybrid static/dynamic onboarding track system. Static tracks (Discovery & Kickoff, Platform Config, UAT/Validation) are defined from hardcoded config; dynamic tracks (Integrations, Teams, IT Knowledge Graph) are populated from live data. Weekly Focus switches from manual-first to auto-scheduled (every Monday at 6am) with "Generate Now" as a de-emphasized manual override. Integration Tracker gains per-row delete capability.

Out of scope: new track types, changes to the Integrations tab beyond shared delete behavior, changes to the Skills/Scheduler tab, changes to the Weekly Focus skill itself.

</domain>

<decisions>
## Implementation Decisions

### Static track structure (OVRVW-01)
- Static tracks (Discovery & Kickoff, Platform Config, UAT/Validation for both ADR and Biggy) are hardcoded in a config constant — track names and step names never come from the DB
- Step completion **status** is still read from the DB (same `onboarding_steps` records, matched by track + step name)
- No visual distinction between static and dynamic tracks — all track cards look the same

### Dynamic track content (OVRVW-02)
- Dynamic tracks (Integrations and Teams for ADR; IT Knowledge Graph and Teams for Biggy) show a **summary stats card**: key counts only (e.g., "3 validated, 2 configured, 1 blocked")
- The existing Integration Tracker full-table section **stays on the Overview page** below the track cards — the dynamic track card is a quick-glance summary, the tracker is for editing

### Weekly Focus auto-schedule (OVRVW-03)
- A BullMQ repeatable weekly-focus job is **auto-created when a project is created** — no manual setup required
- Job fires every Monday at 6am for that project's `projectId`
- Pattern matches the existing `weekly-focus` job data shape: `{ triggeredBy: 'scheduled', projectId }`

### Weekly Focus "Generate Now" UX (OVRVW-04)
- "Generate Now" button is **always visible** in the Weekly Focus section — not only in the empty state
- Style: small, secondary/outline button (not blue primary) — signals it's not the default action
- Empty state (before first Monday run): quiet placeholder message — "Weekly focus generates automatically every Monday at 6am." — with the small Generate Now button nearby, no large call-to-action

### Integration delete (OVRVW-05)
- Inline trash icon on each integration row in the Integration Tracker
- **No confirmation dialog** — delete is immediate on click (consistent with other inline deletes in the app)
- Deletes the integration record from the DB — removes it from both the Overview Integration Tracker and the Integrations tab (same record)
- Requires a new `DELETE /api/projects/[projectId]/integrations/[integId]` endpoint

### Claude's Discretion
- Exact layout order of static vs. dynamic track cards within each ADR/Biggy column
- Summary stat format for dynamic track cards (counts only vs. progress bar vs. badges)
- Whether the weekly repeatable job registration happens in the project creation API route or via a post-creation hook
- Exact 6am timezone (UTC assumed)

</decisions>

<specifics>
## Specific Ideas

- No specific product references given — standard implementation patterns preferred

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/OnboardingDashboard.tsx` (992 lines) — existing dual-track ADR/Biggy layout with `data-testid="adr-track"` and `data-testid="biggy-track"`. Static track refactor happens here — replace DB phase fetch with hardcoded config + DB status lookup
- `components/WeeklyFocus.tsx` — existing component with `handleGenerateNow()` and Redis-backed bullets. Needs: button de-emphasis, always-visible placement, empty-state copy update
- `/api/projects/[projectId]/integrations/route.ts` — GET/POST exist; DELETE endpoint needs to be added as `/api/projects/[projectId]/integrations/[integId]/route.ts`
- `app/api/projects/[projectId]/weekly-focus/route.ts` — POST queues manual job; scheduled auto-job registration is separate (project creation path)

### Established Patterns
- Track columns: ADR = `border-l-4 border-blue-200`, Biggy = `border-l-4 border-green-200` / `border-orange-200`
- `requireProjectRole(numericId, 'user')` guard on all project-scoped routes
- BullMQ job data shape: `{ triggeredBy: 'manual' | 'scheduled', projectId: number }`
- Inline deletes: no confirmation modal — consistent with other tab-level operations in the app
- Static config pattern: `ADR_TYPES` and `BIGGY_TYPES` arrays already used in `integrations/route.ts` and `OnboardingDashboard.tsx`

### Integration Points
- `OnboardingDashboard.tsx` → replace dynamic phase fetch with hardcoded track config; keep step status fetch from `onboarding_steps` table matched by name
- Project creation route (find in `app/api/projects/route.ts`) → register weekly-focus repeatable BullMQ job on project creation
- `app/api/projects/[projectId]/integrations/[integId]/route.ts` → new DELETE route with `requireProjectRole` guard
- `db/schema.ts` → no schema changes needed (integration delete uses existing `integrations` table)

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 66-overview-tracks-redesign*
*Context gathered: 2026-04-15*
