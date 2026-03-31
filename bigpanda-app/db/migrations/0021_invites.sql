-- Migration 0021: invites table (Phase 26.1 — Email-Based Invite Flow)
-- Applied manually via psql: psql -d bigpanda_app -f db/migrations/0021_invites.sql
-- Requires: 0020_users_auth.sql (users table must exist)

CREATE TABLE IF NOT EXISTS "invites" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "role" text DEFAULT 'user' NOT NULL,
  "token" text NOT NULL,
  "invited_by" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "invites_token_unique" UNIQUE("token"),
  CONSTRAINT "invites_invited_by_users_id_fk"
    FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE cascade
);
