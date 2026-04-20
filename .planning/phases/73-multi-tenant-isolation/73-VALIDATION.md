---
phase: 73
slug: multi-tenant-isolation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 73 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test tests/auth/` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds (auth tests), ~2 min (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test tests/auth/`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 73-01-01 | 01 | 0 | TENANT-01 | integration | `npm run test tests/auth/portfolio-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 73-01-02 | 01 | 0 | TENANT-02 | integration | `npm run test tests/auth/query-param-403.test.ts` | ❌ W0 | ⬜ pending |
| 73-01-03 | 01 | 0 | TENANT-03 | integration | `npm run test tests/auth/cache-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 73-01-04 | 01 | 0 | TENANT-04 | integration | `npm run test tests/auth/job-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 73-01-05 | 01 | 0 | TENANT-05 | integration | `npm run test tests/auth/invite-empty-state.test.ts` | ❌ W0 | ⬜ pending |
| 73-02-01 | 02 | 1 | TENANT-01 | integration | `npm run test tests/auth/portfolio-isolation.test.ts` | ✅ W0 | ⬜ pending |
| 73-02-02 | 02 | 1 | TENANT-05 | integration | `npm run test tests/auth/invite-empty-state.test.ts` | ✅ W0 | ⬜ pending |
| 73-03-01 | 03 | 1 | TENANT-02 | integration | `npm run test tests/auth/query-param-403.test.ts` | ✅ W0 | ⬜ pending |
| 73-04-01 | 04 | 1 | TENANT-03 | integration | `npm run test tests/auth/cache-isolation.test.ts` | ✅ W0 | ⬜ pending |
| 73-04-02 | 04 | 1 | TENANT-04 | integration | `npm run test tests/auth/job-isolation.test.ts` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/auth/portfolio-isolation.test.ts` — stubs for TENANT-01 (portfolio filtering)
- [ ] `tests/auth/query-param-403.test.ts` — stubs for TENANT-02 (query-param route 403)
- [ ] `tests/auth/cache-isolation.test.ts` — stubs for TENANT-03 (cache read requires membership)
- [ ] `tests/auth/job-isolation.test.ts` — stubs for TENANT-04 (job results scoped to project)
- [ ] `tests/auth/invite-empty-state.test.ts` — stubs for TENANT-05 (invite onboarding empty state)

*Existing infrastructure: `tests/auth/require-session.test.ts` pattern, `vi.mock('@/lib/auth-server')` established*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-user UI isolation | TENANT-01, TENANT-05 | Requires two real browser sessions with different users | Create User A and User B; assign different projects; log in as each and confirm portfolio shows only own projects |
| Direct URL 403 in browser | TENANT-02 | Validates browser-level 403 response (not just API) | As User B, paste User A's project URL into browser; confirm 403 response, not project data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
