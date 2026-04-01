---
created: 2026-04-01T17:58:15.290Z
title: Standardize tabs, reports, and skills UI patterns
area: ui
files: []
---

## Problem

Tabs, reports, and skills were built across many phases by different plan waves. Visual and interaction patterns may be inconsistent — e.g. table layouts, empty states, action buttons, loading states, status badges, filter/sort controls, column widths, heading styles. Reports and skill output surfaces may also have diverged from each other.

## Solution

Audit all tab pages, report outputs, and skill result displays for pattern consistency. Define the canonical patterns (or confirm existing ones from Phase 27 UI Overhaul as the standard) and bring outliers into alignment. Likely candidates for standardization:

- Empty state messaging and illustration style
- Table column patterns (headers, sorting, row actions)
- Status badge colors and labels
- Loading/skeleton states
- Section heading hierarchy
- Action button placement (primary CTA position)
- Report layout and typography
- Skill output card structure

Should be done after (or in conjunction with) the tab-by-tab UAT todo — fixes and standardization can be planned together once the full scope of issues is known.
