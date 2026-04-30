---
phase: 83
slug: architecture-sub-capability-columns
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 83 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (confirmed from existing test files) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/arch/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/arch/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 83-00-01 | 00 | 0 | section-grouping | unit | `npx vitest run tests/arch/section-grouping.test.ts` | ❌ W0 | ⬜ pending |
| 83-00-02 | 00 | 0 | integration-modal-optgroup | unit | `npx vitest run tests/arch/integration-modal-optgroup.test.ts` | ❌ W0 | ⬜ pending |
| 83-00-03 | 00 | 0 | arch-context-builder | unit | `npx vitest run tests/arch/arch-context-builder.test.ts` | ❌ W0 | ⬜ pending |
| 83-01-01 | 01 | 1 | schema + migration | unit | `npx vitest run tests/arch/section-grouping.test.ts` | ❌ W0 | ⬜ pending |
| 83-02-01 | 02 | 2 | getArchNodes query | unit | `npx vitest run tests/arch/section-grouping.test.ts` | ❌ W0 | ⬜ pending |
| 83-03-01 | 03 | 3 | InteractiveArchGraph rendering | unit | `npx vitest run tests/arch/section-grouping.test.ts` | ❌ W0 | ⬜ pending |
| 83-03-02 | 03 | 3 | IntegrationEditModal optgroup | unit | `npx vitest run tests/arch/integration-modal-optgroup.test.ts` | ❌ W0 | ⬜ pending |
| 83-04-01 | 04 | 4 | chat-context-builder arch section | unit | `npx vitest run tests/arch/arch-context-builder.test.ts` | ❌ W0 | ⬜ pending |
| 83-04-02 | 04 | 4 | createArchNodeTool parent_node_name | unit | `npx vitest run tests/arch/` | ✅ | ⬜ pending |
| 83-04-03 | 04 | 4 | document-extraction sub-capability filter | unit | `npx vitest run tests/arch/arch-context-builder.test.ts` | ❌ W0 | ⬜ pending |
| 83-05-01 | 05 | 5 | seed + migration correctness | manual | manual verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/arch/section-grouping.test.ts` — tests section nodes (node_type=section, parent_id=null), sub-capability nodes (parent_id references section), Console node (node_type=console), getArchNodes returns all three node types
- [ ] `tests/arch/integration-modal-optgroup.test.ts` — tests IntegrationEditModal renders `<optgroup>` structure for ADR phases with correct sub-capability names under section labels
- [ ] `tests/arch/arch-context-builder.test.ts` — tests buildArchPhasesContext returns only sub-capability node names (filters out section nodes with node_type filter)

*Existing tests/arch/arch-nodes-wiring.test.ts, column-reorder.test.ts, status-cycle.test.ts are already present — Wave 0 adds new test files only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| document-extraction assigns integration to sub-capability name | arch extraction | LLM output is non-deterministic | Upload a sample architecture document; verify extracted integrations have sub-capability names (e.g. 'Monitoring Integrations') not section names |
| Architecture diagram renders section headers visually | rendering | Requires browser rendering | Open project architecture tab; verify Alert Intelligence (blue), Incident Intelligence (amber), Workflow Automation (green) section headers appear with sub-columns beneath |
| Drag-and-drop reorder within section | DnD | Requires browser interaction | Drag a sub-capability column within its section; verify order persists after page reload |
| New project creation seeds full structure | seed | Requires full stack | Create a new project; verify architecture tab shows 3 sections with 10 sub-columns and Console node |
| Existing project migration | migration | Requires full stack | Open existing project; verify old flat nodes replaced with new structure |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
