'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

interface DangerZoneSectionProps {
  projectId: number;
  isArchived: boolean;
}

export function DangerZoneSection({ projectId, isArchived }: DangerZoneSectionProps) {
  const router = useRouter();

  async function handleArchive() {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error);
    }

    router.push('/');
  }

  async function handleDelete() {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error);
    }

    router.push('/');
  }

  return (
    <div className="mt-8 border border-red-200 rounded-lg p-6">
      <div className="flex items-center gap-2 text-base font-semibold text-red-700 mb-4">
        <AlertTriangle className="w-5 h-5" />
        <h3>Danger Zone</h3>
      </div>

      {/* Archive project row */}
      <div className="flex items-center justify-between gap-4 py-3 border-b border-red-100">
        <div className="flex-1">
          <p className="text-sm text-zinc-700">
            Archive this project — it becomes read-only. Can be restored later.
          </p>
        </div>
        {!isArchived && (
          <DeleteConfirmDialog
            entityLabel="this project"
            onConfirm={handleArchive}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Archive project
              </Button>
            }
          />
        )}
      </div>

      {/* Delete permanently row */}
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="flex-1">
          <p className="text-sm text-zinc-700">
            Permanently delete this project and all its data. This cannot be undone.
          </p>
        </div>
        {isArchived ? (
          <DeleteConfirmDialog
            entityLabel="this project permanently"
            onConfirm={handleDelete}
            trigger={
              <Button variant="destructive" size="sm">
                Delete permanently
              </Button>
            }
          />
        ) : (
          <Button
            variant="destructive"
            size="sm"
            disabled
            title="Archive the project first before deleting permanently"
          >
            Delete permanently
          </Button>
        )}
      </div>
    </div>
  );
}
