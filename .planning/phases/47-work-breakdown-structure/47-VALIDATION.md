---
phase: 47
slug: work-breakdown-structure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.1 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npm test -- --run tests/wbs/ -x` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds (quick), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run tests/wbs/ -x`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green + manual smoke test (expand/collapse 100+ nodes, drag L3 to different L1 section, Generate Plan with existing items)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD-W0 | 01 | 0 | WBS-04, WBS-05 | unit/integration | `npm test -- --run tests/wbs/ -x` | ❌ Wave 0 | ⬜ pending |
| TBD-01 | 01 | 1 | WBS-05 | integration | `npm test -- --run tests/api/wbs-crud.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| TBD-02 | 02 | 2 | WBS-05 | integration | `npm test -- --run tests/wbs/reorder.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| TBD-03 | 02 | 2 | WBS-05 | unit | `npm test -- --run tests/wbs/delete-cascade.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| TBD-04 | 03 | 3 | WBS-04 | integration | `npm test -- --run tests/wbs/generate-plan.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| TBD-05 | 03 | 3 | WBS-04 | unit | `npm test -- --run tests/wbs/generate-dedup.test.ts -x` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Note: Task IDs will be updated after PLAN.md files are written.*

---

## Wave 0 Requirements

- [ ] `tests/wbs/generate-plan.test.ts` — stubs for WBS-04 (enqueue, poll, modal, confirm)
- [ ] `tests/wbs/generate-dedup.test.ts` — stubs for WBS-04 (duplicate detection logic)
- [ ] `tests/api/wbs-crud.test.ts` — stubs for WBS-05 (CRUD API routes)
- [ ] `tests/wbs/delete-cascade.test.ts` — stubs for WBS-05 (recursive subtree delete)
- [ ] `tests/wbs/reorder.test.ts` — stubs for WBS-05 (drag-and-drop display_order update)

*Framework already installed (vitest 4.1.1) — no install step needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag handle visible on row hover, dragging L3 node to different L1 section works visually | WBS-05 | Pointer event simulation unreliable in jsdom; visual affordance requires browser | 1. Open WBS page 2. Hover over L3 node — confirm ≡ icon appears 3. Drag to different L1 section 4. Confirm node appears under new parent |
| Level 1 headers show no edit/delete/add-sibling buttons | WBS-05 | UI hover state difficult to test reliably | 1. Open WBS page 2. Hover over Level 1 header 3. Confirm no trash/plus icons appear 4. Click header name — confirm no inline edit input |
| Expand/collapse on 100+ nodes renders without lag | PERF-02 | Performance measurement requires real browser | 1. Open project with 100+ WBS nodes 2. Expand all Level 1 sections 3. Confirm no visible lag on expand/collapse |
| Generate Plan modal shows proposals grouped by track/section | WBS-04 | Modal UX review requires visual inspection | 1. Click Generate Plan 2. Wait for AI proposals 3. Confirm modal appears with clear proposal list 4. Confirm cancel closes without writing to DB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
