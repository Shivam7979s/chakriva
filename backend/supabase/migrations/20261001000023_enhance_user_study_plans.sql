-- ==============================================================================
-- VERNIQ Phase 2 Migration: Enhance User Study Plans for Adaptive Roadmap Persistence
-- Migration: 20261001000023_enhance_user_study_plans.sql
-- ==============================================================================
-- Extends public.user_study_plans to store rich personalized adaptive roadmap
-- configurations, weekly availability vectors, stages, and rescheduling history
-- with optimistic concurrency versioning.
-- ==============================================================================

ALTER TABLE public.user_study_plans
  ADD COLUMN IF NOT EXISTS plan_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Performance index for active plan queries with versioning
CREATE INDEX IF NOT EXISTS idx_user_study_plans_user_version 
  ON public.user_study_plans(user_id, is_active, version);

-- Ensure RLS is enabled and policies are intact
ALTER TABLE public.user_study_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own study plans" ON public.user_study_plans;
CREATE POLICY "Users can manage own study plans"
  ON public.user_study_plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
