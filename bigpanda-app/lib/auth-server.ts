/**
 * lib/auth-server.ts — Route handler session enforcement (Node.js runtime)
 *
 * Imported by ALL route handlers. requireSession() is the actual security
 * boundary for CVE-2025-29927 defense-in-depth.
 *
 * The middleware/proxy layer is UX-only (redirects to login page).
 * This is the real auth gate that cannot be bypassed via header manipulation.
 *
 * Usage:
 *   const { session, redirectResponse } = await requireSession();
 *   if (redirectResponse) return redirectResponse;
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type SessionResult =
  | { session: Awaited<ReturnType<typeof auth.api.getSession>>; redirectResponse: null }
  | { session: null; redirectResponse: NextResponse };

/**
 * requireSession() — CVE-2025-29927 defense-in-depth enforcement.
 * Call at the TOP of every Route Handler. The proxy layer is UX-only;
 * this is the actual security boundary.
 */
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
