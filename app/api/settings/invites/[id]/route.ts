/**
 * DELETE /api/settings/invites/[id] — cancel a pending invite (admin only)
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth-server";
import { resolveRole } from "@/lib/auth-utils";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (resolveRole(session!) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const deleted = await db
    .delete(invites)
    .where(eq(invites.id, id))
    .returning({ id: invites.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
