import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import type { ProblemStatus } from '@/types';

const LOCAL_STORAGE_PROGRESS_KEY = 'verniq_user_progress_cache';
const LOCAL_STORAGE_REVISION_KEY = 'verniq_user_revision_cache';

function normalizeStatus(serverStatus: string): ProblemStatus {
  const s = (serverStatus || '').toUpperCase().trim();
  if (s === 'SOLVED') return 'solved';
  if (s === 'ATTEMPTED') return 'attempted';
  return 'todo';
}

export const useUserProgress = () => {
  const { user } = useAuth();

  // Progress cache: problemId or verniqId -> status ('todo' | 'attempted' | 'solved')
  const [progressMap, setProgressMap] = useState<Record<string, ProblemStatus>>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return {};
  });

  // Revision queue cache: problemId -> boolean
  const [revisionMap, setRevisionMap] = useState<Record<string, boolean>>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_REVISION_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return {};
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Authoritative fetch from Spring Boot Control Plane API
  const refreshProgress = useCallback(async () => {
    if (!user) {
      setProgressMap({});
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch server-authoritative problem status map from Spring Boot API
      try {
        const rawMap = await apiClient.getUserProblemStatusMap();
        if (rawMap) {
          const normalized: Record<string, ProblemStatus> = {};
          Object.entries(rawMap).forEach(([key, val]) => {
            normalized[key] = normalizeStatus(val);
          });

          setProgressMap(normalized);
          try {
            localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(normalized));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('[useUserProgress] Failed to fetch server progress map:', err);
      }

      // 2. Fetch revision queue from Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const { data: revData, error: revError } = await supabase
            .from('user_revision_queue')
            .select('problem_id, is_reviewed')
            .eq('user_id', user.id)
            .eq('is_reviewed', false);

          if (!revError && revData) {
            const rMap: Record<string, boolean> = {};
            revData.forEach((row: { problem_id: string }) => {
              rMap[row.problem_id] = true;
            });
            setRevisionMap(rMap);
            try {
              localStorage.setItem(LOCAL_STORAGE_REVISION_KEY, JSON.stringify(rMap));
            } catch {
              // ignore
            }
          }
        } catch (revErr) {
          console.warn('[useUserProgress] Failed to fetch revision queue:', revErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Sync on mount or when user changes
  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  // Client-side local update (server updates happen automatically upon submission completion)
  const updateProgress = useCallback(
    async (problemId: string, status: ProblemStatus) => {
      setProgressMap((prev) => {
        const next = { ...prev, [problemId]: status };
        try {
          localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    []
  );

  // Mutation: Toggle problem revision status
  const toggleRevision = useCallback(
    async (problemId: string) => {
      const willBeInRevision = !revisionMap[problemId];

      setRevisionMap((prev) => {
        const next = { ...prev, [problemId]: willBeInRevision };
        try {
          localStorage.setItem(LOCAL_STORAGE_REVISION_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      if (isSupabaseConfigured() && user) {
        try {
          if (willBeInRevision) {
            await supabase.from('user_revision_queue').upsert({
              user_id: user.id,
              problem_id: problemId,
              interval_days: 1,
              next_review_at: new Date(Date.now() + 86400000).toISOString(),
              is_reviewed: false,
            });
          } else {
            await supabase
              .from('user_revision_queue')
              .delete()
              .eq('user_id', user.id)
              .eq('problem_id', problemId);
          }
        } catch (err) {
          console.error('[useUserProgress] Failed to toggle revision queue:', err);
        }
      }
    },
    [user, revisionMap]
  );

  return {
    progressMap,
    revisionMap,
    loading,
    refreshProgress,
    updateProgress,
    toggleRevision,
  };
};
