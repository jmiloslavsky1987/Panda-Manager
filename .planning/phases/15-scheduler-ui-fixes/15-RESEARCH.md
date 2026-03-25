# Phase 15: Scheduler + UI Fixes — Research

**Researched:** 2026-03-25
**Domain:** BullMQ scheduler registration, TypeScript job handler path resolution, React search filter UI
**Confidence:** HIGH

## Summary

Phase 15 closes four integration gaps identified by the v1.0 audit. Three gaps are in the worker tier (BullMQ scheduler registration and skill path resolution); one is in the Next.js UI tier (search filter TYPE_OPTIONS). All four are surgical, well-bounded code changes with no new dependencies.

The current `JOB_SCHEDULE_MAP` in `scheduler.ts` contains two phantom entries — `action-sync` (incorrectly aliased to `morning_briefing` schedule key) and `weekly-briefing` (aliased to `weekly_status`) — that do not correspond to real job handlers. The real handlers `morning-briefing` and `weekly-customer-status` are imported in `worker/index.ts` and dispatched by `JOB_HANDLERS` but are never registered as scheduled jobs in `JOB_SCHEDULE_MAP`, so they never fire on their cron schedules. The fix is a map swap, not new handler work.

The three job handlers that use `const SKILLS_DIR = path.join(__dirname, '../../skills')` need to be converted to call `resolveSkillsDir(settings.skill_path ?? '')`, which is already exported from `skill-run.ts`, already tested, and designed precisely for this reuse. The search TYPE_OPTIONS array in `app/search/page.tsx` currently lists 8 types; the backend `searchAllRecords()` in `queries.ts` already supports all 12 FTS tables including the four missing ones — the UI just needs to expose them as filter options.

YAML export is explicitly deferred — no work in this phase.

**Primary recommendation:** Make the four targeted edits — scheduler map, three handler imports, TYPE_OPTIONS array — all changes are single-file, no new dependencies, no schema changes.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Remove phantom entries `action-sync` and `weekly-briefing` from `JOB_SCHEDULE_MAP` — neither has a real job handler; `action-sync` was incorrectly borrowing the `morning_briefing` schedule key
- Add `morning-briefing → morning_briefing` and `weekly-customer-status → weekly_status` to `JOB_SCHEDULE_MAP` to register the real handlers
- The remaining 4 entries (`health-refresh`, `context-updater`, `gantt-snapshot`, `risk-monitor`) stay as-is

### Claude's Discretion
- Import `resolveSkillsDir` from `skill-run.ts` (already exported and tested) into the 3 handlers; replace `const SKILLS_DIR = path.join(__dirname, '../../skills')` pattern
- Add `onboarding_steps`, `onboarding_phases`, `integrations`, `time_entries` with sensible display labels to TYPE_OPTIONS

### Deferred Ideas (OUT OF SCOPE)
- YAML export UI — user explicitly wants this deferred to a future phase; will design the correct approach then (no button in workspace header, no export endpoint work)
- DATA-05 / OVER-04 — YAML round-trip and context doc export requirements moved out of Phase 15 scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCHED-01 | BullMQ worker as dedicated process; no duplicate firing | Current code confirmed: BullMQ worker process in `worker/index.ts` with `upsertJobScheduler` idempotency; gap is the missing scheduler entries for the real handlers |
| SCHED-03 | Daily 8am cross-account health check — flag status changes, approaching due dates, overdue actions | `health-refresh` already correctly wired; SCHED-03 partially addressed by ensuring scheduler fires correctly after phantom entries removed |
| SET-02 | Skill file location config from settings; SKILL.md files read at runtime | `resolveSkillsDir` already in `skill-run.ts` and tested; 3 handlers still use hardcoded `__dirname`-relative path — migration completes SET-02 |
| SKILL-03 | Weekly Customer Status generates email from DB context | Handler `weekly-customer-status.ts` exists and is wired in `JOB_HANDLERS` but not in `JOB_SCHEDULE_MAP`; adding the map entry makes it fire on schedule |
| SKILL-11 | Morning Briefing fetches calendar, stores result in DB | Handler `morning-briefing.ts` exists and is wired in `JOB_HANDLERS` but not in `JOB_SCHEDULE_MAP`; adding the map entry makes it fire on schedule |
| SKILL-14 | SKILL.md files read from disk at runtime; skill_path configurable | Three handlers have hardcoded `__dirname` path — migrating to `resolveSkillsDir` closes this gap |
| SRCH-02 | Search filterable by account, date range, and data type | `TYPE_OPTIONS` only exposes 8 of 12 FTS tables; adding the 4 missing entries closes the filter gap |
| SRCH-03 | Search results show matching record in full context | Already implemented in backend; no additional backend work needed — UI filter closure ensures results appear when filtered by new types |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bullmq | Existing | Job queue + scheduler registration | Already used throughout worker tier |
| vitest | Existing | Unit test runner | Already used; `tests/skill-run-settings.test.ts` uses it |
| TypeScript | Existing | All source files | Project standard |
| React (Next.js) | Existing | Search page UI | Project standard |

No new packages are needed for this phase. All changes are to existing files using existing imports.

### No New Dependencies
All four changes use code and patterns already present in the codebase:
- `resolveSkillsDir` — already exported from `worker/jobs/skill-run.ts`
- `readSettings` — already imported in `skill-run.ts` (same import pattern works in other handlers)
- BullMQ `removeJobScheduler` — available on existing `jobQueue` instance if needed for phantom cleanup

---

## Architecture Patterns

### Recommended Project Structure (no changes needed)
```
bigpanda-app/worker/
├── scheduler.ts           # Edit: JOB_SCHEDULE_MAP swap
├── index.ts               # Read-only: already has correct JOB_HANDLERS entries
└── jobs/
    ├── skill-run.ts       # Read-only: resolveSkillsDir source of truth
    ├── morning-briefing.ts        # Edit: replace SKILLS_DIR with resolveSkillsDir
    ├── weekly-customer-status.ts  # Edit: replace SKILLS_DIR with resolveSkillsDir
    └── context-updater.ts         # Edit: replace SKILLS_DIR with resolveSkillsDir

bigpanda-app/app/
└── search/
    └── page.tsx           # Edit: TYPE_OPTIONS — add 4 entries
```

### Pattern 1: Scheduler Map Swap
**What:** Swap the two phantom entries for the two real handlers in `JOB_SCHEDULE_MAP`. The map is a `Record<string, keyof AppSettings['schedule']>` — job name maps to settings key.
**When to use:** Whenever a new scheduled handler is added that should fire on a configurable cron.
**Example:**
```typescript
// scheduler.ts — BEFORE (phantom entries)
const JOB_SCHEDULE_MAP: Record<string, keyof AppSettings['schedule']> = {
  'action-sync':     'morning_briefing',   // phantom — no real handler
  'health-refresh':  'health_check',
  'weekly-briefing': 'weekly_status',      // phantom — no real handler
  'context-updater': 'slack_sweep',
  'gantt-snapshot':  'tracker_weekly',
  'risk-monitor':    'biggy_briefing',
};

// AFTER (real handlers registered)
const JOB_SCHEDULE_MAP: Record<string, keyof AppSettings['schedule']> = {
  'morning-briefing':         'morning_briefing',
  'health-refresh':           'health_check',
  'weekly-customer-status':   'weekly_status',
  'context-updater':          'slack_sweep',
  'gantt-snapshot':           'tracker_weekly',
  'risk-monitor':             'biggy_briefing',
};
```
**Important:** The settings keys `morning_briefing` and `weekly_status` are confirmed present in `AppSettings['schedule']` in `settings-core.ts`. No settings schema changes needed.

### Pattern 2: resolveSkillsDir Migration
**What:** Replace the module-level `const SKILLS_DIR = path.join(__dirname, '../../skills')` constant with a per-invocation call to `resolveSkillsDir(settings.skill_path ?? '')`. This requires reading settings at runtime — the same pattern already used in `skill-run.ts`.
**When to use:** Any scheduled handler that passes `skillsDir` to `orchestrator.run()`.
**Example:**
```typescript
// BEFORE (hardcoded — all three handlers look exactly like this)
import path from 'path';
const SKILLS_DIR = path.join(__dirname, '../../skills');

export default async function morningBriefingJob(job: Job) {
  // ...
  await orchestrator.run({ skillsDir: SKILLS_DIR, ... });
}

// AFTER
import { resolveSkillsDir } from './skill-run';
import { readSettings } from '../../lib/settings-core';

export default async function morningBriefingJob(job: Job) {
  const settings = await readSettings();
  const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');
  // ...
  await orchestrator.run({ skillsDir: SKILLS_DIR, ... });
}
```
**Note:** `path` import can be removed from the affected handlers after migration (it is only used for `path.join(__dirname, ...)`). `readSettings` is already imported in `skill-run.ts` — same pattern.

### Pattern 3: TYPE_OPTIONS Extension
**What:** Add 4 entries to the `TYPE_OPTIONS` array in `app/search/page.tsx`. The backend `searchAllRecords()` in `queries.ts` already handles all 12 FTS tables — including the 4 missing ones — so this is UI-only.
**When to use:** Whenever a new FTS table arm is added to `searchAllRecords`.
**Example:**
```typescript
// app/search/page.tsx — AFTER adding 4 entries
const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'actions', label: 'Actions' },
  { value: 'risks', label: 'Risks' },
  { value: 'key_decisions', label: 'Key Decisions' },
  { value: 'engagement_history', label: 'Engagement History' },
  { value: 'stakeholders', label: 'Stakeholders' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'artifacts', label: 'Artifacts' },
  { value: 'knowledge_base', label: 'Knowledge Base' },
  // NEW — closes SRCH-02/03 gap
  { value: 'onboarding_steps', label: 'Onboarding Steps' },
  { value: 'onboarding_phases', label: 'Onboarding Phases' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'time_entries', label: 'Time Entries' },
];
```

### Anti-Patterns to Avoid
- **Removing `morning-briefing` and `weekly-customer-status` from `JOB_HANDLERS` in `index.ts`:** These handlers must stay in JOB_HANDLERS — they process jobs dispatched by both the scheduler and the manual trigger path (SSE). The fix is additive to `JOB_SCHEDULE_MAP` only.
- **Making SKILLS_DIR a module-level constant after migration:** `resolveSkillsDir` must be called inside the job handler function body so it reads fresh settings on every invocation. A module-level constant would bake in the value at startup.
- **Removing the `path` import before verifying no other usage:** Check that `path` is not used elsewhere in the file before removing the import.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Skill path resolution | Custom path logic | `resolveSkillsDir` from `skill-run.ts` | Already handles absolute, relative, empty; already unit-tested |
| Settings read in worker | Custom fs.readFile | `readSettings` from `settings-core.ts` | Handles defaults, merge, ENOENT gracefully |
| Scheduler idempotency | Manual dedup logic | `upsertJobScheduler` | BullMQ built-in; stable scheduler ID is the dedup key |

---

## Common Pitfalls

### Pitfall 1: Phantom Scheduler IDs Persisting in Redis
**What goes wrong:** Even after removing `action-sync` and `weekly-briefing` from `JOB_SCHEDULE_MAP`, BullMQ may have previously persisted these scheduler IDs in Redis. They will continue firing until removed.
**Why it happens:** `upsertJobScheduler` writes a durable record to Redis. Removing the call from code does not clean up the Redis entry.
**How to avoid:** After updating `JOB_SCHEDULE_MAP`, call `jobQueue.removeJobScheduler('action-sync')` and `jobQueue.removeJobScheduler('weekly-briefing')` once during the migration. This can be done in `registerAllSchedulers()` as a one-time cleanup block, or in a separate startup check.
**Warning signs:** Dashboard shows jobs with names `action-sync` or `weekly-briefing` still appearing in the BullMQ queue after code deployment.

### Pitfall 2: `readSettings` Call in Handler Slows Per-Project Loop
**What goes wrong:** In `morning-briefing.ts` and `weekly-customer-status.ts`, the handler loops over all active projects. If `readSettings` is called inside the per-project loop, it reads disk on each iteration.
**Why it happens:** Naive placement of `const settings = await readSettings()` inside the `for...of` loop.
**How to avoid:** Call `readSettings()` once before the loop, exactly as `skill-run.ts` does (reads once per job invocation, not per project).

### Pitfall 3: TYPE_OPTIONS Value Mismatch with Backend Table Names
**What goes wrong:** If the `value` in a TYPE_OPTIONS entry doesn't exactly match the table name string expected by `searchAllRecords`, the type filter produces no results silently.
**Why it happens:** The backend uses `if (!type || type === 'onboarding_steps')` — exact string match.
**How to avoid:** Verify values against the `searchAllRecords` arm conditions in `queries.ts`. Confirmed exact names: `onboarding_steps`, `onboarding_phases`, `integrations`, `time_entries`.

### Pitfall 4: `context-updater` Advisory Lock Behavior
**What goes wrong:** `context-updater.ts` acquires a PostgreSQL advisory lock (`pg_try_advisory_xact_lock`). After migrating to dynamic `readSettings()`, ensure the lock acquisition happens before the settings read (or at least before the project loop) to maintain the guard's purpose.
**Why it happens:** Re-ordering code during migration could accidentally push the lock acquisition after the settings read.
**How to avoid:** Keep the advisory lock as the first async operation in `contextUpdaterJob`, and move the settings read to just after the lock check.

---

## Code Examples

Verified patterns from source inspection:

### resolveSkillsDir Signature (from skill-run.ts)
```typescript
// Source: bigpanda-app/worker/jobs/skill-run.ts
export function resolveSkillsDir(skillPath: string, dirnameRef: string = __dirname): string {
  const trimmed = skillPath.trim();
  if (!trimmed) {
    return path.join(dirnameRef, '../../skills');
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return path.join(os.homedir(), trimmed);
}
```
The second argument is only needed for testing (passing a fake `__dirname`). Production callers pass only `settings.skill_path ?? ''`.

### BullMQ removeJobScheduler (for phantom cleanup)
```typescript
// Source: BullMQ API — available on Queue instance
await jobQueue.removeJobScheduler('action-sync');
await jobQueue.removeJobScheduler('weekly-briefing');
```
`removeJobScheduler` is idempotent — safe to call even if the scheduler ID does not exist in Redis.

### AppSettings schedule keys (from settings-core.ts)
```typescript
// Confirmed schedule keys in AppSettings['schedule']:
// morning_briefing → '0 8 * * *'
// health_check     → '0 8 * * *'
// slack_sweep      → '0 9 * * *'
// tracker_weekly   → '0 7 * * 1'
// weekly_status    → '0 16 * * 4'
// biggy_briefing   → '0 9 * * 5'
```
Both `morning_briefing` and `weekly_status` exist — no schema change needed.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Phantom `action-sync` fires `morning_briefing` schedule | `morning-briefing` directly mapped to `morning_briefing` key | Briefing fires under the correct job name; handler logs match job name |
| Hardcoded `path.join(__dirname, '../../skills')` | `resolveSkillsDir(settings.skill_path)` | Skill path configurable at runtime without worker restart |
| 8 TYPE_OPTIONS in search UI | 12 TYPE_OPTIONS matching all FTS arms | All onboarding, integration, and time data searchable by type filter |

---

## Open Questions

1. **Should `removeJobScheduler` calls be permanent in `registerAllSchedulers` or one-shot?**
   - What we know: `removeJobScheduler` is idempotent — safe to call every restart
   - What's unclear: Whether there's a measurable overhead to calling it on every 60s settings poll
   - Recommendation: Include it in `registerAllSchedulers` immediately before the map loop — trivial overhead, ensures phantom entries never persist across deployments

2. **Does `context-updater` need `readSettings` if it doesn't use MCP servers directly?**
   - What we know: `context-updater.ts` passes `skillsDir` to `orchestrator.run()` — so yes, it needs settings
   - What's unclear: Nothing — the migration is straightforward
   - Recommendation: Same pattern as other handlers; the advisory lock should remain first

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts at bigpanda-app/) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/skill-run-settings.test.ts` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-14 / SET-02 | `resolveSkillsDir` called from morning-briefing, weekly-customer-status, context-updater | unit | `cd bigpanda-app && npx vitest run tests/skill-run-settings.test.ts` | Existing tests cover `resolveSkillsDir` itself; new import tests needed |
| SCHED-01 | `morning-briefing` and `weekly-customer-status` appear in `JOB_SCHEDULE_MAP`; no `action-sync` or `weekly-briefing` | unit | `cd bigpanda-app && npx vitest run tests/scheduler-map.test.ts` | Wave 0 — new file |
| SRCH-02 | TYPE_OPTIONS contains all 12 FTS table values | unit | `cd bigpanda-app && npx vitest run tests/search-type-options.test.ts` | Wave 0 — new file |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/skill-run-settings.test.ts`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `bigpanda-app/tests/scheduler-map.test.ts` — verifies `JOB_SCHEDULE_MAP` keys and that phantom entries are absent; covers SCHED-01
- [ ] `bigpanda-app/tests/search-type-options.test.ts` — verifies TYPE_OPTIONS values match expected 12-table list; covers SRCH-02
- [ ] No framework install needed — Vitest already installed and configured

---

## Sources

### Primary (HIGH confidence)
- Direct source inspection: `bigpanda-app/worker/scheduler.ts` — confirmed phantom entries and map structure
- Direct source inspection: `bigpanda-app/worker/jobs/skill-run.ts` — confirmed `resolveSkillsDir` export and signature
- Direct source inspection: `bigpanda-app/worker/jobs/morning-briefing.ts`, `weekly-customer-status.ts`, `context-updater.ts` — confirmed hardcoded SKILLS_DIR pattern in all three
- Direct source inspection: `bigpanda-app/worker/index.ts` — confirmed JOB_HANDLERS has real handlers; confirmed phantom names also in JOB_HANDLERS
- Direct source inspection: `bigpanda-app/app/search/page.tsx` — confirmed 8 TYPE_OPTIONS, confirmed missing 4
- Direct source inspection: `bigpanda-app/lib/queries.ts` lines 728–814 — confirmed all 12 FTS arms already implemented in backend
- Direct source inspection: `bigpanda-app/lib/settings-core.ts` — confirmed `morning_briefing` and `weekly_status` schedule keys exist
- Direct source inspection: `bigpanda-app/tests/skill-run-settings.test.ts` — confirmed existing tests cover `resolveSkillsDir`

### Secondary (MEDIUM confidence)
- BullMQ documentation: `removeJobScheduler` is the correct API for removing persisted scheduler entries from Redis; idempotent behavior described in official BullMQ docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all code inspected directly; no external dependencies to verify
- Architecture: HIGH — all edit targets identified and confirmed by source reading
- Pitfalls: HIGH — phantom Redis scheduler entries is a documented BullMQ concern; all other pitfalls derived from direct code inspection

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable codebase; no fast-moving external dependencies)
