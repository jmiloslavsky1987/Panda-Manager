---
phase: 07-file-generation-remaining-skills
plan: "06"
subsystem: sprint-summary
tags: [sprint-summary, skill-orchestrator, db-migration, client-component, plan-layout]
dependency_graph:
  requires: [07-04]
  provides: [sprint-summary-panel, sprint-summary-api, 0007-migration]
  affects: [plan-layout, projects-table, skill-runs]
tech_stack:
  added: []
  patterns: [skill-orchestrator-transient-run, client-component-server-layout, persist-not-in-output-library]
key_files:
  created:
    - bigpanda-app/db/migrations/0007_sprint_summary.sql
    - bigpanda-app/app/api/projects/[id]/sprint-summary/route.ts
    - bigpanda-app/components/SprintSummaryPanel.tsx
    - bigpanda-app/skills/sprint-summary-generator.md
  modified:
    - bigpanda-app/db/schema.ts
    - bigpanda-app/app/customer/[id]/plan/layout.tsx
    - bigpanda-app/app/api/__tests__/sprint-summary.test.ts
decisions:
  - "[Phase 07-06]: sprint-summary output stored in projects.sprint_summary — no outputs table insert (PLAN-13: not in Output Library)"
  - "[Phase 07-06]: Transient skill_run row created for orchestrator tracking — does not surface in Output Library since no outputs row is written"
  - "[Phase 07-06]: SprintSummaryPanel open=true initial state prevents hydration mismatch — Client Component initialized identically on server and client"
metrics:
  duration: 2min
  tasks_completed: 2
  files_changed: 7
  completed_date: "2026-03-24"
---

# Phase 07 Plan 06: Sprint Summary Panel Summary

**One-liner:** Collapsible sprint summary panel at the top of every Plan tab page — AI-generated via SkillOrchestrator, stored in projects table, not in the Output Library.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | DB migration 0007 + schema update + sprint-summary API route | 3a3f2ff | 0007_sprint_summary.sql, schema.ts, route.ts, sprint-summary-generator.md, sprint-summary.test.ts |
| 2 | SprintSummaryPanel component + plan layout integration | d3101ef | SprintSummaryPanel.tsx, plan/layout.tsx |

## What Was Built

PLAN-13 fully implemented:

1. **Migration 0007** — Adds `sprint_summary TEXT` and `sprint_summary_at TIMESTAMPTZ` columns to the projects table via `IF NOT EXISTS` guard.

2. **Schema update** — `bigpanda-app/db/schema.ts` projects table now includes both new columns with correct Drizzle types.

3. **SKILL.md** — `bigpanda-app/skills/sprint-summary-generator.md` contains a delivery-manager system prompt instructing three-paragraph plain-English output (completions, priorities, at-risk items) under 250 words.

4. **API route** — GET returns stored `{ summary, generated_at }` (null if never generated). POST creates a transient `skill_runs` row, calls `SkillOrchestrator.run()`, reads `full_output`, writes it to `projects.sprint_summary`, and returns the result. **No `outputs` table insert** — per PLAN-13 the summary is not in the Output Library.

5. **SprintSummaryPanel** — `'use client'` React component with collapse/expand toggle, date label, and a Refresh button. On mount fetches stored summary via GET. Refresh triggers POST. Loading state drives spinner animation. Uses `sonner` toast for success/error feedback.

6. **Plan layout** — `app/customer/[id]/plan/layout.tsx` imports and renders `SprintSummaryPanel` between `PlanTabs` and the `{children}` div, making it visible above all Plan sub-tab pages.

## Verification

- Migration file `0007_sprint_summary.sql` created
- `schema.ts` projects table has `sprint_summary` and `sprint_summary_at` columns
- API route GET returns `{ summary, generated_at }` — 3/3 vitest tests GREEN
- API route POST generates and stores summary (not in outputs table) — verified by mock assertions
- `SprintSummaryPanel` rendered between `PlanTabs` and `children` in plan layout
- TypeScript compiles cleanly for all new files (pre-existing IORedis TS error in trigger route is out of scope)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Exist
- `bigpanda-app/db/migrations/0007_sprint_summary.sql` — FOUND
- `bigpanda-app/app/api/projects/[id]/sprint-summary/route.ts` — FOUND
- `bigpanda-app/components/SprintSummaryPanel.tsx` — FOUND
- `bigpanda-app/skills/sprint-summary-generator.md` — FOUND

### Commits Exist
- `3a3f2ff` — FOUND (feat(07-06): DB migration 0007 + sprint-summary API route)
- `d3101ef` — FOUND (feat(07-06): SprintSummaryPanel component + plan layout integration)

## Self-Check: PASSED
