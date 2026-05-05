---
phase: 84-discovery-scan-hardening
plan: "05"
subsystem: ui
tags: [discovery, sse, react, typescript, sonner]

# Dependency graph
requires:
  - phase: 84-discovery-scan-hardening/84-04
    provides: "DiscoveryScanResult type + 12 entity types + approve route 8 new cases"
provides:
  - "DiscoveryScanResult interface: { items, sourceSummary } return type from runDiscoveryScan()"
  - "SSE complete event carries sourceSummary per-source fetch stats"
  - "ScanForUpdatesButton shows post-scan per-source breakdown in Sonner toast"
  - "QueueItemRow TYPE_LABELS map with all 14 entity types + fallback formatter"
affects: [discovery-ui, review-queue, scan-feedback]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sourceSummary tracking: per-source skipped/fetched stats accumulated inside runDiscoveryScan loop"
    - "SSE event enrichment: sourceSummary propagated through complete event payload"
    - "Sonner description param: per-source breakdown as toast subtitle text"
    - "TYPE_LABELS map + fallback: capitalize raw suggested_field value for unknown types"

key-files:
  created: []
  modified:
    - lib/discovery-scanner.ts
    - app/api/discovery/scan/route.ts
    - components/ScanForUpdatesButton.tsx
    - components/QueueItemRow.tsx

key-decisions:
  - "ScanForUpdatesButton breakdown uses SOURCE_LABELS map for display names (Slack not slack)"
  - "typeLabel() fallback replaces underscores and capitalizes each word — handles any future types"
  - "sourceSummary uses skipped boolean not nullable fetch count — clearer intent at callsite"
  - "Toast breakdown joins per-source entries with ' · ' separator for compact inline display"

patterns-established:
  - "Per-source SSE breakdown: sourceSummary.skipped drives credentialed vs skipped message in UI"

requirements-completed: []

# Metrics
duration: 28min
completed: 2026-05-05
---

# Phase 84 Plan 05: Per-Source SSE Breakdown + Entity Label Display Summary

**DiscoveryScanResult with sourceSummary wired through SSE to ScanForUpdatesButton toast + all 14 entity type labels in QueueItemRow**

## Performance

- **Duration:** 28 min
- **Started:** 2026-05-05T06:12:47Z
- **Completed:** 2026-05-05T06:41:00Z (partial — stopped at checkpoint Task 3)
- **Tasks completed:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 4

## Accomplishments

- `runDiscoveryScan()` returns `DiscoveryScanResult: { items, sourceSummary }` with per-source fetch/skip stats
- SSE complete event payload carries `sourceSummary` for client consumption
- `ScanForUpdatesButton` parses `sourceSummary` from SSE complete event and shows "Slack: 3 messages · Gmail: no credentials" as Sonner toast description
- `QueueItemRow` now has `TYPE_LABELS` map covering all 14 entity types (6 original + 8 Phase 84 new) with a capitalization fallback for any unlisted type

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend runDiscoveryScan to return sourceSummary + wire through SSE complete event** - `7e8df68f` (feat)
2. **Task 2: Per-source breakdown in ScanForUpdatesButton + entity labels in ReviewQueue** - `969d800a` (feat)
3. **Task 3: Human verification checkpoint** - pending (awaiting human verification)

## Files Created/Modified

- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/discovery-scanner.ts` — Added `DiscoveryScanResult` interface, sourceSummary tracking per source, return `{ items, sourceSummary }`
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/discovery/scan/route.ts` — Destructure `{ items, sourceSummary }` from `runDiscoveryScan()`, add `sourceSummary` to SSE complete event
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/ScanForUpdatesButton.tsx` — Add `sourceSummary` to SSE payload type, build breakdown string, pass as Sonner toast `description`
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/QueueItemRow.tsx` — Add `TYPE_LABELS` map for 14 entity types, `typeLabel()` fallback function, render `typeLabel()` in badge

## Decisions Made

- `ScanForUpdatesButton` uses `SOURCE_LABELS[src as Source] ?? src` for display names — shows "Slack" not "slack" in breakdown
- `typeLabel()` fallback (replace underscores, capitalize words) handles any future types without code changes
- `sourceSummary` format uses `skipped: boolean` + optional `reason` string — clearer than counting 0 fetched vs truly skipped
- Toast description via Sonner `description` param — subtitle appears below main toast message, compact and non-intrusive

## Deviations from Plan

None - plan executed exactly as written. Task 1 implementation and commit were already present from Plan 84-04 overflow; Task 2 uncommitted changes were exactly as specified.

## Issues Encountered

- `queue.test.ts` and `dismiss.test.ts` have 8 pre-existing failures (unrelated to Phase 84-05 changes — confirmed by stash test)
- Full suite shows 64 failing test files, all pre-existing (Phase 48 mocking patterns, portfolio/lifecycle, deployment URL scan)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Task 3 checkpoint awaiting human visual verification
- Dev server running at http://localhost:3000
- All Phase 84 code changes committed and pushed to remote
- After human approval: update STATE.md, ROADMAP.md, final commit

---
*Phase: 84-discovery-scan-hardening*
*Completed: 2026-05-05 (partial — checkpoint)*
