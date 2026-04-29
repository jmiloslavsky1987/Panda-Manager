# Phase 81: Kata Design System Visual Overhaul - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Full visual rebuild on the Kata Design System: token layer (kata-tokens.css), typography (Inter + JetBrains Mono via next/font), icon replacement (lucide-react → Material Symbols Outlined), chrome rebuild (240px Command Rail sidebar + 44px page-bar), Portfolio Dashboard rebuild (hero stat band + briefing strip + project grid), and Project Workspace rebuild (page-bar + KPI strip + focus/risks grid). No changes to data-fetching logic, API routes, or functional behavior.

</domain>

<decisions>
## Implementation Decisions

### Token System
- Build kata-tokens.css from scratch in this phase (no pre-existing file)
- Gray scale: Tailwind zinc/gray steps (50–950) aliased to Kata token names — no custom ramp
- Two-layer token architecture:
  - **Palette layer**: raw color steps (--kata-gray-50 through --kata-gray-950, --kata-indigo-500, etc.)
  - **Semantic layer**: --kata-surface, --kata-text-primary, --kata-border, --kata-interactive, etc., mapping to palette
  - shadcn component tokens alias to the semantic layer
- RAG/health status colors defined as Kata semantic tokens: --kata-status-green, --kata-status-amber, --kata-status-red (not ad-hoc Tailwind utilities)
- Dark mode canvas: gray-950 background, gray-900 containers; accent: Indigo #5B5BFF
- Command Rail stays dark regardless of theme (always dark, independent of light/dark toggle)

### Icons & Fonts
- **Inter** and **JetBrains Mono** loaded via `next/font/google` (Next.js self-hosts automatically — no CDN round-trip, no layout shift)
- **Material Symbols Outlined**: loaded via Google Fonts CDN (`<link>` tag in layout.tsx)
- **Icon wrapper**: create a single `<Icon name="search" size={16} />` component that renders `<span className="material-symbols-outlined">name</span>`. Files replace `<Search />` with `<Icon name="search" />` — cleaner abstraction, easier to update globally
- **Architecture tab icons**: BigPanda integration icons on the Architecture tab are NOT replaced — they are custom images/SVGs specific to integrations and must remain unchanged

### Command Rail (Sidebar)
- 240px wide, always dark (gray-950), independent of app theme toggle
- Contains: logo + "Panda Manager" header, ⌘K search pill, top nav (Portfolio / Today / Daily Prep), live project list with RAG dot + go-live date in JBM, user footer with settings icon
- Built by rebuilding `Sidebar.tsx` to spec — existing `AppChrome.tsx` suppression pattern (NO_CHROME_PATHS) is preserved

### Page-bar
- 44px height, spans content area only (left edge at 240px — does NOT overlap the Command Rail)
- Title/breadcrumb on the left; contextual CTAs + theme toggle icon on the right
- **CTA injection**: React Context (`PageBarContext`) in layout.tsx holds `{ title, ctaSlot }`. Each page sets context via a client wrapper or `usePageBar()` hook. No prop drilling.
- **Breadcrumb for workspace pages**: Project name only (e.g., "Acme Corp") — tab row already shows active tab, no need to duplicate in breadcrumb
- **Theme toggle**: Sun/moon icon button only — no label. Switches `<html class="dark">` on main canvas; Command Rail stays dark in both modes

### Portfolio Dashboard — Briefing Strip
- New 3-column card grid section, positioned between the hero stat band and the project grid
- Card content (all computed from existing DB data — no AI calls):
  - **Card 1 — Upcoming Go-Lives**: Projects with go-live dates in the next 4 weeks (count + inline expandable list)
  - **Card 2 — Open High-Severity Risks**: Total open risks marked as high/critical severity across portfolio (count + inline expandable list)
  - **Card 3 — Projects Needing Attention**: Projects with Red health status OR no project update in the last 7 days (count + inline expandable list)
- **Click behavior**: Card expands inline (same expandedId toggle pattern used in Outputs Library / DailyPrepCard) to show a list of specific items — no navigation away from Portfolio Dashboard

### Claude's Discretion
- Exact Kata token naming convention within the two-layer system (e.g., --kata-color-gray-950 vs --kata-gray-950)
- Specific semantic token names beyond the key ones called out above
- JetBrains Mono application scope implementation (numerals, IDs, dates, durations — target elements via CSS class or data attribute)
- Exact icon name mappings from lucide-react to Material Symbols (lucide `Search` → Material `search`, etc.)
- Loading skeleton vs spinner during briefing card expansion
- Exact KPI strip tinting logic for risky values (threshold for "risky" per metric type)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/AppChrome.tsx`: NO_CHROME_PATHS suppression pattern must be preserved. Command Rail rebuild replaces `Sidebar.tsx`, not the AppChrome wrapper.
- `components/Sidebar.tsx`: Current `bg-zinc-900 w-60` sidebar — full rebuild target. `SidebarProjectItem.tsx` and `SidebarUserIsland.tsx` are candidate sub-components to refactor.
- `components/ui/` (15 shadcn components): alert, badge, button, card, checkbox, dialog, input, label, popover, select, separator, table, tabs, textarea, tooltip — all need shadcn tokens aliased to Kata semantic layer
- `app/page.tsx` (Portfolio Dashboard): Currently `<div className="p-6 space-y-6">` with PortfolioSummaryChips + PortfolioTableClient + PortfolioExceptionsPanel. Full rebuild — new hero band, briefing strip, project grid replace current layout.
- `app/globals.css`: Minimal vars (--background, --foreground, --sidebar-bg). kata-tokens.css import goes here; existing vars become aliases or are replaced.

### Established Patterns
- `expandedId` toggle pattern (Outputs Library, DailyPrepCard): Use for briefing card inline expansion
- `prose prose-zinc prose-sm max-w-none` Tailwind classes: Adjust to Kata token equivalents in typography pass
- `requireSession()` at route handlers: Not affected by this phase
- 21 files import lucide-react: Icon migration touches components/ and app/ — systematic codemod or file-by-file pass required

### Integration Points
- `app/layout.tsx`: Add `<link>` for Material Symbols CDN, configure `next/font/google` for Inter + JetBrains Mono, wrap children with `PageBarContext` provider
- `app/globals.css`: Import kata-tokens.css, override `@theme inline` with Kata font vars, replace `system-ui` font-family
- `tailwind.config.ts` (if it exists): Override Tailwind default palette to point to Kata CSS vars — prevents non-Kata colors from leaking into component classes
- All 21 lucide-react import files: Replace with `<Icon />` wrapper component

</code_context>

<specifics>
## Specific Ideas

- Architecture tab BigPanda integration icons must NOT be replaced with Material Symbols — they are custom integration-specific images
- JBM 64px for the portfolio project count (hero stat band) and JBM 28px for workspace KPI numerals — these sizes are spec, not discretionary
- Command Rail is always dark regardless of theme: this is a hard constraint, not a soft preference — the main canvas inverts, the rail does not

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 81-kata-design-system-overhaul*
*Context gathered: 2026-04-28*
