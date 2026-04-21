---
phase: 074-deployment-readiness
plan: "02"
subsystem: deployment-infrastructure
tags: [deployment, docker, pm2, configuration, environment-variables]
dependency_graph:
  requires: [074-01]
  provides: [env-template, docker-build, docker-compose, pm2-config]
  affects: [deployment-pipeline, local-development]
tech_stack:
  added: [docker, docker-compose, pm2]
  patterns: [multi-stage-build, non-root-user, health-checks, process-supervision]
key_files:
  created:
    - bigpanda-app/.env.example
    - bigpanda-app/Dockerfile
    - bigpanda-app/docker-compose.yml
    - bigpanda-app/ecosystem.config.js
  modified:
    - bigpanda-app/.gitignore
decisions:
  - Fixed .gitignore to allow .env.example while ignoring other .env files (Rule 3 auto-fix)
  - Used Node.js 24.13.0-slim for glibc compatibility (not Alpine's musl)
  - PM2 fork mode for both apps (not cluster) per 074-RESEARCH.md Pattern 2
  - docker-compose is for local development only (production uses Dockerfile with external services)
metrics:
  duration_seconds: 169
  tasks_completed: 3
  files_created: 4
  files_modified: 1
  commits: 3
  lines_added: 210
completed_date: "2026-04-21"
---

# Phase 074 Plan 02: Deployment Infrastructure Summary

Deployment infrastructure files enabling production deployment via Docker or PM2.

## What Was Built

Created complete deployment artifacts for BigPanda Project Assistant:
- Environment variable template (.env.example) documenting all 12 required variables
- Multi-stage Dockerfile optimized for production with minimal image size
- docker-compose.yml for local full-stack development (PostgreSQL + Redis + App)
- PM2 ecosystem configuration for multi-process management (Next.js + BullMQ worker)

**Key capabilities unlocked:**
- Fresh checkout can be configured and deployed without reading source code
- Production deployment via Docker containers with non-root user execution
- Local stack testing via `docker-compose up` with health checks
- Process supervision via PM2 with automatic restart and log management

## Tasks Completed

### Task 1: Create .env.example with all required variables
**Commit:** b43b2d2
**Files:** bigpanda-app/.env.example, bigpanda-app/.gitignore

Created comprehensive environment variable template with descriptive comments for:
- Core configuration (DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY)
- Authentication (BETTER_AUTH_URL, BETTER_AUTH_SECRET)
- Client-side configuration (NEXT_PUBLIC_BASE_URL)
- SMTP configuration (5 variables for invite emails)
- Runtime (NODE_ENV)

Each variable includes format examples, where to obtain values, and special requirements (e.g., pg_trgm extension for DATABASE_URL).

**Auto-fix applied:** Fixed .gitignore to allow .env.example tracking while ignoring other .env files (Rule 3 - blocking issue). Original pattern `.env*` was too broad and prevented tracking the deployment template.

### Task 2: Create Dockerfile and docker-compose.yml
**Commit:** 30823b3
**Files:** bigpanda-app/Dockerfile, bigpanda-app/docker-compose.yml

**Dockerfile (multi-stage build):**
- Stage 1: Dependencies - npm ci with no audit/fund
- Stage 2: Builder - copies dependencies, runs npm build for standalone output
- Stage 3: Runner - minimal production image with non-root user (nextjs:nodejs)
- Copies .next/standalone, .next/static, and public directories
- Node.js 24.13.0-slim base for glibc compatibility

**docker-compose.yml:**
- Three services: postgres (16-alpine), redis (7.2-alpine), app (from Dockerfile)
- Health checks ensure dependencies ready before app starts
- Volume mounts for local development (./, /app/node_modules, /app/.next)
- Environment variables injected from .env file via ${VAR} syntax
- Service dependencies prevent app from starting before database is ready

### Task 3: Create PM2 ecosystem configuration
**Commit:** 265de9a
**Files:** bigpanda-app/ecosystem.config.js

Two apps defined:
1. **bigpanda-next:** Next.js server (next start on port 3000, fork mode)
2. **bigpanda-worker:** BullMQ worker (node ./worker/index.js, fork mode)

Both apps configured with:
- Separate log files (./logs/next-*.log and ./logs/worker-*.log)
- Log date formatting (YYYY-MM-DD HH:mm:ss Z)
- Production environment variables

Worker app includes autorestart configuration (max_restarts: 10, min_uptime: 10s) for resilience.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Fixed .gitignore pattern preventing .env.example tracking**
- **Found during:** Task 1
- **Issue:** Original .gitignore pattern `.env*` was too broad and prevented tracking .env.example (deployment template should be version controlled)
- **Fix:** Added `!.env.example` negation pattern to allow tracking the template while ignoring actual environment files
- **Files modified:** bigpanda-app/.gitignore
- **Commit:** b43b2d2
- **Justification:** Blocking issue - could not commit .env.example without fixing .gitignore first

## Verification Results

All verification checks passed:
- ✅ All 4 deployment files created (.env.example, Dockerfile, docker-compose.yml, ecosystem.config.js)
- ✅ .env.example contains all 12 required variables (DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, BETTER_AUTH_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_BASE_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, NODE_ENV)
- ✅ Dockerfile references standalone output (multi-stage build with .next/standalone copy)
- ✅ docker-compose.yml defines all 3 services (postgres, redis, app) with health checks
- ✅ ecosystem.config.js is syntactically valid JavaScript with 2 apps

## Requirements Satisfied

**DEPLOY-01: All runtime configuration injected via environment variables**
- Status: Partially satisfied (documentation complete, enforcement in Phase 074-03)
- Evidence: .env.example documents all 12 required variables with comments and examples

**DEPLOY-02: .env.example documents all required variables**
- Status: ✅ Fully satisfied
- Evidence: bigpanda-app/.env.example created with comprehensive documentation (see Task 1)

## Key Decisions

1. **Fixed .gitignore to allow .env.example** - Added negation pattern to track deployment template while ignoring actual environment files
2. **Used Node.js 24.13.0-slim** - glibc compatibility over Alpine's musl (can break native binaries per 074-RESEARCH.md)
3. **PM2 fork mode for both apps** - Not cluster mode per 074-RESEARCH.md Pattern 2 (BullMQ handles concurrency internally)
4. **docker-compose for local development only** - Production deployments should use Dockerfile with external Postgres/Redis services (RDS, ElastiCache, etc.)
5. **Worker script path: ./worker/index.js** - Transpiled output required for production (development uses tsx worker/index.ts)

## Technical Notes

**Dockerfile multi-stage optimization:**
- Stage 1 (dependencies) installs all packages including dev dependencies needed for build
- Stage 2 (builder) runs npm build to generate .next/standalone output
- Stage 3 (runner) copies only production artifacts (standalone + static + public)
- Non-root user execution (nextjs:nodejs) is security best practice

**docker-compose health checks:**
- postgres: `pg_isready -U postgres` (5s interval, 5s timeout, 5 retries)
- redis: `redis-cli ping` (5s interval, 5s timeout, 5 retries)
- app: `depends_on` with `service_healthy` condition ensures database readiness

**PM2 log management:**
- Separate error and output logs for each app
- Log rotation via PM2 built-in functionality (not configured yet, can be added in Phase 074-03)
- Worker autorestart ensures background job processing continues after crashes

## Next Steps

Phase 074-03 will create DEPLOYMENT.md with:
- Pre-deployment checklist (pg_trgm extension, worker transpilation, etc.)
- Environment variable configuration instructions
- Docker deployment instructions (single-container and docker-compose)
- PM2 deployment instructions (install, start, logs, reload)
- Health check endpoints documentation
- Troubleshooting guide

## Self-Check: PASSED

### Created Files
✅ FOUND: bigpanda-app/.env.example
✅ FOUND: bigpanda-app/Dockerfile
✅ FOUND: bigpanda-app/docker-compose.yml
✅ FOUND: bigpanda-app/ecosystem.config.js

### Commits
✅ FOUND: b43b2d2
✅ FOUND: 30823b3
✅ FOUND: 265de9a
