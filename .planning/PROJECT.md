# BigPanda AI Project Management App

## What This Is

An AI-native project management platform purpose-built for BigPanda's Professional Services delivery team. Replaces the manual workflow of running individual Cowork skills with a unified, persistent multi-user application where every customer project lives, every action is tracked, every communication is synthesized automatically, and every deliverable can be generated in one click from a live database. Supports n active customer accounts with full lifecycle management. Features multi-user auth with role-based access, AI chat grounded in live project data, multi-pass document ingestion routing to all workspace tabs, synthesis-first extraction from unstructured transcripts and meeting notes, a portfolio-level dashboard with health summary and exceptions panel, a collapsible WBS tree with AI gap-fill, interactive Architecture diagrams auto-populated from context, and a Teams Engagement map auto-populated from extraction.

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

<!-- v7.0 — Governance & Operational Maturity (2026-04-16) -->
- ✓ Per-project Admin/User RBAC enforced at all 40+ route handlers; project Members tab with role management and email invite — v7.0 Phase 58 (AUTH-02–05)
- ✓ Project lifecycle: archive (read-only soft-delete), permanent delete with pre-flight validation, restore, portfolio separation; user logout — v7.0 Phase 59 (AUTH-01, PROJ-01–04, PORTF-01–02)
- ✓ Health Dashboard redesigned with auto-derived metrics (overdue tasks, at-risk milestones, stale updates) — no manual input required — v7.0 Phase 60 (HLTH-01–02)
- ✓ Ingestion edit-before-approve with note entity reclassification (type dropdown, field remap, correct routing on approval) — v7.0 Phase 61 (INGEST-01, INGEST-05)
- ✓ Analyze Completeness with per-field 0–100% scoring and conflicting detection; Scan for Updates consolidated to Context tab — v7.0 Phase 62 (INGEST-03–04)
- ✓ Skills Design Standard (YAML front-matter schema); runtime validation with "Fix required" badges and grayed-out non-compliant skills — v7.0 Phase 63 (SKILL-01–02, SKILL-04)
- ✓ Editable prompts UI with CodeMirror editor, admin toggle, atomic file write + backup, audit log capture — v7.0 Phase 64 (SKILL-03a, SKILL-03b)
- ✓ Project-scoped scheduling: per-project jobs with RBAC, CreateJobWizard projectId wiring, state persistence, nav badge removed — v7.0 Phase 65 (SCHED-01–05)
- ✓ Overview tracks hybrid static/dynamic redesign; Monday auto-scheduling via BullMQ; integration delete; Weekly Focus generate-now as quiet manual override — v7.0 Phase 66 (OVRVW-01–05)
- ✓ Delivery tab cleanup: Plan tab removed (Generate Plan → Task Board), WBS schema aligned, column hiding for ID/Source, Decisions repurposed for operational impact, stakeholder move and delete — v7.0 Phase 67 (DLVRY-05–10, TEAM-01–02)
- ✓ Gantt bi-directional sync: WBS skeleton with full hierarchy (L1→L2→L3), ADR/Biggy track separation, edge drag handles, milestone drag, inline DatePickerCell, depth computed from parent chain — v7.0 Phase 68 (DLVRY-01–04)
- ✓ Knowledge Base: cross-project institutional knowledge capture retained — use case confirmed distinct from document ingestion — v7.0 Phase 69 (KB-01)

<!-- v6.0 — Dashboard, Navigation & Intelligence (2026-04-14) -->
- ✓ Skills portability: lib/skill-path.ts resolves SKILL.md dynamically at runtime — no hardcoded paths — v6.0 Phase 43 (SKILL-01)
- ✓ Navigation restructure: Plan first in Delivery, WBS/Task Board/Gantt promoted to top level, Swimlane removed, Decisions → Delivery, Intel → Context tab, Engagement History → Admin — v6.0 Phase 44 (NAV-01–05)
- ✓ Risks and Milestones parity with Actions: multi-dimension filtering, multi-select bulk actions — v6.0 Phase 44 (RISK-01–02, MILE-01–02)
- ✓ Seven new PostgreSQL tables: wbs_items, wbs_task_assignments, team_engagement_sections, arch_tracks, arch_nodes, arch_team_status, project_dependencies — v6.0 Phase 45 (WBS-01, WBS-02)
- ✓ Context upload extraction expanded to 21 entity types routed to all workspace tabs — v6.0 Phase 46 (WBS-03, ARCH-04)
- ✓ WBS tab: 3-level collapsible ADR+Biggy tree, Generate Plan AI gap-fill, full CRUD with drag-reorder — v6.0 Phase 47 (WBS-04, WBS-05)
- ✓ Architecture tab: Before State + Current & Future State two-sub-tab diagram, DB-driven nodes, status cycling, drag-reorder — v6.0 Phase 48 (ARCH-01–04)
- ✓ Teams tab: 4-section engagement map (Business Outcomes, E2E Workflows, Teams & Engagement, Focus Areas), missing-data warnings, read-only with source-tab edit flow — v6.0 Phase 48 (TEAM-01, TEAM-03, TEAM-04)
- ✓ Portfolio dashboard: health chips, filterable 12-column table, exceptions panel, project drill-down — v6.0 Phase 49 (DASH-01–06)
- ✓ Extraction prompt intelligence: document-first layout, few-shot examples, field-level inference rules, status table, date null flip, section scan + self-check, tool use API (`record_entities`), 2000-char overlap, coverage reporting, Pass 0 pre-analysis — v6.0 Phase 53 (EXTR-02–16)
- ✓ Multi-pass extraction: Pass 0 pre-analysis + 3 entity-group passes, intra-batch dedup, pass-aware IngestionModal progress — v6.0 Phases 52–55 (MULTI-PASS-01–03)
- ✓ Teams tab aligned to 4-section spec; ExtractionPreview extended to all 21 entity types; dead team_engagement code removed — v6.0 Phase 56 (TEAM-01, TEAM-02)
- ✓ Synthesis-first extraction: document type classification, entity prediction, transcript-mode inference, confidence calibration rubric, SINGLETON markers — v6.0 Phase 57 (SYNTH-01–05)
- ✓ Architecture extraction → arch_node bridge: approved architecture entities upsert matching arch_node in same transaction, syncing visual diagram to extraction status — v6.0 Phase 57

## Context

v7.0 shipped 2026-04-16. Full stack: Next.js 16 (Turbopack), PostgreSQL, Redis/BullMQ, better-auth, Drizzle ORM, Vercel AI SDK, @xyflow/react, @anthropic-ai/sdk, Recharts. 69 phases (including 48.1), ~319 plans completed across v1.0–v7.0. ~75,894 LOC TypeScript. Test suite: 148+ files passing. Production build clean.

v7.0 delivered: per-project RBAC at all 40+ route handlers, full project lifecycle (archive/delete/restore), Health Dashboard with auto-derived metrics, ingestion edit-before-approve with note reclassification, Analyze Completeness scoring, Skills Design Standard with editable prompts UI, project-scoped scheduling, Overview hybrid static/dynamic tracks, Delivery tab cleanup, Gantt bi-directional sync with WBS hierarchy, Knowledge Base retained.

Known tech debt entering v8.0:
- INGEST-02: Move approved ingested item to different section — deferred
- OUT-01: Outputs section audit — dropped (not worth the work)
- TEST-01: 4 portfolio TDD RED stubs — dropped (stubs remain but not blocking)
- Nyquist validation incomplete: most v7.0 phases at `nyquist_compliant: false` (draft status)
- Empty state CTA onClick handlers are `() => {}` placeholders (wiring to creation modals deferred)

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
| frappe-gantt replaced with custom GanttChart.tsx (v5.0) | frappe-gantt SVG injection approach couldn't support milestone markers + swim lanes cleanly; custom split-panel React component gives full control | ✓ Correct — milestone markers, drag-reschedule, view modes all implemented natively |
| CustomEvent (metrics:invalidate) for cross-tab sync (v5.0) | No external state library needed; browser-native event bus sufficient for same-tab communication between client islands | ✓ Correct — zero extra dependencies, clean dispatch/listen pattern |
| Client-side filtering pattern for table clients (v5.0) | Server Component passes full data; client filters in-memory using URL params — consistent across all table clients | ✓ Correct — no extra API calls for filter changes |
| WBS custom WbsTree.tsx (v6.0) | 3-level collapsible tree with ADR/Biggy tabs, recursive delete, Set-based expand state — DnD kit for reorder | ✓ Correct — full control over WBS-specific behavior |
| Portfolio dashboard: Server Component fetch + client filter (v6.0) | getPortfolioData() Server Component + PortfolioTableClient with URL params — same pattern as workspace tables | ✓ Correct — consistent with existing client-side filter pattern |
| Multi-pass extraction: 3 separate Claude calls (v6.0) | Single-pass produced incomplete recall; entity groups have different extraction characteristics | ✓ Correct — recall improved significantly; Pass 0 pre-analysis further improves coverage |
| Drizzle `record_entities` tool use replacing raw JSON (v6.0) | Strict mode tool use eliminates jsonrepair dependency; schema adherence improved | ✓ Correct — extraction errors from malformed JSON eliminated |
| 4-section Teams tab — Architecture excluded (v6.0) | Architecture has dedicated tab; including it in Teams tab created duplicate and contradicted spec | ✓ Correct — Phase 56 alignment removes ArchOverviewSection |
| team_engagement entity type removed from extraction (v6.0) | businessOutcome, e2e_workflow, focus_area populate Teams sections via their own tables — team_engagement was dead infrastructure | ✓ Correct — extraction now routes to correct tables; Teams tab populates cleanly |
| Synthesis-first extraction posture + document type classification (v6.0) | Transcript/meeting note documents produced near-zero extractions under extraction-first prompts; Pass 0 classification enables adaptive behavior per doc type | ✓ Correct — SYNTH-01–05 contracts verified; confidence calibration rubric makes inferred vs explicit entities distinguishable |
| Architecture extraction → arch_node bridge in same transaction (v6.0) | Diagram node status must stay in sync with extraction approvals; same transaction prevents partial state | ✓ Correct — approved architecture entities now automatically update visual diagram |
| requireProjectRole() wrapper at all 40+ [projectId] route handlers (v7.0) | Extends CVE-2025-29927 defense-in-depth to project-level RBAC; no middleware-only trust | ✓ Correct — admin/user enforcement consistent across all project routes |
| ON DELETE SET NULL for project_id FK on scheduled_jobs (v7.0) | Project deletion preserves job history as global rather than cascade-deleting; useful for audit trail | ✓ Correct — jobs persist and continue running as non-project-scoped after project delete |
| computeDepth from parent_id chain in buildWbsRows (v7.0) | DB `level` column is set incorrectly on WBS items (children saved with same level as parent); computed depth from parent chain is always correct | ✓ Correct — L3 indentation in Gantt now reflects true tree depth |
| CodeMirror with ssr:false dynamic import for prompt editing (v7.0) | CodeMirror uses DOM APIs incompatible with Next.js SSR; same pattern as React Flow | ✓ Correct — no hydration errors; uncontrolled mode with useRef buffering prevents cursor-jump re-renders |
| Weekly-focus job registration on project create is best-effort (v7.0) | Redis unavailability should not fail project creation; job registration is a convenience feature | ✓ Correct — graceful degradation; job auto-schedules on next Redis reconnect |
| Static track config constants define phase names (v7.0) | Phase names must not drift as DB data changes; hardcoded config + DB match-by-name keeps display stable | ✓ Correct — static tracks always render even before DB phases are created |
| Knowledge Base retained as cross-project institutional knowledge capture (v7.0) | Audited and confirmed distinct use case from document ingestion — freeform entries linkable to risks/engagement history | ✓ Correct — ~1,408 LOC fully functional; no deprecation needed |

---
*Last updated: 2026-04-16 after v7.0 milestone close*
