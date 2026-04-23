---
phase: 76-pickers-risk-fields
verified: 2026-04-22T00:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 76: Pickers & Risk Fields Verification Report

**Phase Goal:** Add FK-based stakeholder pickers to all four entity tables; add blocked-by and milestone pickers to TaskEditModal; add blocked/milestone indicators on Task Board cards and WBS rows; add Likelihood, Impact, Target Date fields to RiskEditModal with auto-computed Risk Score badge; close the multi-tenant security gap in POST /api/tasks-bulk.
**Verified:** 2026-04-22
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can click the owner field on a Task, Action, Risk, or Milestone and select a stakeholder from a searchable dropdown; the saved record stores the stakeholder FK (owner_id), not just owner text | VERIFIED | `OwnerCell.tsx`: new interface accepts `ownerId` prop; `onSave` callback receives `{ ownerId, ownerName }`. All four table clients pass `ownerId={entity.owner_id}` and send `owner_id` in PATCH. |
| 2 | User can type a name not in the list; a new stakeholder is auto-created and the FK is set; a toast confirms the auto-creation | VERIFIED | `OwnerCell.tsx` lines 82-109: on blur with no match, POSTs to `/api/stakeholders`, fires `toast.success(...)`, calls `onSave` with returned `newRow.id`. |
| 3 | Selecting a blank/null value clears owner_id to null on the record | VERIFIED | `OwnerCell.tsx` lines 52-62: empty `typedValue` path calls `onSave({ ownerId: null, ownerName: '' })`. |
| 4 | User opens TaskEditModal and sees a searchable single-select 'Blocked By' dropdown showing task titles (not raw IDs) from the same project, filtered to non-done tasks only | VERIFIED | `TaskEditModal.tsx` lines 62-77: `useEffect` fetches `/api/tasks?projectId=${projectId}`, filters `status !== 'done'` and `id !== task?.id`; renders `<select>` with task titles at lines 293-302. |
| 5 | User opens TaskEditModal and sees a searchable 'Linked Milestone' dropdown showing milestone names from the same project | VERIFIED | `TaskEditModal.tsx` lines 62-77: fetches `/api/projects/${projectId}/milestones`, stores names; renders `<select>` with milestone names at lines 306-319. |
| 6 | Task cards on the Task Board show a red 'Blocked' badge when their blocking task has status != 'done' | VERIFIED | `TaskBoard.tsx` lines 209-212: `{task.is_blocked && <span className="... bg-red-100 text-red-700 ...">Blocked</span>}`. `is_blocked` is server-computed by `getTasksForProject`. |
| 7 | Task cards on the Task Board show the linked milestone name as a small label below the title when milestone_id is set | VERIFIED | `TaskBoard.tsx` lines 193-195: `{task.milestone_name && <span className="text-xs text-zinc-500 mt-0.5 block pl-6">{task.milestone_name}</span>}`. |
| 8 | WBS rows show the same blocked indicator when the task linked to that row has an unresolved blocker | VERIFIED | `WbsTree.tsx`: computes `blockedPhases` Set from tasks prop (lines 56-63). `WbsNode.tsx` lines 63, 279-283: `hasBlockedTask = blockedPhases?.has(node.name.toLowerCase())` renders red "Blocked" badge. |
| 9 | Selecting no blocker (clear) sets blocked_by to null | VERIFIED | `TaskEditModal.tsx` line 102: `blocked_by: form.blocked_by ? parseInt(form.blocked_by, 10) : null` in submit payload; `<select>` has `<option value="">— none —</option>`. |
| 10 | User can set Likelihood (Low / Medium / High) on a risk via the RiskEditModal | VERIFIED | `RiskEditModal.tsx` lines 26, 113-125: `likelihood` state initialized from `risk.likelihood`, rendered as `<select id="risk-likelihood">` with Low/Medium/High options. Sent in `handleSave`. |
| 11 | User can set Impact (Low / Medium / High) on a risk via the RiskEditModal | VERIFIED | `RiskEditModal.tsx` lines 27, 127-140: same pattern as Likelihood. |
| 12 | User can set Target Date on a risk via the RiskEditModal | VERIFIED | `RiskEditModal.tsx` lines 28, 142-151: `targetDate` state, `<input type="date">`, sent in `handleSave`. |
| 13 | Risk list table shows a Risk Score badge column — score is auto-computed from Likelihood x Impact, never stored in DB | VERIFIED | `RisksTableClient.tsx` line 342: `<TableHead>Risk Score</TableHead>`; lines 396-405: IIFE calls `computeRiskScore(risk.likelihood, risk.impact)`, renders colored badge or dash. No score column in DB schema. |
| 14 | POST /api/tasks-bulk only updates tasks that belong to a project the authenticated user is a member of | VERIFIED | `app/api/tasks-bulk/route.ts` lines 53-64: looks up first task's `project_id`, calls `requireProjectRole(firstTask.project_id, 'user')`, returns auth redirect if denied; wraps update in transaction with `SET LOCAL`. 10 tests in `tasks-bulk.test.ts` cover success, 403, 404, 422. |

**Score: 14/14 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/OwnerCell.tsx` | FK-based stakeholder picker with auto-create | VERIFIED | New `OwnerCellProps` with `ownerId` + `onSave({ownerId, ownerName})`; blur logic handles null/match/auto-create; 141 lines, substantive |
| `app/api/stakeholders/route.ts` | GET + POST endpoints for stakeholder list | VERIFIED (pre-existing) | Callers confirmed using `GET /api/stakeholders?project_id=N` and `POST /api/stakeholders` |
| `lib/queries.ts` | `TaskWithBlockedStatus` type + updated `getTasksForProject` | VERIFIED | Lines 473-525: interface extends `Task` with `is_blocked: boolean` and `milestone_name: string | null`; left-join on milestones, in-memory `is_blocked` computation |
| `components/TaskEditModal.tsx` | Blocked-by + milestone searchable pickers; owner_id in form state | VERIFIED | `useEffect` fetch on open; single-select dropdowns with task titles / milestone names; `owner_id` in `emptyForm` and submit payload |
| `components/TaskBoard.tsx` | Blocked badge + milestone name label on task cards | VERIFIED | `task.is_blocked` badge (lines 209-213); `task.milestone_name` label (lines 193-195); typed as `TaskWithBlockedStatus[]` |
| `components/WbsTree.tsx` | Optional `tasks` prop; `blockedPhases` computed | VERIFIED | `WbsTreeProps` has `tasks?: TaskWithBlockedStatus[]`; `blockedPhases` useMemo (lines 56-63) passed to `WbsNode` |
| `components/WbsNode.tsx` | `blockedPhases` prop; "Blocked" badge | VERIFIED | `blockedPhases?: Set<string>` in `WbsNodeProps`; `hasBlockedTask` computed from it; badge rendered (lines 279-283); propagated to recursive children (line 348) |
| `lib/risk-score.ts` | Pure function `computeRiskScore` | VERIFIED | 26 lines; exports `RiskScoreResult` + `computeRiskScore`; correct WEIGHT map and label/color branching |
| `lib/risk-score.test.ts` | TDD test coverage for all score combos | VERIFIED | 14 test cases covering null/undefined, all score combinations, case-insensitivity |
| `components/RiskEditModal.tsx` | Likelihood + Impact + Target Date fields | VERIFIED | Three new state vars; three new form elements; all sent in `handleSave` payload |
| `components/RisksTableClient.tsx` | Risk Score badge column; owner_id wired in OwnerCell | VERIFIED | Imports `computeRiskScore`; "Risk Score" `<TableHead>`; IIFE cell; `ownerId={risk.owner_id}` in OwnerCell |
| `app/api/risks/[id]/route.ts` | PATCH schema accepts likelihood, impact, target_date, owner_id | VERIFIED | Lines 8-17: `patchSchema` has all four fields; lines 75-79: patch object build includes them |
| `app/api/tasks/[id]/route.ts` | TaskPatchSchema accepts owner_id | VERIFIED | Line 15: `owner_id: z.number().nullable().optional()` |
| `app/api/actions/[id]/route.ts` | ActionPatchSchema accepts owner_id | VERIFIED | Line 16: `owner_id: z.number().nullable().optional()` |
| `app/api/milestones/[id]/route.ts` | patchSchema accepts owner_id | VERIFIED | Line 12: `owner_id: z.number().nullable().optional()` |
| `app/api/tasks-bulk/route.ts` | POST enforces project membership before update | VERIFIED | Lines 52-76: task lookup → requireProjectRole → transaction with SET LOCAL |
| `app/api/__tests__/tasks-bulk.test.ts` | 10 tests covering security, auth, validation | VERIFIED | Full test suite with success, 403, 404, 422, 400, 401 scenarios |
| `app/customer/[id]/wbs/page.tsx` | Imports + passes tasks to WbsTree; `force-dynamic` | VERIFIED | Line 7: `export const dynamic = 'force-dynamic'`; line 20: `getTasksForProject(projectId)` in `Promise.all`; line 32: `tasks={tasks}` on WbsTree |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `components/OwnerCell.tsx` | `/api/stakeholders` | `fetch('/api/stakeholders?project_id=...')` GET + `fetch('/api/stakeholders', {method:'POST',...})` | WIRED | Lines 36-39 (GET on edit open); lines 85-95 (POST auto-create) |
| `ActionsTableClient.tsx` + `MilestonesTableClient.tsx` + `RisksTableClient.tsx` | `components/OwnerCell.tsx` | `ownerId={entity.owner_id}` + `onSave({ownerId,ownerName})` | WIRED | All three clients confirmed passing `ownerId` and spreading `owner_id` into PATCH payload |
| `components/TaskEditModal.tsx` | `/api/tasks?projectId=N` + `/api/projects/{id}/milestones` | `useEffect` fetch on modal open | WIRED | Lines 64-66: both fetches in `Promise.all` |
| `app/customer/[id]/tasks/page.tsx` | `lib/queries.ts getTasksForProject` | Server component calls query, passes `TaskWithBlockedStatus[]` to TaskBoard | WIRED | Confirmed via TaskBoard prop type `TaskWithBlockedStatus[]` and WbsPage usage |
| `components/RisksTableClient.tsx` | `lib/risk-score.ts` | `import { computeRiskScore }` + called per row | WIRED | Line 22 import; line 398 call per-cell IIFE |
| `components/RiskEditModal.tsx` | `app/api/risks/[id]` | PATCH with `{likelihood, impact, target_date}` on Save | WIRED | Lines 36-47 in `handleSave`; PATCH schema confirmed accepting all three |
| `app/api/tasks-bulk/route.ts POST` | db tasks table | `requireProjectRole` checked against tasks' actual `project_id` before update | WIRED | Lines 53-64: lookup → auth check → transaction update |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PICK-01 | 76-01 | FK-based owner picker on Tasks, Actions, Risks, Milestones | SATISFIED | `OwnerCell.tsx` new interface; all four entity table callers pass `owner_id`; all PATCH routes accept it |
| PICK-02 | 76-01 | Free-text fallback auto-creates stakeholder | SATISFIED | `OwnerCell.tsx` blur case 3: POST auto-create with toast |
| PICK-03 | 76-02 | Blocked-by searchable picker showing task titles | SATISFIED | Single-select per locked CONTEXT.md decision (supersedes multi-select text in requirement); task titles shown in dropdown |
| PICK-04 | 76-02 | Link task to milestone via searchable dropdown showing milestone names | SATISFIED | `TaskEditModal.tsx` milestone `<select>` shows names; `task.milestone_name` visible on Task Board cards |
| PICK-05 | 76-02 (primary) | Blocked indicator on Task Board and WBS views for unresolved blockers | SATISFIED | `TaskBoard.tsx` `is_blocked` badge; `WbsNode.tsx` "Blocked" badge via `blockedPhases` Set |
| RISK-01 | 76-03 | Likelihood (Low/Medium/High) settable on risks | SATISFIED | `RiskEditModal.tsx` Likelihood dropdown; PATCH schema accepts `likelihood` |
| RISK-02 | 76-03 | Impact (Low/Medium/High) settable on risks | SATISFIED | `RiskEditModal.tsx` Impact dropdown; PATCH schema accepts `impact` |
| RISK-03 | 76-03 | Target Date settable on risks | SATISFIED | `RiskEditModal.tsx` Target Date date input; PATCH schema accepts `target_date` |
| RISK-04 | 76-03 | Auto-computed Risk Score in risk list | SATISFIED | `computeRiskScore` pure function; colored badge column in `RisksTableClient.tsx`; never stored in DB |

**Note on PICK-05 dual-claim:** Plan 76-02 and Plan 76-04 both list PICK-05 in their `requirements` frontmatter. The actual PICK-05 requirement text ("blocked indicator on Task Board and WBS views") matches Plan 76-02's implementation. Plan 76-04's work (tasks-bulk security hardening) corresponds to the phase goal narrative but has no distinct requirement ID in REQUIREMENTS.md. This is a documentation inconsistency in the plan frontmatter, not an implementation gap — both deliverables are fully implemented.

---

### Anti-Patterns Found

No blockers or stubs found in phase 76 production files.

| File | Pattern | Severity | Notes |
|------|---------|----------|-------|
| `components/OwnerCell.tsx` line 39 | `.catch(() => {})` | Info | Intentional — documented as acceptable fallback; datalist failure non-critical |
| All `placeholder="..."` attributes | HTML input placeholder | Info | Legitimate UI placeholder text, not stub implementations |

---

### TypeScript Compilation

All errors are in pre-existing test files that were out of scope before phase 76 began:
- `__tests__/lifecycle/archive.test.ts` — pre-existing
- `__tests__/lifecycle/delete.test.ts` — pre-existing
- `__tests__/lifecycle/restore.test.ts` — pre-existing
- `__tests__/skills/front-matter-strip.test.ts` — pre-existing
- `lib/__tests__/require-project-role.test.ts` — pre-existing
- `tests/audit/discovery-approve-audit.test.ts` — pre-existing

Zero TypeScript errors in any production source file modified by phase 76.

---

### Human Verification Required

#### 1. Owner Picker Dropdown UX

**Test:** Navigate to any project's Actions tab. Click an owner cell. Type 3 characters. Verify the datalist suggestions appear with stakeholder names from the project.
**Expected:** Native browser autocomplete shows matching stakeholder names. On blur with a known name, no new stakeholder is created. On blur with an unknown name, a sonner toast confirms "New stakeholder 'X' created".
**Why human:** Browser datalist rendering and UX timing cannot be verified programmatically.

#### 2. Blocked Badge Disappears When Blocker Resolved

**Test:** Create Task A blocking Task B. Verify Task B shows "Blocked" badge on the Task Board. Mark Task A as "done". Refresh. Verify the badge disappears from Task B.
**Expected:** Badge shown before, gone after — because `is_blocked` is recomputed server-side on each page load.
**Why human:** Requires live DB state change and browser refresh cycle.

#### 3. Risk Score Visual Accuracy

**Test:** Open any risk in RiskEditModal. Set Likelihood=High, Impact=High. Save. Verify the Risk Score column shows "9 — Critical" in a red badge.
**Expected:** Red badge with "9 — Critical" text. Set Likelihood=Low, Impact=Low → green badge "1 — Low".
**Why human:** Requires DB write + page refresh + visual badge color verification.

#### 4. Milestone Name Label on Task Board

**Test:** Find or create a task linked to a milestone. View it on the Task Board.
**Expected:** Milestone name appears as a small grey text label below the task title.
**Why human:** Requires live data with a milestone_id set.

#### 5. WBS Blocked Badge

**Test:** Navigate to a project WBS page where a task has `phase = "Build"` and an unresolved blocker. Verify the "Build" WBS row shows a "Blocked" badge.
**Expected:** Red "Blocked" badge inline with the WBS item name.
**Why human:** Requires matching phase text between task and WBS item name.

---

### Gaps Summary

No gaps found. All 14 observable truths are verified against the codebase. All required artifacts exist, are substantive (not stubs), and are wired to their consumers. All 9 requirement IDs (PICK-01 through PICK-05, RISK-01 through RISK-04) are satisfied by implemented code. The phase goal is fully achieved.

---

_Verified: 2026-04-22_
_Verifier: Claude (gsd-verifier)_
