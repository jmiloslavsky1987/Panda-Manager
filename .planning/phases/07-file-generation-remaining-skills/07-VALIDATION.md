---
phase: 7
slug: file-generation-remaining-skills
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | bigpanda-app/vitest.config.ts |
| **Quick run command** | `cd bigpanda-app && npx vitest run --reporter=verbose 2>&1 | tail -20` |
| **Full suite command** | `cd bigpanda-app && npx vitest run 2>&1 | tail -30` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run --reporter=verbose 2>&1 | tail -20`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run 2>&1 | tail -30`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 0 | SKILL-05,06 | unit | `npx vitest run lib/file-gen` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | SKILL-05 | unit | `npx vitest run lib/file-gen/pptx` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 1 | SKILL-06 | unit | `npx vitest run lib/file-gen/pptx` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 1 | SKILL-07,08 | unit | `npx vitest run lib/file-gen/html` | ❌ W0 | ⬜ pending |
| 7-02-02 | 02 | 1 | SKILL-07 | manual | N/A — HTML iframe render | N/A | ⬜ pending |
| 7-02-03 | 02 | 1 | SKILL-08 | manual | N/A — HTML iframe render | N/A | ⬜ pending |
| 7-03-01 | 03 | 1 | SKILL-05,06,07,08 | unit | `npx vitest run worker/jobs/skill-run` | ❌ W0 | ⬜ pending |
| 7-03-02 | 03 | 1 | SKILL-05,06 | manual | N/A — open file in PowerPoint | N/A | ⬜ pending |
| 7-04-01 | 04 | 2 | PLAN-12 | unit | `npx vitest run api/ai-plan` | ❌ W0 | ⬜ pending |
| 7-04-02 | 04 | 2 | PLAN-12 | manual | N/A — UI proposal panel | N/A | ⬜ pending |
| 7-05-01 | 05 | 2 | PLAN-13 | unit | `npx vitest run api/sprint-summary` | ❌ W0 | ⬜ pending |
| 7-05-02 | 05 | 2 | PLAN-13 | manual | N/A — Plan tab collapsible panel | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/lib/file-gen/__tests__/pptx-generator.test.ts` — stubs for SKILL-05, SKILL-06 pptx generation
- [ ] `bigpanda-app/lib/file-gen/__tests__/html-generator.test.ts` — stubs for SKILL-07, SKILL-08 html generation
- [ ] `bigpanda-app/worker/jobs/__tests__/skill-run-file.test.ts` — stubs for file path write + outputs row
- [ ] `bigpanda-app/app/api/__tests__/ai-plan.test.ts` — stubs for PLAN-12 proposal endpoint
- [ ] `bigpanda-app/app/api/__tests__/sprint-summary.test.ts` — stubs for PLAN-13 summary endpoint

*Wave 0 installs `docx` npm package before any generation tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| .pptx opens without corruption in PowerPoint | SKILL-05, SKILL-06 | Requires macOS app launch | Run ELT skill → check generated file opens in PowerPoint with no corruption dialog |
| .html renders correctly in iframe | SKILL-07, SKILL-08 | Visual rendering check | Run Team Engagement Map / Workflow Diagram → verify iframe content renders |
| Proposed tasks panel appears on Plan tab | PLAN-12 | UI interaction flow | Click "Generate plan" → verify checkbox panel appears with tasks; commit → verify DB write |
| Sprint summary persists across sessions | PLAN-13 | Cross-session state | Generate summary → reload page → verify text still shows without re-generation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
