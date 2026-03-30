# Project Research Summary

**Project:** BigPanda AI Project Management App — v3.0 Collaboration & Intelligence
**Domain:** AI-native PS Delivery Management — multi-user auth, per-project chat, interactive visuals, Context Hub, templates
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

The v3.0 milestone adds six capability areas on top of a mature single-user Next.js 16 + PostgreSQL + BullMQ platform. The core technical challenge is not building new features in isolation but integrating them into a working codebase in the correct order: authentication must come first because every subsequent feature depends on a verified user identity — audit log attribution, session-scoped chat, and admin-only route gating all require auth to exist before they are written. The recommended approach is a dependency-sequenced five-phase build: auth and tab templates in parallel first, then interactive visuals, per-project chat, and finally the Context Hub (most complex, highest Claude API risk, most failure modes).

The stack additions are lean and well-justified. `better-auth@1.5.6` is preferred over Auth.js v5 because SAML 2.0 is a native plugin rather than a multi-week custom integration, and better-auth is now maintained by the same team that acquired Auth.js. For chat, the Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) provides the `useChat` hook that handles SSE stream assembly in the browser — the existing `@anthropic-ai/sdk` raw SDK stays in place for all 15 skill routes and the two SDKs coexist without conflict. The originally-considered RAG/pgvector approach should be deferred entirely: at single-project scope a structured DB query producing a 2000–4000 token context payload is faster, more deterministic, and requires no new infrastructure. `@xyflow/react@12.10.2` (React Flow v12) handles interactive node-edge diagrams.

The dominant risk category is authentication security. CVE-2025-29927 (CVSS 9.1, March 2025) demonstrated that Next.js middleware can be bypassed by setting a single HTTP header — any app that relies solely on `middleware.ts` for auth is fully exposed. Defense-in-depth requires `requireSession()` at the top of every Route Handler and Server Action in addition to the middleware redirect. A second structural risk exists in schema design: whether future Okta integration requires a two-day config change or a two-week rewrite depends entirely on one decision made in the auth phase — adding an `okta_subject` nullable column to the `users` table and abstracting role resolution behind a `resolveRole(session)` function. Context Hub carries the highest per-feature implementation risk, with two specific failure modes requiring upfront design: transactional multi-tab writes (partial failures produce silent data inconsistency) and prompt injection via uploaded document text.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 16.2.0, React 19, PostgreSQL + Drizzle ORM 0.45.1, BullMQ + Redis, `@anthropic-ai/sdk@0.80.0`, Radix UI, Tailwind CSS, Vitest) is unchanged for v3.0. Research addressed only the six new capability areas. The milestone brief references "Next.js 14" — the running application is Next.js 16.2.0, which replaces classic middleware with a `proxy.ts` pattern and has critical compatibility implications for auth library selection.

**Core technology additions:**
- `better-auth@1.5.6`: Session management, credentials login, RBAC, Okta-ready OIDC/SAML — native SAML 2.0 plugin, TypeScript-first, Next.js 16 proxy.ts supported; use `--legacy-peer-deps` if peer dep version mismatch on install
- `bcryptjs@^2.x` + `@types/bcryptjs`: Password hashing — pure JS, no native bindings, safe in all Next.js runtimes including Edge
- `ai@6.0.141` + `@ai-sdk/anthropic@3.0.64` + `@ai-sdk/react@3.0.143`: Vercel AI SDK — for chat only; provides `useChat` + `streamText` + `toDataStreamResponse()`; coexists with raw `@anthropic-ai/sdk` without conflict
- `@xyflow/react@12.10.2`: Interactive node-edge diagrams (Engagement Map, Workflow Diagram); requires `dynamic(() => import(...), { ssr: false })` in all parent components
- `pgvector@0.2.1` + `voyageai@0.2.1`: Available but NOT RECOMMENDED for v3.0 — structured DB query context injection is correct at project data scale; defer vector search to a future phase if cross-project knowledge base search becomes a requirement

No new packages required for Context Hub or completeness analysis — both use existing `@anthropic-ai/sdk`, Drizzle ORM, and BullMQ infrastructure.

See [STACK.md](.planning/research/STACK.md) for full version compatibility table, installation commands, and alternatives considered.

### Expected Features

**Must have (table stakes) — missing means the feature feels unshipped:**
- Credential-based login form with persistent httpOnly cookie session
- Role-enforced UI with server-side admin enforcement (not UI-only gating)
- Context Hub file upload with extracted content review before DB commit (approve/reject per suggestion)
- Per-tab completeness indicator (complete/partial/empty badge minimum)
- Project Chat that answers questions from live project DB data — hallucinating project details is worse than no chat
- Sub-tabs for Teams and Architecture tabs (these have the clearest multi-content-area need)
- Templates: new project pre-populates with canonical section structure across all 11 tabs

**Should have (differentiators — what makes this categorically better than Notion + manual ChatGPT):**
- Okta-ready OIDC architecture wired but not live — environment-variable gated so IT can plug in with no app changes
- Admin role for scheduler and user management with a separate `/admin` route group
- Context Hub AI routing: extracted content routed to the correct tab automatically with low-confidence fallback to manual routing
- Per-tab quality gap flags listing missing sections (upgrade from completeness badge)
- Interactive Engagement Map with drill-down to live DB data on node click
- Project chat multi-turn within session (follow-up questions work correctly)
- URL-addressable sub-tab state (`?tab=teams&subtab=adr`) for deep-linking

**Defer to v3.1 and v4+:**
- Interactive Workflow Diagram (lower urgency than Engagement Map; add when Engagement Map pattern is validated)
- Full per-tab gap scoring 1–5 with structured JSON output (upgrade after simple badge is shipping)
- Multiple template types (Enterprise, SMB, Renewal) — validate single canonical template first
- Live Okta integration (requires BigPanda IT coordination with a live Okta tenant)
- Persistent project chat history (session-scoped is sufficient to validate chat value)
- pgvector / RAG embeddings (anti-feature at current data scale — direct DB query is faster and more deterministic)

See [FEATURES.md](.planning/research/FEATURES.md) for full feature dependency graph, anti-feature rationale, and prioritization matrix.

### Architecture Approach

v3.0 is additive on the existing system. No existing tables require structural changes — the only new DB table is `users` (email, password_hash, role, active, okta_subject nullable). The `audit_log.actor_id` column already exists but was always null in single-user mode; it will now be populated from session. The pattern is: `middleware.ts` as a UX redirect gate (edge-safe, no bcrypt, no DB calls) plus `requireSession()` called at the top of every Route Handler as the actual security enforcement layer. Interactive visuals become React client components reading from existing DB tables — the HTML-generating skills are not modified and their outputs remain available in the Output Library.

**Major new components:**
1. `middleware.ts` — edge-safe cookie session gate; reads iron-session cookie, redirects unauthenticated users to /login; no bcrypt, no DB
2. `lib/auth.ts` + `lib/session.ts` + `lib/session-edge.ts` — split auth config isolating Node.js bcrypt operations from edge-safe session decryption
3. `app/api/chat/[id]/route.ts` + `lib/chat-context-builder.ts` — per-project chat endpoint using Vercel AI SDK `streamText`; DB snapshot approach (no vector search)
4. `app/api/context-hub/[id]/ingest/route.ts` + `apply/route.ts` — Claude routing call returning JSON preview, then transactional DB writes via existing `discoveryItems` infrastructure
5. `components/EngagementMapVisual.tsx` + `WorkflowDiagramVisual.tsx` — React client components; WorkflowDiagram uses React Flow with `dynamic()` + `ssr:false`
6. `lib/tab-template-registry.ts` — TypeScript registry of fixed section structure per tab type; version-controlled, type-safe, zero runtime overhead (no DB table needed)

See [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) for full component responsibility table, data flow diagrams, anti-patterns, and dependency-sequenced build order.

### Critical Pitfalls

1. **Middleware-only auth (CVE-2025-29927)** — Never treat `middleware.ts` as the sole auth enforcement point. Add `requireSession()` to every Route Handler and Server Action regardless of middleware. The app runs Next.js 16.2.0 (patched), but defense-in-depth is still mandatory. Block `x-middleware-subrequest` at the reverse proxy as a belt-and-suspenders measure.

2. **Okta-hostile user store** — Add `okta_subject` (nullable TEXT) to the `users` table in the initial migration. Implement `resolveRole(session)` as an abstraction accepting both credential and OIDC session shapes. Without these two decisions, adding Okta later requires a data migration and full session layer rewrite.

3. **Context Hub partial write failures** — All tab writes from a single document ingestion must be wrapped in a single PostgreSQL transaction. Implement idempotency via a UUID `ingestion_id` to prevent duplicate writes on re-upload. The Claude routing call (returns JSON preview) must be decoupled from the DB write phase (transactional apply step).

4. **Prompt injection via uploaded documents** — Wrap all extracted document content in `<document_content>...</document_content>` delimiters in the routing prompt. Validate all Claude routing output against a strict JSON schema before any DB write is triggered. Log routing outputs to `context_hub_events` before writes for post-hoc audit.

5. **React Flow hydration failure** — Any component using `@xyflow/react` or accessing browser APIs must be wrapped in `dynamic(() => import(...), { ssr: false })`. Never access `window`, `document`, or `ref.current` outside `useEffect`. Test with `next build && next start` — development mode does not surface all hydration errors.

See [PITFALLS.md](.planning/research/PITFALLS.md) for the full pitfall list including moderate risks, the security checklist, and the "looks done but isn't" verification checklist.

---

## Implications for Roadmap

The research's dependency graph is clear and unambiguous: auth is the prerequisite for chat, Context Hub, admin routing, and audit log attribution. Tab templates are independent and can be built in parallel with auth. Interactive visuals depend only on existing DB tables and React Flow. Chat depends on auth. Context Hub depends on auth and benefits significantly from templates being defined first (the completeness analysis needs the template section schema as its definition of "complete"). This produces five phases, with Phase 1 containing a parallelizable sub-track.

### Phase 1: Multi-User Auth Foundation
**Rationale:** Session context is required by audit log attribution, chat endpoint security, admin gating, and the `project_members` data access pattern. All 40+ existing Route Handlers need a `requireSession()` guard added — doing this as a cohesive phase is far safer than retrofitting it after other v3 features are written. The schema decisions here (okta_subject column, resolveRole abstraction) are one-time choices with permanent consequences.
**Delivers:** Working multi-user login, session management, admin role enforcement, Okta-ready architecture, audit log actor attribution, all existing routes session-protected, `/admin` user management panel.
**Addresses:** Credential login (table stakes), session persistence, role-enforced UI, admin dashboard, Okta-ready OIDC adapter.
**Avoids:** CVE-2025-29927 middleware bypass, cross-user data leakage from missing project_id user membership check, Okta-hostile integer-ID user store, edge runtime crash from importing bcrypt in middleware.

### Phase 1B: Tab Templates (Parallelize with Phase 1)
**Rationale:** Pure TypeScript registry — no new DB tables, no auth dependency, no API changes. Can be built and merged while Phase 1 is in review. Completing templates before Context Hub is important because the completeness analysis needs template section definitions to know what "complete" means per tab.
**Delivers:** `lib/tab-template-registry.ts` with fixed section structure for all 11 tab types; workspace tabs render sections per template; new project creation seeds template defaults.
**Addresses:** Template structure consistency, canonical empty-project structure, section definitions that unblock completeness analysis in Phase 5.
**Avoids:** Template retrofitting data loss — expand/contract pattern applies from the start rather than as a migration against live data.

### Phase 2: Interactive Visuals
**Rationale:** DB tables already exist from v2. Components are purely additive — no new tables, no auth dependency (read-only). Can begin immediately after Phase 1 merges. The Engagement Map is the highest user-visible differentiator in the visual category and validates the React client component architecture early.
**Delivers:** `EngagementMapVisual.tsx` (inline SVG, clickable nodes with drill-down modal), `WorkflowDiagramVisual.tsx` (React Flow + dagre layout), both wired into the architecture and overview/teams tabs.
**Uses:** `@xyflow/react@12.10.2`, `@dagrejs/dagre`, `dynamic()` + `ssr:false` pattern for all browser-API-dependent components.
**Avoids:** React Flow hydration failure (dynamic import required), bundle size impact on initial page load (dynamic import defers 90kb gzipped to on-demand load).

### Phase 3: Per-Project Chat
**Rationale:** Chat endpoint requires session protection (Phase 1 completed). Straightforward to implement once auth is in place. Structured DB-query context injection is the correct architecture — no pgvector needed. Streaming must be built in from day one, not added as an optimization.
**Delivers:** `/customer/[id]/chat` workspace tab, `/api/chat/[id]` streaming endpoint, `lib/chat-context-builder.ts` DB snapshot utility, multi-turn session-scoped conversation with typing indicator.
**Implements:** Per-project DB-query RAG chat (Pattern 2 from ARCHITECTURE.md) — Vercel AI SDK `streamText` + `useChat`, no vector embeddings.
**Avoids:** Cross-project data leakage in chat responses (DAL wrapper + project-scoped queries only), non-streamed 15-second wait (critical UX failure), raw Anthropic SDK in chat endpoint (breaks `useChat` Vercel data stream protocol).

### Phase 4: Context Hub
**Rationale:** Most complex feature with the most failure modes. Requires auth (Phase 1). Benefits from tab templates being defined (Phase 1B) since completeness analysis checks against template sections. The `discovery_items` approval workflow infrastructure is already in place from v2. Building this last ensures all prior infrastructure is stable and the team has proven the Claude API integration patterns in Phase 3.
**Delivers:** `/customer/[id]/context-hub` workspace tab, document upload + AI routing + approve/reject flow, per-tab completeness badge, Context Hub and Chat added to WorkspaceTabs navigation.
**Implements:** Claude as content router (Pattern 3 from ARCHITECTURE.md) — two-step ingest/apply API, single-transaction multi-tab writes, idempotent uploads via ingestion_id, reuse of existing `discoveryItems` infrastructure.
**Avoids:** Context Hub partial write failures (single PostgreSQL transaction), prompt injection via document content (delimiter wrapping + JSON schema validation), duplicate writes on re-upload (idempotency key).

### Phase Ordering Rationale

- Auth comes first because `requireSession()` guards must be in place before any authenticated feature is added; retrofitting 40+ route handlers after the fact is high-risk and tedious
- Templates are parallel to auth because they have zero auth dependency and no external library requirements; completing them before Context Hub is a meaningful ordering advantage
- Interactive visuals before chat because they are lower complexity, purely read-only, and validate the React client component architecture early
- Chat before Context Hub because chat proves the Claude API integration pattern for the new use case and is substantially lower risk
- Context Hub last because it has the highest number of distinct failure modes and benefits from all prior infrastructure being proven stable

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Auth):** Verify the specific better-auth + iron-session coexistence pattern — ARCHITECTURE.md specifies iron-session for sessions while STACK.md recommends better-auth's built-in session layer; this tension must be resolved before implementation begins (recommendation: use better-auth's built-in session management, not iron-session independently)
- **Phase 4 (Context Hub):** Claude routing prompt engineering for tab classification has no standard pattern — the routing prompt design (mapping extracted entities to 11 different tab schemas, handling low-confidence cases) requires iteration and testing on real BigPanda document types before the production implementation is written

Phases with standard patterns (can skip research-phase):
- **Phase 1B (Templates):** TypeScript registry pattern is trivial; no external libraries; no research needed
- **Phase 2 (Interactive Visuals):** React Flow official examples cover the exact patterns needed; `ssr:false` dynamic import is well-documented
- **Phase 3 (Chat):** Vercel AI SDK RAG guide covers the exact `streamText` + `useChat` + DB context pattern end-to-end

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All npm versions verified live on 2026-03-30; Next.js 16 / React 19 compatibility confirmed for all additions; pgvector deferral is a justified judgment call |
| Features | MEDIUM-HIGH | Grounded in PROJECT.md (canonical spec) and 2026 web research; feature prioritization is well-reasoned but not validated against actual user behavior in production |
| Architecture | HIGH | Official Next.js auth guide, official Vercel AI SDK docs, official React Flow docs; patterns are established; the better-auth vs iron-session tension is the one open question |
| Pitfalls | HIGH | CVE-2025-29927 is a documented real-world vulnerability; all critical pitfalls verified from official sources or established PostgreSQL/Next.js SSR behavior |

**Overall confidence:** HIGH

### Gaps to Address

- **better-auth vs iron-session session layer:** ARCHITECTURE.md specifies iron-session for session management; STACK.md recommends better-auth which has its own built-in session layer. Resolve in Phase 1 planning: use better-auth's built-in session management as the single session system (recommended) and do not run both in parallel. Update implementation notes accordingly.
- **Context Hub completeness scoring trigger:** Research leaves open whether completeness analysis is triggered on-demand (simpler for v3.0) or on a BullMQ schedule (richer but more complex). Decide before Phase 4 implementation — the BullMQ infrastructure exists and either option is viable; on-demand is recommended for v3.0.
- **Teams and Architecture sub-tab content definitions:** Sub-tabs for Teams (ADR track vs Biggy track) and Architecture (Before-state vs Integration status) are called out in research but the exact section labels and content definitions need validation with the PS lead before Phase 1B locks the template registry.
- **pgvector postgres.js integration:** Not a v3.0 concern, but if vector search is ever added, the `pgvector` npm package primarily documents `node-postgres` (pg) integration patterns; the app uses `postgres.js`. Raw SQL via Drizzle's `sql` tag is the confirmed fallback: `sql\`embedding <=> ${queryVector}::vector\``.

---

## Sources

### Primary (HIGH confidence)
- [PROJECT.md](../../PROJECT.md) — canonical feature specification and v3.0 scope
- [Next.js Official Auth Guide](https://nextjs.org/docs/app/guides/authentication) — iron-session pattern, session management
- [Vercel AI SDK — Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) — `streamText` + `useChat` integration
- [Vercel AI SDK RAG Guide](https://sdk.vercel.ai/docs/guides/rag-chatbot) — DB-backed context approach
- [React Flow Dagre Example](https://reactflow.dev/examples/layout/dagre) — `@xyflow/react` + dagre layout patterns
- [better-auth official docs — Next.js integration](https://better-auth.com/docs/integrations/next) — Next.js 16 proxy.ts pattern
- [CVE-2025-29927 advisory](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) — middleware auth bypass; defense-in-depth requirement
- [Auth.js Protecting Routes](https://authjs.dev/getting-started/session-management/protecting) — DAL pattern documentation
- [Anthropic embeddings docs](https://docs.claude.com/en/docs/build-with-claude/embeddings) — Voyage AI official recommendation (context for deferral decision)
- Live npm version checks (2026-03-30): `better-auth@1.5.6`, `@xyflow/react@12.10.2`, `ai@6.0.141`, `@ai-sdk/anthropic@3.0.64`, `@ai-sdk/react@3.0.143`, `voyageai@0.2.1`, `pgvector@0.2.1`

### Secondary (MEDIUM confidence)
- [PkgPulse auth comparison 2026](https://www.pkgpulse.com/blog/best-nextjs-auth-solutions-2026) — auth ecosystem survey
- [RAG with PostgreSQL — pgDash](https://pgdash.io/blog/rag-with-postgresql.html) — structured DB query approach sufficient at small scale
- [Mermaid.js interactive flowcharts](https://haridornala.medium.com/building-interactive-flowcharts-with-mermaid-js-and-javascript-57ec27cdc63d) — click handler patterns for Workflow Diagram alternative
- [AI document quality gap detection — Docsie 2026](https://www.docsie.io/blog/articles/ai-document-comparison-tool-2026/) — per-section scoring patterns for Context Hub
- [Why 95% of RAG Apps Leak Data Across Users — Medium](https://medium.com/@pswaraj0614/why-95-of-rag-apps-leak-data-across-users-and-how-i-fixed-it-0e9ded006a8c) — cross-project data scoping failure modes
- [Next.js Security Best Practices 2026 — Authgear](https://www.authgear.com/post/nextjs-security-best-practices) — defense-in-depth patterns

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
