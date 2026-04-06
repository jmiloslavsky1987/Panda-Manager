---
phase: 07-smart-data-flow-and-customer-onboarding
verified: 2026-03-06T03:45:00Z
status: approved
score: 5/5 must-haves verified
gap_fix: "Redirected dead /update link in CustomerOverview to /reports (commit f61bc2f)"
gaps:
  - truth: "Weekly Update form is removed as a standalone view with no orphaned links"
    status: partial
    reason: "WeeklyUpdateForm.jsx is deleted and the /update route is removed from main.jsx and Sidebar, but CustomerOverview.jsx still contains a dead 'Submit Update ->' link pointing to /customer/:id/update (a route that no longer exists)"
    artifacts:
      - path: "client/src/views/CustomerOverview.jsx"
        issue: "Lines 562-576 contain a Link to /customer/:customerId/update which is an unregistered route; clicking it will result in a React Router no-match / blank screen"
    missing:
      - "Remove the 'Weekly Update shortcut' section from CustomerOverview.jsx (lines 562-576) or redirect the link to /customer/:id/reports"
human_verification:
  - test: "New customer creation with YAML upload"
    expected: "Customer appears in sidebar immediately after creation; if YAML provided, customer data is seeded from it; if no YAML, template YAML is generated with all required top-level keys"
    why_human: "File upload and Drive write are browser interactions that cannot be verified programmatically"
  - test: "ArtifactManager type filter and new types"
    expected: "Filter dropdown shows all 10 types including workflow-decision, team-contact, backlog-item, integration-note; selecting a type filters the table; count in header updates"
    why_human: "UI rendering and filter behavior require a browser"
  - test: "WeeklyEntryForm inline in ReportGenerator"
    expected: "Selecting Weekly Customer Status shows the WeeklyEntryForm with per-workstream fields pre-filled from last history entry; Preview Report button drives generation; Save to history appears after generation"
    why_human: "Multi-step UI flow requires a browser"
  - test: "ELT deck timeline date picker"
    expected: "Selecting External ELT or Internal ELT reveals a date picker labeled 'Report as of date'; setting a date then generating shows only history/actions up to that date; changing the date and re-generating shows different data"
    why_human: "Date filtering effect on slide content requires a browser"
  - test: "ProjectSetup Customer Metadata auto-fill"
    expected: "Opening Project Setup for a customer with complete YAML shows pre-filled Customer Name, Project/Program Name, and Go-Live Date fields; editing and saving via 'Save Metadata' updates the YAML; sidebar customer name refreshes"
    why_human: "UI state initialization and Drive write require a browser"
---

# Phase 7: Smart Data Flow and Customer Onboarding — Verification Report

**Phase Goal:** The app handles the full customer lifecycle intelligently — new customers can be created with an optional YAML upload, artifacts are extended to capture all relevant notes (workflow decisions, team contacts, backlog items) with type-based grouping, the Weekly Update flow is consolidated into Reports for a single-entry-point workflow, ELT decks are pre-populated with timeline-scoped data, and Project Setup auto-fills from the initial YAML.

**Verified:** 2026-03-06
**Status:** gaps_found — 1 gap blocking MGT-03 goal completion (dead link to removed route)
**Re-verification:** No — initial verification

---

## Test Suite Result

Command: `node --test --test-reporter spec server/routes/*.test.js server/services/yamlService.test.js`

**Result: 67 pass, 0 fail, 0 todo, 0 skip — exit 0**

All POST /api/customers tests pass (3 tests), confirming MGT-01 server implementation is correct.

---

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | New customer creation: POST /api/customers accepts optional yamlContent; NewCustomer.jsx form exists with file upload; sidebar has "+ New" link; /new-customer route registered | VERIFIED | `server/routes/customers.js` POST handler at line 46 handles `yamlContent` base64 decode/parse/validate; `client/src/views/NewCustomer.jsx` exists with FileReader + btoa encoding; `Sidebar.jsx` line 47 has `<Link to="/new-customer">+ New</Link>`; `main.jsx` line 30 registers `{ path: 'new-customer', element: <NewCustomer /> }` |
| 2 | ArtifactManager supports 4 new artifact types (workflow-decision, team-contact, backlog-item, integration-note) with type filter dropdown | VERIFIED | `client/src/views/ArtifactManager.jsx` ARTIFACT_TYPE_OPTIONS has 10 entries (lines 17-28); typeFilter state and filteredArtifacts derived array at lines 42-76; filter dropdown renders at lines 91-108 with filtered/total count |
| 3 | WeeklyUpdateForm removed as standalone view; inline WeeklyEntryForm merged into ReportGenerator; no orphaned routes or nav links | PARTIAL (FAILED) | `WeeklyUpdateForm.jsx` file is gone (confirmed via glob search returning no results); `/update` route absent from `main.jsx`; "Weekly Update" absent from Sidebar `NAV_LINKS`; BUT `client/src/views/CustomerOverview.jsx` lines 562-576 contain a dead `<Link to={'/customer/${customerId}/update'}>Submit Update -></Link>` pointing to the removed route |
| 4 | ELT generators accept optional timelineDate parameter; history and action data is scoped to the selected date; date picker visible in ReportGenerator for ELT types | VERIFIED | `client/src/lib/reportGenerator.js` `generateExternalELT(customer, timelineDate = null)` at line 380 and `generateInternalELT(customer, timelineDate = null)` at line 553; `getHistoryUpTo` at line 175 and `getCompletedActionsUpTo` at line 182 filter by date; `ReportGenerator.jsx` shows date picker for ELT types at lines 497-514; `handleGenerate` passes `timelineDate || null` at lines 421-423 |
| 5 | ProjectSetup auto-fills customerName, projectName, goLiveDate from customer YAML on load; Save Metadata writes via PUT /api/customers/:id | VERIFIED | `client/src/views/ProjectSetup.jsx` lines 93-101 initialize state with lazy initializers `() => customer?.customer?.name ?? ''`, `() => customer?.project?.go_live_date ?? ''`, `() => customer?.project?.name ?? ''`; `metaMutation` at lines 104-126 calls `updateCustomer(customerId, body)`; both `['customer', customerId]` and `['customers']` query caches invalidated on success |

**Score: 4/5 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/routes/customers.js` | POST /api/customers with optional yamlContent | VERIFIED | 149-line file; full base64 decode → parse → validate → write verbatim path at lines 56-82; template builder fallback at lines 76-81 |
| `server/routes/customers.test.js` | 3 POST tests pass + 5 existing tests | VERIFIED | 191 lines; 3 POST describe block with real assertions (not todo stubs); all 8 tests pass per test runner output |
| `client/src/views/NewCustomer.jsx` | New customer form with optional YAML file upload | VERIFIED | 125-line file; name/projectName/goLiveDate fields; FileReader + btoa encoding; useMutation + queryClient.invalidateQueries + navigate on success |
| `client/src/views/ArtifactManager.jsx` | 10 artifact types + type filter dropdown | VERIFIED | ARTIFACT_TYPE_OPTIONS has 10 entries; typeFilter state; filteredArtifacts derived array; filter dropdown with All Types + 10 options; differentiated empty states |
| `client/src/views/ReportGenerator.jsx` | WeeklyEntryForm inline + ELT date picker | VERIFIED | WeeklyEntryForm component at lines 186-367; handleWeeklyDataReady callback at lines 430-435; timelineDate state + ELT date picker at lines 403, 497-514; Generate button gated to non-weekly types at line 517 |
| `client/src/views/ProjectSetup.jsx` | Customer Metadata card with auto-fill | VERIFIED | Customer Metadata card at lines 161-221; 3 lazy-initialized state variables; metaMutation saving via updateCustomer PUT |
| `client/src/lib/reportGenerator.js` | timelineDate filtering in ELT generators | VERIFIED | getHistoryUpTo and getCompletedActionsUpTo helpers; both ELT generators accept timelineDate=null parameter; open actions also filtered by due date when timelineDate set |
| `client/src/components/Sidebar.jsx` | "+ New" link present; Weekly Update absent; 6-entry NAV_LINKS | VERIFIED | NAV_LINKS has exactly 6 entries (Overview, Reports, Actions, Artifacts, Project Setup, YAML Editor); no Weekly Update or History link; "+ New" Link to /new-customer at lines 46-52 |
| `client/src/main.jsx` | /new-customer route registered; /update route removed; WeeklyUpdateForm import removed | VERIFIED | Line 15 imports NewCustomer; line 30 registers `{ path: 'new-customer', element: <NewCustomer /> }`; no import of WeeklyUpdateForm; no /update route in router config |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| NewCustomer.jsx | POST /api/customers | `postCustomer()` in api.js | WIRED | `api.js` line 23: `export const postCustomer = createCustomer`; `createCustomer` calls `apiFetch('/customers', { method: 'POST' })`; NewCustomer.jsx imports and calls `postCustomer` in useMutation |
| NewCustomer.jsx | customers cache | `queryClient.invalidateQueries({ queryKey: ['customers'] })` | WIRED | NewCustomer.jsx onSuccess at line 39 invalidates `['customers']` then navigates to new customer |
| ArtifactManager.jsx | filteredArtifacts | typeFilter state → derived array | WIRED | `filteredArtifacts = typeFilter === 'all' ? artifacts : artifacts.filter(a => a.type === typeFilter)` at lines 74-76; table body maps `filteredArtifacts` |
| ReportGenerator.jsx | WeeklyEntryForm | handleWeeklyDataReady callback | WIRED | WeeklyEntryForm receives `onDataReady={handleWeeklyDataReady}`; handleWeeklyDataReady sets reportData using mergedCustomer at lines 431-435 |
| ReportGenerator.jsx | postHistory | historyMutation | WIRED | historyMutation at lines 407-414 calls `postHistory(customerId, entry)`; triggered by "Save to history" button at line 579 |
| ReportGenerator.jsx | generateExternalELT / generateInternalELT | timelineDate state | WIRED | handleGenerate passes `timelineDate || null` at lines 421-423 |
| ProjectSetup.jsx | customer YAML fields | lazy state initializers | WIRED | All 3 metadata fields initialized from `customer?.customer?.name`, `customer?.project?.go_live_date`, `customer?.project?.name` via lazy initializers |
| ProjectSetup.jsx | PUT /api/customers/:id | updateCustomer via metaMutation | WIRED | metaMutation.mutationFn calls `updateCustomer(customerId, body)` at line 118; invalidates both customer and customers caches on success |
| CustomerOverview.jsx | /customer/:id/update | dead Link | NOT WIRED | Lines 562-576 link to `/customer/${customerId}/update` — route was removed from main.jsx; clicking navigates to a React Router no-match |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| MGT-01 | New customer creation with optional YAML upload to seed the customer file | SATISFIED | POST /api/customers handles base64 yamlContent; NewCustomer.jsx form complete; /new-customer route and Sidebar link present; 3 automated tests pass |
| MGT-02 | Notes and workflow decisions organized in Artifacts (extended types) | SATISFIED | ARTIFACT_TYPE_OPTIONS extended from 6 to 10 with workflow-decision, team-contact, backlog-item, integration-note; type filter dropdown functional |
| MGT-03 | WeeklyUpdateForm removed; inline weekly entry merged into Reports | PARTIAL | WeeklyUpdateForm.jsx deleted; /update route removed from router; Weekly Update absent from NAV_LINKS; WeeklyEntryForm inline in ReportGenerator with pre-fill and Save to history; BLOCKED by dead link in CustomerOverview.jsx to the removed /update route |
| MGT-04 | ELT decks get "report as of" date picker; history filtered by cutoff | SATISFIED | generateExternalELT/generateInternalELT accept timelineDate parameter; getHistoryUpTo and getCompletedActionsUpTo helpers filter by date; date picker UI visible for ELT types in ReportGenerator |
| MGT-05 | ProjectSetup pre-fills customerName, projectName, goLiveDate from YAML | SATISFIED | All 3 fields initialized with lazy state initializers from customer YAML; metaMutation saves via PUT /api/customers/:id; invalidates both customer and customers query caches |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `client/src/views/CustomerOverview.jsx` | 562-576 | Dead link to removed route `/customer/:id/update` | Blocker | Clicking "Submit Update ->" navigates to a route not registered in React Router; user sees blank screen or error; contradicts MGT-03 goal of a single-entry-point weekly workflow |

---

## Gaps Summary

**1 gap blocking goal achievement: Dead link to removed route in CustomerOverview.jsx**

The MGT-03 requirement states WeeklyUpdateForm should be removed as a standalone view and the weekly workflow consolidated into the Reports view. The file was deleted, the route was removed from the router, and the Sidebar nav link was removed — but the CustomerOverview.jsx "Weekly Update" shortcut section (lines 562-576) still contains a `<Link>` pointing to `/customer/${customerId}/update`, which no longer resolves to any route.

This is a user-visible breakage: clicking "Submit Update ->" from the Customer Overview page takes the user to a blank/error state instead of the Reports view. The fix is straightforward — either remove the shortcut section entirely or update the link to point to `/customer/${customerId}/reports`.

---

## Human Verification Required

### 1. New Customer Creation Flow (MGT-01)

**Test:** Click "+ New" in the Sidebar. Enter a customer name. Click "Create Customer". Verify customer appears in the sidebar.

**Expected:** Customer appears in sidebar immediately after creation (TanStack Query cache invalidated on success); navigated to `/customer/<new-fileId>`.

**Why human:** File upload is a browser interaction; Drive write cannot be verified without live Google Drive service account.

### 2. New Customer with YAML Seed (MGT-01)

**Test:** Click "+ New". Enter a customer name. Upload a valid YAML file. Click "Create Customer".

**Expected:** Customer is seeded from the uploaded YAML data (not the template); customer appears in sidebar.

**Why human:** FileReader + btoa encoding behavior and Drive write require a browser with live credentials.

### 3. ArtifactManager Extended Types + Filter (MGT-02)

**Test:** Open Artifact Manager for a customer. Use the "Filter by type" dropdown to select "Workflow Decision". Add a new artifact with type "Team Contact". Verify filter and count update correctly.

**Expected:** Filter hides non-matching artifacts; header count shows "N of M artifacts (type)"; new type visible in Add Artifact row dropdown.

**Why human:** UI rendering and interactive filter require a browser.

### 4. WeeklyEntryForm Pre-fill and Save to History (MGT-03)

**Test:** Go to Reports. Click "Weekly Customer Status". Verify form appears pre-filled. Edit fields. Click "Preview Report". Verify report generates using form data. Click "Save to history".

**Expected:** Form pre-fills from buildWeeklyFormPrefill (last history entry context); report reflects edited values; Save to history persists entry to YAML; "Saved!" flash appears.

**Why human:** Multi-step UI flow with pre-fill logic and Drive write require a browser.

### 5. ELT Timeline Date Filtering (MGT-04)

**Test:** Go to Reports. Click "External ELT Deck". Observe date picker appears labeled "Report as of date". Set a historical date. Click "Preview Report". Note slide content. Change date. Re-generate. Compare.

**Expected:** Date picker present for ELT types only; slides contain only history/actions up to the selected date; changing date changes output.

**Why human:** Visual slide content comparison requires a browser.

### 6. ProjectSetup Customer Metadata Auto-Fill (MGT-05)

**Test:** Open Project Setup for a customer with a complete YAML. Verify Customer Name, Project/Program Name, and Go-Live Date fields are pre-filled. Edit one field. Click "Save Metadata". Verify sidebar customer name updates.

**Expected:** All three fields pre-filled from YAML on load; saving updates YAML via PUT; sidebar refreshes with new name.

**Why human:** UI state initialization from outlet context and Drive write require a browser.

---

_Verified: 2026-03-06_
_Verifier: Claude (gsd-verifier)_
