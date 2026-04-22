# Project Research Summary

**Project:** BigPanda AI Project Management App — v9.0 UX Maturity & Intelligence
**Domain:** AI-native professional services delivery tool (Next.js 16, PostgreSQL, BullMQ, Vercel AI SDK)
**Researched:** 2026-04-22
**Confidence:** HIGH

## Executive Summary

v9.0 is an additive milestone on a mature, 75,894-LOC production codebase. The stack is fixed and sufficient — the single new dependency is `docx-preview@^0.3.7` for inline DOCX rendering. Every other feature is achievable by extending existing components, adding DB migrations, and following patterns already established in the codebase. The recommended approach is to front-load all five DB migrations as a single schema wave, then implement features in dependency order rather than by perceived priority. Most "table stakes" features (Kanban DnD cross-column, milestone status enum, task dependency picker) require no new API endpoints — they fix existing half-wired UIs.

The architecture is well-defined and must not be subverted. Key patterns to maintain: `requireProjectRole()` on every `/api/projects/[projectId]/` route handler, Server Component data fetching passed as props (not client-side `useEffect` fetches), and the `skill_runs`/BullMQ pipeline for all AI invocations. The Meeting Prep skill must be implemented as a new `SKILL.md` file — not an inline modal AI call — to get streaming, history, and Output Library storage for free. The exceptions panel must be a pure computation over already-fetched workspace data, mirroring `PortfolioExceptionsPanel.tsx`, not an independent data-fetching component.

The most dangerous pitfalls are security-class: a confirmed `tasks-bulk` route missing `project_id` scoping (multi-tenant data leak), potential `react-markdown` XSS in the Outputs Library preview (gap already present in `ChatMessage.tsx`), and prompt injection risk in the Meeting Prep skill's user-controlled meeting title input. All three have clear mitigations and must be addressed in the same phase that introduces the vulnerable surface. Chat persistence has a subtle but critical failure mode: `setMessages()` in `useEffect` must never be used for history restoration — `initialMessages` at hook construction is the only correct approach.

---

## Key Findings

### Recommended Stack

The existing stack handles v9.0 with one addition. `docx-preview@^0.3.7` enables browser-native DOCX rendering via DOM APIs (requires `dynamic import` + `ssr: false`, same pattern as `@xyflow/react`). PPTX preview is not feasible without legacy jQuery/D3 dependencies — use "slide count + download" instead. `date-fns` must NOT be added for ISO week grouping; a 10-line native `Date` algorithm is sufficient. The `@dnd-kit` suite is already installed and structurally correct for multi-column Kanban — the fix is three missing code additions (`onDragOver`, `useDroppable` on columns, `DragOverlay` rendering), not a library change.

**Core technologies (new or confirmed for v9.0):**
- `docx-preview@^0.3.7`: DOCX inline preview in Outputs Library — only new dependency; browser-compatible, ES module, actively maintained (Sept 2025)
- `@dnd-kit/core@^6.3.1` (existing): Kanban cross-column DnD — multi-container pattern confirmed via official MultipleContainers.tsx story
- `react-markdown@^10.1.0` (existing): Outputs Library markdown rendering — must add `rehype-sanitize` for defense-in-depth
- `ai@^6.0.142` Vercel AI SDK (existing): chat persistence via `initialMessages` prop — no API changes needed
- `drizzle-orm@^0.45.1` (existing): all 5 new migrations follow established schema patterns

### Expected Features

**Must have (table stakes) — fix broken basics first:**
- Task Board DnD cross-column — every Kanban tool since Trello; currently half-wired, code-only fix
- Milestone status enum select — DB enum exists; `MilestoneEditModal` uses freeform `<input>` (regression); fixes portfolio overdue counter bug
- Admin project rename/description/go-live — all columns exist; just missing the form
- Task dependency picker — FKs exist; currently raw integer input; searchable combobox required
- Owner field as stakeholder picker — existing `OwnerCell` needs combobox upgrade + FK migration
- Chat conversation persistence + pin — history lost on page navigate; `chat_messages` table + `initialMessages` wiring
- Task Board week view — client-side ISO week grouping over existing `tasks.due` field

**Should have (differentiators):**
- Proactive exceptions panel (project-level) — port of existing `PortfolioExceptionsPanel` pattern to per-project Health Dashboard
- Risk structured fields (likelihood, impact, score, target_date) — PRINCE2/PMI standard 2-axis model; differentiates from generic PM tools
- Gantt baseline tracking — ghost bars showing plan vs actuals; rare in lightweight PM tools; PS reporting value
- AI Meeting Prep skill — on-demand structured brief for client calls; purpose-built for PS delivery workflow
- Outputs Library inline preview — markdown rendering + DOCX preview; closes the "read output without leaving app" gap

**Defer to v9.1+:**
- Active tracks configuration — design decision on storage model needed; medium complexity; not a broken feature
- Stakeholder contact extraction from ingested docs — high complexity; extraction pipeline changes + dedup logic; enhances owner picker but does not block it
- Multi-user real-time chat sync — WebSocket infrastructure not in stack; persistence solves the core pain
- Gantt critical path — task dependency model insufficient for CPM until dependency picker ships and data quality improves
- AI auto-close of risks/actions — violates audit-trail trust model; surface stale exceptions instead

### Architecture Approach

The architecture is established and must be followed, not reinvented. Server Components fetch data and pass it as props; Client Islands handle optimistic updates and fire PATCH requests; `router.refresh()` re-syncs Server Component data after mutations. BullMQ handles all long-running AI operations. `requireProjectRole()` is enforced at 126+ route handlers. Every new feature in v9.0 extends this architecture: Meeting Prep via a new SKILL.md file (zero code changes to the orchestrator), exceptions panel via a pure computation component over workspace data, chat persistence via `initialMessages` prop seeded from a Server Component fetch.

**Major components modified or created in v9.0:**
1. `components/TaskBoard.tsx` — add `onDragOver`, `useDroppable` on columns, `DragOverlay` rendering; add `dragSeq` counter for rapid-drag race condition
2. `components/GanttChart.tsx` — add `baseline?: BaselineRow[]` prop; render ghost bars; add `phaseStart`/`phaseEnd` to `GanttWbsRow` interface
3. `components/chat/ChatPanel.tsx` — accept `initialMessages` prop; persist user/assistant turns on send/finish
4. `components/ProjectExceptionsPanel.tsx` (new) — pure computation over workspace data; mirrors `PortfolioExceptionsPanel` pattern
5. `components/ProjectSettingsForm.tsx` (new) — rename, go-live, description, active tracks toggles
6. `lib/risk-score.ts` (new) — pure `computeRiskScore(likelihood, impact)` function; never a stored DB column
7. New route handlers: `gantt-baseline` (GET/POST), `chat-messages` (GET/POST), `chat-messages/[id]` (PATCH)
8. Five migrations: `gantt_baselines` table, `chat_messages` table + index, owner FK columns on 4 tables, risk fields, `active_tracks` JSONB on projects

### Critical Pitfalls

1. **@dnd-kit ID namespace collision between WbsTree and TaskBoard** — Use prefixed IDs (`wbs-{id}`, `task-{id}`, `col-{id}`) from the start; never use raw integers as DnD identifiers; add guard in WBS reorder handler against non-integer `over.id`

2. **`tasks-bulk` multi-tenant security gap (existing, confirmed)** — The route at `app/api/tasks-bulk/route.ts` is missing `project_id` scoping; allows cross-project task updates; fix in the same phase as the Owner Picker migration since the same handler is being extended

3. **`useChat` persistence race condition** — `setMessages()` in `useEffect` breaks mid-stream; always pass restored messages via `initialMessages` at hook construction; persist only `role: 'user'` and `role: 'assistant'` turns; never inject pinned messages into the `useChat` messages array

4. **`react-markdown` XSS gap** — `ChatMessage.tsx` already renders without `rehype-sanitize`; the Outputs Library preview adds another unprotected surface; add `rehype-sanitize` to all `react-markdown` instances in the same PR as the Outputs Library phase

5. **Meeting Prep prompt injection via meeting title** — user-controlled strings interpolated into system prompts can break XML trust delimiters; escape all user-controlled strings (`<`, `>`, `&`) before prompt interpolation; applies to all skill routes, not just Meeting Prep

6. **Stakeholder contact extraction overwrites manually entered data** — upsert must use field-protection semantics: only fill NULL fields from extraction; never overwrite a non-null `email` or `slack_id` with an extracted value

7. **Active tracks filter must stay at render layer only** — filtering DB queries by active track breaks skill context, extraction, and Gantt baseline; WBS, Gantt, and Overview filter their displayed data; skill context builders always receive the full dataset

---

## Implications for Roadmap

Based on research, the build order is driven by three forcing functions: (1) DB schema must exist before UI that references it, (2) milestone status enum fix unblocks the exceptions panel and the portfolio overdue counter bug, and (3) security fixes (`tasks-bulk` gap, XSS) must ship in the same phase as the features that touch those surfaces.

### Phase 1: Schema Foundation
**Rationale:** All 5 migrations must exist before any UI references new columns; batching them together prevents migration file numbering conflicts and lets all subsequent phases start immediately.
**Delivers:** All new tables and columns committed to DB and `db/schema.ts`: `gantt_baselines` table, `chat_messages` table + index, owner FK columns on tasks/actions/risks/milestones, risk fields on risks table, `active_tracks` JSONB on projects
**Addresses:** Foundation for 8 of 13 v9.0 features
**Avoids:** Schema-blocking mid-phase; migration numbering conflicts (current highest is `0037_entity_lifecycle.sql` — verify before writing)

### Phase 2: Quick Wins — Fix Broken Basics
**Rationale:** These features fix existing regressions or complete half-wired functionality with no new API endpoints and no migrations; ship these first to demonstrate progress and unblock downstream features.
**Delivers:** Milestone status enum select (fixes portfolio counter bug), Task Board DnD cross-column (adds `onDragOver` + `useDroppable`), Task Board week view (client-side ISO week grouping), admin project rename/description/go-live form
**Addresses:** 4 table-stakes features, all P1
**Avoids:** DnD ID namespace collision (prefix IDs from the start); rapid-drag race condition (add `dragSeq` counter in this phase)

### Phase 3: Data Model Enhancements — Pickers and Risk Fields
**Rationale:** Owner picker and task dependency picker require FK columns from Phase 1; risk fields require the `risks` columns from Phase 1; these are medium-complexity features with well-understood patterns.
**Delivers:** Owner field as stakeholder combobox (dual-write `owner` + `owner_stakeholder_id`), task dependency picker (searchable combobox over existing FKs), risk structured fields with computed score (`lib/risk-score.ts`)
**Addresses:** 3 P1/P2 features
**Avoids:** Dual-write omission (both `owner` text and `owner_stakeholder_id` FK in every PATCH handler); `tasks-bulk` multi-tenant gap must be fixed in this same phase; risk score must never be stored as a DB column (compute via generated column or pure function)

### Phase 4: Intelligence Features — Exceptions Panel and Chat Persistence
**Rationale:** Exceptions panel requires milestone status to be reliable (fixed in Phase 2); chat persistence requires `chat_messages` table (Phase 1); both use the established "Server Component seeds data, Client Island computes" pattern.
**Delivers:** Per-project exceptions panel (pure computation over workspace data, mirrors `PortfolioExceptionsPanel`), chat conversation persistence + pin (Server Component seeds `initialMessages`; pin rendered in separate UI section)
**Addresses:** Chat persistence + pin (P2), exceptions panel (P1)
**Avoids:** Client-side exception data fetching (use Server Component props pattern); `setMessages()` in `useEffect` (use `initialMessages` at construction); pinned messages injected into `useChat` array (render in separate section); exceptions staleness from `project.updated_at` (use `MAX(updated_at)` across child tables)

### Phase 5: Gantt Enhancements — Phase Dates and Baseline
**Rationale:** Gantt baseline and phase date aggregation both touch `GanttChart.tsx` and `mapDataToWbsRows()`; doing them together avoids two passes through the same components.
**Delivers:** Phase date range aggregation in Gantt rows (`phaseStart`/`phaseEnd` in `mapDataToWbsRows()`), Gantt baseline tracking with ghost bar rendering, `GanttBaselineCapture.tsx` toolbar button
**Addresses:** Gantt baseline (P2)
**Avoids:** Baseline JSONB on `projects` table (use dedicated `gantt_baselines` table from Phase 1 migration); ghost bars rendered without a baseline (only render when `baselineRows` prop is non-null and non-empty)

### Phase 6: AI and Content Features — Meeting Prep and Outputs Preview
**Rationale:** These are the highest-complexity features; Meeting Prep is a new SKILL.md file (zero code changes to the orchestrator); Outputs Library preview introduces the only new dependency (`docx-preview`) and requires XSS hardening.
**Delivers:** Meeting Prep skill (new `SKILL.md`, existing infrastructure), Outputs Library inline preview (markdown with `rehype-sanitize`, DOCX via `docx-preview`, PPTX as "slide count + download only")
**Addresses:** AI Meeting Prep (P2), Outputs Library preview (P2)
**Avoids:** Inline AI modal for Meeting Prep (must use skill infrastructure); `react-markdown` XSS — add `rehype-sanitize` to ALL instances including `ChatMessage.tsx` in this same PR; prompt injection via meeting title (escape user-controlled strings before interpolation); PPTX browser rendering (no viable dependency)

### Phase 7: Project Settings — Active Tracks Configuration
**Rationale:** Most design-ambiguous feature; touches the widest set of downstream consumers (WBS, Gantt, Overview); deferring it ensures other features are stable before adding track-filtering logic.
**Delivers:** Full `ProjectSettingsForm.tsx` (rename + go-live + description + active tracks toggles), `active_tracks` JSONB filtering in WBS and Gantt page loaders
**Addresses:** Admin active tracks config (P3)
**Avoids:** Track filter at DB query layer (filter at render layer only — skill context always receives full WBS); stale `expandedIds` in WbsTree after track toggle (reset in `useEffect` on config change); skill-triggered WBS duplication after re-enabling a track

### Phase Ordering Rationale

- Schema first (Phase 1) because 8 of 13 features reference new tables or columns; batching prevents conflicts
- Quick wins second (Phase 2) because milestone status fix is a prerequisite for the exceptions panel and unblocks a known portfolio counter bug
- Pickers and risk fields (Phase 3) before exceptions panel because owner picker FK and risk score data improve exception rule accuracy when both ship before Phase 4
- Chat and exceptions (Phase 4) together because both use the same "Server Component seeds data, Client Island computes" pattern and can share a test pass
- Gantt work (Phase 5) isolated because it is the most complex rendering change and benefits from all schema work being stable
- AI features (Phase 6) last among core features because they depend on content infrastructure being stable and introduce the most security surface
- Active tracks (Phase 7) last because it has the broadest fan-out across existing components and its storage design decision should be made explicitly

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Owner picker / dual-write):** The full list of tables with `owner` text columns needs a pre-implementation audit against `db/schema.ts` — research identifies 6+ tables (tasks, actions, risks, milestones, artifacts, wbs_items); confirm before writing PATCH handlers
- **Phase 6 (Meeting Prep SKILL.md):** The Phase 63 Skills Design Standard YAML schema must be reviewed before authoring the new file; verify `buildSkillContext()` output is sufficient context for a meeting brief without additional queries
- **Phase 7 (Active tracks):** Design decision required — JSONB `{ ADR: boolean, Biggy: boolean }` on `projects` vs. a `project_tracks` table; research recommends JSONB for v9.0 but the decision should be explicit and documented in the plan

Phases with standard patterns (skip research):
- **Phase 1 (Schema migrations):** All migrations follow the established Drizzle pattern in `db/schema.ts` + `db/migrations/`; no novel patterns
- **Phase 2 (Quick wins):** Code-only fixes; @dnd-kit multi-container pattern confirmed in official GitHub story; milestone status enum fix is trivial
- **Phase 4 (Chat + exceptions):** `initialMessages` pattern is documented in Vercel AI SDK v6; `PortfolioExceptionsPanel` is a direct template
- **Phase 5 (Gantt baseline):** Storage model is decided (`gantt_baselines` table); ghost bar rendering follows existing bar geometry functions in `GanttChart.tsx`

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct `package.json` inspection + npm registry confirmation; only one new dependency (`docx-preview`) with confirmed browser compatibility |
| Features | HIGH | Grounded in live codebase inspection of all relevant components; PM tool conventions from established industry tools |
| Architecture | HIGH | All conclusions from direct file-by-file codebase analysis of Panda-Manager repo; build order derived from confirmed dependency graph |
| Pitfalls | HIGH | Critical pitfalls confirmed via direct code inspection: `tasks-bulk` gap at line 310, `ChatMessage.tsx` without `rehype-sanitize`, dead exception block at line 81 in `PortfolioExceptionsPanel.tsx` |

**Overall confidence:** HIGH

### Gaps to Address

- **Active tracks storage model:** JSONB on `projects` vs. `project_tracks` table. Research recommends JSONB for v9.0 but this is a design decision that must be made explicit in Phase 7 planning before implementation starts.
- **Migration number verification:** Architecture research identifies current highest migration as `0037_entity_lifecycle.sql`. This must be verified against the live `db/migrations/` directory before writing any migration files — the planned numbers (0038–0042) may need adjustment.
- **Exceptions panel data completeness:** The `getWorkspaceData()` function's return shape must be verified against the data needs of all 6+ exception rule types before writing `computeProjectExceptions()`; if any required fields are absent, a supplemental query will be needed.
- **`docx-preview` SSR constraint:** The `dynamic import` + `ssr: false` pattern is established for `@xyflow/react` and CodeMirror; validate that the Outputs Library page does not have conflicting SSR constraints before implementing in Phase 6.

---

## Sources

### Primary (HIGH confidence)
- Live codebase — `/Users/jmiloslavsky/Documents/Panda-Manager/` — direct file inspection: `db/schema.ts`, `components/TaskBoard.tsx`, `components/WbsTree.tsx`, `components/GanttChart.tsx`, `components/chat/ChatPanel.tsx`, `components/chat/ChatMessage.tsx`, `components/PortfolioExceptionsPanel.tsx`, `app/outputs/page.tsx`, `app/api/tasks-bulk/route.ts`, `app/customer/[id]/settings/page.tsx`, `lib/skill-path.ts`, `lib/skill-orchestrator.ts`
- `@dnd-kit` GitHub (`clauderic/dnd-kit`) — MultipleContainers.tsx official story confirming `onDragOver` + `useDroppable` multi-container pattern
- `docx-preview` npm registry — v0.3.7 confirmed latest; browser-compatible; active maintenance (Sept 2025 release); Apache-2.0 license
- `react-markdown` npm registry — v10.1.0 confirmed latest stable; safe-by-default behavior confirmed

### Secondary (MEDIUM confidence)
- Vercel AI SDK v6 docs — `initialMessages` as documented approach for pre-loading conversation history; `setMessages` for programmatic mid-session updates
- PM tool conventions (Jira, Asana, Linear, Notion) — UI behavior expectations for DnD, week view, owner pickers, milestone status labels; training data
- PRINCE2 / PMI risk matrix — Likelihood x Impact 1-5 scale as industry standard for risk scoring; training data

### Tertiary (LOW confidence)
- `pptx2html` npm registry — confirmed legacy jQuery/D3 dependencies; rejected; PPTX browser preview deferred to download-only approach

---

*Research completed: 2026-04-22*
*Ready for roadmap: yes*
