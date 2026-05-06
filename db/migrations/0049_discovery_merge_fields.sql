-- Phase 84.1: Add entity_match and suggested_position to discovery_items
-- entity_match: name of existing entity this item should enrich (null = create new)
-- suggested_position: JSON string { "after": "<step label>" } for workflow_step merge
ALTER TABLE discovery_items ADD COLUMN entity_match text;
ALTER TABLE discovery_items ADD COLUMN suggested_position text;
