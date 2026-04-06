/**
 * seed-acme-gantt.ts — Add Gantt-testable tasks to ACME Corp (id=4).
 *
 * Run: npx tsx scripts/seed-acme-gantt.ts
 *
 * Idempotent: clears existing ACME tasks first, then re-inserts.
 * Covers: all 5 milestones + unassigned lane, ISO dates throughout.
 */

import { db } from '../db/index';
import { tasks, milestones, projects } from '../db/schema';
import { eq } from 'drizzle-orm';

const PROJECT_ID = 4;

// Milestone IDs for ACME Corp (id=4)
const MS = {
  adr:   39, // BigPanda Production Go-Live — ADR Pipeline  (2026-03-01)
  snow:  40, // ServiceNow Bi-Directional Integration Live   (2026-04-15)
  biggy: 41, // Biggy AI Pilot Launch — NOC Team             (2026-05-01)
  cloud: 42, // Cloud Infrastructure Team Onboarded          (2026-06-01)
  golive:43, // PA 3.0 Full Production Go-Live               (2026-06-30)
};

async function main() {
  const [proj] = await db.select().from(projects).where(eq(projects.id, PROJECT_ID));
  if (!proj) { console.error('Project not found'); process.exit(1); }
  console.log(`Seeding Gantt tasks for: "${proj.name}" (id=${PROJECT_ID})`);

  // Clear existing tasks so re-run is clean
  const deleted = await db.delete(tasks).where(eq(tasks.project_id, PROJECT_ID));
  console.log(`Cleared existing tasks.`);

  const rows = [
    // ── Milestone 39: ADR Pipeline Go-Live ──────────────────────────────────
    {
      title: 'Configure ADR correlation rules',
      milestone_id: MS.adr,
      start_date: '2026-01-15',
      due: '2026-02-01',
      status: 'done',
      owner: 'Sarah K.',
      priority: 'high',
      phase: 'integration',
    },
    {
      title: 'ADR pipeline smoke test in staging',
      milestone_id: MS.adr,
      start_date: '2026-02-03',
      due: '2026-02-14',
      status: 'done',
      owner: 'Tom R.',
      priority: 'high',
      phase: 'integration',
    },
    {
      title: 'NOC team runbook sign-off for ADR',
      milestone_id: MS.adr,
      start_date: '2026-02-17',
      due: '2026-02-28',
      status: 'done',
      owner: 'Josh M.',
      priority: 'medium',
      phase: 'integration',
    },

    // ── Milestone 40: ServiceNow Integration ────────────────────────────────
    {
      title: 'ServiceNow OAuth credential setup',
      milestone_id: MS.snow,
      start_date: '2026-02-10',
      due: '2026-02-21',
      status: 'done',
      owner: 'Sarah K.',
      priority: 'high',
      phase: 'integration',
    },
    {
      title: 'Bi-directional sync mapping document',
      milestone_id: MS.snow,
      start_date: '2026-02-24',
      due: '2026-03-14',
      status: 'done',
      owner: 'Tom R.',
      priority: 'medium',
      phase: 'integration',
    },
    {
      title: 'SNOW webhook UAT in staging',
      milestone_id: MS.snow,
      start_date: '2026-03-17',
      due: '2026-04-04',
      status: 'in_progress',
      owner: 'Josh M.',
      priority: 'high',
      phase: 'integration',
    },
    {
      title: 'Production SNOW cutover window',
      milestone_id: MS.snow,
      start_date: '2026-04-08',
      due: '2026-04-14',
      status: 'todo',
      owner: 'Sarah K.',
      priority: 'high',
      phase: 'integration',
    },

    // ── Milestone 41: Biggy AI Pilot ────────────────────────────────────────
    {
      title: 'InfoSec security review — Biggy AI',
      milestone_id: MS.biggy,
      start_date: '2026-02-01',
      due: '2026-03-15',
      status: 'in_progress',
      owner: 'ACME InfoSec',
      priority: 'high',
      phase: 'ai_pilot',
    },
    {
      title: 'Biggy AI feature enablement in staging',
      milestone_id: MS.biggy,
      start_date: '2026-03-17',
      due: '2026-04-01',
      status: 'todo',
      owner: 'Tom R.',
      priority: 'medium',
      phase: 'ai_pilot',
    },
    {
      title: 'NOC team Biggy AI training session',
      milestone_id: MS.biggy,
      start_date: '2026-04-07',
      due: '2026-04-18',
      status: 'todo',
      owner: 'Josh M.',
      priority: 'medium',
      phase: 'ai_pilot',
    },
    {
      title: 'Pilot go/no-go review with ACME stakeholders',
      milestone_id: MS.biggy,
      start_date: '2026-04-20',
      due: '2026-04-30',
      status: 'todo',
      owner: 'Josh M.',
      priority: 'high',
      phase: 'ai_pilot',
    },

    // ── Milestone 42: Cloud Infra Team ──────────────────────────────────────
    {
      title: 'Cloud infra team intro session',
      milestone_id: MS.cloud,
      start_date: '2026-03-01',
      due: '2026-03-15',
      status: 'done',
      owner: 'Sarah K.',
      priority: 'medium',
      phase: 'onboarding',
    },
    {
      title: 'Cloud team BigPanda integration config',
      milestone_id: MS.cloud,
      start_date: '2026-03-17',
      due: '2026-04-15',
      status: 'in_progress',
      owner: 'Tom R.',
      priority: 'high',
      phase: 'onboarding',
    },
    {
      title: 'Cloud team sign-off on runbooks',
      milestone_id: MS.cloud,
      start_date: '2026-05-01',
      due: '2026-05-30',
      status: 'todo',
      owner: 'Josh M.',
      priority: 'medium',
      phase: 'onboarding',
    },

    // ── Milestone 43: Full Go-Live ───────────────────────────────────────────
    {
      title: 'Final regression test across all integrations',
      milestone_id: MS.golive,
      start_date: '2026-06-01',
      due: '2026-06-14',
      status: 'todo',
      owner: 'Sarah K.',
      priority: 'high',
      phase: 'golive',
    },
    {
      title: 'Hypercare monitoring plan sign-off',
      milestone_id: MS.golive,
      start_date: '2026-06-15',
      due: '2026-06-22',
      status: 'todo',
      owner: 'Tom R.',
      priority: 'medium',
      phase: 'golive',
    },
    {
      title: 'Go-live announcement and handover',
      milestone_id: MS.golive,
      start_date: '2026-06-28',
      due: '2026-06-30',
      status: 'todo',
      owner: 'Josh M.',
      priority: 'high',
      phase: 'golive',
    },

    // ── Unassigned (no milestone) ────────────────────────────────────────────
    {
      title: 'Weekly status report template update',
      milestone_id: null,
      start_date: '2026-03-01',
      due: '2026-03-07',
      status: 'done',
      owner: 'Josh M.',
      priority: 'low',
      phase: null,
    },
    {
      title: 'Stakeholder contact list refresh',
      milestone_id: null,
      start_date: '2026-04-01',
      due: '2026-04-05',
      status: 'todo',
      owner: 'Sarah K.',
      priority: 'low',
      phase: null,
    },
    {
      title: 'ACME project archive and handover docs',
      milestone_id: null,
      start_date: '2026-07-01',
      due: '2026-07-15',
      status: 'todo',
      owner: 'Josh M.',
      priority: 'low',
      phase: null,
    },
  ];

  await db.insert(tasks).values(
    rows.map(r => ({ ...r, project_id: PROJECT_ID, source: 'manual' }))
  );

  console.log(`Inserted ${rows.length} tasks.`);
  console.log('Milestone breakdown:');
  console.log(`  ADR Pipeline (ms:${MS.adr}):   3 tasks`);
  console.log(`  ServiceNow   (ms:${MS.snow}):  4 tasks`);
  console.log(`  Biggy AI     (ms:${MS.biggy}): 4 tasks`);
  console.log(`  Cloud Infra  (ms:${MS.cloud}): 3 tasks`);
  console.log(`  Full Go-Live (ms:${MS.golive}):3 tasks`);
  console.log(`  Unassigned:                    3 tasks`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
