/**
 * VERNIQ useRoadmap Hook
 * =======================
 * Manages roadmap tree fetching, user progress synchronization,
 * sequential locking evaluation, and status mutations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { roadmapService } from '../services/roadmapService';
import { applyLockingAndStates, calculateItemProgress } from '../utils/progressEngine';
import type { Roadmap, RoadmapItemStatus, ProgressSummary } from '../types';

export const useRoadmap = (slug: string = 'dsa-mastery') => {
  const { user } = useAuth();
  const [rawRoadmap, setRawRoadmap] = useState<Roadmap | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, RoadmapItemStatus>>({});
  const [serverProgress, setServerProgress] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedRoadmap, fetchedProgress, fetchedSummary] = await Promise.all([
        roadmapService.getRoadmapBySlug(slug),
        roadmapService.getUserProgress(user?.id),
        roadmapService.getProgressSummary(slug).catch(() => null),
      ]);
      setRawRoadmap(fetchedRoadmap);
      setProgressMap(fetchedProgress);
      if (fetchedSummary) {
        setServerProgress(fetchedSummary);
      }
    } catch (err: any) {
      console.error('Error fetching roadmap:', err);
      setError(err?.message || 'Failed to load roadmap.');
    } finally {
      setLoading(false);
    }
  }, [slug, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Evaluated roadmap with prerequisite states and locking
  // If rawRoadmap came from backend, it already has server-evaluated statuses
  const evaluatedRoadmap = useMemo(() => {
    if (!rawRoadmap) return null;
    const hasServerStatus = rawRoadmap.sprints.some((s) => s.status);
    if (hasServerStatus) {
      return rawRoadmap;
    }
    return applyLockingAndStates(rawRoadmap, progressMap, true);
  }, [rawRoadmap, progressMap]);

  // Overall roadmap progress summary
  const progressSummary: ProgressSummary = useMemo(() => {
    if (serverProgress) {
      const allItems = rawRoadmap?.sprints.flatMap((s) => s.days.flatMap((d) => d.items)) || [];
      const completedDays = rawRoadmap?.sprints.flatMap((s) => s.days).filter((d) => d.status === 'COMPLETED').length || 0;
      const totalDays = rawRoadmap?.sprints.flatMap((s) => s.days).length || 0;

      return {
        completedItems: serverProgress.completedItems ?? 0,
        totalItems: serverProgress.totalItems ?? (allItems.length || 0),
        percentage: Math.round(serverProgress.progressPercent ?? 0),
        completedDays,
        totalDays,
        status: (serverProgress.progressPercent >= 100 ? 'COMPLETED' : serverProgress.completedItems > 0 ? 'IN_PROGRESS' : 'AVAILABLE') as RoadmapItemStatus,
        completedNodes: serverProgress.completedNodes,
        totalNodes: serverProgress.totalNodes,
        currentSprintTitle: serverProgress.currentSprintTitle,
        currentDayNumber: serverProgress.currentDayNumber,
      };
    }

    if (!rawRoadmap) {
      return {
        completedItems: 0,
        totalItems: 0,
        percentage: 0,
        completedDays: 0,
        totalDays: 0,
        status: 'AVAILABLE',
      };
    }
    const allItems = rawRoadmap.sprints.flatMap((s) => s.days.flatMap((d) => d.items));
    return calculateItemProgress(allItems, progressMap);
  }, [rawRoadmap, progressMap, serverProgress]);

  // Toggle item completion
  const toggleItemCompleted = useCallback(
    async (itemId: string) => {
      const current = progressMap[itemId];
      const nextStatus: RoadmapItemStatus = current === 'COMPLETED' ? 'AVAILABLE' : 'COMPLETED';

      // Optimistic update
      setProgressMap((prev) => ({
        ...prev,
        [itemId]: nextStatus,
      }));

      try {
        await roadmapService.setItemStatus(itemId, nextStatus, user?.id);
        // Refresh server-authoritative state
        await fetchData();
      } catch (err) {
        console.error('Failed to update item status:', err);
        // Revert on error
        setProgressMap((prev) => ({
          ...prev,
          [itemId]: current,
        }));
      }
    },
    [progressMap, user?.id, fetchData]
  );

  // Set specific item status
  const setItemStatus = useCallback(
    async (itemId: string, status: RoadmapItemStatus) => {
      setProgressMap((prev) => ({
        ...prev,
        [itemId]: status,
      }));
      await roadmapService.setItemStatus(itemId, status, user?.id);
      await fetchData();
    },
    [user?.id, fetchData]
  );

  return {
    roadmap: evaluatedRoadmap,
    rawRoadmap,
    progressMap,
    progressSummary,
    loading,
    error,
    refetch: fetchData,
    toggleItemCompleted,
    setItemStatus,
  };
};
