/**
 * /scheduler — Scheduler Page (RSC)
 *
 * Fetches all scheduled jobs server-side and renders the SchedulerJobTable.
 * Plan 24-03.
 */

import { SchedulerJobTable } from '../../components/SchedulerJobTable';
import type { ScheduledJob } from '../../components/SchedulerJobRow';

export default async function SchedulerPage() {
  let jobs: ScheduledJob[] = [];

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/jobs`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { jobs?: ScheduledJob[] };
      jobs = data.jobs ?? [];
    }
  } catch {
    // Dev server may not be available during SSR build — fall through to empty state
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Scheduler</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Global scheduled jobs — not scoped to any project. Project-specific jobs are managed from each project&apos;s Skills tab.
      </p>
      <SchedulerJobTable initialJobs={jobs} />
    </div>
  );
}
