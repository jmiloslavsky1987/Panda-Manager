# Phase 10: FTS Expansion + Code Polish - Research

**Researched:** 2026-03-25
**Domain:** PostgreSQL FTS migration extension, Next.js skill path resolution, React navigation link repair
**Confidence:** HIGH

## Summary

Phase 10 is a targeted surgical phase closing three concrete gaps discovered in the v1.0 milestone audit. The FTS infrastructure built in Phase 8 (migration 0008, `searchAllRecords()` UNION ALL, Phase 8 schema work) covers 8 tables but entirely misses the 4 tables added in Phases 5.1 and 5.2 — `onboarding_phases`, `onboarding_steps`, `integrations`, and `time_entries`. The fix follows a completely known pattern: a single new migration (0009) plus 4 new UNION ALL arms in `searchAllRecords()`.

The SET-02 gap is equally clear from the codebase: `AppSettings.skill_path` is stored in `settings-core.ts` but every skill handler and `skill-run.ts` hardcodes `const SKILLS_DIR = path.join(__dirname, '../../skills')` and never reads the setting. The fix is to have `skill-run.ts` (the generic on-demand handler) call `readSettings()` and resolve the path at runtime, falling back to the hardcoded `__dirname`-relative default when the setting is empty or unset.

The orphaned `/skills/custom` link in `SkillsTabClient.tsx` is a two-line fix: remove or comment out the `<a>` element on lines 255-260 of `bigpanda-app/components/SkillsTabClient.tsx`. No route exists at that path; no custom-skill UI was ever planned for v1.

**Primary recommendation:** Execute as two waves — Wave 1 has zero external dependencies and is pure additive work: migration 0009, 4 UNION ALL arms, skill path fix in skill-run.ts, link removal. Wave 2 is E2E activation and human verification.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRCH-01 | Full-text search using PostgreSQL tsvector/tsquery across actions, risks, decisions, engagement history, stakeholders, artifacts, tasks, and knowledge base — **extended to also cover onboarding_steps (owner field), onboarding_phases, integrations (notes field), and time_entries (description field)** | Migration 0009 adds search_vec + GIN + trigger for 4 tables; searchAllRecords() gains 4 UNION ALL arms |
| SET-02 | Skill file location configuration (default: ~/.claude/get-shit-done/) — where SKILL.md files are read from — **must actually be honored at runtime** | skill-run.ts SKILLS_DIR const replaced with readSettings() call; all other handlers retain __dirname anchor as they are scheduled (no user-facing path config use case) |
</phase_requirements>

## Standard Stack

### Core (all established in prior phases — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL tsvector/tsquery | DB native | FTS for 4 new tables | Exact same mechanism as migration 0008; no new concepts |
| drizzle-orm `sql` template tag | Existing | Raw SQL UNION ALL arms | Phase 08-03 decision: Drizzle has no native tsquery support |
| `settings-core.ts` `readSettings()` | Existing | Read skill_path at runtime | Worker-safe settings reader; already used by worker handlers |
| `path.join` / `os.homedir()` | Node built-in | Resolve skill path | Consistent with DEFAULTS in settings-core.ts |

**No new package installs required.** This phase touches only: SQL migration file, `lib/queries.ts`, `worker/jobs/skill-run.ts`, and `components/SkillsTabClient.tsx`.

## Architecture Patterns

### Recommended Project Structure

No new files or directories — all changes are modifications to existing files:

```
bigpanda-app/db/migrations/
└── 0009_fts_expansion.sql       # NEW — adds search_vec to 4 Phase 5.1/5.2 tables

bigpanda-app/lib/
└── queries.ts                   # MODIFY — add 4 UNION ALL arms to searchAllRecords()

bigpanda-app/worker/jobs/
└── skill-run.ts                 # MODIFY — replace hardcoded SKILLS_DIR with settings read

bigpanda-app/components/
└── SkillsTabClient.tsx          # MODIFY — remove orphaned /skills/custom link

tests/e2e/
└── phase10.spec.ts              # NEW — Wave 0 RED stubs for SRCH-01 and SET-02
```

### Pattern 1: FTS Migration Extension (migration 0009)

**What:** Extend the established Phase 8 FTS pattern to 4 new tables. Identical structure to 0008: ALTER TABLE → ADD COLUMN → GIN INDEX → trigger function → DROP/CREATE TRIGGER → backfill UPDATE.
**When to use:** Any time a new project-scoped table needs to be searchable via `/search`.

The 4 tables and the fields to index:

| Table | Fields to Index | Date Field (for UNION arm) | Project Join |
|-------|----------------|---------------------------|--------------|
| `onboarding_steps` | `name`, `owner`, `description` | `updated_at` (timestamp) | `project_id` |
| `onboarding_phases` | `name` | `created_at` (timestamp) | `project_id` |
| `integrations` | `tool`, `notes`, `category` | `updated_at` (timestamp) | `project_id` |
| `time_entries` | `description` | `date` (TEXT, ISO date) | `project_id` |

**SQL pattern (repeat for each table):**
```sql
-- Source: established in 0008_fts_and_kb.sql (verified by Phase 08-02)
ALTER TABLE onboarding_steps ADD COLUMN IF NOT EXISTS search_vec tsvector;
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_search_vec ON onboarding_steps USING GIN(search_vec);

CREATE OR REPLACE FUNCTION tsvector_update_onboarding_steps() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.owner, '') || ' ' ||
    coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_steps_search_vec ON onboarding_steps;
CREATE TRIGGER trg_onboarding_steps_search_vec
  BEFORE INSERT OR UPDATE ON onboarding_steps
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_onboarding_steps();

UPDATE onboarding_steps
  SET search_vec = to_tsvector('english',
    coalesce(name, '') || ' ' || coalesce(owner, '') || ' ' || coalesce(description, ''));
```

**Critical note on timestamp vs TEXT dates:** `onboarding_steps.updated_at`, `onboarding_phases.created_at`, `integrations.updated_at` are PostgreSQL `timestamp` columns (not TEXT). In UNION ALL arms, the date field must be cast to TEXT for consistent shape: `a.updated_at::text AS date`. `time_entries.date` is already TEXT and ISO-sortable.

**Critical note on search_vec in Drizzle schema:** Do NOT add `search_vec` to schema.ts. Phase 08-02 decision: "Adding it to the Drizzle schema causes type inference issues with PgVectorType." Leave it DB-only, query via raw SQL only.

### Pattern 2: UNION ALL Arm Addition (searchAllRecords)

**What:** Append 4 new arms to the `arms: string[]` array in `searchAllRecords()` in `bigpanda-app/lib/queries.ts`. Each arm follows the exact same structure as the existing 8 arms.
**When to use:** Any time a new table is added to FTS scope.

**Arm template (for `onboarding_steps` example):**
```typescript
// Source: established pattern from lib/queries.ts searchAllRecords() arms 1-8
if (!type || type === 'onboarding_steps') {
  arms.push(`
    SELECT
      os.id,
      'onboarding_steps'::text AS "table",
      'Onboarding Steps'::text AS section,
      os.project_id,
      p.name AS project_name,
      p.customer,
      os.updated_at::text AS date,
      os.name AS title,
      SUBSTRING(COALESCE(os.owner, ''), 1, 200) AS snippet
    FROM onboarding_steps os
    JOIN projects p ON p.id = os.project_id
    WHERE p.status = 'active'
      AND os.search_vec @@ plainto_tsquery('english', '${safeQ}')
      ${accountFilter('p.customer')}
      ${dateBounds('os.updated_at::text')}
  `);
}
```

**Note on SearchResult interface:** The `table` field type annotation in the interface (`'actions' | 'risks' | ...`) should be updated to include the 4 new table names, or widened to `string` if it isn't already. Check current definition at queries.ts line 392.

### Pattern 3: Skill Path Resolution (skill-run.ts SET-02 fix)

**What:** Replace the module-level `const SKILLS_DIR = path.join(__dirname, '../../skills')` with a runtime read of `settings.skill_path`. Only `skill-run.ts` needs this change — scheduled handlers (morning-briefing.ts, context-updater.ts, etc.) also hardcode `SKILLS_DIR` but SET-02 only requires the generic on-demand runner to honor the path setting. The phase success criteria specifies "skill-run.ts reads the SKILL.md file path from `settings.skill_files_path` when set, falling back to the default path when not configured."

**Important:** The settings field is named `skill_path` in `AppSettings` (not `skill_files_path` — the audit uses the user-facing label). Verify the actual field name is `skill_path` before wiring.

**Pattern:**
```typescript
// Source: settings-core.ts readSettings() — worker-safe, no server-only marker
import { readSettings } from '../../lib/settings-core';
import os from 'os';
import path from 'path';

// Remove the module-level SKILLS_DIR const.
// Inside skillRunJob(), resolve at runtime:
const settings = await readSettings();
const SKILLS_DIR = settings.skill_path && settings.skill_path.trim()
  ? (settings.skill_path.startsWith('/')
      ? settings.skill_path
      : path.join(os.homedir(), settings.skill_path))
  : path.join(__dirname, '../../skills');
```

**Why only skill-run.ts (not all handlers):** The phase success criteria scopes the fix to `skill-run.ts`. Scheduled handlers are invoked by BullMQ at startup time and the settings already have a default. The on-demand generic handler is the user-facing path where a custom skill directory would matter (SKILL-14 spec: "skill_path configurable in settings").

**Note on homedir-relative paths:** `settings-core.ts` DEFAULTS has `skill_path: path.join(os.homedir(), '.claude', 'get-shit-done')` — that's an absolute path. But `workspace_path` uses a relative-to-homedir format (`'/Documents/PM Application'`). Phase 07-02 decision: "workspace_path /Documents/PM Application treated as relative-to-homedir." Same normalization should be applied to `skill_path` for consistency.

### Pattern 4: Remove Orphaned Navigation Link

**What:** Remove lines 252-261 (the "Run custom skill" `<a>` element) from `bigpanda-app/components/SkillsTabClient.tsx`. No route exists at `/customer/[id]/skills/custom`. The link wrapping div can also be removed.

**Why remove (not redirect):** No custom skill UI is planned for v1. Redirecting to an existing page would confuse users. The safest fix is removal — a low-risk 8-line deletion.

### Anti-Patterns to Avoid

- **Adding search_vec to schema.ts:** Phase 08-02 locked decision. Drizzle type inference breaks. Keep it DB-only.
- **Modifying all worker job handlers for SET-02:** Out of scope. Only skill-run.ts is required by the success criteria.
- **Using `type` filter type annotation that omits new table names:** The SearchResult interface's `table` field type union should include the new arms or be widened to string to avoid TS errors.
- **Using `a.updated_at` without `::text` cast in UNION ALL:** All UNION arms must return the same data type for `date`. timestamp columns must be cast via `::text`.
- **Hardcoded absolute default path in skill-run.ts:** The fallback must use `__dirname`-relative path (consistent with Phase 05-skill-engine decision: "SkillOrchestrator uses __dirname-anchored SKILLS_DIR in worker context for reliable SKILL.md path resolution regardless of cwd").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FTS for new tables | Custom string-match logic | PostgreSQL tsvector + GIN | Established in 0008, identical pattern |
| Settings file parsing | Custom JSON reader | `readSettings()` from settings-core.ts | Worker-safe, handles ENOENT, merges with DEFAULTS |
| SQL injection sanitization in UNION arms | Custom escaping | Existing `safeQ` and `safeAccount` pattern from searchAllRecords | Already present in the function; same pattern applies to new arms |

## Common Pitfalls

### Pitfall 1: Timestamp Cast in UNION ALL date Column
**What goes wrong:** Adding `os.updated_at AS date` (raw timestamp) to a UNION arm where all other arms return TEXT for the `date` column causes a PostgreSQL type mismatch error at query time.
**Why it happens:** UNION ALL requires all arms to return columns of compatible types. Most date fields in this schema are TEXT; Phase 5.1 tables use `timestamp`.
**How to avoid:** Cast timestamp columns in UNION arms: `os.updated_at::text AS date`.
**Warning signs:** PostgreSQL error "column ... is of type timestamp but expression is of type text" when running a search.

### Pitfall 2: skill_path Field Name vs Audit Label
**What goes wrong:** The v1.0 audit refers to `settings.skill_files_path` but the actual AppSettings interface uses `skill_path`. Writing `settings.skill_files_path` in skill-run.ts will silently be `undefined` (TypeScript may or may not catch this depending on how AppSettings is typed).
**Why it happens:** Audit documentation uses descriptive labels that don't always match the code field names.
**How to avoid:** Read settings-core.ts line 26 (`skill_path: string`) before writing the fix.
**Warning signs:** `SKILLS_DIR` resolves to undefined or empty string; TS compiler flags `skill_files_path` does not exist on type AppSettings.

### Pitfall 3: search_vec Column Missing After Migration
**What goes wrong:** Backfill UPDATE runs but returns 0 rows updated (no FTS results for existing data).
**Why it happens:** Migration 0009 was not applied to the running database, or the backfill section was omitted.
**How to avoid:** Always include a Section 5 backfill UPDATE in migration 0009 identical in structure to migration 0008's Section 5.
**Warning signs:** New rows inserted after migration return results; rows inserted before migration return nothing.

### Pitfall 4: Type Filter Breaking New Arms
**What goes wrong:** Searching with `?type=onboarding_steps` returns 0 results even with matching data.
**Why it happens:** The `if (!type || type === 'onboarding_steps')` guard must exactly match the string passed in the query param. If the search UI doesn't expose these new types in its filter dropdown, users cannot select them, but direct API calls should work.
**How to avoid:** Confirm the type guard string matches what the search API would receive; optionally add the new types to the search UI type filter dropdown (nice-to-have, not required by success criteria).

### Pitfall 5: Removing Wrong DOM Node for /skills/custom Fix
**What goes wrong:** Removing only the `<a>` tag leaves an empty `<div className="mt-8">` wrapper visible in the UI.
**Why it happens:** The surrounding div is structural and becomes invisible empty content.
**How to avoid:** Remove both the wrapping `<div className="mt-8">` and the `<a>` inside it (lines 254-261 in SkillsTabClient.tsx as of last read).

## Code Examples

Verified patterns from existing source:

### Existing UNION ALL arm shape (from lib/queries.ts, arm 1)
```typescript
// Source: bigpanda-app/lib/queries.ts lines 447-467 (Phase 08-03 implementation)
if (!type || type === 'actions') {
  arms.push(`
    SELECT
      a.id,
      'actions'::text AS "table",
      'Actions'::text AS section,
      a.project_id,
      p.name AS project_name,
      p.customer,
      a.due AS date,
      a.description AS title,
      SUBSTRING(COALESCE(a.notes, ''), 1, 200) AS snippet
    FROM actions a
    JOIN projects p ON p.id = a.project_id
    WHERE p.status = 'active'
      AND a.search_vec @@ plainto_tsquery('english', '${safeQ}')
      ${accountFilter('p.customer')}
      ${dateBounds('a.due')}
  `);
}
```

### settings-core.ts AppSettings interface (field names)
```typescript
// Source: bigpanda-app/lib/settings-core.ts lines 24-36
export interface AppSettings {
  workspace_path: string;
  skill_path: string;      // <-- field is 'skill_path', NOT 'skill_files_path'
  schedule: { ... };
  mcp_servers: MCPServerConfig[];
}
// DEFAULTS.skill_path = path.join(os.homedir(), '.claude', 'get-shit-done')
// This is an absolute path already — no homedir prepending needed for the default.
```

### Existing trigger pattern (from 0008_fts_and_kb.sql)
```sql
-- Source: bigpanda-app/db/migrations/0008_fts_and_kb.sql lines 37-50
CREATE OR REPLACE FUNCTION tsvector_update_actions() RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.description, '') || ' ' || coalesce(NEW.notes, '') || ' ' || coalesce(NEW.owner, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actions_search_vec ON actions;
CREATE TRIGGER trg_actions_search_vec
  BEFORE INSERT OR UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION tsvector_update_actions();
```

### SkillsTabClient.tsx orphaned link location
```typescript
// Source: bigpanda-app/components/SkillsTabClient.tsx lines 252-261
// REMOVE this entire block:
<div className="mt-8">
  <a
    href={`/customer/${projectId}/skills/custom`}
    className="text-xs text-zinc-400 hover:text-zinc-600 underline underline-offset-2"
  >
    Run custom skill
  </a>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FTS on 8 tables | FTS on 12 tables | Phase 10 (this phase) | Users can search onboarding step owners, integration notes, time entry descriptions |
| SKILLS_DIR hardcoded in skill-run.ts | skill_path from settings with __dirname fallback | Phase 10 (this phase) | SET-02 requirement fulfilled; custom skill directories honored |
| /skills/custom 404 link | Link removed | Phase 10 (this phase) | No more broken navigation |

**Next migration number:** 0009. Current last migration is `0008_fts_and_kb.sql` (confirmed by filesystem listing).

## Open Questions

1. **Should scheduled skill handlers also honor skill_path?**
   - What we know: Phase success criteria only specifies skill-run.ts
   - What's unclear: Whether a future user would want morning-briefing to read from a custom skill directory
   - Recommendation: Scope to skill-run.ts only per success criteria. Add a STATE.md decision note that the fix is intentionally scoped.

2. **Should the 4 new table types appear in the search UI type filter dropdown?**
   - What we know: The search success criteria says "returns results from those tables" — the type filter is a bonus
   - What's unclear: Current filter dropdown options (not read, but likely 'actions'/'risks'/etc.)
   - Recommendation: If the type filter is a `<select>` with hardcoded options, add the 4 new values. If it's a free-text field, no change needed. Leave for the planner to specify or mark as discretion.

3. **Do onboarding_phases have useful text beyond name?**
   - What we know: `onboarding_phases` has only `name`, `display_order`, `created_at`, `project_id` — minimal fields
   - What's unclear: Whether indexing phases is valuable given sparse text
   - Recommendation: Include for completeness per the gap spec, but index only `name`. Low risk.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (E2E) + Node test runner (unit) |
| Config file | `playwright.config.ts` at project root |
| Quick run command | `npx playwright test tests/e2e/phase10.spec.ts --reporter=list` |
| Full suite command | `npx playwright test --reporter=list` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | Search for onboarding step owner returns result from onboarding_steps table | E2E | `npx playwright test tests/e2e/phase10.spec.ts --grep "SRCH-01"` | ❌ Wave 0 |
| SRCH-01 | Search for time entry description returns result from time_entries table | E2E | `npx playwright test tests/e2e/phase10.spec.ts --grep "SRCH-01"` | ❌ Wave 0 |
| SET-02 | skill-run.ts reads skill_path from settings when set | unit | `node --test tests/skill-run-settings.test.ts` (or vitest equivalent) | ❌ Wave 0 |
| INT-UI-01 | /skills/custom link no longer navigates to 404 | E2E | `npx playwright test tests/e2e/phase10.spec.ts --grep "INT-UI-01"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx playwright test tests/e2e/phase10.spec.ts --reporter=list`
- **Per wave merge:** `npx playwright test --reporter=list`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/e2e/phase10.spec.ts` — E2E stubs for SRCH-01 (2 behaviors) + INT-UI-01
- [ ] Unit test for SET-02 (skill path resolution) — framework: vitest (installed in bigpanda-app since Phase 07-01); test file: `bigpanda-app/tests/skill-run-settings.test.ts` or add to existing vitest suite

Note on SET-02 unit test: testing the actual file I/O in skill-run.ts will require mocking `readSettings()`. The assert-if-present pattern is acceptable here — test that `skillsDir` resolves to the configured path when `skill_path` is set in settings, and falls back to `__dirname`-relative when not set.

## Sources

### Primary (HIGH confidence)
- `bigpanda-app/db/migrations/0008_fts_and_kb.sql` — complete FTS pattern established in Phase 8, verified to work
- `bigpanda-app/lib/queries.ts` lines 390-640 — `SearchResult` interface + `searchAllRecords()` 8-arm UNION ALL
- `bigpanda-app/lib/settings-core.ts` — `AppSettings` interface, `DEFAULTS`, `readSettings()` function
- `bigpanda-app/worker/jobs/skill-run.ts` — current SKILLS_DIR hardcoded pattern, MCP injection already present
- `bigpanda-app/db/schema.ts` lines 339-398 — `onboarding_phases`, `onboarding_steps`, `integrations`, `time_entries` column definitions
- `bigpanda-app/components/SkillsTabClient.tsx` lines 252-261 — orphaned link location confirmed
- `.planning/v1.0-MILESTONE-AUDIT.md` — INT-FTS-01, INT-SET-01, INT-UI-01 gap descriptions
- `.planning/REQUIREMENTS.md` — SRCH-01, SET-02 requirement text and phase assignment

### Secondary (MEDIUM confidence)
- `.planning/phases/08-cross-project-features-+-polish/08-02-PLAN.md` — note confirming search_vec must NOT be added to Drizzle schema
- `.planning/phases/08-cross-project-features-+-polish/08-VERIFICATION.md` — confirms 8-table FTS is working as of Phase 8 completion

### Tertiary (LOW confidence)
- None — all findings are directly from codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all patterns established and verified
- Architecture: HIGH — exact migration/queries pattern from 0008 confirmed working
- Pitfalls: HIGH — timestamp cast pitfall is deterministic from schema inspection; field name pitfall confirmed by comparing audit doc to code
- SET-02 fix scope: MEDIUM — success criteria says "skill-run.ts"; whether all handlers should also be updated is a planner discretion call

**Research date:** 2026-03-25
**Valid until:** Stable — this phase is purely additive and references only internal codebase patterns
