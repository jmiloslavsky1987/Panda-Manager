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

export function UsersTab() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null); // userId or "new"
  const [form, setForm] = useState({ email: "", name: "", role: "user", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const res = await fetchWithAuth("/api/settings/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSelf = (userId: string) => userId === currentUserId;

  const handleEdit = (user: User) => {
    setExpandedRow(user.id);
    setForm({ email: user.email, name: user.name, role: user.role, password: "" });
    setError(null);
  };

  const handleNew = () => {
    setExpandedRow("new");
    setForm({ email: "", name: "", role: "user", password: "" });
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (expandedRow === "new") {
        const res = await fetchWithAuth("/api/settings/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Failed to create user");
          return;
        }
      } else {
        const res = await fetchWithAuth("/api/settings/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: expandedRow, ...form }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Failed to update user");
          return;
        }
      }
      setExpandedRow(null);
      await loadUsers();
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
    if (res.ok) await loadUsers();
  };

  if (loading) return <div className="text-muted-foreground py-4">Loading users...</div>;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">User Accounts</h3>
          <Button size="sm" onClick={handleNew}>Add user</Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
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
            {/* New user inline form row */}
            {expandedRow === "new" && (
              <TableRow>
                <TableCell colSpan={4}>
                  <InlineForm
                    form={form}
                    setForm={setForm}
                    isNew
                    onSave={handleSave}
                    onCancel={() => setExpandedRow(null)}
                    saving={saving}
                  />
                </TableCell>
              </TableRow>
            )}
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
                            <Button size="sm" variant="outline" disabled>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" disabled>
                              Deactivate
                            </Button>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeactivate(user.id)}
                          >
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
                      <InlineForm
                        form={form}
                        setForm={setForm}
                        isNew={false}
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
    </TooltipProvider>
  );
}

interface FormProps {
  form: { email: string; name: string; role: string; password: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ email: string; name: string; role: string; password: string }>
  >;
  isNew: boolean;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function InlineForm({ form, setForm, isNew, onSave, onCancel, saving }: FormProps) {
  return (
    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-md">
      <div className="space-y-1">
        <Label htmlFor="user-email">Email</Label>
        <Input
          id="user-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="user-name">Name</Label>
        <Input
          id="user-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="user-role">Role</Label>
        <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
          <SelectTrigger id="user-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="user-password">
          {isNew ? "Password" : "New password (leave blank to keep)"}
        </Label>
        <Input
          id="user-password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
