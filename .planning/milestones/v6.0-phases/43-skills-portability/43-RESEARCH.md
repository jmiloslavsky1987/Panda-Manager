# Phase 43: Skills Portability - Research

**Researched:** 2026-04-07
**Domain:** Node.js path resolution, BullMQ worker jobs, Next.js API routes
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SKILL-01 | Skill runner resolves SKILL.md file paths dynamically at runtime (no hardcoded absolute paths) | `resolveSkillsDir` already exists in `skill-run.ts`; hardcoded `__dirname`-based paths exist in 3 worker jobs and `process.cwd()`-based paths in 2 API routes and `skill-orchestrator.ts`'s fallback — all need migration to the `resolveSkillsDir` pattern |
</phase_requirements>

---

## Summary

The codebase has a mixed state regarding SKILL.md path resolution. A correct, portable `resolveSkillsDir()` helper was built in Phase 05 (`worker/jobs/skill-run.ts`) and is already imported and used by the three newest worker jobs (`morning-briefing.ts`, `weekly-customer-status.ts`, `context-updater.ts`). However, three other worker jobs (`meeting-summary.ts`, `handoff-doc-generator.ts`, `customer-project-tracker.ts`) were NOT migrated and still use `path.join(__dirname, '../../skills')` — a hardcoded absolute path that breaks in production deployments where the compiled output directory differs from the source tree.

Two Next.js API routes (`sprint-summary/route.ts`, `generate-plan/route.ts`) and the `skill-orchestrator.ts` fallback use `path.join(process.cwd(), 'skills')` — which works in development (cwd = project root) but is fragile in containerized or edge deployments. The pre-flight check in `app/api/skills/[skillName]/run/route.ts` also uses `process.cwd()` directly.

The fix is a two-track migration: (1) worker jobs adopt `resolveSkillsDir` from `settings-core`, (2) Next.js API routes adopt a shared `resolveSkillsDirSync` (or the same async helper) based on `process.cwd()` with settings override — matching the existing pattern exactly. No schema changes, no new libraries, no UI changes required.

**Primary recommendation:** Migrate the 3 remaining worker jobs to `resolveSkillsDir`, and update the 2 API routes (plus preflight check) to use a consistent settings-backed helper. Tests for the newly migrated paths confirm portability.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `path` module | built-in | Cross-platform path construction | Already used everywhere in the codebase |
| Node.js `os` module | built-in | `os.homedir()` for relative path expansion | Used by `resolveSkillsDir` and `settings-core` |
| `settings-core.ts` / `readSettings()` | project-local | Runtime read of `skill_path` from `~/.bigpanda-app/settings.json` | Established pattern; already imported by migrated jobs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.2 | Unit testing the pure `resolveSkillsDir` helper | All path-resolution tests |
| `existsSync` / `fs.promises` | built-in | Pre-flight SKILL.md existence check | API routes before enqueueing BullMQ job |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `resolveSkillsDir` re-use | New env var `SKILLS_DIR` | Env vars require deployment config changes; settings.json pattern is already deployed and tested |
| `process.cwd()` fallback | `__dirname`-relative | `__dirname` is compilation-path-dependent; `process.cwd()` is reliably the app root in Next.js context |

**Installation:** No new dependencies needed.

---

## Architecture Patterns

### Current State — Path Resolution Inconsistency

```
Worker jobs:
  skill-run.ts           → resolveSkillsDir(settings.skill_path)  ✅ CORRECT
  morning-briefing.ts    → resolveSkillsDir(settings.skill_path)  ✅ CORRECT
  weekly-customer-status.ts → resolveSkillsDir(settings.skill_path) ✅ CORRECT
  context-updater.ts     → resolveSkillsDir(settings.skill_path)  ✅ CORRECT
  meeting-summary.ts     → path.join(__dirname, '../../skills')   ❌ HARDCODED
  handoff-doc-generator.ts → path.join(__dirname, '../../skills') ❌ HARDCODED
  customer-project-tracker.ts → path.join(__dirname, '../../skills') ❌ HARDCODED

Next.js API routes:
  sprint-summary/route.ts  → path.join(process.cwd(), 'skills')  ⚠️ FRAGILE
  generate-plan/route.ts   → path.join(process.cwd(), 'skills')  ⚠️ FRAGILE
  skills/[skillName]/run/route.ts → path.join(process.cwd(), 'skills') ⚠️ FRAGILE (preflight)

lib/skill-orchestrator.ts:
  fallback in run()        → path.join(process.cwd(), 'skills')  ⚠️ FRAGILE (fallback when skillsDir not passed)
```

### Recommended Project Structure (no changes)
```
bigpanda-app/
├── worker/jobs/
│   ├── skill-run.ts              # resolveSkillsDir lives here (exported)
│   ├── meeting-summary.ts        # MIGRATE: remove __dirname path, call resolveSkillsDir
│   ├── handoff-doc-generator.ts  # MIGRATE: same
│   └── customer-project-tracker.ts # MIGRATE: same
├── app/api/projects/[projectId]/
│   ├── sprint-summary/route.ts   # MIGRATE: use resolveSkillsDirFromSettings
│   └── generate-plan/route.ts    # MIGRATE: same
├── app/api/skills/[skillName]/run/route.ts  # MIGRATE preflight check
├── lib/
│   ├── skill-orchestrator.ts     # fallback already uses process.cwd(); acceptable but can align
│   └── settings-core.ts          # readSettings() — source of truth
└── skills/                       # SKILL.md files live here
```

### Pattern 1: Worker Job Path Resolution (established)
**What:** Worker jobs call `resolveSkillsDir` at job-execution time (not module load time), reading settings fresh from disk.
**When to use:** All BullMQ worker jobs that invoke `SkillOrchestrator`

```typescript
// Source: bigpanda-app/worker/jobs/morning-briefing.ts (verified)
import { readSettings } from '../../lib/settings-core';
import { resolveSkillsDir } from './skill-run';

export default async function someSkillJob(job: Job) {
  const settings = await readSettings();
  const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');

  await orchestrator.run({
    skillName: 'some-skill',
    projectId,
    runId: runRow.id,
    skillsDir: SKILLS_DIR,
  });
}
```

### Pattern 2: API Route Path Resolution (to standardize)
**What:** Next.js API routes that call `SkillOrchestrator` inline use `process.cwd()`. These run in the Next.js server process where `cwd` is reliably the project root. The fragility is real in Vercel Edge or Docker contexts.
**When to use:** API routes that invoke the orchestrator directly (not via BullMQ)

```typescript
// Target pattern for API routes (based on settings-core.ts)
import { readSettings } from '@/lib/settings';
import { resolveSkillsDir } from '@/worker/jobs/skill-run';

// Inside the handler (async, not module-level constant):
const settings = await readSettings();
const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');
```

Note: The current module-level `const SKILLS_DIR = path.join(process.cwd(), 'skills')` is evaluated at import time. Moving to inline `await readSettings()` per-request is the correct approach (settings can change without restarting the server).

### Anti-Patterns to Avoid
- **`path.join(__dirname, '../../skills')`**: `__dirname` points to the compiled JS output directory, not the source tree. This breaks entirely in production builds where the output structure differs.
- **Module-level `const SKILLS_DIR`**: Evaluated once at server start. Does not pick up `skill_path` changes from settings without restart. Move inside request/job handler.
- **`path.join(process.cwd(), 'skills')` in worker jobs**: `process.cwd()` in a BullMQ worker launched as a separate Node.js process may not be the app root.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic path resolution logic | New utility function | `resolveSkillsDir` (already in `skill-run.ts`) | Already tested with 2 unit tests; handles absolute, relative, and empty cases |
| Settings reading | Custom file reader | `readSettings()` from `settings-core.ts` | Handles ENOENT gracefully, merges defaults, normalizes home-relative paths |
| Cross-platform home directory | `process.env.HOME` | `os.homedir()` | Works on Windows, macOS, Linux; already used in `settings-core.ts` |

**Key insight:** The full path resolution logic already exists and is tested. This phase is a mechanical migration — no new logic needed.

---

## Common Pitfalls

### Pitfall 1: Module-Level SKILLS_DIR Constants
**What goes wrong:** `const SKILLS_DIR = path.join(process.cwd(), 'skills')` is evaluated once when the module is first imported. Subsequent changes to `settings.json` are not reflected until process restart.
**Why it happens:** Convenience shortcut from early phases before settings infrastructure existed.
**How to avoid:** Move SKILLS_DIR resolution inside the async handler function, after `await readSettings()`.
**Warning signs:** `SKILLS_DIR` declared as a module-level `const` rather than computed inside the handler.

### Pitfall 2: __dirname in Compiled TypeScript
**What goes wrong:** In development, `__dirname` resolves to `bigpanda-app/worker/jobs/`. In a compiled/bundled production build, this path changes to the output directory (e.g., `.next/server/` or `dist/`). The `../../skills` traversal no longer points to `bigpanda-app/skills/`.
**Why it happens:** `__dirname` is a Node.js CJS module concept that refers to the directory of the compiled file.
**How to avoid:** Never use `__dirname` for locating the application's `skills/` directory. Use `resolveSkillsDir`.
**Warning signs:** `path.join(__dirname, ...)` in any worker job that needs to find `skills/`.

### Pitfall 3: Circular Import Risk
**What goes wrong:** API routes in `app/` importing `resolveSkillsDir` from `worker/jobs/skill-run.ts` creates a dependency from `app/` → `worker/`. While this works at runtime, it couples two layers that should be independent.
**Why it happens:** `resolveSkillsDir` is currently exported from `skill-run.ts` for testability.
**How to avoid:** If API routes need the same helper, either: (a) import it directly from `worker/jobs/skill-run` (acceptable since it is a pure function with no side effects), or (b) extract `resolveSkillsDir` to `lib/` where both layers can import from. Option (b) is cleaner architecturally.
**Warning signs:** Circular dependency warnings in the TypeScript compiler or build output.

### Pitfall 4: Test Impact from Module-Level Constants
**What goes wrong:** Existing tests for `skill-run.ts` mock `readSettings` at the module level. Newly migrated files that also call `readSettings` inside their handlers will need the same mock pattern.
**Why it happens:** Vitest module mocking replaces the entire module; tests that don't set up the mock will see `ENOENT` from a missing `settings.json`.
**How to avoid:** Follow the mock pattern in `morning-briefing.ts`-equivalent tests: `vi.mock('../../lib/settings-core', () => ({ readSettings: vi.fn().mockResolvedValue({ skill_path: '' }) }))`.
**Warning signs:** Tests failing with ENOENT errors on `~/.bigpanda-app/settings.json`.

---

## Code Examples

Verified patterns from official sources:

### Existing resolveSkillsDir Implementation
```typescript
// Source: bigpanda-app/worker/jobs/skill-run.ts (verified directly)
import path from 'path';
import os from 'os';

export function resolveSkillsDir(skillPath: string, dirnameRef: string = __dirname): string {
  const trimmed = skillPath.trim();
  if (!trimmed) {
    return path.join(dirnameRef, '../../skills');
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return path.join(os.homedir(), trimmed);
}
```

### Migrated Worker Job Pattern
```typescript
// Target pattern for meeting-summary.ts, handoff-doc-generator.ts, customer-project-tracker.ts
import type { Job } from 'bullmq';
import path from 'path';
import { readSettings } from '../../lib/settings-core';
import { resolveSkillsDir } from './skill-run';

// REMOVE: const SKILLS_DIR = path.join(__dirname, '../../skills');

const orchestrator = new SkillOrchestrator();

export default async function meetingSummaryJob(job: Job) {
  // Resolve at invocation time — picks up settings changes without restart
  const settings = await readSettings();
  const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');

  // ... rest of handler unchanged, SKILLS_DIR already passed as skillsDir
}
```

### Migrated API Route Pattern
```typescript
// Target pattern for sprint-summary/route.ts and generate-plan/route.ts
import { readSettings } from '@/lib/settings';
import { resolveSkillsDir } from '@/worker/jobs/skill-run';

// REMOVE module-level: const SKILLS_DIR = path.join(process.cwd(), 'skills');

export async function POST(request, { params }) {
  // ...
  const settings = await readSettings();
  const SKILLS_DIR = resolveSkillsDir(settings.skill_path ?? '');

  const orchestrator = new SkillOrchestrator();
  await orchestrator.run({ skillName, projectId, runId: run.id, skillsDir: SKILLS_DIR });
}
```

### Pre-flight Check Migration (skills/[skillName]/run/route.ts)
```typescript
// Source: bigpanda-app/app/api/skills/[skillName]/run/route.ts (verified directly)
// Current (fragile):
const skillPath = path.join(process.cwd(), 'skills', skillName + '.md');

// Target (portable):
import { readSettings } from '../../../../lib/settings';
import { resolveSkillsDir } from '../../../../worker/jobs/skill-run';

// Inside handler:
const settings = await readSettings();
const skillsDir = resolveSkillsDir(settings.skill_path ?? '');
const skillPath = path.join(skillsDir, skillName + '.md');
```

### Existing Test Pattern to Follow
```typescript
// Source: bigpanda-app/tests/skill-run-settings.test.ts (verified directly)
import { resolveSkillsDir } from '../worker/jobs/skill-run';

describe('resolveSkillsDir', () => {
  it('uses skill_path when absolute', () => {
    expect(resolveSkillsDir('/custom/skills')).toBe('/custom/skills');
  });

  it('falls back to __dirname-relative path when empty', () => {
    const fakeDir = '/fake/worker/jobs';
    const result = resolveSkillsDir('', fakeDir);
    expect(result).toBe(path.join(fakeDir, '../../skills'));
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `path.join(__dirname, '../../skills')` in worker jobs | `resolveSkillsDir(settings.skill_path)` | Phase 05 (partial) | Broken in production builds; 3 jobs not yet migrated |
| `path.join(process.cwd(), 'skills')` module-level const | Inline `await readSettings()` per-invocation | This phase | Picks up settings changes live; works in all deployment contexts |

**Deprecated/outdated:**
- Module-level `const SKILLS_DIR` constants in any file that runs in a BullMQ worker context: replaced by inline `readSettings()` call inside the handler.
- `path.join(__dirname, ...)` for skills directory location: replaced by `resolveSkillsDir`.

---

## Open Questions

1. **Should `resolveSkillsDir` be moved from `worker/jobs/skill-run.ts` to `lib/`?**
   - What we know: It is a pure helper. API routes importing from `worker/jobs/` is an architectural cross-boundary dependency.
   - What's unclear: Whether TypeScript path resolution or Next.js bundler would flag `app/` → `worker/` as a problem.
   - Recommendation: For safety, consider extracting `resolveSkillsDir` to `lib/skill-path.ts` and re-exporting from `worker/jobs/skill-run.ts` for backward compatibility with existing imports and tests.

2. **Does `skill-orchestrator.ts`'s fallback `process.cwd()` need updating?**
   - What we know: The fallback (`params.skillsDir ?? path.join(process.cwd(), 'skills')`) is only hit when callers don't pass `skillsDir`. After this phase, all callers will pass `skillsDir`.
   - Recommendation: Update the fallback to be consistent, but it is low-risk since it will be unreachable after migration.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `bigpanda-app/vitest.config.ts` |
| Quick run command | `npx vitest run tests/skill-run-settings.test.ts` |
| Full suite command | `npx vitest run` (from `bigpanda-app/`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-01 | `resolveSkillsDir` returns correct path for empty, absolute, and relative inputs | unit | `npx vitest run tests/skill-run-settings.test.ts` | ✅ |
| SKILL-01 | Migrated worker jobs resolve skills dir via settings at job invocation time | unit | `npx vitest run worker/jobs/__tests__/` | ❌ Wave 0 |
| SKILL-01 | API routes (sprint-summary, generate-plan) resolve skills dir via settings | unit | `npx vitest run tests/api/` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/skill-run-settings.test.ts`
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `bigpanda-app/worker/jobs/__tests__/skill-path-migration.test.ts` — unit tests confirming migrated jobs call `readSettings()` + `resolveSkillsDir` (not `__dirname`) — covers SKILL-01
- [ ] No new fixtures needed; existing `vi.mock` patterns from `skill-run-file.test.ts` are sufficient templates

*(Existing `tests/skill-run-settings.test.ts` already covers the `resolveSkillsDir` pure function.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `bigpanda-app/worker/jobs/skill-run.ts` — `resolveSkillsDir` implementation and export
- Direct code inspection: `bigpanda-app/worker/jobs/morning-briefing.ts` — migrated pattern (uses `resolveSkillsDir`)
- Direct code inspection: `bigpanda-app/worker/jobs/meeting-summary.ts` — un-migrated pattern (`__dirname`)
- Direct code inspection: `bigpanda-app/worker/jobs/handoff-doc-generator.ts` — un-migrated pattern (`__dirname`)
- Direct code inspection: `bigpanda-app/worker/jobs/customer-project-tracker.ts` — un-migrated pattern (`__dirname`)
- Direct code inspection: `bigpanda-app/app/api/projects/[projectId]/sprint-summary/route.ts` — `process.cwd()` pattern
- Direct code inspection: `bigpanda-app/app/api/projects/[projectId]/generate-plan/route.ts` — `process.cwd()` pattern
- Direct code inspection: `bigpanda-app/app/api/skills/[skillName]/run/route.ts` — preflight `process.cwd()` pattern
- Direct code inspection: `bigpanda-app/lib/skill-orchestrator.ts` — `process.cwd()` fallback
- Direct code inspection: `bigpanda-app/lib/settings-core.ts` — `readSettings()` and `AppSettings.skill_path`
- Direct code inspection: `bigpanda-app/tests/skill-run-settings.test.ts` — existing passing tests

### Secondary (MEDIUM confidence)
- Node.js documentation: `path.join(__dirname, ...)` behavior differs between `.ts` source and compiled `.js` output in TypeScript projects with non-trivial output configurations.

### Tertiary (LOW confidence)
- None — all findings are from direct code inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture: HIGH — current state fully mapped via direct code inspection; migration targets are unambiguous
- Pitfalls: HIGH — `__dirname` vs `process.cwd()` behavior in compiled TypeScript is well-understood

**Research date:** 2026-04-07
**Valid until:** 2026-06-07 (stable domain — Node.js path APIs, internal codebase)
