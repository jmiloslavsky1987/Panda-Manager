# Phase 26 Context: Multi-User Auth

**Phase:** 26 — Multi-User Auth
**Created:** 2026-03-30
**Status:** Ready for research + planning

---

## Requirements Covered

| Req | Description |
|-----|-------------|
| AUTH-01 | User can log in with email and password |
| AUTH-02 | Admin can create, edit, and deactivate user accounts from Settings |
| AUTH-03 | Admin can assign and change user roles (admin / user) |
| AUTH-04 | Users table includes `external_id` + `resolveRole()` abstraction for Okta |
| AUTH-05 | All routes require authenticated session; unauthenticated → redirect to login |

---

## Decisions

### 1. Login Page UX

- **Layout:** Clean centered login card — no Sidebar, no SearchBar, no app chrome
- **Error feedback:** Single generic message at top of form: "Invalid email or password" — no field-level inline errors
- **Forgot password:** Link is present; clicking it shows a static message: "Contact your admin to reset your password" — no SMTP, no self-service reset flow
- **Password reset:** Admin-only — admin manually sets a new password from the user management panel (no automated email)

### 2. First-Run Bootstrap

- **Mechanism:** One-time setup page at `/setup`
- **Guard:** If any user exists in the DB, `/setup` hard-redirects to `/login` immediately — no bypass
- **Fields:** Email + password + confirm password (same as login card, no extra fields)
- **Appearance:** Same centered card style as login; heading: "Create Admin Account"
- **Post-creation:** Redirects to `/login` after first admin is successfully created

### 3. User Management UI

- **Location:** New "Users" tab added to the existing Settings page (`/settings`)
- **User list columns:** Email, Role badge (Admin / User), Status badge (Active / Inactive), action buttons (Edit, Deactivate)
- **Create / Edit:** Inline form that expands within the table row — no modal
- **Self-modification guard:** Admin cannot edit, deactivate, or demote their own account — action buttons are disabled with tooltip: "You cannot modify your own account"
- **Deactivate vs delete:** Deactivate only (soft delete via `active = false`) — records are never hard-deleted

### 4. Session Behavior

- **Default (no "remember me"):** Session cookie — expires when browser tab/window closes
- **"Remember me" checked:** Persistent 30-day session
- **Expired session (mid-use):** In-place modal overlay: "Session expired — please log in" with inline login form — user does not lose their current URL context
- **Post-login redirect:** Always lands on Dashboard (`/`) — no `?redirect=` URL preservation

---

## Pre-Decided (from STATE.md research — do not re-discuss)

- **Library:** better-auth@1.5.6 (over Auth.js v5) — native SAML 2.0 plugin, Next.js 16 compatible
- **CVE-2025-29927 mitigation:** `requireSession()` enforced at Route Handler level, not only middleware — defense-in-depth mandatory
- **Config split:** `lib/auth.ts` (Node.js runtime, can use bcrypt) vs `lib/session-edge.ts` (Edge-safe, no bcrypt) — middleware uses edge-safe version only
- **Password hashing:** `bcryptjs@^2.x + @types/bcryptjs` — pure JS, no native bindings, safe in all runtimes
- **Users table schema:** `email, password_hash, role, active (boolean), external_id (nullable TEXT), created_at`
- **Role abstraction:** `resolveRole(session)` function accepts both credential session shape and future OIDC session shape — Okta-ready without live Okta

---

## Code Context

### Current auth state
- No `middleware.ts` exists
- No `lib/auth.ts`, no session utilities of any kind
- All 40+ route handlers are completely unprotected (plain DB calls, no session checks)
- `app/layout.tsx` always renders Sidebar + SearchBar — no auth wrapper

### Route handlers to guard (40+ files)
All files under `bigpanda-app/app/api/**` need `requireSession()` added. Key clusters:
- `app/api/projects/**` (most numerous — project CRUD, analytics, time entries, etc.)
- `app/api/actions/`, `risks/`, `milestones/`, `stakeholders/`, `artifacts/`, `decisions/`
- `app/api/skills/`, `app/api/jobs/`, `app/api/ingestion/`, `app/api/discovery/`
- `app/api/settings/`, `app/api/search/`, `app/api/outputs/`, `app/api/drafts/`
- `app/api/oauth/` (Gmail + Calendar — still need session; OAuth tokens are per-app not per-user in v3.0)

### Pages to protect
All pages under `app/**/page.tsx` (27 pages) need session checks.
Exceptions: `/login` and `/setup` must NOT require session.

### Settings page
`app/settings/page.tsx` — new "Users" tab to be added alongside existing MCP Servers and Time Tracking tabs.
Current `defaultValue` is `"mcp-servers"` — Users tab should be inserted first (or per visual order preference, resolved in planning).

### Migrations
Latest migration: `0019_notifications.sql` — next migration will be `0020_users_auth.sql`.
Schema additions: `users` table (better-auth compatible schema + `external_id` + `active` columns).

---

## Deferred (not Phase 26)

- Live Okta SAML/OIDC connection — schema + abstraction ships here; live tenant deferred to v3.1
- Multi-user project access control (restrict users to assigned projects) — deferred to v3.1
- Self-service password reset with email — deferred; admin-reset sufficient for v3.0
- `?redirect=` URL preservation after login — deferred; Dashboard redirect is sufficient for v3.0

---
*Created by /gsd:discuss-phase 26 — 2026-03-30*
