/**
 * lib/auth-client.ts — Browser-side better-auth client
 *
 * Use "use client" in any component that imports from this file.
 * basePath must match the route handler mount point in app/api/auth/[...all]/route.ts
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
});

// Re-export convenience methods
export const { signIn, signOut, useSession, getSession } = authClient;
