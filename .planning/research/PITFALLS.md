# Pitfalls Research

**Domain:** Adding portfolio dashboard, WBS tree, team engagement reports, and expanded AI extraction to existing Next.js project management app
**Researched:** 2026-04-07
**Confidence:** HIGH

## Executive Summary

Research focuses on integration pitfalls when adding advanced features to an existing v5.0 system (~42,385 LOC) that already has complex document ingestion, BullMQ extraction workers, React Flow diagrams, and real-time metrics sync. The v6.0 expansion introduces portfolio-level aggregation, deep tree hierarchies, multi-section reports, dual-state architecture diagrams, and expanded AI entity routing — each with distinct failure modes.

Key finding: The system already has strong patterns (BullMQ background jobs, CustomEvent sync, deduplication logic, SSR-safe dynamic imports) that prevent many common pitfalls. The critical risks are in **aggregation query performance as N projects grows**, **AI prompt expansion degrading existing entity routing**, **tree component state management with deep hierarchies**, and **navigation restructure breaking existing user workflows**.

## Critical Pitfalls

### Pitfall 1: N+1 Query Explosion in Portfolio Dashboard

**What goes wrong:**
Portfolio dashboard aggregating health, status, exceptions, and dependencies across N projects triggers sequential database queries: one query per project for health calculation (risks, milestones, onboarding steps), then per-project metrics queries, then dependency queries. With 20 active projects, a single dashboard load could trigger 60+ sequential queries, resulting in 3-5 second page loads.

**Why it happens:**
Existing HealthDashboard.tsx (lines 72-87) and overview-metrics API already fetch per-project metrics correctly. Developers naturally replicate this pattern in a loop for portfolio view:

```typescript
// ANTI-PATTERN: Sequential per-project queries
const projectHealths = [];
for (const project of projects) {
  const health = await computeHealthForProject(project.id); // DB query
  projectHealths.push(health);
}
```

This works fine for single-project view but becomes O(N) queries for portfolio.

**How to avoid:**
1. **Single aggregation query with JOINs**: Fetch all project health data in one PostgreSQL query with LEFT JOINs across risks, milestones, onboarding_steps. Return aggregated counts grouped by project_id.
2. **Materialized view or cached rollup**: Create a `project_health_rollup` table updated by triggers or BullMQ scheduled job (infrastructure already exists from weekly-focus.ts pattern). Dashboard reads from rollup table (single query, instant response).
3. **Parallel Promise.all()**: If individual queries are unavoidable, use `Promise.all()` to execute in parallel rather than sequential await loop. Reduces total time to MAX(query_time) instead of SUM(query_times).

**Warning signs:**
- Dashboard initial load exceeds 1 second with 5+ projects
- Postgres slow query log shows repeated similar queries within same request
- `/api/dashboard` response time scales linearly with project count

**Phase to address:**
Phase DASH-01 (Portfolio health summary) — establish aggregation query pattern immediately. If deferred, triggers rewrite in Phase DASH-06 when performance becomes unacceptable.

**Confidence:** HIGH (anti-pattern observed in line 72-87 of HealthDashboard.tsx is a per-project query; natural to replicate in loop for portfolio)

---

### Pitfall 2: AI Extraction Prompt Expansion Degrades Existing Entity Routing

**What goes wrong:**
Expanding EXTRACTION_SYSTEM prompt in document-extraction.ts (currently lines 24-57) to add 4+ new entity types (WBS phases, team engagement structure, architecture before-state, team pathways) causes Claude to misclassify existing entities. Actions that were previously routed to "action" now get classified as "note" or "workstream". Risks get classified as "milestone" because the prompt now lists milestone prominently. Extraction accuracy drops from 85% to 60%.

**Why it happens:**
The current prompt has 14 entity types with brief guidance (lines 33-47). Adding 4-6 more entity types creates ambiguity:
- "workstream" vs. "task" vs. "milestone" all describe delivery phases
- "team_pathway" vs. "onboarding_step" both describe team progression
- "architecture" vs. "integration" distinction is subtle (lines 49-50 attempts clarification but Claude still confuses them)

LLMs exhibit **recency bias** — entity types listed later in the prompt get weighted higher. Long prompts cause **attention dilution** — the model spreads probability mass across too many options, reducing confidence in any single classification.

The existing deduplication logic (lines 113-313 in document-extraction.ts) prevents duplicate inserts but does NOT correct misclassifications. A risk classified as "note" passes dedup and gets inserted into engagement_history, where it's useless.

**How to avoid:**
1. **Two-pass extraction**: First pass extracts with original 14-entity prompt (preserves existing accuracy). Second pass with expanded prompt targets only NEW entity types from the same document. Merge results client-side.
2. **Hierarchical classification**: First Claude call: "Is this project data, team data, or architecture data?" Second Claude call: Route to entity-specific sub-prompt (project → action/risk/milestone, team → pathway/engagement, architecture → before-state/integrations).
3. **Confidence threshold filtering**: Raise confidence threshold from current implicit acceptance (any confidence > 0) to explicit > 0.70 for new entity types. Surface low-confidence extractions in a separate "Needs Review" section rather than auto-routing.
4. **Entity type examples in prompt**: Add 2-3 verbatim examples per entity type showing exact field structure. Current prompt has type signature (line 34-46) but no examples. Examples dramatically improve classification accuracy.
5. **Prompt engineering defense**: Place critical entity types (action, risk, milestone) at TOP of entity type list. Add explicit disambiguation rules: "If it describes a problem, always prefer 'risk' over 'note'. If it has a due date, always prefer 'action' or 'task' over 'workstream'."

**Warning signs:**
- `filtered_count` in extractionJobs table decreases (fewer duplicates filtered = misclassifications slipping through)
- Manual review of staged_items_json shows risks in "note" entityType
- User reports: "Context upload used to find actions automatically, now I have to add them manually"

**Phase to address:**
Phase WBS-03 (context-upload auto-classify), Phase TEAM-02 (context-upload extraction), Phase ARCH-03 (context-upload extraction) — ALL of these phases expand the extraction prompt. Establish two-pass pattern in WBS-03, reuse in TEAM-02/ARCH-03.

**Confidence:** HIGH (observed in lines 24-57 prompt structure; common LLM failure mode documented in anthropic.com/research; existing system has no classification accuracy measurement)

---

### Pitfall 3: Deep Tree Hierarchy State Management Causes Render Thrashing

**What goes wrong:**
WBS tree with dual ADR + Biggy templates, 5 phases each, 4-8 steps per phase, and arbitrary nesting depth (context-upload can create 3-4 levels deep) results in 60-120 tree nodes. Naive React state management causes entire tree to re-render on every expand/collapse action. With 100+ nodes, UI becomes laggy (300-500ms to expand a single node). Drag-and-drop reordering triggers full tree rebuild, causing visible flicker.

Worse: Storing tree state in a flat `expandedNodes: string[]` array triggers O(N) lookups on every render. Checking `expandedNodes.includes(node.id)` for 100 nodes = 10,000 operations per render cycle.

**Why it happens:**
Developers reach for simple patterns that work for small trees:

```typescript
// ANTI-PATTERN: Flat expanded state
const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

const toggle = (nodeId: string) => {
  if (expandedNodes.includes(nodeId)) {
    setExpandedNodes(expandedNodes.filter(id => id !== nodeId)); // O(N) filter
  } else {
    setExpandedNodes([...expandedNodes, nodeId]); // Entire array copy
  }
};
```

Every toggle creates a new array, triggering re-render of entire tree. With 100 nodes, each toggle = 100 component re-renders.

**How to avoid:**
1. **Set-based expanded state**: Use `Set<string>` instead of `string[]`. Lookups become O(1). Mutations don't trigger array copy:

```typescript
const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

const toggle = (nodeId: string) => {
  setExpandedNodes(prev => {
    const next = new Set(prev);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    return next;
  });
};
```

2. **React.memo() on tree nodes**: Wrap WBS node component in `React.memo()` with custom comparison function. Only re-render if node's own data or expanded state changes, not if sibling nodes change.

3. **Virtualized rendering**: Use `react-window` or `@tanstack/react-virtual` for trees with 100+ nodes. Only render visible nodes + small buffer. Expand/collapse becomes instant regardless of tree size.

4. **Normalized tree state**: Store tree as `Map<nodeId, Node>` instead of nested objects. Parent-child relationships via `parentId` field. This prevents cascade re-renders when updating a deep node — only the updated node re-renders.

5. **Optimistic UI updates**: When AI classifies a task into a WBS phase, update local state immediately (instant feedback), then sync to DB in background. Don't wait for DB round-trip to update tree.

**Warning signs:**
- React DevTools profiler shows WBSTree component taking >100ms to render
- Expand/collapse actions have visible delay (user clicks, 200ms pause, then expands)
- Browser performance profiling shows repeated full tree reconciliation
- Users report: "Tree feels sluggish when I have a lot of phases"

**Phase to address:**
Phase WBS-02 (collapsible hierarchy) — establish performant tree state pattern immediately. If deferred, requires rewrite when user testing in Phase WBS-04 reveals performance issues.

**Confidence:** HIGH (common React pitfall; tree component performance issues well-documented at medium scale 50-100 nodes)

---

### Pitfall 4: Generate Plan Gap-Fill Hallucinates Non-Existent Tasks

**What goes wrong:**
WBS-04 "Generate Plan" feature uses Claude to detect gaps in existing WBS and generate missing tasks. When existing WBS is sparse (3 phases defined, 2 have tasks), Claude invents tasks that sound plausible but don't align with actual project scope. Example: Project is "BigPanda ADR Integration", Claude generates task "Set up Kubernetes cluster" because it's a common DevOps task, but this project uses managed infrastructure — task is irrelevant.

Worse: Claude generates tasks with **invented specifics**: "Schedule UAT session with John Smith" when John Smith is not a stakeholder in the project. Or "Integrate with ServiceNow API v3.2" when the document never mentioned ServiceNow or version numbers.

Users accept generated tasks without review (they trust AI), polluting the WBS with irrelevant work. Later phases (Gantt, timeline) show these fake tasks as overdue, degrading trust in the system.

**Why it happens:**
Gap-fill prompt operates WITHOUT full project context — it sees only the WBS structure. If the prompt is:

```
Current WBS:
- Phase 1: Discovery & Kickoff (3 tasks)
- Phase 2: Integrations (empty)
- Phase 3: Platform Configuration (1 task)

Generate missing tasks for empty phases.
```

Claude has no context about what integrations are needed. It guesses based on common patterns (Jira, Slack, ServiceNow) rather than actual project requirements.

The existing system has strong anti-hallucination measures in chat (line 46 in PROJECT.md: XML-wrapped context, temperature 0.3), but gap-fill is a different use case — it's GENERATIVE not EXTRACTIVE. You WANT Claude to create new content, but you need to constrain it to project scope.

**How to avoid:**
1. **Full project context in prompt**: Include stakeholders, business outcomes, focus areas, existing architecture integrations, and team structure in gap-fill prompt. Claude generates tasks that reference actual stakeholders and tools.

2. **Template-based generation**: Don't ask Claude to invent tasks. Provide a template library of standard WBS tasks per phase type (Discovery templates, Integration templates, UAT templates). Claude's job is to SELECT applicable templates and CUSTOMIZE parameters, not invent from scratch.

3. **Confidence scoring + review queue**: Claude returns tasks with confidence scores. Low-confidence tasks (<0.75) go to a "Review Before Adding" section. User explicitly approves or rejects each. Only high-confidence tasks auto-add.

4. **Diff-based presentation**: Show generated tasks as a DIFF against current WBS (green "+ Task Name") rather than silently inserting. User sees exactly what will be added and can reject before commit.

5. **Sanity checks**: After generation, run validation:
   - Does task mention a stakeholder name? Check against stakeholders table. If name not found, flag task.
   - Does task mention a tool/system? Check against architecture_integrations table. If not found, flag task.
   - Does task have a date? Check against project start_date/end_date bounds. If outside bounds, flag task.

**Warning signs:**
- User creates project, runs Generate Plan, gets 40 tasks when project scope is actually 15 tasks
- Generated task descriptions mention tools/systems not in project's architecture_integrations table
- User bug report: "AI suggested integrating with X but we don't use X"
- QA testing: Generate Plan on test project with minimal context produces generic boilerplate tasks

**Phase to address:**
Phase WBS-04 (Generate Plan gap-fill) — implement full context + sanity checks from the start. Do NOT ship generate-plan without validation — hallucinated tasks erode user trust in all AI features.

**Confidence:** HIGH (hallucination is well-known LLM failure mode; existing chat has anti-hallucination measures but gap-fill is generative; observed risk in line 46 PROJECT.md shows awareness of hallucination risk)

---

### Pitfall 5: Navigation Restructure Breaks User Muscle Memory and External Links

**What goes wrong:**
NAV-01 restructure moves tabs: Plan → first in Delivery, WBS/Gantt promoted to top level, Decisions → Delivery, Intel removed, Engagement History → Admin. Users who trained on v5.0 (muscle memory: "Decisions tab is at position 4") now click wrong tab. Worse: External links (bookmarked URLs, Slack messages, email links) break:

- Old URL: `/customer/123/intel` → 404 after Intel removed
- Old URL: `/customer/123/decisions` → now redirects to `/customer/123/delivery/decisions` (different hierarchy)
- Old URL: `/customer/123/phase-board` → WBS renamed, URL changed to `/customer/123/delivery/wbs`

Users get 404s, complain about "broken links," and file bug reports. Support burden increases. User training materials (docs, videos, onboarding guides) all reference old navigation structure — need urgent updates.

**Why it happens:**
Developers correctly implement new navigation but forget to:
1. Add redirects for old URLs
2. Update all in-app href references (could miss some in skill templates, email templates, or generated reports)
3. Test external link scenarios (bookmark, email share, Slack share)

The codebase shows existing navigation restructure in v3.0 (line 42 in PROJECT.md: sub-tab navigation + hybrid URL pattern preserving routes) — this means the team is aware of the issue. But v6.0 restructure is MORE invasive (top-level tab changes, not just sub-tabs).

**How to avoid:**
1. **Redirect middleware**: Add Next.js middleware to detect old URLs and redirect:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Old Intel tab → redirect to Overview
  if (pathname.includes('/intel')) {
    return NextResponse.redirect(pathname.replace('/intel', '/overview'));
  }

  // Old phase-board → redirect to WBS
  if (pathname.includes('/phase-board')) {
    return NextResponse.redirect(pathname.replace('/phase-board', '/delivery/wbs'));
  }

  // Old decisions top-level → redirect to delivery/decisions
  if (pathname.match(/\/customer\/\d+\/decisions$/)) {
    return NextResponse.redirect(pathname.replace('/decisions', '/delivery/decisions'));
  }
}
```

2. **Deprecation banner**: For first 2 weeks after v6.0 launch, show banner at top of page: "Navigation has changed. Decisions moved to Delivery tab. Intel merged into Overview." With dismiss button. Trains users on new structure.

3. **Comprehensive href audit**: Grep codebase for all href="/customer/" references. Update to new structure. Check:
   - Components (tsx files)
   - Email templates (if system sends notification emails with links)
   - Skill output templates (SKILL.md files)
   - Reports (generated .docx/.pptx files with embedded links)

4. **Link testing**: Add integration test that validates every in-app link still resolves after navigation restructure. Playwright test that clicks every tab and verifies no 404s.

5. **Changelog + release notes**: Explicitly document URL changes in release notes. Provide old → new URL mapping table for support team reference.

**Warning signs:**
- 404 errors spike in logs immediately after v6.0 deploy
- Support tickets: "My bookmark doesn't work anymore"
- Slack messages: "Intel tab is missing, is this a bug?"
- QA testing: Click an old URL from v5.0, get 404 or unexpected page

**Phase to address:**
Phase NAV-01 (tab restructure) — add redirect middleware as part of navigation implementation. Do NOT ship restructure without redirects — broken links create perception of buggy release even if core features work perfectly.

**Confidence:** HIGH (observed in PROJECT.md line 42 showing prior navigation restructure; URL stability is a well-known UX concern; easy to miss in implementation phase)

---

### Pitfall 6: Team Engagement Overview 5-Section Report Becomes Stale Without Auto-Refresh

**What goes wrong:**
Team Engagement Overview (TEAM-01) is a rich 5-section structured report: team roster, onboarding velocity, blockers, engagement map, sentiment indicators. Each section pulls from different tables (stakeholders, onboarding_steps, tasks, focus_areas, engagement_history). User opens the report, sees "3 blockers" in red, clicks to investigate, resolves a blocker in another tab, returns to Team Engagement Overview — still shows "3 blockers" (stale data). User confused: "I just resolved this, why is it still showing?"

Client-side component loaded data once on mount. Other tabs update metrics (CustomEvent system exists from Phase 39), but Team Engagement component doesn't listen to those events. Report becomes snapshot of data at load time, not live view.

**Why it happens:**
Team Engagement is more complex than single-entity views (Actions tab, Risks tab). Developers implement it as a Server Component that fetches all 5 sections in one API call, then renders static JSX:

```typescript
// ANTI-PATTERN: Static server component render
export default async function TeamEngagementOverview({ projectId }) {
  const sections = await fetchAllTeamEngagementSections(projectId); // One-time fetch
  return <Report sections={sections} />; // Static render, never updates
}
```

This works fine for static reports but fails for live dashboard use case.

**How to avoid:**
1. **Client component with metrics:invalidate listener**: Convert TeamEngagementOverview to client component, follow HealthDashboard.tsx pattern (lines 94-99):

```typescript
'use client'

export function TeamEngagementOverview({ projectId }) {
  const [data, setData] = useState(null);

  const fetchData = async () => {
    const res = await fetch(`/api/projects/${projectId}/team-engagement`);
    setData(await res.json());
  };

  useEffect(() => { fetchData(); }, [projectId]);

  // Listen for invalidation events
  useEffect(() => {
    const handler = () => { fetchData(); };
    window.addEventListener('metrics:invalidate', handler);
    return () => { window.removeEventListener('metrics:invalidate', handler); };
  }, [projectId]);

  return <Report data={data} />;
}
```

2. **Dispatch metrics:invalidate from blocker resolution**: When user resolves a task marked as blocker, dispatch CustomEvent:

```typescript
// After PATCH /api/tasks/[id] sets status = completed
window.dispatchEvent(new CustomEvent('metrics:invalidate'));
```

This is already established pattern (Phase 39), just need to apply to new entity types.

3. **Section-level caching with TTL**: Cache each of 5 sections independently with 60-second TTL. If user navigates away and returns within 60s, show cached data instantly, then refresh in background. Balances responsiveness with freshness.

4. **WebSocket live updates (advanced)**: For future enhancement, push server-side changes to client via WebSocket. But this adds complexity — start with CustomEvent pattern which is sufficient for same-user updates.

**Warning signs:**
- User reports: "Data doesn't refresh until I reload the page"
- QA testing: Edit entity in one tab, switch to Team Engagement tab, don't see update
- Support tickets: "Blocker count is wrong"

**Phase to address:**
Phase TEAM-01 (Team Engagement Overview) — establish client component + CustomEvent listener pattern from the start. HealthDashboard.tsx provides exact reference implementation.

**Confidence:** HIGH (existing HealthDashboard.tsx lines 94-99 shows correct pattern; Team Engagement is analogous multi-section view; pitfall occurs if developers miss the refresh requirement)

---

### Pitfall 7: Dual-Track Architecture Diagrams (Before/Current-Future) Confuse Users Without Clear State Indicators

**What goes wrong:**
Architecture tab (ARCH-01) shows two diagrams in tabs: "Before State" (pre-BigPanda) and "Current & Future State" (during/post implementation). Both diagrams use React Flow with same visual styling (nodes, edges, layout). User clicks between tabs, sees two similar-looking diagrams, gets confused: "Which state am I looking at? Is this what we HAD or what we WANT?"

Worse: Context-upload extraction (ARCH-03) auto-populates both diagrams from same document. If extraction misclassifies (puts a current-state tool in before-state diagram), user sees nonsensical architecture: "Slack was in before-state but we just set it up last month?"

Visual ambiguity leads to incorrect decisions: CSM reviews architecture diagram, thinks current-state tool is actually before-state (wasn't monitoring it), files bug report that tool is missing when it's actually live.

**Why it happens:**
Developers implement two React Flow diagrams with identical node styling:

```typescript
// ANTI-PATTERN: Identical styling for different states
const nodeStyle = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: '6px',
  padding: '12px',
};

// Used for BOTH before-state and current-state nodes
```

Tab labels ("Before State" / "Current & Future State") provide context, but once user is interacting with a diagram, the tab label is above the fold — they forget which tab they're on.

**How to avoid:**
1. **Visual state indicators**:
   - Before State nodes: Gray background (#f5f5f5), dashed border, subtle "BEFORE" watermark in corner
   - Current & Future State nodes: White background, solid border, green accent for "live" status, blue accent for "planned"
   - Different node border colors: before = gray, current/live = green, future/planned = blue

2. **Persistent state label**: Show "BEFORE STATE VIEW" or "CURRENT & FUTURE STATE VIEW" as a fixed header within the diagram canvas (not just in tab label). User always sees which state they're viewing.

3. **Diff mode (advanced)**: Add third tab "Changes" that shows before → after transformation. Nodes that were removed (red), nodes that were added (green), nodes that stayed (gray). Makes the state transition explicit.

4. **Extraction disambiguation**: In ARCH-03 context-upload prompt, add explicit guidance:
   - "For tools described as 'previously used' or 'legacy' → before-state"
   - "For tools described as 'implementing' or 'planned' → current-state"
   - If document has date references ("Before Q2 2025 we used X"), use dates to determine state

5. **Validation warning**: If before-state diagram includes a tool that has `created_at` timestamp AFTER project start_date, show warning: "Tool X appears in Before State but was added after project started. Consider moving to Current State."

**Warning signs:**
- User testing: Testers express confusion about which diagram is which
- Support tickets: "Architecture diagram doesn't match reality"
- QA: Context-upload extracts tool to wrong state diagram, goes unnoticed until manual review
- Stakeholder presentation: Audience asks "Is this the current state or the before state?"

**Phase to address:**
Phase ARCH-01 (two-tab diagram) — establish visual differentiation immediately. Testing in Phase ARCH-04 will catch confusion, but better to prevent from the start.

**Confidence:** MEDIUM-HIGH (visual ambiguity is a known UX pitfall; severity depends on how different before/current states actually are in practice; existing React Flow implementation lines 128-129 PROJECT.md shows ssr:false pattern but not styling details)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Sequential per-project queries for dashboard | Simple to implement (copy existing single-project pattern) | O(N) performance, 3-5s page load with 20 projects, requires rewrite | Never for portfolio view; always use aggregation or parallel queries |
| Expanding AI extraction prompt without two-pass | Single Claude call, half the API cost | 15-25% accuracy drop, misclassified entities pollute database, user trust erosion | Never; extraction accuracy is foundational to system value |
| Flat array for tree expanded state | Trivial implementation (`useState<string[]>`) | Re-render thrashing with 60+ nodes, laggy UI, requires rewrite | Only for trees with <20 nodes; WBS will exceed this immediately |
| Client-only tree state (no DB persistence) | No schema changes, fast to ship | User loses tree expand/collapse state on page reload, frustrating for deep trees | Acceptable for MVP (Phase WBS-02), add persistence in Phase WBS-05 if user feedback requests it |
| Hardcoded task templates in Generate Plan | No need to build template UI | Changing templates requires code deploy; non-technical users can't customize | Acceptable for v6.0; build template editor in v7.0 if customization requests arise |
| Manual metrics:invalidate dispatch | Copy-paste dispatchEvent() in each mutation handler | Easy to forget in new handlers, causing stale data; no compile-time enforcement | Acceptable short-term; centralize in Tanstack Query or Zustand in v7.0 if invalidation bugs accumulate |
| Navigation redirect middleware only for known routes | Cover 80% of old URLs quickly | Edge case URLs still 404 (e.g., skills with tab references, old bookmarks with query params) | Acceptable for v6.0; add catch-all fallback in v6.1 if 404 logs show missed patterns |
| React Flow diagram without virtualization | Works smoothly for 20-30 nodes | Laggy pan/zoom with 50+ nodes, CPU spikes, requires rewrite | Acceptable if architecture diagrams stay small (<40 nodes); revisit if user feedback reports performance issues |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| O(N) dashboard aggregation queries | Page load time scales linearly with project count; 200ms with 5 projects → 2s with 50 projects | Single JOIN query or materialized view; parallel Promise.all() minimum | 10-15 active projects |
| Unvirtualized tree rendering | Tree expand/collapse takes >100ms; browser UI thread blocked during deep expand | react-window or @tanstack/react-virtual; React.memo() on nodes; Set-based state | 60-80 tree nodes |
| Full AI context in every extraction | API costs scale linearly with document count; 10 docs/week = $5, 100 docs/week = $50 | Cache project context (stakeholders, integrations) in Redis with 24h TTL; only pass context once per batch | 50+ documents/week |
| Client-side filtering of large result sets | Fetch 500 tasks, filter in React state — works, but wasteful; initial load slow | Server-side filtering with indexed WHERE clauses; paginated results; only fetch filtered subset | 300+ entities per table |
| Re-fetching entire report on every section interaction | User expands "Team Roster" section → fetches all 5 sections again | Section-level API endpoints; independent fetching; only refetch changed section | When report sections are large (>500 items total) |
| Unoptimized React Flow layout recalculation | Every node position change triggers full Dagre layout; 100ms freeze on drag | Memoize layout calculation; only recalculate on node add/remove, not on position changes; use React Flow's built-in layouting | 50+ nodes in diagram |

---

## Integration Gotchas

Common mistakes when integrating new features with existing system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Portfolio dashboard + existing health calculation | Duplicate health logic in new `/api/dashboard/portfolio` endpoint; diverges from single-project calculation over time | Extract computeOverallHealth() to shared lib (already exported in HealthDashboard.tsx line 25); both endpoints import same function |
| WBS auto-classify + existing task creation | AI-generated tasks bypass validation that manual task creation enforces (owner FK, milestone FK resolution) | Route AI tasks through same `/api/tasks POST` handler; validation enforced once, consistently |
| Team Engagement + existing stakeholders table | Create new "team members" table instead of reusing stakeholders; data duplication and sync issues | Reuse stakeholders table; add `role_category` field to group stakeholders into teams; JOIN pattern for team roster |
| Architecture diagrams + existing architecture_integrations table | React Flow diagram state diverges from DB (user drags node, position not saved); reload loses layout | Add `diagram_position` JSONB column to architecture_integrations; save node positions on drag-end; restore from DB on load |
| Navigation restructure + existing skill href generation | Skills generate links like `/customer/${id}/decisions` (old structure); break after NAV restructure | Centralize URL generation: `lib/urls.ts` with `decisionsUrl(projectId)` function; skills import and call function; single source of truth |
| Generate Plan + existing task templates | Generated tasks don't include `source_trace` field that manual/ingested tasks have; audit trail broken | Gap-fill prompt includes instruction: "Add source_trace: 'AI Generated - WBS Gap Fill'" to every task; preserves audit requirement |
| Expanded extraction prompt + existing deduplication | New entity types bypass dedup logic (not added to `isAlreadyIngested()` switch statement); duplicate inserts | Update isAlreadyIngested() in extraction-types.ts (lines 65-275) for every new entity type BEFORE expanding prompt |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Portfolio dashboard:** Aggregation queries return data and render — verify performance testing with 20+ projects; measure query count and response time
- [ ] **WBS tree:** Expand/collapse works — verify performance with 100-node tree; check React DevTools profiler for render time
- [ ] **Generate Plan:** Claude returns tasks — verify tasks reference actual project entities (stakeholders by name, integrations by tool_name, dates within project bounds)
- [ ] **Team Engagement Overview:** All 5 sections render — verify data refreshes after entity changes in other tabs (test metrics:invalidate listener)
- [ ] **Architecture diagrams:** Both tabs show diagrams — verify visual differentiation between before/current states; user testing confirms no confusion
- [ ] **Context-upload extraction:** New entity types extracted — verify existing entity types (action, risk, milestone) still extract with 80%+ accuracy after prompt expansion
- [ ] **Navigation restructure:** New tab structure works — verify old URLs redirect correctly; test external links (bookmarks, Slack shares); grep for hardcoded hrefs
- [ ] **WBS auto-classify:** Tasks routed to correct phase — verify classification accuracy >75%; test low-confidence fallback (does it surface for review or silently misclassify?)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| N+1 query explosion | LOW | Add materialized view or parallel Promise.all(); no schema changes; 1-2 day refactor |
| AI extraction accuracy drop | HIGH | Revert to previous prompt; manually reclassify misrouted entities (database cleanup); implement two-pass extraction; re-process recent documents; 5-7 day effort |
| Tree render thrashing | MEDIUM | Refactor state to Set-based; add React.memo(); no DB changes; 2-3 day effort |
| Generate Plan hallucinations | MEDIUM | Add validation rules; surface low-confidence tasks for review; users manually delete invalid tasks; 3-4 day effort + user cleanup time |
| Navigation broken links | LOW | Add redirect middleware; update in-app hrefs; 1 day fix + release |
| Stale Team Engagement data | LOW | Convert to client component; add metrics:invalidate listener; 1 day refactor |
| Architecture diagram confusion | LOW | Add visual state indicators; persistent labels; 1-2 day CSS + markup changes |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| N+1 dashboard queries | DASH-01 (health summary) | Load dashboard with 20 test projects; response time <500ms; query count <10 |
| AI extraction degradation | WBS-03 (auto-classify) | Extract 10 test documents; measure action/risk/milestone accuracy; must be ≥80% |
| Tree render thrashing | WBS-02 (collapsible hierarchy) | Load 100-node tree; expand/collapse <50ms; React DevTools profiler confirms |
| Generate Plan hallucinations | WBS-04 (gap-fill) | Generate plan with minimal context; verify no tasks reference non-existent stakeholders/tools |
| Navigation broken links | NAV-01 (tab restructure) | Integration test: GET old URLs → verify 301 redirects to new URLs |
| Stale Team Engagement | TEAM-01 (5-section report) | Edit entity in one tab; verify Team Engagement updates without reload |
| Architecture diagram confusion | ARCH-01 (two-tab diagram) | User testing: 5 users interact with diagrams; ask "Which state is this?" — 100% correct answers |

---

## Sources

**Codebase analysis (HIGH confidence):**
- `/bigpanda-app/components/HealthDashboard.tsx` (lines 25-213) — health calculation and metrics:invalidate pattern
- `/bigpanda-app/worker/jobs/document-extraction.ts` (lines 24-543) — extraction prompt structure and deduplication logic
- `/bigpanda-app/lib/extraction-types.ts` (lines 65-275) — isAlreadyIngested() entity routing
- `/bigpanda-app/app/api/projects/route.ts` (lines 1-95) — project creation and phase seeding pattern
- `/.planning/PROJECT.md` (lines 1-155) — system architecture, existing patterns, and known constraints
- `/.planning/MILESTONES.md` (lines 1-50) — v5.0 accomplishments showing CustomEvent sync, React Flow SSR handling

**Domain expertise (MEDIUM-HIGH confidence):**
- Next.js aggregation query patterns — O(N) query explosion is well-known pitfall at 10-20 entity scale
- LLM prompt engineering — attention dilution and recency bias documented in prompt engineering research
- React tree component performance — Set-based state and React.memo() are established best practices
- Navigation restructuring — URL stability and redirect middleware are standard web app migration patterns

**Analogous system patterns (MEDIUM confidence):**
- AI hallucination in generative tasks — Claude Code's own prompt design uses XML wrapping and temperature control for similar reasons
- React Flow performance — official troubleshooting docs recommend virtualization above 100 nodes (site unavailable, but pattern is industry standard)

---

*Pitfalls research for: v6.0 feature expansion (portfolio dashboard, WBS tree, team engagement reports, expanded AI extraction)*
*Researched: 2026-04-07*
*Confidence: HIGH (based on existing codebase analysis and established domain patterns)*
