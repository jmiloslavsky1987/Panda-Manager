---
phase: 45
slug: database-schema-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `bigpanda-app/vitest.config.ts` |
| **Quick run command** | `npm test tests/schema/ tests/seeding/ tests/queries/ --run` |
| **Full suite command** | `npm test --run` |
| **Estimated runtime** | ~5 seconds (quick), ~30 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm test tests/schema/ tests/seeding/ tests/queries/ --run`
- **After every plan wave:** Run `npm test --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 45-01-01 | 01 | 0 | WBS-01 | unit | `npm test tests/schema/wbs-items.test.ts --run` | ❌ W0 | ⬜ pending |
| 45-01-02 | 01 | 0 | WBS-02 | unit | `npm test tests/seeding/wbs-templates.test.ts --run` | ❌ W0 | ⬜ pending |
| 45-01-03 | 01 | 0 | WBS-02 | unit | `npm test tests/queries/wbs-queries.test.ts --run` | ❌ W0 | ⬜ pending |
| 45-01-04 | 01 | 0 | (Implicit) | unit | `npm test tests/seeding/team-engagement.test.ts --run` | ❌ W0 | ⬜ pending |
| 45-01-05 | 01 | 0 | (Implicit) | unit | `npm test tests/seeding/architecture.test.ts --run` | ❌ W0 | ⬜ pending |
| 45-01-06 | 01 | 0 | (Implicit) | unit | `npm test tests/schema/project-dependencies.test.ts --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/schema/wbs-items.test.ts` — validates wbs_items table structure, self-referencing FK, enum constraints
- [ ] `tests/seeding/wbs-templates.test.ts` — verifies ADR (10+23) and Biggy (5+9) template seeding logic
- [ ] `tests/queries/wbs-queries.test.ts` — tests getWbsItems returns correctly ordered items
- [ ] `tests/seeding/team-engagement.test.ts` — verifies 5 sections seeded with empty content
- [ ] `tests/seeding/architecture.test.ts` — verifies 2 tracks + 10 nodes seeded per project
- [ ] `tests/schema/project-dependencies.test.ts` — validates join table and FK constraints
- [ ] Mock setup for db.transaction in test environment (extend existing vitest mocks)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drizzle migration runs without errors in dev environment | WBS-01, WBS-02 | Migration execution requires live PostgreSQL database | Run `cd bigpanda-app && npx drizzle-kit migrate` — verify no errors and all tables exist |
| New project creation seeds all template data | WBS-02 | Requires live DB + full Next.js app | Create a new project via UI or API, then check DB for wbs_items, team_engagement_sections, arch_tracks, arch_nodes rows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
