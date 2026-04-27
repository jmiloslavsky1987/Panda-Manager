# Requirements: BigPanda AI Project Assistant — v10.0

**Defined:** 2026-04-27
**Core Value:** Every PS delivery intelligence — 15 AI skills, all project context, all action tracking — lives in one place, runs automatically, and is always current.

## v10 Requirements

Calendar integration for time tracking and a Daily Prep workflow that transforms Google Calendar meetings into structured preparation briefs using existing project context and the Meeting Prep skill.

### CAL: Calendar → Time Entry Import

- [x] **CAL-01**: User can open `CalendarImportModal` from `GlobalTimeView` (wire in the already-built component, currently commented out)
- [x] **CAL-02**: Imported calendar events auto-populate duration, matched project, and task; task left blank when no match is found
- [x] **CAL-03**: Each event displays a confidence badge (high / low / none) based on project matching certainty

### PREP: Daily Prep Page

- [ ] **PREP-01**: A `/daily-prep` route exists with a sidebar link directly below Dashboard in the upper navigation section
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

- [ ] **RECUR-01**: System detects recurring meetings (by event series ID or title pattern); user can save a prep template for a meeting series and have it pre-populate future prep runs for the same meeting

### OUT: Export

- [ ] **OUT-01**: User can export a prep brief (or set of briefs for the day) as a PDF

### AVAIL: Team Availability

- [ ] **AVAIL-01**: Daily Prep page shows team availability context around each meeting — who from matched project stakeholders is free/busy at that time

### SCHED: Auto-Scheduling Prep

- [ ] **SCHED-01**: User can configure auto-generation of meeting prep N hours before each meeting; system creates a scheduled job that generates prep on the configured schedule

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
| PREP-01 | Phase 79 | Pending |
| PREP-02 | Phase 79 | Complete |
| PREP-03 | Phase 79 | Complete |
| PREP-04 | Phase 79 | Complete |
| PREP-05 | Phase 79 | Complete |
| PREP-06 | Phase 79 | Complete |
| PREP-07 | Phase 79 | Complete |
| SKILL-01 | Phase 79 | Complete |
| SKILL-02 | Phase 79 | Complete |
| NAV-01 | Phase 79 | Complete |
| RECUR-01 | Phase 80 | Pending |
| OUT-01 | Phase 80 | Pending |
| AVAIL-01 | Phase 80 | Pending |
| SCHED-01 | Phase 80 | Pending |

**Coverage:**
- v10 requirements: 17 total
- Mapped to phases: 17 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-04-27*
*Last updated: 2026-04-27 — roadmap collapsed to 2 phases (79–80)*
