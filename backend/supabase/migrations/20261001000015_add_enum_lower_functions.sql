-- ==============================================================================
-- VERNIQ Phase 5 Migration: PostgreSQL Custom Enum Utility Functions & Casts
-- Migration: 20261001000015_add_enum_lower_functions.sql
-- ==============================================================================

-- 1. Helper functions to allow lower() on custom PostgreSQL enums
CREATE OR REPLACE FUNCTION public.lower(val public.problem_workflow_status) RETURNS text AS $$
  SELECT pg_catalog.lower(val::text);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.lower(val public.difficulty_level) RETURNS text AS $$
  SELECT pg_catalog.lower(val::text);
$$ LANGUAGE sql IMMUTABLE;

-- 2. Grant execute permissions to standard roles
GRANT EXECUTE ON FUNCTION public.lower(public.problem_workflow_status) TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.lower(public.difficulty_level) TO anon, authenticated, service_role, postgres;
