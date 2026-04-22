# Project Assistant — Claude Instructions

## Working Directory

This directory (`/Users/jmiloslavsky/Documents/Project Assistant Code`) is the **GSD planning root**.
All `/gsd:*` commands must be run from here (ROADMAP.md, STATE.md, REQUIREMENTS.md, and `.planning/` live here).

The application code lives in `/Users/jmiloslavsky/Documents/Panda-Manager` (migrated 2026-04-22).

## Project Identity

When the user says "project assistant" or "this project", this is it.

## Quick Reference

| Purpose | Directory |
|---------|-----------|
| GSD planning, roadmap, phases | `/Users/jmiloslavsky/Documents/Project Assistant Code` |
| Application source code | `/Users/jmiloslavsky/Documents/Panda-Manager` |
| Dev server | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npm run next-only` |
| Full stack (needs Redis) | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npm run dev` |

## Git / GitHub Requirements

**Every GSD phase execution MUST end with a git commit and push to the remote.**

The app code repo is at `/Users/jmiloslavsky/Documents/Panda-Manager` — remote: `https://github.com/jmiloslavsky1987/Panda-Manager`

Rules:
- After completing any code changes in `Panda-Manager/`, run `git add`, `git commit`, and `git push` from within that directory
- File paths in plans reference `bigpanda-app/...` — these now map to `/Users/jmiloslavsky/Documents/Panda-Manager/...`
- Commit message must reference the phase (e.g. `feat: [Phase 74.2] add weekly focus skill`)
- If the phase touches migration files (`db/migrations/`), ensure the new `.sql` file is included in the commit
- Never leave a phase "done" without verifying `git status` is clean and `git push` succeeded
- The repo must stay in a state that a fresh `bash setup.sh` + Docker will produce a working app for other users

## Docker / Local Testing Compatibility

All code changes must remain compatible with the Docker-based local install (`install/docker-compose.local.yml`). Specifically:
- New environment variables must be added to `install/docker-compose.local.yml` (with sensible defaults or optional handling)
- New `db/migrations/*.sql` files are automatically picked up by `run-migrations.ts` — no changes needed there
- Do not use `__dirname` in `next.config.ts` — it breaks ESM compilation in Docker
- API routes that query the DB or Redis at module load time must use lazy initialization to avoid build-time failures
- Any new pages that query the DB server-side must export `export const dynamic = 'force-dynamic'`
