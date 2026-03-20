---
phase: 05-skill-engine
plan: 04
subsystem: ui, api
tags: [nextjs, drizzle-orm, bullmq, sonner, lucide-react, tailwind]

# Dependency graph
requires:
  - phase: 05-02
    provides: "skill_runs and drafts DB schema + SkillOrchestrator wired to BullMQ"

provides:
  - "Drafts Inbox section on Dashboard with inline edit, Copy/Gmail/Slack/Dismiss actions"
  - "GET /api/drafts — list pending drafts with project name join"
  - "PATCH /api/drafts/[id] — edit content or soft-dismiss (status=dismissed)"
  - "Output Library page at /outputs with account/skill-type/date filters and archived toggle"
  - "GET /api/outputs — filterable outputs list with project join"
  - "POST /api/outputs — register new output from skill handler"
  - "PATCH /api/outputs/[id] — archive output on regenerate"
  - "GET /api/outputs/[id]/open — shells macOS open command for filepath-backed outputs"
  - "Sidebar /outputs link above Settings (Library icon)"
  - "outputs.archived boolean column added to schema + 0004 migration SQL"

affects:
  - 05-03
  - 05-05
  - 06-mcp-integrations

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Soft-delete via status enum ('dismissed') for drafts — not hard DELETE"
    - "Archived boolean on outputs table for supersede-on-regenerate flow"
    - "Client Component fetch pattern: useEffect + loadDrafts/loadOutputs with re-fetch on action"
    - "Optimistic list removal after dismiss (filter prev.filter)"
    - "data-output-type attribute distinguishes HTML vs file outputs for iframe vs Open-button logic"

key-files:
  created:
    - bigpanda-app/components/DraftsInbox.tsx
    - bigpanda-app/app/api/drafts/route.ts
    - bigpanda-app/app/api/drafts/[id]/route.ts
    - bigpanda-app/app/api/outputs/route.ts
    - bigpanda-app/app/api/outputs/[id]/route.ts
    - bigpanda-app/app/api/outputs/[id]/open/route.ts
    - bigpanda-app/app/outputs/page.tsx
  modified:
    - bigpanda-app/app/page.tsx
    - bigpanda-app/components/Sidebar.tsx
    - bigpanda-app/db/schema.ts
    - bigpanda-app/db/migrations/0004_add_skill_engine.sql

key-decisions:
  - "Drafts Inbox is a Client Component (DraftsInbox.tsx) imported into the RSC Dashboard — client-side fetch required for optimistic dismiss/edit without full page reload"
  - "outputs.archived column added to schema.ts with boolean type — ALTER TABLE IF NOT EXISTS appended to 0004 migration to avoid a new migration file"
  - "Regenerate flow in Output Library: POST to skill run API, PATCH old output archived=true, navigate to new run page — all client-side sequential"
  - "system-open endpoint shells macOS 'open filepath' — GET semantics (idempotent, no body) for simplicity"

patterns-established:
  - "Per-row action buttons in a flex shrink-0 container (right side), content in flex-1 min-w-0 (left) — consistent draft and output row layout"
  - "Stub integrations use toast.info() with Phase 6 message — signals intent without silent no-op"

requirements-completed: [DASH-09, OUT-01, OUT-02, OUT-03, OUT-04]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 5 Plan 04: Drafts Inbox + Output Library Summary

**Drafts Inbox on Dashboard with soft-dismiss/inline-edit, and /outputs Output Library page with account/skill/date filters, HTML iframe preview, macOS system-open, and archived-column regenerate flow**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T18:54:06Z
- **Completed:** 2026-03-20T18:57:01Z
- **Tasks:** 2/2
- **Files modified:** 11

## Accomplishments

- Drafts Inbox surfaced on Dashboard: pending drafts with inline editor (expand-on-click), Copy/Gmail Draft(stub)/Slack(stub)/Dismiss — DASH-09 fully met
- Full Output Library at /outputs: filterable by account, skill type, date; HTML outputs render in sandboxed iframe; .docx/.pptx show macOS Open button — OUT-01 through OUT-04 met
- outputs.archived boolean column added to schema.ts + 0004 migration SQL for soft-supersede on Regenerate

## Task Commits

Each task was committed atomically:

1. **Task 1: Drafts Inbox on Dashboard + Drafts API** - `0ccf847` (feat)
2. **Task 2: Output Library page + outputs API + Sidebar link + system-open endpoint** - `c8b3dc6` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `bigpanda-app/components/DraftsInbox.tsx` - Client Component with data-testid='drafts-inbox', per-draft edit/dismiss/copy actions
- `bigpanda-app/app/api/drafts/route.ts` - GET pending drafts with project name join
- `bigpanda-app/app/api/drafts/[id]/route.ts` - PATCH edit content or soft-dismiss
- `bigpanda-app/app/api/outputs/route.ts` - GET filterable outputs + POST register new output
- `bigpanda-app/app/api/outputs/[id]/route.ts` - PATCH archive output (regenerate flow)
- `bigpanda-app/app/api/outputs/[id]/open/route.ts` - GET shells macOS open command via child_process
- `bigpanda-app/app/outputs/page.tsx` - Output Library page with data-testid='output-library', 3 filter controls, iframe/Open/Regenerate
- `bigpanda-app/app/page.tsx` - Added DraftsInbox import and render below activity feed
- `bigpanda-app/components/Sidebar.tsx` - Added /outputs Library link above Settings
- `bigpanda-app/db/schema.ts` - Added archived boolean column to outputs table
- `bigpanda-app/db/migrations/0004_add_skill_engine.sql` - ALTER TABLE outputs ADD COLUMN archived appended

## Decisions Made

- DraftsInbox is a Client Component imported into the RSC Dashboard — needed client-side fetch for optimistic dismiss without full page reload
- outputs.archived column appended to existing 0004 migration (ALTER TABLE IF NOT EXISTS) — avoids a new migration file for a single column addition
- Regenerate flow is fully client-side: POST skill/run → PATCH archive old → router.push to new run page
- system-open endpoint uses GET semantics with no request body — idempotent, natural REST fit for "open this file"

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors (ioredis/bullmq version mismatch, missing SkillsTabClient from plan 05-03) were unchanged — all 49 error lines are pre-existing and unrelated to this plan's files.

## User Setup Required

None — no external service configuration required. The ALTER TABLE migration appended to 0004 will run when the user runs drizzle-kit migrate.

## Next Phase Readiness

- Drafts Inbox and Output Library are fully wired UI-to-API
- Skill handlers (plans 05-03, 05-05+) can call POST /api/outputs to register completed outputs — endpoint ready
- Gmail Draft and Slack send are stubbed (toast.info) — Phase 6 MCP wiring will replace stubs
- Regenerate endpoint calls POST /api/skills/[skillName]/run — this route is created in plan 05-03

---
*Phase: 05-skill-engine*
*Completed: 2026-03-20*
