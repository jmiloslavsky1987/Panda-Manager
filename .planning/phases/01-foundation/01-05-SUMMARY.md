---
phase: 01-foundation
plan: 05
subsystem: frontend
tags: [vite, react, react-router-v7, tanstack-query, tailwind-v4, concurrently]

# Dependency graph
requires:
  - phase: 01-04
    provides: Express server on port 3001 (proxy target)

provides:
  - client/ Vite + React scaffold with Tailwind v4
  - client/vite.config.js with @tailwindcss/vite plugin and /api proxy
  - client/src/main.jsx with createBrowserRouter (7 routes) + QueryClientProvider
  - client/src/layouts/AppLayout.jsx (Outlet confirmed working)
  - client/src/layouts/CustomerLayout.jsx (useQuery + Outlet context)
  - client/src/api.js (getCustomers/getCustomer/updateCustomer)
  - 7 placeholder view components
  - Root package.json with concurrently dev script

affects:
  - Phase 2 (Dashboard + CustomerOverview replace placeholders)
  - Phase 3 (ActionManager placeholder replaced)
  - Phase 4 (ArtifactManager + WeeklyUpdateForm placeholders replaced)
  - Phase 5 (ReportGenerator + YAMLEditor placeholders replaced)

# Tech tracking
tech-stack:
  added:
    - react-router-dom@^7.13.1
    - "@tanstack/react-query@^5.90.21"
    - tailwindcss@^4.2.1
    - "@tailwindcss/vite@^4.2.1"
    - concurrently@^9.2.1
    - nodemon@^3.1.14 (root devDep)
  patterns:
    - Tailwind v4: @import "tailwindcss" in index.css, @tailwindcss/vite plugin only (no postcss, no tailwind.config.js)
    - React Router v7: createBrowserRouter declarative mode, explicit <Outlet /> required in layouts
    - TanStack Query v5: QueryClientProvider wraps RouterProvider, staleTime:30s, retry:1
    - CustomerLayout: useQuery + Outlet context={{customer}} pattern for all child views
    - Vite proxy: /api → localhost:3001, no changeOrigin ws (HMR safety)

key-files:
  created:
    - package.json (root, concurrently dev script)
    - package-lock.json (root)
    - client/ (full Vite scaffold)
    - client/vite.config.js
    - client/src/index.css
    - client/src/main.jsx
    - client/src/api.js
    - client/src/layouts/AppLayout.jsx
    - client/src/layouts/CustomerLayout.jsx
    - client/src/views/Dashboard.jsx
    - client/src/views/CustomerOverview.jsx
    - client/src/views/ActionManager.jsx
    - client/src/views/ReportGenerator.jsx
    - client/src/views/YAMLEditor.jsx
    - client/src/views/ArtifactManager.jsx
    - client/src/views/WeeklyUpdateForm.jsx
  modified:
    - .gitignore (*.json → credentials/*.json — was blocking package.json)

key-decisions:
  - "Tailwind v4 uses @tailwindcss/vite plugin only — no postcss.config.js or tailwind.config.js needed"
  - ".gitignore *.json rule was too broad — fixed to credentials/*.json to allow package.json to be tracked"
  - "CustomerLayout uses Outlet context={{customer}} — child views call useOutletContext() instead of re-fetching"
  - "No ws:true in Vite proxy — setting ws:true breaks Vite HMR WebSocket"

patterns-established:
  - "Pattern 10: Tailwind v4 setup — @import 'tailwindcss' in CSS, tailwindcss() plugin in vite.config.js"
  - "Pattern 11: Layout nesting — explicit <Outlet /> in every layout component (React Router v7 pitfall)"
  - "Pattern 12: Customer data — CustomerLayout fetches once via useQuery, passes down via Outlet context"

requirements-completed: [INFRA-07, INFRA-10]

# Human verification results
checkpoint:
  result: approved
  checks:
    - npm_run_dev: pass (both Express on 3001 + Vite on 3000 started)
    - dashboard_renders: pass (placeholder visible, no blank screen)
    - outlet_working: pass (CustomerLayout error shown, not blank page)
    - proxy_working: pass (GET /api/health/drive returned JSON 500 from Express, no CORS/network error)
    - no_tailwind_config: pass (confirmed via console test)

# Metrics
duration: 8min
completed: 2026-03-05
---

# Phase 1 Plan 05: Vite + React Scaffold Summary

**Complete frontend skeleton with Tailwind v4, React Router v7 nested routes, TanStack Query — all 7 routes verified in browser**

## Performance

- **Duration:** 8 min
- **Completed:** 2026-03-05
- **Tasks:** 3 (Task 3 = human checkpoint)
- **Files created:** 16

## Accomplishments
- `npm run dev` starts both Express (3001) and Vite (3000) with one command
- http://localhost:3000 shows Dashboard placeholder — no blank screen
- Outlet confirmed working (CustomerLayout renders, child routes visible)
- Vite proxy confirmed working — `/api/health/drive` returns JSON from Express (no CORS)
- Tailwind v4 with @tailwindcss/vite plugin — no postcss.config.js or tailwind.config.js
- QueryClientProvider wraps RouterProvider in main.jsx

## Notable Fix
`.gitignore` had `*.json` rule (meant for service account keys) that blocked all JSON files including `package.json`. Fixed to `credentials/*.json`.

## Task Commits

1. **Task 1: Client scaffold** - `90a59ce` (feat)
2. **Task 2: React source files** - `8b49878` (feat)
3. **Task 3: Human verification** - approved

## Next Phase Readiness
- All 7 view routes scaffold in place — Phase 2 can replace Dashboard and CustomerOverview placeholders
- Route structure locked — no new router mounts needed in future phases
- TanStack Query configured — Phase 2 can add queries with staleTime + invalidateQueries
- INFRA-07 and INFRA-10 fully satisfied

---
*Phase: 01-foundation*
*Completed: 2026-03-05*
