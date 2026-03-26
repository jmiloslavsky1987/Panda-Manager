# Phase 18: Document Ingestion - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can upload any supported document (PDF, DOCX, PPTX, XLSX, MD, TXT) into a project via the Artifacts tab. Claude extracts structured data across all entity types. After reviewing a grouped preview, the user's approved items land in the correct DB tables with full source attribution — no data is written without explicit human confirmation.

**In scope:** File upload + disk storage + Artifact record creation, Claude extraction, preview UI with approve/edit/reject per item, bulk approve, conflict detection (merge/replace/skip), DB writes with source attribution, ingestion logging, incremental dedup.
**Out of scope:** Scheduled/automated ingestion, extraction from URLs, pushing ingested data to external systems.

</domain>

<decisions>
## Implementation Decisions

### Upload entry point
- The full Artifacts tab area is a drag-and-drop zone — drag anywhere onto the tab to trigger upload
- A visible dotted border or hint text indicates the tab is droppable
- No separate "Import" button needed — the drop zone IS the entry point
- After drop, a full-screen Dialog modal opens for the entire upload → extraction → preview → approve flow

### Multi-file handling
- Multiple files can be dropped in one session (not limited to one at a time)
- Files are reviewed sequentially — one document's extracted items at a time
- A sidebar/stepper within the modal shows the file list and progress (e.g., "1 of 3 — meeting-notes.pdf ✓")
- All files upload upfront; extraction runs per document as the user steps through them

### Preview layout
- Extracted items are grouped by entity type using tabs at the top of the preview
- Tab labels: Actions, Risks, Decisions, Milestones, Stakeholders, Tasks, Architecture, History, Business Outcomes, Teams — only tabs with extracted items are shown
- Each tab badge shows the item count for that type

### Item row design
- Each extracted item row shows: checkbox (approve/reject), content summary, collapsible source excerpt ("Source: [text Claude pulled from]"), confidence indicator (colored dot or % label)
- Checking the checkbox = approved; unchecked = rejected (default: all checked)
- Bulk approve: single action to approve all visible items on the current tab or across all tabs

### Edit before approve
- Clicking an item row expands it inline to show editable fields — edit-in-place within the preview
- User can modify extracted content before approving; no separate modal needed
- After editing, checkbox state is preserved

### Claude's Discretion
- Confidence indicator exact design (dot color thresholds, % cutoffs)
- Exact field set shown per entity type in expanded edit row
- Progress/loading indicator design during extraction phase
- Empty-tab handling (hide vs show disabled tab)
- Conflict resolution UX detail (inline prompt on the conflicting item row)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bigpanda-app/components/ui/dialog.tsx`: Full-screen modal shell — use for the ingestion flow container
- `bigpanda-app/components/ui/checkbox.tsx`: Per-item approve/reject toggle
- `bigpanda-app/app/api/plan-import/route.ts`: `request.formData()` + `Blob` file handling pattern — exact template for the upload API route
- `bigpanda-app/components/ArtifactEditModal.tsx`: Existing modal pattern with Dialog/DialogContent/DialogHeader/DialogFooter
- `bigpanda-app/app/api/skills/runs/[runId]/stream/route.ts`: SSE ReadableStream pattern for streaming extraction progress to client

### Established Patterns
- **File upload**: `request.formData()` → `fileField instanceof Blob` → `arrayBuffer()` — already proven in plan-import
- **SSE streaming**: `ReadableStream` with `export const dynamic = 'force-dynamic'` for long-running Claude calls
- **Artifact records**: `bigpanda-app/app/api/artifacts/route.ts` — POST creates artifact; Phase 17 extended with `ingestion_status` + `ingestion_log_json` columns
- **Drag-and-drop**: No existing pattern — will need `onDragOver` / `onDrop` handlers on the artifacts tab container
- **Source column**: All project-scoped tables have a `text('source').notNull()` — ingested writes use `'ingestion'` as source value

### Integration Points
- `bigpanda-app/app/customer/[id]/artifacts/page.tsx`: Add drop zone wrapper + trigger for the ingestion modal
- `bigpanda-app/db/schema.ts`: `ingestion_status` enum + `ingestion_log_json` on artifacts table (added in Phase 17)
- All entity API routes (actions, risks, decisions, milestones, etc.): Ingestion writes go through these existing routes with additional `source`, `source_artifact_id`, `ingested_at` fields

</code_context>

<specifics>
## Specific Ideas

- Preview tabs mirror the existing workspace tab names — user already knows the mental model (Actions tab, Risks tab, etc.)
- Sequential file review with stepper sidebar is similar to a wizard pattern — keeps focus on one document at a time
- "Saving…" indicator on the final write step consistent with the rest of the app's optimistic UI convention

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 18-document-ingestion*
*Context gathered: 2026-03-25*
