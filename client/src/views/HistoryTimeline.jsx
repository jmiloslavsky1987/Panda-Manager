// client/src/views/HistoryTimeline.jsx
// Read-only timeline of all weekly history entries, newest first.
// Data comes from CustomerLayout context — no additional API call.
import React from 'react';
import { useOutletContext } from 'react-router-dom';

// Status dot colors — complete literal strings (Tailwind v4)
const HISTORY_STATUS_DOT = {
  green:  'bg-green-500',
  yellow: 'bg-yellow-400',
  red:    'bg-red-500',
};

// Status label map — complete literal strings
const HISTORY_STATUS_LABEL = {
  green:  'On Track',
  yellow: 'At Risk',
  red:    'Off Track',
};

function WorkstreamRow({ label, data }) {
  if (!data) return null;
  const status = (data.status ?? 'green').toLowerCase();
  const dotClass = HISTORY_STATUS_DOT[status] ?? 'bg-gray-300';
  return (
    <div className="flex items-start gap-3 py-1">
      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dotClass}`} />
      <div className="min-w-0">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        {data.percent_complete != null && (
          <span className="ml-2 text-xs text-gray-400">{data.percent_complete}%</span>
        )}
        {data.progress_notes && (
          <p className="text-xs text-gray-500 mt-0.5">{data.progress_notes}</p>
        )}
      </div>
    </div>
  );
}

export default function HistoryTimeline() {
  const { customer } = useOutletContext();
  const history = customer?.history ?? [];

  if (history.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">History</h1>
        <p className="text-sm text-gray-500">No history entries yet. Submit a Weekly Update to see entries here.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">History</h1>
      <div className="flex flex-col gap-6">
        {history.map((entry, i) => {
          const adr = entry.workstreams?.adr ?? {};
          const biggy = entry.workstreams?.biggy ?? {};
          const summary = entry.summary ?? {};
          return (
            <div key={entry.week_ending ?? i} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-900">Week ending {entry.week_ending ?? '—'}</span>
                {i === 0 && (
                  <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded px-2 py-0.5">
                    Most recent
                  </span>
                )}
              </div>

              {/* ADR workstreams */}
              {Object.keys(adr).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">ADR</p>
                  {Object.entries(adr).map(([key, val]) => (
                    <WorkstreamRow key={key} label={key.replace(/_/g, ' ')} data={val} />
                  ))}
                </div>
              )}

              {/* Biggy workstreams */}
              {Object.keys(biggy).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Biggy</p>
                  {Object.entries(biggy).map(([key, val]) => (
                    <WorkstreamRow key={key} label={key.replace(/_/g, ' ')} data={val} />
                  ))}
                </div>
              )}

              {/* Summary */}
              {(summary.progress?.length > 0 || summary.decisions?.length > 0 || summary.outcomes?.length > 0) && (
                <div className="border-t border-gray-100 pt-3 mt-2 flex flex-col gap-2">
                  {summary.progress?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Progress</p>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                        {summary.progress.map((p, j) => <li key={j}>{p}</li>)}
                      </ul>
                    </div>
                  )}
                  {summary.decisions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Decisions</p>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                        {summary.decisions.map((d, j) => <li key={j}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {summary.outcomes?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Outcomes</p>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                        {summary.outcomes.map((o, j) => <li key={j}>{o}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
