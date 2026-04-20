/**
 * seed-project-15.ts — Re-seed placeholder rows for Test100 (project_id=15)
 * Run: npx tsx scripts/seed-project-15.ts
 */
import { db } from '../db/index';
import {
  actions, risks, milestones, engagementHistory, keyDecisions,
  stakeholders, businessOutcomes, teamOnboardingStatus, projects,
} from '../db/schema';
import { eq } from 'drizzle-orm';

const PROJECT_ID = 15;

async function main() {
  // actions
  await db.insert(actions).values({
    project_id: PROJECT_ID,
    external_id: 'TEMPLATE-ACTION-001',
    description: 'Add your first action — include owner, due date, and a clear description of the expected outcome',
    owner: 'TBD', due: 'TBD', status: 'open', source: 'template',
  });

  // risks
  await db.insert(risks).values({
    project_id: PROJECT_ID,
    external_id: 'TEMPLATE-RISK-001',
    description: 'Document a risk — severity level (low/medium/high/critical), owner, and mitigation plan',
    severity: 'medium', owner: 'TBD', status: 'open', source: 'template',
  });

  // milestones
  await db.insert(milestones).values({
    project_id: PROJECT_ID,
    external_id: 'TEMPLATE-MILESTONE-001',
    name: 'Add a milestone — name, target date, owner, and current status',
    status: 'planned', target: 'TBD', source: 'template',
  });

  // decisions (append-only — insert only)
  await db.insert(keyDecisions).values({
    project_id: PROJECT_ID,
    decision: 'Record a key decision — decision text, date, context, and who made it (append-only)',
    date: 'TBD', source: 'template',
  });

  // history (append-only)
  await db.insert(engagementHistory).values({
    project_id: PROJECT_ID,
    content: 'Log an engagement update — date, content summary, and source (append-only)',
    date: 'TBD', source: 'template',
  });

  // stakeholders
  await db.insert(stakeholders).values({
    project_id: PROJECT_ID,
    name: 'Add a stakeholder — name, role, company, and preferred contact method',
    role: 'TBD', source: 'template',
  });

  // teams
  for (const team_name of ['Add a team member — name, role, company, and email or Slack handle',
                            'Add a BigPanda team member assigned to this project — name, role, and Slack handle']) {
    await db.insert(teamOnboardingStatus).values({
      project_id: PROJECT_ID, team_name, track: 'template', source: 'template',
    });
  }

  // plan / business outcomes
  await db.insert(businessOutcomes).values({
    project_id: PROJECT_ID,
    title: 'Define a business outcome this project must deliver — outcome description and business owner',
    track: 'template', source: 'template',
  });

  // mark seeded
  await db.update(projects).set({ seeded: true }).where(eq(projects.id, PROJECT_ID));

  console.log('Seeded project 15 successfully');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
