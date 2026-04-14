---
status: diagnosed
phase: 57-extraction-intelligence-for-unstructured-notes
source: 57-00-SUMMARY.md, 57-01-PLAN.md
started: 2026-04-13T11:26:00Z
updated: 2026-04-13T11:26:00Z
---

## Current Test

## Current Test

[testing complete]

## Tests

### 1. Extraction prompt tests all GREEN
expected: Running `npm test -- extraction-prompts --run` shows 22/22 passing — 12 Phase 53 tests and 10 Phase 57 SYNTH stubs (SYNTH-01 through SYNTH-05 all GREEN).
result: pass

### 2. Before-state populates from transcript upload
expected: Uploading an unstructured meeting transcript (no "Before State" section heading) produces a before_state entity — capturing the pre-BigPanda pain points (alert noise, manual triage, aggregation hub) from conversational language like "before we had BigPanda" or "we used to".
result: pass

### 3. E2E workflow populates from transcript upload
expected: Uploading a transcript that describes a team's process flow (e.g. "alerts come in, then correlation, then ServiceNow ticket") produces an e2e_workflow entity with a workflow name, team name, and multiple steps with labels and positions.
result: pass

### 4. Integration entities extracted with correct status
expected: Integrations mentioned in a transcript (e.g. "ServiceNow integration is currently in pilot") are extracted with the correct DB-mapped status — pilot/in-testing maps to "configured", live maps to "production", not-connected when only planned.
result: pass

### 5. Architecture integrations populate from transcript
expected: Uploading a transcript that describes how tools connect (e.g. "BigPanda pushes incidents to ServiceNow") produces architecture_integration rows capturing the tool, phase, and integration method.
result: issue
reported: "Current & Future State tab shows all nodes as Planned — extracted architecture_integrations data (ServiceNow, PagerDuty, Event Ingest) is not reflected in the visual diagram nodes"
severity: major

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Uploading a transcript produces architecture integration data that appears in the Current & Future State visual diagram — nodes reflect extracted tool connections and statuses"
  status: failed
  reason: "User reported: Current & Future State tab shows all nodes as Planned — extracted architecture_integrations data (ServiceNow, PagerDuty, Event Ingest) is not reflected in the visual diagram nodes"
  severity: major
  test: 5
  root_cause: "Extraction writes architecture entities to architecture_integrations table only. The visual diagram uses arch_nodes (separate table, defaults to planned). No bridge exists between architecture_integrations and arch_nodes — diagram statuses are never updated from extraction data."
  artifacts:
    - path: "bigpanda-app/app/api/ingestion/approve/route.ts"
      issue: "architecture case writes to architecture_integrations but does not upsert arch_nodes status"
    - path: "bigpanda-app/worker/jobs/document-extraction.ts"
      issue: "architecture entity type extracted but arch_node entity type not extracted for transcript docs"
  missing:
    - "In approve route architecture case: after inserting to architecture_integrations, also upsert the matching arch_node status (match by phase/stage name within the project's arch_nodes)"
  debug_session: ""
