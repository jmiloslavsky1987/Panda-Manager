'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DraftEditModal } from './DraftEditModal';

interface Draft {
  id: number;
  draft_type: string;
  recipient: string | null;
  subject: string | null;
  content: string;
  status: string;
  created_at: string;
  project_name: string | null;
}

export function DraftsInbox() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [modalDraft, setModalDraft] = useState<Draft | null>(null);

  const loadDrafts = async () => {
    const res = await fetch('/api/drafts');
    if (res.ok) setDrafts(await res.json());
  };

  useEffect(() => { loadDrafts(); }, []);

  const dismiss = async (id: number) => {
    await fetch(`/api/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    });
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  return (
    <section data-testid="drafts-inbox" className="mt-6">
      <h2 className="text-base font-semibold text-zinc-900 mb-3">Drafts Inbox</h2>
      {drafts.length === 0 ? (
        <p className="text-sm text-zinc-500">No pending drafts</p>
      ) : (
        <div className="space-y-2">
          {drafts.map(draft => (
            <div
              key={draft.id}
              data-testid="draft-item"
              className="border border-zinc-200 rounded-lg p-3 bg-white cursor-pointer hover:bg-zinc-50"
              onClick={() => setModalDraft(draft)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{draft.draft_type}</span>
                    {draft.project_name && <span className="text-xs text-zinc-400">— {draft.project_name}</span>}
                    {draft.subject && <span className="text-sm font-medium text-zinc-800 truncate">{draft.subject}</span>}
                  </div>
                  <p className="text-sm text-zinc-700 line-clamp-2">
                    {draft.content}
                  </p>
                </div>
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { navigator.clipboard.writeText(draft.content); toast.success('Copied to clipboard'); }}
                    className="text-xs px-2 py-1 border border-zinc-200 rounded hover:bg-zinc-50"
                  >Copy</button>
                  <button
                    onClick={() => { toast.info('Gmail Draft creation coming in Phase 6 (MCP integration)'); }}
                    className="text-xs px-2 py-1 border border-zinc-200 rounded hover:bg-zinc-50"
                  >Gmail Draft</button>
                  <button
                    onClick={() => { toast.info('Slack send coming in Phase 6 (MCP integration)'); }}
                    className="text-xs px-2 py-1 border border-zinc-200 rounded hover:bg-zinc-50"
                  >Slack</button>
                  <button
                    onClick={() => dismiss(draft.id)}
                    className="text-xs px-2 py-1 text-zinc-500 hover:text-red-600"
                  >Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalDraft && (
        <DraftEditModal
          draft={modalDraft}
          open={true}
          onOpenChange={(v) => { if (!v) setModalDraft(null); }}
          onSaved={(updated) => {
            setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d));
            setModalDraft(null);
          }}
          onDismissed={(id) => {
            setDrafts(prev => prev.filter(d => d.id !== id));
            setModalDraft(null);
          }}
        />
      )}
    </section>
  );
}
