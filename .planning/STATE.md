# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** Phase 1 — Data Foundation

## Current Status

**Phase:** 1 — Data Foundation (in progress)
**Current Plan:** 2 of 6
**Last action:** Completed 01-01 — Wave 0 test scaffolding (8 RED test stubs + tsx install)
**Next action:** Execute Plan 01-02 — Next.js scaffold, Drizzle schema (12 tables), singleton pool, append-only triggers, RLS
**Stopped at:** Completed 01-01-PLAN.md

## Phase Progress

| Phase | Status |
|-------|--------|
| 1. Data Foundation | In progress (1/6 plans complete) |
| 2. App Shell + Read Surface | Not started |
| 3. Write Surface + Plan Builder | Not started |
| 4. Job Infrastructure | Not started |
| 5. Skill Engine | Not started |
| 6. MCP Integrations | Not started |
| 7. File Generation + Remaining Skills | Not started |
| 8. Cross-Project Features + Polish | Not started |

## Active Work

**Plan 01-02** — Next.js scaffold + Drizzle schema (12 tables), singleton pool, append-only triggers, RLS

## Decisions

- **[2026-03-19] 01-01:** Used Node.js built-in test runner (node:test) — no Jest/Vitest needed
- **[2026-03-19] 01-01:** DATABASE_URL defaults to postgres://localhost:5432/bigpanda_test in tests (prevents crash when env var unset)
- **[2026-03-19] 01-01:** postgres and tsx installed at project root (not inside server/ or client/)

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-data-foundation | 01 | 4min | 2/2 | 9 |

## Key Context for Next Session

- **Working directory:** `/Users/jmiloslavsky/Documents/Project Assistant Code`
- **Wave 0 complete:** All 8 test stubs exist in tests/ — verify commands valid for Plans 01-02 through 01-06
- **Research flags:** Phases 4, 5, 6, 7 require research spikes before planning (see ROADMAP.md)
- **Critical pitfall:** BullMQ worker must be a dedicated process — never in-process cron
- **Critical pitfall:** SkillOrchestrator must be separated from Route Handlers before Phase 5
- **Cowork compatibility:** js-yaml settings `sortKeys: false, lineWidth: -1, JSON_SCHEMA` — non-negotiable
- **Version ground-truth:** React 19, Vite 7, Tailwind 4, pptxgenjs v4, Anthropic SDK 0.78.x — read from existing package.json files

---
*Initialized: 2026-03-18*
*Last updated: 2026-03-19 after completing 01-01 (Wave 0 test scaffolding)*
