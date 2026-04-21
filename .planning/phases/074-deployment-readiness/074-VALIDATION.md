---
phase: 74
slug: deployment-readiness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 74 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | bigpanda-app/vitest.config.ts (already exists) |
| **Quick run command** | `npm run test -- --run` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 74-00-01 | 00 | 0 | DEPLOY-01 | unit | `npm run test -- --run __tests__/deployment/env-config.test.ts` | ✅ | ⬜ pending |
| 74-00-02 | 00 | 0 | DEPLOY-01 | unit | `npm run test -- --run __tests__/deployment/no-hardcoded-urls.test.ts` | ✅ | ⬜ pending |
| 74-01-01 | 01 | 1 | DEPLOY-01 | unit | `npm run test -- --run __tests__/deployment/no-hardcoded-urls.test.ts` | ✅ W0 | ⬜ pending |
| 74-01-02 | 01 | 1 | DEPLOY-01 | grep/static | `grep -r "localhost" bigpanda-app/app bigpanda-app/worker --include="*.ts" --include="*.tsx"` | ✅ | ⬜ pending |
| 74-02-01 | 02 | 1 | DEPLOY-01 | unit | `npm run test -- --run __tests__/deployment/env-config.test.ts` | ✅ W0 | ⬜ pending |
| 74-03-01 | 03 | 2 | DEPLOY-02 | file-exists | `test -f bigpanda-app/DEPLOYMENT.md && echo OK` | ✅ | ⬜ pending |
| 74-03-02 | 03 | 2 | DEPLOY-02 | grep/static | `grep -c "DATABASE_URL\|REDIS_URL\|ANTHROPIC_API_KEY\|BETTER_AUTH" bigpanda-app/DEPLOYMENT.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bigpanda-app/__tests__/deployment/env-config.test.ts` — tests for required env vars present in .env.example
- [ ] `bigpanda-app/__tests__/deployment/no-hardcoded-urls.test.ts` — static analysis: no localhost fallbacks in production code

*Wave 0 plan (074-00) creates these test files. Tests will fail initially and pass as Plans 074-01 and 074-02 complete their work.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fresh checkout can be configured without reading source code | DEPLOY-02 | Requires human judgment to assess guide completeness | Follow DEPLOYMENT.md from scratch on a clean environment; verify all steps work without referencing source |
| Production app starts correctly with env vars injected | DEPLOY-01 | Requires actual runtime environment | Set all env vars from .env.example, run `npm run build && node .next/standalone/server.js`, verify app responds |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
