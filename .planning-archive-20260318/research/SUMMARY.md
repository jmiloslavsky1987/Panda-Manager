# Project Research Summary

**Project:** BigPanda Project Intelligence App
**Domain:** Local single-user React + Express PM tool with Google Drive YAML datastore and AI-powered report generation
**Researched:** 2026-03-04
**Confidence:** MEDIUM (no live web access during research; all findings from training data through August 2025 + direct PROJECT.md analysis)

## Executive Summary

The BigPanda Project Intelligence App is a local single-user project management tool that replaces a manual workflow of disconnected Claude.ai projects and spreadsheets. Research confirms this is a well-understood domain with stable, proven technologies: a React + Vite frontend, an Express backend, Google Drive YAML files as the data store, and the Anthropic SDK for AI report generation. The architecture is deliberately simple — no database, no auth, no real-time sync — which is correct for the constraints. The key insight from combined research is that Google Drive's atomic file writes and version history provide a surprisingly robust persistence layer when paired with strict server-side schema validation.

The recommended approach is to build in dependency order: Drive + YAML services first (they block everything), then the read surface (Dashboard, Customer Overview), then high-frequency writes (Action Manager), then the remaining structured views, and finally the AI-powered Report Generator and PPTX generation. This sequencing is driven by the architecture's dependency graph, not arbitrary preference. The most differentiating feature — Claude-powered report generation — is also the most isolated, so it can be validated end-to-end without disrupting core data management functionality.

The top risks are concentrated in Phase 1 and cut across all three backend services: Google Drive service account scope misconfiguration produces misleading 403 errors; js-yaml's default schema silently coerces status field values (e.g., `on: true`) destroying data; and the React Router v6 nested route structure must be established up front or every view will be blank with no helpful error. All three are preventable at scaffold time if approached in the documented order. The Anthropic SDK version specified in PROJECT.md (`^0.20.0`) is severely outdated and must be updated before any code is written.

---

## Key Findings

### Recommended Stack

The frontend is React 18 + Vite 5 + Tailwind CSS v3 + React Router v6, chosen for stability over cutting-edge. Tailwind v4 and React Router v7 both have ecosystem gaps that would slow development. The backend is Express 4 on Node 20/22 LTS. State management uses TanStack Query v5 for all server data (Drive YAML) and plain React `useState` for UI state — Zustand is explicitly not needed at this scale.

The critical library choices are: `js-yaml ^4.1.0` (stable, well-understood gotchas), `pptxgenjs ^3.12.x` (the only production-grade pure-JS PPTX generator), and `@anthropic-ai/sdk` at the current version (NOT the `^0.20.0` specified in PROJECT.md — run `npm view @anthropic-ai/sdk version` before starting). For the YAML editor, CodeMirror 6 is preferred over Monaco due to its ~10x smaller bundle size; Monaco is a full IDE core that is unnecessary for editing small YAML files.

**Core technologies:**
- React 18.3 + Vite 5: UI framework and build tool — stable LTS-equivalent, avoids v19/v6 ecosystem lag
- Express 4 + Node 20 LTS: HTTP server and runtime — well-documented, v5 ecosystem still catching up
- TanStack Query v5: Server state cache — eliminates redundant Drive reads with `staleTime`, built-in loading/error states
- `googleapis ^140.x` + `google-auth-library ^9.x`: Drive API client — official Google libraries; use `GoogleAuth` class, never cache raw tokens
- `js-yaml ^4.1.0`: YAML parse/serialize — stable with documented gotchas; use `JSON_SCHEMA` to avoid boolean coercion
- `pptxgenjs ^3.12.x`: PPTX generation — write-only, well-understood limitations around z-order and text overflow
- `@anthropic-ai/sdk` (current version): Claude API — use streaming for ELT decks (10-20s generation), non-streaming for weekly status
- CodeMirror 6 (`@codemirror/lang-yaml`): YAML editor — lightweight alternative to Monaco; ~200KB vs ~2MB
- `zod ^3.23.x`: Schema validation — validate Claude JSON output before pptxgenjs; also validate YAML server-side
- `concurrently + nodemon`: Dev tooling — run client + server together; auto-restart backend on changes

### Expected Features

Research confirms the 7-view structure is sound and complete for MVP. The features split clearly into three tiers based on user workflow criticality.

**Must have (table stakes):**
- Dashboard with at-risk sorting and overdue action counts — cross-customer status at a glance
- Customer Overview with workstream health, risks, milestones, action summary
- Action Manager with inline editing, filter/sort, and Drive write with optimistic feedback
- Consistent red/yellow/green status vocabulary across all 7 views — vocabulary is fixed by the YAML schema
- Empty states with add prompts on every list section
- Navigation breadcrumb (Dashboard > Customer Name > View)
- Unsaved changes protection in YAML Editor (React Router v6 `useBlocker` hook)
- Confirmation on destructive actions (retire/close) without modal — a confirmation row state

**Should have (competitive differentiators vs the current manual workflow):**
- AI report generation (Claude API) — 60-second generation replaces 30-minute write-ups
- Weekly Update Form as a structured ritual — eliminates hand-editing YAML indentation
- Sequential human-readable IDs (A-001, R-001, X-001) — enables Slack/email references
- Per-workstream progress bars on Customer Overview
- Artifact linking to actions (expose `linked_actions` field in UI, not just YAML)
- YAML Editor with schema validation button (escape hatch for power users)

**Defer to v2:**
- History timeline view in Customer Overview (raw YAML `history` array is readable but no view renders it)
- Cross-customer risk roll-up panel on Dashboard
- Global search across all customer YAMLs
- Overdue summary panel aggregating all overdue actions across customers
- Owner-based filtering in Action Manager

**Never build for this tool:**
- User authentication, multi-user collaboration, in-app notifications
- Gantt chart, customer creation wizard, report archive
- Mobile/responsive design (desktop-only local tool)
- Email sending, Slack/webhook integration

### Architecture Approach

The architecture is a client-server monorepo-lite: Vite React frontend proxies `/api` requests to Express, which owns all Drive reads/writes and Claude API calls. The frontend never touches Drive directly. All YAML mutations go through the atomic read-modify-validate-write cycle on the server. TanStack Query's `CustomerLayout` route fetches customer data once and passes it via `useOutletContext()` to all 6 child views — no redundant Drive reads on tab navigation. Reports use base64-in-JSON for PPTX delivery (simpler than streaming binary; size is 270KB-2.7MB which is fine on localhost).

**Major components:**
1. `driveService.js` — Google Drive API v3 reads/writes; owns auth lifecycle via `GoogleAuth` class; never caches raw tokens
2. `yamlService.js` — js-yaml parse/serialize, schema validation, sequential ID assignment; the single source of schema truth
3. `claudeService.js` — Anthropic SDK calls; streaming for ELT decks, non-streaming for weekly status
4. `pptxService.js` — pptxgenjs PPTX builder; maps Claude-generated JSON to slide elements; owns z-order and text truncation
5. Express routes (thin) — validate HTTP params, delegate to services, return responses; `asyncWrapper` middleware eliminates try/catch boilerplate
6. React Query cache — `CustomerLayout` fetches once, child views consume via `useOutletContext()`; `staleTime: 30-60s` prevents redundant fetches

### Critical Pitfalls

1. **Drive service account wrong scope (C1)** — `drive.file` scope only covers service-account-owned files; human-created YAMLs return 403. Fix: always request `https://www.googleapis.com/auth/drive` (full scope). Add a `/api/health/drive` startup check to catch this immediately.

2. **Drive token caching anti-pattern (C2)** — caching a raw access token causes silent failures after 60 minutes ("nothing saves after lunchtime"). Fix: always use `google.auth.GoogleAuth` class and pass the `auth` object to the Drive client; never extract and cache raw bearer tokens.

3. **js-yaml type coercion destroys data (C4)** — `status: on` parses as `true` (boolean), writes back as `true`, permanently corrupting the schema. Fix: use `schema: yaml.JSON_SCHEMA` on load; validate all enum fields against allowed string values in `yamlService.js`.

4. **React Router v6 missing `<Outlet />` produces blank views (C13)** — forgetting `<Outlet />` in parent layouts causes child routes to render as empty content with no error. Fix: establish the full nested route structure in Phase 1 scaffold before building any view components.

5. **Anthropic SDK version `^0.20.0` is severely outdated** — the PROJECT.md brief specifies a version that predates streaming improvements and tool use stabilization. Fix: run `npm view @anthropic-ai/sdk version` before writing any code and pin to the current version.

**Additional high-priority pitfalls to address in Phase 1:**
- Express body size limit (m4): set `express.json({ limit: '2mb' })` from day one — YAML Editor submits full YAML strings
- CORS vs Vite proxy (C12): configure Vite proxy first; do NOT add `cors()` middleware as a reflex
- Atomic write deep clone (M3): always `structuredClone(parsed)` before mutating; prevents writing partially-invalid objects to Drive
- js-yaml `undefined` → omitted keys (m2): normalize to `null`/`[]` before serializing; missing fields cause silent UI bugs

---

## Implications for Roadmap

Based on the architecture dependency graph and pitfall phase warnings, the following 5-phase structure is recommended. This sequencing is driven by what blocks what, not by view priority.

### Phase 1: Foundation — Backend Scaffold + Drive + YAML Services

**Rationale:** Everything else depends on this. Drive auth failures and YAML schema bugs discovered late require rewrites. The riskiest, most blocking code must be written, tested, and health-checked first before any UI exists.

**Delivers:**
- Working `driveService.js` with correct full Drive scope, `GoogleAuth` class (never raw tokens), and startup health-check endpoint
- Working `yamlService.js` with `JSON_SCHEMA` parsing, enum validation, `structuredClone` before mutations, `lineWidth: -1` serialization, and schema constant as single source of truth
- Express scaffold with `express.json({ limit: '2mb' })`, `asyncWrapper` middleware, `errorHandler.js`
- Vite proxy configured (`/api` → `http://localhost:3001`) — CORS never needed
- React Router v6 nested route structure established with all 7 view placeholders and correct `<Outlet />` composition
- TanStack Query provider and `api.js` fetch wrapper
- `.env` with `ANTHROPIC_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, `DRIVE_FOLDER_ID`

**Features addressed:** Atomic persistence, sequential ID assignment, schema validation
**Pitfalls avoided:** C1, C2, C3, C4, C5, C6, C7, C12, C13, M3, m2, m4

**Research flag:** NEEDS research-phase — Google Drive service account setup has several non-obvious steps (enabling Drive API in GCP, creating service account, granting folder access, choosing correct scope). The pitfalls here are hard to discover without experience.

---

### Phase 2: Read Surface — Dashboard + Customer Overview

**Rationale:** Validates the Drive connection end-to-end with real data. Makes the app demonstrably useful. Unblocks all subsequent views by confirming the data model and React Query cache setup work correctly.

**Delivers:**
- `GET /api/customers` — parallel Drive reads for all customer YAMLs
- `GET /api/customers/:id` — single customer YAML
- Dashboard view: customer card grid sorted by risk, health summary, overdue action counts, filter by status
- Customer Overview view: workstream health, per-workstream progress bars, top risks, upcoming milestones, recent action summary, navigation to child views
- Navigation breadcrumb, `CustomerLayout` with `useOutletContext()` data passing

**Features addressed:** Status visibility at a glance, cross-customer risk aggregation, empty states, navigation
**Architecture implemented:** CustomerLayout data-fetch pattern, React Query `staleTime` caching
**Pitfalls avoided:** Anti-Pattern 3 (multiple queries for same customer), redundant Drive reads

**Research flag:** Standard patterns — no research-phase needed. React Query + React Router nested routes are well-documented.

---

### Phase 3: Core Write Surface — Action Manager + Supporting Write Endpoints

**Rationale:** Action Manager is the highest-frequency daily interaction. Validating the atomic write pattern (read → mutate → validate → write → invalidate cache) on the most-used view de-risks all subsequent write views. If this works correctly, every other write view follows the same pattern.

**Delivers:**
- Write routes for actions (`POST`, `PATCH`), risks (`POST`, `PATCH`), milestones (`POST`, `PATCH`)
- Action Manager view: inline editing, filter by workstream/status/owner, sort by any column, text search within descriptions, overdue date highlighting, `N` / `Enter` / `Escape` keyboard shortcuts
- Optimistic UI pattern: update React Query cache on success via `invalidateQueries`, show "Saving..." → "Saved" indicator, revert on failure
- Sequential ID assignment for actions (server-side, never trust client IDs)

**Features addressed:** Inline editing, sort/filter, overdue highlighting, confirmation on destructive actions
**Pitfalls avoided:** M3 (atomic write edge cases), M4 (ID gaps after deletion), m3 (write feedback)

**Research flag:** Standard patterns — atomic write and React Query mutation patterns are well-documented.

---

### Phase 4: Remaining Structured Views — Weekly Update Form + Artifact Manager

**Rationale:** These views share the same write pattern as Phase 3 but are lower-frequency interactions. Building them after Action Manager means the team is practiced with the write pattern. They are independent of each other and can be built in parallel.

**Delivers:**
- `POST /api/customers/:id/history` — append weekly update entry
- `POST/PATCH /api/customers/:id/artifacts` — artifact CRUD with `linked_actions` cross-references
- Weekly Update Form: structured form for this-week status, blockers, next-week plan; writes to `history` array; unsaved changes protection
- Artifact Manager: add/update/retire artifacts, filter by type/status, text search, linked actions display
- Customer Overview inline edits for risks and milestones

**Features addressed:** Weekly Update Form as structured ritual, Artifact linking to actions, inline editing on Customer Overview
**Pitfalls avoided:** m3 (write feedback), unsaved changes guard via `useBlocker`

**Research flag:** Standard patterns — no research-phase needed.

---

### Phase 5: AI Report Generator + PPTX Export

**Rationale:** The most differentiating feature but also the most isolated — it depends on all data being correct (Phase 3-4) and has its own external API dependency (Claude). Building it last means it can be tested with real customer data. pptxgenjs has documented limitations (z-order, text overflow, font embedding) that require deliberate design, not incidental discovery.

**Delivers:**
- `claudeService.js`: streaming for ELT deck JSON generation, non-streaming for weekly status text; current SDK version (not `^0.20.0`)
- `pptxService.js`: Claude JSON → pptxgenjs slide construction; explicit layer ordering (background → shapes → text); field truncation with `maxChars` per field; font constants (cross-platform safe fonts)
- `POST /api/customers/:id/reports` route with 120-second route-level timeout
- Report Generator view: one-click generation, disabled button on click (prevents double-submit), `AbortController` with 90s client timeout, elapsed timer display, PPTX base64 download trigger
- YAML Editor view: CodeMirror 6 (`@codemirror/lang-yaml`, `@codemirror/lint`), lazy-loaded via `React.lazy()`, client-side validation on "Validate" button, schema warning banner, `useBlocker` for unsaved changes

**Features addressed:** AI report generation (key differentiator), PPTX download, YAML editor escape hatch
**Pitfalls avoided:** C8 (z-order), C9 (text overflow), C10 (font embedding), C11 (timeout/double-submit), M1 (Monaco bundle), M2 (PPTX headers)

**Research flag:** NEEDS research-phase — Claude prompt engineering for structured JSON output (ELT deck schema), pptxgenjs current version status and any z-order fixes since training data cutoff, and streaming SSE pattern for long-running generation should be validated before implementation.

---

### Phase Ordering Rationale

- Phase 1 before everything: Drive auth failures discovered late require full service rewrites. All 13 critical pitfalls with "Phase 1" warnings apply to the very first code written.
- Phase 2 before writes: confirms the data model and cache architecture are correct with real Drive data before investing in write logic.
- Phase 3 before Phase 4: Action Manager is the most-used view; validating the atomic write pattern here means Phase 4 views are low-risk.
- Phase 5 last: Claude + pptxgenjs are isolated dependencies with their own failure modes; building last means they can be tested with complete, validated data from Phases 1-4.
- YAML Editor in Phase 5 (not earlier): CodeMirror is a self-contained view requiring only the raw read/write endpoint (available after Phase 1); deferring it avoids Monaco/CodeMirror bundle investigation blocking core data views.

---

### Research Flags

**Phases needing `/gsd:research-phase` during planning:**
- **Phase 1:** Google Drive service account + GCP setup has multiple non-obvious failure modes (scope selection, folder sharing, API enablement in Cloud Console). Verify step-by-step setup against current GCP docs before coding.
- **Phase 5:** Claude prompt engineering for structured JSON ELT deck output; pptxgenjs z-order improvements since mid-2025; Anthropic SDK streaming SSE pattern with current SDK version.

**Phases with standard, well-documented patterns (skip research-phase):**
- **Phase 2:** React Query + nested routes — stable, well-documented APIs with abundant examples.
- **Phase 3:** Atomic write + React Query mutations — standard CRUD pattern; pitfalls are documented and preventable.
- **Phase 4:** Same write pattern as Phase 3; no new architectural concerns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core choices (React 18, Vite 5, Express 4, js-yaml, pptxgenjs) are HIGH confidence. Exact version numbers for `@anthropic-ai/sdk`, `googleapis`, Tailwind, Monaco/CodeMirror need live `npm view` verification before install. |
| Features | MEDIUM | 7-view structure is well-analyzed against PROJECT.md. Feature prioritization is domain-expertise-based (no live user research). The v2 deferrals are opinionated — validate against user's actual daily workflow gaps. |
| Architecture | HIGH | The architecture is a standard Vite + Express + React Query pattern with well-documented component boundaries. Data flow patterns are stable and independently verifiable. Confidence degraded only by CodeMirror vs Monaco choice (verify bundle sizes in current versions). |
| Pitfalls | MEDIUM | Google Drive API auth pitfalls (C1-C3) and js-yaml coercion (C4-C7) are from stable, well-documented sources (HIGH confidence). pptxgenjs z-order (C8) and Monaco lazy loading (M1) behavior may have changed in versions released after August 2025 (LOW confidence on current behavior). |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Anthropic SDK current version:** PROJECT.md specifies `^0.20.0` which is at least 6 months outdated as of March 2026. Run `npm view @anthropic-ai/sdk version` before any code. The streaming pattern in STACK.md is structurally correct regardless of version, but API method signatures may differ.
- **Tailwind v3 vs v4 decision:** Depends on what `npm create vite@latest` scaffolds by default in March 2026. Check the scaffold output before committing to v3 or v4 — the config structure changes completely between versions.
- **React 18 vs React 19:** Same scaffold concern. React 19 may now be the default. Verify React Router v6 compatibility with whichever version is installed.
- **pptxgenjs z-order current behavior:** C8 in PITFALLS.md notes this as a hard limitation. Verify against current pptxgenjs GitHub issues before designing the slide layout system — it may have been addressed.
- **User workflow validation for v2 deferrals:** The research defers cross-customer risk roll-up, global search, and history timeline to v2. These are driven by complexity analysis, not actual user feedback. Validate with the user before finalizing the roadmap — if ELT prep with cross-customer risk roll-up is a daily need, it should move to Phase 2.
- **YAML schema canonical definition:** The YAML schema is described in PROJECT.md but a machine-readable schema constant (used by `yamlService.js` validation) needs to be defined in Phase 1. This is a known gap — it requires reading the full schema spec from PROJECT.md and translating it to zod or a JS validation object before yamlService.js can be complete.

---

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` — project requirements, YAML schema, view specifications (read directly)
- Google Drive API v3 docs (https://developers.google.com/drive/api/guides/) — auth patterns, error codes, file atomicity guarantee
- js-yaml README (https://github.com/nodeca/js-yaml) — schema options, round-trip behavior, known coercion rules
- pptxgenjs docs (https://gitbrent.github.io/PptxGenJS/) — limitations, Buffer output, z-order behavior
- React Router v6 docs (https://reactrouter.com/en/main/) — nested routes, `useOutletContext`, `useBlocker`
- TanStack Query v5 docs (https://tanstack.com/query/v5/docs) — `staleTime`, `invalidateQueries`, `useMutation`
- Express 4 docs (https://expressjs.com/en/api.html) — `mergeParams`, middleware patterns
- MDN Web Docs — base64 download pattern, `AbortController`, `Blob`/`URL.createObjectURL`

### Secondary (MEDIUM confidence)
- Training data through August 2025 — version trajectories for `@anthropic-ai/sdk` (^0.28.x by mid-2025), googleapis (~v134-140), Vite (5.x stable), Tailwind (v3 vs v4 decision)
- Community consensus — CodeMirror 6 vs Monaco bundle size comparison; Vite proxy vs CORS pattern; pptxgenjs z-order ordering requirement

### Tertiary (LOW confidence — needs verification)
- pptxgenjs z-order and text overflow current behavior (may have changed since August 2025 training cutoff)
- `@monaco-editor/react` Vite 5 lazy loading compatibility (behavior reportedly changed in some Vite versions)
- Anthropic SDK current default timeout values

---

*Research completed: 2026-03-04*
*Ready for roadmap: yes*
