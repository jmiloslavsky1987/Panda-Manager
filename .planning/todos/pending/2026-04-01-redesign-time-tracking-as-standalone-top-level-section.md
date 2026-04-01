---
created: 2026-04-01T18:10:00.000Z
title: Redesign time tracking as standalone top-level section
area: ui
files:
  - bigpanda-app/app/customer/[id]/time/page.tsx
  - bigpanda-app/app/settings/time-tracking/page.tsx
---

## Problem

Time tracking currently lives as a tab inside each project workspace (`/customer/[id]/time`). This is architecturally wrong — users have to navigate into a specific project to log time, which doesn't match how time tracking works in practice. Time is tracked globally and then attributed to projects, not entered project-by-project.

## Solution

Move time tracking to a standalone top-level section in the bottom-left nav alongside Settings:

1. New top-level route (e.g. `/time-tracking`) accessible from the bottom-left nav
2. Global view of all time entries across all projects
3. Each entry can be assigned/attributed to a project (dropdown or tag)
4. Remove the per-project Time tab from the workspace (or keep as a filtered view of the global tracker)
5. Bottom-left nav: Settings → Time Tracking (similar to how Settings is currently placed)

Consider whether the existing `/app/settings/time-tracking/page.tsx` is the right starting point or needs to be a new route entirely.
