# Extraction Intelligence Gap — Post Phase 51 Observation

## Date
2026-04-09

## What Was Observed
Real document upload (AMEX project context, large doc) extracted 480 items but ONLY these entity types:
- Actions (83), Risks (62), Decisions (147), Milestones (41), Stakeholders (50)
- Architecture (4), History (14), Business Outcomes (3), Teams (2)

## What Was MISSING (populated 0 items)
| Entity Type | App Location | Why It Matters |
|---|---|---|
| `onboarding_step` | Overview tab — ADR/Biggy onboarding sections | Shows 0/0 phases complete |
| `wbs_task` | Delivery tab — Plan, WBS, Task Board | Entire delivery section empty |
| `e2e_workflow` | Team tab — end-to-end workflows | No workflow cards |
| `team_pathway` | Team tab | No pathway data |
| `arch_node` | Architecture tab — Before/Current/Future state | No architecture nodes |
| `before_state` | Architecture tab — Before BigPanda | Never populated |
| `focus_area` | Team tab — top focus areas | No focus data |
| `weekly_focus` | Overview tab | No weekly bullets |

## Root Cause
The single-pass EXTRACTION_SYSTEM prompt asks Claude to extract all entity types, but when faced with
a real project context document, Claude defaults to the most "obvious" generic types. It does NOT
recognize that:
- ADR phase status descriptions → should become `onboarding_step` entities
- Task/work items in workstream tables → should become `wbs_task` entities
- Tech component names/descriptions → should become `arch_node` entities
- Process flow descriptions → should become `e2e_workflow` entities

The prompt has disambiguation rules but they are insufficient for real documents.

## Proposed Solution
**Multi-pass targeted extraction** — instead of one generic pass, run separate focused extraction
calls per entity group:

1. **Pass 1 (generic):** actions, risks, decisions, milestones, stakeholders, history (current behavior)
2. **Pass 2 (delivery):** wbs_task — targeted prompt: "find all work items, tasks, phases that describe
   what needs to be done or is in progress"
3. **Pass 3 (onboarding):** onboarding_step — targeted prompt: "find all ADR or Biggy implementation
   phases, steps, or checkpoints with their completion status"
4. **Pass 4 (architecture):** arch_node, before_state — targeted prompt: "find all technology components,
   integrations, tools, and their current vs future state"
5. **Pass 5 (team/ops):** e2e_workflow, team_pathway, focus_area, weekly_focus — targeted prompt:
   "find team assignments, end-to-end processes, key focus areas, weekly priorities"

Each pass uses a focused system prompt tuned to recognize its entity type from real PS project context
documents. Passes can run in parallel (no inter-dependencies).

## Alternative Approaches Considered
- Better single-pass prompt: Tried extensively in Phases 46, 50, 51. Still fails on real documents.
- Post-classification layer: Run generic extraction then re-classify. Still loses entity-specific field structure.
- Structured output forcing: Claude API structured outputs. Helps with format but not semantic classification.

## Key Constraint
Must not regress existing generic entity extraction (actions/risks/decisions/milestones are working well).
New passes are ADDITIVE — they supplement, not replace.

## Questions to Resolve in Planning
1. How to handle duplicate detection across passes (same content extracted as both `action` and `wbs_task`)?
2. Parallel passes vs sequential — cost vs latency tradeoff
3. Whether to show per-pass progress in the extraction UI
4. Token cost implications (5x Claude calls per document)
