---
phase: 63-skills-design-standard
plan: 02
subsystem: skills
tags: [skills-tab, runtime-validation, server-refactor, front-matter-parsing]
dependency_graph:
  requires: [63-01-skills-design-standard]
  provides: [skill-metadata-server-sourcing, front-matter-validation]
  affects: [skills-tab-ui, skill-orchestrator]
tech_stack:
  added: []
  patterns: [server-side-front-matter-parsing, prop-driven-client-rendering]
key_files:
  created:
    - bigpanda-app/types/skills.ts
    - bigpanda-app/__tests__/skills/front-matter-strip.test.ts
  modified:
    - bigpanda-app/lib/skill-orchestrator.ts
    - bigpanda-app/app/customer/[id]/skills/page.tsx
    - bigpanda-app/components/SkillsTabClient.tsx
decisions:
  - decision: SkillMeta type defined in types/skills.ts for shared import
    rationale: Both server component and client component need the type definition
    alternatives_considered: Defining in page.tsx and importing, inline type definition
    locked: false
  - decision: Manual YAML parsing (no yaml library dependency)
    rationale: Simple key-value parsing sufficient for 6-field schema, avoids dependency bloat
    alternatives_considered: Adding js-yaml or yaml npm package
    locked: false
  - decision: All skills from server are runnable (Fix required badge is informational only)
    rationale: Non-compliant skills still functional during migration period, admin can fix front-matter without breaking user workflows
    alternatives_considered: Disabling run button for non-compliant skills
    locked: false
  - decision: Exclude context-updater from Skills tab (add to EXCLUDED_SKILLS)
    rationale: Context-updater is a backend processing skill per 63-CONTEXT.md scope definition, not a documentation skill
    alternatives_considered: Keep context-updater in Skills tab as it was in ALL_SKILLS
    locked: false
metrics:
  duration_minutes: 5
  completed_date: 2026-04-15
  task_commits: 2
  files_created: 2
  files_modified: 3
---

# Phase 63 Plan 02: Skills Tab Server Refactor Summary

SkillOrchestrator now strips YAML front-matter before Claude API calls; Skills tab reads metadata from .md files at runtime; "Fix required" badge shows for non-compliant skills.

## Overview

This plan eliminates hardcoded skill metadata from SkillsTabClient and replaces it with server-side front-matter parsing. The Skills tab now reads label, description, input_required, input_label, schedulable, and error_behavior directly from each skill's .md file. SkillOrchestrator strips front-matter blocks before passing content to Claude (ensuring metadata doesn't leak into prompts). Non-compliant skills render with a "Fix required" badge and reduced opacity, but remain runnable.

**Purpose:** This plan delivers SKILL-01 (standard enforced at runtime), SKILL-04 (UI audit visibility), and the foundation for SKILL-02 (functional skills will be auto-discovered in Plan 03). Skills tab metadata now comes from skill files themselves, not hardcoded constants. This unblocks Phase 64 (Editable Prompts UI) by establishing front-matter as the single source of truth.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Patch SkillOrchestrator to strip YAML front-matter | f7d42bd | skill-orchestrator.ts, front-matter-strip.test.ts |
| 2 | Refactor Skills tab server component and client | 1a71f99 | skills/page.tsx, SkillsTabClient.tsx, types/skills.ts |

## What Was Built

### 1. SkillOrchestrator Front-Matter Stripping
Modified `lib/skill-orchestrator.ts` to strip YAML front-matter before using skill file content as Claude's system prompt:

```typescript
// Strip YAML front-matter if present (SKILL-01: front-matter must not reach Claude)
if (systemPrompt.startsWith('---')) {
  systemPrompt = systemPrompt.replace(/^---[\s\S]*?---\n?/, '').trim();
}
```

**Behavior:**
- If skill file starts with `---`: regex removes opening `---`, all front-matter content, closing `---`, and trailing newline
- Legacy files without front-matter: content passed unchanged to Claude
- Applied after file read, before token counting and API call

**TDD coverage:** 2 passing tests verify front-matter is stripped when present and legacy files remain unchanged.

### 2. Server-Side Front-Matter Parsing (skills/page.tsx)
Created server component logic to parse skill metadata at runtime:

**SkillMeta type** (`types/skills.ts`):
- 8 fields: name, label, description, inputRequired, inputLabel, schedulable, errorBehavior, compliant
- Shared type imported by both server component and client component

**parseSkillMeta() helper:**
- Extracts YAML block between first and second `---`
- Parses key-value pairs manually (splits by `:`, trims whitespace)
- Validates all 6 required fields present
- Validates error_behavior is "retry" or "fail"
- Validates input_required and schedulable are booleans
- Returns `compliant: true` if all checks pass, `compliant: false` otherwise

**loadSkills() async function:**
- Reads skills directory path from settings.json via resolveSkillsDir()
- Filters out SKILLS-DESIGN-STANDARD.md
- Excludes backend processing skills: ai-plan-generator, context-updater, stakeholder-comms, onboarding-checklist
- Returns SkillMeta[] array with parsed metadata for all remaining skills

**Skills page integration:**
- Calls loadSkills() before rendering
- Passes `skills` prop to SkillsTabClient alongside projectId and recentRuns

### 3. Client Component Refactor (SkillsTabClient.tsx)
Removed hardcoded skill metadata and updated to render from server-provided props:

**Removed:**
- `ALL_SKILLS` constant (15 hardcoded skill objects)
- `WIRED_SKILLS` Set (10 hardcoded skill names)
- `INPUT_REQUIRED_SKILLS` Set (2 hardcoded skill names)

**Added:**
- `skills: SkillMeta[]` prop to SkillsTabClientProps
- Import SkillMeta type from `types/skills.ts`

**Updated rendering logic:**
- `skills.map()` replaces `ALL_SKILLS.map()`
- `skill.inputRequired` replaces `INPUT_REQUIRED_SKILLS.has(skill.name)`
- `skill.inputLabel` used as textarea placeholder (e.g. "Transcript…")
- All skills from server are runnable (removed wired/unwired distinction)

**"Fix required" badge:**
- Renders when `!skill.compliant`
- Badge styling: `bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full`
- Tooltip: "Front-matter missing or invalid — see SKILLS-DESIGN-STANDARD.md"
- Visual treatment: `opacity-60` applied to non-compliant skill card wrapper

**Exclusions from rendered list (per plan context):**
- stakeholder-comms (removed from catalog per phase decisions)
- onboarding-checklist (removed from catalog per phase decisions)
- ai-plan-generator (backend processing skill, not a tab skill)
- context-updater (backend processing skill per CONTEXT.md scope definition)

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes, no missing critical functionality, no blocking issues encountered.

## Technical Decisions

### 1. SkillMeta Type Location
Created `types/skills.ts` as a shared type file imported by both server component (page.tsx) and client component (SkillsTabClient.tsx).

**Rationale:** Type needs to be accessible in both server and client contexts. Exporting from page.tsx would work but creates awkward import path. Dedicated types/ directory follows established codebase pattern.

### 2. Manual YAML Parsing (No Library Dependency)
Implemented simple key-value parser instead of adding a YAML library:

```typescript
const lines = frontMatter.split('\n');
const fields: Record<string, string> = {};
for (const line of lines) {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) continue;
  const key = line.slice(0, colonIndex).trim();
  const value = line.slice(colonIndex + 1).trim();
  fields[key] = value;
}
```

**Rationale:** Skills Design Standard enforces simple 6-field schema with no nesting, no arrays, no complex YAML features. Manual parsing is 20 lines of code vs adding js-yaml (50KB minified) or yaml (70KB). No multiline values, no escaping, no YAML-specific edge cases in current schema.

**Trade-off:** If skill schema grows to include nested objects or arrays, a YAML library will be required. Current implementation handles flat key-value pairs only.

### 3. All Skills Runnable (Fix Required is Informational)
Non-compliant skills show "Fix required" badge but Run button remains enabled.

**Rationale:**
- During migration window, some skills may temporarily lack valid front-matter
- Disabling Run button would break user workflows
- Admin/developer can see which skills need fixing without blocking end-user access
- By end of Phase 63, all skills will be compliant (badge will not appear in practice)

**Alternative considered:** Disable Run button for non-compliant skills. Rejected because it creates operational friction during the phase execution window.

### 4. context-updater Excluded from Skills Tab
Added `context-updater` to EXCLUDED_SKILLS set, preventing it from appearing in the rendered skill list.

**Rationale:** Per 63-CONTEXT.md scope definition: "Skills tab documentation skills only — NOT ai-plan-generator, context-updater, or other backend processing skills." Context-updater writes to database (updates project context), it does not generate a deliverable document for PS delivery. While it appeared in the old ALL_SKILLS hardcode, it was a categorization error — it belongs with ai-plan-generator as a backend processing skill.

**Impact:** context-updater.md still exists in skills/ directory and has valid front-matter from Plan 01 migration. It's excluded from UI only — the skill remains functional for programmatic invocation.

## Verification

### Automated Verification Results
1. **TypeScript compilation:** Clean (no errors in modified files)
2. **Test suite:** 2 passing tests for front-matter stripping (RED → GREEN TDD cycle)
3. **Grep checks:**
   - `ALL_SKILLS` constant removed from SkillsTabClient ✅
   - `WIRED_SKILLS` constant removed from SkillsTabClient ✅
   - `INPUT_REQUIRED_SKILLS` constant removed from SkillsTabClient ✅
   - "Fix required" badge present in render logic ✅
   - `loadSkills()` function present in page.tsx ✅
   - `skills={skills}` prop pass present ✅
   - Front-matter strip `startsWith('---')` present in skill-orchestrator ✅

### Manual Verification (Human verification pending)
Visual/functional verification deferred to next plan or checkpoint:
- Skills tab loads and displays all expected skills (excluding backend processing skills)
- Non-compliant skills show "Fix required" badge with reduced opacity
- Input-required skills (meeting-summary) expand textarea on Run click
- Run button triggers skill execution successfully
- SkillOrchestrator does not send front-matter to Claude API

## Success Criteria Met

- [x] SkillOrchestrator strips --- front-matter before Anthropic API call
- [x] skills/page.tsx parses front-matter from .md files server-side — no hardcoded skill list
- [x] SkillsTabClient receives skills[] prop and renders from it
- [x] "Fix required" badge renders for any skill with compliant=false
- [x] stakeholder-comms and onboarding-checklist do not appear in rendered output
- [x] context-updater does not appear in rendered output (excluded per scope definition)
- [x] TypeScript build clean

## Output Artifacts

### Primary Artifacts
- **types/skills.ts** — Shared SkillMeta type definition (8 fields, compliant flag)
- **__tests__/skills/front-matter-strip.test.ts** — TDD test suite for front-matter stripping (2 passing tests)

### Modified Artifacts
- **lib/skill-orchestrator.ts** — Front-matter strip logic (4 lines added after readFile)
- **app/customer/[id]/skills/page.tsx** — Server-side front-matter parsing + loadSkills() function (100+ lines added)
- **components/SkillsTabClient.tsx** — Removed hardcoded constants, added skills prop, added Fix required badge rendering

## Dependencies

### Requires (from Plan 01)
- Plan 01 YAML front-matter migration (all skill .md files must have front-matter blocks)
- SKILLS-DESIGN-STANDARD.md schema definition

### Provides (to Downstream Plans)
- **Plan 03 (Wire Non-Functional Skills):** Auto-discovery of skill metadata (no code changes needed when adding new skills)
- **Phase 64 (Editable Prompts UI):** Front-matter as single source of truth for skill metadata
- **Phase 65 (Project-Scoped Scheduling):** `schedulable` field enables skill filtering for scheduling UI

### Affects
- Skills tab UI now dynamic (no redeployment needed to add/modify skills, only .md file changes)
- SkillOrchestrator system prompts now clean (no metadata leakage to Claude)

## Follow-Up Actions

### Plan 03 (Next)
Wire remaining non-functional skills by adding BullMQ handlers. Skills auto-discovered from front-matter — no SkillsTabClient code changes needed.

### Phase 64 (Blocked Until Complete)
Editable Prompts UI depends on this plan's front-matter-as-source-of-truth pattern. Admin skill editing will read/write front-matter blocks, knowing label/description/etc will be reflected in Skills tab immediately.

## Self-Check: PASSED

### Files Created Verification
```bash
[ -f "bigpanda-app/types/skills.ts" ] # FOUND
[ -f "bigpanda-app/__tests__/skills/front-matter-strip.test.ts" ] # FOUND
```

### Files Modified Verification
```bash
# Front-matter strip present:
grep -q "startsWith('---')" bigpanda-app/lib/skill-orchestrator.ts # FOUND

# loadSkills present:
grep -q "loadSkills()" bigpanda-app/app/customer/\[id\]/skills/page.tsx # FOUND

# ALL_SKILLS removed:
! grep -q "ALL_SKILLS" bigpanda-app/components/SkillsTabClient.tsx # NOT FOUND (correct)

# Fix required badge present:
grep -q "Fix required" bigpanda-app/components/SkillsTabClient.tsx # FOUND

# skills prop passed:
grep -q "skills={skills}" bigpanda-app/app/customer/\[id\]/skills/page.tsx # FOUND
```

### Commits Verification
```bash
git log --oneline --all | grep -q "f7d42bd" # FOUND
git log --oneline --all | grep -q "1a71f99" # FOUND
```

All verification checks passed.

---

**Execution Time:** 5 minutes (2026-04-15 09:56:19 UTC to 10:01:32 UTC)
**Commits:** 2 (f7d42bd, 1a71f99)
**Files Created:** 2
**Files Modified:** 3
**Lines Added:** ~260 total (~150 in page.tsx, ~100 net change in SkillsTabClient.tsx, ~10 in types/skills.ts)
