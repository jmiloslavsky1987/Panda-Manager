/**
 * schema.ts — Drizzle ORM schema for BigPanda Project Assistant
 *
 * All 13 domain tables with correct column types, enums, and FK constraints.
 *
 * Key design decisions:
 * - Date fields are TEXT (not date type) — source data has 'TBD', '2026-Q3', null strings
 * - external_id preserves human-readable IDs (A-KAISER-001) separate from internal DB serial id
 * - engagement_history and key_decisions are APPEND ONLY (enforced via DB triggers in migration)
 * - RLS enabled on project-scoped tables (enforced via migration — app.current_project_id session var)
 * - knowledge_base is scaffolded plain for Phase 8 (KB-01, KB-02, KB-03)
 */

import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  jsonb,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const projectStatusEnum = pgEnum('project_status', [
  'active',
  'archived',
  'closed',
]);

export const actionStatusEnum = pgEnum('action_status', [
  'open',
  'in_progress',
  'completed',
  'cancelled',
]);

export const severityEnum = pgEnum('severity', [
  'low',
  'medium',
  'high',
  'critical',
]);

export const outputStatusEnum = pgEnum('output_status', [
  'running',
  'complete',
  'failed',
]);

// ─── Table 1: projects ────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  customer: text('customer').notNull(),
  status: projectStatusEnum('status').default('active').notNull(),
  overall_status: text('overall_status'),
  status_summary: text('status_summary'),
  go_live_target: text('go_live_target'),
  last_updated: text('last_updated'),
  source_file: text('source_file'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  sprint_summary: text('sprint_summary'),
  sprint_summary_at: timestamp('sprint_summary_at', { withTimezone: true }),
});

// ─── Table 2: workstreams ─────────────────────────────────────────────────────

export const workstreams = pgTable('workstreams', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id')
    .notNull()
    .references(() => projects.id),
  name: text('name').notNull(),
  track: text('track'), // 'ADR' | 'Biggy'
  current_status: text('current_status'),
  lead: text('lead'),
  last_updated: text('last_updated'),
  state: text('state'),
  percent_complete: integer('percent_complete'), // 0-100, nullable — auto-derived by progress rollup
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 3: actions ─────────────────────────────────────────────────────────

export const actions = pgTable('actions', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id')
    .notNull()
    .references(() => projects.id),
  external_id: text('external_id').notNull(), // A-KAISER-001
  description: text('description').notNull(),
  owner: text('owner'),
  due: text('due'), // TEXT — can be 'TBD', '2026-Q3', or ISO date
  status: actionStatusEnum('status').default('open').notNull(),
  last_updated: text('last_updated'),
  notes: text('notes'),
  type: text('type').default('action').notNull(), // 'action' | 'question' (Q-NNN IDs)
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 4: risks ───────────────────────────────────────────────────────────

export const risks = pgTable('risks', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id')
    .notNull()
    .references(() => projects.id),
  external_id: text('external_id').notNull(), // R-KAISER-001
  description: text('description').notNull(),
  severity: severityEnum('severity'),
  owner: text('owner'),
  mitigation: text('mitigation'),
  status: text('status'),
  last_updated: text('last_updated'),
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 5: milestones ──────────────────────────────────────────────────────

export const milestones = pgTable('milestones', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id')
    .notNull()
    .references(() => projects.id),
  external_id: text('external_id').notNull(), // M-KAISER-001
  name: text('name').notNull(),
  status: text('status'),
  target: text('target'),
  date: text('date'), // TEXT — 'TBD', '2026-Q3', ISO date
  notes: text('notes'),
  owner: text('owner'),
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 6: artifacts ───────────────────────────────────────────────────────

export const artifacts = pgTable('artifacts', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id')
    .notNull()
    .references(() => projects.id),
  external_id: text('external_id').notNull(), // X-KAISER-001
  name: text('name').notNull(),
  description: text('description'),
  status: text('status'),
  owner: text('owner'),
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 7: engagement_history — APPEND ONLY ───────────────────────────────
// DB trigger (enforce_append_only) prevents UPDATE and DELETE.

export const engagementHistory = pgTable('engagement_history', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id')
    .notNull()
    .references(() => projects.id),
  date: text('date'),
  content: text('content').notNull(),
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 8: key_decisions — APPEND ONLY ────────────────────────────────────
// DB trigger (enforce_append_only) prevents UPDATE and DELETE.

export const keyDecisions = pgTable('key_decisions', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id')
    .notNull()
    .references(() => projects.id),
  date: text('date'),
  decision: text('decision').notNull(),
  context: text('context'),
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 9: stakeholders ────────────────────────────────────────────────────

export const stakeholders = pgTable('stakeholders', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id')
    .notNull()
    .references(() => projects.id),
  name: text('name').notNull(),
  role: text('role'),
  company: text('company'),
  email: text('email'),
  slack_id: text('slack_id'),
  notes: text('notes'),
  source: text('source').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 10: tasks ──────────────────────────────────────────────────────────

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id')
    .notNull()
    .references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  owner: text('owner'),
  due: text('due'),
  priority: text('priority'),
  type: text('type'),
  phase: text('phase'),
  workstream_id: integer('workstream_id').references(() => workstreams.id),
  blocked_by: integer('blocked_by').references((): AnyPgColumn => tasks.id), // self-referential FK, nullable
  milestone_id: integer('milestone_id').references(() => milestones.id),      // nullable FK to milestones
  start_date: text('start_date'),                                              // TEXT — same as 'due' (can be TBD, ISO date)
  status: text('status').default('todo').notNull(),
  source: text('source'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 11: outputs ────────────────────────────────────────────────────────

export const outputs = pgTable('outputs', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').references(() => projects.id), // nullable — cross-project outputs
  skill_name: text('skill_name').notNull(),
  idempotency_key: text('idempotency_key').notNull().unique(),
  status: outputStatusEnum('status').default('running').notNull(),
  content: text('content'),
  filename: text('filename'),
  filepath: text('filepath'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  archived: boolean('archived').default(false).notNull(),
});

// ─── Table 12: plan_templates ─────────────────────────────────────────────────

export const planTemplates = pgTable('plan_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  template_type: text('template_type'),
  data: text('data'), // JSON string
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 13: knowledge_base — scaffolded for Phase 8 ───────────────────────
// No append-only trigger or RLS policy — Phase 8 (KB-01, KB-02, KB-03) will configure.

export const knowledgeBase = pgTable('knowledge_base', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').references(() => projects.id), // nullable — cross-project knowledge
  title: text('title').notNull(),
  content: text('content').notNull(),
  source_trace: text('source_trace'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Enum: job_run_status ──────────────────────────────────────────────────────
export const jobRunStatusEnum = pgEnum('job_run_status', [
  'pending', 'running', 'completed', 'failed', 'skipped',
]);

// ─── Table 14: job_runs ───────────────────────────────────────────────────────
export const jobRuns = pgTable('job_runs', {
  id: serial('id').primaryKey(),
  job_name: text('job_name').notNull(),
  status: jobRunStatusEnum('status').default('pending').notNull(),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
  error_message: text('error_message'),
  triggered_by: text('triggered_by').default('scheduled').notNull(), // 'scheduled' | 'manual'
});

// ─── Enum: skill_run_status ───────────────────────────────────────────────────
export const skillRunStatusEnum = pgEnum('skill_run_status', [
  'pending', 'running', 'completed', 'failed',
]);

// ─── Table 15: skill_runs ─────────────────────────────────────────────────────
export const skillRuns = pgTable('skill_runs', {
  id: serial('id').primaryKey(),
  run_id: text('run_id').notNull().unique(),       // UUID — idempotency key
  project_id: integer('project_id').references(() => projects.id),
  skill_name: text('skill_name').notNull(),
  status: skillRunStatusEnum('status').default('pending').notNull(),
  input: text('input'),                            // JSON: user-provided inputs
  full_output: text('full_output'),                // aggregated on completion
  error_message: text('error_message'),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Table 16: skill_run_chunks ───────────────────────────────────────────────
export const skillRunChunks = pgTable('skill_run_chunks', {
  id: serial('id').primaryKey(),
  run_id: integer('run_id').notNull().references(() => skillRuns.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  chunk: text('chunk').notNull(),                  // text delta or '__DONE__' sentinel
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Enum: draft_status ───────────────────────────────────────────────────────
export const draftStatusEnum = pgEnum('draft_status', [
  'pending', 'dismissed', 'sent',
]);

// ─── Table 17: drafts ─────────────────────────────────────────────────────────
export const drafts = pgTable('drafts', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').references(() => projects.id),
  run_id: integer('run_id').references(() => skillRuns.id),
  draft_type: text('draft_type').notNull(),        // 'email' | 'slack'
  recipient: text('recipient'),
  subject: text('subject'),
  content: text('content').notNull(),
  status: draftStatusEnum('status').default('pending').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Phase 5.1: Onboarding Dashboard ─────────────────────────────────────────

export const onboardingStepStatusEnum = pgEnum('onboarding_step_status', [
  'not-started', 'in-progress', 'complete', 'blocked',
])

export const integrationStatusEnum = pgEnum('integration_status', [
  'not-connected', 'configured', 'validated', 'production', 'blocked',
])

export const onboardingPhases = pgTable('onboarding_phases', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

export const onboardingSteps = pgTable('onboarding_steps', {
  id: serial('id').primaryKey(),
  phase_id: integer('phase_id').notNull().references(() => onboardingPhases.id),
  project_id: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  description: text('description'),
  status: onboardingStepStatusEnum('status').default('not-started').notNull(),
  owner: text('owner'),
  dependencies: text('dependencies').array().default([]),
  updates: jsonb('updates').default([]).notNull(),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})

export const integrations = pgTable('integrations', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  tool: text('tool').notNull(),
  category: text('category'),
  status: integrationStatusEnum('status').default('not-connected').notNull(),
  color: text('color'),
  notes: text('notes'),
  display_order: integer('display_order').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Phase 5.2: Time Tracking ─────────────────────────────────────────────────

export const timeEntries = pgTable('time_entries', {
  id:          serial('id').primaryKey(),
  project_id:  integer('project_id').notNull().references(() => projects.id),
  date:        text('date').notNull(),         // ISO: 'YYYY-MM-DD'
  hours:       text('hours').notNull(),        // decimal string: '1.5' — use parseFloat() in JS
  description: text('description').notNull(),
  created_at:  timestamp('created_at').defaultNow().notNull(),
  updated_at:  timestamp('updated_at').defaultNow().notNull(),
})

export type TimeEntry = typeof timeEntries.$inferSelect
export type TimeEntryInsert = typeof timeEntries.$inferInsert
