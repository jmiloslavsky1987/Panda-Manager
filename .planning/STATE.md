---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — AI Ingestion & Enhanced Operations
status: verifying
last_updated: "2026-03-31T06:41:30.900Z"
last_activity: "2026-03-31 — 26-05: /api/settings/users CRUD route, UsersTab inline form, Settings Users tab; checkpoint human-verify pending"
progress:
  total_phases: 33
  completed_phases: 29
  total_plans: 163
  completed_plans: 161
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

## Current Status

**Phase:** Phase 26 — Multi-User Auth — In Progress
**Plan:** 26-05 Tasks 1-2 complete; at checkpoint Task 3 (human-verify)
**Status:** Plans 26-01 through 26-05 Tasks 1-2 complete; /api/settings/users route + UsersTab + Settings page update done; awaiting human verification of complete Phase 26 auth system
**Last activity:** 2026-03-31 — 26-05: /api/settings/users CRUD route, UsersTab inline form, Settings Users tab; checkpoint human-verify pending

**Core value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.
**Current focus:** v3.0 milestone starting. Phase 26 (Multi-User Auth) is the entry point — all other v3.0 phases depend on session infrastructure.

## Milestone History

- **v1.0** — Foundation + Read/Write Surface + Skills + MCP + Cross-Project (Phases 1–16, complete 2026-03-26)
- **v2.0** — AI Ingestion & Enhanced Operations (Phases 17–25, complete 2026-03-30)
- **v3.0** — Collaboration & Intelligence (Phases 26–30, roadmap created 2026-03-30)

## Phase Progress (v3.0)

| Phase | Status |
|-------|--------|
| 26. Multi-User Auth | Not started |
| 27. UI Overhaul + Templates | Not started |
| 28. Interactive Visuals | Not started |
| 29. Project Chat | Not started |
| 30. Context Hub | Not started |

## Active Work

v3.0 roadmap created 2026-03-30. 17/17 v3.0 requirements mapped across 5 new phases (26–30).

Execution order: 26 → 27 → 28/29 (parallel after 26) → 30

Phase 26 is the mandatory entry point — session infrastructure must exist before any authenticated feature is added. All 40+ existing Route Handlers need requireSession() guards added in this phase.

## Decisions

- **[2026-03-30] v3.0 roadmap:** Phase numbering starts at 26 — Phase 25 was used for v2.0 gap closure (Wizard Fix + Audit Completion)
- **[2026-03-30] v3.0 roadmap:** Phases 28 and 29 can run in parallel after Phase 26 — Interactive Visuals have no chat dependency; Chat has no visuals dependency; both depend only on Auth
- **[2026-03-30] v3.0 roadmap:** Phase 30 (Context Hub) placed last — highest number of distinct failure modes; benefits from templates (Phase 27) being locked before completeness analysis is built; benefits from Claude API patterns proven in Phase 29 (Chat)
- **[2026-03-30] v3.0 roadmap:** pgvector/RAG deferred — structured DB query context injection is correct at single-project scope; faster, more deterministic, no new infrastructure; reconsider only if cross-project knowledge base search becomes a requirement
- **[2026-03-30] v3.0 roadmap:** Context Hub completeness trigger = on-demand for v3.0; BullMQ-scheduled option deferred to v3.1 (infrastructure exists but on-demand simpler to validate)
- **[2026-03-30] v3.0 roadmap:** better-auth vs iron-session to be resolved in Phase 26 planning — recommendation: use better-auth's built-in session management as the single system; do not run both in parallel
- [Phase 26]: better-auth install requires --legacy-peer-deps due to Next.js 16 peer dep mismatch
- [Phase 26]: Wave 0 stub pattern: const target: any = undefined; expect(target).toBeDefined() — fails RED without brittle import errors on missing modules
- [Phase 26-multi-user-auth]: 26-02: Manual psql migration required for 0020_users_auth — drizzle-kit journal mismatch from prior manually-applied migrations; restore journal and run psql -f for auth tables
- [Phase 26-multi-user-auth]: 26-02: cookieCache omitted from lib/auth.ts (known bug #7008 with Next.js App Router RSC); disableSignUp:true — no self-registration
- [Phase 26-multi-user-auth]: 26-03: proxy.ts (not middleware.ts) — Next.js 16 convention; getSessionCookie() for UX redirect only; requireSession() in route handlers is the actual security boundary
- [Phase 26-multi-user-auth]: 26-03: OAuth callback routes still guarded by requireSession() — OAuth tokens are per-app not per-user in v3.0
- [Phase 26-multi-user-auth]: 26-04: AppChrome uses server component composition (children prop) — Sidebar is async/DB-fetch; direct import into client component breaks server execution
- [Phase 26-multi-user-auth]: 26-04: auth.api.signUpEmail() used for setup bootstrap — createUser does not exist in better-auth API; disableSignUp blocks public endpoint only
- [Phase 26]: Password reset via bcryptjs direct accounts table update (no better-auth setUserPassword API in v1.5.6)
- [Phase 26]: auth.api.signUpEmail() body cast to any for role additionalField — TS type doesn't include role in signUpEmail signature
- [Phase 26]: Non-null assertions on session! after requireSession() — TS cannot narrow discriminated union through if-return guards
- [Phase 27]: Use satisfies Record pattern for TypeScript-enforced exhaustive tab type coverage
- [Phase 27]: Hybrid URL pattern (pathname + searchParams) preserves existing route segments with zero migration risk
- [Phase 27]: SubTabBar component extracts secondary tab row for clean separation of concerns
- [Phase 27-ui-overhaul-templates]: Wave 0 stubs use undefined + toBeDefined() pattern to fail RED without import crashes
- [Phase 27-ui-overhaul-templates]: next/navigation mock defined inline in each test file (explicit vi.mock() call) for clarity

## Previous Milestone Decisions (v2.0)

- **[2026-03-30] 24-05:** ioredis/bullmq TS2322 type conflict resolved with `as any` cast in 6 files — bullmq v5 bundles its own ioredis; runtime unaffected; 48/48 scheduler tests GREEN; awaiting human browser verification before SCHED-01-12 marked complete
- **[2026-03-27] 23-08:** Phase 23 COMPLETE — all 19 TTADV requirements verified in-browser; 41/41 TDD tests passing; migration 0018 required manual psql -f (not auto-applied); Google Calendar OAuth UI verified but full auth flow needs Google Cloud Console setup; Phase 24 can proceed
- **[2026-03-27] 22-05:** Phase 22 COMPLETE — all three AUDIT requirements verified in-browser and via direct DB query; no issues found; Phases 23 and 24 can proceed in parallel
- **[2026-03-25] v2.0 roadmap:** Phases 18 and 19 (Document Ingestion and External Discovery) assigned to parallel wave after Phase 17 — both depend only on Schema, not on each other
- **[2026-03-25] v2.0 roadmap:** TEAMS and ARCH grouped into single Phase 21 — share data model and deliver complementary views together
- **[2026-03-25] v2.0 roadmap:** AUDIT (Phase 22) placed after Phases 18/19 — source badges are only meaningful once ingestion and discovery are operational
- **[2026-03-26] 18-06:** SSE event type alignment: extract route emits type:'complete'; IngestionModal must listen for 'complete' not 'item' — primary end-to-end blocker
- **[2026-03-26] 18-06:** max_tokens 8192→16384 in extract route — dense documents silently truncated at lower limit with no visible error
- **[2026-03-26] 19.1-07:** server-only mock required in vitest.config.ts — Next.js server-only package throws at import time in vitest context; mapping to empty stub unblocks all 26 adapter test files
- **[2026-03-26] 17-01:** Wave 0 RED pattern: import 15 unexported names from schema.ts — Vitest resolves them as undefined; toBeDefined() fails RED — valid TDD starting point for Phase 17 schema additions

## Accumulated Technical Context

### Auth Implementation Notes (for Phase 26 planning)
- CVE-2025-29927 (CVSS 9.1): Next.js middleware auth bypass via x-middleware-subrequest header. Defense-in-depth mandatory: requireSession() at Route Handler level, not only middleware.
- better-auth@1.5.6 is preferred over Auth.js v5 — native SAML 2.0 plugin, Next.js 16 proxy.ts supported; use --legacy-peer-deps if peer dep version mismatch on install
- bcryptjs@^2.x + @types/bcryptjs: password hashing — pure JS, no native bindings, safe in all Next.js runtimes including Edge
- Split auth config required: lib/auth.ts (Node.js, can use bcrypt) vs lib/session-edge.ts (edge-safe, no bcrypt) — middleware uses edge-safe version only
- users table must include: email, password_hash, role, active (boolean), external_id (nullable TEXT for Okta), created_at
- resolveRole(session) abstraction must accept both credential session shape and future OIDC session shape

### Chat Implementation Notes (for Phase 29 planning)
- ai@6.0.141 + @ai-sdk/anthropic@3.0.64 + @ai-sdk/react@3.0.143: Vercel AI SDK for chat only; coexists with raw @anthropic-ai/sdk without conflict
- useChat hook handles SSE stream assembly in browser; streamText + toDataStreamResponse() in the Route Handler
- lib/chat-context-builder.ts: DB snapshot approach — query all project records, serialize to 2000–4000 token context payload; no vector search needed
- Cross-project data leakage prevention: DAL wrapper + project-scoped queries only; project_id filter mandatory on every DB call in chat context builder

### Interactive Visuals Notes (for Phase 28 planning)
- @xyflow/react@12.10.2: requires dynamic(() => import(...), { ssr: false }) in ALL parent components — never import directly
- Test with `next build && next start` — development mode does not surface all hydration errors
- Dagre layout (@dagrejs/dagre) for auto-positioning; no manual node coordinate specification needed

### Context Hub Notes (for Phase 30 planning)
- Two-phase API: POST /api/context-hub/[id]/ingest (Claude routing call, returns JSON preview) → POST /api/context-hub/[id]/apply (transactional DB writes)
- All tab writes from one document must be wrapped in a single PostgreSQL transaction; idempotency via UUID ingestion_id
- Wrap all extracted document content in <document_content>...</document_content> delimiters in routing prompt — prompt injection defense
- Validate all Claude routing output against strict JSON schema before any DB write is triggered
- discovery_items approval workflow infrastructure from Phase 18/19 is reusable for approve/reject flow
- Completeness analysis: on-demand trigger (not BullMQ-scheduled) for v3.0; checks live DB against template section definitions from Phase 27
