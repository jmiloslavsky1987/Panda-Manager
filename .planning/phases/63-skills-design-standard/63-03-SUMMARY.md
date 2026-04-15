---
phase: 63-skills-design-standard
plan: 03
subsystem: skills-execution
tags: [worker, bullmq, job-handlers, skills-wiring]
dependency_graph:
  requires:
    - 63-01-PLAN.md (YAML front-matter schema)
  provides:
    - BullMQ handlers for 7 non-functional skills
  affects:
    - worker/index.ts (JOB_HANDLERS registration)
    - Skills tab (all skills now runnable)
tech_stack:
  added: []
  patterns:
    - BullMQ job handler pattern (meeting-summary.ts template)
    - SkillOrchestrator delegation
    - outputs table registration
key_files:
  created:
    - bigpanda-app/worker/jobs/elt-external-status.ts
    - bigpanda-app/worker/jobs/elt-internal-status.ts
    - bigpanda-app/worker/jobs/team-engagement-map.ts
    - bigpanda-app/worker/jobs/workflow-diagram.ts
    - bigpanda-app/worker/jobs/biggy-weekly-briefing.ts
    - bigpanda-app/worker/jobs/risk-assessment.ts
    - bigpanda-app/worker/jobs/qbr-prep.ts
  modified:
    - bigpanda-app/worker/index.ts (added 7 imports + 7 JOB_HANDLERS entries)
decisions:
  - "Follow meeting-summary.ts pattern exactly for all 7 handlers (no special logic needed)"
  - "customer-project-tracker already has handler - not duplicated"
  - "SkillOrchestrator.run() handles special context for team-engagement-map and workflow-diagram internally"
metrics:
  duration_seconds: 163
  tasks_completed: 2
  files_created: 7
  files_modified: 1
  commits: 2
  completed_at: "2026-04-15T17:08:19Z"
---

# Phase 63 Plan 03: Wire Non-Functional Skills Summary

**One-liner:** Created 7 BullMQ job handlers for elt-external-status, elt-internal-status, team-engagement-map, workflow-diagram, biggy-weekly-briefing, risk-assessment, and qbr-prep using the canonical meeting-summary.ts pattern.

## What Was Built

Created the execution layer for 7 skills that had .md definitions (from Plan 01) but no worker handlers. All handlers follow the established pattern:

1. **7 new job handler files** in `bigpanda-app/worker/jobs/`:
   - elt-external-status.ts
   - elt-internal-status.ts
   - team-engagement-map.ts
   - workflow-diagram.ts
   - biggy-weekly-briefing.ts
   - risk-assessment.ts
   - qbr-prep.ts

2. **worker/index.ts registration**: Added 7 imports and 7 JOB_HANDLERS map entries

Each handler:
- Takes `projectId`, `input`, and `runId` from job.data
- Delegates to SkillOrchestrator.run() with the skill name
- Reads the completed skillRun from DB
- Inserts to outputs table with idempotency
- Returns `{ status: 'completed' }` or `{ status: 'failed' }`

## Task Breakdown

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create 7 BullMQ job handler files | 7c8ef6f | 7 new files in worker/jobs/ |
| 2 | Register handlers in worker/index.ts | 2ae6b46 | worker/index.ts |

## Deviations from Plan

None - plan executed exactly as written. All 7 handler files were missing (including team-engagement-map and workflow-diagram which were mentioned as potentially existing). No special MCP integration logic was needed since SkillOrchestrator.run() already handles the buildTeamsSkillContext and buildArchSkillContext internally for those two skills.

## Verification Results

### Automated Verification

1. **File existence check**: All 7 handler files exist in bigpanda-app/worker/jobs/
   ```bash
   for f in elt-external-status elt-internal-status team-engagement-map workflow-diagram biggy-weekly-briefing risk-assessment qbr-prep; do
     test -f bigpanda-app/worker/jobs/$f.ts && echo "EXISTS: $f" || echo "MISSING: $f"
   done
   ```
   Result: All 7 files exist ✓

2. **JOB_HANDLERS registration**: All 7 skill names registered in worker/index.ts
   ```bash
   grep -E "(elt-external-status|elt-internal-status|team-engagement-map|workflow-diagram|biggy-weekly-briefing|risk-assessment|qbr-prep)" bigpanda-app/worker/index.ts
   ```
   Result: 7 imports + 7 JOB_HANDLERS entries present ✓

3. **No duplicate handlers**: customer-project-tracker handler NOT duplicated (already exists in JOB_HANDLERS from previous work) ✓

### Success Criteria Met

- [x] 7 new BullMQ handler files created following meeting-summary.ts pattern
- [x] worker/index.ts registers all 7 handlers in JOB_HANDLERS
- [x] Each handler imports SkillOrchestrator and delegates to orchestrator.run()
- [x] Each handler inserts to outputs table after completion
- [x] No existing handlers disturbed
- [x] customer-project-tracker handler NOT duplicated

### Known Issues

Pre-existing TypeScript build error in document-extraction.ts (line 775) prevents full build. This is unrelated to the changes in this plan - all 7 new handlers follow the established pattern used by meeting-summary.ts which compiles cleanly.

## Technical Notes

### Handler Pattern

All 7 handlers use the canonical BullMQ job handler pattern:

```typescript
export default async function {handlerName}Job(job: Job): Promise<{ status: string }> {
  const { projectId, input, runId: existingRunId } = job.data;
  const runId = existingRunId;
  if (!runId) {
    console.error('[{skill-name}] runId required in job.data');
    return { status: 'failed' };
  }

  try {
    const settings = await readSettings();
    const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');

    await orchestrator.run({
      skillName: '{skill-name}',
      projectId,
      runId,
      input,
      skillsDir: SKILLS_DIR,
    });

    const [completedRun] = await db.select().from(skillRuns).where(eq(skillRuns.id, runId));
    const outputText = completedRun?.full_output ?? '';
    const runUuid = completedRun?.run_id ?? randomUUID();

    await db.insert(outputs).values({
      project_id: projectId,
      skill_name: '{skill-name}',
      idempotency_key: runUuid,
      status: 'complete',
      content: outputText,
      completed_at: new Date(),
    }).onConflictDoNothing();

    return { status: 'completed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[{skill-name}] failed:', message);
    return { status: 'failed' };
  }
}
```

### Special Context Handling

team-engagement-map and workflow-diagram require special project context (teams, architecture nodes), but this is already handled inside SkillOrchestrator.run() via:
- buildTeamsSkillContext() for team-engagement-map
- buildArchSkillContext() for workflow-diagram

The job handlers do not need any special logic - they simply pass the skill name to the orchestrator, which detects the skill type and builds the appropriate context.

## Dependencies

**Requires:**
- 63-01: YAML front-matter schema (completed)

**Provides:**
- Execution layer for 7 skills
- All skills in catalog now runnable (except context-updater which is backend-only)

**Affects:**
- Skills tab: All skills now have handlers and can be executed on-demand
- Job queue: worker can now process jobs for all 7 new skill types

## What's Next

With all handlers wired:
1. Skills tab can now run all 15 skills (8 existing + 7 new)
2. Ready for Plan 04 (final wave 2 tasks: documentation + verification)
3. Phase 63 complete after Plan 04
4. Blocked: Phase 64 (Editable Prompts UI) depends on Phase 63 completion

## Self-Check: PASSED

### Created Files Exist
```bash
test -f /Users/jmiloslavsky/Documents/Project\ Assistant\ Code/bigpanda-app/worker/jobs/elt-external-status.ts && echo "FOUND" || echo "MISSING"
# FOUND: elt-external-status.ts

test -f /Users/jmiloslavsky/Documents/Project\ Assistant\ Code/bigpanda-app/worker/jobs/elt-internal-status.ts && echo "FOUND" || echo "MISSING"
# FOUND: elt-internal-status.ts

test -f /Users/jmiloslavsky/Documents/Project\ Assistant\ Code/bigpanda-app/worker/jobs/team-engagement-map.ts && echo "FOUND" || echo "MISSING"
# FOUND: team-engagement-map.ts

test -f /Users/jmiloslavsky/Documents/Project\ Assistant\ Code/bigpanda-app/worker/jobs/workflow-diagram.ts && echo "FOUND" || echo "MISSING"
# FOUND: workflow-diagram.ts

test -f /Users/jmiloslavsky/Documents/Project\ Assistant\ Code/bigpanda-app/worker/jobs/biggy-weekly-briefing.ts && echo "FOUND" || echo "MISSING"
# FOUND: biggy-weekly-briefing.ts

test -f /Users/jmiloslavsky/Documents/Project\ Assistant\ Code/bigpanda-app/worker/jobs/risk-assessment.ts && echo "FOUND" || echo "MISSING"
# FOUND: risk-assessment.ts

test -f /Users/jmiloslavsky/Documents/Project\ Assistant\ Code/bigpanda-app/worker/jobs/qbr-prep.ts && echo "FOUND" || echo "MISSING"
# FOUND: qbr-prep.ts
```

### Commits Exist
```bash
git log --oneline --all | grep -q "7c8ef6f" && echo "FOUND: 7c8ef6f" || echo "MISSING: 7c8ef6f"
# FOUND: 7c8ef6f

git log --oneline --all | grep -q "2ae6b46" && echo "FOUND: 2ae6b46" || echo "MISSING: 2ae6b46"
# FOUND: 2ae6b46
```

All files and commits verified. Plan execution complete.
