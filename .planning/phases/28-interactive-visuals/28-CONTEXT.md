# Phase 28: Interactive Visuals - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the existing `TeamEngagementMap` (Teams tab) and `WorkflowDiagram` (Architecture tab) with interactive React Flow node-edge graphs. Nodes are clickable and open a detail drawer showing live DB data. Both components must be SSR-safe via `dynamic(() => import(...), { ssr: false })`. Existing HTML skill exports remain available alongside the new components.

No new DB tables required — all data reads from existing tables (stakeholders, team_onboarding_status, architecture_integrations, e2e_workflows).

</domain>

<decisions>
## Implementation Decisions

### Node detail panel
- Side drawer, not a popover or inline expansion
- Split view: graph stays visible on the left, drawer opens ~380px on the right (graph shrinks)
- Read-only — shows live DB fields (status, owner, notes, type, etc.); no inline editing
- Clicking a different node switches the drawer to that node's data
- X button closes the drawer entirely; clicking the same node again also closes it

### Engagement map nodes (Teams tab)
- Node types: Teams + Stakeholders (two distinct node types, visually differentiated)
- Edges connect nodes that share participation in the same E2E workflow; edge label = workflow name
- Existing sections (Business Outcomes, E2E Workflows list, Focus Areas) remain below the graph — the React Flow component is prepended to the Teams tab, not a replacement
- Empty state: graph container renders with centered message "Add teams and stakeholders to see the engagement map" when no nodes exist

### Architecture diagram scope (Architecture tab)
- React Flow applied to **Current & Future State** view only — "Before BigPanda" tab remains as-is (narrative/static, no node data)
- Layout: hub-and-spoke with BigPanda as a fixed central node; all integration nodes radiate outward; dagre handles spacing
- Each integration node displays: name + type icon (monitoring, ticketing, CMDB, etc.) + status badge (colored indicator: green=live, yellow=in-progress, red=blocked)
- Drawer shows full integration details: status, type, configuration notes

### Visual style
- Clean and minimal — well-spaced nodes, concise labels, thin edges; matches existing zinc/white app aesthetic
- Background: subtle dot grid (React Flow `<Background />` component, default variant)
- Controls: zoom in/out buttons + scroll-to-zoom + click-drag-to-pan; no minimap
- Node styling: white cards with zinc border and subtle shadow, consistent with existing app cards

### Claude's Discretion
- Exact node dimensions and typography
- Edge routing style (straight, bezier, step)
- Animation on drawer open/close
- Dagre spacing parameters (rankSep, nodeSep)
- Icon library/set for integration type icons

</decisions>

<specifics>
## Specific Ideas

- The architecture graph should visually communicate the BigPanda consolidation story — everything feeds into a central BigPanda node
- The Teams graph should show "who's involved and how they relate" — the engagement relationship, not just a list of names
- Both graphs should feel like a native part of the app, not an embedded widget — use the same zinc/white palette as the rest of the UI

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TeamEngagementMap` (`components/teams/TeamEngagementMap.tsx`): existing wrapper; React Flow graph replaces its interior, outer component shell can be kept
- `WorkflowDiagram` (`components/arch/WorkflowDiagram.tsx`): existing wrapper with Before/Current tabs; React Flow replaces `CurrentFutureStateTab` internals only
- `SubTabBar` (`components/SubTabBar.tsx`): new from Phase 27 — could be reused if Architecture tab needs internal tab switching
- Existing card/badge UI primitives (Tailwind zinc palette, `border rounded-lg` pattern used throughout)

### Established Patterns
- `'use client'` + `dynamic(() => import(...), { ssr: false })` required for all `@xyflow/react` parent components — specified in Phase 28 success criteria
- Data fetching: server components fetch and pass data as props to client components (see `app/customer/[id]/teams/page.tsx` → `TeamEngagementMap`)
- Split-pane layout: not currently used in the app; will be a new pattern — use CSS flex with the graph taking remaining width and drawer at fixed 380px

### Integration Points
- `app/customer/[id]/teams/page.tsx` → renders `TeamEngagementMap` with `TeamsTabData` prop
- `app/customer/[id]/architecture/page.tsx` → renders `WorkflowDiagram` with `ArchTabData` prop
- `lib/queries.ts` → `TeamsTabData` and `ArchTabData` types define available data; no new queries needed
- Phase 27 WorkspaceTabs: Teams tab is now under "Team" group, Architecture under "Team" group — routing unchanged

</code_context>

<deferred>
## Deferred Ideas

- "Before BigPanda" as a React Flow graph showing legacy tooling nodes — requires new DB data modeling for before-state tools; deferred to a future phase
- Minimap for large graphs — deferred; not needed until projects regularly exceed 20+ nodes
- Workflow drill-down depth beyond node click (sub-flow detail panels) — explicitly in v3.1 deferred list per REQUIREMENTS.md

</deferred>

---

*Phase: 28-interactive-visuals*
*Context gathered: 2026-03-31*
