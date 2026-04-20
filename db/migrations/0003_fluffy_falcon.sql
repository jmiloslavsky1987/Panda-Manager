CREATE TYPE "public"."arch_node_status" AS ENUM('planned', 'in_progress', 'live');--> statement-breakpoint
CREATE TYPE "public"."extraction_job_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."milestone_status" AS ENUM('not_started', 'in_progress', 'completed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."project_member_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."risk_status" AS ENUM('open', 'mitigated', 'resolved', 'accepted');--> statement-breakpoint
CREATE TYPE "public"."wbs_item_status" AS ENUM('not_started', 'in_progress', 'complete');--> statement-breakpoint
ALTER TYPE "public"."skill_run_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "arch_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"track_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "arch_node_status" DEFAULT 'planned' NOT NULL,
	"notes" text,
	"source_trace" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arch_team_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"team_name" text NOT NULL,
	"capability_stage" text NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arch_tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"artifact_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"batch_id" text NOT NULL,
	"status" "extraction_job_status" DEFAULT 'pending' NOT NULL,
	"progress_pct" integer DEFAULT 0 NOT NULL,
	"current_chunk" integer DEFAULT 0 NOT NULL,
	"total_chunks" integer DEFAULT 0 NOT NULL,
	"staged_items_json" jsonb,
	"filtered_count" integer DEFAULT 0 NOT NULL,
	"coverage_json" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_project_id" integer NOT NULL,
	"depends_on_project_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" "project_member_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_engagement_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"source_trace" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_pathways" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"team_name" text NOT NULL,
	"route_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "integration_track_status" DEFAULT 'planned' NOT NULL,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_artifact_id" integer,
	"discovery_source" text,
	"ingested_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wbs_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"parent_id" integer,
	"level" integer NOT NULL,
	"name" text NOT NULL,
	"track" text NOT NULL,
	"status" "wbs_item_status" DEFAULT 'not_started' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"source_trace" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wbs_task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"wbs_item_id" integer NOT NULL,
	"task_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "status" SET DATA TYPE "public"."milestone_status" USING "status"::"public"."milestone_status";--> statement-breakpoint
ALTER TABLE "risks" ALTER COLUMN "status" SET DATA TYPE "public"."risk_status" USING "status"::"public"."risk_status";--> statement-breakpoint
ALTER TABLE "architecture_integrations" ADD COLUMN "integration_group" text;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "track" text;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "integration_type" text;--> statement-breakpoint
ALTER TABLE "onboarding_phases" ADD COLUMN "track" text;--> statement-breakpoint
ALTER TABLE "onboarding_steps" ADD COLUMN "track" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "seeded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "exec_action_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "user_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "arch_nodes" ADD CONSTRAINT "arch_nodes_track_id_arch_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."arch_tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arch_nodes" ADD CONSTRAINT "arch_nodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arch_team_status" ADD CONSTRAINT "arch_team_status_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arch_tracks" ADD CONSTRAINT "arch_tracks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_artifact_id_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_jobs" ADD CONSTRAINT "extraction_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_source_project_id_projects_id_fk" FOREIGN KEY ("source_project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_dependencies" ADD CONSTRAINT "project_dependencies_depends_on_project_id_projects_id_fk" FOREIGN KEY ("depends_on_project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_engagement_sections" ADD CONSTRAINT "team_engagement_sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_pathways" ADD CONSTRAINT "team_pathways_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_pathways" ADD CONSTRAINT "team_pathways_source_artifact_id_artifacts_id_fk" FOREIGN KEY ("source_artifact_id") REFERENCES "public"."artifacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wbs_items" ADD CONSTRAINT "wbs_items_parent_id_wbs_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."wbs_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wbs_task_assignments" ADD CONSTRAINT "wbs_task_assignments_wbs_item_id_wbs_items_id_fk" FOREIGN KEY ("wbs_item_id") REFERENCES "public"."wbs_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wbs_task_assignments" ADD CONSTRAINT "wbs_task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "arch_nodes_project_track_name_idx" ON "arch_nodes" USING btree ("project_id","track_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "project_members_project_user_idx" ON "project_members" USING btree ("project_id","user_id");--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;