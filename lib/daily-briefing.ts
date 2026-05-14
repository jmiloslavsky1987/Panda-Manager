// lib/daily-briefing.ts
// Phase 85.2 helpers: flexible date parsing + heuristic candidate queries for Today's Briefing synthesis.
//
// TEXT date columns (actions.due, risks.target_date, milestones.date, wbs_items.due_date) accept
// non-ISO strings like 'TBD' or '2026-Q3'. SQL lexicographic comparison would produce wrong results,
// so we fetch candidates with status filters only and apply date range filtering in TypeScript.
//
// Single-user app note: fetchers accept userId param for Phase 86 SSO readiness, but current
// implementation fetches across all projects (no per-user ownership filter). Phase 86 will add
// a join on project_members once multi-tenant auth is live.

import { and, eq, gte, inArray } from 'drizzle-orm';
import db from '@/db';
import {
  actions,
  risks,
  milestones,
  keyDecisions,
  wbsItems,
  dailyPrepBriefs,
} from '@/db/schema';

// ─── Date Parsing ─────────────────────────────────────────────────────────────

/**
 * Parses flexible date strings (including ISO dates, 'TBD', '2026-Q3', null, empty).
 * Returns a Date for valid ISO-parseable strings; returns null for anything that
 * produces NaN or for falsy input.
 *
 * Pattern mirrors lib/queries.ts:419 usage of new Date() + isNaN guard.
 */
export function parseFlexibleDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Action Candidates ────────────────────────────────────────────────────────

export interface ActionCandidate {
  id: number;
  project_id: number;
  description: string;  // actions.description (not title)
  due: string | null;
  parsed_due: Date;     // never null — already filtered
  status: string;
}

/**
 * Returns open/in_progress actions with a parsed_due_date <= today.
 * Date comparison is performed in TypeScript (not SQL) to handle non-ISO due values.
 * Results are sorted by parsed_due ascending (earliest first).
 *
 * Phase 86 readiness: _userId param accepted but not yet used for ownership filtering.
 */
export async function fetchTodayActionCandidates(
  _userId: string,
  today: Date,
): Promise<ActionCandidate[]> {
  // Single-user app — pull all open/in_progress actions across all projects.
  const rows = await db
    .select()
    .from(actions)
    .where(inArray(actions.status, ['open', 'in_progress']));

  const candidates: ActionCandidate[] = [];
  for (const r of rows) {
    const parsed = parseFlexibleDate(r.due);
    if (parsed && parsed <= today) {
      candidates.push({
        id: r.id,
        project_id: r.project_id,
        description: r.description,
        due: r.due,
        parsed_due: parsed,
        status: r.status,
      });
    }
  }
  return candidates.sort((a, b) => a.parsed_due.getTime() - b.parsed_due.getTime());
}

// ─── Week Critical Candidates ─────────────────────────────────────────────────

export interface RiskCandidate {
  id: number;
  project_id: number;
  description: string;  // risks.description (not title)
  severity: string | null;
  status: string | null;
  target_date: string | null;
}

export interface MilestoneCandidate {
  id: number;
  project_id: number;
  name: string;          // milestones.name (not title)
  date: string | null;
  parsed_date: Date;
  status: string | null;
}

export interface DecisionCandidate {
  id: number;
  project_id: number;
  decision: string;      // keyDecisions.decision (not title; APPEND-ONLY table)
  date: string | null;
}

export interface WbsCandidate {
  id: number;
  project_id: number;
  name: string;
  due_date: string | null;
  percent_complete: number | null;
}

/**
 * Returns risks, milestones, decisions, and WBS items relevant to the next 7 days.
 *
 * - Risks: open AND high/critical severity (no date filter — risks are ongoing)
 * - Milestones: on_track or at_risk, with parsed_date between today and today+7d
 * - Decisions: recorded in the last 7 days (via SQL filter on ISO date column; JS fallback for invalid dates)
 * - WBS: in_progress, parsed_due_date < today, percent_complete < 100 (overdue/blocked items)
 *
 * Phase 86 readiness: _userId param accepted but not yet used for ownership filtering.
 */
export async function fetchWeekCriticalCandidates(
  _userId: string,
  today: Date,
): Promise<{
  risks: RiskCandidate[];
  milestones: MilestoneCandidate[];
  decisions: DecisionCandidate[];
  wbsItems: WbsCandidate[];
}> {
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Risks: open status AND high/critical severity
  const riskRows = await db
    .select()
    .from(risks)
    .where(and(eq(risks.status, 'open'), inArray(risks.severity, ['high', 'critical'])));

  const riskCandidates: RiskCandidate[] = riskRows.map((r) => ({
    id: r.id,
    project_id: r.project_id,
    description: r.description,
    severity: r.severity,
    status: r.status,
    target_date: r.target_date,
  }));

  // Milestones: on_track or at_risk + parsed_date between today and today+7d
  const milestoneRows = await db
    .select()
    .from(milestones)
    .where(inArray(milestones.status, ['on_track', 'at_risk']));

  const milestoneCandidates: MilestoneCandidate[] = [];
  for (const m of milestoneRows) {
    const parsed = parseFlexibleDate(m.date);
    if (!parsed) continue;
    if (parsed < today || parsed > sevenDaysFromNow) continue;
    milestoneCandidates.push({
      id: m.id,
      project_id: m.project_id,
      name: m.name,
      date: m.date,
      parsed_date: parsed,
      status: m.status,
    });
  }

  // Decisions: last 7 days via SQL filter on the date TEXT column.
  // ISO YYYY-MM-DD dates sort lexicographically correctly; non-ISO values ('TBD', etc.)
  // will be excluded by the gte() comparison (they compare as greater than or less than dates
  // depending on string value, so we filter JS-side too).
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
  const decisionRows = await db
    .select()
    .from(keyDecisions)
    .where(gte(keyDecisions.date, sevenDaysAgoStr));

  // Secondary JS filter: keep only rows where parseFlexibleDate confirms a real date >= sevenDaysAgo
  const decisionCandidates: DecisionCandidate[] = decisionRows
    .filter((d) => {
      const parsed = parseFlexibleDate(d.date);
      return parsed !== null && parsed >= sevenDaysAgo;
    })
    .map((d) => ({
      id: d.id,
      project_id: d.project_id,
      decision: d.decision,
      date: d.date,
    }));

  // WBS: in_progress + parsed_due_date < today + percent_complete < 100 (overdue/lagging items)
  const wbsRows = await db
    .select()
    .from(wbsItems)
    .where(eq(wbsItems.status, 'in_progress'));

  const wbsCandidates: WbsCandidate[] = [];
  for (const w of wbsRows) {
    const parsed = parseFlexibleDate(w.due_date);
    if (!parsed) continue;
    if (parsed >= today) continue;                        // not yet overdue
    if ((w.percent_complete ?? 0) >= 100) continue;      // already complete
    wbsCandidates.push({
      id: w.id,
      project_id: w.project_id,
      name: w.name,
      due_date: w.due_date,
      percent_complete: w.percent_complete,
    });
  }

  return {
    risks: riskCandidates,
    milestones: milestoneCandidates,
    decisions: decisionCandidates,
    wbsItems: wbsCandidates,
  };
}

// ─── Meetings + Briefs ────────────────────────────────────────────────────────

/**
 * Returns stored daily-prep briefs for a given user and date from the daily_prep_briefs table.
 * Calendar events themselves come from the Google Calendar API (not a DB table), so
 * meetingsWithoutBriefs is always empty here — the route layer enriches it with live API data.
 *
 * This separation is intentional:
 * - meetingsWithBriefs: DB-backed, available without Google API (e.g., for briefing regeneration)
 * - meetingsWithoutBriefs: must be joined by the route handler using CalendarEventItem[] from the API
 */
export async function fetchTodayMeetingsAndBriefs(
  userId: string,
  date: string,
): Promise<{
  meetingsWithBriefs: Array<{ event_id: string; brief_content: string }>;
  meetingsWithoutBriefs: Array<{ event_id: string; title: string; attendees: string[]; matched_project_id: number | null }>;
}> {
  const briefRows = await db
    .select()
    .from(dailyPrepBriefs)
    .where(and(eq(dailyPrepBriefs.user_id, userId), eq(dailyPrepBriefs.date, date)));

  const meetingsWithBriefs = briefRows.map((b) => ({
    event_id: b.event_id,
    brief_content: b.brief_content,
  }));

  // meetingsWithoutBriefs requires live Google Calendar API data (CalendarEventItem[]).
  // The route handler (app/api/daily-prep/briefing/route.ts) cross-references this list
  // with the calendar API response to populate meetings lacking a stored brief.
  const meetingsWithoutBriefs: Array<{
    event_id: string;
    title: string;
    attendees: string[];
    matched_project_id: number | null;
  }> = [];

  return { meetingsWithBriefs, meetingsWithoutBriefs };
}
