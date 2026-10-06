import { useState, useEffect, useCallback } from 'react';
import { apiClient, ProblemDetailDto } from '@/lib/apiClient';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { FALLBACK_PROBLEMS, FALLBACK_SAMPLE_TEST_CASES } from '@/lib/curriculumData';
import type { Problem, TestCase } from '@/types';

interface ProblemTagRow {
  tags: {
    name: string;
  } | null;
}

interface ProblemTopicRow {
  role?: string;
  topic: {
    name: string;
    slug?: string;
  } | null;
}

interface SupabaseProblemRow {
  id: string;
  verniq_id?: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  acceptance_rate: number | null;
  description_markdown: string;
  constraints_markdown: string;
  starter_templates: Record<string, string>;
  is_premium: boolean;
  is_published: boolean;
  workflow_status?: 'draft' | 'content_review' | 'technical_review' | 'ready' | 'published' | 'archived';
  domain?: {
    name: string;
    slug?: string;
  } | null;
  created_at: string;
  updated_at: string;
  problem_topics?: ProblemTopicRow[];
  problem_tags?: ProblemTagRow[];
}

function mapDetailDtoToProblem(dto: ProblemDetailDto): Problem {
  // Normalize template keys to lowercase
  const normalizedTemplates: Record<string, string> = {};
  if (dto.starterTemplates) {
    Object.entries(dto.starterTemplates).forEach(([key, val]) => {
      normalizedTemplates[key.toLowerCase()] = val;
    });
  }

  return {
    id: dto.verniqId,
    verniq_id: dto.verniqId,
    title: dto.title,
    slug: dto.slug,
    difficulty: dto.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
    acceptance_rate: dto.acceptanceRate ?? 0,
    description_markdown: dto.statement || '',
    constraints_markdown: dto.constraints || '',
    starter_templates: normalizedTemplates,
    is_premium: false,
    is_published: true,
    workflow_status: 'published',
    domain: 'DSA',
    tags: dto.topics && dto.topics.length > 0 ? dto.topics : ['General'],
    topics: dto.topics || [],
    companies: dto.companies || [],
    created_at: dto.publishedAt || new Date().toISOString(),
    updated_at: dto.publishedAt || new Date().toISOString(),
  };
}

export const useProblemBySlug = (slug: string) => {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [canonicalTestCount, setCanonicalTestCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProblem = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    // 1. Try Spring Boot Problem Catalog API first
    try {
      const detailDto = await apiClient.getProblem(slug);
      const mapped = mapDetailDtoToProblem(detailDto);
      setProblem(mapped);

      // Map examples from Spring Boot to sample TestCase items
      const sampleCases: TestCase[] = (detailDto.examples || []).map((ex, idx) => ({
        id: `tc-${idx + 1}`,
        problem_id: detailDto.verniqId,
        input: ex.input,
        expected_output: ex.output,
        is_sample: true,
        order_index: idx + 1,
      }));

      setTestCases(sampleCases);

      // Attempt to load canonical count from Supabase
      if (isSupabaseConfigured()) {
        try {
          const { count } = await supabase
            .from('test_cases')
            .select('*', { count: 'exact', head: true })
            .or(`problem_id.eq.${detailDto.verniqId},problem_id.eq.${detailDto.slug}`);
          setCanonicalTestCount(count || sampleCases.length || 4);
        } catch {
          setCanonicalTestCount(sampleCases.length || 4);
        }
      } else {
        setCanonicalTestCount(sampleCases.length || 4);
      }

      setLoading(false);
      return;
    } catch (springBootErr: unknown) {
      // If Spring Boot returned 404 or connection failed, fallback to Supabase / local
      console.warn('[useProblemBySlug] Spring Boot API failed, attempting fallback:', springBootErr);
    }

    // Fallback locator
    const fallbackProb =
      FALLBACK_PROBLEMS.find((p) => p.slug === slug || p.verniq_id === slug) || FALLBACK_PROBLEMS[0];
    const fallbackTCs =
      FALLBACK_SAMPLE_TEST_CASES[slug] ||
      FALLBACK_SAMPLE_TEST_CASES[fallbackProb.slug] ||
      [];

    if (!isSupabaseConfigured()) {
      setProblem(fallbackProb);
      setTestCases(fallbackTCs);
      setCanonicalTestCount(fallbackTCs.length);
      setLoading(false);
      return;
    }

    try {
      // 2. Fetch Problem from Supabase
      const { data, error: sbError } = await supabase
        .from('problems')
        .select(`
          id,
          verniq_id,
          title,
          slug,
          difficulty,
          acceptance_rate,
          description_markdown,
          constraints_markdown,
          starter_templates,
          is_premium,
          is_published,
          workflow_status,
          created_at,
          updated_at,
          domain:domains (
            name,
            slug
          ),
          problem_topics (
            role,
            topic:topics (
              name,
              slug
            )
          ),
          problem_tags (
            tags (
              name
            )
          )
        `)
        .or(`slug.eq.${slug},verniq_id.eq.${slug}`)
        .maybeSingle();

      if (sbError) throw sbError;

      if (data) {
        const row = data as unknown as SupabaseProblemRow;
        const tags: string[] = [];
        if (row.problem_topics && row.problem_topics.length > 0) {
          row.problem_topics.forEach((pt) => {
            if (pt.topic?.name) tags.push(pt.topic.name);
          });
        } else if (row.problem_tags) {
          row.problem_tags.forEach((pt) => {
            if (pt.tags?.name) tags.push(pt.tags.name);
          });
        }

        const mappedProblem: Problem = {
          id: row.id,
          verniq_id: row.verniq_id,
          title: row.title,
          slug: row.slug,
          difficulty: row.difficulty,
          acceptance_rate: Number(row.acceptance_rate || 0),
          description_markdown: row.description_markdown,
          constraints_markdown: row.constraints_markdown,
          starter_templates: row.starter_templates || {},
          is_premium: row.is_premium,
          is_published: row.is_published,
          workflow_status: row.workflow_status || (row.is_published ? 'published' : 'draft'),
          domain: row.domain?.name || 'DSA',
          tags: tags.length > 0 ? tags : ['General'],
          created_at: row.created_at,
          updated_at: row.updated_at,
        };

        setProblem(mappedProblem);

        // Fetch Sample Test Cases
        const { data: tcData, error: tcError } = await supabase
          .from('test_cases')
          .select('id, problem_id, input, expected_output, is_sample, order_index')
          .eq('problem_id', row.id)
          .eq('is_sample', true)
          .order('order_index', { ascending: true });

        // Fetch Total Canonical Test Count
        const { count: totalCount } = await supabase
          .from('test_cases')
          .select('*', { count: 'exact', head: true })
          .eq('problem_id', row.id);

        if (!tcError && tcData && tcData.length > 0) {
          setTestCases(tcData as TestCase[]);
          setCanonicalTestCount(totalCount || tcData.length);
        } else {
          const isDraft = !row.is_published || row.workflow_status === 'draft';
          if (isDraft) {
            setTestCases([]);
            setCanonicalTestCount(0);
          } else {
            setTestCases(fallbackTCs);
            setCanonicalTestCount(fallbackTCs.length);
          }
        }
      } else {
        setProblem(fallbackProb);
        setTestCases(fallbackTCs);
        setCanonicalTestCount(fallbackTCs.length);
      }
    } catch (err: unknown) {
      console.warn('Failed to fetch problem by slug from Supabase, using fallback:', err);
      setProblem(fallbackProb);
      setTestCases(fallbackTCs);
      setCanonicalTestCount(fallbackTCs.length);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProblem();
  }, [fetchProblem]);

  return {
    problem,
    testCases,
    canonicalTestCount,
    loading,
    error,
    refetch: fetchProblem,
  };
};
