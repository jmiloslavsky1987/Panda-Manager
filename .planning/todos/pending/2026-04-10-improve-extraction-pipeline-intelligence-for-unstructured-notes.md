---
created: 2026-04-10T23:08:37.767Z
title: Improve extraction pipeline intelligence for unstructured notes
area: api
files:
  - bigpanda-app/worker/jobs/document-extraction.ts
---

## Problem

The extraction pipeline prompts are too literal — they look for explicit section headers and named sections rather than inferring structure from unstructured content. Real-world input is operational review transcripts and meeting notes where information is scattered and implicit.

Specific gaps surfaced during Phase 56 UAT:

- **`before_state`** — prompts look for sections titled "Current State" or "Before BigPanda". In practice, this context comes from operational reviews and is embedded in pain-point language ("we used to...", "before we had...", "currently struggling with...").
- **`e2e_workflow`** — assembled piecemeal from mentions across a document, not described in one place.
- **`weekly_focus`** — should be AI-*synthesized* from the document's action items, risks, and overall status picture. There will never be a "This Week's Focus" section to extract; Claude should generate it based on what it has.
- **All 21 entity types generally** — extraction should use inference and synthesis, not just pattern-matching on section headers.

Primary input type: operational review meeting notes, status updates, and call transcripts — all unstructured, no labeled sections.

## Solution

Rewrite extraction prompts in `document-extraction.ts` to be synthesis-first:

1. **`before_state`**: Instruct Claude to infer from comparative language, problem statements, "before/after" framing, and pain-point descriptions anywhere in the document.
2. **`e2e_workflow`**: Assemble from scattered workflow mentions — if a team's journey through the platform can be pieced together from multiple mentions, synthesize it.
3. **`weekly_focus`**: Generate (not extract) — derive the 3-5 most important focus items from the document's open action items, unresolved risks, and upcoming milestones. This is a synthesis task, not extraction.
4. **General approach**: For all 21 types, shift prompts from "look for a section called X" to "infer X from any relevant content in the document, using your understanding of BigPanda's domain".

Consider adding a post-extraction synthesis pass (Pass 4) specifically for generated/synthesized entities like `weekly_focus`.
