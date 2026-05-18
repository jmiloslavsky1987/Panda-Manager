/**
 * lib/auth-client.ts — Browser-side better-auth client
 *
 * Use "use client" in any component that imports from this file.
 * basePath must match the route handler mount point in app/api/auth/[...all]/route.ts
 */

import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";

// Phase 86: genericOAuthClient() registers signIn.oauth2() on authClient.
// Safe with Okta env blank — the client plugin only adds method shims;
// no network calls fire until signIn.oauth2({ providerId: 'okta' }) is invoked.
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [genericOAuthClient()],
});

// Re-export convenience methods
export const { signIn, signOut, useSession, getSession } = authClient;
