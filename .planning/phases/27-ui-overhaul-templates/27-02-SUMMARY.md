---
phase: 27-ui-overhaul-templates
plan: 02
subsystem: ui
tags: [registry, typescript, tdd, templates]
dependency_graph:
  requires: [27-01]
  provides: [TAB_TEMPLATE_REGISTRY]
  affects: [27-04, 30-completeness-analysis]
tech_stack:
  added: []
  patterns: [satisfies Record<K V>, TypeScript exhaustive type checking]
key_files:
  created:
    - bigpanda-app/lib/tab-template-registry.ts
    - bigpanda-app/tests/ui/tab-registry.test.ts
  modified: []
decisions:
  - name: Use satisfies Record pattern
    rationale: TypeScript 4.9+ enforces exhaustive key coverage at compile time
    alternatives: [Manual validation, Runtime type checking]
    impact: Adding a new TabType without a registry entry is now a compile error
  - name: Empty sections array for skills tab
    rationale: Skills tab is read-only execution log with no DB seeding needed
    impact: Phase 27 seeding (Plan 04) will skip skills tab
  - name: Single Business Outcomes section for plan tab
    rationale: Plan tab has internal navigation; only business outcomes needs template
    impact: Phase 27 seeding will insert 1 placeholder business_outcomes row
metrics:
  duration_seconds: 152
  tasks_completed: 1
  files_created: 2
  tests_added: 4
  commits: 2
  completed_at: "2026-03-31T06:39:06Z"
---

# Phase 27 Plan 02: Tab Template Registry Summary

**One-liner:** TypeScript-enforced registry defining section structures for all 11 tab types with instructional placeholder text

## What Was Built

Created `lib/tab-template-registry.ts` — the single source of truth for tab section definitions that will be consumed by Phase 27 seeding (Plan 04) and Phase 30 Context Hub completeness analysis.

**Key characteristics:**
- **Exhaustive coverage:** Uses `satisfies Record<TabType, TabTemplate>` to enforce compile-time completeness
- **11 tab types:** overview, actions, risks, milestones, teams, architecture, decisions, history, stakeholders, plan, skills
- **Instructional placeholders:** Each section includes actionable placeholder text (e.g., "Add your first action — include owner, due date, and a clear description")
- **Special cases:** skills has empty sections array (read-only log); plan has one section (Business Outcomes)

## Implementation Details

### TypeScript Enforcement Pattern

```typescript
export const TAB_TEMPLATE_REGISTRY = {
  overview: { sections: [...] },
  actions: { sections: [...] },
  // ... 9 more entries
} satisfies Record<TabType, TabTemplate>
```

This pattern ensures that:
1. Every key in `TabType` union must have a corresponding entry
2. TypeScript compiler will fail if a tab type is added without a registry entry
3. Refactoring safety: renaming a tab type updates both union and registry keys

### Section Structure

Each `SectionDef` contains:
- **name:** Display name (e.g., "Action Items", "Risk Register")
- **requiredFields:** Array of field names that must be present
- **placeholderText:** Instructional text guiding users on what to add

Example:
```typescript
{
  name: 'Action Items',
  requiredFields: ['description', 'owner', 'due'],
  placeholderText: 'Add your first action — include owner, due date, and a clear description of the expected outcome'
}
```

### Tab-by-Tab Breakdown

| Tab | Sections | Notes |
|-----|----------|-------|
| overview | 3 | Project Summary, Success Metrics, Key Contacts |
| actions | 1 | Action Items |
| risks | 1 | Risk Register |
| milestones | 1 | Project Milestones |
| teams | 2 | Customer Team, BigPanda Team |
| architecture | 2 | Integration Track, Workflow |
| decisions | 1 | Key Decisions (append-only) |
| history | 1 | Engagement History (append-only) |
| stakeholders | 1 | Stakeholder Map |
| plan | 1 | Business Outcomes |
| skills | 0 | Empty array (read-only execution log) |

## TDD Execution

**RED phase (commit a7bb4a9):**
- Created 4 failing tests in `tests/ui/tab-registry.test.ts`
- Tests verified: 11 entries, sections arrays, skills empty, plan Business Outcomes
- All tests failed as expected (registry didn't exist yet)

**GREEN phase (commit b496d73):**
- Implemented `lib/tab-template-registry.ts` with all 11 tab types
- Updated test file to import and test the actual registry
- All 4 tests passed
- TypeScript compilation succeeded for new file

**REFACTOR phase:**
- Not needed — initial implementation is clean and well-structured

## Verification Results

**Tests:** 4/4 passing
```
✓ TAB_TEMPLATE_REGISTRY has entries for all 11 required tab types
✓ each entry has a sections array
✓ skills entry has empty sections array
✓ each non-skills section has name and placeholderText
```

**TypeScript:** Compilation successful
```bash
npx tsc --noEmit lib/tab-template-registry.ts
# Exit code: 0 (no errors)
```

**Pattern verification:**
- `satisfies Record<TabType, TabTemplate>` pattern present at line 161
- skills entry has `sections: []` at line 158
- plan entry has 'Business Outcomes' section at line 151

## Deviations from Plan

None — plan executed exactly as written.

## Integration Points

**Upstream dependencies:**
- None (first implementation in Phase 27)

**Downstream consumers:**
- **Phase 27 Plan 04 (Seeding):** Will import `TAB_TEMPLATE_REGISTRY` to seed placeholder rows in DB tables
- **Phase 30 (Context Hub):** Completeness analysis will compare live DB against registry section definitions
- **Future UI rendering:** Registry can be used to dynamically generate empty state messages

## Key Decisions

1. **satisfies Record pattern (compile-time safety)**
   - **Decision:** Use TypeScript 4.9+ `satisfies` keyword to enforce exhaustive TabType coverage
   - **Rationale:** Prevents regression where a new tab type is added but no registry entry is created
   - **Alternative considered:** Runtime validation with Zod schema
   - **Why not:** Compile-time checking is faster, no runtime overhead, and catches errors earlier in development

2. **Empty sections for skills tab**
   - **Decision:** skills entry has `sections: []` with no section definitions
   - **Rationale:** Skills tab is a read-only execution log; no user input or DB seeding needed
   - **Impact:** Phase 27 seeding logic will skip skills tab (no placeholder rows inserted)

3. **Single section for plan tab**
   - **Decision:** plan entry has one section: "Business Outcomes"
   - **Rationale:** Plan tab already has rich internal navigation (Phase Board/Task Board/Gantt); only business outcomes needs template definition
   - **Impact:** Phase 27 seeding will insert 1 placeholder business_outcomes row with instructional text

## Known Limitations

1. **Pre-existing TypeScript errors:** The full codebase has unrelated TypeScript errors (audit tests, scheduler tests, wizard tests, yaml-export). These are out of scope for this plan and do not affect the registry functionality.

2. **No runtime validation:** The registry uses TypeScript types but has no runtime schema validation. If needed in the future, can add Zod schemas to validate imported data.

3. **Placeholder text not user-configurable:** The instructional text is hardcoded. If customization is needed, can extract to a separate i18n file or config.

## Next Steps

1. **Plan 27-04 (Seeding):** Import `TAB_TEMPLATE_REGISTRY` and implement seed logic
2. **Plan 30 (Completeness):** Use registry as baseline for completeness score calculation
3. **Future enhancement:** Consider exposing registry to UI for dynamic empty state messages

## Self-Check: PASSED

**Files created:**
- FOUND: bigpanda-app/lib/tab-template-registry.ts
- FOUND: bigpanda-app/tests/ui/tab-registry.test.ts

**Commits exist:**
- FOUND: a7bb4a9 (RED phase)
- FOUND: b496d73 (GREEN phase)

**Tests passing:**
```bash
cd bigpanda-app && npm test tests/ui/tab-registry.test.ts -- --run
# Result: 4 passed (4)
```

**Pattern verification:**
```bash
grep -n "satisfies Record" bigpanda-app/lib/tab-template-registry.ts
# Result: Line 161 found

grep -n "skills:" bigpanda-app/lib/tab-template-registry.ts
# Result: Line 158 found

grep -n "'Business Outcomes'" bigpanda-app/lib/tab-template-registry.ts
# Result: Line 151 found
```

All verification criteria met.
