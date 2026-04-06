# Architecture Patterns

**Project:** BigPanda Project Intelligence App
**Domain:** Local single-user React + Express app with Google Drive YAML datastore
**Researched:** 2026-03-04
**Overall confidence:** HIGH (stack is stable, well-documented; constraints are clear)

---

## Recommended Architecture

```
Browser (React + Vite)
  └── React Router v6 Layout Route
        ├── Sidebar (customer nav, route links)
        └── <Outlet /> → View routes
              ├── /                   Dashboard
              ├── /customers/:id      Customer Overview
              ├── /customers/:id/actions   Action Manager
              ├── /customers/:id/report    Report Generator
              ├── /customers/:id/yaml      YAML Editor
              ├── /customers/:id/artifacts Artifact Manager
              └── /customers/:id/update    Weekly Update Form

HTTP REST (JSON)

Express Server (Node.js)
  ├── routes/
  │     ├── customers.js    (list, get YAML, write YAML)
  │     ├── actions.js      (update, add, complete actions)
  │     ├── risks.js        (add, update, close risks)
  │     ├── milestones.js   (add, update milestones)
  │     ├── artifacts.js    (add, update, retire artifacts)
  │     ├── history.js      (add weekly update entry)
  │     └── reports.js      (generate via Claude, build PPTX)
  ├── services/
  │     ├── driveService.js  (Google Drive API v3, read/write)
  │     ├── yamlService.js   (parse, serialize, schema validate)
  │     ├── claudeService.js (Anthropic SDK calls)
  │     └── pptxService.js   (pptxgenjs PPTX builder)
  └── middleware/
        ├── errorHandler.js
        └── asyncWrapper.js  (eliminates try/catch boilerplate)

Google Drive API v3 (service account)
  └── BigPanda/ProjectAssistant/[Customer]_Master_Status.yaml
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Does NOT Own |
|-----------|---------------|-------------------|--------------|
| React UI (views) | Render, user input, optimistic state | Express API over HTTP | Drive, YAML parsing |
| React Query cache | Client-side YAML data cache, loading/error states | React views, API | Mutation logic |
| Express routes | HTTP surface, validate req params, delegate to services | Services, send response | Business logic |
| driveService.js | Google Drive API calls (list, read, write file) | yamlService, Google APIs | Schema knowledge |
| yamlService.js | YAML parse/serialize, schema validation, ID assignment | driveService (via routes), route handlers | Drive I/O |
| claudeService.js | Anthropic SDK streaming, prompt construction | reportRoute | YAML parsing |
| pptxService.js | Build PPTX Buffer from Claude JSON, return to route | reportRoute | Claude calls |

**Key boundary rule:** Routes are thin. They validate HTTP inputs, call one or two services, and return. All logic lives in services.

---

## Data Flow

### Read Path (Dashboard load)

```
User opens app
  → React Query: queryFn calls GET /api/customers
  → Express: driveService.listFiles() → Drive API
  → driveService.readFile(id) for each YAML
  → yamlService.parse() + yamlService.validate()
  → Express returns array of parsed customer objects
  → React Query caches result (staleTime: 60s)
  → Dashboard renders from cache
```

### Write Path (atomic: all mutations)

```
User action (e.g., checkbox completes action)
  → React Query useMutation: calls PATCH /api/customers/:id/actions/:actionId
  → Express route: calls driveService.readFile() → gets current YAML string
  → yamlService.parse() → in-memory object
  → apply mutation (mark action complete, update IDs, timestamps)
  → yamlService.validate() → reject if schema violated
  → driveService.writeFile() → write full YAML string back to Drive
  → return updated customer object
  → React Query: onSuccess → queryClient.invalidateQueries(['customer', id])
  → UI re-renders from fresh data
```

**Why invalidate instead of optimistic update:** With Drive as the source of truth and no real-time sync risk (single user, local app), invalidation-and-refetch on success is safer and simpler than maintaining optimistic state. The round-trip is ~300-800ms on local network — acceptable.

### Report Generation Flow

```
User clicks Generate Report
  → POST /api/customers/:id/reports { type: 'weekly_status' | 'elt_deck' | 'both' }
  → Express: driveService.readFile() → yamlService.parse() → full YAML object
  → claudeService.generate(yamlObject, reportType)
       → Anthropic SDK: non-streaming for ELT (needs full JSON), streaming acceptable for weekly status
  → For ELT: Claude returns JSON → pptxService.build(json) → Buffer
  → Express: respond with { weeklyText?: string, pptxBase64?: string }
  → Frontend: for PPTX, decode base64 → Blob → URL → anchor download
```

---

## Key Architectural Decisions

### Decision 1: REST vs Alternatives

**Recommendation: REST as specified, no change needed.**

**Why REST is correct here:**
- Single consumer (this React app), single developer, local-only
- No subscription/push requirements (single user cannot conflict with themselves)
- No complex relational queries
- Express REST is the simplest correct answer for CRUD over YAML files

**Alternatives considered:**
- tRPC: Would eliminate the HTTP layer boilerplate and give end-to-end types. Genuinely better DX than plain REST for this stack. But adds a dependency and requires buy-in in both client and server. Not worth the migration cost if REST is already specified.
- WebSocket: No use case — no multi-user, no real-time push needed.
- GraphQL: Massively overengineered for this dataset size and access patterns.

**Verdict:** REST is optimal. If tRPC is ever considered, it's the only justified upgrade.

---

### Decision 2: State Management — React Query for YAML Data

**Recommendation: TanStack Query v5 (React Query) for server state. No Zustand.**

**Rationale:**

| Concern | Solution |
|---------|----------|
| Avoid redundant Drive fetches | React Query `staleTime: 60_000` (60s) — serves from cache within window |
| Loading / error states per view | React Query `isLoading`, `isError`, `error` — built-in |
| Invalidate cache after write | `queryClient.invalidateQueries(['customer', id])` on mutation success |
| Cross-view shared state | QueryClient is global — Dashboard and Customer Overview share cache |
| Form state (Report Generator, Weekly Update) | React `useState` — local, ephemeral, no caching needed |

**Why not Zustand:**
Zustand manages *client* state (UI flags, modal open/closed, sort order). It does not understand async, loading states, cache invalidation, or refetching. Adding Zustand for the YAML data would mean manually reimplementing exactly what React Query provides.

**Correct split:**
- TanStack Query: all YAML data fetched from the server
- React `useState`/`useReducer`: form inputs, UI flags (collapsed sections, active tab, sort direction)
- Zustand: not needed at this app scale; add only if global client-state complexity grows

**staleTime tuning:**
- Customer list (Dashboard): `staleTime: 60_000` — acceptable to be 60s stale; user can manually refresh
- Individual customer YAML (detail views): `staleTime: 0` on mount after any write, otherwise `30_000`

---

### Decision 3: Drive Caching — Read on Every Load vs Local Cache

**Recommendation: React Query cache IS the caching layer. Do not add a separate server-side cache.**

**Analysis:**

The "read from Drive on every load" concern is valid but is already solved by React Query's `staleTime`. Here's the actual cost:

- Google Drive API read of a single YAML file: ~150-400ms (LAN → internet → Drive → back)
- With `staleTime: 30s`, navigating between Customer Overview tabs (Actions, Risks, Milestones) does NOT re-fetch; they all share the same cached query
- Dashboard loads all YAMLs in parallel (Promise.all in Express): 1-2s for 10 customers — acceptable for a dashboard that loads once per session

**Why NOT add server-side in-memory cache (e.g., node-cache):**
- Introduces cache invalidation bugs: server cache says version N, Drive has version N+1 (if file was edited directly in Drive)
- Single user, local app — there is no concurrency requiring a server cache
- React Query already prevents redundant fetches within the stale window

**What to do instead of server cache:**
- Dashboard: fetch all YAMLs in parallel with `Promise.all` in the `/api/customers` endpoint
- Add a "Refresh" button in the Dashboard that calls `queryClient.invalidateQueries(['customers'])`
- That's it. No server-side caching needed.

**Tradeoff acknowledged:** If the user has 50+ customers, parallel Drive reads would be slow. At 1-10 customers (stated constraint), this is a non-issue.

---

### Decision 4: Atomic Write Pattern

**Recommendation: Serialize all writes through the Express server; never write from the client directly.**

**The pattern (server-side, per route):**

```javascript
// asyncWrapper eliminates boilerplate
router.patch('/:id/actions/:actionId', asyncWrapper(async (req, res) => {
  const yamlString = await driveService.readFile(req.params.id);
  const data = yamlService.parse(yamlString);          // throws on invalid YAML

  // Apply mutation to in-memory object
  const action = data.actions.find(a => a.id === req.params.actionId);
  if (!action) return res.status(404).json({ error: 'Action not found' });
  Object.assign(action, req.body);                     // only allowed fields

  yamlService.validate(data);                          // throws on schema violation

  const newYamlString = yamlService.serialize(data);
  await driveService.writeFile(req.params.id, newYamlString);

  res.json(data);
}));
```

**Why this is safe for single-user:**
- Single user means no concurrent writes to the same file. The read-modify-write cycle has no race condition risk.
- If concurrent writes were needed (multi-user), you'd need file locking or optimistic concurrency (ETag from Drive API). Not needed here.

**Sequential ID assignment:**
- Always assigned server-side in yamlService.js
- Pattern: find existing IDs matching pattern (A-###, R-###, X-###), increment max
- Never trust client-supplied IDs for new records

**Error handling:**
- Drive read fails → 502 to client
- YAML parse fails → 500 with parse error detail
- Schema validation fails → 422 with validation errors
- Drive write fails → 500; data was NOT written (Drive API is transactional at the file level)

---

### Decision 5: React Router v6 Nested Routes

**Recommendation: Single layout route with `<Outlet>` for the sidebar pattern.**

**Route structure:**

```jsx
// App.jsx
<Routes>
  <Route element={<AppLayout />}>           {/* Sidebar + Outlet */}
    <Route index element={<Dashboard />} />
    <Route path="customers/:customerId" element={<CustomerLayout />}>
      <Route index element={<CustomerOverview />} />
      <Route path="actions" element={<ActionManager />} />
      <Route path="report" element={<ReportGenerator />} />
      <Route path="yaml" element={<YAMLEditor />} />
      <Route path="artifacts" element={<ArtifactManager />} />
      <Route path="update" element={<WeeklyUpdateForm />} />
    </Route>
  </Route>
</Routes>
```

**AppLayout.jsx:**
```jsx
function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

**CustomerLayout.jsx:**
```jsx
function CustomerLayout() {
  const { customerId } = useParams();
  // TanStack Query: fetch this customer once; all child routes share it
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api.getCustomer(customerId),
  });

  return (
    <>
      <CustomerHeader customer={customer} />
      <CustomerNav customerId={customerId} />
      <Outlet context={{ customer }} />  {/* pass data to child routes */}
    </>
  );
}
```

**Key insight:** `CustomerLayout` owns the data fetch. All child routes (`ActionManager`, `YAMLEditor`, etc.) receive customer data via `useOutletContext()` — no redundant fetches when navigating between tabs.

**Navigation guard for unsaved changes (YAML Editor):**
React Router v6.4+ provides `useBlocker` hook. Use it in `YAMLEditor` to intercept navigation when `isDirty` is true and show a confirmation dialog.

---

### Decision 6: Express Route Structure — Avoiding Duplication

**Recommendation: Shared service layer + `asyncWrapper` middleware eliminates virtually all duplication.**

**Directory structure:**

```
server/
  routes/
    customers.js      GET /api/customers, GET /api/customers/:id
    actions.js        PATCH /api/customers/:id/actions/:actionId
                      POST /api/customers/:id/actions
    risks.js          POST /api/customers/:id/risks
                      PATCH /api/customers/:id/risks/:riskId
    milestones.js     POST /api/customers/:id/milestones
                      PATCH /api/customers/:id/milestones/:milestoneId
    artifacts.js      POST /api/customers/:id/artifacts
                      PATCH /api/customers/:id/artifacts/:artifactId
    history.js        POST /api/customers/:id/history
    reports.js        POST /api/customers/:id/reports
  services/
    driveService.js
    yamlService.js
    claudeService.js
    pptxService.js
  middleware/
    asyncWrapper.js   (wraps async route handlers, forwards errors to errorHandler)
    errorHandler.js   (Express error middleware: catches, formats, responds)
  index.js            (mount routes, middleware)
```

**The pattern that eliminates duplication (all write routes use this):**

```javascript
// middleware/asyncWrapper.js
const asyncWrapper = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Every write route follows: read → parse → mutate → validate → write → respond
// The only thing that changes per route is the "mutate" step
// This is a strategy pattern: inject the mutation function
```

**Router mounting in index.js:**
```javascript
app.use('/api/customers', customersRouter);
// Note: actions, risks, etc. are nested; mount them with mergeParams
// routes/actions.js: const router = express.Router({ mergeParams: true })
// index.js: app.use('/api/customers/:id/actions', actionsRouter)
```

**`mergeParams: true` is essential** — child routers need access to `:id` from the parent path.

---

### Decision 7: YAML Schema Validation — Server Only (Primary), Client Optional

**Recommendation: Authoritative validation on the server in yamlService.js. Client-side validation only in the YAML Editor view.**

**Rationale:**

| Layer | Validates? | Why |
|-------|-----------|-----|
| Server (yamlService.js) | YES — always, on every write | Source of truth; prevents corrupt data reaching Drive |
| Client (YAML Editor only) | YES — on "Validate" button click | UX: gives user feedback before round-trip |
| Client (structured views) | NO | Form fields are constrained; schema violation is impossible |

**For the structured views** (Action Manager, Risk section, etc.), the form inputs are bounded — you can only enter a string for "owner", a date for "due", etc. There is no way for a user to violate the YAML schema through the structured UI. Validating there is unnecessary complexity.

**For the YAML Editor**, the user is editing raw YAML text. Client-side validation (on "Validate" button click, before save) is essential UX — it gives inline error feedback without requiring a Drive round-trip.

**Implementation:**

```javascript
// yamlService.js
const REQUIRED_TOP_LEVEL_KEYS = [
  'customer', 'project', 'status', 'workstreams',
  'actions', 'risks', 'milestones', 'artifacts', 'history'
];

function validate(data) {
  const keys = Object.keys(data);
  const missing = REQUIRED_TOP_LEVEL_KEYS.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !REQUIRED_TOP_LEVEL_KEYS.includes(k));
  if (missing.length) throw new ValidationError(`Missing keys: ${missing.join(', ')}`);
  if (extra.length) throw new ValidationError(`Extra keys not allowed: ${extra.join(', ')}`);
  // ... per-section validation
}
```

**Share validation logic:** Export `validate` from a shared module. The client bundles it for the YAML Editor's "Validate" button. The server always runs it in yamlService.js.

---

### Decision 8: Monaco Editor vs CodeMirror 6

**Recommendation: CodeMirror 6 for this use case.**

**Comparison:**

| Criterion | Monaco Editor | CodeMirror 6 |
|-----------|--------------|--------------|
| Bundle size | ~2MB+ (large; pulls in TypeScript worker) | ~200-400KB for YAML mode |
| YAML support | Via monaco-yaml extension (good) | Via @codemirror/lang-yaml (official, good) |
| React integration | @monaco-editor/react wrapper (unofficial) | @uiw/react-codemirror or direct (lighter) |
| Inline error display | Excellent (uses VS Code markers) | Good (via lintGutter, lintSource) |
| Mobile / small viewport | Poor (VS Code assumptions) | Good |
| Theming | Complex (VS Code theme system) | Simple (CSS variables) |
| Startup time | Slow (worker init) | Fast |
| Use case fit | Large codebases, TypeScript IDE features | Embedded editors, lightweight |

**For this app:**
- The YAML editor is one of seven views, used occasionally
- The YAML files are small (1-5KB per customer)
- There is no need for TypeScript intellisense, multi-file navigation, or LSP
- Bundle size matters for startup feel even on localhost
- Tailwind CSS theming is much easier with CodeMirror 6's CSS variable approach

**Recommendation: CodeMirror 6** with `@codemirror/lang-yaml` and `@codemirror/lint` for inline error display. Use `@uiw/react-codemirror` wrapper for clean React integration.

**Confidence: MEDIUM** — this is a stable, well-known tradeoff. The recommendation is sound but tooling evolves; verify `@codemirror/lang-yaml` is current before installing.

---

### Decision 9: PPTX Download Flow

**Recommendation: Base64-encoded response body (not streaming, not temp file).**

**Options compared:**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Base64 in JSON response** | Simple, no file I/O, works with fetch API | Increases payload by ~33%; fine for <5MB PPTX | **Use this** |
| Streaming binary response | No size inflation | Requires different fetch handling (response.blob()), more complex error handling | Overkill here |
| Temp file + download URL | Works with `<a href>` directly | Server must clean up temp files; adds file I/O | Unnecessary complexity |

**Flow:**

```javascript
// Server: reports.js route
const pptxBuffer = await pptxService.build(claudeJson);
const base64 = pptxBuffer.toString('base64');
res.json({
  weeklyText: weeklyStatusText ?? null,
  pptxBase64: base64 ?? null
});

// Client: ReportGenerator.jsx
const { pptxBase64 } = await api.generateReport(customerId, reportType);
const bytes = Uint8Array.from(atob(pptxBase64), c => c.charCodeAt(0));
const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${customerName}_ELT_Deck.pptx`;
a.click();
URL.revokeObjectURL(url);
```

**PPTX file size:** ELT decks for implementation status are typically 200KB-2MB. Base64 adds 33% overhead → 270KB-2.7MB in the JSON response. On localhost, this is negligible.

**Confidence: HIGH** — this is a well-established pattern for file downloads via fetch.

---

## Build Order (Dependency Graph)

The build order is driven by which components are blocked on others.

```
Layer 0 (no dependencies):
  driveService.js         ← needs only Google Drive credentials
  yamlService.js          ← needs only js-yaml library, YAML schema spec

Layer 1 (depends on Layer 0):
  Express routes/customers.js (GET list, GET by ID)  ← needs driveService + yamlService
  API client (client/src/api.js)                     ← needs route contracts

Layer 2 (depends on Layer 1):
  React Query setup + CustomerLayout                 ← needs API client
  Dashboard view                                     ← needs customer list endpoint

Layer 3 (depends on Layer 2):
  All write routes (actions, risks, milestones, artifacts, history)
  Action Manager view        ← needs read + write endpoints
  Customer Overview view     ← needs customer data + inline write endpoints

Layer 4 (depends on Layer 3):
  claudeService.js           ← needs full YAML data (from read route)
  pptxService.js             ← needs Claude JSON output
  Report Generator view      ← needs /reports endpoint

Layer 5 (independent after Layer 1):
  YAML Editor view           ← needs read + raw write endpoint
  CodeMirror integration     ← can be stubbed/tested independently

Layer 6 (independent after Layer 3):
  Weekly Update Form         ← needs POST /history endpoint
  Artifact Manager           ← needs artifact CRUD endpoints
```

**Recommended phase sequencing:**

1. **Foundation first:** `driveService.js` + `yamlService.js` + schema validation. This is the riskiest code (Drive auth, YAML correctness) and blocks everything. Write and test it in isolation before any UI exists.

2. **Read surface:** `GET /api/customers` + `GET /api/customers/:id` + React Query setup + Dashboard. This validates the Drive connection works end-to-end and makes the app demonstrably useful.

3. **Core write surface:** Action Manager + the write endpoints it needs. This is the highest-frequency user interaction and validates the atomic write pattern.

4. **Remaining structured views:** Customer Overview inline edits, Risks, Milestones, Weekly Update, Artifact Manager.

5. **Report Generator:** Last because it depends on Claude API integration + pptxgenjs, which are isolated services that don't unblock other views.

6. **YAML Editor:** Can be built in parallel with Layer 3+ (it's mostly self-contained once the raw read/write endpoints exist).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Writing YAML Directly from the Client

**What goes wrong:** The client constructs a YAML string and POSTs it directly to a "write YAML" endpoint.
**Why bad:** Bypasses schema validation, sequential ID enforcement, and audit trail. One bad client-side serialization corrupts the Drive file.
**Instead:** Always send structured JSON mutations (e.g., `PATCH /actions/A-001 { status: 'complete' }`). The server owns all YAML construction.

**Exception:** The YAML Editor (View 5) intentionally sends raw YAML text — but through a dedicated endpoint that validates the schema before writing.

---

### Anti-Pattern 2: Server-Side In-Memory Cache for Drive Files

**What goes wrong:** Express caches parsed YAML in memory. User edits a file directly in Drive (for debugging). The cache serves stale data. Mutations now write over the user's direct edit silently.
**Why bad:** Single point of truth confusion; hard-to-debug data loss.
**Instead:** Always read from Drive on every server request. Let React Query's `staleTime` handle client-side caching.

---

### Anti-Pattern 3: Multiple Queries for the Same Customer in Child Routes

**What goes wrong:** `ActionManager`, `CustomerOverview`, and `YAMLEditor` each call `useQuery(['customer', id])` with `staleTime: 0`. Every tab switch triggers a Drive read.
**Why bad:** Slow and unnecessary. The data is already fresh from `CustomerLayout`.
**Instead:** Fetch in `CustomerLayout` and pass via `useOutletContext()`. Child routes use context, not their own queries. If a child writes and invalidates the cache, `CustomerLayout` re-fetches once and all children get the updated context.

---

### Anti-Pattern 4: Forgetting `mergeParams: true` on Express Child Routers

**What goes wrong:** `actionsRouter` mounted at `/api/customers/:id/actions` cannot read `req.params.id` — it only sees its own route params.
**Why bad:** Silent 404s or `undefined` customer ID passed to Drive.
**Instead:** `const router = express.Router({ mergeParams: true })` on every child router.

---

### Anti-Pattern 5: Optimistic Updates Without Rollback

**What goes wrong:** Action checkbox is optimistically checked, Drive write fails (auth expired, network blip), error is shown but checkbox stays checked. Data is now inconsistent.
**Why bad:** UI shows completed; Drive has it open.
**Instead:** For this app, prefer `invalidateQueries` on success (not optimistic). The 300-800ms wait is acceptable for a local tool. If optimistic updates are added later, implement the React Query `onError` rollback pattern with `context.previousData`.

---

## Scalability Considerations

| Concern | At 1-10 customers (current) | At 50+ customers | At 100+ customers |
|---------|----------------------------|-----------------|------------------|
| Dashboard load | Parallel Drive reads, 1-2s — acceptable | Parallel reads still feasible; may hit Drive API rate limits | Paginate or batch; server-side caching justified |
| YAML size | 5-20KB per file — trivial | Still trivial | Still trivial |
| Claude API call | 10-20s — acceptable (loading state shown) | Same; no change | Same |
| PPTX base64 | <3MB — fine on localhost | Same | Same |
| Express concurrency | N/A (single user) | N/A (local app) | N/A (local app) |

**Conclusion:** No scalability work needed within stated constraints. The architecture is correct for 1-10 customers and would not need changing until 50+.

---

## Sources

- React Router v6 nested routes / `<Outlet>` / `useOutletContext`: https://reactrouter.com/en/main/components/outlet (HIGH confidence — training data, stable API since v6.0)
- TanStack Query v5 `staleTime`, `invalidateQueries`, `useMutation`: https://tanstack.com/query/v5/docs (HIGH confidence — training data, stable API)
- Express `mergeParams`: https://expressjs.com/en/api.html#express.router (HIGH confidence — stable since Express 4)
- CodeMirror 6 vs Monaco: community consensus, bundle size analysis — MEDIUM confidence (verify current package sizes before committing)
- pptxgenjs Buffer output: https://gitbrent.github.io/PptxGenJS/docs/usage-nodejs.html (HIGH confidence — training data)
- Google Drive API v3 file read/write: https://developers.google.com/drive/api/guides/manage-uploads (HIGH confidence — stable API)
- Base64 download pattern: MDN Web Docs (HIGH confidence — stable Web API)
- `useBlocker` hook for unsaved changes guard: React Router v6.4+ (MEDIUM confidence — verify hook is in current RR version)
