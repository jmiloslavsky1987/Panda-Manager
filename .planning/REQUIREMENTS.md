# Requirements: BigPanda AI Project Management App

**Defined:** 2026-03-25
**Milestone:** v2.0 — AI Ingestion & Enhanced Operations (archived — all requirements complete)
**Core Value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

---

## v2.0 Requirements (Archived — Complete)

All v2.0 requirements are complete. See `.planning/v2.0-MILESTONE-AUDIT.md` for full traceability.

---

## v3.0 Requirements

**Defined:** 2026-03-30
**Milestone:** v3.0 — Collaboration & Intelligence

### AUTH — Multi-User Authentication

- [ ] **AUTH-01**: User can log in with email and password
- [ ] **AUTH-02**: Admin can create, edit, and deactivate user accounts from the Settings panel
- [ ] **AUTH-03**: Admin can assign and change user roles (admin / user)
- [ ] **AUTH-04**: Users table includes `external_id` column and role abstraction layer for future Okta OIDC integration
- [ ] **AUTH-05**: All application routes require an authenticated session; unauthenticated requests are redirected to the login page

### CTX — Context Hub

- [ ] **CTX-01**: Each project workspace has a dedicated Context tab as the primary document upload interface
- [ ] **CTX-02**: Uploaded documents are classified by Claude and extracted content is routed to the appropriate workspace tabs
- [ ] **CTX-03**: Claude analyzes each tab's live data and surfaces specific quality gaps per tab (e.g. "Teams tab missing ADR status for 3 teams")
- [ ] **CTX-04**: Context tab displays completeness status for all workspace tabs with gap summaries at a glance

### UI — UI & Templates

- [ ] **UI-01**: Project workspace tabs are grouped into logical sub-tabs to reduce top-level navigation clutter
- [ ] **UI-02**: Color palette, typography, spacing, and component styling are modernized throughout
- [ ] **UI-03**: Each tab type has a fixed required section structure enforced by a TypeScript template registry
- [ ] **UI-04**: New projects are seeded with template placeholder content on creation

### CHAT — Project Chat

- [ ] **CHAT-01**: Each project has an inline AI chat panel that answers questions using live project DB data
- [ ] **CHAT-02**: Chat responses are constrained to current project data only — no invented facts, all answers reference specific records

### VIS — Interactive Visuals

- [ ] **VIS-01**: Teams tab engagement map is an interactive React component with clickable nodes that expand for detail
- [ ] **VIS-02**: Architecture tab workflow diagram is an interactive React component with clickable integration nodes

## Deferred to v3.1

- Multi-user project access control (restrict users to assigned projects) — admin-owns-config model sufficient for v3.0
- Live Okta SAML/OIDC connection — Okta-ready schema and abstraction layer ships in v3.0; live Okta tenant deferred
- Workflow Diagram drill-down depth beyond node click (sub-flow detail panels)
- Multiple project template types (Enterprise, SMB, Renewal) — single canonical template ships in v3.0

## Out of Scope

| Feature | Reason |
|---------|--------|
| pgvector / semantic search for chat | Structured DB context injection is faster, cheaper, more deterministic at single-project scope |
| Real-time collaborative editing | Multi-user is sequential not concurrent; out of scope per BRD |
| Customer-facing portal | Email updates sufficient; external access explicitly deferred |
| Mobile app | Web-first; mobile deferred indefinitely |

## Traceability

*Populated during roadmap creation.*

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 25 | Pending |
| AUTH-02 | Phase 25 | Pending |
| AUTH-03 | Phase 25 | Pending |
| AUTH-04 | Phase 25 | Pending |
| AUTH-05 | Phase 25 | Pending |
| CTX-01 | TBD | Pending |
| CTX-02 | TBD | Pending |
| CTX-03 | TBD | Pending |
| CTX-04 | TBD | Pending |
| UI-01 | TBD | Pending |
| UI-02 | TBD | Pending |
| UI-03 | TBD | Pending |
| UI-04 | TBD | Pending |
| CHAT-01 | TBD | Pending |
| CHAT-02 | TBD | Pending |
| VIS-01 | TBD | Pending |
| VIS-02 | TBD | Pending |

**Coverage:**
- v3.0 requirements: 17 total
- Mapped to phases: TBD (roadmapper to complete)
- Unmapped: 17 ⚠️ (pending roadmap)

---
*v2.0 requirements defined: 2026-03-25*
*v3.0 requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after v3.0 milestone start*
