"use client";
import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

interface Member {
  id: number;
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface MembersTabProps {
  projectId: number;
  isProjectAdmin: boolean;
}

export function MembersTab({ projectId, isProjectAdmin }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('user');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      } else {
        let errMsg = 'Failed to load members';
        try {
          const errData = await res.json();
          errMsg = errData.error ?? errMsg;
        } catch {
          // Response wasn't JSON, use status text
          errMsg = `Error ${res.status}: ${res.statusText}`;
        }
        setError(errMsg);
      }
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Network error loading members');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/settings/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users ?? []);
      }
    } catch {
      // Silently fail - will show empty user list
    }
  };

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setAddError('Please select a user');
      return;
    }

    setAdding(true);
    setAddError(null);
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddError(data.error ?? 'Failed to add member');
        return;
      }

      // Success - reset and reload
      setAddDialogOpen(false);
      setSelectedUserId('');
      setSelectedRole('user');
      await loadMembers();
    } finally {
      setAdding(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        await loadMembers();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to change role');
      }
    } catch {
      setError('Network error changing role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetchWithAuth(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        await loadMembers();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to remove member');
      }
    } catch {
      setError('Network error removing member');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground py-4">Loading members...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Add Member button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Project Members</h2>
        {isProjectAdmin && (
          <Dialog open={addDialogOpen} onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (open) {
              loadUsers();
              setAddError(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Project Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user-select">User</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-select">Role</Label>
                  <Select
                    value={selectedRole}
                    onValueChange={(v) => setSelectedRole(v as 'admin' | 'user')}
                  >
                    <SelectTrigger id="role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {addError && <p className="text-sm text-destructive">{addError}</p>}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                    disabled={adding}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddMember} disabled={adding}>
                    {adding ? 'Adding...' : 'Add Member'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Members table */}
      <div className="space-y-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {isProjectAdmin && <TableHead className="w-[200px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isProjectAdmin ? 4 : 3} className="text-center py-8">
                  <span className="text-muted-foreground">No members found</span>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {isProjectAdmin ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleChangeRole(member.userId, v as 'admin' | 'user')}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <Badge variant="secondary">User</Badge>
                          </SelectItem>
                          <SelectItem value="admin">
                            <Badge variant="default">Admin</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                        {member.role === 'admin' ? 'Admin' : 'User'}
                      </Badge>
                    )}
                  </TableCell>
                  {isProjectAdmin && (
                    <TableCell>
                      <DeleteConfirmDialog
                        entityLabel={`${member.name}`}
                        onConfirm={() => handleRemoveMember(member.userId)}
                        trigger={
                          <Button size="sm" variant="outline" className="text-destructive">
                            Remove
                          </Button>
                        }
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
