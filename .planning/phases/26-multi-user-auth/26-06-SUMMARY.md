---
phase: 26-multi-user-auth
plan: "06"
subsystem: auth
status: complete
commit: b82d8f8
---

# Summary 26-06: Email-Based Invite Flow

## What Was Built

Replaced admin-side password creation with a token-based email invite flow across all layers.

## Delivered

- **`db/schema.ts`** — `invites` pgTable added
- **`db/migrations/0021_invites.sql`** — manual migration (requires 0020 users table)
- **`lib/email.ts`** — nodemailer transport + `sendInviteEmail()` with plain text + HTML
- **`POST /api/settings/users`** — now creates invite + sends email; rolls back on failure
- **`GET /api/settings/users`** — returns `{ users, pendingInvites }`
- **`DELETE /api/settings/invites/[id]`** — admin cancels pending invite
- **`GET /api/auth/invite/[token]`** — public token validation
- **`POST /api/auth/invite/[token]`** — accept invite: bcrypt hash, insert user + credential account, delete invite
- **`app/accept-invite/page.tsx`** — public page with email (readonly), name, password, confirm; redirects to `/login`
- **`components/settings/UsersTab.tsx`** — Send Invite form replacing password create; Pending Invites table with Cancel
- **`proxy.ts`** — `/accept-invite` added to public allowlist
- **`.env.local`** — SMTP_HOST/PORT/USER/PASS/FROM placeholders added

## Notes

- Admin must fill SMTP vars before invites will actually deliver
- DB migration must be applied manually after deploying: `psql -d bigpanda_app -f db/migrations/0021_invites.sql`
