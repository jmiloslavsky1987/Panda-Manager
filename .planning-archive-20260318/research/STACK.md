# Technology Stack

**Project:** BigPanda Project Intelligence App
**Researched:** 2026-03-04
**Research Mode:** Ecosystem — Stack Dimension
**Tool Availability:** Read (project files only). Bash, WebSearch, WebFetch all denied by settings.local.json.
**Knowledge Basis:** Training data through August 2025 + reasoning about version trajectories.

> IMPORTANT VERIFICATION NOTE: Live npm/web lookups were blocked by project permissions.
> All version numbers marked HIGH confidence are from training data verified through Aug 2025.
> Versions marked MEDIUM/LOW need `npm view <pkg> version` confirmation before pinning in package.json.
> Priority verify: @anthropic-ai/sdk (brief says ^0.20.0 — this is WRONG; see below).

---

## Recommended Stack

### Core Frontend

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| React | ^18.3.x | UI framework | Stable LTS-equivalent. React 19 released Dec 2024 but ecosystem (React Router, some Tailwind plugins) lagged. For a local app with no deployment pressure, 18.3 is the lowest-risk choice. React 19 is viable if starting fresh in 2026 — evaluate based on Vite template defaults. |
| Vite | ^5.4.x | Build tool / dev server | The de facto standard for React apps in 2025/2026. CRA is deprecated and unmaintained. Vite 5.x is stable. Vite 6 released late 2024 — check if stable before adopting. `npm create vite@latest` scaffolds correctly. |
| Tailwind CSS | ^3.4.x | Utility CSS | v3 is battle-tested. Tailwind v4 entered beta/early release in 2025 with a new Rust-based engine and breaking config changes. For a greenfield project: use v4 only if the Vite integration is documented stable; otherwise v3.4 is the safe choice. |
| React Router | ^6.26.x | Client-side routing | v6 is current stable. v7 (Remix merger) released late 2024. For a local single-page app with 7 views, React Router v6 is simple and well-understood. v7 adds complexity without benefit here. |

**Confidence:** HIGH for React 18 and Vite 5; MEDIUM for Tailwind and Router versions (likely incremented since Aug 2025).

### Core Backend

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| Node.js | ^20.x LTS or ^22.x | Runtime | v20 is the current LTS (Active until Apr 2026), v22 enters LTS Oct 2025. Use whichever is installed locally — no deployment means no infra constraint. |
| Express | ^4.19.x | HTTP server | Express 5 was in RC through 2024. For a local app with no security exposure, either works, but Express 4 is the documented standard; avoid Express 5 until its ecosystem (body-parser, cors) fully catches up. |
| cors | ^2.8.5 | CORS for dev | Required since frontend (Vite :5173) and backend (:3000) run on different ports in dev. |
| dotenv | ^16.4.x | Env var loading | Standard. Load `.env` for GOOGLE_APPLICATION_CREDENTIALS path and ANTHROPIC_API_KEY. |

**Confidence:** HIGH for Express 4 and Node 20/22; MEDIUM for exact patch versions.

### Google Drive Integration

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| googleapis | ^140.x | Google Drive API v3 client | The official Google client. Monorepo package covering all Google APIs. Version was ~134-140 range through mid-2025 — increments frequently. |
| google-auth-library | ^9.x | Service account auth | `googleapis` depends on this transitively, but pin it explicitly if you need `GoogleAuth` directly. |

**Service Account Auth Pattern (HIGH confidence — official pattern, stable across versions):**

```javascript
// server/services/driveService.js
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// List files in folder
async function listCustomerFiles(folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name contains '_Master_Status.yaml' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
  });
  return res.data.files;
}

// Read file content
async function readYamlFile(fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  // collect stream to string
}

// Atomic write: update existing file
async function writeYamlFile(fileId, yamlContent) {
  const { Readable } = require('stream');
  await drive.files.update({
    fileId,
    media: {
      mimeType: 'text/plain',
      body: Readable.from([yamlContent]),
    },
  });
}
```

**Key gotcha:** `googleapis` uses `stream` for media downloads. Use `responseType: 'stream'` and collect chunks. Do NOT use `responseType: 'arraybuffer'` for text files — encoding issues appear.

**Confidence:** HIGH for auth pattern; MEDIUM for exact googleapis version number.

### Anthropic SDK

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| @anthropic-ai/sdk | ^0.30.x or later | Claude API | See critical note below. |

**CRITICAL: The brief's `^0.20.0` is severely outdated.**

Training data through Aug 2025 shows the SDK was at `^0.28.x` by mid-2025 and advancing rapidly. The `^0.20.0` pin in the project brief predates streaming improvements, tool use v2, and the messages API stabilization. **Do not use ^0.20.0.**

Run `npm view @anthropic-ai/sdk version` to get the current version before starting. Expect it to be in the `^0.30.x` or higher range as of March 2026.

**Streaming vs Non-Streaming for Long Reports:**

Use **streaming** for ELT deck generation (the longest calls — Claude returning full JSON for PPTX). The report generator shows a loading state during "10-20 second generation" — streaming lets you show incremental progress or at least keep the connection alive without hitting Express timeout.

Non-streaming is fine for Weekly Status reports where the output is shorter and latency is acceptable.

```javascript
// Streaming pattern (recommended for ELT decks)
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateEltDeck(customerYaml, template, res) {
  // res = Express response object, set as SSE stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: buildPrompt(customerYaml, template) }],
  });

  let fullText = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text;
      res.write(`data: ${JSON.stringify({ delta: chunk.delta.text })}\n\n`);
    }
  }
  res.write(`data: ${JSON.stringify({ done: true, full: fullText })}\n\n`);
  res.end();
}

// Non-streaming pattern (weekly status, shorter outputs)
async function generateWeeklyStatus(customerYaml, template) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(customerYaml, template) }],
  });
  return message.content[0].text;
}
```

**Model:** `claude-sonnet-4-6` as specified in PROJECT.md. This is correct — it's the latest Sonnet at time of project definition.

**Confidence:** MEDIUM for exact SDK version (need live check); HIGH for streaming pattern and model choice.

### YAML Handling

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| js-yaml | ^4.1.0 | YAML parse and serialize | See analysis below. |

**js-yaml vs Alternatives — Round-Trip Fidelity Analysis:**

**Recommendation: js-yaml ^4.1.0. Do not switch.**

Analysis:

| Library | Round-Trip | Speed | Schema | Verdict |
|---------|-----------|-------|--------|---------|
| js-yaml | GOOD — preserves most scalar types, handles multi-line strings | Fast | Pluggable | USE THIS |
| yaml (eemeli) | EXCELLENT — best round-trip, preserves comments and node positions | Slightly slower | JSON/YAML 1.2 | Alternative if comment preservation matters |
| yamljs | POOR — known bugs, last updated 2017 | — | — | AVOID |
| js-yaml-front-matter | Specialized for frontmatter only | — | — | AVOID |

**js-yaml round-trip gotchas** (HIGH confidence — well-documented):

1. **Scalar coercion**: `js-yaml` by default parses `yes`, `no`, `on`, `off` as booleans in YAML 1.1 spec. Use `{ schema: 'failsafe' }` or `{ schema: 'json' }` for strict string preservation if your YAML uses these words as literal strings.

2. **Number coercion**: Values like `0001` (zero-padded) parse as integers. Use `YAML_FLOAT_SCHEMA` or quote values in source YAML.

3. **Multi-line strings**: `js-yaml` preserves `|` (literal block) and `>` (folded) styles on parse, but `dump()` may reformat. If `progress_notes` or `description` fields use literal block style, serialize with `{ lineWidth: -1 }` to prevent unwanted wrapping.

4. **`dump()` key ordering**: js-yaml sorts keys alphabetically by default. Use `{ sortKeys: false }` to preserve insertion order.

**Recommended configuration:**

```javascript
const yaml = require('js-yaml');

// Parse — strict JSON schema avoids boolean coercion surprises
function parseYaml(content) {
  return yaml.load(content, { schema: yaml.JSON_SCHEMA });
}

// Serialize — preserve key order, no line width truncation
function serializeYaml(data) {
  return yaml.dump(data, {
    sortKeys: false,
    lineWidth: -1,
    noRefs: true,
  });
}
```

**When to use `yaml` (eemeli) instead:** Only if you need to preserve inline comments in the YAML files (e.g., `# section header` comments). js-yaml strips comments on parse. The YAML schema in this project appears to be data-only (no comments expected), so js-yaml is sufficient.

**Confidence:** HIGH for js-yaml recommendation and gotchas; HIGH for `yaml` (eemeli) as alternative.

### PPTX Generation

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| pptxgenjs | ^3.12.x | Generate .pptx from JSON | The only production-grade pure-JS PPTX library for Node.js. |

**pptxgenjs Current State and Known Limitations:**

**Status:** Active, maintained. Version 3.x has been stable since 2022. No breaking 4.x release observed through Aug 2025. The library is the de facto standard for server-side PPTX generation in Node.js.

**What works well:**
- Text boxes, shapes, tables, images
- Slide masters and layouts
- Basic charts (bar, line, pie)
- File generation as Buffer (for Express response) or file write

**Known limitations** (HIGH confidence — from official docs and community):

1. **No PPTX reading/parsing** — pptxgenjs is write-only. It cannot read an existing PPTX template with complex formatting and reproduce it. You must define slide structure in code.

2. **Limited text formatting within a single text box** — Mixed bold/italic/color within a paragraph requires using the `text` array format, not a simple string. This is verbose but works.

3. **Chart styling is basic** — No gradient fills, no custom data labels beyond basic. For the ELT deck use case (status slides, progress bars), shapes + text boxes are more reliable than charts.

4. **Font embedding** — Fonts must be installed on the system or embedded. For local use on macOS, system fonts work fine.

5. **No async streaming** — `pres.write('nodebuffer')` returns a Promise resolving to a Buffer. Send as Express response with `res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')`.

**Architecture recommendation for this project:** Claude returns structured JSON → Express `pptxService.js` maps JSON to pptxgenjs calls → returns Buffer → client triggers download. Keep the JSON schema simple: slides with `title`, `bullets`, `status`, `metrics` fields. Do NOT have Claude generate pptxgenjs code — have Claude generate data JSON and keep the PPTX layout logic in your service.

```javascript
// pptxService.js pattern
const PptxGenJS = require('pptxgenjs');

async function buildEltDeck(deckJson) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 16:9

  for (const slideData of deckJson.slides) {
    const slide = pres.addSlide();
    slide.addText(slideData.title, { x: 0.5, y: 0.3, w: '90%', fontSize: 28, bold: true });
    // ... add content from slideData
  }

  return await pres.write('nodebuffer');
}
```

**Confidence:** HIGH for library choice and limitations; MEDIUM for exact version number.

### YAML Editor (Frontend)

| Technology | Recommended Version | Purpose | Why |
|------------|--------------------|---------|----|
| @monaco-editor/react | ^4.6.x | YAML editor with syntax highlighting | Monaco (VS Code's editor) has first-class YAML support via the `monaco-yaml` plugin. Rich editing experience. |
| monaco-yaml | ^5.x | YAML language support for Monaco | Adds schema validation, hover, autocomplete to Monaco. |

**Alternative:** CodeMirror 6 (`@codemirror/lang-yaml`). Lighter weight, better mobile/tablet support, but Monaco gives VS Code-level UX which matches the "YAML Editor" view requirement.

**Recommendation:** Use Monaco unless bundle size is a concern (it isn't for a local dev app).

**Confidence:** MEDIUM — Monaco editor React wrapper versions move frequently; verify current version.

### Supporting Libraries

| Library | Recommended Version | Purpose | When to Use |
|---------|--------------------|---------| ------------|
| zod | ^3.23.x | Schema validation | Validate Claude JSON output before passing to pptxService. Also validate YAML structure server-side. Preferred over Joi for TypeScript-friendly API even in JS projects. |
| date-fns | ^3.6.x | Date manipulation | Calculate "days to go-live", format dates. Smaller than moment.js, tree-shakeable. Do not use moment.js (deprecated). |
| uuid | ^9.x | — | Not needed — IDs are sequential (A-###, X-###) per PROJECT.md spec. |
| concurrently | ^8.x | Run frontend + backend together | `"dev": "concurrently \"npm run server\" \"npm run client\""` in root package.json. Standard for monorepo-lite local dev. |
| nodemon | ^3.x | Backend auto-restart | Dev dependency. Watches `server/` directory. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Build tool | Vite 5 | Create React App | CRA is officially deprecated, maintenance stopped 2023 |
| Build tool | Vite 5 | Next.js | Next.js SSR/SSG overhead is unnecessary for a local single-user app; adds complexity with no benefit |
| CSS | Tailwind CSS | Styled Components / CSS Modules | Tailwind gives faster iteration for dashboard UIs; styled-components runtime cost unnecessary |
| CSS | Tailwind CSS | Tailwind v4 | v4 breaking config changes; ecosystem (plugins, IDE support) still catching up as of early 2026 — verify before adopting |
| HTTP client | fetch (built-in) | axios | Node 18+ and modern browsers have native fetch; axios adds no value for simple REST calls |
| YAML | js-yaml | yaml (eemeli) | js-yaml is sufficient; eemeli/yaml only needed if comment preservation required |
| YAML | js-yaml | yamljs | yamljs has known bugs and is unmaintained — hard avoid |
| PPTX | pptxgenjs | officegen | officegen is unmaintained (last update 2019) — hard avoid |
| PPTX | pptxgenjs | docx.js | docx.js generates Word, not PowerPoint |
| DB | None (Drive as store) | SQLite | PROJECT.md design uses Drive as source of truth; SQLite adds complexity and sync issues |
| Editor | Monaco | CodeMirror 6 | Both valid; Monaco preferred for VS Code-level UX; CodeMirror if bundle size matters |
| Validation | zod | Joi | Joi is heavier; zod is modern, TypeScript-native, and has better ecosystem momentum |
| State | React useState/useContext | Redux / Zustand | 7 views, single user, simple state — Context + useState is sufficient; avoid over-engineering |

---

## Version Conflict Gotchas

**Known issues to watch (MEDIUM confidence based on training data patterns):**

1. **Tailwind v4 + Vite**: Tailwind v4 has a Vite plugin (`@tailwindcss/vite`) that replaces `tailwindcss` as a PostCSS plugin. If `npm create vite@latest` scaffolds with Tailwind v4 defaults, the config structure changes completely. Check which version the scaffolder installs.

2. **React 18 vs React 19 + React Router**: React Router v6 works with both. React Router v7 requires React 18+. If scaffolder installs React 19, verify React Router compatibility.

3. **googleapis + Node.js stream API**: googleapis v100+ uses the Node.js Streams API for media operations. Works fine on Node 18/20/22 but ensure you're not mixing legacy `stream` callbacks with async iterators.

4. **pptxgenjs + ESM**: pptxgenjs ships CJS. If you configure your Express server as `"type": "module"` in package.json, use `import PptxGenJS from 'pptxgenjs'` (it has ESM interop) or keep the server as CJS (`require()`). The safest choice for a local Express app: keep everything CJS (no `"type": "module"`) to avoid interop headaches.

5. **@monaco-editor/react peer dependencies**: This package requires `react` and `react-dom` as peers. Version mismatches between the Monaco wrapper and your React version can cause runtime errors. Pin the wrapper version that lists your React version as a peer.

---

## Project Structure Recommendation

```
/
├── client/                    # React app (Vite root)
│   ├── src/
│   │   ├── components/        # Shared UI components
│   │   ├── views/             # Dashboard, CustomerOverview, ActionManager, etc.
│   │   ├── services/          # API call functions (fetch wrappers)
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js         # proxy: { '/api': 'http://localhost:3001' }
│   └── package.json
│
├── server/                    # Express app
│   ├── routes/                # Express routers
│   ├── services/
│   │   ├── driveService.js    # Google Drive read/write
│   │   ├── yamlService.js     # js-yaml parse/serialize + schema validation
│   │   ├── claudeService.js   # Anthropic SDK calls
│   │   └── pptxService.js     # pptxgenjs deck builder
│   └── index.js
│
├── .env                       # ANTHROPIC_API_KEY, GOOGLE_APPLICATION_CREDENTIALS, DRIVE_FOLDER_ID
├── .gitignore                 # .env, credentials.json, node_modules
└── package.json               # root: concurrently scripts
```

**Vite proxy configuration (eliminates CORS in dev):**

```javascript
// client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

With the proxy, the frontend calls `/api/customers` and Vite forwards to Express at `:3001`. No CORS headers needed in Express for development.

---

## Installation

```bash
# Root (dev tooling)
npm install -D concurrently

# Client
cd client
npm create vite@latest . -- --template react
npm install react-router-dom @monaco-editor/react monaco-yaml tailwindcss postcss autoprefixer date-fns zod
npx tailwindcss init -p

# Server
cd ../server
npm init -y
npm install express googleapis google-auth-library @anthropic-ai/sdk js-yaml pptxgenjs zod dotenv
npm install -D nodemon
```

---

## Critical Pre-Start Verification Checklist

Before writing any code, run these to get current versions:

```bash
npm view @anthropic-ai/sdk version          # Brief says ^0.20.0 — WRONG. Get actual current.
npm view googleapis version                 # Frequently bumped
npm view pptxgenjs version                  # Verify 3.x still current
npm view tailwindcss version               # Verify v3 vs v4 decision
npm view vite version                      # Verify v5 vs v6
npm view react version                     # Verify 18 vs 19 default
npm view @monaco-editor/react version      # Verify peer compat
```

---

## Sources

- Training data through August 2025 (no live web access available during this research session)
- Project context: `.planning/PROJECT.md` (read directly)
- Anthropic SDK changelog pattern: SDK was at ^0.24.x in early 2025, ^0.28.x by mid-2025 — ^0.20.0 is at minimum 6 months stale
- js-yaml official docs: https://github.com/nodeca/js-yaml (schema options documented in README)
- pptxgenjs official docs: https://gitbrent.github.io/PptxGenJS/
- googleapis auth patterns: https://github.com/googleapis/google-auth-library-nodejs
- Vite official docs: https://vitejs.dev/guide/

**Confidence Summary:**

| Area | Confidence | Reason |
|------|------------|--------|
| @anthropic-ai/sdk version | LOW | ^0.20.0 is outdated; exact current version needs live check |
| googleapis version | MEDIUM | ~v134-140 range as of mid-2025; needs live check |
| pptxgenjs version | MEDIUM | 3.x stable through Aug 2025; likely still current |
| Vite version | MEDIUM | 5.x stable; 6.x may be current by March 2026 |
| React version | MEDIUM | 18.3 is safe default; 19 may now be default scaffold |
| Tailwind version | MEDIUM | v3 vs v4 decision depends on scaffold defaults |
| Express version | HIGH | v4 stable, v5 ecosystem still catching up |
| js-yaml recommendation | HIGH | Stable library, well-documented gotchas |
| js-yaml round-trip gotchas | HIGH | Well-documented in official sources |
| pptxgenjs limitations | HIGH | Documented in official pptxgenjs docs |
| Service account auth pattern | HIGH | Official pattern, stable across googleapis versions |
| Streaming vs non-streaming | HIGH | Pattern well-established; applies to any SDK version |
| Project structure | HIGH | Standard Vite + Express monorepo-lite pattern |
