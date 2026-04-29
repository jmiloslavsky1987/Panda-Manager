# Phase 82: Chat Write Operations — Research

**Researched:** 2026-04-29
**Domain:** Vercel AI SDK tool use, human-in-the-loop approval UX, multi-entity CRUD via chat
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Confirmation UX:**
- Inline card renders inside the chat stream — not a modal or side panel
- Card shows all proposed field values in **editable inputs** pre-filled with Claude's proposed values — user can tweak before confirming
- After confirm/cancel, Claude replies with a short status line only: "✓ Action created: [description]" or "Cancelled — no changes made."
- Cards are **color-coded by operation type**: create = green border/icon, update = blue border/icon, delete = red border/icon
- **Delete cards have extra friction**: user must type a short confirmation phrase (record name or "delete") before the Confirm button activates

**Operation Scope:**
- Full CRUD via chat: create, update, and delete all supported for all entities
- **Batch operations supported**: a single chat turn can propose multiple mutations (e.g., "mark all Sarah's open actions as in-progress") — one confirmation card per record, each confirmable/cancellable independently
- Delete confirmation UX: red card + type-to-confirm phrase (extra friction beyond color alone)

**Entity Scope — Project tracking:**
- Actions, Milestones, Risks, Stakeholders, Tasks

**Entity Scope — Teams tab:**
- Team Pathways, Team Onboarding Status, Business Outcomes, E2E Workflows (and their Steps), Focus Areas

**Entity Scope — Architecture tab:**
- Architecture Integrations, Architecture Nodes (full create + update + delete; visual reorder stays in the drag UI)

**Tool Invocation Model:**
- Intent detection: Claude judges from natural language phrasing when to invoke a write tool. No special prefix/command syntax required. Standard Vercel AI SDK tool-use behavior.
- Ambiguous intent: Claude asks one clarifying question before proposing a mutation. Does not default to write silently.
- Active tab context: The current workspace tab is passed to the chat API as context. When intent is ambiguous, Claude defaults to the entity type for the active tab.

### Claude's Discretion
- Exact Vercel AI SDK tool definition structure and naming convention for each entity's tools
- System prompt additions for write-awareness (where to place in the existing anti-hallucination prompt)
- Field coverage per entity (which fields Claude can set vs. which are system-managed)
- Pending card state behavior (e.g., can user submit new messages while a card is pending?)
- How the active tab is passed to the chat API (request body field, header, or URL param)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 82 adds AI-driven write operations to the existing read-only chat by leveraging the Vercel AI SDK's native `needsApproval` tool property. When Claude judges that a user intends a mutation, it invokes a write tool (e.g., `create_action`, `update_risk`). Because `needsApproval: true` is set on every write tool, the SDK stops before executing and surfaces a `tool-${name}` part with `state: 'approval-requested'` in the message stream. The front-end renders this as a color-coded inline confirmation card with pre-filled, editable fields. After the user confirms (or edits and confirms), `addToolApprovalResponse({ id, approved: true })` is called on the `useChat` hook; the SDK resumes and the server-side `execute` function fires the actual API call. Claude then produces a short one-line status reply.

The architecture is clean: no new API routes needed (all 13 entity CRUD surfaces already exist), no custom state machine to build (the SDK provides `approval-requested` / `approval-responded` / `output-available` states), and the confirmation card component pattern mirrors the Drafts Inbox and ingestion approval flows already in the app.

The primary non-trivial work is: (1) defining ~30 tool schemas across 13 entity types using `tool()` + `zodSchema()`, (2) building a `MutationConfirmCard` component that handles create/update/delete variants with editable inputs and the delete type-to-confirm pattern, (3) extending `ChatPanel` to detect `isToolUIPart` parts and render the card, and (4) wiring `activeTab` into the chat API request body.

**Primary recommendation:** Use `needsApproval: true` on all write tools (native SDK approval flow) rather than a custom state machine. Keep tool `execute` functions as thin fetch wrappers that call the existing CRUD API routes — do not duplicate business logic.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | 6.0.142 (installed) | Tool definitions, `streamText`, approval state machine | Already in use in the chat route; `needsApproval` added in v5+ |
| `@ai-sdk/react` | 3.0.144 (installed) | `useChat` hook with `addToolApprovalResponse` | Chat panel already uses `useChat` |
| `@ai-sdk/anthropic` | 3.0.64 (installed) | Anthropic model adapter | Already in use |
| `zod` | 4.3.6 (installed) | Tool input schema validation | All existing routes use Zod; SDK's `zodSchema()` supports Zod v4 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zodSchema` (from `ai`) | bundled | Converts Zod schemas to AI SDK `FlexibleSchema` | Required for every tool's `inputSchema` when using Zod |
| `isToolUIPart` (from `ai`) | bundled | Type guard for rendering tool parts | Use in ChatMessage/ChatPanel to branch on tool vs text parts |
| `isStaticToolUIPart` (from `ai`) | bundled | Stricter guard for typed tool parts | Use when TypeScript needs the narrowed `ToolUIPart<TOOLS>` type |

### No New Dependencies Required
All required libraries are already installed. No package additions needed.

**Installation:**
```bash
# Nothing to install — all dependencies present
```

---

## Architecture Patterns

### Recommended File Structure
```
app/api/projects/[projectId]/chat/
├── route.ts                    # Add tools parameter to streamText
└── tools/
    ├── index.ts                # Re-export all tool definitions
    ├── actions-tools.ts        # create_action, update_action, delete_action
    ├── milestones-tools.ts     # create_milestone, update_milestone, delete_milestone
    ├── risks-tools.ts          # create_risk, update_risk, delete_risk
    ├── stakeholders-tools.ts   # create_stakeholder, update_stakeholder, delete_stakeholder
    ├── tasks-tools.ts          # create_task, update_task, delete_task
    ├── teams-tools.ts          # team_pathways, onboarding, outcomes, workflows, steps, focus_areas
    └── arch-tools.ts           # arch_integrations, arch_nodes

components/chat/
├── ChatPanel.tsx               # Add tool-part rendering, activeTab prop
├── ChatMessage.tsx             # Add tool-part branch (or keep delegating to ChatPanel)
├── MutationConfirmCard.tsx     # NEW: create/update/delete confirmation card component
└── MutationConfirmCard.test.tsx # (or in tests/chat/)
```

### Pattern 1: Tool Definition with `needsApproval`
**What:** Define each write operation as a tool with `needsApproval: true` and a server-side `execute` that calls the existing API route or DB directly.
**When to use:** Every write operation — create, update, delete — across all 13 entity types.

```typescript
// Source: ai@6.0.142 /node_modules/@ai-sdk/provider-utils/dist/index.d.ts
// app/api/projects/[projectId]/chat/tools/actions-tools.ts
import { tool, zodSchema } from 'ai'
import { z } from 'zod'

export const createActionTool = (projectId: number) => tool({
  description: 'Create a new action item for this project',
  inputSchema: zodSchema(z.object({
    description: z.string().min(1).describe('Action description'),
    owner: z.string().optional().describe('Person responsible'),
    due: z.string().optional().describe('Due date (ISO or TBD)'),
    status: z.enum(['open', 'in_progress']).optional().default('open'),
    notes: z.string().optional(),
  })),
  needsApproval: true,  // SDK pauses here — renders approval card in UI
  execute: async (input) => {
    // Thin wrapper — calls existing API route logic (or DB directly)
    const res = await fetch(`/api/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, ...input }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Create failed')
    return { success: true, message: `Action created` }
  },
})
```

**Important:** Since `execute` runs on the server (inside the Next.js route handler), it can call DB functions directly rather than making HTTP requests to itself. Direct DB calls are preferred to avoid authentication complexity.

### Pattern 2: SDK Approval Flow (Server Side)
**What:** `streamText` with `tools` parameter. When any tool has `needsApproval: true`, the SDK emits a `tool-approval-request` output part before executing.
**When to use:** Route handler — add `tools` to the existing `streamText` call.

```typescript
// Source: ai@6.0.142 — streamText tool parameter
// app/api/projects/[projectId]/chat/route.ts (addition)
import { allWriteTools } from './tools'

const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  system: systemPrompt,
  messages: await convertToModelMessages(body.messages),
  temperature: 0.3,
  tools: allWriteTools(numericId),   // <-- addition
  maxSteps: 3,                       // allow tool execution + follow-up text
})
```

### Pattern 3: Active Tab Context Passing
**What:** Pass the current workspace tab name in the request body so Claude can default entity type resolution on ambiguous requests.
**When to use:** `ChatPanel.tsx` — add `activeTab` prop, include in `DefaultChatTransport` body.

```typescript
// ChatPanel.tsx
interface ChatPanelProps {
  projectId: number
  initialContext: string
  activeTab?: string     // 'actions' | 'risks' | 'milestones' | 'teams' | 'architecture' | etc.
}

const { messages, ... } = useChat({
  transport: new DefaultChatTransport({
    api: `/api/projects/${projectId}/chat`,
    body: { context: initialContext, activeTab },  // pass as request body field
  }),
})
```

In the route handler, extract `activeTab` from the parsed body and inject it into the system prompt context section.

### Pattern 4: Approval Card Rendering in ChatPanel
**What:** Detect `isToolUIPart` parts in message parts and render `MutationConfirmCard` inline.
**When to use:** `ChatPanel.tsx` message list rendering loop.

```typescript
// Source: ai@6.0.142 — isToolUIPart, ToolUIPart types
import { isToolUIPart } from 'ai'

// In the messages render loop:
{messages
  .filter(m => m.role === 'assistant' || m.role === 'user')
  .map(message =>
    message.parts.map((part, i) => {
      if (isToolUIPart(part)) {
        // part.state: 'input-streaming' | 'input-available' | 'approval-requested'
        //             | 'approval-responded' | 'output-available' | 'error'
        if (part.state === 'approval-requested') {
          return (
            <MutationConfirmCard
              key={`${message.id}-${i}`}
              part={part}
              onApprove={(editedInput) => addToolApprovalResponse({
                id: part.approval.id,
                approved: true,
              })}
              onCancel={() => addToolApprovalResponse({
                id: part.approval.id,
                approved: false,
                reason: 'User cancelled',
              })}
            />
          )
        }
        // approval-responded or output-available: render completed/cancelled state
        return <MutationConfirmCardComplete key={`${message.id}-${i}`} part={part} />
      }
      return <ChatMessage key={`${message.id}-${i}`} message={message} partIndex={i} />
    })
  )
}
```

**Note:** `addToolApprovalResponse` comes from `useChat`. The edited input values from the confirmation card must be handled client-side only (pre-fill the form), since `addToolApprovalResponse` does not accept modified inputs — the tool `execute` runs with the original Claude-proposed inputs. If user edits are needed, the approach is: (a) call `addToolApprovalResponse({ approved: false })` on cancel-with-edits, then send a new message with the corrected values, OR (b) implement a hybrid where approval triggers a fresh tool call with the edited values injected. Given the CONTEXT.md decision for editable inputs, the recommended approach is to treat user edits as a new message if the values differ from Claude's proposals, keeping the approval flow clean.

**Revised recommendation on editable inputs:** Since `addToolApprovalResponse` only takes `{ id, approved, reason }` — not modified input — the edited card approach requires a client-side workaround. The cleanest pattern: the Confirm button calls `addToolApprovalResponse({ approved: true })` (original values execute) OR if user changed any field, it cancels the tool call and sends a new chat message with the corrected values described. The planner should decide which simplification to use. The simplest viable path: treat the confirmation card as "review + approve/cancel only" (no field editing on this first pass), and add note in system prompt that Claude should ask for corrections if needed. This is within Claude's discretion per CONTEXT.md.

### Pattern 5: `MutationConfirmCard` Component Design
**What:** Inline card component with operation-type visual differentiation, editable fields, and delete friction.
**When to use:** Rendered inside ChatPanel for every `approval-requested` tool part.

```typescript
// components/chat/MutationConfirmCard.tsx
// Color tokens (verified in components/kata-tokens.css):
// create: --kata-status-green (#27BE69 light / #45D985 dark)
// update: --kata-interactive (#5B5BFF indigo accent)
// delete: --kata-status-red (#D60028 light / #E65671 dark)

interface MutationConfirmCardProps {
  part: ToolUIPart  // state === 'approval-requested'
  onApprove: () => void
  onCancel: () => void
}
```

Delete card extra friction: render a `<input type="text" placeholder='Type "delete" to confirm' />` and keep the Confirm button disabled until the value equals `"delete"` (case-insensitive) or matches the record name.

### Anti-Patterns to Avoid
- **Executing writes in `tools` without `needsApproval: true`:** The SDK would auto-execute and mutate data without user confirmation. Every write tool MUST have `needsApproval: true`.
- **Building a custom approval state machine:** The SDK provides `approval-requested` / `approval-responded` / `output-available` states natively — do not replicate this in React state.
- **Re-creating fetch() calls back to the same Next.js server from within `execute`:** Since `execute` runs server-side in the route handler, call DB functions (or internal lib functions) directly. Avoid HTTP round-trips to `localhost` inside the same process.
- **Passing `projectId` via tool input schema:** `projectId` is already known in the route handler context. Inject it via closure when building the tools object, not as a Claude-controllable input field (security: prevents Claude from mutating other projects).
- **Defining all 30+ tools inline in route.ts:** Split into per-entity files in `tools/` subfolder for maintainability. Route.ts just imports and spreads.
- **Blocking new user messages while a card is pending:** The `useChat` status during approval is `'awaiting-message'` (not `'streaming'`), so the input field is already enabled. Do not add artificial blocking.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Approval state machine | Custom React state for pending/approved/cancelled | SDK `needsApproval: true` + `part.state` | SDK handles all state transitions, persistence in message history, and SDK re-submission automatically |
| Tool input validation | Custom validation in confirm handler | Zod schema in `inputSchema` + `zodSchema()` | SDK validates Claude's output against schema before surfacing approval |
| Tool-to-part type guard | `if (part.type.startsWith('tool-'))` | `isToolUIPart(part)` from `ai` | Type-safe, handles both static and dynamic tools |
| JSON schema from Zod | Manual `z.object().toJSON()` | `zodSchema(z.object(...))` from `ai` | `zodSchema` supports Zod v4 natively (confirmed in types: `z4.core.$ZodType`) |

**Key insight:** The Vercel AI SDK v6 approval flow is designed precisely for human-in-the-loop confirmation before tool execution. Using it natively saves ~200 LOC of state management code.

---

## Common Pitfalls

### Pitfall 1: `execute` Runs Server-Side — No `fetch('/api/...')` Self-Calls
**What goes wrong:** Calling `fetch('/api/actions', ...)` from inside `execute` in the route handler makes an HTTP round-trip to the same Next.js process and loses the authenticated session cookie (server-to-server requests don't carry browser cookies).
**Why it happens:** Developers assume `execute` runs client-side like a React event handler.
**How to avoid:** In `execute`, import and call the DB layer (Drizzle) or shared lib functions directly. The route handler already has `session` and `projectId` in scope — pass them into the tool factory via closure.
**Warning signs:** `401 Unauthorized` errors in server logs when a tool executes; or "cookies not found" errors.

### Pitfall 2: `addToolApprovalResponse` Does Not Accept Modified Inputs
**What goes wrong:** Building an editable form and passing edited values to `addToolApprovalResponse` — the function signature is `{ id, approved, reason? }` only. Edited values are silently ignored.
**Why it happens:** The approval pattern is "approve the proposed action" not "modify and approve."
**How to avoid:** Choose one of: (a) treat the card as review-only (no editing), or (b) on "edit + confirm" path, deny the pending approval and inject a new `sendMessage` with the corrected details, letting Claude propose a fresh tool call. The planner must resolve this before implementation.
**Warning signs:** User edits fields in the card, clicks Confirm, and the DB record has the original (unedited) values.

### Pitfall 3: Arch-Nodes Missing POST Route
**What goes wrong:** Attempting to create an arch node via chat — no `POST /api/projects/[projectId]/arch-nodes` route exists (confirmed by filesystem scan: only `[nodeId]/route.ts` for PATCH and `reorder/route.ts` exist).
**Why it happens:** The arch-nodes base route was never created (existing PATCH-only node updates are the only operation).
**How to avoid:** Wave 0 must create `app/api/projects/[projectId]/arch-nodes/route.ts` with a `POST` handler before any create-arch-node tool can execute.
**Warning signs:** `404 Not Found` on `POST /api/projects/[projectId]/arch-nodes`.

### Pitfall 4: `projectId` Injection via Closure vs. Tool Input
**What goes wrong:** Including `project_id` as a field in the Zod schema for tool input — Claude might supply a wrong or injected project ID, or the planner forgets to strip it before calling the DB.
**Why it happens:** Copying the `postSchema` from an existing API route (which accepts `project_id` from the request body) directly into the tool `inputSchema`.
**How to avoid:** Never include `project_id` in any tool's `inputSchema`. Pass it via closure when building tool objects: `const tools = allWriteTools(numericId)`.
**Warning signs:** Audit log entries with wrong `project_id`; or TypeScript errors because `project_id` is in schema but not in DB insert (which gets it from the closure).

### Pitfall 5: Batch Tool Calls and Card Rendering Order
**What goes wrong:** Claude proposes 5 tool calls in one turn (batch operation). The SDK may interleave tool parts and text parts in `message.parts`. If the renderer only handles the first tool part, subsequent cards are invisible.
**Why it happens:** Assuming one tool call per message.
**How to avoid:** Iterate `message.parts` (not just `message`) and render each part independently. Each tool part has a distinct `toolCallId` (accessible via `part.approval.id` when in `approval-requested` state).
**Warning signs:** User reports only one card appears for a batch mutation request.

### Pitfall 6: `maxSteps` Too Low Truncates Follow-Up Text
**What goes wrong:** After tool execution, Claude cannot generate the status reply ("✓ Action created: [description]") because `maxSteps` is 1 (default in `streamText` when using tools).
**Why it happens:** `streamText` defaults differ from `generateText` — without `maxSteps`, tool call + result counts as one step, leaving no budget for Claude's text response.
**How to avoid:** Set `maxSteps: 3` or higher in the `streamText` call to allow: step 1 = tool call generation, step 2 = tool execution + result, step 3 = Claude's text response.
**Warning signs:** Stream ends after tool execution with no follow-up message from Claude.

---

## Code Examples

Verified patterns from official SDK types and installed source:

### Tool Definition with `needsApproval` — Confirmed API
```typescript
// Source: @ai-sdk/provider-utils 3.0.64 dist/index.d.ts, line 1055-1090
// Confirmed fields: description, inputSchema, needsApproval, execute
import { tool, zodSchema } from 'ai'
import { z } from 'zod'

export const updateRiskTool = (projectId: number, sessionUserId: string) => tool({
  description: 'Update an existing risk record by ID',
  inputSchema: zodSchema(z.object({
    id: z.number().int().describe('Database ID of the risk to update'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['open', 'mitigated', 'resolved', 'accepted']).optional(),
    mitigation: z.string().optional().describe('Mitigation plan'),
    owner: z.string().optional(),
  })),
  needsApproval: true,
  execute: async ({ id, ...patch }) => {
    // Direct DB call — no HTTP round-trip
    const { db } = await import('@/db')
    const { risks } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    const [existing] = await db.select({ project_id: risks.project_id })
      .from(risks).where(eq(risks.id, id))
    if (!existing || existing.project_id !== projectId) {
      throw new Error('Risk not found in this project')
    }
    await db.update(risks).set(patch).where(eq(risks.id, id))
    return { success: true }
  },
})
```

### Detecting and Rendering Tool Parts
```typescript
// Source: ai@6.0.142 dist/index.d.ts, lines 1984-1992
// isToolUIPart type guard — confirmed exported
import { isToolUIPart } from 'ai'

// In message parts loop:
if (isToolUIPart(part)) {
  // part.type: 'tool-create_action' | 'tool-update_risk' | etc.
  // part.state: 'input-streaming' | 'input-available' | 'approval-requested'
  //             | 'approval-responded' | 'output-available' | 'error'
  // part.input: the tool input (typed if using ToolSet generic)
  // part.approval.id: the approvalId to pass to addToolApprovalResponse
}
```

### Calling `addToolApprovalResponse`
```typescript
// Source: ai@6.0.142 dist/index.d.ts, line 3640-3654
// ChatAddToolApproveResponseFunction signature
const { addToolApprovalResponse } = useChat({ ... })

// Approve:
addToolApprovalResponse({ id: part.approval.id, approved: true })

// Deny:
addToolApprovalResponse({ id: part.approval.id, approved: false, reason: 'User cancelled' })
```

### Kata Color Tokens for Card Borders
```css
/* Source: components/kata-tokens.css (verified) */
/* create = green */
border-color: var(--kata-status-green);  /* #27BE69 light, #45D985 dark */

/* update = indigo/interactive */
border-color: var(--kata-interactive);  /* #5B5BFF */

/* delete = red */
border-color: var(--kata-status-red);   /* #D60028 light, #E65671 dark */
```

---

## Entity Field Coverage (Claude's Discretion — Recommended)

For each entity, the planner should include only user-meaningful fields in tool input schemas. System-managed fields (IDs, timestamps, `source`, `external_id`, `source_artifact_id`) are excluded.

| Entity | Claude-settable fields | System-managed (exclude) |
|--------|----------------------|--------------------------|
| Action | description, owner, due, status, notes | id, project_id, external_id, source, created_at |
| Milestone | name, status, target, date, notes, owner | id, project_id, external_id, source, created_at |
| Risk | description, severity, owner, mitigation, likelihood, impact, target_date, status, notes | id, project_id, external_id, source, created_at |
| Stakeholder | name, role, company, email, slack_id, notes | id, project_id, source, created_at |
| Task | title, description, owner, due, priority, type, phase, status, start_date | id, project_id, workstream_id, blocked_by, source, created_at |
| Team Pathway | team_name, route_steps, status, notes | id, project_id, created_at |
| Team Onboarding Status | (check schema fields) | id, project_id, created_at |
| Business Outcome | (check schema fields) | id, project_id, created_at |
| E2E Workflow | team_name, workflow_name | id, project_id, created_at |
| Workflow Step | label, track, status, position | id, workflow_id, created_at |
| Focus Area | title, tracks, why_it_matters, current_status, next_step, bp_owner, customer_owner | id, project_id, source, created_at |
| Arch Integration | tool_name, track, phase, integration_group, status, integration_method, notes | id, project_id, source, created_at |
| Arch Node | name, track_id, status, notes | id, project_id, display_order, source_trace, created_at |

Note: For arch nodes `track_id` requires Claude to know or look up the track ID — consider accepting `track_name` and resolving server-side, or exposing available tracks in the system prompt context.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `experimental_requireHumanApproval` | `needsApproval` on Tool type | AI SDK v5+ | No longer experimental — stable API |
| `addToolResult` | `addToolOutput` (addToolResult deprecated) | AI SDK v6 | Use `addToolOutput` for tool execution results; `addToolApprovalResponse` for approvals |
| Manual tool-result UI in `onToolCall` callback | `part.state === 'approval-requested'` in message parts | AI SDK v5+ | Tool state is part of the message stream — no separate callback needed |

**Deprecated/outdated:**
- `addToolResult`: Deprecated in AI SDK v6 — use `addToolOutput` instead (though `addToolResult` still works as an alias)
- `experimental_requireHumanApproval`: Replaced by `needsApproval` property on the `Tool` type

---

## Architecture Gaps Found During Research

### Gap 1: No `POST /api/projects/[projectId]/arch-nodes` route
**Finding:** Filesystem scan confirms only `[nodeId]/route.ts` (PATCH) and `reorder/route.ts` exist. There is no base route for creating new arch nodes.
**Impact:** The `create_arch_node` tool cannot execute until this route (or equivalent direct DB logic) is added.
**Resolution:** Wave 0 or Wave 1 must add arch-node creation support.

### Gap 2: Arch-Node PATCH is status-only
**Finding:** `app/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts` only accepts `{ status: 'planned' | 'in_progress' | 'live' }`. It cannot update `name` or `notes`.
**Impact:** The `update_arch_node` tool would need the PATCH schema extended, or the `execute` function should call DB directly.
**Resolution:** Extend the PATCH schema in Wave 0/Wave 1 to accept `name` and `notes` optionally, or use direct DB call in tool execute.

---

## Open Questions

1. **Editable card inputs vs. `addToolApprovalResponse` limitation**
   - What we know: `addToolApprovalResponse` only accepts `{ id, approved, reason }` — no modified input values
   - What's unclear: Does the CONTEXT.md "editable inputs" requirement mean: (a) user tweaks values before confirming and those tweaks execute, or (b) the form pre-fills for review purposes only?
   - Recommendation: If (a), implement as: user edits → deny approval → send corrected values as new chat message. If (b), render editable fields as read-only (or make read-only with a note). Planner should default to (b) for Wave 1 simplicity and note (a) as a follow-on enhancement.

2. **Active tab propagation mechanism**
   - What we know: CONTEXT.md marks this as Claude's discretion. Options: request body field (cleanest), URL query param, or React context from parent page.
   - Recommendation: Pass as a `activeTab` field in the `DefaultChatTransport` body. The chat route already parses a body object (`{ messages, context }`). Adding `activeTab` is additive and requires no route signature change.

3. **Blocking new messages during pending approval cards**
   - What we know: CONTEXT.md marks this as Claude's discretion. The `useChat` status during an approval pause is implementation-defined.
   - Recommendation: Allow new messages while approval cards are pending (do not block the input). If user sends a new message before approving/cancelling, the pending tool calls remain in the message history and cards stay visible. This is consistent with how the SDK handles multi-turn conversations with pending tool calls.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (inferred from installed deps) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run tests/chat/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| Tool definitions export valid `needsApproval: true` tools with correct Zod schemas | unit | `npx vitest run tests/chat/chat-tools.test.ts -x` | ❌ Wave 0 |
| Chat route accepts `tools` parameter and streams with tool-approval parts | unit | `npx vitest run tests/chat/chat-route.test.ts -x` | ✅ exists (extend) |
| `MutationConfirmCard` renders with correct color border per operation type (create/update/delete) | unit/jsdom | `npx vitest run tests/chat/mutation-confirm-card.test.tsx -x` | ❌ Wave 0 |
| Delete card Confirm button disabled until phrase typed | unit/jsdom | `npx vitest run tests/chat/mutation-confirm-card.test.tsx -x` | ❌ Wave 0 |
| `ChatPanel` renders `MutationConfirmCard` when message part has `state: 'approval-requested'` | unit/jsdom | `npx vitest run tests/chat/chat-panel.test.tsx -x` | ✅ exists (extend) |
| Calling `onApprove` invokes `addToolApprovalResponse` with correct `id` and `approved: true` | unit/jsdom | `npx vitest run tests/chat/chat-panel.test.tsx -x` | ✅ exists (extend) |
| Tool `execute` for `create_action` inserts to DB with correct `projectId` | integration/unit | `npx vitest run tests/chat/chat-tools.test.ts -x` | ❌ Wave 0 |
| Arch-nodes POST route creates a new node | unit | `npx vitest run tests/teams-arch/ -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/chat/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/chat/chat-tools.test.ts` — covers tool definition correctness and execute behavior
- [ ] `tests/chat/mutation-confirm-card.test.tsx` — covers MutationConfirmCard rendering and UX
- [ ] `app/api/projects/[projectId]/arch-nodes/route.ts` — POST handler (gap discovered in research)
- [ ] Arch-node PATCH schema extension for `name` and `notes` fields

---

## Sources

### Primary (HIGH confidence)
- `node_modules/ai@6.0.142` — `needsApproval` property on `Tool` type, `addToolApprovalResponse` on `UseChatHelpers`, `isToolUIPart` guard, tool state machine states (`approval-requested`, `approval-responded`, `output-available`)
- `node_modules/@ai-sdk/provider-utils@3.0.64` — `tool()` function signature, `zodSchema()` supporting Zod v4 (`z4.core.$ZodType`)
- `node_modules/@ai-sdk/react@3.0.144` — `useChat` returns `addToolApprovalResponse`
- `components/kata-tokens.css` — `--kata-status-green`, `--kata-status-red`, `--kata-interactive` color tokens
- `app/api/projects/[projectId]/chat/route.ts` — existing `streamText` call, auth pattern, no existing tools
- `components/chat/ChatPanel.tsx` — `useChat` with `DefaultChatTransport`, current message rendering
- `components/chat/ChatMessage.tsx` — current message part rendering (text only)
- `app/api/actions/route.ts`, `app/api/actions/[id]/route.ts` — action CRUD schema (field names confirmed)
- `db/schema.ts` — confirmed all entity schemas and field names
- Filesystem scan of `app/api/projects/[projectId]/` — confirmed arch-nodes has no POST route

### Secondary (MEDIUM confidence)
- `node_modules/ai/dist/index.js` lines 3032–3042 — confirmed `needsApproval` evaluation logic (boolean or function)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries installed and types verified in node_modules
- Architecture: HIGH — SDK approval flow confirmed from compiled source; patterns derived from existing codebase
- Pitfalls: HIGH — execute-runs-server-side confirmed from route handler structure; `addToolApprovalResponse` signature confirmed from types; arch-node POST gap confirmed from filesystem scan
- Field coverage: MEDIUM — schema fields verified in `db/schema.ts`; which fields are "user-meaningful" vs. system-managed involves judgment

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (AI SDK versions are pinned; field schemas are stable)
