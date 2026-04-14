# Phase 56: Teams Tab Alignment & Orphan Cleanup - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Close gaps from the v6.0 audit by:
1. Aligning the Teams tab to the intended 4-section editable design (TEAM-01)
2. Fixing the Drafts review modal so all extracted entity types are visible (TEAM-02)
3. Removing orphaned components and dead code left from the abandoned 4-section read-only Overview direction

Does NOT include: new Teams tab features, extraction prompt changes, schema migrations, or changes to the Architecture tab.

</domain>

<decisions>
## Implementation Decisions

### TEAM-01: Teams tab design (direction locked)

- **The 5-section `TeamEngagementMap` is NOT the final design.** The correct design is 4 sections (Architecture section removed).
- **`TeamsPageTabs.tsx` and `TeamEngagementOverview.tsx` are orphaned** — they were built for an old read-only Overview approach that is no longer wanted. Delete both files.
- **`TeamEngagementMap` stays as the sole Teams tab component** — editable in-place, no sub-tabs.
- **Remove `ArchOverviewSection`** from `TeamEngagementMap`. Architecture section belongs in the Architecture tab, not the Teams tab.
- **Result: 4-section editable map:** Business Value & Outcomes, End-to-End Workflows, Teams & Engagement Status, Top Focus Areas.
- **Section numbering removed:** Drop the numbered circle badges (`SectionHeader` `n` prop or equivalent). Use plain section title headers.
- **Update REQUIREMENTS.md:** Rewrite TEAM-01 to describe 4-section editable in-place map. Mark as satisfied.

### TEAM-02: Drafts review modal — missing entity type tabs

- **Root cause:** `ExtractionPreview.tsx` `ENTITY_ORDER` and `TAB_LABELS` only list 10 entity types. Eleven types are extracted, inserted silently, and never shown to the user.
- **Fix: add all 11 missing types** to `ExtractionPreview.tsx`, `ExtractionItemRow.tsx`, and `ExtractionItemEditForm.tsx`.
- **Missing types to add:**

  | Entity type | Tab label | Primary display field |
  |---|---|---|
  | `focus_area` | Focus Areas | `title` |
  | `e2e_workflow` | E2E Workflows | `workflow_name` |
  | `wbs_task` | WBS Tasks | `title` |
  | `note` | Notes | `content` |
  | `team_pathway` | Team Pathways | `team_name` |
  | `workstream` | Workstreams | `name` |
  | `onboarding_step` | Onboarding Steps | `step_name` |
  | `integration` | Integrations | `tool_name` |
  | `arch_node` | Arch Nodes | `node_name` |
  | `before_state` | Before State | `alert_to_ticket_problem` |
  | `weekly_focus` | Weekly Focus | `bullets` |

- **`ExtractionItemEditForm.tsx`:** Add `ENTITY_FIELDS` definitions for all 11 types with the same field lists used in the extraction prompts and approve route. `e2e_workflow.steps` shown as raw JSON text input — acceptable.
- **Update REQUIREMENTS.md:** Mark TEAM-02 as satisfied.

### Dead code removal

Remove the following — no functionality is affected:

| Item | Action |
|---|---|
| `components/teams/TeamsPageTabs.tsx` | Delete file |
| `components/teams/TeamEngagementOverview.tsx` | Delete file |
| `components/teams/ArchOverviewSection.tsx` | Delete file (becomes orphaned after Teams tab fix) |
| `app/api/ingestion/approve/route.ts` — `case 'team_engagement'` handler | Remove dead case + `teamEngagementSections` import |
| `lib/queries.ts` — `getTeamEngagementSections()` function | Remove function |
| `lib/queries.ts` — `TeamEngagementSection` type | Remove type |
| `lib/queries.ts` — `teamEngagementSections` import | Remove import |
| `lib/extraction-types.ts` — `teamEngagementSections` import | Remove dead import |

**Keep:** `teamEngagementSections` table in `db/schema.ts` — no migration needed this phase.

### Claude's Discretion

- Exact tab ordering in `ExtractionPreview.tsx` (group team-adjacent types together: focus_area, e2e_workflow, team_pathway after the existing `team` tab)
- Whether to also update `worker/jobs/document-extraction.ts` comment about `team_engagement` deprecation (just update/remove the comment if encountered during dead code sweep)
- Section header styling after removing numbered circles (plain `h2` or styled divider — match existing heading patterns in the app)

</decisions>

<specifics>
## Specific Ideas

- The user's immediate trigger for this phase: uploaded `4_9 - Amex.docx` and saw "48 of 48 approved" in the Drafts modal but only 32 items were visible across tabs — 16 items were silently approved with no review. This is the exact bug TEAM-02 fixes.
- The user explicitly said: "It is important that with all this cleanup and changes we do, we maintain and improve the integrity and quality of the extraction process. The goal is to populate every tab with data based on this process." — Phase 56 closes the last gap between what's extracted and what's reviewable.
- Teams tab: old read-only Overview direction ("like the AMEX HTML reference") was abandoned — the editable map is the right approach.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/teams/TeamEngagementMap.tsx` — stays as the canonical Teams tab component; remove `ArchOverviewSection` import and its rendered `<SectionHeader>` + `<ArchOverviewSection>` block (Section 2), renumber no longer needed
- `components/teams/BusinessOutcomesSection.tsx`, `E2eWorkflowsSection.tsx`, `TeamsEngagementSection.tsx`, `FocusAreasSection.tsx` — all stay, untouched
- `components/ExtractionPreview.tsx` — add to `TAB_LABELS` and `ENTITY_ORDER`
- `components/ExtractionItemRow.tsx` — add to `primaryFieldKeys`
- `components/ExtractionItemEditForm.tsx` — add to `ENTITY_FIELDS`
- `app/api/ingestion/approve/route.ts` — remove `case 'team_engagement'` and `teamEngagementSections` import only

### Established Patterns
- `ExtractionPreview` uses `ENTITY_ORDER` to filter types with items — only types with extracted items appear as tabs (correct, keep pattern)
- `ExtractionItemEditForm` uses `ENTITY_FIELDS[entityType] ?? Object.keys(item.fields)` as fallback — adding proper field defs removes reliance on fallback for the 11 types
- `TeamEngagementMap` uses `SectionHeader` component with numbered `n` prop — remove the component usage, not the component itself (or remove it too if it becomes orphaned)

### Integration Points
- `app/customer/[id]/teams/page.tsx` — currently imports `TeamEngagementMap` directly; no change needed here (it's already correct — `TeamsPageTabs` was never wired in)
- Tests in `tests/teams/engagement-overview.test.tsx` and `tests/teams/warn-banner-trigger.test.tsx` — check if these reference deleted components; update or delete as needed
- `tests/teams-arch/teams-sections.test.ts` — verify this doesn't reference `ArchOverviewSection`

</code_context>

<deferred>
## Deferred Ideas

- None raised during discussion — phase stayed cleanly within gap-closure scope.

</deferred>

---

*Phase: 56-teams-tab-alignment-and-orphan-cleanup*
*Context gathered: 2026-04-10*
