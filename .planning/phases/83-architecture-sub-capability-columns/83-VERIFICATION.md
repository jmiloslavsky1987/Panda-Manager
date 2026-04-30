---
phase: 83-architecture-sub-capability-columns
verified: 2026-04-29T08:00:00Z
status: human_needed
score: 9/10 must-haves verified
re_verification: false
human_verification:
  - test: "Open Architecture tab on a project. Verify ADR Track shows 3 colored section header bars (Alert Intelligence, Incident Intelligence, Workflow Automation) with sub-capability columns stacked vertically inside each section."
    expected: "Blue header for Alert Intelligence with 3 sub-columns below; amber header for Incident Intelligence with 4 sub-columns; green header for Workflow Automation with 4 sub-columns. Console circle appears between Incident Intelligence and Workflow Automation sections."
    why_human: "Layout rendering cannot be verified programmatically. The code logic is correct but visual grouping (horizontal section separation, vertical sub-column stacking) requires browser confirmation."
  - test: "Check sub-capability column header colors. Within each section, do the sub-capability column headers (e.g., 'Monitoring Integrations', 'Alert Correlation') have a colored background matching their parent section?"
    expected: "Per ARCH-SUB-04 spec: Monitoring Integrations should have blue header, Alert Correlation amber, Environments green. However phaseHeaderStyle() does NOT map sub-capability names — all sub-cap column headers render with default zinc styling (bg-zinc-50). The section header bar itself IS colored, so the section-level color is present."
    why_human: "The phaseHeaderStyle() function at InteractiveArchGraph.tsx line 211 only matches old section names, not sub-capability names. Whether this is acceptable (section header bar provides the color signal) or a defect requiring the function to be extended was approved in the 83-04 human gate but was not explicitly noted. Needs confirmation from the user."
  - test: "Open the Add Integration modal. Verify the Phase selector for ADR track shows 3 optgroups (Alert Intelligence, Incident Intelligence, Workflow Automation) each containing their sub-capability options."
    expected: "Alert Intelligence group: Monitoring Integrations, Alert Normalization, Alert Enrichment. Incident Intelligence: Alert Correlation, Incident Enrichment, Incident Classification, Suggested Root Cause. Workflow Automation: Environments, Automated Incident Creation, Automated Incident Notification, Automated Incident Remediation."
    why_human: "Code is verified correct (optgroup JSX present, ADR_PHASES constant removed) but actual rendering in browser needed to confirm no regressions."
  - test: "Create a new project. Navigate to its Architecture tab."
    expected: "ADR Track shows full sub-capability structure seeded (3 sections + Console + 11 sub-capability nodes). AI Assistant Track shows flat nodes unchanged."
    why_human: "New project seeding verified in code (route.ts and seed-projects.ts) but actual DB insert + render path needs browser confirmation."
---

# Phase 83: Architecture Sub-Capability Columns Verification Report

**Phase Goal:** Replace the current flat per-node column layout in the ADR Track architecture diagram with a grouped sub-capability column structure mirroring the BigPanda Future State Alert Pipeline reference diagram. Each major pipeline section (Alert Intelligence, Incident Intelligence, Workflow Automation) becomes a colored section header containing multiple sub-capability columns. Integration cards route to the correct sub-column. Downstream consumers (extraction pipeline, chat tools, context builder) use sub-capability names.
**Verified:** 2026-04-29T08:00:00Z
**Status:** human_needed (all automated checks pass; 4 items require human browser verification)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ADR Track schema supports parent_id and node_type on arch_nodes | VERIFIED | db/schema.ts line 876-877: `parent_id` (nullable self-FK) and `node_type` (text NOT NULL DEFAULT 'sub-capability') present; migration 0046 adds both columns |
| 2 | Existing projects migrated to 3-section + 11-sub-capability + Console structure | VERIFIED | db/migrations/0046_arch_nodes_parent_id.sql: PL/pgSQL block inserts section nodes + 11 sub-capabilities per ADR Track project; deletes old flat section nodes |
| 3 | ADR Track renders as 3 colored SectionHeader groups with sub-capability columns | VERIFIED (code) / HUMAN-NEEDED (visual) | InteractiveArchGraph.tsx: isADR branch at line 358 exists; SectionHeader component at line 200; section color mapping at line 193; subCapByParent grouping at lines 363-370; columns array built at lines 374-406 |
| 4 | Console node renders between Incident Intelligence and Workflow Automation | VERIFIED (code) | InteractiveArchGraph.tsx line 399: `if (sectionIdx === 1 && consoleNode)` inserts ConsoleNode after second section |
| 5 | AI Assistant Track rendering is unchanged (flat) | VERIFIED | InteractiveArchGraph.tsx lines 434-476: non-ADR branch uses flat SortableContext with horizontalListSortingStrategy; no SectionHeader used |
| 6 | IntegrationEditModal phase picker uses optgroup for ADR track | VERIFIED | IntegrationEditModal.tsx lines 144-162: 3 `<optgroup>` elements with all 11 sub-capability names; `ADR_PHASES` constant removed; flat 'Alert Intelligence' option absent |
| 7 | Document extraction assigns to sub-capability column names | VERIFIED | document-extraction.ts line 731: WHERE filter on node_type='sub-capability'; line 735: in-memory guard filter; lines 756-766: 15-entry stage guide with all 11 ADR sub-capability names |
| 8 | Chat context builder groups architecture by section → sub-column | VERIFIED | chat-context-builder.ts line 169-207: getArchNodes imported, sectionNodes and subCapsByParent grouping logic present, renders `### Section` then `#### SubCap` hierarchy |
| 9 | createArchNodeTool accepts optional parent_node_name and resolves it to parent_id | VERIFIED | arch-tools.ts lines 134-179: `parent_node_name` Zod optional field present; DB lookup logic resolves name → id; node_type set to 'sub-capability' or 'section' based on parentId |
| 10 | New project creation seeds full sub-capability structure | VERIFIED | app/api/projects/route.ts lines 225-259: section nodes inserted with `.returning({id})`, then 11 sub-capability nodes bulk-inserted with parent_id; scripts/seed-projects.ts mirrors same structure |

**Score:** 9/10 truths verified (1 requires human visual confirmation — truth #3 is code-verified but visual rendering needs browser check)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `db/migrations/0046_arch_nodes_parent_id.sql` | Schema migration + existing project data migration | VERIFIED | 67-line migration: ALTER TABLE, PL/pgSQL loop inserts section/sub-cap nodes for all projects, phase remapping |
| `db/schema.ts` | archNodes with parent_id and node_type | VERIFIED | Lines 876-877: both columns present with correct types and self-referential FK |
| `components/arch/InteractiveArchGraph.tsx` | ADR grouped rendering with SectionHeader + Console placement | VERIFIED | SectionHeader component (line 200), sectionColor() (line 193), isADR branch (line 358), Console insertion logic (line 399) |
| `components/arch/IntegrationEditModal.tsx` | optgroup ADR phase picker, ADR_PHASES removed | VERIFIED | No ADR_PHASES constant; 3 optgroup elements present; default phase 'Monitoring Integrations' |
| `app/api/projects/route.ts` | New project seeds 3 sections + Console + 11 sub-capabilities | VERIFIED | Lines 225-259: section nodes with .returning({id}), bulk sub-capability insert with parent_id |
| `scripts/seed-projects.ts` | Mirrors route.ts new structure | VERIFIED | Lines 224-259: identical structure with section nodes and 11 sub-capabilities; phase values updated to sub-capability names |
| `worker/jobs/document-extraction.ts` | buildArchPhasesContext filters to sub-capability nodes; 15-entry stage guide | VERIFIED | WHERE node_type='sub-capability' + in-memory filter; 15-entry guide at lines 756-770 |
| `lib/chat-context-builder.ts` | getArchNodes import, section→sub-column grouping | VERIFIED | getArchNodes imported (line 9), called in Promise.all (line 33), grouping logic at lines 169-207 |
| `app/api/projects/[projectId]/chat/tools/arch-tools.ts` | createArchNodeTool with parent_node_name Zod field + parent_id resolution | VERIFIED | parent_node_name optional field (line 134), DB lookup (lines 167-179), node_type inference (line 190) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `InteractiveArchGraph.tsx` isADR branch | sectionNodes + subCapByParent | node_type filter on ArchNode | WIRED | Lines 359-370: filters `n.node_type === 'section'` and `n.node_type === 'sub-capability'`; parent_id grouping via Map |
| `InteractiveArchGraph.tsx` TrackPipeline | SectionHeader + SortablePhaseColumn | renderParts array | WIRED | Lines 374-406: sections loop pushes SectionHeader + per-section SortableContext; Console inserted at sectionIdx===1 |
| `architecture/page.tsx` | WorkflowDiagram + getArchNodes | Promise.all | WIRED | Lines 8-11: getArchNodes called, archData.tracks and archData.nodes passed to WorkflowDiagram |
| `chat-context-builder.ts` | getArchNodes | Promise.all parallel fetch | WIRED | Line 33: getArchNodes(projectId) in Promise.all; archNodesData destructured and used at line 170 |
| `buildArchPhasesContext` | sub-capability rows only | WHERE node_type='sub-capability' + in-memory filter | WIRED | Line 731 (DB filter) + line 735 (in-memory guard); both present |
| `createArchNodeTool` | parent_id resolution | DB lookup on archNodes.name | WIRED | Lines 167-179: parent_node_name → DB select → parentId; used in insert at line 189 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ARCH-SUB-01 | 83-01 | parent_id FK + node_type column on arch_nodes | SATISFIED | schema.ts + migration 0046 |
| ARCH-SUB-02 | 83-01 | Migration seeds section/sub-cap nodes; phase remapping | SATISFIED | migration 0046 PL/pgSQL block; UPDATE/DELETE on architecture_integrations |
| ARCH-SUB-03 | 83-01 | getArchNodes returns tracks + nodes (flat, with node_type) | SATISFIED | queries.ts line 1292: returns { tracks, nodes }; all columns including parent_id and node_type returned via $inferSelect |
| ARCH-SUB-04 | 83-02 | InteractiveArchGraph grouped rendering overhaul | SATISFIED (with note) | SectionHeader + isADR branch present. NOTE: phaseHeaderStyle() does not map sub-capability names to section colors — sub-cap column headers render in default zinc style. Section header bars themselves ARE colored. Human gate approved this. |
| ARCH-SUB-05 | 83-02 | IntegrationEditModal optgroup phase picker | SATISFIED | optgroup JSX present, ADR_PHASES removed, all 11 sub-capabilities covered |
| ARCH-SUB-06 | 83-02 | New project seed (route.ts) | SATISFIED | 3 sections + Console + 11 sub-capabilities inserted |
| ARCH-SUB-07 | 83-02 | Dev seed script (seed-projects.ts) | SATISFIED | Mirrors route.ts structure exactly |
| ARCH-SUB-08 | 83-03 | document-extraction.ts stage guide uses sub-capability names | SATISFIED | 15-entry guide with all 11 ADR sub-capability names present |
| ARCH-SUB-09 | 83-03 | chat-context-builder.ts groups by section → sub-column | SATISFIED | Hierarchical rendering: section → sub-cap → integrations list |
| ARCH-SUB-10 | 83-03 | createArchNodeTool parent_node_name field | SATISFIED | Zod field + DB resolution + node_type inference wired |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `InteractiveArchGraph.tsx` | 211-229 | `phaseHeaderStyle()` only matches old section names; sub-capability column headers get default zinc styling | Info | Sub-cap column header color inheritance not implemented per ARCH-SUB-04 spec. Section header bar IS colored. Visual outcome was approved in 83-04 human gate. |
| `db/migrations/0046_arch_nodes_parent_id.sql` | 67 | `DELETE FROM architecture_integrations WHERE phase IN ('Incident Intelligence', 'Workflow Automation')` | Warning | Pre-migration integrations tagged as 'Incident Intelligence' or 'Workflow Automation' phases are DELETED rather than remapped. This is a data loss decision — could affect production projects that had integrations in those phases. PLAN noted remapping only 'Alert Intelligence' → 'Monitoring Integrations' and 'Workflow Automation' → 'Automated Incident Creation', but the migration deletes the latter instead of mapping it. |

---

### Human Verification Required

#### 1. ADR Track Visual Layout

**Test:** Open any project's Architecture tab in the browser.
**Expected:** ADR Track shows 3 colored section header bars (blue Alert Intelligence, amber Incident Intelligence, green Workflow Automation) with sub-capability columns stacked vertically inside each. Console circle appears between Incident Intelligence and Workflow Automation.
**Why human:** Code logic verified correct but column layout (horizontal sections, vertical sub-caps within each) requires browser rendering to confirm final visual output. The 83-04 gate approved this — confirming it is visually correct.

#### 2. Sub-Capability Column Header Colors

**Test:** Inspect column header backgrounds within each section group in the ADR Track.
**Expected per spec:** Column headers should inherit parent section color (blue, amber, green). **Actual behavior per code:** `phaseHeaderStyle()` does NOT map sub-capability names, so all sub-cap column headers render with default zinc background (`bg-zinc-50`). Only the SectionHeader bar itself is colored.
**Why human:** Whether this is acceptable design (section bar provides color) or a missing feature (ARCH-SUB-04 specified color inheritance for sub-capability column headers) needs explicit user confirmation. The 83-04 gate approved the visual appearance without explicitly noting this deviation.

#### 3. Integration Modal Optgroup Rendering

**Test:** Click Add Integration on any project. Select ADR track. Verify the Phase dropdown shows grouped options.
**Expected:** 3 `<optgroup>` labels containing their 11 sub-capability options.
**Why human:** DOM rendering of native `<optgroup>` elements needs browser verification.

#### 4. New Project Sub-Capability Seeding

**Test:** Create a new project and open its Architecture tab.
**Expected:** ADR Track has full 3-section + Console + 11 sub-capability structure immediately on creation.
**Why human:** Route.ts and seed-projects.ts code verified correct but database transaction behavior needs end-to-end verification.

---

### Notable Data Loss in Migration

The migration line `DELETE FROM architecture_integrations WHERE phase IN ('Incident Intelligence', 'Workflow Automation')` deletes existing integration cards that were tagged as those phases rather than remapping them to sub-capability names. The PHASE.md plan states "Migrate architecture_integrations.phase: 'Alert Intelligence' → 'Monitoring Integrations'; 'Workflow Automation' → 'Automated Incident Creation'" — however the migration DELETES Workflow Automation integrations rather than mapping them. If any production project had integrations tagged 'Incident Intelligence' or 'Workflow Automation', those records are gone after migration. This was apparently acceptable to the author (the pre-seeded test data only had 'Alert Intelligence' and 'Automated Incident Creation' integrations) but is worth noting.

---

### Gaps Summary

No automated verification gaps. All 10 required artifacts exist and are substantively implemented with correct wiring. The phase goal is functionally achieved:

- DB schema extended with parent_id and node_type (ARCH-SUB-01) — confirmed
- Migration inserts section/sub-capability nodes for existing projects (ARCH-SUB-02) — confirmed
- Rendering overhauled with SectionHeader grouping (ARCH-SUB-04) — code confirmed; visual approved by user in 83-04
- IntegrationEditModal uses optgroup (ARCH-SUB-05) — confirmed
- New project seed updated (ARCH-SUB-06/07) — confirmed
- Downstream consumers (extraction pipeline, context builder, chat tools) use sub-capability names (ARCH-SUB-08/09/10) — all confirmed

4 items flagged for human browser confirmation are procedural (visual rendering, end-to-end create flow) rather than implementation gaps. The 83-04 summary reports the user already approved the visual rendering — those human_verification items above are documentational.

One notable code observation: `phaseHeaderStyle()` does not map sub-capability names to section colors. Sub-capability column headers render in default zinc style. This is a partial gap from the ARCH-SUB-04 spec which stated column headers should "inherit the color of their parent section." The SectionHeader bar provides section-level color signaling, which the user approved. If strict spec compliance is required, `phaseHeaderStyle()` needs to be extended to map sub-capability names to their parent section colors.

---

_Verified: 2026-04-29T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
