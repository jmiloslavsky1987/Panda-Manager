/**
 * seed-amex-e2e-workflows.ts
 * Derives E2E workflows for each AMEX team from team_onboarding_status rows.
 * Each team gets one ADR workflow + one Biggy AI workflow (if biggy_ai_status set),
 * with steps corresponding to the phase columns in team_onboarding_status.
 *
 * Run: DATABASE_URL=postgresql://localhost:5432/bigpanda_app npx tsx scripts/seed-amex-e2e-workflows.ts
 */
import { db } from '../db/index'
import { e2eWorkflows, workflowSteps, teamOnboardingStatus } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'

const PROJECT_ID = 1

// ADR phase steps: maps onboarding status column → step label + position
const ADR_STEPS: Array<{ field: keyof typeof STATUS_FIELDS; label: string; position: number }> = [
  { field: 'ingest_status',                  label: 'Event Ingest',          position: 1 },
  { field: 'correlation_status',             label: 'Alert Intelligence',     position: 2 },
  { field: 'incident_intelligence_status',   label: 'Incident Intelligence',  position: 3 },
  { field: 'sn_automation_status',           label: 'Workflow Automation',    position: 4 },
]

// Biggy phase steps
const BIGGY_STEPS: Array<{ field: keyof typeof STATUS_FIELDS; label: string; position: number }> = [
  { field: 'biggy_ai_status', label: 'Biggy AI', position: 1 },
]

// Used only for keyof — keeps TypeScript happy
const STATUS_FIELDS = {
  ingest_status: '',
  correlation_status: '',
  incident_intelligence_status: '',
  sn_automation_status: '',
  biggy_ai_status: '',
}

type StatusField = keyof typeof STATUS_FIELDS
type IntegrationStatus = 'live' | 'in_progress' | 'pilot' | 'planned'

async function main() {
  // 1. Delete existing e2e_workflows for this project (workflow_steps cascade)
  const existing = await db
    .select({ id: e2eWorkflows.id })
    .from(e2eWorkflows)
    .where(eq(e2eWorkflows.project_id, PROJECT_ID))

  if (existing.length > 0) {
    const ids = existing.map(r => r.id)
    await db.delete(workflowSteps).where(inArray(workflowSteps.workflow_id, ids))
    await db.delete(e2eWorkflows).where(eq(e2eWorkflows.project_id, PROJECT_ID))
    console.log(`Deleted ${existing.length} existing e2e_workflows`)
  }

  // 2. Fetch team onboarding status rows
  const teams = await db
    .select()
    .from(teamOnboardingStatus)
    .where(eq(teamOnboardingStatus.project_id, PROJECT_ID))

  console.log(`Found ${teams.length} teams to derive workflows from\n`)

  for (const team of teams) {
    // ── ADR workflow ──────────────────────────────────────────────────────────
    const [adrWf] = await db.insert(e2eWorkflows).values({
      project_id: PROJECT_ID,
      team_name: team.team_name,
      workflow_name: 'ADR Integration Journey',
      source: 'seed',
    }).returning()

    const adrStepValues = ADR_STEPS.map(step => ({
      workflow_id: adrWf.id,
      label: step.label,
      track: 'ADR',
      status: (team[step.field as StatusField] ?? 'planned') as string,
      position: step.position,
    }))
    await db.insert(workflowSteps).values(adrStepValues)
    console.log(`  [ADR] ${team.team_name}: ${adrStepValues.map(s => `${s.label}(${s.status})`).join(' → ')}`)

    // ── Biggy AI workflow (only if biggy_ai_status is set) ────────────────────
    if (team.biggy_ai_status) {
      const [biggyWf] = await db.insert(e2eWorkflows).values({
        project_id: PROJECT_ID,
        team_name: team.team_name,
        workflow_name: 'Biggy AI Journey',
        source: 'seed',
      }).returning()

      const biggyStepValues = BIGGY_STEPS.map(step => ({
        workflow_id: biggyWf.id,
        label: step.label,
        track: 'Biggy',
        status: (team[step.field as StatusField] ?? 'planned') as string,
        position: step.position,
      }))
      await db.insert(workflowSteps).values(biggyStepValues)
      console.log(`  [Biggy] ${team.team_name}: ${biggyStepValues.map(s => `${s.label}(${s.status})`).join(' → ')}`)
    }
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
