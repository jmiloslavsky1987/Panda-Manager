---
status: complete
phase: 65-project-scoped-scheduling
source: [65-01-SUMMARY.md, 65-02-SUMMARY.md, 65-03-SUMMARY.md]
started: 2026-04-15T22:00:00Z
updated: 2026-04-15T22:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Project Scheduler Section in Skills Tab
expected: Navigate to a project's Skills tab. Below the skill list and Recent Runs, a "Project Scheduler" section is visible showing a table of scheduled jobs for that project (or an empty state with a "Create Job" button if none exist).
result: pass

### 2. Create Project-Scoped Job
expected: Click "Create Job" in the Project Scheduler section. The wizard opens. The project field is pre-populated with the current project and grayed out (cannot be changed). Completing the wizard creates a job that appears in the project's scheduler table.
result: pass

### 3. Global Scheduler Shows Only Non-Project Jobs
expected: Navigate to the global /scheduler page. It shows a subtitle like "Global scheduled jobs — not scoped to any project." Project-scoped jobs do NOT appear here.
result: pass

### 4. Sidebar Badge Removed from Scheduler Link
expected: In the sidebar navigation, the Scheduler link has no notification badge/count indicator.
result: pass

### 5. readOnly Mode for Non-Admins
expected: A non-admin project member visiting the Skills tab sees the Project Scheduler section but with no Create, Edit, Delete, Enable/Disable, or Run buttons. They can still expand rows to view run history.
result: pass

### 6. Recent Runs Refreshes After Navigation
expected: Run a skill from the Skills tab. Navigate to another workspace tab (e.g., Overview). Navigate back to the Skills tab. The completed run appears in the "Recent Runs" list without requiring a page refresh.
result: pass

### 7. Expanded Scheduler Row Persists Across Navigation
expected: In the Project Scheduler, expand a job row by clicking it. Navigate to another workspace tab. Navigate back to the Skills tab. The same job row is still expanded showing run history.
result: pass

### 8. Run History Artifact Link
expected: Trigger a scheduled job from the Project Scheduler "Run" button. After it completes, expand the row. The run history entry has an "output" link. Clicking it opens the skill run result page showing the AI-generated output.
result: pass

### 9. Skill Outputs in Artifacts Tab
expected: Navigate to a project's Artifacts tab. Below the intake artifacts section, a "Skill Outputs" section lists all skill runs for that project (newest first) with skill name, date, and status badge. Clicking any row opens the skill run result page.
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
