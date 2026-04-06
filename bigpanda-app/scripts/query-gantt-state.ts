import { db } from '../db/index';
import { projects, milestones, tasks } from '../db/schema';

async function main() {
  const ps = await db.select({ id: projects.id, name: projects.name, customer: projects.customer }).from(projects);
  console.log('Projects:', JSON.stringify(ps, null, 2));
  const ms = await db.select({ id: milestones.id, project_id: milestones.project_id, name: milestones.name, date: milestones.date }).from(milestones);
  console.log('Milestones:', JSON.stringify(ms, null, 2));
  const ts = await db.select({ id: tasks.id, project_id: tasks.project_id, title: tasks.title, milestone_id: tasks.milestone_id, start_date: tasks.start_date, due: tasks.due }).from(tasks).limit(20);
  console.log('Tasks sample:', JSON.stringify(ts, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
