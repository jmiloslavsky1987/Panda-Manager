CREATE TYPE public.action_status AS ENUM (
    'open',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TYPE public.arch_node_status AS ENUM (
    'planned',
    'in_progress',
    'live'
);

CREATE TYPE public.delivery_status AS ENUM (
    'live',
    'in_progress',
    'blocked',
    'planned'
);

CREATE TYPE public.discovery_item_status AS ENUM (
    'pending',
    'approved',
    'dismissed'
);

CREATE TYPE public.draft_status AS ENUM (
    'pending',
    'dismissed',
    'sent'
);

CREATE TYPE public.extraction_job_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed'
);

CREATE TYPE public.ingestion_status AS ENUM (
    'pending',
    'extracting',
    'preview',
    'approved',
    'failed'
);

CREATE TYPE public.integration_status AS ENUM (
    'not-connected',
    'configured',
    'validated',
    'production',
    'blocked'
);

CREATE TYPE public.integration_track_status AS ENUM (
    'live',
    'in_progress',
    'pilot',
    'planned'
);

CREATE TYPE public.job_run_outcome AS ENUM (
    'success',
    'failure',
    'partial'
);

CREATE TYPE public.job_run_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'skipped'
);

CREATE TYPE public.onboarding_step_status AS ENUM (
    'not-started',
    'in-progress',
    'complete',
    'blocked'
);

CREATE TYPE public.output_status AS ENUM (
    'running',
    'complete',
    'failed'
);

CREATE TYPE public.project_member_role AS ENUM (
    'admin',
    'user'
);

CREATE TYPE public.project_status AS ENUM (
    'active',
    'archived',
    'closed',
    'draft'
);

CREATE TYPE public.severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE public.skill_run_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed'
);

CREATE TYPE public.wbs_item_status AS ENUM (
    'not_started',
    'in_progress',
    'complete'
);

CREATE FUNCTION public.enforce_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only: UPDATE is prohibited. Entry ID: %',
    TG_TABLE_NAME, OLD.id;
  RETURN NULL;
END;
$$;

CREATE FUNCTION public.tsvector_update_actions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.notes, '')        || ' ' ||
    coalesce(NEW.owner, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_artifacts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.name, '')        || ' ' ||
    coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_engagement_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_integrations() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.tool, '')     || ' ' ||
    coalesce(NEW.notes, '')    || ' ' ||
    coalesce(NEW.category, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_key_decisions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.decision, '') || ' ' ||
    coalesce(NEW.context, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_knowledge_base() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.title, '')   || ' ' ||
    coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_onboarding_phases() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.name, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_onboarding_steps() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.name, '')        || ' ' ||
    coalesce(NEW.owner, '')       || ' ' ||
    coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_risks() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.mitigation, '')  || ' ' ||
    coalesce(NEW.owner, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_stakeholders() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.name, '')  || ' ' ||
    coalesce(NEW.role, '')  || ' ' ||
    coalesce(NEW.notes, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_tasks() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.title, '')       || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.owner, ''));
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tsvector_update_time_entries() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.search_vec := to_tsvector('english',
    coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$;

CREATE TABLE public.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);

CREATE SEQUENCE public.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.__drizzle_migrations_id_seq OWNED BY public.__drizzle_migrations.id;

CREATE TABLE public.accounts (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    expires_at timestamp without time zone,
    password text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.actions (
    id integer NOT NULL,
    project_id integer NOT NULL,
    external_id text NOT NULL,
    description text NOT NULL,
    owner text,
    due text,
    status public.action_status DEFAULT 'open'::public.action_status NOT NULL,
    last_updated text,
    notes text,
    type text DEFAULT 'action'::text NOT NULL,
    source text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text
);

ALTER TABLE ONLY public.actions FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.actions_id_seq OWNED BY public.actions.id;

CREATE TABLE public.app_notifications (
    id integer NOT NULL,
    user_id text DEFAULT 'default'::text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.app_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.app_notifications_id_seq OWNED BY public.app_notifications.id;

CREATE TABLE public.arch_nodes (
    id integer NOT NULL,
    track_id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    status public.arch_node_status DEFAULT 'planned'::public.arch_node_status NOT NULL,
    notes text,
    source_trace text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.arch_nodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.arch_nodes_id_seq OWNED BY public.arch_nodes.id;

CREATE TABLE public.arch_team_status (
    id integer NOT NULL,
    project_id integer NOT NULL,
    team_name text NOT NULL,
    capability_stage text NOT NULL,
    status text DEFAULT 'not_started'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.arch_team_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.arch_team_status_id_seq OWNED BY public.arch_team_status.id;

CREATE TABLE public.arch_tracks (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.arch_tracks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.arch_tracks_id_seq OWNED BY public.arch_tracks.id;

CREATE TABLE public.architecture_integrations (
    id integer NOT NULL,
    project_id integer NOT NULL,
    tool_name text NOT NULL,
    track text NOT NULL,
    phase text,
    status public.integration_track_status DEFAULT 'planned'::public.integration_track_status NOT NULL,
    integration_method text,
    notes text,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text,
    integration_group text
);

ALTER TABLE ONLY public.architecture_integrations FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.architecture_integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.architecture_integrations_id_seq OWNED BY public.architecture_integrations.id;

CREATE TABLE public.artifacts (
    id integer NOT NULL,
    project_id integer NOT NULL,
    external_id text NOT NULL,
    name text NOT NULL,
    description text,
    status text,
    owner text,
    source text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    ingestion_status public.ingestion_status,
    ingestion_log_json jsonb,
    discovery_source text
);

ALTER TABLE ONLY public.artifacts FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.artifacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.artifacts_id_seq OWNED BY public.artifacts.id;

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer,
    action text NOT NULL,
    actor_id text,
    before_json jsonb,
    after_json jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;

CREATE TABLE public.before_state (
    id integer NOT NULL,
    project_id integer NOT NULL,
    aggregation_hub_name text,
    alert_to_ticket_problem text,
    pain_points_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.before_state FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.before_state_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.before_state_id_seq OWNED BY public.before_state.id;

CREATE TABLE public.business_outcomes (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text NOT NULL,
    track text NOT NULL,
    description text,
    delivery_status public.delivery_status DEFAULT 'planned'::public.delivery_status NOT NULL,
    mapping_note text,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text
);

ALTER TABLE ONLY public.business_outcomes FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.business_outcomes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.business_outcomes_id_seq OWNED BY public.business_outcomes.id;

CREATE TABLE public.discovery_items (
    id integer NOT NULL,
    project_id integer NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    content text NOT NULL,
    suggested_field text,
    suggested_value text,
    status public.discovery_item_status DEFAULT 'pending'::public.discovery_item_status NOT NULL,
    scan_timestamp timestamp without time zone,
    source_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    source_excerpt text,
    scan_id text,
    likely_duplicate boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.discovery_items FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.discovery_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.discovery_items_id_seq OWNED BY public.discovery_items.id;

CREATE TABLE public.drafts (
    id integer NOT NULL,
    project_id integer,
    run_id integer,
    draft_type text NOT NULL,
    recipient text,
    subject text,
    content text NOT NULL,
    status public.draft_status DEFAULT 'pending'::public.draft_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.drafts_id_seq OWNED BY public.drafts.id;

CREATE TABLE public.e2e_workflows (
    id integer NOT NULL,
    project_id integer NOT NULL,
    team_name text NOT NULL,
    workflow_name text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text
);

ALTER TABLE ONLY public.e2e_workflows FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.e2e_workflows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.e2e_workflows_id_seq OWNED BY public.e2e_workflows.id;

CREATE TABLE public.engagement_history (
    id integer NOT NULL,
    project_id integer NOT NULL,
    date text,
    content text NOT NULL,
    source text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text
);

ALTER TABLE ONLY public.engagement_history FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.engagement_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.engagement_history_id_seq OWNED BY public.engagement_history.id;

CREATE TABLE public.extraction_jobs (
    id integer NOT NULL,
    artifact_id integer NOT NULL,
    project_id integer NOT NULL,
    batch_id text NOT NULL,
    status public.extraction_job_status DEFAULT 'pending'::public.extraction_job_status NOT NULL,
    progress_pct integer DEFAULT 0 NOT NULL,
    current_chunk integer DEFAULT 0 NOT NULL,
    total_chunks integer DEFAULT 0 NOT NULL,
    staged_items_json jsonb,
    filtered_count integer DEFAULT 0 NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    coverage_json jsonb,
    proposed_changes_json jsonb
);

CREATE SEQUENCE public.extraction_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.extraction_jobs_id_seq OWNED BY public.extraction_jobs.id;

CREATE TABLE public.focus_areas (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text NOT NULL,
    tracks text,
    why_it_matters text,
    current_status text,
    next_step text,
    bp_owner text,
    customer_owner text,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text
);

ALTER TABLE ONLY public.focus_areas FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.focus_areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.focus_areas_id_seq OWNED BY public.focus_areas.id;

CREATE TABLE public.integrations (
    id integer NOT NULL,
    project_id integer NOT NULL,
    tool text NOT NULL,
    category text,
    status public.integration_status DEFAULT 'not-connected'::public.integration_status NOT NULL,
    color text,
    notes text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    track text,
    integration_type text
);

CREATE SEQUENCE public.integrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.integrations_id_seq OWNED BY public.integrations.id;

CREATE TABLE public.invites (
    id text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    token text NOT NULL,
    invited_by text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.job_runs (
    id integer NOT NULL,
    job_name text NOT NULL,
    status public.job_run_status DEFAULT 'pending'::public.job_run_status NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    error_message text,
    triggered_by text DEFAULT 'scheduled'::text NOT NULL
);

CREATE SEQUENCE public.job_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.job_runs_id_seq OWNED BY public.job_runs.id;

CREATE TABLE public.key_decisions (
    id integer NOT NULL,
    project_id integer NOT NULL,
    date text,
    decision text NOT NULL,
    context text,
    source text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text
);

ALTER TABLE ONLY public.key_decisions FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.key_decisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.key_decisions_id_seq OWNED BY public.key_decisions.id;

CREATE TABLE public.knowledge_base (
    id integer NOT NULL,
    project_id integer,
    title text NOT NULL,
    content text NOT NULL,
    source_trace text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    linked_risk_id integer,
    linked_history_id integer,
    linked_date text,
    search_vec tsvector
);

CREATE SEQUENCE public.knowledge_base_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.knowledge_base_id_seq OWNED BY public.knowledge_base.id;

CREATE TABLE public.milestones (
    id integer NOT NULL,
    project_id integer NOT NULL,
    external_id text NOT NULL,
    name text NOT NULL,
    status text,
    target text,
    date text,
    notes text,
    owner text,
    source text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text
);

ALTER TABLE ONLY public.milestones FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.milestones_id_seq OWNED BY public.milestones.id;

CREATE TABLE public.onboarding_phases (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    track text
);

CREATE SEQUENCE public.onboarding_phases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.onboarding_phases_id_seq OWNED BY public.onboarding_phases.id;

CREATE TABLE public.onboarding_steps (
    id integer NOT NULL,
    phase_id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    description text,
    status public.onboarding_step_status DEFAULT 'not-started'::public.onboarding_step_status NOT NULL,
    owner text,
    dependencies text[] DEFAULT '{}'::text[],
    updates jsonb DEFAULT '[]'::jsonb NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    track text
);

CREATE SEQUENCE public.onboarding_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.onboarding_steps_id_seq OWNED BY public.onboarding_steps.id;

CREATE TABLE public.outputs (
    id integer NOT NULL,
    project_id integer,
    skill_name text NOT NULL,
    idempotency_key text NOT NULL,
    status public.output_status DEFAULT 'running'::public.output_status NOT NULL,
    content text,
    filename text,
    filepath text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    archived boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.outputs FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.outputs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.outputs_id_seq OWNED BY public.outputs.id;

CREATE TABLE public.plan_templates (
    id integer NOT NULL,
    name text NOT NULL,
    template_type text,
    data text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.plan_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.plan_templates_id_seq OWNED BY public.plan_templates.id;

CREATE TABLE public.project_dependencies (
    id integer NOT NULL,
    source_project_id integer NOT NULL,
    depends_on_project_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.project_dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.project_dependencies_id_seq OWNED BY public.project_dependencies.id;

CREATE TABLE public.project_members (
    id integer NOT NULL,
    project_id integer NOT NULL,
    user_id text NOT NULL,
    role public.project_member_role DEFAULT 'user'::public.project_member_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.project_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.project_members_id_seq OWNED BY public.project_members.id;

CREATE TABLE public.projects (
    id integer NOT NULL,
    name text NOT NULL,
    customer text NOT NULL,
    status public.project_status DEFAULT 'active'::public.project_status NOT NULL,
    overall_status text,
    status_summary text,
    go_live_target text,
    last_updated text,
    source_file text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    sprint_summary text,
    sprint_summary_at timestamp with time zone,
    weekly_hour_target numeric(5,2),
    description text,
    start_date text,
    end_date text,
    seeded boolean DEFAULT false NOT NULL,
    exec_action_required boolean DEFAULT false NOT NULL
);

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;

CREATE TABLE public.risks (
    id integer NOT NULL,
    project_id integer NOT NULL,
    external_id text NOT NULL,
    description text NOT NULL,
    severity public.severity,
    owner text,
    mitigation text,
    status text,
    last_updated text,
    source text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text
);

ALTER TABLE ONLY public.risks FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.risks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.risks_id_seq OWNED BY public.risks.id;

CREATE TABLE public.scheduled_jobs (
    id integer NOT NULL,
    name text NOT NULL,
    skill_name text NOT NULL,
    cron_expression text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    timezone text,
    skill_params_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_run_at timestamp without time zone,
    last_run_outcome public.job_run_outcome,
    run_history_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    project_id integer
);

CREATE SEQUENCE public.scheduled_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.scheduled_jobs_id_seq OWNED BY public.scheduled_jobs.id;

CREATE TABLE public.sessions (
    id text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL
);

CREATE TABLE public.skill_run_chunks (
    id integer NOT NULL,
    run_id integer NOT NULL,
    seq integer NOT NULL,
    chunk text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.skill_run_chunks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.skill_run_chunks_id_seq OWNED BY public.skill_run_chunks.id;

CREATE TABLE public.skill_runs (
    id integer NOT NULL,
    run_id text NOT NULL,
    project_id integer,
    skill_name text NOT NULL,
    status public.skill_run_status DEFAULT 'pending'::public.skill_run_status NOT NULL,
    input text,
    full_output text,
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.skill_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.skill_runs_id_seq OWNED BY public.skill_runs.id;

CREATE TABLE public.stakeholders (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    role text,
    company text,
    email text,
    slack_id text,
    notes text,
    source text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    source_artifact_id integer,
    ingested_at timestamp without time zone,
    discovery_source text
);

ALTER TABLE ONLY public.stakeholders FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.stakeholders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.stakeholders_id_seq OWNED BY public.stakeholders.id;

CREATE TABLE public.tasks (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title text NOT NULL,
    description text,
    owner text,
    due text,
    priority text,
    type text,
    phase text,
    workstream_id integer,
    status text DEFAULT 'todo'::text NOT NULL,
    source text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    blocked_by integer,
    milestone_id integer,
    start_date text,
    search_vec tsvector,
    source_artifact_id integer,
    ingested_at timestamp without time zone
);

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;

CREATE TABLE public.team_engagement_sections (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    source_trace text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.team_engagement_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.team_engagement_sections_id_seq OWNED BY public.team_engagement_sections.id;

CREATE TABLE public.team_onboarding_status (
    id integer NOT NULL,
    project_id integer NOT NULL,
    team_name text NOT NULL,
    track text,
    ingest_status public.integration_track_status,
    correlation_status public.integration_track_status,
    incident_intelligence_status public.integration_track_status,
    sn_automation_status public.integration_track_status,
    biggy_ai_status public.integration_track_status,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.team_onboarding_status FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.team_onboarding_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.team_onboarding_status_id_seq OWNED BY public.team_onboarding_status.id;

CREATE TABLE public.team_pathways (
    id integer NOT NULL,
    project_id integer NOT NULL,
    team_name text NOT NULL,
    route_steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    status public.integration_track_status DEFAULT 'planned'::public.integration_track_status NOT NULL,
    notes text,
    source text DEFAULT 'manual'::text NOT NULL,
    source_artifact_id integer,
    discovery_source text,
    ingested_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.team_pathways FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.team_pathways_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.team_pathways_id_seq OWNED BY public.team_pathways.id;

CREATE TABLE public.time_entries (
    id integer NOT NULL,
    project_id integer NOT NULL,
    date text NOT NULL,
    hours text NOT NULL,
    description text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    search_vec tsvector,
    submitted_on timestamp without time zone,
    submitted_by text,
    approved_on timestamp without time zone,
    approved_by text,
    rejected_on timestamp without time zone,
    rejected_by text,
    locked boolean DEFAULT false NOT NULL,
    user_id text DEFAULT 'default'::text NOT NULL
);

CREATE SEQUENCE public.time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.time_entries_id_seq OWNED BY public.time_entries.id;

CREATE TABLE public.time_tracking_config (
    id integer NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    weekly_capacity_hours numeric(5,2) DEFAULT 40 NOT NULL,
    working_days text[] DEFAULT ARRAY['Mon'::text, 'Tue'::text, 'Wed'::text, 'Thu'::text, 'Fri'::text] NOT NULL,
    submission_due_day text DEFAULT 'Friday'::text NOT NULL,
    submission_due_time text DEFAULT '17:00'::text NOT NULL,
    reminder_days_before integer DEFAULT 1 NOT NULL,
    categories text[] DEFAULT ARRAY['Development'::text, 'Meetings'::text, 'QA'::text, 'Discovery'::text, 'Admin'::text] NOT NULL,
    restrict_to_assigned boolean DEFAULT false NOT NULL,
    active_projects_only boolean DEFAULT true NOT NULL,
    lock_after_approval boolean DEFAULT true NOT NULL,
    exempt_users text[] DEFAULT ARRAY[]::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.time_tracking_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.time_tracking_config_id_seq OWNED BY public.time_tracking_config.id;

CREATE TABLE public.user_source_tokens (
    id integer NOT NULL,
    user_id text DEFAULT 'default'::text NOT NULL,
    source text NOT NULL,
    access_token text,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.user_source_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_source_tokens_id_seq OWNED BY public.user_source_tokens.id;

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    external_id text
);

CREATE TABLE public.verifications (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.wbs_items (
    id integer NOT NULL,
    project_id integer NOT NULL,
    parent_id integer,
    level integer NOT NULL,
    name text NOT NULL,
    track text NOT NULL,
    status public.wbs_item_status DEFAULT 'not_started'::public.wbs_item_status NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    source_trace text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.wbs_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.wbs_items_id_seq OWNED BY public.wbs_items.id;

CREATE TABLE public.wbs_task_assignments (
    id integer NOT NULL,
    wbs_item_id integer NOT NULL,
    task_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.wbs_task_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.wbs_task_assignments_id_seq OWNED BY public.wbs_task_assignments.id;

CREATE TABLE public.workflow_steps (
    id integer NOT NULL,
    workflow_id integer NOT NULL,
    label text NOT NULL,
    track text,
    status text,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    discovery_source text
);

ALTER TABLE ONLY public.workflow_steps FORCE ROW LEVEL SECURITY;

CREATE SEQUENCE public.workflow_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.workflow_steps_id_seq OWNED BY public.workflow_steps.id;

CREATE TABLE public.workstreams (
    id integer NOT NULL,
    project_id integer NOT NULL,
    name text NOT NULL,
    track text,
    current_status text,
    lead text,
    last_updated text,
    state text,
    source text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    percent_complete integer
);

CREATE SEQUENCE public.workstreams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.workstreams_id_seq OWNED BY public.workstreams.id;
ALTER TABLE ONLY public.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('public.__drizzle_migrations_id_seq'::regclass);

ALTER TABLE ONLY public.actions ALTER COLUMN id SET DEFAULT nextval('public.actions_id_seq'::regclass);

ALTER TABLE ONLY public.app_notifications ALTER COLUMN id SET DEFAULT nextval('public.app_notifications_id_seq'::regclass);

ALTER TABLE ONLY public.arch_nodes ALTER COLUMN id SET DEFAULT nextval('public.arch_nodes_id_seq'::regclass);

ALTER TABLE ONLY public.arch_team_status ALTER COLUMN id SET DEFAULT nextval('public.arch_team_status_id_seq'::regclass);

ALTER TABLE ONLY public.arch_tracks ALTER COLUMN id SET DEFAULT nextval('public.arch_tracks_id_seq'::regclass);

ALTER TABLE ONLY public.architecture_integrations ALTER COLUMN id SET DEFAULT nextval('public.architecture_integrations_id_seq'::regclass);

ALTER TABLE ONLY public.artifacts ALTER COLUMN id SET DEFAULT nextval('public.artifacts_id_seq'::regclass);

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);

ALTER TABLE ONLY public.before_state ALTER COLUMN id SET DEFAULT nextval('public.before_state_id_seq'::regclass);

ALTER TABLE ONLY public.business_outcomes ALTER COLUMN id SET DEFAULT nextval('public.business_outcomes_id_seq'::regclass);

ALTER TABLE ONLY public.discovery_items ALTER COLUMN id SET DEFAULT nextval('public.discovery_items_id_seq'::regclass);

ALTER TABLE ONLY public.drafts ALTER COLUMN id SET DEFAULT nextval('public.drafts_id_seq'::regclass);

ALTER TABLE ONLY public.e2e_workflows ALTER COLUMN id SET DEFAULT nextval('public.e2e_workflows_id_seq'::regclass);

ALTER TABLE ONLY public.engagement_history ALTER COLUMN id SET DEFAULT nextval('public.engagement_history_id_seq'::regclass);

ALTER TABLE ONLY public.extraction_jobs ALTER COLUMN id SET DEFAULT nextval('public.extraction_jobs_id_seq'::regclass);

ALTER TABLE ONLY public.focus_areas ALTER COLUMN id SET DEFAULT nextval('public.focus_areas_id_seq'::regclass);

ALTER TABLE ONLY public.integrations ALTER COLUMN id SET DEFAULT nextval('public.integrations_id_seq'::regclass);

ALTER TABLE ONLY public.job_runs ALTER COLUMN id SET DEFAULT nextval('public.job_runs_id_seq'::regclass);

ALTER TABLE ONLY public.key_decisions ALTER COLUMN id SET DEFAULT nextval('public.key_decisions_id_seq'::regclass);

ALTER TABLE ONLY public.knowledge_base ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_id_seq'::regclass);

ALTER TABLE ONLY public.milestones ALTER COLUMN id SET DEFAULT nextval('public.milestones_id_seq'::regclass);

ALTER TABLE ONLY public.onboarding_phases ALTER COLUMN id SET DEFAULT nextval('public.onboarding_phases_id_seq'::regclass);

ALTER TABLE ONLY public.onboarding_steps ALTER COLUMN id SET DEFAULT nextval('public.onboarding_steps_id_seq'::regclass);

ALTER TABLE ONLY public.outputs ALTER COLUMN id SET DEFAULT nextval('public.outputs_id_seq'::regclass);

ALTER TABLE ONLY public.plan_templates ALTER COLUMN id SET DEFAULT nextval('public.plan_templates_id_seq'::regclass);

ALTER TABLE ONLY public.project_dependencies ALTER COLUMN id SET DEFAULT nextval('public.project_dependencies_id_seq'::regclass);

ALTER TABLE ONLY public.project_members ALTER COLUMN id SET DEFAULT nextval('public.project_members_id_seq'::regclass);

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);

ALTER TABLE ONLY public.risks ALTER COLUMN id SET DEFAULT nextval('public.risks_id_seq'::regclass);

ALTER TABLE ONLY public.scheduled_jobs ALTER COLUMN id SET DEFAULT nextval('public.scheduled_jobs_id_seq'::regclass);

ALTER TABLE ONLY public.skill_run_chunks ALTER COLUMN id SET DEFAULT nextval('public.skill_run_chunks_id_seq'::regclass);

ALTER TABLE ONLY public.skill_runs ALTER COLUMN id SET DEFAULT nextval('public.skill_runs_id_seq'::regclass);

ALTER TABLE ONLY public.stakeholders ALTER COLUMN id SET DEFAULT nextval('public.stakeholders_id_seq'::regclass);

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);

ALTER TABLE ONLY public.team_engagement_sections ALTER COLUMN id SET DEFAULT nextval('public.team_engagement_sections_id_seq'::regclass);

ALTER TABLE ONLY public.team_onboarding_status ALTER COLUMN id SET DEFAULT nextval('public.team_onboarding_status_id_seq'::regclass);

ALTER TABLE ONLY public.team_pathways ALTER COLUMN id SET DEFAULT nextval('public.team_pathways_id_seq'::regclass);

ALTER TABLE ONLY public.time_entries ALTER COLUMN id SET DEFAULT nextval('public.time_entries_id_seq'::regclass);

ALTER TABLE ONLY public.time_tracking_config ALTER COLUMN id SET DEFAULT nextval('public.time_tracking_config_id_seq'::regclass);

ALTER TABLE ONLY public.user_source_tokens ALTER COLUMN id SET DEFAULT nextval('public.user_source_tokens_id_seq'::regclass);

ALTER TABLE ONLY public.wbs_items ALTER COLUMN id SET DEFAULT nextval('public.wbs_items_id_seq'::regclass);

ALTER TABLE ONLY public.wbs_task_assignments ALTER COLUMN id SET DEFAULT nextval('public.wbs_task_assignments_id_seq'::regclass);

ALTER TABLE ONLY public.workflow_steps ALTER COLUMN id SET DEFAULT nextval('public.workflow_steps_id_seq'::regclass);

ALTER TABLE ONLY public.workstreams ALTER COLUMN id SET DEFAULT nextval('public.workstreams_id_seq'::regclass);

    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_notifications
    ADD CONSTRAINT app_notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.arch_nodes
    ADD CONSTRAINT arch_nodes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.arch_team_status
    ADD CONSTRAINT arch_team_status_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.arch_tracks
    ADD CONSTRAINT arch_tracks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.architecture_integrations
    ADD CONSTRAINT architecture_integrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT artifacts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.before_state
    ADD CONSTRAINT before_state_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.business_outcomes
    ADD CONSTRAINT business_outcomes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.discovery_items
    ADD CONSTRAINT discovery_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.e2e_workflows
    ADD CONSTRAINT e2e_workflows_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.engagement_history
    ADD CONSTRAINT engagement_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.extraction_jobs
    ADD CONSTRAINT extraction_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.focus_areas
    ADD CONSTRAINT focus_areas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_token_unique UNIQUE (token);

ALTER TABLE ONLY public.job_runs
    ADD CONSTRAINT job_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.key_decisions
    ADD CONSTRAINT key_decisions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.onboarding_phases
    ADD CONSTRAINT onboarding_phases_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.onboarding_steps
    ADD CONSTRAINT onboarding_steps_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.outputs
    ADD CONSTRAINT outputs_idempotency_key_key UNIQUE (idempotency_key);

ALTER TABLE ONLY public.outputs
    ADD CONSTRAINT outputs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.plan_templates
    ADD CONSTRAINT plan_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_dependencies
    ADD CONSTRAINT project_dependencies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_user_uniq UNIQUE (project_id, user_id);

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.scheduled_jobs
    ADD CONSTRAINT scheduled_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_unique UNIQUE (token);

ALTER TABLE ONLY public.skill_run_chunks
    ADD CONSTRAINT skill_run_chunks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.skill_run_chunks
    ADD CONSTRAINT skill_run_chunks_run_id_seq_key UNIQUE (run_id, seq);

ALTER TABLE ONLY public.skill_runs
    ADD CONSTRAINT skill_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.skill_runs
    ADD CONSTRAINT skill_runs_run_id_key UNIQUE (run_id);

ALTER TABLE ONLY public.stakeholders
    ADD CONSTRAINT stakeholders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.team_engagement_sections
    ADD CONSTRAINT team_engagement_sections_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.team_onboarding_status
    ADD CONSTRAINT team_onboarding_status_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.team_pathways
    ADD CONSTRAINT team_pathways_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.time_tracking_config
    ADD CONSTRAINT time_tracking_config_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_source_tokens
    ADD CONSTRAINT user_source_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_source_tokens
    ADD CONSTRAINT user_source_tokens_user_id_source_key UNIQUE (user_id, source);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wbs_items
    ADD CONSTRAINT wbs_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wbs_task_assignments
    ADD CONSTRAINT wbs_task_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workstreams
    ADD CONSTRAINT workstreams_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX arch_nodes_project_track_name_idx ON public.arch_nodes USING btree (project_id, track_id, name);

CREATE INDEX idx_actions_search_vec ON public.actions USING gin (search_vec);

CREATE INDEX idx_app_notifications_user ON public.app_notifications USING btree (user_id, read, created_at DESC);

CREATE INDEX idx_arch_nodes_track ON public.arch_nodes USING btree (track_id, project_id);

CREATE INDEX idx_architecture_integrations_project_id ON public.architecture_integrations USING btree (project_id);

CREATE INDEX idx_artifacts_search_vec ON public.artifacts USING gin (search_vec);

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id);

CREATE INDEX idx_before_state_project_id ON public.before_state USING btree (project_id);

CREATE INDEX idx_business_outcomes_project_id ON public.business_outcomes USING btree (project_id);

CREATE INDEX idx_discovery_items_project_id ON public.discovery_items USING btree (project_id);

CREATE INDEX idx_discovery_items_status ON public.discovery_items USING btree (status);

CREATE INDEX idx_e2e_workflows_project_id ON public.e2e_workflows USING btree (project_id);

CREATE INDEX idx_engagement_history_search_vec ON public.engagement_history USING gin (search_vec);

CREATE INDEX idx_extraction_jobs_batch_id ON public.extraction_jobs USING btree (batch_id);

CREATE INDEX idx_extraction_jobs_project_id ON public.extraction_jobs USING btree (project_id);

CREATE INDEX idx_extraction_jobs_status ON public.extraction_jobs USING btree (status);

CREATE INDEX idx_focus_areas_project_id ON public.focus_areas USING btree (project_id);

CREATE INDEX idx_integrations_search_vec ON public.integrations USING gin (search_vec);

CREATE INDEX idx_integrations_track ON public.integrations USING btree (project_id, track);

CREATE INDEX idx_job_runs_job_name ON public.job_runs USING btree (job_name);

CREATE INDEX idx_job_runs_started_at ON public.job_runs USING btree (started_at DESC);

CREATE INDEX idx_key_decisions_search_vec ON public.key_decisions USING gin (search_vec);

CREATE INDEX idx_knowledge_base_search_vec ON public.knowledge_base USING gin (search_vec);

CREATE INDEX idx_onboarding_phases_search_vec ON public.onboarding_phases USING gin (search_vec);

CREATE INDEX idx_onboarding_phases_track ON public.onboarding_phases USING btree (project_id, track);

CREATE INDEX idx_onboarding_steps_search_vec ON public.onboarding_steps USING gin (search_vec);

CREATE INDEX idx_onboarding_steps_track ON public.onboarding_steps USING btree (project_id, track);

CREATE INDEX idx_project_deps ON public.project_dependencies USING btree (source_project_id);

CREATE INDEX idx_risks_search_vec ON public.risks USING gin (search_vec);

CREATE INDEX idx_skill_run_chunks_run_seq ON public.skill_run_chunks USING btree (run_id, seq);

CREATE INDEX idx_stakeholders_search_vec ON public.stakeholders USING gin (search_vec);

CREATE INDEX idx_tasks_search_vec ON public.tasks USING gin (search_vec);

CREATE INDEX idx_team_engagement_project ON public.team_engagement_sections USING btree (project_id);

CREATE INDEX idx_team_onboarding_status_project_id ON public.team_onboarding_status USING btree (project_id);

CREATE INDEX idx_team_pathways_project_id ON public.team_pathways USING btree (project_id);

CREATE INDEX idx_time_entries_search_vec ON public.time_entries USING gin (search_vec);

CREATE INDEX idx_time_entries_user_id ON public.time_entries USING btree (user_id);

CREATE INDEX idx_time_entries_user_project_date ON public.time_entries USING btree (user_id, project_id, date DESC);

CREATE INDEX idx_wbs_items_parent ON public.wbs_items USING btree (parent_id);

CREATE INDEX idx_wbs_items_project_track ON public.wbs_items USING btree (project_id, track);

CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps USING btree (workflow_id);

CREATE UNIQUE INDEX onboarding_steps_phase_id_name_idx ON public.onboarding_steps USING btree (phase_id, name);

CREATE INDEX project_members_project_user_idx ON public.project_members USING btree (project_id, user_id);

CREATE TRIGGER engagement_history_append_only BEFORE UPDATE ON public.engagement_history FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

CREATE TRIGGER key_decisions_append_only BEFORE UPDATE ON public.key_decisions FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

CREATE TRIGGER trg_actions_search_vec BEFORE INSERT OR UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_actions();

CREATE TRIGGER trg_artifacts_search_vec BEFORE INSERT OR UPDATE ON public.artifacts FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_artifacts();

CREATE TRIGGER trg_engagement_history_search_vec BEFORE INSERT OR UPDATE ON public.engagement_history FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_engagement_history();

CREATE TRIGGER trg_integrations_search_vec BEFORE INSERT OR UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_integrations();

CREATE TRIGGER trg_key_decisions_search_vec BEFORE INSERT OR UPDATE ON public.key_decisions FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_key_decisions();

CREATE TRIGGER trg_knowledge_base_search_vec BEFORE INSERT OR UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_knowledge_base();

CREATE TRIGGER trg_onboarding_phases_search_vec BEFORE INSERT OR UPDATE ON public.onboarding_phases FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_onboarding_phases();

CREATE TRIGGER trg_onboarding_steps_search_vec BEFORE INSERT OR UPDATE ON public.onboarding_steps FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_onboarding_steps();

CREATE TRIGGER trg_risks_search_vec BEFORE INSERT OR UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_risks();

CREATE TRIGGER trg_stakeholders_search_vec BEFORE INSERT OR UPDATE ON public.stakeholders FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_stakeholders();

CREATE TRIGGER trg_tasks_search_vec BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_tasks();

CREATE TRIGGER trg_time_entries_search_vec BEFORE INSERT OR UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.tsvector_update_time_entries();

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.arch_nodes
    ADD CONSTRAINT arch_nodes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.arch_nodes
    ADD CONSTRAINT arch_nodes_track_id_fkey FOREIGN KEY (track_id) REFERENCES public.arch_tracks(id);

ALTER TABLE ONLY public.arch_team_status
    ADD CONSTRAINT arch_team_status_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.arch_tracks
    ADD CONSTRAINT arch_tracks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.architecture_integrations
    ADD CONSTRAINT architecture_integrations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.architecture_integrations
    ADD CONSTRAINT architecture_integrations_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.artifacts
    ADD CONSTRAINT artifacts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.before_state
    ADD CONSTRAINT before_state_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.business_outcomes
    ADD CONSTRAINT business_outcomes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.business_outcomes
    ADD CONSTRAINT business_outcomes_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.discovery_items
    ADD CONSTRAINT discovery_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.skill_runs(id);

ALTER TABLE ONLY public.e2e_workflows
    ADD CONSTRAINT e2e_workflows_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.e2e_workflows
    ADD CONSTRAINT e2e_workflows_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.engagement_history
    ADD CONSTRAINT engagement_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.engagement_history
    ADD CONSTRAINT engagement_history_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.extraction_jobs
    ADD CONSTRAINT extraction_jobs_artifact_id_fkey FOREIGN KEY (artifact_id) REFERENCES public.artifacts(id);

ALTER TABLE ONLY public.extraction_jobs
    ADD CONSTRAINT extraction_jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.focus_areas
    ADD CONSTRAINT focus_areas_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.focus_areas
    ADD CONSTRAINT focus_areas_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_invited_by_users_id_fk FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.key_decisions
    ADD CONSTRAINT key_decisions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.key_decisions
    ADD CONSTRAINT key_decisions_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_linked_history_id_fkey FOREIGN KEY (linked_history_id) REFERENCES public.engagement_history(id);

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_linked_risk_id_fkey FOREIGN KEY (linked_risk_id) REFERENCES public.risks(id);

ALTER TABLE ONLY public.knowledge_base
    ADD CONSTRAINT knowledge_base_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.onboarding_phases
    ADD CONSTRAINT onboarding_phases_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.onboarding_steps
    ADD CONSTRAINT onboarding_steps_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.onboarding_phases(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.onboarding_steps
    ADD CONSTRAINT onboarding_steps_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.outputs
    ADD CONSTRAINT outputs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_dependencies
    ADD CONSTRAINT project_dependencies_depends_on_project_id_fkey FOREIGN KEY (depends_on_project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_dependencies
    ADD CONSTRAINT project_dependencies_source_project_id_fkey FOREIGN KEY (source_project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.scheduled_jobs
    ADD CONSTRAINT scheduled_jobs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.skill_run_chunks
    ADD CONSTRAINT skill_run_chunks_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.skill_runs(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.skill_runs
    ADD CONSTRAINT skill_runs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.stakeholders
    ADD CONSTRAINT stakeholders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.stakeholders
    ADD CONSTRAINT stakeholders_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES public.tasks(id);

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.milestones(id);

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_workstream_id_fkey FOREIGN KEY (workstream_id) REFERENCES public.workstreams(id);

ALTER TABLE ONLY public.team_engagement_sections
    ADD CONSTRAINT team_engagement_sections_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.team_onboarding_status
    ADD CONSTRAINT team_onboarding_status_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.team_pathways
    ADD CONSTRAINT team_pathways_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.team_pathways
    ADD CONSTRAINT team_pathways_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wbs_items
    ADD CONSTRAINT wbs_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.wbs_items(id);

ALTER TABLE ONLY public.wbs_items
    ADD CONSTRAINT wbs_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wbs_task_assignments
    ADD CONSTRAINT wbs_task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);

ALTER TABLE ONLY public.wbs_task_assignments
    ADD CONSTRAINT wbs_task_assignments_wbs_item_id_fkey FOREIGN KEY (wbs_item_id) REFERENCES public.wbs_items(id);

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.e2e_workflows(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workstreams
    ADD CONSTRAINT workstreams_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.architecture_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.before_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e2e_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_isolation ON public.actions USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.architecture_integrations USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.artifacts USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.before_state USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.business_outcomes USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.discovery_items USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.e2e_workflows USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.engagement_history USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.focus_areas USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.key_decisions USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.milestones USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.outputs USING (((project_id IS NULL) OR (project_id = (current_setting('app.current_project_id'::text, true))::integer)));

CREATE POLICY project_isolation ON public.risks USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.stakeholders USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.team_onboarding_status USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.team_pathways USING ((project_id = (current_setting('app.current_project_id'::text, true))::integer));

CREATE POLICY project_isolation ON public.workflow_steps USING ((EXISTS ( SELECT 1
   FROM public.e2e_workflows w
  WHERE ((w.id = workflow_steps.workflow_id) AND (w.project_id = (current_setting('app.current_project_id'::text, true))::integer)))));

ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_onboarding_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
