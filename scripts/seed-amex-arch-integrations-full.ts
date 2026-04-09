/**
 * seed-amex-arch-integrations-full.ts
 * Seeds all architecture integrations for AMEX (project_id=1) from the reference screenshot.
 * Deletes existing integrations for the project first, then inserts fresh data with group fields.
 *
 * Run: DATABASE_URL=postgresql://localhost:5432/bigpanda_app npx tsx scripts/seed-amex-arch-integrations-full.ts
 */
import { db } from '../db/index'
import { architectureIntegrations } from '../db/schema'
import { eq } from 'drizzle-orm'

const PROJECT_ID = 1

type Status = 'live' | 'in_progress' | 'pilot' | 'planned'

interface IntegrationSeed {
  tool_name: string
  track: string
  phase: string
  integration_group?: string
  status: Status
  notes?: string
}

const INTEGRATIONS: IntegrationSeed[] = [
  // ─── ADR / Event Ingest ───────────────────────────────────────────────────
  { tool_name: 'Sahara (OIM)',        track: 'ADR', phase: 'Event Ingest',         status: 'live' },
  { tool_name: 'Dynatrace DTOne',     track: 'ADR', phase: 'Event Ingest',         status: 'live' },
  { tool_name: 'Splunk COE',          track: 'ADR', phase: 'Event Ingest',         status: 'live' },
  { tool_name: 'Netcool / IBM',       track: 'ADR', phase: 'Event Ingest',         status: 'in_progress' },
  { tool_name: 'Control-M (CLTM)',    track: 'ADR', phase: 'Event Ingest',         status: 'planned' },
  { tool_name: 'ELF / ELK',          track: 'ADR', phase: 'Event Ingest',         status: 'planned' },

  // ─── ADR / Alert Intelligence ─────────────────────────────────────────────
  { tool_name: 'Mapping & Enrichment',    track: 'ADR', phase: 'Alert Intelligence', integration_group: 'ALERT NORMALIZATION', status: 'live' },
  { tool_name: 'Alert Tags',              track: 'ADR', phase: 'Alert Intelligence', integration_group: 'ALERT NORMALIZATION', status: 'live' },
  { tool_name: 'Topology Integration',    track: 'ADR', phase: 'Alert Intelligence', integration_group: 'ALERT NORMALIZATION', status: 'in_progress' },
  { tool_name: 'Alert Filtering',         track: 'ADR', phase: 'Alert Intelligence', status: 'live' },
  { tool_name: 'Alert Suppression',       track: 'ADR', phase: 'Alert Intelligence', status: 'in_progress' },
  { tool_name: 'Alert Correlation',       track: 'ADR', phase: 'Alert Intelligence', status: 'live' },

  // ─── ADR / Incident Intelligence ──────────────────────────────────────────
  { tool_name: 'Incident Enrichment',     track: 'ADR', phase: 'Incident Intelligence', status: 'live' },
  { tool_name: 'Incident Classification', track: 'ADR', phase: 'Incident Intelligence', status: 'in_progress' },
  { tool_name: 'Change Integration',      track: 'ADR', phase: 'Incident Intelligence', status: 'live' },
  { tool_name: 'Suggested Root Cause',    track: 'ADR', phase: 'Incident Intelligence', status: 'planned' },

  // ─── ADR / Workflow Automation ────────────────────────────────────────────
  { tool_name: 'ServiceNow Ticketing',    track: 'ADR', phase: 'Workflow Automation', status: 'live' },
  { tool_name: 'Autoshares / Manual Shares', track: 'ADR', phase: 'Workflow Automation', status: 'live' },
  { tool_name: 'Slack Notifications',     track: 'ADR', phase: 'Workflow Automation', status: 'live' },
  { tool_name: 'EAP Automation Tags',     track: 'ADR', phase: 'Workflow Automation', status: 'in_progress' },
  { tool_name: 'Runbook Automation',      track: 'ADR', phase: 'Workflow Automation', status: 'planned' },

  // ─── Biggy AI / Knowledge Sources (Ingested) ─────────────────────────────
  { tool_name: 'ServiceNow Context',          track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'live' },
  { tool_name: 'BigPanda (ADR Stream)',        track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'live' },
  { tool_name: 'MIM Bridge Data',             track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'in_progress' },
  { tool_name: 'ELF / ELK',                   track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'planned' },
  { tool_name: 'KB Articles & Runbooks',       track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'planned' },

  // ─── Biggy AI / Real-Time Query Sources ──────────────────────────────────
  { tool_name: 'Dynatrace',       track: 'Biggy AI', phase: 'Real-Time Query Sources', integration_group: 'ON-DEMAND DURING INVESTIGATION', status: 'in_progress' },
  { tool_name: 'Splunk COE',      track: 'Biggy AI', phase: 'Real-Time Query Sources', integration_group: 'ON-DEMAND DURING INVESTIGATION', status: 'in_progress' },
  { tool_name: 'MIM Portal (EMIM)', track: 'Biggy AI', phase: 'Real-Time Query Sources', integration_group: 'ON-DEMAND DURING INVESTIGATION', status: 'planned' },

  // ─── Biggy AI / Biggy Capabilities ───────────────────────────────────────
  { tool_name: 'Incident Triage',         track: 'Biggy AI', phase: 'Biggy Capabilities', status: 'live' },
  { tool_name: 'Change Risk Scoring',     track: 'Biggy AI', phase: 'Biggy Capabilities', status: 'in_progress' },
  { tool_name: 'Incident Summaries',      track: 'Biggy AI', phase: 'Biggy Capabilities', status: 'live' },
  { tool_name: 'Channel Hawk',            track: 'Biggy AI', phase: 'Biggy Capabilities', status: 'planned' },

  // ─── Biggy AI / Outputs & Actions ────────────────────────────────────────
  { tool_name: 'Slack Integration',  track: 'Biggy AI', phase: 'Outputs & Actions', status: 'live' },
  { tool_name: 'Action Plans',       track: 'Biggy AI', phase: 'Outputs & Actions', status: 'in_progress' },
  { tool_name: 'SN Writeback',       track: 'Biggy AI', phase: 'Outputs & Actions', status: 'in_progress' },
  { tool_name: 'Self-Service API',   track: 'Biggy AI', phase: 'Outputs & Actions', status: 'planned' },
]

async function main() {
  // Delete existing integrations for this project
  const deleted = await db
    .delete(architectureIntegrations)
    .where(eq(architectureIntegrations.project_id, PROJECT_ID))
    .returning({ id: architectureIntegrations.id })
  console.log(`Deleted ${deleted.length} existing architecture integrations for project ${PROJECT_ID}`)

  // Insert all new integrations
  let insertCount = 0
  for (const seed of INTEGRATIONS) {
    await db.insert(architectureIntegrations).values({
      project_id: PROJECT_ID,
      tool_name: seed.tool_name,
      track: seed.track,
      phase: seed.phase,
      integration_group: seed.integration_group ?? null,
      status: seed.status,
      notes: seed.notes ?? null,
      source: 'seed',
    })
    console.log(`  Inserted: [${seed.track} / ${seed.phase}${seed.integration_group ? ` / ${seed.integration_group}` : ''}] ${seed.tool_name} (${seed.status})`)
    insertCount++
  }

  console.log(`\nDone. Inserted ${insertCount} integrations.`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
