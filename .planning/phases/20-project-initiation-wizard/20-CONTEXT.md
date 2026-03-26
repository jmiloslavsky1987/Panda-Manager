# Phase 20: Project Initiation Wizard - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

New projects are created through a guided multi-step wizard accessible from the Dashboard. The wizard replaces direct DB seeding as the primary new-project flow. It ingests collateral documents via the existing ingestion pipeline (Phase 18), presents a combined AI extraction preview, allows manual data entry, and computes a completeness score shown on the project Overview tab.

**In scope:** Wizard UI (full-screen Dialog), project record creation, collateral upload checklist + ingestion pipeline integration, combined AI extraction preview, manual entry step, Launch step with completeness summary, Project Completeness Score on Overview tab, below-60% warning banner.
**Out of scope:** Time tracking configuration in the wizard (remains in project settings post-launch), scheduling, automation.

</domain>

<decisions>
## Implementation Decisions

### Wizard structure & navigation
- Full-screen Dialog modal (consistent with IngestionModal pattern from Phase 18 — no dedicated route)
- Step order: **1-Basic Info → 2-Upload Collateral → 3-AI Preview → 4-Manual Entry → 5-Launch**
- Step 1 (Basic Info) is the only required step; all others are skippable
- Step progress shown via stepper/breadcrumb within the Dialog header
- If user closes the wizard after step 1: project remains as Draft in Dashboard, wizard closes cleanly
- No wizard state persistence across sessions — closing after step 1 is fine, user can enrich via normal workspace tabs

### Project record creation timing
- Project record + all empty tab data structures are created immediately after step 1 completes
- This is necessary so the ingestion pipeline has a project_id to attach extracted data to
- Project status = "Draft" until user clicks "Launch Project" in step 5

### Collateral upload step (step 2)
- Checklist of recommended document types: SOW, Kickoff Deck, Discovery Notes, Presales Notes, Customer Org Chart, Prior Tracker, Gong Transcripts, Architecture Diagram Notes, Budget Sheet
- Each checklist item has a checkbox that auto-checks when a matching file is uploaded
- Full drag-and-drop upload zone on the step (not just checklist items — any file accepted)
- User can upload non-listed files (free-form upload also available)

### Ingestion integration (steps 2 & 3)
- Wizard embeds/reuses the existing IngestionModal + IngestionStepper + ExtractionPreview components from Phase 18
- Steps 2 (upload) and 3 (AI preview) are the Phase 18 ingestion flow rendered within the wizard container
- The AI extraction preview (step 3) shows items from **all uploaded files combined**, grouped by entity type (not one file at a time)
- Combined preview tabs: Actions, Risks, Milestones, Stakeholders, Decisions, Architecture, Teams, History, Business Outcomes — only tabs with extracted items are shown

### Manual entry step (step 4)
- Tab-per-entity-type layout, matching the workspace tab mental model
- Tabs: Actions, Risks, Milestones, Stakeholders, Decisions, Architecture, Teams, History, Business Outcomes (same entity set as ingestion preview)
- Approved AI extraction items are shown as read-only rows with a source label
- "Add Row" button per tab adds new manually-entered items below the read-only rows
- Only tabs with content (extracted or manually added) show a count badge; empty tabs shown without badge

### Time tracking configuration
- **No time tracking config step in the wizard**
- WIZ-06 is out of scope — time tracking config (weekly capacity, working days, submission due date, approver) stays in the project's Settings/Time tab after launch

### Completeness score calculation
- Score = (tabs with at least one populated record) / (total workspace tabs) × 100%
- Tabs counted: Actions, Risks, Milestones, Stakeholders, Decisions, Architecture, Teams, Engagement History, Business Outcomes (9 tabs)
- Score is recalculated server-side on each Overview tab load — no real-time push needed

### Completeness score display — Overview tab
- Progress bar + percentage, inline at the top of the Overview tab
- Format: `Project Completeness: ████████░░ 78%` (consistent with existing progress display pattern)
- Always visible regardless of score

### Below-60% warning banner
- Non-dismissible inline yellow warning bar shown below the completeness bar when score < 60%
- Lists specific empty tabs: "Missing data in: Risks, Milestones, Architecture"
- Each empty tab name links directly to that workspace tab
- Banner disappears automatically once score reaches 60% or above

### Claude's Discretion
- Exact stepper/breadcrumb visual design within the Dialog header
- Collateral checklist item matching logic (how file name maps to checklist category)
- Add Row form field set per entity type in the manual entry step
- Loading/progress indicators during extraction phase
- Empty state visuals within manual entry tabs

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bigpanda-app/components/IngestionModal.tsx`: Core ingestion flow container — embed within wizard step 2/3 rather than rebuild
- `bigpanda-app/components/IngestionStepper.tsx`: File-list stepper sidebar — reuse or adapt for wizard's file review
- `bigpanda-app/components/ExtractionPreview.tsx`: Tab-based extraction review UI — direct reuse for step 3
- `bigpanda-app/components/ui/dialog.tsx`: Full-screen modal shell for the wizard container
- `bigpanda-app/components/ui/tabs.tsx`: Tab component for manual entry step entity-type tabs
- `bigpanda-app/components/ui/checkbox.tsx`: Checklist items in collateral upload step
- `bigpanda-app/components/ArtifactsDropZone.tsx`: Existing drag-and-drop pattern — reference for step 2 drop zone

### Established Patterns
- **File upload**: `request.formData()` → `fileField instanceof Blob` → `arrayBuffer()` — proven in plan-import API route
- **SSE streaming**: `ReadableStream` + `export const dynamic = 'force-dynamic'` — use for extraction progress in step 3
- **Source attribution**: All entity writes use `source: 'ingestion'` + `source_artifact_id` fields — wizard writes follow same pattern
- **Optimistic UI**: "Saving…" indicator on writes — consistent with rest of app

### Integration Points
- `bigpanda-app/app/page.tsx`: Dashboard — add "New Project" button to trigger wizard Dialog
- `bigpanda-app/app/api/projects/route.ts` (or equivalent): POST to create project record after step 1
- Existing entity API routes (actions, risks, milestones, etc.): wizard's manual entry writes go through these same routes
- `bigpanda-app/app/customer/[id]/page.tsx` (Overview tab): Add completeness score bar + warning banner
- Phase 18 ingestion API (`/api/ingestion/extract`): Reused as-is for step 3 extraction

</code_context>

<specifics>
## Specific Ideas

- The wizard's step-by-step flow mirrors the Phase 18 IngestionModal's stepper pattern — keeps the mental model consistent for a user who has already used ingestion
- Draft project status on Dashboard gives a clear recovery path if the wizard is abandoned mid-flow
- The combined extraction preview (all files merged by entity type) is the key UX improvement over running ingestion per-file — the wizard context justifies this enhancement to the Phase 18 flow

</specifics>

<deferred>
## Deferred Ideas

- WIZ-06 (time tracking config in wizard) — intentionally removed; configure via project Settings after launch
- Wizard state persistence across sessions (resume a mid-flow wizard) — too complex for now
- Required vs optional collateral enforcement — all checklist items remain optional
- Real-time completeness score updates on entity writes — server-on-load recalculation is sufficient

</deferred>

---

*Phase: 20-project-initiation-wizard*
*Context gathered: 2026-03-26*
