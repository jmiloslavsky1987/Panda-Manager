# Stack Research — v3.0 New Capabilities

**Domain:** Multi-user auth, RAG chat over PostgreSQL, interactive visuals — added to existing Next.js 16 + PostgreSQL app
**Researched:** 2026-03-30
**Confidence:** HIGH (npm versions verified live; library capabilities verified via web search + official docs)

> This document covers ONLY the stack additions for v3.0. The existing validated stack
> (Next.js 16.2.0, React 19, PostgreSQL + Drizzle ORM, BullMQ + Redis, Anthropic SDK 0.80.0,
> Radix UI, Tailwind CSS, Vitest) is already installed and is NOT re-researched here.

---

## Critical Context: The App Runs Next.js 16, Not 14

The `bigpanda-app/package.json` confirms `next: 16.2.0` and `react: 19.2.4`. All library
recommendations below have been verified against Next.js 16 / React 19 compatibility.
The milestone brief references "Next.js 14" — this is outdated and should be treated as 16.

**Key Next.js 16 difference:** Middleware has been replaced by `proxy.ts`. Any auth
library that uses middleware for route protection must use the `proxy.ts` pattern.

---

## Recommended Additions

### 1. Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `better-auth` | 1.5.6 | Session management, credentials login, role-based access, SAML/OIDC provider architecture | Native SAML 2.0 + OIDC support out of the box; TypeScript-first plugin system; fully compatible with Next.js 16 + React 19 App Router; `proxy.ts` pattern supported; Auth.js team was acquired by better-auth team in Sept 2025, making this the forward path |
| `bcryptjs` | latest ^2.x | Password hashing for credentials provider | Pure JS, no native bindings, works in all Next.js runtimes |
| `@types/bcryptjs` | latest | TypeScript types | Dev dependency |

**Why better-auth over Auth.js v5 (next-auth@beta):**
Auth.js v5 requires "significant custom work" for SAML — the first-class feature this project
needs for Okta-ready architecture. better-auth ships SAML 2.0 as a plugin, has native
Next.js 16 / proxy.ts docs, and is actively maintained by the same team that now owns Auth.js.

**Why not Clerk:**
Clerk is a managed SaaS. This app is local/self-hosted (no external dependency acceptable for
a single-team internal tool). Clerk pricing and vendor lock-in are wrong fit.

**Okta-ready architecture pattern:**
Use better-auth's OIDC plugin for Okta connection. No live Okta credentials needed now —
the plugin is wired but the provider config is environment-variable gated. When Okta is
ready, set `OKTA_CLIENT_ID` / `OKTA_CLIENT_SECRET` / `OKTA_ISSUER` and the login flow switches.
Credentials login remains as fallback for users not in Okta.

**Security: Defense-in-depth required (CVE-2025-29927 lesson)**
Never rely solely on proxy.ts for auth protection. Every Server Action and Route Handler that
touches user data must call `auth()` to verify the session. This is the Data Access Layer
pattern — verified at the point of data, not only at the routing layer.

---

### 2. RAG Chat over PostgreSQL

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `pgvector` | 0.2.1 | Node.js client for PostgreSQL pgvector extension; adds vector type support | Official npm package from the pgvector project; works with existing `postgres` (node-postgres) client already in the app; supports Drizzle ORM vector columns |
| `voyageai` | 0.2.1 | Embeddings API — converts project text to vectors | Anthropic's official recommended embedding partner; voyage-3.5 model outperforms OpenAI text-embedding-3-large on retrieval benchmarks; same API key infrastructure as Claude |
| `ai` (Vercel AI SDK) | 6.0.141 | `useChat` hook, `streamText`, unified LLM interface | Handles streaming chat UI with no manual SSE management; `useChat` hook provides optimistic UI, error handling, and message state out of the box; integrates with Anthropic via `@ai-sdk/anthropic` |
| `@ai-sdk/anthropic` | 3.0.64 | Vercel AI SDK provider for Anthropic Claude | Wraps `@anthropic-ai/sdk` in the unified AI SDK interface; required for `streamText` with Claude; allows tool use within chat |
| `@ai-sdk/react` | 3.0.143 | React hooks (`useChat`, `useCompletion`) | Client-side chat state management; works with Next.js 16 App Router client components |

**Why Voyage AI for embeddings instead of OpenAI:**
Anthropic does not offer its own embedding model. Their official recommendation is Voyage AI.
For a Claude-native stack, using Voyage AI keeps vendor footprint tight (one AI vendor relationship).
`voyage-3.5` is current best-practice for RAG with Claude. The `voyageai` npm package is the
official Voyage AI Node.js SDK.

**Why Vercel AI SDK on top of existing `@anthropic-ai/sdk`:**
The existing codebase uses `@anthropic-ai/sdk` directly for skill streaming. The Vercel AI SDK
wraps this for the chat use case specifically — it provides the `useChat` React hook which
handles streaming response assembly in the browser. For the existing skill engine (SSE streaming),
keep the direct SDK. For the new per-project chat UI, use Vercel AI SDK.

**RAG data flow:**
```
Project data (DB rows) → chunked text → Voyage AI embed → pgvector column (per project)
User chat message → Voyage AI embed → cosine similarity search → top-k chunks
top-k chunks + question → Claude via streamText → streamed answer
```

**pgvector with Drizzle ORM:**
Drizzle 0.31.2+ supports pgvector natively. The `pgvector` npm package adds the vector type
to the `postgres` client already installed. Schema addition:
```ts
import { vector } from 'drizzle-orm/pg-core';
// In a new embeddings table:
embedding: vector({ dimensions: 1024 })  // voyage-3.5 uses 1024 dimensions
```
HNSW index with cosine ops for sub-millisecond similarity search at project scale.
The pgvector PostgreSQL extension must be enabled in the DB before migrations run:
`CREATE EXTENSION IF NOT EXISTS vector;`

---

### 3. Interactive Visuals (Engagement Maps + Workflow Diagrams)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@xyflow/react` | 12.10.2 | Node-based interactive diagrams: engagement maps, workflow diagrams, drill-down detail | React Flow v12 (rebranded to @xyflow/react) is the standard for interactive node-edge diagrams in React; supports custom SVG nodes, zoom/pan, click handlers for drill-down; the xyflow team now uses Next.js App Router for their own docs site |

**Why @xyflow/react over D3.js:**
D3 requires imperative DOM manipulation that conflicts with React's declarative model. React Flow
renders nodes as React components — meaning every engagement map node can be a full React component
with Radix UI popover drill-down on click. D3 is appropriate if you need physics simulation (D3-Force)
for large graphs, but at project scale (10-50 nodes), React Flow is far easier to maintain.

**Why not raw SVG + React:**
The existing HTML files contain static SVG. Making them interactive requires: pan/zoom viewport,
click handlers with state, dynamic data binding, and drill-down overlays. React Flow provides
all of this. Rolling custom SVG pan/zoom is 3-4 weeks of work that React Flow gives in one day.

**Migration path for existing HTML files:**
The existing static HTML engagement maps and workflow diagrams are generated by Claude skills.
v3.0 approach: keep skills generating the data structure (JSON), render via React Flow instead
of HTML file. The skill output changes from HTML string to structured JSON that the React
component consumes. This is a skill output format change, not a skill logic change.

**Note on package name:** `reactflow` (old) is now `@xyflow/react` (v12+). Do not install the
old `reactflow` package — it is deprecated in favor of `@xyflow/react`.

---

### 4. Context Hub — AI Completeness Analysis

No new packages required. This feature uses:
- Existing `@anthropic-ai/sdk` for per-tab completeness analysis calls
- Existing Drizzle ORM + PostgreSQL for storing analysis results
- Existing SSE streaming infrastructure for analysis progress

The completeness analysis is a structured Claude prompt that receives tab data from the DB
and returns a JSON gap report. This is a feature design task, not a new library task.

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/bcryptjs` | ^2.4.x | TypeScript types for bcryptjs | Dev dependency; always with bcryptjs |

---

## Installation

```bash
# Authentication
npm install better-auth bcryptjs
npm install -D @types/bcryptjs

# RAG pipeline
npm install pgvector voyageai ai @ai-sdk/anthropic @ai-sdk/react

# Interactive visuals
npm install @xyflow/react
```

**Note on better-auth peer deps with Next.js 16:**
If `npm install better-auth` fails with ERESOLVE (peer dep declaring `next@^14||^15`),
use `--legacy-peer-deps`. This is a declared-version issue, not a runtime incompatibility —
the library works correctly with Next.js 16 as confirmed by the maintainers.

```bash
npm install better-auth --legacy-peer-deps
```

**Enable pgvector in PostgreSQL before running migrations:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `better-auth` | `next-auth@beta` (Auth.js v5) | SAML requires "significant custom work" in Auth.js; better-auth has native SAML 2.0 plugin; Auth.js development now owned by better-auth team |
| `better-auth` | Clerk | Managed SaaS — not appropriate for local self-hosted internal tool; vendor lock-in; cost |
| Voyage AI (`voyageai`) | OpenAI `text-embedding-3` | App already uses Anthropic; Voyage AI is Anthropic's official embedding partner; keeps vendor count low |
| Voyage AI (`voyageai`) | Self-hosted BGE/E5 models | RAG quality at this scale does not justify infra complexity of local embedding server |
| `@xyflow/react` | D3.js | D3 requires imperative DOM manipulation incompatible with React model; React Flow renders nodes as React components, allowing Radix UI drill-down popups |
| `@xyflow/react` | Custom SVG + React | Weeks of work to rebuild pan/zoom/click; React Flow provides this out of the box |
| Vercel AI SDK (`ai`) | Direct Anthropic SDK for chat | `useChat` hook handles streaming assembly, optimistic UI, and error state — saves ~200 lines of boilerplate per chat component |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `reactflow` (old package) | Deprecated; last release 2023; renamed to `@xyflow/react` | `@xyflow/react` ^12.10.2 |
| `passport` + `passport-local` | Express-era auth; does not integrate with Next.js App Router Server Components, proxy.ts, or Server Actions | `better-auth` |
| `jsonwebtoken` directly | Manual JWT handling with no session invalidation, no CSRF protection, and no App Router session helpers | `better-auth`'s built-in session management |
| Middleware-only auth (proxy.ts sole gate) | CVE-2025-29927 class of vulnerability — proxy/middleware can be bypassed; all auth must also be verified at data access layer | Defense-in-depth: proxy.ts + `auth()` call in every Route Handler and Server Action |
| `langchain` | Heavy dependency (50+ transitive packages) for what is a simple retrieval query; overkill for this RAG pattern | Direct pgvector cosine search via Drizzle + `voyageai` for embeddings |
| `prisma` for vector columns | Prisma has limited pgvector support; Drizzle ORM already in the project has native vector column + HNSW index support | Drizzle ORM with `pgvector` npm package |

---

## Stack Patterns by Variant

**If Okta is not yet live (current state):**
- Use better-auth credentials provider only
- Wire OIDC plugin with empty/disabled config
- Users log in with email + password stored in a new `users` table in PostgreSQL
- Admin role is a column on the users table

**If Okta becomes live:**
- Set `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_ISSUER` environment variables
- better-auth OIDC plugin activates automatically
- Credentials login remains as fallback
- No code changes required, only env var addition

**If RAG context is narrow (one project at a time):**
- Embed only the active project's DB rows at chat session start
- Store embeddings in a `project_embeddings` table keyed by `project_id`
- Invalidate embeddings on every write to that project (BullMQ job)

**If RAG context needs cross-project (e.g., Knowledge Base search):**
- Add a separate `knowledge_base_embeddings` table
- Voyage AI's `inputType: "document"` for ingestion, `inputType: "query"` for retrieval
- Cosine similarity search across projects with a `project_id` filter option

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `better-auth@1.5.6` | `next@16.2.0` | Works; may need `--legacy-peer-deps` on install due to stale peer dep declaration; fully functional at runtime |
| `better-auth@1.5.6` | `react@19.2.4` | Fully compatible |
| `@xyflow/react@12.10.2` | `react@19.2.4` | Tested; xyflow docs site runs on Next.js App Router |
| `ai@6.0.141` | `next@16.2.0` | Vercel makes both; fully compatible |
| `@ai-sdk/anthropic@3.0.64` | `@anthropic-ai/sdk@^0.80.0` | AI SDK wraps the Anthropic SDK; both can coexist; use direct SDK for skills, AI SDK for chat |
| `pgvector@0.2.1` | `postgres@^3.4.8` (existing) | pgvector node package supports node-postgres (pg) and postgres.js (this app uses postgres.js — verify integration pattern) |
| `drizzle-orm@^0.45.1` (existing) | pgvector columns | Drizzle 0.31.2+ required for vector support; app has 0.45.1 — confirmed compatible |

**pgvector + postgres.js integration note:**
The `pgvector` npm package's README shows integration with `node-postgres` (pg) as the primary
example. For `postgres.js` (which this app uses), verify the type parser setup. The pattern is:
```ts
import { VectorType } from 'pgvector/pg';
// or use raw SQL for similarity queries if type parsing is complex
```
If postgres.js integration proves difficult, raw SQL cosine search via Drizzle's `sql` tag
is a clean fallback: `sql\`embedding <=> \${queryVector}::vector\``.

---

## Sources

- [better-auth official docs — Next.js integration](https://better-auth.com/docs/integrations/next) — Next.js 16 proxy.ts pattern
- [better-auth Next.js 16 issue tracker](https://github.com/better-auth/better-auth/issues/6439) — peer dep workaround confirmed
- [Auth.js migration guide v5](https://authjs.dev/getting-started/migrating-to-v5) — SAML limitation documented
- [Anthropic embeddings docs](https://docs.claude.com/en/docs/build-with-claude/embeddings) — Voyage AI official recommendation
- [Voyage AI npm package](https://www.npmjs.com/package/voyageai) — v0.2.1 confirmed
- [Drizzle ORM pgvector guide](https://orm.drizzle.team/docs/guides/vector-similarity-search) — vector column + HNSW index patterns
- [Vercel AI SDK — Next.js App Router getting started](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) — useChat + streamText integration
- [Vercel AI SDK RAG guide](https://sdk.vercel.ai/docs/guides/rag-chatbot) — pgvector RAG pattern
- [@xyflow/react npm](https://www.npmjs.com/package/@xyflow/react) — v12.10.2 confirmed
- [React Flow Next.js compatibility](https://reactflow.dev/learn/getting-started/installation-and-requirements) — App Router confirmed
- [CVE-2025-29927 advisory](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) — middleware-only auth bypass; defense-in-depth requirement
- [PkgPulse auth comparison 2026](https://www.pkgpulse.com/blog/best-nextjs-auth-solutions-2026) — MEDIUM confidence ecosystem survey
- Live npm version checks (2026-03-30): `better-auth@1.5.6`, `next-auth@4.24.13`, `@xyflow/react@12.10.2`, `ai@6.0.141`, `@ai-sdk/anthropic@3.0.64`, `@ai-sdk/react@3.0.143`, `voyageai@0.2.1`, `pgvector@0.2.1`

---
*Stack research for: BigPanda App v3.0 — Auth, RAG Chat, Interactive Visuals*
*Researched: 2026-03-30*
