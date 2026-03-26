-- Migration 0012: Add ingestion source attribution columns to all entity tables
-- Required by ING-09: source_artifact_id links each ingested record back to its source artifact
-- ingested_at records when the item was written from the ingestion pipeline

ALTER TABLE actions                   ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE actions                   ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE risks                     ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE risks                     ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE milestones                ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE milestones                ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE key_decisions             ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE key_decisions             ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE engagement_history        ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE engagement_history        ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE stakeholders              ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE stakeholders              ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE tasks                     ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE tasks                     ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE business_outcomes         ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE business_outcomes         ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE focus_areas               ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE focus_areas               ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE architecture_integrations ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE architecture_integrations ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
ALTER TABLE e2e_workflows             ADD COLUMN IF NOT EXISTS source_artifact_id INTEGER REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE e2e_workflows             ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP;
