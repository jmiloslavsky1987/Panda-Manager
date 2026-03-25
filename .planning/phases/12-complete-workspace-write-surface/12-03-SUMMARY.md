---
phase: 12-complete-workspace-write-surface
plan: 03
subsystem: ui
tags: [nextjs, react, drizzle-orm, dialog, shadcn, zod, fetch, router-refresh]

requires:
  - phase: 12-02
    provides: Risk edit modal pattern, PATCH /api/risks/[id], shared write surface conventions
  - phase: 02-app-shell-read-surface
    provides: decisions/page.tsx, architecture/page.tsx, teams/page.tsx read-only RSC pages

provides:
  - POST /api/decisions — append-only INSERT with Zod validation, source=manual_entry
  - PATCH /api/workstreams/[id] — shared route for state+lead (architecture) and percent_complete (teams)
  - AddDecisionModal client component — inline form for adding key decisions
  - ArchitectureEditModal client component — per-workstream Edit button for state+lead fields
  - WorkstreamTableClient client component — Progress column with range slider, % label, conditional Save
  - Clean workspace UI with all Phase 3 placeholder banners removed

affects:
  - 12-04 (E2E tests target these write surfaces)
  - future-phases (workstreams PATCH route is reusable for other percent_complete updates)

tech-stack:
  added: []
  patterns:
    - "Client modal components in components/ directory, RSC page imports them — keeps pages async-capable"
    - "Append-only POST route mirrors notes pattern: Zod, INSERT only, no GET handler"
    - "Shared PATCH route handles both Architecture (state+lead) and Teams (percent_complete) via Zod refine"
    - "WorkstreamTableClient: pendingPct + dirtyIds state pattern for conditional Save button visibility"

key-files:
  created:
    - bigpanda-app/app/api/decisions/route.ts
    - bigpanda-app/app/api/workstreams/[id]/route.ts
    - bigpanda-app/components/AddDecisionModal.tsx
    - bigpanda-app/components/ArchitectureEditModal.tsx
    - bigpanda-app/components/WorkstreamTableClient.tsx
  modified:
    - bigpanda-app/app/customer/[id]/decisions/page.tsx
    - bigpanda-app/app/customer/[id]/architecture/page.tsx
    - bigpanda-app/app/customer/[id]/teams/page.tsx

key-decisions:
  - "AddDecisionModal extracted to components/ (not inline) — decisions/page.tsx must stay async RSC"
  - "WorkstreamTableClient replaces shadcn Table in teams/page.tsx — native HTML table enables range input in cells"
  - "Architecture state textarea does NOT trim on save — whitespace-pre-wrap content must round-trip exactly"
  - "Workstreams PATCH route does NOT call updateWorkstreamProgress() — direct percent_complete write and task-derived rollup are independent paths"

patterns-established:
  - "Client modal component in components/ imported by RSC page — correct Next.js 15 boundary pattern"
  - "dirtyIds Set<number> pattern for tracking which rows have unsaved slider changes"

requirements-completed: []

duration: 4min
completed: 2026-03-25
---

# Phase 12 Plan 03: Complete Workspace Write Surface — Decisions, Architecture, Teams

**Append-only POST /api/decisions, shared PATCH /api/workstreams/[id], three client write modals (AddDecision, ArchitectureEdit, WorkstreamTableClient slider), and all Phase 3 placeholder banners removed.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-25T18:29:54Z
- **Completed:** 2026-03-25T18:33:05Z
- **Tasks:** 2
- **Files modified:** 8 (5 created, 3 updated)

## Accomplishments
- POST /api/decisions with Zod validation, append-only INSERT (matches DB trigger semantics)
- PATCH /api/workstreams/[id] with Zod refine guard — handles both architecture (state+lead) and teams (percent_complete) use cases
- AddDecisionModal extracted to standalone client component; decisions/page.tsx remains an async RSC
- ArchitectureEditModal with Edit button per workstream card, state textarea preserving whitespace
- WorkstreamTableClient with range slider (0-100), live % label, and conditional Save button per row
- All Phase 3 placeholder banners removed from decisions, architecture, and teams tabs

## Task Commits

1. **Task 1: Decisions POST route + workstreams PATCH route** - `e4c4cc4` (feat)
2. **Task 2: Decisions modal + Architecture modal + Teams slider + banner removal** - `ac3d5f2` (feat)

## Files Created/Modified
- `bigpanda-app/app/api/decisions/route.ts` - Append-only POST for key_decisions table
- `bigpanda-app/app/api/workstreams/[id]/route.ts` - Shared PATCH for state, lead, percent_complete
- `bigpanda-app/components/AddDecisionModal.tsx` - Client component; decision + context textarea fields
- `bigpanda-app/components/ArchitectureEditModal.tsx` - Client component; per-workstream state + lead edit
- `bigpanda-app/components/WorkstreamTableClient.tsx` - Client table with range slider + conditional Save
- `bigpanda-app/app/customer/[id]/decisions/page.tsx` - RSC: added AddDecisionModal, removed amber banner
- `bigpanda-app/app/customer/[id]/architecture/page.tsx` - RSC: added Edit button per card, removed blue banner
- `bigpanda-app/app/customer/[id]/teams/page.tsx` - RSC: replaced local WorkstreamTable with WorkstreamTableClient

## Decisions Made
- AddDecisionModal was placed in `components/` (not inline in page.tsx) because Next.js 15 requires `'use client'` components to be in separate files when the containing page is an async RSC.
- WorkstreamTableClient replaces the shadcn `Table` component in teams/page.tsx — the shadcn Table doesn't support interactive inputs inside cells without adding `'use client'` to the page; a native HTML table in a client component is cleaner.
- Architecture state is NOT trimmed on save — the field uses `whitespace-pre-wrap` for display, so exact whitespace must round-trip.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Structural] Modal components extracted to components/ instead of inline**
- **Found during:** Task 2 (Decisions modal implementation)
- **Issue:** Plan suggested "inline client component at the top of the file" but decisions/page.tsx is an async RSC — mixing `'use client'` inline with async export is not valid in Next.js 15
- **Fix:** Created `AddDecisionModal.tsx` and `ArchitectureEditModal.tsx` as separate files in `components/`; RSC pages import them
- **Files modified:** components/AddDecisionModal.tsx, components/ArchitectureEditModal.tsx (created)
- **Verification:** TypeScript compiles clean on all modified files; pages remain async RSC
- **Committed in:** ac3d5f2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (structural fix for Next.js 15 RSC/client boundary)
**Impact on plan:** No scope creep. The modal extraction is the correct pattern per Next.js 15 — plan note said "or import from a separate file if you prefer" which applies here.

## Issues Encountered
- Pre-existing TypeScript errors in ioredis/bullmq type conflict (worker files) and js-yaml types in yaml-export.ts — both out of scope, not caused by this plan's changes.

## Next Phase Readiness
- All three write surfaces complete and committed; ready for plan 12-04 E2E tests to turn GREEN
- API routes `/api/decisions` (POST) and `/api/workstreams/[id]` (PATCH) are available for E2E testing

---
*Phase: 12-complete-workspace-write-surface*
*Completed: 2026-03-25*
