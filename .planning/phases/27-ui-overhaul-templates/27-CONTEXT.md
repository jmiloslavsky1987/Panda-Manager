# Phase 27: UI Overhaul + Templates - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Declutter workspace navigation by grouping 14 tabs into 6 logical top-level items with a two-level sub-tab system, and build a TypeScript template registry (`lib/tab-template-registry.ts`) that defines the required section structure for all 11 tab types and seeds instructional placeholder content for every new project created after this phase.

Visual modernization (color palette, typography, spacing) is explicitly out of scope for this milestone — deferred to a future phase.

</domain>

<decisions>
## Implementation Decisions

### Tab Grouping Map
Collapse 14 tabs into 6 top-level items:

| Top-level Tab | Sub-tabs |
|---|---|
| Overview | standalone (no sub-tabs) |
| Delivery | Actions · Risks · Milestones · Plan |
| Team | Teams · Architecture · Stakeholders |
| Intel | Decisions · Engagement History |
| Skills | standalone (no sub-tabs) |
| Admin | Time · Artifacts · Review Queue |

- **Plan's internal navigation is preserved as-is** — Phase Board, Task Board, Gantt, and Swimlane remain as Plan's own internal view switcher. The sub-tab system does not go deeper than two levels; Plan's internal nav lives inside the Plan sub-tab content area.
- **Default landing**: clicking a parent tab always lands on the first sub-tab (Delivery → Actions, Team → Teams, Intel → Decisions, Admin → Time). No last-visited memory.

### Sub-tab Navigation UX
- **Second row of tabs** below the primary bar — GitHub-style secondary nav.
- The primary bar shows the 6 top-level items; clicking a parent with sub-tabs renders a secondary tab row directly beneath it.
- Standalone tabs (Overview, Skills) show no secondary row.
- URL pattern: `?tab=delivery&subtab=actions` — deep-linkable, browser back works correctly.
- Sub-tab row is sticky alongside the primary bar.

### Template Registry Structure
- **File**: `lib/tab-template-registry.ts`
- **Shape per entry**: named sections + required fields + seed placeholder text
- **11 tab types covered**: Overview, Actions, Risks, Milestones, Teams, Architecture, Decisions, Engagement History, Stakeholders, Plan, Skills
- Time, Artifacts, and Review Queue are excluded from the template requirement
- **Section names**: Claude proposes reasonable defaults during planning based on what each tab currently displays — user reviews during verification
- **Seed placeholder style**: instructional text ("Add your first action — owner, due date, and description"), not silent empty state and not pre-populated demo rows
- **Dual purpose**: registry is the single source of truth for both Phase 27 seeding AND Phase 30 Context Hub completeness analysis — Phase 30 reads section definitions from this registry to check which sections are populated vs. missing

### TypeScript Enforcement
- The TypeScript compiler must reject any tab renderer that references a section not defined in the registry
- Typed map structure ensures no new tab renderer can be added without a corresponding registry entry

### Visual Modernization
- **Explicitly deferred** — not part of this milestone. No color palette, typography, or spacing work in this phase.

### Claude's Discretion
- Exact section names and required fields for all 11 tab types (proposed during planning, reviewed at verification)
- Implementation of the two-level sticky tab bar (component structure, scroll behavior)
- New project creation hook that triggers seeding from registry

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/WorkspaceTabs.tsx`: Current single-level tab bar (`TABS` array of 14 items, `usePathname` for active detection, `Link` for navigation). This is the primary component to refactor into a two-level system.
- `app/customer/[id]/layout.tsx`: Renders `WorkspaceTabs` — integration point for the new two-level nav. Already has sticky header structure.
- shadcn/ui: Already installed — `Tabs`, `TabsList`, `TabsTrigger` primitives available for the secondary tab row.
- All 14 tab routes exist under `app/customer/[id]/[segment]/` — no new routes needed, only navigation layer changes.

### Established Patterns
- URL pattern currently: `/customer/[id]/[segment]` — switching to `?tab=X&subtab=Y` searchParams is the primary structural change
- Active tab detection: currently via `usePathname().endsWith()` — will need to switch to `useSearchParams()` for the new URL pattern
- `router.push()` / `<Link>` with `href` — existing navigation pattern stays, just with new URL shape
- Dark sidebar / light main content split — preserved (visual modernization deferred)
- shadcn/ui component library throughout — Radix + Tailwind tokens

### Integration Points
- `WorkspaceTabs.tsx` — refactor from flat TABS array to grouped TABS with parent/children structure
- `app/customer/[id]/layout.tsx` — update to pass grouping context to WorkspaceTabs
- New project creation flow (Phase 20 wizard) — add post-creation seeding step that reads from registry
- `lib/tab-template-registry.ts` — new file, consumed by seeding logic and later by Phase 30 completeness analysis
- Plan tab internal nav (`app/customer/[id]/plan/`) — must not be touched; preserve existing Phase Board/Task Board/Gantt/Swimlane switcher

</code_context>

<specifics>
## Specific Ideas

- The URL pattern example from the roadmap success criteria: `?tab=teams&subtab=adr` — confirmed pattern is `?tab=[parent]&subtab=[child]`
- Plan is explicitly under Delivery (not in a standalone Build group)
- Plan's existing sub-views (Phase Board, Task Board, Gantt, Swimlane) are NOT flattened into the Delivery sub-tab level — they remain as Plan's own internal navigation

</specifics>

<deferred>
## Deferred Ideas

- **Visual modernization** — updated color palette, typography scale, component spacing, Tailwind token system cleanup. Explicitly removed from this milestone by user decision. Future phase.

</deferred>

---

*Phase: 27-ui-overhaul-templates*
*Context gathered: 2026-03-31*
