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
    const res = await fetch('http://localhost:3000/api/jobs', { cache: 'no-store' });
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
      <SchedulerJobTable initialJobs={jobs} />
    </div>
  );
}
