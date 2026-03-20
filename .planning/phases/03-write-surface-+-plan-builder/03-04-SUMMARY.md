---
phase: 03-write-surface-+-plan-builder
plan: "04"
subsystem: write-surface
tags: [modals, api-routes, risks, milestones, stakeholders, inline-edit]
dependency_graph:
  requires: [03-02, 03-03]
  provides: [risk-edit-modal, milestone-edit-modal, stakeholder-edit-modal, risks-api, milestones-api, stakeholders-api]
  affects: [risks-tab, milestones-tab, stakeholders-tab]
tech_stack:
  added: []
  patterns: [shadcn-dialog, fetch-patch, router-refresh, optimistic-ui, append-only-mitigation]
key_files:
  created:
    - bigpanda-app/components/RiskEditModal.tsx
    - bigpanda-app/components/MilestoneEditModal.tsx
    - bigpanda-app/components/StakeholderEditModal.tsx
    - bigpanda-app/app/api/risks/[id]/route.ts
    - bigpanda-app/app/api/milestones/[id]/route.ts
    - bigpanda-app/app/api/stakeholders/route.ts
    - bigpanda-app/app/api/stakeholders/[id]/route.ts
  modified:
    - bigpanda-app/app/customer/[id]/risks/page.tsx
    - bigpanda-app/app/customer/[id]/milestones/page.tsx
    - bigpanda-app/app/customer/[id]/stakeholders/page.tsx
decisions:
  - "Risk mitigation is append-only in both UI and API: new text is date-prefixed and appended, never replacing existing mitigation history"
  - "StakeholderEditModal dual-mode: create (no stakeholder prop) vs edit (with prop) — single component for both operations"
  - "Severity state typed as literal union ('low'|'medium'|'high'|'critical') to match Drizzle enum inference"
metrics:
  duration: "4min"
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_changed: 10
---

# Phase 3 Plan 4: Risk, Milestone, and Stakeholder Edit Modals Summary

Inline editing modals and API routes for Risks, Milestones, and Stakeholders tabs — shadcn Dialog, fetch PATCH/POST, router.refresh() optimistic UI following the ActionEditModal pattern from 03-03.

## Tasks Completed

### Task 1: Risk and Milestone Edit Modals + API Routes
- **RiskEditModal** (`d21ccbc`): severity/status editable; existing mitigation shown as read-only `<pre>`; append field sends new text only; PATCH body sends `{ severity, status, mitigation_append }`
- **PATCH /api/risks/[id]**: fetches existing mitigation, appends `\n\n{today}: {append}` — never replaces; updates `last_updated` to today
- **MilestoneEditModal** (`d21ccbc`): status, target, owner, notes — all editable
- **PATCH /api/milestones/[id]**: updates all 4 fields with Zod validation
- Both tab pages (RSC) now import and wrap each row with their respective modal

### Task 2: Stakeholder Create/Edit Modal + API Routes
- **StakeholderEditModal** (`7acc3f0`): dual-mode — `stakeholder` prop absent = create (POST), present = edit (PATCH); all 6 fields (name required)
- **POST /api/stakeholders**: inserts new stakeholder, returns 201 with created row
- **PATCH /api/stakeholders/[id]**: updates all stakeholder fields
- Stakeholders page: "Add Stakeholder" button with `data-testid="add-stakeholder-btn"` at top; each stakeholder row wrapped with edit modal; page remains RSC

## Commits

| Hash | Description |
|------|-------------|
| d21ccbc | feat(03-04): Risk and Milestone edit modals with API routes |
| 7acc3f0 | feat(03-04): Stakeholder create/edit modal with API routes |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed severity state type mismatch**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `useState(risk.severity ?? 'medium')` inferred type `'low' | 'medium' | 'high' | 'critical' | null` from Drizzle inference, making `setSeverity` incompatible with select onChange
- **Fix:** Explicit state type annotation `useState<'low' | 'medium' | 'high' | 'critical'>` and cast on onChange handler
- **Files modified:** `bigpanda-app/components/RiskEditModal.tsx`
- **Commit:** d21ccbc (same task commit)

## Self-Check: PASSED
