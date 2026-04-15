# Skills Design Standard

This document defines the standard structure and conventions for all skills displayed in the Skills tab that generate reports, emails, or summaries for the BigPanda Project Assistant application.

## 1. Scope

**In Scope:** All skills displayed in the Skills tab that generate user-facing outputs such as:
- Meeting summaries
- Status reports
- Weekly briefings
- Risk assessments
- Documentation exports (handoff docs, workflow diagrams)
- Project tracking reports

**Out of Scope:** Backend processing skills that write directly to the database without generating user-facing reports, such as:
- `ai-plan-generator.md` — AI planning engine that writes plans to DB
- `wbs-generate-plan.md` — WBS generator that writes deliverables to DB
- Other system-level processing skills that don't produce direct outputs for users

## 2. Required YAML Front-Matter Fields

All in-scope skill files MUST include a YAML front-matter block with the following fields:

### `label`
- **Type:** string
- **Purpose:** Human-readable skill name displayed in the Skills tab UI
- **Valid Values:** Any descriptive string (e.g., "Meeting Summary", "Weekly Customer Status")
- **Example:** `label: Meeting Summary`

### `description`
- **Type:** string
- **Purpose:** One-line description shown under the skill card in the UI
- **Valid Values:** Concise sentence describing what the skill does
- **Example:** `description: Generate a meeting summary from notes or transcript`

### `input_required`
- **Type:** boolean
- **Purpose:** Indicates whether the user must provide text input before running the skill
- **Valid Values:** `true` or `false`
- **Example:** `input_required: true`
- **Notes:** Skills like "Meeting Summary" require transcript input (`true`). Skills like "Morning Briefing" run purely from project context (`false`).

### `input_label`
- **Type:** string
- **Purpose:** Label displayed on the input field when `input_required: true`
- **Valid Values:** Any descriptive string (e.g., "Transcript", "Meeting Notes")
- **Special Case:** Use empty string `""` when `input_required: false` (input label is not meaningful if no input is required)
- **Example:** `input_label: Transcript`

### `schedulable`
- **Type:** boolean
- **Purpose:** Whether this skill can be triggered on a recurring schedule
- **Valid Values:** `true` or `false`
- **Example:** `schedulable: true`
- **Notes:** Used by Phase 65 Project-Scoped Scheduling. Skills like "Weekly Customer Status" and "Morning Briefing" are schedulable. Skills requiring user input are typically not schedulable.

### `error_behavior`
- **Type:** string (enum)
- **Purpose:** Defines how the skill orchestrator handles execution failures
- **Valid Values:** `"retry"` or `"fail"`
- **Example:** `error_behavior: retry`
- **Semantics:**
  - `"retry"` — Attempt execution once more on failure, then mark as failed
  - `"fail"` — Fail immediately on first error without retry

## 3. Example Front-Matter Blocks

### Example 1: Skill Requiring User Input

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

### Example 2: Skill Running from Context Only

```yaml
---
label: Morning Briefing
description: Daily briefing with priorities, overdue items, and approaching deadlines
input_required: false
input_label: ""
schedulable: true
error_behavior: retry
---
```

## 4. Front-Matter Placement

- YAML front-matter block MUST appear at the very top of the file
- The opening `---` MUST be the first line (no blank lines before it)
- The closing `---` marks the end of the front-matter block
- The prompt body begins immediately after the closing `---`

**Valid:**
```markdown
---
label: My Skill
description: Does something useful
input_required: false
input_label: ""
schedulable: false
error_behavior: retry
---

# Prompt Body Starts Here
...
```

**Invalid:**
```markdown

---
label: My Skill
...
```
(Blank line before opening `---`)

## 5. Prompt Body Conventions

The prompt body defines the instructions for the skill's LLM execution. Follow these conventions:

### Tone and Perspective
- Use second-person ("You are...") or role framing ("You are an expert PS consultant...")
- Be clear and directive

### Output Format
- Explicitly specify output format: JSON, HTML, markdown, or plaintext
- If JSON output is required, include the exact schema with field names and types
- If HTML output is required, specify inline CSS rules (no external stylesheets)

### Context Injection
- Do NOT repeat project context instructions in the prompt body
- The SkillOrchestrator automatically injects project context before execution
- Focus the prompt on the transformation logic, not data retrieval

### Example Prompt Body (Markdown Output)
```markdown
You are an expert PS consultant writing a daily briefing.
Given the project context, generate a concise morning briefing covering:
- Top 3 priorities for today
- Overdue items needing immediate attention
- Approaching deadlines (next 7 days)

Be brief and actionable. This is a daily driver, not a full report.
```

### Example Prompt Body (JSON Output)
```markdown
You are an expert PS consultant updating project context.
Extract updates from the meeting notes and return a JSON object:

{
  "actions": [{"description": "string", "owner": "string", "due_date": "YYYY-MM-DD"}],
  "risks": [{"title": "string", "severity": "high|medium|low"}],
  "milestones": [{"name": "string", "new_target_date": "YYYY-MM-DD"}]
}

Return ONLY valid JSON. No prose before or after. No markdown fences.
```

## 6. Error and Fallback Behavior

### Retry Semantics (`error_behavior: retry`)
- On first failure, the skill orchestrator waits 2 seconds and retries execution once
- If the retry succeeds, the skill run is marked as successful
- If the retry fails, the skill run is marked as failed
- **Use Case:** Network-sensitive operations, LLM response timeouts, transient API errors

### Fail Semantics (`error_behavior: fail`)
- On first failure, the skill run is immediately marked as failed
- No retry attempt is made
- **Use Case:** Deterministic skills where a retry is unlikely to succeed (e.g., missing required data, invalid input format)

### Guideline for Choosing Error Behavior
- **Use `retry`** for skills that:
  - Call external APIs (OpenAI, MCP tools)
  - Are sensitive to transient network issues
  - Generate non-deterministic outputs (LLM-based synthesis)
- **Use `fail`** for skills that:
  - Perform deterministic transformations
  - Depend on data that won't change on retry
  - Would produce the same error on retry

## 7. Validation

### Skills Tab Validation
- The Skills tab page validates front-matter on every load
- Skills with missing or invalid front-matter display a "Fix required" badge next to the skill card
- Validation checks:
  - Front-matter block exists
  - All required fields are present
  - `input_required` and `schedulable` are boolean values
  - `error_behavior` is either `"retry"` or `"fail"`

### Runtime Behavior
- Invalid skills can still be run manually — the badge is informational for developers
- The skill orchestrator uses default values if front-matter is invalid:
  - `input_required: false`
  - `schedulable: false`
  - `error_behavior: "fail"`

### Developer Workflow
- When creating or editing a skill, verify front-matter syntax by loading the Skills tab
- If the "Fix required" badge appears, check for:
  - Missing opening or closing `---`
  - Missing required fields
  - Incorrect field types (e.g., `"true"` instead of `true`)
  - Typos in field names

---

**Document Version:** 1.0
**Last Updated:** 2026-04-15
**Governed Scope:** All Skills tab documentation skills (not backend processing skills)
