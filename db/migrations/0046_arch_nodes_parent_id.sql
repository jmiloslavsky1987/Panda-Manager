-- Migration 0046: Add parent_id and node_type to arch_nodes
-- Adds hierarchical structure support: section nodes contain sub-capability nodes
-- Phase 83: Architecture Sub-Capability Columns

ALTER TABLE arch_nodes ADD COLUMN parent_id integer REFERENCES arch_nodes(id);
ALTER TABLE arch_nodes ADD COLUMN node_type text NOT NULL DEFAULT 'sub-capability';

-- Migrate existing projects: insert section nodes and sub-capability nodes per ADR Track project
DO $$
DECLARE
  proj_id integer;
  adr_track_id integer;
  section_ai_id integer;
  section_ii_id integer;
  section_wa_id integer;
BEGIN
  FOR proj_id IN (SELECT DISTINCT project_id FROM arch_tracks WHERE name = 'ADR Track') LOOP
    SELECT id INTO STRICT adr_track_id FROM arch_tracks WHERE project_id = proj_id AND name = 'ADR Track';

    -- Delete old flat section nodes first (avoids unique index conflict on re-insert)
    DELETE FROM arch_nodes
      WHERE project_id = proj_id AND track_id = adr_track_id
        AND name IN ('Alert Intelligence', 'Incident Intelligence', 'Workflow Automation');

    -- Insert section nodes (display_order 10, 20, 30 for correct left-to-right visual order)
    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, adr_track_id, 'Alert Intelligence', 10, 'planned', 'section', 'migration')
      RETURNING id INTO STRICT section_ai_id;

    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, adr_track_id, 'Incident Intelligence', 20, 'planned', 'section', 'migration')
      RETURNING id INTO STRICT section_ii_id;

    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, adr_track_id, 'Workflow Automation', 30, 'planned', 'section', 'migration')
      RETURNING id INTO STRICT section_wa_id;

    -- Update Console node_type (Console display_order stays as-is; sits between II at 20 and WA at 30)
    UPDATE arch_nodes SET node_type = 'console'
      WHERE project_id = proj_id AND track_id = adr_track_id AND name = 'Console';

    -- Insert sub-capability nodes under Alert Intelligence
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, adr_track_id, section_ai_id, 'Monitoring Integrations', 1, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ai_id, 'Alert Normalization',     2, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ai_id, 'Alert Enrichment',        3, 'planned', 'sub-capability', 'migration');

    -- Insert sub-capability nodes under Incident Intelligence
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, adr_track_id, section_ii_id, 'Alert Correlation',       1, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ii_id, 'Incident Enrichment',     2, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ii_id, 'Incident Classification', 3, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_ii_id, 'Suggested Root Cause',    4, 'planned', 'sub-capability', 'migration');

    -- Insert sub-capability nodes under Workflow Automation
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, adr_track_id, section_wa_id, 'Environments',                     1, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_wa_id, 'Automated Incident Creation',      2, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_wa_id, 'Automated Incident Notification',  3, 'planned', 'sub-capability', 'migration'),
      (proj_id, adr_track_id, section_wa_id, 'Automated Incident Remediation',   4, 'planned', 'sub-capability', 'migration');

  END LOOP;
END $$;

-- Remap architecture_integrations phase values to sub-capability column names
UPDATE architecture_integrations SET phase = 'Monitoring Integrations' WHERE phase = 'Alert Intelligence';
DELETE FROM architecture_integrations WHERE phase IN ('Incident Intelligence', 'Workflow Automation');
