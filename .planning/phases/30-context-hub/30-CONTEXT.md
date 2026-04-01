# Phase 30: Context Hub - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a dedicated Context tab to every project workspace. Team members upload documents (PDF, DOCX, PPTX) to this tab, Claude extracts and routes content to the correct workspace tabs, users approve or reject suggestions before any data is written, and the tab displays a per-tab completeness status that surfaces specific record-level quality gaps. The tab is used regularly — weekly working session notes are the primary upload vehicle.

No new auth requirements. No new DB tables beyond extending the extraction entity type list.

</domain>

<decisions>
## Implementation Decisions

### Tab Navigation Placement
- Standalone tab (no sub-tabs) — `standalone: true` in TAB_GROUPS
- Position: before Admin, at the end of the nav bar
- Order becomes: Overview · Delivery · Team · Intel · Skills · Chat · **Context** · Admin
- URL pattern: `?tab=context` (consistent with Phase 27 standalone tab pattern)

### Tab Layout (vertically stacked, single scroll)
Three sections top to bottom:
1. **Upload section** — drop zone / upload button that triggers the IngestionModal
2. **Upload history list** — documents uploaded to this project (filename, date, status)
3. **Completeness panel** — per-tab badges + expandable gap descriptions, with "Analyze" trigger button

### Ingestion Flow
- Reuse existing `IngestionModal` component — open it from a button/drop zone in the upload section of the Context tab
- The full upload → extract → review → approve flow runs inside the existing modal; no inline rebuild
- On conflict (re-uploading an updated doc): smart merge — the existing conflict UI shows current vs. new version per item; user picks merge / replace / skip per item
- Claude routes all entity types equally — trust the extraction prompt to determine what goes where

### Entity Type Additions
Add three new extractable entity types to the extraction pipeline:
- `workstream` → maps to `workstreams` table (delivery phase names, status, completion)
- `onboarding_step` → maps to `onboarding_steps` table (ADR/Biggy track step status per team member)
- `integration` → maps to `integrations` table (tool, category, connection status)

All existing entity types retained: action, risk, decision, milestone, stakeholder, task, architecture, history, businessOutcome, team, note, team_pathway.

Architecture/workflow diagram entities are already covered: `architecture` → architectureIntegrations + focusAreas; `team_pathway` → workflow routing steps; `businessOutcome` → business outcomes.

### Completeness Panel
- All 11 workspace tabs listed, **collapsed by default** — click a row to expand and see gap descriptions
- Each row shows: tab name + status badge (complete / partial / empty)
- **On-demand trigger**: "Analyze completeness" button — user explicitly clicks to run analysis; no auto-run on tab load
- Loading state while Claude analyzes live DB data (typically a few seconds)
- Gap description format: **specific record-level** — e.g., "Teams tab: ADR onboarding status missing for Kaiser (3 of 5 steps incomplete)" or "Actions tab: 4 actions missing an owner assignment"
- Gap descriptions reference template section definitions from `lib/tab-template-registry.ts`, not generic empty-record counts

### Upload History
- Positioned between the upload section and the completeness panel
- Columns: filename, upload date, ingestion status (pending / processed / failed)
- **Read-only** — no re-extract from history; to update, upload a new version of the document
- Draws from the existing `artifacts` table filtered to this project

### Claude's Discretion
- Exact extraction prompt wording for the three new entity types
- Completeness analysis system prompt structure (how to serialize live DB data per tab and ask for gaps)
- Routing logic for low-confidence or ambiguous extractions
- Upload section drop zone styling and empty state copy
- Exact card/row styling for history list and completeness panel

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/IngestionModal.tsx`: Full upload → extract → review → approve flow. Accepts `projectId`, `initialFiles`. Trigger it from the Context tab upload section — no rebuild needed.
- `components/ExtractionPreview.tsx`: Already groups extraction results by entity type (maps to workspace tabs). Handles approve/reject per item and conflict resolution UI.
- `app/api/ingestion/extract/route.ts`: Extraction via raw Anthropic SDK with chunking (80k char limit). Add the three new entity types (`workstream`, `onboarding_step`, `integration`) to `EntityType` union and `EXTRACTION_SYSTEM` prompt.
- `app/api/ingestion/approve/route.ts`: Transactional approval with merge/replace/skip conflict resolution. Extend to handle the three new entity types.
- `lib/tab-template-registry.ts`: Section definitions for all 11 tab types with `requiredFields` and `placeholderText`. This is the input for completeness analysis — the Claude prompt for gap analysis should reference these section definitions.
- `components/WorkspaceTabs.tsx` → `TAB_GROUPS`: Add `{ id: 'context', label: 'Context', standalone: true }` before the Admin entry.
- `lib/auth-server.ts` → `requireSession()`: Required on any new API routes for completeness analysis.
- `lib/skill-context.ts` → `buildSkillContext()`: Already serializes all project data. Adapt a slimmer version for per-tab completeness analysis (serialize each tab's data separately so Claude can assess completeness per tab).

### Established Patterns
- Standalone tab pattern: `standalone: true` in TAB_GROUPS, URL `?tab=X` (Phase 27 + 29)
- Raw Anthropic SDK (`@anthropic-ai/sdk`) for Claude calls — same pattern as existing extract route
- `requireSession()` at the top of every route handler
- `export const dynamic = 'force-dynamic'` on all route handlers
- Conflict detection in approve route uses `normalize()` dedup key — extend for new entity types

### Integration Points
- `components/WorkspaceTabs.tsx` → add Context to TAB_GROUPS (before Admin)
- New page: `app/customer/[id]/context/page.tsx` — Context tab page (server component)
- New component: `components/ContextTab.tsx` — client component with upload trigger, history list, completeness panel
- New API route: `app/api/projects/[projectId]/completeness/route.ts` — POST handler; accepts projectId, queries all tab data, calls Claude for gap analysis, returns per-tab results
- `app/api/ingestion/extract/route.ts` — extend EntityType union + extraction prompt for 3 new types
- `app/api/ingestion/approve/route.ts` — extend approval handlers for 3 new entity types
- `db/schema.ts` — no new tables needed; new entity types map to existing tables

</code_context>

<specifics>
## Specific Ideas

- Weekly upload use case is the primary driver: meeting notes → Claude routes action items, risks, milestone updates, onboarding step completions, integration status changes all in one pass
- The "smart merge" conflict flow is essential for weekly updates — without it, re-uploading overwrites or duplicates everything
- The completeness panel should feel like a health dashboard: at a glance you know which areas of the project are well-documented and which need attention
- Gap descriptions should reference real names from the DB (e.g., "Kaiser", specific action IDs) — the same specificity philosophy as the Chat tab's record-ID citations (Phase 29)

</specifics>

<deferred>
## Deferred Ideas

- Auto-run completeness analysis after every approval batch — deferred; on-demand trigger is sufficient for v3.0
- Re-extract from history (retry button on failed documents) — deferred; upload new version covers the need
- Scheduled / background completeness analysis (BullMQ job) — deferred to v3.1; on-demand is sufficient
- Cross-project completeness comparison ("which projects are most complete?") — new capability, future phase

</deferred>

---

*Phase: 30-context-hub*
*Context gathered: 2026-03-31*
