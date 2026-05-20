-- Migration 0052: Incident Prevention Track support (Phase 87)
-- Adds incident_prevention JSONB key to active_tracks (default false),
-- backfills existing projects (preserves adr/biggy), and seeds
-- 'Incident Prevention Track' arch_track + 3 section nodes + Change Risk Console + 13 sub-capabilities.
-- Idempotent — safe to re-run (per-project IF EXISTS guard + NOT (active_tracks ? 'incident_prevention') guard).

-- 1. Schema default change: new projects start with all tracks OFF; wizard must opt in
ALTER TABLE projects
  ALTER COLUMN active_tracks SET DEFAULT '{"adr":false,"biggy":false,"incident_prevention":false}'::jsonb;

-- 2. Additive backfill for existing rows — preserves user's current adr/biggy values verbatim.
--    NOT (active_tracks ? 'incident_prevention') guard is MANDATORY: without it, re-running this
--    migration would silently overwrite a user's manually-set incident_prevention:true back to false.
UPDATE projects
  SET active_tracks = active_tracks || '{"incident_prevention":false}'::jsonb
  WHERE active_tracks ? 'adr'
    AND NOT (active_tracks ? 'incident_prevention');

-- 3. Seed Incident Prevention arch_tracks + arch_nodes for every existing project.
--    Per-project IF EXISTS guard makes the entire DO block idempotent.
DO $$
DECLARE
  proj_id integer;
  ip_track_id integer;
  section_di_id integer;
  section_re_id integer;
  section_dw_id integer;
BEGIN
  FOR proj_id IN (SELECT id FROM projects) LOOP
    -- Guard: skip if Incident Prevention Track already seeded for this project
    IF EXISTS (SELECT 1 FROM arch_tracks WHERE project_id = proj_id AND name = 'Incident Prevention Track') THEN
      CONTINUE;
    END IF;

    INSERT INTO arch_tracks (project_id, name, display_order)
      VALUES (proj_id, 'Incident Prevention Track', 30)
      RETURNING id INTO STRICT ip_track_id;

    -- 3 section nodes (parent_id=NULL, node_type='section')
    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, ip_track_id, 'Data Ingestion',        10, 'planned', 'section', 'migration')
      RETURNING id INTO STRICT section_di_id;

    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, ip_track_id, 'Risk Engine',           20, 'planned', 'section', 'migration')
      RETURNING id INTO STRICT section_re_id;

    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, ip_track_id, 'Decision & Write-Back', 30, 'planned', 'section', 'migration')
      RETURNING id INTO STRICT section_dw_id;

    -- Change Risk Console (parent_id=NULL, node_type='console', display_order=15 between sections 10 and 20)
    INSERT INTO arch_nodes (project_id, track_id, name, display_order, status, node_type, source_trace)
      VALUES (proj_id, ip_track_id, 'Change Risk Console', 15, 'planned', 'console', 'migration');

    -- Data Ingestion sub-capabilities (4)
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, ip_track_id, section_di_id, 'ITSM Connectors',               1, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_di_id, 'CMDB Connectors',               2, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_di_id, 'Monitoring Connectors',         3, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_di_id, 'Deployment History Connectors', 4, 'planned', 'sub-capability', 'migration');

    -- Risk Engine sub-capabilities (5 — maps 1:1 to the 5-category weighted risk model)
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, ip_track_id, section_re_id, 'Change History Risk',         1, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_re_id, 'Blast Radius Risk',           2, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_re_id, 'CI Criticality Risk',         3, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_re_id, 'Timing & Freeze Window Risk', 4, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_re_id, 'Team Performance Risk',       5, 'planned', 'sub-capability', 'migration');

    -- Decision & Write-Back sub-capabilities (4)
    INSERT INTO arch_nodes (project_id, track_id, parent_id, name, display_order, status, node_type, source_trace) VALUES
      (proj_id, ip_track_id, section_dw_id, 'Risk Threshold Rules',                1, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_dw_id, 'ITSM Write-Back (ServiceNow / JSM)',  2, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_dw_id, 'CAB Notifications',                   3, 'planned', 'sub-capability', 'migration'),
      (proj_id, ip_track_id, section_dw_id, 'Reporting & Dashboards',              4, 'planned', 'sub-capability', 'migration');

  END LOOP;
END $$;
