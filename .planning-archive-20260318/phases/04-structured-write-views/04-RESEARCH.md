# Phase 4: Structured Write Views - Research

**Researched:** 2026-03-05
**Domain:** React form patterns, inline CRUD tables, atomic Express write endpoints
**Confidence:** HIGH

## Summary

Phase 4 delivers two new views — Weekly Update Form (`/customer/:id/update`) and Artifact Manager (`/customer/:id/artifacts`) — both already registered in `main.jsx` as route stubs pointing to placeholder components. The server already has stub route files (`history.js`, `artifacts.js`) with the correct HTTP verbs returning 501. The core infrastructure (atomic write pattern, optimistic UI, TanStack Query v5, test harness) is fully proven from Phases 2 and 3. Phase 4 is a straight application of the existing patterns to two new data domains.

The key insight for planning: **both views reuse identical patterns already proven in Phase 3**. Artifact Manager is a near-clone of ActionManager (inline CRUD table, POST for new item with server-assigned X-### ID, PATCH for edits, optimistic UI). Weekly Update Form is a structured POST-only form that builds a new `history` array entry and prepends it to `data.history` before writing Drive atomically.

**Critical schema finding:** The sample.yaml uses `week_ending` as the history entry key, but requirements UPD-01 through UPD-04 call it `week_of`. The planner must pick one and apply it consistently to both the server route and the client form. The existing history entry in sample.yaml uses `week_ending` — the planner should align the form field name to match the actual YAML schema key (`week_ending`) unless a deliberate rename is intended. This must be resolved before implementation.

**Primary recommendation:** Implement in two parallel tracks: (1) server endpoints for artifacts + history, with tests, then (2) client views consuming them — same wave structure as Phase 3.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UPD-01 | Form to create a new history entry; `week_of` defaults to today's date | WORKSTREAM_CONFIG drives the 11 per-workstream input sections; `new Date().toISOString().split('T')[0]` for default |
| UPD-02 | Per-workstream section: status (green/yellow/red), percent_complete, progress_notes, blockers for all 11 sub-workstreams | WORKSTREAM_CONFIG iteration pattern from deriveCustomer.js; form state as nested object keyed by groupKey.subKey |
| UPD-03 | Summary section: multi-entry fields for progress bullets, decisions, outcomes | Maps to history entry fields `decisions`, `outcomes`; progress bullets map to a new `progress` array or inline text |
| UPD-04 | Submit prepends a new well-formed history entry to YAML history array and writes to Drive atomically | `POST /api/customers/:id/history` → read → unshift → validate → serialize → write; `history[0]` = newest |
| UPD-05 | After successful submit, navigate back to Customer Overview | `useNavigate()` in `onSuccess` callback of useMutation; invalidate `['customer', customerId]` query |
| ART-01 | Lists all artifacts with id, type, title, status, owner, last_updated in a table | Read from `customer.artifacts` via `useOutletContext()` — no second useQuery needed |
| ART-02 | "Add Artifact" inline row; Save assigns next sequential X-### ID via server | `POST /api/customers/:id/artifacts` → `assignNextId('X', data.artifacts)` — same pattern as A-### actions |
| ART-03 | All artifact fields editable inline: type (dropdown), title, description, status (dropdown), owner | InlineEditField + InlineSelectField reused or extracted; ARTIFACT_TYPE_OPTIONS and ARTIFACT_STATUS_OPTIONS lookup tables |
| ART-04 | Status change to superseded or retired writes to Drive atomically | `PATCH /api/customers/:id/artifacts/:artifactId` — same pattern as PATCH actions; no special logic needed for status values |
| ART-05 | All writes optimistic with "Saving..." indicator | Same optimistic mutation pattern: onMutate setQueryData, onError rollback, onSettled invalidateQueries |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.0 | UI components | Already installed |
| TanStack Query | 5.90.21 | Mutations + cache invalidation | Already installed; proven pattern |
| react-router-dom | 7.13.1 | `useNavigate`, `useOutletContext`, `useParams` | Already installed; routes already registered |
| clsx | 2.1.1 | Conditional class composition | Already installed; required for Tailwind v4 |
| node:test | built-in (Node 24.14.0) | Server-side test runner | Established in Phase 1 — zero npm install |
| supertest | 7.2.2 | HTTP assertions against Express | Already installed in server/devDependencies |

### No New Dependencies Required
Phase 4 requires zero npm installs. All needed libraries are already installed and proven.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| InlineEditField (copied) | Extract to shared component | Extract only if a third consumer appears; two consumers (ActionManager + ArtifactManager) is borderline; planner's call |
| Simple `<textarea>` for decisions/outcomes | Multi-entry tag-style input | Textarea is sufficient; decisions/outcomes are free text, not structured arrays in the schema |

## Architecture Patterns

### Existing Pattern: Atomic Write (CONFIRMED from server/routes/actions.js)
```javascript
// Source: server/routes/actions.js — proven pattern
router.post('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;              // mergeParams: true required
  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  // Modify in memory
  const newId = yamlService.assignNextId('A', data.actions);
  data.actions.push({ id: newId, ...fields });

  // Serialize + write
  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.status(201).json({ fileId, action: newAction });
}));
```

### History Entry Structure (from sample.yaml)
```yaml
# Actual YAML key is `week_ending` (not `week_of` as in requirements text)
history:
  - week_ending: "2026-03-07"   # PREPEND-ordered: history[0] is most recent
    workstreams:
      adr:
        inbound_integrations:
          status: "in_progress"
          percent_complete: 40
          progress_notes: "..."
          blockers: ""
        # ...all 6 ADR sub-workstreams
      biggy:
        # ...all 5 Biggy sub-workstreams
    decisions: "Agreed to use REST webhooks for inbound integrations"
    outcomes: "Network diagram completed and approved"
    # NOTE: no `progress` bullets field in current sample.yaml schema
    # UPD-03 mentions "progress bullets" — planner must decide field name
```

### Artifact Schema (from sample.yaml)
```yaml
artifacts:
  - id: "X-001"
    type: "document"           # ARTIFACT_TYPE_OPTIONS needed
    title: "Network Architecture Diagram"
    description: "..."
    status: "active"           # active | in_review | superseded | retired
    owner: "Bob Lee"
    last_updated: "2026-03-10"
    related_topics: []
    linked_actions: ["A-001"]
```

### Pattern: POST History Entry (new for Phase 4)
```javascript
// server/routes/history.js — replace 501 stub
router.post('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const entry = req.body; // validated on client before POST

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  // PREPEND: history[0] = newest entry
  data.history.unshift(entry);

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.status(201).json({ fileId, entry });
}));
```

### Pattern: POST Artifact (mirrors POST action)
```javascript
// server/routes/artifacts.js — replace 501 stub
router.post('/', asyncWrapper(async (req, res) => {
  const { id: fileId } = req.params;
  const { type, title, description, status, owner } = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const newId = yamlService.assignNextId('X', data.artifacts); // X-### prefix
  const today = new Date().toISOString().split('T')[0];
  const newArtifact = {
    id: newId,
    type: type ?? 'document',
    title: title ?? '',
    description: description ?? '',
    status: status ?? 'active',
    owner: owner ?? '',
    last_updated: today,
    related_topics: [],
    linked_actions: [],
  };

  data.artifacts.push(newArtifact);

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.status(201).json({ fileId, artifact: newArtifact });
}));
```

### Pattern: PATCH Artifact (mirrors PATCH action exactly)
```javascript
// server/routes/artifacts.js
router.patch('/:artifactId', asyncWrapper(async (req, res) => {
  const { id: fileId, artifactId } = req.params;
  const patch = req.body;

  const content = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);

  const idx = data.artifacts.findIndex(a => a.id === artifactId);
  if (idx === -1) {
    return res.status(404).json({ error: `Artifact ${artifactId} not found` });
  }

  data.artifacts[idx] = { ...data.artifacts[idx], ...patch };

  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(fileId, yamlString);

  res.json({ fileId, artifactId, artifact: data.artifacts[idx] });
}));
```

### Pattern: Optimistic useMutation (from ActionManager.jsx — proven)
```javascript
// Source: client/src/views/ActionManager.jsx
const artifactMutation = useMutation({
  mutationFn: ({ artifactId, patch }) => patchArtifact(customerId, artifactId, patch),
  onMutate: async ({ artifactId, patch }) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old) => ({
      ...old,
      artifacts: (old?.artifacts ?? []).map(a =>
        a.id === artifactId ? { ...a, ...patch } : a
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

### Pattern: POST with onSuccess invalidation (no optimistic — server assigns ID)
```javascript
// Source: client/src/views/ActionManager.jsx — addMutation pattern
const addMutation = useMutation({
  mutationFn: (artifactData) => postArtifact(customerId, artifactData),
  onSuccess: () => {
    setNewArtifact({ type: 'document', title: '', description: '', status: 'active', owner: '' });
    queryClient.invalidateQueries({ queryKey });
  },
});
```

### Pattern: Weekly Update Form — POST with navigate on success
```javascript
// WeeklyUpdateForm.jsx
const { customerId } = useParams();
const navigate = useNavigate();
const queryClient = useQueryClient();

const submitMutation = useMutation({
  mutationFn: (entry) => postHistory(customerId, entry),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    navigate(`/customer/${customerId}`); // UPD-05: back to CustomerOverview
  },
});
```

### Pattern: Weekly Update Form State — Nested by workstream
```javascript
// Build form state from WORKSTREAM_CONFIG — same shape as history entry workstreams object
const buildInitialWorkstreams = () =>
  Object.fromEntries(
    Object.entries(WORKSTREAM_CONFIG).map(([groupKey, group]) => [
      groupKey,
      Object.fromEntries(
        group.subWorkstreams.map(sw => [
          sw.key,
          { status: 'green', percent_complete: 0, progress_notes: '', blockers: '' }
        ])
      )
    ])
  );
```

### Anti-Patterns to Avoid
- **Dynamic Tailwind class construction:** Status lookup tables must use complete literal strings. `STATUS_BADGE_CLASSES = { active: 'bg-green-100 text-green-700', ... }` not `'bg-' + color + '-100'`
- **useQuery in child views:** ArtifactManager and WeeklyUpdateForm MUST use `useOutletContext()` — not a second `useQuery` call. CustomerLayout provides `{ customer }` via Outlet context
- **Optimistic update for POST (ID-assigning):** Do not attempt optimistic update for POST artifacts — server assigns X-### ID. Use `onSuccess` + `invalidateQueries` only
- **Forgetting `mergeParams: true`:** All nested routes under `/api/customers/:id/*` require `Router({ mergeParams: true })` or `req.params.id` will be undefined
- **history.push vs history.unshift:** History array is PREPEND-ordered (`history[0]` = most recent). Use `data.history.unshift(entry)` not `push`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| X-### ID assignment | Custom counter | `yamlService.assignNextId('X', data.artifacts)` | Already handles gaps, zero-padding, all edge cases |
| Atomic Drive write | Custom file operations | `driveService.readYamlFile` + `driveService.writeYamlFile` | Race-condition-safe; handles Drive API errors |
| YAML serialization | Manual string building | `yamlService.serializeYaml(data)` | Preserves key order, prevents coercion, handles multiline |
| Optimistic rollback | Custom state management | TanStack Query v5 `onMutate/onError/onSettled` | Handles race conditions, query cancellation, cache consistency |
| Per-row "Saving..." indicator | Global loading state | `mutation.isPending && mutation.variables?.artifactId === artifact.id` | Per-row scoping proven in ActionManager |
| Conditional class names | String interpolation | `clsx()` + complete literal class lookup tables | Tailwind v4 purge safety — no dynamic class construction |

## Common Pitfalls

### Pitfall 1: week_ending vs week_of field name mismatch
**What goes wrong:** The requirements text (UPD-01 through UPD-04) uses `week_of` but the actual sample.yaml schema uses `week_ending`. Implementing the form with `week_of` and the server with `week_ending` (or vice versa) would silently create malformed history entries.
**Why it happens:** Requirements were written before sample.yaml was finalized.
**How to avoid:** Planner must choose one name and apply it consistently in: (a) the POST body the form sends, (b) the server route that stores it, (c) the YAML that gets written to Drive. Recommend `week_ending` to match the existing sample.yaml fixture and any existing history entries in Drive files.
**Warning signs:** CustomerOverview displays `lastUpdated = latest?.week_ending ?? '—'` — if a new entry uses `week_of`, the header will show `—` after submit.

### Pitfall 2: `related_topics` and `linked_actions` required in new artifacts
**What goes wrong:** If POST artifact doesn't include `related_topics: []` and `linked_actions: []`, these fields will be absent from the written YAML. If any consumer (future Phase 5 report logic) expects them, it will crash.
**Why it happens:** The artifact schema has these fields but ART-02/ART-03 requirements don't mention them.
**How to avoid:** Server route always initializes `related_topics: []` and `linked_actions: []` in the new artifact object regardless of what the client POSTs.

### Pitfall 3: Date defaulting for `last_updated` on artifact edits
**What goes wrong:** PATCH artifact (ART-03/ART-04) updates fields but may not update `last_updated`. The ART-01 requirement lists `last_updated` as a display column, so it should reflect when edits happen.
**Why it happens:** Generic patch pass-through doesn't auto-update timestamps.
**How to avoid:** Server PATCH route appends `last_updated: new Date().toISOString().split('T')[0]` to the patch object before applying it to `data.artifacts[idx]`.

### Pitfall 4: InlineSelectField first-option onChange bug
**What goes wrong:** If the artifact type or status select has `value={value}` where `value` is undefined and no `<option value="">` placeholder exists, selecting the first option fires no `onChange` event.
**Why it happens:** Browser sees no value change when both the DOM state and React state are the first option.
**How to avoid:** Follow the proven fix from Phase 3: include `<option value="">— Select —</option>` placeholder and `value={value ?? ''}` as the controlled value. Guard onChange with `if (e.target.value)`.

### Pitfall 5: History form submits empty workstream fields
**What goes wrong:** If any sub-workstream input is left at the default state, the submitted entry could have `percent_complete: ""` (string from input) instead of `0` (number).
**Why it happens:** HTML `<input type="number">` returns a string value via `e.target.value`.
**How to avoid:** Server route coerces `percent_complete` to integer: `parseInt(sub.percent_complete, 10) || 0`. Alternatively, the client normalizes before POSTing.

### Pitfall 6: Form re-render performance with 11 sub-workstream inputs
**What goes wrong:** 11 sub-workstreams × 4 fields = 44 inputs in one form. If form state is a flat object and every keystroke re-renders the entire form, the UX becomes sluggish.
**Why it happens:** All 44 inputs share the same React state object; any change causes full re-render.
**How to avoid:** Keep state as a two-level nested object (groupKey → subKey → fields) and use targeted updater functions. `useMemo` for the derived form sections is unnecessary at 44 fields — standard React is fast enough. No special optimization needed.

## Code Examples

### api.js additions needed
```javascript
// Source: pattern from existing api.js
export const postArtifact = (customerId, body) =>
  apiFetch(`/customers/${customerId}/artifacts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const patchArtifact = (customerId, artifactId, patch) =>
  apiFetch(`/customers/${customerId}/artifacts/${artifactId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const postHistory = (customerId, entry) =>
  apiFetch(`/customers/${customerId}/history`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
```

### Artifact status + type options (complete literal strings — Tailwind v4)
```javascript
// ArtifactManager.jsx — module-level lookups
const ARTIFACT_STATUS_OPTIONS = [
  { value: 'active',     label: 'Active' },
  { value: 'in_review',  label: 'In Review' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'retired',    label: 'Retired' },
];

const ARTIFACT_TYPE_OPTIONS = [
  { value: 'document',      label: 'Document' },
  { value: 'runbook',       label: 'Runbook' },
  { value: 'diagram',       label: 'Diagram' },
  { value: 'presentation',  label: 'Presentation' },
  { value: 'report',        label: 'Report' },
  // extend as needed — only values that exist in sample.yaml schema
];

// Status badge classes — complete literals (Tailwind v4 purge safety)
const ARTIFACT_STATUS_BADGE_CLASSES = {
  active:     'bg-green-100 text-green-700',
  in_review:  'bg-purple-100 text-purple-700',
  superseded: 'bg-gray-100 text-gray-600',
  retired:    'bg-red-100 text-red-600',
};
```

### Weekly Update Form — workstream input section
```javascript
// WeeklyUpdateForm.jsx — per-workstream inputs block
// Iterate WORKSTREAM_CONFIG to generate all 11 sections
{Object.entries(WORKSTREAM_CONFIG).map(([groupKey, group]) => (
  <fieldset key={groupKey} className="border border-gray-200 rounded-lg p-4">
    <legend className="text-sm font-bold text-gray-700 px-2">{group.label}</legend>
    {group.subWorkstreams.map(sw => (
      <div key={sw.key} className="mb-4 last:mb-0">
        <label className="text-sm font-medium text-gray-700 block mb-1">{sw.label}</label>
        <div className="grid grid-cols-2 gap-2">
          {/* Status select */}
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1.5"
            value={formState[groupKey][sw.key].status}
            onChange={e => updateWorkstream(groupKey, sw.key, 'status', e.target.value)}
          >
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="red">Red</option>
          </select>
          {/* Percent complete */}
          <input
            type="number"
            min="0" max="100"
            className="text-sm border border-gray-300 rounded px-2 py-1.5"
            value={formState[groupKey][sw.key].percent_complete}
            onChange={e => updateWorkstream(groupKey, sw.key, 'percent_complete', parseInt(e.target.value) || 0)}
          />
          {/* Progress notes */}
          <textarea
            className="text-sm border border-gray-300 rounded px-2 py-1.5 col-span-2"
            placeholder="Progress notes..."
            rows={2}
            value={formState[groupKey][sw.key].progress_notes}
            onChange={e => updateWorkstream(groupKey, sw.key, 'progress_notes', e.target.value)}
          />
          {/* Blockers */}
          <textarea
            className="text-sm border border-gray-300 rounded px-2 py-1.5 col-span-2 border-orange-200"
            placeholder="Blockers (if any)..."
            rows={1}
            value={formState[groupKey][sw.key].blockers}
            onChange={e => updateWorkstream(groupKey, sw.key, 'blockers', e.target.value)}
          />
        </div>
      </div>
    ))}
  </fieldset>
))}
```

### State updater helper
```javascript
const updateWorkstream = (groupKey, subKey, field, value) => {
  setFormState(prev => ({
    ...prev,
    [groupKey]: {
      ...prev[groupKey],
      [subKey]: { ...prev[groupKey][subKey], [field]: value },
    },
  }));
};
```

## Route + File Inventory

### Server routes to implement (replacing 501 stubs)
| File | Verbs | Status |
|------|-------|--------|
| `server/routes/history.js` | POST `/` | Stub (501) — implement |
| `server/routes/artifacts.js` | POST `/`, PATCH `/:artifactId` | Stub (501) — implement |

### Server tests to create
| File | What to test |
|------|-------------|
| `server/routes/artifacts.test.js` | POST returns X-002 ID, PATCH updates fields, PATCH returns 404 for unknown ID, Drive write called once |
| `server/routes/history.test.js` | POST prepends entry as history[0], POST returns 201 with entry, Drive write called once |

### Client files to implement (replacing placeholders)
| File | Status |
|------|--------|
| `client/src/views/ArtifactManager.jsx` | Placeholder (9 lines) — full replacement |
| `client/src/views/WeeklyUpdateForm.jsx` | Placeholder (9 lines) — full replacement |
| `client/src/api.js` | Add: `postArtifact`, `patchArtifact`, `postHistory` |

### Route registration: already done
Both routes are already mounted in `server/index.js`:
```javascript
app.use('/api/customers/:id/artifacts', require('./routes/artifacts'));
app.use('/api/customers/:id/history', require('./routes/history'));
```
Both views are already in `main.jsx`:
```javascript
{ path: 'artifacts', element: <ArtifactManager /> },
{ path: 'update', element: <WeeklyUpdateForm /> },
```
**Zero routing work required in Phase 4.**

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Actions route as model | Artifacts route follows same pattern exactly | Zero learning curve — copy, adapt prefix |
| Click-to-cycle status | `<select>` dropdown (Phase 3 fix) | Use `<select>` in ArtifactManager from the start |
| Inline components duplicated | Extract when third consumer appears | ArtifactManager is the second consumer of InlineEditField/InlineSelectField — consider extraction now |

## Open Questions

1. **`week_of` vs `week_ending` field name**
   - What we know: Requirements say `week_of`; sample.yaml (ground truth) uses `week_ending`; CustomerOverview already reads `latest?.week_ending`
   - What's unclear: Was `week_of` in requirements intentional, or a typo?
   - Recommendation: Use `week_ending` to match the YAML schema and CustomerOverview's existing `latest?.week_ending` read. Planner should lock this.

2. **"Progress bullets" field in UPD-03**
   - What we know: Sample.yaml history entry has `decisions` and `outcomes` (strings), but no `progress` array field
   - What's unclear: UPD-03 says "multi-entry fields for progress bullets, decisions, and outcomes" — does "progress bullets" map to a new `progress` array, or is it a textarea?
   - Recommendation: Use a single `<textarea>` for a `progress` string field (consistent with `decisions` and `outcomes` as strings in sample.yaml). Avoids introducing an array type not present in the current schema.

3. **Extract InlineEditField / InlineSelectField to shared component?**
   - What we know: Currently duplicated in CustomerOverview.jsx and ActionManager.jsx (decision: extract when second consumer); ArtifactManager is the second consumer
   - What's unclear: Whether the planner wants to do the extraction now or continue deferring
   - Recommendation: Extract to `client/src/components/InlineEditField.jsx` and `InlineSelectField.jsx` now — ArtifactManager is the second consumer, and deferring to a third wastes a refactor cycle.

---

## Validation Architecture

`workflow.nyquist_validation: true` in `.planning/config.json` — validation section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node 24.14.0) |
| Config file | none — invoked directly |
| Quick run command (server) | `cd server && node --test routes/artifacts.test.js routes/history.test.js` |
| Full suite command | `cd server && node --test routes/*.test.js` |
| Client tests | `node --test client/src/lib/deriveCustomer.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ART-02 | POST assigns X-### ID | unit/integration | `cd server && node --test routes/artifacts.test.js` | Wave 0 |
| ART-03 | PATCH updates artifact fields | unit/integration | `cd server && node --test routes/artifacts.test.js` | Wave 0 |
| ART-04 | PATCH status change writes Drive atomically | unit/integration | `cd server && node --test routes/artifacts.test.js` | Wave 0 |
| ART-05 | writeYamlFile called once per mutation | unit | `cd server && node --test routes/artifacts.test.js` | Wave 0 |
| UPD-04 | POST history prepends entry as history[0] | unit/integration | `cd server && node --test routes/history.test.js` | Wave 0 |
| UPD-04 | POST history writes Drive atomically | unit | `cd server && node --test routes/history.test.js` | Wave 0 |
| UPD-01,02,03,05 | Form renders + navigates on success | manual-only | visual checkpoint (no jsdom in project) | N/A |
| ART-01,03,05 | Table renders + optimistic UI | manual-only | visual checkpoint | N/A |

**Note on client-side testing:** The project has no jsdom/vitest setup. Client-side behavior (form rendering, optimistic updates, navigation) is verified by the human visual checkpoint plan, which has been the established pattern since Phase 2. The `deriveCustomer.test.js` is the only client test and uses ESM + `node:test` with `--experimental-strip-types`.

### Sampling Rate
- **Per task commit:** `cd server && node --test routes/artifacts.test.js routes/history.test.js`
- **Per wave merge:** `cd server && node --test routes/*.test.js`
- **Phase gate:** Full suite green (`cd server && node --test routes/*.test.js`) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `server/routes/artifacts.test.js` — covers ART-02, ART-03, ART-04, ART-05 (POST + PATCH with sample.yaml mock)
- [ ] `server/routes/history.test.js` — covers UPD-04 (POST prepends, Drive write called)

*(Client test infrastructure requires no new files — `deriveCustomer.test.js` already exists and covers deriveCustomer.js which is unchanged in Phase 4)*

---

## Sources

### Primary (HIGH confidence)
- `server/routes/actions.js` — canonical atomic write pattern; PATCH/POST implementations
- `server/routes/artifacts.js` — existing 501 stub; confirms route is mounted with `mergeParams: true`
- `server/routes/history.js` — existing 501 stub; confirms POST `/` verb is correct
- `server/index.js` — confirms both routes already mounted; zero routing work needed
- `client/src/main.jsx` — confirms both views already registered as routes
- `server/fixtures/sample.yaml` — definitive artifact schema; history entry schema with `week_ending` key
- `client/src/views/ActionManager.jsx` — full optimistic mutation pattern; InlineEditField/InlineSelectField implementations
- `client/src/views/CustomerOverview.jsx` — `useOutletContext()` pattern; `latest?.week_ending` read (confirms `week_ending` is the YAML key)
- `client/src/lib/deriveCustomer.js` — WORKSTREAM_CONFIG (11 sub-workstreams, groups, labels); WORKSTREAM_OPTIONS
- `client/src/api.js` — base apiFetch pattern; existing endpoints to model new ones on

### Secondary (MEDIUM confidence)
- `.planning/phases/03-project-setup-action-manager/03-05-SUMMARY.md` — patterns-established section
- `.planning/phases/03-project-setup-action-manager/03-06-SUMMARY.md` — InlineSelectField placeholder fix
- `.planning/STATE.md` — accumulated decisions log

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, all patterns already proven
- Architecture: HIGH — server routes follow an identical pattern; sample.yaml provides ground truth schemas
- Pitfalls: HIGH — `week_ending` vs `week_of` discrepancy is directly observable in source files

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable stack; dependencies won't change for this project)
