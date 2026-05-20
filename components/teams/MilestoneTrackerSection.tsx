'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import type { Milestone } from '@/lib/queries';

interface Props {
  projectId: number;
  milestones: Milestone[];
}

const STATUS_DOT: Record<string, string> = {
  on_track: 'bg-emerald-500',
  at_risk:  'bg-amber-500',
  blocked:  'bg-red-500',
  missed:   'bg-red-700',
  complete: 'bg-emerald-700',
  planned:  'bg-zinc-300',
};

function sortByDateAsc(a: Milestone, b: Milestone): number {
  // Null/TBD dates go to the bottom
  if (!a.date && !b.date) return 0;
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

function MiniGantt({ milestones }: { milestones: Milestone[]; projectId: number }) {
  const dated = milestones.filter((m) => m.date);
  if (dated.length === 0) {
    return <p className="text-xs text-muted-foreground p-4">No dated milestones to plot.</p>;
  }

  // Group rows by linked_track (milestone.linked_track) || 'Unassigned'
  const groups = dated.reduce<Record<string, Milestone[]>>((acc, m) => {
    const key = m.linked_track ?? 'Unassigned';
    (acc[key] ??= []).push(m);
    return acc;
  }, {});
  const groupKeys = Object.keys(groups).sort();

  const minMs = Math.min(...dated.map((m) => new Date(m.date!).getTime()));
  const maxMs = Math.max(...dated.map((m) => new Date(m.date!).getTime()));
  const spanMs = Math.max(1, maxMs - minMs);
  const width = 700;
  const rowH = 28;
  const padL = 120;
  const height = groupKeys.length * rowH + 24;

  function xOf(date: string): number {
    return padL + ((new Date(date).getTime() - minMs) / spanMs) * (width - padL - 20);
  }

  return (
    <svg width={width} height={height} role="img" aria-label="Milestone mini-gantt" className="max-w-full">
      {/* Date axis tick labels */}
      <text x={padL} y={12} fontSize={10} fill="currentColor" className="fill-muted-foreground">
        {new Date(minMs).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
      </text>
      <text x={width - 20} y={12} fontSize={10} fill="currentColor" textAnchor="end" className="fill-muted-foreground">
        {new Date(maxMs).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
      </text>

      {groupKeys.map((key, idx) => {
        const y = 20 + idx * rowH;
        return (
          <g key={key}>
            <text x={8} y={y + 5} fontSize={11} fill="currentColor" className="fill-foreground">{key}</text>
            <line x1={padL} y1={y} x2={width - 20} y2={y} stroke="currentColor" className="stroke-border" strokeWidth={1} />
            {groups[key].map((m) => {
              const dotClass = STATUS_DOT[m.status ?? 'planned'] ?? STATUS_DOT.planned;
              return (
                <g key={m.id}>
                  <circle
                    cx={xOf(m.date!)}
                    cy={y}
                    r={5}
                    className={dotClass}
                    fill="currentColor"
                  />
                  <title>{m.name} ({m.date})</title>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export default function MilestoneTrackerSection({ projectId, milestones }: Props) {
  const [view, setView] = useState<'list' | 'gantt'>('list');
  // Ascending sort by date: TBD/null dates go to bottom (TEAM-88-05)
  const sorted = [...milestones].sort((a, b) => sortByDateAsc(a, b)); // keyed on .date field

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Icon name="flag" size={18} aria-hidden />
          Milestone &amp; Go-Live Tracker
        </h2>
        <div className="inline-flex rounded-md border border-border overflow-hidden" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            onClick={() => setView('list')}
            className={`px-3 py-1 text-xs transition-colors ${
              view === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            list
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'gantt'}
            onClick={() => setView('gantt')}
            className={`px-3 py-1 text-xs transition-colors ${
              view === 'gantt' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            gantt
          </button>
        </div>
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">No milestones yet.</p>
      )}

      {view === 'list' && sorted.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {sorted.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 h-10 text-sm">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[m.status ?? 'planned'] ?? STATUS_DOT.planned}`}
              />
              {m.date && (
                <span className="font-mono text-xs text-muted-foreground w-24 flex-shrink-0">{m.date}</span>
              )}
              <span className="flex-1 truncate">{m.name}</span>
              {m.linked_track && (
                <span className="rounded bg-secondary px-2 py-0.5 text-xs uppercase flex-shrink-0">
                  {m.linked_track}
                </span>
              )}
              {m.owner && (
                <span className="text-xs text-muted-foreground flex-shrink-0">{m.owner}</span>
              )}
              <span className="text-xs uppercase flex-shrink-0">{m.status ?? 'planned'}</span>
            </li>
          ))}
        </ul>
      )}

      {view === 'gantt' && sorted.length > 0 && (
        <div className="rounded-md border border-border bg-card p-2 overflow-x-auto">
          <MiniGantt milestones={sorted} projectId={projectId} />
        </div>
      )}
    </section>
  );
}
