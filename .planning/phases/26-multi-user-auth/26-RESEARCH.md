# Phase 26: Multi-User Auth - Research

**Researched:** 2026-03-30
**Domain:** Authentication — better-auth@1.5.6, Next.js 16.2 App Router, Drizzle ORM/PostgreSQL
**Confidence:** HIGH (all critical decisions verified against official better-auth docs and Next.js docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Library:** better-auth@1.5.6 (over Auth.js v5) — native SAML 2.0 plugin, Next.js 16 proxy.ts supported; use --legacy-peer-deps if peer dep version mismatch on install
- **CVE-2025-29927 mitigation:** `requireSession()` enforced at Route Handler level, not only middleware/proxy — defense-in-depth mandatory
- **Config split:** `lib/auth.ts` (Node.js runtime, can use bcrypt) vs `lib/session-edge.ts` (Edge-safe, no bcrypt) — proxy uses edge-safe version only
- **Password hashing:** `bcryptjs@^2.x + @types/bcryptjs` — pure JS, no native bindings, safe in all Next.js runtimes including Edge
- **Users table schema:** `email, password_hash, role, active (boolean), external_id (nullable TEXT), created_at`
- **Role abstraction:** `resolveRole(session)` function accepts both credential session shape and future OIDC session shape — Okta-ready without live Okta
- **Login page:** Centered card, no Sidebar/SearchBar/app chrome; single generic error message "Invalid email or password"
- **Forgot password:** Static message "Contact your admin to reset your password" — no SMTP, no self-service flow
- **Password reset:** Admin-only, from user management panel; no email automation
- **Session behavior — default:** Browser-close (no persistence) when "remember me" is unchecked
- **Session behavior — remember me:** Persistent 30-day session
- **Expired session:** In-place modal overlay "Session expired — please log in" with inline login form — user does not lose URL context
- **Post-login redirect:** Always Dashboard (`/`) — no `?redirect=` URL preservation
- **First-run bootstrap:** `/setup` page; hard-redirects to `/login` if any user exists; same centered card style
- **User management:** Settings > Users tab, inline expand within table row, no modal; admin cannot modify own account (buttons disabled with tooltip)
- **Deactivate vs delete:** Soft delete only via `active = false` — no hard deletes ever

### Claude's Discretion
- Tab position in Settings (first or alongside existing) — resolved in planning
- Exact matcher pattern for proxy.ts (negative lookahead vs named routes)

### Deferred Ideas (OUT OF SCOPE)
- Live Okta SAML/OIDC connection — schema + abstraction ships here; live tenant deferred to v3.1
- Multi-user project access control (restrict users to assigned projects) — deferred to v3.1
- Self-service password reset with email — deferred; admin-reset sufficient for v3.0
- `?redirect=` URL preservation after login — deferred; Dashboard redirect is sufficient for v3.0
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can log in with email and password | better-auth emailAndPassword plugin, `signIn.email()` client API, login page Server Component, `/api/auth/[...all]/route.ts` mount |
| AUTH-02 | Admin can create, edit, and deactivate user accounts from Settings | Settings > Users tab UI, admin-only server actions for create/edit/deactivate, `active` column in users table |
| AUTH-03 | Admin can assign and change user roles (admin / user) | `role` column in users table, `resolveRole(session)` abstraction, role-gated UI in Users tab |
| AUTH-04 | Users table includes `external_id` + `resolveRole()` abstraction for Okta | Drizzle schema `0020_users_auth.sql`, `additionalFields` in better-auth config, `resolveRole()` utility in `lib/auth-utils.ts` |
| AUTH-05 | All application routes require authenticated session; unauthenticated → redirect to login | `proxy.ts` for optimistic redirect, `requireSession()` at Route Handler level (40+ files), layout auth wrapper for Server Components |
</phase_requirements>

---

## Summary

better-auth@1.5.6 is a self-hosted authentication library with native Next.js 16 support, a Drizzle ORM adapter, and a built-in email/password provider. It uses a Drizzle adapter that reads the existing Drizzle schema, meaning the users table lives in the same `db/schema.ts` and the same migration pipeline — no separate auth migration system is needed. The better-auth CLI can generate the required table definitions, which are then fed through the normal `drizzle-kit generate && drizzle-kit migrate` flow as migration `0020_users_auth.sql`.

The CVE-2025-29927 mitigation is architectural: Next.js 16 renamed `middleware.ts` to `proxy.ts`, but more importantly, the official better-auth guidance is that the proxy/middleware layer is an *optimistic redirect* only (cookie existence check via `getSessionCookie()`) — never a security boundary. Every Route Handler and every page Server Component must call `auth.api.getSession({ headers: await headers() })` independently. The project already runs Next.js 16.2.0, so `proxy.ts` with the `proxy()` function export is the correct file convention (not `middleware.ts`).

The session expired modal is the most architecturally novel piece: since all API calls in this app use bare `fetch()` (no Axios), the pattern is a React Context provider at the root that exposes a `showSessionExpiredModal` setter, wrapped around a custom `fetchWithAuth()` utility that intercepts 401 responses and triggers the modal. The modal renders an inline login form; successful re-auth dismisses it and the user remains on their current page.

**Primary recommendation:** Use drizzle adapter with `usePlural: true`, extend the user table in `db/schema.ts` with custom columns (`role`, `active`, `external_id`), and declare those columns as `additionalFields` in `lib/auth.ts`. Run `npx better-auth generate` then `drizzle-kit generate` to produce migration `0020_users_auth.sql`. Write `requireSession()` as a single shared utility in `lib/auth-server.ts` that wraps `auth.api.getSession()` and returns `{ session, redirectResponse }`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | 1.5.6 (locked) | Auth engine: sessions, email/password, user management API | Native SAML 2.0, Next.js 16 proxy.ts support, Drizzle adapter built-in |
| bcryptjs | ^2.x (locked) | Password hashing | Pure JS — works in all runtimes including Edge; no native bindings |
| @types/bcryptjs | ^2.x | TypeScript types for bcryptjs | Required companion |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| better-auth/next-js | (bundled) | `toNextJsHandler`, `nextCookies` plugin | Mounting auth route handler; cookie handling in Server Actions |
| better-auth/cookies | (bundled) | `getSessionCookie()` — Edge-safe cookie existence check | proxy.ts only — NOT a security check |
| better-auth/adapters/drizzle | (bundled) | Drizzle ORM adapter | DB integration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-auth | Auth.js v5 | Rejected: no native SAML, peer dep issues with Next.js 16 |
| bcryptjs | scrypt (better-auth default) | better-auth uses scrypt by default; bcryptjs chosen explicitly for runtime safety guarantee |

### Installation
```bash
npm install better-auth bcryptjs @types/bcryptjs --legacy-peer-deps
```

---

## Architecture Patterns

### Recommended File Structure
```
bigpanda-app/
├── lib/
│   ├── auth.ts               # Node.js-only — betterAuth() config, drizzle adapter, emailAndPassword, additionalFields
│   ├── auth-client.ts        # createAuthClient() — browser-only, imported by client components
│   ├── auth-server.ts        # requireSession() utility — imported by ALL route handlers and Server Components
│   └── auth-utils.ts         # resolveRole(session) — Okta-ready role abstraction
├── proxy.ts                  # Edge-safe optimistic redirect (getSessionCookie only)
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts  # toNextJsHandler(auth) mount
│   ├── login/
│   │   └── page.tsx          # Centered card, no layout chrome
│   ├── setup/
│   │   └── page.tsx          # First-run admin bootstrap
│   ├── settings/
│   │   └── page.tsx          # Add Users tab (existing file)
│   └── layout.tsx            # Wrap children in AuthProvider; conditionally suppress Sidebar/SearchBar
├── components/
│   ├── AuthProvider.tsx       # React context for session expired modal state
│   ├── SessionExpiredModal.tsx # Overlay login form
│   └── settings/
│       └── UsersTab.tsx       # User management UI
└── db/
    ├── schema.ts              # Add users, sessions, accounts tables here
    └── migrations/
        └── 0020_users_auth.sql # Generated by drizzle-kit
```

### Pattern 1: lib/auth.ts — Core better-auth Configuration

**What:** The single source of truth for the auth engine. Node.js runtime only (bcryptjs safe here).
**When to use:** Imported by server-side code and route handlers. Never import in Edge/proxy context.

```typescript
// lib/auth.ts — Source: https://better-auth.com/docs/adapters/drizzle
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true, // maps 'user' -> 'users', 'session' -> 'sessions', etc.
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,         // No self-signup; admin creates users
    password: {
      hash: async (password) => {
        const bcrypt = await import("bcryptjs");
        return bcrypt.hash(password, 12);
      },
      verify: async ({ password, hash }) => {
        const bcrypt = await import("bcryptjs");
        return bcrypt.compare(password, hash);
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,  // 30 days max (remember me path)
    updateAge: 60 * 60 * 24,        // Refresh daily
    // rememberMe: false on signIn.email() creates a session cookie (browser-close)
    // rememberMe: true (default) uses the full expiresIn duration
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false,              // Not user-settable at signup
      },
      active: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
      externalId: {
        type: "string",
        fieldName: "external_id",
        required: false,
      },
    },
  },
  plugins: [nextCookies()],       // must be last; enables cookie setting in Server Actions
});
```

### Pattern 2: proxy.ts — Optimistic Redirect (Edge-Safe)

**What:** Fast first-pass redirect for unauthenticated users. Does NOT validate the session — only checks cookie existence.
**When to use:** This is not a security boundary. It is UX only. Security lives in requireSession().

```typescript
// proxy.ts — Source: https://better-auth.com/docs/integrations/next
// NOTE: Next.js 16 uses proxy.ts + proxy() — NOT middleware.ts + middleware()
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  // ⚠️ Cookie existence only — NOT cryptographic validation
  // Security enforcement happens in requireSession() inside every route handler
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except /login, /setup, and Next.js internals
    "/((?!login|setup|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### Pattern 3: requireSession() — Route Handler Security Enforcement

**What:** Single shared function called at the top of every Route Handler. This is the CVE-2025-29927 defense-in-depth layer.
**When to use:** First line inside every `export async function GET/POST/PUT/DELETE` in `app/api/**`.

```typescript
// lib/auth-server.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type SessionResult =
  | { session: Awaited<ReturnType<typeof auth.api.getSession>>; redirectResponse: null }
  | { session: null; redirectResponse: NextResponse };

export async function requireSession(): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return {
      session: null,
      redirectResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, redirectResponse: null };
}

// Usage pattern in every route handler:
// const { session, redirectResponse } = await requireSession();
// if (redirectResponse) return redirectResponse;
```

### Pattern 4: resolveRole() — Okta-Ready Abstraction

**What:** Normalizes role from either credential session (better-auth) or future OIDC session (Okta). Shields the rest of the codebase from session shape differences.
**When to use:** Any code that checks admin vs user role.

```typescript
// lib/auth-utils.ts
type CredentialSession = { user: { role?: string } };
type OIDCSession = { claims?: { groups?: string[]; roles?: string[] } };

export function resolveRole(session: CredentialSession | OIDCSession): "admin" | "user" {
  // Credential path (better-auth)
  if ("user" in session && session.user?.role) {
    return session.user.role === "admin" ? "admin" : "user";
  }
  // Future OIDC path (Okta) — checks groups or roles claims
  if ("claims" in session) {
    const groups = session.claims?.groups ?? [];
    const roles = session.claims?.roles ?? [];
    if (groups.includes("Admins") || roles.includes("admin")) return "admin";
  }
  return "user";
}
```

### Pattern 5: Drizzle Schema Extension for better-auth Tables

**What:** The users, sessions, and accounts tables live in the existing `db/schema.ts`. better-auth reads the schema via the drizzle adapter.

```typescript
// db/schema.ts — add alongside existing tables

// better-auth users table (extended with custom columns)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Custom columns — must declare in additionalFields in lib/auth.ts too
  role: text("role").notNull().default("user"),
  active: boolean("active").notNull().default(true),
  externalId: text("external_id"),  // nullable — for Okta OIDC subject claim
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Pattern 6: Session Expired Modal — Global 401 Interceptor

**What:** React Context wrapping the app root that exposes a `triggerSessionExpired()` function. A `fetchWithAuth()` wrapper intercepts 401 responses and triggers the modal without losing the user's current page state.
**When to use:** All client components that call fetch() should import `fetchWithAuth` instead of raw fetch.

```typescript
// components/AuthProvider.tsx
"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { SessionExpiredModal } from "./SessionExpiredModal";

interface AuthContextValue {
  triggerSessionExpired: () => void;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionExpired, setSessionExpired] = useState(false);
  const triggerSessionExpired = useCallback(() => setSessionExpired(true), []);
  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);
  return (
    <AuthContext.Provider value={{ triggerSessionExpired, clearSessionExpired }}>
      {children}
      {sessionExpired && <SessionExpiredModal onSuccess={clearSessionExpired} />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
```

```typescript
// lib/fetch-with-auth.ts — drop-in fetch replacement for client components
import { getAuthContext } from "@/components/AuthProvider";

export async function fetchWithAuth(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    // Trigger the in-place session expired modal
    getAuthContext()?.triggerSessionExpired();
    // Return the 401 so caller can short-circuit
  }
  return res;
}
```

### Pattern 7: layout.tsx Auth Wrapper

**What:** The root layout must conditionally suppress Sidebar/SearchBar for `/login` and `/setup` routes. Because layout.tsx is a Server Component, it can read the pathname via `headers()` or use the `pathname` from `next/navigation` in a client wrapper.
**When to use:** `app/layout.tsx` — must not add app chrome on auth pages.

The cleanest pattern is a client component `<AppChrome>` that reads `usePathname()` and conditionally renders Sidebar/SearchBar:

```typescript
// components/AppChrome.tsx
"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { SearchBar } from "./SearchBar";

const NO_CHROME_ROUTES = ["/login", "/setup"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasChrome = !NO_CHROME_ROUTES.includes(pathname);
  if (!hasChrome) {
    return <>{children}</>;
  }
  return (
    <>
      <Sidebar />
      <main className="ml-60 flex-1 min-h-screen overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-2 bg-white sticky top-0 z-10">
          <SearchBar />
        </div>
        {children}
      </main>
    </>
  );
}
```

### Anti-Patterns to Avoid

- **Only checking session in proxy.ts:** CVE-2025-29927 bypass. proxy.ts is UX-only.
- **Importing `lib/auth.ts` in proxy.ts:** auth.ts uses bcryptjs which has Node.js bindings — will crash in Edge runtime. Use `getSessionCookie()` only in proxy.
- **Using `middleware.ts` instead of `proxy.ts`:** Next.js 16 renamed this file. `middleware.ts` may still work but is deprecated. Use `proxy.ts` + `proxy()` export.
- **Hard-deleting users:** Only `active = false`. No `DELETE FROM users` ever.
- **Admin modifying own account:** Self-modification must be blocked in both UI (disabled buttons with tooltip) and server action (compare session.user.id with target user ID).
- **Importing `lib/auth.ts` in client components:** Never. Use `lib/auth-client.ts` (createAuthClient) on the client.
- **Using better-auth's auto-signup:** `disableSignUp: true` in emailAndPassword config — user creation is admin-only via `/setup` (first user) or the Users tab (subsequent users).
- **drizzle-orm@beta (v1.0):** Known breakage with the better-auth drizzle adapter. This project uses `drizzle-orm@^0.45.1` — do not upgrade to beta during this phase.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie signing/verification | Custom JWT or cookie signing | `better-auth` session layer | Timing attacks, key rotation, cookie flags — extremely easy to get wrong |
| Password hashing | Custom bcrypt integration | `bcryptjs` via `password.hash/verify` in better-auth config | Salt rounds, async safety, bcrypt truncation edge cases |
| CSRF protection | Custom CSRF tokens | better-auth handles this internally for all its endpoints | State-synchronizer token pattern is non-trivial |
| Session expiry refresh | Manual session extension logic | `session.updateAge` config in better-auth | Rolling session window needs atomic update |
| Cookie security attributes | Manually setting httpOnly/Secure | better-auth sets httpOnly + Secure in production automatically | Misconfiguration is the primary web auth vulnerability vector |
| User existence check for /setup | Custom "is first run" query | `db.select().from(users).limit(1)` then redirect — simple and direct | No abstraction needed here; one query is sufficient |

**Key insight:** better-auth manages the session lifecycle, cookie attributes, and CSRF protection internally. The application code only needs to call `auth.api.getSession()` and `auth.api` admin methods. Never re-implement what the library provides.

---

## Common Pitfalls

### Pitfall 1: Proxy Runtime vs Node Runtime Confusion
**What goes wrong:** Importing `lib/auth.ts` (which uses bcryptjs) into `proxy.ts`. This crashes at cold start with a runtime error because Edge runtime cannot execute bcryptjs native bindings.
**Why it happens:** Developers reach for the same `auth` import they use everywhere.
**How to avoid:** `proxy.ts` imports ONLY from `better-auth/cookies`. `lib/auth-server.ts` (which imports `lib/auth.ts`) is imported only by route handlers and Server Components.
**Warning signs:** Build warning "Module not found: Can't resolve 'bcrypt'" or runtime error "The edge runtime does not support Node.js..."

### Pitfall 2: middleware.ts vs proxy.ts (Next.js 16 Rename)
**What goes wrong:** Creating `middleware.ts` with `export function middleware()` instead of `proxy.ts` with `export function proxy()`. The middleware convention is deprecated in Next.js 16.
**Why it happens:** Most auth tutorials still use middleware.ts — documentation hasn't caught up.
**How to avoid:** The project runs Next.js 16.2.0. Create `proxy.ts` at the project root with `export async function proxy()` and `export const config = { matcher: [...] }`.
**Warning signs:** No redirect happening for unauthenticated users; or deprecation warnings in the build output.

### Pitfall 3: drizzle-orm Table Naming Mismatch
**What goes wrong:** better-auth's drizzle adapter looks for a table named `user` (singular) but this project uses plural naming convention (`users`, `sessions`, etc.).
**Why it happens:** better-auth defaults to singular table names internally.
**How to avoid:** Pass `usePlural: true` to `drizzleAdapter()`. This maps `user` → `users`, `session` → `sessions`, `account` → `accounts`, `verification` → `verifications` automatically.
**Warning signs:** `BetterAuthError: [# Drizzle Adapter]: The model "user" was not found in the schema object`

### Pitfall 4: getSessionCookie Returns null on Edge
**What goes wrong:** `getSessionCookie(request)` returns null even when the session cookie is valid, causing all users to be redirected to /login.
**Why it happens:** Known bug with certain Edge runtime configurations. The function may not read cookies correctly if the cookie prefix/name config was customized.
**How to avoid:** If `getSessionCookie()` proves unreliable, fall back to `request.cookies.get("better-auth.session_token")` directly in proxy.ts as a workaround. This is acceptable since proxy.ts is UX-only — security is in `requireSession()`.
**Warning signs:** All authenticated users redirected to /login; clearing cookies makes no difference.

### Pitfall 5: Admin Can Modify Own Account
**What goes wrong:** Admin deactivates or demotes themselves, locking out the only admin account permanently.
**Why it happens:** Server action doesn't check if `targetUserId === session.user.id`.
**How to avoid:** In every user management server action, compare `targetUserId` with `session.user.id` and return a 403 error if they match. Also disable the UI buttons with tooltip. Both layers needed.
**Warning signs:** Settings > Users tab allows editing the logged-in admin's own row.

### Pitfall 6: Cookie Cache Bug with getSession
**What goes wrong:** `auth.api.getSession({ headers: await headers() })` returns null in RSCs even though the user is logged in, when cookie cache is enabled.
**Why it happens:** Known better-auth issue (GitHub #7008) with cookie cache strategy and Next.js App Router RSC rendering.
**How to avoid:** Do NOT enable `cookieCache` in `lib/auth.ts` during Phase 26. Use the default (database-backed session validation). Re-evaluate in v3.1 if performance is a concern.
**Warning signs:** `requireSession()` returning null for clearly authenticated users in server components.

### Pitfall 7: Notifications Table user_id Mismatch
**What goes wrong:** The existing `app_notifications` table has `user_id TEXT NOT NULL DEFAULT 'default'` (migration 0019). After auth is added, this column needs to reference the actual user ID from the `users` table.
**Why it happens:** The column was scaffolded as a placeholder for single-user mode.
**How to avoid:** Migration `0020_users_auth.sql` must also ALTER the `app_notifications` table to either: (a) add a FK constraint to `users.id`, or (b) document that the column will be populated with session `user.id` going forward but left without FK for now (simpler). Plan must address this.
**Warning signs:** Notification queries returning no results after login is introduced.

---

## Code Examples

### Auth Route Handler Mount
```typescript
// app/api/auth/[...all]/route.ts
// Source: https://better-auth.com/docs/integrations/next
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Client-Side Login Form (rememberMe)
```typescript
// Source: https://better-auth.com/docs/basic-usage
import { authClient } from "@/lib/auth-client";

// No remember-me: session cookie (browser-close)
await authClient.signIn.email({
  email,
  password,
  rememberMe: false,
  callbackURL: "/",
});

// Remember-me: persistent 30-day session
await authClient.signIn.email({
  email,
  password,
  rememberMe: true,   // default
  callbackURL: "/",
});
```

### Server Component Session Check (pages)
```typescript
// Any app/**/page.tsx that is protected
// Source: https://better-auth.com/docs/integrations/next
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  // ... render page
}
```

### Route Handler with requireSession (example)
```typescript
// app/api/projects/route.ts — BEFORE
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects } from '@/db/schema'

export async function POST(req: NextRequest) {
  const body = await req.json()
  // ... existing logic
}

// app/api/projects/route.ts — AFTER
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { requireSession } from '@/lib/auth-server'

export async function POST(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  // ... existing logic unchanged below
}
```

### /setup First-Run Guard
```typescript
// app/setup/page.tsx
import { db } from "@/db";
import { users } from "@/db/schema";
import { redirect } from "next/navigation";

export default async function SetupPage() {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    redirect("/login"); // Hard redirect — no bypass
  }
  return <SetupForm />;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` + `export function middleware()` | `proxy.ts` + `export function proxy()` | Next.js 16.0 | Create proxy.ts, not middleware.ts in this project |
| Middleware as security boundary | Defense-in-depth: route handler auth checks mandatory | Post CVE-2025-29927 (March 2025) | Every route handler needs `requireSession()` |
| Auth.js / NextAuth.js | better-auth | 2024-2025 ecosystem shift | Native SAML, better TypeScript types, Drizzle adapter |
| Separate auth DB / migration system | Drizzle adapter reads existing schema | better-auth design | No separate migration pipeline; auth tables go in `0020_users_auth.sql` via drizzle-kit |

**Deprecated/outdated:**
- `getServerSession()` (NextAuth pattern): Replaced by `auth.api.getSession({ headers })` in better-auth
- `middleware.ts` file convention: Deprecated in Next.js 16; use `proxy.ts`
- Cookie cache (`cookieCache`) in better-auth: Has known null-session bug with Next.js RSC — avoid in v3.0

---

## Open Questions

1. **app_notifications user_id FK constraint**
   - What we know: Column exists as `TEXT DEFAULT 'default'` in migration 0019; no FK to users table
   - What's unclear: Should Phase 26 add an FK constraint, or just document that post-auth the column will be populated from `session.user.id`?
   - Recommendation: Add an ALTER TABLE in `0020_users_auth.sql` to drop the DEFAULT and allow null, but defer FK constraint to avoid migration risk on existing data; update notification creation code to pass actual `session.user.id`

2. **better-auth admin API for user management**
   - What we know: better-auth exposes `auth.api` for programmatic operations; the exact user CRUD methods available server-side are in the API reference but were not fully catalogued in this research
   - What's unclear: Is there a built-in `auth.api.adminCreateUser()` or do we use direct Drizzle queries + `bcryptjs.hash()` for admin-created users?
   - Recommendation: Use direct Drizzle insert with bcryptjs hash for admin-created users — simpler, more explicit, avoids uncertainty about which better-auth admin methods exist at v1.5.6

3. **nextCookies() plugin placement**
   - What we know: `nextCookies()` must be the last plugin in the array; required for Server Actions to set cookies
   - What's unclear: No Server Actions are currently planned — all auth ops use client-side `authClient`. Is nextCookies() needed?
   - Recommendation: Include it anyway (`plugins: [nextCookies()]`) — zero cost, ensures correctness if Server Actions are added in future phases

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `npm test -- --reporter=dot --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `signIn.email()` returns session; wrong password returns error | integration | `npm test -- --run tests/auth/login.test.ts` | Wave 0 |
| AUTH-01 | Login page renders without Sidebar/SearchBar | unit | `npm test -- --run tests/auth/login-page.test.tsx` | Wave 0 |
| AUTH-01 | `/setup` redirects to /login when users exist | integration | `npm test -- --run tests/auth/setup-guard.test.ts` | Wave 0 |
| AUTH-02 | Admin can create user via Settings Users tab | integration | `npm test -- --run tests/auth/user-management.test.ts` | Wave 0 |
| AUTH-02 | Admin cannot deactivate own account | unit | `npm test -- --run tests/auth/self-mod-guard.test.ts` | Wave 0 |
| AUTH-03 | `resolveRole()` returns "admin" for credential session with role="admin" | unit | `npm test -- --run tests/auth/resolve-role.test.ts` | Wave 0 |
| AUTH-03 | `resolveRole()` returns "admin" for OIDC session with groups=["Admins"] | unit | `npm test -- --run tests/auth/resolve-role.test.ts` | Wave 0 |
| AUTH-04 | users table has external_id column (nullable) | migration | `npm test -- --run tests/auth/schema.test.ts` | Wave 0 |
| AUTH-04 | `resolveRole()` accepts both session shapes without TypeScript error | unit | Covered by resolve-role.test.ts | Wave 0 |
| AUTH-05 | `requireSession()` returns 401 when no session cookie | unit | `npm test -- --run tests/auth/require-session.test.ts` | Wave 0 |
| AUTH-05 | CVE-2025-29927: Route handler returns 401 when x-middleware-subrequest header sent | integration | `npm test -- --run tests/auth/cve-2025-29927.test.ts` | Wave 0 |
| AUTH-05 | proxy.ts redirects to /login when no session cookie | unit | `npm test -- --run tests/auth/proxy.test.ts` | Wave 0 |

### CVE-2025-29927 Specific Test

The most important validation check — verify that even if proxy/middleware is bypassed, route handlers still enforce auth:

```typescript
// tests/auth/cve-2025-29927.test.ts
import { describe, it, expect } from "vitest";

describe("CVE-2025-29927 — Route Handler Defense-in-Depth", () => {
  it("returns 401 on protected route when x-middleware-subrequest header is present (no session)", async () => {
    const res = await fetch("http://localhost:3000/api/projects", {
      method: "GET",
      headers: {
        // Simulate CVE-2025-29927 attack header
        "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy",
      },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 without the attack header when no session cookie", async () => {
    const res = await fetch("http://localhost:3000/api/projects");
    expect(res.status).toBe(401);
  });
});
```

Note: This test requires a running Next.js server (`next start`). Run it as part of the phase gate verification, not per-task commit.

### Okta-Readiness Schema Verification

```typescript
// tests/auth/schema.test.ts
import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

describe("users table Okta-ready schema", () => {
  it("has external_id column that is nullable", async () => {
    const result = await db.execute(
      sql`SELECT column_name, is_nullable, data_type
          FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'external_id'`
    );
    expect(result.rows[0]).toMatchObject({
      column_name: "external_id",
      is_nullable: "YES",
      data_type: "text",
    });
  });

  it("has role column with default 'user'", async () => {
    const result = await db.execute(
      sql`SELECT column_default FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'role'`
    );
    expect(result.rows[0].column_default).toContain("user");
  });
});
```

### resolveRole() Okta-Readiness Verification

```typescript
// tests/auth/resolve-role.test.ts
import { describe, it, expect } from "vitest";
import { resolveRole } from "@/lib/auth-utils";

describe("resolveRole() — Okta-ready abstraction", () => {
  it("returns 'admin' for credential session with role admin", () => {
    expect(resolveRole({ user: { role: "admin" } })).toBe("admin");
  });
  it("returns 'user' for credential session with role user", () => {
    expect(resolveRole({ user: { role: "user" } })).toBe("user");
  });
  it("returns 'admin' for future OIDC session with groups=['Admins']", () => {
    expect(resolveRole({ claims: { groups: ["Admins"] } })).toBe("admin");
  });
  it("returns 'admin' for future OIDC session with roles=['admin']", () => {
    expect(resolveRole({ claims: { roles: ["admin"] } })).toBe("admin");
  });
  it("returns 'user' for OIDC session with no admin claims", () => {
    expect(resolveRole({ claims: { groups: ["Users"] } })).toBe("user");
  });
});
```

### Sampling Rate
- **Per task commit:** `npm test -- --reporter=dot --run tests/auth/`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green + CVE test against running server before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/auth/login.test.ts` — covers AUTH-01 login flow
- [ ] `tests/auth/login-page.test.tsx` — covers AUTH-01 page rendering
- [ ] `tests/auth/setup-guard.test.ts` — covers AUTH-01 /setup redirect
- [ ] `tests/auth/user-management.test.ts` — covers AUTH-02 admin user CRUD
- [ ] `tests/auth/self-mod-guard.test.ts` — covers AUTH-02 self-mod protection
- [ ] `tests/auth/resolve-role.test.ts` — covers AUTH-03 and AUTH-04 resolveRole
- [ ] `tests/auth/schema.test.ts` — covers AUTH-04 DB schema verification
- [ ] `tests/auth/require-session.test.ts` — covers AUTH-05 requireSession()
- [ ] `tests/auth/cve-2025-29927.test.ts` — covers AUTH-05 CVE mitigation (integration, needs running server)
- [ ] `tests/auth/proxy.test.ts` — covers AUTH-05 proxy redirect behavior

---

## Sources

### Primary (HIGH confidence)
- [better-auth official docs — Installation](https://www.better-auth.com/docs/installation) — setup, emailAndPassword config
- [better-auth official docs — Next.js Integration](https://better-auth.com/docs/integrations/next) — proxy.ts, getSessionCookie, toNextJsHandler
- [better-auth official docs — Drizzle Adapter](https://better-auth.com/docs/adapters/drizzle) — usePlural, schema, additionalFields
- [better-auth official docs — Session Management](https://www.better-auth.com/docs/concepts/session-management) — expiresIn, updateAge, rememberMe
- [better-auth official docs — Email/Password](https://www.better-auth.com/docs/authentication/email-password) — disableSignUp, password hash/verify
- [better-auth official docs — Basic Usage](https://www.better-auth.com/docs/basic-usage) — authClient, signIn.email rememberMe param
- [Next.js official docs — proxy.js convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — Next.js 16 proxy rename
- [JFrog CVE-2025-29927 analysis](https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/) — CVSS 9.1, exploit mechanics, defense-in-depth pattern

### Secondary (MEDIUM confidence)
- [better-auth GitHub issue #7008](https://github.com/better-auth/better-auth/issues/7008) — cookie cache + RSC null session bug (verified: avoid cookieCache in v3.0)
- [better-auth GitHub issue #2170](https://github.com/better-auth/better-auth/issues/2170) — getSessionCookie returns null in Edge (workaround: direct cookie read)
- WebSearch — better-auth + Drizzle custom columns pattern (verified against official additionalFields docs)

### Tertiary (LOW confidence)
- WebSearch — session expired modal React context pattern (pattern is well-established but not better-auth specific; verify against actual 401 response format in requireSession())

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — better-auth 1.5.6, bcryptjs, versions verified against official docs and package.json
- Architecture: HIGH — proxy.ts pattern, requireSession() pattern, drizzle adapter verified against official better-auth docs
- Pitfalls: HIGH — Edge runtime crash, drizzle naming mismatch verified against official docs and GitHub issues; CVE-2025-29927 mechanics verified against JFrog analysis
- Session expired modal: MEDIUM — pattern verified conceptually; exact fetch interception implementation to be validated during implementation

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (better-auth releases frequently; re-verify if upgrading past 1.5.6)
