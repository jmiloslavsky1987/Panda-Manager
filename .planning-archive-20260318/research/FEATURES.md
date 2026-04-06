# Feature Landscape

**Domain:** Single-user local project management / customer implementation tracking tool
**Researched:** 2026-03-04
**Confidence note:** No web search or Context7 access available in this session. Analysis is drawn from domain expertise, the detailed PROJECT.md spec, and established UX patterns for PM tools. Confidence is MEDIUM overall — the tool is well-understood by domain, but specifics should be validated against the user's daily workflow.

---

## Table Stakes

Features that any PM tool user expects. Missing = tool feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Status visibility at a glance | PM tools live or die by "what's at risk right now" | Low | Dashboard grid already specified; red/yellow/green dot system is universal |
| Overdue item highlighting | Users rely on visual urgency cues; without it items silently slip | Low | Overdue dates render red in Action Manager — already in spec |
| Inline editing (no modal popups for simple fields) | Modals for every edit create friction that breaks flow | Medium | Spec calls this out for actions, risks, milestones, artifacts — critical to execute well |
| Sort and filter on the actions table | Any list of 10+ items needs filtering to be usable | Low-Med | Already in spec: filter by workstream/status, sort by any column |
| Unsaved changes protection | Without this, users lose edits and lose trust in the tool | Low | Already in spec for YAML Editor; should also apply to Weekly Update Form |
| Confirmation on destructive actions | Delete/retire/close with no confirmation = accidental data loss | Low | Inline "Retire artifact" and "Close risk" need a one-step confirm — not a modal, a confirmation row state |
| Consistent status vocabulary | Green/yellow/red + On Track/At Risk/Off Track must map 1:1 everywhere | Low | The YAML schema is fixed so vocabulary is fixed — UI must render it identically across all 7 views |
| Empty states that explain what to do | First time a customer has no actions/risks, blank screen reads as broken | Low | Each empty section needs a short message + add prompt |
| Atomic persistence | Users must trust that clicking Save never half-writes | Low | Already spec'd as the Drive write strategy — critical to never deviate |
| Navigation breadcrumb / back button | Users need to know where they are when drilling from Dashboard → Customer → Action Manager | Low | Single-level breadcrumb: `Dashboard > [Customer Name] > [View]` |

---

## Differentiators

Features that make this meaningfully better than the current manual workflow (multiple Claude.ai projects + spreadsheet). Not expected, but high value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cross-customer risk aggregation on Dashboard | Spreadsheets can't show "3 customers have high-severity risks this week" without pivot table gymnastics | Low | Already in spec — the card grid with at-risk sorting is this feature |
| AI report generation (Claude API) | Turns a 30-minute weekly write-up into a 60-second generation + review | High | Already in spec; the real differentiator vs manual workflow |
| Sequential, human-readable IDs (A-001, X-001) | Enables reference in emails, Slack, slide decks without copy-pasting GUIDs | Low | Already in spec — server-side ID assignment enforces this |
| YAML-backed portable data | The source of truth is readable plain text on Drive, not a proprietary DB; survives app death | Low | Architectural differentiator; important to communicate in README |
| Weekly Update Form as a structured ritual | A dedicated form beats "find the YAML section and type in the right indentation" every time | Low-Med | Already in spec — the value is focus: you see only this week's inputs, nothing else |
| Per-workstream progress bars | Instant visual completion signal without reading notes | Low | Already in spec for Customer Overview — render accurately from YAML percent_complete fields |
| Artifact linking to actions | Implementation tools often lose the "this artifact was created because of action A-012" thread; linking surfaces it | Medium | Spec includes linked_actions field on artifacts — expose this in the UI, don't hide it in YAML |
| Drive version history as free undo | Because every write is the full YAML, Drive's version history is a complete audit trail at zero app cost | Low | No app work needed — document this for users; educate that Drive revision history is their undo |

---

## Anti-Features

Features to deliberately NOT build in v1. Specifically relevant to a single-user local tool.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-app notifications / reminders | Requires a background daemon or cron job; adds OS-level complexity for a local app; the Dashboard overdue count is the reminder | Let the Dashboard's overdue action count + red date coloring serve as the notification system |
| User accounts / login | This is a single-user local app; login adds friction without benefit | Hard-code or env-var the single user identity for action ownership labels |
| Comments / threaded discussion on actions | No second user to discuss with; becomes dead storage | Use the description and progress_notes fields for context |
| Drag-and-drop reordering | Nice in SaaS, complex to implement, doesn't map to YAML array order semantics | Sort by column instead; order in YAML is chronological/ID-based |
| In-app YAML versioning / undo history | Drive already provides full version history for every write | Document Drive's revision history as the undo mechanism; don't rebuild it |
| Customer creation wizard | Small dataset (1-10 customers), rare operation; building a schema-aware create form adds a month of work for an event that happens quarterly | Create new customer YAML manually (copy template), drop in Drive folder |
| Real-time sync / auto-refresh | Single user, no concurrent access; polling wastes complexity budget | Refresh-on-navigate is sufficient; explicit refresh button as fallback |
| Gantt chart view | Complex to render, overkill for 4-6 month implementations with a handful of milestones | The chronological milestones list in Customer Overview is sufficient |
| Mobile / responsive design | This is a desktop local tool; responsive adds CSS complexity without a use case | Design for desktop viewport (1280px+) only |
| Email sending | Out of scope per PROJECT.md; reports are copy/download | Copy-to-clipboard + download covers the workflow |
| Webhook / Slack integration | External API dependencies in a local app; fragile | Reports are the communication artifact |
| Multi-report history / archive | Report generation is cheap (API call) and Drive has the YAML source; storing rendered reports creates stale data risk | Regenerate on demand; no archive needed |
| Keyboard shortcut customization | Over-engineered for v1 single user | Ship opinionated defaults; document them |

---

## Evaluation of the Proposed 7-View Structure

### What Works Well

The 7-view structure is logical and covers the actual workflow:
- Dashboard (where am I across all customers)
- Customer Overview (what's the health of one customer)
- Action Manager (manage the work items)
- Report Generator (produce outputs)
- YAML Editor (escape hatch for power users and edge cases)
- Artifact Manager (manage deliverables and outputs)
- Weekly Update Form (structured recurring ritual)

### What Might Be Painful to Lack

**1. Global action search across customers**
When you remember "there's an action about Kafka connector but don't know which customer," you need cross-customer search. The current spec is per-customer only (you navigate to a customer first). For 1-10 customers this is manageable but annoying.
- Recommendation: Add a global search bar in the Dashboard header that searches action descriptions and artifact titles across all loaded YAMLs. LOW complexity since all YAMLs are in memory after the initial load.

**2. Quick-add action from Customer Overview**
The Customer Overview shows "3 most overdue actions" but the user has to navigate to Action Manager to add a new one. A single "Add Action" quick button on the Overview header that drops a prefilled row in the Action Manager (then navigates there) would reduce the context switch cost.
- Recommendation: LOW complexity, HIGH value for daily use.

**3. History / audit trail viewer**
The YAML has a `history` array that the Weekly Update Form writes to, but no view reads it back. Users eventually want to say "what was the status three weeks ago?" The YAML Editor exposes it, but raw YAML is not a good reading experience.
- Recommendation: Consider a read-only "History Timeline" section at the bottom of Customer Overview — collapsed by default, showing past weekly entries in reverse chronological order. MEDIUM complexity, deferrable to v2 unless history entries accumulate quickly.

**4. Risk/Milestone cross-customer roll-up on Dashboard**
The Dashboard cards show high-severity risk count, which is good. But there's no "show me all high-severity risks across all customers in a table." If a user is preparing for an internal ELT meeting, they want this roll-up without opening each customer card.
- Recommendation: Add a "Risk Summary" collapsed panel below the customer grid on the Dashboard. LOW-MED complexity. Could be v1 if ELT prep is a frequent workflow.

### Confirmed Sufficient

- No Settings view needed (no user-configurable preferences in a fixed-schema single-user app)
- No dedicated Milestone view (milestones live naturally in Customer Overview)
- No dedicated Risk view (same reasoning)

---

## YAML-as-Database UX Implications

### Benefits (already acknowledged in design)

- Human-readable source of truth; portable
- Drive version history is free audit trail
- Schema validation at write time prevents corruption
- No database to maintain, backup, or migrate

### UX Implications to Design Around

**1. Write latency is visible**
Every inline edit triggers a Drive API write (read → modify → write full file). For a YAML file that might be 5-15KB, this round-trip is 200-800ms on a good connection. Users will notice if every checkbox click has a 500ms freeze.
- Mitigation: Optimistic UI updates — update the UI immediately, write to Drive in the background, show a subtle "Saving..." → "Saved" indicator in the corner. Revert on error with a toast notification.

**2. Validation errors must be actionable**
If a Drive write is blocked because the modified YAML fails schema validation, the user must understand WHY and HOW to fix it, not just see an error code.
- Mitigation: Inline validation messages tied to specific fields. The YAML Editor's Validate button is a fallback, not the primary error surface.

**3. The YAML Editor is the escape hatch, not the primary interface**
Users will be tempted to edit YAML directly for things that should have UI. The editor must be clearly labeled as "for advanced use" and should always warn about schema constraints.
- Mitigation: Label the YAML Editor tab as "Advanced / Raw Editor." Consider a "back to normal view" link from within it.

**4. ID assignment must never require user thought**
Because IDs (A-001, X-001, R-001) are sequential and stored in YAML, the server must read the existing max ID and increment. Users must NEVER have to think about what ID to assign.
- Mitigation: Already in spec (server-side ID assignment). This is correct — never expose ID input to the user.

**5. Stale data from parallel Drive access**
If the user opens the app in two browser tabs, or has Drive open alongside the app and edits the YAML directly, the app's in-memory state is stale. For a single-user tool this is an edge case but can cause data loss.
- Mitigation: On every Drive write, perform the read step fresh (not cached). For YAML Editor writes, re-read from Drive on every Validate or Save click. No ETag locking needed — just always read fresh before write.

---

## Atomic Drive Write Edge Cases

The "read → modify in memory → write full YAML" approach is correct for single-user. Specific edge cases to handle:

| Edge Case | Risk | Mitigation |
|-----------|------|------------|
| Network timeout during write | YAML on Drive is unchanged (write failed), but UI shows new state | Catch the write error, revert UI state, show toast: "Save failed — please retry" |
| Write succeeds but read-back fails (verify step) | Hard to detect without a confirm-read; over-engineering for v1 | Skip verify-read in v1; Drive API 200 response is sufficient confirmation |
| Drive API rate limit (write burst) | Rapid inline edits (user clicks through 5 checkboxes quickly) trigger multiple sequential writes | Debounce writes with a 300ms delay; batch checkbox clicks that occur in quick succession |
| Drive file moved or deleted mid-session | Write call returns 404; user has no YAML | Catch 404 specifically, show a blocking error: "File not found in Drive — please check the Drive folder" |
| YAML corruption from truncated write | Drive API write is atomic at the file level; partial writes do not occur | No mitigation needed — Drive API guarantees all-or-nothing file writes |
| Large YAML (100+ actions over 12 months) | Write is still fast (files stay under 50KB); not a real concern for 1-10 customers | No mitigation needed for realistic dataset sizes |

---

## Search and Filtering Expectations

For a PM tool with this dataset size (1-10 customers, 10-50 actions each):

**Action Manager (highest priority)**
- Filter by status (Open / In Progress / Blocked / Completed) — dropdown or button group
- Filter by workstream (ADR sub-workstreams, Biggy sub-workstreams) — dropdown
- Filter by owner — dropdown populated from existing owner values in the YAML
- Sort by any column (due date, ID, owner, status) — click column header
- Text search within description — a simple input that filters rows client-side; no server call needed

**Dashboard (cross-customer)**
- Filter customer cards by status: "Show only At Risk" — a button group at top of grid
- This is the only cross-customer filter needed for v1

**Artifact Manager**
- Filter by type, status — dropdowns
- Text search on title/description

**What is NOT needed**
- Full-text search across the YAML body (overkill for this dataset)
- Saved filter presets (single user, not worth the complexity)
- Advanced query syntax (no need for "due:next-week AND owner:me AND workstream:ADR")

---

## Keyboard Shortcuts Worth Considering

For a power user doing daily PM work, these shortcuts pay dividends:

| Shortcut | Action | Priority |
|----------|--------|----------|
| `N` | Add new action (when in Action Manager view) | HIGH |
| `Enter` | Save inline edit and move focus to next row | HIGH |
| `Escape` | Cancel inline edit without saving | HIGH |
| `Tab` | Move between inline edit fields in a row | HIGH |
| `Cmd/Ctrl + S` | Save in YAML Editor | HIGH (standard) |
| `Cmd/Ctrl + K` | Open global search (if implemented) | MEDIUM |
| `1-7` or `G then D/C/A...` | Navigate to view (Dashboard/Customer/Actions...) | LOW — nice-to-have |
| `R` | Refresh current customer data from Drive | MEDIUM |

Shortcuts to explicitly NOT implement in v1:
- Vim-mode navigation (scope creep)
- Customizable keybindings (single user, pick opinionated defaults)
- Bulk selection with keyboard (low value vs complexity)

---

## Notification and Reminder Patterns

For a local single-user tool without a background process, traditional notification patterns (OS push notifications, email digests) are unavailable without daemon infrastructure. The correct pattern:

**Dashboard-as-notification-surface (recommended)**
The Dashboard IS the notification surface. Every time the user opens the app:
- Cards sorted by risk (At Risk first) surface urgent customers without any notification
- Open action count badge on each card quantifies urgency
- Red overdue dates in Action Manager quantify what is late

This is sufficient. The friction of opening the app is intentional — it creates a daily ritual, not interrupt-driven work.

**Optional: Overdue Summary Panel**
A collapsed "Overdue Actions" panel at the top of the Dashboard listing all overdue actions across customers (customer name, action ID, days overdue) would serve as the "catch-up" view for users returning after a few days away. LOW complexity — purely a filtered/aggregated view of already-loaded data.

**What NOT to build:**
- Browser push notifications (requires service worker, notification permissions, background process — enormous complexity for minimal gain in a local app you open intentionally)
- Email reminders (out of scope)
- OS-level alerts (requires native shell integration — out of scope entirely)
- Scheduled cron reports (same problem — no background process architecture)

---

## MVP Recommendation

**Priority 1 — Must work at launch (per user's own statement)**
1. Dashboard (customer grid sorted by risk, health summary per card)
2. Customer Overview (workstream health, risks, milestones, action summary)
3. Action Manager (open/complete actions, inline edit, Drive write)

**Priority 2 — Needed to replace the current workflow**
4. Weekly Update Form (structured history entry)
5. Report Generator (Claude API weekly status report)

**Priority 3 — Full replacement complete**
6. Artifact Manager (manage deliverables)
7. YAML Editor (escape hatch for edge cases)

**Defer to v2**
- History timeline view in Customer Overview
- Cross-customer risk roll-up on Dashboard
- Global search across all customers
- Overdue summary panel on Dashboard
- Owner-based filtering in Action Manager

**Never build (for this tool)**
- User authentication
- Multi-user collaboration
- In-app notifications
- Gantt chart
- Customer creation wizard
- Report archive

---

## Feature Dependencies

```
Dashboard → Customer Overview (navigation target for each card)
Customer Overview → Action Manager (links to filtered view for that customer)
Customer Overview → Report Generator (header button)
Weekly Update Form → Customer Overview (history shown there eventually)
Action Manager → Artifact Manager (linked_actions field cross-references)
YAML Editor → All Views (writes raw YAML that all views read from)
Report Generator → Claude API (external dependency — can fail independently)
All Views → Drive API (single point of failure — must handle gracefully)
```

---

## Sources

- Analysis based on PROJECT.md specification (read 2026-03-04)
- Domain expertise: established UX patterns for PM tools (Jira, Linear, Notion, Asana), customer success tooling (Gainsight, ChurnZero), YAML-backed config tools
- Confidence: MEDIUM — no live web research available in this session; claims about patterns are from training knowledge (cutoff August 2025), not verified against current tooling landscape
- Edge cases for Drive API atomic writes: based on Google Drive API v3 documented behavior (files.update is atomic at the API level); no live verification performed
