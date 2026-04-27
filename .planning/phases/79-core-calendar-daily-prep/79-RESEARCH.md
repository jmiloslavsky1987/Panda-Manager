# Phase 79: Core Calendar + Daily Prep - Research

**Researched:** 2026-04-27
**Domain:** Next.js App Router, Google Calendar API, SSE streaming, LocalStorage persistence, React event-driven UI
**Confidence:** HIGH

## Summary

Phase 79 wires together four existing pieces (CalendarImportModal, global calendar-import API, Meeting Prep skill + context builder, SSE infrastructure) while adding one fully new surface (/daily-prep page) and one new API endpoint (/api/daily-prep/generate). The global calendar-import route already exists and is correct; it only needs title-based matching added alongside the existing attendee heuristic. CalendarImportModal only needs its `projectId` prop made optional and its internal fetch URL updated — the ConfidenceBadge, week-picker, and EventRow state machine are reusable unchanged.

The /daily-prep page is a net-new `app/daily-prep/page.tsx` client component that fetches today's events from the existing GET endpoint, renders event cards with checkboxes, fires SSE generation to the new `/api/daily-prep/generate` route, and persists briefs in LocalStorage keyed by ISO date. The SSE pattern in the existing stream route is the direct template; no BullMQ, no skill_runs row. Meeting Prep skill output sections must be updated to match the new structured headers (Context, Desired Outcome, Agenda).

The `buildMeetingPrepContext` function gains a new optional parameter for calendar metadata (attendees, duration, recurrence flag, event description). The skill orchestrator continues to route `meeting-prep` through `buildMeetingPrepContext` — no changes to routing needed, only to the context builder signature and the SKILL.md prompt.

**Primary recommendation:** Build in five sequential work areas — (1) CalendarImportModal global wiring + title matching, (2) Sidebar nav entry, (3) /daily-prep page + event cards, (4) /api/daily-prep/generate SSE endpoint, (5) Meeting Prep skill metadata enhancement. Each area is independently testable and deployable.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CalendarImportModal — Global Scope**
- Open with no projectId — cross-project API endpoint replaces the per-project one
- Matching uses both event title keywords (against project/customer names) AND attendee emails (against stakeholders) — title as primary, attendees as tiebreaker
- Confidence badges displayed per event (High/Low/None) — same badge component already exists
- All active projects available in the assignment dropdown for unmatched or manually-reassigned events
- Week picker navigation: same as existing per-project modal — no changes to the week-start behavior

**Daily Prep — Event Cards**
- Each card shows: time, title, duration, matched project, attendees, and recurrence indicator (visual flag if recurring series)
- Recurrence indicator is display-only in Phase 79 — no template saving (that's Phase 80)
- Unmatched events: inline project dropdown directly on the card; user assigns project before selecting for prep generation
- Selection: checkboxes on each card + "Select All" header; "Generate Prep" button activates when 1+ are selected
- Empty state for days with no events: "No meetings on [date]" — no next-day navigation shortcut

**Meeting Prep — Inline Output**
- Generated brief expands below the card, pushing content down — same expand pattern as Outputs Library (expandedId toggle)
- For batch-selected events: all fire simultaneously (parallel generation), each card shows its own loading state
- After generation: brief stays expanded, checkbox deselects. Collapse button available on the card
- Brief persistence: LocalStorage keyed by today's date (ISO format). Survives navigation and page reloads within the same day. Date key changes at midnight so next day always starts fresh — no explicit cleanup needed

**Skill Infrastructure — Daily Prep**
- Direct API call, no BullMQ: new `/api/daily-prep/generate` endpoint calls Claude directly
- Output streams via SSE (same pattern as existing skill runner) — progressive text rendering as brief generates
- No skill run record created, no redirect to /skills/[runId] — output lives inline on /daily-prep only

**Meeting Prep Skill — Calendar Metadata Enhancement**
- Skill context builder receives: attendees, duration, recurrence flag, AND event description/body (if present)
- Event description passed as-is; skill prompt should treat it as optional context (may be empty)
- Structured output sections: Context, Desired Outcome, 2–3 bullet Agenda — consistent headers from both /daily-prep and Skills tab

### Claude's Discretion
- Exact LocalStorage key structure and serialization format for brief persistence
- SSE implementation on the new /api/daily-prep/generate endpoint (follow existing skill SSE pattern)
- How "recurrence flag" is detected from Google Calendar event data (series ID or recurrence field)
- Exact matching query JOIN shape for cross-project title + attendee heuristic
- Loading skeleton vs spinner for per-card generation state

### Deferred Ideas (OUT OF SCOPE)
- Recurring meeting template saving — Phase 80
- PDF export of day's briefs — Phase 80
- Team/stakeholder availability view per event — Phase 80
- Auto-prep job (N hours before meetings) — Phase 80
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAL-01 | User can open CalendarImportModal from GlobalTimeView (wire in the already-built component, currently commented out) | GlobalTimeView.tsx has a clear TODO comment at line 362 with commented-out import at line 8; the trigger button stub is ready |
| CAL-02 | Imported calendar events auto-populate duration, matched project, and task; task left blank when no match is found | Global calendar-import GET route already returns `duration_hours`, `matched_project_id`, `matched_project_name`; title-based matching must be added |
| CAL-03 | Each event displays a confidence badge (high / low / none) based on project matching certainty | ConfidenceBadge component is defined inline in CalendarImportModal.tsx; it can be extracted to a shared module or imported directly |
| PREP-01 | A /daily-prep route exists with a sidebar link directly below Dashboard | No `app/daily-prep/` directory exists yet; Sidebar.tsx Dashboard link is at lines 27-35; Daily Prep link must be inserted immediately after |
| PREP-02 | Page shows event cards for today's calendar meetings with time, title, duration, matched project, and attendees | Global GET endpoint does NOT yet return attendee display names/emails; it must be extended |
| PREP-03 | Unmatched events show a manual project assignment dropdown | EventRow pattern from CalendarImportModal is the template; apply same dropdown UI on /daily-prep cards |
| PREP-04 | User can multi-select events and trigger Meeting Prep generation for the selected set | Checkbox + selectedIds Set pattern (same as GlobalTimeView bulk-select); "Generate Prep" fires parallel SSE requests |
| PREP-05 | Prep output expands inline per event card — sections: context, desired outcome, 2–3 bullet agenda | expandedId toggle pattern from app/outputs/page.tsx; prose prose-zinc prose-sm max-w-none + ReactMarkdown with rehype-sanitize |
| PREP-06 | Each expanded prep card has a Copy to Clipboard button | navigator.clipboard.writeText(stripMarkdown(output)) pattern from skill run page at line 153 |
| PREP-07 | A date picker allows viewing and prepping for meetings on other days | `input[type=date]` with ISO value; same pattern as week-start-picker in CalendarImportModal |
| SKILL-01 | Calendar event metadata (attendees, duration, recurrence flag) is injected into the Meeting Prep skill context builder | buildMeetingPrepContext in lib/meeting-prep-context.ts currently accepts (projectId, input?:string) — needs new optional CalendarMetadata parameter |
| SKILL-02 | Meeting Prep skill output uses a structured format with explicit sections: Context, Desired Outcome, Agenda | skills/meeting-prep.md currently outputs Open Items / Recent Activity / Suggested Agenda — sections must be renamed and restructured |
| NAV-01 | "Daily Prep" sidebar link appears directly below Dashboard in the upper navigation section (above project list) | Sidebar.tsx shows Dashboard link in its own `div` block followed immediately by the Projects section; Daily Prep link inserts between them |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.0 | New app/daily-prep/page.tsx route; new API routes | Project standard |
| googleapis (calendar_v3) | ^171.4.0 | Google Calendar events.list; recurrence fields already typed | Already in use for existing calendar routes |
| @anthropic-ai/sdk | ^0.80.0 | Direct Claude streaming from /api/daily-prep/generate | Same SDK used by skill-orchestrator for SSE output |
| Drizzle ORM | ^0.45.1 | DB queries in new API endpoint | Project ORM |
| lucide-react | ^0.577.0 | Icons in sidebar (CalendarDays or Sun icon) and event cards | All existing sidebar icons use lucide-react |
| react-markdown + rehype-sanitize | ^10.1.0 | Render streaming markdown inline on cards | Pattern established in outputs/page.tsx and skill run page |
| sonner | ^2.0.7 | Toast notifications on copy or error | Used throughout app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/typography | ^0.5.19 | prose classes for rendered markdown | Required for `prose prose-zinc prose-sm max-w-none` pattern |
| better-auth | ^1.5.6 | requireSession() in every new route handler | All API routes require it per project security policy |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct Anthropic SDK streaming | Vercel AI SDK useChat | Direct SDK is the established pattern in skill-orchestrator; useChat adds complexity for an inline UI |
| LocalStorage for brief persistence | Server-side DB storage | LocalStorage is intentional: no schema change, natural date-keyed expiry, zero server cost for ephemeral day-prep data |
| EventSource (native) | fetch with ReadableStream | EventSource is already used in skill run page and is the established SSE client pattern in this codebase |

**Installation:** No new packages required. All dependencies are already in package.json.

---

## Architecture Patterns

### Recommended Project Structure
```
app/
├── daily-prep/
│   └── page.tsx              # New client page — event cards + prep generation
app/api/
├── daily-prep/
│   └── generate/
│       └── route.ts          # New SSE endpoint — direct Claude call, no BullMQ
├── time-entries/
│   └── calendar-import/
│       └── route.ts          # Existing — extend CalendarEventItem to include attendees, recurrence_flag, event_description
lib/
└── meeting-prep-context.ts   # Extend buildMeetingPrepContext signature to accept CalendarMetadata
components/
└── Sidebar.tsx               # Add Daily Prep link
└── GlobalTimeView.tsx        # Uncomment CalendarImportModal, make projectId optional
└── CalendarImportModal.tsx   # Make projectId optional, update fetch URL
skills/
└── meeting-prep.md           # Update sections: Context, Desired Outcome, Agenda
```

### Pattern 1: Global Calendar Import (CAL-01, CAL-02, CAL-03)

**What:** CalendarImportModal currently requires `projectId: number`. Make it optional (`projectId?: number`). When absent, the modal fetches from the global `/api/time-entries/calendar-import` route rather than `/api/projects/${projectId}/time-entries/calendar-import`.

**When to use:** GlobalTimeView has no project context — it is the cross-project time view.

**Existing code location:** `components/CalendarImportModal.tsx:103` — update the fetch URL conditionally based on whether `projectId` is provided.

```typescript
// In CalendarImportModal.tsx — update both GET and POST fetch URLs:
const baseUrl = projectId
  ? `/api/projects/${projectId}/time-entries/calendar-import`
  : `/api/time-entries/calendar-import`;

fetch(`${baseUrl}?week_start=${weekStart}`)
// and:
fetch(baseUrl, { method: 'POST', ... })
```

### Pattern 2: Title + Attendee Hybrid Matching (CAL-02, CAL-03)

**What:** The current global calendar-import GET route matches only by attendee email overlap. Per CONTEXT.md, title matching is primary and attendees are a tiebreaker.

**Algorithm:**
1. Normalize event summary and all project `customer` names to lowercase.
2. Title match: check if the project name is a substring of the event summary (or vice versa). Score: 2 points per title match.
3. Attendee match: count email overlaps with project stakeholders. Score: 1 point per overlapping email.
4. Best total score wins. Confidence: `high` if score >= 2 (any title match or 2+ email matches), `low` if score == 1 (single email match only), `none` if score == 0.

**Why this approach:** Title matching is strong signal (project name in meeting title is almost always intentional). Attendee-only matching was the existing pattern; keeping it as tiebreaker preserves continuity for events where title doesn't match.

```typescript
// In app/api/time-entries/calendar-import/route.ts — extend scoring:
const summaryLower = (e.summary ?? '').toLowerCase();

for (const [pid, emails] of projectEmailMap) {
  const projectName = (projectNameMap.get(pid) ?? '').toLowerCase();
  let score = 0;
  // Title match (primary)
  if (projectName && (summaryLower.includes(projectName) || projectName.includes(summaryLower))) {
    score += 2;
  }
  // Attendee match (tiebreaker)
  for (const email of attendeeEmails) {
    if (emails.has(email)) score++;
  }
  if (score > bestScore) {
    bestScore = score;
    bestProjectId = pid;
  }
}
const match_confidence: 'high' | 'low' | 'none' =
  bestScore >= 2 ? 'high' : bestScore === 1 ? 'low' : 'none';
```

### Pattern 3: Extending CalendarEventItem for Daily Prep (PREP-02, SKILL-01)

**What:** The GET response `CalendarEventItem` interface must be extended to carry fields the /daily-prep page needs but the import modal does not.

**Current interface** (`app/api/time-entries/calendar-import/route.ts:60`):
```typescript
export interface CalendarEventItem {
  event_id: string;
  summary: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: string;
  matched_project_id: number | null;
  matched_project_name: string | null;
  match_confidence: 'high' | 'low' | 'none';
}
```

**Extended interface** (add to the same route, backwards compatible — all new fields optional):
```typescript
export interface CalendarEventItem {
  // ... existing fields ...
  attendee_names: string[];       // display names or emails of attendees
  recurrence_flag: boolean;       // true if event.recurringEventId is set
  event_description: string | null; // event.description from Google Calendar
}
```

**Recurrence detection** (from googleapis v3 types at line 740):
- `e.recurringEventId` is set on all instances of a recurring series (not on the series parent itself).
- With `singleEvents: true` in the existing events.list call, all returned events are instances — so `!!e.recurringEventId` is the correct flag.

```typescript
recurrence_flag: !!e.recurringEventId,
attendee_names: (e.attendees ?? [])
  .map(a => a.displayName ?? a.email ?? '')
  .filter(Boolean),
event_description: e.description ?? null,
```

### Pattern 4: /daily-prep Page Structure (PREP-01 through PREP-07)

**What:** New `app/daily-prep/page.tsx` — a 'use client' component that:
1. Checks calendar connection via `/api/oauth/calendar/status` on mount.
2. Fetches today's events via `/api/time-entries/calendar-import?week_start=<monday>` filtered to today's date.
3. Renders event cards with checkboxes, project dropdowns for unmatched events, recurrence indicator.
4. "Generate Prep" button fires parallel SSE requests to `/api/daily-prep/generate` for all selected events.
5. Loads/saves brief state from/to LocalStorage.

**State model:**
```typescript
interface EventCardState {
  event: CalendarEventItem;
  selectedProjectId: number | null;
  selected: boolean;           // checkbox
  briefStatus: 'idle' | 'loading' | 'done' | 'error';
  briefContent: string | null; // streamed output
  expanded: boolean;           // show/hide brief
}
```

**Date picker:** `input[type=date]` with ISO value defaulting to today. On change, fetch events for the new date (still using the same week-based endpoint, filter client-side by selected date or add a `?date=` param to the API).

**Empty state:** `<p>No meetings on {selectedDate}</p>` — no shortcut to next day.

### Pattern 5: /api/daily-prep/generate SSE Endpoint (PREP-04, PREP-05)

**What:** Direct Claude call via `@anthropic-ai/sdk` with ReadableStream response — no BullMQ, no skill_runs row. Follows the same SSE response structure as the existing stream route.

**Critical requirements (from existing SSE route):**
- `export const dynamic = 'force-dynamic'` is REQUIRED for Next.js App Router SSE routes.
- Response must be returned immediately; all async work happens inside `ReadableStream.start()`.
- Headers: `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.

```typescript
// app/api/daily-prep/generate/route.ts
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  const { session, redirectResponse } = await requireSession();
  if (redirectResponse) return redirectResponse;

  const { eventId, eventTitle, projectId, attendees, durationHours, recurrenceFlag, eventDescription } 
    = await request.json();

  // Build context string from project data + calendar metadata
  const context = await buildDailyPrepContext(projectId, {
    eventTitle, attendees, durationHours, recurrenceFlag, eventDescription
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
          // Load meeting-prep.md for system prompt
          const systemPrompt = await readFile(skillPath, 'utf-8');
          
          const stream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: context }],
          });
          
          stream.on('text', (text) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          });
          
          await stream.finalMessage();
          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

**Client-side SSE consumption** (for each selected event card):
```typescript
const es = new EventSource(''); // EventSource only supports GET
// Use fetch with ReadableStream for POST SSE:
const response = await fetch('/api/daily-prep/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const reader = response.body!.getReader();
// Read and accumulate text chunks, update card state
```

**NOTE:** EventSource does not support POST. The /api/daily-prep/generate endpoint accepts POST (to send event metadata in body). Use `fetch` with `ReadableStream` reader on the client side — not `EventSource`.

### Pattern 6: LocalStorage Brief Persistence (PREP-05)

**What:** Persists generated briefs so they survive navigation and page reloads within the same day.

**Key structure (Claude's Discretion — recommendation):**
```typescript
const STORAGE_KEY = `daily-prep-briefs:${new Date().toISOString().slice(0, 10)}`;
// e.g. "daily-prep-briefs:2026-04-27"

interface StoredBriefs {
  [eventId: string]: {
    content: string;
    generatedAt: string; // ISO timestamp
  };
}

// Load on mount:
const stored = localStorage.getItem(STORAGE_KEY);
const briefs: StoredBriefs = stored ? JSON.parse(stored) : {};

// Save after generation:
briefs[eventId] = { content: briefContent, generatedAt: new Date().toISOString() };
localStorage.setItem(STORAGE_KEY, JSON.stringify(briefs));
```

Date key changes naturally at midnight — no cleanup code needed. Old keys accumulate but are harmless (browsers enforce ~5MB localStorage quota; brief text is small).

### Pattern 7: Meeting Prep Skill Enhancement (SKILL-01, SKILL-02)

**What:** `buildMeetingPrepContext` gains an optional `CalendarMetadata` parameter. The Meeting Prep skill prompt is restructured to output Context / Desired Outcome / Agenda sections.

**Current signature:** `buildMeetingPrepContext(projectId: number, input?: string): Promise<string>`

**New signature:**
```typescript
interface CalendarMetadata {
  eventTitle?: string;
  attendees?: string[];
  durationHours?: string;
  recurrenceFlag?: boolean;
  eventDescription?: string | null;
}

export async function buildMeetingPrepContext(
  projectId: number,
  input?: string,
  calendarMeta?: CalendarMetadata
): Promise<string>
```

The new parameter is optional and appended at the end — existing callers (`SkillOrchestrator` passing `params.input?.transcript`) are unaffected.

**SKILL.md update** (skills/meeting-prep.md): Replace current section structure (Open Items / Recent Activity / Suggested Agenda) with:

```
## Context
[Brief summary of meeting purpose, project status relevant to this meeting]

## Desired Outcome
[Single clear sentence: what success looks like at end of this meeting]

## Agenda
- [Concrete agenda item 1]
- [Concrete agenda item 2]
- [Concrete agenda item 3 (optional)]
```

### Anti-Patterns to Avoid

- **Using EventSource for POST:** The `/api/daily-prep/generate` endpoint must be POST (to send event metadata in body). EventSource only supports GET. Use `fetch` + `ReadableStream` reader.
- **Skipping `export const dynamic = 'force-dynamic'`:** Any Next.js App Router route that returns a streaming response without this export will buffer the entire response and break SSE.
- **Module-load DB queries:** New API route files must NOT query DB at module scope. Use lazy initialization inside the handler. Violating this breaks `next build` in Docker.
- **Using `__dirname` in next.config.ts:** Already noted in CLAUDE.md; new routes that resolve skill paths must use `process.cwd()` or `resolveSkillsDir()` from the existing `lib/skill-path.ts`.
- **Title match on partial noise words:** Matching `"team"` against project names will produce false positives. Use `projectName.length > 3` as a minimum guard before substring matching.
- **Re-streaming on SSE reconnect without deduplication:** The existing stream route solves this with `Last-Event-ID`. The new daily-prep endpoint is simpler (no DB chunks) — once the stream closes, a reconnect would restart generation. Accept this limitation for Phase 79; it is low risk for an interactive inline flow.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering of streamed output | Custom HTML builder | ReactMarkdown + rehype-sanitize | XSS safety; already in use throughout app |
| Copy to clipboard | Custom clipboard API wrapper | `navigator.clipboard.writeText(stripMarkdown(output))` | Pattern already established at skill run page line 153 |
| Calendar token refresh | Custom OAuth refresh flow | `oauth2Client.setCredentials()` + `'tokens'` event listener | Already implemented in global calendar-import route; copy the pattern, do not re-implement |
| Project list for dropdown | Custom fetch + cache | `GET /api/projects` (already called by CalendarImportModal) | Already returns all active projects in correct shape |
| Event date/duration extraction | Date math from raw strings | Follow existing `startDT.split('T')[0]` and `(endDT - startDT) / 3_600_000` pattern from global import route | Battle-tested; handles timezone edge cases correctly |

**Key insight:** The hardest problems in this phase (OAuth, SSE, markdown rendering, project matching) are all already solved in the codebase. The work is wiring, not invention.

---

## Common Pitfalls

### Pitfall 1: CalendarImportModal projectId Prop Change Breaks TypeScript
**What goes wrong:** Changing `projectId: number` to `projectId?: number` requires updating every call site that passes a literal number; TypeScript will flag non-optional usage.
**Why it happens:** The prop type change propagates to all consumers.
**How to avoid:** Make the change in the interface first, fix all call sites in one pass. GlobalTimeView is the only call site to update.
**Warning signs:** TypeScript errors on the `fetch` URL template literal inside the modal.

### Pitfall 2: POST SSE vs EventSource
**What goes wrong:** Developer writes `new EventSource('/api/daily-prep/generate')` which silently ignores the request body — Claude receives no event metadata, outputs generic text.
**Why it happens:** SSE is conventionally GET; POST SSE requires `fetch` + `ReadableStream`.
**How to avoid:** Always use `fetch` + `response.body.getReader()` for POST SSE endpoints. Add a code comment on the route: `// POST — use fetch ReadableStream client-side, NOT EventSource`.
**Warning signs:** Briefs generated without event title in Context section; no network body payload visible in DevTools.

### Pitfall 3: Daily Prep Endpoint Loads DB at Module Scope
**What goes wrong:** `next build` fails in Docker because the route file imports `db` or calls `requireSession()` at module scope.
**Why it happens:** Next.js pre-renders routes at build time; DB connections are not available.
**How to avoid:** All DB access must be inside the handler function. Import `db` at the top of the file is fine; calling `db.select()` outside a function body is not.
**Warning signs:** Build error: "Cannot read properties of undefined" or "Connection refused" during `next build`.

### Pitfall 4: Title Matching False Positives on Short Project Names
**What goes wrong:** A project named "AI" matches almost every event title, skewing confidence to `high` incorrectly.
**Why it happens:** Substring matching on short strings is too permissive.
**How to avoid:** Only apply title-match scoring when `projectName.length > 3`. This guards against 1-3 char names without excluding legitimate 4+ char names.
**Warning signs:** Nearly all events show `high` confidence badges regardless of actual relevance.

### Pitfall 5: LocalStorage Hydration Mismatch (SSR)
**What goes wrong:** Server renders the page with empty brief state; client hydrates with LocalStorage data; React throws hydration mismatch error.
**Why it happens:** `localStorage` is not available during SSR.
**How to avoid:** The `/daily-prep` page must be a `'use client'` component and LocalStorage access must happen inside `useEffect` (not during render). `app/daily-prep/page.tsx` should also export `export const dynamic = 'force-dynamic'` to prevent any static prerendering attempt.
**Warning signs:** Console error: "Hydration failed because the initial UI does not match what was rendered on the server."

### Pitfall 6: Stale Brief Shown for Wrong Day
**What goes wrong:** User navigates to a different date using the date picker; old briefs from today's LocalStorage key appear on the new date's cards.
**Why it happens:** The LocalStorage key is always built from `today` (current date), not from `selectedDate`.
**How to avoid:** Build the LocalStorage key from `selectedDate` (the date picker value), not from `new Date()`. When user navigates to a different day, use that day's key.
**Warning signs:** A brief from Monday appears on Tuesday's cards.

---

## Code Examples

Verified patterns from existing codebase sources:

### SSE Route — ReadableStream Pattern
```typescript
// Source: app/api/skills/runs/[runId]/stream/route.ts
export const dynamic = 'force-dynamic';

const stream = new ReadableStream({
  start(controller) {
    // CRITICAL: no await here — Response must return immediately so SSE headers flush
    (async () => {
      try {
        // ... async work ...
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    })();
  },
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  },
});
```

### Client-side SSE Consumption (EventSource — for GET endpoints only)
```typescript
// Source: app/customer/[id]/skills/[runId]/page.tsx:73
const es = new EventSource(`/api/skills/runs/${runId}/stream`);
es.onmessage = (e) => {
  const { text } = JSON.parse(e.data as string) as { text: string };
  setOutput(prev => prev + text);
};
es.addEventListener('done', () => {
  es.close();
  // re-fetch authoritative output from DB
});
```

### Client-side fetch+ReadableStream (for POST SSE — required for /api/daily-prep/generate)
```typescript
// Pattern: fetch POST with ReadableStream reader
const response = await fetch('/api/daily-prep/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  // Parse SSE lines: "data: {...}\n\n"
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ')) {
      const parsed = JSON.parse(line.slice(6));
      if (parsed.text) setOutput(prev => prev + parsed.text);
    }
    if (line.startsWith('event: done')) {
      // Generation complete
    }
  }
}
```

### expandedId Toggle Pattern
```typescript
// Source: app/outputs/page.tsx:21,142
const [expandedId, setExpandedId] = useState<number | null>(null);

// Toggle:
setExpandedId(expandedId === output.id ? null : output.id);

// Render conditional:
{expandedId === output.id && (
  <div className="prose prose-zinc prose-sm max-w-none">
    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{output.content}</ReactMarkdown>
  </div>
)}
```

### Copy to Clipboard Pattern
```typescript
// Source: app/customer/[id]/skills/[runId]/page.tsx:153
navigator.clipboard.writeText(stripMarkdown(output)).then(() => {
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
});
```

### ConfidenceBadge Component (inline in CalendarImportModal.tsx:45)
```typescript
function ConfidenceBadge({ confidence }: { confidence: 'high' | 'low' | 'none' }) {
  const styles = {
    high: 'bg-green-100 text-green-700',
    low: 'bg-amber-100 text-amber-700',
    none: 'bg-zinc-100 text-zinc-500',
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${styles[confidence]}`}>
      {confidence}
    </span>
  );
}
```

For reuse on /daily-prep, extract this to a shared component at `components/ConfidenceBadge.tsx` and import in both CalendarImportModal and the daily-prep page.

### Recurrence Flag Detection
```typescript
// Source: googleapis v3 type definitions — recurringEventId is set on all series instances
// with singleEvents: true (already used in existing GET route), every returned event
// is an instance, so the presence of recurringEventId is the correct signal:
recurrence_flag: !!e.recurringEventId,
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-project CalendarImportModal (projectId required) | Global modal (projectId optional, cross-project API) | Phase 79 | Enables import from GlobalTimeView without a project context |
| Attendee-only matching | Title + attendee hybrid matching | Phase 79 | Higher confidence accuracy; title is stronger signal than attendee overlap |
| Meeting Prep outputs "Open Items / Recent Activity / Suggested Agenda" | Meeting Prep outputs "Context / Desired Outcome / Agenda" | Phase 79 | Consistent structured format across /daily-prep and Skills tab |
| BullMQ for all AI generation | Direct SSE for /daily-prep generate | Phase 79 | Inline ephemeral output needs no persistence or job management |

**Deprecated/outdated:**
- `app/api/projects/${projectId}/time-entries/calendar-import`: Still valid for project-scoped usage; the global route at `/api/time-entries/calendar-import` is the new path used from GlobalTimeView and /daily-prep. Both remain; no deletion.

---

## Open Questions

1. **Attendee display names vs emails in event cards**
   - What we know: `e.attendees[]` has both `displayName` (optional) and `email` (required). The matching already uses email.
   - What's unclear: If `displayName` is absent, should we show email or abbreviate it?
   - Recommendation: Show `displayName ?? email` — same as most calendar apps. Cap display at 3 attendees with "+N more" overflow.

2. **Meeting Prep skill backward compatibility with existing SKILL.md consumers**
   - What we know: Changing skills/meeting-prep.md changes the output format globally — it will affect Skills tab runs for existing users too, not just /daily-prep.
   - What's unclear: Whether existing users have saved outputs in the old format that they rely on.
   - Recommendation: The new format (Context / Desired Outcome / Agenda) is strictly better and the CONTEXT.md explicitly requires it. Proceed with the update.

3. **Date picker and week boundary for event fetching**
   - What we know: The existing GET endpoint fetches a full week's events filtered by `week_start`. The /daily-prep page needs only a single day.
   - What's unclear: Should the /daily-prep page filter the week response client-side, or should a new `?date=` param be added server-side?
   - Recommendation: Add a `?date=YYYY-MM-DD` query param to the existing GET endpoint. Filter server-side (narrow calendar window from 7 days to 1 day). This avoids fetching 7 days of events to show 1 day on /daily-prep.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (node environment) |
| Config file | `/Users/jmiloslavsky/Documents/Panda-Manager/vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose tests/` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAL-01 | CalendarImportModal renders with no projectId and uses global API URL | unit | `npx vitest run --reporter=verbose tests/components/calendar-import-modal.test.ts` | Wave 0 |
| CAL-02 | GET /api/time-entries/calendar-import returns duration_hours, matched_project_id, attendee_names | unit | `npx vitest run --reporter=verbose tests/api/calendar-import-global.test.ts` | Wave 0 |
| CAL-03 | Title+attendee hybrid matching returns correct confidence badge per scenario | unit | `npx vitest run --reporter=verbose tests/api/calendar-import-global.test.ts` | Wave 0 |
| PREP-01 | app/daily-prep/page.tsx route file exists; Sidebar has Daily Prep link | smoke | manual | N/A |
| PREP-02 | Event cards render time, title, duration, matched project, attendees | unit | `npx vitest run --reporter=verbose tests/components/daily-prep-card.test.ts` | Wave 0 |
| PREP-03 | Unmatched event cards show project dropdown | unit | `npx vitest run --reporter=verbose tests/components/daily-prep-card.test.ts` | Wave 0 |
| PREP-04 | Multi-select fires parallel fetch calls to /api/daily-prep/generate | unit | `npx vitest run --reporter=verbose tests/components/daily-prep-page.test.ts` | Wave 0 |
| PREP-05 | Brief expands inline with prose classes and ReactMarkdown | unit | `npx vitest run --reporter=verbose tests/components/daily-prep-page.test.ts` | Wave 0 |
| PREP-06 | Copy button calls navigator.clipboard.writeText with stripped markdown | unit | `npx vitest run --reporter=verbose tests/components/daily-prep-page.test.ts` | Wave 0 |
| PREP-07 | Date picker changes selected date; events refetch | unit | `npx vitest run --reporter=verbose tests/components/daily-prep-page.test.ts` | Wave 0 |
| SKILL-01 | buildMeetingPrepContext with calendarMeta appends attendees, duration, recurrence sections | unit | `npx vitest run --reporter=verbose lib/__tests__/meeting-prep-context.test.ts` | Partial (existing tests cover base behavior; new test covers calendarMeta param) |
| SKILL-02 | meeting-prep.md output format includes Context, Desired Outcome, Agenda headers | unit | `npx vitest run --reporter=verbose lib/__tests__/meeting-prep-context.test.ts` | Wave 0 (add test) |
| NAV-01 | Sidebar renders Daily Prep link below Dashboard | unit | `npx vitest run --reporter=verbose tests/components/sidebar-daily-prep.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose lib/__tests__/meeting-prep-context.test.ts`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/components/calendar-import-modal.test.ts` — covers CAL-01 (global mode, no projectId)
- [ ] `tests/api/calendar-import-global.test.ts` — covers CAL-02, CAL-03 (extended interface + title matching)
- [ ] `tests/components/daily-prep-card.test.ts` — covers PREP-02, PREP-03
- [ ] `tests/components/daily-prep-page.test.ts` — covers PREP-04, PREP-05, PREP-06, PREP-07
- [ ] `tests/components/sidebar-daily-prep.test.ts` — covers NAV-01
- [ ] Extend `lib/__tests__/meeting-prep-context.test.ts` — add test for `calendarMeta` parameter (SKILL-01, SKILL-02)

*(Note: Existing `lib/__tests__/meeting-prep-context.test.ts` and `app/api/__tests__/meeting-prep-skill.test.ts` cover base behavior. No new framework install needed — Vitest is already configured.)*

---

## Sources

### Primary (HIGH confidence)
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/time-entries/calendar-import/route.ts` — existing global calendar import route, full implementation inspected
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/CalendarImportModal.tsx` — full component inspected, ConfidenceBadge, EventRow, fetch URLs
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/api/skills/runs/[runId]/stream/route.ts` — SSE pattern, ReadableStream, required headers
- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/meeting-prep-context.ts` — current context builder signature and filtering logic
- `/Users/jmiloslavsky/Documents/Panda-Manager/skills/meeting-prep.md` — current skill prompt and output sections
- `/Users/jmiloslavsky/Documents/Panda-Manager/lib/skill-orchestrator.ts` — routing logic confirming meeting-prep branch
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/outputs/page.tsx` — expandedId pattern, prose classes
- `/Users/jmiloslavsky/Documents/Panda-Manager/app/customer/[id]/skills/[runId]/page.tsx` — EventSource pattern, clipboard pattern
- `/Users/jmiloslavsky/Documents/Panda-Manager/components/Sidebar.tsx` — Dashboard link location, existing nav structure
- `/Users/jmiloslavsky/Documents/Panda-Manager/node_modules/googleapis/build/src/apis/calendar/v3.d.ts` — `recurringEventId` and `description` field types confirmed at lines 736, 740, 613

### Secondary (MEDIUM confidence)
- `package.json` — verified all required dependencies present at listed versions; no new packages needed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in package.json; no new installs required
- Architecture: HIGH — all patterns sourced from inspected codebase files
- Pitfalls: HIGH — pitfalls derived from actual code (commented-out CalendarImportModal, missing `force-dynamic`, module-scope DB patterns)
- Recurrence detection: HIGH — verified from googleapis v3 TypeScript type definitions in node_modules

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (stable stack; googleapis and Next.js APIs are not fast-moving)
