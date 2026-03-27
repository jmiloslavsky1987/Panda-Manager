# Phase 22: Source Badges + Audit Log - Research

**Researched:** 2026-03-27
**Domain:** Data provenance UI (source badges), API-layer audit logging, deletion confirmation dialogs
**Confidence:** HIGH

## Summary

Phase 22 is a cross-cutting instrumentation phase: it adds visual provenance badges to every workspace record, wraps every data-mutation API route with audit log writes, and gates all deletions behind a confirmation dialog. The work is pure augmentation — no new tables, no new pages, no new entity types. Every prerequisite (the `audit_log` table, the `source` column on every entity table, and the `source_artifact_id`/`ingested_at` attribution columns) is already in the DB from Phase 17.

Source attribution data is already being written by Phases 18 and 19: ingestion sets `source = 'ingestion'` + `source_artifact_id`, discovery approval sets `source = 'discovery'`, and manual creates set `source = 'manual'`. Phase 22 only needs to *surface* that data (badges) and *record* mutations (audit log). There is no schema migration required — this phase is entirely application-layer work.

The most complex piece is the audit log instrumentation: every PATCH/POST/DELETE API route must read the before-state, perform the mutation, then write an `audit_log` row — ideally inside a transaction. A shared `writeAuditLog` helper in `lib/audit.ts` will avoid copy-paste across the 15+ affected routes.

**Primary recommendation:** Build a `lib/audit.ts` helper first (Wave 0 test, Wave 1 implementation), then add the `SourceBadge` component, then wire audit writes into all API routes one entity at a time, then add delete confirmation dialogs in the UI.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIT-01 | All workspace tab records display a source badge: "Manual", "Ingested — [filename]", or "Discovered — [source tool]" | Every entity table has `source`, `source_artifact_id`, and `ingested_at` columns — badge rendering is a pure read from existing data. The `artifacts` table holds the filename for Ingested. The `discovery_items` table holds the source tool name for Discovered. |
| AUDIT-02 | All data modifications (create, update, delete) are written to `audit_log` with actor, timestamp, entity, and before/after JSON | `audit_log` table exists with exactly these columns. Every mutation route must be instrumented. A shared helper eliminates duplication. |
| AUDIT-03 | Deletion of any workspace record requires a confirmation dialog and is always logged to `audit_log` | Existing delete paths are bare `db.delete()` calls with no UI guard. The confirmation dialog must be added in client components. Logging must happen server-side in the DELETE route after the confirmation reaches the API. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui `Badge` | Already installed | Source badge rendering | Already in project at `components/ui/badge.tsx`; supports `className` override for color variants |
| shadcn/ui `Dialog` | Already installed | Confirmation dialog | Already in project at `components/ui/dialog.tsx`; used by all edit modals — reuse exact same pattern |
| Drizzle ORM | Already installed | Audit log inserts | All DB access in this project uses Drizzle |
| `@/db/schema` `auditLog` | Already exported | audit_log table | Exported from schema.ts at line 469 — no schema changes needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-orm` `sql` + `db.transaction()` | Already installed | Atomic before-fetch + mutation + audit write | Use for every audit-instrumented route to guarantee audit log entry is never written without the mutation and vice versa |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Explicit before-fetch in each route | PostgreSQL trigger on every entity table | Trigger approach is powerful but hard to capture actor_id and before/after JSON correctly from app context; app-layer audit is simpler to maintain and debug |
| Custom confirmation component | shadcn/ui AlertDialog (separate primitive) | AlertDialog primitive (`@radix-ui/react-alert-dialog`) is not installed. Use the existing `Dialog` from `@radix-ui/react-dialog` which IS installed — same UX, zero new deps. |

**No new packages needed.** Everything required is already installed.

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── lib/
│   └── audit.ts                  # NEW: writeAuditLog() helper
├── components/
│   └── SourceBadge.tsx           # NEW: shared badge component
├── app/api/
│   ├── actions/[id]/route.ts     # MODIFY: add audit to PATCH
│   ├── risks/[id]/route.ts       # MODIFY: add audit to PATCH
│   ├── milestones/[id]/route.ts  # MODIFY: add audit to PATCH
│   ├── stakeholders/[id]/route.ts# MODIFY: add audit to PATCH
│   ├── artifacts/[id]/route.ts   # MODIFY: add audit to PATCH
│   └── projects/[projectId]/
│       ├── business-outcomes/[id]/route.ts     # MODIFY: PATCH + DELETE audit
│       ├── focus-areas/[id]/route.ts           # MODIFY: PATCH + DELETE audit
│       ├── architecture-integrations/[id]/route.ts # MODIFY: PATCH + DELETE audit
│       ├── e2e-workflows/[workflowId]/route.ts # MODIFY: PATCH + DELETE audit
│       ├── e2e-workflows/[workflowId]/steps/[stepId]/route.ts # MODIFY: PATCH + DELETE audit
│       └── team-onboarding-status/[id]/route.ts # MODIFY: PATCH audit
└── tests/
    └── audit/
        ├── audit-helper.test.ts  # NEW: unit tests for writeAuditLog()
        └── source-badge.test.ts  # NEW: unit tests for badge rendering logic
```

### Pattern 1: Shared Audit Helper
**What:** A single `writeAuditLog()` function in `lib/audit.ts` that accepts entity metadata and inserts into `audit_log`.
**When to use:** Called inside every PATCH/POST/DELETE route that mutates workspace records.
**Example:**
```typescript
// lib/audit.ts
import { db } from '@/db';
import { auditLog } from '@/db/schema';

export async function writeAuditLog(params: {
  entityType: string;
  entityId: number | null;
  action: 'create' | 'update' | 'delete';
  actorId: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
}): Promise<void> {
  await db.insert(auditLog).values({
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: params.action,
    actor_id: params.actorId,
    before_json: params.beforeJson ?? null,
    after_json: params.afterJson ?? null,
  });
}
```

### Pattern 2: API Route Instrumentation (PATCH)
**What:** Read before-state, perform mutation, write audit log — all inside a transaction.
**When to use:** Every PATCH route that mutates a workspace record.
**Example:**
```typescript
// Instrumented PATCH for risks/[id]/route.ts pattern
export async function PATCH(req, { params }) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  // 1. Read before-state
  const [before] = await db.select().from(risks).where(eq(risks.id, numericId));
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // 2. Parse and apply patch
  const patch = patchSchema.parse(await req.json());

  // 3. Mutate + audit inside transaction
  await db.transaction(async (tx) => {
    await tx.update(risks).set(patch).where(eq(risks.id, numericId));
    await tx.insert(auditLog).values({
      entity_type: 'risk',
      entity_id: numericId,
      action: 'update',
      actor_id: 'default',
      before_json: before,
      after_json: { ...before, ...patch },
    });
  });

  return Response.json({ ok: true });
}
```

### Pattern 3: Delete Confirmation Dialog
**What:** Client component wraps delete button in a Dialog asking for explicit confirmation. On confirm, calls DELETE API. API logs before deleting.
**When to use:** Every delete action across all workspace tabs.
**Example:**
```typescript
// DeleteConfirmDialog.tsx — reusable wrapper
'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

interface DeleteConfirmDialogProps {
  entityLabel: string;        // "this action" / "this risk" etc.
  onConfirm: () => Promise<void>;
  trigger: React.ReactNode;
}

export function DeleteConfirmDialog({ entityLabel, onConfirm, trigger }: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    await onConfirm();
    setOpen(false);
    setDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {entityLabel}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">This cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 4: SourceBadge Component
**What:** Reads `source`, `source_artifact_id`, and the joined artifact `name` (or discovery source) to render the right badge.
**When to use:** Rendered inline in every tab's row/card for each entity record.
**Example:**
```typescript
// components/SourceBadge.tsx
import { Badge } from './ui/badge';

interface SourceBadgeProps {
  source: string;                 // 'manual' | 'ingestion' | 'discovery'
  artifactName?: string | null;   // filename for ingested records
  discoverySource?: string | null;// source tool for discovered records
}

export function SourceBadge({ source, artifactName, discoverySource }: SourceBadgeProps) {
  if (source === 'ingestion' && artifactName) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-normal">
        Ingested — {artifactName}
      </Badge>
    );
  }
  if (source === 'discovery' && discoverySource) {
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs font-normal">
        Discovered — {discoverySource}
      </Badge>
    );
  }
  // Default: manual
  return (
    <Badge variant="outline" className="text-xs font-normal text-gray-500">
      Manual
    </Badge>
  );
}
```

### Anti-Patterns to Avoid
- **Audit log outside transaction:** If the mutation succeeds but audit insert fails, you have an unlogged mutation. Always use `db.transaction()` to wrap both operations.
- **Capturing before-state after mutation:** The `.returning()` from Drizzle gives you the after-state. Read the before-state with a SELECT before the update/delete.
- **Fetching artifact name in the component:** Pass artifact name as a prop from the RSC that already fetched the record; avoid N+1 queries by joining at query time.
- **Using `window.confirm()` for delete confirmation:** The requirement says "confirmation dialog" — must be a proper Dialog component, not a browser confirm().
- **Logging discovery-approve or ingestion-approve routes through this audit mechanism:** Those flows are batch operations; AUDIT-02 targets individual workspace record mutations (create/edit/delete) triggered by the user in the workspace tabs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom modal from scratch | Existing `Dialog` from `components/ui/dialog.tsx` | Already installed, same Radix UI primitive, consistent with all edit modals in the project |
| Source badge | Inline conditional rendering scattered across 7 tabs | Single `SourceBadge` component | Centralizes the badge logic; easy to update text/color in one place |
| Audit log table | Any application-level log structure | Existing `audit_log` table from Phase 17 | Already in DB with the exact columns needed |
| Transaction utility | Custom wrapper | `db.transaction()` from Drizzle | Already used in focus-areas, business-outcomes, architecture-integrations, and e2e-workflows DELETE routes |

## Common Pitfalls

### Pitfall 1: Joining Artifact Name for Badges
**What goes wrong:** Rendering `source_artifact_id` in the badge without the filename creates a badge showing a meaningless DB integer.
**Why it happens:** The entity tables store `source_artifact_id` (FK to artifacts.id), not the artifact filename itself.
**How to avoid:** When fetching entities for tab rendering, LEFT JOIN to `artifacts` on `source_artifact_id` to get `artifacts.name`. For discovery records, the source tool name is stored in `discovery_items.source` (values like `'slack'`, `'gmail'`, `'gong'`, `'glean'`) — but this is not on the entity row itself. The entity's `source = 'discovery'` is the signal; the tool name must be tracked via `discovery_items` if needed, or simplified to just "Discovered" without tool specificity.
**Warning signs:** Badge displays a number, or shows "Discovered" without a tool name when tool name was expected.

### Pitfall 2: Missing Discovery Tool Name on Entity Rows
**What goes wrong:** Entities created via discovery approval (`app/api/discovery/approve/route.ts`) set `source = 'discovery'` but do NOT store which tool (Slack/Gmail/etc.) was the source on the entity row itself.
**Why it happens:** The `discovery_items` table has `source` (the tool), but when items are approved and written to entity tables, only `source = 'discovery'` is copied — the tool name is not propagated.
**How to avoid:** Two options: (a) accept "Discovered" as the badge label without tool specificity, or (b) add `discovery_source` TEXT column (e.g., `'Slack'`) to entity rows during approval. Option (a) is lower risk and matches what AUDIT-01 spec says: "Discovered — [source tool]" — but requires the tool name to be available. The planner must decide. Research recommends option (b) if the full badge text is required: a lightweight migration adding `discovery_source TEXT` to entity tables, populated during discovery approve.
**Warning signs:** Badge shows "Discovered — undefined" or "Discovered — null" in the UI.

### Pitfall 3: audit_log Has No RLS
**What goes wrong:** The `audit_log` table has no Row Level Security (confirmed in migration 0011). This is intentional (system-wide table). But the `db.insert(auditLog)` call in routes that use `SET LOCAL app.current_project_id` inside a transaction could theoretically fail if RLS is misconfigured.
**Why it happens:** Some routes run `SET LOCAL app.current_project_id` inside a transaction; `audit_log` inserts in the same transaction are fine because audit_log has no RLS policy.
**How to avoid:** No action needed — audit_log intentionally has no RLS. Just confirm the insert is inside the transaction scope.

### Pitfall 4: Actions Route Has Extra xlsx Complexity
**What goes wrong:** The actions PATCH route (`app/api/actions/[id]/route.ts`) does xlsx write FIRST, then DB write. Adding audit instrumentation naively could write the audit log before the xlsx succeeds, or not write it if xlsx throws.
**Why it happens:** The xlsx write is intentionally outside the DB transaction (it's a filesystem operation).
**How to avoid:** Preserve the existing order (xlsx first, then DB). Add the audit log write inside the DB transaction that follows the xlsx write — so if xlsx throws, no audit entry is written (matching the no-DB-write behavior).

### Pitfall 5: Append-Only Tables (engagement_history, key_decisions)
**What goes wrong:** These tables have DB-level UPDATE/DELETE prevention triggers. Trying to add audit log for delete events on these tables will never fire because deletes are blocked at DB level.
**Why it happens:** `enforce_append_only` trigger prevents UPDATE and DELETE on both tables. The UI already renders no edit/delete controls.
**How to avoid:** Do NOT add delete audit for `engagement_history` or `key_decisions`. Audit CREATE events only. The success criteria for AUDIT-02 covers "create, update, delete" — for these two tables only create applies.

### Pitfall 6: Scope Confusion — Which Records Need Badges
**What goes wrong:** Applying badges to ALL records in the system (outputs, drafts, job runs) instead of only workspace tab records.
**Why it happens:** The requirement says "all workspace tab records" — the 7 named tabs in the success criteria.
**How to avoid:** Scope badge work to exactly: Actions, Risks, Decisions, Milestones, Stakeholders, Engagement History, and Artifacts tabs. Also: Teams tab records (business_outcomes, focus_areas, e2e_workflows, workflow_steps) and Architecture tab records (architecture_integrations, before_state, team_onboarding_status) — these have `source` columns and were created in Phase 21 with inline edit.

## Code Examples

Verified patterns from existing codebase:

### Existing Transaction Pattern (from focus-areas DELETE route)
```typescript
// Source: bigpanda-app/app/api/projects/[projectId]/focus-areas/[id]/route.ts
await db.transaction(async (tx) => {
  await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericProjectId}`))
  await tx.delete(focusAreas)
    .where(and(eq(focusAreas.id, numericId), eq(focusAreas.project_id, numericProjectId)))
})
```

### Existing Source Attribution Pattern (from ingestion approve route)
```typescript
// Source: bigpanda-app/app/api/ingestion/approve/route.ts — attribution object
const attribution = {
  source: 'ingestion' as const,
  source_artifact_id: artifactId,
  ingested_at: new Date(),
};
// merged into insert values: { ...attribution, ...otherFields }
```

### Existing Discovery Source Attribution (from discovery approve route)
```typescript
// Source: bigpanda-app/app/api/discovery/approve/route.ts
const source = 'discovery' as const;
// used in entity table inserts — tool name NOT stored on entity row
```

### Existing Badge Component Pattern (from project)
```typescript
// Source: bigpanda-app/components/ui/badge.tsx
// badgeVariants supports: default | secondary | destructive | outline
// + className override for custom colors (already used in other components)
<Badge className="..." variant="outline">Text</Badge>
```

### Discovery Tool Name Resolution — Available Data
```
discovery_items.source   = 'slack' | 'gmail' | 'glean' | 'gong'
entity_tables.source     = 'discovery' (no tool name stored)
```
This gap means "Discovered — [source tool]" requires either:
- A join back to `discovery_items` by some linking field (no FK exists on entity rows), or
- Adding `discovery_source TEXT` to entity tables during the approve flow

## Full Entity Coverage Map

### Tabs named in AUDIT-01 success criteria with their API routes:

| Tab | Entity Table | API Routes to Instrument | Has DELETE? |
|-----|-------------|--------------------------|-------------|
| Actions | `actions` | PATCH `/api/actions/[id]` | No (no DELETE route exists) |
| Risks | `risks` | PATCH `/api/risks/[id]` | No |
| Milestones | `milestones` | PATCH `/api/milestones/[id]` | No |
| Stakeholders | `stakeholders` | PATCH `/api/stakeholders/[id]` | Yes (check route) |
| Decisions | `key_decisions` | POST `/api/decisions` | No (append-only — no delete) |
| Engagement History | `engagement_history` | POST `/api/notes` | No (append-only — no delete) |
| Artifacts | `artifacts` | PATCH `/api/artifacts/[id]` | Yes |
| Teams (Business Outcomes) | `business_outcomes` | PATCH + DELETE `/api/projects/[pid]/business-outcomes/[id]` | Yes |
| Teams (Focus Areas) | `focus_areas` | PATCH + DELETE `/api/projects/[pid]/focus-areas/[id]` | Yes |
| Teams (E2E Workflows) | `e2e_workflows` | PATCH + DELETE `/api/projects/[pid]/e2e-workflows/[wid]` | Yes |
| Teams (Workflow Steps) | `workflow_steps` | PATCH + DELETE `.../steps/[sid]` | Yes |
| Architecture (Integrations) | `architecture_integrations` | PATCH + DELETE `/api/projects/[pid]/architecture-integrations/[id]` | Yes |
| Architecture (Team Onboarding) | `team_onboarding_status` | PATCH `/api/projects/[pid]/team-onboarding-status/[id]` | Check route |

**Note on tasks:** Tasks tab is a workspace tab (Plan Builder) but was NOT named in the AUDIT-01 success criteria list. Include it for completeness.

### Routes already having DELETE (confirmed from code inspection):
- `focus-areas/[id]` — DELETE confirmed
- `business-outcomes/[id]` — DELETE confirmed
- `architecture-integrations/[id]` — DELETE confirmed
- `e2e-workflows/[workflowId]/steps/[stepId]` — DELETE confirmed
- `e2e-workflows/[workflowId]` — needs confirmation
- `artifacts/[id]` — needs confirmation (route exists, check for DELETE handler)

### Routes with only PATCH (no DELETE route):
- `actions/[id]` — PATCH only (no delete functionality exists for actions)
- `risks/[id]` — PATCH only
- `milestones/[id]` — PATCH only
- `stakeholders/[id]` — check for DELETE handler
- `milestones/[id]` — PATCH only

For routes with no DELETE handler: add audit log for PATCH/POST only. AUDIT-03 requires confirmation dialogs only where deletion exists.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `window.confirm()` for destructive actions | Radix UI Dialog component | Phase 2 established shadcn/ui baseline | Consistent with all modals; no browser-native dialogs |
| Ad-hoc mutation in route handlers | Drizzle `db.transaction()` in Phase 21 routes | Phase 21 | Established pattern for atomic multi-operation DB writes |
| No source attribution | `source` + `source_artifact_id` + `ingested_at` columns on all entity tables | Phase 17/18 | Source data is already in DB — Phase 22 only surfaces it |

## Open Questions

1. **Discovery tool name on entity rows**
   - What we know: Entity tables store `source = 'discovery'` but not which tool (Slack/Gmail/etc.)
   - What's unclear: Does AUDIT-01 require "Discovered — Slack" specifically, or is "Discovered" sufficient?
   - Recommendation: If the full badge text "Discovered — [source tool]" is required, the planner should include a task to add `discovery_source TEXT` column (nullable) to entity tables and populate it during discovery approval. Migration 0017. Otherwise, simplify badge to "Discovered" and note the limitation.

2. **Scope of AUDIT-02 for create operations**
   - What we know: Create operations on most entities go through various POST routes; the ingestion approve route creates records in bulk
   - What's unclear: Should bulk-creates via ingestion/discovery approve also generate audit log rows per created entity?
   - Recommendation: No — the ingestion approve route already logs via `ingestion_log_json` on the artifact. Audit AUDIT-02 for individual user-initiated creates only (user clicks "Add Action", "Add Risk", etc. from the workspace tabs).

3. **actor_id value in single-user app**
   - What we know: The app is single-user; no auth exists (deferred to v2.1)
   - What's unclear: What to store in `actor_id` for audit log rows
   - Recommendation: Use the string `'default'` as actor_id — matches the pattern in `user_source_tokens` where `user_id` defaults to `'default'`. This is forward-compatible with future multi-user auth.

## Validation Architecture

`nyquist_validation` is enabled. Including validation section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts at `bigpanda-app/vitest.config.ts`) |
| Config file | `bigpanda-app/vitest.config.ts` — `server-only` mock configured |
| Quick run command | `cd bigpanda-app && npx vitest run tests/audit/` |
| Full suite command | `cd bigpanda-app && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIT-01 | SourceBadge renders "Manual" for source=manual | unit | `cd bigpanda-app && npx vitest run tests/audit/source-badge.test.ts` | Wave 0 |
| AUDIT-01 | SourceBadge renders "Ingested — filename" for source=ingestion | unit | `cd bigpanda-app && npx vitest run tests/audit/source-badge.test.ts` | Wave 0 |
| AUDIT-01 | SourceBadge renders "Discovered — tool" for source=discovery | unit | `cd bigpanda-app && npx vitest run tests/audit/source-badge.test.ts` | Wave 0 |
| AUDIT-02 | writeAuditLog() inserts correct entity_type, entity_id, action, actor_id, before_json, after_json | unit | `cd bigpanda-app && npx vitest run tests/audit/audit-helper.test.ts` | Wave 0 |
| AUDIT-02 | PATCH route writes audit log row alongside mutation | integration | `cd bigpanda-app && npx vitest run tests/audit/audit-helper.test.ts` | Wave 0 |
| AUDIT-03 | DELETE route writes audit log before removal | unit | `cd bigpanda-app && npx vitest run tests/audit/audit-helper.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/audit/`
- **Per wave merge:** `cd bigpanda-app && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `bigpanda-app/tests/audit/audit-helper.test.ts` — unit tests for `writeAuditLog()` helper and route instrumentation contracts
- [ ] `bigpanda-app/tests/audit/source-badge.test.ts` — unit tests for badge label derivation logic (source + artifact name + discovery source)

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `bigpanda-app/db/schema.ts` lines 469-478 (auditLog table definition)
- Direct codebase inspection — `bigpanda-app/db/migrations/0012_ingestion_source_attribution.sql` (source_artifact_id + ingested_at on all entity tables)
- Direct codebase inspection — `bigpanda-app/app/api/ingestion/approve/route.ts` (ingestion source attribution pattern)
- Direct codebase inspection — `bigpanda-app/app/api/discovery/approve/route.ts` (discovery source attribution — tool name gap)
- Direct codebase inspection — `bigpanda-app/app/api/projects/[projectId]/focus-areas/[id]/route.ts` (existing DELETE + transaction pattern)
- Direct codebase inspection — `bigpanda-app/components/ui/dialog.tsx` and `badge.tsx` (existing UI primitives)
- `.planning/REQUIREMENTS.md` lines 117-120 (AUDIT-01, AUDIT-02, AUDIT-03 definitions)

### Secondary (MEDIUM confidence)
- Phase 17 STATE.md decision log — confirmed audit_log is system-wide (no RLS intentional)
- Phase 21 route patterns — confirmed `db.transaction()` + `SET LOCAL` as the project's established multi-op DB pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all required libraries already installed and verified in codebase
- Architecture: HIGH — patterns derived directly from existing routes and components
- Pitfalls: HIGH — discovered tool name gap confirmed by reading discovery approve route; append-only constraint confirmed by schema comments and migration
- Entity coverage map: MEDIUM — most DELETE route existence confirmed by code inspection; a few marked "check route" need verification at plan time

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable domain — no fast-moving external libraries involved)
