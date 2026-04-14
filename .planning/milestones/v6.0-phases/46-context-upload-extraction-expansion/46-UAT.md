---
status: testing
phase: 46-context-upload-extraction-expansion
source: [46-01-SUMMARY.md, 46-02-SUMMARY.md]
started: 2026-04-08T16:10:00Z
updated: 2026-04-08T16:10:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Extract WBS Tasks from Upload
expected: |
  Upload a document that contains WBS task content — anything referencing work breakdown structure items,
  project tracks (ADR or Biggy), or section names like "Solution Design", "Data Modeling", etc.
  After the extraction job runs, open the ingestion preview for that upload.
  You should see entities with type `wbs_task` that include: track (ADR or Biggy), parent_section_name,
  level (1, 2, or 3), title, and status (not_started / in_progress / complete).
awaiting: user response

## Tests

### 1. Extract WBS Tasks from Upload
expected: Upload a document that contains WBS task content — anything referencing work breakdown structure items, project tracks (ADR or Biggy), or section names like "Solution Design", "Data Modeling", etc. After the extraction job runs, open the ingestion preview for that upload. You should see entities with type `wbs_task` that include: track (ADR or Biggy), parent_section_name, level (1, 2, or 3), title, and status (not_started / in_progress / complete).
result: [pending]

### 2. Extract Team Engagement Content
expected: Upload a document that contains Team Engagement Map prose — content about Business Outcomes, Architecture decisions, E2E Workflows, Teams & Engagement, or Top Focus Areas. After extraction, the ingestion preview should show `team_engagement` entities with section_name matching one of those 5 exact values, and a content field containing the extracted prose.
result: [pending]

### 3. Extract Architecture Nodes
expected: Upload a document describing architecture tools or capabilities (e.g., referencing ADR Track or AI Assistant Track components). After extraction, the ingestion preview should show `arch_node` entities with: track (ADR Track or AI Assistant Track), node_name (the tool/capability name), status (planned / in_progress / live), and optional notes.
result: [pending]

### 4. Approve WBS Tasks → Stored Correctly
expected: Approve wbs_task entities from the ingestion preview. After approval, the items should be written to the wbsItems table. If the parent_section_name in the extracted entity matches an existing WBS section (even abbreviated — e.g., "Solution" matching "Solution Design"), the item should appear nested under that parent. If no parent match is found, it appears as an orphan item (can be reassigned via UI).
result: [pending]

### 5. Approve Team Engagement → Content Appends
expected: Approve a team_engagement entity for a section that already has content. The existing section content should be preserved — new content is appended below, separated by a horizontal divider (---). Upload the same document a second time and approve again to verify the second chunk of content is appended below the first (not overwriting it).
result: [pending]

### 6. Approve Architecture Node → Upsert on Re-approve
expected: Approve an arch_node entity (creates a new node). Then upload the same document again with an updated status for that node (e.g., "planned" → "in_progress"). After approving the second time, only ONE node should exist for that name+track combination — status and notes should reflect the update, not create a duplicate row.
result: [pending]

### 7. Duplicate Detection — No Re-ingestion
expected: After approving wbs_task, team_engagement, or arch_node entities from a document, upload that same document again. In the second ingestion preview, those already-approved entities should be filtered out (shown as already ingested or simply absent from the new-items list). The net-new count for those types should be 0.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0

## Gaps

[none yet]
