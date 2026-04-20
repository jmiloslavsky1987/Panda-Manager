-- Migration: 0036_risk_milestone_status_enums
-- Add pgEnum types for risks.status and milestones.status columns
-- Forward-only migration with data normalization

-- Step 1: Create enum types
CREATE TYPE "public"."risk_status" AS ENUM('open', 'mitigated', 'resolved', 'accepted');
CREATE TYPE "public"."milestone_status" AS ENUM('not_started', 'in_progress', 'completed', 'blocked');

-- Step 2: Normalize existing data BEFORE adding enum constraint
-- Normalize risks.status: null stays null, valid values stay, anything else → null
UPDATE "risks" SET "status" = CASE
  WHEN "status" IN ('open', 'mitigated', 'resolved', 'accepted') THEN "status"
  ELSE NULL
END WHERE "status" IS NOT NULL AND "status" NOT IN ('open', 'mitigated', 'resolved', 'accepted');

-- Normalize milestones.status: null stays null, valid values stay, anything else → 'not_started'
UPDATE "milestones" SET "status" = CASE
  WHEN "status" IN ('not_started', 'in_progress', 'completed', 'blocked') THEN "status"
  ELSE 'not_started'
END WHERE "status" IS NOT NULL AND "status" NOT IN ('not_started', 'in_progress', 'completed', 'blocked');

-- Step 3: Alter columns to use the new enum types
ALTER TABLE "risks" ALTER COLUMN "status" SET DATA TYPE "public"."risk_status" USING "status"::"public"."risk_status";
ALTER TABLE "milestones" ALTER COLUMN "status" SET DATA TYPE "public"."milestone_status" USING "status"::"public"."milestone_status";
