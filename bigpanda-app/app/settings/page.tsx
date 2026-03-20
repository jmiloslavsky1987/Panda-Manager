'use client'

import { useEffect, useState, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';

const JOB_DISPLAY: Record<string, { label: string; schedule: string }> = {
  'action-sync':     { label: 'Action Sync',     schedule: '0 8 * * *'   },
  'health-refresh':  { label: 'Health Refresh',  schedule: '0 8 * * *'   },
  'weekly-briefing': { label: 'Weekly Briefing', schedule: '0 16 * * 4'  },
  'context-updater': { label: 'Context Updater', schedule: '0 9 * * *'   },
  'gantt-snapshot':  { label: 'Gantt Snapshot',  schedule: '0 7 * * 1'   },
  'risk-monitor':    { label: 'Risk Monitor',    schedule: '0 9 * * 5'   },
};

interface JobRun {
  id: number;
  job_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  triggered_by: string;
}

interface JobRow {
  job_name: string;
  last_run: JobRun | null;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-600',
  failed:    'text-red-600',
  running:   'text-blue-600',
  skipped:   'text-zinc-400',
  pending:   'text-zinc-400',
};

export default function SettingsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    const res = await fetch('/api/job-runs');
    if (res.ok) setJobs(await res.json());
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const triggerJob = async (jobName: string) => {
    setTriggering(jobName);
    try {
      await fetch('/api/jobs/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobName }),
      });
      // Brief delay then re-fetch to show the new running row
      setTimeout(fetchJobs, 1500);
    } finally {
      setTimeout(() => setTriggering(null), 1500);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Settings</h1>

      <Tabs.Root defaultValue="jobs" data-testid="jobs-tab">
        <Tabs.List className="flex border-b border-zinc-200 mb-6">
          <Tabs.Trigger
            value="jobs"
            className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 data-[state=active]:text-zinc-900 data-[state=active]:border-b-2 data-[state=active]:border-zinc-900 -mb-px"
          >
            Jobs
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="jobs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="pb-3 pr-6 font-medium">Job Name</th>
                  <th className="pb-3 pr-6 font-medium">Schedule</th>
                  <th className="pb-3 pr-6 font-medium">Last Run</th>
                  <th className="pb-3 pr-6 font-medium">Last Status</th>
                  <th className="pb-3 pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(({ job_name, last_run }) => {
                  const display = JOB_DISPLAY[job_name] ?? { label: job_name, schedule: '—' };
                  const statusClass = last_run ? (STATUS_COLORS[last_run.status] ?? 'text-zinc-500') : 'text-zinc-400';
                  return (
                    <tr key={job_name} className="border-b border-zinc-100">
                      <td className="py-3 pr-6 font-medium text-zinc-900" data-testid={`job-row-${job_name}`}>
                        {display.label}
                      </td>
                      <td className="py-3 pr-6 text-zinc-500 font-mono text-xs">{display.schedule}</td>
                      <td className="py-3 pr-6 text-zinc-500">
                        {last_run ? new Date(last_run.started_at).toLocaleString() : '—'}
                      </td>
                      <td className={`py-3 pr-6 capitalize ${statusClass}`}>
                        {last_run?.status ?? '—'}
                      </td>
                      <td className="py-3 pr-6">
                        <button
                          onClick={() => triggerJob(job_name)}
                          disabled={triggering === job_name}
                          className="px-3 py-1 text-xs bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
                          data-testid={`trigger-${job_name}`}
                        >
                          {triggering === job_name ? 'Queued\u2026' : 'Trigger Now'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {jobs.length === 0 && (
              <p className="text-zinc-400 text-sm mt-4">Loading job status\u2026</p>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
