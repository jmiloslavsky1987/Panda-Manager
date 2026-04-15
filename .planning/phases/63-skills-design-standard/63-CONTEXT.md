# Phase 63: Skills Design Standard - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Define and document a Skills Design Standard for all Skills tab documentation skills (those that generate reports, emails, and summaries for PS delivery). Apply the standard by migrating all existing skill `.md` files to include YAML front-matter. Add runtime validation that surfaces "Fix required" badges in the Skills tab for non-compliant skills. Wire previously non-functional ("coming soon") skills with both SKILL.md files and BullMQ handlers. Remove two skills from the catalog entirely.

Scope: Skills tab documentation skills only — NOT ai-plan-generator, context-updater, or other backend processing skills that write to the database.

</domain>

<decisions>
## Implementation Decisions

### YAML front-matter schema
All Skills tab skill files require the following YAML front-matter block at the top of the `.md` file (before the prompt body):

Required fields:
- `label` — Human-readable skill name (replaces ALL_SKILLS hardcode)
- `description` — One-line description of what the skill does (replaces ALL_SKILLS hardcode)
- `input_required: boolean` — Whether the skill requires user-provided text input before running
- `input_label: string` — What to call the input field in the UI (only meaningful if input_required: true; e.g. "Transcript")
- `schedulable: boolean` — Whether the skill can be triggered on a schedule (used by Phase 65)
- `error_behavior: retry | fail` — How the skill handles failures (retry once then fail, or fail immediately)

Example front-matter block:
```yaml
---
label: Meeting Summary
description: Generate a meeting summary from notes or transcript
input_required: true
input_label: Transcript
schedulable: false
error_behavior: retry
---
```

### Skills tab metadata source
- The `ALL_SKILLS`, `WIRED_SKILLS`, and `INPUT_REQUIRED_SKILLS` hardcodes in `SkillsTabClient.tsx` are **replaced** by reading front-matter from `.md` files
- Skills tab server component reads each `.md` file in the skills directory, parses front-matter, and passes structured skill data to the client component
- Skills without valid front-matter show a "Fix required" badge

### Validation behavior
- Compliance check runs on Skills tab page load (server component)
- "Fix required" badge is **informational only** — non-compliant skills can still be run
- Validation checks: front-matter exists, all required fields present, values are valid (e.g. error_behavior is "retry" or "fail")

### Standard document
- Location: `bigpanda-app/skills/SKILLS-DESIGN-STANDARD.md`
- Lives next to the skill files it governs
- Covers: required fields, valid values, example front-matter, prompt body conventions, error/fallback behavior rationale

### SKILL-02 — Skills to make functional (SKILL.md + BullMQ handler)
These skills exist in `ALL_SKILLS` but are currently non-functional ("coming soon"):
- `elt-external-status` — .md file exists, needs BullMQ handler
- `elt-internal-status` — .md file exists, needs BullMQ handler
- `team-engagement-map` — .md file exists, needs BullMQ handler (Phase 7 work)
- `workflow-diagram` — .md file exists, needs BullMQ handler (Phase 7 work)
- `biggy-weekly-briefing` — needs both SKILL.md and BullMQ handler
- `customer-project-tracker` — needs BullMQ handler wired (MCP-dependent)
- `risk-assessment` — needs SKILL.md and BullMQ handler (new)
- `qbr-prep` — needs SKILL.md and BullMQ handler (new)

Already wired skills needing only front-matter migration:
- `weekly-customer-status`, `meeting-summary`, `morning-briefing`, `context-updater`, `handoff-doc-generator`

### Skills catalog cleanup
- `stakeholder-comms` — **removed** from ALL_SKILLS / Skills tab entirely
- `onboarding-checklist` — **removed** from ALL_SKILLS / Skills tab entirely

### End-user behavior (unchanged)
- Skills that use project data automatically (no user input needed): weekly-customer-status, morning-briefing, handoff-doc-generator, elt-*, risk-assessment, qbr-prep, biggy-weekly-briefing, customer-project-tracker
- Skills requiring user-provided transcript: meeting-summary, context-updater
- Phase 63 does not change the UX flow for running skills — it fixes what's broken and standardizes the file format

### Claude's Discretion
- Exact prompt content for new skills (risk-assessment, qbr-prep, biggy-weekly-briefing)
- Whether customer-project-tracker wiring includes a graceful no-MCP fallback
- Visual weight/style of the "Fix required" badge in the Skills tab UI

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SkillsTabClient.tsx`: Hardcoded `ALL_SKILLS`, `WIRED_SKILLS`, `INPUT_REQUIRED_SKILLS` arrays — these are replaced by front-matter-driven data. Client component keeps its rendering logic, input changes are in how skill data is passed to it.
- `app/customer/[id]/skills/page.tsx`: Server component — this is where the new front-matter parsing and compliance check runs before passing data to `SkillsTabClient`
- `bigpanda-app/app/api/skills/[skillName]/run/route.ts`: Already does a pre-flight `.md` existence check (returns 422 if missing) — extend for front-matter schema validation if desired as a secondary check
- `SkillOrchestrator.run()` in `lib/skill-orchestrator.ts`: Reads `.md` file and uses full content as system prompt — needs to strip YAML front-matter before using as system prompt (otherwise front-matter leaks into Claude's system message)
- Existing BullMQ job handlers (e.g. `worker/jobs/meeting-summary.ts`, `worker/jobs/weekly-customer-status.ts`) — pattern to follow for new skill handlers

### Established Patterns
- BullMQ job handler pattern: `worker/jobs/{skill-name}.ts` — imports `SkillOrchestrator`, wraps in try/catch, writes to `outputs` table on completion
- Badge pattern: `bg-red-100 text-red-800` for destructive/error states — "Fix required" badge follows same convention as existing status badges
- Server component data fetching: `skills/page.tsx` already does server-side `getSkillRuns()` before rendering — extend to also parse front-matter compliance per skill

### Integration Points
- `SkillOrchestrator.run()`: Must strip `---\n...\n---\n` front-matter block before passing file content as `systemPrompt` — front-matter should NOT be sent to Claude
- `worker/index.ts` `JOB_HANDLERS` map: Add new skill handler entries for each newly wired skill
- `SkillsTabClient.tsx`: Replace `ALL_SKILLS`, `WIRED_SKILLS`, `INPUT_REQUIRED_SKILLS` constants with props passed from server component

</code_context>

<specifics>
## Specific Ideas

- Phase 63 is the foundation for Phase 64 (Editable Prompts UI) — clean front-matter structure is what makes prompts safely editable without breaking app metadata
- "Fix required" is a developer/admin signal, not an end-user concern — by end of phase all skills will be compliant
- The SKILLS-DESIGN-STANDARD.md document lives in `skills/` so it's the first thing a developer sees when editing skill files

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 63-skills-design-standard*
*Context gathered: 2026-04-15*
