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
- Example: `dGhpcyBpcyBhIHNlY3JldCBrZXkgZm9yIGJldHRlci1hdXRo`
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
cd bigpanda-app

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
cd bigpanda-app

# Install dependencies
npm ci --production

# Build Next.js with standalone output
npm run build
```

**Verify standalone output:**
```bash
ls -la .next/standalone
# Should contain: node_modules/, server.js, package.json
```

### Deployment Options

Choose **one** of the following deployment methods:

#### Option A: Docker Deployment (Recommended)

**Build Docker image:**
```bash
cd bigpanda-app
docker build -t bigpanda-app:latest .
```

**Run container:**
```bash
docker run -d \
  --name bigpanda-app \
  -p 3000:3000 \
  --env-file .env.production \
  bigpanda-app:latest
```

**Important:** The Dockerfile only runs the Next.js server. The BullMQ worker must be run separately:

```bash
# Transpile worker TypeScript to JavaScript
npx tsc worker/index.ts --outDir dist

# Run worker in separate container or process
docker run -d \
  --name bigpanda-worker \
  --env-file .env.production \
  bigpanda-app:latest \
  node dist/worker/index.js
```

#### Option B: PM2 Process Manager

**Install PM2 globally:**
```bash
npm install -g pm2
```

**Transpile worker:**
```bash
cd bigpanda-app
npx tsc worker/index.ts --outDir dist
```

**Start both processes:**
```bash
# Load environment variables
export $(cat .env.production | xargs)

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
pm2 reload ecosystem.config.js  # Zero-downtime reload
pm2 stop ecosystem.config.js    # Stop both processes
pm2 restart ecosystem.config.js # Restart both processes
pm2 delete ecosystem.config.js  # Remove from PM2
```

---

## Process Management

### Multi-Process Architecture

The application requires **two separate processes**:

1. **Next.js Server** (port 3000)
   - Handles HTTP requests
   - SSR and API routes
   - Started with: `node .next/standalone/server.js` or `next start`

2. **BullMQ Worker** (background)
   - Processes job queue (skills, extraction, scheduled tasks)
   - Connects to same Redis as Next.js
   - Started with: `node dist/worker/index.js`

**Critical:** Both processes must run simultaneously. Skills will not execute if worker is not running.

### Health Checks

**Next.js server health:**
```bash
curl http://localhost:3000/api/projects
# Should return 401 (Unauthorized) if auth working
```

**Worker health:**
```bash
# Check worker logs for "Worker started" message
pm2 logs bigpanda-worker | grep "started"

# Or check Docker logs
docker logs bigpanda-worker | grep "started"
```

**Database connectivity:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
# Should return count (0 if fresh install)
```

**Redis connectivity:**
```bash
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

---

## Production Checklist

After deployment, verify the following:

### 1. Environment Variables

```bash
# Verify all required vars are set (no placeholders)
env | grep -E "DATABASE_URL|REDIS_URL|ANTHROPIC_API_KEY|BETTER_AUTH"
```

### 2. Database

- [ ] pg_trgm extension enabled: `psql $DATABASE_URL -c "\dx pg_trgm"`
- [ ] All migrations applied: `psql $DATABASE_URL -c "\dt" | wc -l` (should be 30+)
- [ ] Database accessible from app: Check Next.js startup logs

### 3. Processes

- [ ] Next.js server running on port 3000
- [ ] BullMQ worker running (check logs for "Worker started")
- [ ] Both processes can connect to database and Redis
- [ ] PM2 shows both processes as "online" (if using PM2)

### 4. First User Setup

Create the first admin user:

```bash
cd bigpanda-app

# Run seed script to create default admin
npm run seed-test-user

# Or manually via psql
psql $DATABASE_URL -c "
INSERT INTO users (id, email, name, role, active, email_verified)
VALUES (gen_random_uuid(), 'admin@company.com', 'Admin User', 'admin', true, true);
"
```

### 5. Application Access

- [ ] Navigate to: `https://your-production-domain.com`
- [ ] Log in with admin credentials
- [ ] Create a test project
- [ ] Verify portfolio page loads

### 6. Skills Verification

- [ ] Navigate to a project's Skills tab
- [ ] Run a simple skill (e.g., "Generate Weekly Focus")
- [ ] Verify skill completes (check worker logs if stuck)
- [ ] Confirm output appears in Drafts Inbox

### 7. Invite Flow

- [ ] Navigate to Settings → Users
- [ ] Send invite to test email
- [ ] Verify invite email received with correct callback URL
- [ ] Accept invite and create account
- [ ] New user sees empty portfolio (no data leak)

### 8. Multi-Tenant Isolation

- [ ] Create second test user via invite
- [ ] Log in as User A, create Project X
- [ ] Log out, log in as User B
- [ ] Verify User B cannot see Project X in portfolio
- [ ] Attempt direct URL access to Project X: Should return 403

---

## Troubleshooting

### Worker Not Processing Jobs

**Symptom:** Skills stuck in "waiting" state indefinitely

**Causes:**
1. Worker process not running → Start worker process
2. Worker cannot connect to Redis → Check REDIS_URL and Redis availability
3. Incorrect Redis connection config → Verify maxRetriesPerRequest: null in worker connection

**Debug:**
```bash
# Check worker logs
pm2 logs bigpanda-worker  # PM2
docker logs bigpanda-worker  # Docker

# Verify Redis connection
redis-cli -u $REDIS_URL ping
```

### Invite Emails Not Sending

**Symptom:** Invite form submits but no email received

**Causes:**
1. BETTER_AUTH_URL not set → Will fail with 500 error (no localhost fallback)
2. SMTP credentials invalid → Check SMTP_HOST, SMTP_USER, SMTP_PASS
3. Gmail App Password not configured → Gmail requires App Password, not account password

**Debug:**
```bash
# Check API route logs for SMTP errors
pm2 logs bigpanda-next | grep "SMTP"

# Test SMTP connection manually
npm install -g smtp-tester
smtp-test --host $SMTP_HOST --port $SMTP_PORT --user $SMTP_USER --pass $SMTP_PASS
```

### Database Connection Errors

**Symptom:** Application crashes on startup with "relation does not exist"

**Causes:**
1. Migrations not applied → Run `npx drizzle-kit migrate`
2. pg_trgm extension missing → Run `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
3. DATABASE_URL incorrect → Verify connection string format

**Debug:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# List tables (should be 30+)
psql $DATABASE_URL -c "\dt"

# Check pg_trgm extension
psql $DATABASE_URL -c "\dx pg_trgm"
```

---

## Deployment Architecture Recommendations

### For Small Teams (< 10 users)

**Single server with PM2:**
- 1 server running Next.js + worker via PM2
- Managed PostgreSQL (AWS RDS, Render Postgres, Railway)
- Managed Redis (AWS ElastiCache, Render Redis, Railway)

**Pros:** Simple, low cost, easy to manage
**Cons:** No horizontal scaling, single point of failure

### For Production Teams (10+ users)

**Containerized with orchestration:**
- Next.js in Docker container (1-2 instances behind load balancer)
- Worker in separate Docker container (1 instance, can scale to 2+)
- Managed PostgreSQL (AWS RDS with read replicas)
- Managed Redis (AWS ElastiCache cluster mode)

**Pros:** Horizontal scaling, fault tolerance, zero-downtime deploys
**Cons:** Higher complexity, infrastructure management required

---

## Security Considerations

1. **Never commit .env.production** — Add to .gitignore
2. **Rotate BETTER_AUTH_SECRET regularly** — Generate new secret, restart processes
3. **Use SSL for PostgreSQL and Redis** — Set `?sslmode=require` in DATABASE_URL, use `rediss://` for Redis
4. **Enable firewall rules** — Restrict database and Redis access to application servers only
5. **Review audit logs regularly** — All data modifications logged to audit_log table

---

## Support

**Documentation:** See `.planning/PROJECT.md` for feature overview and architecture
**Issues:** Contact development team
**Logs:** PM2: `pm2 logs`, Docker: `docker logs [container-name]`
