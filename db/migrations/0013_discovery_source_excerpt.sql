-- Migration 0013: Extend discovery_items for Review Queue display
-- source_excerpt: raw text snippet from source that triggered the discovery item
-- scan_id: groups items from the same scan run (used for dedup)
ALTER TABLE discovery_items ADD COLUMN IF NOT EXISTS source_excerpt TEXT;
ALTER TABLE discovery_items ADD COLUMN IF NOT EXISTS scan_id TEXT;
