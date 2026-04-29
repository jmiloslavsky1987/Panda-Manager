---
phase: 82
milestone: v11.0
status: captured
captured: 2026-04-29
---

# Phase 82 Requirements: Chat Write Operations

## Goal

Enable the per-project Chat tab to perform write operations via natural language.
Users can create, update, and delete actions, milestones, risks, team members, and
architecture nodes by typing plain English. All mutations require explicit confirmation
before execution.

## Scope

**In scope:**
- Tool use via Vercel AI SDK `streamText` tools
- Confirmation UX in ChatPanel before any write executes
- Full CRUD for: Actions, Milestones, Risks, Team Members, Architecture Nodes
- Scoped to per-project chat only (global operations like "create new project" deferred)

**Out of scope:**
- Cross-project mutations
- WBS / task mutations (complex parent-child relationships — future phase)
- Bulk operations

---

## Requirements

### Actions (CHAT-ACT-01 – CHAT-ACT-04)

**CHAT-ACT-01: Create action**
User can say "create an action for [owner] to [description] due [date]".
System creates a new action record and confirms before saving.

**CHAT-ACT-02: Update action**
User can update status ("close action 3", "mark action 5 in progress"),
owner, due date, or description on any existing action.

**CHAT-ACT-03: Delete action**
User can say "delete action [id/description]". Requires confirmation.

**CHAT-ACT-04: Disambiguate action references**
When a reference is ambiguous (e.g. "action 3" matches multiple), Claude asks
the user to clarify before proceeding.

---

### Milestones (CHAT-MS-01 – CHAT-MS-03)

**CHAT-MS-01: Create milestone**
User can say "add a milestone [name] due [date]". System creates and confirms.

**CHAT-MS-02: Update milestone**
User can update milestone name, due date, or status (open / completed / cancelled).

**CHAT-MS-03: Delete milestone**
User can say "delete milestone [name/id]". Requires confirmation.

---

### Risks (CHAT-RISK-01 – CHAT-RISK-04)

**CHAT-RISK-01: Create risk**
User can say "add a risk: [description], severity [high/medium/low]".

**CHAT-RISK-02: Update risk**
User can update severity, owner, mitigation text, or status.

**CHAT-RISK-03: Close risk**
User can say "close risk [id/description]". Sets status to closed.

**CHAT-RISK-04: Delete risk**
User can say "delete risk [id/description]". Requires confirmation.

---

### Team Members (CHAT-TEAM-01 – CHAT-TEAM-03)

**CHAT-TEAM-01: Add team member**
User can say "add [name] as [role] to the team".

**CHAT-TEAM-02: Update team member**
User can update a team member's role or details.

**CHAT-TEAM-03: Remove team member**
User can say "remove [name] from the team". Requires confirmation.

---

### Architecture Nodes (CHAT-ARCH-01 – CHAT-ARCH-03)

**CHAT-ARCH-01: Add architecture node**
User can say "add a [type] node called [name]".

**CHAT-ARCH-02: Update architecture node**
User can update a node's name, type, or description.

**CHAT-ARCH-03: Remove architecture node**
User can say "remove the [name] node". Requires confirmation.

---

### Confirmation UX (CHAT-UX-01 – CHAT-UX-02)

**CHAT-UX-01: Pre-execution confirmation**
Before any write tool executes, Claude presents a summary of the intended change
and waits for the user to type "confirm" or "cancel". No silent mutations.

**CHAT-UX-02: Post-execution feedback**
After a successful write, Claude confirms what was changed with the record ID.
On failure, Claude reports the error in plain language.
