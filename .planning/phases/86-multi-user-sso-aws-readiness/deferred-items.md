# Deferred Items — Phase 86

## From Plan 00 Execution (2026-05-18)

### REQUIREMENTS.md missing Phase 86 requirement IDs

**Found during:** Final state-update step (`requirements mark-complete` returned `not_found` for all 16 IDs).

**Issue:** `.planning/REQUIREMENTS.md` does not yet contain the Phase 86 requirement IDs that Plan 00's frontmatter references:

- `DORM-01..04` (Okta dormancy contract)
- `TOKEN-01..04` (per-user OAuth token isolation)
- `HEALTH-01..04` (unauthenticated /api/health endpoint)
- `BACKUP-01..03` (pg_dump retention job)
- `RBAC-01` (project-scoped route coverage)

The file currently has v10/v11/v12 requirements (CAL, PREP, SKILL, NAV, RECUR, OUT, AVAIL, SCHED, KDS, WBS) but no v11.0 SSO/AWS-readiness section.

**Why not auto-fixed in Plan 00:** Out of scope. Plan 00 is the Wave 0 RED-gate test scaffolding. Adding requirement definitions to REQUIREMENTS.md requires phase-scoping context (acceptance criteria text, traceability rows, coverage counts) that is owned by Phase 86 planning, not test execution.

**Recommended fix:** During Plan 01 (per-user tokens) or as a Phase 86 housekeeping step before Plan 05 (manual verification), add the 16 requirement IDs to REQUIREMENTS.md with their acceptance criteria and traceability rows. Reference `.planning/phases/86-multi-user-sso-aws-readiness/86-CONTEXT.md` and `86-VALIDATION.md` for canonical definitions.

**Tracking:** Requirements are correctly enumerated in `86-00-PLAN.md` frontmatter and in `86-00-SUMMARY.md` `requirements-completed` field. RED gates exist for all 16 — the tests will go GREEN as Plans 01-04 ship. The only gap is the REQUIREMENTS.md index entry, which is documentation hygiene rather than a correctness issue.
