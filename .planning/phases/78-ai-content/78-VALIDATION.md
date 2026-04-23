---
phase: 78
slug: ai-content
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 78 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (Next.js built-in) |
| **Config file** | jest.config.js / package.json scripts |
| **Quick run command** | `npm test -- --testPathPattern=meeting-prep\|outputs\|sanitize --passWithNoTests` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=meeting-prep\|outputs\|sanitize --passWithNoTests`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 78-01-01 | 01 | 1 | SKILL-01 | manual | browser: Skills tab shows Meeting Prep | ✅ | ⬜ pending |
| 78-01-02 | 01 | 1 | SKILL-02 | manual | browser: trigger Meeting Prep, brief renders inline | ✅ | ⬜ pending |
| 78-01-03 | 01 | 1 | SKILL-03 | manual | browser: Admin > Prompts shows meeting-prep prompt editable | ✅ | ⬜ pending |
| 78-02-01 | 02 | 1 | OUT-01 | manual | browser: Outputs Library markdown output renders formatted | ✅ | ⬜ pending |
| 78-02-02 | 02 | 1 | OUT-01 | manual | browser: DOCX output renders via docx-preview | ❌ W0 | ⬜ pending |
| 78-02-03 | 02 | 1 | OUT-01 | manual | browser: PPTX output shows slide count + download link | ✅ | ⬜ pending |
| 78-03-01 | 03 | 2 | SKILL-04 | unit | `npm test -- --testPathPattern=sanitize` | ❌ W0 | ⬜ pending |
| 78-03-02 | 03 | 2 | OUT-02 | unit | `npm test -- --testPathPattern=sanitize` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `docx-preview` package installed (`npm install docx-preview`)
- [ ] `rehype-sanitize` package installed (`npm install rehype-sanitize`)
- [ ] `__tests__/sanitize.test.ts` — stubs verifying rehype-sanitize applied to ReactMarkdown instances

*Wave 0 also includes installing missing packages before any render code is written.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Meeting Prep brief rendered inline with project data | SKILL-01, SKILL-02 | BullMQ job executes in real environment; mock would not verify live data fetch | Trigger Meeting Prep from Skills tab on a real project with tasks/milestones; verify brief shows open items and recent activity |
| Copy to Clipboard button | SKILL-02 | Clipboard API requires browser context | Click Copy button; paste into text editor and verify content |
| DOCX preview renders document content | OUT-01 | docx-preview is a DOM renderer; requires real browser | Upload/select a DOCX output; verify rendered text appears in preview pane |
| PPTX slide count accuracy | OUT-01 | Requires real PPTX binary parsing | Select PPTX output; verify slide count matches actual file |

*All other behaviors (markdown render, XSS hardening) have automated unit verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
