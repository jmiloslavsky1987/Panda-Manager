"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <AcceptInviteForm />
      </Suspense>
    </div>
  );
}

type Status = "loading" | "valid" | "invalid" | "submitting" | "success";

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<Status>("loading");
  const [inviteEmail, setInviteEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("No invite token found in the URL.");
      setStatus("invalid");
      return;
    }
    fetch(`/api/auth/invite/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error ?? "Invalid or expired invite link.");
          setStatus("invalid");
        } else {
          setInviteEmail(data.email);
          setName(data.email.split("@")[0]);
          setStatus("valid");
        }
      })
      .catch(() => {
        setErrorMsg("Failed to validate invite. Please try again.");
        setStatus("invalid");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    setErrorMsg("");
    setStatus("submitting");
    try {
      const res = await fetch(`/api/auth/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to accept invite.");
        setStatus("valid");
        return;
      }
      setStatus("success");
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("valid");
    }
  }

  if (status === "loading") {
    return <p className="text-muted-foreground">Validating invite...</p>;
  }

  if (status === "invalid") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Invalid Invite</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Account Activated</CardTitle>
          <CardDescription>Redirecting to sign in...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your account has been created. You can now sign in with your email and password.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Accept Invite</CardTitle>
        <CardDescription>Set your password to activate your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <Alert variant="destructive">
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={inviteEmail} readOnly className="bg-muted text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repeat password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={status === "submitting"}>
            {status === "submitting" ? "Activating..." : "Activate account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
