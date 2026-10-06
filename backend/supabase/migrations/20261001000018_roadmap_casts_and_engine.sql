-- ==============================================================================
-- VERNIQ Phase G Migration: Roadmap Enums Implicit Casts and Utility Functions
-- Migration: 20261001000018_roadmap_casts_and_engine.sql
-- ==============================================================================

-- 1. Helper functions to allow lower() on learning_item_type and roadmap_item_status
CREATE OR REPLACE FUNCTION public.lower(val public.learning_item_type) RETURNS text AS $$
  SELECT pg_catalog.lower(val::text);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.lower(val public.roadmap_item_status) RETURNS text AS $$
  SELECT pg_catalog.lower(val::text);
$$ LANGUAGE sql IMMUTABLE;

GRANT EXECUTE ON FUNCTION public.lower(public.learning_item_type) TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.lower(public.roadmap_item_status) TO anon, authenticated, service_role, postgres;

-- 2. Implicit casts for Hibernate / JPA compatibility
DO $$
BEGIN
  -- learning_item_type casts
  IF NOT EXISTS (
    SELECT 1 FROM pg_cast c
    JOIN pg_type s ON c.castsource = s.oid
    JOIN pg_type t ON c.casttarget = t.oid
    WHERE s.typname = 'varchar' AND t.typname = 'learning_item_type'
  ) THEN
    CREATE CAST (varchar AS public.learning_item_type) WITH INOUT AS IMPLICIT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_cast c
    JOIN pg_type s ON c.castsource = s.oid
    JOIN pg_type t ON c.casttarget = t.oid
    WHERE s.typname = 'text' AND t.typname = 'learning_item_type'
  ) THEN
    CREATE CAST (text AS public.learning_item_type) WITH INOUT AS IMPLICIT;
  END IF;

  -- roadmap_item_status casts
  IF NOT EXISTS (
    SELECT 1 FROM pg_cast c
    JOIN pg_type s ON c.castsource = s.oid
    JOIN pg_type t ON c.casttarget = t.oid
    WHERE s.typname = 'varchar' AND t.typname = 'roadmap_item_status'
  ) THEN
    CREATE CAST (varchar AS public.roadmap_item_status) WITH INOUT AS IMPLICIT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_cast c
    JOIN pg_type s ON c.castsource = s.oid
    JOIN pg_type t ON c.casttarget = t.oid
    WHERE s.typname = 'text' AND t.typname = 'roadmap_item_status'
  ) THEN
    CREATE CAST (text AS public.roadmap_item_status) WITH INOUT AS IMPLICIT;
  END IF;
END $$;

-- 3. Additional indexes for fast query resolution
CREATE INDEX IF NOT EXISTS idx_roadmap_sprints_published ON public.roadmap_sprints(roadmap_id, is_published, position);
CREATE INDEX IF NOT EXISTS idx_roadmap_days_sprint_pos ON public.roadmap_days(sprint_id, position);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_day_pos ON public.roadmap_items(day_id, position);
CREATE INDEX IF NOT EXISTS idx_user_roadmap_item_progress_lookup ON public.user_roadmap_item_progress(user_id, roadmap_item_id);
