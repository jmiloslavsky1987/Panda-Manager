import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SetupForm } from "@/components/SetupForm";

export default async function SetupPage() {
  // Guard: if any user exists, redirect to login immediately — no bypass
  const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
  if (existingUsers.length > 0) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SetupForm />
    </div>
  );
}
