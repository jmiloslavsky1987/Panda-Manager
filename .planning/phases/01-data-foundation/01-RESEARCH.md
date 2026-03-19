# Phase 1: Data Foundation - Research

**Researched:** 2026-03-18
**Domain:** PostgreSQL schema design, Drizzle ORM migrations, YAML round-trip, xlsx import, settings persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Read from local files on disk — no Google Drive API needed in Phase 1
- Source path: `/Documents/PM Application/` (user-specified; not `~/Documents/BigPanda Projects/`)
- Migration script reads YAML context docs and PA3_Action_Tracker.xlsx from this directory
- Script is idempotent: re-running is safe — existing records (matched by project name/ID) are skipped
- YAML project context docs are the authoritative source; xlsx supplements
- PA3_Action_Tracker.xlsx has MORE than 2 sheets — researcher must inspect the actual sheet structure before assuming column/sheet layout
- Import workflow: import all records from YAML first, then scan xlsx for any action IDs not already in the DB and import those as additional records; YAML wins on field conflicts
- YAML export settings MUST BE EXACTLY: `sortKeys: false`, `lineWidth: -1`, `noRefs: true`, `JSON_SCHEMA`

### Claude's Discretion
- Schema file organization (single schema.ts vs. per-table files)
- Drizzle migration file naming and structure
- Connection pool configuration values (pool size, idle timeout)
- Settings persistence format (JSON config file, .env.local, or similar — as long as API key is NOT in a committed file)
- Exact DB trigger syntax for append-only enforcement
- RLS policy implementation details

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within Phase 1 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Database schema implements all tables (projects, workstreams, actions, risks, milestones, artifacts, history, stakeholders, tasks, plan_templates, outputs, knowledge_base) with PostgreSQL RLS enforced at DB layer | Drizzle schema patterns, RLS policy syntax documented below |
| DATA-02 | Append-only tables (engagement_history, key_decisions) enforced by DB trigger | PostgreSQL BEFORE UPDATE OR DELETE trigger pattern documented below |
| DATA-03 | Migration script imports all three existing customer context docs (YAML frontmatter → DB) with source tracing preserved | Source doc structure fully inspected and documented below — critical finding: Merck has NO YAML frontmatter |
| DATA-04 | Migration script imports PA3_Action_Tracker.xlsx into actions table | xlsx sheet structure fully inspected — 5 sheets documented below |
| DATA-05 | Context doc export: DB → YAML frontmatter Markdown with exact js-yaml settings — round-trip fidelity | yamlService.js pattern confirmed; exact settings verified |
| DATA-06 | Multi-account architecture: user can add new projects, close completed ones (archived as read-only), no hardcoded customer names | project_id FK pattern + RLS documented |
| DATA-07 | Idempotency key and status field on outputs table (status = 'running' on create) | Schema pattern for outputs table documented |
| DATA-08 | PostgreSQL connection pool as singleton — no per-request pool creation | global.__pgPool singleton pattern documented |
| SET-01 | Workspace path configuration (default: `/Documents/PM Application/`) | JSON config file approach documented; note: default is the user-specified path, NOT `~/Documents/BigPanda Projects/` |
| SET-02 | Skill file location configuration (default: `~/.claude/get-shit-done/`) | JSON config file approach documented |
| SET-03 | Schedule time configuration for each background job | stored in settings JSON; not in DB for Phase 1 (BullMQ is Phase 4) |
| SET-04 | Anthropic API key stored securely (not in .env committed to git) | `.env.local` gitignored approach documented; settings table stores reference not value |
</phase_requirements>

---

## Summary

Phase 1 delivers the data foundation that every subsequent phase depends on. Research has fully resolved the two "unknown unknowns" flagged in CONTEXT.md: the PA3_Action_Tracker.xlsx has **5 sheets** (not 2 as stated in REQUIREMENTS.md DATA-04), and the Merck context doc has **no YAML frontmatter** — it is a pure prose Markdown file. Both findings require migration script logic that differs from what a naive implementation would assume.

The standard stack is clear and high-confidence: Drizzle ORM 0.45.1 + postgres driver 3.4.8 + drizzle-kit 0.31.10 (all verified via `npm view`). PostgreSQL RLS for single-user local apps uses a simpler session variable pattern than multi-user apps. The append-only trigger is straightforward PostgreSQL DDL. Settings should be stored in a gitignored `.env.local` file (API key) plus a `~/.bigpanda-app/settings.json` user config file (paths, schedule times).

**Primary recommendation:** Build the DataService and migration script before touching the schema, because the source data structure drives the schema design. The Merck doc requires a different import strategy (manual extraction from prose tables) than KAISER and AMEX (YAML frontmatter parse). Plan this divergence explicitly.

---

## Critical Pre-Build Findings

### Finding 1: PA3_Action_Tracker.xlsx Has 5 Sheets (Not 2)

**Source:** Direct inspection of `/Documents/PM Application/PA3_Action_Tracker copy.xlsx`
**Confidence:** HIGH (inspected from actual file)

The xlsx file has exactly 5 sheets:

| Sheet # | Name | Columns | Row Count (approx) | Purpose |
|---------|------|---------|-------------------|---------|
| 1 | Open Actions | Customer, ID, Description, Owner, Due, Status, Last Updated, Notes | ~100 | Active open actions across all customers |
| 2 | Open Risks | Customer, ID, Description, Severity, Owner, Status, Mitigation Summary | ~93 | Active open risks across all customers |
| 3 | Open Questions | Customer, ID, Question, Owner, Status, Notes | ~53 | Open questions (Q-AMEX-NNN, Q-KAISER-NNN format) |
| 4 | Workstream Notes | Customer, Workstream, Current Status Summary, Lead(s), Last Updated, State | ~16 | Workstream status snapshots |
| 5 | Completed | Customer, ID, Description, Owner, Completed | ~445 | Completed actions archive |

**Key structural details:**
- Row 1 = title row (e.g., "PA 3.0 Open Action Items — All Customers") — skip for import
- Row 2 = column headers — use for column mapping
- Row 3+ = data rows
- Columns use `inlineStr` type (no shared strings file) — plain text, no type complexity
- ID format confirmed: `A-AMEX-NNN`, `A-KAISER-NNN` for actions; `R-AMEX-NNN`, `R-KAISER-NNN` for risks; `Q-AMEX-NNN`, `Q-KAISER-NNN` for questions
- Customer column values: `AMEX`, `Kaiser` (note: not `KAISER` — mixed case in xlsx vs YAML)

**What to import into DB from each sheet:**
- Sheet 1 (Open Actions): import into `actions` table — primary xlsx source for action supplementation
- Sheet 2 (Open Risks): import into `risks` table — supplement YAML risks
- Sheet 3 (Open Questions): no `questions` table defined in REQUIREMENTS.md — store as `actions` with type='question' or skip; **needs planner decision**
- Sheet 4 (Workstream Notes): data belongs in `workstreams` table — supplement YAML workstream data
- Sheet 5 (Completed): import into `actions` table with `status = 'completed'` — provides historical archive

### Finding 2: Merck Context Doc Has NO YAML Frontmatter

**Source:** Direct inspection of `/Documents/PM Application/MERCK_Project_Context_2026-03-16 copy.md`
**Confidence:** HIGH (inspected from actual file)

The Merck doc starts directly with prose Markdown (`## Before BigPanda — Pre-Implementation State`) — there is NO `---` frontmatter block at the top. The doc contains team onboarding tables, integration status tables, and team status tables in Markdown table format, but NO machine-parseable YAML.

The Merck migration strategy must be different from KAISER/AMEX:
- Create a Merck project record manually (or via a separate seeding section of the script)
- Extract structured data from Markdown tables (e.g., team onboarding status, integration status)
- The Merck doc does contain milestones and risks sections formatted as Markdown table rows (found `milestones:` and `risks:` section headers at prose level with no YAML structure)

**Implication for migration script:** The migration must handle THREE cases:
1. YAML frontmatter present: parse with js-yaml (KAISER, AMEX)
2. No frontmatter: create project with defaults, extract what's possible from prose (Merck)
3. Merck project may need to be partially hand-seeded for the Phase 1 migration

### Finding 3: KAISER and AMEX YAML Frontmatter Top-Level Keys Differ From REQUIRED_TOP_LEVEL_KEYS

**Source:** Direct inspection of both files
**Confidence:** HIGH

The actual frontmatter keys present in the source docs:

| Key | KAISER | AMEX | yamlService.js Required |
|-----|--------|------|------------------------|
| `customer` | YES | YES | YES |
| `project` | YES | YES | YES |
| `status` | NO (uses `overall_status`) | NO (uses `overall_status`) | YES |
| `workstreams` | YES | YES | YES |
| `actions` | NO | NO | YES |
| `risks` | YES | YES | YES |
| `milestones` | YES | YES | YES |
| `artifacts` | NO | NO | YES |
| `history` | NO | NO | YES |

**Critical implication:** The source docs do NOT have `actions`, `history`, or `artifacts` in YAML frontmatter — these data types exist ONLY in the xlsx tracker. The migration script imports YAML fields that ARE present and creates empty arrays for missing required fields. The `overall_status` key maps to the `status` field in the DB schema. The new DB-to-YAML export MUST output all `REQUIRED_TOP_LEVEL_KEYS` regardless of whether source data populated them.

---

## Standard Stack

### Core Libraries

| Library | Verified Version | Purpose | Confidence |
|---------|-----------------|---------|------------|
| drizzle-orm | 0.45.1 | Type-safe PostgreSQL ORM | HIGH (npm view verified) |
| postgres (porsager) | 3.4.8 | PostgreSQL connection driver | HIGH (npm view verified) |
| drizzle-kit | 0.31.10 | Migration CLI | HIGH (npm view verified) |
| js-yaml | 4.1.1 | YAML parse/serialize | HIGH (running in existing server/) |
| exceljs | (verify) | xlsx read for migration | MEDIUM (need npm view) |

**Note:** The prior research STACK.md noted drizzle-orm as "^0.30.x" — actual current version is 0.45.1. Use the verified version.

### Supporting Libraries

| Library | Purpose | Notes |
|---------|---------|-------|
| dotenv | `.env.local` loading | Already in server/package.json |
| zod | Settings schema validation | Already in server/package.json ^4.3.6 |
| @types/js-yaml | TypeScript types | Dev dependency |

**Installation for new Next.js project:**
```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
npm install js-yaml exceljs
npm install -D @types/js-yaml tsx
# Verify exceljs version before pinning:
npm view exceljs version
```

---

## Architecture Patterns

### Recommended Project Structure

```
bigpanda-app/
├── db/
│   ├── schema.ts              # All Drizzle table definitions
│   ├── schema/                # (alternative) per-domain schema files
│   │   ├── projects.ts
│   │   ├── actions.ts
│   │   └── ...
│   ├── index.ts               # Singleton pool + db instance
│   └── migrations/            # drizzle-kit generated SQL files
├── scripts/
│   └── migrate-local.ts       # Phase 1 seed migration (YAML + xlsx → DB)
├── lib/
│   ├── settings.ts            # Settings read/write (JSON config file)
│   └── yaml-export.ts         # DB → YAML round-trip utility
└── ...
```

### Pattern 1: Drizzle Schema Definition

```typescript
// db/schema.ts
import { pgTable, serial, text, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const projectStatusEnum = pgEnum('project_status', ['active', 'archived', 'closed']);
export const actionStatusEnum = pgEnum('action_status', ['open', 'in_progress', 'completed', 'cancelled']);
export const severityEnum = pgEnum('severity', ['low', 'medium', 'high', 'critical']);

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  customer: text('customer').notNull(),
  status: projectStatusEnum('status').notNull().default('active'),
  overall_status: text('overall_status'),       // yellow/green/red from source docs
  status_summary: text('status_summary'),
  go_live_target: text('go_live_target'),
  last_updated: text('last_updated'),
  source_file: text('source_file'),             // source tracing: original filename
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const actions = pgTable('actions', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  external_id: text('external_id').notNull(),   // A-KAISER-001 — preserved from source
  description: text('description').notNull(),
  owner: text('owner'),
  due: text('due'),                             // stored as text; dates are inconsistent ('TBD', 'null', ISO)
  status: actionStatusEnum('status').notNull().default('open'),
  last_updated: text('last_updated'),
  notes: text('notes'),
  source: text('source').notNull(),             // 'yaml' | 'xlsx_open' | 'xlsx_completed'
  created_at: timestamp('created_at').defaultNow(),
});

export const risks = pgTable('risks', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  external_id: text('external_id').notNull(),   // R-KAISER-002
  description: text('description').notNull(),
  severity: severityEnum('severity'),
  owner: text('owner'),
  mitigation: text('mitigation'),
  status: text('status'),
  last_updated: text('last_updated'),
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const milestones = pgTable('milestones', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  external_id: text('external_id').notNull(),   // M-KAISER-001
  name: text('name').notNull(),
  status: text('status'),
  target: text('target'),
  date: text('date'),
  notes: text('notes'),
  owner: text('owner'),
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

// APPEND-ONLY — guarded by DB trigger
export const engagementHistory = pgTable('engagement_history', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  date: text('date'),
  content: text('content').notNull(),
  source: text('source').notNull(),             // source tracing
  created_at: timestamp('created_at').defaultNow(),
});

// APPEND-ONLY — guarded by DB trigger
export const keyDecisions = pgTable('key_decisions', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  date: text('date'),
  decision: text('decision').notNull(),
  context: text('context'),
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

export const outputs = pgTable('outputs', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').references(() => projects.id),
  skill_name: text('skill_name').notNull(),
  idempotency_key: text('idempotency_key').notNull().unique(), // DATA-07
  status: text('status').notNull().default('running'),        // 'running' | 'complete' | 'failed'
  content: text('content'),
  filename: text('filename'),
  filepath: text('filepath'),
  created_at: timestamp('created_at').defaultNow(),
  completed_at: timestamp('completed_at'),
});
```

**Schema notes:**
- `due` and date fields stored as `text` not `date` because source data has inconsistent formats (`'TBD'`, `'null'`, `'2026-03-04'`, `'2026-Q3'`). Parsing to date happens at the query layer only when needed.
- `external_id` is the human-readable ID from source (`A-KAISER-001`). The `id` field is the internal DB serial. Both preserved.
- `source` on every row = source tracing required by DATA-03.

### Pattern 2: Singleton Connection Pool (DATA-08)

```typescript
// db/index.ts
import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Singleton pattern — survives Next.js hot reload
declare global {
  var __pgConnection: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL!;

const connection = globalThis.__pgConnection ?? postgres(connectionString, {
  max: 10,             // conservative pool size
  idle_timeout: 30,    // 30s idle before closing
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pgConnection = connection;
}

export const db = drizzle(connection, { schema });
```

**Why `postgres` (porsager) over `pg`:** `postgres` uses tagged template literals, has built-in prepared statement support, and simpler pool configuration. No `Pool` class footguns. Connection is reused automatically.

### Pattern 3: PostgreSQL Row Level Security (DATA-01, DATA-06)

For a single-user local app, RLS provides data isolation between projects (not between users). The pattern uses a session-level setting to inject the current project context.

```sql
-- In migration SQL
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;

-- Policy: per-account queries are scoped by project_id
CREATE POLICY project_isolation ON actions
  USING (project_id = current_setting('app.current_project_id', true)::integer);

-- Cross-project queries (dashboard) bypass RLS with BYPASSRLS role
-- OR use explicit WHERE clause without the session variable set
```

**Single-user RLS approach:** For local single-user use, the simplest implementation sets the session variable before any per-project query:

```typescript
// In DataService query methods
await db.execute(sql`SET LOCAL app.current_project_id = ${projectId}`);
const result = await db.query.actions.findMany({ ... });
```

For cross-project queries (dashboard), execute WITHOUT setting the session variable — this results in empty results from RLS policies, so cross-project queries must either BYPASS RLS or use explicit `WHERE project_id IN (...)` without RLS active.

**Recommendation for single-user app:** Keep RLS enabled but use a superuser role for cross-project queries. The key guarantee is: a query that forgets to set project_id returns empty results rather than all projects' data.

### Pattern 4: Append-Only DB Trigger (DATA-02)

```sql
-- In Drizzle migration SQL file
CREATE OR REPLACE FUNCTION enforce_append_only()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only: UPDATE and DELETE are prohibited. Entry ID: %',
    TG_TABLE_NAME, OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_history_append_only
  BEFORE UPDATE OR DELETE ON engagement_history
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();

CREATE TRIGGER key_decisions_append_only
  BEFORE UPDATE OR DELETE ON key_decisions
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();
```

**Key requirement:** Trigger must fire at the PostgreSQL level — not a Drizzle-layer guard. The `RAISE EXCEPTION` propagates as a PostgreSQL error that Drizzle surfaces as a thrown error in the application.

To include this in Drizzle migrations, use a custom migration file with raw SQL:

```typescript
// In drizzle.config.ts
export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  driver: 'pg',
  dbCredentials: { connectionString: process.env.DATABASE_URL! },
} satisfies Config;
```

Then add the trigger SQL directly to the generated migration file (do not let drizzle-kit overwrite it — commit the migration file).

### Pattern 5: YAML Export Round-Trip (DATA-05)

**Non-negotiable settings** — carried forward verbatim from `server/services/yamlService.js`:

```typescript
// lib/yaml-export.ts
import 'server-only';
import yaml from 'js-yaml';

const REQUIRED_TOP_LEVEL_KEYS = [
  'customer', 'project', 'status', 'workstreams',
  'actions', 'risks', 'milestones', 'artifacts', 'history',
];

export function serializeProjectToYaml(projectData: Record<string, unknown>): string {
  return yaml.dump(projectData, {
    sortKeys: false,    // Preserve insertion order — NEVER change this
    lineWidth: -1,      // No line-folding — NEVER change this
    noRefs: true,       // Disable YAML anchors — NEVER change this
    // schema: yaml.JSON_SCHEMA applied at parse time only
  });
}

export function parseYaml(content: string): unknown {
  return yaml.load(content, { schema: yaml.JSON_SCHEMA });
}

export function buildYamlDocument(project: ProjectRecord, sections: ProjectSections): string {
  const doc: Record<string, unknown> = {};
  // Build in required key order
  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    doc[key] = sections[key] ?? [];
  }
  // Add any extra keys from the original source
  const yamlContent = serializeProjectToYaml(doc);
  return `---\n${yamlContent}---\n\n# ${project.customer} — BigPanda PA 3.0 Project Context\n`;
}
```

**Note on `noRefs`:** The existing yamlService.js uses `noRefs: true` but CONTEXT.md specifies the export settings as `sortKeys: false, lineWidth: -1, noRefs: true, JSON_SCHEMA`. The `JSON_SCHEMA` is applied at PARSE time (via `yaml.load`) not dump time. This is correct — `JSON_SCHEMA` prevents boolean coercion when reading files. At dump time, the other three settings are all that matter.

### Pattern 6: Settings Persistence (SET-01 through SET-04)

**Approach:** Two-layer settings storage:

1. **`.env.local`** (gitignored): sensitive values only — `ANTHROPIC_API_KEY`, `DATABASE_URL`
2. **`~/.bigpanda-app/settings.json`** (user config file outside repo): `workspace_path`, `skill_path`, schedule times

```typescript
// lib/settings.ts
import 'server-only';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SETTINGS_PATH = path.join(os.homedir(), '.bigpanda-app', 'settings.json');

interface AppSettings {
  workspace_path: string;          // SET-01
  skill_path: string;              // SET-02
  schedule: {                      // SET-03
    morning_briefing: string;
    health_check: string;
    slack_sweep: string;
    tracker_weekly: string;
    weekly_status: string;
    biggy_briefing: string;
  };
}

const DEFAULTS: AppSettings = {
  workspace_path: '/Documents/PM Application',      // user-specified default (NOT ~/Documents/BigPanda Projects/)
  skill_path: path.join(os.homedir(), '.claude', 'get-shit-done'),
  schedule: {
    morning_briefing: '0 8 * * *',
    health_check: '0 8 * * *',
    slack_sweep: '0 9 * * *',
    tracker_weekly: '0 7 * * 1',
    weekly_status: '0 16 * * 4',
    biggy_briefing: '0 9 * * 5',
  },
};

export function readSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSettings(settings: Partial<AppSettings>): void {
  const current = readSettings();
  const updated = { ...current, ...settings };
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf8');
}
```

**API key (SET-04):** Stored in `.env.local` only — never in the settings JSON. The Settings UI reads/writes via a dedicated API route that calls `process.env.ANTHROPIC_API_KEY` (read) and writes to `.env.local` (write). `.env.local` is automatically gitignored by Next.js.

**Default workspace path:** CONTEXT.md specifies `/Documents/PM Application/` — this overrides the REQUIREMENTS.md default of `~/Documents/BigPanda Projects/`. The settings.ts default must use the correct path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PostgreSQL migrations | Custom SQL runner script | drizzle-kit generate + migrate | drizzle-kit tracks migration state, handles rollback, generates TypeScript types |
| xlsx file reading | XML parsing by hand | ExcelJS or node-xlsx | Sheet structure is complex; inlineStr + shared string types need proper handling |
| YAML boolean coercion prevention | Custom pre-processor | `js-yaml` with `JSON_SCHEMA` | JSON_SCHEMA is the correct YAML 1.2 schema that skips 1.1 boolean shortcuts |
| Connection pooling | Manual connection array | `postgres` driver (porsager) | Built-in pool, prepared statements, tagged literals |
| Settings API key validation | Custom validator | Zod schema | Already installed (^4.3.6 confirmed) |

---

## Common Pitfalls

### Pitfall 1: xlsx Sheet Numbering vs Sheet Names

**What goes wrong:** Code assumes sheet[0] is "Open Actions" and sheet[1] is "Completed". The actual file has 5 sheets in named order. Importing by index rather than by name causes wrong data to land in wrong tables.

**Prevention:** Always import xlsx sheets by name, not by index:
```typescript
const sheet = workbook.getWorksheet('Open Actions');  // not workbook.worksheets[0]
```

### Pitfall 2: "Customer" Column Case Mismatch Between xlsx and YAML

**What goes wrong:** The xlsx uses `Kaiser` (mixed case) while YAML uses `KAISER` (uppercase) in IDs like `A-KAISER-001`. The idempotency check (YAML wins on field conflicts) must normalize the customer name for matching.

**Prevention:** Normalize customer name to uppercase for ID prefix matching. Use the existing `external_id` as the primary dedup key, not customer name.

### Pitfall 3: Merck Has No YAML Frontmatter

**What goes wrong:** The migration script assumes all three `.md` files start with `---` YAML frontmatter. Merck does not. Running `yaml.load()` on the Merck file body produces `null` or throws, and the script either crashes or silently skips Merck.

**Prevention:** Detect frontmatter presence before attempting yaml.load. If no frontmatter: create a stub project record and log a warning that Merck data requires manual review. Do NOT skip Merck silently.

```typescript
function extractFrontmatter(content: string): { yaml: string | null; body: string } {
  if (!content.startsWith('---')) return { yaml: null, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { yaml: null, body: content };
  return { yaml: content.slice(4, end), body: content.slice(end + 4) };
}
```

### Pitfall 4: `due` and `last_updated` Field Values Are Not ISO Dates

**What goes wrong:** Treating xlsx `Due` column as a date type causes parse failures. The xlsx contains `'TBD'`, `'null'` (literal string), `'2026-Q3'`, and ISO dates mixed together.

**Prevention:** Store all date-like fields as `text` in PostgreSQL. Only convert to `Date` at query time when the consumer guarantees the format. The DB schema uses `text` for these fields (as documented in Pattern 1 above).

### Pitfall 5: RLS Blocks Cross-Project Dashboard Queries

**What goes wrong:** The dashboard queries actions/risks across ALL projects for health scoring. If RLS is enabled with a project_id policy and no session variable is set, the query returns 0 rows — health scores show empty for all projects.

**Prevention:** Cross-project queries must either:
- Use a PostgreSQL superuser role that bypasses RLS (simplest for single-user local app)
- Explicitly include all project IDs in a `WHERE project_id = ANY($1)` clause and disable RLS for the dashboard queries via a `BYPASSRLS` attribute on the DB user

For a local single-user app, the recommended approach is: create two DB roles — `app_user` (normal, subject to RLS for per-project queries) and `app_admin` (BYPASSRLS for dashboard/cross-project queries).

### Pitfall 6: Drizzle Migration SQL Must Include Trigger DDL Manually

**What goes wrong:** drizzle-kit generate only creates table DDL from the schema. The append-only triggers are raw SQL that drizzle-kit cannot infer. Developers assume the triggers are included in migrations — they are not.

**Prevention:** After `drizzle-kit generate`, manually append the trigger DDL to the generated migration file before running `drizzle-kit migrate`. Mark the migration file with a comment: `-- MANUAL: append-only triggers added below drizzle-kit output`.

### Pitfall 7: YAML Export Missing Required Top-Level Keys

**What goes wrong:** The DB only stores records that were present in the source — KAISER has no `actions` in YAML frontmatter. The export reads from DB and produces a YAML doc without the `actions` key. Cowork skills that validate required keys throw a ValidationError.

**Prevention:** The export function MUST emit all `REQUIRED_TOP_LEVEL_KEYS` with an empty array `[]` when no records exist, not by omitting the key. This mirrors the `normalizeForSerialization` function in `server/services/yamlService.js`.

---

## Code Examples

### Migration Script: Idempotent YAML Import

```typescript
// scripts/migrate-local.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { db } from '../db/index';
import { projects, actions, risks, milestones } from '../db/schema';
import { eq } from 'drizzle-orm';

const SOURCE_DIR = '/Documents/PM Application';

function extractFrontmatter(content: string): Record<string, unknown> | null {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return null;
  const yamlStr = content.slice(4, end);
  return yaml.load(yamlStr, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
}

async function importContextDoc(filename: string, content: string) {
  const data = extractFrontmatter(content);
  if (!data) {
    console.log(`[SKIP] ${filename}: no YAML frontmatter — requires manual seeding`);
    return;
  }

  const customerName = typeof data.customer === 'string'
    ? data.customer
    : (data.customer as any)?.name ?? filename;

  // Idempotency check: skip if project already exists
  const existing = await db.query.projects.findFirst({
    where: eq(projects.customer, customerName),
  });
  if (existing) {
    console.log(`[SKIP] ${customerName}: already in DB (id=${existing.id})`);
    return;
  }

  // Insert project
  const [project] = await db.insert(projects).values({
    name: (data.project as any)?.name ?? String(data.project),
    customer: customerName,
    overall_status: String(data.overall_status ?? data.status ?? ''),
    status_summary: String(data.status_summary ?? ''),
    go_live_target: String(data.go_live_target ?? ''),
    last_updated: String(data.last_updated ?? ''),
    source_file: filename,
  }).returning();

  console.log(`[IMPORT] ${customerName} → project id=${project.id}`);

  // Import milestones (if present)
  const milestoneList = Array.isArray(data.milestones) ? data.milestones : [];
  for (const m of milestoneList) {
    await db.insert(milestones).values({
      project_id: project.id,
      external_id: m.id,
      name: m.name,
      status: m.status,
      target: m.target ?? null,
      date: m.date ?? null,
      notes: m.notes ?? null,
      owner: m.owner ?? null,
      source: 'yaml',
    });
  }

  // Import risks (if present)
  // ... similar pattern
}
```

### Migration Script: xlsx Import (Sheet-by-Name Pattern)

```typescript
import ExcelJS from 'exceljs';

async function importXlsx(projectIdMap: Map<string, number>) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(SOURCE_DIR, 'PA3_Action_Tracker copy.xlsx'));

  const openActionsSheet = workbook.getWorksheet('Open Actions');
  if (!openActionsSheet) throw new Error('Sheet "Open Actions" not found');

  // Skip row 1 (title) and row 2 (headers), data starts at row 3
  openActionsSheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
    if (rowNumber <= 2) return;

    const customer = String(row.getCell(1).value ?? '').toUpperCase(); // normalize case
    const externalId = String(row.getCell(2).value ?? '');
    const description = String(row.getCell(3).value ?? '');
    const owner = String(row.getCell(4).value ?? '');
    const due = String(row.getCell(5).value ?? '');
    const status = String(row.getCell(6).value ?? 'open');
    const lastUpdated = String(row.getCell(7).value ?? '');
    const notes = row.getCell(8).value ? String(row.getCell(8).value) : null;

    // YAML wins: skip if this action ID already imported from YAML
    const alreadyExists = await db.query.actions.findFirst({
      where: eq(actions.external_id, externalId),
    });
    if (alreadyExists) return;

    const projectId = projectIdMap.get(customer);
    if (!projectId) {
      console.warn(`[WARN] No project found for customer "${customer}" — skipping ${externalId}`);
      return;
    }

    await db.insert(actions).values({
      project_id: projectId,
      external_id: externalId,
      description,
      owner,
      due,
      status: status as any,
      last_updated: lastUpdated,
      notes,
      source: 'xlsx_open',
    });
  });
}
```

### Drizzle Config

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Prisma as default ORM for Next.js | Drizzle ORM (no binary dependency) | macOS ARM install is reliable; Edge Runtime compatible |
| `pg` (node-postgres) with `new Pool()` | `postgres` (porsager) with tagged templates | Cleaner pool lifecycle; no footguns |
| drizzle-orm 0.30.x (per prior research estimate) | drizzle-orm 0.45.1 (verified) | API surface may differ from 0.30.x examples |
| `.env` file for all config | `.env.local` (gitignored) for secrets + `~/.bigpanda-app/settings.json` for user prefs | API key cannot be committed; user prefs survive npm installs |

---

## Open Questions

1. **What to do with xlsx Sheet 3 (Open Questions — Q-AMEX-NNN, Q-KAISER-NNN)**
   - What we know: The sheet has ~53 rows of questions with ID prefix `Q-`. No `questions` table is in REQUIREMENTS.md DATA-01.
   - What's unclear: Should questions be imported into a `questions` table (not yet defined), treated as a subtype of actions (`type='question'`), or skipped?
   - Recommendation: Planner should decide; defaulting to skip with a logged warning is safest for Phase 1; questions table can be added in Phase 3.

2. **Merck Project Seeding Strategy**
   - What we know: Merck has no YAML frontmatter. The doc is valuable context about the engagement but is not machine-parseable for structured data.
   - What's unclear: Should the migration script create a stub Merck project from hardcoded values, or should the planner add a manual seed task for Merck?
   - Recommendation: Create a stub project record with `customer = 'Merck'` and `source_file = 'MERCK_Project_Context_2026-03-16 copy.md'`; log a clear message that Merck data requires manual population. Do not leave Merck out of the DB entirely — later phases expect 3 projects.

3. **RLS for Cross-Project Dashboard Queries**
   - What we know: RLS blocks cross-project queries unless bypassed. Phase 2 dashboard needs health cards for ALL active projects.
   - What's unclear: Whether to set BYPASSRLS on the single app DB role, or maintain two roles (per-project vs cross-project).
   - Recommendation: Single local app; use one DB user with BYPASSRLS for now. Add role separation in Phase 8 when multi-account features are complete.

4. **Action ID Gap Tolerance in Cowork Skills**
   - What we know: PostgreSQL serial sequences create gaps on rollback. Existing action IDs in source docs skip numbers (A-KAISER-001, A-KAISER-003, etc. — A-KAISER-002 is not in the xlsx meaning it was completed/archived).
   - What's unclear: Whether Cowork SKILL.md files check for sequential IDs or tolerate gaps.
   - Recommendation: Preserve `external_id` exactly from source. Do not renumber on export. Gaps already exist in source data.

---

## Validation Architecture

`workflow.nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (already used in server/ as `node --test`) |
| Config file | None — use `--test` flag directly |
| Quick run command | `npx tsx --test scripts/tests/phase1.test.ts` |
| Full suite command | `npx tsx --test scripts/tests/*.test.ts` |

Note: The existing server uses Node's built-in test runner (`node --test --test-reporter spec`). Use the same pattern for migration tests. Do not introduce Jest for Phase 1 (Jest is already a dev dep in server/ but the new Next.js project should use Node built-in or Vitest).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| DATA-01 | All domain tables exist with correct columns | unit/smoke | `node --test tests/schema.test.ts` | Query `information_schema.tables` for each table name |
| DATA-02 | UPDATE on `engagement_history` raises PostgreSQL exception | integration | `node --test tests/append-only.test.ts` | Attempt UPDATE via db, assert thrown error message |
| DATA-02 | DELETE on `key_decisions` raises PostgreSQL exception | integration | same file | Attempt DELETE, assert thrown error |
| DATA-03 | KAISER + AMEX projects importable from YAML, queryable | integration | `node --test tests/migration.test.ts` | Run migration against test DB, query projects table |
| DATA-03 | Source tracing preserved (source_file column populated) | integration | same file | Assert `source_file` is not null |
| DATA-04 | xlsx open actions imported (YAML wins on conflicts) | integration | same file | Import xlsx after YAML, assert no duplicate external_id |
| DATA-04 | 5 sheets processed — Open Actions, Risks, Workstream Notes, Completed, Questions | integration | same file | Assert each sheet produces correct table rows |
| DATA-05 | Round-trip: export → parse → compare to source | unit | `node --test tests/yaml-roundtrip.test.ts` | Export known project, re-parse, diff against original |
| DATA-05 | All REQUIRED_TOP_LEVEL_KEYS present in export | unit | same file | Assert keys present even when arrays are empty |
| DATA-06 | Querying project A returns 0 rows from project B | integration | `node --test tests/rls.test.ts` | Seed two projects, query with project A id, assert no B rows |
| DATA-07 | Creating output row sets status = 'running' | unit | `node --test tests/outputs.test.ts` | Insert, immediately read back, assert status |
| DATA-07 | Idempotency_key unique constraint enforced | unit | same file | Insert twice with same key, assert constraint error |
| DATA-08 | Same connection instance across multiple calls | unit | `node --test tests/pool.test.ts` | Import db twice, assert same object reference |
| SET-01 | Workspace path reads default when no settings file exists | unit | `node --test tests/settings.test.ts` | Delete settings file, read, assert default path |
| SET-01 | Workspace path written and read back correctly | unit | same file | Write custom path, read back, assert match |
| SET-04 | API key NOT written to settings.json | unit | same file | Write settings with API key context, read JSON, assert no key field |

### Sampling Rate
- **Per task commit:** `node --test tests/schema.test.ts tests/append-only.test.ts`
- **Per wave merge:** `node --test tests/*.test.ts`
- **Phase gate:** Full suite green before moving to Phase 2

### Wave 0 Gaps (Files to Create Before Implementation)

- [ ] `tests/schema.test.ts` — table existence checks (DATA-01)
- [ ] `tests/append-only.test.ts` — trigger enforcement (DATA-02)
- [ ] `tests/migration.test.ts` — YAML + xlsx import (DATA-03, DATA-04)
- [ ] `tests/yaml-roundtrip.test.ts` — export round-trip (DATA-05)
- [ ] `tests/rls.test.ts` — cross-project isolation (DATA-06)
- [ ] `tests/outputs.test.ts` — outputs table status and idempotency (DATA-07)
- [ ] `tests/pool.test.ts` — singleton pool (DATA-08)
- [ ] `tests/settings.test.ts` — settings read/write (SET-01 through SET-04)
- [ ] `tests/fixtures/` — test DB seed data (two projects, sample actions, risks)

Framework install (if not already present in new Next.js project):
```bash
# Node built-in test runner — no install needed
# For TypeScript: tsx is needed
npm install -D tsx
```

### Success Criterion Validation Map

| Success Criterion | How to Validate |
|-------------------|----------------|
| 1. All 3 context docs importable via script | Run `npx tsx scripts/migrate-local.ts` against test DB; `SELECT count(*) FROM projects` returns 3 |
| 2. Round-trip test passes | `tests/yaml-roundtrip.test.ts` exports a project, re-parses with `JSON_SCHEMA`, diffs against expected structure |
| 3. UPDATE/DELETE on history raises PostgreSQL exception | `tests/append-only.test.ts` catches the exception and asserts message contains 'append-only' |
| 4. Two active projects never cross-contaminate | `tests/rls.test.ts` seeds project A and B, queries with A's project_id, asserts 0 rows from B |
| 5. Settings UI reads/writes without code changes | Manual test: change workspace_path via Settings UI, read `~/.bigpanda-app/settings.json`, assert new value |

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `/Documents/PM Application/PA3_Action_Tracker copy.xlsx` — 5 sheets, column headers, data format
- Direct inspection of `/Documents/PM Application/KAISER_Project_Context_2026-03-18 copy.md` — YAML frontmatter structure
- Direct inspection of `/Documents/PM Application/AMEX_Project_Context_2026-03-17 copy.md` — YAML frontmatter structure
- Direct inspection of `/Documents/PM Application/MERCK_Project_Context_2026-03-16 copy.md` — confirmed NO YAML frontmatter
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/services/yamlService.js` — proven YAML settings and patterns
- `npm view drizzle-orm version` → 0.45.1 (verified 2026-03-18)
- `npm view postgres version` → 3.4.8 (verified 2026-03-18)
- `npm view drizzle-kit version` → 0.31.10 (verified 2026-03-18)
- `.planning/config.json` — nyquist_validation: true confirmed

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` — Drizzle/postgres architecture rationale (HIGH); version estimates superseded by npm view
- `.planning/research/PITFALLS.md` — RLS, append-only trigger, connection pool pitfalls (HIGH)
- PostgreSQL documentation — RLS, trigger syntax, advisory locks (training knowledge through Aug 2025)
- Drizzle ORM documentation — schema patterns, drizzle-kit CLI (training knowledge)

### Tertiary (LOW confidence)
- ExcelJS version — needs `npm view exceljs version` before pinning
- Settings `~/.bigpanda-app/settings.json` path — Claude's discretion per CONTEXT.md; alternative is `.env.local` only

---

## Metadata

**Confidence breakdown:**
- xlsx sheet structure: HIGH — directly inspected actual file
- YAML source doc structure: HIGH — directly inspected all three files; Merck finding is critical
- Drizzle ORM versions: HIGH — npm view verified live
- PostgreSQL RLS pattern: HIGH — well-documented, no breaking changes since PG 10
- Append-only trigger syntax: HIGH — standard PostgreSQL DDL
- Settings approach: MEDIUM — Claude's discretion per CONTEXT.md; recommendation is reasonable but alternatives exist
- ExcelJS version: MEDIUM — library choice HIGH, version needs verification

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (standard — stable patterns)

**Critical open finding for planner:** The xlsx has 5 sheets including an "Open Questions" sheet (Q-NNN IDs) not mentioned in REQUIREMENTS.md. The planner must decide whether to create a questions table, import questions as a subtype of actions, or skip. This decision affects the schema.
