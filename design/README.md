# Handoff — Panda Manager Modernization (Direction 3: "Command Workspace")

## Overview

This package modernizes the existing **Panda Manager** app — a BigPanda Professional Services tool used by project managers to run customer engagements (Acme Corp, Globex, Initech, etc.). The current app is a Next.js + shadcn-based admin console that "feels generic." The redesign brings it into the **Kata Design System** (BigPanda's internal React/TS DS) with an opinionated AI-forward layout we're calling **Command Workspace**.

The goal of this handoff is to give a developer using Claude Code everything they need to apply this direction to the **existing codebase** (`github.com/jmiloslavsky1987/Panda-Manager`), not to ship the HTML files as-is.

## About the design files

The HTML/JSX files in this folder are **design references**, not production code. They are React prototypes rendered in a single static HTML page using inline Babel transpilation, with hand-rolled fixtures and inline styles. The components borrow Kata's tokens but do not import the real Kata packages.

Your task is to **recreate these designs inside the existing `Panda-Manager` Next.js app**, using its real component library — meaning:
- Replace shadcn/ui primitives with `@kata/ui` (`Button`, `Badge`, `Card`, `Table`, `Sidebar`, `Combobox`, `Sonner`, etc.)
- Replace lucide-react icons with `@kata/icons` (Material Symbols Outlined 400 baseline)
- Replace the Tailwind default palette with Kata's semantic CSS variables
- Replace `system-ui` with Inter (UI) + JetBrains Mono (numerals/IDs)

## Fidelity

**High-fidelity.** Colors, type, spacing, and component structure are all final. Recreate pixel-for-pixel, but use the real Kata primitives — do not copy the inline-styled JSX in this bundle verbatim.

The one exception: the prototype's `chrome.jsx` and `direction-3.jsx` files use hand-rolled `<aside>` and inline styles instead of `@kata/components`'s `Topbar` and `Sidebar`. In production, lift the real Kata chrome and only override what's specific to Panda Manager (the project list rendering inside the sidebar, the AI rail, etc.).

---

## Direction 3 — Command Workspace

A **three-rail layout** that treats AI as a first-class surface:

```
┌────────────┬─────────────────────────────────────┬────────────────┐
│            │  Page-bar (44px, breadcrumb + CTAs) │                │
│  Command   ├─────────────────────────────────────┤   Assistant    │
│   Rail     │                                     │     Rail       │
│  (240, dk) │  Tabs                               │  (320, light)  │
│            ├─────────────────────────────────────┤                │
│  Search    │                                     │  AI insight    │
│  Portfolio │  KPI strip (5 columns)              │  card          │
│  Today     │                                     │                │
│  AI Brief  │  Main content (cards/grid)          │  Suggestion    │
│            │                                     │  card          │
│  Engagements (live project list)               │                │
│   • Acme                                       │  Quick prompts │
│   • Globex (active)                            │  Activity      │
│   ...                                          │                │
│            │                                     │  Composer      │
│  User      │                                     │  ("Ask…")      │
└────────────┴─────────────────────────────────────┴────────────────┘
```

The active accent color is **Indigo (`#5B5BFF`)** in **dark mode**, but the design supports the full Kata accent set (Blue, Indigo, Teal, Graphite, Panda Black) and both light/dark.

---

## Screens / views

### 1. Portfolio Dashboard

**Purpose:** PM lands here in the morning to see all 7 active engagements, their health, and what needs attention.

**Layout (top-to-bottom):**

1. **Page-bar** (44px tall, `surface-container` bg, `stroke-subtle` bottom border)
   - Left: "Portfolio" (13px/500), divider, `Mon · Apr 28 · Wk 18` in JetBrains Mono 11px
   - Right: Filter / Sort chips, "Brief me" secondary button (with `auto_awesome` icon in `icon-ai` purple), "+ New project" primary button.

2. **Hero stat band** (32px padding, `surface-container` bg, `stroke-subtle` bottom border)
   - **Big number:** "07" in JetBrains Mono 64px/600, `-0.04em` tracking
   - **Health breakdown:** vertical list of three rows — green/yellow/red dot + JBM 22px count + 12px label ("healthy", "at risk", "critical")
   - **Vertical divider** (1px, 92px tall)
   - **This week metrics:** 5-column row of `<count> / <label>` pairs — tasks closed, milestones hit, overdue (red), updates logged, AI suggestions (purple)

3. **AI briefing strip** (canvas bg, `stroke-subtle` bottom)
   - Section header: `auto_awesome` icon + "AI briefing — what needs you today" + freshness ("Generated 14m ago · claude-sonnet-4.5") in JBM 11px right-aligned
   - 3-column grid of cards. Each card: tone-colored border (`stroke-error`, `stroke-warning`, `stroke-ai`), 14px small-caps icon + title (13px/500), 12px supporting copy in `on-container-as-secondary`.

4. **Project grid**
   - "All engagements · 7" header
   - 2-column grid of `ProjectCard`s. Each card has a **3px left accent border** in the health color, then:
     - Title (15px/500) + `Healthy/At risk/Critical` badge with dot
     - Meta row: track · phase · owner avatar+name (11px tertiary)
     - **3-column metric strip:** Progress (JBM 22px + small "%"), Next milestone (label + date in JBM), Velocity (sparkline)
     - Optional AI-suggestion count, right-aligned, in purple
     - Bottom **3px progress bar** in the health color (full-bleed, no radius)

### 2. Project Workspace (e.g. Globex Industries)

**Purpose:** The PM's daily working surface for one engagement. Tabs: Overview, Plan, Gantt, Stakeholders, Risks, Decisions, Artifacts, Skills, Time.

**Layout (top-to-bottom):**

1. **Page-bar** (44px) — apartment icon + "Globex Industries" (13px/500) + `At risk` badge + divider + "GBX-2026-Q2 · Biggy" (JBM 11px tertiary). Right: Export / Log update buttons.

2. **Tabs row** — same `surface-container` bg, 12px/500 tab labels, 2px blue underline on active.

3. **KPI strip** (one card, 5 columns separated by hairlines):
   | Phase | Progress | Days to go-live | Open risks | Velocity |
   |---|---|---|---|---|
   | Build | 54% | 12 | 5 | ↓ 38% |
   | Sprint 7 of 12 | +6% w-o-w | May 02, 2026 | 2 high · 3 medium | vs prior sprint |
   - Numerals use JetBrains Mono 28px/500 with `-0.01em` tracking
   - Tone-tinted color for risky values (warning orange, error red)

4. **2-column grid:**
   - **Left (2fr): "This week's focus"** card with header (week range in JBM) and a list of tasks. Each row: status icon (block/autorenew/radio_button_unchecked/auto_awesome) + task text + assignee avatar + due date (JBM) + status badge.
   - **Right (1fr): "Open risks"** card with severity-tinted dot badges, risk text, age in days (JBM).

### Right rail — Assistant (320px, present on every project surface)

- **Header:** AI sparkle avatar + "Assistant" (13px/500) + scope chip "scoped: Globex"
- **Risk-detected card:** `surface-ai-subtle` bg, `stroke-ai` border, 10px radius. Warning icon + uppercase label, paragraph with **inline mono numerals** for time/percentage, primary "Create escalation" button (purple) + ghost "Dismiss"
- **Suggested action card:** white card, lightbulb icon, paragraph with mono numerals, "Accept" / "Edit" buttons
- **Quick prompts:** "Try asking" label-sm-upper, then 4 outlined `field` chips with `north_east` icon + prompt text (max 4 words each in copy: "Draft this week's status report", "Who hasn't logged time since Friday?", "Compare velocity to last sprint", "Surface decisions awaiting signoff")
- **Recent activity:** AI events get the purple sparkle avatar; humans get initials avatars
- **Composer (sticky bottom):** field-bg pill, 8px radius, `auto_awesome` purple icon + placeholder "Ask anything about Globex…" + mic + send-arrow

### Left rail — Command rail (240px, dark, present on every page)

- Always dark (`gray-950` bg, white-ish text). Independent of theme — **the command rail does NOT lighten in light mode**, mirroring Kata's "topbar is always dark" rule.
- **Header:** BrandMark + "Panda Manager" + version pill ("v2.4") in JBM 10px
- **Search:** "Jump to…" pill with ⌘K hint
- **Top nav:** Portfolio, Today, AI Briefing (with purple count badge "3")
- **"Engagements" section** with + button. Live project list. Active project gets `rgba(255,255,255,0.08)` bg + 2px `blue-400` left border. Each row: RAG dot + project name + go-live date in JBM 10px tertiary.
- **Footer:** user avatar (purple, matches Kata's `topbar-avatar` token) + name + "BigPanda PS" + settings cog

---

## Interactions & behavior

| Interaction | Behavior |
|---|---|
| Click project in command rail | Navigate to `/projects/[id]` (the workspace); no full-page reload — Next.js route segment swap |
| Click tab in workspace | Update `?tab=` query param, swap tab content. Use Next.js `<Link scroll={false}>`. |
| Click "Brief me" in page-bar | Open AI assistant rail (if collapsed) and trigger a fresh briefing — pin briefing card to top |
| Click "Create escalation" / "Accept" on AI cards | Show `Sonner` toast confirming action, then fade the card out (200ms opacity transition). Never auto-apply without explicit click. |
| Hover row in tables / focus cards | One step on the shade scale (e.g. `surface-secondary-subtle-hover`). **No lift, no scale.** |
| Focus | 2px blue ring with 2px offset (`focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-2`) |
| AI sparkle elements | Solid purple, no animation by default. Optional 1.2s pulsing opacity (0.6 → 1.0) reserved for "thinking" / pending states only. |
| Composer submit | Show inline Skeleton in the assistant rail while the response streams. Use `@kata/ui`'s `Skeleton`. |
| Theme toggle | Persist to localStorage. Toggles `<html class="dark">` only on the main canvas; command rail stays dark. |
| Accent toggle (if exposed in Settings) | Recolor `--color-surface-primary`, `-hover`, `-subtle`, `--color-on-primary-subtle`, `--color-stroke-focus`, `--color-icon-interactive`, `--color-on-container-as-link`. **Never recolor semantic tokens** (`success`/`warning`/`error`/`ai`). |

## State management

State the workspace needs:
- `activeProjectId` — from route segment, no client state
- `activeTab` — from `?tab=` query param
- `assistantPanelOpen` — local state, persisted to localStorage
- `accentPreset`, `theme` — user preferences, persisted to user profile + localStorage
- `aiBriefing` — server-fetched on dashboard load, refreshed on "Brief me"; cache for 15min
- `aiSuggestions` — server-fetched per project on workspace mount; freshness shown in UI
- `activity` — server-streamed feed (optimistic updates on user actions)

Use the existing data-fetching patterns in `Panda-Manager`. Don't refactor those as part of this work.

---

## Design tokens

All tokens come from `styles/kata-tokens.css` in this bundle (verbatim copy of `@kata/design/tokens` flattened to CSS). Notable values used by this direction:

### Color (light mode defaults)
| Token | Hex | Usage |
|---|---|---|
| `--color-surface-canvas` | `#F9FAFB` | Page bg |
| `--color-surface-container` | `#FFFFFF` | Card bg, page-bar bg |
| `--color-surface-field` | `#F9FAFB` | Field bg, table head bg, "field-style" cards |
| `--color-surface-primary` | `#0041F5` (blue) / `#5B5BFF` (indigo) | Primary buttons, focus, blue accents |
| `--color-surface-ai-subtle` | `#F3E8FF`-ish | AI card bg |
| `--color-icon-ai` | purple-500 | AI sparkles |
| `--color-stroke-subtle` | `#C4CDD0` | All hairlines |
| `--color-stroke-focus` | matches primary | Focus rings |
| `--color-gray-950` | near-black | Command rail bg |

### Color (dark mode)
- Canvas: `gray-950`, container: `gray-900`, field: `gray-925` (a hair lighter than canvas)
- Tokens automatically swap via `<html class="dark">`
- Command rail stays the same dark — it's already dark in light mode

### Type
| Class / spec | Value |
|---|---|
| Body default | Inter 400, 14px / 1.45 |
| `label-sm-upper` | Inter 500, 11px, uppercase, +0.06em tracking |
| Page H1 (workspace breadcrumb) | Inter 500, 24–28px, -0.01em tracking |
| Hero numeral (dashboard "07") | JetBrains Mono 600, 64px / 1.0, -0.04em tracking |
| KPI numerals (workspace strip) | JetBrains Mono 500, 28px / 1.0, -0.01em tracking |
| Sparkline / metric numerals | JetBrains Mono 500, 22px |
| IDs / dates / durations | JetBrains Mono 400, 11–12px, in `on-container-as-tertiary` |

**Rule:** mono is for things you'd want to copy-paste (IDs, timestamps), or counts you scan rapidly. Never for prose.

### Spacing
2px base unit. Most-used: 8 / 12 / 16 / 24 / 32. Page-bar height 44, tab row 38, card radius 12, button height 32 (default), 28 (small in chrome).

### Radius / shadow
- Cards: 12px radius, 1px `stroke-subtle` border, `0 1px 2px rgba(0,0,0,0.03)`
- Pills/badges: full radius
- Buttons: 6px radius
- No heavy shadows. No frosted glass. No gradients.

---

## Assets

- **Brand mark:** `bp-logo.svg` from `@kata/design`. The prototype uses an inline SVG fallback — replace with the real one.
- **Icons:** Material Symbols Outlined 400 (web font in prototype, `@kata/icons` package in production). Specific glyphs used:
  - Navigation: `dashboard`, `view_quilt`, `today`, `event_note`, `menu_book`, `inventory_2`, `folder_open`, `schedule`, `settings`
  - State: `auto_awesome`, `priority_high`, `block`, `autorenew`, `radio_button_unchecked`, `report`, `warning`, `task_alt`, `lightbulb`
  - Actions: `add`, `search`, `filter_list`, `sort`, `ios_share`, `arrow_forward`, `chevron_right`, `north_east`, `arrow_upward`, `mic`, `close`, `expand_less`
  - Misc: `apartment`, `flag`, `rocket_launch`, `person`, `notifications`, `help_outline`, `view_list`, `grid_view`, `error`, `check`

- **Avatars:** Initials-on-color in the prototype (deterministic hash of name → palette of 7 brand-adjacent colors). In production, prefer real photos from the user record; fall back to initials with the same palette.

---

## What carries forward (engineering migration order)

Suggested rollout to minimize churn — adopt one layer at a time:

1. **Tokens first** — drop `kata-tokens.css` in, alias the existing shadcn/Tailwind vars to it. ~1 day, no visible regressions.
2. **Type & icons** — switch fonts, replace lucide-react with `@kata/icons`. Mostly mechanical. ~2 days.
3. **Chrome** — rebuild Topbar / Sidebar / Command-rail. Highest visible impact. ~3 days.
4. **Tables & cards** — adopt Kata primitives screen-by-screen. ~1 week, parallelizable.
5. **AI surface** — the Assistant rail is its own epic. Plan separately; gate behind a feature flag.

---

## Files in this bundle

| Path | Purpose |
|---|---|
| `Panda Manager Modernization.html` | The full canvas — open in a browser to see all three directions side-by-side, with the pan/zoom canvas, focus mode, and Tweaks panel |
| `styles/kata-tokens.css` | Verbatim Kata tokens (color + type). Drop into the app and reference via CSS vars. |
| `styles/app.css` | Prototype-only utility classes (`.btn`, `.card`, `.k-table`, `.topbar`, etc.) — **reference for spec, not for shipping**. Lift specs from here, but build the real components on top of `@kata/ui`. |
| `components/chrome.jsx` | Prototype Topbar / Sidebar / Avatar / Sparkline. Use as a spec for the live versions. |
| `components/direction-3.jsx` | The hand-rolled D3 components (`D3CommandRail`, `D3AssistantRail`, `D3PortfolioDashboard`, `D3ProjectWorkspace`). Read for layout intent; don't copy verbatim. |

---

## Things to confirm with design before building

- [ ] Should the Assistant rail be collapsible? (Recommend yes — width-collapse to a 48px icon strip with the sparkle avatar.)
- [ ] Should AI suggestions be globally pin-able? (Currently scoped per project.)
- [ ] Light-mode behavior of the command rail: stay dark or theme to white? (Recommend: stay dark, matches Kata's topbar rule.)
- [ ] Dashboard hero numeral ("07") — keep zero-padded or use unpadded "7"? (Zero-padding gives a more "console" feel; product call.)
- [ ] Replace shadcn fully or coexist during migration? (Recommend full replace, but feature-flag per route.)
