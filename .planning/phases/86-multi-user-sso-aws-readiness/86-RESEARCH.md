# Phase 86: Multi-User SSO & AWS Readiness — Research

**Researched:** 2026-05-15
**Domain:** Auth (better-auth 1.5.6 genericOAuth+okta), BullMQ cron jobs, pg_dump in Docker, Next.js health endpoints, Drizzle ORM per-user token migration
**Confidence:** HIGH — all findings verified against live codebase and installed node_modules

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Per-user source credentials: `user_id='default'` rows stay; real `session.user.id` used when session exists; fallback to 'default' if no row for real user.
- Okta OIDC SSO: scaffolded but DORMANT. Entire Okta path gated on `OKTA_CLIENT_ID` env var presence. When blank (today's Docker), login page and auth flow must be byte-for-byte identical to pre-Phase-86. Email/password is the only active auth path.
- Env vars for Okta: `OKTA_DOMAIN`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_REDIRECT_URI` — documented in `install/env.aws.example`, blank/absent in `install/docker-compose.local.yml`.
- Group mapping (dormant): Okta group `panda-admins` → role `admin`; all others → role `user`.
- Automated daily DB backup: BullMQ cron job at `0 2 * * *`, writes to `/root/.bigpanda-app/backups/`, 30-day retention. Mirrors existing `panda-backup.sh` logic. Status visible in Settings (admin only).
- AWS scaffolding: `install/docker-compose.aws.yml` + `install/env.aws.example`. No actual Terraform/CDK. Health endpoint at `/api/health` (unauthenticated, returns 200/503).
- RBAC audit: all 57 project-scoped routes under `app/api/projects/[projectId]/` already have `requireProjectRole`. Audit required but punch list may be empty.

### Claude's Discretion

- Whether to install `postgresql-client-16` in `Dockerfile.local` to get `pg_dump` in the worker container, OR use an alternative approach (exec via Docker socket, pure-Node pg dump). Research recommends `postgresql-client-16` install.
- Whether `OKTA_ISSUER` or `OKTA_DOMAIN` serves as the issuer URL to pass to better-auth's `okta()` helper. The installed `better-auth@1.5.6` `okta()` requires `issuer` — so `OKTA_DOMAIN` must be mapped to `issuer` in the registration code (e.g., `process.env.OKTA_DOMAIN + '/oauth2/default'` or just `process.env.OKTA_DOMAIN`).
- Exact structure of the backup status API route (new `/api/settings/backup-status/route.ts` vs extending `/api/settings/route.ts`).

### Deferred Ideas (OUT OF SCOPE)

- Actual Terraform/CDK infrastructure code
- Gong/Glean per-user credential scoping
- Email delivery in production (SES/SendGrid)
- Audit log export / compliance features
- Multi-org data partitioning (full tenant isolation)
</user_constraints>

---

## Summary

Phase 86 has five workstreams. The codebase is in excellent shape: all 57 project-scoped routes already have `requireProjectRole` (RBAC audit finds no gaps), better-auth 1.5.6 ships a first-class `okta()` provider inside `genericOAuth` that can be conditionally registered, and the BullMQ infrastructure is well-understood with a clear job-handler dispatch pattern. The critical constraint is the dormancy contract — with Okta env vars blank, zero behavioral change is permitted.

The two areas with non-obvious implementation complexity are: (1) pg_dump inside the worker container (node-slim image has no pg_dump — requires either a Dockerfile change or an alternative approach), and (2) the Okta dormancy pattern on the login page (the page is currently `'use client'` with no server-side gating, so the "show button only when env var populated" check must be done via a server component wrapper or a `/api/auth/providers` endpoint).

**Primary recommendation:** Implement workstreams in wave order — per-user tokens first (backward-compat migration, two file changes), then Okta scaffold (conditional plugin registration + login page server wrapper), then backup job (Dockerfile + new worker job), then health endpoint (10 lines), then AWS scaffold files (documentation only).

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Role in Phase 86 |
|---------|---------|---------|-----------------|
| better-auth | 1.5.6 | Auth framework | genericOAuth + okta provider for OIDC scaffold |
| @better-auth/core | (peer) | Core types | OktaOptions, GenericOAuthOptions types |
| bullmq | 5.71.0 | Job queue | New `db-backup` cron job |
| ioredis | 5.10.1 | Redis client | Existing createRedisConnection() |
| drizzle-orm | 0.45.1 | ORM | userSourceTokens query changes |
| postgres (postgres.js) | (installed) | DB driver | Health check raw ping |

### New Dependencies
| Package | Purpose | Install command |
|---------|---------|----------------|
| postgresql-client-16 | `pg_dump` binary in worker container | `apt-get install -y postgresql-client-16` in Dockerfile.local |

**Installation (Dockerfile.local change):**
```dockerfile
RUN apt-get update && apt-get install -y curl postgresql-client-16 && rm -rf /var/lib/apt/lists/*
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| installing postgresql-client in Dockerfile | docker exec into postgres container | Requires Docker socket mount — security concern, container coupling |
| installing postgresql-client in Dockerfile | pure-Node pg dump via streaming queries | Does not produce binary-compatible dump format; complex to implement |
| genericOAuth + okta() plugin | custom OIDC handshake | Plugin exists in installed version; custom handshake is unnecessary |

---

## Architecture Patterns

### Recommended Project Structure (new files only)
```
app/
├── api/
│   ├── auth/
│   │   └── providers/
│   │       └── route.ts          # GET — returns { okta: bool } for login page UI
│   └── health/
│       └── route.ts              # GET — unauthenticated DB+Redis ping
├── login/
│   └── page.tsx                  # Modified: add conditional Okta button (server-read or fetch)
worker/
└── jobs/
    └── db-backup.ts              # New BullMQ job handler
install/
├── docker-compose.aws.yml        # New: production compose (RDS/ElastiCache env vars)
├── env.aws.example               # New: documented env var manifest
└── Dockerfile.local              # Modified: add postgresql-client-16
lib/
└── auth.ts                       # Modified: conditional genericOAuth + okta() plugin
lib/
└── auth-utils.ts                 # Modified: update group name 'Admins' → 'panda-admins'
worker/
└── lock-ids.ts                   # Modified: add DB_BACKUP: 1010
worker/
└── index.ts                      # Modified: import + register db-backup handler
```

### Pattern 1: Conditional better-auth Plugin Registration (Okta dormancy)

**What:** Register the `genericOAuth` plugin with the `okta()` provider config only when `OKTA_CLIENT_ID` is present. When blank, `betterAuth({ plugins: [nextCookies()] })` — identical to today.

**When to use:** Any env-var-gated feature that must not alter behavior when env is unset.

**Example:**
```typescript
// lib/auth.ts — verified against better-auth@1.5.6 node_modules
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, okta } from "better-auth/plugins/generic-oauth";

const oktaPlugins = process.env.OKTA_CLIENT_ID
  ? [
      genericOAuth({
        config: [
          okta({
            clientId: process.env.OKTA_CLIENT_ID,
            clientSecret: process.env.OKTA_CLIENT_SECRET!,
            issuer: process.env.OKTA_DOMAIN!,  // e.g. https://dev-xxxxx.okta.com/oauth2/default
            redirectURI: process.env.OKTA_REDIRECT_URI,
          }),
        ],
      }),
    ]
  : [];

export const auth = betterAuth({
  // ... existing config unchanged ...
  plugins: [...oktaPlugins, nextCookies()],  // nextCookies MUST be last
});
```

**Source:** `/Users/jmiloslavsky/Documents/Panda-Manager/node_modules/better-auth/dist/plugins/generic-oauth/providers/okta.mjs` — verified: `okta()` uses `issuer` to construct `discoveryUrl` as `${issuer}/.well-known/openid-configuration`.

**CRITICAL:** `nextCookies()` must remain last in the plugins array (existing comment in `lib/auth.ts` line 66).

### Pattern 2: Login Page Okta Button — Server-Side Gate

**What:** The login page is currently `'use client'`. To gate the Okta button on a server-side env check without exposing the env var to the client bundle, use a lightweight `/api/auth/providers` route that returns `{ okta: boolean }`.

**Why not read env var directly in client?** `process.env.OKTA_CLIENT_ID` is only available at build time in `NEXT_PUBLIC_*` variables. A server route is the correct pattern.

**Example:**
```typescript
// app/api/auth/providers/route.ts — new file, no auth required
export const dynamic = 'force-dynamic';  // must not cache; env may change between deploys

export async function GET() {
  return Response.json({
    okta: Boolean(process.env.OKTA_CLIENT_ID),
  });
}
```

```tsx
// app/login/page.tsx — add useEffect fetch of /api/auth/providers
// OR convert the outer shell to a server component that passes `showOkta` as a prop
// Simplest: add useEffect on mount to fetch /api/auth/providers, set showOkta state
// The button renders null until fetch resolves (no flash — env is blank in Docker)
```

**Alternative (simpler):** Convert `app/login/page.tsx` to a server component wrapper that fetches the env var server-side and passes `showOkta={Boolean(process.env.OKTA_CLIENT_ID)}` to a `LoginForm` client component. This avoids the extra route. Both patterns are correct; the server-component-wrapper avoids a network round trip.

### Pattern 3: Per-User Token Migration (backward-compat)

**What:** Two callback routes write `user_id: 'default'`; two status routes read `user_id: 'default'`. Change each to use `session.user.id` with a 'default' fallback on read.

**Write side (callbacks):** Replace `user_id: 'default'` with `user_id: session.user.id`.

**Read side (status + scan routes):** Fetch by `session.user.id`, fall back to `'default'` if no row.

**Scan route pattern:**
```typescript
// app/api/discovery/scan/route.ts — change line 164
const dbUserTokens = await db
  .select()
  .from(userSourceTokens)
  .where(
    eq(userSourceTokens.user_id, session!.user.id)  // real user first
  );

// If empty, fall back to 'default' tokens (backward-compat for existing single-user installs)
const effectiveTokens = dbUserTokens.length > 0
  ? dbUserTokens
  : await db
      .select()
      .from(userSourceTokens)
      .where(eq(userSourceTokens.user_id, 'default'));
```

**Status routes (gmail + slack):** Same pattern — query by `session.user.id`, fallback to `'default'`.

**The conflict target `[userSourceTokens.user_id, userSourceTokens.source]`** already has a UNIQUE constraint (`user_source_tokens_user_id_source_key` — confirmed in `db/migrations/0001_initial.sql` line 1654). No migration needed — the unique constraint works for any `user_id` value.

### Pattern 4: BullMQ Backup Job

**What:** A new worker job `db-backup` that runs `pg_dump` via `child_process.spawnSync`, stores the dump file in `/root/.bigpanda-app/backups/`, and prunes files older than 30 days.

**Registration:** Add to `JOB_HANDLERS` in `worker/index.ts` AND schedule via a new `scheduled_jobs` row (like the existing `meeting-prep-daily` pattern). The backup cron is a global job (no `projectId`). Add it to the DB seed or insert manually; it does NOT use the DB-driven scheduler — it must always run, not be user-configurable. Use a startup registration in `worker/index.ts` directly via `jobQueue.upsertJobScheduler`.

**Pattern:**
```typescript
// worker/jobs/db-backup.ts
import type { Job } from 'bullmq';
import { execSync } from 'child_process';
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = '/root/.bigpanda-app/backups';
const RETENTION_DAYS = 30;

export default async function dbBackupJob(_job: Job): Promise<{ status: string }> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = join(BACKUP_DIR, `backup-${timestamp}.sql`);

  mkdirSync(BACKUP_DIR, { recursive: true });

  // Today skip logic (mirrors panda-backup.sh)
  const today = new Date().toISOString().slice(0, 10);
  const existing = readdirSync(BACKUP_DIR).filter(f => f.startsWith(`backup-${today}`));
  if (existing.length > 0) {
    return { status: 'skipped-today' };
  }

  // pg_dump via DATABASE_URL (postgresql-client-16 must be installed in Dockerfile)
  execSync(`pg_dump --no-owner --no-acl "${process.env.DATABASE_URL}" > "${outFile}"`, {
    shell: true,
    timeout: 5 * 60 * 1000,  // 5 min timeout
  });

  // Prune files older than 30 days
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const f of readdirSync(BACKUP_DIR)) {
    const fp = join(BACKUP_DIR, f);
    if (f.startsWith('backup-') && statSync(fp).mtimeMs < cutoff) {
      unlinkSync(fp);
    }
  }

  return { status: 'ok' };
}
```

**Startup scheduler registration (worker/index.ts `start()` function):**
```typescript
// Register global db-backup cron (not DB-driven — always active)
await jobQueue.upsertJobScheduler(
  'global-db-backup',
  { pattern: '0 2 * * *' },
  { name: 'db-backup', data: { triggeredBy: 'cron' }, opts: { removeOnComplete: 10, removeOnFail: 10 } }
);
```

### Pattern 5: Health Endpoint

**What:** Unauthenticated GET `/api/health` that pings DB and Redis, returns 200 (all healthy) or 503 (any failure).

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { Redis } from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, 'ok' | 'error'> = {};

  // DB ping
  try {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1, connect_timeout: 5 });
    await sql`SELECT 1`;
    await sql.end();
    results.db = 'ok';
  } catch {
    results.db = 'error';
  }

  // Redis ping
  try {
    const redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redis.ping();
    await redis.quit();
    results.redis = 'ok';
  } catch {
    results.redis = 'error';
  }

  const allOk = Object.values(results).every(v => v === 'ok');
  return NextResponse.json(results, { status: allOk ? 200 : 503 });
}
```

**CRITICAL:** Do NOT use the module-level `db` singleton from `db/index.ts` — that uses a persistent pool. The health endpoint must create a fresh short-lived connection to actually test connectivity, not rely on a cached pool that was healthy at startup.

### Anti-Patterns to Avoid

- **Do NOT** add `NEXT_PUBLIC_OKTA_CLIENT_ID` to surface the env var to the client bundle — this exposes Okta config unnecessarily and is the wrong pattern.
- **Do NOT** import `genericOAuth` unconditionally (even with empty config array) — better-auth registers internal endpoints when the plugin is loaded; an empty config array may still alter `/api/auth/*` behavior.
- **Do NOT** use `process.env.DATABASE_URL` with the existing drizzle `db` singleton in the health endpoint — use a fresh connection.
- **Do NOT** use `child_process.execSync` without a timeout in the backup job — a hung `pg_dump` will lock the BullMQ worker indefinitely.
- **Do NOT** reuse the existing `getRedisConnection()` singleton in the health endpoint — that connection uses `maxRetriesPerRequest: null` (BullMQ worker mode) which will hang on failure.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Okta OIDC authentication | Custom OIDC handshake | `genericOAuth({ config: [okta({...})] })` from `better-auth/plugins/generic-oauth` | Already installed, handles discovery, PKCE, token exchange, session creation |
| Client-side sign-in trigger | Custom fetch to `/api/auth/sign-in/oauth2` | `authClient.signIn.oauth2({ providerId: 'okta', callbackURL: '/' })` from `genericOAuthClient()` | SDK handles redirect, state, CSRF |
| pg_dump execution | pg streaming queries | `execSync('pg_dump ...')` with postgresql-client-16 installed | Binary-compatible dump, handles schema, sequences, constraints |

---

## Common Pitfalls

### Pitfall 1: Okta Plugin Registered with Empty/Partial Config
**What goes wrong:** If `process.env.OKTA_CLIENT_ID` is the empty string `""` rather than undefined, `Boolean('')` is `false` but `if (process.env.OKTA_CLIENT_ID)` also evaluates false — both are safe. However, if the guard is `process.env.OKTA_CLIENT_ID !== undefined`, an empty string passes and the plugin registers with an empty `clientId`.
**How to avoid:** Use `if (process.env.OKTA_CLIENT_ID)` (truthy check), not `!== undefined`. Both blank and absent will evaluate to false.
**Warning signs:** `lib/auth.ts` compiles but login to `/api/auth/sign-in/oauth2` returns PROVIDER_CONFIG_NOT_FOUND error.

### Pitfall 2: login/page.tsx is 'use client' — No Server Env Access
**What goes wrong:** The file opens with `"use client"`. Attempting to read `process.env.OKTA_CLIENT_ID` directly inside the component will return `undefined` at runtime (client bundle does not have server env vars unless `NEXT_PUBLIC_*`).
**How to avoid:** Use the `/api/auth/providers` route approach OR refactor `app/login/page.tsx` into a server component wrapper + `LoginForm` client island. The server-wrapper pattern is cleaner.
**Warning signs:** Okta button always shown or always hidden regardless of env var.

### Pitfall 3: pg_dump Not in Worker Container
**What goes wrong:** `Dockerfile.local` uses `node:24.13.0-slim` which has no PostgreSQL client tools. `execSync('pg_dump ...')` throws `ENOENT` at runtime.
**How to avoid:** Add `postgresql-client-16` to `Dockerfile.local` apt-get install line. The postgres service in docker-compose.local.yml is `postgres:16-alpine` — the client version must match.
**Warning signs:** Backup job fails with `spawn pg_dump ENOENT` in BullMQ failed queue.

### Pitfall 4: UNIQUE Constraint on user_source_tokens Uses (user_id, source)
**What goes wrong:** Inserting a row for `user_id=session.user.id, source='gmail'` when `user_id='default', source='gmail'` already exists will NOT conflict — they are different `user_id` values. This is correct behavior. But if a developer mistakenly tries to `onConflictDoUpdate` on just `source`, it will fail because the constraint target is `(user_id, source)`.
**How to avoid:** Always use `target: [userSourceTokens.user_id, userSourceTokens.source]` in `onConflictDoUpdate` — exactly as the current gmail callback does on line 72.

### Pitfall 5: nextCookies() Must Remain Last in plugins Array
**What goes wrong:** Moving `nextCookies()` before `genericOAuth` in the plugins array breaks cookie setting in Server Actions.
**How to avoid:** Always append `nextCookies()` last: `plugins: [...oktaPlugins, nextCookies()]`.
**Source:** Existing comment in `lib/auth.ts` line 66.

### Pitfall 6: resolveRole() Checks Wrong Okta Group Name
**What goes wrong:** `lib/auth-utils.ts` line 28 currently checks `groups.includes("Admins")` but CONTEXT.md specifies the group is `panda-admins`.
**How to avoid:** Update `auth-utils.ts` to check `groups.includes("panda-admins")` (and update the adjacent comment).
**Warning signs:** All Okta users get `role: 'user'` even when in the `panda-admins` group.

### Pitfall 7: Health Endpoint Must Not Require Auth
**What goes wrong:** If `requireSession()` is accidentally called in the health route, load balancer health checks return 401 and the service is marked unhealthy.
**How to avoid:** No auth import in `app/api/health/route.ts`. Export `dynamic = 'force-dynamic'`.

### Pitfall 8: Backup Job Volume Availability
**What goes wrong:** `/root/.bigpanda-app/backups/` is inside the `app_settings` volume which is mounted to all three services (migrate, app, worker). The worker container DOES have this volume. But the backup files are large and grow over time — the Docker volume has no size limit.
**How to avoid:** Ensure the `mkdirSync(BACKUP_DIR, { recursive: true })` call is in the job, and document the backup location in `install/env.aws.example`. On AWS, the backup job writes to a local EFS mount or S3 — documented but not implemented in this phase.

---

## Code Examples

### Workstream 1: Per-User Token Migration

**Files to change:**
1. `app/api/oauth/gmail/callback/route.ts` line 63 — change `user_id: 'default'` to `user_id: session.user.id` (and line 72 in the `.set()` — no change needed there as it's only updating values, not the key).
2. `app/api/oauth/gmail/status/route.ts` lines 13-21 (GET) and lines 27-31 (DELETE) — query by `session.user.id` with 'default' fallback.
3. `app/api/oauth/slack/callback/route.ts` line 96 — change `user_id: 'default'` to `user_id: session.user.id` (requires threading `session` from `requireSession()`).
4. `app/api/oauth/slack/status/route.ts` lines 18-25 — query by `session.user.id` with 'default' fallback.
5. `app/api/discovery/scan/route.ts` line 164 — change to fetch by `session.user.id`, fallback to 'default'.

**Backward-compat read pattern (gmail status):**
```typescript
// Source: app/api/oauth/gmail/status/route.ts — modified pattern
export async function GET(): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  // Look up by real user_id first, fallback to 'default' for pre-migration tokens
  let [row] = await db
    .select({ email: userSourceTokens.email })
    .from(userSourceTokens)
    .where(and(eq(userSourceTokens.user_id, session!.user.id), eq(userSourceTokens.source, 'gmail')))
    .limit(1);

  if (!row) {
    [row] = await db
      .select({ email: userSourceTokens.email })
      .from(userSourceTokens)
      .where(and(eq(userSourceTokens.user_id, 'default'), eq(userSourceTokens.source, 'gmail')))
      .limit(1);
  }

  return Response.json({ connected: !!row, email: row?.email ?? null });
}
```

**Note on DELETE:** When disconnecting, only delete the real user's row, NOT the 'default' fallback row (other users may depend on it).

### Workstream 2: Okta Scaffold

**Client-side sign-in trigger (login page):**
```typescript
// app/lib/auth-client.ts — add genericOAuthClient to exports
import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/dist/client/plugins";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [genericOAuthClient()],
});
export const { signIn, signOut, useSession, getSession } = authClient;

// Usage in login page (when showOkta is true):
// authClient.signIn.oauth2({ providerId: 'okta', callbackURL: '/' })
```

**Server component wrapper pattern for login page:**
```tsx
// app/login/page.tsx — convert outer to RSC, pass prop to client island
// No 'use client' at top level
import { LoginForm } from './LoginForm';  // move existing client logic here

export default function LoginPage() {
  const showOkta = Boolean(process.env.OKTA_CLIENT_ID);
  return <LoginForm showOkta={showOkta} />;
}
```

```tsx
// app/login/LoginForm.tsx — new file, all existing client logic moves here
'use client';
// ... existing useState, handleSubmit etc ...
// Add: {showOkta && <OktaSignInButton />}
```

### Workstream 3: RBAC Audit — Result

**Finding (HIGH confidence — verified by grep):**
All 57 route files under `app/api/projects/[projectId]/` use `requireProjectRole`. Zero gaps found.

```bash
# Verification command run during research:
# find "app/api/projects/[projectId]/" -name "route.ts" | xargs grep -l "requireProjectRole" | wc -l
# Result: 57 (matches total file count)
```

The RBAC audit wave is a VERIFY task, not a FIX task. The plan should include a CI-runnable check (grep assertion) to surface any future regressions.

### Workstream 4: AWS Scaffold Files

**`install/env.aws.example` — critical env vars to document:**
```
# Database (RDS PostgreSQL 16)
DATABASE_URL=postgresql://postgres:PASSWORD@your-rds-endpoint.rds.amazonaws.com:5432/bigpanda_app

# Redis (ElastiCache Redis 7)
REDIS_URL=redis://your-elasticache-endpoint.cache.amazonaws.com:6379

# Application
BETTER_AUTH_URL=https://your-production-domain.com
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Google OAuth (use production domain for redirect URIs)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-production-domain.com/api/oauth/gmail/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://your-production-domain.com/api/oauth/calendar/callback

# Slack OAuth
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=https://your-production-domain.com/api/oauth/slack/callback

# Okta SSO (leave blank until Okta migration; set these to activate)
OKTA_DOMAIN=https://dev-xxxxx.okta.com/oauth2/default
OKTA_CLIENT_ID=
OKTA_CLIENT_SECRET=
OKTA_REDIRECT_URI=https://your-production-domain.com/api/auth/callback/okta

# AI
ANTHROPIC_API_KEY=...
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single global `user_id='default'` | Per-user `session.user.id` with 'default' fallback | Phase 86 | Multiple PMs can connect their own Gmail/Slack |
| No OIDC support | better-auth `genericOAuth` + first-class `okta()` provider | better-auth 1.5.6 (installed) | Okta can be activated by populating 4 env vars |
| Manual shell script backup (`panda-backup.sh`) | BullMQ cron job with retry, lock, and status reporting | Phase 86 | Backup is app-managed, observable in Settings UI |

**Deprecated/outdated:**
- `panda-backup.sh`: Not removed, but the BullMQ job becomes the canonical backup mechanism for Docker. The shell script remains useful for manual ad-hoc backups.
- `groups.includes("Admins")` in `auth-utils.ts`: Must be changed to `"panda-admins"` before Okta activation. Change is safe to make now (dormant code path).

---

## Open Questions

1. **OKTA_REDIRECT_URI format for genericOAuth**
   - What we know: better-auth's `genericOAuth` plugin handles OIDC callbacks internally via the `/api/auth/[...all]` catch-all. The OAuth redirect URI registered in Okta app config must match what better-auth expects.
   - What's unclear: The exact callback path that `genericOAuth` uses for the `okta` providerId. It is likely `/api/auth/callback/okta` (standard better-auth pattern) but this must be verified by reading the plugin's endpoint registration.
   - Recommendation: Check `node_modules/better-auth/dist/plugins/generic-oauth/index.mjs` for the callback path pattern before documenting `OKTA_REDIRECT_URI` in `env.aws.example`.

2. **pg_dump in AWS ECS**
   - What we know: On AWS, the postgres is RDS — not a Docker container. `pg_dump` with `DATABASE_URL` pointing to an RDS endpoint works identically to local Docker.
   - What's unclear: Where backup files are written on ECS Fargate (no persistent local volume). The CONTEXT says "RDS automated backups enabled via Terraform/CDK" for AWS — the BullMQ job is for local Docker only.
   - Recommendation: The BullMQ backup job should check if it's running in an AWS context (e.g., check for an `AWS_ECS_CLUSTER` env var) and skip gracefully — on AWS, RDS handles backups.

3. **Backup status in Settings UI**
   - What we know: The CONTEXT asks for "last backup timestamp, size" in Settings (admin only).
   - What's unclear: Whether to read the backup directory via `fs.readdirSync` in a new `/api/settings/backup-status/route.ts` or add a `backup_status` field to the global settings.json.
   - Recommendation: New route `app/api/settings/backup-status/route.ts` that reads `/root/.bigpanda-app/backups/` directory, finds the most recent file, and returns `{ lastBackup: string | null, size: number | null }`. Simpler than writing to settings.json.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (config at `vitest.config.ts`) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/auth/` or `npx vitest run lib/__tests__/` |
| Full suite command | `npx vitest run` |

### Dormancy Contract — Primary Validation Goal

The hardest requirement to test is: "with `OKTA_CLIENT_ID` blank, behavior is byte-for-byte identical to pre-Phase-86."

**Observable proof points (all must pass when `OKTA_CLIENT_ID` is unset):**

| Test ID | Behavior | Test Type | Automated Command | Notes |
|---------|----------|-----------|-------------------|-------|
| DORM-01 | `lib/auth.ts` does not call `genericOAuth()` when `OKTA_CLIENT_ID` is falsy | Unit | Source-scan: `fs.readFileSync('lib/auth.ts')` asserts conditional guard pattern | Wave 0 RED gate |
| DORM-02 | Login page does not render "Sign in with Okta" button when `OKTA_CLIENT_ID` is unset | Unit | Source-scan: `LoginForm.tsx` does not contain hardcoded Okta button; test mounts with `showOkta=false` and asserts button absent | Wave 0 RED gate |
| DORM-03 | `GET /api/auth/providers` returns `{ okta: false }` when env var blank | Integration (route mock) | vitest route test with `process.env.OKTA_CLIENT_ID = ''` | Wave 2 |
| DORM-04 | `POST /api/auth/sign-in/oauth2` returns 404/error when Okta not registered | Integration | Mock test asserting the endpoint behavior is not PROVIDER_FOUND | Wave 2 |

### Per-User Token Isolation — Validation

| Test ID | Behavior | Test Type | Automated Command | Notes |
|---------|----------|-----------|-------------------|-------|
| TOKEN-01 | Gmail callback writes `user_id = session.user.id` (not 'default') | Unit | Mock `requireSession` returning `user.id = 'user-abc'`; assert DB insert called with `user_id: 'user-abc'` | Wave 2 |
| TOKEN-02 | Gmail status returns row for requesting user, NOT another user's row | Unit | Mock DB returns row for 'user-abc'; mock session is 'user-xyz'; assert `{ connected: false }` | Wave 2 |
| TOKEN-03 | Scan route passes only requesting user's tokens to `runDiscoveryScan` | Unit | Mock session `user.id = 'user-abc'`; DB has tokens for 'default' and 'user-abc'; assert `userTokens` passed to scanner contains only 'user-abc' token (or 'default' fallback if none) | Wave 2 |
| TOKEN-04 | Fallback works: if no row for real user_id, 'default' tokens used | Unit | DB has only `user_id='default'` row; session is `user.id = 'user-abc'`; assert 'default' token is returned | Wave 2 |

### Backup Job — Validation

| Test ID | Behavior | Test Type | Automated Command | Notes |
|---------|----------|-----------|-------------------|-------|
| BACKUP-01 | `pg_dump` command is executed with `DATABASE_URL` | Unit | Mock `execSync`; assert it's called with string containing `pg_dump` and `DATABASE_URL` env var | Wave 2 |
| BACKUP-02 | Today-skip logic: if backup file for today exists, job returns `skipped-today` | Unit | Mock `readdirSync` to return `['backup-2026-05-15_...sql']`; assert return value is `{ status: 'skipped-today' }` | Wave 2 |
| BACKUP-03 | Retention pruning: files older than 30 days are deleted | Unit | Mock `readdirSync` + `statSync` with old mtime; assert `unlinkSync` called for old files | Wave 2 |
| BACKUP-04 | `pg_dump` produces restorable dump (manual-only) | Manual | Trigger job manually, run `psql < backup-*.sql` into test DB, verify tables present | Pre-verify gate |

### Health Endpoint — Validation

| Test ID | Behavior | Test Type | Automated Command | Notes |
|---------|----------|-----------|-------------------|-------|
| HEALTH-01 | Returns 200 with `{ db: 'ok', redis: 'ok' }` when both services up | Integration | Mock postgres and ioredis to resolve; assert 200 | Wave 2 |
| HEALTH-02 | Returns 503 with `{ db: 'error', redis: 'ok' }` when DB down | Integration | Mock postgres to throw; assert 503, `db: 'error'` | Wave 2 |
| HEALTH-03 | Returns 503 with `{ db: 'ok', redis: 'error' }` when Redis down | Integration | Mock ioredis to throw; assert 503, `redis: 'error'` | Wave 2 |
| HEALTH-04 | Route does not call `requireSession` | Unit | Source-scan: `fs.readFileSync('app/api/health/route.ts')` asserts no `requireSession` import | Wave 0 RED gate |

### RBAC Coverage — Validation

| Test ID | Behavior | Test Type | Automated Command | Notes |
|---------|----------|-----------|-------------------|-------|
| RBAC-01 | All 57 project-scoped routes use `requireProjectRole` | Static analysis | `find app/api/projects/\[projectId\]/ -name "route.ts" | xargs grep -L "requireProjectRole" | wc -l` asserts `0` | Wave 0 (already passing — regression gate) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/auth/ tests/api/health/ lib/__tests__/` (new test files only)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/auth/okta-dormancy.test.ts` — covers DORM-01, DORM-02, DORM-03, DORM-04
- [ ] `tests/api/per-user-tokens.test.ts` — covers TOKEN-01 through TOKEN-04
- [ ] `tests/api/health.test.ts` — covers HEALTH-01 through HEALTH-04
- [ ] `worker/jobs/__tests__/db-backup.test.ts` — covers BACKUP-01 through BACKUP-03
- [ ] `tests/api/rbac-coverage.test.ts` — covers RBAC-01 (static analysis, likely immediately GREEN)

---

## RBAC Audit Punch List

**Finding: No gaps.** All 57 project-scoped routes under `app/api/projects/[projectId]/` use `requireProjectRole`. Verified by:
```bash
find app/api/projects/[projectId]/ -name "route.ts" | xargs grep -l "requireProjectRole" | wc -l
# → 57 (matches total)
```

The routes that initially appeared as gaps (`chat/route.ts`, `completeness/route.ts`) were false positives — they appeared in the `requireSession`-only grep because they contain BOTH `requireSession` AND `requireProjectRole` (the latter appears via `requireProjectRole` which calls `requireSession` internally, and both names appear in the file).

**Recommendation:** The RBAC wave should be a one-plan verification task (run the grep assertion, commit proof), not a multi-plan fix effort.

---

## Sources

### Primary (HIGH confidence — live codebase)
- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/auth.ts` — current auth config, plugins array pattern
- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/auth-utils.ts` — resolveRole, group name mismatch found
- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/auth-server.ts` — requireSession + requireProjectRole implementation
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/oauth/gmail/callback/route.ts` — `user_id: 'default'` confirmed at line 63
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/oauth/gmail/status/route.ts` — 'default' hardcoded on both GET and DELETE
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/oauth/slack/callback/route.ts` — `user_id: 'default'` at line 96
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/oauth/slack/status/route.ts` — 'default' hardcoded
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/discovery/scan/route.ts` — `user_id: 'default'` at line 164
- `/Users/jmiloslavsky/Documents/Panda-Manager/worker/index.ts` — JOB_HANDLERS pattern, startup flow
- `/Users/jmiloslavsky/Documents/Panda-Manager/worker/scheduler.ts` — jobQueue, upsertJobScheduler pattern
- `/Users/jmiloslavsky/Documents/Panda-Manager/worker/connection.ts` — createRedisConnection, createApiRedisConnection
- `/Users/jmiloslavsky/Documents/Panda-Manager/worker/lock-ids.ts` — next ID available: 1010
- `/Users/jmiloslavsky/Documents/Panda-Manager/install/docker-compose.local.yml` — volume mounts, service structure
- `/Users/jmiloslavsky/Documents/Panda-Manager/install/Dockerfile.local` — `node:24.13.0-slim`, only `curl` installed (no pg_dump)
- `/Users/jmiloslavsky/Documents/Panda-Manager/db/schema.ts` lines 700-714 — userSourceTokens schema
- `/Users/jmiloslavsky/Documents/Panda-Manager/db/migrations/0001_initial.sql` lines 1650-1654 — UNIQUE(user_id, source) constraint confirmed
- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/source-adapters/index.ts` — resolveAdapter, gmail/slack priority
- `/Users/jmiloslavsky/Documents/Panda-Manager/node_modules/better-auth/dist/plugins/generic-oauth/providers/okta.mjs` — first-class `okta()` provider confirmed, uses `issuer` param
- `/Users/jmiloslavsky/Documents/Panda-Manager/node_modules/better-auth/dist/plugins/generic-oauth/providers/okta.d.mts` — OktaOptions interface: `issuer`, `clientId`, `clientSecret`, `redirectURI`
- `/Users/jmiloslavsky/Documents/Panda-Manager/node_modules/better-auth/dist/plugins/generic-oauth/client.d.mts` — genericOAuthClient confirmed
- `~/bin/panda-backup.sh` — backup script logic (today-skip, 30-day retention, pg_dump pattern)
- RBAC grep: all 57 project-scoped routes have `requireProjectRole` — no gaps

### Secondary (MEDIUM confidence)
- better-auth 1.5.6 `package.json` — version confirmed as installed
- BullMQ 5.71.0 `jobQueue.upsertJobScheduler` pattern — confirmed in `worker/scheduler.ts`

### Tertiary (LOW confidence)
- Okta OIDC callback path (`/api/auth/callback/okta`) — inferred from better-auth convention; should be verified by checking plugin endpoint registration source before documenting `OKTA_REDIRECT_URI`

---

## Metadata

**Confidence breakdown:**
- Per-user token migration: HIGH — exact line numbers and file paths confirmed in live code
- Okta scaffold: HIGH — `okta()` provider confirmed in installed node_modules; dormancy pattern is standard TypeScript conditional
- BullMQ backup job: HIGH — job handler pattern well-established; pg_dump gap confirmed by `which pg_dump` returning empty in running worker container
- Health endpoint: HIGH — no existing health route, straightforward implementation
- RBAC audit: HIGH — grepped all 57 files, zero gaps found

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (stable stack; better-auth version locked in package.json)
