# Phase 82: Chat Write Operations — Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable the AI chat to perform write operations (create, update, delete) on project entities via Vercel AI SDK tool use. Covers actions, milestones, risks, stakeholders, tasks, and all Teams/Architecture tab entities. Every mutation requires an inline confirmation UX in the chat before any DB write occurs. Read-only behavior of the chat is unchanged — only write path is added.

</domain>

<decisions>
## Implementation Decisions

### Confirmation UX
- Inline card renders inside the chat stream — not a modal or side panel
- Card shows all proposed field values in **editable inputs** pre-filled with Claude's proposed values — user can tweak before confirming
- After confirm/cancel, Claude replies with a short status line only: "✓ Action created: [description]" or "Cancelled — no changes made."
- Cards are **color-coded by operation type**: create = green border/icon, update = blue border/icon, delete = red border/icon
- **Delete cards have extra friction**: user must type a short confirmation phrase (record name or "delete") before the Confirm button activates

### Operation Scope
- Full CRUD via chat: create, update, and delete all supported for all entities
- **Batch operations supported**: a single chat turn can propose multiple mutations (e.g., "mark all Sarah's open actions as in-progress") — one confirmation card per record, each confirmable/cancellable independently
- Delete confirmation UX: red card + type-to-confirm phrase (extra friction beyond color alone)

### Entity Scope
All of the following entities are writable via chat:

**Project tracking:**
- Actions
- Milestones
- Risks
- Stakeholders
- Tasks

**Teams tab:**
- Team Pathways
- Team Onboarding Status
- Business Outcomes
- E2E Workflows (and their Steps)
- Focus Areas

**Architecture tab:**
- Architecture Integrations
- Architecture Nodes (full create + update + delete; visual reorder stays in the drag UI)

### Tool Invocation Model
- **Intent detection**: Claude judges from natural language phrasing when to invoke a write tool. No special prefix/command syntax required. Standard Vercel AI SDK tool-use behavior.
- **Ambiguous intent**: Claude asks one clarifying question ("It sounds like you want to create an action — is that right?") before proposing a mutation. Does not default to write silently.
- **Active tab context**: The current workspace tab is passed to the chat API as context. When intent is ambiguous, Claude defaults to the entity type for the active tab (e.g., "Add a new item" while on Risks tab → proposes creating a risk).

### Claude's Discretion
- Exact Vercel AI SDK tool definition structure and naming convention for each entity's tools
- System prompt additions for write-awareness (where to place in the existing anti-hallucination prompt)
- Field coverage per entity (which fields Claude can set vs. which are system-managed)
- Pending card state behavior (e.g., can user submit new messages while a card is pending?)
- How the active tab is passed to the chat API (request body field, header, or URL param)

</decisions>

<specifics>
## Specific Ideas

- The inline confirmation card pattern mirrors the Drafts Inbox approval flow — consistent with how ingestion approvals already work in the app
- Color coding (green/blue/red) is the primary signal for operation severity — consistent with the RAG/health status color system already in use (kata-tokens: --kata-status-green, --kata-status-amber, --kata-status-red)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/api/projects/[projectId]/chat/route.ts`: Current streaming chat route using Vercel AI SDK `streamText`. No tools defined yet — tool definitions added here. Auth via `requireProjectRole`.
- `components/chat/ChatPanel.tsx`: Uses `useChat` hook with `DefaultChatTransport`. Needs tool-call rendering added for confirmation cards. Currently no tool-result UI.
- `components/chat/ChatMessage.tsx`: Individual message renderer — may need extension for tool-call card type.
- Full CRUD API routes exist for all entities in scope — no new API routes needed, only the tool definitions that call them.

### CRUD API surface (all project-scoped, all auth-gated):
- Actions: `/api/actions/route.ts` (POST), `/api/actions/[id]/route.ts` (PATCH, DELETE)
- Milestones: `/api/milestones/route.ts` (POST), `/api/milestones/[id]/route.ts` (PATCH, DELETE) — also has bulk-update
- Risks: `/api/risks/route.ts` (POST), `/api/risks/[id]/route.ts` (PATCH, DELETE) — also has bulk-update
- Stakeholders: `/api/stakeholders/route.ts` (POST), `/api/stakeholders/[id]/route.ts` (PATCH, DELETE)
- Tasks: `/api/tasks/route.ts` (POST), `/api/tasks/[id]/route.ts` (PATCH, DELETE)
- Team Pathways: `/api/projects/[projectId]/team-pathways/route.ts` (POST), `[id]/route.ts` (PATCH, DELETE)
- Team Onboarding Status: `/api/projects/[projectId]/team-onboarding-status/route.ts` (POST), `[id]/route.ts` (PATCH, DELETE)
- Business Outcomes: `/api/projects/[projectId]/business-outcomes/route.ts` (POST), `[id]/route.ts` (PATCH, DELETE)
- E2E Workflows: `/api/projects/[projectId]/e2e-workflows/route.ts` (POST), `[workflowId]/route.ts` (PATCH, DELETE), steps sub-resource
- Focus Areas: `/api/projects/[projectId]/focus-areas/route.ts` (POST), `[id]/route.ts` (PATCH, DELETE)
- Architecture Integrations: `/api/projects/[projectId]/architecture-integrations/route.ts` (POST), `[id]/route.ts` (PATCH, DELETE)
- Architecture Nodes: `/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts` (PATCH, DELETE); check if POST exists on base route

### Established Patterns
- `expandedId` toggle pattern (Outputs Library, DailyPrepCard): Candidate pattern for confirmation card expand/collapse
- `requireProjectRole` auth guard on all project-scoped write routes — must be preserved
- Vercel AI SDK `streamText` already in use — `tools` parameter is the addition point
- `useChat` with `DefaultChatTransport` — tool result rendering hooks are supported by the SDK

### Integration Points
- `app/api/projects/[projectId]/chat/route.ts`: Add `tools` parameter to `streamText` call
- `components/chat/ChatPanel.tsx`: Add tool-call card rendering in the message list
- `app/customer/[id]/*/page.tsx` tabs: Pass active tab name when initialising or calling the chat (needs mechanism — ChatPanel props or context)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 82-chat-write-operations-tool-use-mutations-for-actions-milestones-risks-teams-and-architecture-nodes-with-confirmation-ux*
*Context gathered: 2026-04-29*
