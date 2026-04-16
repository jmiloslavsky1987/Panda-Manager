---
phase: 66-overview-tracks-redesign
plan: 02
subsystem: overview-tab-onboarding-dashboard
tags: [ui, tracks, integrations, weekly-focus, static-config, dynamic-summary]
dependency_graph:
  requires:
    - 66-01
  provides:
    - static-track-rendering
    - dynamic-summary-cards
    - integration-delete-ui
    - weekly-focus-always-on-ux
  affects:
    - overview-tab
    - onboarding-workflow
tech_stack:
  added: []
  patterns:
    - static-config-with-live-data
    - hybrid-static-dynamic-rendering
    - raw-state-for-dynamic-cards
key_files:
  created: []
  modified:
    - bigpanda-app/components/OnboardingDashboard.tsx
    - bigpanda-app/components/WeeklyFocus.tsx
decisions:
  - Static track config constants define phase structure (names never from DB)
  - Raw phase state (rawAdrPhases/rawBiggyPhases) captured before static filtering for dynamic summary cards
  - Teams phase access requires raw state (not present in static-filtered adrPhases/biggyPhases)
  - Integration delete is immediate with optimistic UI (no confirmation dialog per user decision)
  - Generate Now button moved to header with outline style (always visible, not empty-state-only)
  - Empty state shows quiet italic text instead of large CTA
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_modified: 2
  commits: 2
  lines_changed: 146
completed_date: "2026-04-16"
---

# Phase 66 Plan 02: Overview Tracks Redesign - Static/Dynamic Hybrid Summary

**One-liner:** Hybrid static/dynamic track rendering with hardcoded phase cards, live Teams/Integrations summary stats, integration delete UI, and always-visible Weekly Focus generation button.

## Summary

Refactored OnboardingDashboard.tsx to use static track configuration constants (STATIC_ADR_TRACKS, STATIC_BIGGY_TRACKS) for phase card rendering while maintaining live step status from DB. Added dynamic summary cards section showing real-time Integrations and Teams track statistics sourced from raw (unfiltered) DB phases. Implemented integration delete with trash icon and optimistic UI updates. Redesigned WeeklyFocus component to show Generate Now button in header (always visible, secondary style) with quiet empty state text instead of large CTA.

## Requirements Addressed

- **OVRVW-01:** Static track config - ADR shows Discovery & Kickoff, Platform Config, UAT (no DB phase fetch for names/structure)
- **OVRVW-02:** Dynamic summary cards with live counts - Integrations + Teams stats use raw DB phases
- **OVRVW-04:** Weekly Focus always-visible Generate Now button (small outline style, not primary CTA)
- **OVRVW-05:** Integration delete - trash icon on each row triggers DELETE with no confirmation

## Tasks Completed

### Task 1: Refactor OnboardingDashboard — static tracks + dynamic summary cards + integration delete

**Commit:** 9ee2bdb

**Changes:**
- Added STATIC_ADR_TRACKS and STATIC_BIGGY_TRACKS constants with hardcoded phase names and display orders
- Added rawAdrPhases and rawBiggyPhases state variables to capture ALL DB phases before static filtering
- Modified useEffect data fetch to:
  1. Capture raw phases first (setRawAdrPhases, setRawBiggyPhases)
  2. Apply static filter mapping (match DB phases by name to static config)
  3. Set adrPhases/biggyPhases to static-filtered subset
- Added dynamic track summary cards section (`data-testid="dynamic-track-summary"`) between onboarding phases and Integration Tracker
- Dynamic summary cards show:
  - ADR: Integrations count (validated/configured/blocked) + Teams step progress (from rawAdrPhases)
  - Biggy: IT Knowledge Graph count (validated/configured/blocked) + Teams step progress (from rawBiggyPhases)
- Teams cards use rawAdrPhases/rawBiggyPhases (not adrPhases/biggyPhases) to access all DB phases including Teams phase
- Added deleteIntegration handler with optimistic remove and error rollback (refetch on failure)
- Added trash icon button to integration card header (top-right, alongside tool name)
- Trash icon has hover effect (zinc-400 → red-500) and `data-testid="delete-integration-btn"`

**Files modified:**
- bigpanda-app/components/OnboardingDashboard.tsx

**Verification:**
- TypeScript compilation passes (no errors in OnboardingDashboard)
- STATIC_ADR_TRACKS and STATIC_BIGGY_TRACKS constants exist
- rawAdrPhases and rawBiggyPhases state variables populated from ob.adr/ob.biggy before static filter
- Dynamic summary section renders with correct testid
- Teams cards reference rawAdrPhases/rawBiggyPhases (not filtered state)
- deleteIntegration function calls DELETE endpoint and optimistically removes from state
- Trash icon button present on each integration card

### Task 2: Redesign WeeklyFocus — always-visible Generate Now + quiet empty state

**Commit:** b60d87c

**Changes:**
- Moved Generate Now button from empty state to header row (between title and ProgressRing)
- Changed button style from primary blue (`bg-blue-600 text-white`) to secondary outline (`border border-zinc-300 text-zinc-600 hover:bg-zinc-50`)
- Reduced button size from `px-4 py-2 text-sm` to `px-3 py-1 text-xs`
- Replaced large empty state block (`text-center py-6 space-y-3` with button) with single quiet paragraph
- Empty state text: "Weekly focus generates automatically every Monday at 6am." (italic, zinc-400, text-xs)
- Moved generateMessage display outside bullet list conditional (always renders below content when present)
- Button now always visible regardless of bullets state

**Files modified:**
- bigpanda-app/components/WeeklyFocus.tsx

**Verification:**
- TypeScript compilation passes (no errors in WeeklyFocus)
- Generate Now button always present in header row with outline style
- Empty state shows quiet text paragraph (no large CTA)
- data-testid="generate-now-btn" and data-testid="weekly-focus-section" preserved

## Deviations from Plan

None - plan executed exactly as written.

## Testing Notes

**Manual verification needed:**
1. Visit Overview tab for a project
2. Verify phase cards show only 3 phases per track (ADR: Discovery & Kickoff, Platform Config, UAT; Biggy: Discovery & Kickoff, Platform Config, Validation)
3. Verify dynamic summary cards section appears above Integration Tracker with:
   - ADR: Integrations count + Teams step progress
   - Biggy: IT Knowledge Graph count + Teams step progress
4. Verify Teams counts are non-zero if Teams phase exists in DB (confirming rawAdrPhases/rawBiggyPhases are used)
5. Verify trash icon appears on each integration card (top-right)
6. Click trash icon → integration row should disappear immediately (optimistic delete)
7. Verify Weekly Focus section shows Generate Now button in header (small, outline style)
8. Verify empty state (if no bullets) shows quiet italic text (not large blue button)
9. Click Generate Now → button should disable and show "Generating..." text

## Self-Check

Verifying all claimed artifacts exist:

### Created files
None claimed.

### Modified files
- bigpanda-app/components/OnboardingDashboard.tsx: EXISTS ✓
- bigpanda-app/components/WeeklyFocus.tsx: EXISTS ✓

### Commits
- 9ee2bdb (Task 1): EXISTS ✓
- b60d87c (Task 2): EXISTS ✓

### Key patterns present
```bash
# Static track constants
grep -q "STATIC_ADR_TRACKS" bigpanda-app/components/OnboardingDashboard.tsx && echo "✓ STATIC_ADR_TRACKS found"
grep -q "STATIC_BIGGY_TRACKS" bigpanda-app/components/OnboardingDashboard.tsx && echo "✓ STATIC_BIGGY_TRACKS found"

# Raw phase state
grep -q "rawAdrPhases" bigpanda-app/components/OnboardingDashboard.tsx && echo "✓ rawAdrPhases found"
grep -q "rawBiggyPhases" bigpanda-app/components/OnboardingDashboard.tsx && echo "✓ rawBiggyPhases found"

# Dynamic summary cards
grep -q "dynamic-track-summary" bigpanda-app/components/OnboardingDashboard.tsx && echo "✓ dynamic-track-summary testid found"

# Delete integration
grep -q "deleteIntegration" bigpanda-app/components/OnboardingDashboard.tsx && echo "✓ deleteIntegration function found"
grep -q "delete-integration-btn" bigpanda-app/components/OnboardingDashboard.tsx && echo "✓ delete-integration-btn testid found"

# Generate Now in header
grep -q "Generate Now.*outline" bigpanda-app/components/WeeklyFocus.tsx || grep -q "outline.*Generate Now" bigpanda-app/components/WeeklyFocus.tsx && echo "✓ Generate Now button with outline style in header"
```

## Self-Check: PASSED

All claimed files exist. All commits verified. All key patterns present in modified files.

---

**Phase 66 Plan 02 complete.** OnboardingDashboard and WeeklyFocus redesigned with hybrid static/dynamic rendering, integration delete UI, and always-visible weekly focus generation.
