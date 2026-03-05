---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend unit) + supertest (Express API integration) |
| **Config file** | `vitest.config.js` (Wave 0 installs) |
| **Quick run command** | `npm run test:server` (supertest API tests only) |
| **Full suite command** | `npm run test` (vitest + supertest) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:server`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | INFRA-08 | unit | `npm run test:server -- --grep "env"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | INFRA-09 | manual | check .env.example exists | ✅ | ⬜ pending |
| 1-01-03 | 01 | 1 | INFRA-01 | integration | `npm run test:server -- --grep "driveService"` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | INFRA-02 | integration | `npm run test:server -- --grep "atomic write"` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | INFRA-03 | unit | `npm run test:server -- --grep "yaml coercion"` | ❌ W0 | ⬜ pending |
| 1-01-06 | 01 | 1 | INFRA-04 | unit | `npm run test:server -- --grep "schema validation"` | ❌ W0 | ⬜ pending |
| 1-01-07 | 01 | 1 | INFRA-05 | unit | `npm run test:server -- --grep "ID assignment"` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | INFRA-06 | integration | `npm run test:server -- --grep "GET /api/customers"` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | INFRA-06 | integration | `npm run test:server -- --grep "PUT /api/customers"` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 2 | INFRA-06 | integration | `npm run test:server -- --grep "health/drive"` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 3 | INFRA-07 | manual | browser: fetch('/api/customers') returns data | ✅ | ⬜ pending |
| 1-03-02 | 03 | 3 | INFRA-10 | manual | npm run dev opens localhost:3000, no console errors | ✅ | ⬜ pending |
| 1-03-03 | 03 | 3 | INFRA-10 | manual | all 7 routes render placeholder components | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/setup.js` — test environment config (mock Drive, load .env.test)
- [ ] `server/tests/driveService.test.js` — stubs for INFRA-01, INFRA-02 with mock googleapis
- [ ] `server/tests/yamlService.test.js` — stubs for INFRA-03, INFRA-04, INFRA-05
- [ ] `server/tests/api.test.js` — stubs for INFRA-06, INFRA-08 routes
- [ ] Install: `vitest`, `supertest`, `@vitest/coverage-v8` as devDependencies

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run dev` opens localhost:3000 | INFRA-10 | Requires live browser + two-process startup | Run `npm run dev`, open browser, verify no console errors |
| All 7 routes render placeholder | INFRA-10 | Requires React Router to be running in browser | Navigate to each route, verify placeholder text visible |
| Vite proxy routes /api to Express | INFRA-07 | Requires both processes running | Open browser console, fetch('/api/health/drive'), confirm 200 |
| Drive health check lists real YAMLs | INFRA-01 | Requires real Google Drive credentials | GET /api/health/drive returns 200 with file list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
