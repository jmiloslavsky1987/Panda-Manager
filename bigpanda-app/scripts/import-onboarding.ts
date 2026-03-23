#!/usr/bin/env tsx
/**
 * import-onboarding.ts — Idempotent seed script for onboarding data
 *
 * Reads YAML frontmatter from a project context doc and inserts:
 *   - onboarding_phases
 *   - onboarding_steps (per phase)
 *   - integrations
 *
 * Idempotency: existence-check by (project_id, name) before each insert.
 * Safe to run multiple times — will skip any rows that already exist.
 *
 * Usage: npx tsx scripts/import-onboarding.ts --project-id 1 --file ~/Documents/PM\ Application/Kaiser_context.md
 */

import { db } from '../db/index'
import { onboardingPhases, onboardingSteps, integrations } from '../db/schema'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import { eq, and } from 'drizzle-orm'

async function main() {
  const args = process.argv.slice(2)

  const projectIdIdx = args.indexOf('--project-id')
  const fileIdx = args.indexOf('--file')

  const projectIdArg = projectIdIdx !== -1 ? args[projectIdIdx + 1] : undefined
  const fileArg = fileIdx !== -1 ? args[fileIdx + 1] : undefined

  if (!projectIdArg || !fileArg) {
    console.error('Usage: npx tsx scripts/import-onboarding.ts --project-id N --file /path/to/context.md')
    process.exit(1)
  }

  const projectId = parseInt(projectIdArg, 10)
  if (isNaN(projectId)) {
    console.error(`Invalid --project-id: ${projectIdArg}`)
    process.exit(1)
  }

  // Expand ~ to home directory
  const filePath = fileArg.startsWith('~')
    ? path.join(process.env.HOME ?? '', fileArg.slice(1))
    : fileArg

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  const raw = fs.readFileSync(filePath, 'utf-8')

  // Extract YAML frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) {
    console.error('No YAML frontmatter found in file')
    process.exit(1)
  }

  const doc = yaml.load(fmMatch[1], { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>

  const obPhases = Array.isArray(doc.onboarding_phases) ? doc.onboarding_phases as any[] : []
  const integsList = Array.isArray(doc.integrations) ? doc.integrations as any[] : []

  let phasesInserted = 0
  let phasesSkipped = 0
  let stepsInserted = 0
  let stepsSkipped = 0
  let integsInserted = 0
  let integsSkipped = 0

  // ── Insert onboarding phases and their steps ──────────────────────────────
  for (const phase of obPhases) {
    const phaseName = String(phase.name ?? '')
    if (!phaseName) {
      console.warn('[import-onboarding] Skipping phase with no name')
      continue
    }

    // Idempotency: check by (project_id, name)
    const existingPhase = await db
      .select({ id: onboardingPhases.id })
      .from(onboardingPhases)
      .where(
        and(
          eq(onboardingPhases.project_id, projectId),
          eq(onboardingPhases.name, phaseName)
        )
      )

    if (existingPhase.length > 0) {
      console.log(`[import-onboarding] Skipping existing phase: ${phaseName}`)
      phasesSkipped++

      // Steps: still try to insert missing steps under this existing phase
      const phaseId = existingPhase[0].id
      const steps = Array.isArray(phase.steps) ? phase.steps as any[] : []
      for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
        const step = steps[stepIdx]
        const stepName = String(step.name ?? '')
        if (!stepName) continue

        const existingStep = await db
          .select({ id: onboardingSteps.id })
          .from(onboardingSteps)
          .where(
            and(
              eq(onboardingSteps.phase_id, phaseId),
              eq(onboardingSteps.name, stepName)
            )
          )

        if (existingStep.length > 0) {
          stepsSkipped++
          continue
        }

        await db.insert(onboardingSteps).values({
          phase_id: phaseId,
          project_id: projectId,
          name: stepName,
          description: step.description ?? null,
          status: step.status ?? 'not-started',
          owner: step.owner ?? null,
          dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
          updates: [],
          display_order: step.display_order ?? stepIdx,
        })
        stepsInserted++
      }
      continue
    }

    // Insert new phase
    const [insertedPhase] = await db
      .insert(onboardingPhases)
      .values({
        project_id: projectId,
        name: phaseName,
        display_order: phase.display_order ?? obPhases.indexOf(phase),
      })
      .returning({ id: onboardingPhases.id })

    phasesInserted++
    const phaseId = insertedPhase.id
    console.log(`[import-onboarding] Inserted phase: ${phaseName} (id=${phaseId})`)

    // Insert steps for this phase
    const steps = Array.isArray(phase.steps) ? phase.steps as any[] : []
    for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
      const step = steps[stepIdx]
      const stepName = String(step.name ?? '')
      if (!stepName) continue

      await db.insert(onboardingSteps).values({
        phase_id: phaseId,
        project_id: projectId,
        name: stepName,
        description: step.description ?? null,
        status: step.status ?? 'not-started',
        owner: step.owner ?? null,
        dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
        updates: [],
        display_order: step.display_order ?? stepIdx,
      })
      stepsInserted++
    }
  }

  // ── Insert integrations ───────────────────────────────────────────────────
  for (let integIdx = 0; integIdx < integsList.length; integIdx++) {
    const integ = integsList[integIdx]
    const toolName = String(integ.tool ?? '')
    if (!toolName) {
      console.warn('[import-onboarding] Skipping integration with no tool name')
      continue
    }

    // Idempotency: check by (project_id, tool)
    const existingInteg = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(
        and(
          eq(integrations.project_id, projectId),
          eq(integrations.tool, toolName)
        )
      )

    if (existingInteg.length > 0) {
      console.log(`[import-onboarding] Skipping existing integration: ${toolName}`)
      integsSkipped++
      continue
    }

    await db.insert(integrations).values({
      project_id: projectId,
      tool: toolName,
      category: integ.category ?? null,
      status: integ.status ?? 'not-connected',
      color: integ.color ?? null,
      notes: integ.notes ?? null,
      display_order: integ.display_order ?? integIdx,
    })
    integsInserted++
    console.log(`[import-onboarding] Inserted integration: ${toolName}`)
  }

  console.log(
    `[import-onboarding] Done — phases: ${phasesInserted} inserted / ${phasesSkipped} skipped, ` +
    `steps: ${stepsInserted} inserted / ${stepsSkipped} skipped, ` +
    `integrations: ${integsInserted} inserted / ${integsSkipped} skipped`
  )
  process.exit(0)
}

main().catch((e) => {
  console.error('[import-onboarding] Fatal error:', e)
  process.exit(1)
})
