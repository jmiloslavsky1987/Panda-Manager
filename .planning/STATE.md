---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: 02-03 complete — Dashboard RSC page (health cards, activity feed, quick action bar, notification badge)
status: in_progress
stopped_at: Completed 02-03-PLAN.md (Dashboard RSC page — health cards, activity feed, quick action bar, notification badge)
last_updated: "2026-03-19T21:39:34.128Z"
progress:
  total_phases: 8
  completed_phases: 1
  total_plans: 13
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** Phase 2 — App Shell + Read Surface (Plan 1/7 complete)

## Current Status

**Phase:** 2 — App Shell + Read Surface (IN PROGRESS — 3/7 plans)
**Current Plan:** 02-03 complete — Dashboard RSC page (health cards, activity feed, quick action bar, notification badge)
**Last action:** Completed 02-03 — Dashboard page with 4 RSC components, all DASH-01 through DASH-08 sections, data-testid attributes matching E2E spec
**Next action:** 02-04 — Customer Overview page
**Stopped at:** Completed 02-03-PLAN.md (Dashboard RSC page — health cards, activity feed, quick action bar, notification badge)

## Phase Progress

| Phase | Status |
|-------|--------|
| 1. Data Foundation | COMPLETE (6/6 plans) |
| 2. App Shell + Read Surface | IN PROGRESS (3/7 plans) |
| 3. Write Surface + Plan Builder | Not started |
| 4. Job Infrastructure | Not started |
| 5. Skill Engine | Not started |
| 6. MCP Integrations | Not started |
| 7. File Generation + Remaining Skills | Not started |
| 8. Cross-Project Features + Polish | Not started |

## Active Work

Phase 2 in progress. 02-01 complete (E2E stubs), 02-02 complete (app shell + sidebar), 02-03 complete (Dashboard RSC page). Next: 02-04 (Customer Overview page).

## Decisions

- **[2026-03-19] 01-01:** Used Node.js built-in test runner (node:test) — no Jest/Vitest needed
- **[2026-03-19] 01-01:** DATABASE_URL defaults to postgres://localhost:5432/bigpanda_test in tests (prevents crash when env var unset)
- **[2026-03-19] 01-01:** postgres and tsx installed at project root (not inside server/ or client/)
- [Phase 01-03]: Settings library at both project root (test access) and bigpanda-app/lib/ (server-only for Next.js)
- [Phase 01-03]: readSettings/writeSettings accept optional settingsPath arg for test isolation without mocking fs
- **[2026-03-19] 01-02:** db/ lives in bigpanda-app/db/ (plan-spec); pool.test.ts updated to import from '../bigpanda-app/db/'
- **[2026-03-19] 01-02:** server-only import omitted from db/index.ts — next/compiled version throws unconditionally in Node.js test context
- **[2026-03-19] 01-02:** FORCE ROW LEVEL SECURITY added to all 8 RLS tables — ensures tests pass regardless of DB user superuser status
- **[2026-03-19] 01-02:** PostgreSQL not installed on this machine — migration requires user to install PostgreSQL and run drizzle-kit migrate
- [Phase 01-04]: server-only omitted from lib/yaml-export.ts for test runner compat (same pattern as db/index.ts)
- [Phase 01-04]: buildYamlDocument takes two args (project, sections) — Wave 0 stub updated during TDD RED
- [Phase 01-04]: outputs.test.ts uses NODE_PATH=./bigpanda-app/node_modules workaround for js-yaml access
- [Phase 01-05]: sanitizeYamlFrontmatter() added to handle AMEX source doc with unescaped double-quotes in YAML scalars
- [Phase 01-05]: SOURCE_DIR hardcoded as ~/Documents/PM Application — NOT settings.workspace_path (output files only)
- [Phase 01-05]: All migration DB tests remain RED until PostgreSQL installed (ECONNREFUSED expected)
- [Phase 01-06]: Q-NNN IDs (Open Questions sheet) stored in actions table with type='question'
- [Phase 01-06]: importXlsx() exported from migrate-local.ts for independent test runner access
- [Phase 01-06]: Workstream Notes sheet: UPDATE only (no insert) — enriches YAML-sourced workstream rows
- **[2026-03-19] 02-01:** npm install --no-package-lock used for @playwright/test — invalid esbuild semver in package-lock.json blocks standard install
- **[2026-03-19] 02-01:** E2E stubs use expect(false, 'stub').toBe(true) not test.fixme() — keeps tests RED and visible in report
- **[2026-03-19] 02-01:** Requirement IDs in test names (DASH-01 etc.) — implementation plans use --grep to target specific tests
- [Phase 02-04]: getProjectWithHealth() added to queries.ts — thin wrapper combining getProjectById + computeHealth for workspace layout type correctness
- [Phase 02-04]: data-testid='add-notes-btn-placeholder' used (not 'add-notes-btn') — plan 02-06 replaces FAB with AddNotesModal owning the final testid
- [Phase 02-app-shell-read-surface]: 02-03: NotificationBadge in page header (not root layout) for Phase 2 — Phase 5 will hoist to layout when skill data available
- [Phase 02-app-shell-read-surface]: 02-03: RAG badge uses inline className override on shadcn Badge — keeps variant config clean

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-data-foundation | 01 | 4min | 2/2 | 9 |
| 01-data-foundation | 02 | 20min | 2/2 | 14 |
| 01-data-foundation | 03 | 8min | 1/1 | 3 |
| 01-data-foundation | 04 | 15min | 2/2 | 4 |
| 01-data-foundation | 05 | 25min | 1/1 | 2 |
| 01-data-foundation | 06 | 4min | 1/1 | 2 |
| 02-app-shell-read-surface | 01 | 12min | 1/1 | 3 |
| Phase 02-app-shell-read-surface P04 | 8min | 1 tasks | 5 files |
| Phase 02-app-shell-read-surface P03 | 2min | 2 tasks | 5 files |

## Key Context for Next Session

- **Working directory:** `/Users/jmiloslavsky/Documents/Project Assistant Code`
- **Wave 0 complete (Phase 1):** All 8 test stubs exist in tests/ — verify commands valid for Plans 01-02 through 01-06
- **Wave 0 complete (Phase 2):** tests/e2e/phase2.spec.ts has 23 named RED tests — verify commands valid for Plans 02-02 through 02-07
- **Playwright installed:** @playwright/test at project root, Chromium cached. Run: `npx playwright test tests/e2e/phase2.spec.ts --grep "DASH-01"`
- **Research flags:** Phases 4, 5, 6, 7 require research spikes before planning (see ROADMAP.md)
- **Critical pitfall:** BullMQ worker must be a dedicated process — never in-process cron
- **Critical pitfall:** SkillOrchestrator must be separated from Route Handlers before Phase 5
- **Cowork compatibility:** js-yaml settings `sortKeys: false, lineWidth: -1, JSON_SCHEMA` — non-negotiable
- **Version ground-truth:** React 19, Vite 7, Tailwind 4, pptxgenjs v4, Anthropic SDK 0.78.x — read from existing package.json files
- **DB setup required:** PostgreSQL not installed — user must install PostgreSQL, create bigpanda_test + bigpanda_app DBs, and run `cd bigpanda-app && DATABASE_URL=postgresql://localhost:5432/bigpanda_test npx drizzle-kit migrate`
- **git add blocked:** bigpanda-app/db/ exists on disk but bash sandbox blocked staging; user should `git add bigpanda-app/db/`
- **Test runner:** Use `NODE_PATH=./bigpanda-app/node_modules npx tsx --test tests/yaml-roundtrip.test.ts` (js-yaml in bigpanda-app/node_modules only; npm install fails due to invalid esbuild semver in package-lock.json)
- **yaml-export ready:** lib/yaml-export.ts + bigpanda-app/lib/data-service.ts both committed and tested
- **Pre-existing TS errors:** bigpanda-app/lib/settings.ts and app/api/settings/route.ts have 2 TS errors from 01-03 (see deferred-items.md)

- **migration script ready:** bigpanda-app/scripts/migrate-local.ts committed — runs npx tsx scripts/migrate-local.ts once PostgreSQL is available
- **AMEX YAML quirk:** sanitizeYamlFrontmatter() added to handle embedded unescaped double-quotes in AMEX source doc (R-AMEX-002 mitigation field)
- **migration test runner:** Use `NODE_PATH=./bigpanda-app/node_modules npx tsx --test tests/migration.test.ts` (all DB tests remain RED until PostgreSQL installed)
- **Phase 1 COMPLETE:** All 6 plans executed — DB schema, YAML export, DataService, YAML migration, xlsx supplement all done
- **xlsx import ready:** bigpanda-app/scripts/migrate-local.ts exports importXlsx() — handles all 5 PA3_Action_Tracker sheets
- **Two-phase migration:** runMigration() (YAML) then importXlsx() (xlsx supplement) — YAML wins on conflicts

---
*Initialized: 2026-03-18*
*Last updated: 2026-03-19 after completing 02-01 (Playwright E2E stubs — Wave 0 RED baseline)*
