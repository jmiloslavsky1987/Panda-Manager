# Stack Research — v4.0 Feature Additions

**Domain:** BullMQ job progress tracking, Timeline visualization, Data visualization for metrics
**Researched:** 2026-04-01
**Confidence:** MEDIUM (based on existing codebase analysis and knowledge current through January 2025)

> This document covers ONLY the stack additions for v4.0. The existing validated stack
> from v3.0 (Next.js 16.2.0, React 19, PostgreSQL + Drizzle ORM, BullMQ 5.71.0 + Redis,
> Anthropic SDK, Vercel AI SDK, @xyflow/react, Radix UI, Tailwind CSS, Vitest) is already
> installed and is NOT re-researched here.

---

## Executive Summary

v4.0 requires **minimal new dependencies**. Existing BullMQ 5.71.0 infrastructure fully supports job progress tracking with no package changes. For visualizations, recommend **two targeted additions**: a React timeline library for milestone visualization and a charting library for the new Metrics section.

**Critical finding:** Move from SSE to BullMQ for document extraction requires **zero new packages** — only a pattern change using existing BullMQ infrastructure.

---

## Recommended Additions

### 1. BullMQ Job Progress (NO NEW PACKAGES)

| Component | Version | Purpose | Implementation Pattern |
|-----------|---------|---------|------------------------|
| **BullMQ** | 5.71.0 (existing) | Background job processing with progress tracking | Worker calls `job.updateProgress(percentage)` and `job.log(message)`, client polls `/api/jobs/[id]/progress` endpoint |
| **ioredis** | 5.10.1 (existing) | Redis client for BullMQ | Already configured correctly with `maxRetriesPerRequest: null` for workers |

**Why NO new packages:**
BullMQ's job progress API is built-in. The existing worker infrastructure (`worker/index.ts`) already processes jobs and reports success/failure to the database. Adding progress tracking is a feature of BullMQ, not a separate library.

**Pattern for document extraction job:**

```typescript
// worker/jobs/document-extraction.ts
import { Job } from 'bullmq';

export default async function documentExtraction(
  job: Job<{ artifactId: number; projectId: number }>
) {
  const { artifactId, projectId } = job.data;

  await job.updateProgress(10);  // 0-100 percentage
  await job.log('Reading document from disk...');

  // Read file...
  await job.updateProgress(25);
  await job.log('Extracting document content...');

  // Extract text...
  await job.updateProgress(50);
  await job.log('Sending to Claude for entity extraction...');

  // Call Claude...
  await job.updateProgress(90);
  await job.log('Deduplicating extracted items...');

  // Dedup logic...
  await job.updateProgress(100);

  return { status: 'complete', itemCount: items.length };
}
```

**API route for progress polling:**

```typescript
// app/api/jobs/[id]/progress/route.ts
import { Queue } from 'bullmq';
import { createApiRedisConnection } from '@/worker/connection';
import { requireSession } from '@/lib/auth-server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { id } = await context.params;
  const queue = new Queue('scheduled-jobs', {
    connection: createApiRedisConnection() as any
  });

  const job = await queue.getJob(id);
  if (!job) {
    await queue.close();
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }

  const state = await job.getState();  // 'waiting' | 'active' | 'completed' | 'failed'
  const progress = job.progress || 0;  // 0-100
  const logs = await queue.getJobLogs(id, 0, -1);  // All logs

  await queue.close();

  return Response.json({
    jobId: id,
    state,
    progress,
    logs: logs.logs,
    result: state === 'completed' ? job.returnvalue : null,
    error: state === 'failed' ? job.failedReason : null,
  });
}
```

**Client polling pattern (NOT SSE):**

```typescript
// components/ProgressTracker.tsx
import { useState, useEffect } from 'react';

export function ProgressTracker({ jobId }: { jobId: string }) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [state, setState] = useState<'waiting' | 'active' | 'completed' | 'failed'>('waiting');

  useEffect(() => {
    const timer = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}/progress`);
      const data = await res.json();

      setProgress(data.progress);
      setLogs(data.logs || []);
      setState(data.state);

      if (data.state === 'completed' || data.state === 'failed') {
        clearInterval(timer);
        // Handle completion...
      }
    }, 1500);  // Poll every 1.5 seconds

    return () => clearInterval(timer);
  }, [jobId]);

  return (
    <div>
      <div className="w-full bg-gray-200 rounded h-2">
        <div
          className="bg-blue-600 h-2 rounded transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 text-sm space-y-1">
        {logs.slice(-5).map((log, i) => (
          <div key={i} className="text-gray-600">{log}</div>
        ))}
      </div>
    </div>
  );
}
```

**Why polling over SSE for job progress:**
1. **Browser refresh resilience:** SSE connection dies on refresh; polling can resume by fetching current job state from Redis
2. **Job persistence:** BullMQ stores progress/logs in Redis; polling reads persisted state, not ephemeral stream
3. **Route Handler lifespan:** SSE requires keeping the Route Handler alive for entire job duration (4-6 min for large docs); polling is stateless
4. **Standard pattern:** Background job progress is typically polled (GitHub Actions, Vercel deployments, etc.)

**Integration with existing BullMQ infrastructure:**

The worker (`worker/index.ts`) already has a job handler dispatch map. Add `document-extraction` handler:

```typescript
// worker/index.ts (ADD to existing JOB_HANDLERS map)
import documentExtraction from './jobs/document-extraction';

const JOB_HANDLERS: Record<string, JobHandler> = {
  'action-sync': actionSync,
  'health-refresh': healthRefresh,
  // ... existing 13 handlers ...
  'document-extraction': documentExtraction,  // NEW
};
```

Replace SSE Route Handler (`app/api/ingestion/extract/route.ts`) with job enqueue:

```typescript
// app/api/ingestion/extract/route.ts (REPLACE SSE stream with job enqueue)
export async function POST(request: NextRequest) {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  // Parse request body...
  const { artifactId, projectId } = parseResult.data;

  const queue = new Queue('scheduled-jobs', {
    connection: createApiRedisConnection() as any
  });

  const job = await queue.add('document-extraction', {
    artifactId,
    projectId,
  }, {
    removeOnComplete: 100,  // Keep last 100 completed jobs
    removeOnFail: 50,       // Keep last 50 failed jobs
  });

  await queue.close();

  return Response.json({ jobId: job.id }, { status: 202 });  // 202 Accepted
}
```

---

### 2. Timeline Visualization

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **react-chrono** | ^3.0.0 | Timeline component for visual milestone representation | Modern (2024 releases), actively maintained, vertical/horizontal/alternating modes, built-in card styling, TypeScript support, React 18+ compatible, SSR-safe |

**Why react-chrono:**
- **Declarative:** Pass array of timeline items, library handles layout/styling
- **SSR-safe:** No DOM dependencies during render (works with Next.js App Router)
- **Modes:** Vertical, horizontal, alternating sides — matches common project timeline UX patterns
- **Customizable:** Theming API for colors, fonts, card styles
- **TypeScript-first:** Full type definitions included

**Example implementation:**

```typescript
// components/overview/MilestoneTimeline.tsx
import { Chrono } from 'react-chrono';

export function MilestoneTimeline({ milestones }) {
  const items = milestones.map(m => ({
    title: new Date(m.target_date).toLocaleDateString(),
    cardTitle: m.name,
    cardSubtitle: m.status,
    cardDetailedText: m.description || '',
  }));

  return (
    <Chrono
      items={items}
      mode="VERTICAL"
      theme={{
        primary: '#3b82f6',
        secondary: '#e5e7eb',
        cardBgColor: '#ffffff',
        titleColor: '#1f2937',
      }}
      cardHeight={120}
      scrollable={{ scrollbar: true }}
      disableToolbar
    />
  );
}
```

**Alternative: Custom Tailwind timeline (NO dependencies)**

If design requirements don't match react-chrono's card-based styling:

```typescript
// components/overview/CustomTimeline.tsx (NO dependencies)
export function CustomTimeline({ milestones }) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300" />

      {milestones.map((m, i) => (
        <div key={m.id} className="relative pl-16 pb-8">
          {/* Timeline dot */}
          <div className="absolute left-6 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow" />

          {/* Content card */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">
              {new Date(m.target_date).toLocaleDateString()}
            </div>
            <div className="font-semibold text-gray-900">{m.name}</div>
            <div className="text-sm text-gray-600">{m.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**When to use custom vs react-chrono:**
- **Use react-chrono:** Standard timeline UI, need built-in scroll/zoom, want rapid implementation
- **Use custom Tailwind:** Design system has specific timeline styling that doesn't match react-chrono cards, or need pixel-perfect control

---

### 3. Data Visualization (Metrics Section)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **Recharts** | ^2.15.0 | Declarative charting library for React | Composable React components, responsive by default, pure SVG (no canvas), excellent TypeScript support, widely adopted (>25k GitHub stars), React 18+ compatible |

**Why Recharts:**
- **React-native:** Charts are React components, not imperative canvas drawing
- **Composable:** `<BarChart>`, `<LineChart>`, `<XAxis>`, `<Tooltip>` compose declaratively
- **Responsive:** `<ResponsiveContainer>` handles resize automatically
- **TypeScript:** Full type definitions, no `@types/` package needed
- **Bundle size:** ~60KB minified (reasonable for a full charting library)

**Example: Phase completion bar chart**

```typescript
// components/metrics/PhaseCompletionChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function PhaseCompletionChart({ phases }) {
  const data = phases.map(p => ({
    name: p.name,
    completion: p.percent_complete,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Bar dataKey="completion" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Example: Risk trend line chart**

```typescript
// components/metrics/RiskTrendChart.tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export function RiskTrendChart({ trendData }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={trendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} />
        <Line type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={2} />
        <Line type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Alternative: Victory**

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Victory** | ^37.0.0 | Declarative charting with advanced animations | Need more animation control, touch gesture support, or complex interaction patterns |

**Tradeoff:** Victory bundle is ~100KB vs Recharts ~60KB. Use if animation/interaction is critical; otherwise Recharts is lighter and simpler.

**Alternative: Chart.js + react-chartjs-2**

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Chart.js** | ^4.4.0 | Canvas-based charting with react-chartjs-2 wrapper | Dataset has >1000 points and needs canvas rendering for performance |

**Tradeoff:** Imperative API (less React-idiomatic), canvas rendering (not SVG). Use only if SVG performance is insufficient (unlikely at project scale).

---

## Installation

```bash
# BullMQ job progress — NO NEW PACKAGES NEEDED
# (BullMQ 5.71.0 and ioredis 5.10.1 already installed)

# Timeline visualization
npm install react-chrono

# Data visualization (Metrics section)
npm install recharts
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Polling (1.5s interval)** | SSE for job progress | Never — SSE connection dies on browser refresh; BullMQ progress is persisted in Redis, polling is resilient |
| **Polling (1.5s interval)** | WebSocket | Multiple concurrent long-running jobs need sub-second real-time updates (not current requirement; adds complexity) |
| **react-chrono** | Custom Tailwind timeline | Design system has specific timeline styling that doesn't match react-chrono's card-based approach |
| **Recharts** | Victory | Need advanced animations, touch gestures, or complex interaction patterns |
| **Recharts** | Chart.js | Dataset has >1000 points and SVG performance is insufficient (unlikely at project scale) |
| **Recharts** | D3.js directly | Need custom physics simulation or highly specialized chart types not covered by Recharts |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **SSE for job progress** | Browser refresh kills connection; Route Handler must stay alive for full job duration (4-6 min); progress lost if connection drops | BullMQ `job.updateProgress()` + polling endpoint (progress persisted in Redis) |
| **D3.js directly** | Imperative DOM manipulation conflicts with React's declarative model; requires manual reconciliation | Recharts (React-native, declarative) |
| **vis-timeline** | jQuery dependency, not React-native, accessibility issues, last release 2020 | react-chrono or custom Tailwind implementation |
| **Additional Redis connection pool** | Worker/Queue connection separation already correctly implemented | Use existing `createApiRedisConnection()` pattern from `worker/connection.ts` |
| **chartist.js** | Maintenance stopped in 2019, no React 18 support | Recharts |
| **C3.js / NVD3** | Built on D3, same imperative issues, limited React integration | Recharts |

---

## Stack Patterns by Feature

### Document Extraction Job Pattern

**Current (v3.0):** SSE stream in Route Handler (`/api/ingestion/extract`)
- **Problem:** Browser refresh kills extraction; large docs take 4-6 min; Route Handler stays alive entire time
- **Risk:** User navigates away → extraction aborted, no resume capability

**New (v4.0):** BullMQ background job
- **Flow:** POST `/api/ingestion/extract` → enqueue job → return `jobId` → client polls `/api/jobs/{jobId}/progress` every 1.5s
- **Benefit:** Browser refresh OK (progress persisted in Redis), user can navigate away and come back
- **Worker:** `worker/jobs/document-extraction.ts` calls `job.updateProgress()` and `job.log()` at each step

### Time Tracking Redesign

**Current (v3.0):** Time tracking is a per-project tab
**New (v4.0):** Standalone top-level route `/time-tracking` with global project-assignment view

**No new stack needed** — this is a routing and UI redesign using existing Radix UI components, Tailwind CSS, and PostgreSQL queries across projects.

### Overview Tab — Visual Milestone Timeline

**Pattern:** Fetch milestones from DB, render with react-chrono or custom Tailwind timeline
- **Data:** `milestones` table (already exists) with `target_date`, `name`, `status`
- **Render:** Vertical timeline showing project delivery milestones in chronological order
- **Interaction:** Click milestone → drill into milestone details (existing Radix Dialog component)

### Overview Tab — Metrics Section

**Pattern:** Aggregate data from DB, render with Recharts
- **Metrics examples:**
  - Phase completion bar chart (from `workstreams` table)
  - Risk trend line chart (historical risk counts by severity)
  - Action velocity (actions opened vs closed per week)
  - Onboarding progress (from `onboarding_steps` table)
- **Data:** SQL aggregation queries in Route Handler
- **Render:** Recharts components (`<BarChart>`, `<LineChart>`, `<PieChart>`)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| **BullMQ 5.71.0** | ioredis ^5.10.0, Redis 6.2+ | Requires `maxRetriesPerRequest: null` for Worker (already configured in `worker/connection.ts`) |
| **react-chrono ^3.0.0** | React 18+, Next.js 16 | SSR-safe (no DOM dependencies during render), works with App Router |
| **Recharts ^2.15.0** | React 18+, Next.js 16 | May need dynamic import with `ssr: false` if charts use window APIs during render (test first; ResponsiveContainer uses window resize but should be SSR-safe) |

**Next.js 16 SSR Note:**
If Recharts throws "window is not defined" during build, use dynamic import:

```typescript
import dynamic from 'next/dynamic';

const PhaseCompletionChart = dynamic(
  () => import('@/components/metrics/PhaseCompletionChart'),
  { ssr: false }
);
```

This is the same pattern already used for `@xyflow/react` in the codebase (`components/graph/CustomNodes.tsx` uses dynamic import with `ssr: false`).

---

## Performance Considerations

### BullMQ Job Storage

- **Job retention:** Config uses `removeOnComplete: 100`, `removeOnFail: 50`
- **Redis memory:** ~50KB per job with logs; 100 jobs = ~5MB
- **Cleanup:** Jobs auto-removed per retention limits
- **Logs:** Default BullMQ keeps last 100 log entries per job (configurable)

### Polling Frequency

| Interval | Pros | Cons |
|----------|------|------|
| **1.5s** (recommended) | Good balance of responsiveness and server load | ~40 API calls per minute |
| **2s** | Lower server load | Slightly less responsive UI |
| **1s** | Sub-second updates | 50% more API calls than 1.5s; minimal UX gain |

**Recommendation:** 1.5s interval. If server load becomes a concern (>10 concurrent extractions), increase to 2s.

### Chart Rendering

- **Recharts:** Pure SVG; suitable for datasets up to ~500 points
- **Victory:** Similar SVG performance; larger bundle size
- **Chart.js:** Canvas rendering; use only if dataset >1000 points (not expected at project scale)

---

## Migration Notes

### From SSE to BullMQ Job Pattern

**Before (v3.0):**
```typescript
// Client
const eventSource = new EventSource('/api/ingestion/extract');
eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'progress') setProgress(data.message);
  if (data.type === 'complete') handleComplete(data.items);
};
```

**After (v4.0):**
```typescript
// Client
const res = await fetch('/api/ingestion/extract', { method: 'POST', ... });
const { jobId } = await res.json();

const timer = setInterval(async () => {
  const status = await fetch(`/api/jobs/${jobId}/progress`);
  const { state, progress, logs } = await status.json();
  setProgress(progress);
  if (state === 'completed') {
    clearInterval(timer);
    handleComplete();
  }
}, 1500);
```

**Worker setup:**
1. Create `worker/jobs/document-extraction.ts` (copy logic from SSE route, add `job.updateProgress()` calls)
2. Register in `worker/index.ts` job handler map
3. Replace SSE Route Handler with job enqueue logic
4. Add `/api/jobs/[id]/progress` Route Handler

---

## Sources

- **BullMQ patterns:** Existing codebase analysis (`worker/index.ts`, `worker/connection.ts`, `app/api/jobs/[id]/route.ts`) — HIGH confidence
- **BullMQ job progress API:** BullMQ documentation (job.updateProgress, job.log, job.getState) — HIGH confidence (official API)
- **react-chrono:** npm package page, GitHub releases (v3.0.0 released 2024) — MEDIUM confidence (version may have updates since January 2025)
- **Recharts:** npm package page (v2.15.0 current as of January 2025), React 18 compatibility documented — MEDIUM confidence
- **React 18 + Next.js 16 compatibility:** Existing codebase uses React 19.2.4 + Next.js 16.2.0; all libraries recommended here are React 18+ compatible — HIGH confidence

---
*Stack research for: v4.0 feature additions (BullMQ job progress, timeline visualization, metrics charts)*
*Researched: 2026-04-01*
