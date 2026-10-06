-- ==============================================================================
-- VERNIQ Phase F Migration: Enhance User Problem Progress
-- Migration: 20261001000017_enhance_user_problem_progress.sql
-- ==============================================================================

-- 1. Ensure problem_status has 'unattempted'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'unattempted'
      AND enumtypid = 'public.problem_status'::regtype
  ) THEN
    ALTER TYPE public.problem_status ADD VALUE 'unattempted';
  END IF;
END $$;

-- 2. Lower helper and implicit casts for problem_status
CREATE OR REPLACE FUNCTION public.lower(val public.problem_status) RETURNS text AS $$
  SELECT pg_catalog.lower(val::text);
$$ LANGUAGE sql IMMUTABLE;

GRANT EXECUTE ON FUNCTION public.lower(public.problem_status) TO anon, authenticated, service_role, postgres;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_cast c
    JOIN pg_type s ON c.castsource = s.oid
    JOIN pg_type t ON c.casttarget = t.oid
    WHERE s.typname = 'varchar' AND t.typname = 'problem_status'
  ) THEN
    CREATE CAST (varchar AS public.problem_status) WITH INOUT AS IMPLICIT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_cast c
    JOIN pg_type s ON c.castsource = s.oid
    JOIN pg_type t ON c.casttarget = t.oid
    WHERE s.typname = 'text' AND t.typname = 'problem_status'
  ) THEN
    CREATE CAST (text AS public.problem_status) WITH INOUT AS IMPLICIT;
  END IF;
END $$;

-- 3. Enhance public.user_problem_progress columns
ALTER TABLE public.user_problem_progress
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_solved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_solved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill first_solved_at / last_solved_at from solved_at if solved_at is not null
UPDATE public.user_problem_progress
SET first_solved_at = COALESCE(first_solved_at, solved_at),
    last_solved_at = COALESCE(last_solved_at, solved_at)
WHERE solved_at IS NOT NULL AND first_solved_at IS NULL;

-- 4. Indexes for access patterns (Section 7)
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_user_status ON public.user_problem_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_user_last_attempted ON public.user_problem_progress(user_id, last_attempted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_user_first_solved ON public.user_problem_progress(user_id, first_solved_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_user_problem_progress_accepted_sub ON public.user_problem_progress(accepted_submission_id);
