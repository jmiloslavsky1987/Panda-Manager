# Phase 81: Kata Design System Visual Overhaul - Research

**Researched:** 2026-04-28
**Domain:** Design system token migration, CSS architecture, Next.js font loading, icon system replacement, Chrome/layout rebuild
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Token System**
- Build kata-tokens.css from scratch in this phase (no pre-existing file)
- Gray scale: Tailwind zinc/gray steps (50-950) aliased to Kata token names — no custom ramp
- Two-layer token architecture:
  - Palette layer: raw color steps (--kata-gray-50 through --kata-gray-950, --kata-indigo-500, etc.)
  - Semantic layer: --kata-surface, --kata-text-primary, --kata-border, --kata-interactive, etc., mapping to palette
  - shadcn component tokens alias to the semantic layer
- RAG/health status colors defined as Kata semantic tokens: --kata-status-green, --kata-status-amber, --kata-status-red (not ad-hoc Tailwind utilities)
- Dark mode canvas: gray-950 background, gray-900 containers; accent: Indigo #5B5BFF
- Command Rail stays dark regardless of theme (always dark, independent of light/dark toggle)

**Icons and Fonts**
- Inter and JetBrains Mono loaded via `next/font/google` (Next.js self-hosts automatically — no CDN round-trip, no layout shift)
- Material Symbols Outlined: loaded via Google Fonts CDN (`<link>` tag in layout.tsx)
- Icon wrapper: create a single `<Icon name="search" size={16} />` component that renders `<span className="material-symbols-outlined">name</span>`. Files replace `<Search />` with `<Icon name="search" />` — cleaner abstraction, easier to update globally
- Architecture tab BigPanda integration icons are NOT replaced — they are custom images/SVGs specific to integrations and must remain unchanged

**Command Rail (Sidebar)**
- 240px wide, always dark (gray-950), independent of app theme toggle
- Contains: logo + "Panda Manager" header, ⌘K search pill, top nav (Portfolio / Today / Daily Prep), live project list with RAG dot + go-live date in JBM, user footer with settings icon
- Built by rebuilding `Sidebar.tsx` to spec — existing `AppChrome.tsx` suppression pattern (NO_CHROME_PATHS) is preserved

**Page-bar**
- 44px height, spans content area only (left edge at 240px — does NOT overlap the Command Rail)
- Title/breadcrumb on the left; contextual CTAs + theme toggle icon on the right
- CTA injection: React Context (`PageBarContext`) in layout.tsx holds `{ title, ctaSlot }`. Each page sets context via a client wrapper or `usePageBar()` hook. No prop drilling.
- Breadcrumb for workspace pages: Project name only (e.g., "Acme Corp") — tab row already shows active tab, no need to duplicate in breadcrumb
- Theme toggle: Sun/moon icon button only — no label. Switches `<html class="dark">` on main canvas; Command Rail stays dark in both modes

**Portfolio Dashboard Briefing Strip**
- New 3-column card grid section, positioned between the hero stat band and the project grid
- Card content (all computed from existing DB data — no AI calls):
  - Card 1 — Upcoming Go-Lives: Projects with go-live dates in the next 4 weeks (count + inline expandable list)
  - Card 2 — Open High-Severity Risks: Total open risks marked as high/critical severity across portfolio (count + inline expandable list)
  - Card 3 — Projects Needing Attention: Projects with Red health status OR no project update in the last 7 days (count + inline expandable list)
- Click behavior: Card expands inline (same expandedId toggle pattern used in Outputs Library / DailyPrepCard) to show a list of specific items — no navigation away from Portfolio Dashboard

### Claude's Discretion
- Exact Kata token naming convention within the two-layer system (e.g., --kata-color-gray-950 vs --kata-gray-950)
- Specific semantic token names beyond the key ones called out above
- JetBrains Mono application scope implementation (numerals, IDs, dates, durations — target elements via CSS class or data attribute)
- Exact icon name mappings from lucide-react to Material Symbols (lucide `Search` → Material `search`, etc.)
- Loading skeleton vs spinner during briefing card expansion
- Exact KPI strip tinting logic for risky values (threshold for "risky" per metric type)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KDS-01 | Kata token CSS variables (`kata-tokens.css`) imported; shadcn tokens aliased to Kata equivalents; no Tailwind default palette colors in primary UI surfaces | Token architecture section, shadcn aliasing patterns, Tailwind 4 `@theme inline` override |
| KDS-02 | Inter body typeface; JetBrains Mono for numerals/IDs/dates/durations; lucide-react fully replaced with Material Symbols Outlined 400 | Font loading via `next/font/google`, Material Symbols CDN integration, Icon component wrapper, lucide migration map |
| KDS-03 | Left sidebar rebuilt as 240px dark Command Rail (always dark); logo + header, ⌘K search pill, top nav, live project list with RAG dot + JBM go-live date, user footer | Sidebar.tsx rebuild spec, AppChrome.tsx preservation, existing SidebarProjectItem.tsx patterns |
| KDS-04 | 44px page-bar at top of every page; breadcrumb left / CTAs right; theme toggle switches `<html class="dark">` on main canvas only | PageBarContext React Context pattern, HeaderBar replacement strategy, theme toggle localStorage persistence |
| KDS-05 | Portfolio Dashboard rebuilt: hero stat band (JBM 64px count, health breakdown, week metrics), briefing strip (3-column computed cards), 2-column project grid (health-accented cards with progress bar) | Existing PortfolioProject data shape, briefing strip DB query strategy, existing expandedId pattern |
| KDS-06 | Project Workspace rebuilt: 44px page-bar with project name + health badge, tab row, 5-column KPI strip (JBM 28px numerals, tone-tinted risky values), 2-column focus/risks grid | Workspace layout.tsx patterns, WorkspaceTabs.tsx, ProjectHeader.tsx, KPI data available from existing queries |
| KDS-07 | All existing tabs and functionality work identically after visual rebuild; no regressions | File list of all 22 lucide-react files, Architecture tab icon exception, test coverage strategy |
| KDS-08 | Default accent Indigo (#5B5BFF); theme + accent preferences persist to localStorage; dark mode canvas gray-950, container gray-900 | Indigo token override over blue primary, localStorage theme hook, dark mode CSS strategy |
</phase_requirements>

---

## Summary

Phase 81 is a pure visual-layer rebuild — zero data-fetching or API changes. The app is built on Next.js 16 + Tailwind 4 (CSS-first, no config file), with 15 shadcn/ui components that use CSS custom properties (`--primary`, `--background`, `--card`, etc.) via the `@theme inline` mechanism. The Kata Design System token file (`design/styles/kata-tokens.css`) already exists in the repo under the `design/` folder and defines both a palette layer (raw hex colors) and a semantic layer (surface, on-container, stroke, icon tokens) scoped to `.light` and `.dark` classes on `<html>`.

The core migration strategy is: (1) import/adapt `kata-tokens.css` into `globals.css`; (2) extend the `@theme inline` block to alias shadcn's expected tokens (`--primary`, `--background`, etc.) to Kata semantic equivalents; (3) load Inter + JetBrains Mono via `next/font/google`; (4) add the Material Symbols CDN link to `layout.tsx`; (5) create a single `<Icon />` wrapper and run a file-by-file replacement of 22 lucide-react import files; (6) rebuild `Sidebar.tsx` as the Command Rail; (7) replace `HeaderBar` with the new `PageBar` (backed by React Context); (8) rebuild `app/page.tsx` as the new Portfolio Dashboard; and (9) rebuild `app/customer/[id]/layout.tsx` with the 5-column KPI strip and focus/risks grid.

A critical CSS isolation problem exists: the Command Rail must remain dark in light mode. This requires giving the `<aside>` a `data-theme="dark"` attribute (or equivalent Kata class strategy) so it always uses dark semantic tokens, independent of the `<html class="dark">` toggle that governs the main canvas. The Kata tokens file uses `.light` and `.dark` class selectors — the rail needs to be wrapped in or carry a `.dark`-equivalent scope even when the page is in light mode.

**Primary recommendation:** Use the `design/styles/kata-tokens.css` file verbatim as the foundation (it is already correct and complete), adapt the color token naming to the two-layer kata-tokens.css the planner will author, and handle the Command Rail theme isolation with a `data-theme="dark"` wrapper that forces Kata's dark semantic tokens regardless of page mode.

---

## Standard Stack

### Core Technologies
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | ^4 | Utility CSS framework | Already installed; v4 uses CSS-first config via `@theme` |
| next/font/google | (built into Next.js 16.2.0) | Self-hosted Inter + JBM fonts | Zero layout shift, no CDN round-trip, automatic optimization |
| Material Symbols Outlined | Web font via Google Fonts CDN | Icon system | Decision locked; loaded via `<link>` tag in `<head>` |
| class-variance-authority | (installed via shadcn) | Component variants | Already in use by shadcn button/badge components |
| tailwind-merge | ^3.5.0 | Class conflict resolution | Already installed |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577.0 | OUTGOING — being replaced | Do NOT use for new code; only present during migration |
| @tailwindcss/typography | ^0.5.19 | Prose rendering (markdown output) | Adjust existing `.prose` class usage to Kata tokens |

### Alternatives Considered (locked — do not revisit)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next/font/google for Inter/JBM | Google Fonts CDN `<link>` | CDN `<link>` causes FOUT and layout shift — `next/font` self-hosts and injects font-display:swap with preload |
| Material Symbols via CDN `<link>` | `next/font` or npm package | CDN is correct for icon fonts; `next/font` doesn't support variable font-feature-settings needed for Material Symbols weight axis |

### Installation Required
```bash
# No new npm packages needed — Material Symbols is loaded via CDN link tag
# next/font/google is built into Next.js 16
# All other required packages are already installed
```

---

## Architecture Patterns

### Recommended File Structure for New/Changed Files
```
app/
├── globals.css                    # Import kata-tokens.css; extend @theme inline
├── layout.tsx                     # Add Material Symbols <link>, next/font vars, PageBarContext provider
├── page.tsx                       # Full rebuild: hero band + briefing strip + project grid
└── customer/[id]/layout.tsx       # Add page-bar + KPI strip; preserve WorkspaceTabs

components/
├── kata-tokens.css                # NEW: two-layer token file (palette + semantic)
├── Icon.tsx                       # NEW: <Icon name="search" size={16} /> wrapper
├── PageBar.tsx                    # NEW: 44px page-bar with breadcrumb + CTA slot + theme toggle
├── PageBarContext.tsx              # NEW: React Context for { title, ctaSlot }
├── ThemeProvider.tsx              # NEW: client component managing localStorage dark/light toggle
├── CommandRail.tsx                # RENAMED/REBUILT: Sidebar.tsx → CommandRail.tsx (or Sidebar.tsx rebuilt)
├── SidebarProjectItem.tsx         # UPDATED: use Kata tokens + JBM go-live date
├── SidebarUserIsland.tsx          # UPDATED: use Icon wrapper, Kata tokens
├── PortfolioBriefingStrip.tsx     # NEW: 3-column computed briefing cards (server component)
├── PortfolioHeroStats.tsx         # NEW: JBM 64px hero + health breakdown + week metrics
├── PortfolioProjectGrid.tsx       # NEW: 2-col health-accented card grid
├── WorkspacePageBar.tsx           # NEW: workspace-specific page bar with health badge
└── WorkspaceKpiStrip.tsx          # NEW: 5-column KPI strip with JBM 28px numerals
```

### Pattern 1: Two-Layer Kata Token Architecture

**What:** A palette layer defines raw color steps as CSS variables. A semantic layer maps those palettes to intent-based tokens. shadcn's expected token names (`--primary`, `--background`, etc.) are aliased to Kata semantic names within the Tailwind `@theme inline` block.

**When to use:** Always — no component should reference palette tokens directly (e.g., never `var(--kata-gray-950)` in component CSS; always `var(--kata-surface-canvas)` or the Tailwind utility it maps to).

**Token naming convention (Claude's discretion — use these):**
```css
/* kata-tokens.css */

/* === PALETTE LAYER === */
:root {
  /* Use the verbatim Kata color values from design/styles/kata-tokens.css */
  /* Rename --color-* to --kata-* to avoid collision with shadcn/Tailwind internals */
  --kata-gray-50:  #F9FAFB;
  --kata-gray-950: #161819;
  --kata-indigo-500: #5B5BFF;
  --kata-blue-500: #0041F5;
  --kata-green-400: #27BE69;
  --kata-orange-300: #FF8E21;
  --kata-red-500: #D60028;
  --kata-purple-500: #9A53E0;
  /* ... all other palette steps from design/styles/kata-tokens.css */
}

/* === SEMANTIC LAYER — LIGHT === */
.light, :root:not(.dark) {
  --kata-surface-canvas: var(--kata-gray-50);
  --kata-surface-container: #FFFFFF;
  --kata-surface-field: var(--kata-gray-50);
  --kata-on-canvas: #181D1E;
  --kata-on-container: #181D1E;
  --kata-on-container-secondary: #49565A;
  --kata-on-container-tertiary: #607177;
  --kata-stroke-subtle: #C4CDD0;
  --kata-stroke-focus: #528BFF;
  --kata-interactive: var(--kata-indigo-500);    /* Phase 81 accent override */
  --kata-status-green: var(--kata-green-400);
  --kata-status-amber: var(--kata-orange-300);
  --kata-status-red: var(--kata-red-500);
  --kata-icon-ai: var(--kata-purple-500);
}

/* === SEMANTIC LAYER — DARK === */
.dark {
  --kata-surface-canvas: var(--kata-gray-950);
  --kata-surface-container: #202627;
  --kata-surface-field: var(--kata-gray-950);
  --kata-on-canvas: #F9FAFB;
  --kata-on-container: #F9FAFB;
  --kata-on-container-secondary: #E9EDEE;
  --kata-on-container-tertiary: #DBE1E3;
  --kata-stroke-subtle: #81959C;
  --kata-interactive: var(--kata-indigo-500);
  --kata-status-green: #45D985;
  --kata-status-amber: #FF8E21;
  --kata-status-red: #E65671;
}

/* === shadcn ALIAS LAYER (in globals.css @theme inline) === */
/* Maps shadcn's expected token names → Kata semantic tokens */
```

**How to wire into globals.css:**
```css
/* globals.css */
@import './kata-tokens.css';   /* or relative path from globals.css location */
@import 'tailwindcss';
@plugin "@tailwindcss/typography";

@theme inline {
  --color-background: var(--kata-surface-canvas);
  --color-foreground: var(--kata-on-canvas);
  --color-primary: var(--kata-interactive);
  --color-primary-foreground: #ffffff;
  --color-card: var(--kata-surface-container);
  --color-card-foreground: var(--kata-on-container);
  --color-border: var(--kata-stroke-subtle);
  --color-input: var(--kata-stroke-subtle);
  --color-ring: var(--kata-stroke-focus);
  --color-muted: var(--kata-surface-field);
  --color-muted-foreground: var(--kata-on-container-tertiary);
  --color-accent: var(--kata-surface-field);
  --color-accent-foreground: var(--kata-on-container);
  --color-destructive: var(--kata-status-red);
  --color-destructive-foreground: #ffffff;
  --color-secondary: #E9EDEE;
  --color-secondary-foreground: #181D1E;
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jbm);
}
```

### Pattern 2: Command Rail Dark Isolation

**What:** The `<aside>` Command Rail must always use dark semantic tokens regardless of the `<html class="dark">` state of the main canvas.

**When to use:** Always — this is a hard constraint.

**Implementation:** Give the `<aside>` element a `data-theme="dark"` attribute and add a CSS rule in `kata-tokens.css` that triggers dark semantics on `[data-theme="dark"]`:

```css
/* kata-tokens.css — add after the .dark rule */
[data-theme="dark"] {
  /* Copy all --kata-* dark semantic token values here */
  /* (or use @apply .dark equivalent) */
  --kata-surface-canvas: var(--kata-gray-950);
  --kata-surface-container: #202627;
  --kata-on-canvas: #F9FAFB;
  --kata-on-container: #F9FAFB;
  --kata-stroke-subtle: #81959C;
  /* ... all dark semantic tokens */
}
```

**In the rebuilt Sidebar.tsx (Command Rail):**
```tsx
<aside data-theme="dark" className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40"
  style={{ background: 'var(--kata-gray-950)', color: 'var(--kata-on-canvas)' }}>
```

The `data-theme="dark"` ensures the token cascade inside the aside always resolves to dark values, even when the parent `<html>` has no `dark` class (light mode). CSS `data-theme` attribute scoping is universally supported and does not require JavaScript.

### Pattern 3: Theme Toggle with localStorage Persistence

**What:** The sun/moon toggle button writes `localStorage.setItem('kata-theme', 'dark' | 'light')` and toggles `<html class="dark">`. On next load, a script reads the preference before first paint.

**When to use:** Only in the `ThemeProvider` client component and the flash-prevention script.

**Implementation:**
```tsx
// components/ThemeProvider.tsx
'use client'
import { useEffect } from 'react'
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem('kata-theme')
    if (saved === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])
  return <>{children}</>
}

// app/layout.tsx — add inline script to prevent flash:
// <script dangerouslySetInnerHTML={{ __html:
//   `(function(){var t=localStorage.getItem('kata-theme');if(t==='dark')document.documentElement.classList.add('dark')})()`
// }} />
```

**Theme toggle function (in PageBar):**
```tsx
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark')
  localStorage.setItem('kata-theme', isDark ? 'dark' : 'light')
}
```

Note: The Command Rail `<aside data-theme="dark">` is unaffected by this toggle — only `<html class="dark">` changes, which does not remove `data-theme="dark"` from the aside.

### Pattern 4: PageBarContext CTA Injection

**What:** A React Context provides `{ title: string, ctaSlot: ReactNode }`. The `PageBar` component renders from context. Each page sets context via a client wrapper.

**When to use:** Any page needing a page-specific title or action buttons in the page-bar.

```tsx
// components/PageBarContext.tsx
'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface PageBarState {
  title: string
  ctaSlot: ReactNode
  setTitle: (t: string) => void
  setCtaSlot: (slot: ReactNode) => void
}

export const PageBarContext = createContext<PageBarState>({
  title: '',
  ctaSlot: null,
  setTitle: () => {},
  setCtaSlot: () => {},
})

export function PageBarProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('')
  const [ctaSlot, setCtaSlot] = useState<ReactNode>(null)
  return (
    <PageBarContext.Provider value={{ title, ctaSlot, setTitle, setCtaSlot }}>
      {children}
    </PageBarContext.Provider>
  )
}

export function usePageBar() {
  return useContext(PageBarContext)
}
```

**In layout.tsx:** Wrap `<main>` content with `<PageBarProvider>`. `<PageBar>` reads from context. Individual pages call `usePageBar().setTitle('Portfolio')` in a `useEffect` (or via a thin `<PageBarConfigurator title="Portfolio">` client component that calls `setTitle` on mount).

### Pattern 5: Icon Component Wrapper

**What:** A single `<Icon>` component wraps Material Symbols Outlined web font glyphs. Replaces all lucide-react imports across 22 files.

```tsx
// components/Icon.tsx
interface IconProps {
  name: string
  size?: number
  className?: string
  'aria-hidden'?: boolean
}

export function Icon({ name, size = 20, className = '', 'aria-hidden': ariaHidden = true }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
        lineHeight: 1,
        verticalAlign: 'middle',
        userSelect: 'none',
      }}
      aria-hidden={ariaHidden}
    >
      {name}
    </span>
  )
}
```

### Pattern 6: next/font/google Loading

**What:** Inter and JetBrains Mono are loaded via `next/font/google` in `layout.tsx`, then their CSS variable names are passed into the `@theme inline` block.

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jbm = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbm',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

// Apply to <html>:
// <html lang="en" className={`${inter.variable} ${jbm.variable} h-full`}>
```

### Pattern 7: Briefing Strip expandedId Pattern

**What:** A client component with `useState<string | null>(expandedId)`. Clicking a card toggles `expandedId`. If a card's id matches `expandedId`, it renders an inline expandable list.

**Based on:** The same pattern already used in `DailyPrepCard.tsx` and Outputs Library (`expandedId` toggle approach noted in CONTEXT.md code context).

```tsx
// components/PortfolioBriefingStrip.tsx (client component)
'use client'
const [expandedId, setExpandedId] = useState<string | null>(null)

const toggle = (id: string) =>
  setExpandedId(prev => prev === id ? null : id)
```

### Pattern 8: JetBrains Mono Application via CSS Class

**What:** A CSS utility class `.font-mono` (mapped to `var(--font-jbm)` in `@theme inline`) is applied to elements containing numerals, IDs, dates, and durations. Tailwind's `font-mono` class resolves to `var(--font-mono)` in v4, which after the `@theme inline` alias points to JBM.

**CSS class to use:** `font-mono` (standard Tailwind utility). Because `@theme inline` maps `--font-mono: var(--font-jbm)`, every `font-mono` class in the codebase will render JBM automatically.

**Scope of application:**
- All `go_live_target` / milestone date displays
- All numeric KPI values in dashboards
- Project IDs (e.g., "GBX-2026-Q2")
- Duration strings (hours, days-to-go-live)
- Timestamps

### Anti-Patterns to Avoid

- **Using Tailwind color utilities with hardcoded palette names in primary surfaces**: Never `bg-zinc-900` or `text-gray-500` in rebuilt components. Use `bg-[var(--kata-surface-canvas)]` or a Tailwind alias (`bg-background`, `bg-card`, etc.). Exception: Tailwind color classes may remain in components NOT touched by this phase (functional components kept as-is per KDS-07).
- **Putting the Command Rail inside the `<html class="dark">` toggle path**: The rail uses `data-theme="dark"` — never remove this attribute or make it conditional.
- **Adding `useEffect` to Server Components for theme**: Theme initialization script must be an inline `<script>` in `layout.tsx` `<head>` to prevent flash-of-wrong-theme on load.
- **Using `@kata/ui` npm package**: This does not exist as an installable package. Use the verbatim token values from `design/styles/kata-tokens.css` (already in the repo).
- **Copying `design/styles/app.css` verbatim**: It is a prototype reference only. Lift values from it; do not ship it.
- **Replacing Architecture tab icons**: BigPanda integration SVG/images on the Architecture tab must NOT be replaced with `<Icon>` components.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flash of wrong theme on load | Custom localStorage read in useEffect | Inline `<script>` in `<head>` before first paint | useEffect runs after hydration — causes visible flash |
| CSS variable scoping for dark rail | JavaScript that applies styles | CSS `[data-theme="dark"]` selector in kata-tokens.css | Pure CSS; no JS, no flash, no layout shift |
| Self-hosted Inter/JBM fonts | Manual font file hosting | `next/font/google` | Automatic optimization, preloading, zero CLS |
| Icon size variations | Per-icon size prop on lucide | `<Icon size={N}>` + `font-size` CSS | Consistent API across all icons |
| Tailwind 4 theme override | Custom PostCSS plugin | `@theme inline` block in globals.css | Tailwind 4's native CSS variable override mechanism |
| Theme preference storage | Custom cookie or DB field | `localStorage.setItem('kata-theme', ...)` | Standard for client-side theme persistence; matches `<html class="dark">` pattern used by shadcn/radix |

---

## Common Pitfalls

### Pitfall 1: Tailwind 4 `@theme inline` vs. `:root` CSS vars

**What goes wrong:** Developers define `--primary` in `:root {}` expecting it to control Tailwind's `bg-primary` utility. In Tailwind 4, Tailwind utilities read from the `@theme` namespace (prefixed `--color-*`), not from bare `:root` custom properties.

**Why it happens:** Tailwind v3 used `tailwind.config.js` to map CSS vars. Tailwind v4 uses `@theme inline` where you declare `--color-primary: var(--my-css-var)` to bridge the two worlds.

**How to avoid:** Always bridge via `@theme inline`:
```css
@theme inline {
  --color-primary: var(--kata-interactive);     /* ← enables bg-primary Tailwind class */
  --color-background: var(--kata-surface-canvas); /* ← enables bg-background Tailwind class */
}
```
Source: Tailwind v4 documentation — CSS variables in theme configuration.

**Warning signs:** `bg-primary` renders as `bg-transparent` or inherits default blue; Tailwind class applies but color doesn't match Kata token.

### Pitfall 2: shadcn Components Expecting Specific Token Names

**What goes wrong:** shadcn components (button.tsx, badge.tsx, card.tsx, etc.) reference `bg-primary`, `bg-card`, `text-muted-foreground`, `ring-ring`, etc. as Tailwind utilities. If `@theme inline` aliases are missing, components render with shadcn defaults (zinc-based).

**Why it happens:** shadcn v2 ships with a `globals.css` that defines these variables in `:root`. The current `globals.css` only has `--background` and `--foreground`. The 15 shadcn components reference many more tokens.

**How to avoid:** The `@theme inline` alias block must cover ALL tokens used by any shadcn component in `components/ui/`. Key ones:
- `--color-primary` + `--color-primary-foreground`
- `--color-secondary` + `--color-secondary-foreground`
- `--color-destructive` + `--color-destructive-foreground`
- `--color-muted` + `--color-muted-foreground`
- `--color-accent` + `--color-accent-foreground`
- `--color-card` + `--color-card-foreground`
- `--color-border`
- `--color-input`
- `--color-ring`
- `--color-background`
- `--color-foreground`

**Warning signs:** Buttons render with wrong color; badges fall back to generic styling.

### Pitfall 3: Command Rail Dark Isolation Breaking in Light Mode

**What goes wrong:** The Command Rail appears light-colored in light mode because its background resolves to the page-level `--kata-surface-canvas` (white) rather than the dark value.

**Why it happens:** If the Command Rail relies solely on Tailwind `bg-zinc-950` (a hardcoded palette class), it stays dark. But if it uses semantic token classes like `bg-background` that remap under `@theme inline`, it will change with the page theme.

**How to avoid:** Use `data-theme="dark"` on the `<aside>` element and define a `[data-theme="dark"]` CSS rule block that re-declares all Kata semantic tokens to their dark values. The rail's inline styles or CSS classes then reference semantic tokens (`var(--kata-surface-canvas)`, `var(--kata-on-canvas)`) which always resolve to dark values within the `[data-theme="dark"]` scope.

**Warning signs:** Light mode toggle makes the Command Rail turn white or gray.

### Pitfall 4: Existing `sidebar-daily-prep.test.ts` Breaking After Sidebar Rebuild

**What goes wrong:** Test file `tests/components/sidebar-daily-prep.test.ts` reads `Sidebar.tsx` source via `fs.readFileSync` and checks for:
1. `href="/daily-prep"` present
2. `/daily-prep` link appearing before `uppercase tracking-wider`

If the rebuild changes either the href or the CSS classes for the Projects section label, the test breaks.

**Why it happens:** The test uses source-code string matching, not component rendering. Any refactor of the class names for the section label breaks assertion 2.

**How to avoid:** Preserve `href="/daily-prep"` in the rebuilt sidebar. For the Projects section label, keep the `uppercase tracking-wider` classes (or update the test as part of the plan). The test explicitly documents this string-matching approach (`[79-02]` entry in STATE.md).

**Warning signs:** `sidebar-daily-prep.test.ts` Test 2 fails with "projectsSectionPos < 0".

### Pitfall 5: JetBrains Mono `font-variation-settings` Not Applying

**What goes wrong:** JBM loads but renders as normal weight instead of the correct variant because Material Symbols uses `font-variation-settings` and browsers may not handle two variable fonts with the same CSS property on the same element.

**Why it happens:** `font-variation-settings` is set per-element, not per-font-face. If a `<span>` has both Material Symbols (via `material-symbols-outlined` class) and JBM text content, only one `font-variation-settings` value applies.

**How to avoid:** The `<Icon>` component renders a `<span>` with `fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20"` inline style. Never place text + icon in the same `<span>`. JBM elements (numerals, dates) should be separate `<span>` elements from icon `<span>` elements.

### Pitfall 6: Material Symbols Load Order / FOUT

**What goes wrong:** Icons show as text (literal glyph names like "search") during the initial page load before the CDN font loads.

**Why it happens:** The CDN `<link>` for Material Symbols loads asynchronously. If the font hasn't loaded, `<span class="material-symbols-outlined">search</span>` renders the text "search".

**How to avoid:** Add `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous">` and `<link rel="preload">` for the font in the `<head>` in `layout.tsx`. Use `font-display: block` or `optional` for icon fonts to prevent FOUT. The Material Symbols Google Fonts URL already includes `display=swap` by default — confirm this is acceptable or change to `display=block` for production.

### Pitfall 7: Tailwind v4 No Config File

**What goes wrong:** Attempt to add a `tailwind.config.ts` override for custom colors causes Tailwind 4 to enter v3-compatibility mode or silently ignore the file.

**Why it happens:** Tailwind v4 does not use a `tailwind.config.ts` (or the file is optional/non-standard). All theming happens in `globals.css` via `@theme`. The project currently has NO `tailwind.config.ts` file.

**How to avoid:** All color overrides must go in `globals.css` via `@theme inline`. Do not create `tailwind.config.ts`.

---

## Code Examples

Verified patterns from the existing codebase and design reference:

### Token Layer in kata-tokens.css (palette naming)
```css
/* Source: design/styles/kata-tokens.css verbatim values */
:root {
  --kata-gray-50:   #F9FAFB;
  --kata-gray-100:  #E9EDEE;
  --kata-gray-200:  #DBE1E3;
  --kata-gray-300:  #C4CDD0;
  --kata-gray-400:  #81959C;
  --kata-gray-500:  #607177;
  --kata-gray-600:  #49565A;
  --kata-gray-700:  #384144;
  --kata-gray-800:  #2B3134;
  --kata-gray-850:  #2A2D33;
  --kata-gray-900:  #202627;
  --kata-gray-925:  #1B1D21;
  --kata-gray-950:  #161819;
  --kata-indigo-500: #5B5BFF;  /* Phase 81 accent override */
  --kata-blue-500:  #0041F5;
  --kata-green-400: #27BE69;
  --kata-orange-300:#FF8E21;
  --kata-red-500:   #D60028;
  --kata-purple-500:#9A53E0;
}
```

### Command Rail Structure (from design/components/direction-3.jsx)
```tsx
// Source: design/components/direction-3.jsx — D3CommandRail
<aside data-theme="dark" className="fixed left-0 top-0 h-screen w-60 flex flex-col z-40"
  style={{ background: 'var(--kata-gray-950)', borderRight: '1px solid var(--kata-gray-800)' }}>

  {/* Header: logo + name */}
  <div className="flex items-center gap-2 px-4 py-3.5 border-b"
    style={{ borderColor: 'var(--kata-gray-800)' }}>
    <BrandMark size={22} color="white" />
    <span className="font-semibold text-sm text-white">Panda Manager</span>
  </div>

  {/* Search pill */}
  <div className="px-3 py-2.5">
    <div className="flex items-center gap-2 h-7 px-2 rounded-md"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <Icon name="search" size={14} />
      <span className="text-xs flex-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Jump to…</span>
      <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>⌘K</span>
    </div>
  </div>

  {/* Top nav links */}
  {/* ... Portfolio / Today / Daily Prep */}

  {/* Project list */}
  {/* ... SidebarProjectItem components */}

  {/* User footer */}
  <SidebarUserIsland />
</aside>
```

### Hero Stat Band (64px JBM numeral)
```tsx
// Source: design/components/direction-3.jsx — D3PortfolioDashboard hero section
<div className="flex items-end gap-12 px-8 py-8 border-b"
  style={{ background: 'var(--kata-surface-container)', borderColor: 'var(--kata-stroke-subtle)' }}>

  {/* Big count */}
  <div className="flex flex-col gap-2">
    <span className="text-[10px] font-medium uppercase tracking-widest"
      style={{ color: 'var(--kata-on-container-tertiary)' }}>Active engagements</span>
    <span className="font-mono font-semibold tabular-nums"
      style={{ fontSize: 64, lineHeight: 1, letterSpacing: '-0.04em' }}>
      {String(projects.length).padStart(2, '0')}
    </span>
  </div>

  {/* RAG breakdown */}
  {/* ... green/yellow/red dot + JBM 22px count + 12px label */}

  {/* Vertical divider + week metrics */}
</div>
```

### KPI Strip (28px JBM numerals)
```tsx
// Source: design/components/direction-3.jsx — D3ProjectWorkspace KPI strip
<div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
  {kpiColumns.map((k, i) => (
    <div key={i} className="p-4.5"
      style={{ borderRight: i < 4 ? `1px solid var(--kata-stroke-subtle)` : 'none' }}>
      <span className="text-[10px] font-medium uppercase tracking-widest"
        style={{ color: 'var(--kata-on-container-tertiary)' }}>{k.label}</span>
      <div className="mt-1.5">
        <span className="font-mono font-medium tabular-nums"
          style={{
            fontSize: 28, lineHeight: 1, letterSpacing: '-0.01em',
            color: k.tone === 'error'   ? 'var(--kata-status-red)'   :
                   k.tone === 'warning' ? 'var(--kata-status-amber)' :
                   'var(--kata-on-container)'
          }}>{k.value}</span>
      </div>
      <span className="text-[11px] block mt-0.5"
        style={{ color: 'var(--kata-on-container-tertiary)' }}>{k.sub}</span>
    </div>
  ))}
</div>
```

### Project Card with 3px Left Accent Border
```tsx
// Source: design/components/direction-3.jsx — portfolioRows mapping
<div className="rounded-xl border overflow-hidden"
  style={{
    borderLeft: `3px solid ${accentColor}`,
    borderColor: 'var(--kata-stroke-subtle)',
    background: 'var(--kata-surface-container)'
  }}>
  {/* card content */}
  {/* 3px full-bleed progress bar at bottom */}
  <div className="h-[3px]" style={{ background: 'var(--kata-stroke-subtle)' }}>
    <div className="h-full" style={{ width: `${pct}%`, background: accentColor }} />
  </div>
</div>
```

### lucide-react to Material Symbols Icon Map
| lucide Import | Material Symbols name | Files Affected |
|--------------|----------------------|----------------|
| `Check` | `check` | CreateJobWizard.tsx, checkbox.tsx, ProjectWizard.tsx |
| `X` | `close` | dialog.tsx, IntegrationDetailDrawer.tsx, NodeDetailDrawer.tsx |
| `Loader2` | `progress_activity` | IngestionStepper.tsx, WbsGeneratePlanModal.tsx, AiPlanPanel.tsx |
| `CheckCircle` | `task_alt` | IngestionStepper.tsx, GlobalTimeView.tsx, ExceptionsPanel.tsx |
| `XCircle` | `cancel` | IngestionStepper.tsx, GlobalTimeView.tsx |
| `Circle` | `radio_button_unchecked` | IngestionStepper.tsx |
| `Clock` | `schedule` | GlobalTimeView.tsx, ExceptionsPanel.tsx |
| `Download` | `download` | GlobalTimeView.tsx |
| `Trash2` | `delete` | GlobalTimeView.tsx, WbsNode.tsx |
| `Plus` | `add` | GlobalTimeView.tsx, WbsNode.tsx |
| `ChevronDown` | `expand_more` | PortfolioTableClient.tsx, SprintSummaryPanel.tsx, PortfolioExceptionsPanel.tsx, SchedulerJobRow.tsx |
| `ChevronUp` | `expand_less` | PortfolioTableClient.tsx, PortfolioExceptionsPanel.tsx |
| `AlertCircle` | `error` | PortfolioTableClient.tsx |
| `AlertTriangle` | `warning` | DangerZoneSection.tsx, ExceptionsPanel.tsx |
| `Lock` | `lock` | PromptEditModal.tsx |
| `Maximize2` | `open_in_full` | PromptEditModal.tsx |
| `Minimize2` | `close_fullscreen` | PromptEditModal.tsx |
| `Bold` | `format_bold` | PromptEditModal.tsx |
| `Italic` | `format_italic` | PromptEditModal.tsx |
| `Code` | `code` | PromptEditModal.tsx |
| `Heading` | `title` | PromptEditModal.tsx |
| `ChevronRight` | `chevron_right` | SprintSummaryPanel.tsx, SchedulerJobRow.tsx, WbsNode.tsx |
| `RefreshCw` | `refresh` | SprintSummaryPanel.tsx, ExceptionsPanel.tsx, ScanForUpdatesButton.tsx |
| `Archive` | `archive` | ArchivedBanner.tsx |
| `GripVertical` | `drag_indicator` | WbsNode.tsx |
| `Sparkles` | `auto_awesome` | WbsGeneratePlanModal.tsx, AiPlanPanel.tsx |
| `BookOpen` | `menu_book` | Sidebar.tsx |
| `CalendarClock` | `event_available` | Sidebar.tsx |
| `Library` | `inventory_2` | Sidebar.tsx |
| `Settings` | `settings` | Sidebar.tsx, SidebarUserIsland.tsx |
| `CalendarDays` | `event_note` | Sidebar.tsx |
| `LogOut` | `logout` | SidebarUserIsland.tsx |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind config.js color customization | `@theme inline` CSS block in globals.css | Tailwind v4 | No config file needed; all theming in CSS |
| `next/font/google` with `import` at module top | Same pattern, but paired with CSS variable names | Next.js 13+ | Must pass `.variable` className to `<html>` element |
| `class="dark"` on `<html>` via cookie | `localStorage` + inline `<script>` for instant application | Current standard | Prevents flash; no server round-trip for theme |
| lucide-react icon components | Material Symbols web font (icon font) | Phase 81 decision | Single font load vs. per-icon JS bundle; no tree-shaking but simpler API |

**Deprecated/outdated patterns in this codebase:**
- `bg-zinc-900 w-60` on the Sidebar: Replace with Kata token-based dark bg via `data-theme="dark"` + CSS vars.
- `system-ui` font-family in `body`: Replace with `var(--font-inter)` via `@theme inline --font-sans` alias.
- `GlobalProjectSearchBar` inside `HeaderBar`: HeaderBar is replaced by `PageBar` in this phase; GlobalProjectSearchBar suppression logic needs to migrate to the new page-bar.
- Hardcoded `#18181b` for `--sidebar-bg` in globals.css: Remove; use `var(--kata-gray-950)` instead.

---

## Open Questions

1. **`HeaderBar` vs `PageBar` replacement strategy**
   - What we know: `HeaderBar` currently suppresses itself on `/login`, `/setup`, and `/customer/` routes. The new `PageBar` must suppress on the same routes. `HeaderBar` renders `GlobalProjectSearchBar` only on portfolio/non-workspace pages.
   - What's unclear: Should `GlobalProjectSearchBar` be removed entirely (⌘K search pill in the Command Rail replaces it) or kept as a CTA slot element for non-workspace pages?
   - Recommendation: The `GlobalProjectSearchBar` is replaced by the ⌘K pill in the Command Rail. Remove `HeaderBar` entirely; add `PageBar` with a CTA slot that each page populates.

2. **Portfolio page "week metrics" data source**
   - What we know: The hero stat band needs "tasks closed this week", "milestones hit this week", "overdue", "updates logged", and "AI suggestions" counts. `PortfolioProject` type (from `getPortfolioData`) does not currently expose per-project week-scoped task/milestone counts.
   - What's unclear: Whether these week metrics need new DB queries or can be computed from existing `PortfolioProject` aggregates.
   - Recommendation: Add a `getPortfolioWeekMetrics()` query function that aggregates across all active projects for the current week. Keep it as a separate server-side fetch in `app/page.tsx`.

3. **Briefing Strip data availability**
   - What we know: Card 1 (Upcoming Go-Lives) uses `go_live_target` from projects. Card 2 (Open High-Severity Risks) needs aggregated open high/critical risks across portfolio. Card 3 (Projects Needing Attention) needs red health OR no update in 7 days — "last update" may not be a readily available field.
   - What's unclear: What constitutes a "project update" for the staleness check (engagement history entry? note? status update?).
   - Recommendation: Use `engagementHistory` table — if no entry with `project_id` and `created_at > 7 days ago` exists, mark as stale. Plan should add a `getPortfolioBriefingData()` query function.

4. **Workspace KPI strip data source**
   - What we know: The KPI strip needs Phase, Progress %, Days to go-live, Open risks count, and Velocity. Most of these exist in `ProjectWithHealth` (high risks, go-live date) and `PortfolioProject` (percentComplete, currentPhase).
   - What's unclear: "Days to go-live" requires `go_live_target` date math. "Velocity" is `velocityWeeks` array in `ProjectWithHealth`.
   - Recommendation: The workspace `layout.tsx` already fetches `project` via `getProjectWithHealth()`. This returns `ProjectWithHealth` which has `velocityWeeks`, `highRisks`, `go_live_target`. `percentComplete` requires a separate workstream query or reuse `getPortfolioData()`. Simplest: add a targeted server query in the workspace layout.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` — validation section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts at `/Users/jmiloslavsky/Documents/Panda-Manager/vitest.config.ts`) |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run --reporter=verbose tests/components/` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KDS-01 | kata-tokens.css imported; shadcn tokens aliased | unit (source scan) | `npx vitest run tests/kds/token-import.test.ts` | ❌ Wave 0 |
| KDS-02 | Inter/JBM loaded via next/font; lucide-react fully removed from source | unit (source scan) | `npx vitest run tests/kds/icon-migration.test.ts` | ❌ Wave 0 |
| KDS-03 | Command Rail: /daily-prep present; appears before Projects section | unit (source scan) | `npx vitest run tests/components/sidebar-daily-prep.test.ts` | ✅ EXISTS |
| KDS-03 | Command Rail: always dark (data-theme="dark" on aside) | unit (source scan) | `npx vitest run tests/kds/command-rail.test.ts` | ❌ Wave 0 |
| KDS-04 | PageBarContext exported from layout or context file | unit (source scan) | `npx vitest run tests/kds/page-bar.test.ts` | ❌ Wave 0 |
| KDS-05 | Portfolio page renders hero stat band, briefing strip, project grid | unit (source scan) | `npx vitest run tests/kds/portfolio-layout.test.ts` | ❌ Wave 0 |
| KDS-06 | WorkspaceKpiStrip component exists with 5 columns | unit (source scan) | `npx vitest run tests/kds/workspace-kpi.test.ts` | ❌ Wave 0 |
| KDS-07 | All lucide-react imports removed from 22 source files (non-Architecture) | unit (source scan) | included in `tests/kds/icon-migration.test.ts` | ❌ Wave 0 |
| KDS-08 | ThemeProvider uses localStorage 'kata-theme' key; dark mode sets canvas gray-950 | unit (source scan) | `npx vitest run tests/kds/theme-persistence.test.ts` | ❌ Wave 0 |

**Note:** KDS-07 regression testing (all tabs functional) is manual verification — automated browser testing is out of scope. The automated tests use the source-scan pattern established in Phase 79 (`sidebar-daily-prep.test.ts`) which reads source files via `fs.readFileSync`. This is the correct approach for Next.js Server Components that cannot be rendered in vitest's node environment.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/kds/ tests/components/sidebar-daily-prep.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/kds/token-import.test.ts` — covers KDS-01: verifies `@import` of kata-tokens.css in globals.css and presence of `@theme inline` aliases
- [ ] `tests/kds/icon-migration.test.ts` — covers KDS-02 + KDS-07: scans all 22 lucide-react import files for removal; verifies Icon.tsx exists; verifies no lucide-react imports remain in non-Architecture components
- [ ] `tests/kds/command-rail.test.ts` — covers KDS-03: verifies Sidebar.tsx contains `data-theme="dark"`, ⌘K search pill markup, and top nav links (Portfolio/Today/Daily Prep)
- [ ] `tests/kds/page-bar.test.ts` — covers KDS-04: verifies PageBarContext.tsx exists; verifies PageBar.tsx contains theme toggle button and ctaSlot render
- [ ] `tests/kds/portfolio-layout.test.ts` — covers KDS-05: scans app/page.tsx source for hero stat band, briefing strip, and project grid component imports
- [ ] `tests/kds/workspace-kpi.test.ts` — covers KDS-06: verifies WorkspaceKpiStrip.tsx exists with 5-column grid structure
- [ ] `tests/kds/theme-persistence.test.ts` — covers KDS-08: verifies ThemeProvider.tsx uses `'kata-theme'` localStorage key; verifies inline flash-prevention script in layout.tsx

---

## Sources

### Primary (HIGH confidence)
- `design/styles/kata-tokens.css` (in repo) — complete Kata Design System token values for light and dark themes, all color primitives, typography scale
- `design/README.md` (in repo) — authoritative implementation guide for Direction 3 Command Workspace, migration order, design specs
- `design/components/direction-3.jsx` (in repo) — pixel-level reference implementation for Command Rail, Portfolio Dashboard, Project Workspace
- `design/components/chrome.jsx` (in repo) — Icon component pattern, BrandMark SVG
- Next.js 16.2.0 `next/font/google` — built into installed version; `Inter` and `JetBrains_Mono` exports confirmed available

### Secondary (MEDIUM confidence)
- Tailwind v4 `@theme inline` CSS variable bridging — documented in Tailwind v4 migration guide; confirmed via existing `@theme inline` block in `app/globals.css` (lines 12-16)
- Material Symbols Outlined weight axis and `font-variation-settings` — Google Fonts documentation; the existing `design/styles/app.css` confirms the CSS class pattern and `font-variation-settings` approach

### Tertiary (LOW confidence)
- `data-theme="dark"` CSS attribute selector scoping for rail dark isolation — standard CSS pattern; not explicitly documented in Kata design files but follows the same structural principle as `.dark` class scoping

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed; token file verbatim in repo; design reference file complete
- Architecture: HIGH — existing component structure well-understood; token import approach verified against Tailwind 4's `@theme inline` mechanism already in use
- Pitfalls: HIGH — most pitfalls discovered via direct code inspection of existing globals.css, shadcn component tokens, and existing test patterns
- Lucide migration map: MEDIUM — icon name mappings are Claude's judgment based on semantic equivalence; individual icon names should be verified against Material Symbols documentation if exact glyphs matter

**Research date:** 2026-04-28
**Valid until:** 2026-06-01 (stable stack; Tailwind 4 is in active development but core `@theme inline` API is stable)
