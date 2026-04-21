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
import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveRole } from "@/lib/auth-utils";

export type SessionResult =
  | { session: Awaited<ReturnType<typeof auth.api.getSession>>; redirectResponse: null }
  | { session: null; redirectResponse: NextResponse };

/**
 * requireSession() — CVE-2025-29927 defense-in-depth enforcement.
 * Call at the TOP of every Route Handler. The proxy layer is UX-only;
 * this is the actual security boundary.
 */
export async function requireSession(): Promise<SessionResult> {
  const h = await headers();
  // Convert ReadonlyHeaders to a plain object so better-call's
  // `new Headers(context.headers)` path works correctly — the instanceof
  // Headers check fails in Docker because Next.js ReadonlyHeaders is a
  // different class than the one better-call compiled against.
  const headersObj: Record<string, string> = {};
  h.forEach((value, key) => { headersObj[key] = value; });
  const session = await auth.api.getSession({ headers: new Headers(headersObj) });
  if (!session) {
    return {
      session: null,
      redirectResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, redirectResponse: null };
}

export type ProjectRoleResult =
  | { session: NonNullable<SessionResult['session']>; redirectResponse: null; projectRole: 'admin' | 'user' }
  | { session: null; redirectResponse: NextResponse; projectRole: null };

/**
 * requireProjectRole() — Per-project RBAC enforcement.
 * Checks if user has required role for a specific project.
 * Global admins (resolveRole returns 'admin') bypass project membership checks.
 */
export async function requireProjectRole(
  projectId: number,
  minRole: 'admin' | 'user' = 'user'
): Promise<ProjectRoleResult> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return { session: null, redirectResponse, projectRole: null };

  // Global admin short-circuit — no need to check project_members
  if (resolveRole(session!) === 'admin') {
    return { session: session!, redirectResponse: null, projectRole: 'admin' };
  }

  // Check project membership
  const [member] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(
      eq(projectMembers.project_id, projectId),
      eq(projectMembers.user_id, session!.user.id)
    ))
    .limit(1);

  if (!member) {
    return {
      session: null,
      redirectResponse: NextResponse.json(
        { error: 'Forbidden: not a member of this project' },
        { status: 403 }
      ),
      projectRole: null,
    };
  }

  if (minRole === 'admin' && member.role !== 'admin') {
    return {
      session: null,
      redirectResponse: NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      ),
      projectRole: null,
    };
  }

  return { session: session!, redirectResponse: null, projectRole: member.role };
}
