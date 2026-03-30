# Architecture Research

**Domain:** Multi-user AI project management platform — v3.0 integration architecture
**Researched:** 2026-03-30
**Confidence:** HIGH

---

## Existing Architecture Baseline

Before documenting new components, the existing system as-built is:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (React 19)                          │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ Sidebar  │  │ Dashboard  │  │  Workspace   │  │ Search   │  │
│  │ (Server) │  │ (Server)   │  │  /[id]/*     │  │  (Client)│  │
│  └──────────┘  └────────────┘  └──────────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│              Next.js 16.2 App Router (Node.js)                  │
│  ┌──────────────────┐  ┌────────────────────────────────────┐   │
│  │  Route Handlers  │  │         Server Components          │   │
│  │  app/api/**      │  │  (direct DB calls via Drizzle)     │   │
│  └──────────────────┘  └────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               lib/ service layer                         │   │
│  │  skill-orchestrator | queries | audit | data-service     │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     PostgreSQL (Drizzle ORM)                     │
│  projects · actions · risks · milestones · workstreams          │
│  artifacts · engagement_history · key_decisions · stakeholders  │
│  tasks · outputs · knowledge_base · drafts · skill_runs         │
│  discovery_items · audit_log · scheduled_jobs · job_runs        │
│  onboarding_phases/steps · integrations · time_entries          │
│  business_outcomes · e2e_workflows · workflow_steps             │
│  before_state · architecture_integrations · focus_areas         │
├─────────────────────────────────────────────────────────────────┤
│          BullMQ Worker Process (tsx watch worker/index.ts)      │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │   DB-Driven Scheduler   │  │     Skill Run Jobs           │  │
│  │  (scheduled_jobs table) │  │  (SkillOrchestrator.run())   │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
│                      Redis (ioredis + BullMQ)                    │
└─────────────────────────────────────────────────────────────────┘
```

**Key existing patterns:**
- All pages and most tabs are Server Components that call Drizzle directly — no API layer for reads
- Route Handlers (`app/api/**`) handle mutations and SSE streaming
- Skills run via `SkillOrchestrator` which reads SKILL.md files from disk at runtime
- No auth layer — all requests treated as a single implicit user
- `lib/queries.ts` is the canonical query library; `lib/skill-orchestrator.ts` owns all Claude calls

---

## v3.0 New Components Architecture

### System Overview — After v3.0

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (React 19)                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────┐  │
│  │ /login   │  │ Dashboard    │  │ Workspace    │  │ Admin  │  │
│  │ (Client) │  │ (Server)     │  │ /[id]/* + NEW│  │ Panel  │  │
│  └──────────┘  └──────────────┘  └──────────────┘  └────────┘  │
│                     NEW workspace tabs:                         │
│         context-hub · chat · (visuals inline in existing)       │
├─────────────────────────────────────────────────────────────────┤
│         middleware.ts — Session Gate (NEW)                      │
│  Reads session cookie → redirect to /login if absent            │
│  Injects user context; no bcrypt, no DB calls (edge-safe)       │
├─────────────────────────────────────────────────────────────────┤
│              Next.js 16.2 App Router (Node.js)                  │
│  ┌────────────────────────┐  ┌──────────────────────────────┐   │
│  │  NEW: /api/auth/*      │  │  MODIFIED: all existing      │   │
│  │  login · logout        │  │  Route Handlers — session    │   │
│  │  session-check         │  │  check wrapper added         │   │
│  └────────────────────────┘  └──────────────────────────────┘   │
│  ┌────────────────────────┐  ┌──────────────────────────────┐   │
│  │  NEW: /api/chat/[id]   │  │  NEW: /api/context-hub/[id]  │   │
│  │  (Vercel AI SDK        │  │  ingest · analyze · apply    │   │
│  │   streamText POST)     │  │  (Claude + DB queries)       │   │
│  └────────────────────────┘  └──────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               lib/ service layer                         │   │
│  │  NEW: auth.ts · session.ts · session-edge.ts             │   │
│  │  NEW: chat-context-builder.ts                            │   │
│  │  NEW: tab-template-registry.ts                           │   │
│  │  MODIFIED: audit.ts (actor_id from session)              │   │
│  │  MODIFIED: skill-orchestrator.ts (user attribution)      │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     PostgreSQL (Drizzle ORM)                     │
│         ALL EXISTING TABLES (unchanged except audit_log)        │
│  ┌───────────────┐  ┌────────────────────────────────────────┐  │
│  │  NEW: users   │  │  MODIFIED: audit_log.actor_id          │  │
│  │  id · email   │  │  (now populated — was always null)     │  │
│  │  password_hash│  └────────────────────────────────────────┘  │
│  │  role · active│                                              │
│  │  okta_subject │  (nullable — for future Okta OIDC)          │
│  └───────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### New Components

| Component | Responsibility | Location |
|-----------|---------------|----------|
| `middleware.ts` | Cookie-based session gate; redirect unauthenticated to /login; edge-safe (no bcrypt, no DB) | `bigpanda-app/middleware.ts` |
| `app/login/page.tsx` | Credential form (email + password); calls Server Action; sets iron-session cookie | `app/login/` |
| `lib/auth.ts` | Password hashing (bcrypt), user lookup from DB, bcrypt comparison — Node.js only; never imported in middleware | `lib/auth.ts` |
| `lib/session.ts` | iron-session config, `getSession()`, `requireSession()`, `destroySession()` — for Route Handlers and Server Actions | `lib/session.ts` |
| `lib/session-edge.ts` | Edge-safe session decrypt only (no bcrypt, no DB) — used exclusively by middleware | `lib/session-edge.ts` |
| `app/api/auth/login/route.ts` | POST handler: validates credentials, creates session, sets cookie | `app/api/auth/login/` |
| `app/api/auth/logout/route.ts` | POST handler: destroys session, clears cookie | `app/api/auth/logout/` |
| `app/admin/page.tsx` | Admin panel: user list, create/deactivate users, role assignment (admin role required) | `app/admin/` |
| `app/customer/[id]/chat/page.tsx` | Project chat UI — `"use client"` component using `useChat` hook | `app/customer/[id]/chat/` |
| `app/api/chat/[id]/route.ts` | POST handler: receives messages, builds DB context snapshot, streams response via Vercel AI SDK `streamText` | `app/api/chat/[id]/` |
| `lib/chat-context-builder.ts` | Assembles DB snapshot (actions, risks, milestones, workstreams, stakeholders, key_decisions) for Claude chat system prompt | `lib/chat-context-builder.ts` |
| `app/customer/[id]/context-hub/page.tsx` | Context Hub tab: file upload, routing preview grouped by tab, approve/dismiss per suggestion, completeness analysis | `app/customer/[id]/context-hub/` |
| `app/api/context-hub/[id]/ingest/route.ts` | POST: receives document text, calls Claude to extract + route, creates discoveryItems rows (status: pending) | `app/api/context-hub/[id]/ingest/` |
| `app/api/context-hub/[id]/apply/route.ts` | POST: applies approved discovery items to their respective domain tables; writes audit log | `app/api/context-hub/[id]/apply/` |
| `lib/tab-template-registry.ts` | TypeScript registry defining fixed section structure per tab type; consumed by tab rendering components | `lib/tab-template-registry.ts` |
| `components/EngagementMapVisual.tsx` | React client component rendering engagement map as interactive inline SVG; onClick drill-down to detail modal | `components/EngagementMapVisual.tsx` |
| `components/WorkflowDiagramVisual.tsx` | React client component for before/after workflow diagram using React Flow + Dagre layout; dynamic import with ssr:false | `components/WorkflowDiagramVisual.tsx` |

### Modified Components

| Component | Modification | Impact |
|-----------|-------------|--------|
| `app/layout.tsx` | No change — middleware handles auth redirect | None |
| `lib/audit.ts` | Read `actor_id` from session (`getSession()`) on every write | All audit log entries gain actor attribution |
| `lib/skill-orchestrator.ts` | Accept optional `actorId` param; pass to audit writes | Scheduled runs use `'system'`; user-triggered runs use session userId |
| `app/customer/[id]/layout.tsx` | No change to layout structure | WorkspaceTabs gets new entries |
| `components/WorkspaceTabs.tsx` | Add Context Hub and Chat tab entries | 2 new tabs appear in nav |
| `app/customer/[id]/architecture/page.tsx` | Embed `WorkflowDiagramVisual` component; keep skill output link for download | Visual behavior changes; static HTML remains available |
| `app/customer/[id]/overview/page.tsx` or teams tab | Embed `EngagementMapVisual` component inline | Visual behavior changes |
| All `app/api/**/route.ts` files (40+ handlers) | Add `requireSession()` guard at top of each handler | Auth enforcement across all mutations |
| `db/schema.ts` | Add `users` table | New Drizzle migration required |

---

## Architectural Patterns

### Pattern 1: iron-session Cookie Auth (Credentials-Only, Okta-Ready)

**What:** Stateless encrypted cookie session using `iron-session`. The `users` table stores `email`, `password_hash` (bcrypt, 10 rounds), and `role` (`'user' | 'admin'`). Middleware reads the cookie and redirects to `/login` on miss. No external auth server needed today.

**Okta-readiness strategy:** The `users` table includes an `okta_subject` column (nullable TEXT). When Okta is enabled later, the login route skips password check and instead initiates an OIDC Authorization Code flow via NextAuth.js Okta provider. The iron-session cookie is still issued after Okta callback — the session shape does not change, so all downstream code (`requireSession()`, `getSession()`, audit log) remains identical.

**Trade-offs:** iron-session sessions are stateless — not revocable without a session DB or `user_active` flag check. Acceptable for an internal tool. Logout destroys the client cookie. If forced-logout is needed, check `users.active` inside `requireSession()`.

**Edge Runtime constraint:** `bcrypt` uses Node.js native modules not available in the Edge Runtime. Middleware runs in Edge Runtime. This means `lib/auth.ts` (which imports bcrypt) must never be imported in `middleware.ts`. Two separate files solve this: `lib/auth.ts` for Node.js contexts, `lib/session-edge.ts` for the edge-safe decrypt only.

```typescript
// lib/session.ts — Node.js only (Route Handlers, Server Actions)
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId: number;
  email: string;
  role: 'user' | 'admin';
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), {
    password: process.env.SESSION_SECRET!,
    cookieName: 'bp-session',
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production' },
  });
}

export async function requireSession() {
  const session = await getSession();
  if (!session.userId) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return session;
}
```

```typescript
// middleware.ts — edge-safe only (no bcrypt, no DB)
import { NextRequest, NextResponse } from 'next/server';
import { unsealData } from 'iron-session'; // edge-compatible seal/unseal

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico'];

export async function middleware(req: NextRequest) {
  const isPublic = PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const cookie = req.cookies.get('bp-session')?.value;
  if (!cookie) return NextResponse.redirect(new URL('/login', req.url));

  try {
    await unsealData(cookie, { password: process.env.SESSION_SECRET! });
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}
```

**CVE-2025-29927 note:** The app runs on Next.js 16.2.0 (patched well past the affected versions 14.x < 14.2.25). Middleware bypass via `x-middleware-subrequest` is not a concern at this version. Defense-in-depth (`requireSession()` in all Route Handlers) is still the correct pattern.

### Pattern 2: Per-Project DB-Query RAG Chat (No Vector Search)

**What:** A project chat endpoint that builds a structured DB snapshot (all actions, risks, milestones, workstreams, stakeholders, key_decisions for the project), injects it into Claude's system prompt, then streams a response back using Vercel AI SDK `streamText`. The `useChat` hook on the client handles streaming display.

**Why no vector search:** All project data for a single project fits comfortably within Claude's context window (typical project: 20-60k tokens). Adding pgvector would require an embeddings pipeline, index maintenance, and chunking strategy for marginal benefit at this scale. Direct DB query is deterministic, cheaper, and simpler.

**Implementation note:** The existing `@anthropic-ai/sdk@^0.80.0` is used by `SkillOrchestrator`. The chat endpoint uses `@ai-sdk/anthropic` + `ai` (Vercel AI SDK) alongside it. These coexist without conflict — `SkillOrchestrator` stays on the raw SDK (its DB chunk-write streaming pattern predates and does not need the Vercel AI SDK protocol). The chat endpoint uses the Vercel AI SDK because `useChat` expects the Vercel data stream format.

```typescript
// app/api/chat/[id]/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { buildChatContext } from '@/lib/chat-context-builder';
import { requireSession } from '@/lib/session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { messages } = await req.json();
  const { id } = await params;
  const projectId = parseInt(id, 10);
  const systemPrompt = await buildChatContext(projectId);

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages,
  });

  return result.toDataStreamResponse();
}
```

### Pattern 3: Context Hub — Claude as Content Router

**What:** User uploads a document (paste text or file). Claude receives the text plus a manifest of available tabs and their field schemas, then returns structured JSON identifying which fields in which tabs should be updated, plus a per-tab completeness analysis. Always previewed before DB write — uses the existing `discoveryItems` approval workflow (status: `pending` → `approved` → `dismissed`).

**Why reuse discoveryItems:** The `discovery_items` table and its approval pattern (`pending` → `approved` → `dismissed`) already models this exact workflow. The Context Hub is a new UI surface on top of existing data infrastructure — no new tables needed.

**Two-step Claude call:**
1. `ingest`: Extract content → route to tabs → return preview JSON → create `discoveryItems` rows (status: pending)
2. `apply`: User approves items → write to domain tables → mark discoveryItems approved → write audit log

### Pattern 4: Interactive Visuals as React Components

**What:** The existing skills generate static HTML files. In v3.0, engagement maps and workflow diagrams become React client components that read from the same DB tables the skills already populate. The HTML file generation is preserved for download/export.

**Engagement Map:** Inline SVG JSX. Data from `business_outcomes`, `e2e_workflows`, `workflow_steps`, `focus_areas`, and team tables. Clickable SVG `<g>` elements with onClick handlers opening a detail drawer/modal. No external library needed — pure React + SVG.

**Workflow Diagram:** `@xyflow/react` (React Flow v12+) with `@dagrejs/dagre` for automatic node layout. Nodes from `workflow_steps` table. Must use `dynamic(() => import(...), { ssr: false })` — React Flow requires browser APIs.

**Trade-offs:** React Flow adds ~90kb gzipped to the client bundle. The dynamic import with `ssr: false` ensures this does not affect initial page load. The `dagrejs/dagre` package is unmaintained upstream but widely used and stable for this use case.

### Pattern 5: Tab Templates via TypeScript Registry

**What:** A TypeScript file defines the fixed section structure per tab type. Tab rendering components read their template and enforce section order and required/optional status.

**Why TypeScript file over DB table:** Tab templates are product-design decisions that change on deploys, not at runtime. A DB table would require a migration every time a section is added. A TypeScript registry is version-controlled, type-safe, and zero overhead.

```typescript
// lib/tab-template-registry.ts
export type TabType = 'actions' | 'risks' | 'milestones' | 'architecture' | 'overview';

export interface TabSection {
  key: string;
  label: string;
  required: boolean;
  displayOrder: number;
  description?: string;
}

export const TAB_TEMPLATES: Record<TabType, TabSection[]> = {
  actions: [
    { key: 'open-actions', label: 'Open Actions', required: true, displayOrder: 1 },
    { key: 'completed-actions', label: 'Completed Actions', required: false, displayOrder: 2 },
  ],
  // ... remainder defined per tab during implementation
};
```

---

## Data Flow Changes

### New: Authentication Flow

```
User submits /login form (email + password)
  ↓
Route Handler: db.select(users).where(email) → bcrypt.compare(password, hash)
  ↓
If valid: getSession() → session.userId = user.id → session.save()
          iron-session sets HttpOnly encrypted cookie 'bp-session'
  ↓
Redirect to /
  ↓
All subsequent requests:
  middleware reads 'bp-session' cookie → unsealData() → valid → NextResponse.next()
                                                       → invalid/missing → redirect /login
  Route Handlers: requireSession() → getSession() → check userId → return session or throw 401
```

### New: Chat Flow

```
User types message in Chat tab (/customer/[id]/chat)
  ↓
useChat hook (client) POSTs { messages } to /api/chat/[id]
  ↓
Route Handler: requireSession() | buildChatContext(projectId)
  ↓
buildChatContext: Drizzle queries → actions + risks + milestones + workstreams
                 + stakeholders + key_decisions → serialized to text
  ↓
streamText({ model: claude-sonnet-4-6, system: contextSnapshot, messages })
  ↓
toDataStreamResponse() → SSE stream back to client
  ↓
useChat updates UI token-by-token as chunks arrive
```

### New: Context Hub Flow

```
User uploads document text in Context Hub tab
  ↓
POST /api/context-hub/[id]/ingest { text: string }
  ↓
Claude call: system = tab manifest + field schemas; user = document text
  → returns JSON: { updates: [{ tab, field, value, confidence }], completeness: { ... } }
  ↓
Create discoveryItems rows for each suggested update (status: 'pending')
  ↓
Response: { discoveryItemIds, completeness }
  ↓
UI: renders grouped preview by tab; approve/dismiss per item
  ↓
User approves → POST /api/context-hub/[id]/apply { itemIds: number[] }
  ↓
For each approved discoveryItem: write value to correct domain table
Mark discoveryItem status = 'approved'; write audit_log entries
```

### Modified: Audit Log Flow

```
Before v3.0: audit_log.actor_id always null (single-user, no auth)
After v3.0:
  - User-triggered actions: audit.ts calls getSession() → actor_id = session.userId.toString()
  - Scheduled BullMQ jobs: SkillOrchestrator receives actorId='system' → audit_log.actor_id = 'system'
  - Result: full audit trail with named actors
```

---

## Recommended Project Structure Changes

Only new/changed directories relative to the current structure:

```
bigpanda-app/
├── middleware.ts                     # NEW — edge-safe session gate
├── app/
│   ├── login/
│   │   └── page.tsx                 # NEW — login form (Client Component)
│   ├── admin/
│   │   └── page.tsx                 # NEW — user management (admin role-gated)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts       # NEW — credential validation + cookie set
│   │   │   └── logout/route.ts      # NEW — cookie destroy
│   │   ├── chat/
│   │   │   └── [id]/route.ts        # NEW — Vercel AI SDK streamText
│   │   └── context-hub/
│   │       └── [id]/
│   │           ├── ingest/route.ts  # NEW — Claude routing call
│   │           └── apply/route.ts   # NEW — write approved items to DB
│   └── customer/[id]/
│       ├── chat/
│       │   └── page.tsx             # NEW — useChat UI (Client Component)
│       └── context-hub/
│           └── page.tsx             # NEW — upload + preview UI
├── lib/
│   ├── auth.ts                      # NEW — bcrypt ops (Node.js only, never in middleware)
│   ├── session.ts                   # NEW — iron-session config, getSession, requireSession
│   ├── session-edge.ts              # NEW — edge-safe unseal (middleware only)
│   ├── chat-context-builder.ts      # NEW — DB snapshot → Claude system prompt
│   ├── tab-template-registry.ts     # NEW — fixed section definitions per tab type
│   └── audit.ts                     # MODIFIED — actor_id from session
└── components/
    ├── EngagementMapVisual.tsx       # NEW — inline SVG, Client Component
    └── WorkflowDiagramVisual.tsx     # NEW — React Flow, dynamic import ssr:false
```

**DB migration required:** Add `users` table. No changes to any existing table except `audit_log.actor_id` is now populated (schema column already exists).

---

## Integration Points

### Auth Impact on Existing Route Handlers

All existing Route Handlers need a single guard added at the top — no business logic changes:

```typescript
// Add to top of every existing /api/**/route.ts
import { requireSession } from '@/lib/session';

export async function POST(req: Request) {
  const session = await requireSession(); // throws 401 Response if no valid session
  // ... existing handler logic unchanged
}
```

Server Components (pages/layouts) do not need explicit session checks — middleware handles redirect. For defense-in-depth, the admin panel checks role in addition.

### Coexistence: Raw Anthropic SDK vs Vercel AI SDK

| Usage | SDK | Why |
|-------|-----|-----|
| 15 skills via `SkillOrchestrator` | `@anthropic-ai/sdk` (raw) | DB chunk-write streaming pattern; not compatible with `useChat` protocol |
| Project chat (`/api/chat/[id]`) | `@ai-sdk/anthropic` + `ai` | `useChat` requires Vercel AI SDK data stream format |
| Context Hub Claude calls | `@anthropic-ai/sdk` (raw) | Not streamed to browser; structured JSON response; raw SDK is simpler here |

Both SDKs read from `process.env.ANTHROPIC_API_KEY`. They coexist in `package.json` without conflict.

### Interactive Visuals — No Data Migration

The `business_outcomes`, `e2e_workflows`, `workflow_steps`, `focus_areas`, `architectureIntegrations`, and `beforeState` tables were shipped in v2.0. The new React components read from these tables directly. No data migration required. The existing HTML-generating skills are not modified — their outputs remain available in the Output Library.

### Context Hub — Reuse Existing Infrastructure

The `document_ingestion` status enum (`pending → extracting → preview → approved → failed`) and `discoveryItems` table (`pending → approved → dismissed`) are already in the schema. The Context Hub tab is purely new UI + API routes over existing infrastructure. No new DB tables are needed for v3.0.

### External Services

| Service | Integration Pattern | Status | Notes |
|---------|---------------------|--------|-------|
| Anthropic Claude (skills) | Raw `@anthropic-ai/sdk` via `SkillOrchestrator` | Unchanged | 15 skills unaffected |
| Anthropic Claude (chat) | `@ai-sdk/anthropic` + Vercel AI SDK | New | Separate from skill runs |
| Anthropic Claude (context hub) | Raw `@anthropic-ai/sdk` | New | JSON extraction calls |
| Okta OIDC (future) | NextAuth.js Okta provider, bridged to iron-session | Future | Session shape unchanged |
| Redis / BullMQ | Unchanged | Unchanged | Worker unaffected by auth |

---

## Build Order (Dependency-Sequenced)

### Phase A: Multi-User Auth — Build First

**Rationale:** Session context (`actor_id`) is needed by audit log, chat endpoint, and context hub. If auth is built first, every subsequent feature is written auth-aware from day one. Retrofitting auth across 40+ Route Handlers after the fact is high-risk and tedious.

**Deliverables:**
1. `users` table migration (email, password_hash, role, active, okta_subject nullable)
2. `lib/auth.ts` (bcrypt), `lib/session.ts`, `lib/session-edge.ts`
3. `middleware.ts` (session gate)
4. `/login` page + `/api/auth/login` + `/api/auth/logout`
5. `requireSession()` added to all existing Route Handlers
6. `lib/audit.ts` modified to populate `actor_id` from session
7. `/admin` page (user CRUD)

**Risk:** Low. No existing feature behavior changes — only adds a gate.

### Phase B: Tab Templates — Parallelize with A

**Rationale:** Pure TypeScript registry, no new tables, no API changes, no auth dependency. Can be written and merged while Phase A is in review.

**Deliverables:**
1. `lib/tab-template-registry.ts` with all tab section definitions
2. Each existing workspace tab updated to render sections per template

**Risk:** Very low.

### Phase C: Interactive Visuals — After A, B

**Rationale:** DB tables already exist. Components are additive. Requires React Flow install. No auth dependency (read-only components). Can begin immediately after A is merged.

**Deliverables:**
1. `npm install @xyflow/react @dagrejs/dagre`
2. `EngagementMapVisual.tsx` (inline SVG)
3. `WorkflowDiagramVisual.tsx` (React Flow, dynamic import)
4. Wire into architecture and overview/teams tabs

**Risk:** Medium. React Flow bundle size; potential hydration issues with `ssr: false` dynamic import.

### Phase D: Per-Project Chat — After A

**Rationale:** Chat endpoint must be session-protected (requires Phase A). Straightforward once auth is in place.

**Deliverables:**
1. `npm install ai @ai-sdk/anthropic`
2. `lib/chat-context-builder.ts`
3. `/api/chat/[id]/route.ts`
4. `/customer/[id]/chat/page.tsx`
5. Add Chat to WorkspaceTabs

**Risk:** Low-medium. Main complexity is tuning the DB context snapshot size to avoid token budget overflow.

### Phase E: Context Hub — Last (Depends on A; Benefits from B)

**Rationale:** Most complex feature. Depends on auth. Benefits from tab templates being defined (completeness analysis checks against template sections). Existing `discoveryItems` infrastructure is already in place.

**Deliverables:**
1. `/api/context-hub/[id]/ingest/route.ts`
2. `/api/context-hub/[id]/apply/route.ts`
3. `/customer/[id]/context-hub/page.tsx`
4. Add Context Hub to WorkspaceTabs

**Risk:** High. Claude routing accuracy requires prompt engineering; approval UX is complex.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Auth Only in Middleware

**What people do:** Put all auth checks in `middleware.ts`, skip `requireSession()` in Route Handlers.

**Why it's wrong:** Defense-in-depth principle. Even though this app runs on a patched Next.js version, relying on a single enforcement point is fragile. Future Next.js upgrades should not silently remove your security.

**Do this instead:** Middleware for UX redirect. `requireSession()` in every Route Handler for actual enforcement.

### Anti-Pattern 2: Importing bcrypt in Middleware

**What people do:** Share `lib/auth.ts` between middleware and Route Handlers.

**Why it's wrong:** `bcrypt` uses Node.js native modules not available in Edge Runtime. Middleware throws at startup if it imports `bcrypt` directly or transitively.

**Do this instead:** `lib/auth.ts` (bcrypt) for Node.js Route Handlers only. `lib/session-edge.ts` (iron-session `unsealData` — edge-compatible) for middleware only.

### Anti-Pattern 3: Using Raw Anthropic SDK for the Chat Endpoint

**What people do:** Reuse `SkillOrchestrator`'s streaming pattern in the chat endpoint.

**Why it's wrong:** The `useChat` hook from `@ai-sdk/react` expects the Vercel AI SDK data stream format. Raw Anthropic SSE chunks are a different format — `useChat` will receive garbled output.

**Do this instead:** `/api/chat/[id]` uses `@ai-sdk/anthropic` + `streamText` → `toDataStreamResponse()`. `SkillOrchestrator` continues using the raw SDK for skills — they are separate paths.

### Anti-Pattern 4: Cross-Project Chat Context

**What people do:** Build the chat to answer questions spanning all projects.

**Why it's wrong:** Combined context of all active projects exceeds Claude's practical context window for a single call. The FTS search feature already handles cross-project lookup.

**Do this instead:** Chat is scoped per-project. Label the UI "Ask about [Project Name]". Explicitly block cross-project queries in the system prompt if needed.

### Anti-Pattern 5: React Flow Without dynamic() + ssr:false

**What people do:** Import `WorkflowDiagramVisual` as a static import in a Server Component or page.

**Why it's wrong:** React Flow uses browser-only APIs (`window`, `ResizeObserver`). A static import in a Server Component causes a hydration error or build failure.

**Do this instead:**
```typescript
// In the page or parent component:
const WorkflowDiagramVisual = dynamic(
  () => import('@/components/WorkflowDiagramVisual'),
  { ssr: false }
);
```

### Anti-Pattern 6: Adding a sessions Table for iron-session

**What people do:** Create a `sessions` DB table to pair with iron-session, "for completeness."

**Why it's wrong:** iron-session is designed as a stateless cookie-only solution. Adding a DB lookup on every request adds 30-100ms latency with no benefit at this scale.

**Do this instead:** Cookie-only. If forced session revocation is required, add a `users.active` boolean and check it inside `requireSession()`.

---

## Scaling Considerations

v3.0 targets a small internal team (~5-20 users). Scaling is not a constraint.

| Scale | Approach |
|-------|----------|
| 1-20 users (v3.0 target) | iron-session cookie, monolith, current DB schema — all fine |
| 20-100 users | Add `users.active` check in `requireSession()` for revocability; pgBouncer for connection pooling |
| 100+ users | Redis session store for revocability without DB hits; read replica for analytics queries; evaluate tRPC |

---

## Sources

- [Next.js Official Auth Guide](https://nextjs.org/docs/app/guides/authentication) — iron-session pattern, session management (HIGH confidence — official docs)
- [Next.js Middleware Docs 14](https://nextjs.org/docs/14/app/building-your-application/routing/middleware) — middleware route protection (HIGH confidence — official docs)
- [Vercel AI SDK — Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) — `streamText` + `useChat` pattern (HIGH confidence — official SDK docs)
- [Vercel AI SDK RAG Guide](https://sdk.vercel.ai/docs/guides/rag-chatbot) — DB-backed context approach (HIGH confidence — official guide)
- [React Flow Dagre Example](https://reactflow.dev/examples/layout/dagre) — `@xyflow/react` + `@dagrejs/dagre` integration (HIGH confidence — official examples)
- [NextAuth.js Okta Provider](https://next-auth.js.org/providers/okta) — future OIDC Okta bridge (HIGH confidence — official docs)
- [CVE-2025-29927 disclosure](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) — middleware bypass; patched in 14.2.25+ (HIGH confidence — security advisory referenced in multiple sources)
- [Lama Dev iron-session walkthrough](https://blog.lama.dev/next-js-14-auth-with-iron-session/) — implementation pattern (MEDIUM confidence — community article, verified against official docs)
- [LogRocket — SVG in Next.js 2025](https://blog.logrocket.com/import-svgs-next-js-apps/) — inline SVG vs dynamic import pattern (MEDIUM confidence — community article)

---

*Architecture research for: BigPanda AI Project Management App — v3.0 Collaboration & Intelligence*
*Researched: 2026-03-30*
