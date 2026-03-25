# Phase 15: Scheduler + UI Fixes — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Close 4 integration gaps found by the v1.0 audit:
1. Register the real scheduled job handlers (`morning-briefing`, `weekly-customer-status`) in `JOB_SCHEDULE_MAP` in `scheduler.ts` and remove phantom entries with no real handlers
2. Migrate `morning-briefing.ts`, `weekly-customer-status.ts`, and `context-updater.ts` to use `resolveSkillsDir(settings.skill_path)` instead of hardcoded `__dirname`-relative paths
3. Add the 4 missing FTS tables to `TYPE_OPTIONS` in the search filter

**Explicitly NOT in this phase:**
- YAML export button or any YAML export/import UI — deferred to a future phase to design properly

</domain>

<decisions>
## Implementation Decisions

### Scheduler job registration
- Remove phantom entries `action-sync` and `weekly-briefing` from `JOB_SCHEDULE_MAP` — neither has a real job handler; `action-sync` was incorrectly borrowing the `morning_briefing` schedule key
- Add `morning-briefing → morning_briefing` and `weekly-customer-status → weekly_status` to `JOB_SCHEDULE_MAP` to register the real handlers
- The remaining 4 entries (`health-refresh`, `context-updater`, `gantt-snapshot`, `risk-monitor`) stay as-is

### YAML export
- **Deferred entirely** — no button, no export endpoint work, no UI changes in this phase
- DATA-05 and OVER-04 (YAML export) are removed from Phase 15 scope
- Future phase will design the correct approach

### resolveSkillsDir migration
- Claude's discretion — import `resolveSkillsDir` from `skill-run.ts` (already exported and tested) into the 3 handlers; replace `const SKILLS_DIR = path.join(__dirname, '../../skills')` pattern

### Search TYPE_OPTIONS
- Claude's discretion — add `onboarding_steps`, `onboarding_phases`, `integrations`, `time_entries` with sensible display labels

</decisions>

<specifics>
## Specific Ideas

- The `resolveSkillsDir` function is already exported from `worker/jobs/skill-run.ts` and has passing unit tests in `tests/skill-run-settings.test.ts` — just import and use it, no new utility needed
- Scheduler cleanup should also purge the old BullMQ scheduler IDs for `action-sync` and `weekly-briefing` if they were previously registered (use `jobQueue.removeJobScheduler()` if needed)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `worker/scheduler.ts`: `JOB_SCHEDULE_MAP` + `registerAllSchedulers()` — direct edit target
- `worker/jobs/skill-run.ts`: `resolveSkillsDir()` already exported for exactly this reuse
- `app/search/page.tsx`: `TYPE_OPTIONS` array — direct edit target (add 4 entries)
- `worker/jobs/morning-briefing.ts`: Has `const SKILLS_DIR = path.join(__dirname, '../../skills')` — replace with `resolveSkillsDir`
- `worker/jobs/weekly-customer-status.ts`: Same pattern — replace with `resolveSkillsDir`
- `worker/jobs/context-updater.ts`: Same pattern — replace with `resolveSkillsDir`

### Established Patterns
- `resolveSkillsDir(skillPath, optionalFakeDirForTesting)` — accepts settings skill_path, falls back to relative path; used in skill-run.ts already
- BullMQ `upsertJobScheduler` — idempotent registration; removing phantom entries requires checking if `removeJobScheduler` is needed for cleanup

### Integration Points
- `scheduler.ts` reads `settings.schedule` keys — the keys `morning_briefing` and `weekly_status` already exist in `AppSettings['schedule']` (verified in settings-core.ts)
- No new settings keys needed

</code_context>

<deferred>
## Deferred Ideas

- **YAML export UI** — user explicitly wants this deferred to a future phase; will design the correct approach then (no button in workspace header, no export endpoint work)
- **DATA-05 / OVER-04** — YAML round-trip and context doc export requirements moved out of Phase 15 scope

</deferred>

---

*Phase: 15-scheduler-ui-fixes*
*Context gathered: 2026-03-25*
