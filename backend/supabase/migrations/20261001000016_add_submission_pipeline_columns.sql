-- ==============================================================================
-- VERNIQ Phase D Migration: Submission Pipeline Enhancements & Enum Functions
-- Migration: 20261001000016_add_submission_pipeline_columns.sql
-- ==============================================================================

-- 1. Add versioning, error diagnostics, and tracking columns to public.submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS problem_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS failed_test_index INTEGER,
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS judge_job_id TEXT,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 2. Indexes for efficient lookup by judge job and user submission history
CREATE INDEX IF NOT EXISTS idx_submissions_judge_job_id ON public.submissions(judge_job_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_history ON public.submissions(user_id, created_at DESC);

-- 3. Enum helper functions to prevent PostgreSQL custom enum lower() runtime errors
CREATE OR REPLACE FUNCTION public.lower(val public.submission_verdict) RETURNS text AS $$
  SELECT pg_catalog.lower(val::text);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.lower(val public.programming_language) RETURNS text AS $$
  SELECT pg_catalog.lower(val::text);
$$ LANGUAGE sql IMMUTABLE;

-- 4. Grant execute permissions on functions to all roles
GRANT EXECUTE ON FUNCTION public.lower(public.submission_verdict) TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.lower(public.programming_language) TO anon, authenticated, service_role, postgres;

-- 5. Implicit casts from character varying to custom PostgreSQL enums for ORM compatibility
CREATE CAST (varchar AS public.programming_language) WITH INOUT AS IMPLICIT;
CREATE CAST (varchar AS public.submission_verdict) WITH INOUT AS IMPLICIT;
