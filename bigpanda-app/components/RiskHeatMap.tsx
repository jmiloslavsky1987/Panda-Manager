'use client';

/**
 * components/RiskHeatMap.tsx — DASH-04 Risk Heat Map
 *
 * Fetches /api/dashboard/risks-heatmap and renders a grid of severity x status
 * cells with color-coded intensity based on risk count.
 *
 * Color scale per severity column:
 *   low:      zinc background
 *   medium:   yellow background
 *   high:     orange background
 *   critical: red background
 *
 * Cell intensity by count:
 *   0     → white / transparent
 *   1-2   → light tint
 *   3-5   → medium tint
 *   6+    → full color
 */

import { useEffect, useState } from 'react';

interface HeatMapCell {
  severity: string | null;
  status: string | null;
  count: number;
}

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

// Severity column header colors
const SEVERITY_HEADER: Record<string, string> = {
  low: 'text-zinc-600',
  medium: 'text-yellow-700',
  high: 'text-orange-700',
  critical: 'text-red-700',
};

// Cell background color by severity + count intensity
function cellBg(severity: string, count: number): string {
  if (count === 0) return 'bg-white';
  if (severity === 'low') {
    if (count <= 2) return 'bg-zinc-100';
    if (count <= 5) return 'bg-zinc-200';
    return 'bg-zinc-300';
  }
  if (severity === 'medium') {
    if (count <= 2) return 'bg-yellow-100';
    if (count <= 5) return 'bg-yellow-200';
    return 'bg-yellow-300';
  }
  if (severity === 'high') {
    if (count <= 2) return 'bg-orange-100';
    if (count <= 5) return 'bg-orange-200';
    return 'bg-orange-300';
  }
  if (severity === 'critical') {
    if (count <= 2) return 'bg-red-100';
    if (count <= 5) return 'bg-red-200';
    return 'bg-red-300';
  }
  return 'bg-white';
}

export function RiskHeatMap() {
  const [cells, setCells] = useState<HeatMapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/risks-heatmap')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { heatmap: HeatMapCell[] }) => {
        setCells(data.heatmap);
        setLoading(false);
      })
      .catch(err => {
        console.error('[RiskHeatMap] fetch error:', err);
        setError('Failed to load risk data');
        setLoading(false);
      });
  }, []);

  // Build a lookup: severity+status → count
  const lookup: Record<string, number> = {};
  for (const cell of cells) {
    const sev = (cell.severity ?? 'unknown').toLowerCase();
    const stat = (cell.status ?? 'unknown').toLowerCase();
    const key = `${sev}|${stat}`;
    lookup[key] = (lookup[key] ?? 0) + cell.count;
  }

  // Collect all unique statuses present in data
  const statusSet = new Set<string>();
  for (const cell of cells) {
    statusSet.add((cell.status ?? 'unknown').toLowerCase());
  }
  const statuses = Array.from(statusSet).sort();

  if (loading) {
    return (
      <div data-testid="risk-heat-map" className="rounded-lg border bg-white p-4">
        <p className="text-zinc-400 text-sm italic">Loading risk data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="risk-heat-map" className="rounded-lg border bg-white p-4">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (cells.length === 0) {
    return (
      <div data-testid="risk-heat-map" className="rounded-lg border bg-white p-4">
        <p className="text-zinc-500 text-sm italic">No open risks across active projects</p>
      </div>
    );
  }

  return (
    <div data-testid="risk-heat-map" className="rounded-lg border bg-white p-4 overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr>
            {/* Top-left: Status label */}
            <th className="text-left text-xs text-zinc-400 font-normal pr-3 pb-2 whitespace-nowrap">
              Status / Severity
            </th>
            {SEVERITIES.map(sev => (
              <th
                key={sev}
                className={`text-center text-xs font-semibold uppercase tracking-wide pb-2 px-3 ${SEVERITY_HEADER[sev]}`}
              >
                {sev}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {statuses.map(stat => (
            <tr key={stat}>
              <td className="text-xs text-zinc-500 capitalize pr-3 py-1 whitespace-nowrap font-medium">
                {stat}
              </td>
              {SEVERITIES.map(sev => {
                const count = lookup[`${sev}|${stat}`] ?? 0;
                return (
                  <td
                    key={sev}
                    className={`text-center px-3 py-1 rounded font-mono text-sm ${cellBg(sev, count)}`}
                  >
                    {count > 0 ? count : <span className="text-zinc-300">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
