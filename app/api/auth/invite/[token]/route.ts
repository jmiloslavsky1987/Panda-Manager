/**
 * Public invite token API — no session required.
 *
 * GET  /api/auth/invite/[token] — validate token, return { email, role }
 * POST /api/auth/invite/[token] — accept invite: create user + account, delete invite
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { invites, users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const [invite] = await db
    .select({ email: invites.email, role: invites.role, expiresAt: invites.expiresAt })
    .from(invites)
    .where(eq(invites.token, token));

  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  return NextResponse.json({ email: invite.email, role: invite.role });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let body: { password: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { password, name } = body;
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const [invite] = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token));

  if (!invite) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  // Guard: email must not already be registered
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, invite.email));

  if (existingUser) {
    await db.delete(invites).where(eq(invites.token, token));
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in." },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, 12);
  const now = new Date();
  const userId = randomUUID();
  const displayName = name?.trim() || invite.email.split("@")[0];

  await db.insert(users).values({
    id: userId,
    name: displayName,
    email: invite.email,
    emailVerified: true,
    role: invite.role,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(accounts).values({
    id: randomUUID(),
    accountId: invite.email,
    providerId: "credential",
    userId,
    password: hash,
    createdAt: now,
    updatedAt: now,
  });

  await db.delete(invites).where(eq(invites.token, token));

  return NextResponse.json({ ok: true });
}
