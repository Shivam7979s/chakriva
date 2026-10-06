-- ==============================================================================
-- VERNIQ Phase G Migration: Assign verniq_id for remaining seed problems
-- Migration: 20261001000019_assign_remaining_seed_verniq_ids.sql
-- ==============================================================================

UPDATE public.problems
SET verniq_id = 'VRQ-000010'
WHERE slug = 'trapping-rain-water' AND verniq_id IS NULL;

UPDATE public.problems
SET verniq_id = 'VRQ-000011'
WHERE slug = 'container-with-most-water' AND verniq_id IS NULL;

UPDATE public.problems
SET verniq_id = 'VRQ-000012'
WHERE slug = 'search-in-rotated-sorted-array' AND verniq_id IS NULL;
