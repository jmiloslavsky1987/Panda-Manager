# Phase 56: Teams Tab Alignment & Orphan Cleanup - Research

**Researched:** 2026-04-10
**Domain:** React component cleanup, dead code removal, UI entity type coverage
**Confidence:** HIGH

## Summary

Phase 56 is a gap-closure phase addressing two specific misalignments identified in the v6.0 audit. First, the Teams tab has orphaned infrastructure from an abandoned read-only "Overview" design direction that was never wired. Second, the Drafts review modal only shows 10 of 21 extracted entity types, causing 11 types to be approved silently without user review. This phase requires no new technical patterns — it's file deletion, array extension, and documentation updates using established project conventions.

The user's trigger: uploaded a document, saw "48 of 48 approved" but only 32 items visible — 16 items approved with no review opportunity. This is the exact gap TEAM-02 closes.

**Primary recommendation:** Delete orphaned components, extend extraction preview entity type lists, update REQUIREMENTS.md to reflect final 4-section design. All work is mechanical using existing patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**TEAM-01: Teams tab design (direction locked)**
- The 5-section `TeamEngagementMap` is NOT the final design. The correct design is 4 sections (Architecture section removed).
- `TeamsPageTabs.tsx` and `TeamEngagementOverview.tsx` are orphaned — built for an old read-only Overview approach that is no longer wanted. Delete both files.
- `TeamEngagementMap` stays as the sole Teams tab component — editable in-place, no sub-tabs.
- Remove `ArchOverviewSection` from `TeamEngagementMap`. Architecture section belongs in the Architecture tab, not the Teams tab.
- Result: 4-section editable map — Business Value & Outcomes, End-to-End Workflows, Teams & Engagement Status, Top Focus Areas.
- Section numbering removed — Drop the numbered circle badges (`SectionHeader` `n` prop or equivalent). Use plain section title headers.
- Update REQUIREMENTS.md — Rewrite TEAM-01 to describe 4-section editable in-place map. Mark as satisfied.

**TEAM-02: Drafts review modal — missing entity type tabs**
- Root cause: `ExtractionPreview.tsx` `ENTITY_ORDER` and `TAB_LABELS` only list 10 entity types. Eleven types are extracted, inserted silently, and never shown to the user.
- Fix: add all 11 missing types to `ExtractionPreview.tsx`, `ExtractionItemRow.tsx`, and `ExtractionItemEditForm.tsx`.
- Missing types to add: `focus_area`, `e2e_workflow`, `wbs_task`, `note`, `team_pathway`, `workstream`, `onboarding_step`, `integration`, `arch_node`, `before_state`, `weekly_focus`
- `ExtractionItemEditForm.tsx`: Add `ENTITY_FIELDS` definitions for all 11 types with the same field lists used in the extraction prompts and approve route. `e2e_workflow.steps` shown as raw JSON text input — acceptable.
- Update REQUIREMENTS.md: Mark TEAM-02 as satisfied.

**Dead code removal**
- `components/teams/TeamsPageTabs.tsx` — Delete file
- `components/teams/TeamEngagementOverview.tsx` — Delete file
- `components/teams/ArchOverviewSection.tsx` — Delete file (becomes orphaned after Teams tab fix)
- `app/api/ingestion/approve/route.ts` — Remove `case 'team_engagement'` handler + `teamEngagementSections` import
- `lib/queries.ts` — Remove `getTeamEngagementSections()` function
- `lib/queries.ts` — Remove `TeamEngagementSection` type
- `lib/queries.ts` — Remove `teamEngagementSections` import
- `lib/extraction-types.ts` — Remove `teamEngagementSections` import (if exists)
- Keep: `teamEngagementSections` table in `db/schema.ts` — no migration needed this phase

### Claude's Discretion

- Exact tab ordering in `ExtractionPreview.tsx` (group team-adjacent types together: focus_area, e2e_workflow, team_pathway after the existing `team` tab)
- Whether to also update `worker/jobs/document-extraction.ts` comment about `team_engagement` deprecation (just update/remove the comment if encountered during dead code sweep)
- Section header styling after removing numbered circles (plain `h2` or styled divider — match existing heading patterns in the app)

### Deferred Ideas (OUT OF SCOPE)

None raised during discussion — phase stayed cleanly within gap-closure scope.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TEAM-01 | Teams sub-tab displays a 4-section engagement map: Business Outcomes, E2E Workflows, Teams & Engagement, and Top Focus Areas (Architecture section excluded) | Component deletion + `TeamEngagementMap` edit — remove Section 2 (Architecture), renumber remaining to 1-4, remove numbered badges |
| TEAM-02 | Context upload extracts and routes structured data to populate all Team Engagement Map sections automatically | Extend `TAB_LABELS`, `ENTITY_ORDER`, `primaryFieldKeys`, and `ENTITY_FIELDS` arrays with 11 missing types — enables review of all extracted entities before approval |

</phase_requirements>

## Standard Stack

This phase uses **existing project infrastructure** — no new libraries or frameworks. All work is mechanical file deletion, array extension, and import cleanup.

### Core Technologies (already in use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 (Next.js 16) | Next.js 16 | Component framework | Project foundation |
| TypeScript | 5.x | Type safety | Enforces extraction entity type coverage |
| Vitest | ^3.1.8 | Test framework | Project test runner (confirmed in package.json) |

### Supporting Infrastructure
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Drizzle ORM | 0.45.1 | Database queries | No schema changes — only remove unused query function |
| Zod | N/A | Validation | approve/route.ts already validates 21 entity types (no changes needed) |

### No New Dependencies
Phase 56 requires **zero new package installations**. All changes use existing patterns:
- Component deletion (standard file removal)
- Array extension (add strings to existing arrays)
- Import cleanup (remove unused imports)
- REQUIREMENTS.md update (markdown edit)

## Architecture Patterns

### Recommended File Structure
```
components/
├── teams/
│   ├── TeamEngagementMap.tsx       # EDIT: Remove Section 2, renumber 3-5 → 2-4
│   ├── BusinessOutcomesSection.tsx # KEEP: No changes
│   ├── E2eWorkflowsSection.tsx     # KEEP: No changes
│   ├── TeamsEngagementSection.tsx  # KEEP: No changes
│   ├── FocusAreasSection.tsx       # KEEP: No changes
│   ├── TeamsPageTabs.tsx           # DELETE: Orphaned (never wired)
│   ├── TeamEngagementOverview.tsx  # DELETE: Orphaned (never wired)
│   └── ArchOverviewSection.tsx     # DELETE: Orphaned after Section 2 removal
├── ExtractionPreview.tsx           # EDIT: Extend TAB_LABELS + ENTITY_ORDER
├── ExtractionItemRow.tsx           # EDIT: Extend primaryFieldKeys
└── ExtractionItemEditForm.tsx      # EDIT: Extend ENTITY_FIELDS

app/api/ingestion/approve/route.ts  # EDIT: Remove case 'team_engagement' + imports
lib/queries.ts                       # EDIT: Remove getTeamEngagementSections() + types
```

### Pattern 1: Extraction Preview Entity Type Registration

**What:** Three parallel arrays/objects that MUST stay in sync — `TAB_LABELS`, `ENTITY_ORDER`, `primaryFieldKeys`, and `ENTITY_FIELDS`.

**When to use:** Any time a new entity type is added to the extraction system.

**How it works:**
1. `TAB_LABELS` (Record<string, string>) — Maps entity type to display label for tab header
2. `ENTITY_ORDER` (string[]) — Controls tab ordering (only types with extracted items appear)
3. `primaryFieldKeys` (Record<string, string>) — Maps entity type to field name for row summary
4. `ENTITY_FIELDS` (Record<string, string[]>) — Maps entity type to full editable field list

**Example from existing code:**
```typescript
// ExtractionPreview.tsx
export const TAB_LABELS: Record<string, string> = {
  action: 'Actions',
  risk: 'Risks',
  team: 'Teams',
  // ADD: focus_area, e2e_workflow, wbs_task, etc.
}

const ENTITY_ORDER: string[] = [
  'action', 'risk', 'decision', 'milestone', 'stakeholder',
  'task', 'architecture', 'history', 'businessOutcome', 'team',
  // ADD: focus_area, e2e_workflow, team_pathway, wbs_task, etc.
]

// ExtractionItemRow.tsx
const primaryFieldKeys: Record<string, string> = {
  action: 'description',
  team: 'team_name',
  // ADD: focus_area: 'title', e2e_workflow: 'workflow_name', etc.
}

// ExtractionItemEditForm.tsx
export const ENTITY_FIELDS: Record<string, string[]> = {
  action: ['description', 'owner', 'due_date', 'status', 'notes', 'type'],
  team: ['team_name', 'track', 'ingest_status'],
  // ADD: focus_area: ['title', 'tracks', 'why_it_matters', ...], etc.
}
```

**Source:** Existing pattern established in Phase 50-51, verified by reading ExtractionPreview.tsx (lines 11-28), ExtractionItemRow.tsx (lines 83-94), ExtractionItemEditForm.tsx (lines 9-20).

### Pattern 2: Component Deletion Without Breaking Changes

**What:** Safe deletion of unused React components that were built but never wired to page routes.

**When to use:** When component exists in codebase but no page/parent component imports it.

**How to verify safe deletion:**
```bash
# 1. Check for imports of the component
grep -r "from.*TeamsPageTabs" bigpanda-app/
grep -r "from.*TeamEngagementOverview" bigpanda-app/

# 2. Verify tests reference the component (must update/delete tests too)
grep -r "TeamEngagementOverview" bigpanda-app/tests/

# 3. Check page.tsx to confirm which component is actually used
cat app/customer/[id]/teams/page.tsx
```

**Verified for this phase:**
- `app/customer/[id]/teams/page.tsx` imports `TeamEngagementMap` directly (line 2) — correct component already wired
- `TeamsPageTabs.tsx` has zero imports in codebase (never wired)
- `TeamEngagementOverview.tsx` only imported by `TeamsPageTabs.tsx` (cascading orphan)
- Tests `tests/teams/engagement-overview.test.tsx` and `tests/teams/warn-banner-trigger.test.tsx` reference `TeamEngagementOverview` — must be updated or deleted

**Source:** Verified by reading page.tsx (line 2), grepping imports, checking test files.

### Pattern 3: Dead Code Handler Removal from Switch Statement

**What:** Remove unused case blocks from entity type switch statements in approve route.

**When to use:** When entity type is deprecated from extraction prompt but backward-compatibility handler remains.

**Example:**
```typescript
// app/api/ingestion/approve/route.ts — lines 818-855
case 'team_engagement': {
  // DEAD CODE (EXTR-15): team_engagement removed from extraction prompt in Phase 51 Plan 02.
  // Handler retained for backward compatibility with any items already in the review queue.
  // Remove this case block in Phase 56.

  const sectionRows = await db
    .select({ id: teamEngagementSections.id, content: teamEngagementSections.content })
    .from(teamEngagementSections)
    .where(...)
  // ... insert/update logic
}
```

**Safe removal criteria:**
1. Entity type NOT in `EXTRACTION_SYSTEM` union (Phase 51 removed it)
2. Handler marked as DEAD CODE with explicit comment
3. No new documents can extract this type (prompt doesn't include it)
4. All old review queue items have been processed (user confirmed in CONTEXT)

**Source:** Verified by reading approve/route.ts lines 818-855, confirmed DEAD CODE comment present.

## Don't Hand-Roll

This phase requires **no custom solutions**. All work uses existing project patterns:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Entity type registration | Custom enum sync system | Manual array extension | 11 types × 4 locations = 44 lines — simpler than sync infrastructure |
| Component deletion safety | AST-based refactoring tool | Manual grep + file deletion | 3 files, 2 test files — verification time < setup time |
| Numbered section headers | New component abstraction | Delete `<SectionHeader n={1-5}>` calls, use plain `<h2>` | 5 deletions faster than new component |
| Test updates | Comprehensive test rewrite | Update/delete 2 test files | Tests are source-inspection style (read file contents), low change cost |

**Key insight:** This phase is mechanical cleanup with zero algorithmic complexity. Time investment in abstractions exceeds time saved by manual edits.

## Common Pitfalls

### Pitfall 1: Forgetting to Update All Four Entity Type Registration Points

**What goes wrong:** Add entity type to `TAB_LABELS` but forget `ENTITY_ORDER` or `ENTITY_FIELDS` — tab appears empty or edit form shows no fields.

**Why it happens:** Four separate locations must stay synchronized (ExtractionPreview.tsx, ExtractionItemRow.tsx, ExtractionItemEditForm.tsx) with no compile-time enforcement.

**How to avoid:**
1. Create a checklist: TAB_LABELS → ENTITY_ORDER → primaryFieldKeys → ENTITY_FIELDS
2. For each of 11 missing types, verify all four locations updated before moving to next type
3. Run tests: `npm test -- ExtractionPreview` to verify no runtime errors

**Warning signs:**
- User reports: "Tab shows '5 items' but content area is empty" → Missing from `ENTITY_ORDER`
- User reports: "Can't edit fields" → Missing from `ENTITY_FIELDS`
- User reports: "Row shows 'No content'" → Missing/wrong `primaryFieldKeys` mapping

### Pitfall 2: Breaking Tests When Deleting Components

**What goes wrong:** Delete `TeamEngagementOverview.tsx`, tests fail with "Cannot find module" errors.

**Why it happens:** Tests import the component directly for type checking and source inspection (tests/teams/engagement-overview.test.tsx line 90, warn-banner-trigger.test.tsx lines 13-14).

**How to avoid:**
1. Before deleting component, check test directory: `grep -r "TeamEngagementOverview" tests/`
2. For each test file found, decide: delete test (if testing deleted component) or update (if testing behavior that moved)
3. Run test suite after deletion: `npm test tests/teams/`

**Warning signs:**
- Test output: "Error: Cannot find module '@/components/teams/TeamEngagementOverview'"
- Test count decreases unexpectedly (tests silently skipped due to import failure)

### Pitfall 3: Removing Wrong `case` Block in Approve Route

**What goes wrong:** Remove `case 'team'` instead of `case 'team_engagement'` — breaks live entity type handling.

**Why it happens:** Similar naming (`team` vs `team_engagement`), both in same file, both involve team data.

**How to avoid:**
1. Verify DEAD CODE comment present on the case block before deleting
2. Check entity type is NOT in `EXTRACTION_SYSTEM` union (line 41-47)
3. Grep extraction prompts: `grep -r "team_engagement" worker/jobs/` — should return zero results (removed in Phase 51)

**Warning signs:**
- User reports: "Teams tab empty after document upload" → Deleted wrong handler
- Approve route throws: "No handler for entity type 'team'" → Removed live case

### Pitfall 4: Section Numbering Mismatch After Deletion

**What goes wrong:** Remove Section 2 (Architecture) but leave Section 3, 4, 5 numbered as 3, 4, 5 — creates visual discontinuity.

**Why it happens:** Easy to delete section markup but forget to renumber remaining sections OR remove numbering entirely per CONTEXT.md decision.

**How to avoid:**
1. CONTEXT.md decision: Remove numbered badges entirely (Section numbering removed line in locked decisions)
2. Delete all `<SectionHeader n={...}>` components, replace with plain heading style
3. Verify: `grep -n "SectionHeader" components/teams/TeamEngagementMap.tsx` returns zero results

**Warning signs:**
- UI shows: "1. Business Value" → "3. Workflows" → "4. Teams" (missing 2)
- User confused about "Section 3" references when only 4 sections exist

## Code Examples

Verified patterns from existing codebase:

### Entity Type Registration (TEAM-02 fix)

**Add to ExtractionPreview.tsx (lines 11-28):**
```typescript
// Source: Existing pattern in ExtractionPreview.tsx
export const TAB_LABELS: Record<string, string> = {
  action: 'Actions',
  risk: 'Risks',
  decision: 'Decisions',
  milestone: 'Milestones',
  stakeholder: 'Stakeholders',
  task: 'Tasks',
  architecture: 'Architecture',
  history: 'History',
  businessOutcome: 'Business Outcomes',
  team: 'Teams',
  // ADD these 11 missing types:
  focus_area: 'Focus Areas',
  e2e_workflow: 'E2E Workflows',
  wbs_task: 'WBS Tasks',
  note: 'Notes',
  team_pathway: 'Team Pathways',
  workstream: 'Workstreams',
  onboarding_step: 'Onboarding Steps',
  integration: 'Integrations',
  arch_node: 'Arch Nodes',
  before_state: 'Before State',
  weekly_focus: 'Weekly Focus',
}

const ENTITY_ORDER: string[] = [
  'action', 'risk', 'decision', 'milestone', 'stakeholder',
  'task', 'architecture', 'history', 'businessOutcome', 'team',
  // ADD after 'team' (group team-adjacent types):
  'focus_area', 'e2e_workflow', 'team_pathway',
  // ADD remaining types:
  'wbs_task', 'note', 'workstream', 'onboarding_step',
  'integration', 'arch_node', 'before_state', 'weekly_focus',
]
```

**Add to ExtractionItemRow.tsx (lines 83-94):**
```typescript
// Source: Existing pattern in ExtractionItemRow.tsx
const primaryFieldKeys: Record<string, string> = {
  action: 'description',
  risk: 'description',
  decision: 'decision',
  milestone: 'name',
  stakeholder: 'name',
  task: 'title',
  architecture: 'tool_name',
  history: 'content',
  businessOutcome: 'title',
  team: 'team_name',
  // ADD these 11 missing types:
  focus_area: 'title',
  e2e_workflow: 'workflow_name',
  wbs_task: 'title',
  note: 'content',
  team_pathway: 'team_name',
  workstream: 'name',
  onboarding_step: 'step_name',
  integration: 'tool_name',
  arch_node: 'node_name',
  before_state: 'alert_to_ticket_problem',
  weekly_focus: 'bullets',
}
```

**Add to ExtractionItemEditForm.tsx (lines 9-20):**
```typescript
// Source: Field lists verified in approve/route.ts entity handlers
export const ENTITY_FIELDS: Record<string, string[]> = {
  action: ['description', 'owner', 'due_date', 'status', 'notes', 'type'],
  risk: ['description', 'severity', 'mitigation', 'owner'],
  decision: ['decision', 'rationale', 'made_by', 'date'],
  milestone: ['name', 'target_date', 'status', 'owner'],
  stakeholder: ['name', 'role', 'email', 'account'],
  task: ['title', 'status', 'owner', 'phase', 'description', 'start_date', 'due_date', 'milestone_name', 'workstream_name', 'priority'],
  architecture: ['tool_name', 'track', 'phase', 'status', 'integration_method'],
  history: ['date', 'content', 'author'],
  businessOutcome: ['title', 'track', 'description', 'delivery_status'],
  team: ['team_name', 'track', 'ingest_status'],
  // ADD these 11 missing types (field lists from CONTEXT.md + approve/route.ts):
  focus_area: ['title', 'tracks', 'why_it_matters', 'current_status', 'next_step', 'bp_owner', 'customer_owner'],
  e2e_workflow: ['workflow_name', 'team_name', 'steps'], // steps as raw JSON text input
  wbs_task: ['title', 'track', 'level', 'parent_section_name', 'description', 'status', 'owner'],
  note: ['content', 'author', 'date'],
  team_pathway: ['team_name', 'pathway_description', 'key_milestones'],
  workstream: ['name', 'track', 'lead', 'status'],
  onboarding_step: ['step_name', 'description', 'status', 'assigned_to'],
  integration: ['tool_name', 'status', 'integration_group', 'integration_method'],
  arch_node: ['node_name', 'track', 'status', 'description'],
  before_state: ['alert_to_ticket_problem', 'bp_value_prop', 'deployment_status'],
  weekly_focus: ['bullets'], // Redis-stored, single text field
}
```

### Component Deletion Pattern (TEAM-01 fix)

**TeamEngagementMap.tsx — Remove Section 2 and renumber:**
```typescript
// BEFORE (lines 38-76):
<div className="space-y-10">
  <SectionHeader n={1} title="Business Value &amp; Expected Outcomes" />
  <BusinessOutcomesSection ... />

  <SectionHeader n={2} title="Architecture Overview" />
  <ArchOverviewSection integrations={data.architectureIntegrations} />

  <SectionHeader n={3} title="End-to-End Workflows" />
  <E2eWorkflowsSection ... />

  <SectionHeader n={4} title="Teams &amp; Engagement Status" />
  <TeamsEngagementSection ... />

  <SectionHeader n={5} title="Top Focus Areas" />
  <FocusAreasSection ... />
</div>

// AFTER (remove numbering per CONTEXT.md, delete Section 2):
<div className="space-y-10">
  <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-2 mb-6">
    Business Value &amp; Expected Outcomes
  </h2>
  <BusinessOutcomesSection ... />

  {/* SECTION 2 DELETED — Architecture moved to dedicated Architecture tab */}

  <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-2 mb-6">
    End-to-End Workflows
  </h2>
  <E2eWorkflowsSection ... />

  <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-2 mb-6">
    Teams &amp; Engagement Status
  </h2>
  <TeamsEngagementSection ... />
  <TeamOnboardingTable ... />

  <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-2 mb-6">
    Top Focus Areas
  </h2>
  <FocusAreasSection ... />
</div>
```

**Also delete:**
- Line 2: `import { ArchOverviewSection } from './ArchOverviewSection'`
- Lines 11-23: `SectionHeader` component definition (if not used elsewhere)

### Dead Code Removal Pattern

**app/api/ingestion/approve/route.ts — Remove team_engagement handler:**
```typescript
// BEFORE (lines 818-855):
case 'team_engagement': {
  // DEAD CODE (EXTR-15): team_engagement removed from extraction prompt in Phase 51 Plan 02.
  const sectionRows = await db.select(...).from(teamEngagementSections)...
  // ... 30+ lines of insert/update logic
  return { unresolvedMilestones: 0, unresolvedWorkstreams: 0 };
}

// AFTER: Delete entire case block (lines 818-855)
// Jump from previous case to next case
```

**Also remove:**
- Line 23: `teamEngagementSections,` from schema imports
- Any `import { ... } from '@/lib/queries'` that includes `getTeamEngagementSections`

**lib/queries.ts — Remove function:**
```typescript
// BEFORE (lines 1211-1221):
/**
 * Returns team engagement sections for a project, ordered by display_order.
 * Used by Phase 48 Team Engagement UI.
 */
export async function getTeamEngagementSections(projectId: number): Promise<TeamEngagementSection[]> {
  return db
    .select()
    .from(teamEngagementSections)
    .where(eq(teamEngagementSections.project_id, projectId))
    .orderBy(asc(teamEngagementSections.display_order));
}

// AFTER: Delete entire function + JSDoc (lines 1211-1221)
```

**Also remove:**
- `TeamEngagementSection` type definition (if exported separately)
- `teamEngagementSections` import from schema (if isolated)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Read-only Overview tab with 4-section summary | Editable in-place map (no Overview sub-tab) | Phase 48 CONTEXT decision | `TeamsPageTabs` and `TeamEngagementOverview` never wired, now safe to delete |
| 5-section Teams tab (with Architecture) | 4-section Teams tab (Architecture in separate tab) | Phase 56 CONTEXT decision | Removes duplication between Teams and Architecture tabs |
| 10 entity types reviewable in Drafts modal | 21 entity types reviewable (all extracted types) | Phase 56 (this phase) | Closes "silent approval" gap — user reviews ALL extracted data |
| `team_engagement` entity type with dedicated table | Deprecated, table unused | Phase 51 Plan 02 | Handler retained for backward compatibility, now safe to remove |

**Deprecated/outdated:**
- `TeamsPageTabs.tsx` — Built for sub-tab navigation (Overview/Detail) that was never activated
- `TeamEngagementOverview.tsx` — Built for read-only overview display, design direction abandoned
- `ArchOverviewSection.tsx` — Duplicates content from Architecture tab's Current & Future State
- `getTeamEngagementSections()` — Queries table that's not surfaced in any UI

## Open Questions

1. **Should `SectionHeader` component be deleted entirely?**
   - What we know: Used only in `TeamEngagementMap.tsx` for numbered sections (5 usages)
   - What's unclear: If it's used elsewhere in the codebase (grep needed)
   - Recommendation: Check usage with `grep -r "SectionHeader" components/`, delete if only used in `TeamEngagementMap`

2. **Should test files be updated or deleted?**
   - What we know: `tests/teams/engagement-overview.test.tsx` and `tests/teams/warn-banner-trigger.test.tsx` test the deleted `TeamEngagementOverview` component
   - What's unclear: If tests verify behavior that moved to `TeamEngagementMap` (should update) or only tested deleted component (should delete)
   - Recommendation: Delete both test files — they test component structure of deleted component, not reusable behavior

3. **Does `weekly_focus` need special handling in edit form?**
   - What we know: `weekly_focus` is stored in Redis (not Postgres), uses TTL pattern, single `bullets` field
   - What's unclear: If edit form should show warning that changes are temporary (7-day TTL)
   - Recommendation: Treat like any other field for Phase 56 — TTL warning is enhancement, not gap-closure blocker

## Validation Architecture

> nyquist_validation is enabled in .planning/config.json — include this section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.8 |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- ExtractionPreview ExtractionItemRow ExtractionItemEditForm` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEAM-01 | TeamEngagementMap renders 4 sections without Architecture section | unit | `npm test tests/teams/` | ✅ existing (needs update) |
| TEAM-01 | Section headers have no numbered badges | unit | `npm test tests/teams/` | ❌ Wave 0 |
| TEAM-02 | ExtractionPreview shows tabs for all 21 entity types when items present | unit | `npm test -- ExtractionPreview` | ❌ Wave 0 |
| TEAM-02 | ExtractionItemRow displays correct primary field for all 21 entity types | unit | `npm test -- ExtractionItemRow` | ❌ Wave 0 |
| TEAM-02 | ExtractionItemEditForm shows correct fields for all 21 entity types | unit | `npm test -- ExtractionItemEditForm` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- {modified-component-name}`
- **Per wave merge:** `npm test tests/teams/ tests/extraction/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/teams/team-engagement-map.test.tsx` — verify 4 sections rendered, no Architecture section, no numbered badges
- [ ] `tests/extraction/extraction-preview-coverage.test.ts` — verify all 21 types in TAB_LABELS + ENTITY_ORDER
- [ ] `tests/extraction/extraction-item-row-fields.test.ts` — verify primaryFieldKeys has 21 entries
- [ ] `tests/extraction/extraction-edit-form-fields.test.ts` — verify ENTITY_FIELDS has 21 entries
- [ ] Update existing `tests/teams/engagement-overview.test.tsx` — delete or adapt to TeamEngagementMap
- [ ] Update existing `tests/teams/warn-banner-trigger.test.tsx` — delete or adapt to TeamEngagementMap

## Sources

### Primary (HIGH confidence)
- ExtractionPreview.tsx (read lines 1-147) — Current entity type registration pattern
- ExtractionItemRow.tsx (read lines 1-202) — Primary field key pattern
- ExtractionItemEditForm.tsx (read lines 1-83) — Entity field definitions
- TeamEngagementMap.tsx (read lines 1-79) — Section structure with numbered headers
- TeamsPageTabs.tsx (read lines 1-64) — Orphaned sub-tab navigation component
- TeamEngagementOverview.tsx (read lines 1-266) — Orphaned read-only overview component
- app/customer/[id]/teams/page.tsx (read lines 1-45) — Verified `TeamEngagementMap` is wired, not `TeamsPageTabs`
- app/api/ingestion/approve/route.ts (read lines 818-855) — Confirmed DEAD CODE comment on team_engagement handler
- lib/queries.ts (grep results) — Confirmed `getTeamEngagementSections()` exists at lines 1215-1221
- package.json (read lines 1-50) — Confirmed Vitest test framework
- 56-CONTEXT.md (read full file) — User decisions and locked implementation approach

### Secondary (MEDIUM confidence)
- None — all findings verified against source code

### Tertiary (LOW confidence)
- None — all findings HIGH confidence from direct source inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies, all existing patterns
- Architecture: HIGH — Direct file inspection confirms orphaned components
- Pitfalls: HIGH — Verified via grep and file reading, not hypothetical

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days) — Stable cleanup phase, no fast-moving ecosystem dependencies
