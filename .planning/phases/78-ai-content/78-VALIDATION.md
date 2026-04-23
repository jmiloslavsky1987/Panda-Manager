---
phase: 78
slug: ai-content
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-23
---

# Phase 78 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (project-configured) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run --reporter=verbose 2>&1 \| grep -E 'PASS\|FAIL\|✓\|✗\|Tests'` |
| **Full suite command** | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's `<verify><automated>` command from the plan
- **After every plan wave:** Run full suite `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` must be clean
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 78-01-T1 | 01 | 1 | SKILL-01, SKILL-02 | unit (Vitest) | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run lib/__tests__/meeting-prep-context.test.ts -x --reporter=verbose` | ⬜ pending |
| 78-01-T2 | 01 | 1 | SKILL-02, SKILL-04 | unit (Vitest) | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run app/api/__tests__/meeting-prep-skill.test.ts app/api/__tests__/meeting-prep-copy.test.ts -x --reporter=verbose` | ⬜ pending |
| 78-02-T1 | 02 | 1 | OUT-01, OUT-02 | unit (Vitest) | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run app/api/__tests__/output-type-discriminator.test.ts app/api/__tests__/slide-count.test.ts -x --reporter=verbose` | ⬜ pending |
| 78-02-T2 | 02 | 1 | OUT-01, OUT-02 | build + full suite | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run --reporter=verbose && npm run build 2>&1 \| tail -5` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `docx-preview` package installed (`npm install docx-preview rehype-sanitize`)
- [ ] `lib/output-utils.ts` created (exports `getOutputType` + `OutputRow` type — avoids importing from 'use client' page in Vitest)
- [ ] Test stubs/scaffolds created before implementation (per TDD tasks in Plans 01 and 02)

*Wave 0 is embedded in each task's TDD RED phase — no separate Wave 0 plan needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Meeting Prep brief rendered inline with project data | SKILL-01, SKILL-02 | BullMQ job executes in real environment; mock would not verify live data fetch | Trigger Meeting Prep from Skills tab on a real project with tasks/actions; verify brief shows open items and recent activity |
| Copy to Clipboard button | SKILL-02 | Clipboard API requires browser context | Click Copy button; paste into text editor and verify no markdown symbols |
| DOCX preview renders document content | OUT-01 | docx-preview is a DOM renderer; requires real browser | Select a DOCX output; verify rendered text appears in 500px preview pane |
| PPTX slide count accuracy | OUT-01 | Requires real PPTX binary parsing | Select PPTX output; verify slide count badge matches actual file |
| Admin > Prompts — meeting-prep editable | SKILL-04 | UI-only verification of existing inherited route | Navigate to Admin > Prompts; confirm Meeting Prep prompt appears and saves |

*All other behaviors (type discriminator, XSS hardening, stripMarkdown) have automated unit verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands using `npx vitest run` (not jest)
- [x] Task IDs map to 78-01-T1, 78-01-T2, 78-02-T1, 78-02-T2 (2-plan structure)
- [x] No references to Plan 03 (does not exist)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
