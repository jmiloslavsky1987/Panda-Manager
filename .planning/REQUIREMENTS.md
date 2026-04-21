# Requirements: BigPanda AI Project Management App

**Defined:** 2026-04-19
**Core Value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## v8.0 Requirements

### Codebase Refactor

- [x] **RFCTR-01**: Codebase audit produces a written report categorizing every Claude API call as: (a) deterministic logic that should be hardcoded, (b) genuine judgment/synthesis that belongs to Claude, or (c) borderline
- [ ] **RFCTR-02**: All calls identified as deterministic in RFCTR-01 are replaced with hardcoded implementations — no behavior change, just routing
- [x] **RFCTR-03**: Feature consistency audit produces a report identifying duplicate features serving the same purpose and UX patterns that are inconsistent across equivalent areas
- [x] **RFCTR-04**: All identified duplicates from RFCTR-03 are unified into a single consistent implementation

### Multi-Tenant Isolation

- [x] **TENANT-01**: A user can only see and access projects they have been explicitly added to — enforced at both API and UI layer
- [x] **TENANT-02**: A user cannot access another user's project by guessing or manipulating a project ID in the URL or API call (returns 403)
- [x] **TENANT-03**: AI outputs, Redis cache entries, and BullMQ job state cannot cross user or project boundaries
- [x] **TENANT-04**: BullMQ jobs are scoped strictly to their project; job results appear only in the originating project's context
- [x] **TENANT-05**: New user receives an email invite, creates an account, and sees a clean empty state on first login — no other users' projects, history, or data visible

### Deployment Readiness

- [x] **DEPLOY-01**: App can be configured for a hosted environment via environment variables alone — no hardcoded localhost references, paths, or secrets
- [ ] **DEPLOY-02**: A deployment guide exists documenting the environment variables, PostgreSQL + Redis dependencies, and how to run in production

### Entity Lifecycle Management

- [x] **LIFECYCLE-P1**: Ingested entities can be updated, closed, or removed via new document uploads — Pass 5 change detection surfaces proposed changes in IngestionModal for user approval
- [x] **LIFECYCLE-P2**: All entity types have manual edit/delete UI so users can correct or remove any record after ingestion (except append-only tables)

## Future Requirements (Deferred)

These were explicitly considered for v8.0 and deferred. Revisit at the next milestone planning session.

### Auth Provider Migration

- **AUTH-PROV-01**: Replace better-auth with Clerk or Auth0 for managed identity — social login, hosted login UI, ops handled externally
  - *Deferred from v8.0*: better-auth already has sessions, roles, and invite flow; migration complexity not justified at current team size. Revisit if team grows significantly or SSO/SAML becomes a requirement.

### Per-User API Keys

- **APIKEY-01**: Each user supplies their own Anthropic API key, stored securely against their user record; all Claude API calls within a session use that user's key
  - *Deferred from v8.0*: Small internal team — single app-level key in environment variables is simpler and sufficient. Revisit if the app is opened to external users who need separate billing.

### AWS Infrastructure Provisioning

- **INFRA-01**: Provision EC2, RDS (PostgreSQL), and ElastiCache (Redis) on company AWS account
- **INFRA-02**: Configure DNS, SSL, and production process management (PM2 or systemd)
- **INFRA-03**: Set up deployment pipeline (CI/CD or manual deploy workflow)
  - *Deferred from v8.0*: App must be deployment-ready (DEPLOY-01, DEPLOY-02) before infra is provisioned. AWS setup is a follow-on task once the app is multi-tenant correct.

### Admin & Operations

- **ADMIN-01**: Admin console for user management, usage visibility, and app health monitoring
- **ADMIN-02**: Usage tracking per user (API call counts, token spend)
- **ADMIN-03**: Billing layer for per-user cost attribution
  - *Deferred from v8.0*: Not needed at small team scale. Revisit if the app is opened to multiple teams or external users.

## Out of Scope

Explicitly excluded — not deferred, not planned. Documented to prevent re-adding.

| Feature | Reason |
|---------|--------|
| Open self-registration | Invite-only by design — no public sign-up |
| Multi-region data residency | Single deployment, not an enterprise SaaS requirement |
| Real-time collaborative editing | No concurrent multi-user editing use case identified |
| Microsoft Outlook Calendar integration | Permanently excluded (BRD explicit exclusion) |
| Custom role builder | Post-launch at earliest; admin/user binary is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RFCTR-01 | Phase 70 | Complete |
| RFCTR-02 | Phase 71 | Pending |
| RFCTR-03 | Phase 72 | Complete |
| RFCTR-04 | Phase 73 | Complete |
| TENANT-01 | Phase 74 | Complete |
| TENANT-02 | Phase 74 | Complete |
| TENANT-03 | Phase 74 | Complete |
| TENANT-04 | Phase 74 | Complete |
| TENANT-05 | Phase 74 | Complete |
| DEPLOY-01 | Phase 75 | Complete |
| DEPLOY-02 | Phase 75 | Pending |
| LIFECYCLE-P1 | Phase 73.1 | Complete |
| LIFECYCLE-P2 | Phase 73.1 | Complete |

**Coverage:**
- v8.0 requirements: 13 total
- Mapped to phases: 13/13 ✓
- Unmapped: 0

---
*Requirements defined: 2026-04-19*
*Last updated: 2026-04-20 after Phase 73.1 entity lifecycle management planning*
