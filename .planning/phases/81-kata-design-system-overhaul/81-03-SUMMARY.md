---
phase: 81-kata-design-system-overhaul
plan: "03"
subsystem: ui
tags: [material-symbols, icon-migration, lucide-react, design-system, react-components]

# Dependency graph
requires:
  - phase: 81-01
    provides: "components/Icon.tsx Material Symbols wrapper; kata-tokens.css; icon-migration.test.ts scaffold"
provides:
  - "All 20 non-Sidebar components have lucide-react fully removed; Icon wrapper imported throughout"
  - "icon-migration.test.ts Test 3 GREEN — zero lucide-react imports in all 22 tracked files"
affects: [81-04, 81-05, 81-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Icon migration pattern: remove lucide-react import, add `import { Icon } from './Icon'`, replace JSX — className w-N h-N → size={N}, keep all color/margin className"
    - "Relative import path rule: components/ui/* use '../Icon'; components/workspace|arch|teams/* use '../Icon'; top-level components/* use './Icon'"
    - "Icon animate-spin pattern: className='animate-spin' passed to Icon className prop — works because <span> renders the Tailwind class"

key-files:
  created: []
  modified:
    - "components/ui/dialog.tsx — X → Icon close"
    - "components/ui/checkbox.tsx — Check → Icon check size={12}"
    - "components/IngestionStepper.tsx — Loader2/CheckCircle/XCircle/Circle → Icon equivalents"
    - "components/ArchivedBanner.tsx — Archive → Icon archive"
    - "components/ScanForUpdatesButton.tsx — RefreshCw/ChevronDown → Icon refresh/expand_more"
    - "components/SprintSummaryPanel.tsx — ChevronDown/ChevronRight/RefreshCw → Icon equivalents"
    - "components/SchedulerJobRow.tsx — ChevronDown/ChevronRight/Loader2 → Icon equivalents"
    - "components/CreateJobWizard.tsx — Check → Icon check"
    - "components/ProjectWizard.tsx — Check → Icon check"
    - "components/GlobalTimeView.tsx — Clock/Download/Trash2/CheckCircle/XCircle/Plus → Icon equivalents"
    - "components/PortfolioTableClient.tsx — ChevronDown/ChevronUp/AlertCircle → Icon equivalents"
    - "components/PortfolioExceptionsPanel.tsx — ChevronDown/ChevronUp → Icon expand_more/expand_less"
    - "components/ExceptionsPanel.tsx — Clock/AlertTriangle/RefreshCw/CheckCircle → Icon equivalents"
    - "components/workspace/DangerZoneSection.tsx — AlertTriangle → Icon warning"
    - "components/PromptEditModal.tsx — Lock/Maximize2/Minimize2/Bold/Italic/Code/Heading → Icon equivalents"
    - "components/WbsGeneratePlanModal.tsx — Loader2/Sparkles → Icon progress_activity/auto_awesome"
    - "components/WbsNode.tsx — ChevronRight/ChevronDown/Plus/GripVertical/Trash2 → Icon equivalents"
    - "components/AiPlanPanel.tsx — Loader2/Sparkles → Icon progress_activity/auto_awesome"
    - "components/arch/IntegrationDetailDrawer.tsx — X → Icon close (only lucide icon; BigPanda SVGs untouched)"
    - "components/teams/NodeDetailDrawer.tsx — X → Icon close (only lucide icon; React Flow content untouched)"

key-decisions:
  - "[81-03] WbsNode used lucide size prop syntax (ChevronDown size={16}) rather than className — Icon uses same size prop, direct replacement"
  - "[81-03] Icon animate-spin: pass Tailwind class via Icon's className prop — span renders the class correctly"
  - "[81-03] Plan specified Sparkles for WbsNode but grep confirmed no Sparkles usage in WbsNode.tsx — plan map was a false entry; not fixed"
  - "[81-03] arch/ and teams/ subdirectory files use '../Icon' relative import (one level up to components/)"

patterns-established:
  - "Pattern: lucide className=w-N h-N → Icon size={N} (N = 12 for w-3/h-3, 14 for w-3.5, 16 for w-4/h-4, 20 for w-5/h-5, 24 for w-6, 48 for w-12)"
  - "Pattern: additional className (color, margin, opacity) passed to Icon className prop"

requirements-completed: [KDS-02, KDS-07]

# Metrics
duration: 9min
completed: 2026-04-29
---

# Phase 81 Plan 03: Icon Migration (20 Non-Sidebar Components) Summary

**lucide-react fully removed from all 20 non-Sidebar components; Material Symbols Icon wrapper used throughout; icon-migration.test.ts 3/3 GREEN**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-04-29T03:34:09Z
- **Completed:** 2026-04-29T03:43:57Z
- **Tasks:** 2
- **Files modified:** 20 components

## Accomplishments
- Migrated 9 shadcn UI / core shared components (Task 1): dialog.tsx, checkbox.tsx, IngestionStepper, ArchivedBanner, ScanForUpdatesButton, SprintSummaryPanel, SchedulerJobRow, CreateJobWizard, ProjectWizard
- Migrated 11 feature components (Task 2): GlobalTimeView, PortfolioTableClient, PortfolioExceptionsPanel, ExceptionsPanel, DangerZoneSection, PromptEditModal, WbsGeneratePlanModal, WbsNode, AiPlanPanel, IntegrationDetailDrawer, NodeDetailDrawer
- icon-migration.test.ts: all 3 tests GREEN (Test 3 was intentionally RED before this plan)
- Production build compiled clean (9.5s, all 55 pages generated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate 9 shadcn UI + core shared components** - `aa88d69d` (feat(81-03))
2. **Task 2: Migrate 11 feature components** - `8c91e897` (feat(81-03))

**Plan metadata:** (docs commit pending state update)

## Files Created/Modified
- `components/ui/dialog.tsx` - X → Icon name="close" size={16}
- `components/ui/checkbox.tsx` - Check → Icon name="check" size={12} (inside Radix Indicator)
- `components/IngestionStepper.tsx` - Loader2/CheckCircle/XCircle/Circle → Icon equivalents
- `components/ArchivedBanner.tsx` - Archive → Icon name="archive" size={16}
- `components/ScanForUpdatesButton.tsx` - RefreshCw/ChevronDown → Icon refresh/expand_more
- `components/SprintSummaryPanel.tsx` - ChevronDown/ChevronRight/RefreshCw → Icon equivalents
- `components/SchedulerJobRow.tsx` - ChevronDown/ChevronRight/Loader2 → Icon equivalents
- `components/CreateJobWizard.tsx` - Check → Icon name="check" size={16}
- `components/ProjectWizard.tsx` - Check → Icon name="check" size={16}
- `components/GlobalTimeView.tsx` - Clock/Download/Trash2/CheckCircle/XCircle/Plus → Icon equivalents
- `components/PortfolioTableClient.tsx` - ChevronDown/ChevronUp/AlertCircle → Icon equivalents
- `components/PortfolioExceptionsPanel.tsx` - ChevronDown/ChevronUp → Icon expand_more/expand_less
- `components/ExceptionsPanel.tsx` - Clock/AlertTriangle/RefreshCw/CheckCircle → Icon equivalents
- `components/workspace/DangerZoneSection.tsx` - AlertTriangle → Icon warning size={20}
- `components/PromptEditModal.tsx` - Lock/Maximize2/Minimize2/Bold/Italic/Code/Heading → Icon equivalents
- `components/WbsGeneratePlanModal.tsx` - Loader2/Sparkles → Icon progress_activity/auto_awesome
- `components/WbsNode.tsx` - ChevronRight/ChevronDown/Plus/GripVertical/Trash2 → Icon equivalents (lucide size prop → Icon size prop, direct)
- `components/AiPlanPanel.tsx` - Loader2/Sparkles → Icon progress_activity/auto_awesome
- `components/arch/IntegrationDetailDrawer.tsx` - X (close button only) → Icon close; BigPanda SVGs untouched
- `components/teams/NodeDetailDrawer.tsx` - X (close button only) → Icon close; React Flow content untouched

## Decisions Made
- WbsNode.tsx used lucide's size prop (e.g., `<ChevronDown size={16} />`) rather than className — Icon component uses the same size prop, making replacement a direct drop-in
- `animate-spin` preserved via Icon's className prop — the Tailwind animation class on a `<span>` works identically
- arch/ and teams/ subdirectory imports use `'../Icon'` (one level up), workspace/ also uses `'../Icon'`
- Sparkles in WbsNode not present (plan map listed it but actual file grep found none) — no fix needed

## Deviations from Plan

None — plan executed exactly as written. The Sparkles entry for WbsNode.tsx in the plan's icon map was inaccurate (file doesn't use Sparkles), but this required no fix — simply no replacement needed.

## Issues Encountered
- None. Both tasks completed cleanly on first attempt. Build successful.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- KDS-02 (lucide-react fully removed) and KDS-07 (no regressions) requirements complete for Plan 03's scope
- Plan 02 (Sidebar.tsx, SidebarProjectItem.tsx, SidebarUserIsland.tsx) still has uncommitted changes in working tree — those files complete KDS-02 fully when Plan 02 is committed
- All 20 migrated components compile and render correctly; functional handlers unchanged throughout migration

## Self-Check: PASSED

- FOUND: components/ui/dialog.tsx (uses Icon, no lucide)
- FOUND: components/ui/checkbox.tsx (uses Icon, no lucide)
- FOUND: components/IngestionStepper.tsx (uses Icon, no lucide)
- FOUND: components/ArchivedBanner.tsx (uses Icon, no lucide)
- FOUND: components/ScanForUpdatesButton.tsx (uses Icon, no lucide)
- FOUND: components/SprintSummaryPanel.tsx (uses Icon, no lucide)
- FOUND: components/SchedulerJobRow.tsx (uses Icon, no lucide)
- FOUND: components/CreateJobWizard.tsx (uses Icon, no lucide)
- FOUND: components/ProjectWizard.tsx (uses Icon, no lucide)
- FOUND: components/GlobalTimeView.tsx (uses Icon, no lucide)
- FOUND: components/PortfolioTableClient.tsx (uses Icon, no lucide)
- FOUND: components/PortfolioExceptionsPanel.tsx (uses Icon, no lucide)
- FOUND: components/ExceptionsPanel.tsx (uses Icon, no lucide)
- FOUND: components/workspace/DangerZoneSection.tsx (uses Icon, no lucide)
- FOUND: components/PromptEditModal.tsx (uses Icon, no lucide)
- FOUND: components/WbsGeneratePlanModal.tsx (uses Icon, no lucide)
- FOUND: components/WbsNode.tsx (uses Icon, no lucide)
- FOUND: components/AiPlanPanel.tsx (uses Icon, no lucide)
- FOUND: components/arch/IntegrationDetailDrawer.tsx (uses Icon, no lucide)
- FOUND: components/teams/NodeDetailDrawer.tsx (uses Icon, no lucide)
- FOUND commit: aa88d69d (Task 1)
- FOUND commit: 8c91e897 (Task 2)
- Tests: icon-migration 3/3 GREEN
- Build: compiled successfully in 9.5s

---
*Phase: 81-kata-design-system-overhaul*
*Completed: 2026-04-29*
