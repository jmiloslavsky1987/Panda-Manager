# Domain Pitfalls

**Domain:** Local single-user React + Express app — Google Drive YAML datastore, Anthropic SDK, pptxgenjs
**Project:** BigPanda Project Intelligence App
**Researched:** 2026-03-04
**Confidence:** MEDIUM (training data through Aug 2025; web research tools unavailable this session)

---

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or hard-to-debug failures in production (i.e., daily use).

---

### Pitfall C1: Google Drive Service Account — Wrong OAuth Scope Granted

**What goes wrong:** The service account is created and a key is downloaded, but the Drive API is enabled on the project with only `https://www.googleapis.com/auth/drive.metadata.readonly` or `https://www.googleapis.com/auth/drive.file`. Reads succeed. Writes return `403 Forbidden` with a misleading "The caller does not have permission" message that looks identical to a sharing error, not a scope error.

**Why it happens:** `drive.file` only grants access to files the service account itself created. If YAML files are created by a human, the service account has zero access to them under `drive.file` — even if the file is explicitly shared with the service account email. The Google Cloud Console does not warn you. The error message does not say "wrong scope."

**Consequences:** Reads may succeed via sharing but writes fail silently-ish (403), or reads fail too if the wrong share was set up. Developer spends hours debugging "sharing" when the fix is scoping.

**Prevention:**
- Explicitly request `https://www.googleapis.com/auth/drive` (full Drive scope) in the service account JWT auth config.
- In `driveService.js`, make the scope an explicit constant at the top of the file: `const SCOPES = ['https://www.googleapis.com/auth/drive'];`
- Add a startup health-check endpoint (`GET /api/health/drive`) that lists files from the target folder and returns 200/500. Run this on every `npm run dev` start to catch scope/auth failures immediately.
- Document in README: "Do not use `drive.file` scope — it only covers service-account-owned files."

**Detection:** A 403 response where the error body says `"The caller does not have permission"` and the file IS shared with the service account email = scope problem, not sharing problem. Distinguish by checking if newly service-account-created files are accessible (they will be under `drive.file`; human-created ones won't be).

**Phase:** Address in Phase 1 (backend scaffold + Drive integration).

---

### Pitfall C2: Google Drive Service Account — Token Expiry Not Handled, Silent Failures After 1 Hour

**What goes wrong:** The `googleapis` Node.js client auto-refreshes access tokens internally when using a service account JWT — but only if you use the library's built-in `google.auth.GoogleAuth` with `keyFile` or `credentials`. If you manually construct a JWT, call `getAccessToken()` once at startup, and cache the raw token string, it expires after 3600 seconds. All Drive calls after that return `401 Unauthorized`, which may look like a network error.

**Why it happens:** Developers see the token returned from `getAccessToken()` and store it, not realizing it's a short-lived bearer token, not the long-lived refresh token.

**Consequences:** The app appears to work for the first hour, then silently fails. In a daily-use app, this surfaces as "nothing saves after lunchtime."

**Prevention:**
- Always use `google.auth.GoogleAuth` with `scopes` and `keyFilename` (or `credentials` from env). Let the library own token lifecycle.
- Never extract and cache raw access tokens. Pass the `auth` object to the Drive client: `google.drive({ version: 'v3', auth })`.
- The correct pattern in `driveService.js`:

```javascript
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFilename: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });
```

- Do NOT do: `const token = await auth.getAccessToken(); drive.files.list({ headers: { Authorization: \`Bearer ${token}\` } })`.

**Detection:** Drive calls fail with 401 approximately 60 minutes after `npm run dev` starts. Restart fixes it temporarily.

**Phase:** Address in Phase 1 (backend scaffold + Drive integration).

---

### Pitfall C3: Google Drive — "File Not Found" vs "Permission Error" Ambiguity

**What goes wrong:** `files.get()` returns `404 Not Found` both when the file genuinely doesn't exist AND when the service account has no permission to see it. This is by design — Google treats "this file exists but you can't see it" as indistinguishable from "this file doesn't exist" for privacy reasons. The same applies to `files.list()` with a `q` filter: files the service account can't see simply don't appear in results.

**Why it happens:** Expected API behavior. Cannot be fixed. Must be anticipated in error handling.

**Consequences:** Ambiguous error messages in the UI. When a YAML file is accidentally removed from the shared folder, the app shows "file not found" — which could be misread as "the file was deleted" rather than "you lost access."

**Prevention:**
- In `driveService.js`, wrap `files.get()` in error handling that returns a structured error:
  ```javascript
  catch (err) {
    if (err.code === 404) {
      throw new DriveError('FILE_NOT_FOUND_OR_NO_ACCESS', err);
    }
  }
  ```
- Surface this in the UI as: "File not accessible — verify it exists in `BigPanda/ProjectAssistant/` and is shared with the service account."
- Add the folder ID to `.env` (`DRIVE_FOLDER_ID`) and validate at startup that `files.list({ q: "'{folderId}' in parents" })` returns at least one result.

**Detection:** 404 from Drive for a file you know exists. Check Drive sharing settings.

**Phase:** Phase 1 (backend scaffold + Drive integration).

---

### Pitfall C4: js-yaml — Type Coercion Destroys Data Silently

**What goes wrong:** js-yaml's default schema (`DEFAULT_SCHEMA`, equivalent to YAML 1.1 for load and YAML 1.2-ish for dump) coerces bare unquoted values in unexpected ways:

| YAML input | js-yaml parses as | Round-trips back as |
|------------|------------------|---------------------|
| `status: on` | `true` (boolean) | `status: true` |
| `status: off` | `false` (boolean) | `status: false` |
| `id: 083` | `83` (octal → integer in YAML 1.1) | `id: 83` |
| `version: 1.0` | `1` (float, `.0` dropped) | `version: 1` |
| `value: ~` | `null` | `value: null` |
| `value: ''` | `''` (empty string) | `value: ''` |
| `value: ` | `null` | `value: null` |
| `notes: yes` | `true` | `notes: true` |
| `notes: no` | `false` | `notes: false` |

For a project status YAML where fields like `status: on_track` or IDs like `A-001` are common, most of these won't trigger — but `status: on` or `status: off` absolutely will if anyone hand-edits a YAML file.

**Why it happens:** YAML 1.1 (which js-yaml partially follows) has broader boolean coercion rules than YAML 1.2. js-yaml uses its own schema blend.

**Consequences:** A status field saved as `on` by a human hand-editor becomes `true` on load, passes through the app, and is written back as `true` — corrupting the YAML schema permanently. Schema validation won't catch it if the validator just checks field presence.

**Prevention:**
- Use `js-yaml` with `schema: FAILSAFE_SCHEMA` for loading if you want pure strings, OR use `JSON_SCHEMA` for stricter YAML 1.2 compatibility.
- Alternatively, validate enum fields (`status`, `severity`, etc.) against allowed string values in `yamlService.js` before writing: `const VALID_STATUSES = ['on_track', 'at_risk', 'off_track']`.
- Add schema validation that checks field _types_, not just field _presence_.
- Instruct users: in the YAML editor, status values must be quoted if they could be ambiguous: `status: "on"`.

**Detection:** A field that was a string in Drive comes back as a boolean (`true`/`false`) in the parsed object. Watch for this in the YAML Editor — Monaco will show `true` where a string was expected.

**Phase:** Phase 1 (yamlService.js implementation). Address validation in the same phase as the YAML Editor (View 5).

---

### Pitfall C5: js-yaml — Comment Stripping Is Permanent and Irreversible

**What goes wrong:** `js-yaml.load()` parses YAML into a JavaScript object. All YAML comments (`# ...`) are discarded — they are not part of the AST. When `js-yaml.dump()` serializes back to a string, the comments are gone. For a YAML file that was hand-authored with comments explaining fields, the first app-write destroys all comments.

**Why it happens:** js-yaml does not implement a comment-preserving parser. This is a known limitation of the library.

**Consequences:** If the YAML files have authoring comments (e.g., `# Last reviewed by PM`), they are silently stripped on first save. The Drive version history will show "all comments removed" as a change.

**Prevention:**
- Establish a rule now: YAML files for this project do NOT use comments. Document this in the YAML schema spec.
- If comments are desired for authoring notes, use a dedicated YAML field (`_notes: "..."`) instead.
- In the YAML Editor (View 5), display a banner: "Comments in YAML will be removed on save. Use `_notes` field for annotations."
- This is unavoidable with js-yaml — no prevention is possible after the fact. Mitigate by convention, not code.

**Detection:** Open a YAML file in a text editor before and after first app-save. Any `#` lines disappear.

**Phase:** Establish convention in Phase 1; add UI warning in View 5 phase.

---

### Pitfall C6: js-yaml — Multiline String Round-Trip Fidelity

**What goes wrong:** js-yaml preserves multiline string _content_ but may change the YAML _style_ (literal `|`, folded `>`, or quoted). When a human writes:

```yaml
progress_notes: |
  Completed API mapping.
  Waiting on customer sign-off.
```

js-yaml loads it as `"Completed API mapping.\nWaiting on customer sign-off.\n"` (trailing newline included). When dumped back with default options, it may re-serialize as a literal block or a folded block — but the trailing newline behavior changes: `|` preserves trailing newline, `|-` strips it. js-yaml's `dump()` default is `|` for multiline, but the exact style chosen depends on string content.

**Why it happens:** js-yaml's `dump()` auto-selects style based on content heuristics. It does not preserve the original style choice.

**Consequences:** Visual diff noise in Drive version history (style changes), potential trailing newline differences that affect downstream string comparisons.

**Prevention:**
- For `progress_notes`, `description`, and similar long-text fields, trim all values on load: `value.trim()` before using in UI, and trim before writing.
- Accept that Drive version history will show style changes on first write. This is cosmetic, not functional.
- If exact round-trip fidelity matters for a field, store it as a single-line string with `\n` escaped — but for this app, multi-line display is a feature, so literal block is preferred.
- Set `dump()` option `lineWidth: -1` to prevent js-yaml from wrapping long lines, which otherwise introduces whitespace differences.

**Detection:** Compare raw YAML bytes before/after a save cycle in the YAML Editor. Expect style changes; flag content changes as bugs.

**Phase:** Phase 1 (yamlService.js). Set `lineWidth: -1` from the start.

---

### Pitfall C7: js-yaml — YAML Schema Drift Over Time

**What goes wrong:** The YAML schema is defined as "immutable" in project constraints — but real usage introduces drift through several vectors:

1. **Hand-editing in Google Drive** — someone opens the YAML directly and adds a field, misspells a key, or uses a non-enum value.
2. **Copy-paste from another customer YAML** — brings in extra keys that are valid in one customer's context but not in the schema.
3. **Claude-generated content written without validation** — if the report generator ever writes back to the YAML (not current scope, but tempting to add), it may hallucinate field names.
4. **Field renaming in code without migration** — a developer renames `percent_complete` to `completion_pct` in code but doesn't update existing YAML files. Both keys exist in the file; the old one is ignored; the new one is missing.

**Why it happens:** No enforcement mechanism exists at the storage layer (Google Drive is a file store, not a schema-aware database).

**Consequences:** The app silently reads partial data (missing fields = undefined in JS), which may render as empty UI sections. Worse: the write-back of a partially-loaded record can _delete_ fields the app didn't know about.

**Prevention:**
- Implement `validateYaml(parsed)` in `yamlService.js` that:
  - Checks all required top-level keys are present (no missing keys)
  - Checks no unknown top-level keys exist (no extra keys)
  - Validates enum fields against allowed values
  - Checks array fields are arrays (not null or missing)
- Run this validation on EVERY read, not just on the YAML Editor save.
- Return structured errors that identify which keys are missing/extra.
- Add a "Validate All" button in a future admin view that runs `validateYaml()` on all customer YAMLs.
- Define the canonical schema as a JS constant in `yamlService.js` (single source of truth).

**Detection:** An "undefined" error in the UI when accessing a nested field. A YAML field that renders as blank when Drive shows it has a value.

**Phase:** Phase 1 (yamlService.js) for the validator; validation-on-read for all phases.

---

### Pitfall C8: pptxgenjs — Z-Order Cannot Be Reliably Controlled

**What goes wrong:** pptxgenjs adds shapes and text boxes to slides in the order they are called. The z-order (stacking order) in the generated PPTX corresponds directly to the order of `slide.addShape()` / `slide.addText()` / `slide.addImage()` calls. However, there is no `slide.bringToFront()` or `slide.sendToBack()` API. If you need a background rectangle behind a text box, you must add the rectangle first, then the text box.

**Why it happens:** The underlying OOXML structure (OpenXML) assigns z-order by order of elements in the XML. pptxgenjs maps directly to this.

**Consequences:** If Claude's JSON output specifies elements in a non-ideal order and the pptxService renders them naively, background shapes will appear on top of text. The resulting PPTX looks broken and can't be fixed without re-ordering the code.

**Prevention:**
- In `pptxService.js`, always render in this order per slide: background fills → image placeholders → shape outlines → text content → overlays.
- Define a `renderSlide(slide, elements)` function that sorts elements by a `zIndex` key from Claude's JSON before rendering.
- Have Claude's JSON schema include `"layer": "background" | "content" | "overlay"` and sort on that.

**Detection:** Open generated PPTX in PowerPoint or LibreOffice. Text obscured by a colored shape = z-order bug.

**Phase:** Phase with pptxService implementation (View 4 / Report Generator phase).

---

### Pitfall C9: pptxgenjs — Text Overflow Is Silent (No Auto-Fit)

**What goes wrong:** pptxgenjs does not perform text measurement or auto-sizing. If you specify a text box with `w: 4, h: 1` and the text is 500 characters, the text will simply overflow visually in the PPTX, clipping to the box boundary. There is no "auto-fit" in pptxgenjs that shrinks font size to fit.

**Why it happens:** True text measurement requires font metrics (kerning, line height, glyph widths). This is browser/platform-dependent and pptxgenjs runs in Node where no rendering engine is available.

**Consequences:** Claude-generated text that varies in length will produce inconsistent slides. A progress note that's three words fits; one that's two paragraphs clips.

**Prevention:**
- When defining Claude's JSON schema for ELT deck content, specify `maxChars` constraints per field in the prompt: e.g., "Progress summary: max 100 characters", "Status: max 20 characters."
- In `pptxService.js`, truncate text fields to their max before rendering: `text.substring(0, MAX_CHARS)`.
- Design slides with generous box heights (prefer taller boxes with more whitespace over tight boxes).
- Enable `autoFit: true` in pptxgenjs text options — this tells PowerPoint to auto-fit when opened, but it is a hint to the presentation application, not rendered by pptxgenjs itself.

**Detection:** Open generated PPTX. Any text box where the last line is cut off = overflow bug.

**Phase:** Phase with pptxService (View 4).

---

### Pitfall C10: pptxgenjs — Font Embedding and System Font Fallback

**What goes wrong:** pptxgenjs does not embed font files in the PPTX. It references fonts by name in the OOXML. If you specify `fontFace: 'Calibri'` (common), the PPTX will look correct on Windows (where Calibri is system-installed) but may fall back to a default serif font on macOS or Linux where Calibri is not available.

**Why it happens:** Font embedding in OOXML requires including the font file binary in the zip archive — pptxgenjs does not implement this.

**Consequences:** ELT decks opened on macOS in Keynote or LibreOffice may have different fonts than intended.

**Prevention:**
- Stick to fonts available cross-platform: `'Arial'`, `'Helvetica'` (for body), or test on the target platform (macOS, since this is a local app).
- Since this is a local single-user macOS app, identify which fonts are available on the user's machine and use those.
- Avoid Windows-only fonts like Calibri, Cambria, Segoe UI unless confirmed available on the user's system.

**Detection:** Generate a PPTX, open it. If fonts look different from expected, check the font name in the generated XML (`pptx` is a zip — `unzip -p file.pptx 'ppt/slides/slide1.xml'`).

**Phase:** Phase with pptxService (View 4). Establish font constants at the start.

---

### Pitfall C11: Anthropic SDK — Timeout Handling for Long Report Generation

**What goes wrong:** The `@anthropic-ai/sdk` Node.js client has a default timeout of 600 seconds (10 minutes) — which is not the problem. The problem is: when the frontend sends `fetch('/api/report/generate', ...)`, the browser's default timeout for `fetch` is effectively infinite, but the _user_ will wait 10-20 seconds. If there is no loading state and progress feedback, users will click "Generate" multiple times, triggering multiple concurrent API calls. Each call may succeed, but only the last response is used — wasting tokens and cost.

**More concrete timeout failure:** If the Express server does not explicitly forward stream events or set a long enough server-side request timeout, Node's default HTTP server request timeout (in Node 18+, the default is 5 seconds for keep-alive, but no hard timeout for active connections) may not be the issue — but if a reverse proxy or load balancer is involved (not this case for local dev), there would be a 60-second gateway timeout.

**Actual risk for this app:** The real risk is not SDK timeout — it is that Express's default `server.keepAliveTimeout` (5 seconds in Node 18) can interfere with long-running requests, and also that if `fetch` in the frontend uses no `AbortController`, a network hiccup mid-generation produces an unhelpful error.

**Why it happens:** Async call, no abort handling, no request deduplication.

**Consequences:** Multiple simultaneous Claude API calls, UI stuck in loading with no way to cancel, confusing error messages on network interruption.

**Prevention:**
- In the frontend (Report Generator, View 4), disable the "Generate" button immediately on click and re-enable only on success/error — this prevents double-submit.
- Use `AbortController` in the frontend `fetch` call with a 90-second timeout: `const controller = new AbortController(); setTimeout(() => controller.abort(), 90000);`
- In Express, for the `/api/report/generate` route, set an explicit route-level timeout:
  ```javascript
  router.post('/generate', (req, res, next) => {
    req.setTimeout(120000); // 2 minutes
    next();
  }, reportController);
  ```
- Add a clear loading UI with elapsed time counter ("Generating... 12s") so users know the app is working.
- Return errors with enough detail: if the SDK throws a timeout, return `{ error: 'GENERATION_TIMEOUT', message: 'Report generation took too long. Try again.' }`.

**Detection:** Click "Generate" twice quickly. If two network requests appear in DevTools, deduplication is missing.

**Phase:** Phase with Report Generator (View 4).

---

### Pitfall C12: CORS Configuration — Vite Dev Server Port 5173 vs Express Port 3000

**What goes wrong:** In local development, Vite serves the React frontend on port 5173 and Express runs on port 3000. Fetches from `http://localhost:5173` to `http://localhost:3000` are cross-origin requests subject to CORS. Two common mistakes:

1. **Using `app.use(cors())` with no origin restriction** — works but is sloppy. During dev, it's fine. More importantly: if `cors()` is added to Express but `credentials: true` is not set, and the frontend uses `credentials: 'include'`, the browser will block the response.
2. **Using Vite proxy instead of CORS** — the right approach for dev, but developers often set up both (CORS on Express AND proxy in Vite), causing double-handling and confusing behavior.

**The correct pattern for this app:**
- In development: Configure Vite proxy so all `/api/...` requests from the frontend are proxied to `http://localhost:3000`. The frontend code always calls `/api/...` (no hostname). No CORS needed.
- In production (not applicable here — local only): Express serves the built React app and itself, so same origin, no CORS.
- Do NOT add the `cors` npm package unless you have a specific need for cross-origin access from another tool.

**Why it happens:** Developers add `cors()` middleware as a "just in case" reflex before setting up the Vite proxy.

**Consequences:** Subtle bugs where some requests work (simple GET) and others fail (POST with JSON body, because preflight OPTIONS is rejected), or credential/cookie issues.

**Prevention:**
- In `vite.config.js`, configure the proxy from day one:
  ```javascript
  export default defineConfig({
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  });
  ```
- In Express, do NOT add `cors()` middleware for the dev workflow. All requests arrive at port 3000 as same-origin (via Vite proxy).
- If you need CORS for any reason (e.g., testing Express directly from Postman or another client), add it scoped to specific origins, not `*`.

**Detection:** Open DevTools Network tab. If you see requests going to `localhost:3000` from the browser directly (not through the Vite proxy), CORS will be needed. If requests go to `localhost:5173/api/...`, the proxy is working correctly.

**Phase:** Phase 1 (project scaffold). Set up proxy before writing any frontend API calls.

---

### Pitfall C13: React Router v6 — Nested Route Layout Bugs

**What goes wrong:** React Router v6 changed nested route rendering to require explicit `<Outlet />` in parent layouts. The most common mistake: a developer defines nested routes in `createBrowserRouter` but forgets to render `<Outlet />` in the parent component, so child routes render blank (no error thrown).

**Second common mistake:** When navigating from Dashboard → Customer Overview → Action Manager, the layout component re-mounts if routes are not structured correctly, losing scroll position and causing unnecessary re-fetches.

**For this app specifically:** The app has 7 views that appear to be flat siblings (Dashboard, Customer Overview, Action Manager, Report Generator, YAML Editor, Artifact Manager, Weekly Update Form). Customer-specific views (Views 2-7) share a customer context (which customer is selected). If this context is managed by a parent route but the parent route doesn't render `<Outlet />`, child routes will be blank.

**Why it happens:** v6's file-based/code-based nested routing is flexible but requires explicit composition. The docs show it clearly, but it's easy to skip when prototyping quickly.

**Consequences:** Blank views when navigating to nested routes. No error message — just empty content area.

**Prevention:**
- Establish the route structure in Phase 1 (scaffold) before building any views:
  ```jsx
  // Correct v6 nested route structure
  const router = createBrowserRouter([
    {
      path: '/',
      element: <AppLayout />, // must render <Outlet />
      children: [
        { index: true, element: <Dashboard /> },
        {
          path: 'customer/:customerId',
          element: <CustomerLayout />, // must render <Outlet />
          children: [
            { index: true, element: <CustomerOverview /> },
            { path: 'actions', element: <ActionManager /> },
            { path: 'report', element: <ReportGenerator /> },
            { path: 'yaml', element: <YamlEditor /> },
            { path: 'artifacts', element: <ArtifactManager /> },
            { path: 'weekly-update', element: <WeeklyUpdateForm /> },
          ],
        },
      ],
    },
  ]);
  ```
- `CustomerLayout` carries the customer context (loads customer data) and renders `<Outlet />` — child views consume it via `useOutletContext()`.
- Never manage "which customer is selected" in global state — use the URL param (`:customerId`) as the source of truth.

**Detection:** Navigate to a nested route. If the content area is blank and no error appears in console, check that the parent component renders `<Outlet />`.

**Phase:** Phase 1 (project scaffold). Do not defer route structure.

---

## Moderate Pitfalls

---

### Pitfall M1: Monaco Editor — Bundle Size and Lazy Loading

**What goes wrong:** Monaco Editor is large (~2-5MB gzipped). Importing it naively (`import * as monaco from 'monaco-editor'`) in a Vite app pulls the entire bundle into the main chunk, dramatically increasing initial load time — even for a local app, this is a noticeable delay.

**Why it happens:** Monaco is a full IDE core; it cannot be tree-shaken significantly.

**Prevention:**
- Use `@monaco-editor/react` (the React wrapper) with Vite. It lazy-loads Monaco workers automatically when configured correctly.
- Wrap the Monaco editor component in `React.lazy()` + `<Suspense>`:
  ```jsx
  const YamlEditorView = React.lazy(() => import('./views/YamlEditorView'));
  ```
- In `vite.config.js`, add Monaco to manual chunks to separate it from the main bundle:
  ```javascript
  build: {
    rollupOptions: {
      output: {
        manualChunks: { monaco: ['monaco-editor'] },
      },
    },
  },
  ```
- For a local app with 1 user, this is a comfort issue (not a critical one), but lazy loading keeps hot module reload fast during development.

**Detection:** Run `vite build` and check the chunk size output. A single chunk >1MB is a warning sign.

**Phase:** View 5 (YAML Editor) phase.

---

### Pitfall M2: PPTX Download in Express — Response Headers and Binary Streaming

**What goes wrong:** pptxgenjs's `writeFile()` method writes to disk. For an in-memory buffer suitable for HTTP streaming, use `write('base64')` or `write('nodebuffer')`. Common mistakes:

1. Calling `res.send(buffer)` without setting `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation` — browser downloads a file with no extension or treats it as text.
2. Not setting `Content-Disposition: attachment; filename="report.pptx"` — browser tries to open the file in-tab instead of prompting download.
3. Sending a base64 string instead of a binary buffer — the PPTX is corrupted.

**Prevention:**
- Correct Express handler:
  ```javascript
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', 'attachment; filename="ELT_Report.pptx"');
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
  ```
- Do not use `res.send()` for binary — use `res.end()`.
- Do not pipe from a file on disk unless you explicitly write to temp file first (prefer in-memory).

**Detection:** Download the PPTX. If it opens in PowerPoint as a corrupt file or with garbled content, check the response headers and binary encoding. Use `file ELT_Report.pptx` in terminal to verify it's a valid ZIP/PPTX.

**Phase:** View 4 (Report Generator) phase.

---

### Pitfall M3: Atomic Write Pattern — What Can Break It (Beyond Race Conditions)

**What goes wrong:** The atomic write pattern (read → modify in memory → write full YAML back to Drive) is correct for a single-user app. Race conditions are not a concern. What CAN break it:

1. **Validation failure mid-write:** If `validateYaml()` is called after modifying the in-memory object but before writing, a validation error throws and the write never happens — which is correct. But if the modify step is done in place (mutating the parsed object), the in-memory copy is now invalid and cannot be "rolled back" without re-reading from Drive. Solution: always deep-clone before mutating: `const updated = structuredClone(current)`.

2. **Drive API timeout during write:** `files.update()` may succeed or fail. If it throws a network error partway through, the Drive file may or may not have been updated. Drive's HTTP API is transactional per-call — if the call errors, the file is NOT partially written (Drive's atomicity guarantee). However, the in-memory state is now ahead of Drive. The UI will show the new state; the next read from Drive will show the old state.
   - Solution: After any write failure, re-read from Drive and update in-memory state.

3. **Stale in-memory state:** If the app reads a YAML at page load and the user leaves that page open for hours, makes edits in Drive directly (rare but possible for this user), then saves through the app — the app will write a stale version, overwriting the Drive changes.
   - Solution: On every save action, read the current Drive version, merge, then write. For this app (single user, no concurrent editing), simply re-reading from Drive before every write is sufficient and cheap.

**Detection:**
- For clone issue: Use `console.log(current === updated)` — should be `false` after clone.
- For stale state: Open the same customer in two browser tabs. Edit in tab 1, save. Edit in tab 2, save. Tab 2's save will silently overwrite tab 1's changes. Acceptable for single-user but worth noting.

**Phase:** Phase 1 (driveService.js + yamlService.js) — establish patterns from the start.

---

### Pitfall M4: Sequential ID Assignment — Server-Side ID Gaps and Conflicts

**What goes wrong:** The project requires sequential IDs (`A-001`, `R-001`, `X-001`). The naive implementation reads all existing IDs, finds the max, and assigns max+1. This breaks in two scenarios:

1. **Gaps:** An action is created (`A-003`), then deleted (YAML is updated with the action removed). The next creation assigns `A-004`, leaving a permanent gap. Users may interpret gaps as missing data.
2. **Re-use after deletion:** If IDs are assigned by `max(existing) + 1` and all actions are deleted, the next ID is `A-001` again — potentially conflicting with historical references.

**Prevention:**
- For this single-user, small-data-set app, gaps are acceptable and expected. Document this explicitly: "IDs are not sequential after deletion; gaps are normal."
- Never re-use IDs. The ID assignment function should always look at all IDs ever assigned (including completed/closed/retired items) to determine the next number.
- Store completed actions in the YAML (they are, per the brief — collapsed by default in UI) so their IDs remain in the file and are counted.

**Detection:** Delete an action and create a new one. If the new ID reuses the deleted ID's number, the implementation is wrong.

**Phase:** Phase with Action Manager (View 3).

---

## Minor Pitfalls

---

### Pitfall m1: Vite Proxy — HMR WebSocket Conflicts

**What goes wrong:** Vite's hot module reload (HMR) uses a WebSocket connection on the dev server. If the proxy configuration intercepts WebSocket upgrade requests intended for HMR, HMR breaks. This typically happens when a proxy rule is too broad (e.g., proxying `/` instead of `/api`).

**Prevention:** Only proxy `/api` prefix. Do not proxy WebSocket connections unless you have a specific Express WebSocket. The Vite proxy `ws: true` option should NOT be set for `/api` unless Express uses WebSockets.

**Detection:** HMR stops working after adding proxy config. Changes to React components don't hot-reload. Check browser console for WebSocket connection errors.

**Phase:** Phase 1 (scaffold).

---

### Pitfall m2: js-yaml `dump()` — `undefined` Values Omitted Silently

**What goes wrong:** When JavaScript objects are serialized with `js-yaml.dump()`, keys with `undefined` values are silently omitted. If a YAML field is optional and the code sets it to `undefined` (e.g., `artifact.linked_actions = undefined`), the key disappears from the YAML entirely. On the next load, the missing key may cause errors if the code expects it to be present (even as null or empty array).

**Prevention:**
- Never set optional YAML fields to `undefined`. Use `null` for "no value" scalars and `[]` for "empty" arrays.
- In `yamlService.js`, add a normalization step before `dump()` that converts `undefined` to `null` for all known optional scalar fields, and `undefined` to `[]` for all known array fields.

**Detection:** Add an optional field, leave it empty, save, reload. If the field is missing from Drive YAML, `undefined` → omission is occurring.

**Phase:** Phase 1 (yamlService.js).

---

### Pitfall m3: React State and Drive Write Feedback

**What goes wrong:** After a successful Drive write, the UI updates optimistically (state already reflects the change). If the write actually failed silently (e.g., a 500 error that the frontend didn't handle), the UI shows success but Drive has the old data. Next reload shows a different state, confusing the user.

**Prevention:**
- Never update UI state until the API call returns 200.
- Always show a save indicator ("Saving..." → "Saved" or "Error") on every Drive write action.
- In the Action Manager (View 3), the checkbox immediately visually completes the action — this is intentional per the brief. Ensure the Drive write is awaited before hiding the saving state, and revert the checkbox on failure.

**Detection:** Simulate a 500 from the Express Drive endpoint. UI should revert to pre-action state and show an error.

**Phase:** All views that write to Drive.

---

### Pitfall m4: Express — `express.json()` Body Size Limit

**What goes wrong:** By default, `express.json()` limits request body size to 100kb. A full customer YAML (with full history) serialized to JSON for a PUT request could easily exceed this — especially the YAML Editor which sends the full YAML string back.

**Prevention:**
- Set a generous limit when mounting the middleware:
  ```javascript
  app.use(express.json({ limit: '2mb' }));
  ```
- 2MB is sufficient for any reasonable YAML file in this use case.

**Detection:** Save a large YAML in the YAML Editor. If the request returns `413 Payload Too Large`, the limit is too low.

**Phase:** Phase 1 (Express setup).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Express + Drive setup | C1 (wrong scope), C2 (token caching), C3 (404 ambiguity) | Health-check endpoint; use `GoogleAuth` class; never cache raw tokens |
| Phase 1: yamlService.js | C4 (type coercion), C5 (comment strip), C6 (multiline), C7 (schema drift), m2 (undefined→omitted) | Schema constants; enum validation; `lineWidth: -1`; normalization step |
| Phase 1: Project scaffold | C12 (CORS/proxy), C13 (RR v6 routes), m1 (HMR/WebSocket) | Vite proxy from day one; route structure first; don't add cors() middleware |
| Phase 1: Express setup | m4 (body size) | `express.json({ limit: '2mb' })` from the start |
| View 3: Action Manager | M3 (atomic write), M4 (ID gaps), m3 (write feedback) | `structuredClone`; re-read on write failure; never update UI before 200 |
| View 4: Report Generator | C11 (timeout/double-submit), C8 (z-order), C9 (text overflow), C10 (font), M2 (PPTX headers) | Disable button on click; AbortController; layer ordering; `nodebuffer` |
| View 5: YAML Editor | M1 (Monaco bundle) | `React.lazy`; manual chunk in vite.config.js |

---

## Sources

**Confidence note:** Web research tools (WebSearch, WebFetch) were unavailable during this session. All findings are from training data (cutoff August 2025) plus direct analysis of the PROJECT.md context. Confidence is MEDIUM for well-documented, stable behaviors (js-yaml API, Google Drive API error codes, React Router v6 architecture) and LOW for version-specific bugs that may have been fixed (pptxgenjs z-order specifics, Monaco lazy loading behavior in Vite 5+).

**Recommend verifying:**
- pptxgenjs GitHub issues for current z-order and text overflow status (may have improved in recent releases)
- `@anthropic-ai/sdk` current default timeout values (may differ from training data)
- Monaco Editor + `@monaco-editor/react` Vite 5 compatibility (lazy loading behavior changed in some Vite versions)

**Reference sources (from training knowledge):**
- Google Drive API v3 Auth Guide: https://developers.google.com/drive/api/guides/about-auth
- Google Drive API error codes: https://developers.google.com/drive/api/guides/handle-errors
- js-yaml README (YAML 1.2 schema options): https://github.com/nodeca/js-yaml
- pptxgenjs documentation: https://gitbrent.github.io/PptxGenJS/
- React Router v6 nested routes: https://reactrouter.com/en/main/start/concepts
- Vite proxy configuration: https://vitejs.dev/config/server-options.html#server-proxy
- Anthropic SDK Node.js: https://github.com/anthropic-ai/sdk-python (Node equivalent: @anthropic-ai/sdk)
