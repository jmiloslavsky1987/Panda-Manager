---
phase: 20-project-initiation-wizard
verified: 2026-03-26T17:30:00Z
status: human_needed
score: 11/11 automated must-haves verified
re_verification: false
human_verification:
  - test: "Open Dashboard and click 'New Project'"
    expected: "Full-screen Dialog opens with 5-step progress indicator in the header"
    why_human: "Cannot verify Dialog rendering, focus trap, and visual step indicator programmatically"
  - test: "Complete step 1 (fill Project Name + Customer, click Next), then close the wizard"
    expected: "Draft project appears in Dashboard grid immediately (router.refresh triggers re-fetch)"
    why_human: "Requires live Next.js router.refresh() behavior and Dashboard re-render — untestable statically"
  - test: "In step 2, drag a file named 'sow-draft.pdf' onto the upload zone"
    expected: "'SOW' checklist item becomes checked automatically"
    why_human: "HTML5 drag-and-drop interaction cannot be verified without a browser"
  - test: "Complete all 5 wizard steps including clicking 'Launch Project'"
    expected: "Project status changes to Active; browser navigates to /customer/[id]"
    why_human: "End-to-end flow requires live DB, API, and Next.js router — cannot verify statically"
  - test: "Navigate to Overview tab of any project with < 60% completeness"
    expected: "Yellow warning banner appears listing empty tab names as clickable links; clicking a link navigates to the correct workspace tab"
    why_human: "Requires live DB data and rendered link navigation — cannot verify programmatically"
---

# Phase 20: Project Initiation Wizard — Verification Report

**Phase Goal:** Build a 5-step project initiation wizard that allows creating new projects from scratch, uploading collateral documents for AI extraction, previewing/editing extracted data, and launching projects — plus completeness scoring on the Overview tab.
**Verified:** 2026-03-26T17:30:00Z
**Status:** human_needed (all automated checks pass; 5 items require human testing)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `projectStatusEnum` includes `'draft'`; projects table has description, start_date, end_date columns | VERIFIED | `db/schema.ts` line 29-34 and lines 95-97; migration `0016_wizard_schema.sql` confirmed |
| 2 | Dashboard query returns both `active` and `draft` projects | VERIFIED | `lib/queries.ts` line 259: `inArray(projects.status, ['active', 'draft'])`; all 11 raw SQL arms updated to `IN ('active', 'draft')` |
| 3 | POST /api/projects creates a draft project and returns `{ project: { id } }` with 201 | VERIFIED | `app/api/projects/route.ts` — status hardcoded to `'draft'`; test GREEN |
| 4 | PATCH /api/projects/[projectId] updates status and returns `{ ok: true }` | VERIFIED | `app/api/projects/[projectId]/route.ts` lines 35-59; launch test GREEN |
| 5 | ProjectWizard is a full-screen Dialog with 5-step progress header routing all 5 steps | VERIFIED | `components/ProjectWizard.tsx` — Dialog with `h-[90vh]`, WIZARD_STEPS strip, all 5 steps routed |
| 6 | BasicInfoStep calls POST /api/projects on valid submit; CollateralUploadStep calls /api/ingestion/upload | VERIFIED | `BasicInfoStep.tsx` line 62: `fetch('/api/projects', ...)`; `CollateralUploadStep.tsx` line 131: `fetch('/api/ingestion/upload', ...)` |
| 7 | ReviewItems accumulate via `[...prev, ...items]` — not replaced | VERIFIED | `AiPreviewStep.tsx` — ref-based accumulation pattern; `multi-file-accumulation` test GREEN |
| 8 | `buildEntityPayload` returns fields for known entity types; empty object for unknown | VERIFIED | `ManualEntryStep.tsx` lines 25-29; manual-entry tests GREEN |
| 9 | LaunchStep calls PATCH with `{ status: 'active' }` then navigates to /customer/[id] | VERIFIED | `LaunchStep.tsx` lines 50-58; `fetch('/api/projects/${projectId}', { method: 'PATCH', body: JSON.stringify({ status: 'active' }) })` then `router.push` |
| 10 | `computeCompletenessScore` and `getBannerData` return correct values; GET /api/projects/[projectId]/completeness returns score and tab lists | VERIFIED | `completeness/route.ts` — both pure functions exported; all 6 completeness/banner tests GREEN |
| 11 | Overview page shows completeness progress bar (always) and yellow warning banner below 60% with tab links | VERIFIED | `overview/page.tsx` — direct DB queries, `computeCompletenessScore` imported and called, Tailwind progress bar, `showBanner = score < 60 && emptyTabs.length > 0`, Link components to workspace tab paths |

**Score:** 11/11 automated truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bigpanda-app/tests/wizard/` (8 files) | All Wave 0 test stubs | VERIFIED | All 8 files exist; 27 tests all GREEN |
| `bigpanda-app/db/migrations/0016_wizard_schema.sql` | Draft enum + 3 project columns | VERIFIED | File exists; correct ALTER TYPE + ALTER TABLE statements |
| `bigpanda-app/db/schema.ts` | `projectStatusEnum` includes `draft`; description/start_date/end_date columns | VERIFIED | Lines 29-34 (enum), lines 95-97 (columns) |
| `bigpanda-app/lib/queries.ts` | `getActiveProjects` and `getDashboardData` include draft | VERIFIED | `inArray(['active','draft'])` at line 259; 11 SQL arms updated |
| `bigpanda-app/app/api/projects/route.ts` | POST handler creating draft project | VERIFIED | Substantive implementation; 29 lines; test GREEN |
| `bigpanda-app/app/api/projects/[projectId]/route.ts` | GET (existing) + PATCH for status update | VERIFIED | Both handlers present; PATCH returns `{ ok: true }` |
| `bigpanda-app/components/ProjectWizard.tsx` | Wizard container with all 5 steps routed | VERIFIED | 271 lines; Dialog shell, step state machine, all 5 step components wired |
| `bigpanda-app/components/wizard/BasicInfoStep.tsx` | Step 1 form with POST /api/projects | VERIFIED | 6-field form; fetch to /api/projects on submit; loading/error states |
| `bigpanda-app/components/wizard/CollateralUploadStep.tsx` | Step 2 checklist + upload; exports `matchCollateralCategory` | VERIFIED | 9-item checklist, drag-and-drop, fetch to /api/ingestion/upload; `matchCollateralCategory` exported |
| `bigpanda-app/components/wizard/AiPreviewStep.tsx` | Step 3 SSE extraction + ExtractionPreview | VERIFIED | SSE extraction per file, accumulation pattern, ExtractionPreview usage confirmed |
| `bigpanda-app/components/wizard/ManualEntryStep.tsx` | Step 4 tab-per-entity forms; exports `buildEntityPayload` | VERIFIED | 9 ENTITY_TABS, Add Row form, write-on-exit via entity routes; `buildEntityPayload` exported |
| `bigpanda-app/components/wizard/LaunchStep.tsx` | Step 5 launch button with PATCH + navigation | VERIFIED | PATCH to /api/projects/[projectId] with status:active, router.push to /customer/[id] |
| `bigpanda-app/components/NewProjectButton.tsx` | 'New Project' button wiring ProjectWizard | VERIFIED | `useState` dialog, ProjectWizard mounted with open/onOpenChange |
| `bigpanda-app/app/page.tsx` | Dashboard imports NewProjectButton | VERIFIED | Line 9 imports `NewProjectButton`; renders in header row |
| `bigpanda-app/app/api/projects/[projectId]/completeness/route.ts` | GET + `computeCompletenessScore` + `getBannerData` exports | VERIFIED | All three exported; 9-table query logic; 107 lines |
| `bigpanda-app/app/customer/[id]/overview/page.tsx` | Completeness bar + conditional warning banner | VERIFIED | Direct DB queries, progress bar always rendered, yellow banner when score < 60 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BasicInfoStep.tsx` | `/api/projects` | `fetch POST on form submit` | WIRED | Line 62: `fetch('/api/projects', { method: 'POST', ... })` |
| `CollateralUploadStep.tsx` | `/api/ingestion/upload` | `fetch POST FormData with projectId` | WIRED | Line 131: `fetch('/api/ingestion/upload', { method: 'POST', body: formData })` |
| `ProjectWizard.tsx` | `BasicInfoStep.tsx` | step routing on `state.step === 'basic-info'` | WIRED | Lines 195-199 in ProjectWizard.tsx |
| `AiPreviewStep.tsx` | `/api/ingestion/extract` | SSE fetch per artifactId | WIRED | Line 87: `fetch('/api/ingestion/extract', { method: 'POST', ... })` |
| `AiPreviewStep.tsx` | `ExtractionPreview.tsx` | direct component usage after extraction | WIRED | Line 5 import; line 277 usage `<ExtractionPreview ... />` |
| `LaunchStep.tsx` | `/api/projects/[projectId]` | PATCH fetch on Launch button click | WIRED | Lines 50-54: `fetch('/api/projects/${projectId}', { method: 'PATCH', body: JSON.stringify({ status: 'active' }) })` |
| `app/page.tsx` | `ProjectWizard.tsx` | state-controlled Dialog via `NewProjectButton` | WIRED | `NewProjectButton` imported at line 9; renders `<NewProjectButton />` in header |
| `overview/page.tsx` | `completeness/route.ts` | direct import of `computeCompletenessScore`, `getBannerData` | WIRED | Line 15: `import { computeCompletenessScore, getBannerData, type TableCounts }` from completeness route |
| `db/schema.ts` | `0016_wizard_schema.sql` | `ALTER TYPE project_status ADD VALUE 'draft'` | WIRED | Migration file aligns with schema enum; both present |
| `lib/queries.ts` | `db/schema.ts` | `inArray(projects.status, ['active', 'draft'])` | WIRED | Line 259 confirmed |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| WIZ-01 | 01, 03, 04, 06 | User can create a new project via a guided multi-step wizard from Dashboard | SATISFIED | ProjectWizard + NewProjectButton on Dashboard page; all 5 steps implemented |
| WIZ-02 | 01, 02, 03 | Wizard step 1 captures: name, customer, status, start/end date, description; creates project | SATISFIED | BasicInfoStep.tsx — all 6 fields; POST /api/projects creates with draft status |
| WIZ-03 | 03 | Wizard presents recommended collateral checklist + ingestion pipeline per file | SATISFIED | CollateralUploadStep.tsx — 9 COLLATERAL_CATEGORIES, upload to /api/ingestion/upload |
| WIZ-04 | 04 | AI extraction preview grouped by tab across all documents; user approves before DB write | SATISFIED | AiPreviewStep.tsx — ExtractionPreview with merged reviewItems; onApprove calls /api/ingestion/approve |
| WIZ-05 | 04 | Manual addition of items via inline forms per tab | SATISFIED | ManualEntryStep.tsx — 9 entity tabs, Add Row form, write-on-exit via entity routes |
| WIZ-06 | NONE | Time tracking configuration (weekly capacity, working days, submission due date, approver) | NOT IN SCOPE | WIZ-06 explicitly excluded from all plan `requirements` frontmatter; REQUIREMENTS.md marks it Pending. This requirement was not assigned to Phase 20 execution. |
| WIZ-07 | 01, 02, 04, 06 | Launch step shows completeness summary; Launch sets status Active | SATISFIED | LaunchStep.tsx — entity summary counts; PATCH to set status:'active' |
| WIZ-08 | 05 | Platform calculates Project Completeness Score 0-100% based on populated tabs | SATISFIED | `computeCompletenessScore(counts: TableCounts)` — 9-table logic; test GREEN |
| WIZ-09 | 05 | Completeness score visible on Overview tab; prompt when < 60% identifying gaps | SATISFIED | overview/page.tsx — always-visible progress bar; conditional yellow banner with tab links |

**WIZ-06 gap note:** WIZ-06 (time tracking wizard step) is intentionally deferred — it does not appear in any plan's `requirements` field across the entire phase. REQUIREMENTS.md marks it as Pending. This is an acknowledged gap, not an omission error.

---

## Anti-Patterns Found

No blocking anti-patterns detected. All `placeholder` occurrences in wizard files are HTML `<input placeholder="...">` UI attributes — not code stubs.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None | — | — |

---

## Test Results

```
Test Files  8 passed (8)
     Tests  27 passed (27)
  Duration  520ms
```

All 8 wizard test files GREEN. No regressions.

---

## Human Verification Required

### 1. Dashboard "New Project" Button + Dialog

**Test:** Open http://localhost:3000. Confirm "New Project" button in Dashboard header. Click it.
**Expected:** Full-screen Dialog opens with a 5-step horizontal progress indicator. Step 1 (Project Info) is active.
**Why human:** Dialog rendering, focus trap behavior, and visual step indicator appearance cannot be verified statically.

### 2. Draft Project Appears After Close

**Test:** Open wizard, complete step 1 (fill Project Name + Customer, click Next), then close the wizard via the X button.
**Expected:** The new draft project appears immediately in the Dashboard grid without a page refresh (router.refresh() triggers re-fetch).
**Why human:** Requires live Next.js router.refresh() and Dashboard re-render behavior — cannot verify without running the app.

### 3. Collateral Auto-Check on File Drop

**Test:** Advance to step 2. Drag a file named `sow-draft.pdf` onto the drop zone, then drag `kickoff-presentation.pptx`.
**Expected:** "SOW" and "Kickoff Deck" checklist items auto-check. Both files appear in the file list with status badges.
**Why human:** HTML5 drag-and-drop interaction cannot be simulated in static analysis.

### 4. Full Wizard Flow — Launch

**Test:** Complete all 5 steps. On step 4, add one manual Action item. On step 5, click "Launch Project".
**Expected:** Button shows "Launching…" while in flight. After success, browser navigates to /customer/[id]. Dashboard shows the project as Active (no longer Draft).
**Why human:** Requires live DB, API, and Next.js router navigation — end-to-end only verifiable at runtime.

### 5. Overview Tab Completeness Display

**Test:** Navigate to any project's Overview tab (especially one with sparse data). Then check a project with >= 60% completeness.
**Expected:** (a) Progress bar always visible showing "Project Completeness X%". (b) For score < 60%: yellow warning banner appears listing empty tab names as underlined links. (c) Clicking a link navigates to the correct workspace tab. (d) For score >= 60%: no banner.
**Why human:** Requires live DB data, rendered browser links, and navigation behavior — cannot verify programmatically.

---

## Gaps Summary

No automated gaps. All 11 automated must-haves verified. WIZ-06 is intentionally deferred (time tracking wizard step) — acknowledged in REQUIREMENTS.md as Pending, not assigned to this phase's plans. Phase goal is fully achieved for the 8 in-scope requirements (WIZ-01 through WIZ-05, WIZ-07, WIZ-08, WIZ-09).

The only remaining work is the 5 human verification items above — visual rendering, drag-and-drop interaction, full end-to-end wizard flow, and live Overview tab behavior.

---

_Verified: 2026-03-26T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
