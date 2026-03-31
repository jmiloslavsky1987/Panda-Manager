import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, accounts, invites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth-server";
import { resolveRole } from "@/lib/auth-utils";
import { randomUUID } from "crypto";
import { sendInviteEmail } from "@/lib/email";

// GET /api/settings/users — admin only: list all users + pending invites
export async function GET() {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (resolveRole(session!) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [allUsers, pendingInvites] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt),
    db
      .select({
        id: invites.id,
        email: invites.email,
        role: invites.role,
        expiresAt: invites.expiresAt,
        createdAt: invites.createdAt,
      })
      .from(invites)
      .orderBy(invites.createdAt),
  ]);

  return NextResponse.json({ users: allUsers, pendingInvites });
}

// POST /api/settings/users — admin only: send invite email to a new user
export async function POST(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (resolveRole(session!) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { email, role } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Check no existing user with this email
  const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existingUser.length > 0) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  // Check no existing pending invite for this email
  const existingInvite = await db.select({ id: invites.id }).from(invites).where(eq(invites.email, email));
  if (existingInvite.length > 0) {
    return NextResponse.json({ error: "An invite for this email is already pending" }, { status: 409 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await db.insert(invites).values({
    id: randomUUID(),
    email,
    role: role === "admin" ? "admin" : "user",
    token,
    invitedBy: session!.user.id,
    expiresAt,
  });

  const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/accept-invite?token=${token}`;

  try {
    await sendInviteEmail(email, inviteUrl, session!.user.name ?? "An admin");
  } catch (err) {
    // Roll back invite if email send fails
    await db.delete(invites).where(eq(invites.token, token));
    const message = err instanceof Error ? err.message : "Failed to send invite email";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invited: email }, { status: 201 });
}

// PUT /api/settings/users — admin only: update a user (email, role, password reset)
export async function PUT(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (resolveRole(session!) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, email, role, password, active } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "User id required" }, { status: 400 });
  }
  // Self-modification guard — admin cannot modify own account
  if (id === session!.user.id) {
    return NextResponse.json({ error: "You cannot modify your own account" }, { status: 403 });
  }
  const updates: Record<string, unknown> = {};
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role === "admin" ? "admin" : "user";
  if (active !== undefined) updates.active = active;
  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id));
  }
  // Password reset — hash and update accounts table directly (no better-auth public API for this)
  if (password) {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(password, 12);
    await db
      .update(accounts)
      .set({ password: hash })
      .where(eq(accounts.userId, id));
  }
  return NextResponse.json({ ok: true });
}

// PATCH /api/settings/users — admin only: deactivate a user (soft delete)
export async function PATCH(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (resolveRole(session!) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "User id required" }, { status: 400 });
  }
  // Self-modification guard
  if (id === session!.user.id) {
    return NextResponse.json({ error: "You cannot modify your own account" }, { status: 403 });
  }
  await db.update(users).set({ active: false }).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
