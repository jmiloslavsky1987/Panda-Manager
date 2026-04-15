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
  numeric,
  timestamp,
  boolean,
  pgEnum,
  jsonb,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const projectStatusEnum = pgEnum('project_status', [
  'active',
  'archived',
  'closed',
  'draft',
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

// ─── v2.0 Enums ──────────────────────────────────────────────────────────────

export const discoveryItemStatusEnum = pgEnum('discovery_item_status', [
  'pending', 'approved', 'dismissed',
]);

export const ingestionStatusEnum = pgEnum('ingestion_status', [
  'pending', 'extracting', 'preview', 'approved', 'failed',
]);

export const jobRunOutcomeEnum = pgEnum('job_run_outcome', [
  'success', 'failure', 'partial',
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'live', 'in_progress', 'blocked', 'planned',
]);

export const integrationTrackStatusEnum = pgEnum('integration_track_status', [
  'live', 'in_progress', 'pilot', 'planned',
]);

// ─── v6.0 Enums ──────────────────────────────────────────────────────────────

export const wbsItemStatusEnum = pgEnum('wbs_item_status', ['not_started', 'in_progress', 'complete']);
export const archNodeStatusEnum = pgEnum('arch_node_status', ['planned', 'in_progress', 'live']);

// ─── v7.0 Enums ──────────────────────────────────────────────────────────────

export const projectMemberRoleEnum = pgEnum('project_member_role', ['admin', 'user']);

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
  weekly_hour_target: numeric('weekly_hour_target', { precision: 5, scale: 2 }),
  description: text('description'),
  start_date: text('start_date'),
  end_date: text('end_date'),
  seeded: boolean('seeded').default(false).notNull(),
  exec_action_required: boolean('exec_action_required').default(false).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;

// ─── Table 1b: project_members ────────────────────────────────────────────────

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: projectMemberRoleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('project_members_project_user_idx').on(t.project_id, t.user_id),
]);

export type ProjectMember = typeof projectMembers.$inferSelect;
export type ProjectMemberInsert = typeof projectMembers.$inferInsert;

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
  source_artifact_id: integer('source_artifact_id').references((): AnyPgColumn => artifacts.id, { onDelete: 'set null' }),
  discovery_source: text('discovery_source'),
  ingested_at: timestamp('ingested_at'),
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
  source_artifact_id: integer('source_artifact_id').references((): AnyPgColumn => artifacts.id, { onDelete: 'set null' }),
  discovery_source: text('discovery_source'),
  ingested_at: timestamp('ingested_at'),
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
  source_artifact_id: integer('source_artifact_id').references((): AnyPgColumn => artifacts.id, { onDelete: 'set null' }),
  discovery_source: text('discovery_source'),
  ingested_at: timestamp('ingested_at'),
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
  discovery_source: text('discovery_source'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  ingestion_status:   ingestionStatusEnum('ingestion_status'),
  ingestion_log_json: jsonb('ingestion_log_json'),
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
  source_artifact_id: integer('source_artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),
  discovery_source: text('discovery_source'),
  ingested_at: timestamp('ingested_at'),
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
  source_artifact_id: integer('source_artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),
  discovery_source: text('discovery_source'),
  ingested_at: timestamp('ingested_at'),
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
  source_artifact_id: integer('source_artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),
  discovery_source: text('discovery_source'),
  ingested_at: timestamp('ingested_at'),
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
  source_artifact_id: integer('source_artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),
  ingested_at: timestamp('ingested_at'),
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

// ─── Table 13: knowledge_base — Phase 8 KB-02, KB-03 linkability added ───────
// linked_risk_id, linked_history_id, linked_date added via migration 0008_fts_and_kb.sql
// search_vec (tsvector) is DB-only — managed by trigger, queried via raw SQL; not in Drizzle schema

export const knowledgeBase = pgTable('knowledge_base', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').references(() => projects.id), // nullable — cross-project knowledge
  title: text('title').notNull(),
  content: text('content').notNull(),
  source_trace: text('source_trace'),
  linked_risk_id: integer('linked_risk_id').references(() => risks.id),
  linked_history_id: integer('linked_history_id').references(() => engagementHistory.id),
  linked_date: text('linked_date'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type KnowledgeBaseEntry = typeof knowledgeBase.$inferSelect;
export type KnowledgeBaseInsert = typeof knowledgeBase.$inferInsert;

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
  'pending', 'running', 'completed', 'failed', 'cancelled',
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
  track: text('track'),
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
  track: text('track'),
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
  track: text('track'),
  integration_type: text('integration_type'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Phase 5.2: Time Tracking ─────────────────────────────────────────────────

export const timeEntries = pgTable('time_entries', {
  id:          serial('id').primaryKey(),
  project_id:  integer('project_id').notNull().references(() => projects.id),
  user_id:     text('user_id').notNull().default('default'),  // Phase 32: user scoping for multi-user
  date:        text('date').notNull(),         // ISO: 'YYYY-MM-DD'
  hours:       text('hours').notNull(),        // decimal string: '1.5' — use parseFloat() in JS
  description: text('description').notNull(),
  created_at:  timestamp('created_at').defaultNow().notNull(),
  updated_at:  timestamp('updated_at').defaultNow().notNull(),
  submitted_on:  timestamp('submitted_on'),
  submitted_by:  text('submitted_by'),
  approved_on:   timestamp('approved_on'),
  approved_by:   text('approved_by'),
  rejected_on:   timestamp('rejected_on'),
  rejected_by:   text('rejected_by'),
  locked:        boolean('locked').default(false).notNull(),
})

export type TimeEntry = typeof timeEntries.$inferSelect
export type TimeEntryInsert = typeof timeEntries.$inferInsert

// ─── Phase 23: Time Tracking Advanced Config ───────────────────────────────

export const timeTrackingConfig = pgTable('time_tracking_config', {
  id:                    serial('id').primaryKey(),
  enabled:               boolean('enabled').default(false).notNull(),
  weekly_capacity_hours: numeric('weekly_capacity_hours', { precision: 5, scale: 2 }).notNull().default('40'),
  working_days:          text('working_days').array().notNull().default(['Mon','Tue','Wed','Thu','Fri']),
  submission_due_day:    text('submission_due_day').notNull().default('Friday'),
  submission_due_time:   text('submission_due_time').notNull().default('17:00'),
  reminder_days_before:  integer('reminder_days_before').notNull().default(1),
  categories:            text('categories').array().notNull().default(['Development','Meetings','QA','Discovery','Admin']),
  restrict_to_assigned:  boolean('restrict_to_assigned').default(false).notNull(),
  active_projects_only:  boolean('active_projects_only').default(true).notNull(),
  lock_after_approval:   boolean('lock_after_approval').default(true).notNull(),
  exempt_users:          text('exempt_users').array().notNull().default([]),
  created_at:            timestamp('created_at').defaultNow().notNull(),
  updated_at:            timestamp('updated_at').defaultNow().notNull(),
})

export type TimeTrackingConfig = typeof timeTrackingConfig.$inferSelect
export type TimeTrackingConfigInsert = typeof timeTrackingConfig.$inferInsert

// ─── Phase 23: In-App Notifications ──────────────────────────────────────────

export const appNotifications = pgTable('app_notifications', {
  id:         serial('id').primaryKey(),
  user_id:    text('user_id').notNull().default('default'),
  type:       text('type').notNull(),   // 'timesheet_reminder' | 'timesheet_overdue' | 'timesheet_approved' | 'timesheet_rejected'
  title:      text('title').notNull(),
  body:       text('body').notNull(),
  read:       boolean('read').notNull().default(false),
  data:       jsonb('data'),             // { project_id?, entry_ids?, reason? }
  created_at: timestamp('created_at').defaultNow().notNull(),
})

export type AppNotification = typeof appNotifications.$inferSelect
export type AppNotificationInsert = typeof appNotifications.$inferInsert

// ─── v2.0 Tables ─────────────────────────────────────────────────────────────

export const discoveryItems = pgTable('discovery_items', {
  id:              serial('id').primaryKey(),
  project_id:      integer('project_id').notNull().references(() => projects.id),
  source:          text('source').notNull().default('manual'),
  content:         text('content').notNull(),
  suggested_field: text('suggested_field'),
  suggested_value: text('suggested_value'),
  status:          discoveryItemStatusEnum('status').default('pending').notNull(),
  scan_timestamp:  timestamp('scan_timestamp'),
  source_url:      text('source_url'),
  source_excerpt:  text('source_excerpt'),                          // raw text snippet from source that triggered this item
  scan_id:         text('scan_id'),                                  // e.g. "scan-{projectId}-{timestamp}"; groups items from one scan run
  likely_duplicate: boolean('likely_duplicate').notNull().default(false), // set by Claude when item matches existing project data
  created_at:      timestamp('created_at').defaultNow().notNull(),
});

export const auditLog = pgTable('audit_log', {
  id:          serial('id').primaryKey(),
  entity_type: text('entity_type').notNull(),
  entity_id:   integer('entity_id'),
  action:      text('action').notNull(),
  actor_id:    text('actor_id'),
  before_json: jsonb('before_json'),
  after_json:  jsonb('after_json'),
  created_at:  timestamp('created_at').defaultNow().notNull(),
});

export const businessOutcomes = pgTable('business_outcomes', {
  id:              serial('id').primaryKey(),
  project_id:      integer('project_id').notNull().references(() => projects.id),
  title:           text('title').notNull(),
  track:           text('track').notNull(),
  description:     text('description'),
  delivery_status: deliveryStatusEnum('delivery_status').default('planned').notNull(),
  mapping_note:    text('mapping_note'),
  source:          text('source').notNull().default('manual'),
  source_artifact_id: integer('source_artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),
  discovery_source: text('discovery_source'),
  ingested_at:     timestamp('ingested_at'),
  created_at:      timestamp('created_at').defaultNow().notNull(),
});

export const e2eWorkflows = pgTable('e2e_workflows', {
  id:            serial('id').primaryKey(),
  project_id:    integer('project_id').notNull().references(() => projects.id),
  team_name:     text('team_name').notNull(),
  workflow_name: text('workflow_name').notNull(),
  source:        text('source').notNull().default('manual'),
  source_artifact_id: integer('source_artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),
  discovery_source: text('discovery_source'),
  ingested_at:   timestamp('ingested_at'),
  created_at:    timestamp('created_at').defaultNow().notNull(),
});

export const workflowSteps = pgTable('workflow_steps', {
  id:          serial('id').primaryKey(),
  workflow_id: integer('workflow_id').notNull().references(() => e2eWorkflows.id, { onDelete: 'cascade' }),
  label:       text('label').notNull(),
  track:       text('track'),
  status:      text('status'),
  position:        integer('position').default(0).notNull(),
  discovery_source: text('discovery_source'),
  created_at:      timestamp('created_at').defaultNow().notNull(),
});

export const focusAreas = pgTable('focus_areas', {
  id:              serial('id').primaryKey(),
  project_id:      integer('project_id').notNull().references(() => projects.id),
  title:           text('title').notNull(),
  tracks:          text('tracks'),
  why_it_matters:  text('why_it_matters'),
  current_status:  text('current_status'),
  next_step:       text('next_step'),
  bp_owner:        text('bp_owner'),
  customer_owner:  text('customer_owner'),
  source:          text('source').notNull().default('manual'),
  source_artifact_id: integer('source_artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),
  discovery_source: text('discovery_source'),
  ingested_at:     timestamp('ingested_at'),
  created_at:      timestamp('created_at').defaultNow().notNull(),
});

export const architectureIntegrations = pgTable('architecture_integrations', {
  id:                 serial('id').primaryKey(),
  project_id:         integer('project_id').notNull().references(() => projects.id),
  tool_name:          text('tool_name').notNull(),
  track:              text('track').notNull(),
  phase:              text('phase'),
  integration_group:  text('integration_group'),
  status:             integrationTrackStatusEnum('status').default('planned').notNull(),
  integration_method: text('integration_method'),
  notes:              text('notes'),
  source:             text('source').notNull().default('manual'),
  source_artifact_id: integer('source_artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),
  discovery_source:   text('discovery_source'),
  ingested_at:        timestamp('ingested_at'),
  created_at:         timestamp('created_at').defaultNow().notNull(),
});

export const beforeState = pgTable('before_state', {
  id:                      serial('id').primaryKey(),
  project_id:              integer('project_id').notNull().references(() => projects.id),
  aggregation_hub_name:    text('aggregation_hub_name'),
  alert_to_ticket_problem: text('alert_to_ticket_problem'),
  pain_points_json:        jsonb('pain_points_json').default([]).notNull(),
  source:                  text('source').notNull().default('manual'),
  created_at:              timestamp('created_at').defaultNow().notNull(),
});

export const teamOnboardingStatus = pgTable('team_onboarding_status', {
  id:                              serial('id').primaryKey(),
  project_id:                      integer('project_id').notNull().references(() => projects.id),
  team_name:                       text('team_name').notNull(),
  track:                           text('track'),
  ingest_status:                   integrationTrackStatusEnum('ingest_status'),
  correlation_status:              integrationTrackStatusEnum('correlation_status'),
  incident_intelligence_status:    integrationTrackStatusEnum('incident_intelligence_status'),
  sn_automation_status:            integrationTrackStatusEnum('sn_automation_status'),
  biggy_ai_status:                 integrationTrackStatusEnum('biggy_ai_status'),
  source:                          text('source').notNull().default('manual'),
  created_at:                      timestamp('created_at').defaultNow().notNull(),
});

export const scheduledJobs = pgTable('scheduled_jobs', {
  id:                serial('id').primaryKey(),
  name:              text('name').notNull(),
  skill_name:        text('skill_name').notNull(),
  cron_expression:   text('cron_expression').notNull(),
  enabled:           boolean('enabled').default(true).notNull(),
  timezone:          text('timezone'),
  skill_params_json: jsonb('skill_params_json').default({}).notNull(),
  project_id:        integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  last_run_at:       timestamp('last_run_at'),
  last_run_outcome:  jobRunOutcomeEnum('last_run_outcome'),
  run_history_json:  jsonb('run_history_json').default([]).notNull(),
  created_at:        timestamp('created_at').defaultNow().notNull(),
  updated_at:        timestamp('updated_at').defaultNow().notNull(),
});

// ─── Table: user_source_tokens (Phase 19.1) ─────────────────────────────────
export const userSourceTokens = pgTable('user_source_tokens', {
  id:            serial('id').primaryKey(),
  user_id:       text('user_id').notNull().default('default'),
  source:        text('source').notNull(),
  access_token:  text('access_token'),
  refresh_token: text('refresh_token').notNull(),
  expires_at:    timestamp('expires_at', { withTimezone: true }),
  email:         text('email'),
  created_at:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type UserSourceToken = typeof userSourceTokens.$inferSelect;
export type UserSourceTokenInsert = typeof userSourceTokens.$inferInsert;

// ─── better-auth tables — added in Phase 26 ──────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Custom Phase 26 columns — declared in additionalFields in lib/auth.ts
  role: text("role").notNull().default("user"),
  active: boolean("active").notNull().default(true),
  externalId: text("external_id"),  // nullable — for future Okta OIDC subject claim
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Invite table — added for email-based invite flow ─────────────────────────

export const invites = pgTable("invites", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Table: team_pathways (Phase ADR→Biggy bridge) ───────────────────────────

export const teamPathways = pgTable('team_pathways', {
  id:                 serial('id').primaryKey(),
  project_id:         integer('project_id').notNull().references(() => projects.id),
  team_name:          text('team_name').notNull(),
  route_steps:        jsonb('route_steps').notNull().default([]),  // [{label: string}]
  status:             integrationTrackStatusEnum('status').default('planned').notNull(),
  notes:              text('notes'),
  source:             text('source').notNull().default('manual'),
  source_artifact_id: integer('source_artifact_id').references(() => artifacts.id, { onDelete: 'set null' }),
  discovery_source:   text('discovery_source'),
  ingested_at:        timestamp('ingested_at'),
  created_at:         timestamp('created_at').defaultNow().notNull(),
})

export type TeamPathway = typeof teamPathways.$inferSelect

// ─── Extraction Jobs (Phase 31) ───────────────────────────────────────────────

export const extractionJobStatusEnum = pgEnum('extraction_job_status', [
  'pending', 'running', 'completed', 'failed',
]);

export const extractionJobs = pgTable('extraction_jobs', {
  id:                serial('id').primaryKey(),
  artifact_id:       integer('artifact_id').notNull().references(() => artifacts.id),
  project_id:        integer('project_id').notNull().references(() => projects.id),
  batch_id:          text('batch_id').notNull(),
  status:            extractionJobStatusEnum('status').default('pending').notNull(),
  progress_pct:      integer('progress_pct').default(0).notNull(),
  current_chunk:     integer('current_chunk').default(0).notNull(),
  total_chunks:      integer('total_chunks').default(0).notNull(),
  staged_items_json: jsonb('staged_items_json'),
  filtered_count:    integer('filtered_count').default(0).notNull(),
  coverage_json:     jsonb('coverage_json'),
  error_message:     text('error_message'),
  created_at:        timestamp('created_at').defaultNow().notNull(),
  updated_at:        timestamp('updated_at').defaultNow().notNull(),
});

export type ExtractionJob = typeof extractionJobs.$inferSelect;

// ─── v6.0 Tables ─────────────────────────────────────────────────────────────

// ─── WBS Items (Work Breakdown Structure) ────────────────────────────────────

export const wbsItems = pgTable('wbs_items', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  parent_id: integer('parent_id').references((): AnyPgColumn => wbsItems.id),
  level: integer('level').notNull(),
  name: text('name').notNull(),
  track: text('track').notNull(),
  status: wbsItemStatusEnum('status').default('not_started').notNull(),
  display_order: integer('display_order').default(0).notNull(),
  source_trace: text('source_trace'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type WbsItem = typeof wbsItems.$inferSelect;
export type WbsItemInsert = typeof wbsItems.$inferInsert;

// ─── WBS Task Assignments (join table) ───────────────────────────────────────

export const wbsTaskAssignments = pgTable('wbs_task_assignments', {
  id: serial('id').primaryKey(),
  wbs_item_id: integer('wbs_item_id').notNull().references(() => wbsItems.id),
  task_id: integer('task_id').notNull().references(() => tasks.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// ─── Team Engagement Sections ─────────────────────────────────────────────────

export const teamEngagementSections = pgTable('team_engagement_sections', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  content: text('content').default('').notNull(),
  display_order: integer('display_order').default(0).notNull(),
  source_trace: text('source_trace'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type TeamEngagementSection = typeof teamEngagementSections.$inferSelect;

// ─── Architecture Tracks ──────────────────────────────────────────────────────

export const archTracks = pgTable('arch_tracks', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  display_order: integer('display_order').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type ArchTrack = typeof archTracks.$inferSelect;

// ─── Architecture Nodes ───────────────────────────────────────────────────────

export const archNodes = pgTable('arch_nodes', {
  id: serial('id').primaryKey(),
  track_id: integer('track_id').notNull().references(() => archTracks.id),
  project_id: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  display_order: integer('display_order').default(0).notNull(),
  status: archNodeStatusEnum('status').default('planned').notNull(),
  notes: text('notes'),
  source_trace: text('source_trace'),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('arch_nodes_project_track_name_idx').on(t.project_id, t.track_id, t.name),
]);

export type ArchNode = typeof archNodes.$inferSelect;

// ─── Architecture Team Status ─────────────────────────────────────────────────

export const archTeamStatus = pgTable('arch_team_status', {
  id: serial('id').primaryKey(),
  project_id: integer('project_id').notNull().references(() => projects.id),
  team_name: text('team_name').notNull(),
  capability_stage: text('capability_stage').notNull(),
  status: text('status').default('not_started').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type ArchTeamStatus = typeof archTeamStatus.$inferSelect;

// ─── Project Dependencies ─────────────────────────────────────────────────────

export const projectDependencies = pgTable('project_dependencies', {
  id: serial('id').primaryKey(),
  source_project_id: integer('source_project_id').notNull().references(() => projects.id),
  depends_on_project_id: integer('depends_on_project_id').notNull().references(() => projects.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type ProjectDependency = typeof projectDependencies.$inferSelect;
