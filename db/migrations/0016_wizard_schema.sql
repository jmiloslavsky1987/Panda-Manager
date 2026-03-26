-- Phase 20 Plan 01: Wizard schema — add draft status + project fields
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- Drizzle handles this correctly via breakpoints.

ALTER TYPE "public"."project_status" ADD VALUE 'draft';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_date" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "end_date" text;
