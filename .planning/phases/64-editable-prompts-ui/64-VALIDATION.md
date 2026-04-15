---
phase: 64
slug: editable-prompts-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 64 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `cd bigpanda-app && npx vitest run __tests__/skills/ tests/skills/` |
| **Full suite command** | `cd bigpanda-app && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd bigpanda-app && npx vitest run __tests__/skills/ tests/skills/`
- **After every plan wave:** Run `cd bigpanda-app && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 64-01-01 | 01 | 0 | SKILL-03a | unit | `npx vitest run __tests__/skills/prompt-settings.test.ts` | ❌ W0 | ⬜ pending |
| 64-01-02 | 01 | 0 | SKILL-03b | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | ❌ W0 | ⬜ pending |
| 64-02-01 | 02 | 1 | SKILL-03a | unit | `npx vitest run __tests__/skills/prompt-settings.test.ts` | ❌ W0 | ⬜ pending |
| 64-02-02 | 02 | 1 | SKILL-03a | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | ❌ W0 | ⬜ pending |
| 64-03-01 | 03 | 1 | SKILL-03b | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | ❌ W0 | ⬜ pending |
| 64-03-02 | 03 | 1 | SKILL-03b | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | ❌ W0 | ⬜ pending |
| 64-03-03 | 03 | 1 | SKILL-03b | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | ❌ W0 | ⬜ pending |
| 64-04-01 | 04 | 2 | SKILL-03b | unit | `npx vitest run tests/skills/prompt-edit-api.test.ts` | ❌ W0 | ⬜ pending |
| 64-05-01 | 05 | 2 | SKILL-03b | manual | See Manual-Only section | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/skills/prompt-settings.test.ts` — RED stubs for SKILL-03a: settings field round-trip + admin guard on Settings POST
- [ ] `tests/skills/prompt-edit-api.test.ts` — RED stubs for SKILL-03b: GET route returns `{frontMatter, body}`, PATCH writes atomically + inserts audit log, PATCH rejects on validation fail, PATCH rejects on non-admin

*Wave 0 must be committed before Wave 1 execution begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CodeMirror editor renders with syntax highlighting and markdown toolbar | SKILL-03b | Browser-only UI rendering | Open Skills tab, click edit button, verify CM editor appears with toolbar (bold, italic, code, heading), line numbers visible |
| Full-screen toggle expands editor to 90vh | SKILL-03b | Visual/browser interaction | In edit modal, click full-screen toggle, verify editor expands; press Escape or toggle to exit |
| Front-matter block is visually locked/read-only in modal | SKILL-03b | UI display verification | Open edit modal, verify YAML front-matter shows as read-only display above editor; only body below second `---` is in CodeMirror |
| Audit log entry visible in admin audit trail after prompt edit | SKILL-03b | End-to-end cross-component | Edit a prompt, save, navigate to audit log view, verify entry appears with before/after diff and admin identity |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
