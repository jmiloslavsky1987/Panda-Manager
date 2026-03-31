import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";

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
  // Use better-auth admin API to create the first user with admin role
  await auth.api.createUser({
    body: {
      email,
      password,
      name: email.split("@")[0],
      role: "admin",
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
