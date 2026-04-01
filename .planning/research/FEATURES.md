# Feature Landscape: v4.0 Infrastructure & UX Foundations

**Domain:** Project Management & Professional Services Onboarding Tools
**Researched:** 2026-04-01
**Context:** Adding features to existing BigPanda PS project management app

## Table Stakes

Features users expect in modern project management and onboarding tools. Missing these means the product feels incomplete or frustrating.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Health Dashboard: Overall health indicator** | Every PM tool (Jira, Monday.com, Asana) has top-line health status | Low | Existing project health_status field | Single color-coded badge or score (RED/YELLOW/GREEN) |
| **Health Dashboard: Risk count by severity** | Users need at-a-glance risk awareness without navigating to Risks tab | Low | Existing risks table with severity field | Count of critical/high/medium/low risks with severity colors |
| **Health Dashboard: Active blocker count** | Blockers are the #1 reason projects fail; must be surfaced prominently | Low | onboarding_steps.status='blocked', integrations.status='blocked' | Count + list of blocked items with links to detail tabs |
| **Health Dashboard: Trend indicators** | Static snapshots misleading; users need to know if things are improving | Medium | Time-series data or snapshot comparison logic | "Getting better" vs "getting worse" arrows; requires historical snapshots or delta calculation |
| **Metrics: Onboarding completion %** | Table stakes for onboarding tools (Pendo, Userpilot, WalkMe all show this) | Low | onboarding_steps.status counts | (completed steps / total steps) × 100 |
| **Metrics: Integration count by status** | ADR/Biggy workstreams differentiated by integration readiness; users need counts | Low | integrations table grouped by status | Count of not-connected/configured/validated/production |
| **Metrics: Phase completion by workstream** | Separate ADR/Biggy progress is core requirement for v4.0 | Low | workstreams table with percent_complete | Average or rollup of percent_complete by track (ADR vs Biggy) |
| **Metrics: Time to milestone** | Every PM tool shows days-until-milestone; critical for status reporting | Low | milestones table with target_date | Days from today to next incomplete milestone |
| **Weekly Focus: Top 3-5 priorities** | Prevents priority overload; forces clarity on what matters this week | Medium | Project data + AI/heuristic ranking | Auto-refreshes; uses actions.due_date, risks.severity, milestones.target_date to surface top priorities |
| **Weekly Focus: Circular progress bar** | Existing pattern users expect preserved; shows % completion for focus items | Low | Existing component (already built) | Retain current ProgressRing component from OnboardingDashboard |
| **Time Tracking: Global view across projects** | Multi-project workers need unified timesheet (Harvest, Toggl, Clockify all have this) | Medium | time_entries table with project_id | Single table showing all entries with project column/filter |
| **Time Tracking: Week-based grouping** | Timesheets are approved weekly in PS orgs; weekly grouping is mandatory | Low | Existing time_entries.date field | Group by ISO week, show Mon-Sun boundaries |
| **Time Tracking: Project attribution on every entry** | When viewing global log, must see which project each entry belongs to | Low | time_entries.project_id → projects.name | Join + display project name on each row |
| **Time Tracking: Quick project switcher** | Users jump between projects frequently; dropdown or tabs expected | Low | Projects list from DB | Dropdown to filter by project or "All Projects" view |
| **Time Tracking: Total hours by project** | Users and approvers need project-level rollups for capacity planning | Low | SUM(hours) GROUP BY project_id | Subtotal row per project or summary cards |
| **BullMQ Extraction: Progress polling with % complete** | Long-running jobs need progress feedback (not black box) | Medium | BullMQ job.progress() API | Update job.progress(N) where N = 0-100; client polls /api/jobs/:id |
| **BullMQ Extraction: Completion notification** | Users navigate away; need to know when extraction finishes | Low | Polling detects job.returnvalue or job.failedReason | UI shows "Complete" badge or toast when polling detects completion |
| **BullMQ Extraction: Error handling with retry** | Network/API failures common; must allow retry without re-upload | Medium | BullMQ job state (failed) + artifact.ingestion_status | On failure, show "Retry" button that re-enqueues job with same artifactId |
| **BullMQ Extraction: Cancel job** | Large doc extraction (4-6 min) must be cancellable if user uploaded wrong file | Medium | BullMQ job.remove() or job state update | "Cancel" button calls job.remove(); mark artifact.ingestion_status='cancelled' |
| **Visual Milestone Timeline: Near top of Overview** | Milestones = exec-level concern; burying at bottom violates UX hierarchy | Low | Move existing component | Relocate milestone timeline section above detailed metrics |

## Differentiators

Features that set the product apart. Not expected, but highly valued when present.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Health Dashboard: Phase health by workstream** | Most tools show overall health; splitting by ADR vs Biggy workstream gives granular insight | Medium | workstreams table with status/percent_complete by track | Shows ADR phase health + Biggy phase health separately; allows different delivery paces to be visible |
| **Health Dashboard: Health trend sparklines** | Text trends ("improving") are vague; 7-day sparkline shows exact trajectory | High | Historical health snapshot data (new table or JSONB log) | Micro-chart (7 data points) next to each health indicator; requires snapshot storage |
| **Metrics: Team enablement score** | Unique to onboarding tools; quantifies "are teams ready to use BigPanda?" | Medium | team_onboarding_status table + onboarding_steps by team | % of teams with all critical onboarding steps complete |
| **Metrics: Validation progress tracker** | Differentiator: shows how many integrations are validated (not just connected) | Low | integrations.status='validated' count | Emphasizes quality over quantity; "X of Y integrations validated" |
| **Metrics: Adoption readiness indicator** | Goes beyond onboarding completion; predicts if customer will adopt post-launch | High | Composite: validation + team enablement + step completion + risk count | Weighted formula combining multiple signals; requires tuning |
| **Weekly Focus: Auto-refresh on data change** | Most dashboards are static snapshots; auto-refresh keeps focus current without manual regeneration | Medium | Skill orchestrator trigger (existing) or on-demand | Trigger: new actions added, risks updated, milestone dates change |
| **Weekly Focus: Smart ranking algorithm** | Simple due-date sort misses severity/impact; AI or weighted heuristic prioritizes intelligently | High | Claude API for ranking or custom scoring formula | Consider: risk severity, milestone proximity, action owner load, blocker status |
| **Time Tracking: Bulk edit from global view** | Unique efficiency: select multiple entries across projects, update status/hours in one action | Medium | Existing bulk action infrastructure (already built) | Extend existing bulk actions to work in global view (not just per-project) |
| **Time Tracking: Calendar heatmap by project** | Visual pattern detection: "I log 0 hours on Fridays for Project X" insights | High | D3.js or Recharts calendar heatmap component | Shows daily hours as color intensity; helps spot inconsistent logging |
| **Time Tracking: Smart project suggestions** | Auto-suggest project based on: recent entries, day of week, current time | Medium | ML model or heuristic (last 10 entries by day/time) | Reduces friction: "You usually log to Project A on Monday mornings" |
| **BullMQ Extraction: Real-time SSE progress stream (hybrid)** | Polling = 2-5s lag; SSE stream = instant progress updates | High | SSE + BullMQ event emitters | Hybrid: SSE for active users, polling fallback for disconnected clients |
| **BullMQ Extraction: Multi-file queue with priority** | Upload 5 docs, extraction runs in parallel or priority order | High | BullMQ concurrency > 1 + job priority field | Allows "extract this first" for critical docs |
| **BullMQ Extraction: Preview mode (extract 1st page only)** | Fast preview for large docs: extract page 1, show sample, then full extraction on confirm | Medium | Claude PDF extraction with page range | Reduces perceived latency; users verify correct doc before 4-min full extraction |
| **Integration Tracker: Split by ADR vs Biggy** | Core v4.0 requirement: separate integration views per workstream | Medium | integrations.track field (ADR vs Biggy) | Two sections or tabs: "ADR Integrations" + "Biggy Integrations" |
| **Integration Tracker: Category grouping** | Existing integrations.category field; group by observability/incident/collaboration | Low | integrations.category field | Collapsible sections: Observability tools, Incident tools, etc. |
| **Workstream Progress: Standardized phase models** | ADR and Biggy use different phase names; standardize for comparison | Medium | workstreams table with normalized phase enum | Define standard phases: Discovery, Implementation, Validation, Production; map existing phase names |
| **Workstream Progress: Side-by-side comparison** | Visual comparison: ADR at 60%, Biggy at 40% reveals delivery imbalance | Low | Two progress bars or cards side-by-side | Quick visual: are workstreams aligned or diverging? |

## Anti-Features

Features to explicitly NOT build. These add complexity without proportional value for v4.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time collaborative editing (Google Docs style)** | Overkill for PS delivery tool; adds WebSocket/OT complexity; not requested | Use optimistic updates + refresh on save; existing pattern works |
| **Custom dashboard builder (drag-drop widgets)** | Premature: no evidence users need customization; adds layout engine complexity | Ship opinionated Overview layout; collect feedback before customization |
| **Time tracking: AI auto-categorization of descriptions** | "Meeting with customer" → auto-tag "Communication" category; sounds useful but low ROI for v4.0 | Manual categorization or use existing description search; defer to v5.0 if requested |
| **Health dashboard: Predictive "project will be red in 2 weeks"** | ML/forecasting requires historical data (don't have enough yet); prone to false alarms | Show current health + trend; let users infer trajectory |
| **Weekly focus: Manual priority override UI** | Adds complexity (drag-drop reordering, save state); auto-ranking is the value prop | If auto-ranking wrong, fix ranking algorithm; don't add manual override escape hatch |
| **Time tracking: Mobile app** | Not requested; web responsive view sufficient for PS team (not field workers) | Ensure responsive web UI works on tablet/phone; defer native app |
| **BullMQ extraction: Pause/resume job** | Adds state complexity (serialize Claude context mid-stream); unclear user benefit | Use cancel + restart; simpler for v4.0 |
| **Metrics: Customizable metric formulas** | "Let users define their own metrics" = premature; no evidence of need | Ship standard metrics; iterate based on feedback |
| **Integration tracker: Automated health checks** | "Ping each integration to verify status" = external dependency complexity | Manual status updates; defer automated checks to v5.0 |
| **Workstream progress: Gantt chart per workstream** | Already have project-level Gantt; per-workstream Gantt = redundant detail | Use phase completion % bars; link to existing Gantt for timeline view |
| **Time tracking: Jira/Asana integration (sync time logs)** | Integration scope creep; not in BRD; adds auth + API maintenance burden | CSV export (already built) sufficient for external tool import |
| **BullMQ extraction: AI confidence threshold tuning** | Exposing extraction.confidence slider = expert feature; confuses non-technical users | Use fixed confidence threshold (0.7); surface low-confidence items in preview, don't expose tuning |

## Feature Dependencies

```
Health Dashboard
  ├─ Overall health indicator → projects.health_status (existing)
  ├─ Risk count → risks.severity (existing)
  ├─ Blocker count → onboarding_steps.status, integrations.status (existing)
  └─ Trend indicators → NEW: health snapshot history table or deltas

Metrics Section
  ├─ Onboarding completion % → onboarding_steps.status (existing)
  ├─ Integration counts → integrations.status (existing)
  ├─ Phase completion by workstream → workstreams.percent_complete + track (existing)
  └─ Time to milestone → milestones.target_date (existing)

Weekly Focus Summary
  ├─ Top priorities → actions, risks, milestones (existing)
  ├─ Auto-refresh → Skill orchestrator trigger (existing) or on-demand
  └─ Circular progress bar → ProgressRing component (existing)

Time Tracking Global View
  ├─ Multi-project query → time_entries.project_id (existing)
  ├─ Project attribution → time_entries → projects JOIN (existing schema)
  ├─ Week grouping → time_entries.date (existing)
  └─ Bulk actions → Existing bulk action API (extend to global scope)

BullMQ Document Extraction
  ├─ Job queue → BullMQ infrastructure (existing)
  ├─ Progress updates → job.progress() API (BullMQ built-in)
  ├─ Polling endpoint → NEW: /api/jobs/:id route
  ├─ Cancel job → job.remove() (BullMQ built-in)
  └─ Artifact status → artifacts.ingestion_status (existing)

Integration Tracker Redesign
  ├─ ADR/Biggy split → integrations.track field (NEW or existing?)
  ├─ Category grouping → integrations.category (existing)
  └─ Status pipeline → integrations.status (existing)

Workstream Progress Separation
  ├─ ADR vs Biggy split → workstreams.track (existing)
  ├─ Standardized phases → NEW: phase enum or mapping table
  └─ Side-by-side view → Two components rendering workstream data
```

## MVP Recommendation

Prioritize for v4.0 (table stakes + high-impact differentiators):

### Phase 1: Health Dashboard & Metrics (table stakes)
1. **Health Dashboard** — Overall health, risk count, blocker count, text trends ("improving/stable/declining")
2. **Metrics Section** — Onboarding %, integration counts, phase completion by workstream, time to milestone
3. **Visual Milestone Timeline** — Move to top of Overview tab

**Why first:** Executive visibility is the primary Overview tab use case. Health + metrics answer "How is the project doing?" at a glance.

### Phase 2: Workstream Separation (v4.0 requirement)
4. **ADR/Biggy workstream progress** — Separate sections with phase models and completion %
5. **Integration tracker split** — ADR integrations vs Biggy integrations with category grouping
6. **Remove Project Completeness indicator** — Per v4.0 requirements (replaced by workstream-specific metrics)

**Why second:** Core v4.0 requirement. Depends on Phase 1 metrics foundation.

### Phase 3: Weekly Focus Summary (differentiator)
7. **Top 3-5 priorities** — Auto-ranked by due date, severity, milestone proximity
8. **Circular progress bar** — Retain existing ProgressRing component
9. **Auto-refresh trigger** — On-demand skill run or scheduled job

**Why third:** High-value differentiator, but requires ranking logic. Build after static metrics proven.

### Phase 4: Time Tracking Global View (table stakes)
10. **Global time tracking page** — Top-level nav section (not per-project tab)
11. **Project attribution column** — Show project name on every entry
12. **Week grouping + project totals** — Group by week, subtotal by project
13. **Quick project filter** — Dropdown: "All Projects" or specific project

**Why fourth:** Standalone feature; no dependencies on Overview tab work.

### Phase 5: BullMQ Extraction (infrastructure fix)
14. **Move extraction to background job** — Replace SSE with BullMQ job
15. **Progress polling endpoint** — GET /api/jobs/:id returns progress %
16. **Completion detection** — Poll until job.returnvalue or job.failedReason
17. **Error handling + retry** — Show "Retry" button on failure

**Why last:** Fixes existing problem (browser refresh kills extraction), but lower user-facing impact than Overview/time tracking UX.

### Defer to v5.0
- Health trend sparklines (needs historical data table)
- Smart time tracking suggestions (ML/heuristic complexity)
- SSE hybrid for BullMQ (polling sufficient for v4.0)
- Multi-file extraction queue (single-file works; no urgency)
- Calendar heatmap (nice-to-have visual)
- Adoption readiness score (needs validation of simpler metrics first)

## Complexity Notes

| Feature | Complexity Drivers | Mitigation |
|---------|-------------------|------------|
| **Health trend indicators** | Requires historical snapshot data; currently no time-series storage for health | Start with text trends ("improving") based on delta from last snapshot; defer sparklines to v5.0 |
| **Weekly focus auto-ranking** | Scoring algorithm: due date proximity + risk severity + milestone weight + blocker status = multi-variable optimization | Use simple heuristic v1: sort by (days until due date) × (severity multiplier); refine based on feedback |
| **BullMQ progress polling** | Client must poll repeatedly; risk of stale UI if poll interval too slow or excessive server load if too fast | Poll every 2s while job active; exponential backoff after 5min; SSE upgrade deferred |
| **Time tracking global view** | Query performance: time_entries table could grow to 10K+ rows; JOIN with projects for every row | Index on (user_id, date), paginate results, filter by date range (default: current month) |
| **Integration tracker split** | Unclear if integrations.track field exists or needs schema change | Check schema; if missing, add integrations.track ('ADR'|'Biggy'|null) with migration |
| **Workstream phase standardization** | ADR uses "Discovery, Implementation, Validation"; Biggy may use different names | Map existing workstreams.phase to standard enum; create mapping table if needed |
| **Auto-refresh for weekly focus** | Risk: refresh during user interaction causes flicker or lost unsaved changes | Use optimistic UI updates; debounce refresh; show "Updated X min ago" timestamp instead of live refresh |

## Table Stakes Behavior Details

### Health Dashboard Expected Behaviors

Based on training data patterns from Jira, Monday.com, Asana, Linear (confidence: **MEDIUM** — training data from 2024-2025, no direct web verification):

1. **Overall health indicator**
   - Single badge: RED (critical issues), YELLOW (at risk), GREEN (on track)
   - Calculated from: open critical risks + blocked items + overdue milestones
   - Click to expand detail breakdown

2. **Risk count by severity**
   - "3 Critical, 5 High, 2 Medium" with color-coded badges
   - Link to Risks tab filtered by severity

3. **Active blocker count**
   - "7 blockers" with RED badge
   - Expandable list: "Integration X blocked", "Step Y blocked" with links

4. **Trend indicators**
   - Text: "↑ Improving" (green), "→ Stable" (gray), "↓ Declining" (red)
   - Based on: risk count delta, completion % delta, blocker count delta from last week/snapshot

### Metrics Section Expected Behaviors

1. **Onboarding completion %**
   - Large number: "68%" with progress bar
   - Breakdown: "34 of 50 steps complete"

2. **Integration counts**
   - Cards or table: "12 not connected, 8 configured, 5 validated, 3 production"
   - Click to filter Integration Tracker by status

3. **Phase completion by workstream**
   - Side-by-side: "ADR: 72%" | "Biggy: 45%"
   - Visual: two progress bars or circular indicators

4. **Time to milestone**
   - "Next milestone in 12 days: Go-Live"
   - RED if overdue, YELLOW if <7 days, GREEN if >7 days

### Time Tracking Global View Expected Behaviors

Based on training data patterns from Harvest, Toggl, Clockify (confidence: **MEDIUM**):

1. **Week-based grouping**
   - Default view: current week (Mon-Sun)
   - Week picker: "< Week of Mar 25 >"
   - Each week shows total hours

2. **Project attribution**
   - Every row shows project name as column or badge
   - Color-coded by project (optional)

3. **Quick project filter**
   - Dropdown: "All Projects" (default) or specific project
   - URL updates: /time-tracking?project=123

4. **Subtotals**
   - Per project: "Project A: 18.5h this week"
   - Per week: "Total: 40h"

### BullMQ Progress Polling Expected Behaviors

Based on training data patterns from BullMQ documentation and common job queue UX (confidence: **HIGH** — BullMQ is well-documented):

1. **Progress updates**
   - Job updates progress: 0% → 25% → 50% → 75% → 100%
   - Client polls GET /api/jobs/:id every 2s
   - Response: `{ id, status: 'active'|'completed'|'failed', progress: 0-100, result?, error? }`

2. **Completion detection**
   - Poll response: `status: 'completed', result: { items: [...], filteredCount: N }`
   - UI transitions: "Extracting... 73%" → "Complete! 42 items found"

3. **Error handling**
   - Poll response: `status: 'failed', error: 'Claude API timeout'`
   - UI shows: "Extraction failed: Claude API timeout. [Retry]"

4. **Cancel job**
   - POST /api/jobs/:id/cancel calls job.remove()
   - Job state → 'cancelled', artifact.ingestion_status → 'cancelled'
   - UI shows: "Extraction cancelled. [Restart]"

## Existing Feature Integration Points

**Already built (no re-implementation needed):**

1. **Circular progress ring** — `ProgressRing` component in `OnboardingDashboard.tsx` (lines 117-151)
2. **BullMQ job infrastructure** — Worker, Queue, scheduler in `worker/index.ts` (v1.0 Phase 4)
3. **Time tracking approval workflow** — `time_entries` table with approval_status, submitted_by fields (v2.0 Phase 23)
4. **Bulk actions for time entries** — `/api/projects/[projectId]/time-entries/bulk/route.ts` (v2.0 Phase 23)
5. **Integration status pipeline** — `integrations.status` with 5-state cycle (v2.0 Phase 21)
6. **Onboarding step tracking** — `onboarding_steps` table with status, updates log (v2.0 Phase 21)
7. **Workstreams table** — `workstreams` with track, phase, percent_complete (v2.0 Phase 17)

**Extend (not rebuild):**

1. **Overview tab** — Existing `app/customer/[id]/overview/page.tsx` — add new sections, remove Project Completeness
2. **Time tracking** — Existing `components/TimeTab.tsx` — create parallel global view component, keep per-project tab
3. **Document extraction** — Existing SSE route `app/api/ingestion/extract/route.ts` — migrate logic to `worker/jobs/document-extraction.ts`

## Open Questions for Phase Planning

1. **Health snapshot storage:** New table `health_snapshots` or JSONB field `projects.health_history`?
2. **Integrations.track field:** Exists in schema? If not, migration adds 'ADR'|'Biggy'|null with default null for existing rows?
3. **Weekly focus refresh trigger:** On-demand (user clicks "Refresh") or scheduled job (runs nightly)?
4. **Time tracking global view navigation:** New top-level link "Time Tracking" or Settings submenu?
5. **BullMQ extraction job naming:** `document-extraction` (new) or extend existing job type?
6. **Workstream phase standardization:** Map in code or add `workstream_phase_mappings` table?

## Sources

**Confidence: LOW-MEDIUM** — Research based on training data (project management tool patterns from 2024-2025) and existing codebase analysis. No web verification performed due to tool access restrictions.

**Training data sources (unverified):**
- Project management tool UX patterns: Jira, Monday.com, Asana, Linear, ClickUp (2024-2025 knowledge)
- Time tracking tool patterns: Harvest, Toggl, Clockify (2024 knowledge)
- BullMQ documentation patterns (well-established, high confidence)
- Onboarding tool patterns: Pendo, Userpilot, WalkMe (2024 knowledge)

**Verified sources (codebase analysis):**
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/app/customer/[id]/overview/page.tsx` — Current Overview tab implementation
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/OnboardingDashboard.tsx` — Existing onboarding phase UI, ProgressRing component
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/components/TimeTab.tsx` — Current per-project time tracking
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/app/api/ingestion/extract/route.ts` — Current SSE-based document extraction
- `/Users/jmiloslavsky/Documents/Project Assistant Code/bigpanda-app/worker/index.ts` — Existing BullMQ worker infrastructure
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/PROJECT.md` — Project requirements and v4.0 scope

**Recommendation:** Validate table stakes assumptions with PS team before Phase 1 implementation. If web research tools available, verify health dashboard and time tracking patterns against current (2026) Jira/Asana/Harvest UX.
