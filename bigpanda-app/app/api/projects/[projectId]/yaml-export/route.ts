import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects, onboardingPhases, onboardingSteps, integrations } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import { readSettings } from '@/lib/settings'
import { parseYaml, serializeProjectToYaml } from '@/lib/yaml-export'
import { requireProjectRole } from "@/lib/auth-server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const numericId = parseInt(projectId, 10)
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }

  const { session, redirectResponse } = await requireProjectRole(numericId, 'user');
  if (redirectResponse) return redirectResponse;
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 })
  }

  try {
    // Load project to get source_file
    const projectRows = await db
      .select({ source_file: projects.source_file })
      .from(projects)
      .where(eq(projects.id, numericId))
      .limit(1)

    if (projectRows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const sourceFile = projectRows[0].source_file
    if (!sourceFile) {
      return NextResponse.json({ error: 'Project has no source_file configured' }, { status: 400 })
    }

    // Resolve full path to context doc
    const settings = await readSettings()
    const filePath = path.join(settings.workspace_path, sourceFile)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Context file not found' }, { status: 404 })
    }

    // Read file and extract frontmatter
    const raw = fs.readFileSync(filePath, 'utf-8')
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) {
      return NextResponse.json({ error: 'No YAML frontmatter found in context file' }, { status: 422 })
    }

    const bodyAfterFrontmatter = raw.slice(raw.indexOf('---', 3) + 3)
    const doc = parseYaml(fmMatch[1]) as Record<string, unknown>

    // Query current DB state inside RLS transaction
    const { dbPhases, dbIntegrations } = await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${numericId}`))

      const phaseRows = await tx
        .select()
        .from(onboardingPhases)
        .where(eq(onboardingPhases.project_id, numericId))
        .orderBy(asc(onboardingPhases.display_order))

      const phasesWithSteps = await Promise.all(
        phaseRows.map(async (phase) => {
          const steps = await tx
            .select()
            .from(onboardingSteps)
            .where(eq(onboardingSteps.phase_id, phase.id))
            .orderBy(asc(onboardingSteps.display_order))
          return { ...phase, steps }
        })
      )

      const integRows = await tx
        .select()
        .from(integrations)
        .where(eq(integrations.project_id, numericId))
        .orderBy(asc(integrations.display_order))

      return { dbPhases: phasesWithSteps, dbIntegrations: integRows }
    })

    // Serialize DB state to YAML-compatible objects
    const yamlPhases = dbPhases.map((p) => ({
      name: p.name,
      display_order: p.display_order,
      steps: p.steps.map((s) => ({
        name: s.name,
        description: s.description,
        status: s.status,
        owner: s.owner,
        dependencies: s.dependencies,
        display_order: s.display_order,
      })),
    }))

    const yamlIntegrations = dbIntegrations.map((i) => ({
      tool: i.tool,
      category: i.category,
      status: i.status,
      color: i.color,
      notes: i.notes,
      display_order: i.display_order,
    }))

    // Mutate ONLY the onboarding sections — all other keys remain unchanged
    doc.onboarding_phases = yamlPhases
    doc.integrations = yamlIntegrations

    // Serialize with non-negotiable settings (via serializeProjectToYaml)
    const newYaml = serializeProjectToYaml(doc)

    // Write back — preserve non-frontmatter body content
    fs.writeFileSync(
      filePath,
      `---\n${newYaml}---\n\n${bodyAfterFrontmatter.trimStart()}`
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/projects/[projectId]/yaml-export error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
