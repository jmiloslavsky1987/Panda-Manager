'use client';

/**
 * components/WatchList.tsx — DASH-05 Cross-Account Watch List
 *
 * Fetches /api/dashboard/watch-list and renders a compact table of
 * high/critical open risks across all active projects.
 */

import { useEffect, useState } from 'react';

interface WatchListItem {
  id: number;
  description: string;
  severity: string | null;
  status: string | null;
  last_updated: string | null;
  project_name: string;
  customer: string;
}

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null;
  const sev = severity.toLowerCase();
  const cls =
    sev === 'critical'
      ? 'text-red-700 font-semibold'
      : sev === 'high'
      ? 'text-orange-700 font-semibold'
      : 'text-zinc-600';
  return <span className={`text-xs uppercase ${cls}`}>{severity}</span>;
}

function ProjectChip({ name }: { name: string }) {
  return (
    <span className="inline-block bg-zinc-100 rounded px-2 py-0.5 text-xs text-zinc-700 whitespace-nowrap font-medium">
      {name}
    </span>
  );
}

export function WatchList() {
  const [items, setItems] = useState<WatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/watch-list')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { items: WatchListItem[] }) => {
        setItems(data.items);
        setLoading(false);
      })
      .catch(err => {
        console.error('[WatchList] fetch error:', err);
        setError('Failed to load watch list');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div data-testid="watch-list" className="rounded-lg border bg-white p-4">
        <p className="text-zinc-400 text-sm italic">Loading watch list...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="watch-list" className="rounded-lg border bg-white p-4">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div data-testid="watch-list" className="rounded-lg border bg-white p-4">
        <p className="text-zinc-500 text-sm italic">No escalated risks across active projects</p>
      </div>
    );
  }

  return (
    <div data-testid="watch-list" className="rounded-lg border bg-white overflow-hidden">
      <table className="min-w-full text-sm divide-y divide-zinc-100">
        <thead className="bg-zinc-50">
          <tr>
            <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-2">
              Project
            </th>
            <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-2">
              Description
            </th>
            <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-2">
              Severity
            </th>
            <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-2">
              Status
            </th>
            <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-2 whitespace-nowrap">
              Last Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-zinc-50">
              <td className="px-4 py-2 whitespace-nowrap">
                <ProjectChip name={item.project_name} />
              </td>
              <td className="px-4 py-2 text-zinc-700 max-w-xs">
                <span className="line-clamp-2">{item.description}</span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <SeverityBadge severity={item.severity} />
              </td>
              <td className="px-4 py-2 text-xs text-zinc-500 capitalize whitespace-nowrap">
                {item.status ?? '—'}
              </td>
              <td className="px-4 py-2 text-xs text-zinc-400 whitespace-nowrap">
                {item.last_updated ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
