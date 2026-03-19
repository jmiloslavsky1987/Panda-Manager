---
phase: 1
slug: data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | None — use `--test` flag directly |
| **Quick run command** | `node --test tests/schema.test.ts tests/append-only.test.ts` |
| **Full suite command** | `node --test tests/*.test.ts` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/schema.test.ts tests/append-only.test.ts`
- **After every plan wave:** Run `node --test tests/*.test.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-schema-01 | 01 | 1 | DATA-01 | unit/smoke | `node --test tests/schema.test.ts` | ❌ W0 | ⬜ pending |
| 1-trigger-01 | 01 | 1 | DATA-02 | integration | `node --test tests/append-only.test.ts` | ❌ W0 | ⬜ pending |
| 1-trigger-02 | 01 | 1 | DATA-02 | integration | `node --test tests/append-only.test.ts` | ❌ W0 | ⬜ pending |
| 1-rls-01 | 01 | 1 | DATA-06 | integration | `node --test tests/rls.test.ts` | ❌ W0 | ⬜ pending |
| 1-pool-01 | 01 | 1 | DATA-08 | unit | `node --test tests/pool.test.ts` | ❌ W0 | ⬜ pending |
| 1-migration-yaml-01 | 02 | 2 | DATA-03 | integration | `node --test tests/migration.test.ts` | ❌ W0 | ⬜ pending |
| 1-migration-yaml-02 | 02 | 2 | DATA-03 | integration | `node --test tests/migration.test.ts` | ❌ W0 | ⬜ pending |
| 1-migration-xlsx-01 | 02 | 2 | DATA-04 | integration | `node --test tests/migration.test.ts` | ❌ W0 | ⬜ pending |
| 1-migration-xlsx-02 | 02 | 2 | DATA-04 | integration | `node --test tests/migration.test.ts` | ❌ W0 | ⬜ pending |
| 1-yaml-export-01 | 02 | 2 | DATA-05 | unit | `node --test tests/yaml-roundtrip.test.ts` | ❌ W0 | ⬜ pending |
| 1-yaml-export-02 | 02 | 2 | DATA-05 | unit | `node --test tests/yaml-roundtrip.test.ts` | ❌ W0 | ⬜ pending |
| 1-outputs-01 | 02 | 2 | DATA-07 | unit | `node --test tests/outputs.test.ts` | ❌ W0 | ⬜ pending |
| 1-outputs-02 | 02 | 2 | DATA-07 | unit | `node --test tests/outputs.test.ts` | ❌ W0 | ⬜ pending |
| 1-settings-01 | 03 | 3 | SET-01 | unit | `node --test tests/settings.test.ts` | ❌ W0 | ⬜ pending |
| 1-settings-02 | 03 | 3 | SET-02 | unit | `node --test tests/settings.test.ts` | ❌ W0 | ⬜ pending |
| 1-settings-03 | 03 | 3 | SET-03 | unit | `node --test tests/settings.test.ts` | ❌ W0 | ⬜ pending |
| 1-settings-04 | 03 | 3 | SET-04 | unit | `node --test tests/settings.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/schema.test.ts` — table existence checks (DATA-01)
- [ ] `tests/append-only.test.ts` — trigger enforcement (DATA-02)
- [ ] `tests/migration.test.ts` — YAML + xlsx import (DATA-03, DATA-04)
- [ ] `tests/yaml-roundtrip.test.ts` — export round-trip (DATA-05)
- [ ] `tests/rls.test.ts` — cross-project isolation (DATA-06)
- [ ] `tests/outputs.test.ts` — outputs table status and idempotency (DATA-07)
- [ ] `tests/pool.test.ts` — singleton pool (DATA-08)
- [ ] `tests/settings.test.ts` — settings read/write (SET-01 through SET-04)
- [ ] `tests/fixtures/` — test DB seed data (two projects, sample actions, risks)
- [ ] `npm install -D tsx` — TypeScript runner for Node test files

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Merck stub project created in DB | DATA-03 | No YAML frontmatter in source file — stub created by script | `SELECT * FROM projects WHERE name ILIKE 'merck'` — must return 1 row |
| Settings UI writes persist across restart | SET-01/02/03 | Requires app start/stop cycle | Write a setting, restart Next.js, verify setting survived |
| API key not in committed files | SET-04 | Git inspection required | `git log --all -- .env* && git log --all -- *.json` — assert no API key values |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
