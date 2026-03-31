"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export function UsersTab() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id;

  const [users, setUsers] = useState<User[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Edit form
  const [editForm, setEditForm] = useState({ email: "", name: "", role: "user", password: "" });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchWithAuth("/api/settings/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
      setPendingInvites(data.pendingInvites ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSelf = (userId: string) => userId === currentUserId;

  // ── Invite ──────────────────────────────────────────────────────────────────

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setInviting(true);
    try {
      const res = await fetchWithAuth("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const d = await res.json();
      if (!res.ok) {
        setInviteError(d.error ?? "Failed to send invite");
      } else {
        setInviteSuccess(`Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        await loadData();
      }
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    const res = await fetchWithAuth(`/api/settings/invites/${id}`, { method: "DELETE" });
    if (res.ok) setPendingInvites((prev) => prev.filter((inv) => inv.id !== id));
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const handleEdit = (user: User) => {
    setExpandedRow(user.id);
    setEditForm({ email: user.email, name: user.name, role: user.role, password: "" });
    setEditError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetchWithAuth("/api/settings/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: expandedRow, ...editForm }),
      });
      if (!res.ok) {
        const d = await res.json();
        setEditError(d.error ?? "Failed to update user");
        return;
      }
      setExpandedRow(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    const res = await fetchWithAuth("/api/settings/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId }),
    });
    if (res.ok) await loadData();
  };

  if (loading) return <div className="text-muted-foreground py-4">Loading users...</div>;

  return (
    <TooltipProvider>
      <div className="space-y-6">

        {/* ── Send Invite ─────────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Invite New User</h3>
          <form onSubmit={handleSendInvite} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role" className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm" disabled={inviting}>
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </form>
          {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          {inviteSuccess && <p className="text-sm text-green-600">{inviteSuccess}</p>}
        </div>

        {/* ── Active Users ─────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">User Accounts</h3>
          {editError && <p className="text-sm text-destructive">{editError}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <>
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active ? "outline" : "destructive"}>
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isSelf(user.id) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex gap-2">
                              <Button size="sm" variant="outline" disabled>Edit</Button>
                              <Button size="sm" variant="outline" disabled>Deactivate</Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>You cannot modify your own account</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="inline-flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                            Edit
                          </Button>
                          {user.active && (
                            <Button size="sm" variant="outline" onClick={() => handleDeactivate(user.id)}>
                              Deactivate
                            </Button>
                          )}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedRow === user.id && (
                    <TableRow key={`${user.id}-edit`}>
                      <TableCell colSpan={4}>
                        <EditForm
                          form={editForm}
                          setForm={setEditForm}
                          onSave={handleSave}
                          onCancel={() => setExpandedRow(null)}
                          saving={saving}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* ── Pending Invites ──────────────────────────────────────────────────── */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Pending Invites ({pendingInvites.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant={inv.role === "admin" ? "default" : "secondary"}>
                        {inv.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancelInvite(inv.id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

interface EditFormProps {
  form: { email: string; name: string; role: string; password: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ email: string; name: string; role: string; password: string }>
  >;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function EditForm({ form, setForm, onSave, onCancel, saving }: EditFormProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-md">
      <div className="space-y-1">
        <Label htmlFor="edit-email">Email</Label>
        <Input
          id="edit-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-name">Name</Label>
        <Input
          id="edit-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-role">Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
          <SelectTrigger id="edit-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-password">New password (leave blank to keep)</Label>
        <Input
          id="edit-password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
