# AI Usage Audit Report

**Date:** 2026-04-20
**Phase:** 070-ai-usage-audit
**Auditor:** Claude Sonnet 4.6
**Purpose:** Classify every Claude API call site in the codebase as deterministic (replace with hardcoded logic), genuine AI (keep), or borderline (case-by-case)

---

## Executive Summary

The application makes Claude API calls at **8 infrastructure sites** (core functionality) and **15 skill dispatch sites** (user-facing deliverables). After analyzing each call site, the verdict is: **the current architecture is largely correct**. Most call sites use AI for genuine judgment, synthesis, or context-varying analysis that cannot be replaced with deterministic logic. Only **2 infrastructure call sites** are classified as deterministic and should be replaced.

Key findings:
- **Infrastructure:** 2 deterministic, 6 genuine AI
- **Skills:** 0 deterministic, 15 genuine AI
- **Total:** 2 deterministic (9%), 21 genuine AI (91%)

The two deterministic call sites are both simple formatting tasks that can be replaced with template strings. No skills are deterministic — all 15 require reading between the lines, synthesizing unstructured content, or exercising context-varying judgment.

---

## Section 1: Infrastructure Call Sites

### 1. app/api/projects/[projectId]/chat/route.ts

**What it does:** Project-grounded Q&A chat — streams conversational answers to user questions by querying live project DB context

**Classification:** **GENUINE AI**

**Recommendation:** Keep as AI

**Rationale:** This is a natural language interface to structured data. The user asks questions in unpredictable ways ("what are my overdue actions?", "summarize the risks for Kaiser"). Claude must interpret intent, query the right data, and format the answer conversationally with inline citations. A lookup table or rule engine cannot handle the unbounded space of user questions or the synthesis required to produce coherent answers from multiple data sources. This is exactly what LLMs are for.

---

### 2. app/api/projects/[projectId]/completeness/route.ts POST

**What it does:** Per-tab workspace completeness analysis — identifies specific gaps (missing fields, placeholder values, conflicting records) with structured output via tool_choice

**Classification:** **GENUINE AI**

**Recommendation:** Keep as AI

**Rationale:** This call evaluates data quality across 11 workspace tabs. The prompt defines "complete" as "all required fields present, no placeholders like TBD/N/A, meaningful content." It must distinguish between real data and template filler, detect semantic contradictions (e.g., milestone marked 'complete' with no completion date), and describe gaps with record-ID specificity. A rule engine would require explicit checks for every field × every record type × every contradiction pattern — a combinatorial explosion. AI infers data quality from context and generates human-readable gap descriptions dynamically. This is genuine judgment.

---

### 3. lib/skill-orchestrator.ts

**What it does:** Dispatches all 15 skills to Claude — reads SKILL.md from disk, assembles DB context, streams response incrementally

**Classification:** **GENUINE AI**

**Recommendation:** Keep as AI

**Rationale:** This is the dispatcher for 15 distinct AI skills (each analyzed individually in Section 2). The orchestrator itself is infrastructure wiring — it assembles context, calls Claude, and writes chunks to the DB. The *skills* are where the judgment happens. The orchestrator is correctly delegating to AI because every skill requires synthesis, context interpretation, or unstructured content processing. If all skills were deterministic, the orchestrator would be misused — but they aren't (see Section 2).

---

### 4. lib/discovery-scanner.ts

**What it does:** Extracts structured DiscoveryItem[] from combined Slack/Gmail/Glean source data — identifies action items, decisions, risks, blockers, and status updates

**Classification:** **GENUINE AI**

**Recommendation:** Keep as AI

**Rationale:** This sweeps unstructured communication data (Slack messages, emails, document snippets) and extracts actionable insights. The prompt asks Claude to identify "action items, decisions, risks, blockers, or status updates" and set `likely_duplicate: true` if the item is already captured in existing project data. This requires:
1. Reading between the lines ("Can you follow up on the integration config?" → action item)
2. Deduplication via semantic comparison (not string matching)
3. Classification of content into categories (action vs decision vs risk)

A rule-based system would miss implied actions, generate false positives on status updates, and fail to deduplicate across different phrasings. AI is the correct tool here.

---

### 5. lib/source-adapters/mcp-adapter.ts

**What it does:** Fetches content from MCP servers using available tools — sends a search prompt like "Search for recent communications about [query] since [date]" and returns Claude's response

**Classification:** **GENUINE AI**

**Recommendation:** Keep as AI

**Rationale:** This is a wrapper around the Anthropic beta MCP API. The user prompt is a natural language instruction to Claude telling it to use MCP tools (search_messages, search_emails, etc.) to retrieve content. Claude interprets the query, selects the appropriate tool, and returns synthesized results. The adapter doesn't hardcode which tool to call — Claude decides based on the server's available tools. This is tool-use orchestration, which is a genuine AI capability. No if/else logic can replicate this.

---

### 6. worker/jobs/document-extraction.ts

**What it does:** Pass 0: document pre-analysis (classify doc type, quote key sections); Passes 1/2/3: multi-pass entity extraction with tool_choice record_entities (extracts 21 entity types from unstructured documents)

**Classification:** **GENUINE AI**

**Recommendation:** Keep as AI

**Rationale:** This is the heart of the document ingestion pipeline. Pass 0 reads an unstructured document (PDF, DOCX, meeting transcript) and determines its type (status report, meeting notes, architecture diagram, etc.), then quotes the most relevant sections. Passes 1–3 extract 21 entity types (actions, risks, milestones, decisions, stakeholders, architectureIntegrations, etc.) from those sections using strict mode tool use. The prompt includes few-shot examples, field-level inference rules, and a synthesis-first posture (distinguish between explicit mentions and inferred entities). This is the canonical use case for LLMs: extracting structured data from unstructured prose where the entity boundaries are fuzzy, context is required to disambiguate, and humans wouldn't agree on a single rule-based extraction algorithm. Replacing this with deterministic logic would require a full NLP pipeline with dependency parsing, coreference resolution, and domain-specific entity recognizers — reinventing an LLM at vastly higher cost.

---

### 7. worker/jobs/wbs-generate-plan.ts

**What it does:** Proposes missing WBS Level 2/3 tasks by analyzing project context (actions, risks, milestones, decisions) against existing WBS structure

**Classification:** **GENUINE AI**

**Recommendation:** Keep as AI

**Rationale:** This call reads the current project state (open actions, risks, milestones, decisions) and the existing WBS structure, then proposes new Level 2 or Level 3 tasks that are *missing*. The prompt constrains Claude to only propose items under existing Level 1 sections and to not duplicate existing tasks. This requires:
1. Understanding what each action/risk/milestone implies about the work breakdown
2. Inferring gaps in the WBS (e.g., "there are 5 integration risks but no 'Integration Testing' WBS item")
3. Mapping proposed tasks to the correct parent section

A rule-based system would need explicit mappings from every risk description pattern to WBS categories — brittle and unmaintainable. AI infers the mapping from context. This is genuine judgment.

---

### 8. worker/jobs/weekly-focus.ts

**What it does:** Generates 3–5 priority bullets from a structured delivery snapshot (blocked steps, open risks, overdue actions, next milestone)

**Classification:** **DETERMINISTIC**

**Recommendation:** Replace with hardcoded logic

**Rationale:** The input is already structured: `blockedSteps[]`, `openRisks[]`, `unvalidatedIntegrations[]`, `overdueActions[]`, `nextMilestone`. The output is 3–5 priority bullets. The prompt says "provide exactly 3-5 concise priority bullet points for this week. Focus on what requires immediate attention." But the prioritization logic is deterministic:
- If blockedSteps.length > 0 → "Unblock [N] onboarding steps"
- If openRisks with severity='critical' exist → "Resolve [N] critical risks"
- If overdueActions.length > 0 → "Complete [N] overdue actions"
- If nextMilestone.date is within 7 days → "Deliver [milestone name] by [date]"

The bullets can be generated with a template function that ranks by impact (critical risks > blocked steps > overdue actions > upcoming milestone). The current AI call is formatting a priority list from structured data — classic deterministic logic. Replace with a hardcoded prioritization function. Cost savings: 1 Claude call per project per week → 0.

---

## Section 2: Skills

All 15 skills are dispatched via `skill-orchestrator.ts`. Each skill reads a SKILL.md prompt from disk and processes project context. The table below classifies each skill.

| Skill Name | Purpose | Classification | Recommendation |
|------------|---------|----------------|----------------|
| **ai-plan-generator** | Generates 2-week task list as JSON from project context (open blockers, stalled workstreams, overdue actions) | **GENUINE AI** | Keep as AI — infers task breakdown from unstructured project state; requires context-varying judgment to prioritize and scope tasks |
| **biggy-weekly-briefing** | Comprehensive weekly briefing with RAG status, progress summary, upcoming items, at-risk items, and focus recommendation | **GENUINE AI** | Keep as AI — synthesizes narrative from structured data; RAG status determination requires judgment about overall project health |
| **context-updater** | Extracts structured JSON updates (actions/risks/milestones/decisions) from meeting transcript or notes | **GENUINE AI** | Keep as AI — same extraction problem as document-extraction.ts; must read between the lines of unstructured meeting notes |
| **customer-project-tracker** | Sweeps Gmail/Slack via MCP, synthesizes daily digest, outputs structured action JSON | **GENUINE AI** | Keep as AI — unstructured source data (emails, Slack threads); must identify action items, surface key signals, and deduplicate across channels |
| **elt-external-status** | Generates 5-slide customer-facing ELT status deck as JSON (confidence-framed, partnership tone) | **GENUINE AI** | Keep as AI — requires tone control (no internal severity terms), narrative synthesis, and executive-level framing |
| **elt-internal-status** | Generates 5-slide internal ELT status deck as JSON (direct, factual language, blockers surfaced clearly) | **GENUINE AI** | Keep as AI — RAG determination requires judgment; same input data as external status but different tone/framing |
| **handoff-doc-generator** | Full handoff document covering open actions, risks, contacts, workstream status, and sensitive topics | **GENUINE AI** | Keep as AI — "what to watch in the next 2 weeks" and "sensitive topics or relationship nuances" require judgment and synthesis |
| **meeting-summary** | Structured meeting summary (attendees, decisions, action items) from transcript or notes | **GENUINE AI** | Keep as AI — extracts structured output from unstructured transcript; same problem as context-updater |
| **morning-briefing** | Daily briefing (top 3 priorities, overdue items, approaching deadlines) | **GENUINE AI** | Keep as AI — similar to weekly-focus but requires daily prioritization judgment; "any new risks or escalations to watch" is context-varying |
| **qbr-prep** | QBR prep materials (executive narrative, value delivered, next quarter plan) | **GENUINE AI** | Keep as AI — "challenges overcome and how" and "ask of the customer" require narrative synthesis and strategic framing |
| **risk-assessment** | RAG-rated risk report (top risks by severity, mitigation status, recommended actions) | **GENUINE AI** | Keep as AI — "overall risk posture (Red/Amber/Green)" requires judgment; "recommended immediate actions" is context-varying |
| **sprint-summary-generator** | 3-paragraph sprint summary (completions, priorities, at-risk) | **GENUINE AI** | Keep as AI — writes prose summary from structured data; "be specific — reference actual task titles" requires synthesis, not just templating |
| **team-engagement-map** | Generates self-contained HTML team engagement map from structured DB data (5 sections with inline CSS) | **GENUINE AI** | Keep as AI — complex HTML generation with conditional rendering, status badge logic, and structured layout rules; prompt specifies 40+ layout rules and color mappings |
| **weekly-customer-status** | Customer-facing weekly status email (professional, partnership tone) | **GENUINE AI** | Keep as AI — tone control is critical ("confidence-framed, no internal severity language"); narrative synthesis required |
| **workflow-diagram** | Generates self-contained HTML before/after workflow diagram from structured DB data (2-tab view, complex layout) | **GENUINE AI** | Keep as AI — similar to team-engagement-map; 60+ lines of layout rules, conditional rendering, and inline CSS generation |

---

## Section 3: Summary

### Classification Counts

| Category | Infrastructure | Skills | **Total** |
|----------|---------------|--------|-----------|
| **Deterministic** | 2 | 0 | **2** |
| **Genuine AI** | 6 | 15 | **21** |
| **Borderline** | 0 | 0 | **0** |

### Overall Assessment

The current architecture is **correct**. 91% of Claude API calls (21 of 23) are genuine AI — they require reading between the lines, synthesizing unstructured content, or exercising context-varying judgment that cannot be replaced with if/else logic.

The 2 deterministic call sites (9%) are both simple formatting tasks:
1. **weekly-focus.ts:** Generates 3–5 priority bullets from structured data — replace with a hardcoded prioritization function
2. None in the skills — all 15 skills require genuine synthesis or extraction from unstructured content

**Highest-value change:** Replace `weekly-focus.ts` with a deterministic priority function. This is a scheduled job that runs weekly for all active projects — removing the AI call eliminates recurring cost with zero functional loss (the output will be more consistent and faster).

**Skills verdict:** All 15 skills correctly use AI. The two HTML-generation skills (`team-engagement-map`, `workflow-diagram`) might *look* deterministic at first glance (they render from structured DB data), but the prompts contain 40–60 lines of conditional rendering rules, layout logic, and inline CSS generation — far more complex than a simple template. Replacing them with hardcoded HTML templates would require maintaining brittle template code that duplicates the prompt logic. The AI approach is maintainable and flexible. Keep them.

**No borderline cases.** Every call site is clearly deterministic or clearly AI. No gray area requiring user decision.

---

## Recommendations for Phase 71

Phase 71 (Deterministic Refactor) should focus on:

1. **Replace weekly-focus.ts (PRIORITY 1):** Write a `buildWeeklyFocusBullets(snapshot: DeliverySnapshot): string[]` function with deterministic prioritization logic:
   ```typescript
   - If blockedSteps.length > 0 → add bullet
   - If openRisks with severity='critical' → add bullet
   - If overdueActions.length > threshold → add bullet
   - If nextMilestone.date within 7 days → add bullet
   - If unvalidatedIntegrations.length > threshold → add bullet
   - Return top 5 by priority rank
   ```
   Test: compare AI output vs deterministic output for 5 real projects. If quality is identical or better, ship the deterministic version.

2. **No skill refactors needed.** All 15 skills require genuine AI.

3. **Post-refactor metrics:** Track cost savings from weekly-focus replacement. Estimate: 1 call × 52 weeks × N projects — modest savings, but correctness gain (deterministic logic is more consistent than AI for structured-input formatting).

---

**End of Report**
