---
phase: 26
slug: multi-user-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `vitest.config.ts` (existing) |
| **Quick run command** | `npm test -- --reporter=dot --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=dot --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 0 | AUTH-01 | unit | `npm test -- --run tests/auth/login.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 0 | AUTH-01 | unit | `npm test -- --run tests/auth/login-page.test.tsx` | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 0 | AUTH-01 | integration | `npm test -- --run tests/auth/setup-guard.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-04 | 01 | 0 | AUTH-02 | integration | `npm test -- --run tests/auth/user-management.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-05 | 01 | 0 | AUTH-02 | unit | `npm test -- --run tests/auth/self-mod-guard.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-06 | 01 | 0 | AUTH-03 | unit | `npm test -- --run tests/auth/resolve-role.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-07 | 01 | 0 | AUTH-04 | migration | `npm test -- --run tests/auth/schema.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-08 | 01 | 0 | AUTH-05 | unit | `npm test -- --run tests/auth/require-session.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-09 | 01 | 0 | AUTH-05 | integration | `npm test -- --run tests/auth/cve-2025-29927.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-10 | 01 | 0 | AUTH-05 | unit | `npm test -- --run tests/auth/proxy.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/auth/login.test.ts` — signIn.email() happy path + wrong password error (AUTH-01)
- [ ] `tests/auth/login-page.test.tsx` — login page renders without Sidebar/SearchBar (AUTH-01)
- [ ] `tests/auth/setup-guard.test.ts` — /setup redirects to /login when users exist (AUTH-01)
- [ ] `tests/auth/user-management.test.ts` — admin create/edit/deactivate user (AUTH-02)
- [ ] `tests/auth/self-mod-guard.test.ts` — admin cannot deactivate own account (AUTH-02)
- [ ] `tests/auth/resolve-role.test.ts` — resolveRole() with credential session + OIDC session shapes (AUTH-03, AUTH-04)
- [ ] `tests/auth/schema.test.ts` — external_id nullable TEXT, role default 'user' verified via DB query (AUTH-04)
- [ ] `tests/auth/require-session.test.ts` — requireSession() returns 401 with no session cookie (AUTH-05)
- [ ] `tests/auth/cve-2025-29927.test.ts` — route handler returns 401 when x-middleware-subrequest header bypasses proxy (AUTH-05)
- [ ] `tests/auth/proxy.test.ts` — proxy.ts redirects to /login when no session cookie (AUTH-05)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Remember me" checked → session persists after browser close | AUTH-01 | Browser state not testable in Vitest | Log in with "remember me", close all tabs, reopen browser, navigate to `/` — should reach Dashboard without login |
| Forgot password link shows "Contact your admin" message | AUTH-01 | UI-only text rendering | Click "Forgot password?" on login page → verify static message appears |
| Admin inline form expands in table row (not modal) | AUTH-02 | DOM interaction pattern | Click Edit on a user row in Settings > Users → verify form expands inline |
| Self-mod guard tooltip visible | AUTH-02 | Tooltip hover not testable in unit tests | Hover over disabled Edit/Deactivate buttons on own account row → verify tooltip |
| Session expired modal appears and re-auth works | AUTH-05 | Browser session state manipulation | Manually expire/delete session cookie, perform any API action → verify overlay modal appears |
| CVE-2025-29927 integration test (live server) | AUTH-05 | Requires running Next.js server | Run `next build && next start`, then run `npm test -- --run tests/auth/cve-2025-29927.test.ts` against localhost:3000 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
