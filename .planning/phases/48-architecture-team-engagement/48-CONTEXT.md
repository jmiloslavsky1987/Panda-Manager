# Phase 48: Architecture & Team Engagement - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the UI for two features seeded by Phase 45's new schema:

1. **Architecture tab** — Wire `arch_nodes`/`arch_tracks` into the existing Current & Future State diagram (replacing the old stage-column definitions), add click-to-cycle status editing on stage columns, and column drag-reorder with `display_order` persistence. Team Onboarding Status table stays as-is (existing `team_onboarding_status` table and `TeamOnboardingTable` component).

2. **Team Engagement Overview** — A new "Overview" sub-tab within the Teams tab. Read-only snapshot aggregating data from existing structured tables into a visual reference document styled after the HTML reference (`AMEX_Team_Engagement_2026-03-17.html`). Architecture section (old Section 2) is excluded — that's covered by the Architecture tab.

Out of scope: editing Team Engagement content (read-only snapshot), `arch_team_status` table (not used — keep `team_onboarding_status`), `team_engagement_sections` blobs (not used — structured tables drive the UI).

</domain>

<decisions>
## Implementation Decisions

### Architecture diagram — data model
- `arch_nodes` defines the 5 stage COLUMNS per track (replaces hardcoded `ADR_PHASES`/`BIGGY_PHASES` arrays in `InteractiveArchGraph.tsx`)
- `architecture_integrations` tool cards still render inside each column — no change to that layer
- Track names read from `arch_tracks` DB records (not hardcoded)
- Track switcher pills ("ADR Track" | "Biggy AI Track") read from seeded `arch_tracks` rows
- `getArchNodes(projectId)` is the query — already implemented in `lib/queries.ts`

### Stage status — display and editing
- Each stage column header shows the `arch_node.status` as a colored badge: `planned` (zinc), `in_progress` (blue), `live` (green)
- Clicking the status badge cycles: `planned → in_progress → live → planned`
- PATCH `/api/projects/[projectId]/arch-nodes/[nodeId]` fires on click — follow existing optimistic UI pattern (app-wide standard)
- Stage notes (`arch_node.notes`) appear as a tooltip on hover — read-only, extraction-populated

### Column drag and reorder
- @dnd-kit/sortable for left-to-right column reordering (already installed from Phase 3/47)
- Drag end fires PATCH to update `display_order` on affected `arch_nodes` rows
- API: PATCH `/api/projects/[projectId]/arch-nodes/reorder` — bulk update display_order array
- No position_x/y columns needed — `display_order` (already on schema) is sufficient

### Team Onboarding Status table
- Stays on existing `team_onboarding_status` table (fixed 5-column schema)
- `TeamOnboardingTable` component unchanged — matches screenshots exactly
- `arch_team_status` table (Phase 45) is NOT used in Phase 48

### Team Engagement Overview — structure
- New "Overview" sub-tab added within the Teams tab (alongside existing "Detail" sub-tab)
- 4 sections rendered (Architecture section from reference HTML is excluded):
  1. **Business Value & Expected Outcomes** — reads `businessOutcomes` table
  2. **End-to-End Workflows** — reads `e2eWorkflows` + `e2eWorkflowSteps` tables
  3. **Teams & Engagement Status** — reads `team_onboarding_status` + `architecture_integrations` (per-team progress)
  4. **Top Focus Areas** — reads `focusAreas` table
- **Read-only snapshot** — no add/edit/delete controls anywhere in the Overview sub-tab
- Users edit data in their respective source tabs (Actions, existing Teams Detail, etc.)

### Team Engagement Overview — visual design
- Reference: `AMEX_Team_Engagement_2026-03-17.html` (archived at `/Users/jmiloslavsky/Documents/BigPanda Projects/Archive/`)
- Section 1 (Outcomes): Grid of outcome cards — icon, title, ADR/Biggy/E2E pills, description, status footer badge
- Section 2 (E2E Workflows): Workflow cards — pill badge, title, horizontal stepped flow with colored track labels and status badges per step
- Section 3 (Teams): Grid of team cards per team — track sections (ADR/Biggy) with status-icon bullet lists + open items box. Same HTML card structure, bullets ≤10 words each (snappier than reference)
- Section 4 (Focus Areas): Focus cards — color-coded left border, title, "Why" text, status box, owners line
- Status icon system (CSS `::before`): ✓ Live (green), ◐ In Progress (amber), ○ Planned (gray), ⚠ Blocked (red), → Future (blue)
- Track pills: `.pill-adr` (blue), `.pill-biggy` (purple), `.pill-e2e` (green)
- Workflow badge per team card: "Workflow Known" (green), "Partial" (yellow), "Unknown" (gray)

### Team Engagement Overview — missing data warnings
- `WarnBanner` component (already in `components/teams/`) shown at section top when source table has zero records
- Triggers: `businessOutcomes.length === 0`, `e2eWorkflows.length === 0`, `teamOnboardingStatus.length === 0`, `focusAreas.length === 0`

### Claude's Discretion
- Exact PATCH response handling and optimistic rollback for arch_node status cycling
- @dnd-kit collision detection strategy for column reordering (arrayMove vs custom)
- CSS implementation of status icon system for Team Engagement bullets (Tailwind utility classes vs inline style)
- Sub-tab bar implementation within Teams tab (reuse `SubTabBar` or simple tab buttons)
- Page-level header styling for Team Engagement Overview (gradient or plain header)
- Whether to extract a shared `TrackPill` component or use inline Tailwind classes

</decisions>

<specifics>
## Specific Ideas

- Architecture diagram screenshots provided by user — the existing `InteractiveArchGraph` already produces the correct visual output. Phase 48 rewires the stage-column definitions from hardcoded arrays to `arch_nodes` DB records, and adds the status badge + drag behavior. Visual appearance should not change.
- Team Engagement visual reference: `AMEX_Team_Engagement_2026-03-17.html` — use as the precise design reference for card layouts, colors, icons, and section structure
- Section 4 (Teams) redesign caveat: same HTML card structure, but bullets trimmed to ≤10 words — "snappier, less wordy, focused on ADR/Biggy progress per team"
- Architecture section (Section 2 from the HTML) is explicitly excluded from Team Engagement Overview — covered by the Architecture tab

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/arch/InteractiveArchGraph.tsx` — existing pipeline diagram; Phase 48 replaces hardcoded `ADR_PHASES`/`BIGGY_PHASES` arrays with `arch_nodes` data; otherwise keep component structure intact
- `components/arch/WorkflowDiagram.tsx` — wraps both tabs; already reads from `getArchTabData`; Phase 48 adds `getArchNodes()` call and passes tracks/nodes as props
- `components/arch/TeamOnboardingTable.tsx` — unchanged; keeps `team_onboarding_status` as data source
- `@dnd-kit/sortable`, `@dnd-kit/core` — installed (Phase 3/47); use `SortableContext` + `useSortable` for column drag
- `components/arch/IntegrationEditModal.tsx` — existing modal for arch integration editing; unchanged
- `components/teams/WarnBanner.tsx` — missing-data warning component; use for all 4 Overview sections
- `components/teams/BusinessOutcomesSection.tsx`, `E2eWorkflowsSection.tsx`, `TeamsEngagementSection.tsx`, `FocusAreasSection.tsx` — existing section components; Phase 48 creates new read-only Overview variants of these styled to match HTML reference
- `lib/queries.ts` → `getArchNodes(projectId)` — already implemented; returns `{ tracks: ArchTrack[], nodes: ArchNode[] }`
- `lib/queries.ts` → `getTeamsTabData(projectId)` — already returns all data needed for Overview sections (businessOutcomes, e2eWorkflows, teamOnboardingStatus, openActions, focusAreas)

### Established Patterns
- Optimistic UI: state update immediately, PATCH fires async, toast on error (app-wide standard)
- Status badges: `planned` (zinc), `in_progress` (blue), `live` (green) — consistent with WBS (Phase 47)
- API routes under `app/api/projects/[projectId]/` — follow existing route patterns
- Server component fetches → client island pattern (Phase 47 WBS model)

### Integration Points
- `app/customer/[id]/architecture/page.tsx` — add `getArchNodes(projectId)` call alongside existing `getArchTabData`; pass to `WorkflowDiagram`
- `app/customer/[id]/teams/page.tsx` — add sub-tab structure; "Overview" tab renders new Overview component with existing `TeamsTabData`; "Detail" tab renders existing `TeamEngagementMap`
- `app/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts` — new PATCH endpoint for status cycling
- `app/api/projects/[projectId]/arch-nodes/reorder/route.ts` — new PATCH endpoint for display_order bulk update

</code_context>

<deferred>
## Deferred Ideas

- `arch_team_status` table (Phase 45) — seeded per project but not rendered in Phase 48; may be used in a future phase
- `team_engagement_sections` blobs (Phase 45) — not used for UI in Phase 48; may serve extraction/reporting purposes later
- Editing Team Engagement Overview content directly — user confirmed read-only is correct; edit happens in source tabs

</deferred>

---

*Phase: 48-architecture-team-engagement*
*Context gathered: 2026-04-08*
