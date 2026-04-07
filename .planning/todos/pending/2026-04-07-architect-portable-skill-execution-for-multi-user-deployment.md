---
created: 2026-04-07T05:48:08.177Z
title: Architect portable skill execution for multi-user deployment
area: api
files:
  - bigpanda-app/lib/settings-core.ts:52
  - bigpanda-app/worker/jobs/skill-run.ts:42-50
  - bigpanda-app/app/api/skills/[skillName]/run/route.ts:29-31
  - bigpanda-app/skills/
---

## Problem

Skill execution is currently fragile and not portable:

1. **Path resolution mismatch**: The API pre-flight check (`existsSync`) uses `process.cwd()/skills/`, while the worker uses `resolveSkillsDir(settings.skill_path)`. With no `settings.json`, the default `skill_path` was `~/.claude/get-shit-done` (since fixed to `''`), causing `SKILL_NOT_FOUND` at runtime even when the pre-flight check passed.

2. **Skills live inside the repo**: `bigpanda-app/skills/*.md` are SKILL.md files bundled with the codebase. When another user clones and runs the app, the worker's `__dirname`-relative fallback (`worker/jobs/../../skills`) should resolve correctly — but this depends on the compiled output structure staying consistent, which is not guaranteed across environments or build tools (Turbopack vs webpack vs tsx).

3. **No first-run setup**: There is no setup step that writes a `~/.bigpanda-app/settings.json` with correct paths for the current machine. Users who clone the repo have no clear way to configure skill execution without manual intervention.

4. **Inconsistency between pre-flight and worker**: Two separate path resolution strategies exist (API route vs. worker). If they diverge again, skills will silently fail after appearing to start.

## Solution

Design a proper portability strategy. Options to evaluate:

- **Bundled skills approach**: Treat `bigpanda-app/skills/` as the authoritative location. Resolve the path at startup using `path.resolve(__dirname, ...)` consistently in both the API route and the worker (not `process.cwd()`). Remove the `skill_path` settings concept for bundled skills — it only makes sense for user-supplied custom skills.

- **First-run setup script / Admin page**: On first launch (no `settings.json`), auto-generate a default config pointing to the bundled skills dir. Surface a `/admin/setup` page (or CLI script) that validates all paths and writes the config.

- **Single source of truth for skills dir**: Export a `getSkillsDir()` utility from a shared module (e.g. `lib/skills-path.ts`) that both the API route and the worker import. One resolution strategy, one place to fix.

- **Consider skills as npm-style packages**: Longer term — skills could be versioned, installable, and discoverable rather than living as flat .md files in a `skills/` directory.

Key constraint: when this app is given to other PSMs, they should be able to `git clone`, `npm install`, and `npm run dev` and have skills work without any path configuration.
