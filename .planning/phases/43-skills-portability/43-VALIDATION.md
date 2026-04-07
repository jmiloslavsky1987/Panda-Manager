---
phase: 43
slug: skills-portability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 43 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/skill-run-settings.test.ts` |
| **Full suite command** | `npx vitest run` (from `bigpanda-app/`) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/skill-run-settings.test.ts`
- **After every plan wave:** Run `npx vitest run` (from `bigpanda-app/`)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 43-01-01 | 01 | 0 | SKILL-01 | unit | `npx vitest run worker/jobs/__tests__/skill-path-migration.test.ts` | ❌ W0 | ⬜ pending |
| 43-01-02 | 01 | 1 | SKILL-01 | unit | `npx vitest run tests/skill-run-settings.test.ts` | ✅ | ⬜ pending |
| 43-01-03 | 01 | 1 | SKILL-01 | unit | `npx vitest run worker/jobs/__tests__/skill-path-migration.test.ts` | ❌ W0 | ⬜ pending |
| 43-02-01 | 02 | 2 | SKILL-01 | unit | `npx vitest run tests/api/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/worker/jobs/__tests__/skill-path-migration.test.ts` — unit tests confirming migrated jobs call `readSettings()` + `resolveSkillsDir` (not `__dirname`); covers SKILL-01
- [ ] No new fixtures needed; existing `vi.mock` patterns from `skill-run-file.test.ts` are sufficient templates

*Existing `tests/skill-run-settings.test.ts` already covers the `resolveSkillsDir` pure function.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skills resolve correctly when `skill_path` is set in settings.json | SKILL-01 | Requires live settings.json write + dev server | 1. Set `skill_path` in `~/.bigpanda-app/settings.json`. 2. Trigger a skill run from the UI. 3. Confirm skill executes without path errors. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
