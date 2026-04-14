# Feature Landscape: v7.0 Governance & Operational Maturity

**Domain:** AI-native project management — governance, lifecycle, skills standardization, operational polish
**Researched:** 2026-04-13
**Confidence:** MEDIUM (based on training data + existing codebase analysis; web research tools unavailable)

## Context

This research covers **only the v7.0 new capabilities** being added to an existing AI-native Professional Services project management platform. v6.0 shipped 2026-04-14 with 57 phases completed (portfolio dashboard, WBS tree, Architecture diagram, Teams 4-section map, 4-pass extraction pipeline).

**v7.0 focus areas:**
1. Per-project RBAC (Admin/User role per project)
2. Project archive (soft-delete, read-only) and permanent delete + restore
3. Overview tab redesign (static/dynamic tracks)
4. Health Dashboard redesign (metrics from existing system data)
5. Ingestion improvements (edit before approve, move items, note reclassification)
6. Analyze Completeness (compare project data vs expected data model)
7. Decisions tab repurposed for operational impact documentation
8. Skills Design Standard (input spec, output format, scheduling interface, editable prompts)
9. Project-scoped scheduling (schedule skills/jobs within individual projects)
10. Knowledge Base (define use case or deprecate)

**Not in scope:** Features already built in v1.0–v6.0 (57 phases completed).

---

## Table Stakes

Features users expect. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Per-project Admin role** | Multi-user apps need project ownership; someone must control membership and destructive actions | MEDIUM | project_membership table, users table (exists) | Existing global admin/user roles in place; need per-project scoping |
| **Per-project User role** | Standard two-tier model (admin/member) is expected; users understand "admin can do everything, I can't" | LOW | project_membership table | Enforce at route handler level (existing requireSession pattern) |
| **Archive project (soft-delete)** | Completed projects need preservation without cluttering active list; "delete" feels too permanent | LOW | archived_at timestamp in projects table | Filter dashboard by default; read-only access |
| **Restore archived project** | "What if I archived by mistake?" Universal expectation that archive is reversible | LOW | Clear archived_at timestamp | Return to active status |
| **Permanent delete project** | Admin needs nuclear option for test data, abandoned projects, compliance | MEDIUM | Admin role check, ON DELETE CASCADE (exists) | Confirmation dialog + admin-only |
| **View archived projects list** | Users expect "show archived" toggle or dedicated view; hidden by default but discoverable | LOW | Filter param on portfolio dashboard | Visual distinction (grayed out, "Archived" badge) |
| **Logout button** | Every auth system has logout; currently missing (AUTH-01) | LOW | better-auth signOut API | Redirect to login |
| **Edit AI prompt in UI** | Developer tools with AI let users tune prompts; opaque prompts = frustration when output is wrong | HIGH | SKILL.md write-back OR skill_prompt_overrides table | Constraint: SKILL.md read from disk at runtime |
| **Skills input/output schema definition** | Running a skill without knowing what it expects/produces = bad DX; APIs have specs, skills should too | MEDIUM | SKILL.md YAML front-matter | Parse at runtime; display in UI before run |
| **Health dashboard with auto-derived metrics** | Executive summaries expect KPIs; manual health scoring exists, but metrics must be data-driven not invented | MEDIUM | Existing data: tasks, milestones, actions, risks | Rollup with confidence intervals |
| **Data completeness analysis** | "What am I missing?" is core to data management tools; ingestion without validation = silent gaps | MEDIUM | v3.0 Phase 30 CTX-04 (partial) | Per-field scoring, conflict detection, missing entity warnings |
| **Project-scoped scheduling** | Skills run per-project; global scheduler can't target individual projects without scoping | MEDIUM | scheduled_jobs.project_id (exists per schema) | Existing BullMQ scheduler is global |
| **Analyze Completeness on-demand** | "Run analysis now" button; scheduled analysis is overkill for v7.0 (PROJECT.md: on-demand correct) | LOW | BullMQ job with project context | Display results in modal or tab |

---

## Differentiators

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Static + dynamic tracks in Overview** | Most tools show only manual data or only integration data; hybrid = human context + live system state | MEDIUM | Existing workstreams table, integration APIs | Static tracks = fixed config cards; dynamic tracks = populated from integrations |
| **Editable extraction preview before approve** | Ingestion tools typically auto-commit or require re-run; inline edit = faster iteration, fewer re-extractions | HIGH | ExtractionPreview UI state management | Modify ExtractionPreview modal to allow field edits |
| **Move ingested items between sections** | Extraction misclassifies entities (task → action, note → decision); forcing re-extraction is slow | MEDIUM | Drag-drop or dropdown to change entity type | Soft reclassification (update table + source note) |
| **Note entity reclassification to any type** | Extraction creates "note" catch-all; users should upgrade note → action/risk/decision without losing context | LOW | "Convert to..." action on note detail view | Migrate content + source fields to target table |
| **Skills Design Standard with audit** | Most AI tools have inconsistent prompt quality; enforced standard = predictable, debuggable skills | MEDIUM | Markdown template for SKILL.md with required sections | Runtime validation; grey out non-compliant skills |
| **Repurpose Decisions tab for operational impact** | Most tools have append-only decision logs; focusing on "what happened and why" vs "what we decided" = operational clarity | LOW | Rename tab, adjust extraction routing | decisions → operational_impacts table |
| **Per-project admin grants full project control** | Fine-grained RBAC often too complex; "admin on Project A ≠ admin on Project B" is sufficient and intuitive | LOW | project_membership.role = 'admin' | Grant all destructive + scheduling actions within project |

---

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Custom role builder (e.g., "Viewer", "Contributor", "Editor")** | Infinite configuration = support burden; 90% of users want Admin/User binary | Two-tier Admin/User is sufficient; defer custom roles to post-launch (PROJECT.md: explicit exclusion) |
| **Real-time AI prompt editing with hot-reload** | SKILL.md files read from disk at runtime; hot-reload = race conditions, cache invalidation complexity | Edit in UI → save → require skill re-run to pick up changes (explicit version boundary) |
| **Archive with partial edit capability** | Archived = read-only is the contract; partial write = confusing state | Restore → edit → re-archive if needed (explicit state transitions) |
| **Scheduled completeness analysis** | On-demand is sufficient for v7.0 (PROJECT.md line 126: scheduled deferred); BullMQ infrastructure exists but adds complexity | On-demand trigger; add scheduling in v8.0+ if users request it |
| **Project soft-delete (deleted_at) as separate from archive** | Two similar states = user confusion ("Is deleted the same as archived?"); soft-delete should be archive | Archive is soft-delete; permanent delete is hard delete (two states only) |
| **Health dashboard with manual metric overrides** | Manual overrides defeat auto-derivation purpose; disagreement = signal that data is wrong, not metric | Show metric + underlying data source; if wrong, fix source data (transparency over override) |
| **Editable prompts with version history** | Versioning complexity; SKILL.md files are source of truth, not DB | Audit log captures skill runs with snapshot of prompt used; revert = restore old SKILL.md file from git |
| **Granular per-skill permissions** | Adds RBAC matrix complexity; skills should be safe by design | All skills runnable by any project member; unsafe operations (delete, archive) controlled by project role, not skill access |

---

## Feature Dependencies

```
Per-project RBAC (AUTH-02, AUTH-03, AUTH-04, AUTH-05)
    └──requires──> project_membership table
                       └──requires──> users table (exists, Phase 26)

Archive/Restore (PROJ-01, PROJ-03, PROJ-04)
    └──requires──> archived_at timestamp in projects table
    └──enhances──> Portfolio dashboard filtering

Permanent Delete (PROJ-02)
    └──requires──> Admin role check (AUTH-03)
    └──conflicts──> Soft-delete as separate state (anti-feature)

Edit before approve (INGEST-01)
    └──requires──> ExtractionPreview state management
    └──enhances──> Ingestion accuracy

Move items between sections (INGEST-02)
    └──requires──> Entity type validation + soft reclassification
    └──enhances──> Extraction correction workflow

Note entity reclassification (INGEST-03)
    └──requires──> Move items capability (INGEST-02)
    └──enhances──> Extraction correction workflow

Health Dashboard redesign (HLTH-01, HLTH-02)
    └──requires──> Existing data (tasks, milestones, actions, risks)
    └──conflicts──> Manual metric overrides (anti-feature)

Skills Design Standard (SKILL-01, SKILL-02, SKILL-03, SKILL-04)
    └──requires──> SKILL.md template with YAML front-matter
    └──enhances──> Editable prompts UI (if prompts writable to disk)
    └──conflicts──> Hot-reload (anti-feature)

Project-scoped scheduling (SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05)
    └──requires──> project_id in scheduled_jobs table (exists)
    └──enhances──> Per-project admin control

Analyze Completeness (INGEST-04, INGEST-05)
    └──requires──> Data model schema + field-level scoring
    └──enhances──> Ingestion validation

Overview tracks redesign (OVRVW-01–05)
    └──requires──> Workstreams table (exists)
    └──enhances──> Static config + dynamic integration data

Decisions tab repurpose (DLVRY-09)
    └──requires──> Routing change in extraction
    └──enhances──> Operational impact clarity
```

### Dependency Notes

- **Per-project RBAC requires project_membership table:** Global roles exist (users.role = 'admin' | 'user'); need many-to-many mapping with per-project roles
- **Edit before approve enhances ingestion accuracy:** Users catch extraction errors before committing to DB; reduces re-extraction cycles
- **Skills Design Standard conflicts with hot-reload:** SKILL.md files are source of truth (PROJECT.md line 144); editing in UI requires write-back to disk, not in-memory cache
- **Health Dashboard conflicts with manual overrides:** Auto-derivation purpose is to remove human bias; overrides defeat this (PROJECT.md line 159)
- **Note reclassification requires move items capability:** Reclassification is a special case of moving between entity types

---

## MVP Definition

### Launch With (v7.0)

Minimum viable governance and operational maturity.

- [x] **Per-project Admin/User roles** (AUTH-02, AUTH-03, AUTH-04, AUTH-05) — Core governance; without this, multi-user access is global only
- [x] **Archive project (soft-delete)** (PROJ-01) — Completed projects must be preservable without deletion
- [x] **Restore archived project** (PROJ-04) — Archive is reversible; mistake recovery
- [x] **Permanent delete project** (PROJ-02) — Admin cleanup for test data; admin-only with confirmation
- [x] **View archived projects list** (PROJ-03) — Discoverable via portfolio dashboard toggle
- [x] **Logout button** (AUTH-01) — Basic auth hygiene
- [x] **Health Dashboard redesign** (HLTH-01, HLTH-02) — Executive KPIs from existing data; metrics must be defensible
- [x] **Analyze Completeness on-demand** (INGEST-04, INGEST-05) — Surface missing/sparse/conflicting fields; validation feedback
- [x] **Edit before approve in ingestion** (INGEST-01) — Correction workflow without re-extraction
- [x] **Skills Design Standard audit** (SKILL-02) — Identify non-compliant skills; grey out in UI
- [x] **Project-scoped scheduling** (SCHED-01, SCHED-03, SCHED-04) — Skills run per-project; scoping is table stakes

### Add After Validation (v7.x)

Features to add once core is working.

- [ ] **Editable prompts UI** (SKILL-03) — High complexity; requires write-back to SKILL.md files; defer until Design Standard validated
- [ ] **Move items between sections** (INGEST-02) — Medium complexity; nice-to-have for correction workflow
- [ ] **Note entity reclassification** (INGEST-03) — Low complexity; upgrade "note" catch-all to structured entity types
- [ ] **Overview static/dynamic tracks redesign** (OVRVW-01–05) — Medium complexity; hybrid manual + integration data; UX-heavy
- [ ] **Decisions tab repurpose** (DLVRY-09) — Low complexity; rename + routing change; clarify use case first
- [ ] **Weekly Focus auto-schedule** (OVRVW-04) — Low complexity; BullMQ job already exists; add project-scoped scheduling trigger

### Future Consideration (v8.0+)

Features to defer until product-market fit established.

- [ ] **Scheduled completeness analysis** — BullMQ infrastructure exists; on-demand sufficient for v7.0 (PROJECT.md line 126)
- [ ] **Custom role builder** — Explicit exclusion (PROJECT.md line 123); Admin/User binary sufficient
- [ ] **Per-skill permissions** — Granular RBAC matrix adds complexity; skills should be safe by design
- [ ] **Editable prompt version history** — Audit log captures runs; git history is version control; dedicated UI deferred
- [ ] **Knowledge Base feature definition** — Use case unclear (KB-01 requirement: "define use case or deprecate"); defer or remove

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Dependency Blocker? |
|---------|------------|---------------------|----------|---------------------|
| Per-project Admin/User roles | HIGH | MEDIUM | P1 | Yes — blocks archive/delete |
| Archive project | HIGH | LOW | P1 | No |
| Restore archived project | HIGH | LOW | P1 | No |
| Permanent delete project | MEDIUM | MEDIUM | P1 | Yes — requires admin role |
| View archived projects list | HIGH | LOW | P1 | No |
| Logout button | HIGH | LOW | P1 | No |
| Health Dashboard redesign | HIGH | MEDIUM | P1 | No |
| Analyze Completeness | HIGH | MEDIUM | P1 | No |
| Edit before approve | HIGH | HIGH | P1 | No |
| Skills Design Standard audit | MEDIUM | MEDIUM | P1 | Yes — blocks editable prompts |
| Project-scoped scheduling | MEDIUM | MEDIUM | P1 | No |
| Editable prompts UI | MEDIUM | HIGH | P2 | Yes — requires Design Standard |
| Move items between sections | MEDIUM | MEDIUM | P2 | No |
| Note entity reclassification | LOW | LOW | P2 | Yes — requires move items |
| Overview tracks redesign | MEDIUM | MEDIUM | P2 | No |
| Decisions tab repurpose | LOW | LOW | P3 | No |
| Scheduled completeness | LOW | LOW | P3 | No — defer to v8.0 |
| Custom role builder | LOW | HIGH | P3 | No — explicit exclusion |

**Priority key:**
- P1: Must have for v7.0 launch (governance + operational maturity core)
- P2: Should have, add when P1 complete
- P3: Nice to have, future consideration or explicit deferral

---

## Complexity Notes

### Per-Project RBAC (MEDIUM complexity)
- **Schema:** Add project_membership table (user_id, project_id, role: 'admin' | 'user')
- **Auth:** Extend requireSession to check project membership + role
- **UI:** Project settings page with member list + role assignment
- **Enforcement:** 40+ route handlers already guarded (Phase 26); add project-specific checks

### Archive/Restore (LOW complexity)
- **Schema:** Add archived_at timestamp to projects table
- **Query:** Filter portfolio dashboard WHERE archived_at IS NULL by default
- **UI:** "Archive" button (admin-only), "Show archived" toggle, "Restore" button on archived projects
- **Read-only:** Archived projects visible but all write endpoints return 403

### Permanent Delete (MEDIUM complexity)
- **Schema:** No change (use existing ON DELETE CASCADE FK constraints)
- **Auth:** Admin-only check at route handler level
- **UI:** Confirmation dialog with project name input (prevent accidental delete)
- **Cascade:** Delete propagates to all child tables (actions, risks, milestones, etc.)

### Edit Before Approve (HIGH complexity)
- **State:** ExtractionPreview modal needs editable form fields for each entity
- **Merge:** On approve, merge edited values with extracted values (edited fields override)
- **Validation:** Client-side validation for required fields, enums
- **UX:** Inline edit vs modal edit; 21 entity types = complex form

### Skills Design Standard Audit (MEDIUM complexity)
- **Template:** Define SKILL.md YAML front-matter schema (input, output, schedule)
- **Parser:** Runtime validation at skill load time
- **UI:** Grey out non-compliant skills in Skills tab; show "Fix required" badge
- **Enforcement:** Prevent scheduling/running non-compliant skills until fixed

### Editable Prompts UI (HIGH complexity)
- **Constraint:** SKILL.md files read from disk (PROJECT.md line 144); write-back required
- **UI:** Textarea for prompt editing, save button
- **File I/O:** Node.js fs.writeFile to update SKILL.md in place
- **Atomicity:** Race condition if multiple users edit same skill; need file lock or last-write-wins with warning
- **Audit:** Audit log captures skill runs with prompt snapshot

### Health Dashboard Redesign (MEDIUM complexity)
- **Metrics:** Auto-derive from existing data (overdue tasks, at-risk milestones, stale updates, open blockers)
- **Rollup:** Portfolio-level aggregation (total projects, on-track %, at-risk %, off-track %)
- **Executive:** Visual cards with trend indicators, drill-down to underlying data
- **Transparency:** Show metric + data source; no manual overrides (anti-feature)

### Analyze Completeness (MEDIUM complexity)
- **Schema:** Define expected data model (which fields required per entity type)
- **Scoring:** Per-field completeness (0-100%); missing, sparse, conflicting detection
- **Conflicts:** Flag contradictory data (e.g., task status = "complete" but due date in future)
- **UI:** Modal or tab showing completeness report with per-tab gaps and recommendations

### Project-Scoped Scheduling (MEDIUM complexity)
- **Schema:** scheduled_jobs.project_id already exists (schema.ts line 579-595)
- **UI:** Scheduler page filters jobs by current project when in workspace; global view in admin
- **Enforcement:** Admin role on project allows scheduling skills for that project
- **Run:** BullMQ job includes project_id in payload; skill runner scopes to project context

---

## Competitor Feature Analysis

| Feature | Jira | Asana | Linear | Our Approach |
|---------|------|-------|--------|--------------|
| **Per-project permissions** | Project-level roles (Admin, Member) with granular permissions matrix | Workspace-level roles; project access via membership | Team-level roles; project access via membership | Two-tier Admin/User per project; simple binary (v7.0), defer granular RBAC |
| **Archive project** | Archive project → read-only, hidden by default, restorable | Archive project → read-only, hidden, restorable | Archive team → read-only, hidden | Archive via archived_at timestamp; read-only access, portfolio toggle |
| **Delete project** | Admin-only with confirmation dialog | Admin-only with confirmation | Admin-only with confirmation + name input | Admin-only, confirmation dialog, hard delete with cascade |
| **Health dashboard** | Project overview with progress %, issue count, burndown | Project status (on track/at risk/off track) with manual update | Cycle analytics with auto-derived metrics (velocity, scope change) | Auto-derived metrics from task/milestone/risk data; executive readability; no manual overrides |
| **AI prompt editing** | N/A (no AI features) | N/A (AI features opaque) | N/A (no AI prompt exposure) | Editable prompts in UI (P2); write-back to SKILL.md files; Design Standard validation |
| **Data completeness** | Required fields enforced at create time | Task completeness indicator (description, due date, assignee) | Required fields enforced | Analyze Completeness on-demand; per-field scoring, conflict detection, missing entity warnings |
| **Scheduled automation** | Automation rules (scheduled triggers) per project | Workflow rules (scheduled) per workspace | No scheduled automation (webhook-driven only) | Project-scoped BullMQ scheduling; skills run per project with admin control |

---

## Integration Points with Existing Features

| v7.0 Feature | Existing Feature | Integration Type | Notes |
|--------------|------------------|------------------|-------|
| Per-project RBAC | Global roles (v3.0) | **Extension** | users.role = 'admin' | 'user' exists; add project_membership for project-scoped roles |
| Archive/Restore | Portfolio dashboard (v6.0) | **Enhancement** | Filter WHERE archived_at IS NULL by default; toggle to show archived |
| Permanent Delete | Audit log (v2.0) | **Data consumption** | Log delete action with user_id, project_id, timestamp |
| Health Dashboard | Health scoring (v1.0) | **Replacement** | Replace manual health scoring with auto-derived metrics |
| Analyze Completeness | Completeness analysis (v3.0 Phase 30) | **Enhancement** | Extend CTX-04 with per-field scoring, conflict detection |
| Edit before approve | Ingestion (v3.0, v6.0) | **Enhancement** | Modify ExtractionPreview modal to allow field edits |
| Skills Design Standard | Skill runner (v1.0) | **Enhancement** | Add YAML front-matter parsing, runtime validation |
| Project-scoped scheduling | BullMQ scheduler (v1.0, v2.0) | **Enhancement** | Filter scheduled_jobs by project_id; enforce admin role |
| Overview tracks redesign | Workstreams (v4.0) | **Enhancement** | Static tracks = fixed config; dynamic tracks = integration data |

---

## Sources

**Confidence: MEDIUM** — Based on training data knowledge of industry patterns + existing codebase analysis. Web research tools (Bash, WebFetch) denied; unable to verify current best practices from Auth0, Jira, Asana, Linear, LangChain official documentation.

### Training Data (January 2025 cutoff):
- RBAC patterns: Auth0, Okta, AWS IAM (resource-based permissions, role hierarchies)
- Project management: Jira, Asana, Linear, Monday.com (archive/restore workflows, project-level permissions)
- Developer tools: LangChain, LangSmith, PromptLayer (prompt versioning, editing in UI)
- Data management: Tableau, Looker, dbt (data quality, completeness scoring, conflict detection)

### Existing Codebase Analysis:
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/PROJECT.md` — v7.0 requirements, constraints, key decisions
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/db/schema.ts` — projects table (status enum includes 'archived'), users table (role: 'admin' | 'user'), scheduled_jobs.project_id exists
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/todos/pending/2026-04-10-add-project-delete-and-archive-functionality.md` — Archive/delete implementation notes

### Notes on Confidence:
- **Per-project RBAC:** HIGH confidence — standard two-tier pattern (Admin/User) well-established in Jira, Asana, GitHub, GitLab
- **Archive/restore:** HIGH confidence — soft-delete with archived_at timestamp is industry standard (GitHub, Jira, Asana)
- **Editable prompts:** MEDIUM confidence — AI tools vary widely; write-back to SKILL.md files is non-standard but required by constraint
- **Health dashboard:** HIGH confidence — auto-derived metrics from existing data is standard (Linear cycle analytics, GitHub Insights); manual overrides are anti-pattern
- **Analyze Completeness:** MEDIUM confidence — data quality tools use per-field scoring + conflict detection (dbt tests, Great Expectations); specific UX varies

---

## Notes for Roadmap

1. **Phase ordering recommendation:** Per-project RBAC (foundation) → Archive/Restore/Delete (lifecycle) → Health Dashboard redesign (executive visibility) → Analyze Completeness (data quality) → Skills Design Standard (operational maturity) → Project-scoped scheduling (governance) → Ingestion improvements (corrections) → Overview tracks redesign (UX polish)

2. **Research flags for phases:**
   - **Editable prompts UI:** High complexity; requires file I/O write-back to SKILL.md; may need phase-level research
   - **Edit before approve:** High UX complexity; 21 entity types in single form; consider phase-level research for form design
   - **Move items between sections:** Medium complexity; soft reclassification logic; standard pattern but needs validation

3. **Likely pitfalls:**
   - Per-project RBAC: 40+ route handlers to update; easy to miss one and leave security gap
   - Archive read-only enforcement: Must check archived_at in every write endpoint; middleware may help
   - Editable prompts: Race condition if multiple users edit same SKILL.md file simultaneously
   - Health Dashboard: Auto-derived metrics may not match user intuition; need transparency to debug disagreements
   - Project-scoped scheduling: BullMQ job payload must include project_id; easy to forget in new skills

4. **Low-risk extensions:**
   - Archive/Restore can ship incrementally (archive → view archived → restore → permanent delete)
   - Logout button is trivial (single API call + redirect)
   - Analyze Completeness can start with per-field scoring only; add conflict detection in v7.1

5. **High-risk features:**
   - Editable prompts UI (file I/O, race conditions, audit complexity) — defer to P2
   - Edit before approve (complex form, 21 entity types, merge logic) — high priority but high risk
   - Per-project RBAC (security-critical, 40+ route handlers) — must be correct in v7.0

---
*Feature research for: v7.0 Governance & Operational Maturity*
*Researched: 2026-04-13*
