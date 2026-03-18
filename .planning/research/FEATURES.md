# Feature Landscape

**Domain:** AI-native PS Delivery Management — single power user, n customer accounts, heavy AI output generation
**Researched:** 2026-03-18
**Confidence:** MEDIUM — grounded in PROJECT.md specification (domain-authoritative) and training knowledge of PS delivery tooling; external research unavailable in this session

---

## Table Stakes

Features users expect. Missing = product fails or user reverts to manual workflows.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project health at a glance (RAG status) | Without this, user must open every project to know what needs attention | Low | Auto-derived from overdue actions + stalled milestones + unresolved high risks — never manual |
| Per-project action tracker with inline editing | Core PM primitive; PS delivery lives and dies on tracked actions | Medium | Must sync to PA3_Action_Tracker.xlsx — that file is the contractual Cowork handshake |
| Risk register with append-only mitigation log | Required for accountability and ELT escalation; append-only prevents revision of history | Medium | Severity/status editable; mitigation entries are never deleted |
| Milestone tracker with completion history | Milestones are the external commitment surface; clients ask "where are we?" | Low-Med | Links to actions; history shows when each milestone closed |
| Engagement history (append-only) | Running memory of the project; survives knowledge transfer gaps | Low | Never editable — source of truth for "what did we agree?" |
| Key decisions log (append-only) | Alignment record for escalations and disagreements | Low | Searchable; linkable to other records |
| Stakeholder roster | PS delivery depends on knowing who owns what on both sides | Low | Separate BigPanda vs customer contacts |
| Full-text search across all records | At 10+ active accounts, grep-by-brain fails; search is the navigation layer | High | Must span actions, risks, decisions, history, artifacts, tasks, KB across all projects |
| Output Library (all generated files) | AI outputs must be findable after generation; "where's that deck from Tuesday?" is constant | Medium | Indexed by account + skill type + date; HTML renders inline |
| Settings (API keys, paths, schedule times) | Single-user tool must be self-configurable without code changes | Low | Anthropic key stored securely; paths configurable for different machine setups |
| Multi-account architecture (n projects) | Business has more than 3 customers; hardcoding is a death sentence for v2 | Medium | Add/close/archive lifecycle; archived projects are read-only but fully searchable |

---

## Differentiators

Features that make this AI-native rather than just a PM tool. Not expected from standard PM tools, but high-value here.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Scheduled background intelligence (cron jobs) | Tool runs intelligence even when user is away — morning briefing is ready at 8am, not when the user thinks to ask | High | 6 scheduled jobs; requires persistent process (not serverless); results stored in DB for immediate display |
| Skill Launcher with 15 pre-built AI skills | AI output generation is one click from a live DB, not "open Claude, paste context, wait" | High | SKILL.md files read from disk at runtime — prompts are never bundled, always current with Cowork updates |
| Tone separation (customer-facing vs internal) | PS delivery requires two different voices simultaneously — partnership tone outward, analytical tone inward — mixing them is a trust risk | Medium | Enforced at skill level; Weekly Customer Status != ELT Internal Status; never expose internal severity language in external outputs |
| Drafts Inbox (AI output review queue) | AI-generated emails/Slack drafts must be reviewed before send; a unified queue prevents missed drafts and accidental sends | Medium | Pending review state on all outbound AI content; sent/discarded lifecycle |
| Auto health scoring (data-derived) | Removes human inconsistency; forces confrontation between gut feel and actual signals | Medium | Algorithm: overdue actions + stalled milestones + unresolved high risks → RAG; manual override with required justification |
| Context Updater (notes → DB → context doc) | 14-step structured update from meeting notes closes the loop between human input and machine-readable state | High | One of the most complex skills; must apply all 14 steps atomically and export a round-trip-safe context doc |
| Cross-project risk heat map | Portfolio-level view that no per-project tool provides; delivery manager needs to know if multiple accounts are red simultaneously | Medium | Probability × impact matrix, all accounts; useful for staffing decisions and escalation sequencing |
| Cross-account watch list | Escalated/time-sensitive items that need daily attention regardless of which project they live in | Low-Med | Derived from action due dates, risk severity, upcoming go-lives |
| Customer Project Tracker (Gmail/Slack/Gong sweep) | Automated signal harvesting from external sources closes the gap between "what I know" and "what's actually happening" | High | Sweep results update DB and action tracker; most complex scheduled job |
| Knowledge Base (cross-project lessons learned) | PS delivery accumulates patterns across customers — a shared KB turns each project into training data for future ones | Medium | Searchable; linkable to risks/decisions; searchable after project archive |
| Source tracing on all records | Every action/risk/artifact must know where it came from (skill run, manual entry, file, date, verified vs inferred) | Medium | Contractual constraint — Cowork skills depend on this for confidence framing in outputs |
| Team Engagement Map (HTML self-contained) | Business outcome + team structure + onboarding status in a single deliverable — no standard PM tool generates this | High | Self-contained HTML; ADR + Biggy tracks; generated from live DB context |
| Onboarding velocity view (stall detection) | Time-in-phase tracking catches stuck onboarding before it becomes a go-live risk | Medium | Per-team, per-phase; stall threshold configurable |
| AI-assisted plan generation | Sprint summary + project context → proposed task additions — reduces weekly planning overhead | High | Must pull from DB, not invent facts; proposed additions require human approval |
| YAML ↔ DB round-trip | Cowork skills operate on YAML context docs; app must export DB state to YAML without drift | High | js-yaml constraints (sortKeys: false, lineWidth: -1, JSON_SCHEMA) are proven in existing skill ecosystem — must be preserved exactly |

---

## Anti-Features

Things to deliberately NOT build for v1. Each entry is a trap that will absorb scope without proportional value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Customer-facing read-only portal | External access requires auth, hosting security, a UX layer for non-power-users, and support — none of which exist | Email Weekly Customer Status output; portal is v3+ |
| Multi-user / team collaboration | Concurrent write conflicts, permission models, notification routing for other users — all new complexity classes | Single-user first; the app is already valuable as a personal intelligence layer |
| JWT/SSO authentication | No external users = no need; adds significant surface area | Environment variable or local config for API keys is sufficient |
| In-app send (email/Slack directly from UI) | Sending from the app requires OAuth tokens, deliverability handling, and "oops I sent the wrong draft" recovery | Drafts Inbox generates the draft; user sends from their actual client with full control |
| QBR / business-review deck generator | ELT External Status deck covers this need; QBR is a once-per-quarter edge case with high customization needs | Reuse ELT External Status + manual editing |
| Hardcoded customer list | Code-level customer coupling makes every new account a deploy; violates the n-account requirement | All customers are rows in the projects table; onboarding is a UI action |
| Real-time collaborative editing | No second user to collaborate with; adds WebSocket complexity for zero benefit | Optimistic UI with single-user writes is sufficient |
| Native mobile app | PS delivery manager works at a desk; mobile adds a build target with no workflow benefit | Responsive web is acceptable minimum; native is waste |
| Gantt drag-and-drop scheduling | PM tools that invest here get used for scheduling theater; PS timelines are driven by customer readiness, not Gantt perfection | Gantt view for status visibility is fine; make it read-only with explicit edit mode |
| Notification email delivery (outbound from app) | Requires SMTP configuration, deliverability, bounce handling | In-app badges + morning briefing surfaced in dashboard are sufficient for single-user awareness |
| Versioned document diffing | Append-only logs already provide an audit trail; diff UI adds rendering complexity for low practical use | Source tracing + append-only history is the audit story |

---

## Feature Dependencies

Understanding which features are blocked by which others — critical for phase ordering.

```
PostgreSQL schema + migrations
  → All features (everything is DB-backed)

Project CRUD (add/close/archive)
  → Dashboard health cards
  → Per-project workspace tabs
  → Cross-project risk heat map
  → Cross-account watch list

Action Tracker (DB + XLSX sync)
  → Auto health scoring (overdue actions signal)
  → Scheduled intelligence (tracker sweep)
  → Customer Project Tracker skill

Risk Register
  → Auto health scoring (unresolved high risks signal)
  → Cross-project risk heat map
  → ELT External + Internal Status skills

Milestone Tracker
  → Auto health scoring (stalled milestones signal)
  → Gantt timeline view

Engagement History + Key Decisions
  → Context Updater skill (writes here)
  → Handoff Doc Generator skill (reads here)
  → YAML context doc export

Stakeholder Roster
  → Team Engagement Map skill
  → Meeting Summary skill (attendee attribution)

Output Library
  → All skill outputs (registration point)
  → Regenerate workflow

SKILL.md runtime loader
  → All 15 skills
  → Skill Launcher UI

YAML ↔ DB round-trip (context doc export)
  → All skills that consume context docs
  → Context Updater round-trip fidelity
  → Cowork compatibility constraint

Drafts Inbox
  → Weekly Customer Status skill
  → Biggy Weekly Briefing skill (email + Slack drafts)
  → Any skill that generates outbound copy

Scheduled jobs infrastructure (cron)
  → Morning Briefing background job
  → Customer Project Tracker automated run
  → Weekly Status Draft generation
  → Biggy Weekly Briefing generation
  → Cross-account health check

Cross-project Knowledge Base
  → Risk linkage (risks reference KB entries)
  → Engagement history linkage
  → Full-text search scope

Full-text search
  → Knowledge Base (requires KB to exist)
  → All structured records (can be added incrementally)
```

---

## MVP Recommendation

The tool has no value without project data and no daily use without AI outputs. The MVP must establish the full data foundation before the skill launcher has anything to run against.

**Prioritize in this order:**

1. **PostgreSQL schema + all migrations** — Everything else is blocked on this
2. **Project CRUD + per-project workspace tabs** (Actions, Risks, Milestones, History, Decisions, Stakeholders) — These are the table stakes data surfaces
3. **Dashboard health cards + auto-derived RAG scoring** — Daily driver; first thing opened each morning
4. **YAML ↔ DB round-trip** — Required before any skill can run correctly; Cowork compatibility is non-negotiable
5. **SKILL.md runtime loader + Skill Launcher** (start with 3-4 highest-value skills: Weekly Customer Status, Context Updater, Morning Briefing, Customer Project Tracker) — Proves the AI-native value proposition early
6. **Drafts Inbox** — Gate before any outbound AI content reaches a client
7. **Output Library** — Makes skill outputs findable and reusable
8. **Scheduled jobs infrastructure + 6 cron jobs** — Unlocks "tool works while I sleep" differentiator
9. **Remaining skills** (ELT decks, Team Engagement Map, Workflow Diagram, Handoff Doc, Meeting Summary) — Fill out the skill portfolio
10. **Full-text search** — Becomes critical at 5+ active accounts; can defer until then

**Defer to later milestones:**
- Knowledge Base: High value but requires patterns to accumulate before search is useful; build in milestone 2
- AI-assisted plan generation: Highest complexity, lowest urgency; defer to milestone 3
- Gantt timeline view: Nice to have; milestone 2
- Onboarding velocity / stall detection: Valuable but secondary to core data surfaces; milestone 2

---

## Sources

- **PRIMARY:** PROJECT.md specification (2026-03-18) — domain-authoritative, written by the PS delivery manager with direct domain expertise. HIGH confidence for feature naming and scope.
- **SECONDARY:** Training knowledge of PS delivery tooling patterns (Gainsight, Vitally, Notion AI, Linear, Asana AI features, Salesforce PS cloud). MEDIUM confidence — used to validate "table stakes" categorizations only, not to contradict the specification.
- **NOTE:** External web research was unavailable in this session. Feature landscape for established PM tools is well-understood from training data; AI-native scheduling and tone-separation patterns reflect current (2025-2026) industry trajectory. Flag for validation if tooling landscape evolves significantly before build starts.
