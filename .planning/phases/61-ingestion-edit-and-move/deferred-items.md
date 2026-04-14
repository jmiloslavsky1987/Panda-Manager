# Deferred Items - Phase 61

## Out-of-Scope TypeScript Errors

**Found during:** 61-03 Task 1 (TypeScript check)
**Status:** Pre-existing, not caused by Phase 61 changes

### Test File Type Errors

1. **`__tests__/lifecycle/archive.test.ts`** - Type mismatches with `NextResponse` vs `Response`
   - Lines 59, 175: Missing `cookies` and `[INTERNALS]` properties
   - Lines 81, 131, 157: `mockWhere` used before declaration

2. **`__tests__/lifecycle/delete.test.ts`** - Line 229: Same `NextResponse` type issue

3. **`__tests__/lifecycle/restore.test.ts`** - Line 182: Same `NextResponse` type issue

4. **`lib/__tests__/require-project-role.test.ts`** - Mock session object incomplete
   - Lines 91, 108, 125, 142: Missing required session properties (createdAt, updatedAt, userId, token)

**Origin:** Phase 59 (Project Lifecycle Management) test files
**Impact:** Does not affect runtime or Phase 61 functionality
**Recommendation:** Address in Phase 69 (TEST-01) or dedicated test cleanup phase
