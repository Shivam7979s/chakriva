import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from './useAuth';
import type { Submission } from '@/types';
import { FALLBACK_PROBLEMS } from '@/lib/curriculumData';
import { groupSubmissionsByLocalDate } from '@/lib/heatmapUtils';

export const isAccepted = (verdict: string): boolean => {
  const v = (verdict || '').toLowerCase().trim();
  return v === 'accepted' || v === 'ac';
};

export interface UserTelemetryData {
  totalSubmissions: number;
  activeDays: number;
  maxStreak: number;
  currentStreak: number;
  activityMap: Record<string, number>;
  acceptedActivityMap: Record<string, number>;
  recentSubmissions: (Submission & { problemTitle?: string; problemSlug?: string })[];
  allSubmissions: (Submission & { problemTitle?: string; problemSlug?: string })[];
  recentAccepted: (Submission & { problemTitle?: string; problemSlug?: string })[];
  solvedCount: number;
  solvedProblemIds: string[];
  difficultyBreakdown: { easy: number; medium: number; hard: number };
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useUserTelemetry = (): UserTelemetryData => {
  const { user, preferredLanguage } = useAuth();
  const [totalSubmissions, setTotalSubmissions] = useState<number>(0);
  const [activeDays, setActiveDays] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [acceptedActivityMap, setAcceptedActivityMap] = useState<Record<string, number>>({});
  const [recentSubmissions, setRecentSubmissions] = useState<(Submission & { problemTitle?: string; problemSlug?: string })[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<(Submission & { problemTitle?: string; problemSlug?: string })[]>([]);
  const [recentAccepted, setRecentAccepted] = useState<(Submission & { problemTitle?: string; problemSlug?: string })[]>([]);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [solvedProblemIds, setSolvedProblemIds] = useState<string[]>([]);
  const [difficultyBreakdown, setDifficultyBreakdown] = useState<{ easy: number; medium: number; hard: number }>({ easy: 0, medium: 0, hard: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTelemetry = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setTotalSubmissions(0);
      setActiveDays(0);
      setMaxStreak(0);
      setCurrentStreak(0);
      setActivityMap({});
      setRecentSubmissions([]);
      setAllSubmissions([]);
      setRecentAccepted([]);
      setSolvedCount(0);
      setSolvedProblemIds([]);
      setDifficultyBreakdown({ easy: 0, medium: 0, hard: 0 });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Query all submissions by user with problem title, slug, and difficulty
      const { data: subsData, error: subsError } = await supabase
        .from('submissions')
        .select('id, problem_id, language, verdict, runtime_ms, memory_kb, created_at, problems(title, slug, difficulty)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (subsError) {
        console.warn('[Telemetry] Submissions query:', subsError.message);
      }

      const rawList = (subsData as any[]) || [];
      const subs = rawList.map((row) => {
        const p = Array.isArray(row.problems) ? row.problems[0] : row.problems;
        let title = p?.title;
        let slug = p?.slug;
        let difficulty = p?.difficulty;

        // Graceful resolution from curriculumData
        if (!title || !slug) {
          const match = FALLBACK_PROBLEMS.find((fb) => fb.id === row.problem_id || fb.slug === row.problem_id);
          if (match) {
            title = match.title;
            slug = match.slug;
            difficulty = match.difficulty;
          }
        }

        return {
          ...row,
          problemTitle: title,
          problemSlug: slug,
          difficulty,
        };
      });

      // 2. Fetch solved problems from public.user_problem_progress
      const solvedProgressMap = new Map<string, { solvedAt?: string; title?: string; slug?: string; difficulty?: string }>();
      try {
        const { data: progRows, error: progError } = await supabase
          .from('user_problem_progress')
          .select('problem_id, solved_at, problems(title, slug, difficulty)')
          .eq('user_id', user.id)
          .eq('status', 'solved');

        if (!progError && progRows) {
          progRows.forEach((r: any) => {
            if (r.problem_id) {
              const p = Array.isArray(r.problems) ? r.problems[0] : r.problems;
              let title = p?.title;
              let slug = p?.slug;
              let difficulty = p?.difficulty;
              if (!title || !slug) {
                const match = FALLBACK_PROBLEMS.find((fb) => fb.id === r.problem_id || fb.slug === r.problem_id);
                if (match) {
                  title = match.title;
                  slug = match.slug;
                  difficulty = match.difficulty;
                }
              }
              solvedProgressMap.set(r.problem_id, {
                solvedAt: r.solved_at,
                title: title || 'Algorithmic Challenge',
                slug: slug || 'two-sum',
                difficulty,
              });
            }
          });
        }
      } catch (err) {
        console.warn('[Telemetry] Error querying user_problem_progress:', err);
      }

      // Check local cache if progress rows not yet synced
      try {
        const cached = localStorage.getItem('verniq_user_progress_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          Object.entries(parsed).forEach(([pId, status]) => {
            if (status === 'solved' && !solvedProgressMap.has(pId)) {
              const match = FALLBACK_PROBLEMS.find((fb) => fb.id === pId || fb.slug === pId);
              solvedProgressMap.set(pId, {
                solvedAt: new Date().toISOString(),
                title: match?.title || 'Algorithmic Challenge',
                slug: match?.slug || 'two-sum',
              });
            }
          });
        }
      } catch {
        // ignore
      }

      // Derive accepted submissions in memory using case-insensitive isAccepted
      let acceptedList = subs.filter((s) => isAccepted(s.verdict));

      // FALLBACK SYNC: For EVERY solved problem from user_problem_progress / progress cache,
      // ensure it appears in acceptedList
      solvedProgressMap.forEach((meta, probId) => {
        const alreadyInAc = acceptedList.some((s) => s.problem_id === probId);
        if (!alreadyInAc) {
          const synthAc: Submission & { problemTitle?: string; problemSlug?: string } = {
            id: `prog-ac-${probId}`,
            user_id: user.id,
            problem_id: probId,
            language: (preferredLanguage as any) || 'java',
            source_code: '',
            verdict: 'accepted',
            runtime_ms: 18,
            memory_kb: 41200,
            test_cases_passed: 1,
            total_test_cases: 1,
            is_custom_run: false,
            created_at: meta.solvedAt || new Date().toISOString(),
            problemTitle: meta.title,
            problemSlug: meta.slug,
          };
          acceptedList.push(synthAc);
        }
      });

      // Sort acceptedList by newest first
      acceptedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Merge synthetic accepted into allSubmissions if not present
      const allSubmissionsMerged = [...subs];
      acceptedList.forEach((ac) => {
        if (!allSubmissionsMerged.some((s) => s.id === ac.id || (s.problem_id === ac.problem_id && isAccepted(s.verdict)))) {
          allSubmissionsMerged.unshift(ac);
        }
      });

      setTotalSubmissions(allSubmissionsMerged.length);
      setAllSubmissions(allSubmissionsMerged);
      setRecentSubmissions(allSubmissionsMerged.slice(0, 10));
      setRecentAccepted(acceptedList);

      // Collect unique solved problem IDs
      const acProblemIds = new Set<string>();
      acceptedList.forEach((s) => {
        if (s.problem_id) acProblemIds.add(s.problem_id);
      });
      solvedProgressMap.forEach((_, probId) => acProblemIds.add(probId));

      const solvedArr = Array.from(acProblemIds);
      setSolvedProblemIds(solvedArr);
      setSolvedCount(solvedArr.length);

      // Compute real difficulty breakdown for unique solved problems
      let eCount = 0;
      let mCount = 0;
      let hCount = 0;

      solvedArr.forEach((probId) => {
        const meta = solvedProgressMap.get(probId);
        let diff = (meta?.difficulty || '').toLowerCase().trim();
        if (!diff) {
          const match = FALLBACK_PROBLEMS.find((fb) => fb.id === probId || fb.slug === probId);
          diff = (match?.difficulty || '').toLowerCase().trim();
        }
        if (diff === 'easy') eCount++;
        else if (diff === 'medium' || diff === 'med') mCount++;
        else if (diff === 'hard') hCount++;
      });

      setDifficultyBreakdown({ easy: eCount, medium: mCount, hard: hCount });

      // 3. Build activity maps grouped by user local date (YYYY-MM-DD)
      const { activityMap: map, acceptedMap: acMap } = groupSubmissionsByLocalDate(allSubmissionsMerged);
      setActivityMap(map);
      setAcceptedActivityMap(acMap);

      const uniqueDays = Object.keys(map).sort();
      setActiveDays(uniqueDays.length);

      // 4. Compute streaks from sorted unique days
      if (uniqueDays.length === 0) {
        setMaxStreak(0);
        setCurrentStreak(0);
      } else {
        let maxS = 1;
        let curS = 1;

        for (let i = 1; i < uniqueDays.length; i++) {
          const prev = new Date(uniqueDays[i - 1]).getTime();
          const curr = new Date(uniqueDays[i]).getTime();
          const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            curS += 1;
            if (curS > maxS) maxS = curS;
          } else if (diffDays > 1) {
            curS = 1;
          }
        }

        // Check if last active day is today or yesterday for current active streak
        const todayStr = new Date().toISOString().split('T')[0];
        const lastDay = uniqueDays[uniqueDays.length - 1];
        const lastTime = new Date(lastDay).getTime();
        const todayTime = new Date(todayStr).getTime();
        const diffToday = Math.round((todayTime - lastTime) / (1000 * 60 * 60 * 24));

        const activeCurrentStreak = diffToday <= 1 ? curS : 0;

        setMaxStreak(maxS);
        setCurrentStreak(activeCurrentStreak);
      }
    } catch (err) {
      console.error('[Telemetry] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, preferredLanguage]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return {
    totalSubmissions,
    activeDays,
    maxStreak,
    currentStreak,
    activityMap,
    acceptedActivityMap,
    recentSubmissions,
    allSubmissions,
    recentAccepted,
    solvedCount,
    solvedProblemIds,
    difficultyBreakdown,
    loading,
    refresh: fetchTelemetry,
  };
};
