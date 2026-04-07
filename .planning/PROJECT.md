# BigPanda AI Project Management App

## What This Is

An AI-native project management platform purpose-built for BigPanda's Professional Services delivery team. Replaces the manual workflow of running individual Cowork skills with a unified, persistent multi-user application where every customer project lives, every action is tracked, every communication is synthesized automatically, and every deliverable can be generated in one click from a live database. Supports n active customer accounts with full lifecycle management. Includes multi-user auth with role-based access, AI chat grounded in live project data, document ingestion routing to the right workspace tabs, completeness analysis, interactive org charts and workflow diagrams, and a fully templated tab structure.

## Core Value

Every PS delivery intelligence the team has built — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## Requirements

### Validated

<!-- v1.0 — Foundation + Read/Write Surface + Skills + MCP + Cross-Project (2026-03-26) -->
- ✓ PostgreSQL database with full domain schema — v1.0 Phase 1
- ✓ Next.js app shell with Dashboard + 9 workspace tabs (read + write) — v1.0 Phases 2, 3
- ✓ Project Plan & Task Builder (Phase Board, Task Board, Gantt, swimlane) — v1.0 Phase 3
- ✓ BullMQ job infrastructure with Redis — v1.0 Phase 4
- ✓ Skill Engine: 15 skills with SSE streaming, Drafts Inbox, Output Library — v1.0 Phases 5, 7
- ✓ Onboarding Dashboard tab (onboarding_phases/steps/integrations) — v1.0 Phase 5.1
- ✓ Time Tracking tab (basic entry, CSV export) — v1.0 Phase 5.2
- ✓ MCP integrations: Slack, Gmail, Glean, Drive — v1.0 Phase 6
- ✓ File generation service (.docx, .pptx, .xlsx, .html) — v1.0 Phase 7
- ✓ Cross-project features: FTS, risk heat map, watch list, Knowledge Base — v1.0 Phase 8
- ✓ Time & project analytics: rollups, velocity, risk trends, capacity view — v1.0 Phase 14
- ✓ Scheduler with cron registration and skill resolver — v1.0 Phases 4, 15

<!-- v2.0 — AI Ingestion & Enhanced Operations (2026-03-30) -->
- ✓ DB schema extensions: workstreams, onboarding_steps, integrations, discovery_items, audit_log, enhanced artifacts/time_entries/scheduled_jobs — v2.0 Phase 17
- ✓ Document ingestion: PDF/DOCX/PPTX upload, Claude extraction, entity routing to workspace tabs — v2.0 Phase 18
- ✓ External discovery scan: Google/Slack/Drive sweep, review queue, approve/dismiss workflow — v2.0 Phase 19
- ✓ Project initiation wizard: multi-step project creation with template seeding — v2.0 Phase 20
- ✓ Teams + Architecture tabs with full CRUD and onboarding velocity tracking — v2.0 Phase 21
- ✓ Source attribution badges (Manual/Ingested/Discovered) across all workspace tab records — v2.0 Phase 22
- ✓ Audit log: system-wide trail of all data modifications with before/after values — v2.0 Phase 22
- ✓ Time tracking advanced: approval workflow, Google Calendar import, bulk actions, admin config — v2.0 Phase 23
- ✓ Scheduler enhanced: full configurable job UI, run history, admin view, all 12 skills schedulable — v2.0 Phase 24

<!-- v3.0 — Collaboration & Intelligence (2026-04-01) -->
- ✓ Multi-user auth: better-auth sessions, admin/user roles, route guards on 40+ handlers, email invite flow, Okta-ready architecture — v3.0 Phase 26
- ✓ UI overhaul: sub-tab navigation, SubTabBar component, hybrid URL pattern preserving existing routes — v3.0 Phase 27
- ✓ TypeScript template registry: fixed required section structure per tab, enforced at type level — v3.0 Phase 27 (UI-03)
- ✓ New project seeding: template placeholder content in all applicable tabs on creation — v3.0 Phase 27 (UI-04)
- ✓ Interactive visuals: React Flow org charts and workflow diagrams with Dagre auto-layout, ssr:false — v3.0 Phase 28 (VIS-01)
- ✓ Project chat: Vercel AI SDK streaming, live DB context grounding, anti-hallucination XML wrapping — v3.0 Phase 29 (CHAT-01–04)
- ✓ Context Hub: document upload tab, AI routing to 3 new entity types, upload history, completeness analysis with per-tab gap descriptions — v3.0 Phase 30 (CTX-01–04)

<!-- v4.0 — Infrastructure & UX Foundations (2026-04-03) -->
- ✓ Document extraction moved to BullMQ background job — browser-refresh resilient, 11 UAT bugs fixed — v4.0 Phase 31 (EXTR-01–03)
- ✓ Time tracking redesigned as standalone global /time-tracking section with cross-project view — v4.0 Phase 32 (TIME-01–03)
- ✓ Overview tab workstream structure: ADR/Biggy dual-track, DB migration, auto-seeding on project create — v4.0 Phase 33 (WORK-01–02)
- ✓ Overview metrics & health dashboard: Recharts visualizations, OverviewMetrics, HealthDashboard, MilestoneTimeline — v4.0 Phase 34 (METR-01, HLTH-01, TMLN-01)
- ✓ Weekly Focus AI priorities via BullMQ + Redis, integration tracker split by ADR/Biggy workstream — v4.0 Phase 35 (WKFO-01–02, OINT-01)

<!-- v5.0 — Workspace UX Overhaul (2026-04-07) -->
- ✓ Actions tab converted to table layout with inline editing — no modal required for common updates — v5.0 Phase 37
- ✓ Risks and Milestones inline editing with status enums replacing freeform text fields — v5.0 Phase 37
- ✓ Date pickers and owner autocomplete (from stakeholders) across all entity edit surfaces — v5.0 Phase 37
- ✓ Gantt: milestone markers, view mode switcher, task grouping by milestone, drag-to-reschedule — v5.0 Phase 38
- ✓ Cross-tab data sync: edits refresh Overview metrics in-place; clickable chart drill-downs to filtered tab views — v5.0 Phase 39
- ✓ Plan tab: overdue task highlighting, bulk-action wiring now functional — v5.0 Phase 39
- ✓ Global search bar across all project data (FTS API wired to workspace header) — v5.0 Phase 40
- ✓ Decisions tab filtering and search; Actions tab text search — v5.0 Phases 37, 40
- ✓ Artifact detail reverse lookup: lists all entities extracted from that artifact with links — v5.0 Phase 40
- ✓ Engagement History auto-logs from audit log — no manual curation required — v5.0 Phase 40
- ✓ Skills tab: elapsed time, progress indicator, and cancel button for running jobs — v5.0 Phase 40
- ✓ Consistent empty states with CTAs; overdue highlighting unified across Actions/Milestones/Tasks — v5.0 Phase 41
- ✓ Full ingestion field coverage: task dates/FKs/priority, milestone owner, action notes/type, cross-entity ID resolution — v5.0 Phase 42

### Active

<!-- v6.0 — Dashboard, Navigation, Parity, WBS, Team Engagement, Architecture, Skills Portability -->
- [ ] **DASH-01–06**: Portfolio dashboard — health summary, status chart, multi-project table with filtering/sort/search, exceptions panel, drill-down
- [ ] **NAV-01–05**: Tab restructure — Plan first in Delivery, WBS/Task Board/Gantt promoted to top level, Swimlane removed, Decisions → Delivery, Intel removed, Engagement History → Admin
- [ ] **RISK-01–02**: Risks parity with Actions — multi-dimension filtering, multi-select bulk actions
- [ ] **MILE-01–02**: Milestones parity with Actions — multi-dimension filtering, multi-select bulk actions
- [ ] **WBS-01–05**: Phase Board → WBS — both ADR + Biggy templates, collapsible hierarchy, context-upload auto-classify, Generate Plan gap-fill, manual edit
- [ ] **TEAM-01–04**: Team Engagement Overview — 5-section engagement map, context-upload extraction, missing-data warnings, manual edit
- [ ] **ARCH-01–04**: Architecture tab update — Before State + Current & Future State two-tab diagram, ADR + AI tracks, onboarding status table, context-upload extraction
- [ ] **SKILL-01**: Skills portability — dynamic SKILL.md path resolution (no hardcoded paths)

### Out of Scope

- Customer-facing read-only portal — email updates sufficient; external access deferred
- QBR deck generator — external ELT deck covers the need
- Microsoft Outlook Calendar integration — permanently excluded (BRD explicit exclusion)
- Custom role builder — post-launch (BRD explicit exclusion)
- Approver hierarchy (TT-205) — deferred; single approver sufficient for v3.0
- pgvector/RAG knowledge base — structured DB query context injection is correct at single-project scope; reconsider only if cross-project knowledge base search becomes a requirement
- BullMQ-scheduled completeness trigger — on-demand is correct for v3.0; scheduled option deferred to v5.0 (infrastructure exists)

## Context

v5.0 shipped 2026-04-07. Full stack: Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, @anthropic-ai/sdk, Recharts, frappe-gantt (replaced by custom GanttChart.tsx in v5.0). 42 phases, 233 plans completed across v1.0–v5.0. ~42,385 LOC TypeScript. Test suite: ~370 passing, 6 pre-existing failures remain (deferred to v6.0). Production build clean.

v5.0 delivered: full inline editing across all entity types, custom split-panel Gantt with milestone markers and drag-reschedule, cross-tab metrics sync via CustomEvent, global search bar, artifact reverse lookup, audit-driven engagement history, Skills job progress/cancel, consistent empty states, loading skeletons, overdue highlighting, and complete ingestion field coverage with cross-entity ID resolution. Test fixes (Phase 36) and empty state CTA wiring remain as v6.0 work.

This is a full rewrite of a previous Claude Code project assistant build (8 phases, React/Vite/Express/Google Drive architecture). SKILL.md files read from disk at runtime (not bundled). All data model patterns (archive-on-replace, dual-write atomicity, append-only history, source tracing, ID conventions) preserved from the original skill ecosystem.

## Constraints

- **Tech Stack**: Next.js 16 / React / Tailwind CSS / Node.js / PostgreSQL
- **Skill Fidelity**: SKILL.md files read from disk at runtime; prompts must not be modified
- **Cowork Compatibility**: Exported context docs and action tracker must be readable by all Cowork skills without modification
- **ID Conventions**: Action IDs: A-[CUSTOMER]-NNN, Risk IDs: R-[CUSTOMER]-NNN, Milestone IDs: M-[CUSTOMER]-NNN — globally unique, never reused
- **Append-only**: Engagement History and Key Decisions are never modified, only added to
- **Source Tracing**: Every action, risk, artifact, and decision must carry source_trace
- **Tone Separation**: Customer-facing outputs calm/partnership-framed; internal outputs direct/analytical
- **No Invented Data**: AI agents must never invent percentages, dates, or facts — all numbers from DB
- **Auth Security**: requireSession() at Route Handler level is the security boundary (not middleware alone — CVE-2025-29927 defense-in-depth)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full rewrite (not evolution of existing app) | Next.js + PostgreSQL is fundamentally different from React/Vite/Express/Drive | ✓ Correct — clean architecture, no legacy baggage |
| SKILL.md files read from disk at runtime | Always current, no bundling drift, compatible with Cowork updates | ✓ Correct — skills updated independently of app |
| Auto-derive health scoring (not manual) | Removes human inconsistency; flags disagreement between data signals and gut feel | ✓ Correct — implemented in Phase 2 |
| n-account architecture (not hardcoded 3) | Business will grow; new PS engagements must be addable without code changes | ✓ Correct — fully data-driven |
| Closed projects → archive (read-only) | Lessons learned and engagement history must remain searchable after project close | ✓ Correct |
| better-auth@1.5.6 for session management | Native SAML 2.0 plugin, Next.js 16 proxy.ts support; install with --legacy-peer-deps | ✓ Good — worked cleanly; disableSignUp:true blocks public registration |
| requireSession() at Route Handler level | CVE-2025-29927: Next.js middleware can be bypassed; defense-in-depth mandatory | ✓ Correct — 40+ handlers all guarded |
| Vercel AI SDK for chat (not raw Anthropic SDK) | toUIMessageStreamResponse + useChat handles SSE stream assembly; coexists with @anthropic-ai/sdk | ✓ Good — clean streaming, no conflicts |
| XML-wrapped project context in chat prompt | Prompt injection defense; <project_data> tags clearly delimit trusted vs untrusted content | ✓ Correct — temperature 0.3 for anti-hallucination |
| pgvector/RAG deferred | Structured DB query context injection is correct at single-project scope; faster, more deterministic | ✓ Correct — no need emerged in v3.0 |
| On-demand completeness trigger (not scheduled) | Simpler to validate for v3.0; BullMQ infrastructure exists if scheduled needed later | ✓ Correct — on-demand works well |
| React Flow with dynamic import + ssr:false | @xyflow/react uses DOM APIs unavailable in Node.js SSR; dynamic import prevents hydration errors | ✓ Correct — Dagre auto-layout works cleanly |
| SSE stream for document extraction (v3.0) | Simpler to implement; acceptable for most documents | ✓ Resolved — BullMQ background job + polling UI shipped in v4.0 Phase 31 |
| BullMQ job + polling for extraction (v4.0) | Browser-refresh resilient; background worker decoupled from HTTP request lifecycle | ✓ Correct — 11 UAT bugs fixed; extraction completes even with browser navigate-away |
| Global /time-tracking section (v4.0) | Cross-project time visibility is more valuable than per-project tabs; consistent with how users review time | ✓ Correct — cleaner navigation, project attribution via filter |
| Recharts for Overview visualizations | Built-in responsive design, direct React integration, no D3 complexity for simple bar/progress charts | ✓ Good — ProgressRing, PieChart, custom charts all rendered without SSR issues |
| Advisory lock + Redis cache for weekly-focus job | Prevents duplicate LLM calls when multiple workers run; 7-day TTL balances freshness with cost | ✓ Correct — single Claude call per project per week; on-demand trigger works cleanly |
| Phase 36 test fixes deferred to v6.0 | All 6 failures are mock setup issues (leftJoin, db.transaction, db.query mocks) — low production impact; v5.0 UX work is higher priority | — Pending |
| frappe-gantt replaced with custom GanttChart.tsx (v5.0) | frappe-gantt SVG injection approach couldn't support milestone markers + swim lanes cleanly; custom split-panel React component gives full control | ✓ Correct — milestone markers, drag-reschedule, view modes all implemented natively |
| CustomEvent (metrics:invalidate) for cross-tab sync (v5.0) | No external state library needed; browser-native event bus sufficient for same-tab communication between client islands | ✓ Correct — zero extra dependencies, clean dispatch/listen pattern |
| Client-side filtering pattern for table clients (v5.0) | Server Component passes full data; client filters in-memory using URL params — consistent with ActionsTableClient, RisksTableClient, DecisionsTableClient | ✓ Correct — no extra API calls for filter changes |
| Empty state CTA onClick handlers deferred as () => {} (v5.0) | Wiring to creation modals is low-risk and deferred; empty state component structure is correct | — Pending v6.0 |

## Current Milestone: v6.0 — Dashboard, Navigation & Intelligence

**Goal:** Upgrade the portfolio dashboard, restructure navigation, achieve parity across Risks/Milestones, replace Phase Board with AI-driven WBS, and enhance Team Engagement and Architecture views with context-upload extraction.

**Target features:**
- Portfolio-level dashboard with health summary, exceptions panel, and multi-project table
- Delivery tab restructure: Plan first, WBS/Gantt/Task Board at top level, Swimlane removed, Decisions moved in
- Risks and Milestones match Actions tab (filtering, multi-select, bulk actions)
- Phase Board replaced with dual-template WBS (ADR + Biggy) with AI auto-classify and Generate Plan
- Team Engagement Overview: 5-section map auto-populated from context uploads
- Architecture tab: Before State + Current & Future State two-tab visual diagram auto-populated from context
- Skills portability: dynamic SKILL.md path resolution

---
*Last updated: 2026-04-07 after v6.0 milestone started*
