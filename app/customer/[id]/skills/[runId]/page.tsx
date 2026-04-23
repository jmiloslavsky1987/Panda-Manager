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
import rehypeSanitize from 'rehype-sanitize';
import { stripMarkdown } from '@/lib/strip-markdown';

type RunStatus = 'loading' | 'streaming' | 'done' | 'failed';

type RunResponse = { status?: string; skill_name?: string; full_output?: string; error_message?: string };

type OutputRow = { id: number; filepath: string | null };

function getAppLabel(skillName: string): string {
  if (skillName === 'elt-external-status' || skillName === 'elt-internal-status') return 'PowerPoint';
  if (skillName === 'team-engagement-map' || skillName === 'workflow-diagram') return 'Browser';
  return 'Finder';
}

export default function SkillRunPage() {
  const params = useParams();
  const runId = params.runId as string;
  const projectId = params.id as string;
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<RunStatus>('loading');
  const [skillName, setSkillName] = useState('');
  const [outputId, setOutputId] = useState<number | null>(null);
  const [outputFilepath, setOutputFilepath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Fetch the corresponding outputs row for this run to surface the "Open in app" button
  function fetchOutputRow(skill: string) {
    fetch(`/api/outputs?projectId=${projectId}&skillType=${encodeURIComponent(skill)}`)
      .then(r => r.json())
      .then((rows: OutputRow[]) => {
        const row = rows.find(r => r.filepath);
        if (row) {
          setOutputId(row.id);
          setOutputFilepath(row.filepath);
        }
      })
      .catch(() => { /* output row unavailable — button stays hidden */ });
  }

  useEffect(() => {
    // Check if run already complete — prevents duplicate SSE subscription on page return
    fetch(`/api/skills/runs/${runId}`)
      .then(r => r.json())
      .then((run: RunResponse) => {
        setSkillName(run.skill_name ?? '');

        if (run.status === 'completed') {
          setOutput(run.full_output ?? '');
          setStatus('done');
          fetchOutputRow(run.skill_name ?? '');
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
              fetchOutputRow(completed.skill_name ?? skillName);
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
        className="relative bg-white border border-zinc-200 rounded-lg p-6 min-h-32"
      >
        {/* Copy button — visible only when status is done */}
        {status === 'done' && output && (
          <button
            onClick={() =>
              navigator.clipboard.writeText(stripMarkdown(output)).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
            }
            className="absolute top-2 right-2 px-3 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded border border-zinc-200"
            data-testid="copy-btn"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}

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
          // Completed: render markdown with XSS hardening
          <div className="prose prose-zinc prose-sm max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{output}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Streaming hint */}
      {status === 'streaming' && (
        <p className="mt-2 text-xs text-zinc-400">
          Output is streaming in real-time. You can navigate away — the run continues in the background.
        </p>
      )}

      {/* Open in app button — shown when run is done and a file artifact was produced */}
      {status === 'done' && outputFilepath && outputId && (
        <button
          onClick={() => fetch(`/api/outputs/${outputId}/open`)}
          className="mt-4 px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700"
          data-testid="open-in-app-btn"
        >
          Open in {getAppLabel(skillName)}
        </button>
      )}
    </div>
  );
}
