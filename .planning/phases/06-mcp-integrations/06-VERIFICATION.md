---
phase: 06-mcp-integrations
verified: 2026-03-26T02:13:20Z
status: human_needed
score: 3/3 automated must-haves verified
re_verification: false
human_verification:
  - test: "Run customer-project-tracker skill manually via the Skills tab UI for an active project and confirm the run completes without error"
    expected: "Skill run record appears in skill runs history; structured report is saved to Output Library"
    why_human: "Requires live BullMQ worker + Redis + DB; cannot be verified with static code analysis"
  - test: "Visit the Dashboard (/) and confirm the Risk Heat Map renders a 2D grid table with severity columns and status rows"
    expected: "data-testid='risk-heat-map' element visible with at least one populated cell when risks exist"
    why_human: "Component is client-rendered; automated screenshot required to confirm visual rendering"
  - test: "Visit the Dashboard (/) and confirm the Watch List renders high/critical open risks across all active projects"
    expected: "data-testid='watch-list' element visible; each row shows project name, description, severity badge, status, and last-updated date"
    why_human: "Client-rendered table requires live DB data to populate; DB seed needed for non-empty state"
  - test: "Confirm MCP servers (Gmail, Slack, Glean) can be configured in Settings and that customer-project-tracker picks them up via MCPClientPool at job run time"
    expected: "settings.json mcp_servers array contains at least one enabled server with name matching 'gmail', 'slack', or 'glean'; job log shows MCP server list passed to orchestrator"
    why_human: "Requires live MCP server credentials and runtime log inspection"
---

# Phase 06 — MCP Integrations Verification

## Goal Achievement — Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SKILL-10 job handler exists and imports MCPClientPool | VERIFIED | `bigpanda-app/worker/jobs/customer-project-tracker.ts` imports `MCPClientPool` from `../../lib/mcp-config` and calls `MCPClientPool.getInstance().getServersForSkill('customer-project-tracker')` at job runtime |
| 2 | SKILL-10 is registered in the BullMQ worker and scheduled | VERIFIED | `worker/index.ts` line 44 registers `'customer-project-tracker': customerProjectTrackerJob`; `worker/scheduler.ts` lines 42-52 enqueues it daily at `0 9 * * *` |
| 3 | SKILL-10 SKILL.md prompt file exists | VERIFIED | `bigpanda-app/skills/customer-project-tracker.md` exists; defines Gmail/Slack/Glean sweep instructions, structured report format, and JSON action extraction fence |
| 4 | DASH-04 Risk Heat Map API exists | VERIFIED | `bigpanda-app/app/api/dashboard/risks-heatmap/route.ts` returns `{ heatmap: [{ severity, status, count }] }` — groups active-project risks by severity × status, excludes resolved |
| 5 | DASH-04 RiskHeatMap UI component exists and is rendered on Dashboard | VERIFIED | `bigpanda-app/components/RiskHeatMap.tsx` renders 2D color-coded grid; `app/page.tsx` imports and renders `<RiskHeatMap />` at lines 7 and 37 |
| 6 | DASH-05 Watch List API exists | VERIFIED | `bigpanda-app/app/api/dashboard/watch-list/route.ts` returns `{ items: [...] }` — high/critical severity, non-resolved risks across all active projects, ordered by created_at DESC, limit 20 |
| 7 | DASH-05 WatchList UI component exists and is rendered on Dashboard | VERIFIED | `bigpanda-app/components/WatchList.tsx` renders compact table with project chip, severity badge, status, and last-updated; `app/page.tsx` imports and renders `<WatchList />` at lines 8 and 43 |
| 8 | MCPClientPool exists and maps customer-project-tracker to MCP servers | VERIFIED | `bigpanda-app/lib/mcp-config.ts` — `SKILL_MCP_MAP` maps `'customer-project-tracker'` to `['gmail', 'slack', 'glean']`; `getServersForSkill()` reads live settings and filters by enabled flag |

### Required Artifacts

| Expected File | Status | Details |
|---------------|--------|---------|
| `bigpanda-app/worker/jobs/customer-project-tracker.ts` | FOUND | Full BullMQ job handler; iterates active projects; calls MCPClientPool; calls SkillOrchestrator; extracts actions from JSON fence; writes to DB |
| `bigpanda-app/lib/mcp-config.ts` | FOUND | MCPClientPool singleton; `getServersForSkill()` reads settings at call time; maps 4 skills to server name lists |
| `bigpanda-app/skills/customer-project-tracker.md` | FOUND | SKILL.md prompt file; defines sweep instructions, report structure, JSON action fence, and PA3 action tracker update instructions |
| `bigpanda-app/app/api/dashboard/risks-heatmap/route.ts` | FOUND | GET handler; Drizzle join on risks × projects; groups by severity × status; active-project filter |
| `bigpanda-app/components/RiskHeatMap.tsx` | FOUND | Client component; fetches `/api/dashboard/risks-heatmap`; renders severity × status 2D grid with color-coded intensity by count |
| `bigpanda-app/app/api/dashboard/watch-list/route.ts` | FOUND | GET handler; returns high/critical non-resolved risks across active projects; includes project_name and customer columns |
| `bigpanda-app/components/WatchList.tsx` | FOUND | Client component; fetches `/api/dashboard/watch-list`; renders compact table with SeverityBadge and ProjectChip |
| `tests/e2e/phase6.spec.ts` | NOT FOUND | Wave 0 E2E stub tests (DASH-04, DASH-05, SKILL-10) were planned in VALIDATION.md but not found in codebase — Phase 06 was completed without this file |

### Key Link Verification

| From | To | Via | Status | Notes |
|------|----|-----|--------|-------|
| `worker/scheduler.ts` | BullMQ queue `'customer-project-tracker'` | `new Queue(name, { connection })` + `upsertJobScheduler()` | VERIFIED | Scheduler registers daily cron at `0 9 * * *` |
| `worker/index.ts` | `customerProjectTrackerJob` handler | `JOB_HANDLERS` map key `'customer-project-tracker'` | VERIFIED | Worker dispatches queue jobs to the registered handler |
| `customerProjectTrackerJob` | `MCPClientPool.getInstance().getServersForSkill()` | Direct import from `../../lib/mcp-config` | VERIFIED | MCP server list resolved at runtime from live settings |
| `app/page.tsx` | `RiskHeatMap` component | `import { RiskHeatMap } from '../components/RiskHeatMap'` | VERIFIED | Main Dashboard (`/`) page renders the heat map |
| `app/page.tsx` | `WatchList` component | `import { WatchList } from '../components/WatchList'` | VERIFIED | Main Dashboard (`/`) page renders the watch list |
| `app/api/skills/[skillName]/run/route.ts` | BullMQ job enqueue | Generic skill run route; works for any registered skill including `customer-project-tracker` | VERIFIED | Route enqueues `skill-run` job which worker dispatches to job-specific handler |

### Requirements Coverage

| Req ID | Source Plan | Description | Status | Evidence |
|--------|------------|-------------|--------|----------|
| SKILL-10 | 06-PLAN.md | Customer Project Tracker — runs for one account or all active; sweeps Gmail/Slack/Glean via MCP for last 7 days; updates actions table; shows structured report | SATISFIED | Job handler: `worker/jobs/customer-project-tracker.ts` — sweeps via MCPClientPool, calls SkillOrchestrator with `skillsDir`, writes actions to DB, saves output to Output Library. SKILL.md at `skills/customer-project-tracker.md` defines sweep and report structure. Scheduled daily (0 9 * * *) and triggerable via generic `/api/skills/[skillName]/run` route. MCP wiring confirmed in `lib/mcp-config.ts` with `SKILL_MCP_MAP`. |
| DASH-04 | 06-PLAN.md | Cross-project Risk Heat Map — probability × impact matrix across all active accounts, visible on Dashboard | SATISFIED (indirect) | Implementation uses severity × status grid (not probability × impact). Requirement says "probability × impact matrix" but code implements a severity × status heat map — semantically adjacent but architecturally different. Visual grid IS a 2D heat map; risk severity maps to column headers (low/medium/high/critical); risk status maps to rows. Both API (`/api/dashboard/risks-heatmap`) and component (`RiskHeatMap.tsx`) are present and wired to Dashboard. Human verification needed to confirm visual rendering. |
| DASH-05 | 06-PLAN.md | Cross-Account Watch List — escalated or time-sensitive items spanning multiple customers, visible on Dashboard | SATISFIED | API at `/api/dashboard/watch-list` returns high/critical non-resolved risks across all active projects. `WatchList.tsx` renders compact table with project chip (customer context), severity badge, status, and last-updated. Both are wired to Dashboard (`app/page.tsx`). Time-sensitivity is approximated via `severity IN ('high','critical')` filter. |

### Anti-Patterns Found

| Pattern | Location | Severity | Notes |
|---------|----------|----------|-------|
| SKILL.md hardcodes `SKILLS_DIR` with `__dirname` | `worker/jobs/customer-project-tracker.ts` line 17 | LOW | `const SKILLS_DIR = path.join(__dirname, '../../skills')` — does not use `resolveSkillsDir()` from settings. Other job handlers were migrated to settings-driven resolution in Phase 15 (Plan 15-01). This handler was missed in that migration. Non-blocking: `__dirname` resolves correctly at runtime but skips the user-configurable override. |
| Wave 0 E2E tests were never written | `tests/e2e/phase6.spec.ts` | LOW | VALIDATION.md planned Playwright stubs for DASH-04, DASH-05, SKILL-10. These were never created. Phase 06 shipped without any E2E test coverage. |
| DASH-04 semantic deviation: severity × status vs probability × impact | `components/RiskHeatMap.tsx` | LOW | Requirement specifies "probability × impact matrix" (standard risk matrix terminology). Implementation uses severity × status. This may reflect a deliberate schema-driven simplification (risks table has severity/status columns, not probability/impact columns). Not a code bug — but may not match stakeholder expectations. |

### TypeScript Compilation

Pre-existing errors (not introduced by Phase 06):

| Error | File | Type |
|-------|------|------|
| `Type 'Redis' is not assignable to type 'ConnectionOptions'` | `app/api/jobs/trigger/route.ts` | ioredis/bullmq version mismatch — pre-existing |
| `Type 'Redis' is not assignable to type 'ConnectionOptions'` | `app/api/skills/[skillName]/run/route.ts` | ioredis/bullmq version mismatch — pre-existing |
| `Type 'Redis' is not assignable to type 'ConnectionOptions'` | `worker/index.ts` | ioredis/bullmq version mismatch — pre-existing |

These errors stem from two bundled ioredis versions (top-level `ioredis` vs `bullmq/node_modules/ioredis`). They affect multiple phases and were not introduced by Phase 06. The app builds and runs correctly at runtime despite these type errors (structural compatibility).

New errors introduced by Phase 06: None detected.

### Human Verification Required

1. **SKILL-10 runtime verification** — Trigger `customer-project-tracker` for one active project via Settings > Skills tab. Confirm: run appears in history, skill output is saved to Output Library, any extracted actions appear in the actions table. Requires live Redis + worker + DB.

2. **DASH-04 visual rendering** — Visit Dashboard `/`. Confirm `data-testid="risk-heat-map"` element renders the 2D grid with severity columns (low/medium/high/critical). With an empty DB, the "No open risks" empty state is acceptable.

3. **DASH-05 visual rendering** — Visit Dashboard `/`. Confirm `data-testid="watch-list"` element renders. With an empty DB, the "No escalated risks" empty state is acceptable. With real data, confirm rows show project name chip, severity badge, and status.

4. **MCP server connection** — Confirm at least one MCP server (Gmail or Glean) is configured in `settings.json` and that the `customer-project-tracker` job picks it up at run time (check job log for `mcpServers` list).

### Gaps Summary

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| `customer-project-tracker.ts` uses hardcoded `SKILLS_DIR` via `__dirname` instead of `resolveSkillsDir()` | LOW — runtime works but bypasses user-configurable path | Include in next maintenance pass alongside the Phase 15-01 resolver migration |
| Wave 0 E2E tests (`tests/e2e/phase6.spec.ts`) never created | LOW — functional code exists; test coverage is missing | Create Playwright stubs for DASH-04, DASH-05, SKILL-10 in a future test coverage phase |
| DASH-04 uses severity × status grid, not probability × impact matrix | LOW — depends on requirements interpretation | Verify with stakeholder whether severity-based heat map meets DASH-04 intent; if not, a future plan should add probability/impact columns to the risks table |
