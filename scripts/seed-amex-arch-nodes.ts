/**
 * seed-amex-arch-nodes.ts — Seed arch_tracks and arch_nodes for AMEX (project_id=1)
 * derived from its existing architecture_integrations data.
 *
 * Run: npx tsx scripts/seed-amex-arch-nodes.ts
 *
 * Idempotent: skips if arch_tracks already exist for this project.
 */

import { db } from '../db/index';
import { archTracks, archNodes, architectureIntegrations } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

const PROJECT_ID = 1;

async function main() {
  // Guard: skip if already seeded
  const existing = await db.select().from(archTracks).where(eq(archTracks.project_id, PROJECT_ID));
  if (existing.length > 0) {
    console.log(`arch_tracks already seeded for project ${PROJECT_ID} (${existing.length} tracks). Skipping.`);
    process.exit(0);
  }

  // Derive distinct tracks and their phases from architecture_integrations
  const integrations = await db
    .select({ track: architectureIntegrations.track, phase: architectureIntegrations.phase })
    .from(architectureIntegrations)
    .where(eq(architectureIntegrations.project_id, PROJECT_ID))
    .orderBy(asc(architectureIntegrations.track), asc(architectureIntegrations.phase));

  // Build: track → Set<phase>
  const trackPhases = new Map<string, Set<string>>();
  for (const row of integrations) {
    if (!row.track) continue;
    if (!trackPhases.has(row.track)) trackPhases.set(row.track, new Set());
    if (row.phase) trackPhases.get(row.track)!.add(row.phase);
  }

  if (trackPhases.size === 0) {
    console.log('No architecture_integrations found for this project. Nothing to seed.');
    process.exit(0);
  }

  console.log(`Seeding ${trackPhases.size} tracks for project ${PROJECT_ID}...`);

  let trackOrder = 1;
  for (const [trackName, phases] of trackPhases) {
    const [track] = await db
      .insert(archTracks)
      .values({ project_id: PROJECT_ID, name: trackName, display_order: trackOrder++ })
      .returning();

    console.log(`  Created track: "${track.name}" (id=${track.id})`);

    let nodeOrder = 1;
    for (const phase of phases) {
      const [node] = await db
        .insert(archNodes)
        .values({
          track_id: track.id,
          project_id: PROJECT_ID,
          name: phase,
          display_order: nodeOrder++,
          status: 'planned',
        })
        .returning();
      console.log(`    Created node: "${node.name}" (id=${node.id})`);
    }
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
