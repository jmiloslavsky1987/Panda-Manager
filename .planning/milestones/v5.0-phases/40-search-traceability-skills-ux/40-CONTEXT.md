# Phase 40: Search, Traceability & Skills UX - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can find any project entity by keyword from anywhere in the workspace, trace every artifact to its extracted data, see audit-driven history automatically alongside existing notes, and monitor or cancel running skill jobs. Scope covers: SRCH-01 (global search bar), SRCH-02 (Decisions tab filtering), ARTF-01 (artifact reverse lookup), HIST-01 (Engagement History auto-log from audit), SKLS-01 (job progress indicator), SKLS-02 (job cancel).

</domain>

<decisions>
## Implementation Decisions

### Global search bar (SRCH-01)
- Placement: in the workspace header (ProjectHeader area) — always visible, no extra interaction needed
- Results surface as a floating dropdown panel below the search bar — no page navigation
- Trigger: type-to-search, debounced ~300ms, minimum 2 characters (matches API validation)
- Results grouped by entity type in the dropdown: Actions, Risks, Milestones, Tasks, Decisions, Stakeholders — each section labelled with count (e.g. "Actions (3)")
- Each result shows ID + short excerpt + is a clickable link
- Click result → navigate to that entity's tab (dropdown closes)
- Uses existing `/api/search` FTS endpoint — no new API needed

### Decisions tab filtering (SRCH-02)
- Text search input + date-range filter added above the decisions list
- Consistent with existing URL filter param pattern (`?q=`, `?from=`, `?to=`) — shareable, browser back works
- Decisions page converts to Server Component + Client Component island (consistent with ActionsTableClient pattern)
- Client-side filtering on already-fetched data (no additional API calls)

### Engagement History + audit log (HIST-01)
- Unified chronological feed: existing append-only notes AND audit log entries coexist in one sorted-by-date timeline
- All entity types that write to `audit_log` are surfaced (risks, actions, milestones, tasks, stakeholders, artifacts, decisions)
- Each audit entry shows field-level diff: e.g. "Risk R-BP-003: status open → mitigated (changed by alex@bigpanda.io)" — uses `before_json`/`after_json` columns
- Notes retain their existing display style; audit entries get a distinct visual treatment (e.g. "Activity" badge vs note source badges)
- Requires a new query function to fetch audit log entries for a project (joining `entity_id` to project-scoped records)

### Artifact reverse lookup (ARTF-01)
- `ArtifactEditModal` gets two tabs: **Details** (existing edit form, unchanged) and **Extracted Entities** (new)
- Extracted Entities tab shows entities grouped by type: Risks (N), Actions (N), Milestones (N), Decisions (N) — each as labelled sections
- Each entity item shows: ID + short description + clickable link
- Click entity link → navigate to that entity's tab (`/customer/[id]/risks`, `/customer/[id]/actions`, etc.); modal closes
- Reverse lookup query: for each entity type, `WHERE source_artifact_id = $artifactId` — all FKs already exist

### Skills job progress indicator (SKLS-01)
- Progress lives on the skill card while a job is pending or running
- Shows: elapsed time counter (e.g. "2m 14s") + spinner replacing the current static badge
- Elapsed time: client-side `setInterval` ticking every second (no API call for the counter)
- Status polling: separate `setInterval` every 5 seconds calling `/api/skills/runs/[runId]` to check if job completed or failed — auto-stops polling and clears timer when terminal state reached

### Skills job cancel (SKLS-02)
- Cancel button appears on the skill card for jobs in `pending` or `running` state
- Immediate cancel — no confirmation dialog (consistent with inline edit UX: no extra confirm step)
- Cancel calls a new endpoint (e.g. `DELETE /api/skills/runs/[runId]` or `POST /api/skills/runs/[runId]/cancel`)
- After cancel: card returns to idle state, Recent Runs table entry marks as cancelled

### Claude's Discretion
- Exact elapsed time formatting (MM:SS vs "Xm Ys" vs "X seconds")
- Search dropdown max height and scroll behaviour (cap at ~400px, internal scroll)
- Whether the search bar shows a keyboard shortcut hint (e.g. "⌘K" label) or just placeholder text
- Decisions tab filter UI layout (same one-row toolbar as Actions, or a simpler two-input row above the list)
- Audit entry visual styling — badge colour / icon to distinguish activity from notes
- Which `audit_log` `action` values map to which display verb ("updated", "created", "deleted")
- BullMQ cancel implementation details (job removal vs status override for running jobs)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `/api/search/route.ts` — FTS API fully built; accepts `q`, `type`, `account`, `from`, `to`; returns `SearchResult[]` — zero new API work for global search
- `components/ProjectHeader.tsx` — workspace header component; search bar slots in here alongside project name
- `components/ArtifactEditModal.tsx` — existing dialog with Details form; add a second tab for Extracted Entities
- `components/ui/dialog.tsx` + `components/ui/tabs.tsx` — Radix Dialog and Tabs already installed; use for the two-tab modal
- `SkillsTabClient.tsx` — `running: Set<string>` tracks active skills by name; needs run_id tracking to enable polling and cancel
- `/api/skills/[skillName]/run/route.ts` — returns `{ runId }` on job enqueue; this runId must be stored client-side to enable polling
- `/api/skills/runs/[runId]/route.ts` — GET endpoint for run status already exists
- `audit_log` table — `entity_type`, `entity_id`, `action`, `actor_id`, `before_json`, `after_json`, `created_at` all present

### Established Patterns
- URL filter params (`?status=`, `?severity=`) — Phase 37/39 pattern; `?q=`, `?from=`, `?to=` follows same convention for Decisions tab
- Server Component page + Client Component island — used in Actions, Risks, Milestones; apply to Decisions page
- Debounced search with `useEffect` — not yet in codebase but standard React pattern; no library needed
- `router.refresh()` after mutations — established across all phases
- `requireSession()` at every route handler — mandatory

### Integration Points
- `components/ProjectHeader.tsx` — add `<GlobalSearchBar projectId={projectId} />` Client Component
- `app/customer/[id]/decisions/page.tsx` — convert to Server Component + Client island (`DecisionsTableClient`) with search + date filter
- `app/customer/[id]/history/page.tsx` — merge audit log entries with `engagementHistory`; new `getAuditLogForProject(projectId)` query needed in `lib/queries.ts`
- `components/ArtifactEditModal.tsx` — add Tabs wrapper, move existing form to "Details" tab, add "Extracted Entities" tab with per-type sections
- `components/SkillsTabClient.tsx` — store `runId` alongside skill name when job starts; add elapsed timer + status poller; add Cancel button calling new cancel endpoint
- New API endpoint: `POST /api/skills/runs/[runId]/cancel` (or `DELETE`) — calls BullMQ to remove/abort the job, updates `skill_runs` status to 'cancelled'

</code_context>

<specifics>
## Specific Ideas

- No specific visual references given — standard patterns are fine for all four areas
- History tab unified feed should feel natural: audit entries read like a changelog, notes read like comments — two distinct visual treatments in one chronological stream
- Search dropdown closes on Escape or click-outside (standard popover behaviour)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 40-search-traceability-skills-ux*
*Context gathered: 2026-04-07*
