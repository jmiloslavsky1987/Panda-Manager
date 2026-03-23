'use client';
// bigpanda-app/app/customer/[id]/skills/[runId]/page.tsx
// Skill run detail page — checks run status before subscribing to SSE.
// If run is already completed, shows full_output without re-triggering.
// Uses native EventSource for real-time streaming.
// On SSE 'done', re-fetches full_output from DB to avoid client-side accumulation bugs.
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

type RunStatus = 'loading' | 'streaming' | 'done' | 'failed';

type RunResponse = { status?: string; skill_name?: string; full_output?: string; error_message?: string };

export default function SkillRunPage() {
  const params = useParams();
  const runId = params.runId as string;
  const projectId = params.id as string;
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<RunStatus>('loading');
  const [skillName, setSkillName] = useState('');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Check if run already complete — prevents duplicate SSE subscription on page return
    fetch(`/api/skills/runs/${runId}`)
      .then(r => r.json())
      .then((run: RunResponse) => {
        setSkillName(run.skill_name ?? '');

        if (run.status === 'completed') {
          setOutput(run.full_output ?? '');
          setStatus('done');
          return;
        }

        if (run.status === 'failed') {
          setOutput(run.error_message ?? 'Run failed');
          setStatus('failed');
          return;
        }

        // Subscribe to SSE — run is pending or running
        const es = new EventSource(`/api/skills/runs/${runId}/stream`);
        esRef.current = es;

        es.onmessage = (e) => {
          const { text } = JSON.parse(e.data as string) as { text: string };
          setOutput(prev => prev + text);
          setStatus('streaming');
        };

        // On done: re-fetch full_output from DB — authoritative source, eliminates
        // any client-side accumulation bugs from SSE reconnects.
        es.addEventListener('done', () => {
          es.close();
          fetch(`/api/skills/runs/${runId}`)
            .then(r => r.json())
            .then((completed: RunResponse) => {
              setOutput(completed.full_output ?? '');
              setStatus('done');
            })
            .catch(() => setStatus('done')); // keep streaming output on fetch failure
        });

        es.onerror = () => {
          setStatus('failed');
          es.close();
        };
      })
      .catch(() => setStatus('failed'));

    return () => esRef.current?.close();
  }, [runId]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href={`/customer/${projectId}/skills`}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          &larr; Back to Skills
        </Link>
      </div>

      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold capitalize">
          {skillName ? skillName.replace(/-/g, ' ') : 'Skill Run'}
        </h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            status === 'loading'
              ? 'bg-zinc-100 text-zinc-500 border-zinc-200'
              : status === 'streaming'
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
              : status === 'done'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {status === 'loading'
            ? 'Loading...'
            : status === 'streaming'
            ? 'Streaming...'
            : status === 'done'
            ? 'Completed'
            : 'Failed'}
        </span>
      </div>

      {/* Output area */}
      <div
        data-testid="skill-output"
        className="bg-white border border-zinc-200 rounded-lg p-6 min-h-32"
      >
        {status === 'loading' && (
          <p className="text-zinc-400 text-sm">Loading output...</p>
        )}
        {status === 'streaming' && !output && (
          <p className="text-zinc-400 text-sm">Waiting for output...</p>
        )}
        {status === 'streaming' && output && (
          // During streaming show raw text — markdown rendering on every keystroke is expensive
          <pre className="font-mono text-sm whitespace-pre-wrap text-zinc-800">{output}</pre>
        )}
        {(status === 'done' || status === 'failed') && output && (
          // Completed: render markdown
          <div className="prose prose-zinc prose-sm max-w-none">
            <ReactMarkdown>{output}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Streaming hint */}
      {status === 'streaming' && (
        <p className="mt-2 text-xs text-zinc-400">
          Output is streaming in real-time. You can navigate away — the run continues in the background.
        </p>
      )}
    </div>
  );
}
