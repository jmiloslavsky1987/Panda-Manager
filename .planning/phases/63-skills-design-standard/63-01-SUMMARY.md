---
phase: 63-skills-design-standard
plan: 01
subsystem: skills
tags: [foundation, design-standard, yaml-front-matter, migration]
dependency_graph:
  requires: []
  provides: [skills-design-standard, skill-front-matter-schema]
  affects: [skills-tab, skill-orchestrator]
tech_stack:
  added: []
  patterns: [yaml-front-matter-schema]
key_files:
  created:
    - bigpanda-app/skills/SKILLS-DESIGN-STANDARD.md
    - bigpanda-app/skills/risk-assessment.md
    - bigpanda-app/skills/qbr-prep.md
    - bigpanda-app/skills/biggy-weekly-briefing.md
  modified:
    - bigpanda-app/skills/meeting-summary.md
    - bigpanda-app/skills/weekly-customer-status.md
    - bigpanda-app/skills/morning-briefing.md
    - bigpanda-app/skills/context-updater.md
    - bigpanda-app/skills/handoff-doc-generator.md
    - bigpanda-app/skills/elt-external-status.md
    - bigpanda-app/skills/elt-internal-status.md
    - bigpanda-app/skills/team-engagement-map.md
    - bigpanda-app/skills/workflow-diagram.md
    - bigpanda-app/skills/customer-project-tracker.md
    - bigpanda-app/skills/sprint-summary-generator.md
decisions:
  - decision: YAML front-matter schema with 6 required fields (label, description, input_required, input_label, schedulable, error_behavior)
    rationale: User locked decision from phase research — provides runtime metadata for Skills tab dynamic rendering
    alternatives_considered: Separate metadata JSON files, inline comments
    locked: true
  - decision: Front-matter block must be first line of file (opening --- at line 1)
    rationale: Parser simplicity and consistency across all skill files
    alternatives_considered: Allowing blank lines before front-matter
    locked: false
  - decision: error_behavior enum with "retry" and "fail" values
    rationale: Gives skill authors control over retry semantics for network-sensitive vs deterministic operations
    alternatives_considered: Automatic retry for all skills, no retry option
    locked: false
metrics:
  duration_minutes: 4
  completed_date: 2026-04-15
  task_commits: 2
  files_created: 4
  files_modified: 11
---

# Phase 63 Plan 01: Skills Design Standard Summary

YAML front-matter schema established for all Skills tab documentation skills; 11 existing skills migrated; 3 new skill prompts created with PS-quality bodies.

## Overview

This plan established the foundation for Phase 63 by creating the Skills Design Standard document and migrating all existing skill .md files to include YAML front-matter blocks. Three new skill prompts (risk-assessment, qbr-prep, biggy-weekly-briefing) were created with both front-matter and PS-appropriate prompt bodies. All 14 skill files now start with a valid YAML front-matter block containing the required fields: label, description, input_required, input_label, schedulable, and error_behavior.

**Purpose:** Without this standard and valid front-matter in all skill files, Plan 02 (Skills tab server refactor) cannot dynamically source skill metadata at runtime. This plan unblocks Plan 02 and provides the governance document for future skill creation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write SKILLS-DESIGN-STANDARD.md | 9ea6596 | SKILLS-DESIGN-STANDARD.md (created) |
| 2 | Migrate existing skill files + create new skill files | a79d69e | 11 migrated, 3 created (risk-assessment.md, qbr-prep.md, biggy-weekly-briefing.md) |

## What Was Built

### 1. Skills Design Standard Document
Created `bigpanda-app/skills/SKILLS-DESIGN-STANDARD.md` as the canonical governance document for all Skills tab documentation skills. The document covers:

- **Scope:** Clearly defines which skills must comply (Skills tab documentation skills) and which are out of scope (backend processing skills like ai-plan-generator)
- **Required Fields:** Documents all 6 required YAML front-matter fields with types, valid values, and purpose
- **Examples:** Provides complete front-matter examples for skills requiring input and skills running from context only
- **Front-Matter Placement:** Specifies that opening `---` must be the first line of the file
- **Prompt Body Conventions:** Guidelines for tone, output format specification, and context injection
- **Error Behavior Semantics:** Explains retry vs fail behavior with use case guidance
- **Validation:** Documents Skills tab validation and developer workflow

### 2. Existing Skills Migration (11 files)
Added YAML front-matter blocks to all existing skill files while preserving prompt body content:

- meeting-summary.md (input_required: true, input_label: "Transcript")
- weekly-customer-status.md (schedulable: true)
- morning-briefing.md (schedulable: true)
- context-updater.md (input_required: true, input_label: "Transcript")
- handoff-doc-generator.md
- elt-external-status.md
- elt-internal-status.md
- team-engagement-map.md
- workflow-diagram.md
- customer-project-tracker.md (schedulable: true, error_behavior: fail)
- sprint-summary-generator.md

All files now start with `---` as the first line, followed by the required front-matter fields, followed by the existing prompt body content (unchanged).

### 3. New Skill Prompts Created (3 files)
Created three new skill .md files with both YAML front-matter and PS-quality prompt bodies:

**risk-assessment.md**
- Label: Risk Assessment
- Description: Generate a risk assessment report from current project risks and status
- Prompt: Expert PS risk consultant role; generates structured risk report with RAG status, top risks (likelihood × impact ratings), resolved risks, and recommended actions

**qbr-prep.md**
- Label: QBR Prep
- Description: Generate QBR preparation materials including talk track and slides outline
- Prompt: Expert PS consultant preparing for customer executive QBR; generates materials covering quarterly accomplishments (quantified), value delivered, challenges overcome, next quarter plan, and customer asks

**biggy-weekly-briefing.md**
- Label: Biggy Weekly Briefing
- Description: Generate a comprehensive weekly briefing with executive summary and action digest
- Prompt: Biggy AI assistant role; generates comprehensive weekly briefing with health summary, progress, upcoming items, at-risk items, and focus recommendations (with precise dates, not relative references)
- Schedulable: true (can be triggered on recurring schedule)

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes, no missing critical functionality, no blocking issues encountered.

## Technical Decisions

### 1. YAML Front-Matter Schema (Locked Decision)
Used the exact 6-field schema specified in plan context (user locked decision from phase research):
- `label` (string) — Human-readable skill name
- `description` (string) — One-line description
- `input_required` (boolean) — Whether user text input is required
- `input_label` (string) — Label for input field (empty string "" when input_required is false)
- `schedulable` (boolean) — Whether skill can be scheduled
- `error_behavior` ("retry" | "fail") — Retry semantics

**Rationale:** This schema provides all metadata needed for Skills tab dynamic rendering in Plan 02. Fields like `schedulable` enable Phase 65 project-scoped scheduling. `error_behavior` gives skill authors control over retry behavior for network-sensitive operations.

### 2. Front-Matter Placement Rule
Front-matter block MUST start at line 1 (opening `---` as first line, no blank lines before it).

**Rationale:** Parser simplicity and consistency. Makes validation trivial (check if file starts with `---`). All 14 skill files now follow this pattern uniformly.

### 3. Error Behavior Defaults
- customer-project-tracker.md uses `error_behavior: fail` (all other skills use `retry`)
- **Rationale:** Customer Project Tracker depends on MCP tools availability; if MCP tools are unavailable, a retry won't help (deterministic failure). All other skills are LLM-driven and benefit from retry on transient network/API errors.

## Verification

### Automated Verification Results
All verification checks passed:

1. **Task 1 verification:**
   ```bash
   test -f SKILLS-DESIGN-STANDARD.md && grep -l "error_behavior" SKILLS-DESIGN-STANDARD.md && echo "OK"
   # Result: OK
   ```

2. **Task 2 verification:**
   ```bash
   for f in meeting-summary weekly-customer-status morning-briefing context-updater handoff-doc-generator elt-external-status elt-internal-status team-engagement-map workflow-diagram customer-project-tracker sprint-summary-generator risk-assessment qbr-prep biggy-weekly-briefing; do
     head -1 /path/to/$f.md | grep -q "^---" || echo "MISSING front-matter: $f"
   done && echo "Scan complete"
   # Result: Scan complete (no missing front-matter detected)
   ```

### Manual Verification
- Reviewed SKILLS-DESIGN-STANDARD.md: Contains all 7 required sections (scope, fields, examples, placement, conventions, error behavior, validation)
- Spot-checked 3 migrated skills: Front-matter blocks correctly formatted; existing prompt bodies preserved unchanged
- Spot-checked 3 new skills: Front-matter valid; prompt bodies are PS-quality and follow conventions (role framing, output format specification)

## Success Criteria Met

- [x] SKILLS-DESIGN-STANDARD.md written and covers all 7 sections
- [x] All 11 previously existing skill .md files have valid YAML front-matter prepended with correct field values
- [x] 3 new skill .md files created with front-matter + PS-quality prompt body
- [x] No existing prompt body content was lost or altered
- [x] stakeholder-comms.md and onboarding-checklist.md do NOT exist (never created — removed from catalog per decisions)

## Output Artifacts

### Primary Artifacts
- **SKILLS-DESIGN-STANDARD.md** — Canonical governance document (221 lines)
- **risk-assessment.md** — New skill prompt (RAG-based risk reporting)
- **qbr-prep.md** — New skill prompt (QBR preparation materials)
- **biggy-weekly-briefing.md** — New skill prompt (comprehensive weekly briefing, schedulable)

### Modified Artifacts
- 11 existing skill .md files migrated to include front-matter while preserving prompt bodies

### Not Created (Intentional)
- stakeholder-comms.md — Removed from catalog per phase decisions
- onboarding-checklist.md — Removed from catalog per phase decisions
- ai-plan-generator.md front-matter — Out of scope (backend processing skill, not Skills tab skill)

## Dependencies

### Requires (Plan 02)
Plan 02 (Skills tab server refactor) requires this plan's output to:
- Parse skill front-matter at runtime
- Dynamically render skill cards with labels, descriptions
- Enable/disable input fields based on `input_required`
- Filter schedulable skills for Phase 65 scheduling UI

### Provides (Downstream Phases)
- **Phase 64 (Editable Prompts UI):** Front-matter editing will use this schema
- **Phase 65 (Project-Scoped Scheduling):** `schedulable` field enables skill filtering
- **Skills Tab Validation:** Front-matter validation logic will reference this standard

## Follow-Up Actions

None required. Plan 02 can proceed immediately.

## Self-Check: PASSED

### Files Created Verification
```bash
# All created files exist:
[ -f "bigpanda-app/skills/SKILLS-DESIGN-STANDARD.md" ] # FOUND
[ -f "bigpanda-app/skills/risk-assessment.md" ] # FOUND
[ -f "bigpanda-app/skills/qbr-prep.md" ] # FOUND
[ -f "bigpanda-app/skills/biggy-weekly-briefing.md" ] # FOUND
```

### Commits Verification
```bash
# Both task commits exist:
git log --oneline --all | grep -q "9ea6596" # FOUND
git log --oneline --all | grep -q "a79d69e" # FOUND
```

### Front-Matter Verification
All 14 skill files start with `---` (verified by automated check above).

---

**Execution Time:** 4 minutes (2026-04-15 16:48:29 UTC to 16:52:07 UTC)
**Commits:** 2 (9ea6596, a79d69e)
**Files Created:** 4
**Files Modified:** 11
**Lines Added:** 356 total (221 in SKILLS-DESIGN-STANDARD.md, 135 across skill files)
