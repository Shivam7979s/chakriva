-- ==============================================================================
-- VERNIQ Phase J.9.4 Migration: Durable Judge Job Lease & Attempt Tracking
-- Migration: 20261001000022_add_submission_lease_and_attempt_columns.sql
-- ==============================================================================

-- 1. Add attempt tracking, lease management, and worker identity columns to public.submissions
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS worker_id TEXT;

-- 2. Index for efficient recovery queries on active non-terminal submissions
CREATE INDEX IF NOT EXISTS idx_submissions_lease_recovery
  ON public.submissions(verdict, lease_expires_at);

-- 3. Comments on columns for database schema documentation
COMMENT ON COLUMN public.submissions.attempt IS 'Current execution attempt number (1-indexed)';
COMMENT ON COLUMN public.submissions.max_attempts IS 'Maximum allowable execution attempts before transitioning to internal_error';
COMMENT ON COLUMN public.submissions.lease_expires_at IS 'Expiration timestamp of active worker lease';
COMMENT ON COLUMN public.submissions.worker_id IS 'Identifier of worker node currently holding the lease';
