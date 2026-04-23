---
phase: 78-ai-content
plan: "02"
subsystem: ui
tags: [react-markdown, docx-preview, rehype-sanitize, jszip, next-dynamic, output-library, xss]

# Dependency graph
requires:
  - phase: 78-ai-content/78-01
    provides: "Meeting Prep skill, SkillRunPage ReactMarkdown hardening"

provides:
  - "lib/output-utils.ts: OutputRow interface + getOutputType() discriminator (html/markdown/docx/pptx/file)"
  - "DocxPreview component with SSR-safe dynamic import of docx-preview renderAsync"
  - "PPTX slide count API route (auth-guarded GET /api/outputs/[id]/slide-count)"
  - "Outputs Library inline previews: markdown (ReactMarkdown + rehype-sanitize), DOCX (docx-preview), PPTX (badge + download)"
  - "ChatMessage.tsx XSS-hardened with rehype-sanitize"

affects: [future-output-display, chat-security, content-preview]

# Tech tracking
tech-stack:
  added: [docx-preview]
  patterns:
    - "getOutputType() discriminator pattern — output type determination in pure utility module (no use client)"
    - "Dynamic import inside useEffect for SSR-unsafe libraries (docx-preview renderAsync)"
    - "Type-aware expand panels — switch on output type in JSX IIFE"
    - "Lazy slide count fetch — useEffect fires per PPTX output after outputs load"

key-files:
  created:
    - lib/output-utils.ts
    - components/DocxPreview.tsx
    - app/api/outputs/[id]/slide-count/route.ts
    - app/api/__tests__/output-type-discriminator.test.ts
    - app/api/__tests__/slide-count.test.ts
  modified:
    - app/outputs/page.tsx
    - components/chat/ChatMessage.tsx

key-decisions:
  - "docx-preview loaded via dynamic import inside useEffect only (never at module level) — prevents SSR ReferenceError per locked CONTEXT.md decision"
  - "PPTX outputs show slide count badge + Download link only; no inline render (per locked CONTEXT.md decision)"
  - "getOutputType extracted to lib/output-utils.ts (no use client) — isolates pure logic from Client Component for Vitest safety"
  - "Slide count fetch is non-blocking — errors silently swallowed; badge only appears when count is known"
  - "rehype-sanitize applied to all ReactMarkdown instances in Phase 78 (closes confirmed XSS gap from STATE.md security flags)"

patterns-established:
  - "Pure utility modules in lib/ have no use client — safe for server and Vitest import"
  - "SSR-unsafe browser library imports must use dynamic import() inside useEffect with cancelled cleanup guard"

requirements-completed: [OUT-01, OUT-02]

# Metrics
duration: 7min
completed: 2026-04-23
---

# Phase 78 Plan 02: Outputs Library Inline Previews + XSS Hardening Summary

**Outputs Library extended with type-aware inline previews (markdown via ReactMarkdown, DOCX via docx-preview, PPTX slide count badge) and ChatMessage.tsx XSS-hardened with rehype-sanitize**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-23T16:25:11Z
- **Completed:** 2026-04-23T16:32:09Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- Extracted `OutputRow` interface and `getOutputType()` discriminator to `lib/output-utils.ts` (no `use client`) — testable in Vitest without Next.js environment
- Added DOCX preview via `DocxPreview.tsx` (dynamic import of `docx-preview renderAsync` inside `useEffect` — SSR-safe), markdown preview via `ReactMarkdown + rehype-sanitize`, PPTX slide count badge + Download via new `slide-count` API route
- Applied `rehype-sanitize` to `ChatMessage.tsx` ReactMarkdown, closing the confirmed XSS gap documented in STATE.md security flags
- 9 new Vitest tests passing: 6 discriminator, 2 slide count, 1 XSS sanitize

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract output-utils + install packages + create DocxPreview + slide-count API route** - `c00ebea3` (feat)
2. **Task 2: Extend Outputs Library page with type discriminator + preview branches + ChatMessage XSS hardening** - `877a1141` (feat)

**Plan metadata:** (see state commit below)

_Note: Task 1 followed TDD pattern (RED → GREEN). slide-count.test.ts tests were self-contained (in-memory JSZip), so they passed immediately in RED phase — the algorithm was tested directly, not via the route._

## Files Created/Modified

- `lib/output-utils.ts` - OutputRow interface + getOutputType() discriminator, no use client
- `components/DocxPreview.tsx` - Client component with dynamic docx-preview import inside useEffect, cancelled cleanup guard
- `app/api/outputs/[id]/slide-count/route.ts` - Auth-guarded GET returning { slideCount } from PPTX ZIP file
- `app/api/__tests__/output-type-discriminator.test.ts` - 6 discriminator tests + 1 XSS sanitize test (jsdom environment)
- `app/api/__tests__/slide-count.test.ts` - 2 in-memory JSZip slide count tests
- `app/outputs/page.tsx` - Replaced isHtmlOutput() + local OutputRow with getOutputType() import; added markdown/DOCX/PPTX expand branches; slideCounts state
- `components/chat/ChatMessage.tsx` - Added rehype-sanitize to ReactMarkdown

## Decisions Made

- `docx-preview` dynamic import must be inside `useEffect`, not at module level — prevents SSR `ReferenceError` since the library accesses browser globals. Component is always loaded via `dynamic(..., { ssr: false })` from parent anyway, but belt-and-suspenders.
- PPTX outputs: slide count badge is informational only; errors silently swallowed so the row renders immediately without blocking on the API call.
- `getOutputType` placed in `lib/output-utils.ts` (not inlined in `app/outputs/page.tsx`) because `app/outputs/page.tsx` has `use client`, which makes it unsafe to import in Vitest node environment.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing test suite failures (58 files / 225 tests) existed before this plan and are unrelated to changes in this plan. Verified by stashing changes and confirming identical counts. These are out-of-scope and deferred.

## User Setup Required

None — no external service configuration required. `docx-preview` is a bundled npm package with no API keys needed.

## Next Phase Readiness

- Phase 78 Plan 02 is the final plan in the v9.0 milestone
- All OUT-01 and OUT-02 requirements are complete
- Outputs Library now supports all output types: HTML (iframe), markdown (ReactMarkdown + rehype-sanitize), DOCX (docx-preview), PPTX (slide count + download), file (open button)
- XSS gap in ChatMessage.tsx is resolved

---
*Phase: 78-ai-content*
*Completed: 2026-04-23*
