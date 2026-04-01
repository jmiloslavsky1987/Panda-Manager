# Phase 29: Project Chat - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Add an inline AI chat panel to every project workspace — accessible as a new standalone "Chat" tab in the nav bar. The chat answers questions using a live DB snapshot scoped to the current project, streams responses to the browser, supports multi-turn follow-ups within the browser session, and never generates project-specific facts (percentages, dates, names, IDs) that are not directly present in the DB query snapshot.

No DB persistence of conversations. No cross-project data access. No vector search.

</domain>

<decisions>
## Implementation Decisions

### Chat Panel Placement
- New standalone tab in the workspace nav bar — same `TAB_GROUPS` array as Overview and Skills
- Position: after Skills, before Admin → Order: Overview · Delivery · Team · Intel · Skills · **Chat** · Admin
- Label: "Chat"
- Standalone (no sub-tabs) — `standalone: true` in TAB_GROUPS entry; no secondary tab row rendered
- URL pattern: `?tab=chat` (consistent with Phase 27 `?tab=X` for standalone tabs)

### Panel Layout
- Full-page — chat takes the entire `flex-1 p-6 overflow-y-auto` content area, consistent with all other tabs
- Centered column, max-width ~768px, horizontally centered on the page — comfortable reading width with whitespace on wide screens
- Input box pinned to the bottom of the content area — messages scroll above it; input always visible
- Pulsing typing indicator displayed before the first streaming token arrives — user sees feedback immediately on slow connections

### Conversation Persistence
- **Session-only** — conversation lives in React state via `useChat`; resets on page refresh or tab navigation
- No DB table for chat messages in this phase
- "Clear conversation" button in the chat panel header — calls `setMessages([])` to reset without requiring a page refresh
- DB context snapshot is taken **once when the Chat tab mounts** — a single query at tab open time; not re-queried per message
- Full conversation history sent with every message (useChat default) — multi-turn follow-ups work naturally within the session; Anthropic handles token limits

### Response Attribution & Constraints
- Responses **cite specific record IDs inline** in prose — e.g., "There are 7 open actions, including A-KAISER-012 (overdue) and A-KAISER-019 (due Friday)"
- When asked about something not in the project data: explicit statement — "I don't see that information in this project's current data."
- Subtle label in the chat panel header: "Answers are based on this project's live data" — sets expectations without per-message clutter
- **Empty state**: 3–4 clickable suggested starter questions when no messages exist (e.g., "What are the open actions?", "Any overdue milestones?", "Summarize the current risks.", "Who are the key stakeholders?") — reduces blank-slate friction

### Claude's Discretion
- Exact typography, spacing, and bubble styling for message components
- Specific pulsing indicator animation (dots, spinner, etc.)
- Starter question wording and selection
- Error state handling (API failure, network error mid-stream)
- Exact system prompt wording for hallucination constraint (must prohibit invented numbers, dates, names not in DB)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/skill-context.ts` → `buildSkillContext()`: Already serializes all project data (actions, risks, milestones, stakeholders, workstreams, decisions, history) into a structured markdown payload. This is the direct foundation for `lib/chat-context-builder.ts` — adapt rather than rewrite.
- `components/WorkspaceTabs.tsx` → `TAB_GROUPS` array: Add `{ id: 'chat', label: 'Chat', standalone: true }` between Skills and Admin entries. Phase 27 already built the standalone tab pattern.
- `app/customer/[id]/layout.tsx`: Already has `flex-1 p-6 overflow-y-auto` content area — Chat tab page renders into this div just like all other tabs.
- `lib/auth-server.ts` → `requireSession()`: Already used in all route handlers — required on the new `/api/projects/[projectId]/chat` route.
- shadcn/ui: `Button`, `ScrollArea`, `Textarea` — available for chat input and message list.

### Established Patterns
- `@anthropic-ai/sdk` is installed (`^0.80.0`) — existing pattern uses raw Anthropic SDK (see `app/api/ingestion/extract/route.ts`). Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/react`) is NOT yet installed; needs to be added with `--legacy-peer-deps` (same as Phase 26 better-auth install).
- Route handler structure: `export const dynamic = 'force-dynamic'`; `requireSession()` at the top; project-scoped DB queries only.
- Streaming in the app currently uses the manual `ReadableStream` SSE pattern (see `app/api/skills/runs/[runId]/stream/route.ts`). The chat route will use Vercel AI SDK's `toDataStreamResponse()` instead — a cleaner pattern for the `useChat` hook.
- All tab pages are server components that fetch data and pass to client components. Chat tab page will fetch the DB snapshot server-side (or on mount client-side) and pass context to the `<ChatPanel>` client component.

### Integration Points
- `components/WorkspaceTabs.tsx` → add Chat to TAB_GROUPS
- New route: `app/customer/[id]/chat/page.tsx` — Chat tab page
- New API route: `app/api/projects/[projectId]/chat/route.ts` — POST handler using `streamText + toDataStreamResponse()`
- New component: `components/chat/ChatPanel.tsx` — `'use client'`, uses `useChat` hook
- New lib: `lib/chat-context-builder.ts` — DB snapshot builder, adapted from `lib/skill-context.ts`
- `app/customer/[id]/layout.tsx` — no changes needed; Chat tab renders into existing content area

</code_context>

<specifics>
## Specific Ideas

- Inline record ID citations in responses (e.g., A-KAISER-012) are the primary mechanism for satisfying CHAT-02 (no invented facts) — the system prompt must instruct Claude to always cite the specific ID when referencing any record
- The "Answers are based on this project's live data" header label signals grounding without being heavy-handed
- Suggested starter questions on empty state should be clickable chips that populate the input — not just visual hints

</specifics>

<deferred>
## Deferred Ideas

- Conversation history persistence (DB storage, past conversation browsing) — no user need identified for v3.0; session-only is sufficient
- "Refresh data" button to re-query DB mid-conversation — deferred; clear + restart covers the need
- Cross-project chat (ask about patterns across all projects) — new capability, future phase
- Sliding window / token budget management for very long conversations — defer; Anthropic handles gracefully at limits

</deferred>

---

*Phase: 29-project-chat*
*Context gathered: 2026-03-31*
