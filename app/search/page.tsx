'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

interface SearchResult {
  id: number;
  table: string;
  section: string;
  project_id: number | null;
  project_name: string | null;
  customer: string | null;
  date: string | null;
  title: string;
  snippet: string | null;
}

export const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'actions', label: 'Actions' },
  { value: 'risks', label: 'Risks' },
  { value: 'key_decisions', label: 'Key Decisions' },
  { value: 'engagement_history', label: 'Engagement History' },
  { value: 'stakeholders', label: 'Stakeholders' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'artifacts', label: 'Artifacts' },
  { value: 'knowledge_base', label: 'Knowledge Base' },
  { value: 'onboarding_steps',  label: 'Onboarding Steps' },
  { value: 'onboarding_phases', label: 'Onboarding Phases' },
  { value: 'integrations',      label: 'Integrations' },
  { value: 'time_entries',      label: 'Time Entries' },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAccount, setFilterAccount] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const fetchResults = useCallback(async (
    q: string,
    account: string,
    type: string,
    from: string,
    to: string,
  ) => {
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (account) params.set('account', account);
      if (type) params.set('type', type);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch('/api/search?' + params.toString());
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced effect for filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query, filterAccount, filterType, filterFrom, filterTo);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filterAccount, filterType, filterFrom, filterTo, fetchResults]);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-zinc-900 mb-6">
        {query ? `Search results for "${query}"` : 'Search'}
      </h1>
      <div className="grid grid-cols-4 gap-6">
        {/* Filter panel — 1/4 width */}
        <aside className="col-span-1">
          <div className="border rounded-lg p-4 bg-white space-y-4">
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Filters</h2>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Account</label>
              <input
                type="text"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                placeholder="Filter by account..."
                className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Data Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">From</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">To</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-300"
              />
            </div>
          </div>
        </aside>

        {/* Results — 3/4 width */}
        <section className="col-span-3">
          {loading && (
            <p className="text-zinc-500 text-sm">Searching...</p>
          )}

          {!loading && !query && (
            <p className="text-zinc-500 text-center py-12">Enter a search term above</p>
          )}

          {!loading && query && results.length === 0 && (
            <p className="text-zinc-500 text-center py-12">No results for &quot;{query}&quot;</p>
          )}

          {!loading && results.length > 0 && (
            <div data-testid="search-results">
              {results.map((r) => (
                <div
                  key={r.id + r.table}
                  className="border rounded-lg p-4 mb-3 bg-white hover:shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                    <span data-testid="result-project">{r.project_name}</span>
                    <span>/</span>
                    <span data-testid="result-section" className="capitalize">{r.section}</span>
                    {r.date && (
                      <span data-testid="result-date" className="ml-auto">{r.date}</span>
                    )}
                  </div>
                  <p className="font-medium text-zinc-900 text-sm">{r.title}</p>
                  {r.snippet && (
                    <p className="text-zinc-600 text-sm mt-1 line-clamp-2">{r.snippet}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
