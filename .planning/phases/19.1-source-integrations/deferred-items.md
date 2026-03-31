# Deferred Items — Phase 19.1

## Pre-existing TypeScript errors (out of scope)

These errors existed before Plan 19.1-07 and were NOT introduced by it.
Confirmed via git: errors present in commit a68b555 and earlier.

1. **app/api/ingestion/approve/route.ts:304** — `source` field specified twice in object spread
   - Harmless at runtime; TypeScript TS2783 warning only
2. **ioredis dual-version type conflict** (app/api/jobs/trigger/route.ts, app/api/skills/[skillName]/run/route.ts, worker/index.ts, worker/scheduler.ts)
   - bullmq bundles its own ioredis; top-level ioredis types are incompatible
   - Fix: dedupe ioredis via npm overrides, or cast to `unknown as ConnectionOptions`
3. **../lib/yaml-export.ts:18** — Cannot find module 'js-yaml' (outside bigpanda-app workspace)

## Recommendation
Address ioredis type conflict in a dedicated chore phase or as part of Phase 20+ dependency cleanup.
