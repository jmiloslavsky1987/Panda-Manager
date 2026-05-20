---
phase: 87
slug: incident-prevention-track-support
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-19
---

# Phase 87 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `/Users/jmiloslavsky/Documents/Panda-Manager/vitest.config.ts` |
| **Quick run command** | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run tests/ui/ tests/api/project-settings.test.ts tests/arch/ tests/extraction/ip-track-cues.test.ts` |
| **Full suite command** | `cd /Users/jmiloslavsky/Documents/Panda-Manager && npx vitest run` |
| **Estimated runtime** | ~60 seconds (quick) / ~3-5 minutes (full) |

---

## Sampling Rate

- **After every task commit:** Run quick command (scoped vitest run on affected paths)
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds (quick) / ~300 seconds (full)

---

## Per-Task Verification Map

> Phase 87 has no roadmap-defined requirement IDs. Phase-local IDs `IP-01` … `IP-16` are introduced here and must be cited by every plan's `requirements` frontmatter field. Planner will assign each ID to specific task IDs across the plans.

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| IP-01 | Migration 0052 applies cleanly — adds `incident_prevention: false` to existing projects | Integration (migration round-trip) | `psql $DATABASE_URL -f db/migrations/0052_incident_prevention_track.sql` | ⚠️ Manual / Docker smoke | ⬜ pending |
| IP-02 | Migration 0052 is idempotent — re-running does not duplicate arch_tracks rows | Integration | Migration re-run + `SELECT count(*) FROM arch_tracks WHERE name='Incident Prevention Track'` | ⚠️ Manual | ⬜ pending |
| IP-03 | Existing ADR/Biggy projects retain `adr`/`biggy` values post-migration | Unit (schema validation) | `npx vitest run tests/schema/active-tracks-type.test.ts` | ❌ W0 | ⬜ pending |
| IP-04 | `INCIDENT_PREVENTION_ONBOARDING_CONFIG` exports correct 4-phase, 13-step shape | Unit | `npx vitest run tests/ui/onboarding-config.test.ts` | ❌ W0 | ⬜ pending |
| IP-05 | `ALL_STANDARD_STEP_NAMES` includes all 13 IP step names | Unit | `npx vitest run tests/ui/onboarding-config.test.ts` | ❌ W0 | ⬜ pending |
| IP-06 | New project POST with `active_tracks.incident_prevention:true` seeds IP WBS L1 items only when active | Unit (route mock) | `npx vitest run tests/api/projects.test.ts` | ❌ W0 | ⬜ pending |
| IP-07 | Wizard submit disabled when all three track checkboxes unchecked | Unit (component / source-scan) | `npx vitest run tests/api/projects.test.ts` | ❌ W0 | ⬜ pending |
| IP-08 | Settings PATCH `incident_prevention: false → true` triggers retroactive seeding | Unit (route mock) | `npx vitest run tests/api/project-settings.test.ts` | ❌ W0 | ⬜ pending |
| IP-09 | Retroactive seeding idempotent — double-toggle does not duplicate rows | Unit | `npx vitest run tests/api/project-settings.test.ts` | ❌ W0 | ⬜ pending |
| IP-10 | `seedProjectFromRegistry` inserts Team Gamma when `active_tracks.incident_prevention === true` | Unit | `npx vitest run tests/ui/seed-project.test.ts` | ✅ extend existing | ⬜ pending |
| IP-11 | `seedProjectFromRegistry` does NOT insert Team Gamma when `active_tracks.incident_prevention === false` | Unit | `npx vitest run tests/ui/seed-project.test.ts` | ✅ extend existing | ⬜ pending |
| IP-12 | `InteractiveArchGraph` renders section-grouped layout for "Incident Prevention Track" | Unit (source-scan) | `npx vitest run tests/arch/interactive-arch-graph.test.ts` | ❌ W0 | ⬜ pending |
| IP-13 | `db/schema.ts` type includes `incident_prevention: boolean` in active_tracks type signature | Source-scan | `npx vitest run tests/schema/active-tracks-type.test.ts` | ❌ W0 | ⬜ pending |
| IP-14 | Extraction Pass 2 prompt includes "Incident Prevention Track" as valid arch_node track name | Source-scan | `npx vitest run tests/extraction/ip-track-cues.test.ts` | ❌ W0 | ⬜ pending |
| IP-15 | Visual: Incident Prevention track column renders in Architecture diagram | Manual (browser) | N/A | ⚠️ Manual | ⬜ pending |
| IP-16 | Visual: OnboardingDashboard renders three columns with IP column for IP-active project | Manual (browser) | N/A | ⚠️ Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky / manual*

---

## Wave 0 Requirements

- [ ] `tests/ui/onboarding-config.test.ts` — stubs for IP-04, IP-05
- [ ] `tests/api/projects.test.ts` — stubs for IP-06, IP-07 (extend if exists; create otherwise)
- [ ] `tests/api/project-settings.test.ts` — stubs for IP-08, IP-09
- [ ] `tests/arch/interactive-arch-graph.test.ts` — stubs for IP-12 (source-scan condition)
- [ ] `tests/schema/active-tracks-type.test.ts` — stubs for IP-03, IP-13 (source-scan db/schema.ts)
- [ ] `tests/extraction/ip-track-cues.test.ts` — stubs for IP-14
- [ ] Extend `tests/ui/seed-project.test.ts` — cases for IP-10, IP-11

*Existing `tests/ui/seed-project.test.ts` is reused; remaining test files are new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Incident Prevention column visible in Architecture diagram (3-track render) | IP-15 | Visual rendering of InteractiveArchGraph requires human pixel-level confirmation of section grouping + Change Risk Console placement | Open a project with `active_tracks.incident_prevention=true`, navigate to Architecture view, confirm Incident Prevention Track renders as third column with Data Ingestion / Risk Engine / Decision & Write-Back sections + centerpiece Change Risk Console |
| OnboardingDashboard 3-column layout for IP-active project | IP-16 | Layout regression for the ADR/Biggy two-column case must be eyeballed | Open OnboardingDashboard for a project with all three tracks active; confirm 3 columns in ADR → Biggy → Incident Prevention order; confirm 2-column rendering still works for IP-off projects |
| Migration 0052 on Docker (clean DB) | IP-01 | Docker integration cannot be unit-tested; needs `bash setup.sh` round-trip | Run `~/bin/panda-rebuild.sh` against a clean DB; confirm migration applies and `SELECT active_tracks FROM projects` shows `{adr:false,biggy:false,incident_prevention:false}` for new projects |
| Migration 0052 on Docker (DB with existing ADR/Biggy projects) | IP-02 | Idempotency + backfill behavior needs real data | Apply migration against DB with pre-seed projects; confirm existing `adr`/`biggy` values preserved verbatim, new `incident_prevention:false` key added; re-run migration; confirm no duplicate `arch_tracks` rows |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (quick) / 300s (full)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
