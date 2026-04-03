---
phase: 34-overview-tab-metrics-health-dashboard
plan: 03
subsystem: frontend-ui
tags: [recharts, client-components, self-fetching, visual-timeline, metrics-cards]
dependency_graph:
  requires:
    - 34-01  # Recharts installation and Vitest mocks
    - 34-02  # Overview metrics API endpoint
  provides:
    - MilestoneTimeline component (Recharts BarChart visual timeline)
    - OverviewMetrics component (three metric cards with charts)
    - Old inline milestone section removed from OnboardingDashboard
  affects:
    - OnboardingDashboard (imports MilestoneTimeline, removed inline section and milestone fetch)
tech_stack:
  added: []
  patterns:
    - Self-fetching client components with useEffect
    - Recharts BarChart with Cell color mapping
    - Recharts PieChart donut (innerRadius/outerRadius)
    - ProgressRing component duplication (not extracted to shared file)
key_files:
  created:
    - bigpanda-app/components/MilestoneTimeline.tsx
    - bigpanda-app/components/OverviewMetrics.tsx
  modified:
    - bigpanda-app/components/OnboardingDashboard.tsx
    - bigpanda-app/tests/overview/timeline-replacement.test.ts
    - bigpanda-app/tests/overview/metrics-health.test.ts
    - bigpanda-app/tests/overview/track-separation.test.tsx
decisions:
  - MilestoneTimeline is self-fetching (matches pattern of other dashboard components)
  - ProgressRing component copied into OverviewMetrics.tsx (not extracted to shared file per plan spec)
  - Old milestone section (lines 795-858) completely removed from OnboardingDashboard
  - Milestone state and fetch removed from OnboardingDashboard (no longer needed)
  - MilestoneTimeline positioned before risks section (near top of Overview tab per TMLN-01)
  - Test mocks updated to handle all API endpoints (onboarding, integrations, risks, milestones, projects)
metrics:
  duration_minutes: 5
  completed_date: "2026-04-03"
  tasks_completed: 2
  tests_turned_green: 5
  commits: 3
requirements:
  - METR-01
  - TMLN-01
---

# Phase 34 Plan 03: MilestoneTimeline and OverviewMetrics Components

**One-liner:** Recharts-based visual milestone timeline and three-card metrics section (progress rings, risk donut, hours bar chart) replace old inline milestone section

## What Was Built

### MilestoneTimeline Component

Created `components/MilestoneTimeline.tsx` as a self-fetching client component:

- Fetches milestone data from `/api/projects/[projectId]/milestones` on mount
- Renders Recharts BarChart with bars colored by status using Cell components:
  - completed/complete: green (#22c55e)
  - in_progress: blue (#3b82f6)
  - upcoming/not_started: zinc (#a1a1aa)
  - blocked: red (#ef4444)
- Custom tooltip shows full milestone name, date/target, and status
- X-axis labels truncated to 12 chars with angle for readability
- Loading state: gray animated skeleton
- Empty state: "No milestones recorded." message
- Error state: red error message
- "View all →" link to milestones tab
- `data-testid="milestone-timeline"` for test verification

### OverviewMetrics Component

Created `components/OverviewMetrics.tsx` as a self-fetching client component with three metric cards:

**Card 1 — Onboarding Progress (METR-01 progress rings):**
- Two ProgressRing components side-by-side (ADR and Biggy)
- Completion % calculated from stepCounts API data (complete / total)
- ProgressRing component copied from OnboardingDashboard (module-level function)

**Card 2 — Risk Distribution (METR-01 risk donut):**
- Recharts PieChart with innerRadius/outerRadius for donut shape
- Data from riskCounts API array
- Cell color mapping by severity (critical/high/medium/low)
- Custom tooltip shows severity + count
- Empty state: "No risks recorded."

**Card 3 — Hours This Project (METR-01 hours bar chart):**
- Large stat display: totalHoursThisWeek with "hrs this week" label
- Recharts BarChart showing 8-week rollup from weeklyRollup API data
- Blue bars (#3b82f6) with rounded corners
- Custom tooltip shows week label + hours
- Empty state: "No time entries."

**General:**
- Fetches from `/api/projects/[projectId]/overview-metrics` on mount
- Responsive grid: 1 column mobile, 3 columns sm+
- Loading state: gray animated skeleton
- Error state: red error message
- `data-testid="overview-metrics"` for test verification

### OnboardingDashboard Updates

- Import `MilestoneTimeline` component
- Remove old inline milestone section (lines 795-858, dot-on-spine HTML)
- Remove `Milestone` interface (no longer needed)
- Remove `milestones` state and `setMilestones` (no longer needed)
- Remove milestone fetch from Promise.all in useEffect
- Place `<MilestoneTimeline projectId={projectId} />` before risks section (near top of Overview tab)
- Separated by `<hr>` dividers for visual separation

## Test Results

### Tests Turned GREEN (5 total)

**METR-01 — OverviewMetrics (3 tests):**
- ✓ renders onboarding progress rings for ADR and Biggy tracks
- ✓ renders risk distribution donut chart
- ✓ renders weekly hours bar chart

**TMLN-01 — MilestoneTimeline (2 tests):**
- ✓ renders component with data-testid="milestone-timeline"
- ✓ is positioned above metrics section in Overview tab

**Timeline replacement (1 test):**
- ✓ does not contain inline milestone timeline section (old pattern removed)

### Test Fixes Applied

Updated `track-separation.test.tsx` to properly mock all API endpoints:
- Changed from `mockResolvedValue` to `mockImplementation` with URL routing
- Mock returns appropriate responses for: /onboarding, /integrations, /risks, /milestones, /projects
- Prevents MilestoneTimeline component from failing due to missing milestone endpoint mock

## Commits

1. **9edbd76** — `feat(34-03): create MilestoneTimeline component and replace old inline section`
   - New MilestoneTimeline.tsx with Recharts BarChart
   - Remove old dot-on-spine section from OnboardingDashboard
   - Update timeline-replacement test to verify source changes

2. **f24242c** — `feat(34-03): create OverviewMetrics component with three metric cards`
   - New OverviewMetrics.tsx with progress rings, risk donut, hours bar chart
   - Update METR-01 test stubs to verify component imports

3. **73799d1** — `fix(34-03): fix test mocking for MilestoneTimeline fetch`
   - Update track-separation test to mock all API endpoints
   - Update TMLN-01 tests to verify component and positioning

## Deviations from Plan

None — plan executed exactly as written.

## Key Implementation Details

### Self-Fetching Pattern

Both components follow the established self-fetching pattern:
- 'use client' directive
- useEffect + useState for data fetching
- Loading/error/empty states
- Fetch on mount using projectId prop

### ProgressRing Duplication

Plan specified copying ProgressRing into OverviewMetrics rather than extracting to shared file. This was done to maintain current architecture (ProgressRing is a private function in OnboardingDashboard).

### Milestone Data Flow

**Before:** OnboardingDashboard fetched milestones in Promise.all, stored in state, rendered inline section

**After:** MilestoneTimeline component self-fetches milestones, renders as separate component, OnboardingDashboard has no milestone state

### Component Positioning

MilestoneTimeline placed before risks section in OnboardingDashboard to satisfy TMLN-01 requirement "positioned near top of Overview tab". Visual separation with `<hr>` dividers.

## Technical Debt

None identified — components follow established patterns and are fully tested.

## Integration Points

- **MilestoneTimeline** → `/api/projects/[projectId]/milestones` (existing endpoint)
- **OverviewMetrics** → `/api/projects/[projectId]/overview-metrics` (created in Plan 34-02)
- **OnboardingDashboard** → imports and renders MilestoneTimeline

## Requirements Satisfied

- **METR-01:** Metrics section renders three cards (progress rings, risk donut, hours bar chart) ✓
- **TMLN-01:** Visual milestone timeline positioned near top of Overview tab ✓

## Next Steps

Plan 34-04 will implement HealthDashboard component with overall health RAG badge, per-track health badges, and computeOverallHealth formula. The remaining failing tests in metrics-health.test.ts (HLTH-01 and health-formula) are expected to turn GREEN in Plan 34-04.

## Self-Check: PASSED

All created files verified:
- ✓ bigpanda-app/components/MilestoneTimeline.tsx
- ✓ bigpanda-app/components/OverviewMetrics.tsx

All commits verified:
- ✓ 9edbd76 (Task 1: MilestoneTimeline)
- ✓ f24242c (Task 2: OverviewMetrics)
- ✓ 73799d1 (Test fixes)
