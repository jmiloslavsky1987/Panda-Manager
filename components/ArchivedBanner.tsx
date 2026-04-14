'use client';

import { useState } from 'react';
import { Archive } from 'lucide-react';

interface ArchivedBannerProps {
  projectId: number;
  isAdmin: boolean;
}

export function ArchivedBanner({ projectId, isAdmin }: ArchivedBannerProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleRestore() {
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        alert(error ?? 'Failed to restore project');
        return;
      }

      // Hard navigation so the root layout (sidebar) re-fetches from the server
      window.location.href = '/';
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-amber-800 font-medium">
        <Archive className="w-4 h-4" />
        <span>Archived — read only</span>
      </div>

      {isAdmin && (
        <button
          onClick={handleRestore}
          disabled={isRestoring}
          className="text-sm font-medium text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
        >
          {isRestoring ? 'Restoring…' : 'Restore project'}
        </button>
      )}
    </div>
  );
}
