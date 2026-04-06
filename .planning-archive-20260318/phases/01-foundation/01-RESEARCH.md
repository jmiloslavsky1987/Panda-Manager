# Phase 1: Foundation - Research

**Researched:** 2026-03-04
**Domain:** Express 5 + Google Drive API v3 service account + js-yaml + React Router v7 + TanStack Query v5 + Vite 7 + Tailwind CSS v4
**Confidence:** HIGH (all key version numbers live-verified via npm view; architecture patterns verified against official docs and current web sources)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Server reads all `*_Master_Status.yaml` files from Google Drive folder using service account | driveService.js pattern, GoogleAuth class, scope selection, file listing query |
| INFRA-02 | Server writes updated YAML back atomically (read → modify in memory → write full file) | Atomic write pattern, structuredClone, Drive files.update() |
| INFRA-03 | YAML parsed/serialized with js-yaml using options that prevent type coercion; preserve key order and multiline strings | JSON_SCHEMA, sortKeys: false, lineWidth: -1, noRefs: true |
| INFRA-04 | yamlService enforces fixed schema on every read and write — all top-level keys required, no extras | REQUIRED_TOP_LEVEL_KEYS constant, validate() function, 422 error response |
| INFRA-05 | Sequential ID assignment (A-###, R-###, X-###) enforced server-side | ID scan pattern, increment-from-max, never reuse deleted IDs |
| INFRA-06 | Express REST API exposes all specified endpoints | Express 5 router setup, asyncWrapper, mergeParams: true on child routers |
| INFRA-07 | Vite proxy routes /api to Express — no CORS package | @tailwindcss/vite plugin + proxy config, no cors() middleware |
| INFRA-08 | Environment variables from .env (ANTHROPIC_API_KEY, GOOGLE_SERVICE_ACCOUNT_PATH, DRIVE_FOLDER_ID, PORT) | dotenv setup, env var naming |
| INFRA-09 | .env.example with all required keys and inline comments | File content template |
| INFRA-10 | npm run dev starts both Express and Vite concurrently, opens at localhost:3000 | concurrently setup, port configuration |
</phase_requirements>

---

## Summary

Phase 1 builds the complete foundation that every subsequent phase depends on: a working Google Drive service, a bulletproof YAML service, an Express REST scaffold with all routes stubbed, a Vite frontend with proxy configured, React Router v7 nested route structure with all 7 placeholder views, TanStack Query v5 provider, and environment configuration.

The most important discovery from live version research is that several key packages have advanced significantly beyond the prior ecosystem research (training data through August 2025). Express is now at v5.2.1 and is the npm default — it should be used rather than v4. React is at v19.2.4. React Router is at v7.13.1. Tailwind CSS v4.2.1 (with the Vite plugin `@tailwindcss/vite`) has completely replaced the PostCSS-based v3 setup. The Anthropic SDK is at v0.78.0 (not the outdated ^0.20.0 in the brief). pptxgenjs jumped to v4.0.1 (relevant for Phase 5, not Phase 1). All version decisions in this phase must use the live-verified numbers.

The three highest-risk items in Phase 1 are: (1) Google Drive service account scope — must use `https://www.googleapis.com/auth/drive` not `drive.file`, and must verify with a startup health-check endpoint; (2) js-yaml type coercion — must use `schema: yaml.JSON_SCHEMA` and enum validation to prevent `status: on` from becoming boolean `true`; (3) React Router v7 nested route structure — must establish the full `<Outlet />` composition before building any views or child routes will be blank with no error. All three are preventable at scaffold time if approached in the documented order.

**Primary recommendation:** Build in strict dependency order — driveService.js first, yamlService.js second, Express scaffold third, Vite + React scaffold fourth — and do not proceed to Phase 2 until `GET /api/health/drive` returns 200 listing real YAML files and a round-trip YAML PUT produces no data loss.

---

## Standard Stack

### Core (Live-Verified Versions — 2026-03-04)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 20.x LTS or 22.x | Runtime | Use whatever is installed locally; no deployment constraint |
| Express | ^5.2.1 | HTTP server | Express 5 is now the npm default (March 2025 announcement); async error propagation built-in eliminates asyncWrapper for simple cases, but asyncWrapper pattern still valid |
| googleapis | ^171.4.0 | Google Drive API v3 client | Official Google client; version increments frequently; use this exact current version |
| google-auth-library | ^10.6.1 | Service account auth | Explicit peer dependency; GoogleAuth class owns token lifecycle |
| js-yaml | ^4.1.1 | YAML parse/serialize | Stable; exact version verified; use JSON_SCHEMA on all loads |
| dotenv | ^17.3.1 | .env loading | Standard; current version verified |
| concurrently | ^9.2.1 | Run frontend + backend together | Dev tooling for npm run dev |
| nodemon | ^3.1.14 | Backend auto-restart | Dev dependency; watches server/ directory |
| React | ^19.2.4 | UI framework | Current stable; TanStack Query v5 and React Router v7 both support React 19 |
| react-router-dom | ^7.13.1 | Client-side routing | React Router v7 with declarative SPA mode; supports React 18+ |
| @tanstack/react-query | ^5.90.21 | Server state cache | React 19 compatible; staleTime, invalidateQueries, useMutation |
| Vite | ^7.3.1 | Build tool / dev server | Current stable |
| tailwindcss | ^4.2.1 | Utility CSS | v4 stable with Vite plugin — no PostCSS config needed |
| @tailwindcss/vite | ^4.2.1 | Tailwind v4 Vite plugin | Replaces postcss setup entirely |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^4.3.6 | Server-side schema validation | yamlService.js YAML structure enforcement; optional but recommended |
| date-fns | ^4.1.0 | Date math | Days-to-go-live calculations (Phase 2+); scaffold import only in Phase 1 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Express 5 | Express 4 | Express 4 is still valid but no longer the npm default; asyncWrapper pattern is identical in both; no reason to use v4 for a new project in 2026 |
| React Router v7 (declarative mode) | React Router v6 | v7 declarative mode is non-breaking upgrade of v6; same JSX component/Outlet API; unified `react-router` package replaces `react-router-dom` but dom exports still available |
| Tailwind v4 + @tailwindcss/vite | Tailwind v3 + PostCSS | v4 is now stable and officially recommended; eliminates tailwind.config.js and postcss.config.js; simpler setup; no migration needed for a greenfield project |
| googleapis (official) | node-fetch + raw Drive REST | Official client handles auth token lifecycle, retries, typed responses; never hand-roll Drive calls |

**Installation:**

```bash
# Root package.json (dev tooling)
npm install -D concurrently

# Server
mkdir server && cd server
npm init -y
npm install express googleapis google-auth-library js-yaml dotenv zod
npm install -D nodemon
cd ..

# Client (Vite + React scaffold)
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom @tanstack/react-query tailwindcss @tailwindcss/vite
cd ..
```

---

## Architecture Patterns

### Recommended Project Structure

```
/
├── client/                         # React app (Vite root)
│   ├── src/
│   │   ├── components/             # Shared UI (StatusBadge, ProgressBar, Sidebar — Phase 2+)
│   │   ├── views/                  # Dashboard, CustomerOverview, ActionManager, etc.
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CustomerOverview.jsx
│   │   │   ├── ActionManager.jsx
│   │   │   ├── ReportGenerator.jsx
│   │   │   ├── YAMLEditor.jsx
│   │   │   ├── ArtifactManager.jsx
│   │   │   └── WeeklyUpdateForm.jsx
│   │   ├── layouts/
│   │   │   ├── AppLayout.jsx       # Sidebar + <Outlet />
│   │   │   └── CustomerLayout.jsx  # Customer data fetch + <Outlet />
│   │   ├── api.js                  # fetch wrappers, all /api/* calls
│   │   └── main.jsx                # QueryClientProvider + RouterProvider
│   ├── index.html
│   ├── vite.config.js              # @tailwindcss/vite plugin + /api proxy
│   └── package.json
│
├── server/
│   ├── routes/
│   │   ├── customers.js            # GET /api/customers, GET/PUT /api/customers/:id
│   │   ├── actions.js              # POST/PATCH /api/customers/:id/actions[/:actionId]
│   │   ├── risks.js                # POST/PATCH /api/customers/:id/risks[/:riskId]
│   │   ├── milestones.js           # POST/PATCH /api/customers/:id/milestones[/:milestoneId]
│   │   ├── artifacts.js            # POST/PATCH /api/customers/:id/artifacts[/:artifactId]
│   │   ├── history.js              # POST /api/customers/:id/history
│   │   ├── reports.js              # POST /api/customers/:id/reports
│   │   └── health.js               # GET /api/health/drive
│   ├── services/
│   │   ├── driveService.js         # Google Drive API v3 reads/writes
│   │   ├── yamlService.js          # js-yaml parse/serialize, schema validation, ID assignment
│   │   ├── claudeService.js        # Anthropic SDK (Phase 5 only — stub in Phase 1)
│   │   └── pptxService.js          # pptxgenjs PPTX builder (Phase 5 only — stub in Phase 1)
│   ├── middleware/
│   │   ├── asyncWrapper.js         # Wraps async route handlers
│   │   └── errorHandler.js         # Express error middleware
│   └── index.js                    # Mount routes, middleware, start server
│
├── .env                            # ANTHROPIC_API_KEY, GOOGLE_SERVICE_ACCOUNT_PATH, DRIVE_FOLDER_ID, PORT
├── .env.example                    # Template with inline comments
├── .gitignore                      # .env, credentials*.json, node_modules
└── package.json                    # root: concurrently dev script
```

### Pattern 1: driveService.js — GoogleAuth Class (Never Raw Tokens)

**What:** Service account auth using googleapis GoogleAuth class with full Drive scope.
**When to use:** Every Drive operation. The GoogleAuth class manages token refresh automatically.

```javascript
// server/services/driveService.js
// Source: Google Drive API official docs + googleapis GitHub README
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

// List all customer YAML files in the target folder
async function listCustomerFiles() {
  const folderId = process.env.DRIVE_FOLDER_ID;
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name contains '_Master_Status.yaml' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'name',
  });
  return res.data.files || [];
}

// Read YAML file content as string
async function readYamlFile(fileId) {
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.data.on('data', (chunk) => chunks.push(chunk));
    res.data.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    res.data.on('error', reject);
  });
}

// Atomic write: replace full file content
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

// Health check: verify Drive connection and folder access
async function checkDriveHealth() {
  const files = await listCustomerFiles();
  return { ok: true, fileCount: files.length, files: files.map(f => f.name) };
}

module.exports = { listCustomerFiles, readYamlFile, writeYamlFile, checkDriveHealth };
```

### Pattern 2: yamlService.js — JSON_SCHEMA + Schema Validation

**What:** YAML parse/serialize with coercion prevention and strict schema enforcement.
**When to use:** Every read from Drive and every write to Drive goes through these functions.

```javascript
// server/services/yamlService.js
// Source: js-yaml README (https://github.com/nodeca/js-yaml)
const yaml = require('js-yaml');

// Single source of schema truth — all top-level keys required, no extras allowed
const REQUIRED_TOP_LEVEL_KEYS = [
  'customer', 'project', 'status', 'workstreams',
  'actions', 'risks', 'milestones', 'artifacts', 'history'
];

const VALID_STATUSES = ['on_track', 'at_risk', 'off_track'];
const VALID_WORKSTREAM_STATUSES = ['green', 'yellow', 'red'];

function parseYaml(content) {
  // JSON_SCHEMA prevents: yes/no/on/off → boolean, octal integers, etc.
  return yaml.load(content, { schema: yaml.JSON_SCHEMA });
}

function serializeYaml(data) {
  // sortKeys: false preserves insertion order
  // lineWidth: -1 prevents line wrapping that changes multiline string style
  // noRefs: true prevents YAML anchors/aliases (not needed here, avoids edge cases)
  return yaml.dump(data, {
    sortKeys: false,
    lineWidth: -1,
    noRefs: true,
  });
}

class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.statusCode = 422;
  }
}

function validateYaml(data) {
  const keys = Object.keys(data);
  const missing = REQUIRED_TOP_LEVEL_KEYS.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !REQUIRED_TOP_LEVEL_KEYS.includes(k));

  if (missing.length) {
    throw new ValidationError(`Missing required keys: ${missing.join(', ')}`);
  }
  if (extra.length) {
    throw new ValidationError(`Extra keys not allowed: ${extra.join(', ')}`);
  }

  // Validate array fields are arrays (not null/undefined due to schema drift)
  for (const field of ['actions', 'risks', 'milestones', 'artifacts', 'history']) {
    if (!Array.isArray(data[field])) {
      throw new ValidationError(`Field '${field}' must be an array, got: ${typeof data[field]}`);
    }
  }
}

// Normalize undefined → null/[] before serializing to prevent silent key omission
function normalizeForSerialization(data) {
  const normalized = { ...data };
  for (const field of ['actions', 'risks', 'milestones', 'artifacts', 'history']) {
    if (normalized[field] === undefined || normalized[field] === null) {
      normalized[field] = [];
    }
  }
  return normalized;
}

// Sequential ID assignment: scan all existing IDs, return max+1
// prefix: 'A', 'R', or 'X'
function assignNextId(prefix, allItems) {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let maxNum = 0;
  for (const item of allItems) {
    const match = item.id && item.id.match(pattern);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

module.exports = {
  parseYaml,
  serializeYaml,
  validateYaml,
  normalizeForSerialization,
  assignNextId,
  ValidationError,
  REQUIRED_TOP_LEVEL_KEYS,
};
```

### Pattern 3: Express 5 Server with asyncWrapper and errorHandler

**What:** Express 5 scaffold with correct middleware order, body size limit, async error handling.
**When to use:** Base server setup in Phase 1.

```javascript
// server/index.js
require('dotenv').config();
const express = require('express');

const app = express();

// Body parsing — set generous limit from day one (YAML Editor sends full YAML strings)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/customers', require('./routes/customers'));
// Child routers using mergeParams — mounted AFTER customers router
app.use('/api/customers/:id/actions', require('./routes/actions'));
app.use('/api/customers/:id/risks', require('./routes/risks'));
app.use('/api/customers/:id/milestones', require('./routes/milestones'));
app.use('/api/customers/:id/artifacts', require('./routes/artifacts'));
app.use('/api/customers/:id/history', require('./routes/history'));
app.use('/api/customers/:id/reports', require('./routes/reports'));

// Error handler must be last
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
```

```javascript
// server/middleware/asyncWrapper.js
// Works identically in Express 4 and 5
const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
module.exports = asyncWrapper;
```

```javascript
// server/middleware/errorHandler.js
const { ValidationError } = require('../services/yamlService');

function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message, err.stack);

  if (err instanceof ValidationError) {
    return res.status(422).json({ error: err.message, details: err.details });
  }
  if (err.code === 404) {
    return res.status(404).json({ error: 'FILE_NOT_FOUND_OR_NO_ACCESS', message: err.message });
  }

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
  });
}
module.exports = errorHandler;
```

```javascript
// server/routes/health.js
const router = require('express').Router();
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');

router.get('/drive', asyncWrapper(async (req, res) => {
  const result = await driveService.checkDriveHealth();
  res.json(result);
}));

module.exports = router;
```

### Pattern 4: Express Child Router with mergeParams

**What:** Child routers must use `mergeParams: true` to access parent route params (`:id`).
**When to use:** Every route file for nested resources (actions, risks, milestones, etc.).

```javascript
// server/routes/actions.js
// mergeParams: true is REQUIRED — without it, req.params.id is undefined
const router = require('express').Router({ mergeParams: true });
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');

// GET /api/customers/:id/actions — Phase 2 implementation
// Stubbed in Phase 1 as 501 placeholder
router.get('/', asyncWrapper(async (req, res) => {
  res.status(501).json({ message: 'Not yet implemented — Phase 3' });
}));

// PATCH /api/customers/:id/actions/:actionId
router.patch('/:actionId', asyncWrapper(async (req, res) => {
  const { id, actionId } = req.params;
  // Atomic write pattern:
  const yamlString = await driveService.readYamlFile(id);
  const data = yamlService.parseYaml(yamlString);
  const action = data.actions.find(a => a.id === actionId);
  if (!action) return res.status(404).json({ error: 'Action not found' });

  // Deep clone before mutation — prevents invalid in-memory state if validate() throws
  const updated = structuredClone(data);
  const updatedAction = updated.actions.find(a => a.id === actionId);
  Object.assign(updatedAction, req.body);

  yamlService.validateYaml(updated);
  const newYamlString = yamlService.serializeYaml(
    yamlService.normalizeForSerialization(updated)
  );
  await driveService.writeYamlFile(id, newYamlString);

  res.json(updated);
}));

module.exports = router;
```

### Pattern 5: Vite Config — Tailwind v4 Plugin + API Proxy

**What:** Vite config combining Tailwind v4 Vite plugin with /api proxy. No PostCSS config needed.
**When to use:** Phase 1 client scaffold setup.

```javascript
// client/vite.config.js
// Source: Tailwind CSS v4 official docs, Vite proxy docs
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // Replaces PostCSS tailwindcss + autoprefixer
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Do NOT set ws: true — breaks Vite HMR WebSocket
      },
    },
  },
});
```

```css
/* client/src/index.css */
/* Tailwind v4: single import, no @tailwind directives */
@import "tailwindcss";
```

### Pattern 6: React Router v7 Nested Route Structure with Outlet

**What:** Full nested route structure with all 7 view placeholders. Must be established in Phase 1 before building any views.
**When to use:** Phase 1 client scaffold setup.

```jsx
// client/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './layouts/AppLayout';
import CustomerLayout from './layouts/CustomerLayout';
import Dashboard from './views/Dashboard';
import CustomerOverview from './views/CustomerOverview';
import ActionManager from './views/ActionManager';
import ReportGenerator from './views/ReportGenerator';
import YAMLEditor from './views/YAMLEditor';
import ArtifactManager from './views/ArtifactManager';
import WeeklyUpdateForm from './views/WeeklyUpdateForm';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// Route paths from REQUIREMENTS.md:
// /, /customer/:id, /customer/:id/actions, /customer/:id/reports,
// /customer/:id/yaml, /customer/:id/artifacts, /customer/:id/update
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,        // MUST render <Outlet /> — see AppLayout.jsx
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: 'customer/:customerId',
        element: <CustomerLayout />,  // MUST render <Outlet /> — fetches customer once
        children: [
          { index: true, element: <CustomerOverview /> },
          { path: 'actions', element: <ActionManager /> },
          { path: 'reports', element: <ReportGenerator /> },
          { path: 'yaml', element: <YAMLEditor /> },
          { path: 'artifacts', element: <ArtifactManager /> },
          { path: 'update', element: <WeeklyUpdateForm /> },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

```jsx
// client/src/layouts/AppLayout.jsx
import { Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar placeholder — implemented in Phase 2 */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4">
        <p className="text-sm text-gray-400">Sidebar (Phase 2)</p>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />  {/* CRITICAL: missing this = blank child routes, no error */}
      </main>
    </div>
  );
}
```

```jsx
// client/src/layouts/CustomerLayout.jsx
import { Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCustomer } from '../api';

export default function CustomerLayout() {
  const { customerId } = useParams();
  const { data: customer, isLoading, isError, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
  });

  if (isLoading) return <div className="p-4 text-gray-500">Loading customer...</div>;
  if (isError) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <div>
      {/* Customer header placeholder — implemented in Phase 2 */}
      <div className="mb-4 p-4 bg-white border-b">
        <h1 className="text-xl font-semibold">{customer?.customer?.name ?? customerId}</h1>
      </div>
      {/* Pass customer data to all child views via context */}
      <Outlet context={{ customer }} />
    </div>
  );
}
```

```javascript
// client/src/api.js — all /api/* fetch wrappers
const BASE = '/api';  // Vite proxy handles routing to Express

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const getCustomers = () => apiFetch('/customers');
export const getCustomer = (id) => apiFetch(`/customers/${id}`);
export const updateCustomer = (id, body) =>
  apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) });
```

### Pattern 7: Root package.json — Concurrently Dev Script

**What:** Root-level npm run dev that starts both Express (port 3001) and Vite (port 5173) together.
**When to use:** Phase 1 project setup.

```json
{
  "name": "bigpanda-project-assistant",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "nodemon --watch server server/index.js",
    "client": "vite --cwd client"
  },
  "devDependencies": {
    "concurrently": "^9.2.1",
    "nodemon": "^3.1.14"
  }
}
```

### Pattern 8: .env and .env.example

```bash
# .env.example
# Copy to .env and fill in values before running npm run dev

# Anthropic Claude API key — get from console.anthropic.com
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Path to Google service account JSON credentials file (never commit this file)
GOOGLE_SERVICE_ACCOUNT_PATH=./credentials/service-account.json

# Google Drive folder ID containing *_Master_Status.yaml files
# Find in the Drive URL: drive.google.com/drive/folders/<DRIVE_FOLDER_ID>
DRIVE_FOLDER_ID=your_drive_folder_id_here

# Express server port (Vite proxies /api to this port)
PORT=3001
```

### Anti-Patterns to Avoid

- **Wrong Drive scope:** Using `drive.file` scope grants access only to service-account-owned files. Human-created YAMLs return 403. Always use `https://www.googleapis.com/auth/drive`.
- **Caching raw access tokens:** Extracting the bearer token from `auth.getAccessToken()` and caching it causes silent failures after 60 minutes. Always pass the `auth` object to `google.drive()` — never cache raw tokens.
- **Missing `<Outlet />`:** Forgetting to render `<Outlet />` in AppLayout or CustomerLayout produces blank child views with no error. Establish the full route structure and verify each placeholder renders before Phase 2.
- **CORS middleware reflex:** Do NOT add `app.use(cors())`. The Vite proxy makes CORS unnecessary in development. Adding both causes subtle preflight issues.
- **Default js-yaml schema:** Using `yaml.load(content)` without `{ schema: yaml.JSON_SCHEMA }` silently coerces `status: on` to `true`. This corrupts Drive data permanently.
- **Mutating parsed YAML before clone:** Modifying the parsed object in-place then calling `validate()` means a validation error leaves the in-memory object in a corrupt state. Always `structuredClone(data)` before applying mutations.
- **`undefined` values in YAML dump:** `js-yaml.dump()` silently omits keys with `undefined` values. Normalize optional fields to `null` or `[]` before serializing.
- **Setting `ws: true` on the Vite proxy for `/api`:** This intercepts Vite's HMR WebSocket connections and breaks hot module reload.
- **Forgetting `mergeParams: true` on child routers:** Without it, `req.params.id` is `undefined` in action/risk/milestone route handlers.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Google Drive auth token lifecycle | Manual JWT + token refresh cron | `google.auth.GoogleAuth` class | Token expiry after 3600s causes silent failures; GoogleAuth handles refresh automatically |
| YAML boolean coercion prevention | Custom string sanitizer | `schema: yaml.JSON_SCHEMA` | JSON_SCHEMA is a documented, tested parser mode; custom sanitizers miss edge cases |
| Schema validation | Ad-hoc `if (data.customer)` checks | Explicit `REQUIRED_TOP_LEVEL_KEYS` validation function | Hand-rolled checks miss extra-key enforcement and per-field type checks |
| async Express error handling | try/catch in every route | `asyncWrapper` middleware | Express 5 propagates thrown errors natively, but asyncWrapper is explicit and documents intent |
| Concurrent dev servers | Shell scripts | `concurrently` | Platform-safe; handles SIGTERM forwarding to both processes |
| CORS in dev | `cors()` middleware | Vite proxy | Proxy makes all requests appear same-origin; cors() adds complexity with no benefit |
| Sequential ID gaps prevention | Complex ID tracking | Scan all items (including closed/completed) for max ID | Simplest correct solution; IDs are not reused because completed items remain in YAML |

**Key insight:** The Drive auth lifecycle and YAML type coercion are deceptively complex. Both have well-documented official solutions that handle every edge case. Using anything other than `GoogleAuth` class and `JSON_SCHEMA` option is asking for production bugs that appear hours or days after deployment.

---

## Common Pitfalls

### Pitfall 1: Drive Scope — `drive.file` vs `drive`

**What goes wrong:** Service account created with `drive.file` scope. Reads of human-created YAMLs fail with `403 Forbidden: The caller does not have permission` — identical error message as a missing-share error, making diagnosis hard.

**Why it happens:** `drive.file` only grants access to files the service account itself created. The Google Cloud Console does not warn about this distinction.

**How to avoid:** In `driveService.js`, hardcode `scopes: ['https://www.googleapis.com/auth/drive']`. Implement `GET /api/health/drive` that runs on every server start and lists files — if it returns a count > 0, auth and scope are working.

**Warning signs:** `403` responses when listing files in a shared folder; the service account email IS on the folder's share list.

### Pitfall 2: js-yaml Type Coercion (`status: on` → `true`)

**What goes wrong:** A customer YAML has `status: on` or similar bare value. js-yaml with default schema parses it as boolean `true`. The app serializes it back as `true`. Drive now has `status: true` — a schema violation.

**Why it happens:** YAML 1.1 (which js-yaml partially follows) treats `yes`, `no`, `on`, `off` as booleans. Default `yaml.load()` uses this behavior.

**How to avoid:** Always `yaml.load(content, { schema: yaml.JSON_SCHEMA })`. Also validate enum fields in `validateYaml()` against allowed string values.

**Warning signs:** A field expected to be a string comes back as `true` or `false` in the parsed object.

### Pitfall 3: Missing `<Outlet />` Produces Blank Child Views

**What goes wrong:** `AppLayout` or `CustomerLayout` is defined as the parent route element but doesn't render `<Outlet />`. All child routes render blank content — no error is thrown, no console warning appears.

**Why it happens:** React Router v7 requires explicit `<Outlet />` placement in layout components.

**How to avoid:** Establish the full route structure in Phase 1 and immediately navigate to `/` and `/customer/test-id/actions` to verify placeholder components render before building any real views.

**Warning signs:** Navigate to a nested route, see nothing in the content area, no errors in console.

### Pitfall 4: Token Expiry After 60 Minutes

**What goes wrong:** Developer extracts raw bearer token at startup, caches it, passes it directly to Drive API calls. After 3600 seconds, all Drive calls return `401 Unauthorized`.

**Why it happens:** Raw access tokens from Google OAuth are short-lived. The correct pattern is passing the `GoogleAuth` object (not the token) to the Drive client.

**How to avoid:** `const drive = google.drive({ version: 'v3', auth })` where `auth` is the `GoogleAuth` instance. Never call `auth.getAccessToken()` and cache the result.

**Warning signs:** Drive calls work fine for the first hour of dev, then fail with 401.

### Pitfall 5: Vite Tailwind v4 Setup Confusion

**What goes wrong:** Developer follows an old Tailwind v3 guide and installs `tailwindcss postcss autoprefixer`, creates `tailwind.config.js` and `postcss.config.js`, and uses `@tailwind base; @tailwind components; @tailwind utilities` in CSS. With Tailwind v4 + `@tailwindcss/vite`, none of this is needed — it actively conflicts.

**Why it happens:** Most tutorials and AI training data document the v3 setup. v4 completely changes the installation model.

**How to avoid:** Install `tailwindcss @tailwindcss/vite`, add the Vite plugin to `vite.config.js`, and use `@import "tailwindcss"` in CSS. No `tailwind.config.js`, no `postcss.config.js`, no `@tailwind` directives.

**Warning signs:** PostCSS errors on startup; Tailwind classes not applying; `tailwind.config.js` not being picked up.

### Pitfall 6: pptxgenjs v4 is a Major Version Jump (Phase 5 Concern — Note Here)

**What goes wrong:** Prior research documented pptxgenjs as `^3.12.x`. The current version is `4.0.1` (released June 2025). v4 includes a complete rewrite of text body generation (`genXmlTextBody`), changes to `bkgd:string` (deprecated in favor of `background:BkgdOpts`), and textbox/table line break behavior changes.

**Why it matters in Phase 1:** The Phase 1 stub for `pptxService.js` should note `require('pptxgenjs')` uses v4, and the `write()` API should be noted as `pres.write({ outputType: 'nodebuffer' })` (verify against v4 docs in Phase 5).

**How to avoid (Phase 5):** When implementing `pptxService.js` in Phase 5, read the v4 changelog before writing any PPTX code. The z-order rule (add background shapes before text) is unchanged.

### Pitfall 7: Express 5 Path Matching Changes

**What goes wrong:** Express 5 removed sub-expression capture groups in route paths (e.g., `/:foo(\\d+)` is no longer supported). For this app's simple routes (`/api/customers/:id`) this is not an issue. But if any route regex is used, it will throw at startup.

**Why it happens:** Express 5 changed path routing to prevent ReDoS vulnerabilities.

**How to avoid:** Use only simple named parameters (`:id`, `:actionId`, `:customerId`) — no regex in route paths. This is already the standard pattern for this app.

---

## Code Examples

### Reading and Parsing a Customer YAML (Full Flow)

```javascript
// server/routes/customers.js
// Source: googleapis README + js-yaml README
const router = require('express').Router();
const asyncWrapper = require('../middleware/asyncWrapper');
const driveService = require('../services/driveService');
const yamlService = require('../services/yamlService');

// GET /api/customers — list all customers
router.get('/', asyncWrapper(async (req, res) => {
  const files = await driveService.listCustomerFiles();
  const customers = await Promise.all(
    files.map(async (file) => {
      const content = await driveService.readYamlFile(file.id);
      const data = yamlService.parseYaml(content);
      yamlService.validateYaml(data);
      return { fileId: file.id, ...data };
    })
  );
  res.json(customers);
}));

// GET /api/customers/:id — single customer
router.get('/:id', asyncWrapper(async (req, res) => {
  const content = await driveService.readYamlFile(req.params.id);
  const data = yamlService.parseYaml(content);
  yamlService.validateYaml(data);
  res.json({ fileId: req.params.id, ...data });
}));

// PUT /api/customers/:id — full YAML replacement (YAML Editor use case)
router.put('/:id', asyncWrapper(async (req, res) => {
  const data = req.body;  // full parsed YAML object from client
  yamlService.validateYaml(data);
  const normalized = yamlService.normalizeForSerialization(data);
  const yamlString = yamlService.serializeYaml(normalized);
  await driveService.writeYamlFile(req.params.id, yamlString);
  res.json({ fileId: req.params.id, ...data });
}));

module.exports = router;
```

### Atomic Write Pattern (Used in ALL Write Routes)

```javascript
// Pattern used in Phase 3+ write routes — establish in Phase 1 documentation
// The mutation step changes per route; the read-validate-write shell is identical
async function atomicUpdate(fileId, mutationFn) {
  // 1. Read current state from Drive
  const yamlString = await driveService.readYamlFile(fileId);
  const data = yamlService.parseYaml(yamlString);

  // 2. Deep clone before mutation — prevents corrupt in-memory state if validate() throws
  const updated = structuredClone(data);

  // 3. Apply mutation (injected per route)
  mutationFn(updated);

  // 4. Validate — throws ValidationError (422) if schema violated
  yamlService.validateYaml(updated);

  // 5. Normalize and write
  const newYamlString = yamlService.serializeYaml(
    yamlService.normalizeForSerialization(updated)
  );
  await driveService.writeYamlFile(fileId, newYamlString);

  return updated;
}
```

### TanStack Query v5 Basic Setup (in CustomerLayout)

```jsx
// client/src/layouts/CustomerLayout.jsx — TanStack Query v5 pattern
// Source: TanStack Query v5 docs (tanstack.com/query/v5/docs)
import { useQuery } from '@tanstack/react-query';
import { Outlet, useParams } from 'react-router-dom';
import { getCustomer } from '../api';

export default function CustomerLayout() {
  const { customerId } = useParams();

  // v5 change: cacheTime renamed to gcTime; callbacks removed from useQuery
  const { data: customer, isLoading, isPending, isError, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getCustomer(customerId),
    staleTime: 30_000,  // 30s — prevents redundant Drive reads on tab navigation
  });

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  // All child routes receive customer data via useOutletContext() — no redundant fetches
  return <Outlet context={{ customer }} />;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact on Phase 1 |
|--------------|------------------|--------------|-------------------|
| Express 4 (`express@^4.x`) | Express 5 (`express@^5.2.1`) — npm default | March 2025 (v5.1.0 set as latest) | Use Express 5; `asyncWrapper` still valid; route regex syntax changed (use only named params) |
| Tailwind v3 + PostCSS (`tailwind.config.js` + `postcss.config.js`) | Tailwind v4 + `@tailwindcss/vite` (single Vite plugin, no PostCSS needed) | Early 2025 | Completely different install; old tutorials are wrong; use `@import "tailwindcss"` in CSS |
| React 18 (`react@^18.3.x`) | React 19 (`react@^19.2.4`) | Dec 2024 | TanStack Query v5 and React Router v7 both support React 19; use current scaffold default |
| React Router v6 (`react-router-dom@^6.x`) | React Router v7 (`react-router-dom@^7.13.1`) — declarative mode is non-breaking | Nov 2024 | Same JSX API and `<Outlet />`; unified `react-router` package; import from `react-router-dom` still works |
| `@anthropic-ai/sdk@^0.20.0` (brief specification) | `@anthropic-ai/sdk@^0.78.0` | Continuous; brief is severely outdated | Must use 0.78.0; API surface stable but streaming helper API has improved; CJS `require()` works |
| pptxgenjs v3 (`^3.12.x`) | pptxgenjs v4 (`^4.0.1`) | June 2025 | Phase 5 concern; Phase 1 stub only; note `write({ outputType: 'nodebuffer' })` |
| `npm view @anthropic-ai/sdk version` returns `^0.30.x` | Returns `0.78.0` | March 2026 | Always verify with npm view before pinning |

**Deprecated/outdated:**
- `tailwind.config.js` + `postcss.config.js`: Not needed for Tailwind v4 + Vite; causes conflicts if present
- `@tailwind base; @tailwind components; @tailwind utilities` CSS directives: Replaced by `@import "tailwindcss"` in v4
- Express 4 as the "safe default": Express 5 is now the npm default; new projects should use v5
- Brief's `^0.20.0` Anthropic SDK: Outdated by ~18 months; current is 0.78.0

---

## Open Questions

1. **YAML schema canonical definition**
   - What we know: REQUIREMENTS.md and PROJECT.md describe the schema fields in prose. The `REQUIRED_TOP_LEVEL_KEYS` constant in yamlService.js must match exactly.
   - What's unclear: The exact nested structure of `workstreams`, `history` entries, and `artifacts` requires reading the full schema specification from PROJECT.md to build `validateYaml()` deep validation. The Phase 1 research only provides the top-level key list.
   - Recommendation: During Phase 1 implementation, read PROJECT.md schema section in full and implement nested validation for `workstreams.adr` and `workstreams.biggy` sub-workstream structure, action/risk/artifact required fields, and history entry shape.

2. **Vite dev server port and browser open behavior**
   - What we know: INFRA-10 says "app opens at localhost:3000". Vite defaults to port 5173, Express to 3001. Vite serves the React app; Express serves the API.
   - What's unclear: Does INFRA-10 mean the Vite dev server should be configured to port 3000 (non-standard), or is 3000 being used loosely to mean "the browser-accessible URL"?
   - Recommendation: Configure Vite server port to 3000 explicitly (`server: { port: 3000 }`) to match the requirement literally; configure Express to 3001.

3. **Express 5 `asyncWrapper` vs native error propagation**
   - What we know: Express 5 natively propagates errors thrown from async route handlers (without wrapping). `asyncWrapper` still works and documents intent.
   - What's unclear: Whether to use Express 5's native behavior or keep `asyncWrapper` for explicit documentation.
   - Recommendation: Keep `asyncWrapper` for all routes — it makes async error handling intent explicit and produces identical behavior. Express 5 native propagation is a welcome fallback but asyncWrapper is clearer for a reader.

---

## Validation Architecture

`nyquist_validation` is enabled (`true` in config.json). Include full validation section.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — Wave 0 must install |
| Config file | None — see Wave 0 |
| Quick run command | `node --test server/services/yamlService.test.js` (Node built-in test runner, no install needed) |
| Full suite command | `node --test server/**/*.test.js` |

**Note:** For Phase 1, the primary testable units are `yamlService.js` (pure functions, no I/O) and the health endpoint. Drive integration is tested manually via `GET /api/health/drive`. No UI test framework is needed in Phase 1.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-03 | js-yaml parses `status: on` as string `"on"`, not boolean `true` | unit | `node --test server/services/yamlService.test.js` | Wave 0 |
| INFRA-03 | js-yaml round-trip preserves key order and multiline strings | unit | `node --test server/services/yamlService.test.js` | Wave 0 |
| INFRA-04 | validateYaml() throws ValidationError on missing top-level key | unit | `node --test server/services/yamlService.test.js` | Wave 0 |
| INFRA-04 | validateYaml() throws ValidationError on extra top-level key | unit | `node --test server/services/yamlService.test.js` | Wave 0 |
| INFRA-05 | assignNextId() returns A-001 for empty array | unit | `node --test server/services/yamlService.test.js` | Wave 0 |
| INFRA-05 | assignNextId() returns A-004 when A-003 is highest existing ID | unit | `node --test server/services/yamlService.test.js` | Wave 0 |
| INFRA-05 | assignNextId() counts completed actions (never reuses IDs) | unit | `node --test server/services/yamlService.test.js` | Wave 0 |
| INFRA-06 | GET /api/health/drive returns 200 with fileCount | smoke | `curl -s http://localhost:3001/api/health/drive` | manual |
| INFRA-07 | GET http://localhost:3000/api/health/drive proxied to Express, returns 200 | smoke | `curl -s http://localhost:3000/api/health/drive` | manual |
| INFRA-01 | GET /api/customers returns array with all top-level schema keys | smoke | `curl -s http://localhost:3001/api/customers` | manual |
| INFRA-02 | PUT /api/customers/:id round-trips YAML with no data loss | smoke | manual round-trip test | manual |

### Sampling Rate

- **Per task commit:** `node --test server/services/yamlService.test.js`
- **Per wave merge:** `node --test server/**/*.test.js` + manual smoke tests for Drive and proxy
- **Phase gate:** All unit tests green + manual smoke tests (`/api/health/drive`, `/api/customers`, PUT round-trip) passing before advancing to Phase 2

### Wave 0 Gaps

- [ ] `server/services/yamlService.test.js` — unit tests covering INFRA-03, INFRA-04, INFRA-05 using Node.js built-in `node:test`
- [ ] `server/fixtures/sample.yaml` — minimal valid customer YAML for use in tests (no Drive access required)

*(No test framework install needed — Node.js built-in `node:test` is available in Node 18+)*

---

## Sources

### Primary (HIGH confidence)

- Live `npm view` — all version numbers in Standard Stack verified 2026-03-04
- [googleapis Node.js README](https://github.com/googleapis/google-api-nodejs-client) — GoogleAuth class, Drive API v3 file operations, stream handling
- [js-yaml README](https://github.com/nodeca/js-yaml) — schema options, dump options, known coercion rules
- [Tailwind CSS v4 official announcement](https://tailwindcss.com/blog/tailwindcss-v4) — Vite plugin setup, no PostCSS needed
- [React Router v7 upgrading from v6](https://reactrouter.com/upgrading/v6) — declarative mode, non-breaking upgrade path
- [TanStack Query v5 installation](https://tanstack.com/query/v5/docs/react/installation) — React 19 compatibility, v5 API changes
- [Express 5.1.0 release announcement](https://expressjs.com/2025/03/31/v5-1-latest-release.html) — now npm default, migration notes
- [Google Drive service account setup guide](https://developers.google.com/workspace/drive/api/quickstart/nodejs) — scope requirements, folder sharing

### Secondary (MEDIUM confidence)

- [pptxgenjs v4 changelog](https://github.com/gitbrent/PptxGenJS/blob/master/CHANGELOG.md) — breaking changes in v4.0.0, text body rewrite
- [Anthropic SDK npm page](https://www.npmjs.com/package/@anthropic-ai/sdk) — CJS import pattern, current version
- [Google Drive API — accessing from Cloud Function](https://www.codestudy.net/blog/access-google-drive-api-from-a-google-cloud-function/) — service account scope explanation
- Prior ecosystem research in `.planning/research/` — validated against live versions where discrepancies exist

### Tertiary (LOW confidence — needs validation during implementation)

- pptxgenjs v4 specific API for `write({ outputType: 'nodebuffer' })` vs v3's `write('nodebuffer')` — check official v4 docs during Phase 5
- Express 5 `req.query` read-only getter behavior — verify does not affect any Phase 1 routes

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all version numbers live-verified via npm view on 2026-03-04
- Architecture: HIGH — stable, well-documented patterns; driveService/yamlService split from prior research confirmed correct
- Pitfalls: HIGH — C1/C2/C4/C13 confirmed by official docs; Tailwind v4 setup pitfall verified by live search
- Version deltas from prior research: HIGH — Express 5, React 19, React Router v7, Tailwind v4, pptxgenjs v4 all confirmed via live npm view and official sources

**Research date:** 2026-03-04
**Valid until:** 2026-05-04 (60 days — stable APIs; re-verify if starting after May 2026)
**Key delta from prior research:** Express is now v5 (not v4), React is now v19 (not v18), React Router is now v7 (not v6), Tailwind is now v4 with Vite plugin (completely different setup from v3), pptxgenjs is now v4 (Phase 5 impact), Anthropic SDK is at v0.78.0 (was estimated ~0.30.x in prior research).
