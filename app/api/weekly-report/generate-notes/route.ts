import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/db'
import { projects, onboardingSteps, onboardingPhases, integrations, teamOnboardingStatus, auditLog, engagementHistory, risks, milestones } from '@/db/schema'
import { eq, and, gte, inArray, or, isNull, desc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { requireSession } from '@/lib/auth-server'
import { z } from 'zod'

const schema = z.object({
  project_id: z.number().int(),
  week_of: z.string().min(1),
})

function isoWeekBounds(weekOf: string): { start: Date; end: Date } {
  const [yearStr, wStr] = weekOf.split('-W')
  const year = parseInt(yearStr), week = parseInt(wStr)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day1 = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - day1 + 1 + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

export async function POST(req: NextRequest) {
  const { redirectResponse } = await requireSession()
  if (redirectResponse) return redirectResponse

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { project_id, week_of } = parsed.data
  const { start, end } = isoWeekBounds(week_of)

  // Fetch project info
  const [project] = await db.select().from(projects).where(eq(projects.id, project_id)).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // RLS bypass via SET LOCAL for all queries in a transaction
  const data = await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${project_id}`))

    // Audit log changes this week (steps, integrations, teams)
    const auditRows = await tx
      .select()
      .from(auditLog)
      .where(and(
        gte(auditLog.created_at, start),
        inArray(auditLog.entity_type, ['team_onboarding_status', 'onboarding_step', 'integration']),
      ))
      .orderBy(desc(auditLog.created_at))
      .limit(40)

    // Recent engagement history (last 30 days for broader context)
    const thirtyDaysAgo = new Date(start)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const historyRows = await tx
      .select({ content: engagementHistory.content, date: engagementHistory.date })
      .from(engagementHistory)
      .where(eq(engagementHistory.project_id, project_id))
      .orderBy(desc(engagementHistory.created_at))
      .limit(10)

    // Current step statuses (standard phases only)
    const stepRows = await tx
      .select({
        phase: onboardingPhases.name,
        step: onboardingSteps.name,
        status: onboardingSteps.status,
        track: onboardingSteps.track,
      })
      .from(onboardingSteps)
      .innerJoin(onboardingPhases, eq(onboardingSteps.phase_id, onboardingPhases.id))
      .where(and(
        eq(onboardingSteps.project_id, project_id),
        inArray(onboardingPhases.name, ['Discovery & Kickoff', 'Platform Configuration', 'UAT', 'Validation']),
      ))
      .orderBy(onboardingPhases.display_order, onboardingSteps.display_order)

    // Open risks
    const riskRows = await tx
      .select({ description: risks.description, severity: risks.severity })
      .from(risks)
      .where(and(
        eq(risks.project_id, project_id),
        or(eq(risks.status, 'open'), isNull(risks.status)),
      ))
      .limit(5)

    // Upcoming milestones
    const milestoneRows = await tx
      .select({ name: milestones.name, date: milestones.date, status: milestones.status })
      .from(milestones)
      .where(eq(milestones.project_id, project_id))
      .limit(5)

    return { auditRows, historyRows, stepRows, riskRows, milestoneRows }
  })

  // Build context for Claude
  const changeLines: string[] = []
  for (const row of data.auditRows) {
    const before = row.before_json as any
    const after = row.after_json as any
    if (!before || !after) continue
    if (row.action === 'update') {
      const changed = Object.keys(after).filter(k => after[k] !== before[k] && k !== 'updated_at')
      if (changed.includes('status')) {
        const name = before.name ?? before.team_name ?? before.tool ?? `#${row.entity_id}`
        changeLines.push(`- ${row.entity_type.replace(/_/g, ' ')}: "${name}" changed status ${before.status} → ${after.status}`)
      }
    }
  }

  const stepsSection = data.stepRows
    .map(s => `  [${s.track}] ${s.phase} / ${s.step}: ${s.status}`)
    .join('\n')

  const historySection = data.historyRows
    .map(h => `${h.date ?? ''}: ${h.content}`)
    .join('\n')

  const risksSection = data.riskRows
    .map(r => `- [${r.severity ?? 'unknown'}] ${r.description}`)
    .join('\n')

  const prompt = `You are a project manager writing a weekly status update for the project "${project.customer}".

## Project Status Summary
${project.status_summary ?? 'No summary available.'}

## Current Onboarding Steps
${stepsSection || 'No steps data.'}

## Status Changes This Week (${week_of})
${changeLines.length > 0 ? changeLines.join('\n') : 'No tracked changes this week.'}

## Recent Engagement History
${historySection || 'No recent history.'}

## Open Risks
${risksSection || 'None.'}

Write EXACTLY 3 short bullet points (one line each, starting with •) summarizing:
1. What meaningful progress was made this week
2. What is actively in progress or the current focus
3. What the next key step or blocker is

Keep each bullet to 1-2 sentences. Be specific and concrete. Do not use generic filler phrases. Output only the 3 bullets, nothing else.`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    return NextResponse.json({ notes: text })
  } catch (err) {
    console.error('weekly-report generate-notes error:', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
