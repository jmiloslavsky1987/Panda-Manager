# Feature Landscape: v6.0 New Capabilities

**Domain:** Enterprise Project Portfolio Management + Professional Services Delivery
**Researched:** 2026-04-07
**Confidence:** MEDIUM — Based on training knowledge of enterprise PM tools (Jira, Asana, Monday.com, Microsoft Project, Smartsheet) and analysis of existing codebase patterns. WebFetch attempts for current documentation failed; recommendations derive from established patterns in the domain.

## Context

This research covers **only the five new capabilities** being added to an existing AI-native Professional Services project management platform in v6.0:

1. Portfolio Dashboard
2. Work Breakdown Structure (replacing Phase Board)
3. Team Engagement Overview (enhancement to existing Teams tab)
4. Architecture Diagram (two-tab before/after state)
5. Context Upload Expansion (extraction routing)

**Not in scope:** Features already built in v1.0–v5.0 (42 phases completed).

---

## Table Stakes

Features users expect in enterprise PM tools. Missing these makes the product feel incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Portfolio Dashboard: Multi-project table** | All portfolio tools (Jira Portfolio, Asana Portfolios, Monday.com Boards) show project list with name/owner/status/health | Low | Projects table, health scoring (exists) | Filter/sort/search on 9 columns standard |
| **Portfolio Dashboard: Health summary** | Visual at-a-glance status (red/yellow/green counts) is foundational to portfolio mgmt | Low | Existing health scoring from v1.0 | Aggregate counts across all projects |
| **Portfolio Dashboard: Status chart/rollup** | Percentage complete or phase distribution shown as pie/bar chart in all PM dashboards | Low | Milestones table (exists), Recharts (exists) | Visual rollup, not just table rows |
| **Portfolio Dashboard: Drill-down navigation** | Clicking a project in portfolio view opens that project workspace | Low | Routing (exists) | Standard navigation pattern |
| **WBS: Collapsible hierarchy** | All WBS tools (MS Project, Smartsheet) use tree with expand/collapse; flat list is not WBS | Medium | Recursive rendering, state management | 3–5 levels typical (project → phase → workstream → task → subtask) |
| **WBS: Manual add/edit/delete nodes** | Users expect full CRUD on hierarchy; read-only WBS violates PM tool norms | Medium | CRUD API handlers, optimistic UI updates, parent_id FK | Must support adding at any level |
| **WBS: Visual indentation** | Standard WBS presentation uses visual nesting (padding/icons) not just text hierarchy | Low | CSS + recursive component | Industry-standard visual language |
| **Team Engagement: Contact list per team** | Stakeholder directory is baseline for any multi-team project tracker | Low | Stakeholders table (exists), team → stakeholders FK | Name, role, email minimum |
| **Team Engagement: Status summary per team** | "3 open actions, 2 risks" rollup per team expected in all PS dashboards | Low | Actions/Risks tables with team_id FK | Count-based queries |
| **Architecture: Before/after comparison** | Migration/modernization projects universally show "current state" vs "future state" diagrams | Medium | React Flow (exists), dual diagram state | Standard pattern in solution architecture |
| **Architecture: Node status indicators** | Visual distinction (color/icon) for Live/In Progress/Planned nodes expected in all architecture tools | Low | Node metadata, React Flow node styling | Green/yellow/gray or similar |
| **Context Upload: Extraction routing** | If upload feature exists, users expect extracted data to appear in relevant tabs automatically | Medium | Existing document extraction (v2.0), routing logic | Extension of existing pattern |

---

## Differentiators

Features that set this product apart. Not expected baseline, but high value when present.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Portfolio Dashboard: Exceptions panel** | Proactive "what needs attention now" surface — most PM tools require manual scanning | Medium | Business logic to define exceptions (overdue, blocked, high-risk) | Reduces cognitive load; PS-specific value |
| **Portfolio Dashboard: Risk/dependency columns** | Most portfolio views show status only; surfacing risk + dependency at portfolio level is advanced | Medium | Risks table, cross-project dependency tracking | Jira Advanced Roadmaps has this; rare elsewhere |
| **Portfolio Dashboard: Exec action rollup** | "Next exec action needed" at portfolio level — unique to PS delivery tracking | Medium | Actions table, executive flag or priority filter | Not standard PM; valuable for stakeholder mgmt |
| **WBS: Dual template (ADR + Biggy)** | Pre-seeded structures for two workstream types — domain-specific intelligence baked in | Medium | Template definitions, conditional rendering | Competitors have single generic WBS template |
| **WBS: AI auto-classify tasks to WBS nodes** | Intelligent routing of unclassified tasks to correct WBS position — no competitor has this | High | LLM integration, task context analysis, WBS structure awareness | Novel feature; requires prompt engineering |
| **WBS: Generate Plan gap-fill** | AI identifies missing WBS nodes based on project context and auto-suggests additions | High | LLM integration, WBS template knowledge, project context grounding | Novel feature; reduces manual planning burden |
| **Team Engagement: Business Outcomes section** | Explicit outcome tracking (not just task tracking) — strategic layer most PM tools lack | Medium | Outcomes entity (new or enhancement), track assignment | PS delivery value: "why are we here" clarity |
| **Team Engagement: E2E Workflows with step attribution** | Cross-team flow visualization with ownership per step — rare in PM tools | High | Workflow entity, step → team mapping, React Flow | Most tools show org chart OR workflow, not integrated |
| **Team Engagement: Top Focus Areas synthesis** | AI-curated "3-5 highest-leverage threads" — proactive prioritization intelligence | Medium | LLM integration, action/risk/milestone aggregation | Weekly Focus from v4.0 is foundation |
| **Architecture: Track-specific phase visualization** | Dual-track (ADR + AI Assistant) with 5 phases each shown in parallel — PS delivery-specific | Medium | Workstream-aware diagram layout, phase metadata | Reflects actual PS delivery model |
| **Architecture: Team Onboarding Status table** | Per-team onboarding progress tied to architecture — operational view integrated with design view | Medium | Onboarding data (exists), team → onboarding FK | Connects planning with execution state |
| **Context Upload: Multi-entity extraction** | Single doc upload populates 3+ tab types (not just one entity type) — advanced extraction | High | Multi-pass LLM extraction or structured prompt, routing logic | Most tools do single-entity extraction |
| **Context Upload: Missing-data warnings** | "Team Engagement section incomplete" proactive flags after upload — guided data completion | Low | Completeness analysis (exists in v3.0), per-section logic | Extension of existing completeness feature |

---

## Anti-Features

Features to explicitly NOT build in v6.0 (or ever).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Portfolio Dashboard: Real-time collaboration cursors** | Adds WebSocket complexity; portfolio dashboard is review surface (not simultaneous editing) | Standard polling/refresh; optimistic UI updates sufficient |
| **Portfolio Dashboard: Custom widget builder** | Infinite configuration = support burden; PS team has fixed needs | Fixed dashboard layout with configurable filters/sort only |
| **WBS: Gantt-in-WBS inline view** | Dual visualization (WBS tree + Gantt timeline) in one surface causes layout conflicts | Keep WBS and Gantt as separate tabs (already exists in v5.0) |
| **WBS: Resource allocation/leveling** | Enterprise PM feature; PS team uses time tracking separately | Time Tracking tab (v2.0) is correct surface for capacity |
| **WBS: Cost/budget tracking per WBS node** | Out of scope for PS delivery app; finance system is source of truth | No financial tracking at task level |
| **Team Engagement: Inline messaging/chat per team** | Scope creep; Slack is communication layer | Link to Slack channels (MCP integration exists in v1.0) |
| **Team Engagement: Survey/feedback collection** | Adds form builder complexity; ad-hoc feedback via Slack/email works | Manual entry of key feedback in Engagement History |
| **Architecture: Auto-generate diagrams from code** | Inference from codebase is out of scope; manual/upload-driven is correct | Context upload extraction (planned in v6.0) is sufficient |
| **Architecture: Version control/branching for diagrams** | Audit log (v2.0) provides history; branching adds unnecessary complexity | Single current state + audit trail |
| **Context Upload: OCR for handwritten notes** | Low ROI; PS docs are digital (Google Docs, Slides, PDFs) | PDF/DOCX/PPTX extraction (exists in v2.0) covers use cases |
| **Context Upload: Video/audio transcription** | Adds transcription service dependency; meeting notes suffice | Text documents only |

---

## Feature Dependencies

### Portfolio Dashboard (DASH-01–06)
```
Projects table (exists) → Health scoring (exists) → Portfolio aggregation (new)
Milestones (exists) → Risks (exists) → Actions (exists) → Multi-project rollup queries (new)
Recharts (exists) → Portfolio status chart (new)
Global navigation (exists) → Drill-down routing (new)
```

**Blocks:** Nothing (independent feature)
**Blocked by:** Nothing (all dependencies exist)

### Work Breakdown Structure (WBS-01–05)
```
Phase Board (exists, v1.0) → WBS replacement (new)
Tasks table (exists) → WBS node → task FK (new)
Milestones (exists) → WBS node → milestone FK (new)
Dual workstream (ADR/Biggy) template (v4.0) → WBS template structure (new)
LLM integration (exists, v3.0) → AI auto-classify (new) + Generate Plan (new)
Document extraction (exists, v2.0) → Context-upload auto-classify (new)
```

**Blocks:** Task Board (may need refactor to filter by WBS node), Generate Plan skill
**Blocked by:** Nothing (all dependencies exist)

### Team Engagement Overview (TEAM-01–04)
```
Teams tab (exists, v2.0) → Enhanced 5-section structure (new)
Stakeholders (exists) → Team contacts (exists)
Actions/Risks (exists) → Team rollup (new)
Document extraction (exists, v2.0) → Team Engagement extraction (new)
Completeness analysis (exists, v3.0) → Per-section warnings (new)
```

**Blocks:** Nothing (enhancement to existing tab)
**Blocked by:** Nothing (all dependencies exist)

### Architecture Diagram (ARCH-01–04)
```
React Flow (exists, v3.0) → Two-tab diagram (new)
Workstreams (ADR/Biggy) (exists, v4.0) → Track-specific phases (new)
Onboarding data (exists, v1.0) → Team Onboarding Status table (new)
Document extraction (exists, v2.0) → Architecture extraction (new)
```

**Blocks:** Nothing (enhancement to existing tab)
**Blocked by:** Nothing (all dependencies exist)

### Context Upload Expansion (implicit in TEAM/ARCH)
```
Document upload (exists, v3.0) → Multi-pass extraction (enhancement)
Extraction routing (exists, v2.0) → Team Engagement + Architecture routing (new)
Completeness analysis (exists, v3.0) → Missing-data warnings (enhancement)
```

**Blocks:** Nothing (infrastructure enhancement)
**Blocked by:** WBS, Team Engagement, Architecture entity definitions must exist first

---

## Complexity Assessment

| Feature Category | Overall Complexity | Reasoning |
|-----------------|-------------------|-----------|
| Portfolio Dashboard | **Low-Medium** | Aggregation queries + filtering/sorting are well-understood patterns; Recharts already integrated; no novel UI paradigms |
| Work Breakdown Structure | **Medium-High** | Collapsible hierarchy (medium), dual templates (medium), AI auto-classify + Generate Plan (high); most complexity in AI features |
| Team Engagement Overview | **Medium** | 5-section layout (low), rollup queries (low), E2E workflow diagram (medium-high), Business Outcomes entity (medium if new) |
| Architecture Diagram | **Medium** | Two-tab React Flow (low), track-specific layout (medium), onboarding status integration (low); complexity in layout logic |
| Context Upload Expansion | **Medium-High** | Multi-entity extraction routing (high), per-section completeness (low); complexity in extraction prompt engineering |

**Highest-risk features:**
1. **WBS AI auto-classify + Generate Plan** — LLM output must map to WBS structure reliably; hallucination risk
2. **Team Engagement E2E Workflows** — Cross-team flow visualization with step attribution is novel; requires new entity model
3. **Context Upload multi-entity extraction** — Single doc → multiple tab types requires robust routing and error handling

---

## MVP Recommendation

### Must-Have (v6.0 Critical Path)

1. **Portfolio Dashboard: Multi-project table + health summary** — Core portfolio visibility; blocking exec stakeholder value
2. **Portfolio Dashboard: Status chart** — Visual rollup completes portfolio story
3. **WBS: Collapsible hierarchy (manual edit only)** — Replace Phase Board with richer structure; defer AI features to v6.1
4. **Team Engagement: 5-section layout with manual edit** — Structure foundation; defer auto-extraction to v6.1
5. **Architecture: Two-tab diagram with manual edit** — Before/After structure; defer auto-extraction to v6.1

### High-Value (v6.0 if time allows)

6. **Portfolio Dashboard: Exceptions panel** — High PS value; relatively low complexity
7. **Portfolio Dashboard: Drill-down navigation** — UX completeness
8. **WBS: Dual template (ADR + Biggy)** — Domain-specific intelligence; medium complexity but high PS value

### Defer to v6.1+ (AI-intensive)

9. **WBS: AI auto-classify tasks to WBS nodes** — High complexity; requires WBS structure to exist first
10. **WBS: Generate Plan gap-fill** — High complexity; v6.0 can ship with manual WBS editing
11. **Team Engagement: Context-upload extraction** — High complexity; manual entry works for v6.0
12. **Architecture: Context-upload extraction** — High complexity; manual entry works for v6.0
13. **Context Upload: Multi-entity routing expansion** — Depends on Team Engagement + Architecture entity definitions stabilizing

**Rationale:** Ship structural foundations (WBS hierarchy, Team Engagement 5-section layout, Architecture two-tab diagram) with manual editing in v6.0. Add AI-powered auto-population in v6.1 once base structures are validated in production use. Portfolio Dashboard is low-risk and high-value — full feature set deliverable in v6.0.

---

## Integration Points with Existing Features

| v6.0 Feature | Existing Feature | Integration Type | Notes |
|--------------|------------------|-----------------|-------|
| Portfolio Dashboard | Health scoring (v1.0) | **Data consumption** | Aggregate existing per-project health scores |
| Portfolio Dashboard | Global search (v5.0) | **UX pattern reuse** | Similar filter/search interaction model |
| Portfolio Dashboard | Cross-project FTS (v1.0) | **Possible integration** | Search within portfolio table rows |
| WBS | Phase Board (v1.0) | **Replacement** | Migrate existing phase data to WBS structure |
| WBS | Task Board (v1.0) | **FK relationship** | Tasks link to WBS nodes (new parent_id or wbs_node_id FK) |
| WBS | Milestones (v1.0) | **FK relationship** | Milestones link to WBS nodes |
| WBS | Gantt (v5.0) | **Data source** | Gantt can group by WBS node (enhancement) |
| WBS | AI chat (v3.0) | **Data consumption** | Chat can answer "What WBS node should this task be in?" |
| Team Engagement | Teams tab (v2.0) | **Enhancement** | Replaces/extends existing Teams tab structure |
| Team Engagement | Stakeholders (v1.0) | **Data consumption** | Team contacts come from stakeholders table |
| Team Engagement | Actions/Risks (v1.0) | **Data consumption** | Rollup counts per team |
| Team Engagement | Weekly Focus (v4.0) | **Data source** | Top Focus Areas may derive from Weekly Focus output |
| Architecture | React Flow (v3.0) | **Component reuse** | Same diagram library as org charts/workflows |
| Architecture | Workstreams (v4.0) | **Data consumption** | ADR/Biggy tracks shown as parallel lanes |
| Architecture | Onboarding (v1.0) | **Data consumption** | Team Onboarding Status table reads onboarding_phases |
| Context Upload | Document extraction (v2.0) | **Enhancement** | Add Team Engagement + Architecture to extraction routing |
| Context Upload | Completeness analysis (v3.0) | **Enhancement** | Per-section warnings extend existing completeness logic |

---

## Interaction Patterns

### Portfolio Dashboard

**Expected interactions:**
- Filter by health (Green/Yellow/Red), phase, owner, team
- Sort by any column (name, % complete, next milestone date, etc.)
- Search across project names
- Click project row → navigate to that project workspace
- Click exception → navigate to relevant entity (overdue action, blocked milestone)
- Refresh/auto-refresh for updated metrics

**Standard in:** Jira Portfolio, Asana Portfolios, Monday.com Dashboards, Wrike Dashboards

### Work Breakdown Structure

**Expected interactions:**
- Expand/collapse nodes (click chevron icon or double-click)
- Drag-and-drop to reorder nodes at same level
- Drag-and-drop to change parent (re-nest tasks)
- Right-click context menu: Add child, Edit, Delete
- Inline editing of node name/description
- Color-coding by status or workstream
- Breadcrumb trail when drilling into deep hierarchy

**Standard in:** Microsoft Project, Smartsheet, Jira (Work Breakdown), Wrike WBS

**AI-enhanced (differentiator):**
- "Auto-classify tasks" button → LLM reviews unassigned tasks, suggests WBS placement
- "Generate Plan" button → LLM scans project context, suggests missing WBS nodes

### Team Engagement Overview

**Expected interactions:**
- Accordion sections (expand/collapse each of 5 sections)
- Business Outcomes: Add outcome, edit track/status
- Architecture: View integration landscape diagram (may link to Architecture tab)
- E2E Workflows: View workflow diagram, hover for step details
- Teams & Engagement: Expand team card, view contact list, see action rollup
- Top Focus Areas: Inline edit owner/status, mark complete

**Novel pattern:** 5-section composite view is unique to PS delivery domain

### Architecture Diagram

**Expected interactions:**
- Tab switcher: Before State | Current & Future State
- Zoom/pan on diagram (React Flow standard)
- Click node → highlight dependencies, show details panel
- Click node → inline edit label/status
- Color-coded by status (Live = green, In Progress = yellow, Planned = gray)
- Export to PNG/SVG

**Standard in:** Lucidchart, Miro, Visio (but typically static exports; interactive diagram in PM app is differentiator)

### Context Upload Expansion

**Expected interactions:**
- Upload doc → progress indicator
- Upload complete → "Extracted 12 entities" summary
- Click "View extracted data" → navigate to populated tabs
- Warning banner: "Team Engagement section incomplete — 3 teams missing contacts"
- Manual edit extracted data in respective tabs (standard entity CRUD)

**Standard pattern:** Upload → extract → route → review/edit loop (exists in v2.0, v3.0)

---

## Sources

| Source | Type | Confidence |
|--------|------|------------|
| Training knowledge: Jira, Asana, Monday.com, Microsoft Project, Smartsheet, Wrike | Product feature analysis | MEDIUM — Training data pre-Jan 2025; patterns stable but versions may have changed |
| Existing codebase analysis (PROJECT.md, v1.0–v5.0 feature list) | Dependency/integration assessment | HIGH — Direct observation of existing capabilities |
| PM domain best practices (WBS, portfolio management, PS delivery patterns) | Feature categorization | MEDIUM — Established industry patterns; low risk of change |

**Verification gaps:**
- Current Jira Portfolio features (training data likely accurate but unverified)
- Current Asana Portfolios features (attempted WebFetch failed)
- AI-powered task classification features in 2026 tools (training data cutoff Jan 2025)

**Confidence assessment:**
- **Table Stakes:** HIGH confidence — These patterns are foundational and stable across all major PM tools
- **Differentiators:** MEDIUM confidence — AI features are novel; PS-specific patterns are domain knowledge-based
- **Complexity:** MEDIUM-HIGH confidence — Based on existing codebase architecture and PM domain experience

---

## Notes for Roadmap

1. **Phase ordering recommendation:** Portfolio Dashboard (quick wins) → WBS structure (foundation) → Team Engagement + Architecture enhancements (build on structure) → AI features (final layer)

2. **Research flags for phases:**
   - **WBS AI auto-classify:** Will need prompt engineering research; consider Phase-level research flag
   - **E2E Workflows:** Entity model not yet defined; may need data modeling research
   - **Multi-entity extraction:** Routing logic complexity unknown; consider Phase-level research flag

3. **Likely pitfalls:**
   - WBS drag-and-drop state management (React state + DB consistency)
   - LLM hallucination in WBS node suggestions (needs validation loop)
   - Portfolio dashboard performance with 50+ projects (query optimization)
   - Context upload extraction routing errors (need robust fallback)

4. **Low-risk extensions:**
   - Portfolio dashboard can ship incrementally (table → chart → exceptions → drill-down)
   - Team Engagement 5-section layout is mostly UI (low backend complexity)
   - Architecture two-tab diagram is UI enhancement (existing React Flow patterns)

5. **High-risk features:**
   - AI auto-classify + Generate Plan (defer to v6.1 if v6.0 timeline tight)
   - E2E Workflows visualization (new entity model + React Flow complexity)
   - Multi-entity extraction (requires robust prompt engineering + error handling)
