import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth-server";
import { resolveRole } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";

// GET /api/settings/users — admin only: list all users
export async function GET() {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (resolveRole(session) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);
  return NextResponse.json(allUsers);
}

// POST /api/settings/users — admin only: create a new user
export async function POST(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (resolveRole(session) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { email, password, name, role } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: name ?? email.split("@")[0],
      role: role === "admin" ? "admin" : "user",
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

// PUT /api/settings/users — admin only: update a user (email, role, password reset)
export async function PUT(req: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;
  if (resolveRole(session) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, email, role, password, active } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "User id required" }, { status: 400 });
  }
  // Self-modification guard — admin cannot modify own account
  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot modify your own account" }, { status: 403 });
  }
  const updates: Record<string, unknown> = {};
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role === "admin" ? "admin" : "user";
  if (active !== undefined) updates.active = active;
  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id));
  }
  // Password reset — hash and update accounts table directly
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
  if (resolveRole(session) !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "User id required" }, { status: 400 });
  }
  // Self-modification guard
  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot modify your own account" }, { status: 403 });
  }
  await db.update(users).set({ active: false }).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
