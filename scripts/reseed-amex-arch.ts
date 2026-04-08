/**
 * reseed-amex-arch.ts — Reset arch_tracks/arch_nodes/integration phases for AMEX (project_id=1)
 * to use proper BigPanda phase column names.
 * Run: DATABASE_URL=postgresql://localhost:5432/bigpanda_app npx tsx scripts/reseed-amex-arch.ts
 */
import { db } from '../db/index'
import { archTracks, archNodes, architectureIntegrations } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'

const PROJECT_ID = 1

async function main() {
  // 1. Delete existing arch_tracks (arch_nodes cascade via FK)
  const existingTracks = await db.select({ id: archTracks.id }).from(archTracks).where(eq(archTracks.project_id, PROJECT_ID))
  if (existingTracks.length > 0) {
    const trackIds = existingTracks.map(t => t.id)
    await db.delete(archNodes).where(inArray(archNodes.track_id, trackIds))
    await db.delete(archTracks).where(eq(archTracks.project_id, PROJECT_ID))
    console.log(`Deleted ${existingTracks.length} existing tracks and their nodes`)
  }

  // 2. Create ADR track
  const [adr] = await db.insert(archTracks).values({ project_id: PROJECT_ID, name: 'ADR', display_order: 1 }).returning()
  console.log(`Created track: ADR (id=${adr.id})`)

  // 3. Create Biggy AI track
  const [biggy] = await db.insert(archTracks).values({ project_id: PROJECT_ID, name: 'Biggy AI', display_order: 2 }).returning()
  console.log(`Created track: Biggy AI (id=${biggy.id})`)

  // 4. Create ADR phase nodes
  const adrPhases = ['Event Ingest', 'Alert Intelligence', 'Incident Intelligence', 'Console', 'Workflow Automation']
  for (let i = 0; i < adrPhases.length; i++) {
    const [n] = await db.insert(archNodes).values({ track_id: adr.id, project_id: PROJECT_ID, name: adrPhases[i], display_order: i + 1, status: 'planned' }).returning()
    console.log(`  ADR node: ${n.name}`)
  }

  // 5. Create Biggy AI phase nodes
  const biggyPhases = ['Knowledge Sources (Ingested)', 'Real-Time Query Sources', 'Biggy Capabilities', 'Console', 'Outputs & Actions']
  for (let i = 0; i < biggyPhases.length; i++) {
    const [n] = await db.insert(archNodes).values({ track_id: biggy.id, project_id: PROJECT_ID, name: biggyPhases[i], display_order: i + 1, status: 'planned' }).returning()
    console.log(`  Biggy AI node: ${n.name}`)
  }

  // 6. Remap architecture_integrations to correct track/phase
  const remaps: Array<{ toolName: string; track: string; phase: string; status?: string }> = [
    // ADR integrations
    { toolName: 'ServiceNow', track: 'ADR', phase: 'Workflow Automation', status: 'live' },
    { toolName: 'BigPanda Correlation Patterns', track: 'ADR', phase: 'Alert Intelligence', status: 'in_progress' },
    { toolName: 'Unified Data Connector (UDC)', track: 'ADR', phase: 'Event Ingest', status: 'live' },
    // Biggy AI integrations
    { toolName: 'Confluence', track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'in_progress' },
    { toolName: 'UDC (Universal Data Connector)', track: 'Biggy AI', phase: 'Knowledge Sources (Ingested)', status: 'live' },
    { toolName: 'API Gateway / EWP', track: 'Biggy AI', phase: 'Real-Time Query Sources', status: 'in_progress' },
    { toolName: 'Splunk', track: 'Biggy AI', phase: 'Real-Time Query Sources', status: 'in_progress' },
    { toolName: 'Prometheus / Grafana', track: 'Biggy AI', phase: 'Real-Time Query Sources', status: 'planned' },
    { toolName: 'Dynatrace', track: 'Biggy AI', phase: 'Real-Time Query Sources', status: 'in_progress' },
    { toolName: 'ELF / MCP Agent', track: 'Biggy AI', phase: 'Biggy Capabilities', status: 'in_progress' },
    { toolName: 'Biggy', track: 'Biggy AI', phase: 'Biggy Capabilities', status: 'live' },
    { toolName: 'Slack', track: 'Biggy AI', phase: 'Outputs & Actions', status: 'in_progress' },
  ]

  for (const remap of remaps) {
    const rows = await db.select({ id: architectureIntegrations.id, tool_name: architectureIntegrations.tool_name })
      .from(architectureIntegrations)
      .where(eq(architectureIntegrations.project_id, PROJECT_ID))
    const match = rows.find(r => r.tool_name && r.tool_name.toLowerCase().includes(remap.toolName.toLowerCase()))
    if (match) {
      await db.update(architectureIntegrations)
        .set({ track: remap.track, phase: remap.phase, ...(remap.status ? { status: remap.status as any } : {}) })
        .where(eq(architectureIntegrations.id, match.id))
      console.log(`  Remapped: ${match.tool_name} → ${remap.track} / ${remap.phase}`)
    } else {
      console.log(`  NOT FOUND: ${remap.toolName}`)
    }
  }

  console.log('Done.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
