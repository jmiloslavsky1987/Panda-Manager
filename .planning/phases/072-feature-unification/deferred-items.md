# Deferred Items - Phase 072

## Out-of-Scope Build Error

**File:** `bigpanda-app/app/api/ingestion/approve/route.ts:396`

**Error:** TypeScript type error in milestone insertion - status field type mismatch
```
Type 'string' is not assignable to type '"in_progress" | "completed" | "not_started" | "blocked" | SQL<unknown> | Placeholder<string, any> | null | undefined'.
```

**Context:** Pre-existing error discovered during Phase 072-02 build verification. Not caused by table client changes. Likely related to Phase 71 finding about missing DB enums for status fields.

**Recommendation:** Address in Phase 072-03 or separate bug fix as part of DB enum implementation.

