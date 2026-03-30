# Feature Research

**Domain:** AI-native PS Delivery Management — v3.0 Collaboration & Intelligence milestone
**Researched:** 2026-03-30
**Confidence:** MEDIUM-HIGH — grounded in PROJECT.md, web research on 2026 patterns (auth, RAG chat, Mermaid interactivity, template systems), and training knowledge of the existing v2 codebase

---

## Scope Note

This file covers only the **6 net-new feature areas in v3.0**. The existing feature landscape (11 workspace tabs, skill engine, scheduler, audit log, source badges, document ingestion, discovery scan) is already built and documented in prior research. This document answers: what do these 6 features look like in modern apps, what is table stakes vs differentiator, and what are the complexity and anti-feature traps?

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users will assume work correctly from day one. Missing or broken = the feature feels unshipped.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Context Hub: file upload UI** | Any document intake feature has a drag-and-drop or file picker; no upload = no feature | LOW | Already exists partially — v2 has document ingestion; v3 adds a dedicated per-project tab surface for it |
| **Context Hub: extracted content review before commit** | Document ingestion without a review step is dangerous; users expect to see what the AI extracted before it writes to DB | MEDIUM | Approve/reject flow already exists in v2 discovery queue — same UX pattern applies here |
| **Context Hub: per-tab completeness indicator** | If AI is doing gap analysis, the result must be visible per-tab, not buried in a report | MEDIUM | Simple traffic-light or percent-complete badge per tab; backed by a structured scoring prompt |
| **Auth: session persistence** | Users expect to stay logged in across browser restarts; losing session on every page refresh is broken | LOW | JWT + httpOnly cookie or NextAuth.js session strategy; non-negotiable for multi-user |
| **Auth: role-enforced UI** | Admin-only controls must be hidden/disabled for users; any visible-but-broken admin action destroys trust | MEDIUM | Role checked server-side (middleware) and client-side (conditional render); never rely on UI-only gating |
| **Auth: credential-based login form** | Standard username/password is the baseline before any SSO; users expect a login page that works | LOW | NextAuth credentials provider covers this; password hashing with bcrypt |
| **UI overhaul: sub-tabs for dense tabs** | When a tab has many sections (e.g., Teams with ADR track + Biggy track + velocity), sub-tabs are expected navigation | MEDIUM | shadcn/ui Tabs component + URL query params for deep-linking; applies to Teams, Architecture, potentially Outputs |
| **Interactive visuals: clickable nodes** | If a diagram node represents an entity (team, integration, workstream), clicking it to see detail is an expected behavior | MEDIUM | Mermaid.js rendered to SVG with event listeners, or React Flow for full drag-and-drop capability |
| **Project Chat: question gets answered from project data** | The core value promise of inline AI chat is that it knows your data; a chat that hallucinates project details is worse than no chat | HIGH | Context window must be populated from live DB query; no fabricated percentages or invented dates |
| **Templates: new project pre-populates with defaults** | If a template system exists, creating a new project must show structured empty sections with labeled placeholders | MEDIUM | Template definitions stored in DB; applied on project create; per-tab default content seeded |
| **Templates: consistent section structure per tab** | Users building 5+ projects expect the same section order each time; ad-hoc tab structure creates "where did I put that?" | LOW | Fixed schema per tab type enforced by template; no free-form tab content allowed |

---

### Differentiators (Competitive Advantage)

Features that make this tool categorically better than stitching together Notion + Slack + manual ChatGPT sessions.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Context Hub: AI routes extracted content to the right tab** | Upload a kickoff deck and the AI populates Stakeholders, Architecture, Milestones automatically — no manual routing decision required | HIGH | Requires a routing classification prompt that maps extracted entities to tab schema; must handle ambiguous content gracefully (low-confidence → user routes manually) |
| **Context Hub: per-tab quality gap flags** | Proactively tells the user "your Architecture tab is missing integration details" before they realize it — turns the tool from reactive to advisory | HIGH | Structured scoring prompt per tab type (1–5 scale, JSON output, missing elements listed); scheduled or on-demand trigger; gap results surfaced as inline badges |
| **Auth: Okta-ready architecture without live Okta** | Building the SAML/OIDC adapter layer now means BigPanda's IT team can plug in Okta later with zero app changes — rare in internal tools | MEDIUM | NextAuth.js OIDC provider with environment-variable-driven issuer; SAML callback route stubbed and documented; no live Okta tenant required for v3 |
| **Auth: admin role for scheduler + user management** | Admins can see all scheduled jobs, all users, and configure system-wide settings; regular users see only their own project workspace | MEDIUM | Role stored in DB users table; middleware checks role on /admin/* routes; admin dashboard is a separate route group |
| **Interactive visuals: drill-down to live DB data** | Clicking a node in the Engagement Map opens a panel showing actual actions, contacts, or integrations from the DB — not static HTML | HIGH | Currently the Engagement Map and Workflow Diagram are static self-contained HTML outputs; v3 makes them React components that query the API on click |
| **Project Chat: scoped to a single project's data** | Chat that is scoped to "this project" (not all projects, not the internet) gives answers with attribution and eliminates hallucination risk | HIGH | DB query constructs a structured context payload (project summary, open actions, risks, recent history); injected as system message; Claude answers from that payload only |
| **Project Chat: conversation history within session** | Follow-up questions work correctly ("what about the risks I just asked about?"); stateless one-shot chat is a regression from ChatGPT | MEDIUM | Short-term conversation array maintained in component state; passed as messages[] in each API call; not persisted to DB (session only is acceptable for v3) |
| **Templates: skill-specific defaults per tab** | Pre-populated content that matches how BigPanda PS actually runs projects (e.g., standard Architecture tab sections for a BigPanda integration) — not generic PM placeholders | MEDIUM | Template content defined by domain expert (PS lead), stored in seed data; different templates per project type (Enterprise, SMB, Renewal) if needed |
| **UI overhaul: URL-addressable sub-tab state** | Deep-linking to `/projects/acme?tab=teams&subtab=adrstatus` makes it possible to share a specific view in Slack or bookmark a frequently-checked section | LOW | URL query parameter strategy; shadcn/ui Tabs value prop bound to searchParams |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full SAML implementation in v3** | Okta/SSO feels like a security requirement | SAML requires live IdP integration for testing, metadata exchange with IT, certificate management — all blocked until BigPanda IT is ready | Build OIDC adapter with NextAuth.js; stub SAML callback route; document the integration steps; unblock IT to plug in when ready |
| **Persistent Project Chat history** | Users want to see yesterday's conversation | Storing chat history in DB adds schema, migration, UI (history panel), and data privacy considerations for v3 scope | Session-scoped only for v3; full chat history is a v4 feature once chat value is validated |
| **RAG / vector embeddings for Project Chat** | Vector search feels like the "AI-native" answer | pgvector adds infra complexity; for a single project's data, a structured DB query with a well-crafted context payload is faster, cheaper, and more deterministic | Structured context injection: query live DB → format as system message → Claude reasons over it; no embeddings required at this data scale |
| **AI auto-commits extracted content (no review)** | Automation appeal; "why do I have to approve?" | A misrouted extraction (stakeholder placed in Architecture tab) is harder to undo than a false negative; trust requires review at least for first N uploads | Approve/reject flow inherited from v2 discovery queue; review can be one-click "accept all" once user trusts the router |
| **Drag-and-drop diagram editing** | Power users want to reshape the Engagement Map manually | Generated diagrams represent AI synthesis of DB data; free-form editing decouples the visual from the source of truth | Make diagrams regenerable from the DB; add data editing (in the actual tabs) rather than diagram editing |
| **Sub-tabs everywhere** | Navigation feels organized | Sub-tabs inside sub-tabs create a navigation maze; users lose their place | Sub-tabs only where a tab genuinely has 2+ independent content areas with different schemas (Teams: ADR track vs Biggy track; Architecture: Before-state vs Integration-status) |
| **Per-user template customization** | Each PS manager works differently | Templates that diverge per-user create inconsistent project structures; cross-project search and AI context injection break when schema varies | One canonical template per project type, defined by the PS lead; customization deferred; individual exceptions handled via optional fields |
| **Role-based field-level permissions** | Admin should see more fields per record | Field-level ACL is a significant schema and UI complexity; at 2 roles (user/admin) the cost exceeds the benefit | Route-level role gating is sufficient: admins see /admin/* routes; users do not; no field-level differentiation needed |

---

## Feature Dependencies

```
[Existing] PostgreSQL schema + DB
    └──required by──> All v3 features

[Existing] NextAuth.js or equivalent session layer
    └──must exist before──> Multi-user auth (v3 builds on top, not from scratch)

Multi-user auth (credential login + roles)
    └──required by──> Admin role for scheduler view
    └──required by──> User-scoped project access (if future multi-tenant)
    └──unlocks──> Okta-ready OIDC architecture

Context Hub tab (UI surface)
    └──required by──> AI content router (needs a place to show routing decisions)
    └──required by──> Per-tab quality gap flags (needs tab surfaces to score)
    └──depends on──> [Existing] Document ingestion pipeline (reuses extraction logic)
    └──depends on──> [Existing] Approve/reject review queue UX pattern

Per-tab quality gap flags
    └──requires──> All 11 workspace tabs to have defined schema (already true in v2)
    └──enhances──> Context Hub (gap flags are surfaced in Context Hub UI)
    └──can be scheduled via──> [Existing] BullMQ scheduler infrastructure

Project Chat
    └──requires──> PostgreSQL live project data (already true)
    └──requires──> Claude API access (already wired for skills)
    └──enhances but does NOT require──> Context Hub (richer chat if more docs ingested)
    └──conflicts with──> RAG/vector embeddings anti-feature (choose structured context injection instead)

Interactive Visuals (clickable Engagement Map + Workflow Diagram)
    └──depends on──> [Existing] Team Engagement Map skill output (the HTML already generated)
    └──depends on──> [Existing] Workflow Diagram skill output
    └──requires──> Refactor from static HTML output to React component with API calls
    └──enhances──> Project workspace (drill-down surfaces data from existing tabs)

Templates
    └──requires──> Project create flow (must apply template at project creation time)
    └──requires──> All workspace tab schemas (to know what defaults to seed)
    └──enhances──> Context Hub (templates define what gaps look like — what's "missing")
    └──does NOT require──> Auth (templates work for single user too)

UI Sub-tabs
    └──depends on──> [Existing] shadcn/ui component library (already in stack)
    └──enhances──> Teams tab, Architecture tab, Outputs tab (most obvious candidates)
    └──requires──> URL query param routing strategy to avoid state loss on navigation
```

### Dependency Notes

- **Context Hub requires the document ingestion pipeline:** v2 already built upload → Claude extracts → approve → DB. Context Hub is a dedicated tab surface that reuses this pipeline, adds AI routing between tabs, and adds per-tab scoring. It is not a rewrite — it is an integration point.
- **Project Chat does NOT require RAG:** At single-project scope, a structured DB query producing a 2000-4000 token context payload is sufficient. pgvector would add infra for no accuracy gain at this data scale.
- **Interactive Visuals requires refactoring two skill outputs:** The Engagement Map and Workflow Diagram are currently generated as static self-contained HTML files. Making them interactive requires replacing the static HTML consumer with a React component that queries the API. This is the highest-complexity item in the visual interactivity feature.
- **Templates enhance the Context Hub gap detection:** If templates define the canonical structure of each tab (e.g., "Architecture tab must have: Before-state section, Integration list, Dependency map"), then the gap scorer has a clear checklist to compare against. Build templates before or alongside gap detection.
- **Auth is self-contained** relative to all other v3 features — it does not depend on any of them, and none of them strictly depend on it (all features work in single-user mode). Auth is an infrastructure prerequisite that should ship first so other features can layer on top.

---

## MVP Definition

### Launch With (v3.0)

The v3.0 milestone must validate the multi-user and AI-intelligence value propositions. These are the minimum features required for v3 to be considered shipped:

- [ ] **Multi-user credential auth (user + admin roles)** — Unblocks multi-user; required before any other v3 feature can be used by a second person
- [ ] **Admin route protection + admin dashboard** — Scheduler, user management, and system settings gated to admin; user sees nothing broken
- [ ] **Okta-ready OIDC adapter (not live)** — Architecture in place; IT can plug in without app changes
- [ ] **Context Hub tab per project** — Upload surface + AI routing + approve/reject flow
- [ ] **Per-tab quality gap flags** — At minimum: tab completeness badge (complete/partial/empty) + list of missing sections; full 1–5 scoring is v3.1
- [ ] **Sub-tabs for Teams and Architecture tabs** — These two have the most obvious sub-tab need (ADR vs Biggy tracks; Before-state vs Integration-status)
- [ ] **Project Chat (session-scoped, structured context injection)** — Single-turn and multi-turn within session; scoped to one project; no RAG
- [ ] **Templates: one canonical template applied on project create** — Pre-populated section structure for all 11 tabs; defaults defined by PS lead
- [ ] **Interactive Engagement Map** — Nodes clickable; drill-down to team/integration detail from DB; highest user-visible differentiator in the visual category

### Add After Validation (v3.1)

Features to add once v3.0 core is stable and the new users are onboarded:

- [ ] **Interactive Workflow Diagram** — Lower urgency than Engagement Map; add when Engagement Map pattern is validated
- [ ] **Per-tab gap scoring (1–5 with missing elements listed)** — Upgrade from simple completeness badge to structured gap report
- [ ] **Multiple template types** (Enterprise, SMB, Renewal) — Single template first; expand when project type differentiation is confirmed needed
- [ ] **Sub-tabs for Outputs tab** — Outputs has output type + date range filtering; sub-tabs may or may not help here; validate with usage

### Future Consideration (v4+)

- [ ] **Live Okta integration** — Requires BigPanda IT coordination and live Okta tenant; unblock when IT is ready
- [ ] **Persistent Project Chat history** — Session-scoped is sufficient to validate chat value; persist only after users confirm daily use
- [ ] **Per-user template customization** — Validate that the canonical template works consistently first; defer divergence
- [ ] **SCIM provisioning** — User lifecycle management via Okta SCIM; enterprise-grade but not needed until team grows

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Multi-user credential auth | HIGH | LOW | P1 |
| Admin role enforcement | HIGH | LOW-MEDIUM | P1 |
| Context Hub upload + AI routing | HIGH | MEDIUM | P1 |
| Project Chat (session-scoped) | HIGH | MEDIUM | P1 |
| Templates (one canonical) | HIGH | MEDIUM | P1 |
| Sub-tabs (Teams + Architecture) | MEDIUM | LOW | P1 |
| Interactive Engagement Map | HIGH | HIGH | P1 |
| Per-tab completeness badge | MEDIUM | MEDIUM | P1 |
| Okta-ready OIDC architecture | MEDIUM | MEDIUM | P2 |
| Per-tab gap scoring (1–5) | MEDIUM | MEDIUM | P2 |
| Interactive Workflow Diagram | MEDIUM | HIGH | P2 |
| Multiple template types | LOW | MEDIUM | P3 |
| Persistent Chat history | LOW | MEDIUM | P3 |
| Live Okta integration | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v3.0 launch
- P2: Should have, add in v3.1
- P3: Nice to have, future milestone

---

## Complexity Notes by Feature Area

### 1. Context Hub

**Core complexity:** The AI routing step. Classifying extracted content into tab-specific buckets requires a prompt that understands the tab schema and handles ambiguous content (e.g., a timeline can belong to Milestones OR Engagement History). Low-confidence routing decisions should surface a manual routing choice rather than silently misplace content.

**Reuse opportunity:** The v2 document ingestion pipeline (upload → extraction → review → commit) is the exact pattern needed. Context Hub wraps it in a dedicated tab surface and adds the routing classification layer on top.

**Gap scoring:** Per-tab completeness scoring is a structured prompt pattern (well-established in 2026 document AI). Score each tab against a known checklist (defined by the template). Return JSON: `{tab: "architecture", score: 3, missing: ["integration list", "dependency map"]}`. Schedule via existing BullMQ infrastructure or trigger on-demand.

### 2. Multi-User Auth

**Core complexity:** NextAuth.js credentials provider + bcrypt password hashing + role column in users table + middleware-based route protection is the standard 2026 pattern. LOW complexity.

**Okta-ready:** Use NextAuth.js OIDC provider with environment-variable-driven configuration (`OKTA_ISSUER`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`). When env vars are set, OIDC login appears. When not set, falls back to credentials. This is zero-cost architecture for Okta-readiness.

**SAML complexity:** Full SAML requires `passport-saml` or `saml2-js`, certificate management, and ACS URL configuration in an Okta tenant. This is a MEDIUM complexity integration that only makes sense when BigPanda IT has an Okta tenant to test against. Defer live SAML; document the integration steps.

### 3. UI Overhaul (Sub-Tabs)

**Core complexity:** LOW. shadcn/ui `<Tabs>` component is already in the stack. The architectural decision is URL strategy: bind tab value to a query param (`?subtab=adr`) so navigation does not reset to the default sub-tab. Use Next.js `useSearchParams` and `router.replace` to maintain state without adding to browser history.

**Where to apply:** Teams tab (ADR track / Biggy track / Velocity view), Architecture tab (Before-state / Integration status / Dependencies). Evaluate Outputs tab after v3.0 ships.

### 4. Interactive Visuals

**Core complexity:** HIGH for the Engagement Map refactor. Currently the skill generates a static, self-contained HTML file. Making it interactive means:
1. The skill must output structured data (JSON) in addition to or instead of monolithic HTML
2. A React component consumes the JSON and renders a graph (React Flow or Mermaid with `onNodeClick`)
3. Node clicks trigger API calls to fetch live DB data (team members, integration status, active actions)

**Library recommendation:** React Flow for the Engagement Map (drag-and-drop node positioning, built-in click handlers, excellent React integration). Mermaid.js with SVG event listeners for the Workflow Diagram (Mermaid is already used in the existing skill output; add interactivity via the `click` directive and a custom click handler).

**Mermaid limitation:** Mermaid does not natively support dynamic node data binding. Node click → panel drawer showing live data requires wiring a click event to an API call outside of Mermaid's render cycle. This is achievable but requires careful SVG DOM management.

### 5. Project Chat

**Core complexity:** MEDIUM. The pattern is well-established:
1. On chat open, query DB for project summary payload (project metadata, open high-priority actions, unresolved risks, recent engagement history, active milestones) — approximately 2000–4000 tokens
2. Inject as system message with explicit instruction: "Answer only from the provided project data. Do not invent numbers or dates."
3. Pass conversation array (user + assistant turns) in each API call for multi-turn support
4. Stream response via SSE (already wired for skills)

**Anti-hallucination critical:** The system message must explicitly prohibit invented facts. The context payload must be structured (labeled sections, not freeform). This is the constraint that makes chat trustworthy.

**Scope discipline:** Chat is scoped to one project at a time. "Ask across all projects" is a future feature (requires either multi-project context concatenation or a search-and-retrieve layer). Do not build cross-project chat in v3.

### 6. Templates

**Core complexity:** MEDIUM. Templates are seed data applied at project creation:
1. `project_templates` table: template_id, name, description, type (Enterprise, SMB, etc.)
2. `tab_templates` table: template_id, tab_type, section_name, default_content, sort_order
3. On project create: apply template → seed each tab's structural sections with empty/default content

**Fixed structure:** Templates define the section schema for each tab. Users fill in content; they do not add or remove sections. This constraint is what makes gap detection reliable — the gap scorer knows exactly what "complete" looks like.

**Admin management:** Template content is edited by admin users (future: admin UI; v3.0: DB seed + migration). Do not build a template editor in v3.

---

## Sources

- **PROJECT.md** (2026-03-25) — canonical feature specification; HIGH confidence for scope and constraints
- **[NextAuth.js Okta provider](https://next-auth.js.org/providers/okta)** — OIDC integration pattern; HIGH confidence
- **[SAML SSO in Next.js guide](https://itnext.io/saml-sso-in-next-js-a-step-by-step-guide-for-okta-google-microsoft-entra-dbdd215b98d3)** — SAML implementation reference; MEDIUM confidence
- **[RAG with PostgreSQL — pgDash](https://pgdash.io/blog/rag-with-postgresql.html)** — confirms structured DB query approach sufficient at small scale; MEDIUM confidence
- **[Mermaid.js interactive flowcharts](https://haridornala.medium.com/building-interactive-flowcharts-with-mermaid-js-and-javascript-57ec27cdc63d)** — click handler patterns; MEDIUM confidence
- **[mermaid-graph npm package](https://www.npmjs.com/package/mermaid-graph)** — `onNodeClick` handler support; MEDIUM confidence
- **[AI document quality gap detection — Docsie 2026](https://www.docsie.io/blog/articles/ai-document-comparison-tool-2026/)** — per-section scoring pattern; MEDIUM confidence
- **[shadcn/ui admin dashboard patterns 2026](https://adminlte.io/blog/build-admin-dashboard-shadcn-nextjs/)** — sub-tab + sidebar navigation; HIGH confidence (already in stack)
- **[Agentic RAG patterns 2026 — VentureBeat](https://venturebeat.com/data/six-data-shifts-that-will-shape-enterprise-ai-in-2026)** — confirms structured context injection over RAG for bounded data; MEDIUM confidence

---
*Feature research for: BigPanda AI Project Management App — v3.0 new features*
*Researched: 2026-03-30*
