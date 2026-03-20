'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<Record<number, string>>({});

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

  const save = async (id: number) => {
    const content = editContent[id];
    if (!content) return;
    await fetch(`/api/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', content }),
    });
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, content } : d));
    setExpandedId(null);
  };

  return (
    <section data-testid="drafts-inbox" className="mt-6">
      <h2 className="text-base font-semibold text-zinc-900 mb-3">Drafts Inbox</h2>
      {drafts.length === 0 ? (
        <p className="text-sm text-zinc-500">No pending drafts</p>
      ) : (
        <div className="space-y-2">
          {drafts.map(draft => (
            <div key={draft.id} data-testid="draft-item" className="border border-zinc-200 rounded-lg p-3 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{draft.draft_type}</span>
                    {draft.project_name && <span className="text-xs text-zinc-400">— {draft.project_name}</span>}
                    {draft.subject && <span className="text-sm font-medium text-zinc-800 truncate">{draft.subject}</span>}
                  </div>
                  {expandedId === draft.id ? (
                    <div>
                      <textarea
                        className="w-full text-sm border border-zinc-200 rounded p-2 min-h-24 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        value={editContent[draft.id] ?? draft.content}
                        onChange={e => setEditContent(prev => ({ ...prev, [draft.id]: e.target.value }))}
                      />
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => save(draft.id)} className="text-xs px-2 py-1 bg-zinc-900 text-white rounded">Save</button>
                        <button onClick={() => setExpandedId(null)} className="text-xs px-2 py-1 border border-zinc-200 rounded">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-sm text-zinc-700 line-clamp-2 cursor-pointer hover:line-clamp-none"
                      onClick={() => {
                        setExpandedId(draft.id);
                        setEditContent(prev => ({ ...prev, [draft.id]: draft.content }));
                      }}
                    >
                      {draft.content}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
    </section>
  );
}
