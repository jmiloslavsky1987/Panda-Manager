---
phase: 62-ingestion-consolidation
plan: 02
subsystem: ui
tags: [completeness-analysis, ai-structured-output, workspace-quality, vercel-ai-sdk]

# Dependency graph
requires:
  - phase: 62-01
    provides: Scan for Updates card in Document Ingestion tab
provides:
  - Numeric completeness scores (0-100%) per workspace tab
  - Conflicting status detection for semantically contradictory records
  - Schema versioning for completeness analysis results
  - Enhanced completeness API with structured output validation
affects: [workspace-intelligence, quality-metrics, extraction-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tool-based structured output with Vercel AI SDK (replaces deprecated output_config)
    - Numeric quality scoring (0-100 scale) for AI analysis results
    - Schema versioning pattern for AI output compatibility tracking

key-files:
  created: []
  modified:
    - bigpanda-app/lib/tab-template-registry.ts
    - bigpanda-app/app/api/projects/[projectId]/completeness/route.ts
    - bigpanda-app/components/ContextTab.tsx

key-decisions:
  - "Use tool-based structured output instead of deprecated output_config for API completeness analysis"
  - "Orange badge (bg-orange-100) distinguishes conflicting status from partial/empty/complete"
  - "Schema version tag (v1) displayed in UI header for transparency and future compatibility"
  - "Score displayed as percentage suffix on badge (e.g., 'partial — 43%')"

patterns-established:
  - "Completeness schema versioning: COMPLETENESS_SCHEMA_VERSION constant in registry, included in API response"
  - "Numeric quality scores: 0-100 integer scale with semantic thresholds (0=empty, 1-79=partial, 80-100=complete, conflicting=scored independently)"
  - "Conflicting detection: Status for semantic contradictions (e.g., milestone 'complete' with no date)"

requirements-completed: [INGEST-04]

# Metrics
duration: 15min
completed: 2026-04-14
---

# Phase 62 Plan 02: Completeness Enhancement Summary

**Numeric completeness scores (0-100%) with conflicting status detection and schema versioning using tool-based structured output**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-14T22:55:43-07:00
- **Completed:** 2026-04-14T23:11:01-07:00
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 3

## Accomplishments
- Completeness analysis now returns numeric scores (0-100%) per tab with percentage display in UI
- New "conflicting" status with orange badge for semantically contradictory records
- Schema versioning (v1) visible in UI header for future compatibility tracking
- Tool-based structured output replaces deprecated output_config approach

## Task Commits

Each task was committed atomically:

1. **Task 1: Add COMPLETENESS_SCHEMA_VERSION to tab-template-registry and update API route** - `153aa8c` (feat)
2. **Task 2: Update ContextTab completeness panel for score, conflicting, and schema version** - `d479662` (feat)
3. **Task 3: Verify completeness enhancement and scan consolidation in the running app** - Human verification approved (no commit)

**Deviation fix:** `6ee2aa5` (fix) - replaced invalid output_config with tool-based structured output

## Files Created/Modified
- `bigpanda-app/lib/tab-template-registry.ts` - Added COMPLETENESS_SCHEMA_VERSION constant ("v1")
- `bigpanda-app/app/api/projects/[projectId]/completeness/route.ts` - Enhanced CompletenessEntry interface with score + conflicting status; updated COMPLETENESS_SYSTEM prompt with scoring and conflict guidance; converted to tool-based structured output; wrapped response with schemaVersion
- `bigpanda-app/components/ContextTab.tsx` - Updated CompletenessResult interface; added schemaVersion state; updated handleAnalyze to unpack {schemaVersion, results}; added schema version tag to header; extended badge rendering with score percentage and orange color for conflicting

## Decisions Made
- **Tool-based structured output:** Migrated from deprecated `output_config` to tool-based structured output pattern with Vercel AI SDK's `generateText` and `toolChoice: "required"` for schema enforcement
- **Conflicting badge color:** Orange (bg-orange-100 text-orange-800) to distinguish from partial (yellow) and empty (gray)
- **Score display pattern:** Append percentage to status badge text ("partial — 43%") for compact visual hierarchy
- **Schema version visibility:** Display "schema v1" tag in completeness header for user transparency and debugging

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced invalid output_config with tool-based structured output**
- **Found during:** Task 3 human verification (API route returning errors during completeness analysis)
- **Issue:** Plan specified using `output_config.format` with `json_schema`, but this approach is deprecated in Vercel AI SDK 4.1+. The SDK was returning errors: "output_config is not a valid parameter"
- **Fix:** Refactored POST handler to use tool-based structured output pattern:
  - Created `analyzeCompleteness` tool definition with input/output schemas
  - Changed from `streamText` to `generateText` with `toolChoice: "required"`
  - Extracted structured results from `toolCalls[0].args.results`
  - Maintained identical output shape and validation
- **Files modified:** `bigpanda-app/app/api/projects/[projectId]/completeness/route.ts`
- **Verification:** Ran completeness analysis in dev environment — API returned valid {schemaVersion, results} structure with numeric scores and conflicting status
- **Committed in:** `6ee2aa5` (separate fix commit)

---

**Total deviations:** 1 auto-fixed (1 bug — API incompatibility)
**Impact on plan:** Fix was necessary for correctness — planned output_config approach was invalid for current SDK version. Tool-based pattern achieves identical functionality with supported API. No scope change.

## Issues Encountered
- **Vercel AI SDK API change:** Plan specified `output_config` pattern from older SDK documentation. Current SDK (4.1+) requires tool-based structured output for schema enforcement. Fixed via Rule 1 (auto-fix bug).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Completeness enhancement complete with numeric scores, conflicting detection, and schema versioning
- Phase 62 (Ingestion Consolidation) complete: Plan 01 (Scan for Updates) and Plan 02 (Completeness Enhancement) both shipped
- Ready for Phase 63 (Skills Design Standard) — foundation for editable prompts UI

## Self-Check: PASSED

All key files verified:
- ✓ bigpanda-app/lib/tab-template-registry.ts
- ✓ bigpanda-app/app/api/projects/[projectId]/completeness/route.ts
- ✓ bigpanda-app/components/ContextTab.tsx

All commits verified:
- ✓ 153aa8c (Task 1)
- ✓ d479662 (Task 2)
- ✓ 6ee2aa5 (Bug fix)

---
*Phase: 62-ingestion-consolidation*
*Completed: 2026-04-14*
