'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SprintSummaryPanelProps {
  projectId: number;
}

export function SprintSummaryPanel({ projectId }: SprintSummaryPanelProps) {
  const [open, setOpen] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    // Fetch stored summary on mount
    fetch(`/api/projects/${projectId}/sprint-summary`)
      .then(r => r.json())
      .then(data => {
        setSummary(data.summary ?? null);
        setGeneratedAt(data.generated_at ?? null);
        setFetched(true);
      })
      .catch(() => setFetched(true));
  }, [projectId]);

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sprint-summary`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setSummary(data.summary);
      setGeneratedAt(data.generated_at);
      setOpen(true);
      toast.success('Sprint summary updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate sprint summary');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-zinc-200 bg-zinc-50" data-testid="sprint-summary-panel">
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 hover:text-zinc-900"
          data-testid="sprint-summary-toggle"
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Sprint Summary
          {generatedAt && (
            <span className="text-xs text-zinc-400 font-normal ml-1">
              {new Date(generatedAt).toLocaleDateString()}
            </span>
          )}
        </button>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
          data-testid="sprint-summary-refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {open && fetched && (
        <div className="px-4 pb-3">
          {summary ? (
            <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{summary}</p>
          ) : (
            <p className="text-sm text-zinc-400 italic">
              No sprint summary yet. Click Refresh to generate one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
