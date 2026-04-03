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

### Active

<!-- v4.0 — Infrastructure & UX Foundations — COMPLETE except Phase 36 (deferred) -->
- ✓ Move document extraction to BullMQ background job — v4.0 Phase 31
- ✓ Time tracking as standalone global top-level section — v4.0 Phase 32
- ✓ Overview tab overhaul: workstream separation, metrics, health dashboard, weekly focus, integration tracker — v4.0 Phases 33–35
- [ ] Fix 6 remaining test failures (create-project, launch, extraction-status mocks) — deferred to v6.0

<!-- v5.0 — Workspace UX Overhaul (2026-04-03) -->
- [ ] Actions tab converted to table layout with inline editing (no modal required for common updates)
- [ ] Risks and Milestones tables gain inline editing with status enums replacing freeform text fields
- [ ] Date pickers and owner autocomplete (from stakeholders) across all entity edit surfaces
- [ ] Gantt: milestone markers, view mode switcher, task grouping by milestone, drag-to-reschedule
- [ ] Cross-tab data sync: edits to risks/actions/milestones refresh Overview metrics in-place; clickable chart drill-downs
- [ ] Plan tab: overdue task highlighting, bulk-action wiring, milestone grouping visible in board views
- [ ] Global search bar across all project data (FTS API already exists, needs UI)
- [ ] Decisions tab filtering and search; Actions tab text search
- [ ] Artifact detail reverse lookup: show all entities extracted from that artifact
- [ ] Engagement History auto-logs from audit log when entities are edited
- [ ] Skills tab: progress/ETA indicator and cancel button for running jobs
- [ ] Consistent empty states with CTAs; overdue highlighting unified across Actions/Milestones/Tasks

### Out of Scope

- Customer-facing read-only portal — email updates sufficient; external access deferred
- QBR deck generator — external ELT deck covers the need
- Microsoft Outlook Calendar integration — permanently excluded (BRD explicit exclusion)
- Custom role builder — post-launch (BRD explicit exclusion)
- Approver hierarchy (TT-205) — deferred; single approver sufficient for v3.0
- pgvector/RAG knowledge base — structured DB query context injection is correct at single-project scope; reconsider only if cross-project knowledge base search becomes a requirement
- BullMQ-scheduled completeness trigger — on-demand is correct for v3.0; scheduled option deferred to v5.0 (infrastructure exists)

## Context

v3.0 shipped 2026-04-01. Full stack: Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, @anthropic-ai/sdk. 30 phases, 178 plans completed across v1.0–v3.0. Test suite: 363 passing, 13 pre-existing failures (tracked as todo). Production build clean.

v4.0 starts 2026-04-01 — Infrastructure & UX Foundations. Focus: resolving accumulated test debt, moving extraction to BullMQ, time tracking redesign, and Overview tab overhaul with ADR/Biggy workstream separation per documented requirements.

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
| SSE stream for document extraction (v3.0) | Simpler to implement; acceptable for most documents | ⚠️ Revisit — large docs (>50KB) take 4–6 min; browser refresh kills extraction; BullMQ todo captured |

## Current Milestone: v4.0 Infrastructure & UX Foundations

**Goal:** Resolve accumulated technical debt and deliver two significant UX redesigns: time tracking as a standalone top-level section and a fully overhauled Overview tab with ADR/Biggy workstream structure.

**Target features:**
- Fix 13 pre-existing test failures across 6 test files
- Move document extraction to BullMQ background job
- Redesign time tracking as standalone top-level section
- Overview tab overhaul per v4.0 requirements (ADR/Biggy phase models, metrics, health dashboard, visual timeline)

## Current Milestone: v5.0 Workspace UX Overhaul

**Goal:** Replace modal-heavy, siloed tab UX with inline-editable tables, cross-tab data sync, a working Gantt with milestones, and consistent patterns across every view.

**Target features:**
- Actions table layout + inline editing
- Risks & Milestones inline editing + status enums + date pickers + owner autocomplete
- Gantt overhaul (milestone markers, view toggle, grouping, drag-reschedule)
- Cross-tab data sync + clickable Overview metrics
- Plan tab: overdue highlighting, bulk actions, milestone grouping
- Global search bar (FTS API → UI)
- Decisions + Actions filtering/search
- Artifact detail reverse lookup
- Engagement History auto-log from audit trail
- Skills tab: job progress + cancel
- Unified empty states + consistent overdue highlighting

---
*Last updated: 2026-04-03 after v5.0 milestone started*
