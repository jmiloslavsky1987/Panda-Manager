---
phase: 37-actions-inline-editing-foundation
plan: "02"
subsystem: ui-components
one_liner: Built three shared inline-edit components (InlineSelectCell, DatePickerCell, OwnerCell) using react-day-picker and Radix Popover
tags: [inline-editing, ui-components, react-day-picker, radix-ui, shared-components, optimistic-updates]
completed: 2026-04-03T20:20:00Z
duration_seconds: 174
tasks_completed: 2
files_created: 3
commits:
  - hash: 907bf93
    message: "chore(37-02): install react-day-picker and radix popover with CSS"
  - hash: 83f8ce6
    message: "feat(37-02): implement InlineSelectCell, DatePickerCell, and OwnerCell components"

dependencies:
  requires:
    - "37-01 (test scaffolds provide contract validation)"
  provides:
    - InlineSelectCell (generic select dropdown for status/severity)
    - DatePickerCell (calendar popover for date fields)
    - OwnerCell (text input with datalist autocomplete)
  affects:
    - Plans 37-04 and 37-05 (will import and use these components)

tech_stack:
  added:
    - react-day-picker: "^9.14.0"
    - "@radix-ui/react-popover": "^1.1.15"
  patterns:
    - "Optimistic UI updates with rollback on error"
    - "Named exports from react-day-picker v9 (not default export)"
    - "Radix Popover with Portal for z-index isolation"
    - "HTML datalist for zero-install autocomplete"
    - "sonner toast for error feedback"
    - "Saving state to prevent double-save race conditions"

key_files:
  created:
    - bigpanda-app/components/InlineSelectCell.tsx
    - bigpanda-app/components/DatePickerCell.tsx
    - bigpanda-app/components/OwnerCell.tsx
  modified:
    - bigpanda-app/package.json
    - bigpanda-app/package-lock.json
    - bigpanda-app/app/globals.css

decisions:
  - title: "CSS loaded via @import in globals.css"
    rationale: "Added react-day-picker CSS as first line in globals.css before Tailwind directives. Tested with npm run next-only — no PostCSS errors."
    alternatives: ["Copy CSS to public/ and use <link> tag like frappe-gantt"]
    impact: "Simpler than public/ workaround; confirmed working with Tailwind 4 PostCSS pipeline"

  - title: "Added saving state to prevent double-save"
    rationale: "InlineSelectCell and OwnerCell include saving boolean to disable interactions during async onSave, preventing race conditions"
    alternatives: ["No guard — rely on optimistic state"]
    impact: "Safer UX; prevents rapid consecutive edits from causing revert conflicts"

  - title: "Used useId() for datalist uniqueness"
    rationale: "OwnerCell uses React's useId() hook for datalist id generation, avoiding collisions when multiple cells render on screen"
    alternatives: ["Fixed id string", "uuid library"]
    impact: "Zero dependencies; React-native solution; handles SSR correctly"

  - title: "Stakeholders fetch on first edit focus only"
    rationale: "OwnerCell fetches /api/stakeholders when editing state becomes true, not on mount — reduces unnecessary API calls"
    alternatives: ["Fetch on mount", "Pre-fetch in parent and pass as prop"]
    impact: "Lazy loading improves page performance; empty datalist is acceptable fallback per RESEARCH.md"

metrics:
  components: 3
  tests_passing: "N/A (component tests not in scope; TypeScript compilation verified)"
  packages_added: 2
  lines_of_code: 224
---

# Phase 37 Plan 02: Shared Inline-Edit Components Summary

**One-liner:** Built three shared inline-edit components (InlineSelectCell, DatePickerCell, OwnerCell) using react-day-picker and Radix Popover — ready for Plans 04 and 05 to import and wire into Actions, Risks, and Milestones tables.

## Objective Achievement

Installed react-day-picker and @radix-ui/react-popover packages, wired CSS via globals.css, and implemented three reusable inline-edit components following the exact patterns from RESEARCH.md. All components are TypeScript-valid with zero compilation errors, use optimistic updates with toast error handling, and include saving state to prevent double-save race conditions.

**Ready for Phase 37 Plans 04-05:** Components are fully self-contained, export cleanly, and match the RESEARCH.md contract exactly — later plans can import and use immediately without modification.

## What Was Built

### Task 1: Install packages and wire CSS
- Installed react-day-picker v9.14.0 and @radix-ui/react-popover v1.1.15
- Added CSS import to globals.css as first line (before Tailwind directives)
- Verified build starts without PostCSS errors using npm run next-only
- **Key insight:** @import worked cleanly with Tailwind 4 — no need for public/ workaround

### Task 2: Build InlineSelectCell, DatePickerCell, and OwnerCell components
Created three shared components following RESEARCH.md patterns exactly:

**InlineSelectCell.tsx (66 lines):**
- Generic component over `T extends string` for type-safe status/severity dropdowns
- Click display → native <select> with autoFocus → onChange saves optimistically
- Includes `saving` boolean to prevent double-save during async onSave
- On error: reverts optimisticValue → toast.error('Save failed — please try again')
- Props: value, options, onSave, className

**DatePickerCell.tsx (76 lines):**
- Displays date string or '—' → click opens Radix Popover with DayPicker calendar
- Named import: `import { DayPicker } from 'react-day-picker'` (v9 has no default export)
- Selecting date saves ISO string (YYYY-MM-DD) optimistically → closes popover
- "Clear / TBD" button sets value to null
- On error: reverts optimisticValue → toast.error
- Props: value (string | null), onSave

**OwnerCell.tsx (82 lines):**
- Displays owner name or '—' → click opens text input with datalist autocomplete
- Fetches /api/stakeholders?project_id=X on first edit focus (lazy loading)
- Uses React.useId() for datalist id uniqueness (handles multiple cells on screen)
- Saves on blur → optimistic update → onSave(newValue)
- Empty datalist is acceptable fallback if stakeholders API 404/405 (per RESEARCH.md)
- Includes `saving` boolean to prevent double-save
- Props: value (string | null), projectId, onSave

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed the RESEARCH.md patterns precisely. No auto-fixes required.

## Verification

**Task 1 verification:**
- `node -e "require('react-day-picker')"` — ✓ importable
- `node -e "require('@radix-ui/react-popover')"` — ✓ importable
- `npm run next-only` started without PostCSS errors

**Task 2 verification:**
- `npx tsc --noEmit` — zero TypeScript errors in new component files
- All three components exist with correct exports
- Components match RESEARCH.md patterns exactly (Pattern 2, 3, 4)

## Impact on Phase 37

These three components are the building blocks for:
- **Plan 37-04:** ActionsTableClient will import InlineSelectCell (status), DatePickerCell (due date), OwnerCell (owner)
- **Plan 37-05:** Risks and Milestones pages will import InlineSelectCell (status/severity), DatePickerCell (dates), OwnerCell (owner)

No duplication — all four entities (Actions, Risks, Milestones, Tasks) use these same shared components.

## Next Steps

1. **Plan 37-03**: Implement stakeholders GET endpoint so OwnerCell datalist populates (currently falls back to empty)
2. **Plan 37-04**: Build ActionsTableClient importing these components for inline editing
3. **Plan 37-05**: Apply inline editing to Risks and Milestones tables using same components

## Self-Check: PASSED

All created files exist:
```
FOUND: bigpanda-app/components/InlineSelectCell.tsx
FOUND: bigpanda-app/components/DatePickerCell.tsx
FOUND: bigpanda-app/components/OwnerCell.tsx
```

All commits exist:
```
FOUND: 907bf93
FOUND: 83f8ce6
```

TypeScript compilation: ✓ (zero errors in new component files)
Components export correctly: ✓
Patterns match RESEARCH.md: ✓
