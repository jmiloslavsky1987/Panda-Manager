# Phase 85: Multi-User, SSO & AWS Readiness — Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Prepare the app for production deployment on AWS with multiple project managers sharing one instance. This means: per-user source credentials (each PM connects their own Gmail/Slack), Okta OIDC SSO replacing email/password login, automated daily DB backups baked in globally, and AWS infrastructure scaffolding (ECS/RDS/ElastiCache config, env var management). Critically, nothing in this phase should break what's working today — the migration path is additive and the existing email/password auth must remain functional as a fallback during transition.

</domain>

<decisions>
## Implementation Decisions

### Per-User Source Credentials (non-breaking migration)
- Today: `user_source_tokens` stores tokens with `user_id='default'` — single-user assumption
- Change: When a real session exists, use `session.user.id` as `user_id` instead of `'default'`
- Migration: existing `user_id='default'` rows remain valid — if no row for real user_id, fall back to 'default' token (backward compat during transition)
- Impact: Gmail and Slack OAuth callbacks write to `user_id = session.user.id`
- `resolveAdapter` already receives `userTokens` array — scan route needs to filter by current user's ID
- Each PM connects their own Gmail/Slack via Settings — tokens are scoped to their account

### Okta OIDC SSO
- better-auth already has `externalId` field on users and `resolveRole()` checks OIDC claims — schema is ready
- Use better-auth's OIDC plugin (or social provider) for Okta
- Config: `OKTA_DOMAIN`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET` env vars
- Group mapping: Okta group `panda-admins` → role `admin`, all others → role `user`
- Email/password login remains enabled as fallback (for local dev and transition period)
- User auto-provisioning: if Okta user email not in DB, create user record on first login (just-in-time provisioning)
- `disableSignUp` stays true for email/password — Okta handles provisioning in production
- Login page: shows both "Sign in with Okta" and email/password form

### Automated Daily DB Backups
- Baked into Docker/AWS infrastructure, not application code
- Local (Docker): a BullMQ cron job that runs `pg_dump` daily at 2am, stores to `/root/.bigpanda-app/backups/`, retains 30 days — similar to existing panda-backup.sh but app-managed
- AWS (RDS): RDS automated backups enabled via Terraform/CDK config — 7-day retention, point-in-time recovery
- Backup status visible in Settings (admin only) — last backup timestamp, size
- Backup job uses existing BullMQ infrastructure — new queue `db-backup`

### AWS Infrastructure Scaffolding
- Target: ECS Fargate (app + worker containers), RDS PostgreSQL, ElastiCache Redis
- `install/docker-compose.aws.yml` — production compose file with AWS service references
- Environment variable manifest: `install/env.aws.example` documenting all required vars
- `BETTER_AUTH_URL` must be set to the production domain for auth callbacks to work
- `GOOGLE_REDIRECT_URI` and `GOOGLE_CALENDAR_REDIRECT_URI` must use production domain
- Health check endpoint: `/api/health` — returns 200 with DB + Redis connectivity status
- No actual Terraform/CDK in this phase — just the scaffolding files and documentation

### RBAC Hardening for Multi-PM
- Audit all routes: ensure project-scoped routes use `requireProjectRole` not just `requireSession`
- Source credentials: stored per-user in DB (user_source_tokens) — no org-level sharing of Gmail/Slack tokens
- Discovery scans: run as the requesting user's credentials — users see their own results only
- Weekly report: cross-PM view already intentional — keep (admins and all users can see all projects)
- Settings > Users tab: admin-only — already enforced
- Settings > Source Connections: per-user — each user manages their own OAuth connections

### What NOT to change
- Email/password auth flow — keep working
- Project RBAC (`requireProjectRole`) — already complete, just audit coverage
- Weekly Report cross-PM access — intentional design, keep
- Existing `user_id='default'` tokens — keep working via fallback

</decisions>

<code_context>
## Existing Code Insights

### Per-user token migration
- `app/api/oauth/gmail/callback/route.ts` line 59: `user_id: 'default'` → change to `session.user.id`
- `app/api/oauth/slack/callback/route.ts` (new in Phase 84): write `session.user.id` from the start
- `app/api/discovery/scan/route.ts`: filter `userTokens` by `session.user.id`, fallback to 'default' if none found
- `app/api/oauth/gmail/status/route.ts`: filter by `session.user.id`
- `app/api/oauth/slack/status/route.ts` (new in Phase 84): already write with real user_id

### Okta integration
- `lib/auth.ts`: add `socialProviders` or OIDC plugin for Okta
- `lib/auth-utils.ts`: `resolveRole()` already handles OIDC claims path — just needs Okta group names wired
- `app/login/page.tsx`: add "Sign in with Okta" button alongside existing form
- New env vars: `OKTA_DOMAIN`, `OKTA_CLIENT_ID`, `OKTA_CLIENT_SECRET`, `OKTA_REDIRECT_URI`

### BullMQ backup job
- `lib/queues.ts` or equivalent: add `db-backup` queue
- New worker handler: runs `pg_dump` via child_process, writes to backup dir, prunes old files
- Schedule: daily cron via BullMQ repeat
- `app/api/settings/route.ts` or new `/api/settings/backup-status/route.ts`: returns last backup info

### AWS scaffolding files
- `install/env.aws.example`: document all env vars with descriptions
- `install/docker-compose.aws.yml`: production compose pointing to RDS/ElastiCache
- `app/api/health/route.ts`: DB ping + Redis ping, return JSON status

### RBAC audit scope
- Run grep for `requireSession` without `requireProjectRole` in project-scoped routes under `app/api/projects/[projectId]/`
- Any route that touches project data without `requireProjectRole` is a gap

</code_context>

<specifics>
## Specific Notes

- better-auth Okta OIDC: use `genericOIDC` plugin or check if better-auth has first-class Okta support by implementation time
- BullMQ backup cron: `{ pattern: '0 2 * * *' }` — 2am daily
- `pg_dump` in Docker worker: `DATABASE_URL` env var already available; use `child_process.execSync` or `execa`
- Backup retention: delete files older than 30 days (same as existing panda-backup.sh logic)
- Health endpoint: must not require auth (load balancer health checks hit it unauthenticated)
- AWS ECS: app and worker are separate task definitions sharing same image — same as current Docker setup
- RDS: PostgreSQL 16, same version as local — no schema changes needed
- ElastiCache: Redis 7, same version as local

</specifics>

<deferred>
## Deferred

- Actual Terraform/CDK infrastructure code — ops team responsibility
- Gong/Glean per-user credential scoping — no credentials to test
- Email delivery in production (invite emails) — needs SES or SendGrid config on AWS
- Audit log export / compliance features
- Multi-org data partitioning (full tenant isolation) — current RBAC model is sufficient for internal multi-PM use

</deferred>

---

*Phase: 85-multi-user-sso-aws-readiness*
*Context gathered: 2026-05-04*
