---
phase: 85
slug: wbs-ms-project-style-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 85 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing, `tests/` directory) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/components/WbsGrid.test.tsx tests/api/wbs-dependencies.test.ts` |
| **Full suite command** | `npx vitest run tests/components/WbsGrid.test.tsx tests/api/wbs-dependencies.test.ts tests/components/GanttChart-deps.test.ts tests/schema/wbs-overhaul.test.ts tests/api/wbs-crud.test.ts` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/api/wbs-crud.test.ts tests/components/WbsGrid.test.tsx`
- **After every plan wave:** Run `npx vitest run tests/components/WbsGrid.test.tsx tests/api/wbs-dependencies.test.ts tests/components/GanttChart-deps.test.ts tests/schema/wbs-overhaul.test.ts tests/api/wbs-crud.test.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 85-00-01 | 00 | 0 | WBS-01 | unit RED | `npx vitest run tests/components/WbsGrid.test.tsx` | ❌ W0 | ⬜ pending |
| 85-00-02 | 00 | 0 | WBS-02 | unit RED | `npx vitest run tests/components/WbsGrid.test.tsx` | ❌ W0 | ⬜ pending |
| 85-00-03 | 00 | 0 | WBS-03 | unit RED | `npx vitest run tests/api/wbs-dependencies.test.ts` | ❌ W0 | ⬜ pending |
| 85-00-04 | 00 | 0 | WBS-04 | unit RED | `npx vitest run tests/components/GanttChart-deps.test.ts` | ❌ W0 | ⬜ pending |
| 85-00-05 | 00 | 0 | WBS-01,04 | unit RED | `npx vitest run tests/schema/wbs-overhaul.test.ts` | ❌ W0 | ⬜ pending |
| 85-00-06 | 00 | 0 | WBS-01,02 | unit RED | `npx vitest run tests/api/wbs-reorder.test.ts` | ❌ W0 | ⬜ pending |
| 85-01-01 | 01 | 1 | WBS-01 | migration | `npx vitest run tests/schema/wbs-overhaul.test.ts` | ❌ W0 | ⬜ pending |
| 85-02-01 | 02 | 2 | WBS-01,02 | unit | `npx vitest run tests/components/WbsGrid.test.tsx` | ❌ W0 | ⬜ pending |
| 85-03-01 | 03 | 3 | WBS-03 | unit | `npx vitest run tests/api/wbs-dependencies.test.ts` | ❌ W0 | ⬜ pending |
| 85-04-01 | 04 | 4 | WBS-04 | unit | `npx vitest run tests/components/GanttChart-deps.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/components/WbsGrid.test.tsx` — stubs for WBS-01 (grid cell editing, indent/outdent, Tab/Enter nav)
- [ ] `tests/api/wbs-dependencies.test.ts` — stubs for WBS-03 (dependency CRUD: FS/SS create/read/delete)
- [ ] `tests/components/GanttChart-deps.test.ts` — stubs for WBS-04 (Gantt percent_complete, dependency arrow data)
- [ ] `tests/schema/wbs-overhaul.test.ts` — stubs for WBS-01 (percent_complete migration from status)
- [ ] `tests/api/wbs-reorder.test.ts` — stubs for WBS-02 (POST /wbs/reorder with newParentId=null root outdent)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tab key indents row when no cell focused | WBS-02 | Browser keyboard event behavior | Click away from any cell, press Tab on a row — verify it becomes child of row above |
| Shift+Tab outdents row when no cell focused | WBS-02 | Browser keyboard event behavior | Select indented row, press Shift+Tab — verify parent_id set to grandparent |
| Tab navigates cells when editing | WBS-02 | Browser keyboard event behavior | Edit a cell, press Tab — verify focus moves to next column same row |
| Predecessor column shows row numbers | WBS-03 | Visual rendering | Add dependency, verify predecessor column shows "3" not the item ID |
| Gantt dependency arrows render | WBS-04 | Visual SVG rendering | Create FS dependency, open Gantt — verify arrow from predecessor bar to successor bar |
| Grid scrolls horizontally with all columns | WBS-01 | Visual layout | Narrow browser window — verify horizontal scroll, not overflow clipping |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
