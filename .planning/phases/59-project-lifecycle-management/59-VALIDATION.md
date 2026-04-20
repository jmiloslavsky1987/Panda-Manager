---
phase: 59
slug: project-lifecycle-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npx vitest run __tests__/lifecycle/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run __tests__/lifecycle/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 59-01-01 | 01 | 0 | PROJ-01, PROJ-02, PROJ-04, PORTF-01, PORTF-02 | unit stubs | `npx vitest run __tests__/lifecycle/ -x` | ❌ W0 | ⬜ pending |
| 59-02-01 | 02 | 1 | PROJ-01 | unit | `npx vitest run __tests__/lifecycle/archive.test.ts -x` | ❌ W0 | ⬜ pending |
| 59-02-02 | 02 | 1 | PROJ-02 | unit | `npx vitest run __tests__/lifecycle/delete.test.ts -x` | ❌ W0 | ⬜ pending |
| 59-02-03 | 02 | 1 | PROJ-04 | unit | `npx vitest run __tests__/lifecycle/restore.test.ts -x` | ❌ W0 | ⬜ pending |
| 59-03-01 | 03 | 2 | PROJ-03, AUTH-01 | manual | — | manual only | ⬜ pending |
| 59-04-01 | 04 | 3 | PORTF-01, PORTF-02 | unit | `npx vitest run __tests__/lifecycle/portfolio.test.ts -x` | ❌ W0 | ⬜ pending |
| 59-05-01 | 05 | 4 | PROJ-03 | manual | — | manual only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/lifecycle/archive.test.ts` — stubs for PROJ-01 (archive PATCH: admin required, status set, non-admin 403)
- [ ] `__tests__/lifecycle/delete.test.ts` — stubs for PROJ-02 (DELETE: pre-flight blocks running jobs, requires archived status first)
- [ ] `__tests__/lifecycle/restore.test.ts` — stubs for PROJ-04 (restore PATCH: status set to active, seedProjectFromRegistry idempotency)
- [ ] `__tests__/lifecycle/portfolio.test.ts` — stubs for PORTF-01, PORTF-02 (getActiveProjects excludes 'archived', deleted row excluded)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Archived projects appear in collapsed sidebar section | PROJ-03 | Server RSC — no test harness for server component rendering | Navigate to app; archive a project; confirm it appears in collapsed sidebar section below active projects |
| Sidebar section expands on click to show archived projects | PROJ-03 | UI interaction requires browser | Click "Archived" section in sidebar; confirm it expands and project links are visible |
| ArchivedBanner shows "Archived — read only" in workspace | PROJ-03 | Requires rendered UI and session context | Navigate to archived project; confirm amber banner at top of workspace |
| Restore button visible to Admin, hidden from User role | PROJ-04 | Role-based UI — requires browser session | Log in as Admin vs User; confirm Restore button visibility in archived banner |
| Danger Zone section visible to Admin only in Admin tab | PROJ-01, PROJ-02 | Role-based UI | Log in as Admin vs User; navigate to Admin tab; confirm Danger Zone visibility |
| User can log out via sidebar and is redirected to /login | AUTH-01 | Requires browser session and redirect | Click logout in sidebar; confirm redirect to /login; confirm session cleared |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
