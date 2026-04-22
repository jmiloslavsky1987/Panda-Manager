# BigPanda Project Assistant — Deployment Guide

This guide covers deploying the BigPanda Project Assistant application to a production environment. Assumes a fresh checkout of the repository.

**Stack:** Next.js 16, PostgreSQL 14+, Redis 7.2+, BullMQ, better-auth, Drizzle ORM

**Multi-process architecture:** Next.js server (port 3000) + BullMQ worker (background jobs)

---

## Prerequisites

### Required Software

| Component | Minimum Version | Purpose |
|-----------|----------------|---------|
| Node.js | 24.13.0 | Runtime for Next.js and BullMQ worker |
| PostgreSQL | 14+ | Primary database |
| Redis | 7.2+ | BullMQ job queue and caching |
| npm | 10+ | Package management |

### PostgreSQL Extensions

The application requires the `pg_trgm` extension for fuzzy entity matching (Phase 73.1 change detection). This must be enabled before running migrations:

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

If using a managed PostgreSQL service (AWS RDS, Render, Railway), ensure extensions can be created. Some providers require admin privileges or pre-approval.

---

## Environment Variables

Copy `.env.example` to `.env.production` and populate all values:

```bash
cp .env.example .env.production
```

### Required Variables (12 total)

#### Core Configuration

**DATABASE_URL** (required)
- PostgreSQL connection string
- Format: `postgresql://user:password@host:port/database`
- Example: `postgresql://postgres:password@db.company.com:5432/bigpanda_app`
- Ensure pg_trgm extension is enabled (see Prerequisites)

**REDIS_URL** (required)
- Redis connection string
- Format: `redis://host:port` or `rediss://host:port` (SSL)
- Example: `redis://redis.company.com:6379`
- BullMQ worker will fail fast if not set (no localhost fallback)

**ANTHROPIC_API_KEY** (required)
- Claude API key for 15 AI skills
- Obtain from: https://console.anthropic.com/settings/keys
- Format: `sk-ant-api03-...`

#### Authentication

**BETTER_AUTH_URL** (required)
- Full production URL for auth callbacks (NO trailing slash)
- Example: `https://bigpanda-app.company.com`
- Used in invite emails — must match actual domain
- Invite emails will fail if not set (no localhost fallback)

**BETTER_AUTH_SECRET** (required)
- High-entropy secret for session signing (32+ characters)
- Generate with: `openssl rand -base64 32`
- Example output: `dGhpcyBpcyBhIHNlY3JldCBrZXkgZm9yIGJldHRlci1hdXRo`
- Change from development default immediately

#### Client-Side Configuration

**NEXT_PUBLIC_BASE_URL** (optional)
- Base URL for client-side absolute URL construction
- Falls back to `window.location.origin` if not set
- Only needed if SSR contexts require absolute URLs
- Example: `https://bigpanda-app.company.com`

#### SMTP (for invite emails)

**SMTP_HOST** (required)
- Email server hostname
- Example: `smtp.gmail.com`

**SMTP_PORT** (required)
- Email server port
- Example: `587` (TLS) or `465` (SSL)

**SMTP_USER** (required)
- SMTP authentication username
- Example: `notifications@company.com`

**SMTP_PASS** (required)
- SMTP authentication password
- For Gmail: use App Password (not account password)

**SMTP_FROM** (required)
- From address for invite emails
- Example: `notifications@company.com`

#### Runtime

**NODE_ENV** (required)
- Set to `production` in deployed environments
- Disables Next.js development features

---

## Database Setup

### 1. Create Database

```bash
# Connect to PostgreSQL as admin user
psql -h your-db-host -U postgres

# Create database
CREATE DATABASE bigpanda_app;

# Enable required extension
\c bigpanda_app
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 2. Run Migrations

Drizzle migrations are idempotent (safe to re-run):

```bash
cd /path/to/Panda-Manager

# Install dependencies
npm ci --production

# Run migrations (reads DATABASE_URL from environment)
npx drizzle-kit migrate
```

**Verify migration success:**
```bash
psql $DATABASE_URL -c "\dx pg_trgm"
# Should show: pg_trgm | 1.6 | public | ...

psql $DATABASE_URL -c "\dt" | head -20
# Should list 30+ tables (users, projects, actions, risks, etc.)
```

---

## Build & Deploy

### Build Application

```bash
cd /path/to/Panda-Manager

# Install all dependencies (including devDependencies for build)
npm ci

# Build Next.js with standalone output
npm run build
```

**Verify standalone output:**
```bash
ls -la .next/standalone
# Should contain: node_modules/, server.js, package.json
```

### Worker Transpilation

The BullMQ worker is written in TypeScript and must be compiled before production use:

```bash
# Transpile worker TypeScript to JavaScript
npx tsc --project tsconfig.json --outDir dist worker/index.ts

# Verify compiled output exists
ls dist/worker/index.js
```

**Note:** During development, the worker runs via `tsx` (no compilation needed). In production, always run the compiled `dist/worker/index.js`.

### Deployment Options

Choose **one** of the following deployment methods:

---

#### Option A: Docker Deployment (Recommended for teams)

**Build Docker image:**
```bash
cd /path/to/Panda-Manager
docker build -t bigpanda-app:latest .
```

**Run Next.js container:**
```bash
docker run -d \
  --name bigpanda-next \
  -p 3000:3000 \
  --env-file .env.production \
  bigpanda-app:latest
```

**Run BullMQ worker (separate container):**

The Dockerfile targets the Next.js server only. The worker requires a separate process. Build a worker image or override the entrypoint:

```bash
# Option 1: Override entrypoint on the same image
docker run -d \
  --name bigpanda-worker \
  --env-file .env.production \
  bigpanda-app:latest \
  node dist/worker/index.js

# Option 2: Use docker-compose (see docker-compose.yml for reference)
docker compose up -d
```

**Important:** The `docker-compose.yml` in this repository is configured for **local development** with bundled PostgreSQL and Redis. For production, use external managed services (RDS, ElastiCache, etc.) and pass `DATABASE_URL` and `REDIS_URL` via `--env-file`.

---

#### Option B: PM2 Process Manager (Recommended for single-server deployments)

**Install PM2 globally:**
```bash
npm install -g pm2
```

**Transpile worker (if not already done):**
```bash
cd /path/to/Panda-Manager
npx tsc --project tsconfig.json --outDir dist worker/index.ts
```

**Set environment and start both processes:**
```bash
# Load environment variables
export $(grep -v '^#' .env.production | xargs)

# Start Next.js + worker with PM2
pm2 start ecosystem.config.js

# Verify both processes running
pm2 list
# Should show: bigpanda-next (online), bigpanda-worker (online)

# View logs
pm2 logs
```

**PM2 management commands:**
```bash
pm2 reload ecosystem.config.js   # Zero-downtime reload
pm2 stop ecosystem.config.js     # Stop both processes
pm2 restart ecosystem.config.js  # Restart both processes
pm2 delete ecosystem.config.js   # Remove from PM2
pm2 save                         # Persist process list across reboots
pm2 startup                      # Generate startup script
```

---

## Process Management

### Multi-Process Architecture

The application requires **two separate processes** running simultaneously:

1. **Next.js Server** (port 3000)
   - Handles all HTTP requests
   - SSR and API routes
   - Started with: `node .next/standalone/server.js` (standalone) or `next start`
   - Managed by `ecosystem.config.js` process `bigpanda-next`

2. **BullMQ Worker** (background, no HTTP port)
   - Processes job queue: AI skills, extraction pipeline, scheduled tasks
   - Connects to the same Redis instance as Next.js
   - Started with: `node dist/worker/index.js`
   - Managed by `ecosystem.config.js` process `bigpanda-worker`

**Critical:** Both processes must run simultaneously. AI skills will not execute if the worker is not running. Jobs will queue indefinitely.

### Health Checks

**Next.js server health:**
```bash
curl -I http://localhost:3000
# Should return: HTTP/1.1 200 OK (or 307 redirect to /login)

curl http://localhost:3000/api/projects
# Should return: 401 Unauthorized (auth working correctly)
```

**Worker health:**
```bash
# PM2: check worker logs for "Worker started" message
pm2 logs bigpanda-worker --lines 20 | grep -i "started\|ready\|listening"

# Docker: check container logs
docker logs bigpanda-worker 2>&1 | grep -i "started\|ready\|listening"
```

**Database connectivity:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
# Should return count (0 if fresh install, no error if connected)
```

**Redis connectivity:**
```bash
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

---

## Production Checklist

After deployment, verify the following before going live:

### 1. Environment Variables

```bash
# Verify all required vars are set (no placeholder values)
env | grep -E "DATABASE_URL|REDIS_URL|ANTHROPIC_API_KEY|BETTER_AUTH"
```

- [ ] `DATABASE_URL` points to production database (not localhost)
- [ ] `REDIS_URL` points to production Redis (not localhost)
- [ ] `BETTER_AUTH_SECRET` generated with `openssl rand -base64 32` (not default)
- [ ] `BETTER_AUTH_URL` set to production domain (no trailing slash)
- [ ] `ANTHROPIC_API_KEY` starts with `sk-ant-api03-`
- [ ] All 5 SMTP variables populated

### 2. Database

- [ ] pg_trgm extension enabled: `psql $DATABASE_URL -c "\dx pg_trgm"`
- [ ] All migrations applied: `psql $DATABASE_URL -c "\dt" | wc -l` (should be 30+)
- [ ] Database accessible from application server (check startup logs)

### 3. Processes

- [ ] Next.js server running on port 3000
- [ ] BullMQ worker running (check logs for startup message)
- [ ] Both processes connected to database and Redis
- [ ] PM2 shows both as "online": `pm2 list` (if using PM2)

### 4. First User Setup

Create the first admin user via the application signup or database:

```bash
# Via psql — insert admin user directly
psql $DATABASE_URL -c "
INSERT INTO users (id, email, name, role, active, email_verified)
VALUES (gen_random_uuid(), 'admin@company.com', 'Admin User', 'admin', true, true);
"
```

### 5. Application Access

- [ ] Navigate to: `https://your-production-domain.com`
- [ ] Login page renders correctly
- [ ] Log in with admin credentials
- [ ] Create a test project
- [ ] Verify portfolio page loads with the project

### 6. Skills Verification

- [ ] Navigate to a project's Skills tab
- [ ] Run a simple skill (e.g., "Generate Weekly Focus")
- [ ] Skill status changes from "waiting" to "processing" to "completed"
- [ ] Check worker logs to confirm job was picked up
- [ ] Confirm output appears in Drafts Inbox

### 7. Invite Flow

- [ ] Navigate to Settings → Users
- [ ] Send invite to a test email address
- [ ] Verify invite email received with correct callback URL (matches `BETTER_AUTH_URL`)
- [ ] Accept invite and create account
- [ ] New user sees empty portfolio (no data from other users)

### 8. Multi-Tenant Isolation

- [ ] Create second test user via invite
- [ ] Log in as User A, create Project X
- [ ] Log out, log in as User B
- [ ] Verify User B cannot see Project X in portfolio
- [ ] Attempt direct URL access to Project X (e.g. `/projects/[id]`): should return 403
- [ ] Verify no cross-tenant data leakage in API responses

---

## Troubleshooting

### Worker Not Processing Jobs

**Symptom:** Skills stuck in "waiting" state indefinitely

**Causes:**
1. Worker process not running — start worker process
2. Worker cannot connect to Redis — check `REDIS_URL` and Redis availability
3. Incorrect Redis connection configuration — verify `maxRetriesPerRequest: null` in worker BullMQ connection config

**Debug:**
```bash
# Check worker logs
pm2 logs bigpanda-worker          # PM2
docker logs bigpanda-worker        # Docker

# Verify Redis connection
redis-cli -u $REDIS_URL ping       # Should return PONG

# Check queue in Redis
redis-cli -u $REDIS_URL keys "bull:*" | head -20
```

### Invite Emails Not Sending

**Symptom:** Invite form submits successfully but no email received

**Causes:**
1. `BETTER_AUTH_URL` not set — will fail with 500 error (no localhost fallback)
2. SMTP credentials invalid — check `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
3. Gmail App Password not configured — Gmail requires App Password, not account password
4. Port blocked by firewall — ensure outbound port 587 (TLS) or 465 (SSL) is open

**Debug:**
```bash
# Check API route logs for SMTP errors
pm2 logs bigpanda-next | grep -i "smtp\|email\|invite"

# Test SMTP connection
curl -v "smtp://$SMTP_HOST:$SMTP_PORT" --ssl-reqd \
  --user "$SMTP_USER:$SMTP_PASS" \
  --mail-from "$SMTP_FROM" \
  --mail-rcpt "test@example.com" \
  -T /dev/null
```

### Database Connection Errors

**Symptom:** Application crashes on startup with "relation does not exist"

**Causes:**
1. Migrations not applied — run `npx drizzle-kit migrate`
2. `pg_trgm` extension missing — run `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
3. `DATABASE_URL` incorrect — verify connection string format

**Debug:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# List tables (should be 30+ for fully migrated schema)
psql $DATABASE_URL -c "\dt"

# Check pg_trgm extension
psql $DATABASE_URL -c "\dx pg_trgm"

# Run pending migrations
npx drizzle-kit migrate
```

### Build Failures

**Symptom:** `npm run build` fails with memory errors

**Fix:** Increase Node.js heap size during build:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

The Dockerfile already includes this flag. If building outside Docker on a low-memory machine, set this environment variable.

---

## Deployment Architecture Recommendations

### For Small Teams (fewer than 10 users)

**Single server with PM2:**
- 1 VPS/server running Next.js + worker via PM2
- Managed PostgreSQL (AWS RDS, Render Postgres, Railway, Neon)
- Managed Redis (AWS ElastiCache, Render Redis, Railway, Upstash)

**Pros:** Simple setup, low cost, easy to manage
**Cons:** No horizontal scaling, single point of failure

### For Production Teams (10+ users)

**Containerized with orchestration:**
- Next.js in Docker container (1-2 instances behind load balancer)
- Worker in separate Docker container (1-2 instances — BullMQ handles concurrency internally)
- Managed PostgreSQL (AWS RDS with Multi-AZ, Neon with branching)
- Managed Redis (AWS ElastiCache with cluster mode disabled for BullMQ compatibility)

**Pros:** Horizontal scaling, fault tolerance, zero-downtime deploys
**Cons:** Higher complexity, requires container orchestration (ECS, Kubernetes)

**Note:** BullMQ with Redis Cluster requires `enableReadyCheck: false` and `maxRetriesPerRequest: null` in the connection config. Running multiple worker instances is safe — BullMQ uses distributed locking to prevent duplicate job processing.

---

## Security Considerations

1. **Never commit `.env.production`** — Ensure it is listed in `.gitignore`
2. **Rotate `BETTER_AUTH_SECRET` periodically** — Generate a new secret with `openssl rand -base64 32`, update the environment, and restart both processes (sessions are invalidated on secret rotation)
3. **Use SSL for PostgreSQL** — Append `?sslmode=require` to `DATABASE_URL` for managed databases
4. **Use TLS for Redis** — Use `rediss://` (double-s) scheme for SSL Redis connections
5. **Enable firewall rules** — Restrict database and Redis ports to application server IPs only
6. **Review audit logs** — All data modifications are logged to the `audit_log` table; query it regularly

---

## Reference

| File | Purpose |
|------|---------|
| `.env.example` | Template for all 12 environment variables |
| `Dockerfile` | Multi-stage production Docker image (Next.js only) |
| `docker-compose.yml` | Local development environment (PostgreSQL + Redis bundled) |
| `ecosystem.config.js` | PM2 configuration for Next.js + worker |
| `db/migrations/` | Drizzle ORM migration files (applied via `npx drizzle-kit migrate`) |
| `.planning/PROJECT.md` | Feature overview, architecture, and design decisions |

**Logs:** PM2: `pm2 logs` | Docker: `docker logs [container-name]`
