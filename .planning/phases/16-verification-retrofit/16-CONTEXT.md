# Phase 16: Verification Retrofit — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Run gsd-verifier retroactively on 5 phases that were implemented but never formally verified, producing VERIFICATION.md files that close 31 orphaned requirements from the v1.0 milestone audit.

Target phases:
- Phase 01: Data Foundation (DATA-01..08, SET-01/03/04)
- Phase 04: Job Infrastructure (SCHED-01..08)
- Phase 05: Skill Engine (SKILL-02/14, OUT-01..04)
- Phase 05.2: Time Tracking (TIME-01..03)
- Phase 06: MCP Integrations (SKILL-10, DASH-04/05)

This is a documentation/audit pass — not a remediation pass. Code is the ground truth.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation decisions deferred to Claude — user had no preferences. Key decisions for planner:

- **Gap response policy**: If verifier finds a requirement unmet, record it in VERIFICATION.md with `status: gaps_found` or flag individual items as `human_needed`. Do NOT create inline remediation tasks within Phase 16 plans — gaps become input for a future gap-closure phase.
- **Acceptable end states**: `passed` or `human_needed` are both acceptable per roadmap. `gaps_found` is also acceptable — the goal is to produce the document, not force a PASSED verdict.
- **Verification target**: Each verifier run should scan the live codebase (actual source files) plus the phase's PLAN.md, SUMMARY.md, and VALIDATION.md files — code is the authoritative source for whether requirements were met.
- **Plan granularity**: 1 plan per target phase (5 plans total) as prescribed in the roadmap. No splitting needed — even Phase 01's 12 requirements are a single verification pass.
- **Parallelization**: All 5 plans can execute in Wave 1 in parallel — they touch different phase directories with no cross-dependencies.

</decisions>

<specifics>
## Specific Ideas

- No specific requirements — open to standard gsd-verifier invocation patterns
- Each plan should pass the full requirement ID list for its phase to gsd-verifier so coverage is explicit

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Each target phase has: PLAN.md files, SUMMARY.md files, VALIDATION.md — all readable by gsd-verifier
- No VERIFICATION.md exists in any of the 5 target phase directories (confirmed)

### Established Patterns
- gsd-verifier is the standard verification agent — plans should spawn it with phase directory + requirement IDs
- Verification output format: VERIFICATION.md with frontmatter status and per-requirement results

### Integration Points
- Output files land in target phase directories: `.planning/phases/01-data-foundation/01-VERIFICATION.md`, etc.
- No source code changes — read-only codebase scan

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-verification-retrofit*
*Context gathered: 2026-03-25*
