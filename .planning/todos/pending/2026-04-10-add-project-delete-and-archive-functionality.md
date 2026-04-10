---
title: "Add project delete and archive functionality"
area: "ui"
created: "2026-04-10T05:10:50.682Z"
priority: "medium"
---

## Problem

No way to delete or archive projects from the project list or management UI. Users need to clean up test projects and mark completed engagements as archived without fully deleting them.

## Solution

Add delete action (with confirmation dialog) and archive action to project cards/list. Archived projects hidden by default with toggle to show. Soft-delete pattern preferred.

## Implementation Notes

- Use soft-delete pattern for deletion (add deleted_at timestamp)
- Add archive status to project model (archived_at field)
- Add confirmation dialog for destructive actions
- Add toggle to show/hide archived projects
- Update project list query to filter by default

## Files to Modify

- `bigpanda-app/app/api/projects/[projectId]/route.ts` - Add DELETE and PATCH endpoints
- `bigpanda-app/app/customer/[id]/` - Update UI to show delete/archive actions
- `bigpanda-app/lib/db/schema.ts` - Add deleted_at and archived_at fields if needed

## Related Tasks

- Standardize tabs, reports, and skills UI patterns
- Thorough tab-by-tab UAT with documented fixes backlog
