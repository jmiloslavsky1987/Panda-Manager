---
phase: 02-read-surface
plan: 05
subsystem: client
tags: [react, sidebar, navlink, tanstack-query, yaml-migration, workstreams]

# Dependency graph
requires:
  - phase: 02-03
    provides: Dashboard + getCustomers API function
  - phase: 02-04
    provides: CustomerOverview full implementation

provides:
  - client/src/components/Sidebar.jsx: persistent customer list with NavLink active state
  - client/src/layouts/AppLayout.jsx: updated with real Sidebar replacing placeholder
  - client/src/layouts/CustomerLayout.jsx: cleaned up, placeholder header removed
  - scripts/migrateYaml.js: one-shot Drive YAML migration script (zero data loss)
  - client/src/lib/deriveCustomer.js: finalized with WORKSTREAM_CONFIG (11 sub-workstreams)
  - client/src/lib/deriveCustomer.test.js: 31/31 tests passing

affects:
  - Phase 3 (Project Setup screen — reads same Sidebar, CustomerLayout context pattern)
  - Phase 4 (Weekly Update Form — uses WORKSTREAM_CONFIG for 11-substream inputs)

# Tech tracking
tech-stack:
  patterns:
    - NavLink className={({ isActive }) => ...} for active state — complete literal strings (Tailwind v4)
    - Sidebar: useQuery(['customers'], getCustomers, staleTime: 30_000) — same cache as Dashboard
    - AppLayout: <Sidebar /> + <Outlet /> — Outlet must stay or child routes blank
    - CustomerLayout: Outlet context={{ customer }} only — no placeholder header
    - WORKSTREAM_CONFIG: 11 fixed sub-workstreams (ADR×6 + Biggy×5), hasScope flags
    - getLatestWorkstreams: empty {} → 11 not_started defaults; null → [] (status fallback)
    - COLOR_TO_STATUS: green/yellow/orange/red → on_track/at_risk/at_risk/off_track
    - STATUS_ORDER: at_risk=0, on_track=1, not_started=2, off_track=3

  anti-patterns:
    - No `ws: true` in Vite proxy (breaks HMR WebSocket)
    - No dynamic class construction in Tailwind v4 (purge removes unseen classes)
    - No extra-key rejection in validateYaml (AMEX has 24+ top-level keys)
    - No strict credential path assumption (GOOGLE_SERVICE_ACCOUNT_PATH relative to server/ dir)

key-files:
  created:
    - client/src/components/Sidebar.jsx
    - scripts/migrateYaml.js
  modified:
    - client/src/layouts/AppLayout.jsx (Sidebar wired in)
    - client/src/layouts/CustomerLayout.jsx (placeholder removed)
    - client/src/views/CustomerOverview.jsx (11-substream grouped cards: WorkstreamGroupCard + SubWorkstreamRow)
    - client/src/lib/deriveCustomer.js (WORKSTREAM_CONFIG finalized, getLatestWorkstreams nested-object reader)
    - client/src/lib/deriveCustomer.test.js (makeWorkstreams helper, 31 tests)
    - server/services/yamlService.js (extra-key rejection removed)
    - .planning/ROADMAP.md (Phase 3 renamed + Project Setup added; sub-workstream counts corrected)

requirements-completed: [CUST-01, UI-03, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08]

# Metrics
duration: ~multiple sessions
completed: 2026-03-04
---

# Phase 2 Plan 05 + Phase Close: Sidebar + YAML Migration + Workstream Finalization

**Full Phase 2 read surface complete: sidebar, real Drive data, 11-workstream schema, 31 tests passing, all 3 YAML files migrated**

## Accomplishments

### Sidebar + Layout Wiring (02-05 plan scope)
- `Sidebar.jsx`: persistent customer list using `NavLink` with isActive teal active state; stale-time shared with Dashboard cache
- `AppLayout.jsx`: placeholder `<aside>` replaced with `<Sidebar />`; `<Outlet />` preserved
- `CustomerLayout.jsx`: placeholder header div removed; only `<Outlet context={{ customer }} />` remains

### YAML Migration (real-world complications resolved)
- `validateYaml` extra-key rejection removed — AMEX has 24 top-level keys and would fail strict schema
- `scripts/migrateYaml.js` created: reads all Drive YAML files, adds missing required keys with empty defaults, round-trip verifies, writes back
- AMEX duplicate `metadata:` key at line 5275 manually resolved (raw line manipulation)
- AMEX `status` field (object) renamed to `status_detail`; `status: "not_started"` added
- Merck `actions: {open: [...], completed: [...]}` flattened to array
- Service account needed Editor (not Viewer) access for Drive writes — granted by user
- All 3 customer files (Kaiser, Merck, AMEX) successfully migrated

### Workstream Schema Finalization
- `WORKSTREAM_CONFIG` locked to 11 sub-workstreams: ADR×6 + Biggy×5
- `hasScope: true` on inbound_integrations, outbound_integrations (ADR) and udc, real_time_integrations (Biggy)
- `getLatestWorkstreams`: reads `customer.workstreams.{adr|biggy}.{subKey}`; empty `{}` returns 11 not_started defaults; `null` returns `[]`
- All 3 Drive YAML files migrated to nested workstream structure with scope arrays
- CustomerOverview updated: `WorkstreamGroupCard` + `SubWorkstreamRow`; "No tools in scope" hint for empty scope arrays
- "Project Setup →" link added to workstream header

### Tests
- 31/31 tests passing
- `makeWorkstreams(statusByKey)` helper builds full 11-sub-workstream nested object
- Coverage: WORKSTREAM_CONFIG shape, color normalization, empty/{}/null behavior, scope flags, all derive functions

### Roadmap Updated
- Phase 3 renamed to "Project Setup + Action Manager"
- Phase 3 success criteria includes Project Setup screen at `/customer/:id/setup`
- Phase 2 + Phase 4 sub-workstream counts corrected to 11 (ADR: 6, Biggy: 5)

## Phase 2 Visual Checkpoint (02-05 Task 2) — PASSED
- Sidebar visible on all pages, customers listed, teal active state on current customer
- Dashboard shows 3 customer cards sorted At Risk first, correct stats
- CustomerOverview shows 11 sub-workstreams grouped (ADR 6 rows, Biggy 5 rows) with status dots + progress bars
- Inline risk/milestone editing with Saving... indicator confirmed writing to Drive
- Navigation (sidebar + View button) works without full page reload

---
*Phase: 02-read-surface*
*Completed: 2026-03-04*
