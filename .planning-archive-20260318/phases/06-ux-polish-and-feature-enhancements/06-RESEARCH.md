# Phase 6: UX Polish and Feature Enhancements - Research

**Researched:** 2026-03-05
**Domain:** React SPA UX audit — view-by-view gap analysis, consistency patterns, high-value feature additions
**Confidence:** HIGH (all findings are based on direct codebase inspection, no speculative claims)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Analyze every view for UX gaps, inconsistencies, and missing features
- Implement improvements where found
- New features are in scope if they add meaningful value to the workflow

### What counts as "improvement"
- Consistency: same patterns across all views (loading states, empty states, error handling)
- Completeness: features that feel half-done (e.g., YAML Editor save-guards, Reports .txt download)
- Discoverability: users should not need to know the app to use it
- Workflow efficiency: fewer clicks to accomplish common tasks

### Claude's Discretion
- Which specific improvements are highest value (research agent will audit each view)
- Exact implementation approach for each improvement
- How many features/improvements per plan
- Wave structure for parallel execution

### Deferred Ideas (OUT OF SCOPE)
- Multi-user / sharing features (this is a single-user local app)
- Mobile responsive layout (desktop-first is fine for this use case)
- Offline mode / service worker
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | All views have consistent loading skeletons (not plain "Loading..." text) | Dashboard/CustomerLayout use plain text — skeleton components needed |
| UX-02 | All views have consistent empty states with actionable guidance | Some views have good empty states (ActionManager filter message), others have none |
| UX-03 | Navigation flow has no dead ends — breadcrumbs or context indicators present throughout | WeeklyUpdateForm has a Back button; other views have none — Breadcrumb component needed |
| UX-04 | YAML Editor: navigate-away unsaved-changes warning implemented | Currently missing — isDirty state exists but no beforeunload/React Router blocker |
| UX-05 | YAML Editor: "strips comments" banner present | Currently missing — YAML-05 requirement not yet implemented |
| UX-06 | Report Generator: Weekly Status has a "Download as .txt" button | RPT-05 not yet implemented — CopyButton exists but no download |
| UX-07 | Dashboard and Customer Overview surface actionable information at a glance | Mostly done; gaps: no overdue-action roll-up callout, no "last updated" freshness indicator |
| UX-08 | Inline risk/milestone creation without leaving Customer Overview (v2 RISK-01, MILE-01) | Currently "Add via YAML Editor" — requires inline add-row pattern like ActionManager |
| UX-09 | At least 3 high-value new features implemented end-to-end | Research identifies: (1) global overdue-actions roll-up on Dashboard, (2) History Timeline view, (3) Inline risk/milestone add |
| UX-10 | Visual consistency — spacing, typography, and color usage uniform across all 7 views | Gap found: ArtifactManager status cell shows both badge AND select simultaneously; header size inconsistency (h2 vs h1 mix) |
</phase_requirements>

---

## Summary

All five original phases are built and committed. The codebase is structurally sound and functionally complete. The primary UX gaps fall into four categories: (1) **missing safety features** — YAML Editor has no navigate-away guard and no comments-stripping banner, which were explicitly required in Phase 5 but never implemented; (2) **missing convenience affordances** — Report Generator has no `.txt` download, Customer Overview forces users to the YAML Editor to add new risks/milestones; (3) **inconsistent patterns** — loading states range from skeleton-quality to plain text, and the Sidebar shows no status indicators next to customer names; and (4) **high-value features that reach v1 goals** — an overdue-actions roll-up panel on the Dashboard, a History Timeline view to browse past weekly entries, and inline risk/milestone creation.

The codebase is well-structured for surgical improvements. All views share a consistent data flow pattern (useOutletContext + TanStack Query mutations), which means each improvement is self-contained. Tailwind v4 constraint (complete literal class strings) must be respected in every new component.

**Primary recommendation:** Implement Phase 6 in three waves: Wave 1 handles the safety/completeness gaps (YAML guard, comments banner, .txt download, status badge on Sidebar), Wave 2 handles inline risk/milestone CRUD (highest complexity), and Wave 3 delivers two new features (overdue roll-up panel on Dashboard, History Timeline view).

---

## View-by-View Gap Analysis

### 1. Dashboard (`/`)
**What works well:**
- Customer cards surface all required data (status, %, days to go-live, actions, risks)
- NewCustomerModal is clean and functional — creates and redirects to /setup correctly
- `sortCustomers` correctly prioritizes At Risk first
- Loading and error states exist (plain text)
- Empty state exists ("No customers found. Check Drive folder configuration.")

**Gaps found:**
- Loading state is plain text (`<div className="text-gray-500">Loading customers...</div>`), not a skeleton
- Customer name in Sidebar shows no status indicator — user must navigate to a customer to see if they're At Risk
- No "last activity" indicator on cards — hard to know which customers are stale
- No overdue-actions summary anywhere on Dashboard — the v2 requirement NAV-02 (overdue actions roll-up) is high value and easily achievable
- `STATUS_ORDER` in `deriveCustomer.js` puts `off_track` LAST (order 3) despite DASH-03 saying "Off Track" should be third (after "On Track") — this is a bug; At Risk=0, On Track=1, Off Track=2 would match the spec more naturally but current code has Not Started=2, Off Track=3 — this is a valid gap to investigate

**Effort:** SMALL for skeleton loading states; MEDIUM for overdue roll-up panel

---

### 2. Customer Overview (`/customer/:id`)
**What works well:**
- Header section is information-dense and well-structured
- Workstream health cards clearly show status dots, progress bars, and scope tags
- Inline risk and milestone editing works correctly (optimistic mutations)
- "Manage Actions" and other shortcut links are present
- Weekly Update shortcut section exists
- Artifacts shortcut section exists

**Gaps found:**
- `lastUpdated` is derived from `latest?.week_ending` — if history is empty, shows `—` with no guidance
- Risks section empty state says "Add via YAML Editor" — this is a dead end; inline add is v2 RISK-01 and very high value
- Milestones section empty state says "Add via YAML Editor" — same issue (v2 MILE-01)
- Risk `owner` field exists in YAML but is NOT rendered in RisksSection table — the column list is ID, Description, Severity, Status, Mitigation — owner is missing
- Milestone dates are raw strings entered via InlineEditField with no date picker — user types "2026-06-15" by hand, no validation that it's a valid date
- `InlineEditField` and `InlineSelectField` defined inline in CustomerOverview.jsx at lines 40-93 appear to be duplicates of the shared components in `client/src/components/` — these duplicates should be removed and replaced with the shared components (MEDIUM refactor)
- No "Add Risk" / "Add Milestone" affordance — users must go to YAML Editor

**Effort:** SMALL for owner column; MEDIUM for inline add-row for risks/milestones; SMALL for removing duplicate inline components

---

### 3. Action Manager (`/customer/:id/actions`)
**What works well:**
- Fully functional: sort, filter, inline edit, complete, reopen, add-row all work
- Empty state for filtered results is informative
- Status badge styling is consistent
- Add-row is pinned to table bottom — very discoverable

**Gaps found:**
- No loading state — CustomerLayout shows "Loading customer..." so Action Manager renders once data arrives, but there is a flash period where the table is empty before actions populate
- No error boundary if `patchAction` fails beyond the TanStack rollback — user sees the value snap back with no explanation
- The Add-row has no `autoFocus` on description field, requiring extra click
- Filter status toggles show `In Review` but the status value in YAML is `in_review` — the label capitalization works fine but the button label "In Review" vs badge label "In Review" is consistent (good)
- The completed-actions table has no sort capability (completed date would be useful)

**Effort:** SMALL for autoFocus; SMALL for error message on mutation failure; MEDIUM for completed table sort

---

### 4. Report Generator (`/customer/:id/reports`)
**What works well:**
- Three report types clearly presented with descriptions
- ELT slide editing with per-section copy buttons is excellent UX
- PPTX download with spinner works
- `key={reportKey}` pattern correctly remounts on each generate

**Gaps found (confirmed against RPT-05 requirement):**
- **No "Download as .txt" button for Weekly Status report** — RPT-05 explicitly requires this; `CopyButton` exists but `.txt` download is not implemented
- The `generateReportPptx` API call in api.js posts to `/customers/${customerId}/reports/pptx` — this route should exist via `topLevelReports.js` or `reports.js` — need to confirm it's mounted (confirmed in route structure)
- `overallStatusLabel()` in reportGenerator.js uses `customer?.status ?? 'on_track'` — this reads the flat `status` field, NOT the derived status from workstreams, which means it may be stale
- `reportGenerator.js` `generateWeeklyCustomerStatus` uses `**bold**` markdown formatting in what is meant to be a plain-text email — this is inconsistent with the "styled like an email" description
- `buildPanel()` in reportGenerator.js filters actions by `a.workstream.toLowerCase() === sw.group` — workstream values are subkeys like `inbound_integrations`, but `sw.group` is `adr` or `biggy` — this filter will NEVER match (actions have sub-workstream keys, not group keys), so the "Looking Ahead" panel will always fall back to "Continue current work items"
- No "Regenerate" visual indicator when regenerating (clicking "Preview Report" again resets content silently)

**Effort:** SMALL for .txt download; SMALL for fixing the `sw.group` filter bug in buildPanel; MEDIUM for overallStatus fix

---

### 5. YAML Editor (`/customer/:id/yaml`)
**What works well:**
- CodeMirror 6 with teal theme, active-line highlighting, and dirty tracking are implemented correctly
- Cmd/Ctrl+S keyboard shortcut works
- `savedContentRef` correctly tracks the baseline for dirty comparison
- Save button disabled when not dirty or saving
- Post-save cache invalidation via `invalidateQueries` is correct

**Gaps found (confirmed against YAML-04 and YAML-05 requirements):**
- **YAML-04 NOT IMPLEMENTED**: No navigate-away warning when `isDirty === true`. The `isDirty` state exists, but there is no `useBeforeUnload` hook and no React Router `useBlocker` call. Navigating away silently discards changes.
- **YAML-05 NOT IMPLEMENTED**: No banner warning that saving strips YAML comments. The warning banner exists but says "Use with care" about structure — it does NOT mention the comments stripping behavior.
- The existing warning banner conflates two separate concerns (structural correctness and comments stripping); splitting into two distinct banners would be cleaner
- No "Validate" button (YAML-02) — validation only happens server-side on save; there is no client-side validate-before-save path. The save button itself acts as the validator by letting server errors surface, which is acceptable but the YAML-02 requirement specified a dedicated Validate button.
- The `staleTime: Infinity` on the YAML query is correct but means if the user navigates away and comes back, they see the old content without re-fetching — this is intentional but should be documented

**Effort:** SMALL for comments-stripping banner; MEDIUM for navigate-away guard (requires React Router `useBlocker`); MEDIUM for Validate button

---

### 6. Artifact Manager (`/customer/:id/artifacts`)
**What works well:**
- Table with inline CRUD is fully functional
- Empty state message in table is present and actionable
- `last_updated` rendered as read-only (correct)
- Status badge classes are complete literal strings (Tailwind-safe)

**Gaps found:**
- **Status cell shows BOTH a colored badge span AND an InlineSelectField simultaneously** — the badge at line 146-148 and the select at line 149-153 are rendered side-by-side, which is confusing: the badge shows the current value visually but the select also shows it as a dropdown. The pattern in ActionManager uses ONLY the styled select (no separate badge). This is a visual inconsistency.
- No filter or sort capability — with many artifacts, this becomes unwieldy
- `description` field is editable but no maximum length guidance
- The Add-row does not clear focus to the title field after clicking "Add Artifact"

**Effort:** SMALL for status cell fix (remove the redundant badge span); SMALL for add-row focus fix; MEDIUM for sort/filter

---

### 7. Weekly Update Form (`/customer/:id/update`)
**What works well:**
- Prefill from current workstream state is genuinely useful
- Heuristic summary prefill (completed actions since last entry) is a solid pattern
- Week ending defaults to today's date
- Submit redirects to Customer Overview on success

**Gaps found:**
- No unsaved-changes warning if user accidentally navigates away mid-form (parallel to YAML-04 issue)
- `buildHeuristicSummary` in `WeeklyUpdateForm.jsx` is a local duplicate of `buildWeeklyFormPrefill` exported from `reportGenerator.js` — both do the same logic (recent completed actions since last week_ending). The view should import from the shared lib function instead.
- Summary section `decisions` and `outcomes` carry forward from last history entry — this could confuse users who think they're editing new decisions, not the previous ones. A "(carried from last update)" label would help.
- No preview of what the submitted history entry will look like
- The per-workstream fieldset is very long (11 sub-workstreams × 4 fields each = ~44 form inputs) — collapsible group sections by ADR/Biggy would reduce cognitive load

**Effort:** SMALL for "carried from" label; SMALL for fixing the duplicate function (use shared import); MEDIUM for collapsible workstream groups; MEDIUM for unsaved-changes guard

---

### 8. Project Setup (`/customer/:id/setup`)
**What works well:**
- Two-column layout for ADR vs Biggy is clear
- TagInput for scope tools works correctly
- Save+indicator pattern is correct

**Gaps found:**
- No unsaved-changes warning if user navigates away before saving
- No visual indication of which sub-workstreams have scope defined vs not (all rows look identical)
- `buildFormState` initializes from `customer.workstreams` directly (not from `customer.workstreams[groupKey][key]` — confirmed this is correct but relies on the customer YAML having the exact nested structure)
- "Saved!" indicator disappears after 2s — this is the only view using a 2s auto-hide on a flag; YAML Editor uses 2.5s saveSuccess — minor inconsistency
- Status options in ProjectSetup (`not_started | in_progress | complete | at_risk | off_track`) do not exactly match the Weekly Update form status options (`green | yellow | red`) — these represent different YAML fields at different points in the data model, which is intentionally distinct but not documented in the UI

**Effort:** SMALL for unsaved guard; SMALL for timer consistency; SMALL for scope indicator

---

### Navigation / Sidebar / Layout Assessment

**Sidebar (`Sidebar.jsx`) gaps:**
- Customer list shows only the customer name — no status indicator (colored dot) next to each name. A user managing 5+ customers must click each one to see if they're at risk.
- The Views sub-nav section has no active-state highlighting that visually differentiates the current section from the others at a glance when the teal highlight is subtle
- The Sidebar is rendered in AppLayout but also in CustomerLayout via AppLayout. The `customerId` check (line 64) correctly shows/hides the Views sub-nav — this is fine.

**CustomerLayout gaps:**
- Loading state is plain text: `<div className="p-4 text-gray-500">Loading customer...</div>` — no skeleton
- Error state is minimal: `<div className="p-4 text-red-500">Error: {error.message}</div>` — no retry button

**AppLayout:** No gaps — it is a thin wrapper and its simplicity is appropriate.

---

## Missing Derived Data in `deriveCustomer.js`

After reading the full file, the following derived data functions are missing that views could use:

| Missing Function | What It Would Return | Where Needed |
|-----------------|---------------------|--------------|
| `getOverdueActions(customer, limit)` | All open actions where `due < today`, sorted by date | Dashboard roll-up panel, Customer Overview |
| `deriveCustomerLastActivityDate(customer)` | Latest of: most recent history `week_ending`, most recent action `completed_date` | Dashboard card "last active" label |
| `countMilestones(customer)` | `{ total, completed, upcoming }` | Customer Overview header |
| `getHistoryEntries(customer)` | `customer.history` array, sorted newest-first | History Timeline view |

Current functions that exist and work well:
- `getMostOverdueActions` — returns only past-due actions, which is the subset needed for the Dashboard roll-up
- `derivePercentComplete`, `deriveOverallStatus`, `sortCustomers` — all correct and complete

**Bug found in `sortCustomers`:** `STATUS_ORDER = { at_risk: 0, on_track: 1, not_started: 2, off_track: 3 }` sorts off_track customers LAST (after not_started). The DASH-03 requirement says "At Risk first, then On Track, then Off Track." Not-started customers appearing before Off Track customers may be intentional (not-started projects don't need urgent attention), but this is worth documenting as a deliberate decision.

---

## Report Generator Content Gaps

**Bug: `buildPanel()` group filter never matches**

In `reportGenerator.js` line 411:
```javascript
.filter(a => a.workstream && a.workstream.toLowerCase() === sw.group)
```
`sw.group` is `'adr'` or `'biggy'` (top-level group keys), but `a.workstream` holds sub-workstream keys like `'inbound_integrations'`, `'normalization'`, etc. These will never be equal. Result: the "Looking Ahead" section in every ELT slide always falls back to `'- Continue current work items'` regardless of actual open actions.

**Fix:** Change the filter to check if `a.workstream` is in the group's sub-workstream keys:
```javascript
const groupSubKeys = WORKSTREAM_CONFIG[sw.group]?.subWorkstreams.map(s => s.key) ?? [];
.filter(a => a.workstream && groupSubKeys.includes(a.workstream))
```

**`overallStatusLabel()` reads stale `customer.status`:** This field is not updated by the workstream-based derivation — it's whatever was in the YAML at the time. The correct source is `deriveOverallStatus(customer)` from `deriveCustomer.js`. Low impact since it only affects the report text, but should be fixed.

---

## High-Value New Features (3 Identified)

### Feature 1: Overdue Actions Roll-Up Panel on Dashboard (HIGH VALUE)
**Why:** The dashboard's purpose is "so nothing slips through the cracks." Currently a user with 5 customers must visit each one to check for overdue actions. A compact panel showing the top N overdue actions across ALL customers would be the killer feature of the dashboard.

**Implementation approach:**
- Add a section below the customer grid in `Dashboard.jsx`
- Call `getMostOverdueActions(customer, N)` for each customer in the list
- Collect all overdue actions, annotate with customer name and link
- Display as a compact table sorted by due date ascending
- Data already available in the `customers` query result (no new API needed)
- Effort: MEDIUM

### Feature 2: History Timeline View (HIGH VALUE)
**Why:** The app records weekly updates but provides no way to browse them. This is v2 requirement NAV-03. A user wanting to review "what happened 3 weeks ago" currently must edit the raw YAML. A read-only timeline would make historical data accessible.

**Implementation approach:**
- New view at `/customer/:id/history` or as a collapsible section in Customer Overview
- Read `customer.history` array (already in CustomerLayout context)
- Render as a vertical timeline with week_ending dates as headers
- Show workstream statuses, progress notes, decisions, outcomes per entry
- No new API — data already fetched via `getCustomer`
- New route in `main.jsx`, new link in Sidebar `NAV_LINKS`
- Effort: MEDIUM

### Feature 3: Inline Risk and Milestone Creation in Customer Overview (HIGH VALUE)
**Why:** The current "Add via YAML Editor" instruction is a dead end. Adding a risk or milestone requires: navigate to YAML Editor → manually type YAML → validate → save → navigate back. An inline add-row (matching the ActionManager pattern) would be dramatically more efficient.

**Implementation approach:**
- Add an "Add Risk" button that appends a new blank row to the risks table
- Clicking "Save" on the new row POSTs to a new `POST /api/customers/:id/risks` endpoint
- Same pattern for milestones: `POST /api/customers/:id/milestones`
- The sequential ID assignment (R-###, M-###) must be done server-side
- Risk/milestone POST endpoints not currently in routes — need to be added (similar to actions.js POST)
- Effort: LARGE (requires new server endpoints + client add-row pattern)

---

## Prioritized Improvement List

### Priority 1 — Safety/Completeness Gaps (SMALL-MEDIUM, must-fix)
| # | Improvement | View | Effort | Requirement |
|---|-------------|------|--------|-------------|
| 1 | YAML Editor navigate-away guard (useBlocker) | YAMLEditor | SMALL | YAML-04 |
| 2 | YAML Editor "saving strips comments" banner | YAMLEditor | SMALL | YAML-05 |
| 3 | Report Generator .txt download for Weekly Status | ReportGenerator | SMALL | RPT-05 |
| 4 | Fix `buildPanel()` group filter bug in reportGenerator.js | reportGenerator.js | SMALL | Data accuracy |
| 5 | Risk `owner` column missing in CustomerOverview RisksSection | CustomerOverview | SMALL | CUST-07 completeness |
| 6 | Fix ArtifactManager status cell (remove redundant badge) | ArtifactManager | SMALL | UX consistency |

### Priority 2 — Consistency (SMALL, polish)
| # | Improvement | View | Effort | Requirement |
|---|-------------|------|--------|-------------|
| 7 | Customer status dot in Sidebar customer list | Sidebar | SMALL | Discoverability |
| 8 | Loading skeleton for CustomerLayout (replace plain text) | CustomerLayout | SMALL | UX-01 |
| 9 | Remove duplicate InlineEditField/InlineSelectField from CustomerOverview.jsx (use shared imports) | CustomerOverview | SMALL | Maintainability |
| 10 | WeeklyUpdateForm: use shared `buildWeeklyFormPrefill` instead of local duplicate | WeeklyUpdateForm | SMALL | Code hygiene |
| 11 | WeeklyUpdateForm: "(carried from last update)" label on Decisions/Outcomes | WeeklyUpdateForm | SMALL | Discoverability |
| 12 | Fix `overallStatusLabel()` in reportGenerator.js to use `deriveOverallStatus()` | reportGenerator.js | SMALL | Data accuracy |

### Priority 3 — High-Value Features (MEDIUM-LARGE)
| # | Improvement | View | Effort | Requirement |
|---|-------------|------|--------|-------------|
| 13 | Overdue Actions roll-up panel on Dashboard | Dashboard | MEDIUM | UX-09, NAV-02 |
| 14 | History Timeline view (new route + Sidebar link) | New view | MEDIUM | UX-09, NAV-03 |
| 15 | Inline Risk creation in Customer Overview | CustomerOverview + server | LARGE | UX-08, UX-09, RISK-01 |
| 16 | Inline Milestone creation in Customer Overview | CustomerOverview + server | LARGE | UX-08, UX-09, MILE-01 |

### Priority 4 — Nice-to-Have (MEDIUM, deferred if time-constrained)
| # | Improvement | View | Effort | Requirement |
|---|-------------|------|--------|-------------|
| 17 | Collapsible workstream groups in WeeklyUpdateForm | WeeklyUpdateForm | MEDIUM | UX-02 |
| 18 | Action Manager: completed table sort by completed_date | ActionManager | SMALL | UX-03 |
| 19 | YAML Editor Validate button (YAML-02) | YAMLEditor | MEDIUM | YAML-02 |
| 20 | Unsaved-changes guard on WeeklyUpdateForm and ProjectSetup | WeeklyUpdateForm, ProjectSetup | SMALL each | UX consistency |

---

## Architecture Patterns

### Standard Stack (Confirmed from Codebase)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| React 19 | ^19 | UI framework | Active |
| React Router v7 | ^7 | Client routing, useBlocker hook | Active |
| TanStack Query v5 | ^5 | Server state, mutations, caching | Active |
| Tailwind v4 | ^4 | Styling — complete literal class strings only | Active |
| clsx | ^2 | Conditional className composition | Active (in ActionManager, ArtifactManager) |
| node:test | built-in | Server route tests | Active |

### Tailwind v4 Constraint (CRITICAL)
All new className values must be complete literal strings — NO dynamic construction:
```javascript
// WRONG — will be purged:
const cls = `bg-${color}-100 text-${color}-700`;

// CORRECT — complete literals:
const STATUS_CLASSES = {
  open: 'bg-blue-100 text-blue-700',
  delayed: 'bg-orange-100 text-orange-700',
};
```

### React Router useBlocker Pattern (for navigate-away guards)
```javascript
// Source: React Router v7 official docs
import { useBlocker } from 'react-router-dom';

const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    isDirty && currentLocation.pathname !== nextLocation.pathname
);

// Render confirmation UI when blocker.state === 'blocked'
if (blocker.state === 'blocked') {
  return (
    <div className="...confirmation dialog...">
      <button onClick={() => blocker.proceed()}>Leave anyway</button>
      <button onClick={() => blocker.reset()}>Stay</button>
    </div>
  );
}
```

### File Download Pattern (Browser)
The `downloadPptx` function in ReportGenerator.jsx demonstrates the correct pattern for triggering browser downloads from client-generated content:
```javascript
// For .txt download (no API call needed — content is already in-memory):
function downloadTxt(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### New Server Endpoint Pattern (POST risks/milestones)
Follows the same pattern as `actions.js` POST:
```javascript
// Source: server/routes/actions.js (established pattern)
router.post('/', asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const data = await readYamlFile(id);
  const existingIds = (data.risks ?? []).map(r => r.id).filter(Boolean);
  // assign next R-### ID server-side
  const nextId = assignNextId(existingIds, 'R');
  const newRisk = { id: nextId, ...req.body };
  data.risks = [newRisk, ...(data.risks ?? [])]; // or push depending on sort
  await writeYamlFile(id, data);
  res.status(201).json(newRisk);
}));
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Navigate-away guard | Custom window.onbeforeunload | React Router `useBlocker` | useBlocker integrates with SPA navigation; onbeforeunload only catches browser-level exits |
| File download | XMLHttpRequest or custom stream | Blob + URL.createObjectURL (already in codebase) | Already proven in `downloadPptx`; reuse the same pattern |
| Status dots in Sidebar | Custom CSS circle | `StatusDot` component pattern (same as CustomerOverview) | Already exists; extract to shared component |
| Loading skeleton | CSS keyframe animations from scratch | Tailwind `animate-pulse` on placeholder divs | Tailwind `animate-pulse` is the standard pattern |

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 Dynamic Class Construction
**What goes wrong:** Writing `className={\`bg-${status}-100\`}` — these classes are not in the CSS bundle at runtime.
**Why it happens:** Developer forgets the v4 constraint and uses dynamic string interpolation.
**How to avoid:** Always use a lookup object with complete literal strings. All existing STATUS_BADGE_CLASSES objects in the codebase demonstrate this pattern.
**Warning signs:** Class applies during development (JIT may catch it) but breaks in production.

### Pitfall 2: useBlocker Requires Active Route Context
**What goes wrong:** `useBlocker` throws if called outside a router context or in a component that isn't mounted under a `RouterProvider`.
**Why it happens:** Trying to add the blocker in a utility hook or context provider outside the route tree.
**How to avoid:** Call `useBlocker` directly inside the view component (YAMLEditor, WeeklyUpdateForm, ProjectSetup).

### Pitfall 3: CustomerOverview Duplicate InlineEditField
**What goes wrong:** Modifying the shared `InlineEditField` component doesn't affect CustomerOverview because it has its own local copy defined at lines 40-76.
**Why it happens:** The shared component was extracted in Phase 4 but CustomerOverview still has the original inline definition.
**How to avoid:** When adding Phase 6 improvements to risk/milestone editing, import from `'../components/InlineEditField'` and delete the local definitions.

### Pitfall 4: New Server Endpoints Must Be Mounted
**What goes wrong:** Adding `POST /risks` handler in `risks.js` but forgetting to add the route to `server/index.js`.
**Why it happens:** Express doesn't error on unused route files.
**How to avoid:** Check `server/index.js` after adding any new route handler; confirm it appears in the mounted routes list.

### Pitfall 5: Sequential ID Assignment for New Risks/Milestones
**What goes wrong:** Client assigns a local R-001 ID that conflicts with an existing one after another entry is added.
**Why it happens:** Client-side ID prediction on entities the server manages.
**How to avoid:** All ID assignment must be server-side, matching the pattern in `actions.js` POST (reads all existing IDs, finds max, increments). Never trust the client to generate R-### or M-### IDs.

---

## Code Examples

### Loading Skeleton Pattern (Tailwind animate-pulse)
```jsx
// Consistent skeleton for CustomerLayout loading state
function CustomerSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-6 animate-pulse">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-100 rounded w-32"></div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 h-40"></div>
    </div>
  );
}
```

### Status Dot in Sidebar (with STATUS_DOT_CLASSES)
```jsx
// Complete literal class strings — Tailwind v4 purge safe
const SIDEBAR_STATUS_DOT = {
  on_track:    'bg-green-500',
  at_risk:     'bg-yellow-400',
  off_track:   'bg-red-500',
  not_started: 'bg-gray-300',
};

// In the NavLink render:
<NavLink to={...}>
  <span className="flex items-center gap-2">
    <span className={`w-2 h-2 rounded-full shrink-0 ${SIDEBAR_STATUS_DOT[deriveOverallStatus(c)] ?? 'bg-gray-300'}`} />
    {c.customer?.name ?? c.fileId}
  </span>
</NavLink>
```

### Comments-Stripping Banner (YAML-05)
```jsx
// Separate from the existing structural-warning banner
<div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 shrink-0">
  <strong>Comments will be stripped on save.</strong>{' '}
  js-yaml does not preserve YAML comments when serializing.
  Copy any comments you want to keep before saving.
</div>
```

### .txt Download Button
```jsx
function DownloadTxtButton({ text, filename }) {
  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={handleDownload}
      className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600 transition-colors whitespace-nowrap"
    >
      ↓ Download .txt
    </button>
  );
}
```

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is REQUIRED.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, no install needed) |
| Config file | none — run directly via `node --test` |
| Quick run command | `cd server && node --test --test-reporter spec routes/*.test.js services/*.test.js` |
| Full suite command | `cd server && node --test --test-reporter spec routes/*.test.js services/*.test.js` |

Note: There is no client-side test infrastructure. All automated tests are server-side route integration tests using `supertest`. Client-side changes (UX polish) are verified manually.

### Phase 6 Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | Loading skeletons render (client-side) | manual | — | N/A |
| UX-02 | Empty states render (client-side) | manual | — | N/A |
| UX-03 | Breadcrumb/back-nav present (client-side) | manual | — | N/A |
| UX-04 | YAML Editor navigate-away blocker fires | manual | — | N/A |
| UX-05 | YAML Editor comments banner renders | manual | — | N/A |
| UX-06 | .txt download triggers browser save | manual | — | N/A |
| UX-07 | Dashboard overdue roll-up data is accurate | unit | `cd server && node --test routes/customers.test.js` | ✅ |
| UX-08 | POST /risks creates risk with R-### ID | integration | `cd server && node --test routes/risks.test.js` | ✅ (needs new test cases) |
| UX-08 | POST /milestones creates milestone with M-### ID | integration | `cd server && node --test routes/milestones.test.js` | ✅ (needs new test cases) |
| UX-09 | History Timeline view renders history entries | manual | — | N/A |
| UX-10 | Visual consistency (color, spacing, typography) | manual | — | N/A |

**Note on manual vs automated:** UX polish is inherently visual and interaction-based. Automated tests only apply to new server endpoints (POST risks, POST milestones) and to pure logic fixes (reportGenerator.js buildPanel fix). The majority of Phase 6 changes are client-side rendering changes that require manual browser verification.

### Sampling Rate
- **Per task commit:** `cd "/Users/jmiloslavsky/Documents/Project Assistant Code/server" && node --test --test-reporter spec routes/*.test.js services/*.test.js`
- **Per wave merge:** Same — full server test suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `server/routes/risks.test.js` — needs new test cases for `POST /` (create risk with R-### ID). File exists with existing PATCH tests.
- [ ] `server/routes/milestones.test.js` — needs new test cases for `POST /` (create milestone with M-### ID). File exists with existing PATCH tests.
- [ ] `client/src/lib/reportGenerator.test.js` — does NOT exist. For the `buildPanel()` bug fix, a unit test for `generateExternalELT` or `generateInternalELT` verifying that looking-ahead actions are matched to the correct workstream group would prevent regression. This is a Wave 0 stub.

*(All existing test files are present and passing; only new POST endpoints and the reportGenerator fix require new test coverage.)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all 8 view files, Sidebar.jsx, AppLayout.jsx, CustomerLayout.jsx, deriveCustomer.js, reportGenerator.js, api.js — findings are direct observations, not inferences
- React Router v7 `useBlocker` API — confirmed in codebase via existing import of `react-router-dom`; `useBlocker` was introduced in React Router v6.7 and is stable in v7

### Secondary (MEDIUM confidence)
- Phase 5 REQUIREMENTS.md confirms YAML-04 (navigate-away warning) and YAML-05 (comments banner) were specified but not implemented
- v2 REQUIREMENTS.md confirms NAV-02 (overdue roll-up), NAV-03 (history timeline), RISK-01, MILE-01 as known desired features

### Tertiary (LOW confidence)
- None — all claims are based on direct code inspection

---

## Metadata

**Confidence breakdown:**
- View-by-view gaps: HIGH — based on reading every source file, not inference
- Bug identification (buildPanel filter, overallStatusLabel): HIGH — confirmed by reading the exact comparison logic
- Missing requirement implementations (YAML-04, YAML-05, RPT-05): HIGH — confirmed by reading both requirements and code
- New feature recommendations: MEDIUM — effort estimates are engineering judgment; implementation details are based on existing patterns in the codebase

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable codebase; no fast-moving external dependencies for client changes)
