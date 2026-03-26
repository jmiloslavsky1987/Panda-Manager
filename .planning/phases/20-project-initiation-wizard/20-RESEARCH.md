# Phase 20: Project Initiation Wizard - Research

**Researched:** 2026-03-26
**Domain:** Multi-step wizard UI, project creation API, Phase 18 ingestion integration, completeness scoring
**Confidence:** HIGH

## Summary

Phase 20 builds a full-screen Dialog wizard on top of highly reusable Phase 18 infrastructure. The primary work is orchestration — composing existing `IngestionModal`, `ExtractionPreview`, and entity API routes into a 5-step wizard flow — not rebuilding ingestion logic. The main novel work is: (1) the wizard container + step-progress UI, (2) a new `POST /api/projects` route with Draft status, (3) schema changes to add `draft` to the `project_status` enum plus `description`/`start_date`/`end_date` fields to the `projects` table, (4) the combined multi-file extraction orchestration, (5) the manual entry step, and (6) completeness score computation and display on the Overview tab.

The current `project_status` enum only has `'active' | 'archived' | 'closed'` — `'draft'` must be added via migration. The `projects` table also lacks `description`, `start_date`, and `end_date` columns that WIZ-02 requires. The `getDashboardData` query in `lib/queries.ts` filters to `status = 'active'` only; it must be updated to include `'draft'` projects so the draft appears in the Dashboard immediately after step 1.

The ingestion pipeline is well-factored: `IngestionModal` handles upload → SSE extraction → review for a single file. The wizard's multi-file combined preview requires running extraction per file sequentially (already done in `IngestionModal.extractFile`) but merging all `ReviewItem[]` arrays before showing `ExtractionPreview` — this pattern already exists in `IngestionModal` state (`reviewItems` accumulates across files). The wizard can embed this logic directly rather than mounting `IngestionModal` as a sub-component, since `IngestionModal` owns its own Dialog shell which would conflict with the wizard's outer Dialog.

**Primary recommendation:** Build the wizard as a new `ProjectWizard` Dialog component that directly embeds the upload/extraction/review logic from `IngestionModal` (copy the state machine, not the component), reuses `ExtractionPreview` and `IngestionStepper` as-is, and adds the 3 new outer wizard steps around the 2 ingestion steps.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full-screen Dialog modal (consistent with IngestionModal pattern — no dedicated route)
- Step order: 1-Basic Info → 2-Upload Collateral → 3-AI Preview → 4-Manual Entry → 5-Launch
- Step 1 (Basic Info) is the only required step; all others are skippable
- Step progress shown via stepper/breadcrumb within the Dialog header
- If user closes the wizard after step 1: project remains as Draft in Dashboard, wizard closes cleanly
- No wizard state persistence across sessions
- Project record + all empty tab data structures created immediately after step 1 completes
- Project status = "Draft" until user clicks "Launch Project" in step 5
- Collateral upload checklist: SOW, Kickoff Deck, Discovery Notes, Presales Notes, Customer Org Chart, Prior Tracker, Gong Transcripts, Architecture Diagram Notes, Budget Sheet
- Each checklist item has a checkbox that auto-checks when a matching file is uploaded
- Full drag-and-drop upload zone (any file accepted, not just listed types)
- Wizard embeds/reuses existing IngestionModal + IngestionStepper + ExtractionPreview components from Phase 18
- Steps 2 and 3 are the Phase 18 ingestion flow rendered within the wizard container
- Combined preview tabs: Actions, Risks, Milestones, Stakeholders, Decisions, Architecture, Teams, History, Business Outcomes — only tabs with extracted items shown
- Manual entry step: tab-per-entity-type layout; approved AI items shown as read-only rows with source label; "Add Row" per tab; only tabs with content show count badge
- NO time tracking config step in wizard — WIZ-06 intentionally out of scope
- Completeness score = (tabs with ≥1 record) / 9 × 100% — 9 tabs: Actions, Risks, Milestones, Stakeholders, Decisions, Architecture, Teams, Engagement History, Business Outcomes
- Score recalculated server-side on each Overview tab load
- Progress bar + percentage inline at top of Overview tab — always visible
- Below-60% yellow warning bar: non-dismissible, lists empty tab names as links, disappears when score ≥ 60%

### Claude's Discretion
- Exact stepper/breadcrumb visual design within the Dialog header
- Collateral checklist item matching logic (how file name maps to checklist category)
- Add Row form field set per entity type in the manual entry step
- Loading/progress indicators during extraction phase
- Empty state visuals within manual entry tabs

### Deferred Ideas (OUT OF SCOPE)
- WIZ-06 (time tracking config in wizard)
- Wizard state persistence across sessions
- Required vs optional collateral enforcement
- Real-time completeness score updates on entity writes
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WIZ-01 | Multi-step wizard accessible from Dashboard; replaces direct DB seed | Dashboard page.tsx needs "New Project" button; wizard mounts as Dialog client component |
| WIZ-02 | Step 1 captures: name, customer, status, start date, end date, description; creates Project and initializes all tab data structures | Requires schema migration: add `draft` to project_status enum; add `description`, `start_date`, `end_date` columns; new `POST /api/projects` route; "initialize tab structures" = project record only (all child tables FK to project_id, no stub rows needed) |
| WIZ-03 | Collateral checklist + ingestion pipeline per uploaded file | Reuse upload pattern from IngestionModal; checklist auto-check by filename fuzzy match |
| WIZ-04 | AI extraction preview grouped by tab across all uploaded documents; approve before write | ExtractionPreview component is a direct drop-in; all files' ReviewItem[] merged before showing |
| WIZ-05 | Manual addition of items via inline forms per tab | New ManualEntryStep component; entity form fields per tab; writes via existing entity API routes on step completion |
| WIZ-06 | Time tracking config — OUT OF SCOPE per CONTEXT.md | — |
| WIZ-07 | Launch step with completeness summary; clicking "Launch Project" sets status to Active | New step component; PATCH /api/projects/[projectId] to set status='active'; navigate to /customer/[id]/overview |
| WIZ-08 | Project Completeness Score (0–100%) based on tabs with ≥1 record | Server-side query: count 9 entity tables by project_id; no new table needed |
| WIZ-09 | Completeness score on Overview tab; <60% banner with specific empty tabs | Modify OnboardingDashboard component; add score API endpoint |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | Already installed | Server components, API routes | Project standard |
| React | Already installed | UI components | Project standard |
| Drizzle ORM | Already installed | DB queries, migrations | Project standard |
| Tailwind CSS | Already installed | Styling | Project standard |
| shadcn/ui Dialog | Already installed (`dialog.tsx`) | Full-screen modal container | Project standard — IngestionModal uses exact same pattern |
| shadcn/ui Tabs | Already installed (`tabs.tsx`) | Manual entry step entity tabs | Project standard — ExtractionPreview uses this |
| shadcn/ui Checkbox | Already installed (`checkbox.tsx`) | Collateral checklist | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Already installed | Step progress icons, status indicators | Consistent with existing IngestionStepper icons |
| TanStack Query v5 | Already installed | Client cache invalidation after project creation | Use `queryClient.invalidateQueries` on wizard close |

### No New Dependencies Required
All required UI primitives and data layer tools are already installed. This phase adds no new npm packages.

## Architecture Patterns

### Wizard Component Structure
```
bigpanda-app/
├── components/
│   ├── ProjectWizard.tsx              # Main wizard Dialog + step orchestration
│   ├── wizard/
│   │   ├── BasicInfoStep.tsx          # Step 1: project fields form
│   │   ├── CollateralUploadStep.tsx   # Step 2: checklist + drop zone
│   │   ├── AiPreviewStep.tsx          # Step 3: ExtractionPreview wrapper
│   │   ├── ManualEntryStep.tsx        # Step 4: tab-per-entity inline forms
│   │   └── LaunchStep.tsx             # Step 5: completeness summary + launch
├── app/
│   ├── api/
│   │   ├── projects/
│   │   │   └── route.ts               # NEW: POST to create project
│   │   └── projects/[projectId]/
│   │       ├── route.ts               # EXTEND: add PATCH for status update
│   │       └── completeness/
│   │           └── route.ts           # NEW: GET completeness score
│   ├── page.tsx                       # MODIFY: add "New Project" button + ProjectWizard
│   └── customer/[id]/overview/
│       └── page.tsx                   # MODIFY: pass completeness data to OnboardingDashboard
```

### Pattern 1: Wizard State Machine in ProjectWizard
**What:** Single parent component owns all step state; step components are pure/controlled
**When to use:** Multi-step flows where steps share data (projectId, reviewItems, manualItems)

```typescript
// ProjectWizard.tsx — central state
type WizardStep = 'basic-info' | 'upload' | 'ai-preview' | 'manual-entry' | 'launch'

interface WizardState {
  step: WizardStep
  projectId: number | null     // set after step 1 completes
  reviewItems: ReviewItem[]    // accumulated across all uploaded files
  manualItems: ManualItem[]    // added in step 4
  fileStatuses: FileStatus[]
  extractionStage: 'idle' | 'uploading' | 'extracting' | 'done'
}
```

### Pattern 2: Do NOT Mount IngestionModal as Sub-component
**What:** `IngestionModal` owns its own `Dialog` shell. Mounting it inside the wizard's `Dialog` would create nested dialogs — broken on most browsers/screen readers.
**Solution:** Copy the upload/SSE-extraction state machine logic from `IngestionModal` directly into `ProjectWizard`. Reuse `IngestionStepper` and `ExtractionPreview` as leaf components.

```typescript
// CollateralUploadStep receives handlers from ProjectWizard
interface CollateralUploadStepProps {
  projectId: number
  fileStatuses: FileStatus[]
  extractionStage: 'idle' | 'uploading' | 'extracting' | 'done'
  onFileDrop: (files: File[]) => void
  checklistState: Record<string, boolean>  // category -> checked
}
```

### Pattern 3: Schema Migration Required Before Implementation
**What:** `project_status` enum lacks `'draft'`; `projects` table lacks `description`, `start_date`, `end_date`
**Approach:** Drizzle migration in Wave 0 before any other code

```sql
-- Migration: add draft status and project fields
ALTER TYPE project_status ADD VALUE 'draft';
ALTER TABLE projects ADD COLUMN description text;
ALTER TABLE projects ADD COLUMN start_date text;
ALTER TABLE projects ADD COLUMN end_date text;
```

```typescript
// schema.ts update
export const projectStatusEnum = pgEnum('project_status', [
  'active', 'archived', 'closed', 'draft',  // ADD 'draft'
]);

export const projects = pgTable('projects', {
  // ... existing fields ...
  description: text('description'),
  start_date: text('start_date'),
  end_date: text('end_date'),
});
```

### Pattern 4: Dashboard Includes Draft Projects
**What:** `getDashboardData()` in `lib/queries.ts` filters `status = 'active'` — must include `'draft'`
**When:** Must update query before wizard step 1 runs, otherwise Draft project won't appear

```typescript
// lib/queries.ts — update filter
.where(inArray(projects.status, ['active', 'draft']))
// Or: .where(ne(projects.status, 'archived')) // exclude only archived/closed
```

### Pattern 5: "Initialize Tab Data Structures" = Project Row Only
**What:** WIZ-02 says "initialises all tab data structures in DB" — for this app this means the project row exists with a valid `id`. All child tables (actions, risks, milestones, etc.) use `project_id` FK and start empty. No stub rows needed.
**Confidence:** HIGH — confirmed by reviewing schema: all child tables reference `project_id`, no required rows beyond the project itself.

### Pattern 6: Completeness Score Computation
**What:** Server-side query counting 9 entity tables for ≥1 row per project_id

```typescript
// app/api/projects/[projectId]/completeness/route.ts
const SCORED_TABS = [
  { table: actions,                 label: 'Actions' },
  { table: risks,                   label: 'Risks' },
  { table: milestones,              label: 'Milestones' },
  { table: stakeholders,            label: 'Stakeholders' },
  { table: decisions,               label: 'Decisions' },
  { table: architectureIntegrations, label: 'Architecture' },
  { table: teamOnboardingStatus,    label: 'Teams' },
  { table: engagementHistory,       label: 'Engagement History' },
  { table: businessOutcomes,        label: 'Business Outcomes' },
] as const

// For each: SELECT 1 FROM {table} WHERE project_id=$1 LIMIT 1
// Count populated = SCORED_TABS.length - emptyTabs.length
// Score = (populated / 9) * 100
```

### Pattern 7: Manual Entry Step Data Flow
**What:** Step 4 shows approved AI items as read-only + allows adding new rows; both sets written to DB only on wizard close/advance past step 4
**Approach:** Accumulate manual items in wizard state; write all on "Continue to Launch" button via existing entity API routes

### Anti-Patterns to Avoid
- **Nested Dialogs:** Do NOT render `IngestionModal` inside `ProjectWizard` — both are Dialog components. Extract shared logic instead.
- **Writing manual items immediately on "Add Row":** Collect in local state, write in batch when leaving step 4 (avoids partial writes on wizard abandon).
- **Blocking step 1 completion on project record creation error:** Show inline error in step 1 form, do not navigate; let user retry.
- **Filtering out 'draft' from Dashboard query:** Omitting `draft` from `getDashboardData` would make the project invisible after step 1 completes.
- **PostgreSQL enum type mutation:** `ALTER TYPE ... ADD VALUE` cannot be rolled back inside a transaction; run migration carefully (Drizzle handles this).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload + validation | Custom upload handler | Existing `/api/ingestion/upload` route | Already handles multi-file, artifact record creation, size/type validation |
| SSE streaming extraction | New extract endpoint | Existing `/api/ingestion/extract` route | Already handles chunking, jsonrepair, conflict detection, source attribution |
| Extraction item review UI | New review component | `ExtractionPreview` + `ExtractionItemRow` | Already handles approve/reject/edit per item, tab grouping, bulk approve |
| File status sidebar | New file list UI | `IngestionStepper` | Already renders pending/extracting/done/error states |
| Conflict resolution modal | New diff UI | `DiffView` + existing conflict fields on `ReviewItem` | ExtractionPreview already handles conflict display |
| Approve-and-write | New write API | Existing `/api/ingestion/approve` route | Already handles source attribution, entity routing, log update |
| Tab component | New tab UI | `shadcn/ui Tabs` (`tabs.tsx`) | Project standard, already used by ExtractionPreview |

**Key insight:** This phase is 80% orchestration of Phase 18 infrastructure, not new building. The main novel pieces are the wizard container, schema migration, project creation API, completeness score API, and Overview tab modifications.

## Common Pitfalls

### Pitfall 1: `project_status` Enum Missing `draft`
**What goes wrong:** `db.insert(projects).values({ status: 'draft' })` throws a Postgres constraint error at runtime
**Why it happens:** The enum was defined without `draft` — adding it requires a DDL migration, not just a TypeScript change
**How to avoid:** Wave 0 must include the Drizzle migration; schema.ts `projectStatusEnum` must be updated in sync
**Warning signs:** TypeScript type error on `status: 'draft'` before running migration

### Pitfall 2: Dashboard Doesn't Show Draft Projects
**What goes wrong:** After wizard step 1 completes, user sees nothing in Dashboard — project was created but query filters it out
**Why it happens:** `getDashboardData()` queries `WHERE status = 'active'` — `'draft'` excluded
**How to avoid:** Update query to `inArray(projects.status, ['active', 'draft'])` as part of Wave 0 or Wave 1 work
**Warning signs:** Dashboard shows empty state after step 1 despite DB row existing

### Pitfall 3: Nested Dialog z-index / aria Conflicts
**What goes wrong:** Mounting `IngestionModal` inside `ProjectWizard` causes two `[role=dialog]` elements, broken focus trap, escape key closes inner Dialog only
**Why it happens:** `DialogContent` from Radix sets up a focus trap and portal; nesting two of these is unsupported
**How to avoid:** Never mount `IngestionModal` inside `ProjectWizard` — copy/inline the upload+extract state machine
**Warning signs:** Radix/shadcn logs warnings about nested dialog portals; escape key behavior unexpected

### Pitfall 4: Extraction Reviews Not Merged Across Files
**What goes wrong:** Step 3 shows only the last uploaded file's extraction, not all files combined
**Why it happens:** Each `extractFile()` call returns items — if state is reset between calls, prior file items are lost
**How to avoid:** Use `setReviewItems(prev => [...prev, ...newItems])` — accumulate, don't replace. (This is exactly how `IngestionModal` works — carry this forward.)
**Warning signs:** Step 3 preview tabs only show items from the most recently extracted file

### Pitfall 5: Manual Entry Items Not Written If User Skips Step 4
**What goes wrong:** Items added in step 4 are silently lost when user skips ahead
**Why it happens:** If write-on-exit is not handled for the skip case
**How to avoid:** On "Skip" from step 4, still write any accumulated `manualItems` if non-empty (or prompt user that unsaved items will be discarded)
**Warning signs:** User reports items added in step 4 not appearing in workspace tab

### Pitfall 6: `getDashboardData` Health Calculation Crashes on Draft Projects
**What goes wrong:** `getDashboardData` may compute health scores or other aggregations that assume an active project structure and crash/produce NaN for Draft projects
**Why it happens:** Draft projects have no child records; division-by-zero or null-dereference in health calculations
**How to avoid:** Check the health scoring logic in `getDashboardData` and guard for empty child record sets when draft is included
**Warning signs:** Dashboard throws during render when a draft project is present

### Pitfall 7: `project_status` TypeScript Type Out of Sync with DB Enum
**What goes wrong:** TypeScript allows `'draft'` after schema.ts update but Postgres rejects it until migration runs
**Why it happens:** Schema.ts is the source of truth for TypeScript — it's updated before the migration runs in dev
**How to avoid:** Always run `drizzle-kit generate` + migrate before testing the wizard; note this in Wave 0 plan

## Code Examples

Verified patterns from existing codebase:

### Project Record Creation (POST /api/projects)
```typescript
// Source: bigpanda-app/scripts/migrate-local.ts lines 331-343 (pattern reference)
// New route: bigpanda-app/app/api/projects/route.ts
import { db } from '@/db'
import { projects } from '@/db/schema'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const [inserted] = await db
    .insert(projects)
    .values({
      name: body.name,
      customer: body.customer,
      status: 'draft',
      description: body.description ?? null,
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
    })
    .returning({ id: projects.id })
  return NextResponse.json({ project: inserted })
}
```

### Update Project Status to Active (PATCH)
```typescript
// Extend bigpanda-app/app/api/projects/[projectId]/route.ts
import { eq } from 'drizzle-orm'

export async function PATCH(req, { params }) {
  const { projectId } = await params
  const body = await req.json()
  await db
    .update(projects)
    .set({ status: body.status, updated_at: new Date() })
    .where(eq(projects.id, parseInt(projectId, 10)))
  return NextResponse.json({ ok: true })
}
```

### Completeness Score Query
```typescript
// Source: schema.ts — entity tables all have project_id FK
// bigpanda-app/app/api/projects/[projectId]/completeness/route.ts
import { db } from '@/db'
import { actions, risks, milestones, stakeholders, decisions,
         architectureIntegrations, teamOnboardingStatus,
         engagementHistory, businessOutcomes } from '@/db/schema'
import { eq, count } from 'drizzle-orm'

const TABS = [
  { key: 'Actions',           table: actions },
  { key: 'Risks',             table: risks },
  { key: 'Milestones',        table: milestones },
  { key: 'Stakeholders',      table: stakeholders },
  { key: 'Decisions',         table: decisions },
  { key: 'Architecture',      table: architectureIntegrations },
  { key: 'Teams',             table: teamOnboardingStatus },
  { key: 'Engagement History', table: engagementHistory },
  { key: 'Business Outcomes', table: businessOutcomes },
]

// For each tab: count rows; tab is "populated" if count > 0
```

### SSE Extraction Accumulation Pattern (from IngestionModal)
```typescript
// Source: bigpanda-app/components/IngestionModal.tsx lines 197-198
// Accumulate items across multiple file extractions
setReviewItems(prev => [...prev, ...items])
```

### Collateral Checklist Auto-match (Claude's discretion)
```typescript
// Fuzzy filename -> category mapping
const COLLATERAL_CATEGORIES: { key: string; label: string; keywords: string[] }[] = [
  { key: 'sow',      label: 'SOW',              keywords: ['sow', 'statement of work'] },
  { key: 'kickoff',  label: 'Kickoff Deck',      keywords: ['kickoff', 'kick-off', 'kick off'] },
  { key: 'discovery', label: 'Discovery Notes',  keywords: ['discovery'] },
  { key: 'presales', label: 'Presales Notes',    keywords: ['presales', 'pre-sales', 'pre sales'] },
  { key: 'orgchart', label: 'Customer Org Chart', keywords: ['org', 'chart', 'orgchart'] },
  { key: 'tracker',  label: 'Prior Tracker',     keywords: ['tracker', 'prior'] },
  { key: 'gong',     label: 'Gong Transcripts',  keywords: ['gong', 'transcript'] },
  { key: 'arch',     label: 'Architecture Diagram Notes', keywords: ['arch', 'architecture'] },
  { key: 'budget',   label: 'Budget Sheet',      keywords: ['budget', 'finance'] },
]
// Match: filename.toLowerCase() includes any keyword -> auto-check that category
```

### Step Progress Header (Claude's discretion — recommended pattern)
```typescript
// Horizontal step indicators in Dialog header
const WIZARD_STEPS = [
  { id: 'basic-info',    label: 'Project Info' },
  { id: 'upload',        label: 'Upload Files' },
  { id: 'ai-preview',   label: 'AI Preview' },
  { id: 'manual-entry', label: 'Manual Entry' },
  { id: 'launch',       label: 'Launch' },
]
// Render as: [1 Project Info] → [2 Upload Files] → [3 AI Preview] → ...
// Active step: blue, completed: green checkmark, upcoming: grey
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct DB seed script (migrate-local.ts) | Wizard UI with guided onboarding | Phase 20 | New projects no longer require developer intervention |
| Per-file ingestion modal (Phase 18) | Multi-file combined preview in wizard | Phase 20 | User sees all extracted data in one review step |

**Note:** The `IngestionModal` single-file flow remains for the Artifacts tab — the wizard introduces a parallel multi-file combined flow only within its own container. No changes to `IngestionModal.tsx` are needed.

## Open Questions

1. **Which entity tables map to "engagement history" and "teams" in the completeness score?**
   - What we know: CONTEXT.md lists `engagementHistory` and `teamOnboardingStatus` as the tables; `engagement_history` and `team_onboarding_status` tables exist in schema (SCHEMA-11 complete)
   - What's unclear: The exact Drizzle export names — need to verify `engagementHistory` vs `engagement_history` in schema.ts imports
   - Recommendation: Verify table export names in schema.ts during Wave 0

2. **Does `getDashboardData` health scoring break when a draft project has zero child records?**
   - What we know: Health scoring logic in `lib/queries.ts` computes RAG status from aggregated data
   - What's unclear: Whether division-by-zero or null guards exist for projects with no actions/risks
   - Recommendation: Review `getDashboardData` health computation in Wave 1; add guards if needed

3. **Should `PATCH /api/projects/[projectId]/route.ts` be extended or a new route added?**
   - What we know: The existing `[projectId]/route.ts` only has GET; adding PATCH is clean
   - What's unclear: Whether any other current code needs PATCH on that route
   - Recommendation: Add PATCH handler to existing file (no new file needed)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts present) |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `cd bigpanda-app && npx vitest run tests/wizard/ --reporter=verbose` |
| Full suite command | `cd bigpanda-app && npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WIZ-01 | "New Project" button triggers wizard Dialog | smoke/manual | manual — DOM interaction | ❌ Wave 0 |
| WIZ-02 | POST /api/projects creates project with draft status | unit | `npx vitest run tests/wizard/create-project.test.ts -x` | ❌ Wave 0 |
| WIZ-02 | Schema has description, start_date, end_date, draft status | unit | `npx vitest run tests/wizard/schema-wizard.test.ts -x` | ❌ Wave 0 |
| WIZ-03 | Checklist auto-checks when matching filename uploaded | unit | `npx vitest run tests/wizard/checklist-match.test.ts -x` | ❌ Wave 0 |
| WIZ-04 | ReviewItems accumulate across multiple files | unit | `npx vitest run tests/wizard/multi-file-accumulation.test.ts -x` | ❌ Wave 0 |
| WIZ-05 | Manual entry items written via entity API routes | unit | `npx vitest run tests/wizard/manual-entry.test.ts -x` | ❌ Wave 0 |
| WIZ-07 | PATCH sets status=active; navigate to overview | unit | `npx vitest run tests/wizard/launch.test.ts -x` | ❌ Wave 0 |
| WIZ-08 | Completeness score: counts 9 entity tables, returns 0–100 | unit | `npx vitest run tests/wizard/completeness.test.ts -x` | ❌ Wave 0 |
| WIZ-09 | Score below 60%: banner lists empty tab names | unit | `npx vitest run tests/wizard/completeness-banner.test.ts -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd bigpanda-app && npx vitest run tests/wizard/ --reporter=verbose`
- **Per wave merge:** `cd bigpanda-app && npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/wizard/` directory — create before Wave 1
- [ ] `tests/wizard/create-project.test.ts` — covers WIZ-02 project creation API
- [ ] `tests/wizard/schema-wizard.test.ts` — covers WIZ-02 schema fields
- [ ] `tests/wizard/checklist-match.test.ts` — covers WIZ-03 filename-to-category matching
- [ ] `tests/wizard/multi-file-accumulation.test.ts` — covers WIZ-04 multi-file merge
- [ ] `tests/wizard/manual-entry.test.ts` — covers WIZ-05 manual entry write flow
- [ ] `tests/wizard/launch.test.ts` — covers WIZ-07 launch + status update
- [ ] `tests/wizard/completeness.test.ts` — covers WIZ-08 score calculation
- [ ] `tests/wizard/completeness-banner.test.ts` — covers WIZ-09 below-60 banner data

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `bigpanda-app/components/IngestionModal.tsx` — upload/SSE extraction state machine
- Direct codebase inspection: `bigpanda-app/components/ExtractionPreview.tsx` — tab grouping, approve flow
- Direct codebase inspection: `bigpanda-app/components/IngestionStepper.tsx` — file status sidebar
- Direct codebase inspection: `bigpanda-app/db/schema.ts` lines 29-94 — projects table, projectStatusEnum
- Direct codebase inspection: `bigpanda-app/app/page.tsx` — Dashboard component structure
- Direct codebase inspection: `bigpanda-app/lib/queries.ts` — getDashboardData filters
- Direct codebase inspection: `bigpanda-app/vitest.config.ts` — test configuration
- `.planning/phases/20-project-initiation-wizard/20-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` WIZ section — requirement definitions
- `.planning/STATE.md` — phase dependencies and project history

### Tertiary (LOW confidence)
- None — all findings verified from codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified all components exist in codebase
- Architecture: HIGH — based on direct code inspection; nested Dialog pitfall is confirmed Radix behavior
- Pitfalls: HIGH — schema enum gap confirmed by reading schema.ts; Dashboard filter gap confirmed by reading queries.ts
- Completeness score design: HIGH — follows CONTEXT.md exactly; table names verified in schema.ts

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable codebase — no external dependencies changing)
