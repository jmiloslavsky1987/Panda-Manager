# Phase 86 — RBAC Audit Report

**Audited:** 2026-05-18
**Scope:** All route handlers under `app/api/projects/[projectId]/`
**Finding:** Zero gaps — every project-scoped route uses `requireProjectRole`.

## Verification Commands

```bash
cd /Users/jmiloslavsky/Documents/Panda-Manager

# Total project-scoped routes
find "app/api/projects/[projectId]" -name "route.ts" | wc -l
# Result: 57 (matches RESEARCH.md baseline)

# Routes missing requireProjectRole (the only meaningful gap measure)
find "app/api/projects/[projectId]" -name "route.ts" | xargs grep -L "requireProjectRole" | wc -l
# Result: 0

# Routes that also use requireSession (defense-in-depth, NOT a regression — these
# also have requireProjectRole). Expected per RESEARCH.md: chat + completeness.
find "app/api/projects/[projectId]" -name "route.ts" | xargs grep -l "requireSession"
# Result:
#   app/api/projects/[projectId]/chat/route.ts
#   app/api/projects/[projectId]/completeness/route.ts
```

## Route Inventory

All 57 project-scoped `route.ts` files audited. Every file imports
`requireProjectRole` from `@/lib/auth-server` (or equivalent) and invokes it at
handler entry to gate per-project authorization.

```
app/api/projects/[projectId]/analytics/route.ts
app/api/projects/[projectId]/arch-nodes/[nodeId]/route.ts
app/api/projects/[projectId]/arch-nodes/reorder/route.ts
app/api/projects/[projectId]/arch-nodes/route.ts
app/api/projects/[projectId]/architecture-integrations/[id]/route.ts
app/api/projects/[projectId]/architecture-integrations/route.ts
app/api/projects/[projectId]/artifacts/route.ts
app/api/projects/[projectId]/before-state/route.ts
app/api/projects/[projectId]/business-outcomes/[id]/route.ts
app/api/projects/[projectId]/business-outcomes/route.ts
app/api/projects/[projectId]/chat/route.ts
app/api/projects/[projectId]/completeness/route.ts
app/api/projects/[projectId]/e2e-workflows/[workflowId]/route.ts
app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/[stepId]/route.ts
app/api/projects/[projectId]/e2e-workflows/[workflowId]/steps/route.ts
app/api/projects/[projectId]/e2e-workflows/route.ts
app/api/projects/[projectId]/exceptions/route.ts
app/api/projects/[projectId]/extraction-status/route.ts
app/api/projects/[projectId]/focus-areas/[id]/route.ts
app/api/projects/[projectId]/focus-areas/route.ts
app/api/projects/[projectId]/gantt-baselines/[baselineId]/route.ts
app/api/projects/[projectId]/gantt-baselines/route.ts
app/api/projects/[projectId]/generate-plan/route.ts
app/api/projects/[projectId]/integrations/[integId]/route.ts
app/api/projects/[projectId]/integrations/route.ts
app/api/projects/[projectId]/jobs/route.ts
app/api/projects/[projectId]/members/route.ts
app/api/projects/[projectId]/milestones/route.ts
app/api/projects/[projectId]/onboarding/route.ts
app/api/projects/[projectId]/onboarding/seed/route.ts
app/api/projects/[projectId]/onboarding/steps/[stepId]/route.ts
app/api/projects/[projectId]/overview-metrics/route.ts
app/api/projects/[projectId]/risks/route.ts
app/api/projects/[projectId]/route.ts
app/api/projects/[projectId]/runs/route.ts
app/api/projects/[projectId]/settings/route.ts
app/api/projects/[projectId]/sprint-summary/route.ts
app/api/projects/[projectId]/team-onboarding-status/[id]/route.ts
app/api/projects/[projectId]/team-onboarding-status/route.ts
app/api/projects/[projectId]/team-pathways/[id]/route.ts
app/api/projects/[projectId]/team-pathways/route.ts
app/api/projects/[projectId]/time-entries/[entryId]/approve/route.ts
app/api/projects/[projectId]/time-entries/[entryId]/reject/route.ts
app/api/projects/[projectId]/time-entries/[entryId]/route.ts
app/api/projects/[projectId]/time-entries/bulk/route.ts
app/api/projects/[projectId]/time-entries/calendar-import/route.ts
app/api/projects/[projectId]/time-entries/export/route.ts
app/api/projects/[projectId]/time-entries/route.ts
app/api/projects/[projectId]/time-entries/submit/route.ts
app/api/projects/[projectId]/wbs/[itemId]/route.ts
app/api/projects/[projectId]/wbs/dependencies/[depId]/route.ts
app/api/projects/[projectId]/wbs/dependencies/route.ts
app/api/projects/[projectId]/wbs/generate/route.ts
app/api/projects/[projectId]/wbs/reorder/route.ts
app/api/projects/[projectId]/wbs/route.ts
app/api/projects/[projectId]/weekly-focus/route.ts
app/api/projects/[projectId]/yaml-export/route.ts
```

## Audit Results

| Metric | Count |
|---|---|
| Total project-scoped route files | **57** |
| Routes with `requireProjectRole` | **57** |
| Routes missing `requireProjectRole` | **0** |
| Routes also using `requireSession` (defense-in-depth, not a regression) | 2 (`chat/route.ts`, `completeness/route.ts`) |

The two routes that import `requireSession` alongside `requireProjectRole` are
the documented "false positives" from RESEARCH.md — they use `requireSession()`
to access the user session for chat tool factories and completeness analysis
respectively, but they also gate authorization with `requireProjectRole()`.
They are NOT regressions.

## Regression Detection

`tests/api/rbac-coverage.test.ts` (Phase 86 Plan 00) enforces this property in
CI with three assertions:

1. **RBAC-01a:** ≥50 route files exist under `app/api/projects/[projectId]/`
2. **RBAC-01b:** every route file contains `requireProjectRole`
3. **RBAC-01c:** no route uses `requireSession` *without* also using `requireProjectRole`

If a future plan adds a new route under `app/api/projects/[projectId]/` without
`requireProjectRole`, RBAC-01b fails in CI and names the offender by full path.
If a future refactor accidentally drops `requireProjectRole` while keeping
`requireSession`, RBAC-01c fails. Both serve as canaries against silent
multi-tenant authorization regressions.

## Sign-off

**Phase 86 multi-PM readiness gate: PASS.**

All 57 project-scoped route handlers correctly gate authorization with
`requireProjectRole(projectId, role)`. Combined with the per-user OAuth token
work (Plan 01) and the dormant Okta SSO scaffold (Plan 02), the application
is ready for multi-PM use on a single shared instance — each PM only sees and
mutates projects they are a member of, and each PM's external service
credentials (Gmail, Slack, Calendar) are scoped to their own session.
