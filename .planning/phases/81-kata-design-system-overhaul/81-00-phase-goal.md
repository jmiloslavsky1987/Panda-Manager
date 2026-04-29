---
phase: 81-kata-design-system-overhaul
created: 2026-04-28
status: planned
milestone: v11.0
---

# Phase 81: Kata Design System Visual Overhaul

## Phase Goal

The entire Panda Manager app is visually rebuilt on the Kata Design System (Direction 3 — Command Workspace). Kata tokens replace the Tailwind default palette, Inter + JetBrains Mono replace system-ui, the left sidebar becomes a 240px always-dark Command Rail, the Portfolio Dashboard and Project Workspace surfaces are redesigned to spec, and Material Symbols replace lucide-react icons. All existing functionality — every tab, form, API, and navigation flow — is preserved without regression.

## Design Source of Truth

`/Users/jmiloslavsky/Documents/Panda-Manager/design/` (branch: `design/ui-ux-refresh`)

- `design/README.md` — full spec, layout diagrams, token table, interaction rules, migration order
- `design/styles/kata-tokens.css` — verbatim Kata token definitions (drop-in)
- `design/styles/app.css` — prototype utilities (reference only; do not ship verbatim)
- `design/components/chrome.jsx` — prototype Command Rail + page-bar (spec reference)
- `design/components/direction-3.jsx` — Portfolio Dashboard + Project Workspace prototypes (layout intent)
- `design/Panda Manager Modernization.html` — full design canvas (open in browser)

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| shadcn vs Kata | Keep shadcn components, overlay Kata tokens | Lowest risk; no component rewrites for visual refresh |
| Command rail in light mode | Always dark (gray-950) | Matches Kata topbar rule; independent of theme |
| Hero numerals | Unpadded (`7`, not `07`) | No fixed-width slot assumption |
| Assistant rail | Deferred — not built in this phase | No current AI assistant panel feature to surface |
| AI suggestion pinning | Deferred — depends on assistant rail | Not in scope for visual refresh |
| Accent | Indigo (#5B5BFF) default | Per design spec |

## Requirements

KDS-01, KDS-02, KDS-03, KDS-04, KDS-05, KDS-06, KDS-07, KDS-08

## Migration Order (wave sequence)

1. **Wave 0 (81-00):** Token layer — `kata-tokens.css` import, shadcn alias mapping, Tailwind palette override
2. **Wave 1 (81-01):** Type & icons — Inter + JBM font loading, lucide-react → Material Symbols
3. **Wave 2 (81-02):** Chrome — Command Rail rebuild, page-bar, theme toggle, light/dark behavior
4. **Wave 3 (81-03):** Portfolio Dashboard — hero band, AI briefing strip, project grid
5. **Wave 4 (81-04):** Project Workspace — page-bar, tabs, KPI strip, focus/risks grid
6. **Wave 5 (81-05):** Regression verification — all existing features smoke-tested

## Functional Constraints

- **Do not touch** any API route, data-fetching hook, form submission logic, or database query
- **Do not refactor** component prop interfaces or state management
- The Sidebar async server component (DB fetch for project list) must be preserved — only wrap it in new visual chrome
- `export const dynamic = 'force-dynamic'` must remain on all pages that already have it
- Docker compatibility rules from CLAUDE.md apply throughout

## Success State

A PM opens the app and sees the Command Workspace layout. Every existing workflow they relied on still works. The app looks and feels like a Kata-native product.
