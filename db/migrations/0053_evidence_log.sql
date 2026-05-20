-- Migration 0053: Evidence Log table for Business Outcome progress entries
-- Phase 88.1 Teams Tab Redesign — adds append-only Evidence Log linked to business_outcomes.
-- Includes a partial UNIQUE index for context_upload idempotency (Plan 04 applier re-runs / BullMQ retries).

CREATE TABLE IF NOT EXISTS evidence_log (
  id SERIAL PRIMARY KEY,
  business_outcome_id INTEGER NOT NULL REFERENCES business_outcomes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  source TEXT NOT NULL,
  source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  ingested_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  CONSTRAINT evidence_log_source_check CHECK (source IN ('manual', 'context_upload'))
);

CREATE INDEX IF NOT EXISTS evidence_log_outcome_idx ON evidence_log(business_outcome_id);
CREATE INDEX IF NOT EXISTS evidence_log_date_idx ON evidence_log(date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_log_idem_idx
  ON evidence_log (business_outcome_id, source_artifact_id, text)
  WHERE source = 'context_upload';

CREATE OR REPLACE FUNCTION enforce_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only; UPDATE/DELETE not permitted', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evidence_log_append_only ON evidence_log;
CREATE TRIGGER evidence_log_append_only
  BEFORE UPDATE OR DELETE ON evidence_log
  FOR EACH ROW EXECUTE FUNCTION enforce_append_only();
