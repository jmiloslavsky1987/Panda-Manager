---
created: 2026-04-13
source: phase-57-uat
priority: medium
---

# Make Note Entities Editable and Reclassifiable in Draft UI

## Context

During Phase 57 UAT, identified that the extraction pipeline correctly captures content
that doesn't confidently match a specific entity type and stores it as `note`. This is
the right "no data loss" behavior — but currently notes in the draft view are read-only
and there's no way to promote them to the correct entity type.

## What's Needed

- Note entities in the draft/approval modal should be editable (content + context fields)
- Add a "Reclassify" affordance on note draft cards — a type picker dropdown listing all
  valid entity types (before_state, e2e_workflow, integration, architecture, action, risk, etc.)
- On reclassification, transform the note's fields into the target entity's schema
  (pre-fill what maps cleanly, surface remaining required fields for completion)
- On approval, route to the correct table based on the chosen type, not the `note` handler

## Acceptance Criteria

- [ ] Note cards in draft modal have an Edit button for content/context
- [ ] Note cards have a "Assign type" or "Reclassify" control with all entity types listed
- [ ] Selecting a type opens a mini-form pre-filled with the note content mapped to the
      target schema's fields
- [ ] Approving a reclassified note writes to the correct entity table
- [ ] Notes that are not reclassified are approved as notes (existing behavior unchanged)

## Why This Matters

Supports the core tenet: no data loss from uploads, and everything relevant gets
classified — either automatically or with user guidance.
