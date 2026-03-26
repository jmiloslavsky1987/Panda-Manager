# Phase 16: Verification Retrofit - Research

**Researched:** 2026-03-25
**Domain:** GSD verification workflow — retroactive VERIFICATION.md production for 5 executed phases
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
*(None — user deferred all decisions to Claude)*

### Claude's Discretion
All implementation decisions deferred to Claude. Key decisions already recorded in CONTEXT.md:

- **Gap response policy**: If verifier finds a requirement unmet, record in VERIFICATION.md with `status: gaps_found` or flag individual items as `human_needed`. Do NOT create inline remediation tasks within Phase 16 plans — gaps become input for a future gap-closure phase.
- **Acceptable end states**: `passed`, `human_needed`, and `gaps_found` are all acceptable — goal is to produce the document, not force a PASSED verdict.
- **Verification target**: Each verifier run scans the live codebase (actual source files) plus the phase's PLAN.md, SUMMARY.md, and VALIDATION.md files — code is the authoritative source.
- **Plan granularity**: 1 plan per target phase (5 plans total). No splitting.
- **Parallelization**: All 5 plans execute in Wave 1 in parallel — they touch different phase directories with no cross-dependencies.

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | DB schema implements all tables with PostgreSQL RLS enforced at DB layer | Phase 01 VALIDATION.md and SUMMARY.md confirm schema.test.ts and rls.test.ts were written; code lives in bigpanda-app/db/schema.ts |
| DATA-02 | Append-only tables enforced by DB trigger | append-only.test.ts written in Phase 01; triggers in migration SQL |
| DATA-03 | Migration script imports 3 customer context docs (YAML frontmatter → DB) | migrate-local.ts with runMigration(); tests in migration.test.ts |
| DATA-04 | Migration script imports PA3_Action_Tracker.xlsx | importXlsx() in migrate-local.ts; Plan 01-06 |
| DATA-05 | YAML export round-trip fidelity | yaml-export.ts; yaml-roundtrip.test.ts; js-yaml settings locked |
| DATA-06 | Multi-account architecture; no hardcoded customer names | RLS in schema; rls.test.ts |
| DATA-07 | Idempotency key and status field on outputs table | outputs.test.ts; Plan 01-04 |
| DATA-08 | PostgreSQL connection pool as singleton | pool.test.ts; Plan 01-02 |
| SET-01 | Workspace path configuration | settings.test.ts; Plan 01-03 |
| SET-03 | Schedule time configuration per background job | settings.test.ts; Plan 01-03 |
| SET-04 | Anthropic API key stored securely | settings.test.ts; manual verification needed |
| SCHED-01 | BullMQ worker as dedicated process; no duplicate firing | Phase 04 plans; phase4.spec.ts E2E |
| SCHED-02 | Daily 8am: Morning Briefing background job | Phase 04 scheduler config |
| SCHED-03 | Daily 8am: Cross-account health check | Phase 04 scheduler config; Phase 15 confirmed present |
| SCHED-04 | Daily 9am: Overnight Slack + Gmail sweep | Phase 04 scheduler config |
| SCHED-05 | Monday 7am: Full Customer Project Tracker run | Phase 04 scheduler config |
| SCHED-06 | Thursday 4pm: Weekly Status Draft for all accounts | Phase 04 scheduler config |
| SCHED-07 | Friday 9am: Biggy Weekly Briefing generation | Phase 04 scheduler config |
| SCHED-08 | Schedule times configurable via Settings; jobs show status in UI | Phase 04 plans; phase4.spec.ts |
| SKILL-02 | Token budget guard in context assembly | Phase 05 skill-engine plans; phase5.spec.ts covers SKILL-02 |
| SKILL-10 | Customer Project Tracker skill (Gmail/Slack/Gong sweep) | Phase 06 plans; phase6.spec.ts |
| SKILL-14 | SKILL.md files read from disk at runtime; skill_path configurable | Phase 15 confirmed; phase5.spec.ts |
| OUT-01 | All generated files registered in outputs table | skill-run.ts bug fixed in 05-06; phase5.spec.ts |
| OUT-02 | Output Library view filterable by account/skill/date | phase5.spec.ts covers OUT-02 |
| OUT-03 | HTML inline render; .docx/.pptx open via system app | phase5.spec.ts covers OUT-03 |
| OUT-04 | Regenerate action re-runs skill; old archived, new registered | phase5.spec.ts covers OUT-04 |
| TIME-01 | Time tab — time log, entries table, total hours, date filter | Phase 05.2 plans; phase5.2.spec.ts |
| TIME-02 | Add, edit, delete time entries | Phase 05.2 plans; phase5.2.spec.ts |
| TIME-03 | Export time entries as CSV | Phase 05.2 plans; phase5.2.spec.ts |
| DASH-04 | Cross-project Risk Heat Map on dashboard | Phase 06 plans; phase6.spec.ts |
| DASH-05 | Cross-Account Watch List on dashboard | Phase 06 plans; phase6.spec.ts |
</phase_requirements>

---

## Summary

Phase 16 is a documentation and audit pass — not an implementation phase. Five phases (01, 04, 05, 05.2, 06) were fully executed and their code is in the live codebase, but no VERIFICATION.md was ever produced for them. The gsd-verifier agent is the established tool for this work, having already produced VERIFICATION.md files for Phases 02, 03, 07, 08, 09, 10, 11, 12, 13, 14, and 15.

Each plan in Phase 16 is a single gsd-verifier invocation targeting one unverified phase. The verifier reads the live source code (bigpanda-app/ tree) along with the phase's PLAN.md files, SUMMARY.md files, and VALIDATION.md to form evidence-based verdicts on each requirement. Code is the authoritative ground truth — if the code satisfies the requirement, it is VERIFIED regardless of whether a test was green at the time.

The primary planning consideration is knowing the exact scope of each verification run: which requirement IDs to pass, where the phase directory is, and what code evidence the verifier should expect to find. There is some nuance around requirements where the code condition is ambiguous (e.g., SCHED-02 through SCHED-07 for Phase 04 which may have been partially supplanted by later phases, and SET-04 which requires runtime/git inspection).

**Primary recommendation:** Spawn gsd-verifier once per target phase as a parallel Wave 1, passing the full requirement ID list and pointing to both the phase directory and the live codebase root. Accept any status in {passed, human_needed, gaps_found} as phase-complete.

---

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| gsd-verifier | project standard | Retroactive VERIFICATION.md production | Established tool; 11 prior VERIFICATION.md files produced |
| PLAN.md files | per-phase | Evidence source for verifier | Every executed phase has them |
| SUMMARY.md files | per-phase | Evidence source; records what was actually built | Every executed plan has one |
| VALIDATION.md | per-phase | Test map reference for verifier | Every target phase has one |

### Verification Output Format (from confirmed existing examples)

All VERIFICATION.md files in this project share a consistent structure:

```yaml
---
phase: {slug}
verified: {ISO timestamp}
status: passed | human_needed | gaps_found
score: {N}/{N} automated must-haves verified
re_verification: false
human_verification:
  - test: "..."
    expected: "..."
    why_human: "..."
---
```

Body sections (in order):
1. `## Goal Achievement` — Observable Truths table (# | Truth | Status | Evidence)
2. `### Required Artifacts` — Expected file → Status → Details
3. `### Key Link Verification` — From → To → Via → Status
4. `### Requirements Coverage` — Req ID | Source Plan | Description | Status | Evidence
5. `### Anti-Patterns Found` — file/line/pattern/severity/impact
6. `### TypeScript Compilation` — pre-existing errors vs new errors
7. `### Human Verification Required` — numbered items with test/expected/why_human
8. `### Gaps Summary` — narrative of any gaps found

This format is confirmed HIGH confidence from 11 existing VERIFICATION.md files in the repo.

---

## Architecture Patterns

### Recommended Plan Structure (per-plan)

Each of the 5 plans has an identical structure — the only variation is the phase target:

```
Plan 16-XX: Verify Phase YY (REQUIREMENT-LIST)

Wave 1:
  Task 1: Run gsd-verifier on Phase YY
    - Agent: gsd-verifier
    - Phase directory: .planning/phases/YY-slug/
    - Requirements: [full list]
    - Codebase root: bigpanda-app/
    - Evidence sources: YY-NN-PLAN.md, YY-NN-SUMMARY.md, YY-VALIDATION.md
    - Output: .planning/phases/YY-slug/YY-VERIFICATION.md
```

### Wave Parallelization

All 5 plans are Wave 1 tasks with no cross-dependencies:

```
Wave 1 (parallel):
  16-01: gsd-verifier → Phase 01
  16-02: gsd-verifier → Phase 04
  16-03: gsd-verifier → Phase 05
  16-04: gsd-verifier → Phase 05.2
  16-05: gsd-verifier → Phase 06
```

No Wave 0 required — no test files to scaffold, no code changes, no Wave 0 stubs needed.

### Anti-Patterns to Avoid

- **Forcing PASSED status:** Verifier must reflect actual code state. If a requirement is missing, `gaps_found` is the correct and acceptable outcome per CONTEXT.md decisions.
- **Remediation within Phase 16 plans:** Plans must not include implementation tasks. Gaps become a future phase's input.
- **Reading only SUMMARY.md:** The verifier must inspect the live codebase files directly. SUMMARY.md documents intent; the actual files in bigpanda-app/ are the ground truth.
- **Conflating Phase 16 ownership with earlier phase implementations:** Requirements like SCHED-02, SKILL-10, TIME-01..03 were implemented in phases 04, 06, 05.2 respectively — Phase 16 only VERIFIES them, it does not implement them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| VERIFICATION.md format | Custom verification document | gsd-verifier agent | Consistent format; established pattern; all prior VERIFICATION.md files produced this way |
| Requirement tracing | Manual requirement listing | Pass IDs directly from ROADMAP.md Phase 16 section | Already enumerated with exact IDs |
| Evidence finding | Manual file search | gsd-verifier's codebase scan | It reads source directly; human searching introduces error |

---

## Common Pitfalls

### Pitfall 1: SCHED-02/04/05/06/07 — Scheduler Requirements that May Show as Gaps

**What goes wrong:** Phase 04 implemented the BullMQ infrastructure and registered handlers, but SCHED-02 (Morning Briefing 8am), SCHED-04 (Slack/Gmail sweep), SCHED-05 (Project Tracker Monday), SCHED-06 (Weekly Status Thursday), and SCHED-07 (Biggy Weekly Briefing Friday) require live scheduled handlers that may not all have been wired in Phase 04's scope. Phase 15 confirmed `morning-briefing` and `weekly-customer-status` are registered, but action-sync and others were REMOVED as phantoms.

**Why it happens:** Phase 04 built the scheduling infrastructure (SCHED-01, SCHED-08) but some named schedules were stubbed or deferred to later phases (Phases 09, 15). The Phase 15 VERIFICATION.md explicitly notes `action-sync` and `weekly-briefing` were removed as phantom entries.

**How to avoid:** Verifier should check the current JOB_SCHEDULE_MAP in `bigpanda-app/worker/scheduler.ts` to determine which jobs are actually registered. If SCHED-02 through SCHED-07 are only partially satisfied, the correct verdict is `gaps_found` for those items with specific notes — NOT a blanket failure of the entire phase.

**Warning signs:** JOB_SCHEDULE_MAP has fewer entries than expected; removeJobScheduler calls appear at top of registerAllSchedulers.

### Pitfall 2: DATA-01..08 and SET-01/03/04 — Tests Remain RED for DB-Dependent Items

**What goes wrong:** Phase 01 VALIDATION.md documents that all migration/schema tests are expected to remain RED until PostgreSQL is installed (ECONNREFUSED expected). This is by design, not a failure.

**Why it happens:** Development was done on a machine without PostgreSQL installed. The test infrastructure was built correctly but could not be run against a live DB.

**How to avoid:** Verifier should verify the CODE structure (schema definitions, trigger SQL, migration functions) directly. A requirement can be VERIFIED via code evidence even when the test is RED due to infrastructure unavailability. This is consistent with how Phase 15 accepted unit test structural verification for BullMQ runtime state.

**Warning signs:** Tests in `tests/schema.test.ts`, `tests/append-only.test.ts`, `tests/migration.test.ts` all fail with ECONNREFUSED — expected, not a code defect.

### Pitfall 3: OUT-01..04 — Bug Was Fixed in Phase 05-06, Not 05-01..05

**What goes wrong:** The `skill-run.ts` generic handler had a bug where it did NOT write to `outputs` or `drafts` tables. This was discovered and fixed in Plan 05-06 during human verification. The verifier should check the CURRENT state of `skill-run.ts`, not the original Phase 05 plans.

**Why it happens:** Code is the ground truth. The bug fix is in the current codebase. The SUMMARY for 05-06 explicitly records the fix.

**How to avoid:** Verifier reads the live file. OUT-01..04 should come back VERIFIED in the current codebase because the fix was applied before Phase 05 closed.

### Pitfall 4: SET-04 — API Key Secrecy Requires Git Inspection

**What goes wrong:** SET-04 requires that the Anthropic API key is NOT in any committed file. This cannot be verified by reading source files alone — it requires checking git history.

**Why it happens:** By nature of the requirement (absence of a secret), code inspection is insufficient.

**How to avoid:** The verifier should flag SET-04 as `human_needed` with instructions: `git log --all -- .env* && git log --all -- *.json` to assert no API key values appear. This mirrors the approach documented in Phase 01 VALIDATION.md's Manual-Only Verifications table.

### Pitfall 5: TIME-01..03 and DASH-04/05 — Phases 05.2 and 06 May Have Gaps

**What goes wrong:** Phases 05.2 (Time Tracking) and 06 (MCP Integrations) appear in STATE.md as "Not started" — the project state shows them as unexecuted phases.

**Why it happens:** Looking at STATE.md Phase Progress table: `05.1 Onboarding Dashboard: Not started`, `05.2 Time Tracking: Not started`, `06 MCP Integrations: Not started`. However, REQUIREMENTS.md Traceability table assigns TIME-01..03, SKILL-10, DASH-04/05 to "Phase 16: Pending" — meaning these requirements were NEVER implemented; they are orphaned in a different sense (never built, not just never formally verified).

**How to avoid:** This is a CRITICAL distinction. For Phases 05.2 and 06, the verifier may find `gaps_found` because the code was never written — not just unverified. The CONTEXT.md decision is clear: `gaps_found` is acceptable. These gaps would then feed a future implementation phase.

**Confirm by:** Checking for `bigpanda-app/app/customer/[id]/time/` route (TIME-01), `bigpanda-app/worker/jobs/customer-project-tracker.ts` (SKILL-10), risk heat map component on dashboard (DASH-04), watch list component (DASH-05).

**Warning signs:** Phase directories for 05.2 and 06 have PLAN.md and SUMMARY.md files in `.planning/phases/` but the actual application code may be absent from `bigpanda-app/`.

---

## Code Examples

### Pattern: How gsd-verifier is invoked (from Phase 15 as reference)

The verifier is spawned as a sub-agent with a specific prompt that includes:
- Phase number and slug
- Phase directory path
- Requirement IDs to cover
- Codebase root path
- Available evidence files (PLAN.md, SUMMARY.md, VALIDATION.md list)

The output VERIFICATION.md is written to the phase directory using the Write tool.

### Confirmed VERIFICATION.md Frontmatter Schema

```yaml
---
phase: {slug-string}          # e.g. "15-scheduler-ui-fixes"
verified: {ISO-8601}          # e.g. "2026-03-25T17:45:00Z"
status: passed                # OR human_needed OR gaps_found
score: {N}/{M} automated must-haves verified
re_verification: false        # true only on re-run
human_verification:           # list; empty array if none
  - test: "..."
    expected: "..."
    why_human: "..."
---
```

### Confirmed Requirements Coverage Table Format

```markdown
| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DATA-01 | Plans 01-01, 01-02 | DB schema with all tables + RLS | SATISFIED | ... |
```

Status values used in existing files: `SATISFIED`, `SATISFIED (indirect)`, `SATISFIED (enhanced)`, `NEEDS HUMAN`, `NOT FOUND`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual code review | gsd-verifier agent with structured output | Phase 02+ (established) | Consistent VERIFICATION.md format across all phases |
| Inline remediation in verification | Gaps recorded, closure deferred to future phase | Phase 16 decision | Clean separation of audit from remediation |

---

## Open Questions

1. **Are Phases 05.2 and 06 actually unimplemented in the codebase?**
   - What we know: STATE.md marks both as "Not started". REQUIREMENTS.md assigns their requirements to "Phase 16: Pending". The phase directories exist in `.planning/phases/` with PLAN.md, SUMMARY.md, and VALIDATION.md files.
   - What's unclear: Whether those PLAN/SUMMARY files represent plans that were executed but not tracked in STATE.md, or plans that were drafted but never run.
   - Recommendation: The verifier for Plans 16-04 and 16-05 should check the live codebase first (e.g., does `bigpanda-app/app/customer/[id]/time/` exist?). If the code is missing, record `gaps_found` per CONTEXT.md policy. If code exists despite STATE.md saying "Not started", the verifier proceeds normally.

2. **SCHED-02, SCHED-04..07 implementation status**
   - What we know: Phase 04 built BullMQ infrastructure. Phase 15 removed phantom scheduler entries. Current scheduler.ts has `morning-briefing` and `weekly-customer-status` registered; others removed.
   - What's unclear: Whether job handlers for SCHED-04 (Slack/Gmail sweep), SCHED-05 (Project Tracker Monday), SCHED-06 (Thursday Weekly Status Draft), SCHED-07 (Friday Biggy Briefing) exist in `bigpanda-app/worker/jobs/`.
   - Recommendation: The verifier for Plan 16-02 (Phase 04) should inspect `bigpanda-app/worker/jobs/` directory listing and `scheduler.ts` JOB_SCHEDULE_MAP. Individual SCHED items may be `gaps_found`.

3. **SKILL-02 token budget guard — where is it implemented?**
   - What we know: Phase 05 VALIDATION.md shows `5-02-02` covers SKILL-02 via `phase5.spec.ts --grep "SKILL-02"`. Phase 05-06 SUMMARY reports "13/13 GREEN".
   - What's unclear: Which file actually implements the token budget estimation/truncation logic.
   - Recommendation: Verifier should grep for token budget logic in `bigpanda-app/lib/` or `bigpanda-app/workers/`. If the E2E test is green but the code is a no-op stub, flag as `gaps_found`.

---

## Validation Architecture

> `nyquist_validation: true` is set in `.planning/config.json` — this section is included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — Phase 16 produces no new application code |
| Config file | N/A |
| Quick run command | N/A |
| Full suite command | N/A |

Phase 16 is a documentation-only pass. No new test files are created or required. The "tests" for Phase 16 are the VERIFICATION.md files themselves — their existence and coverage of the required requirement IDs is the success criterion.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01..08, SET-01/03/04 | 01-VERIFICATION.md exists and covers these IDs | file existence check | `test -f .planning/phases/01-data-foundation/01-VERIFICATION.md` | ❌ Wave 0 |
| SCHED-01..08 | 04-VERIFICATION.md exists and covers these IDs | file existence check | `test -f .planning/phases/04-job-infrastructure/04-VERIFICATION.md` | ❌ Wave 0 |
| SKILL-02/14, OUT-01..04 | 05-VERIFICATION.md exists and covers these IDs | file existence check | `test -f .planning/phases/05-skill-engine/05-VERIFICATION.md` | ❌ Wave 0 |
| TIME-01..03 | 05.2-VERIFICATION.md exists and covers these IDs | file existence check | `test -f .planning/phases/05.2-time-tracking/05.2-VERIFICATION.md` | ❌ Wave 0 |
| SKILL-10, DASH-04/05 | 06-VERIFICATION.md exists and covers these IDs | file existence check | `test -f .planning/phases/06-mcp-integrations/06-VERIFICATION.md` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Confirm VERIFICATION.md file was written and frontmatter `status` field is set
- **Per wave merge:** All 5 VERIFICATION.md files exist
- **Phase gate:** All 5 files exist before `/gsd:verify-work`

### Wave 0 Gaps

None — Phase 16 requires no Wave 0 setup. No test stubs, no framework install, no fixture files. The 5 VERIFICATION.md files are the deliverables, not tests for deliverables.

---

## Sources

### Primary (HIGH confidence)

- `.planning/phases/15-scheduler-ui-fixes/15-VERIFICATION.md` — canonical VERIFICATION.md format reference (most recent example)
- `.planning/phases/02-app-shell-read-surface/02-VERIFICATION.md` — earlier format reference, confirms consistency
- `.planning/phases/16-verification-retrofit/16-CONTEXT.md` — all constraint and decision documentation
- `.planning/REQUIREMENTS.md` — authoritative requirement ID definitions and traceability table
- `.planning/ROADMAP.md` — Phase 16 success criteria and plan list
- `.planning/config.json` — workflow settings (nyquist_validation: true, commit_docs: true)
- `.planning/phases/01-data-foundation/01-VALIDATION.md` — evidence map for DATA-01..08, SET-01..04
- `.planning/phases/04-job-infrastructure/04-VALIDATION.md` — evidence map for SCHED-01..08
- `.planning/phases/05-skill-engine/05-VALIDATION.md` — evidence map for SKILL-01..14, OUT-01..04
- `.planning/phases/05.2-time-tracking/05.2-VALIDATION.md` — evidence map for TIME-01..03
- `.planning/phases/06-mcp-integrations/06-VALIDATION.md` — evidence map for SKILL-10, DASH-04/05
- `.planning/phases/05-skill-engine/05-06-SUMMARY.md` — records OUT-01..04 bug fix (critical for verification)
- `.planning/STATE.md` — records phases 05.2 and 06 as "Not started" (critical open question)

### Secondary (MEDIUM confidence)

- 11 additional VERIFICATION.md files in `.planning/phases/*/` confirm format consistency across the project

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- gsd-verifier invocation pattern: HIGH — 11 prior VERIFICATION.md files confirm the workflow
- VERIFICATION.md output format: HIGH — directly read from 2 recent examples
- Target phase code completeness (01, 04, 05): HIGH — STATE.md confirms COMPLETE
- Target phase code completeness (05.2, 06): LOW — STATE.md says "Not started"; open question whether code was built
- SCHED-02..07 handler existence: LOW — Phase 15 removed phantoms; current handler inventory unknown without codebase scan
- SKILL-02 token budget implementation depth: MEDIUM — E2E test was green but implementation details unconfirmed

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain — gsd-verifier format unlikely to change)
