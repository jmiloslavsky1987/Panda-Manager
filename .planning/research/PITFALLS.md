# Pitfalls Research: v7.0 Governance & Operational Maturity

**Domain:** Adding RBAC, soft-delete, bi-directional sync, filesystem editing, and project-scoped scheduling to an existing Next.js/PostgreSQL/better-auth application
**Researched:** 2026-04-13
**Confidence:** HIGH (based on system architecture analysis and migration patterns)

## Critical Pitfalls

### Pitfall 1: Incomplete RBAC Migration — Global Role Leakage

**What goes wrong:**
Route handlers partially migrated to per-project RBAC still have code paths checking the old global `user.role === 'admin'` instead of `projectMembership.role === 'admin'`. Results in unauthorized access or false denials. With 40+ route handlers already using `requireSession()`, mixed authorization logic creates security holes.

**Why it happens:**
Global role checks are already embedded throughout 40+ route handlers from v3.0 Phase 26. When adding per-project roles, developers grep for explicit `role` checks but miss:
- Implicit checks in helper functions
- Authorization logic in service layer (not route handler)
- Role-based UI rendering decisions in Server Components
- BullMQ job handlers that run outside HTTP context

**How to avoid:**
1. **Create exhaustive audit manifest** — grep for ALL occurrences: `user.role`, `session.user.role`, `requireSession()` callsites, any conditional on `=== 'admin'` or `=== 'user'`
2. **Introduce `requireProjectRole(projectId, minRole)` wrapper** — replaces bare `requireSession()` for project-scoped routes; enforces project membership lookup BEFORE authorization check
3. **Deprecate global role column immediately** — add DB constraint `CHECK (role IS NULL)` or default to `'legacy'` with migration script to force code paths to break loudly during testing
4. **Separate auth module** — extract all authorization into `lib/auth-rbac.ts` with single source of truth; route handlers import ONLY from this module

**Warning signs:**
- Unit tests pass but E2E tests show unauthorized 403s
- Admin users can't perform admin actions on projects they're assigned to
- Regular users can access admin-only endpoints on some projects
- Inconsistent behavior between route handlers (some check global, some check project)

**Phase to address:**
AUTH-01 through AUTH-05 — MUST be first phase in v7.0 roadmap. All other features (archive, schedule, prompts) depend on correct RBAC enforcement.

---

### Pitfall 2: Soft-Delete Cascade Blind Spots — Foreign Key Chaos

**What goes wrong:**
Adding `archived_at` to `projects` table in a DB with 57+ phases worth of tables causes:
- Foreign key constraint violations when child records try to reference archived projects
- Queries returning archived project data mixed with active data
- Cascade deletes triggering when they shouldn't (or not triggering when they should)
- `JOIN` queries exploding in complexity with `WHERE projects.archived_at IS NULL` scattered everywhere

**Why it happens:**
Complex relational DBs have dozens of tables with `project_id` foreign keys. Each has different semantics:
- **Should cascade to read-only:** actions, risks, milestones, tasks (preserve for archive view)
- **Should block archive:** active BullMQ scheduled jobs (must be cancelled first)
- **Should be nullable on archive:** scheduled_jobs.project_id (keep job history even after project deleted)

With Drizzle ORM, foreign key `onDelete: 'cascade'` behavior was set in v1.0-v6.0 without considering soft-delete. Adding `archived_at` doesn't change FK constraints.

**How to avoid:**
1. **Map every table with project_id FK** — create matrix: table name | FK behavior | archive semantics | query pattern
2. **Add `archived_at IS NULL` default to base query helpers** — create `getActiveProjects()` wrapper in `db/queries.ts`; never use raw `db.query.projects` outside of archive-specific views
3. **Implement archive pre-flight checks** — before setting `archived_at`, verify:
   - No active scheduled jobs (`SELECT COUNT(*) FROM scheduled_jobs WHERE project_id = $1 AND next_run_at IS NOT NULL`)
   - No pending extraction jobs (`SELECT COUNT(*) FROM extraction_jobs WHERE project_id = $1 AND status = 'processing'`)
4. **Create archived project view route** — separate `/archived-projects` page that explicitly queries `WHERE archived_at IS NOT NULL`; regular portfolio dashboard uses `WHERE archived_at IS NULL`
5. **Test cascade on RESTORE** — restoring archived project must not resurrect deleted child records; use separate `deleted_at` column for permanent deletes

**Warning signs:**
- Portfolio dashboard shows 0 projects after archiving one
- Error: `violates foreign key constraint` when archiving
- Archived project data appearing in active project dropdowns/autocomplete
- Restored projects missing child records (actions, risks, tasks)

**Phase to address:**
PROJ-01 (archive) MUST audit all FK relationships and implement query layer filtering BEFORE implementing archive UI. PROJ-04 (restore) needs cascade restore testing.

---

### Pitfall 3: Gantt Bi-Directional Sync Race Conditions

**What goes wrong:**
User drags task in Gantt → updates task.start_date → triggers re-render → fetches from DB → Gantt position recalculates → triggers another drag event → infinite loop or stale data overwrites. Or: Gantt shows updated dates but DB still has old dates after browser refresh.

**Why it happens:**
Gantt component (custom GanttChart.tsx from v5.0) stores visual state independently from DB. Bi-directional sync means:
- **Gantt → DB:** Drag event calls API to update task dates
- **DB → Gantt:** Any task edit (from Task Board or inline edit) must update Gantt visual state

Without careful state management:
- Optimistic updates show change immediately, but API call fails → UI lies
- Race condition: user drags task while API is in-flight → later API response overwrites newer state
- Milestone propagation cascades (task extends → milestone moves → all downstream tasks shift) cause N+1 query explosions

**How to avoid:**
1. **Single source of truth: DB** — Gantt always derives position from DB records; drag handler updates DB first, then re-fetches
2. **Optimistic update with rollback** — drag handler immediately updates Gantt state + marks as "pending", API call resolves → commit, API call fails → revert to pre-drag state
3. **Debounce drag events** — collect all position changes during drag, send single bulk update API call `onDragEnd` (not `onDrag`)
4. **Cascade propagation in transaction** — if task extends and pushes milestone, all downstream date updates happen in single DB transaction with advisory lock: `SELECT pg_advisory_xact_lock(project_id)`
5. **Version-based concurrency control** — add `version` column to tasks/milestones; API rejects updates if `version` doesn't match (optimistic locking)

**Warning signs:**
- Gantt flickers/resets position after drag
- Task dates in Gantt don't match Task Board after page refresh
- Milestone moves trigger dozens of sequential API calls (N+1 pattern)
- Simultaneous edits from two users cause one user's changes to vanish

**Phase to address:**
DLVRY-02 (bi-directional sync) — requires transaction design, debounce implementation, and version column migration. Must include load testing with 50+ tasks in Gantt view.

---

### Pitfall 4: Filesystem Prompt Edit Security Holes

**What goes wrong:**
API route allows editing SKILL.md files with insufficient validation → user injects malicious prompt content → next skill execution sends attacker-controlled instructions to Claude → data exfiltration, prompt injection, or privilege escalation. Or: concurrent edits cause file corruption or lost updates.

**Why it happens:**
SKILL.md files live on disk at `/Users/.../cowork-skills/.skills/[skill-name]/SKILL.md` (not in database). Web UI edit means:
- API route reads file, user edits in textarea, API route writes back
- No atomic file locking (Node.js `fs.writeFile` can interleave writes)
- No validation that edited content is still a valid SKILL.md structure
- No audit trail of WHO changed WHAT in prompt (constraint: "prompts must not be modified" from PROJECT.md — but v7.0 explicitly adds editable prompts)

This contradicts "Skill Fidelity" constraint: "SKILL.md files read from disk at runtime; prompts must not be modified". v7.0 is intentionally relaxing this for "editable prompts UI" feature.

**How to avoid:**
1. **Read-only by default, explicit opt-in for editability** — add `editable: true` flag to skill metadata; only flagged skills show edit UI
2. **Atomic write with file locking** — use `fs.promises.open(..., 'wx')` for exclusive write, or proper-lockfile npm package
3. **Schema validation on write** — parse edited SKILL.md with markdown parser, verify required sections (`## Task`, `## Input`, `## Output`) still exist
4. **Prompt injection defense** — strip/escape any `</document>` tags, control characters, or nested XML tags user might inject
5. **Append-only audit log** — every edit creates entry in `skill_prompt_edits` table: `{skill_name, edited_by_user_id, edited_at, diff, version}`
6. **Backup before write** — copy current SKILL.md to `.planning/skill-backups/[skill-name]-[timestamp].md` before overwrite
7. **RBAC enforcement** — only project admins can edit prompts; requires `requireProjectRole(projectId, 'admin')`

**Warning signs:**
- Two users edit same skill simultaneously → one edit lost
- Skill execution fails with "missing required section" after edit
- Edited prompt contains suspicious XML tags or control characters
- No way to see who changed a prompt or rollback changes

**Phase to address:**
SKILL-03 (editable prompts) — must implement file locking, validation, and audit trail BEFORE exposing edit UI. Consider moving to DB storage instead of filesystem (breaking Cowork compatibility constraint).

---

### Pitfall 5: Project-Scoped Scheduling Metadata Filter Brittleness

**What goes wrong:**
BullMQ scheduled jobs use `metadata: { project_id }` for project scoping. Migration to project-scoped UI queries jobs with `getJobs()` then filters `job.data.metadata?.project_id === projectId` in application code. Results in:
- O(N) filtering (fetches all jobs, filters in-memory)
- Jobs with missing/malformed metadata pass through filter
- Admin "all projects" view has no efficient query path
- Job cancellation/edit doesn't verify user has admin role on job's project

**Why it happens:**
BullMQ doesn't natively support querying by nested metadata fields. `queue.getJobs(['active', 'waiting'])` returns ALL jobs. Current implementation (v2.0 Phase 24) already uses `project_id` in job data, but UI shows global view. v7.0 adds per-project scheduling UI → needs efficient per-project filtering.

Better-auth session context in route handlers has `user.id`, but no "current project" context → every job action API call must accept `projectId` and verify membership.

**How to avoid:**
1. **Redis Set index** — maintain `projects:{projectId}:jobs` Redis set; add job ID to set on schedule, remove on complete/fail; query set for project-scoped views
2. **Job name prefix convention** — name jobs `{projectId}:{skillName}:{timestamp}` → filter with `queue.getJobs()` then regex match `^${projectId}:`
3. **Pagination for global admin view** — don't fetch all jobs; use `queue.getJobs(type, start, end, asc)` with cursor pagination
4. **RBAC at job action level** — every cancel/edit/run-now API must: fetch job → extract `project_id` from job.data → call `requireProjectRole(projectId, 'admin')`
5. **Job metadata schema validation** — enforce `metadata: { project_id: string, user_id: string, skill_name: string }` at job creation; reject jobs with missing project_id

**Warning signs:**
- Scheduling UI slow to load (fetching 1000+ jobs then filtering)
- User can cancel another project's scheduled jobs
- Jobs created before v7.0 migration have no `project_id` metadata → invisible in new UI
- Redis memory grows unbounded (no job ID cleanup in index sets)

**Phase to address:**
SCHED-01 through SCHED-05 — Redis index must be implemented FIRST, then RBAC enforcement, then UI. Must handle backward compatibility with jobs created pre-v7.0 (add migration script to backfill metadata).

---

### Pitfall 6: Completeness Analysis Definition Drift

**What goes wrong:**
"Analyze Completeness" scores project against "expected data model" defined in code/config. Over time:
- New phases add tables/columns → old projects scored as "incomplete" for data that didn't exist when project was created
- Definition changes (e.g., "milestone needs owner" becomes required) → retroactively marks 100% complete projects as 70%
- No versioning of completeness rules → can't compare score trends over time

**Why it happens:**
Completeness is inherently a moving target. v3.0 Phase 30 Context Hub includes "completeness analysis with per-tab gap descriptions" but doesn't specify how rules evolve. With 57+ phases of schema evolution, definition of "complete" is ambiguous.

Implemented as code (likely `lib/completeness.ts` with rules like `hasOwner && hasDueDate && ...`) → code changes = definition changes = score changes without explicit versioning.

**How to avoid:**
1. **Version completeness schemas** — store rules as versioned JSON configs: `completeness_schema_v1.json`, `v2.json`, etc.; projects reference schema version at creation
2. **Grandfathering for schema upgrades** — new rules apply only to new projects OR after explicit project "upgrade schema version" action
3. **Score components separately** — don't show single "70% complete"; show "Actions: 100%, Risks: 80%, Team Stakeholders: 40%" with per-area breakdowns
4. **Time-series score storage** — store completeness scores in `completeness_snapshots` table with `{project_id, scored_at, schema_version, scores_json}`; enables trend tracking
5. **Optional vs required distinction** — rules marked `required: true` block project completion; `required: false` are nice-to-haves that don't affect core score

**Warning signs:**
- All project scores drop after deployment (definition changed)
- Users complain "it says we're incomplete but we filled everything in"
- No way to explain WHY a score is 75% vs 80%
- Completeness score changes on page refresh (non-deterministic rules)

**Phase to address:**
INGEST-04 (Analyze Completeness fix) — must define schema versioning and grandfathering strategy before fixing bugs in current implementation.

---

### Pitfall 7: Cross-Feature Integration Gap — Archive + RBAC

**What goes wrong:**
User archives project while scheduled jobs still running → jobs continue executing → job tries to update archived project data → error OR data written to archived project. Or: User loses project admin role during extraction job → job fails halfway through with 403 error.

**Why it happens:**
Features developed in isolation:
- **RBAC (AUTH-01-05):** Enforces roles at route handler level
- **Archive (PROJ-01-04):** Adds `archived_at` to projects, makes read-only
- **Scheduling (SCHED-01-05):** Project-scoped jobs
- **Extraction (existing v6.0):** BullMQ background jobs write data on approval

Integration matrix of 4 features = 6 interaction edges, easy to miss:
- Can archived project have scheduled jobs? (Should block or auto-cancel)
- Can non-admin restore archived project? (RBAC enforcement in restore route)
- Can extraction job write to project if user loses admin role during job? (Job runs under original user's identity)

**How to avoid:**
1. **Cross-feature validation matrix** — for each new feature, list all existing features; document interaction rules explicitly
2. **Pre-flight checks for destructive actions:**
   - Archive: cancel all scheduled jobs, wait for running jobs to finish OR warn user
   - Role change: check for in-flight jobs owned by user; warn if downgrading admin
3. **Background job identity context** — store `{ user_id, role_at_job_creation }` in job metadata; check role again before writes (don't assume still admin)
4. **Integration tests for cross-feature scenarios:**
   - Test: Archive project with running extraction job
   - Test: Remove user's admin role during scheduled skill execution
   - Test: Restore project that had jobs cancelled on archive
5. **Saga pattern for multi-step operations** — archive = "cancel jobs → wait for completion → set archived_at" atomic sequence with rollback on failure

**Warning signs:**
- Race condition bugs appear in production but not in unit tests
- Features work individually but break when used together
- "It worked before we added [feature]" bug reports
- Orphaned jobs running against archived projects

**Phase to address:**
ALL phases — requires integration testing phase AFTER core features ship individually. Add Phase 58 or 59: "Cross-feature integration validation" with dedicated test suite.

---

### Pitfall 8: Editable Prompts Cowork Compatibility Break

**What goes wrong:**
User edits SKILL.md in web UI → file differs from canonical version in Cowork skills repo → later Cowork skill update overwrites edited version → user changes lost. Or: exported context docs from app no longer compatible with Cowork skills because prompt expectations changed.

**Why it happens:**
Constraint from PROJECT.md: "Skill Fidelity: SKILL.md files read from disk at runtime; prompts must not be modified" AND "Cowork Compatibility: Exported context docs and action tracker must be readable by all Cowork skills without modification."

v7.0 explicitly adds editable prompts → breaks fidelity constraint. If user edits "Generate Action Items" prompt, output format may change → other skills expecting original format break.

**How to avoid:**
1. **Fork on edit** — edited skills create `SKILL.md.custom` alongside original `SKILL.md`; skill runner prefers `.custom` if exists
2. **Versioned skill registry** — track `{skill_name, version, is_custom_edited, edited_by, last_edit}` in DB; UI shows "Custom (edited 2026-04-10)" badge
3. **Export format validation** — if skill output is consumed by other skills, validate output still matches expected schema after prompt edit
4. **Rollback to canonical** — "Reset to default" button that deletes `.custom` and reverts to original SKILL.md from Cowork
5. **Block edits for integration-critical skills** — flag skills like "Context Extractor" as `editable: false` if other skills depend on their output format

**Warning signs:**
- User edits prompt, later updates to Cowork skills don't apply
- Exported action tracker CSV format changed → other tools can't parse it
- One edited skill breaks downstream skills in execution chain

**Phase to address:**
SKILL-03 (editable prompts) — must decide: fork-on-edit OR accept compatibility break with Cowork. Document decision and implement safeguards.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| In-memory filtering for project-scoped jobs instead of Redis index | 2 hours to ship feature | O(N) query, slow UI at 100+ jobs | MVP only; must add index in Phase 59 |
| Skip version column for Gantt optimistic locking | Simpler initial implementation | Race conditions on concurrent edits | Only if single-user project mode; never for multi-user |
| Global `archived_at IS NULL` filter in every query | Fastest to implement soft-delete | Hard to find all query callsites; bugs leak archived data | Never — use query layer abstraction from day 1 |
| Prompt edits directly overwrite SKILL.md without backup | No extra storage needed | Lost ability to rollback bad edits | Never — backups are required for filesystem writes from web UI |
| RBAC migration leaves global role column as fallback | Backward compatibility during transition | Security holes from mixed authorization logic | Only during 1-2 sprint transition; then hard cut |
| Completeness rules in code instead of versioned config | No config storage layer needed | Can't track why scores changed or compare across versions | POC only; production needs versioned schemas |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| better-auth + per-project roles | Storing project membership in JWT session (size explosion) | Store only user_id in session; query project_memberships on each request |
| Drizzle ORM + soft-delete | Using Drizzle's `.delete()` method | Always use `.update({ archived_at: new Date() })`; reserve `.delete()` for permanent delete |
| BullMQ + RBAC | Checking user role at job creation only | Re-check role on each job execution (user may lose admin role while job queued) |
| Custom Gantt + DB dates | Two-way binding causing update loops | Single source of truth (DB); Gantt always derives from DB; debounce writes |
| Node.js fs + concurrent writes | `fs.writeFileSync` interleaving | Use `proper-lockfile` or atomic write pattern with rename |
| PostgreSQL FKs + soft-delete | Cascade delete still triggers on `DELETE` | Change FK `onDelete` to `SET NULL` or `NO ACTION`; handle cleanup manually |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all BullMQ jobs and filtering by project_id | Scheduling page slow to load | Redis Set index for per-project job IDs | >100 total jobs across all projects |
| N+1 queries when cascading Gantt date updates | Milestone move triggers 50+ sequential DB calls | Bulk update in single transaction | >20 tasks tied to one milestone |
| Completeness analysis recalculating on every page view | Page load time >2s | Cache score in `completeness_snapshots` with 24hr TTL | >50 tabs to analyze per project |
| Unindexed `archived_at IS NULL` filter | Portfolio dashboard slow | Add partial index: `CREATE INDEX idx_projects_active ON projects (id) WHERE archived_at IS NULL` | >25 projects (per PERF-01) |
| Filesystem SKILL.md reads on every skill execution | Cold start 500ms | Read once at worker startup, cache in memory, watch file for changes | >10 concurrent skill executions |
| Querying project memberships without index | RBAC check slow on every API call | Add index: `CREATE INDEX idx_project_memberships_lookup ON project_memberships (user_id, project_id)` | >50 projects per user |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Checking RBAC only in middleware (CVE-2025-29927) | Next.js middleware bypass → unauthorized access | MUST call `requireProjectRole()` in every route handler (constraint already documented) |
| Trusting job metadata `user_id` without re-verification | Attacker spoofs user_id in job data → privilege escalation | Background jobs MUST query session/DB to verify user still has required role |
| No path sanitization in SKILL.md file writes | Path traversal: edit `../../../../etc/passwd` | Validate skill_name against whitelist; reject if contains `..` or `/` |
| Archived project data visible in autocomplete/search | Data leakage from "deleted" projects | All autocomplete queries MUST filter `archived_at IS NULL` |
| Prompt injection via edited SKILL.md | User injects `</document><instruction>Ignore previous instructions` | Escape/strip XML tags; validate prompt structure; consider sandboxing skill execution |
| No rate limiting on prompt edit API | Attacker rapidly overwrites SKILL.md → DoS or data loss | Rate limit: 5 edits per skill per hour per user |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Archiving project without warning about scheduled jobs | Jobs continue running → confusion | Pre-flight check modal: "This project has 3 active scheduled jobs. Cancel them before archiving?" |
| Gantt drag updates DB but doesn't show success feedback | User drags twice, thinking first drag failed → data inconsistency | Optimistic update with visual "saving..." indicator and success checkmark |
| Completeness score drops after schema upgrade with no explanation | User perceives regression: "we were 100%, now 70%" | Show diff: "New requirements: Team Stakeholders (0/5), WBS Coverage (40%)" |
| Prompt edit form doesn't show current prompt structure | User breaks required sections → skill fails | Split-pane editor: left = editable text, right = live preview with required section validation |
| Archive vs Delete not clearly distinguished | User archives thinking it's permanent delete → data still exists | Clear labels: "Archive (read-only, can restore)" vs "Permanently Delete (cannot undo)" |
| Per-project role change has no notification | User loses admin access with no explanation | Email notification + in-app banner: "Your role on [project] changed to User. Contact [admin] if this is incorrect." |

## "Looks Done But Isn't" Checklist

- [ ] **RBAC Migration:** All 40+ route handlers updated to use `requireProjectRole()` — verify with grep for old `requireSession()` without project check
- [ ] **Soft-Delete:** All queries using `projects` table have `archived_at IS NULL` filter — verify with DB query log analysis
- [ ] **Gantt Sync:** Tested with 50+ tasks, concurrent edits from 2 users, and during in-flight API call — verify no race conditions
- [ ] **Prompt Editing:** File locking implemented, backup created before write, audit log entry recorded — verify with concurrent edit test
- [ ] **Project-Scoped Jobs:** Redis index created, RBAC verified on cancel/edit, backward compatibility for pre-v7.0 jobs — verify with migration script
- [ ] **Completeness:** Schema versioned, scores reproducible, trend tracking works — verify score doesn't change on refresh
- [ ] **Archive + Jobs:** Scheduled jobs cancelled before archive, in-flight jobs complete before archive proceeds — verify with integration test
- [ ] **Prompt + Cowork:** Edited skills forked or flagged, rollback to canonical works — verify Cowork skill updates don't overwrite edits

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RBAC leakage after migration | HIGH (security incident) | 1. Immediate: disable affected route handlers<br>2. Audit: review access logs for unauthorized access<br>3. Fix: add `requireProjectRole` to all missed handlers<br>4. Redeploy and verify with E2E test suite |
| Soft-delete cascade breaks restore | MEDIUM | 1. DB backup restore to pre-archive state<br>2. Analyze: map all FK dependencies<br>3. Implement: cascade restore logic in transaction<br>4. Test: archive → restore → verify all child records |
| Gantt sync infinite loop | LOW | 1. Browser refresh to reset Gantt state<br>2. Fix: add debounce to drag handler<br>3. Add circuit breaker: max 5 updates per 10 seconds |
| Prompt edit corrupts SKILL.md | MEDIUM | 1. Restore from `.planning/skill-backups/` directory<br>2. If no backup: git checkout original from Cowork repo<br>3. Add file locking to prevent future corruption |
| BullMQ job metadata missing project_id | MEDIUM | 1. Migration script: backfill metadata from job name or related DB records<br>2. Add schema validation to reject future jobs without metadata |
| Completeness scores drop after deploy | LOW | 1. Document schema version change in release notes<br>2. Provide "Recalculate with old schema" button for comparison<br>3. Grandfather existing projects to old schema version |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RBAC leakage | AUTH-01 through AUTH-05 (FIRST) | E2E test suite covers all 40+ route handlers; zero `user.role` references outside `lib/auth-rbac.ts` |
| Soft-delete cascade | PROJ-01 (before UI) | All `projects` queries filtered; integration test: archive → query → verify no archived data in results |
| Gantt sync race conditions | DLVRY-02 | Load test: 50 tasks, 2 concurrent users, drag + edit simultaneously → no data loss; advisory lock visible in DB logs |
| Prompt edit security | SKILL-03 | File locking test: 2 concurrent edits → one waits for other; path traversal test: reject `../` in skill_name |
| Project-scoped job filter | SCHED-01 (before UI) | Redis index created; query time <100ms for 200 jobs; RBAC test: user can't cancel other project's job |
| Completeness drift | INGEST-04 | Schema version stored; score reproducible; trend chart shows historical scores with schema version annotations |
| Archive + RBAC integration | Phase 58/59 (integration phase) | Cross-feature test matrix: archive with running jobs, role change during job, restore with jobs |
| Prompt + Cowork compatibility | SKILL-03 | Fork-on-edit verified; Cowork update doesn't overwrite custom edits; rollback button restores canonical |

## Sources

- **Project architecture:** `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/PROJECT.md` — system constraints, tech stack, 57-phase evolution history
- **Existing RBAC:** v3.0 Phase 26 implementation (40+ route handlers with `requireSession()` at handler level; CVE-2025-29927 defense-in-depth pattern)
- **BullMQ patterns:** v2.0 Phase 24 (scheduler infrastructure with `project_id` metadata)
- **Gantt implementation:** v5.0 Phase 38 (custom GanttChart.tsx with drag-to-reschedule, milestone markers)
- **Extraction pipeline:** v6.0 Phases 52-57 (multi-pass with tool use API, synthesis-first, approval flow)
- **better-auth security:** Known limitation — session storage should not include large objects; per-project roles must query DB on each request
- **Drizzle soft-delete patterns:** Community best practice — never use `.delete()` for soft-delete; partial indexes for performance
- **PostgreSQL advisory locks:** Official docs — `pg_advisory_xact_lock(bigint)` for application-level locking during cascading updates
- **Node.js filesystem concurrency:** `proper-lockfile` npm package — standard solution for atomic file writes from concurrent processes

---
*Pitfalls research for: v7.0 Governance & Operational Maturity — adding RBAC, soft-delete, bi-directional sync, filesystem editing, and project-scoped scheduling to existing system*
*Researched: 2026-04-13*
*Context: 69,606 LOC TypeScript codebase, 57+ phases of schema evolution, 40+ existing route handlers, complex relational DB*
