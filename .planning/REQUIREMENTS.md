# Requirements: BigPanda AI Project Assistant — v11.0

**Defined:** 2026-04-27 (v10), 2026-04-28 (v11)
**Core Value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current; delivered through a first-class Kata Design System interface.

## v10 Requirements

Calendar integration for time tracking and a Daily Prep workflow that transforms Google Calendar meetings into structured preparation briefs using existing project context and the Meeting Prep skill.

### CAL: Calendar → Time Entry Import

- [x] **CAL-01**: User can open `CalendarImportModal` from `GlobalTimeView` (wire in the already-built component, currently commented out)
- [x] **CAL-02**: Imported calendar events auto-populate duration, matched project, and task; task left blank when no match is found
- [x] **CAL-03**: Each event displays a confidence badge (high / low / none) based on project matching certainty

### PREP: Daily Prep Page

- [x] **PREP-01**: A `/daily-prep` route exists with a sidebar link directly below Dashboard in the upper navigation section
- [x] **PREP-02**: Page shows event cards for today's calendar meetings, each displaying: time, title, duration, matched project, and attendees
- [x] **PREP-03**: Unmatched events show a manual project assignment dropdown
- [x] **PREP-04**: User can multi-select events and trigger Meeting Prep generation for the selected set
- [x] **PREP-05**: Prep output expands inline per event card — sections: context, desired outcome, 2–3 bullet agenda
- [x] **PREP-06**: Each expanded prep card has a Copy to Clipboard button
- [x] **PREP-07**: A date picker allows viewing and prepping for meetings on other days

### SKILL: Meeting Prep Skill Enhancements

- [x] **SKILL-01**: Calendar event metadata (attendees, duration, recurrence flag) is injected into the Meeting Prep skill context builder
- [x] **SKILL-02**: Meeting Prep skill output uses a structured format with explicit sections: Context, Desired Outcome, Agenda

### NAV: Navigation

- [x] **NAV-01**: "Daily Prep" sidebar link appears directly below Dashboard in the upper navigation section (above project list)

### RECUR: Recurring Meeting Templates

- [x] **RECUR-01**: System detects recurring meetings (by event series ID or title pattern); user can save a prep template for a meeting series and have it pre-populate future prep runs for the same meeting

### OUT: Export

- [x] **OUT-01**: User can export a prep brief (or set of briefs for the day) as a PDF

### AVAIL: Team Availability

- [x] **AVAIL-01**: Daily Prep page shows team availability context around each meeting — who from matched project stakeholders is free/busy at that time

### SCHED: Auto-Scheduling Prep

- [x] **SCHED-01**: User can configure auto-generation of meeting prep N hours before each meeting; system creates a scheduled job that generates prep on the configured schedule

## v11 Requirements

Kata Design System visual overhaul — Command Workspace direction. All functional behavior preserved; only the visual layer changes.

### KDS: Kata Design System

- [ ] **KDS-01**: Kata token CSS variables (`kata-tokens.css`) are imported into the app; shadcn component tokens are aliased to Kata equivalents; no Tailwind default palette colors remain in primary UI surfaces
- [ ] **KDS-02**: Inter is the app's body typeface; JetBrains Mono is applied to all numerals, IDs, dates, and durations; lucide-react is fully replaced with Material Symbols Outlined 400
- [ ] **KDS-03**: The left sidebar is rebuilt as a 240px dark Command Rail (always dark, independent of theme): logo + "Panda Manager" header, ⌘K search pill, top nav links (Portfolio / Today / Daily Prep), live project list with RAG dot + go-live date in JBM, user footer with settings icon
- [ ] **KDS-04**: A 44px page-bar renders at the top of every page with breadcrumb/title on the left and contextual CTAs on the right; theme toggle switches `<html class="dark">` on the main canvas only — the command rail stays dark in light mode
- [ ] **KDS-05**: Portfolio Dashboard is rebuilt to spec: hero stat band (project count in JBM 64px, health breakdown, this-week metrics), AI briefing strip (3-column card grid with tone-colored borders), 2-column project grid (health-accented cards with 3px left border, metric strip, progress bar)
- [ ] **KDS-06**: Project Workspace is rebuilt to spec: 44px page-bar with project name + health badge, tab row, 5-column KPI strip with JBM 28px numerals (tone-tinted for risky values), 2-column focus/risks grid
- [ ] **KDS-07**: All existing tabs and functionality (Overview, Plan, Gantt, Stakeholders, Risks, Decisions, Artifacts, Skills, Time, Daily Prep, Settings) work identically after the visual rebuild; no regressions in data display, forms, or navigation
- [ ] **KDS-08**: Default accent is Indigo (`#5B5BFF`); theme and accent preferences persist to localStorage; dark mode sets canvas to gray-950, container to gray-900

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: Push or in-app reminder when auto-generated prep is ready
- **NOTF-02**: Slack/email reminder for meetings with missing prep brief

### Analytics

- **ANLYT-01**: Meeting prep usage trends (how often prep is generated vs skipped)
- **ANLYT-02**: Meeting effectiveness scoring or follow-up capture

### Cross-Device

- **SYNC-01**: Prep notes synced and accessible on mobile

## Out of Scope

| Feature | Reason |
|---------|--------|
| Two-way calendar write (creating/editing calendar events) | Out of delivery scope; read-only import is sufficient |
| Zoom/Teams meeting join integration | Third-party complexity; calendar data is sufficient context |
| Video recording transcription | Covered by existing document ingestion workflow |
| Native mobile app | Web-first; v10.0 scope is feature delivery |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAL-01 | Phase 79 | Complete |
| CAL-02 | Phase 79 | Complete |
| CAL-03 | Phase 79 | Complete |
| PREP-01 | Phase 79 | Complete |
| PREP-02 | Phase 79 | Complete |
| PREP-03 | Phase 79 | Complete |
| PREP-04 | Phase 79 | Complete |
| PREP-05 | Phase 79 | Complete |
| PREP-06 | Phase 79 | Complete |
| PREP-07 | Phase 79 | Complete |
| SKILL-01 | Phase 79 | Complete |
| SKILL-02 | Phase 79 | Complete |
| NAV-01 | Phase 79 | Complete |
| RECUR-01 | Phase 80 | Complete |
| OUT-01 | Phase 80 | Complete |
| AVAIL-01 | Phase 80 | Complete |
| SCHED-01 | Phase 80 | Complete |
| KDS-01 | Phase 81 | Pending |
| KDS-02 | Phase 81 | Pending |
| KDS-03 | Phase 81 | Pending |
| KDS-04 | Phase 81 | Pending |
| KDS-05 | Phase 81 | Pending |
| KDS-06 | Phase 81 | Pending |
| KDS-07 | Phase 81 | Pending |
| KDS-08 | Phase 81 | Pending |

**Coverage:**
- v10 requirements: 17 total (Phases 79–80)
- v11 requirements: 8 total (Phase 81)
- Mapped to phases: 25 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-04-27*
*Last updated: 2026-04-28 — Phase 81 added: 8 KDS requirements for Kata Design System overhaul*
