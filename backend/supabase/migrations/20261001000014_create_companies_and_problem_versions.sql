-- ==============================================================================
-- VERNIQ Phase 5 Migration: Companies, Problem Versions & Canonical ID Governance
-- Migration: 20261001000014_create_companies_and_problem_versions.sql
-- ==============================================================================

-- 1. COMPANIES TAXONOMY TABLE
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name CITEXT UNIQUE NOT NULL,
  slug CITEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. PROBLEM COMPANIES JUNCTION TABLE
CREATE TABLE IF NOT EXISTS public.problem_companies (
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  frequency INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (problem_id, company_id)
);

-- 3. PROBLEM VERSIONS AUDIT & HISTORICAL REVISION TABLE
CREATE TABLE IF NOT EXISTS public.problem_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  statement_markdown TEXT NOT NULL,
  constraints_markdown TEXT,
  input_format TEXT,
  output_format TEXT,
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  UNIQUE (problem_id, version_number)
);

-- 4. ADD VERSIONING & PUBLISHED TIMESTAMPS TO PROBLEMS
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Update published_at for existing published problems
UPDATE public.problems
SET published_at = created_at
WHERE is_published = true AND published_at IS NULL;

-- 5. ASSIGN CANONICAL VERNIQ IDs TO SEED PROBLEMS (If not already populated)
UPDATE public.problems SET verniq_id = 'VRQ-000001' WHERE slug = 'two-sum' AND verniq_id IS NULL;
UPDATE public.problems SET verniq_id = 'VRQ-000004' WHERE slug = 'valid-parentheses' AND verniq_id IS NULL;
UPDATE public.problems SET verniq_id = 'VRQ-000005' WHERE slug = 'longest-substring-without-repeating-characters' AND verniq_id IS NULL;
UPDATE public.problems SET verniq_id = 'VRQ-000006' WHERE slug = 'best-time-to-buy-and-sell-stock' AND verniq_id IS NULL;
UPDATE public.problems SET verniq_id = 'VRQ-000007' WHERE slug = 'invert-binary-tree' AND verniq_id IS NULL;
UPDATE public.problems SET verniq_id = 'VRQ-000008' WHERE slug = '3sum' AND verniq_id IS NULL;

-- 6. INDEXES FOR HIGH-THROUGHPUT CATALOG SEARCH & FILTERING
CREATE INDEX IF NOT EXISTS idx_problems_verniq_id ON public.problems(verniq_id);
CREATE INDEX IF NOT EXISTS idx_problems_slug ON public.problems(slug);
CREATE INDEX IF NOT EXISTS idx_problems_workflow_status ON public.problems(workflow_status);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON public.problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problem_companies_company ON public.problem_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_problem_versions_problem ON public.problem_versions(problem_id);

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read companies" ON public.companies;
CREATE POLICY "Public read companies" ON public.companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read problem_companies" ON public.problem_companies;
CREATE POLICY "Public read problem_companies" ON public.problem_companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read problem_versions" ON public.problem_versions;
CREATE POLICY "Public read problem_versions" ON public.problem_versions FOR SELECT USING (true);
