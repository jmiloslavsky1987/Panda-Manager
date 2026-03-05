# Phase 2: Read Surface - Research

**Researched:** 2026-03-04
**Domain:** React 19 + TanStack Query v5 + Tailwind CSS v4 + React Router v7 + Express inline editing
**Confidence:** HIGH (codebase read directly; TanStack Query v5 patterns verified against official docs; Tailwind v4 patterns verified against official guidance)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Customer cards in responsive grid, one per YAML | TanStack Query useQuery(['customers']) pattern; API already returns array via GET /api/customers |
| DASH-02 | Each card: name, overall status badge, days to go-live, % complete, open action count, high-severity risk count | Derived data computed from raw YAML in client; StatusBadge and ProgressBar as reusable components |
| DASH-03 | Cards sorted: At Risk first, then On Track, then Off Track | Client-side sort with fixed priority map; no server change needed |
| DASH-04 | "View" button navigates to customer overview | React Router `<Link to={...}>` using fileId as customerId |
| DASH-05 | Overall status derived from most recent history entry workstream statuses | Client-side derivation function: most recent `history[0]` entry, red=Off Track, yellow=At Risk, all green=On Track |
| DASH-06 | % complete = average of all sub-workstream percentages from most recent history entry | Client-side arithmetic over `history[0].workstreams.*.*..percent_complete` values |
| DASH-07 | Days to go-live from nearest planned milestone date | `project.go_live_date` field; date math with `Date.now()` |
| DASH-08 | UI updates on mount; Drive data refreshes in background | TanStack Query staleTime:30s + background refetch on mount |
| CUST-01 | Persistent sidebar: all customers, active highlighted, click navigates | `Sidebar` component in AppLayout using getCustomers() query + NavLink active state |
| CUST-02 | Header: name, project name, status badge, go-live date, last updated, Generate Report button | CustomerLayout header area; data from `useOutletContext()` |
| CUST-03 | Workstream health: ADR/Biggy cards, sub-workstream rows with progress bar, %, status dot, truncated note | ACTUAL schema: `history[0].workstreams.adr.*` and `history[0].workstreams.biggy.*` |
| CUST-04 | Sub-workstream names exact: ADR(4), Biggy(2) | Hardcoded constants matching actual sample.yaml sub-keys |
| CUST-05 | Workstream data from most recent history entry | `history[0]` — history array is prepend-ordered (newest first) |
| CUST-06 | Open actions summary: count + 3 most overdue; link to Action Manager | Client-side filter/sort on `actions[]` where status != 'completed' |
| CUST-07 | Risks: sorted high-first, inline edit fields | PATCH /api/customers/:id/risks/:riskId endpoint (currently 501 stub, needs implementation) |
| CUST-08 | Milestones: chronological, inline edit fields | PATCH /api/customers/:id/milestones/:milestoneId endpoint (currently 501 stub, needs implementation) |
| CUST-09 | Inline edits write to Drive atomically, optimistic UI, Saving... indicator | TanStack Query useMutation with onMutate/onError/onSettled pattern |
| CUST-10 | New risks/milestones added via YAML editor only (not inline here) | No add-row UI needed in Phase 2; read + edit existing only |
| UI-01 | StatusBadge component: On Track (green) / At Risk (yellow) / Off Track (red) | Tailwind complete-string-only classes; no dynamic class construction |
| UI-02 | ProgressBar component: gray background + teal foreground sized by percent_complete | Inline `style={{ width: \`${pct}%\` }}` for dynamic width (safe; not a Tailwind class) |
| UI-03 | Sidebar component: persistent customer list, active state, all customer views | `<NavLink>` with `className={({isActive}) => ...}` for active highlight |
</phase_requirements>

---

## Summary

Phase 2 builds two fully functional views (Dashboard and Customer Overview) plus three reusable components (StatusBadge, ProgressBar, Sidebar) on top of the Phase 1 scaffold. All data is already accessible via the existing `GET /api/customers` and `GET /api/customers/:id` endpoints. The main implementation work is: (1) replacing placeholder components with real UI, (2) implementing the two 501-stub PATCH endpoints for risk/milestone inline editing, (3) deriving display values (status, percent complete, days to go-live) from raw YAML data on the client, and (4) applying the TanStack Query v5 optimistic mutation pattern for the "Saving..." indicator.

**CRITICAL SCHEMA NOTE:** The YAML schema in the actual codebase (sample.yaml + yamlService.js) differs from the array-based schema described in REQUIREMENTS.md additional context. The actual schema uses flat objects for workstreams (`workstreams.adr.{inbound_integrations,configuration,outbound_integrations,workflow_configuration}` and `workstreams.biggy.{integrations,workflow_configuration}`). Actions use `description`/`due`/`completed_date` fields, not `title`/`due_date`/`notes`. The history array mirrors this workstream structure. All Phase 2 derivation logic MUST use the actual sample.yaml field names, not the REQUIREMENTS.md schema description.

**Primary recommendation:** Build all derivation logic (status, percent, days to go-live) as pure functions in a `client/src/lib/deriveCustomer.js` utility module — makes them independently testable with node:test and keeps view components thin.

---

## Schema Reality Check

This section documents the ACTUAL field shapes built in Phase 1, which govern all Phase 2 client logic.

### YAML Top-Level Keys (9, fixed)
`customer`, `project`, `status`, `workstreams`, `actions`, `risks`, `milestones`, `artifacts`, `history`

### Workstream Shape (ACTUAL — flat object, not array)
```yaml
workstreams:
  adr:
    inbound_integrations:
      status: "in_progress"
      percent_complete: 40
      progress_notes: "Webhook endpoints configured"
      blockers: ""
    configuration: { ... }
    outbound_integrations: { ... }
    workflow_configuration: { ... }
  biggy:
    integrations: { ... }
    workflow_configuration: { ... }
```

### History Entry Shape (ACTUAL)
```yaml
history:
  - week_ending: "2026-03-07"
    workstreams:          # mirrors workstreams structure above
      adr:
        inbound_integrations:
          status: "in_progress"
          percent_complete: 40
          progress_notes: "..."
          blockers: ""
        # ... other sub-workstreams
      biggy:
        # ...
    decisions: "..."
    outcomes: "..."
```

### Action Shape (ACTUAL — sample.yaml fields)
```yaml
actions:
  - id: "A-001"
    description: "..."     # NOT "title"
    owner: "..."
    due: "2026-03-15"      # NOT "due_date"
    status: "open"         # open | completed | delayed | in_review
    workstream: "adr"
    completed_date: ""     # empty string when not completed
```

### Risk Shape (ACTUAL)
```yaml
risks:
  - id: "R-001"
    description: "..."
    severity: "high"       # high | medium | low
    status: "open"         # open | closed | mitigated
    mitigation: "..."
    raised_date: "..."
    closed_date: ""
```

### Milestone Shape (ACTUAL)
```yaml
milestones:
  - id: "M-001"
    name: "..."
    target_date: "2026-03-31"
    status: "not_started"  # not_started | in_progress | complete | delayed
    notes: ""
```

### Project Shape (ACTUAL)
```yaml
project:
  name: "BigPanda Implementation"
  go_live_date: "2026-06-01"
  overall_percent_complete: 35
  notes: "..."
```

---

## Standard Stack

### Core (already installed, no new installs needed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | 19 | UI rendering | Already in client/package.json |
| react-router-dom | 7.13.1 | Routing, NavLink, useOutletContext | Already installed |
| @tanstack/react-query | 5.90.21 | Data fetching + optimistic mutations | Already installed |
| tailwindcss | 4.2.1 | Utility CSS | Already installed with @tailwindcss/vite |

### New Dependencies (Phase 2)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| clsx | ^2.1.1 | Conditional class composition | Prevents dynamic class construction (Tailwind v4 purge safety) |

**Installation:**
```bash
cd client && npm install clsx
```

Note: `tailwind-merge` is optional for Phase 2 since class conflicts are unlikely in hand-crafted components. `clsx` alone is sufficient.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| clsx | Template literals | Template literals risk class purging in Tailwind v4 |
| Inline style for progress bar width | Tailwind `w-{n}` | Dynamic widths cannot be static strings; inline style is correct approach |
| node:test for derive functions | vitest | node:test is already established test infrastructure, zero install cost |

---

## Architecture Patterns

### Recommended Project Structure Changes
```
client/src/
├── components/          # NEW: reusable UI components
│   ├── StatusBadge.jsx  # UI-01
│   ├── ProgressBar.jsx  # UI-02
│   └── Sidebar.jsx      # UI-03
├── lib/                 # NEW: pure derivation functions
│   └── deriveCustomer.js  # status, percent, days-to-go-live, etc.
├── views/
│   ├── Dashboard.jsx    # Replace placeholder (DASH-01..08)
│   └── CustomerOverview.jsx  # Replace placeholder (CUST-01..10)
├── layouts/
│   ├── AppLayout.jsx    # Add Sidebar component
│   └── CustomerLayout.jsx  # Add full header (CUST-02)
└── api.js               # Add patchRisk(), patchMilestone()
server/routes/
├── risks.js             # Implement PATCH /:riskId (CUST-07/09)
└── milestones.js        # Implement PATCH /:milestoneId (CUST-08/09)
server/fixtures/
└── sample.yaml          # Already exists — use for test fixtures
```

### Pattern 1: Client-Side Derivation (Pure Functions)

**What:** Extract all YAML-to-display-value transformations into `client/src/lib/deriveCustomer.js` as pure functions.

**When to use:** Any time a display value requires computation from raw YAML data.

**Example:**
```javascript
// client/src/lib/deriveCustomer.js

// Get the most recent history entry
export function getLatestHistory(customer) {
  return customer.history?.[0] ?? null;
}

// Derive overall status from latest history workstream statuses
// red (any) → Off Track, yellow (any) → At Risk, all green → On Track
export function deriveOverallStatus(customer) {
  const latest = getLatestHistory(customer);
  if (!latest) return customer.status ?? 'unknown';

  const allSubs = getAllSubWorkstreams(latest.workstreams);
  if (allSubs.some(s => s.status === 'red' || s.status === 'off_track')) return 'off_track';
  if (allSubs.some(s => s.status === 'yellow' || s.status === 'at_risk')) return 'at_risk';
  return 'on_track';
}

// Average percent_complete across all sub-workstreams in latest history
export function derivePercentComplete(customer) {
  const latest = getLatestHistory(customer);
  if (!latest) return customer.project?.overall_percent_complete ?? 0;

  const allSubs = getAllSubWorkstreams(latest.workstreams);
  if (!allSubs.length) return 0;
  const total = allSubs.reduce((sum, s) => sum + (s.percent_complete ?? 0), 0);
  return Math.round(total / allSubs.length);
}

// Days until go_live_date from today
export function deriveDaysToGoLive(customer) {
  const goLive = customer.project?.go_live_date;
  if (!goLive) return null;
  const diff = new Date(goLive) - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Count open actions
export function countOpenActions(customer) {
  return (customer.actions ?? []).filter(a => a.status !== 'completed').length;
}

// Count high-severity open risks
export function countHighRisks(customer) {
  return (customer.risks ?? []).filter(r => r.severity === 'high' && r.status === 'open').length;
}

// Flatten all sub-workstreams from workstreams object into array
function getAllSubWorkstreams(workstreams) {
  if (!workstreams) return [];
  return Object.values(workstreams).flatMap(ws => Object.values(ws));
}
```

### Pattern 2: TanStack Query v5 Optimistic Mutation (CUST-09)

**What:** Use `useMutation` with `onMutate`/`onError`/`onSettled` to apply optimistic UI updates for risk/milestone edits.

**When to use:** Every inline edit that writes to Drive (CUST-07, CUST-08).

**Example:**
```javascript
// Source: https://tanstack.com/query/v5/docs/react/guides/optimistic-updates
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchRisk } from '../api';

function useRiskMutation(customerId) {
  const queryClient = useQueryClient();
  const queryKey = ['customer', customerId];

  return useMutation({
    mutationFn: ({ riskId, patch }) => patchRisk(customerId, riskId, patch),

    onMutate: async ({ riskId, patch }) => {
      // Cancel in-flight refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });
      // Snapshot current data for rollback
      const previous = queryClient.getQueryData(queryKey);
      // Optimistically update the cache
      queryClient.setQueryData(queryKey, (old) => ({
        ...old,
        risks: old.risks.map(r => r.id === riskId ? { ...r, ...patch } : r),
      }));
      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Rollback to snapshot on error
      queryClient.setQueryData(queryKey, context.previous);
    },

    onSettled: () => {
      // Always refetch after settle to sync with Drive
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
```

**"Saving..." indicator:** Track `mutation.isPending` — show indicator while true.

### Pattern 3: StatusBadge Component (UI-01)

**What:** Fixed-variant component using complete Tailwind class strings (never dynamic construction).

**When to use:** Every place overall_status, risk severity, or milestone status is displayed.

```jsx
// client/src/components/StatusBadge.jsx
// CRITICAL: Never construct class names dynamically — Tailwind v4 purges incomplete strings
const VARIANTS = {
  on_track:  'bg-green-100 text-green-800',
  at_risk:   'bg-yellow-100 text-yellow-800',
  off_track: 'bg-red-100 text-red-800',
  // Aliases for history status values
  green:     'bg-green-100 text-green-800',
  yellow:    'bg-yellow-100 text-yellow-800',
  red:       'bg-red-100 text-red-800',
};

const LABELS = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
  green: 'On Track',
  yellow: 'At Risk',
  red: 'Off Track',
};

export default function StatusBadge({ status }) {
  const cls = VARIANTS[status] ?? 'bg-gray-100 text-gray-600';
  const label = LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
```

### Pattern 4: ProgressBar Component (UI-02)

**What:** Two nested divs — gray background, teal foreground. Dynamic width via inline style (NOT Tailwind dynamic class).

```jsx
// client/src/components/ProgressBar.jsx
export default function ProgressBar({ percent }) {
  const pct = Math.min(100, Math.max(0, percent ?? 0));
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      {/* Dynamic width uses inline style — NEVER bg-teal-{n} with dynamic n */}
      <div
        className="bg-teal-500 h-2 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
```

### Pattern 5: Sidebar Component (UI-03)

**What:** Persistent sidebar in AppLayout, consuming `getCustomers()` query, NavLink for active state.

```jsx
// client/src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '../api';

export default function Sidebar() {
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    staleTime: 30_000,
  });

  return (
    <nav className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-sm font-semibold text-gray-900">Customers</h1>
      </div>
      <ul>
        {customers.map(c => (
          <li key={c.fileId}>
            {/* NavLink provides isActive; use complete class strings */}
            <NavLink
              to={`/customer/${c.fileId}`}
              className={({ isActive }) =>
                isActive
                  ? 'block px-4 py-2 text-sm bg-teal-50 text-teal-700 font-medium border-r-2 border-teal-500'
                  : 'block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'
              }
            >
              {c.customer?.name ?? c.fileId}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Pattern 6: PATCH Route Implementation Pattern

**What:** Express PATCH for risk/milestone inline edits — read full YAML, merge patch, validate, write atomically.

```javascript
// server/routes/risks.js — replace 501 stub with:
router.patch('/:riskId', asyncWrapper(async (req, res) => {
  const { id: fileId, riskId } = req.params;
  const patch = req.body; // partial fields to update

  // Atomic: read → modify in memory → validate → write
  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const riskIndex = data.risks.findIndex(r => r.id === riskId);
  if (riskIndex === -1) return res.status(404).json({ error: 'Risk not found' });

  data.risks[riskIndex] = { ...data.risks[riskIndex], ...patch };

  const normalized = yamlService.normalizeForSerialization(data);
  const yaml = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yaml);

  res.json({ fileId, riskId, risk: data.risks[riskIndex] });
}));
```

### Anti-Patterns to Avoid

- **Dynamic Tailwind class construction:** `'bg-' + color + '-500'` — Tailwind v4 purges these in production. Use the VARIANTS lookup table pattern (Pattern 3 above).
- **Re-fetching customer in child views:** CustomerLayout already fetches once via `useQuery`; child views call `useOutletContext()`. Never add a second `useQuery(['customer', id])` call in CustomerOverview.
- **Calling `history[history.length - 1]`:** History array is prepend-ordered (newest first), so `history[0]` is the most recent entry.
- **Stale context on navigation:** When navigating from one customer to another, `CustomerLayout` re-mounts with the new `customerId` param — the query key `['customer', customerId]` changes, causing a fresh fetch. This is correct behavior.
- **Direct YAML field access without null guards:** YAML fields may be missing or empty arrays for customers with no history. Always use `?.` and `?? []` / `?? 0` defaults.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conditional CSS class composition | String template + ternary chains | `clsx` | Safer, readable, avoids quote/space bugs |
| Dynamic progress bar width | Tailwind `w-[${n}%]` arbitrary values | Inline `style={{ width }}` | Tailwind arbitrary values work but inline style is simpler and fully safe |
| Optimistic UI rollback | Manual state variable + setTimeout | TanStack Query `onMutate`/`onError` context | TanStack handles cancellation, race conditions, and rollback atomically |
| Active nav state | Custom `useLocation` + className comparison | `NavLink` with `className` prop function | NavLink knows about nested route matching |

**Key insight:** Phase 2 has zero new npm installs needed on the server. All Drive/YAML primitives exist. Client needs only `clsx`.

---

## Common Pitfalls

### Pitfall 1: Wrong YAML Field Names
**What goes wrong:** Code uses REQUIREMENTS.md schema description (array-based) instead of actual sample.yaml fields.
**Why it happens:** The REQUIREMENTS.md additional_context block describes a different schema than what Phase 1 built.
**How to avoid:** Always reference `server/fixtures/sample.yaml` and `server/services/yamlService.js` as ground truth. Key differences: `description` not `title`, `due` not `due_date`, `target_date` not `due_date` on milestones, workstreams are flat objects not arrays.
**Warning signs:** Test fails with "cannot read property of undefined" on `action.title` or `milestone.due_date`.

### Pitfall 2: Dynamic Tailwind Class Construction
**What goes wrong:** StatusBadge built as `className={\`bg-${color}-100\`}` — classes are purged in production.
**Why it happens:** Tailwind v4 scans source files for literal class strings; dynamically constructed strings are invisible to the scanner.
**How to avoid:** Use a lookup object (`VARIANTS[status]`) that contains complete class strings. All possible classes appear as literals in source.
**Warning signs:** Works in dev, breaks in production build; badge shows no color.

### Pitfall 3: Missing `mergeParams: true` on PATCH Routes
**What goes wrong:** `req.params.id` is `undefined` in risks.js and milestones.js PATCH handlers.
**Why it happens:** Both route files already have `Router({ mergeParams: true })` — this is already correctly set. Just verify it's present when implementing the handlers.
**How to avoid:** It is present — confirmed in Phase 1 Plan 04. No action needed.

### Pitfall 4: History Array Order Assumption
**What goes wrong:** `history[history.length - 1]` returns the oldest entry instead of newest.
**Why it happens:** History is prepend-ordered (new entries are unshifted to position 0). This is the required behavior per UPD-04.
**How to avoid:** Always use `history[0]` for the most recent entry. Add a comment noting prepend ordering.

### Pitfall 5: CustomerLayout Context Not Available in Dashboard
**What goes wrong:** Dashboard (at route `/`) tries to call `useOutletContext()` and gets undefined.
**Why it happens:** Dashboard is a child of `AppLayout`, not `CustomerLayout`. Only customer child routes get the `customer` context.
**How to avoid:** Dashboard uses its own `useQuery(['customers'], getCustomers)`. Only `CustomerOverview`, `ActionManager`, etc. use `useOutletContext()`.

### Pitfall 6: Days to Go-Live Timezone Edge Cases
**What goes wrong:** Days calculation is off by one depending on local timezone vs UTC.
**Why it happens:** `new Date('2026-06-01')` parses as UTC midnight; `Date.now()` is local time.
**How to avoid:** Parse go_live_date explicitly and use `Math.ceil` for rounding. For a single-user local tool, minor off-by-one is acceptable; document the known limitation.

### Pitfall 7: Inline Edit "Saving..." Flicker
**What goes wrong:** Saving indicator disappears immediately if mutation resolves too fast (feels glitchy).
**Why it happens:** `mutation.isPending` flips in < 100ms on fast connections.
**How to avoid:** For local development with fast Drive API, this is acceptable. If jarring, add a minimum display delay — but for Phase 2, track `isPending` and move on.

---

## Code Examples

### Dashboard Sort Logic
```javascript
// Source: DASH-03 requirement + client derivation pattern
const STATUS_ORDER = { at_risk: 0, on_track: 1, off_track: 2 };

function sortCustomers(customers) {
  return [...customers].sort((a, b) => {
    const aOrder = STATUS_ORDER[deriveOverallStatus(a)] ?? 3;
    const bOrder = STATUS_ORDER[deriveOverallStatus(b)] ?? 3;
    return aOrder - bOrder;
  });
}
```

### API Additions (api.js)
```javascript
// Add to client/src/api.js
export const patchRisk = (customerId, riskId, patch) =>
  apiFetch(`/customers/${customerId}/risks/${riskId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const patchMilestone = (customerId, milestoneId, patch) =>
  apiFetch(`/customers/${customerId}/milestones/${milestoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
```

### Workstream Traversal Constants
```javascript
// Hardcoded workstream config — CUST-04 requires exact names
export const WORKSTREAM_CONFIG = {
  adr: {
    label: 'ADR',
    subWorkstreams: [
      { key: 'inbound_integrations', label: 'Inbound Integrations' },
      { key: 'configuration', label: 'Configuration' },
      { key: 'outbound_integrations', label: 'Outbound Integrations' },
      { key: 'workflow_configuration', label: 'Workflow Configuration' },
    ],
  },
  biggy: {
    label: 'Biggy',
    subWorkstreams: [
      { key: 'integrations', label: 'Integrations' },
      { key: 'workflow_configuration', label: 'Workflow Configuration' },
    ],
  },
};
```

### Inline Edit Pattern (Input with Saving Indicator)
```jsx
// Reusable inline edit input with saving indicator
function InlineEditField({ value, onSave, isPending }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  const handleBlur = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  if (isPending) return <span className="text-gray-400 italic">Saving...</span>;
  if (editing) {
    return (
      <input
        autoFocus
        className="border border-teal-300 rounded px-1 py-0.5 text-sm"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') handleBlur(); if (e.key === 'Escape') setEditing(false); }}
      />
    );
  }
  return (
    <span
      className="cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      {value || <span className="text-gray-400">—</span>}
    </span>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind postcss.config.js | @tailwindcss/vite plugin | v4 (2024) | No tailwind.config.js needed; already set up in Phase 1 |
| React Router v6 `context` API | v7 `useOutletContext` | v7 (2024) | Already used in CustomerLayout; no change |
| TanStack Query v4 `onMutate` signature | v5 same but different package name (`@tanstack/react-query`) | v5 (2023) | Already installed; use `useQueryClient()` not external client |

---

## Open Questions

1. **status values in actual YAML vs requirements**
   - What we know: sample.yaml uses `"in_progress"`, `"not_started"`, `"completed"`. REQUIREMENTS.md CUST-05 says "red/yellow/green" for workstream status.
   - What's unclear: The history entries in sample.yaml also use `"in_progress"` not `"red"`. DASH-05 says "red → Off Track, any yellow → At Risk". These may be two different fields with different value sets.
   - Recommendation: The history sub-workstream `status` field can hold either set. Derivation functions should handle both: `status === 'red' || status === 'off_track'` etc. The Weekly Update Form (Phase 4) will enforce status values.

2. **`last updated` date source for CUST-02**
   - What we know: CUST-02 requires "last updated date (from metadata.updated_on)". No `metadata` key exists in sample.yaml or REQUIRED_TOP_LEVEL_KEYS.
   - What's unclear: Whether `metadata` is an undocumented 10th top-level key or if `history[0].week_ending` should be used as a proxy.
   - Recommendation: Use `history[0]?.week_ending` as the last-updated date for Phase 2. Adding a `metadata` top-level key would break `validateYaml()` (extra key error). Defer metadata key until there's a decision to update the schema.

3. **Customer ID format in routes**
   - What we know: Drive file IDs are Google's opaque IDs (e.g., `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`). The router uses `customerId` param. `getCustomer(id)` fetches `/api/customers/${id}`.
   - What's unclear: No issue — this is already working per Phase 1 verification.
   - Recommendation: Confirmed pattern. No change needed.

---

## Validation Architecture

nyquist_validation is enabled in .planning/config.json.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (Node 18+ built-in) — established in Phase 1 |
| Config file | none — `node --test` runs directly |
| Quick run command | `node --test server/services/yamlService.test.js client/src/lib/deriveCustomer.test.js` |
| Full suite command | `node --test server/services/yamlService.test.js server/routes/risks.test.js server/routes/milestones.test.js client/src/lib/deriveCustomer.test.js` |

Note: Frontend components (StatusBadge, ProgressBar, Sidebar, Dashboard, CustomerOverview) are verified via manual browser checkpoint. React component tests with node:test require JSDOM setup which adds significant complexity for Phase 2's scope. Structural `node -e` checks are used for component existence verification.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Cards rendered one per customer | manual | Browser: dashboard shows grid with N cards matching API response count | N/A |
| DASH-02 | Card fields: name, badge, days, %, actions, risks | manual | Browser: inspect card for all 6 data fields | N/A |
| DASH-03 | Sort order: At Risk → On Track → Off Track | unit | `node --test client/src/lib/deriveCustomer.test.js` | ❌ Wave 0 |
| DASH-04 | View button navigates | manual | Browser: click View, confirm URL change, no page reload | N/A |
| DASH-05 | Status derived from latest history workstream statuses | unit | `node --test client/src/lib/deriveCustomer.test.js` | ❌ Wave 0 |
| DASH-06 | % complete = avg of sub-workstream percents | unit | `node --test client/src/lib/deriveCustomer.test.js` | ❌ Wave 0 |
| DASH-07 | Days to go-live from project.go_live_date | unit | `node --test client/src/lib/deriveCustomer.test.js` | ❌ Wave 0 |
| DASH-08 | Data refreshes on mount | manual | Browser: stale data triggers background refetch (Network tab) | N/A |
| CUST-01 | Sidebar shows all customers, active highlighted | manual | Browser: sidebar visible, active customer highlighted | N/A |
| CUST-02 | Header fields correct | manual | Browser: CustomerOverview shows all 6 header fields | N/A |
| CUST-03 | Workstream rows: progress bar, %, dot, note | manual | Browser: 6 sub-workstream rows visible with all UI elements | N/A |
| CUST-04 | Exact sub-workstream names | unit | `node --test client/src/lib/deriveCustomer.test.js` (WORKSTREAM_CONFIG test) | ❌ Wave 0 |
| CUST-05 | Data from history[0] | unit | `node --test client/src/lib/deriveCustomer.test.js` | ❌ Wave 0 |
| CUST-06 | Open actions count + 3 most overdue | unit | `node --test client/src/lib/deriveCustomer.test.js` | ❌ Wave 0 |
| CUST-07 | Risk inline edit fields | manual | Browser: click risk field, edit, confirm save | N/A |
| CUST-08 | Milestone inline edit fields | manual | Browser: click milestone field, edit, confirm save | N/A |
| CUST-09 | PATCH routes write to Drive atomically | integration | `node --test server/routes/risks.test.js server/routes/milestones.test.js` (supertest mocked) | ❌ Wave 0 |
| CUST-10 | No add-new UI for risks/milestones | manual | Browser: confirm no "Add Risk" or "Add Milestone" button visible | N/A |
| UI-01 | StatusBadge renders correct color per status | unit | `node --test client/src/lib/deriveCustomer.test.js` (VARIANTS map check) | ❌ Wave 0 |
| UI-02 | ProgressBar renders with correct width | manual | Browser: inspect progress bar element, confirm inline style width | N/A |
| UI-03 | Sidebar active state on current customer | manual | Browser: navigate customers, confirm active highlight follows | N/A |

Note on CUST-09 integration tests: supertest can test Express PATCH routes with a mocked driveService. The test file stubs `driveService.readYamlFile` to return sample.yaml content and `driveService.writeYamlFile` to capture what was written. This verifies the atomic read-modify-write pattern without real Drive credentials.

### Sampling Rate
- **Per task commit:** `node --test server/services/yamlService.test.js` (existing suite must stay green)
- **Per new test file added:** Run the specific new test file
- **Per wave merge:** Full suite: `node --test server/services/yamlService.test.js server/routes/risks.test.js server/routes/milestones.test.js client/src/lib/deriveCustomer.test.js`
- **Phase gate:** Full suite green + manual browser checkpoint before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `client/src/lib/deriveCustomer.test.js` — covers DASH-03, DASH-05, DASH-06, DASH-07, CUST-04, CUST-05, CUST-06, UI-01 (VARIANTS map)
- [ ] `server/routes/risks.test.js` — covers CUST-09 (PATCH /api/customers/:id/risks/:riskId atomic write)
- [ ] `server/routes/milestones.test.js` — covers CUST-09 (PATCH /api/customers/:id/milestones/:milestoneId atomic write)
- [ ] `client/src/lib/deriveCustomer.js` — the module under test (created in same Wave as test stubs)

Note: `server/services/yamlService.test.js` already exists and is GREEN — no Wave 0 work needed for it. Wave 0 for Phase 2 creates stubs only for the 3 new test files above.

For `server/routes/risks.test.js` and `server/routes/milestones.test.js`, the tests use `supertest` (already in server's scope from Express app export) with driveService mocked:
```bash
# Check if supertest is available
node -e "require('supertest'); console.log('supertest OK')" 2>&1
```
If not installed: `cd server && npm install --save-dev supertest`

---

## Sources

### Primary (HIGH confidence)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/fixtures/sample.yaml` — actual YAML schema (ground truth)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/services/yamlService.js` — REQUIRED_TOP_LEVEL_KEYS, parse/serialize patterns
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/routes/customers.js` — atomic write pattern
- `/Users/jmiloslavsky/Documents/Project Assistant Code/client/src/layouts/CustomerLayout.jsx` — useOutletContext pattern
- `/Users/jmiloslavsky/Documents/Project Assistant Code/client/src/main.jsx` — router structure, QueryClient config
- [TanStack Query v5 Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates) — onMutate/onError/onSettled pattern

### Secondary (MEDIUM confidence)
- [useOutletContext | React Router](https://reactrouter.com/api/hooks/useOutletContext) — stale context on sibling navigation gotcha
- [Tailwind CSS Badges](https://tailwindcss.com/plus/ui-blocks/application-ui/elements/badges) — complete class string requirement for v4
- Frontend Handbook React/Tailwind best practices — `clsx`/`tailwind-merge` pattern for conditional classes

### Tertiary (LOW confidence)
- None — all critical claims verified from codebase or official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions read directly from package.json; no new major dependencies
- Architecture: HIGH — patterns derived directly from Phase 1 codebase + official TanStack Query docs
- Schema facts: HIGH — read directly from sample.yaml and yamlService.js
- Pitfalls: HIGH — Tailwind dynamic class issue verified from official docs; others from Phase 1 summaries
- Derivation logic: MEDIUM — status value mappings (red/green/yellow vs on_track/at_risk/off_track) need validation against actual Drive data when available

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack; Tailwind v4/TanStack Query v5 are stable releases)
