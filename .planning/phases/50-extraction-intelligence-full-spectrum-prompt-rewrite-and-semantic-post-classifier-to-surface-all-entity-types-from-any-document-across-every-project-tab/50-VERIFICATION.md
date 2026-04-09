---
phase: 50-extraction-intelligence-full-spectrum-prompt-rewrite-and-semantic-post-classifier-to-surface-all-entity-types-from-any-document-across-every-project-tab
verified: 2026-04-09T10:03:00Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: "Approving a team entity does not fail with wrong-table FK or constraint errors"
    status: partial
    reason: "insertItem case correctly uses teamOnboardingStatus, but updateItem and deleteItem cases still reference focusAreas table (lines 1074-1089, 1301-1315)"
    artifacts:
      - path: "bigpanda-app/app/api/ingestion/approve/route.ts"
        issue: "updateItem case 'team' queries focusAreas instead of teamOnboardingStatus (line 1075)"
      - path: "bigpanda-app/app/api/ingestion/approve/route.ts"
        issue: "deleteItem case 'team' queries focusAreas instead of teamOnboardingStatus (line 1302)"
    missing:
      - "Update updateItem case 'team' to query/update teamOnboardingStatus instead of focusAreas"
      - "Update deleteItem case 'team' to query/delete teamOnboardingStatus instead of focusAreas"
---

# Phase 50: Extraction Intelligence Verification Report

**Phase Goal:** Close all 6 extraction pipeline gaps introduced by phases 45-48 so every entity type has a working end-to-end path: extraction prompt → staged item → user approval → correct DB table.

**Verified:** 2026-04-09T10:03:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Uploading a document with team data routes to teamOnboardingStatus, not focusAreas | ✓ VERIFIED | insertItem case 'team' uses tx.insert(teamOnboardingStatus) (line 539); findConflict case 'team' queries teamOnboardingStatus (lines 237-238); isAlreadyIngested case 'team' in extraction-types.ts queries teamOnboardingStatus |
| 2 | Architecture extraction populates the integration_group column (no longer NULL) | ✓ VERIFIED | insertItem case 'architecture' includes integration_group: f.integration_group ?? null (line 568) |
| 3 | Approving a team entity does not fail with wrong-table FK or constraint errors | ⚠️ PARTIAL | insertItem works correctly, but updateItem (lines 1074-1089) and deleteItem (lines 1301-1315) cases still reference focusAreas table — update/delete operations will fail with wrong table |
| 4 | Approving a focus_area entity commits to the focusAreas table with all 7 fields | ✓ VERIFIED | insertItem case 'focus_area' exists (lines 841-863); includes all 7 fields: title, tracks, why_it_matters, current_status, next_step, bp_owner, customer_owner; Zod enum includes 'focus_area' (line 43) |
| 5 | Approving an e2e_workflow entity commits parent row to e2eWorkflows and child rows to workflowSteps in a single transaction | ✓ VERIFIED | insertItem case 'e2e_workflow' exists (lines 865-910); uses db.transaction with parent insert (e2eWorkflows) then child inserts (workflowSteps); JSON parse with fallback to empty array |
| 6 | focus_area and e2e_workflow dedup prevents duplicate extraction | ✓ VERIFIED | isAlreadyIngested case 'focus_area' queries focusAreas.title with ilike (lines 344-357); case 'e2e_workflow' uses composite key (workflow_name + team_name) dedup (lines 359-374) |

**Score:** 5/6 truths verified (Truth 3 is partial — create path works, update/delete paths broken)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/__tests__/ingestion-approve.test.ts` | RED integration test stubs for gaps 1-4 | ✓ VERIFIED | File exists; 4 tests pass (Gap 1: team entity, Gap 2: architecture integration_group, Gap 3: focus_area, Gap 4: e2e_workflow) |
| `lib/__tests__/extraction-types.test.ts` | RED unit test stubs for gaps 5a-5b | ✓ VERIFIED | File exists; 4 tests pass (focus_area dedup, e2e_workflow dedup) |
| `app/api/ingestion/approve/route.ts` | Fixed team handler (teamOnboardingStatus) + architecture integration_group field | ⚠️ PARTIAL | insertItem fixed correctly; architecture integration_group added; BUT updateItem and deleteItem cases for 'team' still reference focusAreas |
| `lib/extraction-types.ts` | EntityType union includes focus_area and e2e_workflow; isAlreadyIngested dedup cases | ✓ VERIFIED | EntityType union extended (lines 55-56); isAlreadyIngested case 'focus_area' (lines 344-357) and case 'e2e_workflow' (lines 359-374) exist |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| approve/route.ts insertItem case 'team' | teamOnboardingStatus table | tx.insert(teamOnboardingStatus) | ✓ WIRED | Line 539 uses correct table |
| approve/route.ts insertItem case 'architecture' | architectureIntegrations.integration_group | integration_group: f.integration_group ?? null | ✓ WIRED | Line 568 includes field |
| approve/route.ts insertItem case 'focus_area' | focusAreas table | tx.insert(focusAreas) with 7 fields | ✓ WIRED | Lines 843-851 write all fields |
| approve/route.ts insertItem case 'e2e_workflow' | e2eWorkflows + workflowSteps tables | db.transaction with parent + child inserts | ✓ WIRED | Lines 879-896 use single transaction |
| lib/extraction-types.ts isAlreadyIngested case 'focus_area' | focusAreas.title | ilike prefix match | ✓ WIRED | Lines 348-349 query correct table |
| lib/extraction-types.ts isAlreadyIngested case 'e2e_workflow' | e2eWorkflows by workflow_name + team_name | composite key with ilike | ✓ WIRED | Lines 364-370 use both fields |
| approve/route.ts updateItem case 'team' | teamOnboardingStatus table | SHOULD query/update teamOnboardingStatus | ✗ NOT_WIRED | Line 1075 still queries focusAreas (wrong table) |
| approve/route.ts deleteItem case 'team' | teamOnboardingStatus table | SHOULD query/delete teamOnboardingStatus | ✗ NOT_WIRED | Line 1302 still queries focusAreas (wrong table) |

### Requirements Coverage

No requirement IDs were specified in the phase or plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| app/api/ingestion/approve/route.ts | 1075 | Wrong table reference in updateItem case 'team' | 🛑 Blocker | Updating a team entity will fail with FK constraint error (queries focusAreas instead of teamOnboardingStatus) |
| app/api/ingestion/approve/route.ts | 1302 | Wrong table reference in deleteItem case 'team' | 🛑 Blocker | Deleting a team entity will fail with FK constraint error (queries focusAreas instead of teamOnboardingStatus) |
| app/api/ingestion/approve/route.ts | 708-709 | Incorrect comment about wbs_task description field | ℹ️ Info | Comment says "wbs_items schema does NOT have a description column" — this is accurate; Plan 03 SUMMARY incorrectly claims field was added, but schema check confirms it doesn't exist |

### Human Verification Required

Plan 03 includes a human verification checkpoint (Task 2). According to SUMMARY 50-03, user performed verification and responded "approved". However, the updateItem/deleteItem gap was not caught during that verification (likely because update/delete paths are less frequently used than create).

#### 1. Team Entity Update/Delete Path

**Test:** Upload a document with team data, approve it, then try to update or delete the team entity via re-approval or staging interface
**Expected:** Update and delete operations should succeed without FK constraint errors
**Why human:** The insertItem path works (automated tests pass), but updateItem/deleteItem paths are broken (wrong table reference) — this requires manual testing of the full approval workflow

### Gaps Summary

**Primary gap:** The team entity routing fix (Gap 1) is incomplete. While the insertItem case correctly routes to teamOnboardingStatus, the updateItem and deleteItem cases still reference the wrong table (focusAreas). This means:

- ✓ Creating a new team entity works correctly
- ✗ Updating an existing team entity will fail with FK errors
- ✗ Deleting a team entity will fail with FK errors

**Root cause:** Gap 1 fix in Plan 01 only addressed insertItem, findConflict, and isAlreadyIngested. The updateItem and deleteItem functions were not reviewed or updated.

**Impact:** Users who upload documents with team data can approve them once, but subsequent operations (update via re-approval, delete) will fail. This blocks the full lifecycle management of team entities extracted from documents.

**Severity:** 🛑 Blocker — The phase goal is "every entity type has a working end-to-end path" including approval. Update and delete are part of the approval workflow (when a staged item matches an existing record, user can choose to update or delete).

---

_Verified: 2026-04-09T10:03:00Z_
_Verifier: Claude (gsd-verifier)_
