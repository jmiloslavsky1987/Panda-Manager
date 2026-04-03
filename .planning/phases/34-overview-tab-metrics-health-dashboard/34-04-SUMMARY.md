---
phase: 34-overview-tab-metrics-health-dashboard
plan: 04
subsystem: overview-ui
tags: [health-dashboard, rag-badges, metrics-aggregation, ui-composition]
dependency_graph:
  requires:
    - 34-02 (overview-metrics endpoint)
    - 34-03 (MilestoneTimeline and OverviewMetrics components)
  provides:
    - HealthDashboard component with rule-based RAG formula
    - Complete Overview page composition with 4 sections
  affects:
    - Overview tab layout order
    - Health visibility across tracks
tech_stack:
  added: []
  patterns:
    - Rule-based health formula with priority logic (critical > high > completion)
    - Per-track health computation with blocked ratio thresholds
    - Self-fetching client components sharing same API endpoint
    - Component composition via server component wrapper
key_files:
  created:
    - bigpanda-app/components/HealthDashboard.tsx
  modified:
    - bigpanda-app/app/customer/[id]/overview/page.tsx
    - bigpanda-app/tests/overview/metrics-health.test.ts
decisions:
  - Per-track badge formula: green=0 blocked, yellow=>0 and <50%, red=>=50% blocked OR any critical risk
  - Active blocker count excludes integrations/actions, only counts onboarding steps with status=blocked
  - HealthDashboard fetches from same overview-metrics endpoint (no separate API needed for v4.0)
  - MilestoneTimeline positioned ABOVE OnboardingDashboard per TMLN-01 requirement
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_created: 1
  files_modified: 2
  tests_added: 8
  tests_passing: 31
  commits: 2
  completed_date: "2026-04-03"
---

# Phase 34 Plan 04: HealthDashboard & Overview Composition Summary

**One-liner:** HealthDashboard with rule-based RAG formula (critical→red, high OR <50%→yellow) and complete Overview page composition with MilestoneTimeline → OnboardingDashboard → OverviewMetrics → HealthDashboard layout order.

## Objective Achieved

Built HealthDashboard component with priority-based health formula (critical risks trump all → red, high risks OR low completion → yellow, else green) and wired all four Phase 34 sections into Overview page with correct top-to-bottom positioning.

## Requirements Completed

- **HLTH-01:** Health dashboard with overall RAG badge, per-track ADR/Biggy badges, and active blocker count ✓
- **METR-01:** OverviewMetrics component integrated into Overview page layout ✓
- **TMLN-01:** MilestoneTimeline positioned above OnboardingDashboard (near top of page) ✓

## Tasks Completed

### Task 1: Create HealthDashboard component with rule-based health formula (TDD)

**Commit:** `9bb7929`

**Changes:**
- Created `components/HealthDashboard.tsx` as 'use client' component
- Exported `computeOverallHealth()` function with priority-based logic:
  1. Priority 1: `openCriticalRisks > 0` → red (trumps all)
  2. Priority 2: `openHighRisks > 0` OR `adrCompletion < 50` OR `biggyCompletion < 50` → yellow
  3. Otherwise: green
- Implemented `computeTrackHealth()` for per-track badges:
  - green: 0 blocked steps
  - yellow: > 0% and < 50% blocked
  - red: >= 50% blocked OR any critical risk in project
- Added RAG badge rendering with data-testid attributes:
  - `overall-health-badge` (overall project health)
  - `adr-health-badge` (ADR track health)
  - `biggy-health-badge` (Biggy track health)
- Active blocker count: sum of blocked onboarding steps across all tracks
- Fetches from `/api/projects/${projectId}/overview-metrics` (same endpoint as OverviewMetrics)
- Updated test stubs to import real component and run 5 formula assertions
- All 8 HLTH-01 and health-formula tests pass GREEN

**Files:**
- `bigpanda-app/components/HealthDashboard.tsx` (new, 197 lines)
- `bigpanda-app/tests/overview/metrics-health.test.ts` (updated test stubs with real assertions)

**TDD Protocol:**
- RED: Tests fail with ERR_MODULE_NOT_FOUND (component doesn't exist)
- GREEN: All 8 tests pass after component creation
- REFACTOR: Not needed (implementation clean on first pass)

### Task 2: Wire all sections into Overview page

**Commit:** `9ba525c`

**Changes:**
- Updated `app/customer/[id]/overview/page.tsx` to import all 4 components:
  - MilestoneTimeline
  - OnboardingDashboard
  - OverviewMetrics
  - HealthDashboard
- Wrapped in `<div className="space-y-6 py-4">` for consistent vertical spacing
- Rendering order (top to bottom):
  1. MilestoneTimeline (TMLN-01: positioned near top)
  2. OnboardingDashboard (existing dual-track dashboard)
  3. OverviewMetrics (progress rings, risk donut, hours bar chart)
  4. HealthDashboard (overall RAG, per-track badges, active blockers)
- All 31 Phase 34 tests pass GREEN (no regressions)
- TypeScript clean (`npx tsc --noEmit` passed)

**Files:**
- `bigpanda-app/app/customer/[id]/overview/page.tsx` (updated, added 10 lines)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

### Automated Tests

```bash
npm test -- tests/overview/ tests/api/overview-metrics.test.ts
```

**Results:** 31 tests passed (31 total)

**Coverage:**
- ✓ OverviewMetrics component tests (3 tests)
- ✓ HealthDashboard component tests (3 tests)
- ✓ computeOverallHealth formula tests (5 tests)
- ✓ MilestoneTimeline component tests (2 tests)
- ✓ Overview metrics API aggregation tests (5 tests)
- ✓ OnboardingDashboard dual-track UI tests (6 tests)
- ✓ Dual-track completeness tests (7 tests)

### TypeScript Verification

```bash
npx tsc --noEmit
```

**Result:** No new errors introduced. Pre-existing errors in tests/audit/ and tests/chat/ remain (out of scope).

## Technical Details

### Health Formula Implementation

**Overall Health Logic:**
```typescript
export function computeOverallHealth(metrics: {
  openCriticalRisks: number
  openHighRisks: number
  adrCompletion: number
  biggyCompletion: number
}): 'red' | 'yellow' | 'green' {
  if (metrics.openCriticalRisks > 0) return 'red'
  if (metrics.openHighRisks > 0 || metrics.adrCompletion < 50 || metrics.biggyCompletion < 50) return 'yellow'
  return 'green'
}
```

**Per-track Health Logic:**
- Filters stepCounts by track (case-insensitive)
- Calculates blocked ratio: `blocked / total`
- Returns red if `blockedRatio >= 0.5` OR `openCriticalRisks > 0`
- Returns yellow if `blockedRatio > 0`
- Returns green if `blockedRatio === 0`

**Active Blocker Count:**
```typescript
const activeBlockers = data.stepCounts
  .filter(s => s.status === 'blocked')
  .reduce((sum, s) => sum + s.count, 0)
```

### Data Flow

```
/api/projects/[projectId]/overview-metrics
  ↓
{ stepCounts, riskCounts, integrationCounts, milestoneOnTrack, weeklyRollup }
  ↓
HealthDashboard.tsx (useEffect fetch)
  ↓
computeOverallHealth() + computeTrackHealth()
  ↓
RAG badges + active blocker count
```

### Component Composition

```
app/customer/[id]/overview/page.tsx (server component)
  ├─ MilestoneTimeline (client, self-fetching)
  ├─ OnboardingDashboard (client, self-fetching)
  ├─ OverviewMetrics (client, self-fetching)
  └─ HealthDashboard (client, self-fetching)
```

All four components fetch independently. No props besides `projectId` passed from parent. This pattern allows each component to load independently with its own loading/error states.

## Key Decisions

1. **Per-track badge thresholds:** Locked in CONTEXT.md before implementation (green=0% blocked, yellow=>0% and <50%, red=>=50% OR critical risk). No discretion exercised - followed spec exactly.

2. **Active blocker definition:** Counts only onboarding steps with `status='blocked'`. Excludes blocked integrations, blocked actions, or critical risks. Locked in CONTEXT.md.

3. **Endpoint reuse:** HealthDashboard fetches from same `/api/projects/[projectId]/overview-metrics` endpoint as OverviewMetrics. No separate API needed. Acceptable for v4.0; caching/dedup is a future optimization.

4. **MilestoneTimeline placement:** Positioned ABOVE OnboardingDashboard per TMLN-01 requirement ("positioned near top"). This gives milestones high visibility in the Overview tab.

## Known Limitations

1. **No caching:** OverviewMetrics and HealthDashboard both fetch from `/api/projects/[projectId]/overview-metrics` independently. No shared fetch or cache. Future optimization: React Query or SWR for automatic deduplication.

2. **No real-time updates:** Components fetch once on mount. Changes to data require page refresh. Future enhancement: polling or WebSocket for live updates.

3. **Loading waterfall:** Four components load independently. No loading skeleton coordination. Future enhancement: Suspense boundaries with coordinated loading states.

## Next Steps

**Phase 34 Plan 05 (Final):**
- Human UAT verification of all Phase 34 components in browser
- Verify MilestoneTimeline chart renders correctly
- Verify OverviewMetrics cards display data
- Verify HealthDashboard badges show correct colors
- Verify page composition and spacing
- Test with real project data (not just unit tests)

**Future Enhancements (post-v4.0):**
- Add React Query for automatic fetch deduplication
- Add real-time updates via WebSocket or polling
- Add drill-down links from health badges to relevant sections
- Add trend arrows (health improving vs declining over time)

## Self-Check: PASSED

### Created Files
```bash
ls -la bigpanda-app/components/HealthDashboard.tsx
```
**Result:** FOUND: bigpanda-app/components/HealthDashboard.tsx (197 lines)

### Commits Exist
```bash
git log --oneline | head -2
```
**Result:**
- FOUND: 9ba525c feat(34-04): wire all sections into Overview page
- FOUND: 9bb7929 feat(34-04): create HealthDashboard component with rule-based health formula

### Tests Pass
```bash
npm test -- tests/overview/metrics-health.test.ts -t "HLTH-01|health-formula"
```
**Result:** 8 passed, 0 failed

### TypeScript Clean
```bash
npx tsc --noEmit
```
**Result:** No new errors (pre-existing errors in other test files out of scope)
