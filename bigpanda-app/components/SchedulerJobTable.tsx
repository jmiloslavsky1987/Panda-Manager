'use client';

/**
 * SchedulerJobTable — client component for the /scheduler page.
 *
 * Renders a sortable table of scheduled jobs (enabled first, then disabled).
 * Manages expanded row state and optimistic job updates/deletes.
 * Plan 24-03.
 */

import { useState } from 'react';
import { SchedulerJobRow } from './SchedulerJobRow';
import type { ScheduledJob } from './SchedulerJobRow';

interface SchedulerJobTableProps {
  initialJobs: ScheduledJob[];
  onCreateJob?: () => void;
}

export function SchedulerJobTable({ initialJobs, onCreateJob }: SchedulerJobTableProps) {
  const [jobs, setJobs] = useState<ScheduledJob[]>(initialJobs);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Enabled jobs first, then disabled; preserve insertion order within each group
  const sorted = [...jobs].sort((a, b) => {
    if (a.enabled === b.enabled) return 0;
    return a.enabled ? -1 : 1;
  });

  function handleToggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleJobUpdate(updated: ScheduledJob) {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
  }

  function handleJobDelete(id: number) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setExpandedId((prev) => (prev === id ? null : prev));
  }

  return (
    <div>
      {/* Header row with Create Job button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-zinc-700">
          {jobs.length === 0
            ? 'No scheduled jobs yet.'
            : `${jobs.length} job${jobs.length === 1 ? '' : 's'}`}
        </h2>
        <button
          data-testid="create-job-button"
          onClick={onCreateJob}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Create Job
        </button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">No scheduled jobs yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-3 py-2 font-semibold text-zinc-600 w-[22%]">Name</th>
                <th className="px-3 py-2 font-semibold text-zinc-600 w-[16%]">Skill</th>
                <th className="px-3 py-2 font-semibold text-zinc-600 w-[16%]">Schedule</th>
                <th className="px-3 py-2 font-semibold text-zinc-600 w-[14%]">Next Run</th>
                <th className="px-3 py-2 font-semibold text-zinc-600 w-[10%]">Last Outcome</th>
                <th className="px-3 py-2 font-semibold text-zinc-600 w-[10%]">Enabled</th>
                <th className="px-3 py-2 font-semibold text-zinc-600 w-[12%]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((job) => (
                <SchedulerJobRow
                  key={job.id}
                  job={job}
                  expanded={expandedId === job.id}
                  onToggleExpand={() => handleToggleExpand(job.id)}
                  onJobUpdate={handleJobUpdate}
                  onJobDelete={handleJobDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
