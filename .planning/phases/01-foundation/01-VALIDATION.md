---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node 18+ built-in) — no install required |
| **Config file** | none — `node --test` runs directly |
| **Quick run command** | `node --test server/services/yamlService.test.js` |
| **Full suite command** | `node --test server/services/yamlService.test.js` (only automated test suite in Phase 1) |
| **Estimated runtime** | ~2 seconds |

Note: vitest and supertest are NOT used in Phase 1. The yamlService tests use `node:test` (built-in). Frontend and Drive integration verification is done via the human checkpoint in Plan 05.

---

## Sampling Rate

- **After every task commit:** Run `node --test server/services/yamlService.test.js`
- **After Plan 03 wave completes:** Confirm all 14 tests pass with real assertions
- **Before `/gsd:verify-work`:** Test suite must be green; human checkpoint in Plan 05 must be approved
- **Max feedback latency:** ~2 seconds for automated suite

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-T1 | 01 | 0 | INFRA-03/04/05 | manual | `ls server/fixtures/sample.yaml` | ✅ | ⬜ pending |
| 1-01-T2 | 01 | 0 | INFRA-03/04/05 | unit | `node --test server/services/yamlService.test.js` | ✅ | ⬜ pending |
| 1-02-T1 | 02 | 1 | INFRA-08 | structural | `node -e "const pkg=require('./server/package.json'); console.log(pkg.dependencies)"` | ✅ | ⬜ pending |
| 1-02-T2 | 02 | 1 | INFRA-01/02 | structural | `node -e "const svc=require('./server/services/driveService'); console.log(Object.keys(svc))"` | ✅ | ⬜ pending |
| 1-02-T3 | 02 | 1 | INFRA-09 | structural | `node -e "const fs=require('fs'); if(!fs.existsSync('.env.example'))throw new Error(); console.log('OK')"` | ✅ | ⬜ pending |
| 1-03-T1 | 03 | 2 | INFRA-03/04/05 | unit | `node --test server/services/yamlService.test.js` | ✅ | ⬜ pending |
| 1-03-T2 | 03 | 2 | INFRA-03/04/05 | unit | `node --test server/services/yamlService.test.js 2>&1 \| grep -E "pass\|fail\|ok"` | ✅ | ⬜ pending |
| 1-03-T3 | 03 | 2 | INFRA-06 | structural | `node -e "const w=require('./server/middleware/asyncWrapper'); const h=require('./server/middleware/errorHandler'); console.log(h.length)"` | ✅ | ⬜ pending |
| 1-04-T1 | 04 | 3 | INFRA-06 | structural | `node -e "const fs=require('fs'); const c=fs.readFileSync('server/index.js','utf8'); if(!c.includes('app.listen'))throw new Error(); console.log('OK')"` | ✅ | ⬜ pending |
| 1-04-T2 | 04 | 3 | INFRA-06 | structural | `node -e "['health','customers','topLevelReports','actions','risks','milestones','artifacts','history','reports'].forEach(r=>{require('./server/routes/'+r)}); console.log('All 9 routes OK')"` | ✅ | ⬜ pending |
| 1-05-T1 | 05 | 4 | INFRA-07/10 | structural | `node -e "const fs=require('fs'); if(!fs.existsSync('client/vite.config.js'))throw new Error(); console.log('OK')"` | ✅ | ⬜ pending |
| 1-05-T2 | 05 | 4 | INFRA-07/10 | structural | `node -e "const fs=require('fs'); const files=['client/src/main.jsx','client/src/layouts/AppLayout.jsx','client/src/layouts/CustomerLayout.jsx']; files.forEach(f=>{if(!fs.existsSync(f))throw new Error('Missing: '+f)}); console.log('Client files OK')"` | ✅ | ⬜ pending |
| 1-05-T3 | 05 | 4 | INFRA-07/10 | manual | browser: open localhost:3000, verify Dashboard renders, all 7 routes render placeholders | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 (Plan 01) creates the test scaffold before any implementation. The following files are created in Plan 01:

- [x] `server/fixtures/sample.yaml` — minimal valid customer YAML with all 9 required keys, IDs A-003/R-001/X-001 seeded for assignNextId tests
- [x] `server/services/yamlService.test.js` — 14 test stubs using `node:test` (built-in), all marked `t.todo()`, exit 0 immediately

No additional installs required for Wave 0. `node:test` is built into Node 18+.

Plan 03 (Wave 2) fills in the stubs with real assertions once yamlService.js is implemented.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npm run dev` opens localhost:3000 | INFRA-10 | Requires live browser + two-process startup | Run `npm run dev`, open browser, verify no console errors |
| All 7 routes render placeholder | INFRA-10 | Requires React Router to be running in browser | Navigate to each route, verify placeholder text visible |
| Vite proxy routes /api to Express | INFRA-07 | Requires both processes running | Open browser console, fetch('/api/health/drive'), confirm JSON response (no CORS error) |
| Drive health check lists real YAMLs | INFRA-01 | Requires real Google Drive credentials | GET /api/health/drive returns 200 with file list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or are manual checkpoints with documented test steps
- [ ] Sampling continuity: test suite covers Plans 01-03 automatically; Plans 04-05 structural via node -e
- [ ] Wave 0 covers all test infrastructure: sample.yaml + yamlService.test.js stubs (Plan 01)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s for automated checks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
