---
phase: 58
slug: per-project-rbac
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 58 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (or jest.config.ts if present) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 58-01-01 | 01 | 0 | AUTH-02 | unit | `npm test -- --run --testPathPattern=project_members` | ❌ W0 | ⬜ pending |
| 58-01-02 | 01 | 0 | AUTH-02 | unit | `npm test -- --run --testPathPattern=requireProjectRole` | ❌ W0 | ⬜ pending |
| 58-02-01 | 02 | 1 | AUTH-05 | integration | `npm test -- --run --testPathPattern=project-routes` | ❌ W0 | ⬜ pending |
| 58-02-02 | 02 | 1 | AUTH-05 | integration | `npm test -- --run --testPathPattern=project-routes` | ❌ W0 | ⬜ pending |
| 58-03-01 | 03 | 1 | AUTH-03 | integration | `npm test -- --run --testPathPattern=portfolio` | ❌ W0 | ⬜ pending |
| 58-04-01 | 04 | 2 | AUTH-04 | e2e/manual | N/A | N/A | ⬜ pending |
| 58-04-02 | 04 | 2 | AUTH-03 | integration | `npm test -- --run --testPathPattern=members` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/lib/requireProjectRole.test.ts` — unit tests for AUTH-02: global admin bypass, member role check, 403 on non-member
- [ ] `__tests__/api/project-routes.test.ts` — integration stubs for AUTH-05: all 46 route handlers return 403 for User role on admin-only actions
- [ ] `__tests__/api/portfolio.test.ts` — integration stub for AUTH-03: portfolio query returns only member projects for non-global-admin
- [ ] `__tests__/api/members.test.ts` — integration stub for AUTH-04: CRUD operations on project_members

*Wave 0 installs test stubs before any implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Members sub-tab visible only for project Admin/global admin | AUTH-04 | UI gating requires browser rendering | Log in as User role, navigate to Admin tab, confirm Members sub-tab absent |
| Add member picker shows all app users | AUTH-04 | Interactive UI flow | Log in as Admin, open Members tab, click Add, confirm user picker populated |
| Global admin sees all projects in portfolio | AUTH-02 | Browser session required | Log in as global admin (role=admin in users table), confirm all projects visible regardless of project_members |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
