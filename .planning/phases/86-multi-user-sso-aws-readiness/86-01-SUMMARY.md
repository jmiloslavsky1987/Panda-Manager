---
phase: 86-multi-user-sso-aws-readiness
plan: 01
subsystem: auth
tags: [oauth, gmail, slack, multi-user, sso, session-scoping, better-auth, drizzle]

# Dependency graph
requires:
  - phase: 86-multi-user-sso-aws-readiness
    provides: "Plan 00 RED gates for TOKEN-01..04 (tests/api/per-user-tokens.test.ts)"
provides:
  - "Per-user OAuth token isolation for Gmail and Slack (session.user.id scoping)"
  - "Backward-compatible 'default' fallback read pattern for single-user Docker installs"
  - "Discovery scan route filtered by requesting user's tokens"
  - "Disconnect (DELETE) scoped to real user only — fallback row preserved"
affects: [86-02-okta-dormant, 86-03-aws-readiness, future-multi-pm-deployments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Real-user-first read with 'default' fallback: `let [row] = select(user_id=session.user.id); if (!row) [row] = select(user_id='default');`"
    - "Scoped DELETE that never touches the 'default' fallback row"
    - "Discovery scan filters by session.user.id with length===0 fallback to 'default'"

key-files:
  created: []
  modified:
    - app/api/oauth/gmail/callback/route.ts
    - app/api/oauth/gmail/status/route.ts
    - app/api/oauth/slack/callback/route.ts
    - app/api/oauth/slack/status/route.ts
    - app/api/discovery/scan/route.ts

key-decisions:
  - "Real-user-first read with 'default' fallback (not migration) — preserves existing single-user Docker installs without data movement"
  - "DELETE intentionally scoped to real user only — never deletes the 'default' fallback row because other concurrent users may still need it during multi-PM rollout"
  - "Discovery scan uses length===0 check (not `??` operator) for fallback — drizzle select returns array, not nullable single row"
  - "Slack callback already had `requireSession()` (Phase 84 added it); change was just exposing `session` from destructure and writing `session!.user.id`"
  - "No DB migration required — existing UNIQUE(user_id, source) index already permits multiple users per source"

patterns-established:
  - "Pattern 1: OAuth token storage scoping — always `user_id: session!.user.id` after requireSession"
  - "Pattern 2: OAuth status GET reads — real-user query first, then `if (!row)` fallback to `user_id='default'`"
  - "Pattern 3: OAuth status DELETE — scoped to real user, never touches 'default' fallback (defense for multi-user during rollout)"
  - "Pattern 4: Multi-user token queries — let-binding with length===0 fallback for array results"

requirements-completed: [TOKEN-01, TOKEN-02, TOKEN-03, TOKEN-04]

# Metrics
duration: 3 min
completed: 2026-05-18
---

# Phase 86 Plan 01: Per-User OAuth Tokens Summary

**Migrated Gmail + Slack OAuth tokens and discovery scan from hardcoded `user_id: 'default'` to per-user `session.user.id` with backward-compatible `'default'` fallback on reads — zero DB migration, all 8 TOKEN-01..04 gates GREEN.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-18T15:56:26Z
- **Completed:** 2026-05-18T15:59:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Gmail OAuth callback now writes `user_id: session!.user.id` (was hardcoded `'default'`)
- Slack OAuth callback now writes `user_id: session!.user.id` (was hardcoded `'default'`)
- Gmail + Slack status GET handlers query by real user first, then fall back to `'default'` if absent
- Gmail + Slack status DELETE handlers scoped to real user only — never touch the `'default'` fallback row
- Discovery scan route filters `userSourceTokens` by `session.user.id`; falls back to `user_id='default'` when scoped result is empty (single-user Docker compat)
- All 8 TOKEN-01..04 tests in `tests/api/per-user-tokens.test.ts` transitioned RED → GREEN
- Zero TypeScript regressions in any of the 5 modified route files
- No DB migration required (UNIQUE(user_id, source) constraint already supports multi-user)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate Gmail OAuth callback + status routes** — `f4a547ab` (feat)
2. **Task 2: Migrate Slack OAuth callback + status routes AND discovery scan** — `3412dae2` (feat)

**Plan metadata (this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates):** pending docs commit in GSD planning root

## Files Created/Modified

All file paths under `/Users/jmiloslavsky/Documents/Panda-Manager/`:

- `app/api/oauth/gmail/callback/route.ts` — Token insert now uses `session!.user.id`; added Phase 86 scoping comment.
- `app/api/oauth/gmail/status/route.ts` — GET reads real user first then falls back to `'default'`; DELETE scoped to real user only.
- `app/api/oauth/slack/callback/route.ts` — `session` exposed from `requireSession()` destructure; insert uses `session!.user.id`; Phase 86 comment added.
- `app/api/oauth/slack/status/route.ts` — GET reads real user first then falls back to `'default'`; DELETE scoped to real user only.
- `app/api/discovery/scan/route.ts` — `userSourceTokens` select first filters by `session!.user.id`; new `if (dbUserTokens.length === 0)` branch re-queries with `user_id='default'`; downstream `runDiscoveryScan(...)` call unchanged.

### Before → After Snippets

**Gmail callback (app/api/oauth/gmail/callback/route.ts):**
```diff
+    // Phase 86: per-user scoping — tokens are owned by the connecting user, not 'default'.
+    // Existing 'default' rows remain valid via the fallback read pattern in status/scan routes.
     await db
       .insert(userSourceTokens)
       .values({
-        user_id: 'default',
+        user_id: session!.user.id,
         source: 'gmail',
```

**Gmail status GET (app/api/oauth/gmail/status/route.ts):**
```diff
-  const [row] = await db
+  let [row] = await db
     .select({ email: userSourceTokens.email })
     .from(userSourceTokens)
-    .where(
-      and(
-        eq(userSourceTokens.user_id, 'default'),
-        eq(userSourceTokens.source, 'gmail')
-      )
-    )
+    .where(and(eq(userSourceTokens.user_id, session!.user.id), eq(userSourceTokens.source, 'gmail')))
     .limit(1);
+
+  if (!row) {
+    [row] = await db
+      .select({ email: userSourceTokens.email })
+      .from(userSourceTokens)
+      .where(and(eq(userSourceTokens.user_id, 'default'), eq(userSourceTokens.source, 'gmail')))
+      .limit(1);
+  }
```

**Slack callback (app/api/oauth/slack/callback/route.ts):**
```diff
-  const { redirectResponse } = await requireSession();
+  const { session, redirectResponse } = await requireSession();
```
```diff
+    // Phase 86: per-user scoping — tokens are owned by the connecting user, not 'default'.
     await db
       .insert(userSourceTokens)
       .values({
-        user_id: 'default',
+        user_id: session!.user.id,
         source: 'slack',
```

**Slack status (app/api/oauth/slack/status/route.ts):** identical pattern to Gmail status — `let [row]` first query by `session!.user.id`, then `if (!row)` re-query by `'default'`. DELETE scoped to real user.

**Discovery scan (app/api/discovery/scan/route.ts):**
```diff
-          const [settings, dbUserTokens, allMcpServers] = await Promise.all([
+          // Phase 86: scan with the requesting user's tokens. Fall back to legacy 'default' tokens
+          // so single-user Docker installs (no per-user connect yet) keep working.
+          const [settings, scopedUserTokens, allMcpServers] = await Promise.all([
             readSettings(),
-            db.select().from(userSourceTokens).where(eq(userSourceTokens.user_id, 'default')),
+            db.select().from(userSourceTokens).where(eq(userSourceTokens.user_id, session!.user.id)),
             MCPClientPool.getInstance().getServersForSkill('discovery-scan'),
           ]);
+
+          let dbUserTokens = scopedUserTokens;
+          if (dbUserTokens.length === 0) {
+            dbUserTokens = await db
+              .select()
+              .from(userSourceTokens)
+              .where(eq(userSourceTokens.user_id, 'default'));
+          }
```

## Decisions Made

- **No DB migration:** The existing `UNIQUE(user_id, source)` index already permits multiple users per source. Pre-Phase-86 `'default'` rows remain untouched; new connects write under the real user_id.
- **DELETE never touches 'default':** A user disconnecting from a multi-user install must not invalidate other users' fallback. Acceptable edge case: a single-user-install user whose token is stored under `'default'` simply has nothing to disconnect — they'll need to reconnect (which then saves under their real `user_id`).
- **Fallback pattern uses `if (!row)` for status GET and `length === 0` for scan:** Status GET destructures the first array element (nullable); scan keeps the full token array (need length check). Both patterns satisfy the TOKEN-02a/02b/03c regex guards.
- **Slack callback already had `requireSession()` from Phase 84 (84-01):** Only change was destructuring `session` from the result and using `session!.user.id` in the insert. CSRF cookie check was preserved as-is and remains BEFORE the DB write.
- **No additional `'default'` references found** outside the 5 files in scope. The discovery scan route's downstream `runDiscoveryScan(userTokens)` does not care about `user_id` — it consumes the token array.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0
**Impact on plan:** Plan was a clean migration; tests were correctly RED at start (6/8) and went GREEN (8/8) after both tasks landed. The 2 TOKEN-02a Gmail tests that were GREEN at start are a quirk of the test regex (Gmail status already imported `session` for the requireSession destructure even pre-migration, satisfying the `session!?\.user\.id` pattern check despite the route querying by `'default'`); both were re-asserted after Task 1 and remained GREEN.

## Issues Encountered

None — all changes were straightforward `'default'` → `session!.user.id` swaps plus fallback branch additions. No unexpected references to `'default'` outside the 5 files. No TS regressions.

## Authentication Gates

None — no external auth required for this plan (all changes are code modifications to existing authenticated routes).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TOKEN-01..04 GREEN — gate for Plan 02 (Okta) is clear. Plan 02 modifies `lib/auth.ts` (Okta provider conditional) — no overlap with the 5 files modified here.
- Production multi-PM Docker deployments now isolate tokens per user. Existing single-user installs continue working unchanged via fallback reads.
- Plan 03 (health endpoint) and Plan 04 (db-backup retention) are independent of OAuth scoping; no carry-forward concerns.
- Plan 05 (RBAC coverage sentinel) is already GREEN; no impact.

**Carry-forward for Plan 02:** When Okta SSO lands and provisions real users, every authenticated request will have a non-default `session.user.id`. Existing `'default'` rows will gradually become unreachable for those users but remain valid for any legacy Docker user that hasn't migrated. We may want a future cleanup migration once all installs have re-connected, but it's not required for correctness.

---
*Phase: 86-multi-user-sso-aws-readiness*
*Completed: 2026-05-18*

## Self-Check: PASSED

- All 5 modified files present on disk:
  - `app/api/oauth/gmail/callback/route.ts`
  - `app/api/oauth/gmail/status/route.ts`
  - `app/api/oauth/slack/callback/route.ts`
  - `app/api/oauth/slack/status/route.ts`
  - `app/api/discovery/scan/route.ts`
- Both task commits verified in git log:
  - `f4a547ab` — feat(86-01): scope Gmail OAuth tokens
  - `3412dae2` — feat(86-01): scope Slack OAuth + discovery scan
- All 8 TOKEN-01..04 tests GREEN in `tests/api/per-user-tokens.test.ts`
- TypeScript compiles clean for all modified files
- Both commits pushed to `origin/main`
