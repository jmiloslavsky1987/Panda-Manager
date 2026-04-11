---
title: "Fix skills tab — nothing showing up"
area: "ui"
created: "2026-04-10T05:10:50.682Z"
priority: "high"
---

## Problem

The Skills tab on the project page is not displaying anything. Previously worked but now shows empty/broken state.

## Solution

Investigate the skills tab component and API route. Check if skill_runs query is working, whether the tab requires seeded data, and whether a recent schema or route change broke it.

## Investigation Steps

1. Check the skills tab component rendering logic
2. Verify skill_runs API query is returning data
3. Check if seed data includes skills runs
4. Look for recent schema changes that may have affected skills
5. Verify API route returns expected shape and structure
6. Check for console errors or network failures

## Files to Check

- `bigpanda-app/app/customer/[id]/` - Skills tab component
- `bigpanda-app/app/api/projects/[projectId]/` - Skills API routes
- `bigpanda-app/lib/seed-project.ts` - Check seeding logic
- Database schema for skills_runs table structure

## Related Tasks

- Standardize tabs, reports, and skills UI patterns
- Thorough tab-by-tab UAT with documented fixes backlog
