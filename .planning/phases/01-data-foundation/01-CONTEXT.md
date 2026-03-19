# Phase 1: Data Foundation - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the PostgreSQL database with all domain tables, enforced data integrity rules (RLS, append-only triggers), a singleton connection pool, a YAML export utility that is round-trip safe with Cowork skills, seed data imported from existing project context docs and PA3_Action_Tracker.xlsx, and a persisted Settings config. No UI in this phase — Next.js app shell and read surface are Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Migration source
- Read from local files on disk — no Google Drive API needed in Phase 1
- Source path: `/Documents/PM Application/` (user-specified; not ~/Documents/BigPanda Projects/)
- Migration script reads YAML context docs and PA3_Action_Tracker.xlsx from this directory
- Script is idempotent: re-running is safe — existing records (matched by project name/ID) are skipped
- YAML project context docs are the authoritative source; xlsx supplements
- PA3_Action_Tracker.xlsx has MORE than 2 sheets — researcher must inspect the actual sheet structure before assuming column/sheet layout
- Import workflow: import all records from YAML first, then scan xlsx for any action IDs not already in the DB and import those as additional records; YAML wins on field conflicts

### Claude's Discretion
- Schema file organization (single schema.ts vs. per-table files)
- Drizzle migration file naming and structure
- Connection pool configuration values (pool size, idle timeout)
- Settings persistence format (JSON config file, .env.local, or similar — as long as API key is NOT in a committed file)
- Exact DB trigger syntax for append-only enforcement
- RLS policy implementation details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/services/yamlService.js`: Proven YAML serialization/deserialization with exact settings (`sortKeys: false`, `lineWidth: -1`, `noRefs: true`, `JSON_SCHEMA`). The new Drizzle DataService YAML export must replicate this exactly — do not change these settings.
- `scripts/migrateYaml.js`: Existing migration script (reads from Drive — NOT reusable, but shows the YAML parse/serialize pattern and the expected top-level key structure)
- `server/services/yamlService.js` `REQUIRED_TOP_LEVEL_KEYS`: `['customer', 'project', 'status', 'workstreams', 'actions', 'risks', 'milestones', 'artifacts', 'history']` — these keys must be present in all exported YAML docs

### Established Patterns
- `ValidationError` class in yamlService: Custom error with `statusCode` — pattern to carry forward for DataService errors
- ID conventions from PROJECT.md: `A-[CUSTOMER]-NNN` (actions), `R-[CUSTOMER]-NNN` (risks), `M-[CUSTOMER]-NNN` (milestones) — must be preserved exactly during migration
- Append-only fields: `history` (engagement history) and key decisions — DB trigger must reject UPDATE and DELETE at the PostgreSQL level, not just application layer

### Integration Points
- Phase 1 delivers the DataService that ALL subsequent phases depend on
- Settings config written in Phase 1 is read by Phase 2+ for workspace path and skill file location
- YAML export output from Phase 1 is consumed by existing Cowork skills — byte-for-byte fidelity is a hard constraint

</code_context>

<specifics>
## Specific Ideas

- Migration source path is `/Documents/PM Application/` — not the default `~/Documents/BigPanda Projects/` mentioned in SET-01. Settings should default to this path.
- PA3_Action_Tracker.xlsx sheet structure is unknown until inspected — researcher must open the file and document all sheet names and column layouts before planning the xlsx import logic

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-data-foundation*
*Context gathered: 2026-03-18*
