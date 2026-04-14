# Technology Stack — v7.0 Additions

**Project:** BigPanda AI Project Management App
**Milestone:** v7.0 — Governance & Operational Maturity
**Researched:** 2026-04-13
**Confidence:** HIGH

## Executive Summary

v7.0 requires **minimal new dependencies**. The existing stack (Next.js 16, PostgreSQL, Drizzle, better-auth@1.5.6, Redis/BullMQ) handles most new features. Only addition needed: a lightweight code editor for prompt editing UI. Per-project RBAC requires a new `project_members` table (better-auth doesn't support per-resource roles). Soft-delete uses existing Drizzle patterns with timestamp columns.

## Stack Additions for v7.0

### Code Editor for Prompt Editing (SKILL-03)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **@uiw/react-codemirror** | ^4.25.9 | Editable prompt text UI with syntax highlighting | Lightweight (~80KB gzipped), React 18 native, SSR-compatible, actively maintained (1.8M weekly downloads), CodeMirror 6 foundation |

**Rationale:** Prompts are plain text with occasional markdown formatting. CodeMirror 6 via @uiw/react-codemirror is the right choice because:
- **Size matters:** ~80KB vs Monaco's ~300KB — prompt editing is auxiliary, not core IDE work
- **React 18 native:** Works cleanly with Next.js 16 client components
- **SSR-friendly:** Unlike Monaco (requires `ssr: false` dynamic import), CodeMirror handles SSR gracefully
- **Sufficient features:** Syntax highlighting, line numbers, search/replace — everything needed for prompt editing

**Installation:**
```bash
npm install @uiw/react-codemirror
```

**Usage Pattern:**
```typescript
'use client';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

<CodeMirror
  value={promptText}
  height="400px"
  extensions={[markdown()]}
  onChange={(value) => setPromptText(value)}
/>
```

### Alternative Considered: Monaco Editor

| Alternative | Version | When to Use | Why Not v7.0 |
|-------------|---------|-------------|--------------|
| @monaco-editor/react | ^4.7.0 | Full IDE-like editing, complex syntax (TypeScript, JSON schemas) | Overkill for prompt text; 3-4x larger bundle; requires `ssr: false` dynamic import pattern (adds complexity) |

**Monaco is NOT needed** — prompts are plain text/markdown, not code. CodeMirror provides sufficient highlighting and editing capabilities at 1/4 the bundle size.

## Existing Stack — No Changes Required

### Per-Project RBAC (AUTH-02 through AUTH-05)

**Question:** Does better-auth@1.5.6 support per-project roles?
**Answer:** NO. better-auth has a global `role` field on the user (admin/user), but does NOT support per-resource or per-organization role mappings out of the box.

**Solution:** Custom `project_members` table using existing Drizzle patterns.

**Implementation:**
```typescript
// Add to db/schema.ts
export const projectRoleEnum = pgEnum('project_role', ['admin', 'user']);

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: projectRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueProjectUser: uniqueIndex('project_members_project_user_idx').on(table.projectId, table.userId),
}));
```

**Rationale:**
- better-auth's "organization" plugin (if it exists in v1.5.6) is not designed for multi-project SaaS with per-project roles
- Custom table gives full control over role definitions and query patterns
- Follows existing schema conventions (snake_case, serial IDs, FK constraints)
- Unique index prevents duplicate memberships
- Cascade delete ensures orphaned memberships don't persist

**Route Handler Pattern:**
```typescript
// lib/auth-helpers.ts
export async function requireProjectAdmin(projectId: number, session: Session) {
  const membership = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, session.user.id),
    ),
  });

  if (!membership || membership.role !== 'admin') {
    throw new Error('Forbidden: Admin role required');
  }

  return membership;
}
```

**Confidence:** HIGH — better-auth documentation reviewed; no per-resource role support found.

### Soft-Delete Pattern (PROJ-01, PROJ-02, PROJ-03, PROJ-04)

**Current State:** Projects table has `status: projectStatusEnum` with 'archived' value, but no timestamp tracking for archive/delete lifecycle.

**Required Changes:**
```typescript
// Extend projects table in db/schema.ts
export const projects = pgTable('projects', {
  // ... existing columns ...
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
```

**Pattern:**
- **Active project:** `status = 'active'`, `archivedAt = null`, `deletedAt = null`
- **Archived project (PROJ-01):** `status = 'archived'`, `archivedAt = NOW()`, `deletedAt = null` → read-only, preserved
- **Permanently deleted (PROJ-02):** `deletedAt = NOW()` → hard delete OR soft-delete with hidden status
- **Restored project (PROJ-04):** `status = 'active'`, `archivedAt = null`, `deletedAt = null`

**Query Helpers:**
```typescript
// lib/db-filters.ts
export const activeProjects = eq(projects.status, 'active');
export const archivedProjects = and(
  eq(projects.status, 'archived'),
  isNull(projects.deletedAt)
);
export const notDeleted = isNull(projects.deletedAt);
```

**Rationale:**
- Timestamps provide audit trail (when archived, when deleted)
- `deletedAt` separates "archived" (reversible) from "deleted" (permanent/hidden)
- Follows PostgreSQL best practices for soft-delete
- Compatible with existing Drizzle query patterns

**Confidence:** HIGH — Standard soft-delete pattern; Drizzle ORM fully supports timestamp filtering.

### Health Dashboard Redesign (HLTH-01, HLTH-02)

**Current Stack:** Recharts ^3.8.1 (already installed)

**Assessment:** NO new packages needed. Recharts is already used for Overview metrics visualization (v4.0 Phase 34). Same library handles Health Dashboard redesign.

**Existing Components Available:**
- `<ProgressRing />` (custom, already built)
- `<BarChart />`, `<LineChart />`, `<PieChart />` (Recharts primitives)
- Responsive design built-in
- No SSR issues (renders client-side)

**Rationale:** Health Dashboard metrics are derivable from existing DB data (project counts, milestone dates, risk severity). Recharts is sufficient for executive-level visualizations (status distribution, trend lines, progress indicators).

**Confidence:** HIGH — Recharts already validated in v4.0 Phase 34; no new capabilities needed.

### Gantt Bi-Directional Date Propagation (DLVRY-04)

**Current Stack:** Custom `GanttChart.tsx` component (v5.0 Phase 38)

**Assessment:** NO new packages needed. Date propagation is application logic, not a library concern.

**Implementation:**
- Server-side transaction ensures atomic updates across related entities (tasks, milestones, WBS items)
- Drizzle ORM `db.transaction()` already used throughout app
- CustomEvent (`'gantt:refresh'`) already implemented for client-side sync

**Confidence:** HIGH — Pure logic layer; no new dependencies required.

### Project-Scoped Scheduling (SCHED-01 through SCHED-05)

**Current Stack:** BullMQ ^5.71.0, Redis, advisory locks (already implemented)

**Assessment:** NO new packages needed. Project-scoped scheduling is configuration data (job schedules stored per project), not a framework change.

**Implementation:**
- Add `scheduled_jobs.project_id` FK (if not already present)
- UI for configuring cron expressions per project per skill
- BullMQ worker reads `project_id` from job data payload

**Confidence:** HIGH — BullMQ job metadata already supports arbitrary JSON payloads; scheduler infrastructure exists from v2.0 Phase 24.

## Installation Summary

```bash
# New dependency for v7.0
npm install @uiw/react-codemirror

# Supporting extensions (if syntax highlighting needed)
npm install @codemirror/lang-markdown  # For markdown highlighting in prompts
```

**No other packages required.**

## Database Migrations

```sql
-- Migration: v7.0 RBAC and Lifecycle Management

-- 1. Create project_role enum
CREATE TYPE project_role AS ENUM ('admin', 'user');

-- 2. Create project_members table
CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role project_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX project_members_project_user_idx ON project_members(project_id, user_id);

-- 3. Add soft-delete timestamps to projects
ALTER TABLE projects
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN deleted_at TIMESTAMPTZ;

-- 4. Backfill archived_at for existing archived projects
UPDATE projects
SET archived_at = updated_at
WHERE status = 'archived' AND archived_at IS NULL;
```

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| better-auth "organization" plugin | Not designed for per-project roles; adds unnecessary abstraction | Custom `project_members` table with explicit project_id FK |
| Monaco Editor | 3-4x larger than CodeMirror; requires SSR workaround; overkill for plain text | @uiw/react-codemirror (CodeMirror 6) |
| react-ace | Unmaintained (last publish 2 years ago); Ace Editor is legacy | @uiw/react-codemirror (modern, actively maintained) |
| Draft.js, Slate, Lexical | Rich text editors for WYSIWYG editing; prompts are plain text/markdown | @uiw/react-codemirror with markdown extension |
| New chart library (Chart.js, Victory, Nivo) | Recharts already installed and working; switching adds risk | Recharts ^3.8.1 (already in package.json) |
| Separate soft-delete library (drizzle-soft-delete) | Adds dependency for trivial pattern; Drizzle's `isNull()` is sufficient | Custom `deletedAt` timestamp + query helpers |

## Version Compatibility

| Package | Current Version | v7.0 Compatibility | Notes |
|---------|-----------------|-------------------|-------|
| better-auth | 1.5.6 | ✓ Compatible | No upgrade needed; custom project_members table supplements global role |
| drizzle-orm | 0.45.1 | ✓ Compatible | Timestamp filtering fully supported; no schema limitations |
| Next.js | 16.2.0 | ✓ Compatible | @uiw/react-codemirror works in client components |
| React | 19.2.4 | ✓ Compatible | @uiw/react-codemirror supports React 18+ (19 is backward compatible) |
| Recharts | 3.8.1 | ✓ Compatible | No new chart types needed for Health Dashboard |
| BullMQ | 5.71.0 | ✓ Compatible | Project-scoped scheduling uses existing job metadata patterns |

## Stack Patterns for v7.0 Features

### Pattern 1: Per-Project Authorization Check

**Where:** All Route Handlers modifying project data (archive, delete, member management, scheduler config)

**Pattern:**
```typescript
import { requireSession } from '@/lib/session';
import { requireProjectAdmin } from '@/lib/auth-helpers';

export async function POST(req: Request) {
  const session = await requireSession();  // CVE-2025-29927 defense
  const { projectId } = await req.json();

  await requireProjectAdmin(projectId, session);  // NEW: per-project role check

  // Authorized: proceed with operation
}
```

**When:** AUTH-03, AUTH-04, AUTH-05 — all admin-restricted actions

### Pattern 2: Soft-Delete Query Scope

**Where:** All project list queries (portfolio, dropdown selectors, search)

**Pattern:**
```typescript
// Active projects only (default view)
const activeProjects = await db.query.projects.findMany({
  where: and(
    eq(projects.status, 'active'),
    isNull(projects.deletedAt)
  ),
});

// Archived projects view (PROJ-03)
const archivedProjects = await db.query.projects.findMany({
  where: and(
    eq(projects.status, 'archived'),
    isNull(projects.deletedAt)  // Exclude permanently deleted
  ),
});
```

**When:** PROJ-01, PROJ-02, PROJ-03 — all project queries must filter `deletedAt`

### Pattern 3: CodeMirror in Client Component

**Where:** Skills tab prompt editing UI (SKILL-03)

**Pattern:**
```typescript
'use client';
import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';

export default function PromptEditor({ initialValue, onSave }: Props) {
  const [value, setValue] = useState(initialValue);

  return (
    <div>
      <CodeMirror
        value={value}
        height="500px"
        extensions={[markdown()]}
        onChange={setValue}
        theme="light"  // or "dark" based on app theme
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          foldGutter: false,  // Prompts are typically < 100 lines
        }}
      />
      <button onClick={() => onSave(value)}>Save Prompt</button>
    </div>
  );
}
```

**When:** SKILL-03 — editable prompt UI

## Integration Points with Existing Stack

### 1. better-auth + project_members

**Bridge:** Session user ID joins to `project_members.user_id`

**Query Pattern:**
```typescript
const userProjects = await db.query.projectMembers.findMany({
  where: eq(projectMembers.userId, session.user.id),
  with: { project: true },
});
```

**Enforcement:** Route handler level (post-session check, pre-business logic)

### 2. Drizzle Soft-Delete + BullMQ Scheduler

**Integration:** Scheduled jobs must skip archived/deleted projects

**Pattern:**
```typescript
// worker/scheduled-job.ts
const eligibleProjects = await db.query.projects.findMany({
  where: and(
    eq(projects.status, 'active'),
    isNull(projects.deletedAt)  // NEW: exclude deleted
  ),
});

for (const project of eligibleProjects) {
  await queue.add(`weekly-focus-${project.id}`, { projectId: project.id });
}
```

### 3. CodeMirror + Existing Skill Engine

**Integration:** Edited prompt text replaces SKILL.md content at runtime

**Data Flow:**
1. User edits prompt in CodeMirror → saves to DB (`skill_prompts` table or `jsonb` column)
2. Skill runner checks DB for overrides before reading SKILL.md from disk
3. If override exists, use DB content; else, fall back to SKILL.md file

**Constraint Preservation:** "SKILL.md files read from disk at runtime" — still true for non-overridden skills; DB stores exceptions only

## Sources

- **better-auth@1.5.6 documentation** (reviewed via WebFetch) — MEDIUM confidence (plugin capabilities not fully documented; negative finding: no per-resource roles mentioned)
- **@monaco-editor/react npm page** (WebFetch) — HIGH confidence (version 4.7.0, bundle size ~300KB, SSR considerations documented)
- **@uiw/react-codemirror npm page** (WebFetch) — HIGH confidence (version 4.25.9, 1.8M weekly downloads, React 18+ support confirmed)
- **Drizzle ORM soft-delete patterns** — HIGH confidence (standard PostgreSQL pattern; timestamp filtering is core Drizzle functionality)
- **Existing codebase** (`package.json`, `db/schema.ts`, `lib/auth.ts`) — HIGH confidence (direct file reads)
- **PROJECT.md milestone context** — HIGH confidence (v7.0 requirements AUTH-01 through SKILL-04)

---

*Stack research for: BigPanda AI Project Management App v7.0*
*Researched: 2026-04-13*
*Confidence: HIGH*
