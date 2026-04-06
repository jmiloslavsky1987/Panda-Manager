# Phase 3: Project Setup + Action Manager - Research

**Researched:** 2026-03-04
**Domain:** React form state management, tabular inline CRUD, optimistic mutation patterns, Express PATCH/POST routes
**Confidence:** HIGH (all findings derived from live codebase; no new dependencies; patterns established in Phase 2)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACT-01 | Open actions in sortable table: checkbox, ID, description, owner, due, status badge, workstream, actions col | Native JS array sort + React state; InlineEditField/InlineSelectField from CustomerOverview pattern |
| ACT-02 | Checkbox immediately completes action, moves to completed table, writes to Drive atomically | Optimistic mutation: setQueryData (move action) → mutate PATCH /:actionId → rollback on error |
| ACT-03 | Optimistic UI with Saving... indicator on checkbox | mutation.isPending && mutation.variables?.actionId === action.id (exact same pattern as riskMutation) |
| ACT-04 | Description and owner editable inline; write on blur/enter | InlineEditField component — zero changes from CustomerOverview version; PATCH /:actionId {description} or {owner} |
| ACT-05 | Due date editable inline; renders red if past | InlineEditField for date input; `new Date(due) < new Date()` comparison for red class |
| ACT-06 | Status badge cycles on click: Open → Delayed → In Review → Open | STATUS_CYCLE map; on click trigger mutation PATCH /:actionId {status: nextStatus} |
| ACT-07 | Workstream dropdown matching fixed workstream hierarchy | InlineSelectField with WORKSTREAM_OPTIONS derived from WORKSTREAM_CONFIG keys |
| ACT-08 | Sort by any column header; filter by workstream + status toggles | React useState for sortKey/sortDir/filterWorkstream/filterStatus; useMemo for derived list |
| ACT-09 | "Add Action" row pinned at bottom; Save assigns next A-### ID and writes to Drive | POST /api/customers/:id/actions; server calls assignNextId("A", actions) |
| ACT-10 | Completed table collapsed by default; columns: ID, description, owner, due, completed date + Reopen btn | useState(false) for collapse; filter actions.filter(a => a.status === 'completed') |
| ACT-11 | Reopen: status=open, completed_date="", writes to Drive | PATCH /:actionId {status: 'open', completed_date: ''} — same endpoint as edit |
| ACT-12 | Mark Delayed button sets status=delayed, optionally accepts new due date | PATCH /:actionId {status: 'delayed'} or {status: 'delayed', due: newDate} |
| SETUP-1 | Project Setup at /customer/:id/setup: all 11 sub-workstreams grouped ADR/Biggy | (No REQUIREMENTS.md ID yet — derived from Phase 3 goal) Iterate WORKSTREAM_CONFIG; local form state |
| SETUP-2 | Scope-enabled sub-workstreams show tag-input for tools in scope | hasScope === true in WORKSTREAM_CONFIG; simple array state with add/remove |
| SETUP-3 | Save writes full workstreams nested object atomically to Drive | PATCH /api/customers/:id/workstreams; read → replace workstreams key → validate → write |
</phase_requirements>

---

## Summary

Phase 3 implements two write-capable views: **Project Setup** (a form that edits the top-level `workstreams` object) and **Action Manager** (a full inline CRUD table for `actions[]`). Both are built entirely on patterns established in Phase 2 — `useOutletContext()` for customer data, TanStack Query v5 `useMutation` with `onMutate/onError/onSettled` for optimistic updates, `InlineEditField`/`InlineSelectField` for cell editing, and the atomic read-modify-write Drive pattern in Express routes.

No new npm dependencies are needed. The existing `actions.js` route file has stub handlers for GET, POST, and PATCH that need full implementation. A new `PATCH /api/customers/:id/workstreams` endpoint needs to be added to replace the full workstreams object. The client has a placeholder `ActionManager.jsx` that needs full implementation; `ProjectSetup.jsx` needs to be created and wired into the router.

The most complex new interaction is the Action Manager table: sort state, filter state, the "Add Action" input row, and the collapse toggle for completed actions all layer onto the mutation pattern. These are all plain React `useState`/`useMemo` concerns with no new libraries.

**Primary recommendation:** Build the server endpoints (Wave 0 tests + Wave 1 implementation) first, then client views (Wave 2), following the same wave structure as Phase 2.

---

## Critical Schema Note: sample.yaml vs WORKSTREAM_CONFIG Mismatch

**This is the single most important discovery from reading the codebase.**

`server/fixtures/sample.yaml` uses the **old 4+2 workstream structure**:
```yaml
workstreams:
  adr:
    inbound_integrations: ...
    configuration: ...
    outbound_integrations: ...
    workflow_configuration: ...
  biggy:
    integrations: ...
    workflow_configuration: ...
```

`client/src/lib/deriveCustomer.js` WORKSTREAM_CONFIG defines the **new 11-subworkstream structure**:
```
ADR (6): inbound_integrations, outbound_integrations, normalization,
         platform_configuration, correlation, training_and_uat
Biggy (5): biggy_app_integration, udc, real_time_integrations,
           action_plans_configuration, workflows_configuration
```

**Wave 0 for Phase 3 MUST update `server/fixtures/sample.yaml`** to use the 11-subworkstream structure before new tests can pass. The migration script `scripts/migrateYaml.js` confirms the real Drive YAML files were already migrated to this structure. The fixture is the only file still using the old layout.

Additionally, the `scope` field is present in real customer YAMLs but absent from sample.yaml. New test stubs for actions.test.js can use either the existing sample.yaml (which covers the actions array adequately) or an updated fixture. The workstreams test needs the updated fixture.

---

## Standard Stack

### Core (all already installed — zero new npm installs needed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| React | 19 | UI rendering | client/package.json |
| react-router-dom | 7.13.1 | useOutletContext, useParams, Link | Already installed |
| @tanstack/react-query | 5.90.21 | useMutation optimistic updates | Already installed |
| tailwindcss | 4.2.1 | Utility CSS | @tailwindcss/vite plugin |
| clsx | ^2.1.1 | Conditional class composition | Already installed (Phase 2) |
| node:test | built-in | Server-side integration tests | Already established test framework |
| supertest | already installed | HTTP assertion for Express routes | Already in server/node_modules |

### New Dependencies
**None.** Phase 3 adds no new npm packages.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native sort/filter with useState | react-table / TanStack Table v8 | TanStack Table adds ~40kb; native sort for 3-column, 3-status filter is 20 lines of code |
| InlineEditField for all cells | Dedicated table cell editor libs | No library needed — InlineEditField from CustomerOverview is already exactly right |
| Local useState for form (Project Setup) | react-hook-form | RHF is worth it for complex validation; Project Setup fields are simple and already validated server-side |
| <input type="date"> for due dates | Custom date picker | Native date input sufficient for a single-user local tool |

---

## Architecture Patterns

### Recommended Project Structure Changes

```
client/src/
├── views/
│   ├── ActionManager.jsx       # Replace placeholder (ACT-01..12)
│   └── ProjectSetup.jsx        # NEW (no ID in REQUIREMENTS.md, but Phase 3 goal)
├── api.js                      # Add: postAction, patchAction, patchWorkstreams

server/routes/
├── actions.js                  # Implement GET, POST, PATCH/:actionId (replace 501 stubs)
├── customers.js                # Add PATCH /:id/workstreams handler (or new workstreams.js)
└── workstreams.js              # NEW route file for PATCH /api/customers/:id/workstreams

server/routes/ (test files)
├── actions.test.js             # NEW Wave 0 test stubs + Wave 1 assertions

client/src/main.jsx             # Add 'setup' child route under customer/:customerId
server/index.js                 # Mount /api/customers/:id/workstreams route
```

**Note:** The `setup` route is NOT yet in `main.jsx`. It needs to be added:
```javascript
{ path: 'setup', element: <ProjectSetup /> }
```

### Pattern 1: Action Manager Table with Sort + Filter

**What:** Client-side sort and filter using `useMemo` — no library.

**When to use:** Any time a table has fewer than ~500 rows and sort/filter logic is straightforward.

```jsx
// Source: React docs useMemo pattern + Phase 2 established conventions
const [sortKey, setSortKey] = React.useState('due');
const [sortDir, setSortDir] = React.useState('asc');
const [filterWorkstream, setFilterWorkstream] = React.useState('all');
const [filterStatus, setFilterStatus] = React.useState('all');

const openActions = React.useMemo(() => {
  let list = (customer.actions ?? []).filter(a => a.status !== 'completed');

  if (filterWorkstream !== 'all') {
    list = list.filter(a => a.workstream === filterWorkstream);
  }
  if (filterStatus !== 'all') {
    list = list.filter(a => a.status === filterStatus);
  }

  list = [...list].sort((a, b) => {
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return list;
}, [customer.actions, sortKey, sortDir, filterWorkstream, filterStatus]);
```

### Pattern 2: Optimistic Action Mutation (Complete / Edit / Reopen)

**What:** Single `actionMutation` handles complete, field edit, and reopen — same `onMutate/onError/onSettled` pattern as Phase 2 risk/milestone mutations.

**When to use:** Every Action Manager write operation.

```javascript
// All action writes use one mutation — patch shape determines operation
const actionMutation = useMutation({
  mutationFn: ({ actionId, patch }) => patchAction(customerId, actionId, patch),

  onMutate: async ({ actionId, patch }) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old) => ({
      ...old,
      actions: (old?.actions ?? []).map(a =>
        a.id === actionId ? { ...a, ...patch } : a
      ),
    }));
    return { previous };
  },

  onError: (_err, _vars, context) => {
    if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey });
  },
});
```

**Complete action specifically:**
```javascript
// Checkbox click → complete action
const handleComplete = (action) => {
  actionMutation.mutate({
    actionId: action.id,
    patch: {
      status: 'completed',
      completed_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    },
  });
};
```

### Pattern 3: Status Cycle (ACT-06)

**What:** Click-to-cycle status badge: Open → Delayed → In Review → Open.

```javascript
const STATUS_CYCLE = {
  open:      'delayed',
  delayed:   'in_review',
  in_review: 'open',
  completed: 'open',  // Should not be clickable, but safe fallback
};

const handleStatusCycle = (action) => {
  const nextStatus = STATUS_CYCLE[action.status] ?? 'open';
  actionMutation.mutate({ actionId: action.id, patch: { status: nextStatus } });
};
```

### Pattern 4: Add Action Row (ACT-09)

**What:** A controlled input row pinned to the bottom of the open actions table. Uses a separate `addMutation` (POST) with `assignNextId` called server-side.

```jsx
// Local state for the new-action form
const [newAction, setNewAction] = React.useState({
  description: '', owner: '', due: '', workstream: 'adr',
});
const [adding, setAdding] = React.useState(false);

const addMutation = useMutation({
  mutationFn: (actionData) => postAction(customerId, actionData),
  onSuccess: () => {
    setNewAction({ description: '', owner: '', due: '', workstream: 'adr' });
    setAdding(false);
    queryClient.invalidateQueries({ queryKey });
  },
});

// Render at bottom of open actions table:
// <tr> with inputs for each field + Save button that calls addMutation.mutate(newAction)
```

**Note:** Add action does NOT use optimistic update — the server must assign the ID before the client can display it. Instead: disable Save while `addMutation.isPending`, then invalidate to refresh with the new action in the list.

### Pattern 5: Project Setup Form State (local useState)

**What:** Local `useState` for the full workstreams form state. On Save, PATCH the entire `workstreams` object to Drive.

**Why not react-hook-form:** The 11-subworkstream form has no cross-field validation, no async validation, and no submit error UI requirements. Local `useState` is 20 lines; RHF would be 60+ lines of schema setup.

```jsx
// Initialize from customer data (useOutletContext)
const [formState, setFormState] = React.useState(() => buildFormState(customer.workstreams));

// Update a single sub-workstream field
const handleSubField = (group, subKey, field, value) => {
  setFormState(prev => ({
    ...prev,
    [group]: {
      ...prev[group],
      [subKey]: {
        ...prev[group]?.[subKey],
        [field]: value,
      },
    },
  }));
};

// buildFormState: convert nested workstreams object to form-friendly shape
// Returns same shape as customer.workstreams — no conversion needed on save
function buildFormState(workstreams) {
  const state = {};
  for (const [groupKey, group] of Object.entries(WORKSTREAM_CONFIG)) {
    state[groupKey] = {};
    for (const { key, hasScope } of group.subWorkstreams) {
      const existing = workstreams?.[groupKey]?.[key] ?? {};
      state[groupKey][key] = {
        status: existing.status ?? 'not_started',
        percent_complete: existing.percent_complete ?? 0,
        progress_notes: existing.progress_notes ?? '',
        blockers: existing.blockers ?? '',
        ...(hasScope ? { scope: existing.scope ?? [] } : {}),
      };
    }
  }
  return state;
}
```

### Pattern 6: Tag Input for Scope (No Library)

**What:** Simple array-state tag input — display existing scope items as removable chips, an `<input>` that adds on Enter or comma, and a remove button per tag.

**Why no library:** The scope array is just `string[]`. A tag input library (react-tags, downshift) adds 20-50kb for 15 lines of custom code.

```jsx
function TagInput({ tags, onChange }) {
  const [inputVal, setInputVal] = React.useState('');

  const addTag = (val) => {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputVal('');
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="flex flex-wrap gap-1 items-center border border-gray-200 rounded px-2 py-1 min-h-[34px]">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs rounded px-1.5 py-0.5">
          {tag}
          <button type="button" onClick={() => removeTag(tag)} className="text-teal-400 hover:text-teal-700">×</button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[80px] text-sm outline-none py-0.5"
        value={inputVal}
        placeholder="Add tool, press Enter"
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(inputVal); }
          if (e.key === 'Backspace' && !inputVal && tags.length) removeTag(tags[tags.length - 1]);
        }}
        onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
      />
    </div>
  );
}
```

### Pattern 7: PATCH workstreams Endpoint

**What:** New Express route PATCH `/api/customers/:id/workstreams` — replaces the full `workstreams` key atomically.

**Route file choice:** Either add to `customers.js` as `router.patch('/:id/workstreams', ...)` or create `server/routes/workstreams.js`. The cleaner option is a new file `workstreams.js` mounted in `index.js`.

```javascript
// server/routes/workstreams.js
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');

router.patch('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const newWorkstreams = req.body; // Full nested workstreams object from client

  // Atomic: read → replace workstreams key → validate → write
  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  data.workstreams = newWorkstreams;

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.json({ fileId, workstreams: data.workstreams });
}));

module.exports = router;
```

**Mount in server/index.js:**
```javascript
app.use('/api/customers/:id/workstreams', require('./routes/workstreams'));
```

### Pattern 8: POST and PATCH actions Endpoint

**What:** Actions route replaces 501 stubs with real implementations.

```javascript
// server/routes/actions.js — full implementation replacing stubs

// POST / — Add new action (ACT-09)
router.post('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const { description, owner, due, workstream } = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const newId = yamlService.assignNextId('A', data.actions);
  const newAction = {
    id: newId,
    description: description ?? '',
    owner: owner ?? '',
    due: due ?? '',
    status: 'open',
    workstream: workstream ?? '',
    completed_date: '',
  };

  data.actions.push(newAction);

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.status(201).json({ fileId, action: newAction });
}));

// PATCH /:actionId — Edit, complete, reopen, delay (ACT-02..07, ACT-11, ACT-12)
router.patch('/:actionId', asyncWrapper(async (req, res) => {
  const { id: fileId, actionId } = req.params;
  const patch = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const idx = data.actions.findIndex(a => a.id === actionId);
  if (idx === -1) {
    const { AppError } = require('../middleware/errorHandler'); // if exported
    return res.status(404).json({ error: `Action ${actionId} not found` });
  }

  data.actions[idx] = { ...data.actions[idx], ...patch };

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.json({ fileId, actionId, action: data.actions[idx] });
}));
```

### Anti-Patterns to Avoid

- **Optimistic update for POST (Add Action):** Do NOT use onMutate for new actions — the ID is assigned server-side and the client cannot know it until the response. Use `onSuccess: () => queryClient.invalidateQueries(...)` instead. Optimistic add would require generating a temporary client-side ID and then reconciling it — unnecessary complexity.
- **Storing form state in TanStack Query cache:** Project Setup form state is local until Save is clicked. Do not call `queryClient.setQueryData` on every keystroke. Only call `mutation.mutate` when the user clicks Save.
- **Dynamic Tailwind class construction for status badges:** ACT-06 status cycle produces one of four known statuses. Use a `STATUS_BADGE_CLASSES` lookup (all complete literal strings) — never `'bg-' + status + '-100'`.
- **Re-fetching customer inside ActionManager or ProjectSetup:** Both views are children of `CustomerLayout` which provides `useOutletContext()`. Never add `useQuery(['customer', customerId])` inside these views.
- **Allowing `scope` to be undefined in the PATCH payload:** When a sub-workstream without `hasScope` is sent in the PATCH /workstreams body, the server should not add a `scope` key. The client must only include `scope` for sub-workstreams where `hasScope === true`.
- **Using `<a href>` instead of `<Link>` for the Project Setup link:** `CustomerOverview.jsx` line 390 currently uses `<a href=...>` for the "Project Setup →" link, which causes a full page reload. This should be converted to `<Link to=...>` in Phase 3.

---

## API Endpoints Needed

| Method | Path | Purpose | Body | Returns |
|--------|------|---------|------|---------|
| PATCH | `/api/customers/:id/workstreams` | Replace full workstreams object | `{adr: {...}, biggy: {...}}` | `{fileId, workstreams}` |
| POST | `/api/customers/:id/actions` | Add new action | `{description, owner, due, workstream}` | `{fileId, action}` (with assigned id) |
| PATCH | `/api/customers/:id/actions/:actionId` | Edit, complete, reopen, delay | partial action fields | `{fileId, actionId, action}` |
| GET | `/api/customers/:id/actions` | (Optional) Can use existing GET /customers/:id | — | — |

**Note:** GET actions is not strictly needed — the full customer object from `GET /api/customers/:id` already contains `actions[]`. The stub GET / in `actions.js` can remain a 501 or be removed entirely. All client-side action reads use the `['customer', customerId]` query cache.

**Route mounting required in `server/index.js`:**
```javascript
app.use('/api/customers/:id/workstreams', require('./routes/workstreams'));
```
This line is NOT yet present in `server/index.js`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sequential A-### ID assignment | Custom counter in client or ad-hoc server logic | `yamlService.assignNextId('A', data.actions)` | Already exists, handles gaps, race-safe for single-user |
| Optimistic rollback | Custom previousState variable + manual cleanup | TanStack Query `onMutate` context + `onError` rollback | TanStack handles cancellation, race conditions, and rollback |
| Conditional class names | String template ternaries | `clsx()` | Already installed; prevents Tailwind v4 purge issues |
| Tag input component | Third-party library (react-tags, downshift) | 15-line custom TagInput (see Pattern 6) | ~40kb library vs. 15 lines; no autocomplete needed |
| Table sort | react-table / TanStack Table | `useMemo` + `useState` | 3 columns, straightforward sort; library overhead not justified |
| Date formatting | date-fns / dayjs | `new Date(str).toISOString().split('T')[0]` | Only need YYYY-MM-DD; no timezone conversion required |

---

## Common Pitfalls

### Pitfall 1: sample.yaml Fixture Still Uses Old 4+2 Workstream Structure

**What goes wrong:** `actions.test.js` imports `sample.yaml` and tests fail with undefined properties because the fixture has `integrations` not `biggy_app_integration`, and ADR has `configuration` not `normalization`.

**Why it happens:** The real Drive YAML files were migrated in Phase 2 Plan 05 via `scripts/migrateYaml.js`, but `server/fixtures/sample.yaml` was not updated — it still has the old 4+2 structure.

**How to avoid:** Wave 0 for Phase 3 must update `server/fixtures/sample.yaml` to match the 11-subworkstream structure with scope arrays before writing any test stubs that depend on workstream structure. The existing risks.test.js and milestones.test.js do not exercise workstream fields, so they are currently passing despite the mismatch.

**Warning signs:** Test passes for risk/milestone routes but fails when workstreams field is asserted on the response body.

### Pitfall 2: `<a href>` for Project Setup Link Causes Full Page Reload

**What goes wrong:** Clicking "Project Setup →" in CustomerOverview triggers a full browser navigation instead of React Router client-side transition. The customer data re-fetches from Drive unnecessarily.

**Why it happens:** `CustomerOverview.jsx` line 390 uses `<a href={...}>` instead of `<Link to={...}>`. This was noted in the Phase 2 codebase but not fixed.

**How to avoid:** In Phase 3 Wave 1 (when creating `ProjectSetup.jsx`), also update `CustomerOverview.jsx` to use `<Link to={...}>` for the Project Setup link. It's a one-line change.

### Pitfall 3: Add Action Optimistic Update Race Condition

**What goes wrong:** If an optimistic add is used, the temporary client-side ID (e.g., "TEMP-1") appears in the UI and then flickers to "A-004" on invalidation/refetch. Users may see the ID change.

**Why it happens:** The ID is assigned server-side. No client-side prediction is possible without extra server-client coordination.

**How to avoid:** Do NOT use optimistic update for POST. Disable the Save button during `addMutation.isPending`, show a spinner, then let `onSuccess → invalidateQueries` refresh the list with the real ID. The 1-2 second delay is acceptable for an add operation.

### Pitfall 4: Project Setup "Saving" Mutation Invalidates Mid-Edit

**What goes wrong:** After clicking Save, `onSettled → invalidateQueries` triggers a refetch that overwrites the local form state with the freshly-fetched customer data. If the user is still on the form after Save, their edits since the last save are gone.

**Why it happens:** `invalidateQueries` causes CustomerLayout to refetch, which updates the `customer` object in `useOutletContext()`, and the form `useState` was initialized from that customer object.

**How to avoid:** ProjectSetup form state is initialized once on mount (`useState(() => buildFormState(...))`). It does NOT re-initialize on every `customer` update because `useState` initializer only runs once. The form re-init only happens on re-mount (full navigation away and back). This is the correct behavior — confirm it during implementation.

### Pitfall 5: Completed Date Format Inconsistency

**What goes wrong:** The completed_date field in sample.yaml contains `"2026-03-10"` for A-001 but `""` for open actions. If `new Date().toISOString()` is used without `.split('T')[0]`, a full ISO timestamp ("2026-03-04T15:30:00.000Z") is written. This looks ugly in the YAML and may cause display issues.

**Why it happens:** JavaScript `Date.toISOString()` returns full UTC timestamp; the schema expects YYYY-MM-DD.

**How to avoid:** Always use `new Date().toISOString().split('T')[0]` when setting `completed_date`. Consider extracting this as a `todayString()` utility in `deriveCustomer.js` or `api.js`.

### Pitfall 6: PATCH /workstreams Body Validation

**What goes wrong:** Client sends a malformed workstreams object (e.g., missing required group, a sub-workstream value is null instead of an empty object). The Drive write succeeds but the YAML is corrupted.

**Why it happens:** No schema validation on the workstreams nested object — `validateYaml()` only checks top-level keys.

**How to avoid:** Server-side, after replacing `data.workstreams = req.body`, verify that `WORKSTREAM_CONFIG` groups (adr, biggy) are present in the new value. A lightweight check:
```javascript
const REQUIRED_GROUPS = ['adr', 'biggy'];
for (const group of REQUIRED_GROUPS) {
  if (typeof newWorkstreams[group] !== 'object' || newWorkstreams[group] === null) {
    return res.status(422).json({ error: `Missing required workstream group: ${group}` });
  }
}
```

### Pitfall 7: Filter State Reset on Re-render

**What goes wrong:** After an action mutation resolves and `invalidateQueries` triggers a re-render, sort/filter state resets to defaults because the state was tied to the component.

**Why it happens:** This does NOT happen with `useState` — component state persists across re-renders triggered by query cache updates. The component only resets state on unmount/remount.

**How to avoid:** This is not a real pitfall with `useState`. Just confirming: filter state in `ActionManager.jsx` local `useState` survives query invalidations. No action needed.

### Pitfall 8: Status Cycle Badge Classes Must Use Lookup Table

**What goes wrong:** Status cycle button uses `className={\`bg-${status}-100 text-${status}-800\`` — classes are purged in Tailwind v4 production build.

**Why it happens:** Same as Phase 2 Pitfall 2 — Tailwind v4 scans for literal class strings.

**How to avoid:** Use a `STATUS_BADGE_CLASSES` lookup with complete literal strings:
```javascript
const STATUS_BADGE_CLASSES = {
  open:      'bg-blue-100 text-blue-700',
  delayed:   'bg-orange-100 text-orange-700',
  in_review: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};
```

---

## Code Examples

### Overdue Date Cell (Red Rendering — ACT-05)

```jsx
// Source: CustomerOverview.jsx line 429 (same pattern, used here for action due dates)
function DueDateCell({ due, status }) {
  const isOverdue = due && status !== 'completed' && new Date(due) < new Date();
  return (
    <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}>
      {due || '—'}
    </span>
  );
}
```

### Collapsible Completed Table (ACT-10)

```jsx
const [showCompleted, setShowCompleted] = React.useState(false);
const completedActions = (customer.actions ?? []).filter(a => a.status === 'completed');

// Render:
<button
  onClick={() => setShowCompleted(v => !v)}
  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
>
  <span>{showCompleted ? '▾' : '▸'}</span>
  Completed Actions ({completedActions.length})
</button>
{showCompleted && (
  <table>...</table>
)}
```

### Sortable Column Header

```jsx
function SortableHeader({ label, sortKey: key, currentKey, currentDir, onSort }) {
  const isActive = currentKey === key;
  return (
    <th
      className="cursor-pointer select-none pb-2 text-xs font-medium text-gray-500 text-left hover:text-gray-900"
      onClick={() => onSort(key)}
    >
      {label}
      {isActive && <span className="ml-1">{currentDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}
```

### api.js additions

```javascript
// Add to client/src/api.js
export const postAction = (customerId, body) =>
  apiFetch(`/customers/${customerId}/actions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const patchAction = (customerId, actionId, patch) =>
  apiFetch(`/customers/${customerId}/actions/${actionId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const patchWorkstreams = (customerId, workstreams) =>
  apiFetch(`/customers/${customerId}/workstreams`, {
    method: 'PATCH',
    body: JSON.stringify(workstreams),
  });
```

### Workstream Dropdown Options for Actions (ACT-07)

```javascript
// Derive flat options list from WORKSTREAM_CONFIG for the workstream dropdown
export const WORKSTREAM_OPTIONS = Object.entries(WORKSTREAM_CONFIG).flatMap(
  ([groupKey, group]) =>
    group.subWorkstreams.map(sw => ({
      value: sw.key,
      label: `${group.label} / ${sw.label}`,
    }))
);
// Produces 11 options: "ADR / Inbound Integrations", "ADR / Outbound Integrations", etc.
```

---

## Validation Architecture

nyquist_validation is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (Node 18+ built-in) — established in Phase 1 |
| Config file | none — `node --test` runs directly |
| Quick run command | `node --test server/routes/actions.test.js` |
| Full suite command | `node --test server/services/yamlService.test.js server/routes/risks.test.js server/routes/milestones.test.js server/routes/actions.test.js server/routes/workstreams.test.js client/src/lib/deriveCustomer.test.js` |

Note: `actions.test.js` and `workstreams.test.js` use the same supertest + require.cache mock pattern established in `risks.test.js` and `milestones.test.js`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACT-01 | Open actions table renders sortable columns | manual | Browser: table visible with all 7 columns; click header to sort | N/A |
| ACT-02 | Checkbox complete moves action atomically | integration | `node --test server/routes/actions.test.js` (PATCH with status:completed) | ❌ Wave 0 |
| ACT-03 | Optimistic Saving... indicator | manual | Browser: click checkbox, confirm Saving... appears then disappears | N/A |
| ACT-04 | Description/owner inline edit | integration | `node --test server/routes/actions.test.js` (PATCH partial fields) | ❌ Wave 0 |
| ACT-05 | Overdue due date renders red | unit | `node --test client/src/lib/deriveCustomer.test.js` (add isOverdue helper test) | ❌ Wave 0 addition |
| ACT-06 | Status badge cycles correctly | unit | `node --test client/src/lib/deriveCustomer.test.js` (STATUS_CYCLE map test) | ❌ Wave 0 addition |
| ACT-07 | Workstream dropdown has all 11 options | unit | `node --test client/src/lib/deriveCustomer.test.js` (WORKSTREAM_OPTIONS length=11) | ❌ Wave 0 addition |
| ACT-08 | Sort + filter by workstream and status | manual | Browser: filter to specific workstream, confirm only matching rows visible | N/A |
| ACT-09 | Add Action assigns next sequential A-### ID | integration | `node --test server/routes/actions.test.js` (POST returns A-004 given sample.yaml A-003 max) | ❌ Wave 0 |
| ACT-10 | Completed table collapsed by default | manual | Browser: completed section starts collapsed, click to expand | N/A |
| ACT-11 | Reopen clears completed_date and sets status:open | integration | `node --test server/routes/actions.test.js` (PATCH A-001 with status:open, completed_date:'') | ❌ Wave 0 |
| ACT-12 | Mark Delayed sets status:delayed | integration | `node --test server/routes/actions.test.js` (PATCH with status:delayed) | ❌ Wave 0 |
| SETUP | PATCH /workstreams replaces full object atomically | integration | `node --test server/routes/workstreams.test.js` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test server/services/yamlService.test.js server/routes/risks.test.js server/routes/milestones.test.js` (existing suite stays green)
- **Per new route implemented:** Run the specific new test file (e.g., `node --test server/routes/actions.test.js`)
- **Per wave merge:** Full suite (see above)
- **Phase gate:** Full suite green + manual browser checkpoint before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/fixtures/sample.yaml` — update to 11-subworkstream structure with scope arrays (REQUIRED before workstreams tests work)
- [ ] `server/routes/actions.test.js` — covers ACT-02, ACT-04, ACT-09, ACT-11, ACT-12 (PATCH + POST endpoints)
- [ ] `server/routes/workstreams.test.js` — covers SETUP-3 (PATCH /workstreams atomic write)
- [ ] `client/src/lib/deriveCustomer.test.js` additions — covers ACT-05 (isOverdue), ACT-06 (STATUS_CYCLE), ACT-07 (WORKSTREAM_OPTIONS length)

Note on existing test files: `risks.test.js` and `milestones.test.js` are already green. `deriveCustomer.test.js` has 31 passing tests. All Phase 3 test additions are either new files or additive to the existing deriveCustomer test file.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate mutations per operation | Single `actionMutation` handles all action writes | N/A — Phase 2 established this | One mutation = one `isPending` state; no multi-mutation complexity |
| Full page for forms | Inline table editing | Phase 2 established InlineEditField | Zero navigation cost; optimistic updates feel instant |
| Server-side table sort/filter | Client-side useMemo sort/filter | N/A | No extra server endpoints; works on cached customer data |

**Deprecated/outdated in this codebase:**
- Old 4+2 workstream structure in `sample.yaml`: replaced by 11-subworkstream structure. Must update fixture in Wave 0.
- `<a href>` for Project Setup link in CustomerOverview: should be converted to `<Link>` in Phase 3.

---

## Open Questions

1. **Project Setup route registration**
   - What we know: `main.jsx` does NOT have a `setup` route under `customer/:customerId`. The CustomerOverview "Project Setup →" link points to `/customer/:id/setup` but it's not registered.
   - What's unclear: Whether this causes a 404 or a React Router fallback when clicked.
   - Recommendation: Phase 3 Wave 1 adds `{ path: 'setup', element: <ProjectSetup /> }` to the router AND creates `ProjectSetup.jsx`. Also convert the `<a href>` to `<Link>`.

2. **Workstream route mounting**
   - What we know: `server/index.js` mounts routes for actions, risks, milestones, artifacts, history, reports — but NOT workstreams. There is no `workstreams.js` route file yet.
   - What's unclear: Nothing — the gap is confirmed.
   - Recommendation: Wave 0 creates the file stub; Wave 1 implements it; Wave 1 also mounts it in index.js.

3. **sample.yaml scope fields for test assertions**
   - What we know: The real Drive YAML files have `scope: [...]` arrays on hasScope sub-workstreams (added in migration). sample.yaml does not have these.
   - What's unclear: Whether actions.test.js tests need to assert on scope fields (they don't — scope is in workstreams, not actions).
   - Recommendation: Update sample.yaml with scope arrays only on `inbound_integrations`, `outbound_integrations` (ADR) and `udc`, `real_time_integrations` (Biggy). Other sub-workstreams should not have scope keys. Empty arrays (`scope: []`) are valid defaults.

4. **GET /api/customers/:id/actions stub**
   - What we know: `actions.js` has a GET / stub returning 501. The Action Manager will use `useOutletContext()` and never call this endpoint.
   - What's unclear: Nothing — the stub can remain (it doesn't affect Phase 3 functionality).
   - Recommendation: Leave the GET / stub in place. Do not implement it — it's wasted effort for Phase 3.

---

## Sources

### Primary (HIGH confidence)

- `/Users/jmiloslavsky/Documents/Project Assistant Code/client/src/lib/deriveCustomer.js` — WORKSTREAM_CONFIG (11 sub-workstreams), COLOR_TO_STATUS, all derive functions
- `/Users/jmiloslavsky/Documents/Project Assistant Code/client/src/views/CustomerOverview.jsx` — InlineEditField, InlineSelectField, useMutation pattern, STATUS_DOT_CLASSES lookup
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/routes/risks.js` — atomic PATCH pattern (Phase 2 implementation)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/routes/risks.test.js` — supertest + require.cache mock pattern
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/services/yamlService.js` — assignNextId, validateYaml, normalizeForSerialization
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/routes/actions.js` — stub routes confirm what needs implementation
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/index.js` — confirms workstreams route NOT mounted
- `/Users/jmiloslavsky/Documents/Project Assistant Code/server/fixtures/sample.yaml` — confirms old 4+2 structure still present (mismatch with WORKSTREAM_CONFIG)
- `/Users/jmiloslavsky/Documents/Project Assistant Code/.planning/phases/02-read-surface/02-05-SUMMARY.md` — WORKSTREAM_CONFIG finalized, Phase 3 context

### Secondary (MEDIUM confidence)

- [TanStack Query v5 Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates) — onMutate/onError/onSettled pattern (verified working in Phase 2)
- Phase 2 summary files — confirmed patterns actually work in this codebase (not just documented)

### Tertiary (LOW confidence)

- None — all claims verified from live codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json; zero new dependencies
- Architecture: HIGH — all patterns derived from working Phase 2 code; no new libraries
- API endpoints: HIGH — verified from routes/actions.js stubs and server/index.js mount list
- Fixture mismatch: HIGH — directly observed from sample.yaml vs WORKSTREAM_CONFIG comparison
- Pitfalls: HIGH — derived from code inspection, not guesswork

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack; no new dependencies to drift)
