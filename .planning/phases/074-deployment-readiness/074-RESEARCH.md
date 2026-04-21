# Phase 74: Deployment Readiness - Research

**Researched:** 2026-04-20
**Domain:** Next.js 16 production deployment with PostgreSQL, Redis, and BullMQ worker processes
**Confidence:** HIGH

## Summary

Phase 74 makes the BigPanda Project Assistant deployable to any hosted environment using environment variables for all configuration. The application currently uses `.env.local` for development and has several hardcoded localhost fallbacks that must be replaced with production-ready configuration.

The research confirms a standard deployment pattern: Next.js standalone output in Docker, multi-process management (Next.js + BullMQ worker), PostgreSQL and Redis as external services, and environment-variable-driven configuration. The codebase already follows most best practices but needs 3-4 specific changes: remove localhost fallbacks, add NEXT_PUBLIC_BASE_URL, ensure production env loader compatibility, and document the complete configuration surface.

**Primary recommendation:** Use Next.js standalone Docker output with PM2 or Docker Compose for multi-process management, document all 12 required environment variables, and create deployment guide covering database initialization, first-run steps, and production checklist.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | App can be configured for a hosted environment via environment variables alone — no hardcoded localhost references, paths, or secrets | Next.js environment variable system supports full runtime configuration; identified 3 files with localhost fallbacks requiring replacement |
| DEPLOY-02 | A deployment guide exists documenting the environment variables, PostgreSQL + Redis dependencies, and how to run in production | Next.js standalone output pattern, PM2 ecosystem file for multi-process orchestration, and Drizzle migration workflow provide complete deployment story |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.0 | Application framework | Built-in standalone output mode generates minimal production bundle with only necessary files |
| Node.js | 24.13.0-slim | Runtime | LTS release with glibc compatibility (Alpine's musl can break native binaries); slim variant balances size vs compatibility |
| PostgreSQL | 14+ | Primary database | Connection via DATABASE_URL environment variable; requires pg_trgm extension for fuzzy matching (Phase 73.1) |
| Redis | 7.2.4+ | Cache + BullMQ backend | Connection via REDIS_URL; maxRetriesPerRequest: null required for BullMQ worker (ioredis config) |
| BullMQ | 5.71.0 | Background job queue | Separate worker process; requires dedicated Redis connection (cannot share with Queue clients) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| better-auth | 1.5.6 | Authentication | Requires BETTER_AUTH_URL (production domain) and BETTER_AUTH_SECRET (32+ char high-entropy key) |
| Drizzle ORM | 0.45.1 | Database migrations | drizzle-kit migrate applies schema changes; requires DATABASE_URL |
| PM2 | 5.x | Process manager | Run Next.js + worker as supervised processes; ecosystem.config.js defines multi-process setup |
| Docker | 24+ | Containerization | Multi-stage build with standalone output; non-root user execution for security |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PM2 | systemd | PM2 provides process clustering and hot reload; systemd better for single-process services |
| Docker standalone | Kubernetes | Standalone deployment simpler for small team; K8s adds orchestration complexity |
| .env.production | Runtime injection | .env files baked into build; runtime injection via orchestrator more flexible for multi-environment promotion |

**Installation:**
```bash
npm install --production
npm run build
```

## Architecture Patterns

### Recommended Project Structure
```
bigpanda-app/
├── .env.example           # Template of all required env vars
├── ecosystem.config.js    # PM2 multi-process configuration
├── Dockerfile            # Multi-stage build for production
├── docker-compose.yml    # Local stack (PostgreSQL + Redis + App)
├── db/
│   └── migrations/       # Drizzle SQL migrations (apply before first run)
├── worker/
│   ├── index.ts          # BullMQ worker entrypoint
│   └── env-loader.ts     # Loads .env into process.env (dev) — production uses injected vars
└── scripts/
    └── run-migrations.ts # One-time migration runner for initial deployment
```

### Pattern 1: Environment Variable Loading
**What:** Next.js loads .env files automatically; worker process needs explicit loader
**When to use:** Development uses .env.local; production injects vars via orchestrator (Docker ENV, systemd EnvironmentFile)
**Example:**
```typescript
// Source: bigpanda-app/worker/env-loader.ts (current)
// Development: worker imports env-loader.ts first to read .env.local
// Production: env-loader.ts gracefully fails, worker uses process.env from shell
import './env-loader';  // MUST be first import

// Source: Next.js official docs
// Next.js automatically loads .env* files into process.env
// Priority: process.env > .env.$(NODE_ENV).local > .env.local > .env.$(NODE_ENV) > .env
```

### Pattern 2: Multi-Process Orchestration
**What:** Next.js server + BullMQ worker run as separate processes sharing database and Redis
**When to use:** Any deployment with background jobs (skills, scheduled tasks, ingestion)
**Example:**
```javascript
// Source: PM2 ecosystem pattern
module.exports = {
  apps: [
    {
      name: 'nextjs',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'worker',
      script: 'node',
      args: './worker/index.js',  // Compiled from worker/index.ts
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### Pattern 3: Standalone Output Docker Build
**What:** Next.js output: "standalone" generates minimal .next/standalone directory with only essential files
**When to use:** Docker deployments; reduces image size and attack surface
**Example:**
```typescript
// Source: next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",  // Enables file tracing for minimal bundle
};

// Source: Next.js with-docker example Dockerfile
# Stage 3: Runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
CMD ["node", "server.js"]  # Standalone server entrypoint
```

### Pattern 4: Database Migration on Deployment
**What:** Apply Drizzle migrations before starting application (idempotent, safe to re-run)
**When to use:** First deployment and every deployment with schema changes
**Example:**
```bash
# Source: Drizzle ORM best practices
# Run migrations as separate step before app startup
npx drizzle-kit migrate

# Or in Dockerfile entrypoint script:
#!/bin/sh
node scripts/run-migrations.js && node server.js
```

### Anti-Patterns to Avoid
- **Hardcoded localhost fallbacks in production code:** Use environment variables with NO defaults for production-required config (DATABASE_URL, REDIS_URL)
- **Sharing Redis connection between Queue and Worker:** BullMQ requires separate connections (maxRetriesPerRequest settings differ)
- **Baking secrets into Docker image:** Always inject via environment at runtime, never COPY .env into image
- **Running migrations manually:** Automate migration application in deployment pipeline (idempotent operations)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Process management | Custom respawn script | PM2 or Docker restart policy | PM2 handles clustering, graceful reload, logs; Docker provides restart strategies (on-failure, unless-stopped) |
| Environment variable validation | Manual checks | Zod schema at startup | Type-safe validation, clear error messages, fails fast before accepting traffic |
| Secret generation | Math.random() | openssl rand -base64 32 | Cryptographically secure randomness required for BETTER_AUTH_SECRET |
| Database connection pooling | Manual pool management | postgres library built-in | Handles max connections, idle timeout, connection lifecycle |
| Zero-downtime deployment | Custom blue-green logic | PM2 reload or orchestrator rolling update | PM2 reload keeps old process until new one is healthy; orchestrators handle traffic shifting |

**Key insight:** Deployment infrastructure is well-trodden ground. Use battle-tested tools (PM2, Docker, standard env vars) rather than custom solutions that miss edge cases (process crashes, connection pool exhaustion, secret rotation).

## Common Pitfalls

### Pitfall 1: Environment Variable Not Loaded in Worker Process
**What goes wrong:** Worker crashes with "DATABASE_URL is undefined" even though .env.local exists
**Why it happens:** Next.js auto-loads .env files; worker is separate Node.js process and doesn't inherit this behavior
**How to avoid:** Worker must explicitly load environment (dev: env-loader.ts; production: injected via process manager)
**Warning signs:** Worker logs "undefined" for env vars; Next.js API routes work but background jobs fail

### Pitfall 2: NEXT_PUBLIC_ Variables Not Updated Between Environments
**What goes wrong:** Production app makes API calls to http://localhost:3000 or staging environment
**Why it happens:** NEXT_PUBLIC_ vars are inlined at build time; building once and promoting across environments bakes wrong values
**How to avoid:** Either rebuild per environment OR use server-side env vars only (no NEXT_PUBLIC_ for base URL if possible)
**Warning signs:** Browser console shows CORS errors to wrong domain; invite emails contain wrong callback URLs

### Pitfall 3: BullMQ Worker Silent Failure with Shared Redis Connection
**What goes wrong:** Jobs enqueue successfully but never process; no error logs
**Why it happens:** maxRetriesPerRequest: null required for Worker; default value causes EXECABORT errors that are swallowed
**How to avoid:** Always use createRedisConnection() for Worker (has maxRetriesPerRequest: null), separate function for Queue clients
**Warning signs:** Jobs stuck in "waiting" state indefinitely; Redis connection count lower than expected

### Pitfall 4: Database Migrations Not Applied Before First Request
**What goes wrong:** Application starts but crashes on first database query with "relation does not exist"
**Why it happens:** Fresh database has no schema; migrations must run before application starts accepting traffic
**How to avoid:** Add migration step to Dockerfile ENTRYPOINT or deployment script; ensure idempotency so safe to re-run
**Warning signs:** PostgreSQL "relation 'users' does not exist" errors; app works locally but fails in production

### Pitfall 5: Missing PostgreSQL Extensions in Hosted Environment
**What goes wrong:** Ingestion change detection (Phase 73.1 Pass 5) fails with "pg_trgm extension not found"
**Why it happens:** Managed PostgreSQL may not have extensions enabled by default; requires explicit installation
**How to avoid:** Document extension requirements in deployment guide; include CREATE EXTENSION IF NOT EXISTS in migrations
**Warning signs:** Fuzzy matching queries fail; document extraction completes but change detection is skipped

## Code Examples

Verified patterns from official sources:

### Environment Variable Configuration
```typescript
// Source: bigpanda-app/db/index.ts
const connection = globalThis.__pgConnection ?? postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

// Source: bigpanda-app/worker/connection.ts
export function createRedisConnection(): Redis {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';  // ← NEEDS REMOVAL
  return new Redis(url, {
    maxRetriesPerRequest: null,  // REQUIRED for BullMQ Worker
    enableReadyCheck: false,
  });
}

// Source: bigpanda-app/lib/auth.ts
export const auth = betterAuth({
  // Reads BETTER_AUTH_URL and BETTER_AUTH_SECRET from process.env
  database: drizzleAdapter(db, { provider: "pg", usePlural: true, schema }),
  emailAndPassword: { enabled: true, disableSignUp: true },
});
```

### Docker Multi-Stage Build
```dockerfile
# Source: Next.js with-docker example (https://github.com/vercel/next.js/tree/canary/examples/with-docker)
ARG NODE_VERSION=24.13.0-slim
FROM node:${NODE_VERSION} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### PM2 Ecosystem Configuration
```javascript
// Source: PM2 documentation pattern
module.exports = {
  apps: [
    {
      name: 'bigpanda-next',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'bigpanda-worker',
      script: 'node',
      args: './dist/worker/index.js',  // Transpiled output
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

### Environment Variable Validation
```typescript
// Source: Next.js deployment best practices
// Add to server startup (pages/api or app/api route)
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email(),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
});

// Validate on startup
envSchema.parse(process.env);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual .env file management | @next/env package for consistent loading | Next.js 9.4.0 (2020) | Standardized env var loading across frameworks |
| Alpine Linux base images | node:slim (Debian-based) | Docker best practices 2023+ | Better npm package compatibility (glibc vs musl) |
| Custom worker spawn scripts | BullMQ Worker class with ioredis | BullMQ 1.0+ (2021) | Proper Redis connection management, retry handling |
| Heroku-style 12-factor .env | Runtime env injection via orchestrator | Containerization era (2020+) | Single build artifact promoted across environments |
| Database schema in version control only | Migration files + Drizzle Kit | Drizzle ORM 0.20+ (2023) | Declarative schema with automated migration generation |

**Deprecated/outdated:**
- next export for static sites: Replaced by output: "export" in next.config (Next.js 13+)
- Custom server (server.js with express): Next.js standalone output renders this obsolete for most use cases
- Dotenv library: Next.js built-in .env loading sufficient; @next/env for non-Next contexts

## Open Questions

1. **TLS/SSL for PostgreSQL and Redis connections**
   - What we know: DATABASE_URL and REDIS_URL support connection strings with SSL parameters
   - What's unclear: Whether managed services (RDS, ElastiCache, Render, Railway) require explicit SSL config or handle via connection string
   - Recommendation: Document both approaches in deployment guide; connection string with ?sslmode=require for PostgreSQL, rediss:// protocol for Redis

2. **Horizontal scaling: Multiple worker instances**
   - What we know: BullMQ supports multiple workers processing same queue; Redis advisory locks prevent duplicate scheduled job execution
   - What's unclear: Whether current implementation is safe for N worker instances or requires single-instance constraint
   - Recommendation: Test with instances: 2 in PM2 config; verify advisory locks in worker/scheduler.ts prevent duplicate cron triggers

3. **Health check endpoints for orchestrators**
   - What we know: Next.js app has no explicit /health route; orchestrators need HTTP 200 to confirm readiness
   - What's unclear: Whether Next.js built-in health check (responds to any route once ready) is sufficient or needs dedicated endpoint
   - Recommendation: Add GET /api/health route returning database + Redis connectivity status for proper orchestrator integration

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npm test -- --run --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | App starts with env vars only (no localhost fallbacks) | integration | `npm test tests/deployment/env-config.test.ts -x` | ❌ Wave 0 |
| DEPLOY-01 | All localhost fallbacks removed from production code | unit | `npm test tests/deployment/no-hardcoded-urls.test.ts -x` | ❌ Wave 0 |
| DEPLOY-02 | .env.example lists all required variables | unit | `npm test tests/deployment/env-example-complete.test.ts -x` | ❌ Wave 0 |
| DEPLOY-02 | Deployment guide exists and is non-empty | smoke | `test -f DEPLOYMENT.md && [ $(wc -l < DEPLOYMENT.md) -gt 50 ]` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test tests/deployment/ --run` (deployment tests only, < 10s)
- **Per wave merge:** `npm test --run` (full suite)
- **Phase gate:** Full suite green + manual deployment to test environment before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/deployment/env-config.test.ts` — covers DEPLOY-01 (simulates production env, verifies no localhost usage)
- [ ] `tests/deployment/no-hardcoded-urls.test.ts` — covers DEPLOY-01 (grep test for localhost in non-test code)
- [ ] `tests/deployment/env-example-complete.test.ts` — covers DEPLOY-02 (compares .env.example keys against actual usage)
- [ ] Framework install: Already present (Vitest 4.1.1 configured)

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.4 official docs: Deployment (https://nextjs.org/docs/app/building-your-application/deploying) - Standalone output, Docker patterns, environment variables
- Next.js 16.2.4 official docs: Environment Variables (https://nextjs.org/docs/app/guides/environment-variables) - Loading order, NEXT_PUBLIC_ behavior, runtime vs build-time
- Next.js with-docker example (https://github.com/vercel/next.js/tree/canary/examples/with-docker) - Multi-stage Dockerfile, node:slim selection, standalone output usage
- BullMQ official docs: Connections (https://docs.bullmq.io/guide/connections) - maxRetriesPerRequest requirement, connection pooling, Worker-specific config
- better-auth official docs: Installation (https://www.better-auth.com/docs/installation) - BETTER_AUTH_URL and BETTER_AUTH_SECRET requirements, secret generation
- PostgreSQL 18 official docs: Environment Variables (https://www.postgresql.org/docs/current/libpq-envars.html) - Standard env vars, SSL configuration
- Drizzle ORM official docs: Migrations (https://orm.drizzle.team/docs/migrations) - Production migration patterns, drizzle-kit commands

### Secondary (MEDIUM confidence)
- Codebase inspection: bigpanda-app/worker/connection.ts, db/index.ts, lib/auth.ts, lib/email.ts - Current environment variable usage patterns
- Codebase inspection: .env.local file - Current development configuration (12 variables identified)
- PM2 GitHub repository - Multi-process management patterns, ecosystem file structure

### Tertiary (LOW confidence)
- None — all findings verified with official documentation or source code inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Next.js standalone output, PostgreSQL/Redis connection patterns, BullMQ configuration all verified in official docs
- Architecture: HIGH - Docker multi-stage build, PM2 ecosystem file, Drizzle migrations all have canonical examples in official sources
- Pitfalls: MEDIUM-HIGH - BullMQ connection issue verified in docs; other pitfalls inferred from Next.js deployment patterns and codebase inspection

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days - stable deployment patterns, frameworks at mature versions)
