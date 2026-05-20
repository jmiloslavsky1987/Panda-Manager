---
phase: 87-incident-prevention-track-support
plan: 05
subsystem: api
tags: [next-route, drizzle, zod, settings, active_tracks, retroactive-seeding, incident-prevention, jsonb-pitfall, react-form]

# Dependency graph
requires:
  - phase: 87-01
    provides: "active_tracks JSONB widened to {adr, biggy, incident_prevention} so the route's Zod schema + DB column shape match"
  - phase: 87-04
    provides: "seedIncidentPreventionForProject(tx, projectId) — the idempotent helper this route calls inside its db.transaction when the IP flag flips false->true"
provides:
  - "PATCH /api/projects/[projectId]/settings active_tracks contract — Zod schema now requires {adr, biggy, incident_prevention} as a closed 3-key shape; outer .optional() allows name-only renames"
  - "Retroactive Incident Prevention seeding path — when active_tracks.incident_prevention flips false->true, route calls seedIncidentPreventionForProject(tx, projectId) inside the same db.transaction as the project update"
  - "components/ProjectSettingsForm.tsx — third checkbox 'Incident Prevention' in order ADR -> Biggy -> Incident Prevention; PATCH body always sends complete 3-key active_tracks object (Pitfall 2 closed)"
  - "Transaction safety on settings PATCH — project update + retroactive seed are now atomic; a seeder failure mid-flight rolls back the active_tracks flip"
affects: [87-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Closed-shape Zod object inside .optional() — `z.object({...all 3 keys required}).optional()` forces clients to send complete payloads while still allowing the field to be omitted entirely (e.g., for name-only renames). Mitigates JSONB merge pitfall at the request layer."
    - "Read-then-diff-then-update inside db.transaction — SELECT current value first, compute false->true flips, run UPDATE + conditional seed inside one tx. Atomic + observable."
    - "Helper-then-route reuse: route imports seedIncidentPreventionForProject (created in 87-04) and passes the transaction handle through — zero new seeding logic in the route, single source of truth for IP seed surface."

key-files:
  created: []
  modified:
    - app/api/projects/[projectId]/settings/route.ts
    - components/ProjectSettingsForm.tsx

key-decisions:
  - "Zod active_tracks made closed-3-key (not partial / .optional() per key) — forces UI to always send complete payload; matches RESEARCH.md Pitfall 2 mitigation strategy exactly"
  - "ADR/Biggy retroactive false->true seeding deferred — out of scope for Plan 87-05; only Incident Prevention is wired (per `flippedOnIP` boolean). ADR/Biggy are opt-in at project create (Plan 87-04 wizard); retroactive enable would require additional helper extractions"
  - "404 handling promoted to pre-transaction check — SELECT current.active_tracks doubles as a project-existence check; if missing, return 404 before opening the transaction"
  - "IP-09 (idempotency on double-toggle) GREEN via 87-04 helper's existing guards — no new logic in the route; route just calls the helper, helper's onConflictDoNothing + select-then-insert handle double-toggle correctly"

patterns-established:
  - "Settings PATCH retroactive-seed pattern: read current JSONB column -> Zod-parse patch -> diff for false->true flips -> wrap update + conditional seeder calls inside db.transaction. Reusable for any future track that joins ADR/Biggy/IP."
  - "Form-side complete-payload guarantee: always serialize all known keys of a JSONB field even when only one toggle changed. Single-line cost; eliminates a whole class of silent-data-loss bugs."

requirements-completed: [IP-08, IP-09]

# Metrics
duration: 2 min
completed: 2026-05-20
---

# Phase 87 Plan 05: Settings PATCH Retroactive Seeding Summary

**Settings PATCH widens active_tracks Zod schema, diffs current vs. patch, and wraps project update + seedIncidentPreventionForProject(tx) in a single db.transaction when IP flips false->true; ProjectSettingsForm gains third checkbox and always sends a complete 3-key active_tracks payload**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-20T02:44:09Z
- **Completed:** 2026-05-20T02:46:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Settings PATCH route (`app/api/projects/[projectId]/settings/route.ts`) refactored from "name/desc/2-key-tracks update with no transaction" to "name/desc/3-key-tracks update + conditional retroactive IP seed + db.transaction wrap". Auth gate (`requireProjectRole(projectId, 'admin')`) preserved verbatim; existing response shape unchanged.
- `components/ProjectSettingsForm.tsx` gains a third checkbox in the Active Tracks section (order: ADR -> Biggy -> Incident Prevention) and always serializes a complete 3-key `active_tracks` payload, closing the JSONB-merge gotcha (Pitfall 2 in 87-RESEARCH.md).
- IP-08 (3 sub-assertions: Zod schema accepts `incident_prevention`, route calls seeder helper with flip detection, update + seed wrapped in `db.transaction`) GREEN.
- IP-09 (helper idempotency contract: route triggers seeding via the 87-04 helper which uses `onConflictDoNothing` + select-then-insert across 8 entity classes; double-toggle false->true->false->true yields exactly one arch_track row) GREEN.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire retroactive IP seeding into PATCH /api/projects/[projectId]/settings** — `418ffb8d` (feat)
2. **Task 2: Add Incident Prevention checkbox + complete-payload guarantee in ProjectSettingsForm** — `292c18e7` (feat)

**Plan metadata commit (this SUMMARY + STATE + ROADMAP + REQUIREMENTS update):** committed via gsd-tools after this section.

## Files Created/Modified

- `app/api/projects/[projectId]/settings/route.ts` (MODIFIED, +55 / -3) — Imports `seedIncidentPreventionForProject` from `@/lib/seed-incident-prevention`; Zod `patchSchema.active_tracks` widened from `{adr, biggy}` to `{adr, biggy, incident_prevention}` (all required inside the object, outer `.optional()` retained); reads current `active_tracks` via SELECT before mutation; computes `flippedOnIP` (`!currentTracks.incident_prevention && patch.active_tracks?.incident_prevention`); wraps UPDATE + `if (flippedOnIP) seedIncidentPreventionForProject(tx, projectId)` in `db.transaction`. Preserves `requireProjectRole(projectId, 'admin')` and 404/400 error responses.
- `components/ProjectSettingsForm.tsx` (MODIFIED, +22 / -2) — New state `ipEnabled` initialized from `project.active_tracks.incident_prevention ?? false`; third `<label>` + `<input type="checkbox">` block rendered immediately after the Biggy checkbox (visual structure mirrors the existing two); `JSON.stringify` body construction expanded from `active_tracks: { adr, biggy }` to `active_tracks: { adr, biggy, incident_prevention }`; help text under IP checkbox notes "Enabling this track retroactively seeds the Incident Prevention arch, WBS, and onboarding rows."

## Exact diff applied to settings route

### Zod schema (BEFORE)
```typescript
const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  go_live_target: z.string().nullable().optional(),
  active_tracks: z.object({
    adr: z.boolean(),
    biggy: z.boolean(),
  }).optional(),
})
```

### Zod schema (AFTER)
```typescript
const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  go_live_target: z.string().nullable().optional(),
  active_tracks: z.object({
    adr: z.boolean(),
    biggy: z.boolean(),
    incident_prevention: z.boolean(),
  }).optional(),
})

type ActiveTracks = { adr: boolean; biggy: boolean; incident_prevention: boolean }
```

### Diff block + transaction wrap (NEW)
```typescript
// Read current active_tracks so we can diff and detect false->true flips.
const [current] = await db
  .select({ active_tracks: projects.active_tracks })
  .from(projects)
  .where(eq(projects.id, projectId))
  .limit(1)

if (!current) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

const currentTracks: ActiveTracks =
  (current.active_tracks as ActiveTracks | null) ?? {
    adr: false,
    biggy: false,
    incident_prevention: false,
  }

const flippedOnIP = Boolean(
  patch.active_tracks &&
    !currentTracks.incident_prevention &&
    patch.active_tracks.incident_prevention,
)

let updated: typeof projects.$inferSelect | undefined
await db.transaction(async (tx) => {
  const [u] = await tx.update(projects)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(projects.id, projectId))
    .returning()
  updated = u

  if (flippedOnIP) {
    await seedIncidentPreventionForProject(tx, projectId)
  }
})

if (!updated) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
return NextResponse.json({ ok: true, project: updated })
```

## Exact diff applied to ProjectSettingsForm

### New state variable
```typescript
const activeTracks = (project.active_tracks as { adr: boolean; biggy: boolean; incident_prevention?: boolean } | null)
  ?? { adr: true, biggy: true, incident_prevention: false }
const [adrEnabled, setAdrEnabled] = useState(activeTracks.adr)
const [biggyEnabled, setBiggyEnabled] = useState(activeTracks.biggy)
const [ipEnabled, setIpEnabled] = useState<boolean>(activeTracks.incident_prevention ?? false)
```

### Third checkbox (rendered immediately after Biggy)
```tsx
<label className="flex items-center gap-3">
  <input
    type="checkbox"
    checked={ipEnabled}
    onChange={(e) => setIpEnabled(e.target.checked)}
    disabled={!isAdmin}
    className="h-4 w-4 rounded border-zinc-300"
  />
  <span className="text-sm text-zinc-900">Incident Prevention</span>
</label>
<p className="text-xs text-zinc-500 ml-7">Enabling this track retroactively seeds the Incident Prevention arch, WBS, and onboarding rows. Disabling hides it from WBS, Gantt, and Overview for all project members.</p>
```

### PATCH body (always-complete payload)
```typescript
body: JSON.stringify({
  name: name.trim(),
  go_live_target: goLive.trim() || null,
  description: description.trim() || null,
  // Always send all three keys -- partial payloads would silently
  // drop other track flags via JSONB overwrite (Pitfall 2).
  active_tracks: {
    adr: adrEnabled,
    biggy: biggyEnabled,
    incident_prevention: ipEnabled,
  },
})
```

## Scope clarification: ADR/Biggy retroactive false->true symmetry

**Deferred** — Plan 87-05's verification gate (IP-08, IP-09) covers Incident Prevention only. Per CONTEXT.md, retroactive false->true seeding is intended "for that track only"; ADR/Biggy are typically opted-in at project creation via the BasicInfoStep wizard (Plan 87-04), and the helpers `seedADRForProject` / `seedBiggyForProject` were not extracted in 87-04 (only `seedIncidentPreventionForProject` was — single consumer until this plan needed it).

The route is structured to make symmetric extension trivial:

```typescript
// Currently:
const flippedOnIP = Boolean(patch.active_tracks && !currentTracks.incident_prevention && patch.active_tracks.incident_prevention)
if (flippedOnIP) await seedIncidentPreventionForProject(tx, projectId)

// Future plan can add:
const flippedOnADR = Boolean(patch.active_tracks && !currentTracks.adr && patch.active_tracks.adr)
if (flippedOnADR) await seedADRForProject(tx, projectId)
// ...and same for Biggy.
```

No code restructure needed — just add two more boolean diffs and two more helper calls inside the existing transaction block.

## Idempotency confirmation (IP-09)

**Double-toggle test (false->true->false->true) produces exactly one `arch_tracks` row** — confirmed via the 87-04 helper's own guards, **not** via additional logic in this route:

- `arch_tracks` — `select-then-insert` on `(project_id, name='Incident Prevention Track')`; second flip-on finds existing row, skips insert.
- `arch_nodes` — `onConflictDoNothing()` backed by `arch_nodes_project_track_name_idx` unique index on `(project_id, track_id, name)`; duplicate inserts silently succeed.
- `wbs_items`, `onboarding_phases`, `onboarding_steps`, `team_onboarding_status` — `select-then-insert` patterns scoped to natural keys; no duplicate rows.

Route's only contribution to idempotency is: **call the helper inside the same transaction as the UPDATE**. If the second flip-on fails partway through (e.g. DB lock), both the UPDATE rollback and the helper's no-op pattern leave the project in a consistent state.

## Decisions Made

- **Closed 3-key Zod shape** — `z.object({adr, biggy, incident_prevention}).optional()` (all three keys required INSIDE the object, outer optional). Forces the form to always send the complete payload (mitigating Pitfall 2 at the request layer), while still allowing partial PATCHes that omit `active_tracks` entirely (e.g., name-only renames).
- **Pre-transaction SELECT doubles as 404 check** — fetching `current.active_tracks` first means we can `if (!current) return 404` before opening the transaction. The post-update `if (!updated) return 404` is now a redundant safety net (since the UPDATE follows a successful SELECT), but kept for defense-in-depth.
- **`updated` captured via `let` outside the transaction callback** — Drizzle's `tx.update().returning()` returns the row inside the callback's scope; assigning to an outer `let` is the canonical pattern for surfacing results post-commit.
- **Did NOT add `flippedOnADR` / `flippedOnBiggy`** — out of scope for Plan 87-05 verification gate (see scope clarification above). Future symmetry is trivial; helpers would need extracting first.

## Deviations from Plan

None - plan executed exactly as written.

All grep verify gates passed on first run, all 4 tests in `tests/api/project-settings.test.ts` (IP-08 ×3 + IP-09 ×1) GREEN, TypeScript clean on both modified files. No deviations triggered Rules 1-4.

## Issues Encountered

None.

A previous executor session (parallel with Plan 87-04) returned a checkpoint because `lib/seed-incident-prevention.ts` hadn't existed at the time. That race is resolved — Plan 87-04 shipped the helper (commits `4d69d093` + `29e4e6b8`), and this executor session began with both the helper file and the 87-04 SUMMARY on disk. Plan 87-05 ran from scratch in this session with no carryover state.

## User Setup Required

None - no external service configuration required. The new active_tracks contract is self-contained; existing rows retain their `active_tracks` values verbatim (Plan 87-01's additive JSONB backfill made the `incident_prevention` key present on all rows). The closed 3-key Zod shape applies to incoming PATCH requests only; DB rows that pre-date Phase 87 already have all three keys.

## Next Phase Readiness

- **Plan 87-08** (human visual verification + Docker apply) can now exercise the full Phase 87 surface end-to-end: wizard creates IP-only project (87-04), Settings toggle creates IP retroactively (87-05), all dashboards render IP column (87-07), arch graph shows IP track (87-06). The remaining verification gate is human-in-browser confirmation.
- **All Phase 87 code plans are complete**: 87-01..04 + 06 + 07 + (now) 05. Only 87-08 (human verification) remains.
- **No blockers.** All test files for Phase 87 are GREEN in the IP-XX series (IP-01..16 covered by the upstream verify gates; IP-16 visual gate landed in 87-08 backlog).

## Self-Check

- **app/api/projects/[projectId]/settings/route.ts** — FOUND on disk, modified per plan (97 LOC after edit)
- **components/ProjectSettingsForm.tsx** — FOUND on disk, modified per plan (163 LOC after edit)
- **Commit 418ffb8d** — FOUND in `git log --oneline`
- **Commit 292c18e7** — FOUND in `git log --oneline`
- **IP-08 (×3 sub-assertions)** — GREEN
- **IP-09 (helper idempotency)** — GREEN
- **tests/api/project-settings.test.ts** — 4/4 passed
- **tests/api/projects.test.ts** — 5/5 passed (regression check)
- **TypeScript clean** — `npx tsc --noEmit` produces zero errors in either modified file (all other TS errors pre-existing, unrelated to Plan 87-05)

## Self-Check: PASSED

---
*Phase: 87-incident-prevention-track-support*
*Completed: 2026-05-20*
