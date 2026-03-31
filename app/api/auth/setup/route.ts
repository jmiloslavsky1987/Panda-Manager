import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  // Guard: if any user exists, refuse — setup is one-time only
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Setup already complete" }, { status: 403 });
  }

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // Insert directly — auth.api.signUpEmail() respects disableSignUp:true even server-side.
  // Bootstrap bypasses that restriction by writing to the DB directly.
  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    id: userId,
    name: email.split("@")[0],
    email,
    emailVerified: true,
    role: "admin",
    active: true,
  });

  await db.insert(accounts).values({
    id: randomUUID(),
    accountId: email,
    providerId: "credential",
    userId,
    password: passwordHash,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
