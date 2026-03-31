/**
 * lib/auth.ts — better-auth server instance (Node.js runtime only)
 *
 * NEVER import this in Edge runtime contexts (middleware.ts, edge API routes).
 * For Edge-safe session checking, use lib/session-edge.ts (Phase 26 Wave 2).
 *
 * CRITICAL: cookieCache is intentionally omitted — known bug #7008 with
 * Next.js App Router RSC (race condition in cache invalidation).
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,  // maps 'user' -> 'users', 'session' -> 'sessions' (project uses plural table names)
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,  // No self-signup; admin creates users via Settings > Users tab
    password: {
      hash: async (password: string) => {
        const bcrypt = await import("bcryptjs");
        return bcrypt.hash(password, 12);
      },
      verify: async ({ password, hash }: { password: string; hash: string }) => {
        const bcrypt = await import("bcryptjs");
        return bcrypt.compare(password, hash);
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,  // 30 days (remember me path)
    updateAge: 60 * 60 * 24,        // Refresh token daily
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false,
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
  plugins: [nextCookies()],  // Must be last; enables cookie setting in Server Actions
});
