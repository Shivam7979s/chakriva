import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import type { ProblemStatus } from '@/types';

const getProgressKey = (userId?: string) => (userId ? `verniq_user_progress_cache_${userId}` : null);
const getRevisionKey = (userId?: string) => (userId ? `verniq_user_revision_cache_${userId}` : null);

function normalizeStatus(serverStatus: string): ProblemStatus {
  const s = (serverStatus || '').toUpperCase().trim();
  if (s === 'SOLVED') return 'solved';
  if (s === 'ATTEMPTED') return 'attempted';
  return 'todo';
}

export const useUserProgress = () => {
  const { user } = useAuth();

  // Progress cache: problemId or verniqId -> status ('todo' | 'attempted' | 'solved')
  // Strictly user-scoped: empty when user is not logged in
  const [progressMap, setProgressMap] = useState<Record<string, ProblemStatus>>(() => {
    if (!user?.id) return {};
    try {
      const key = getProgressKey(user.id);
      const cached = key ? localStorage.getItem(key) : null;
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return {};
  });

  // Revision queue cache: problemId -> boolean
  // Strictly user-scoped: empty when user is not logged in
  const [revisionMap, setRevisionMap] = useState<Record<string, boolean>>(() => {
    if (!user?.id) return {};
    try {
      const key = getRevisionKey(user.id);
      const cached = key ? localStorage.getItem(key) : null;
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
      setRevisionMap({});
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch server-authoritative problem status map from Spring Boot API
      try {
        const rawMap = await apiClient.getUserProblemStatusMap();
        const normalized: Record<string, ProblemStatus> = {};
        if (rawMap && typeof rawMap === 'object') {
          Object.entries(rawMap).forEach(([key, val]) => {
            normalized[key] = normalizeStatus(val);
          });
        }

        setProgressMap(normalized);
        const progKey = getProgressKey(user.id);
        if (progKey) {
          try {
            localStorage.setItem(progKey, JSON.stringify(normalized));
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

          const rMap: Record<string, boolean> = {};
          if (!revError && revData) {
            revData.forEach((row: { problem_id: string }) => {
              rMap[row.problem_id] = true;
            });
          }
          setRevisionMap(rMap);
          const revKey = getRevisionKey(user.id);
          if (revKey) {
            try {
              localStorage.setItem(revKey, JSON.stringify(rMap));
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

  // Sync on mount or when user changes - completely reset state and isolate across users
  useEffect(() => {
    if (!user) {
      setProgressMap({});
      setRevisionMap({});
      // Clean up legacy unscoped keys
      try {
        localStorage.removeItem('verniq_user_progress_cache');
        localStorage.removeItem('verniq_user_revision_cache');
      } catch {
        // ignore
      }
      return;
    }

    // Load cached progress for THIS user only
    const pKey = getProgressKey(user.id);
    if (pKey) {
      try {
        const cached = localStorage.getItem(pKey);
        if (cached) setProgressMap(JSON.parse(cached));
        else setProgressMap({});
      } catch {
        setProgressMap({});
      }
    }

    const rKey = getRevisionKey(user.id);
    if (rKey) {
      try {
        const cached = localStorage.getItem(rKey);
        if (cached) setRevisionMap(JSON.parse(cached));
        else setRevisionMap({});
      } catch {
        setRevisionMap({});
      }
    }

    refreshProgress();
  }, [user?.id, refreshProgress]);

  // Client-side local update (server updates happen automatically upon submission completion)
  const updateProgress = useCallback(
    async (problemId: string, status: ProblemStatus) => {
      setProgressMap((prev) => {
        const next = { ...prev, [problemId]: status };
        if (user?.id) {
          const pKey = getProgressKey(user.id);
          if (pKey) {
            try {
              localStorage.setItem(pKey, JSON.stringify(next));
            } catch {
              // ignore
            }
          }
        }
        return next;
      });
    },
    [user?.id]
  );

  // Mutation: Toggle problem revision status
  const toggleRevision = useCallback(
    async (problemId: string) => {
      const willBeInRevision = !revisionMap[problemId];

      setRevisionMap((prev) => {
        const next = { ...prev, [problemId]: willBeInRevision };
        if (user?.id) {
          const rKey = getRevisionKey(user.id);
          if (rKey) {
            try {
              localStorage.setItem(rKey, JSON.stringify(next));
            } catch {
              // ignore
            }
          }
        }
        return next;
      });

      if (isSupabaseConfigured() && user) {
        try {
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          let targetUuid = problemId;
          if (!UUID_REGEX.test(problemId)) {
            const { data: pData } = await supabase
              .from('problems')
              .select('id')
              .or(`verniq_id.eq.${problemId},slug.eq.${problemId}`)
              .maybeSingle();
            if (pData?.id && UUID_REGEX.test(pData.id)) {
              targetUuid = pData.id;
            } else {
              targetUuid = '';
            }
          }

          if (targetUuid && UUID_REGEX.test(targetUuid)) {
            if (willBeInRevision) {
              await supabase.from('user_revision_queue').upsert({
                user_id: user.id,
                problem_id: targetUuid,
                interval_days: 1,
                next_review_at: new Date(Date.now() + 86400000).toISOString(),
                is_reviewed: false,
              });
            } else {
              await supabase
                .from('user_revision_queue')
                .delete()
                .eq('user_id', user.id)
                .eq('problem_id', targetUuid);
            }
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
