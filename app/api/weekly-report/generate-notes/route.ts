import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/db'
import { projects, onboardingSteps, onboardingPhases, integrations, teamOnboardingStatus, auditLog, engagementHistory, timeEntries } from '@/db/schema'
import { eq, and, gte, lte, inArray, desc } from 'drizzle-orm'
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
  const startISO = start.toISOString().slice(0, 10)
  const endISO = end.toISOString().slice(0, 10)

  const [project] = await db.select().from(projects).where(eq(projects.id, project_id)).limit(1)
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const data = await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.current_project_id = ${project_id}`))

    // Step update notes added this week (the richest source of "what happened")
    const stepsWithUpdates = await tx
      .select({
        name: onboardingSteps.name,
        track: onboardingSteps.track,
        status: onboardingSteps.status,
        updates: onboardingSteps.updates,
        phase: onboardingPhases.name,
      })
      .from(onboardingSteps)
      .innerJoin(onboardingPhases, eq(onboardingSteps.phase_id, onboardingPhases.id))
      .where(eq(onboardingSteps.project_id, project_id))
      .orderBy(desc(onboardingSteps.updated_at))

    // Time entry descriptions this week
    const timeRows = await tx
      .select({ date: timeEntries.date, description: timeEntries.description })
      .from(timeEntries)
      .where(and(
        eq(timeEntries.project_id, project_id),
        gte(timeEntries.date, startISO),
        lte(timeEntries.date, endISO),
      ))
      .orderBy(desc(timeEntries.date))
      .limit(20)

    // Engagement history from last 14 days (recent meeting notes, call summaries)
    const twoWeeksAgo = new Date(start)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const historyRows = await tx
      .select({ content: engagementHistory.content, date: engagementHistory.date })
      .from(engagementHistory)
      .where(and(
        eq(engagementHistory.project_id, project_id),
        gte(engagementHistory.created_at, twoWeeksAgo),
      ))
      .orderBy(desc(engagementHistory.created_at))
      .limit(8)

    // Audit log: status changes this week
    const auditRows = await tx
      .select()
      .from(auditLog)
      .where(and(
        gte(auditLog.created_at, start),
        lte(auditLog.created_at, end),
        inArray(auditLog.entity_type, ['onboarding_step', 'integration', 'team_onboarding_status']),
      ))
      .orderBy(desc(auditLog.created_at))
      .limit(30)

    // Integration statuses (for in-progress technical work context)
    const integRows = await tx
      .select({ tool: integrations.tool, track: integrations.track, status: integrations.status, notes: integrations.notes })
      .from(integrations)
      .where(and(
        eq(integrations.project_id, project_id),
        inArray(integrations.status, ['in-progress', 'blocked']),
      ))

    // Team statuses
    const teamRows = await tx
      .select({ team_name: teamOnboardingStatus.team_name, track: teamOnboardingStatus.track, status: teamOnboardingStatus.status })
      .from(teamOnboardingStatus)
      .where(and(
        eq(teamOnboardingStatus.project_id, project_id),
        inArray(teamOnboardingStatus.status, ['in-progress', 'blocked', 'complete']),
      ))

    return { stepsWithUpdates, timeRows, historyRows, auditRows, integRows, teamRows }
  })

  // Extract step update notes added this week
  const weekStepNotes: string[] = []
  for (const step of data.stepsWithUpdates) {
    const updates = (step.updates ?? []) as { timestamp: string; text: string }[]
    for (const u of updates) {
      if (u.timestamp >= startISO) {
        weekStepNotes.push(`[${step.track ?? '?'} / ${step.phase} / ${step.name}] ${u.text}`)
      }
    }
  }

  // Status changes this week
  const statusChanges: string[] = []
  for (const row of data.auditRows) {
    const before = row.before_json as any
    const after = row.after_json as any
    if (!before || !after) continue
    const changed = Object.keys(after).filter(k => after[k] !== before[k] && k !== 'updated_at')
    if (changed.includes('status')) {
      const name = before.name ?? before.team_name ?? before.tool ?? `#${row.entity_id}`
      statusChanges.push(`"${name}" (${row.entity_type.replace(/_/g, ' ')}): ${before.status} → ${after.status}`)
    }
  }

  // Time entry descriptions
  const timeDescs = data.timeRows
    .filter(r => r.description?.trim())
    .map(r => `${r.date}: ${r.description}`)

  // Engagement history
  const historyLines = data.historyRows
    .filter(r => r.content?.trim())
    .map(r => `${r.date ?? ''}: ${r.content}`)

  // Active integrations (what technical work is ongoing)
  const activeIntegLines = data.integRows.map(i =>
    `[${i.track ?? 'unassigned'}] ${i.tool} — ${i.status}${i.notes ? `: ${i.notes}` : ''}`
  )

  // Team progress
  const teamLines = data.teamRows.map(t =>
    `[${t.track ?? '?'}] Team: ${t.team_name} — ${t.status}`
  )

  // In-progress steps (what's actively being worked)
  const inProgressSteps = data.stepsWithUpdates
    .filter(s => s.status === 'in-progress')
    .map(s => `[${s.track ?? '?'}] ${s.phase} / ${s.name}`)

  // Build the prompt
  const sections: string[] = []

  if (project.sprint_summary) {
    sections.push(`## Most Recent Sprint Summary\n${project.sprint_summary}`)
  }
  if (project.status_summary) {
    sections.push(`## Project Status Summary\n${project.status_summary}`)
  }
  if (weekStepNotes.length > 0) {
    sections.push(`## Notes Logged on Steps This Week\n${weekStepNotes.join('\n')}`)
  }
  if (timeDescs.length > 0) {
    sections.push(`## Time Entry Descriptions This Week\n${timeDescs.join('\n')}`)
  }
  if (historyLines.length > 0) {
    sections.push(`## Recent Meeting Notes / Engagement History\n${historyLines.join('\n')}`)
  }
  if (statusChanges.length > 0) {
    sections.push(`## Status Changes This Week\n${statusChanges.join('\n')}`)
  }
  if (activeIntegLines.length > 0) {
    sections.push(`## Active Integrations Being Worked\n${activeIntegLines.join('\n')}`)
  }
  if (inProgressSteps.length > 0) {
    sections.push(`## Steps Currently In Progress\n${inProgressSteps.join('\n')}`)
  }
  if (teamLines.length > 0) {
    sections.push(`## Team Onboarding Status\n${teamLines.join('\n')}`)
  }

  const contextBlock = sections.length > 0
    ? sections.join('\n\n')
    : 'No activity data available for this week.'

  const exampleOutput = `Example of the style and tone we want:
• TOPS correlation baseline live in TOPSAutoCoEDev — 31-min and 60-min windows active; TOPS team reviewing incidents and bringing tuning feedback.
• Ansible automation path partially unblocked — direct test path works; API Gateway routing blocked on payload handling; validating one end-to-end use case before replicating.
• Network NOC validation underway — severity/priority mapping tags need fixes; read/write access being enabled via AD group. Prod SNOW planned for 6/19.`

  const prompt = `You are a project manager writing the "Progress & Next Steps" section of a weekly status report for the project "${project.customer}".

${exampleOutput}

Notice the style: bullets describe specific technical work happening right now, name the actual systems and components being worked on, call out specific blockers with their root cause, and note upcoming dates/milestones. They do NOT say things like "Phase X is complete" or list status percentages.

Here is this week's activity data:

${contextBlock}

Write 3-5 bullet points (each starting with •) in that same style — specific, technical, action-oriented. Group ADR and Biggy work naturally if both tracks are active. Focus on:
- What specific technical work happened or progressed this week (name the systems, integrations, teams involved)
- What is blocked and exactly why
- What is planned next or coming up soon

Output only the bullet points, nothing else. If data is sparse, write what you can infer from the available context.`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    return NextResponse.json({ notes: text })
  } catch (err) {
    console.error('weekly-report generate-notes error:', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
