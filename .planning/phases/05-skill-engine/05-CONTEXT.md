# Phase 5: Skill Engine - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

SkillOrchestrator operational and cleanly separated from Route Handlers, streaming skills to the browser via SSE with a token budget guard in place, a Drafts Inbox gating all outbound AI content, and the five highest-value skills (Weekly Customer Status, Meeting Summary, Morning Briefing, Context Updater, Handoff Doc) fully wired and producing correct output. Output Library and SKILL.md hot-reload are live. Requirements: SKILL-01–04, SKILL-11–14, DASH-09, OUT-01–04.

</domain>

<decisions>
## Implementation Decisions

### Skill Launcher Location & Layout
- 11th tab in the workspace tab bar, labeled "Skills"
- Simple list: skill name + one-line description + "Run" button per row
- Show all 15 skills in the list; gray out unimplemented ones (Phase 5 wires exactly 5: Weekly Customer Status, Meeting Summary, Morning Briefing, Context Updater, Handoff Doc Generator)
- Advanced option at the bottom: "Run custom skill" — allows ad-hoc invocation of any SKILL.md file by path, for power-user experimentation outside the curated list
- Grayed skills display a "Coming in a future update" tooltip on hover — no click

### Skills Tab — Recent Runs Section
- Below the skill list, a "Recent Runs" section shows the last 5–10 runs for the current workspace
- Each entry: skill name, timestamp, status badge (running / completed / failed), link to full run page
- Clicking a run entry navigates to `/customer/[id]/skills/[run-id]`

### Streaming Output Display
- Full-page skill run view at `/customer/[id]/skills/[run-id]`
- Output streams via SSE — text appears in real-time as Claude generates
- If user navigates away mid-stream: run continues in BullMQ background; SSE connection closes gracefully
- Returning to the run URL fetches completed output from DB — no duplicate run triggered
- Completion state: full output text + "Open File" button if a file was generated (shells `open filepath`) + inline HTML render for HTML outputs inside a sandboxed `<iframe>`
- Every completed run is automatically registered in the Output Library

### Drafts Inbox UX (DASH-09)
- Lives on the Dashboard as a dedicated section — not a modal, not a separate page
- DB-only storage: all AI-generated drafts land in DB and surface here; zero external action happens before user review
- Per-draft actions (inline, no modal required): Copy to clipboard, Create Gmail Draft, Send to Slack, Dismiss
- Inline text editor: user can edit draft content before copying/sending — a lightweight textarea that expands on click
- Dismissed drafts are soft-deleted (hidden from inbox, retained in DB for Output Library)
- If Drafts Inbox is empty: single line "No pending drafts" — no elaborate empty state

### Output Library
- Top-level sidebar link — first-class page at `/outputs`, same nav level as Dashboard and Settings
- Filterable by: account (project), skill type, date range
- HTML outputs render inline inside a sandboxed `<iframe>` — same page, no new tab
- .docx / .pptx outputs: "Open" button that calls `GET /api/outputs/[id]/open` which shells `open filepath` server-side (macOS system app opens the file)
- Archived outputs (soft-deleted or superseded) visible under an "Archived" filter toggle
- Output Library is populated automatically by every completed skill run — no manual step

### SKILL.md Source & Hot-Reload
- SKILL.md files live in `bigpanda-app/skills/` — app-local directory, version-controlled
- Read from disk at invocation time (not cached in memory between runs)
- Missing SKILL.md → skill disabled in UI with human-readable error badge: "SKILL.md not found"
- Changing a SKILL.md file takes effect on the next skill run — no server restart needed

### Token Budget Guard
- Runs before every Claude API call
- Logs estimated input token count to console (and optionally to `job_runs` metadata column)
- Truncates context if over budget threshold (configurable in Settings, default TBD by researcher)
- Truncation strategy: drop oldest history entries first, preserve system prompt + current task

### SSE Streaming Architecture
- Route Handler at `POST /api/skills/[skillName]/run` — kicks off BullMQ job, returns `{ runId }`
- SSE endpoint at `GET /api/skills/runs/[runId]/stream` — streams chunks written by worker to DB
- Worker writes output chunks to a `skill_run_chunks` table (or similar) as it receives them from Anthropic stream
- Client subscribes to SSE, reads chunks, appends to display buffer
- When run completes, SSE endpoint sends a `done` event and closes

### Claude's Discretion
- Exact DB schema for skill run chunks (column names, indexing)
- Token budget threshold default value
- Exact shadcn/ui components used for the streaming output display area
- Loading skeleton design for the Skills tab and Output Library
- Error recovery behavior when a skill run fails mid-stream

</decisions>

<specifics>
## Specific Ideas

- Skills tab should feel like a simple "app launcher" row list — not a card grid, not a table
- "Run custom skill" is an advanced/power-user feature — visually de-emphasized (small link, not a button)
- The Drafts Inbox inline editor should expand on click like a Slack message editor — lightweight, not a full modal
- Output Library is where everything lives long-term; the Skills tab Recent Runs is just a shortcut to the last few

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `worker/index.ts` — BullMQ worker + dispatch map: skill runs will add new handlers here following the exact same pattern as existing job handlers (advisory lock, job_runs write)
- `worker/connection.ts` — `createApiRedisConnection()` + `createRedisConnection()`: skill run trigger API uses `createApiRedisConnection()` (fail-fast); worker uses `createRedisConnection()`
- `app/api/jobs/trigger/route.ts` — Pattern for `Queue.add()` from an API route; skill run kickoff follows the same pattern
- `components/WorkspaceTabs.tsx` — Already has 10 tabs with active-state logic; 11th "Skills" tab follows established pattern (`pathname.includes('/skills')` for active detection)
- `components/Sidebar.tsx` — Already has Settings gear link; `/outputs` link follows same pattern
- `lib/queries.ts` — `getWorkspaceData()` + transaction pattern for RLS; skill context assembly will use existing workspace queries
- `db/index.ts` — Singleton postgres.js pool; all new DB tables follow same schema import pattern

### Established Patterns
- **BullMQ job handlers**: `pg_try_advisory_xact_lock` + `job_runs` INSERT/UPDATE + dispatch map (static, not dynamic import)
- **API routes**: `createApiRedisConnection()` with `maxRetriesPerRequest: 1, connectTimeout: 3000` — mandatory for all queue-facing routes
- **RLS + transactions**: All multi-query workspace reads go through `db.transaction(tx => { SET LOCAL ... })` to pin to one connection
- **Optimistic UI pattern**: PATCH with revert-on-error used throughout workspace tabs — skill run status polling follows same client state pattern
- **shadcn/ui**: Dialog, Badge, Card, Tabs, Table, Separator all installed; use existing components first
- **TanStack Query v5**: Used throughout for client-side caching and mutations; skill run polling via `useQuery` with `refetchInterval`

### Integration Points
- WorkspaceTabs → add 11th "Skills" tab entry pointing to `/customer/[id]/skills`
- Sidebar → add "Outputs" link above or below Settings
- worker/index.ts → add skill run handlers to dispatch map
- db/schema.ts → add `skill_runs` table (runId, projectId, skillName, status, output, chunks, timestamps) + any chunk streaming table
- New Next.js routes needed: `/customer/[id]/skills` (list), `/customer/[id]/skills/[runId]` (run page), `/outputs` (library), `/api/skills/[name]/run` (trigger), `/api/skills/runs/[runId]/stream` (SSE)

</code_context>

<deferred>
## Deferred Ideas

- **Custom SKILL.md editor in-app** — editing SKILL.md files through the UI (mentioned in passing); belongs in Phase 7 or 8 polish
- **Skill run scheduling** — triggering skills on a cron from the Skills tab; Phase 6+ (jobs infrastructure is complete, but skill scheduling UI is a separate feature)
- **Multi-turn skill conversations** — interactive back-and-forth with Claude after initial run; out of scope for Phase 5 SSE unidirectional streaming model
- **Slack/Gmail live send from Drafts Inbox** — requires MCP connections; Phase 6 wires those. Phase 5 creates the Gmail Draft action UI and the Send to Slack UI but they will be no-ops (or stubbed) until Phase 6 provides live connections

</deferred>

---

*Phase: 05-skill-engine*
*Context gathered: 2026-03-20*
