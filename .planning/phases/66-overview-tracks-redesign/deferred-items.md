# Deferred Items - Phase 66

## Pre-existing Test TypeScript Errors

**Discovered during:** Phase 66-03 Task 1 (Build verification)

**Issue:** TypeScript compilation check shows 65 errors across multiple test files. These are pre-existing issues not caused by Phase 66 changes.

**Scope:** Out of scope for Phase 66 — Phase 66 modified only:
- `components/OnboardingDashboard.tsx` (no TS errors)
- `components/WeeklyFocus.tsx` (no TS errors)

**Error categories:**
1. Lifecycle test files (archive.test.ts, delete.test.ts, restore.test.ts) — Response vs NextResponse type mismatches, mockWhere hoisting issues
2. Skills test files (front-matter-strip.test.ts) — countTokensCall possibly undefined
3. Audit test files (discovery, ingestion, plan-templates, stakeholders, tasks, workstreams) — db.transaction mock type incompatibilities
4. Chat/context test files — missing required fields in mock data
5. Extraction test files — EntityType validation, regex flag targeting
6. Overview metrics test — adrCompletion property no longer exists
7. Search/UI test files — missing required fields, null assignment issues
8. Wizard test files — Request vs NextRequest type mismatches

**Recommendation:** Create dedicated test cleanup phase in v7.0 to systematically fix test type errors. Phase 69 (TEST-01) is already planned for portfolio RED stubs — could expand scope to include test TypeScript cleanup.

**Impact:** Does not affect runtime behavior or Phase 66 UI verification. Tests may still pass (runtime vs compile-time distinction).
