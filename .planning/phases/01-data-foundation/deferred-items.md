# Phase 01 Deferred Items

## Pre-existing TypeScript Errors (out of scope for 01-04)

Found during Plan 01-04 data-service.ts TypeScript compilation check.

### 1. bigpanda-app/app/api/settings/route.ts — TS2307
- `error TS2307: Cannot find module '../../lib/settings' or its corresponding type declarations`
- Origin: Plan 01-03 implementation
- Impact: TypeScript compile error, but Next.js App Router still works at runtime (module resolution differs from tsc)
- Fix: Add path aliases to tsconfig.json or use relative path correctly

### 2. bigpanda-app/lib/settings.ts — TS2352
- `error TS2352: Conversion of type 'AppSettings' to type 'Record<string, unknown>' may be a mistake`
- Origin: Plan 01-03 implementation
- Fix: Add index signature to AppSettings interface or avoid cast
