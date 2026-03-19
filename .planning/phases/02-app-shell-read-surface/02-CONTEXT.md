# Phase 2: App Shell + Read Surface — Context

**Gathered:** 2026-03-19
**Status:** Ready for planning
**Source:** User decisions

<domain>
## Phase Boundary

Build the Next.js app shell and all read-only data surfaces: Dashboard with auto-derived health cards, and all 9 workspace tabs per project displaying live PostgreSQL data. No mutations in this phase — that's Phase 3. The app must be usable as a daily read-only briefing tool before any write surface exists.

</domain>

<decisions>
## Implementation Decisions

### UI Component Library
**shadcn/ui** (Radix primitives + Tailwind) — Claude's recommendation, approved by user.
- Rationale: tables, tabs, badges, dialogs, and cards are all needed across 9 workspace tabs. Building them hand-rolled would be slow. shadcn/ui gives accessible, unstyled-by-default components that work with the existing Tailwind 4 setup.
- Install via: `npx shadcn@latest init` inside bigpanda-app/

### App Layout
**Left sidebar** for project navigation (project list), **main content area** on the right.
- User reasoning: "easier when there are more customers to manage" — sidebar scales to n projects without reflowing the layout.
- Sidebar: shows active projects with health RAG dot, customer name, go-live target. Clicking navigates to that project's workspace.
- Top-level nav item: Dashboard (cross-project view).

### Workspace Tab Navigation
**Top tabs bar** (like GitHub repo tabs) within each project workspace.
- 9 tabs: Overview | Actions | Risks | Milestones | Teams | Architecture | Decisions | Engagement History | Stakeholders
- URL pattern: `/customer/[id]/[tab]` — deep-linkable, browser back works correctly.
- Active tab highlighted, tab bar sticky below project header.

### Data Loading Strategy
**RSC (React Server Components)** for initial page load — data fetched server-side, zero client waterfalls, fast first paint.
- Claude's recommendation given single-user local app with no real-time collaboration requirements.
- For future skill output streaming and live refresh (needed in Phase 5): client components with SWR or React Query added at that point — not now.
- Phase 2 is read-only so RSC is optimal: no optimistic UI needed yet.

### Note/Document Input (User Requirement)
User needs to paste notes and documents into the app and have Claude process them (feeds into Context Updater, Meeting Summary, and other skills).
- **Phase 2 scope:** Add a floating "Add Notes" button visible on all workspace tab pages. In Phase 2 it opens a textarea modal — notes are saved to engagement_history (append-only) with source='manual_entry'. This gives the data plumbing.
- **Phase 5 scope:** The same modal gets a "Run Skill" dropdown to route notes to Context Updater, Meeting Summary, etc.
- This is explicitly captured here so Phase 2 planner builds the modal infrastructure even though skill routing comes later.

### Color / Visual Style
- Dark sidebar, light main content — standard tool aesthetic (Linear, Raycast style).
- RAG health badges: 🟢 green / 🟡 yellow / 🔴 red dots next to project names and on health cards.
- Tailwind v4 — no tailwind.config.js, use CSS variables approach.
- Font: system-ui (no external font load — local app, speed matters).

### Route Structure
```
/                              → Dashboard (cross-project)
/customer/[id]                 → Redirect to /customer/[id]/overview
/customer/[id]/overview        → Overview tab
/customer/[id]/actions         → Actions tab
/customer/[id]/risks           → Risks tab
/customer/[id]/milestones      → Milestones tab
/customer/[id]/teams           → Teams tab
/customer/[id]/architecture    → Architecture tab
/customer/[id]/decisions       → Decisions tab
/customer/[id]/history         → Engagement History tab
/customer/[id]/stakeholders    → Stakeholders tab
```

### Claude's Discretion
- Exact shadcn component selection per tab (Claude chooses based on data shape)
- Pagination vs. infinite scroll on long lists (Actions, Risks — Claude decides; Actions likely paginated at 50/page)
- Loading states (Suspense boundaries with skeleton components)
- Error boundary placement

</decisions>

<specifics>
## Specific Requirements

- Health score formula (from REQUIREMENTS.md DATA-03): overdue actions + stalled milestones (no progress in 14+ days) + unresolved high-severity risks → derive Green/Yellow/Red
- Recent Activity Feed: last 7 days of skill runs (outputs table), file outputs, and engagement history entries across all projects
- In-app notification badge: overdue actions and approaching go-live dates (within 14 days)
- Quick Action Bar: buttons visible on dashboard — "Run Tracker", "Generate Briefing", "Weekly Status Draft" per account. In Phase 2 these are visible but disabled (wired in Phase 5).
- "Add Notes" modal: present and functional in Phase 2 — writes to engagement_history. Skill routing added in Phase 5.
- All 9 workspace tabs display real data from PostgreSQL. No placeholder/mock data.

</specifics>

<deferred>
## Deferred Ideas

- Skill routing from "Add Notes" modal → deferred to Phase 5 (Skill Engine)
- Live refresh / polling of tab data → deferred to Phase 5
- Quick Action Bar buttons active → deferred to Phase 5
- Risk Heat Map on Dashboard → deferred to Phase 6 (requires cross-project MCP data)
- Cross-Account Watch List → deferred to Phase 6

</deferred>

---

*Phase: 02-app-shell-read-surface*
*Context gathered: 2026-03-19 via user decisions*
