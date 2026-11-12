/**
 * CHAKRIVA Adaptive Roadmap Persistence & Authoritative Progress Service
 * ====================================================================
 * Connects adaptive roadmaps with client storage and server-authoritative
 * judge progress models.
 */

import type {
  AdaptiveRoadmap,
  AdaptiveTaskStatus,
  RoadmapWizardDraft,
  ScheduleRecalculationProposal,
} from '../types/adaptive';
import {
  generateAdaptiveRoadmap,
  generatePersonalizedRoadmap,
  recalculateMissedTasks,
  applyScheduleProposal,
  reconcileLegacySavedRoadmap,
  type AdaptiveRoadmapOptions,
} from '../utils/adaptiveEngine';
import { apiClient, getApiBaseUrl, buildUrl } from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';
import { resolveGoalToSkills, type GoalSkillResolution } from '../utils/goalSkillMapper';
import type { CurriculumTopic } from '../utils/catalogRegistry';

const STORAGE_ACTIVE_ROADMAP = 'chakriva_active_adaptive_roadmap';
const STORAGE_ROADMAPS_LIST = 'chakriva_adaptive_roadmaps_list';
const STORAGE_WIZARD_DRAFT = 'chakriva_roadmap_wizard_draft';

export {
  reconcileLegacySavedRoadmap,
  generateAdaptiveRoadmap,
  generatePersonalizedRoadmap,
  resolveGoalToSkills,
};

/**
 * AI-assisted goal interpretation with graceful deterministic fallback
 */
export async function interpretGoalWithAi(
  draft: RoadmapWizardDraft,
  signal?: AbortSignal
): Promise<GoalSkillResolution> {
  const customAiUrl =
    import.meta.env.VITE_AI_API_URL ||
    (import.meta.env.VITE_AI_SERVICE_URL
      ? buildUrl(import.meta.env.VITE_AI_SERVICE_URL, '/api/v1/ai/roadmap/interpret')
      : undefined);
  const endpoint = customAiUrl || buildUrl(getApiBaseUrl(), '/api/v1/ai/roadmap/interpret');

  let authHeader = '';
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      authHeader = `Bearer ${session.access_token}`;
    }
  } catch {
    // Session retrieval failed; proceed without auth header
  }

  const payload = {
    goal_type: draft.goal || 'placement_prep',
    custom_goal: draft.customGoalText || undefined,
    target_company: draft.targetCompanies?.[0] || undefined,
    target_role: draft.targetRole || undefined,
    target_date: draft.targetDeadline || undefined,
    target_duration_weeks: draft.timelineWeeks || 8,
    current_programming_proficiency: draft.skillLevel || 'intermediate',
    current_dsa_proficiency: draft.approxProblemsSolved && draft.approxProblemsSolved > 100
      ? 'experienced'
      : draft.approxProblemsSolved && draft.approxProblemsSolved > 30
      ? 'some_practice'
      : 'beginner',
    known_topics: draft.masteredTopics || [],
    weak_topics: draft.struggleTopics || [],
    preferred_language: draft.primaryLanguage || 'java',
    daily_availability: draft.weeklyAvailability
      ? {
          monday: (draft.weeklyAvailability.mon ?? 1) * 60,
          tuesday: (draft.weeklyAvailability.tue ?? 1) * 60,
          wednesday: (draft.weeklyAvailability.wed ?? 1) * 60,
          thursday: (draft.weeklyAvailability.thu ?? 1) * 60,
          friday: (draft.weeklyAvailability.fri ?? 1) * 60,
          saturday: (draft.weeklyAvailability.sat ?? 2) * 60,
          sunday: (draft.weeklyAvailability.sun ?? 0) * 60,
        }
      : undefined,
    balance_preference: draft.learningStyle || 'balanced',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
      signal: signal || controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(
        `[interpretGoalWithAi] AI endpoint returned HTTP ${res.status}, falling back to deterministic resolution`
      );
      return resolveGoalToSkills(draft);
    }

    const fallback = resolveGoalToSkills(draft);
    const data = await res.json();
    const recommendedList = Array.isArray(data.recommended_topics)
      ? data.recommended_topics.map((t: any) => ({
          topic: t.topic as CurriculumTopic,
          priority: t.priority || 'medium',
          weight: t.priority === 'critical' ? 1.0 : t.priority === 'high' ? 0.85 : 0.65,
          targetProficiency: (t.target_proficiency as any) || 'practicing',
          rationale: t.rationale || 'Core requirement for goal',
          prerequisites: [],
          provenance: 'role_standard' as const,
          isCompanySpecific: false,
        }))
      : fallback.skillRequirements;

    return {
      ...fallback,
      goal: data.interpreted_goal || draft.goal || 'placement_prep',
      targetProficiency: (data.target_proficiency as any) || fallback.targetProficiency || 'interview_ready',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.85,
      skillRequirements: recommendedList,
      recommendedTopics: recommendedList,
      primaryRationale:
        data.overall_strategy || fallback.primaryRationale || 'Personalized multi-stage preparation curriculum.',
      overallStrategy:
        data.overall_strategy || fallback.overallStrategy || 'Personalized multi-stage preparation curriculum.',
      assumptions:
        Array.isArray(data.assumptions) && data.assumptions.length > 0
          ? data.assumptions
          : fallback.assumptions,
      isFallback: Boolean(data.is_fallback),
    };
  } catch (err) {
    console.warn('[interpretGoalWithAi] Failed or timed out, using deterministic fallback:', err);
    return resolveGoalToSkills(draft);
  }
}

export const adaptiveRoadmapService = {
  /**
   * Load active personalized roadmap from storage
   */
  getActiveRoadmap(): AdaptiveRoadmap | null {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_ROADMAP);
      if (!saved) return null;
      const parsed = JSON.parse(saved) as AdaptiveRoadmap;
      return reconcileLegacySavedRoadmap(parsed);
    } catch {
      return null;
    }
  },

  /**
   * Load all saved personalized roadmaps from local cache (migrating legacy active plan if needed)
   */
  getSavedRoadmaps(): AdaptiveRoadmap[] {
    try {
      const listRaw = localStorage.getItem(STORAGE_ROADMAPS_LIST);
      const parsedList: AdaptiveRoadmap[] = listRaw ? JSON.parse(listRaw) : [];
      const active = this.getActiveRoadmap();

      const map = new Map<string, AdaptiveRoadmap>();
      for (const item of parsedList) {
        if (item && item.id) {
          map.set(item.id, reconcileLegacySavedRoadmap(item));
        }
      }
      if (active && active.id) {
        map.set(active.id, active);
      }

      return Array.from(map.values()).sort((a, b) => {
        if ((a.isActive ?? a.status === 'active') !== (b.isActive ?? b.status === 'active')) {
          return a.isActive || a.status === 'active' ? -1 : 1;
        }
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
    } catch {
      const active = this.getActiveRoadmap();
      return active ? [active] : [];
    }
  },

  /**
   * Persist updated multi-roadmap local cache
   */
  saveRoadmapsList(roadmaps: AdaptiveRoadmap[]): void {
    try {
      localStorage.setItem(STORAGE_ROADMAPS_LIST, JSON.stringify(roadmaps));
    } catch (e) {
      console.warn('Failed to persist roadmaps list to localStorage:', e);
    }
  },

  /**
   * Save active roadmap (and keep list cache synchronized)
   */
  saveActiveRoadmap(roadmap: AdaptiveRoadmap): void {
    try {
      localStorage.setItem(STORAGE_ACTIVE_ROADMAP, JSON.stringify(roadmap));
      const existingRaw = localStorage.getItem(STORAGE_ROADMAPS_LIST);
      const list: AdaptiveRoadmap[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updatedList = [
        roadmap,
        ...list.filter((r) => r && r.id && r.id !== roadmap.id),
      ];
      localStorage.setItem(STORAGE_ROADMAPS_LIST, JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Failed to persist active roadmap to localStorage:', e);
    }
  },

  /**
   * Clear active roadmap
   */
  deleteActiveRoadmap(): void {
    try {
      const current = this.getActiveRoadmap();
      localStorage.removeItem(STORAGE_ACTIVE_ROADMAP);
      if (current?.id) {
        const list = this.getSavedRoadmaps().filter((r) => r.id !== current.id);
        this.saveRoadmapsList(list);
      }
    } catch (e) {
      console.warn('Failed to clear active roadmap:', e);
    }
  },

  /**
   * Wizard Draft Management
   */
  getWizardDraft(): RoadmapWizardDraft | null {
    try {
      const saved = localStorage.getItem(STORAGE_WIZARD_DRAFT);
      if (!saved) return null;
      return JSON.parse(saved) as RoadmapWizardDraft;
    } catch {
      return null;
    }
  },

  saveWizardDraft(draft: RoadmapWizardDraft): void {
    try {
      localStorage.setItem(STORAGE_WIZARD_DRAFT, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save wizard draft:', e);
    }
  },

  clearWizardDraft(): void {
    try {
      localStorage.removeItem(STORAGE_WIZARD_DRAFT);
    } catch (e) {
      console.warn('Failed to clear wizard draft:', e);
    }
  },

  /**
   * Create and activate a new roadmap from wizard draft.
   * By default generates an adaptive roadmap, or delegates to personalized when options.mode === 'personalized'.
   */
  createRoadmapFromDraft(
    draft: RoadmapWizardDraft,
    userId?: string,
    options?: AdaptiveRoadmapOptions
  ): AdaptiveRoadmap {
    const roadmap = generateAdaptiveRoadmap(draft, options);
    if (userId) {
      roadmap.userId = userId;
    }
    this.saveActiveRoadmap(roadmap);
    this.clearWizardDraft();
    return roadmap;
  },

  /**
   * AI-assisted goal interpretation with automatic fallback
   */
  async interpretGoal(draft: RoadmapWizardDraft): Promise<GoalSkillResolution> {
    return interpretGoalWithAi(draft);
  },

  /**
   * Create and activate a genuinely personalized roadmap
   * Uses AI goal interpretation (if available/authenticated) + deterministic multi-stage planning.
   */
  async createPersonalizedRoadmapFromDraft(
    draft: RoadmapWizardDraft,
    userId?: string,
    options?: AdaptiveRoadmapOptions
  ): Promise<AdaptiveRoadmap> {
    let goalSkills = options?.goalSkills;
    if (!goalSkills) {
      try {
        goalSkills = await this.interpretGoal(draft);
      } catch {
        goalSkills = resolveGoalToSkills(draft);
      }
    }

    const roadmap = generatePersonalizedRoadmap(draft, {
      ...options,
      goalSkills,
    });

    if (userId) {
      roadmap.userId = userId;
    }
    this.saveActiveRoadmap(roadmap);
    this.clearWizardDraft();
    return roadmap;
  },

  /**
   * Synchronize roadmap task states with authoritative submission progress map
   * Keeps judge execution authoritative: problem items are only solved if verified by platform.
   */
  syncWithProgressMap(
    roadmap: AdaptiveRoadmap,
    progressMap: Record<string, string>,
    currentDateStr: string = new Date().toISOString().split('T')[0]
  ): AdaptiveRoadmap {
    let updatedCompleted = 0;
    let updatedMissed = 0;
    let total = 0;

    const updatedWeeks = roadmap.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        tasks: day.tasks.map((task) => {
          total++;
          // Check if solved via problemSlug, verniqProblemId, or taskId
          const isSolved =
            (task.problemSlug && progressMap[task.problemSlug] === 'solved') ||
            (task.verniqProblemId && progressMap[task.verniqProblemId] === 'solved') ||
            progressMap[task.id] === 'completed' ||
            task.status === 'completed';

          if (isSolved) {
            updatedCompleted++;
            return {
              ...task,
              status: 'completed' as const,
              completedAt: task.completedAt || new Date().toISOString(),
            };
          }

          // If not solved, evaluate if missed or upcoming
          if (day.date < currentDateStr) {
            updatedMissed++;
            return {
              ...task,
              status: 'missed' as const,
            };
          }

          if (day.date === currentDateStr) {
            return {
              ...task,
              status: 'in_progress' as const,
            };
          }

          return {
            ...task,
            status: 'upcoming' as const,
          };
        }),
      })),
    }));

    const synced: AdaptiveRoadmap = {
      ...roadmap,
      weeks: updatedWeeks,
      totalTasks: total,
      completedTasks: updatedCompleted,
      missedTasks: updatedMissed,
      progressPercent: total > 0 ? Math.round((updatedCompleted / total) * 100) : 0,
      updatedAt: new Date().toISOString(),
    };

    this.saveActiveRoadmap(synced);
    return synced;
  },

  /**
   * Mark a non-problem task completed or toggle its status
   */
  toggleTaskCompleted(roadmap: AdaptiveRoadmap, taskId: string): AdaptiveRoadmap {
    let changed = false;

    const updatedWeeks = roadmap.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        tasks: day.tasks.map((task) => {
          if (task.id === taskId) {
            changed = true;
            const newStatus: AdaptiveTaskStatus = task.status === 'completed' ? 'in_progress' : 'completed';
            return {
              ...task,
              status: newStatus,
              completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
            };
          }
          return task;
        }),
      })),
    }));

    if (!changed) return roadmap;

    const allTasks = updatedWeeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
    const completed = allTasks.filter((t) => t.status === 'completed').length;
    const missed = allTasks.filter((t) => t.status === 'missed').length;

    const updated: AdaptiveRoadmap = {
      ...roadmap,
      weeks: updatedWeeks,
      completedTasks: completed,
      missedTasks: missed,
      progressPercent: allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0,
      updatedAt: new Date().toISOString(),
    };

    this.saveActiveRoadmap(updated);
    return updated;
  },

  /**
   * Recalculate missed tasks without overloading upcoming days
   */
  getMissedTaskProposal(
    roadmap: AdaptiveRoadmap,
    currentDateStr?: string
  ): ScheduleRecalculationProposal | null {
    return recalculateMissedTasks(roadmap, currentDateStr);
  },

  /**
   * Apply accepted recalculation
   */
  acceptScheduleProposal(
    roadmap: AdaptiveRoadmap,
    proposal: ScheduleRecalculationProposal
  ): AdaptiveRoadmap {
    const updated = applyScheduleProposal(roadmap, proposal);
    this.saveActiveRoadmap(updated);
    return updated;
  },

  // ==============================================================================
  // CHAKRIVA PHASE 2: SERVER-SIDE PERSISTENCE & SYNCHRONIZATION
  // ==============================================================================

  /**
   * Fetch authoritative personalized roadmap from Spring Boot backend.
   * Server data is canonical.
   * Falls back gracefully to local storage if offline or server returns 404/empty.
   */
  async fetchServerRoadmap(): Promise<AdaptiveRoadmap | null> {
    try {
      const serverDto = await apiClient.getPersonalizedRoadmap();
      if (serverDto && serverDto.planData && Object.keys(serverDto.planData).length > 0) {
        const roadmap: AdaptiveRoadmap = reconcileLegacySavedRoadmap({
          ...serverDto.planData,
          id: serverDto.id || serverDto.planData.id,
          userId: serverDto.userId || serverDto.planData.userId,
          version: serverDto.version,
          createdAt: serverDto.createdAt || serverDto.planData.createdAt,
          updatedAt: serverDto.updatedAt || serverDto.planData.updatedAt,
        });
        // Update local cache with authoritative server plan
        this.saveActiveRoadmap(roadmap);
        return roadmap;
      }
      return null;
    } catch (err: unknown) {
      console.warn('[adaptiveRoadmapService] Could not fetch server roadmap, using local cache:', err);
      return this.getActiveRoadmap();
    }
  },

  /**
   * Save personalized roadmap to Spring Boot backend.
   * Enforces server confirmation before marking save successful.
   */
  async saveServerRoadmap(roadmap: AdaptiveRoadmap): Promise<AdaptiveRoadmap> {
    const resolvedTitle =
      roadmap.title?.trim() ||
      roadmap.profile?.planName?.trim() ||
      (roadmap.profile?.targetRole
        ? `${roadmap.profile.targetRole} Roadmap`
        : 'My Personalized Roadmap');

    const payload = {
      title: resolvedTitle,
      goal: roadmap.profile?.goal || 'product_sde',
      targetDate: roadmap.profile?.targetDeadline,
      dailyMinutes: roadmap.feasibility?.weeklyHours
        ? Math.max(30, Math.round((roadmap.feasibility.weeklyHours * 60) / 7))
        : 60,
      version: roadmap.version,
      planData: { ...roadmap, title: resolvedTitle },
    };

    const res = await apiClient.savePersonalizedRoadmap(payload);
    const updated: AdaptiveRoadmap = {
      ...roadmap,
      title: res.title || resolvedTitle,
      isActive: res.isActive,
      status: res.isActive ? 'active' : 'paused',
      id: res.id || roadmap.id,
      userId: res.userId || roadmap.userId,
      version: res.version,
      updatedAt: res.updatedAt || new Date().toISOString(),
    };

    this.saveActiveRoadmap(updated);
    return updated;
  },

  /**
   * Fetch all saved personalized roadmaps from Spring Boot backend (with local cache fallback).
   */
  async fetchServerRoadmapsList(): Promise<AdaptiveRoadmap[]> {
    try {
      const serverDtos = await apiClient.listPersonalizedRoadmaps();
      const mapped = serverDtos
        .filter((dto) => dto && dto.planData && Object.keys(dto.planData).length > 0)
        .map((dto) =>
          reconcileLegacySavedRoadmap({
            ...dto.planData,
            id: dto.id || dto.planData.id,
            userId: dto.userId || dto.planData.userId,
            title: dto.title || dto.planData.title,
            isActive: dto.isActive,
            status: dto.isActive ? 'active' : 'paused',
            version: dto.version,
            createdAt: dto.createdAt || dto.planData.createdAt,
            updatedAt: dto.updatedAt || dto.planData.updatedAt,
          })
        );

      this.saveRoadmapsList(mapped);
      const active = mapped.find((m) => m.isActive) || null;
      if (active) {
        localStorage.setItem(STORAGE_ACTIVE_ROADMAP, JSON.stringify(active));
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_ROADMAP);
      }
      return mapped;
    } catch (err) {
      console.warn('[adaptiveRoadmapService] Could not list server roadmaps, using local cache:', err);
      return this.getSavedRoadmaps();
    }
  },

  /**
   * Create and persist a distinct new personalized roadmap (pausing previous active plans).
   */
  async createNewServerRoadmap(
    draft: RoadmapWizardDraft,
    userId?: string,
    options?: AdaptiveRoadmapOptions,
    isAuthenticated: boolean = false
  ): Promise<AdaptiveRoadmap> {
    const generated = await this.createPersonalizedRoadmapFromDraft(draft, userId, options);
    const resolvedTitle =
      generated.title?.trim() ||
      draft.planName?.trim() ||
      (draft.targetRole ? `${draft.targetRole} Roadmap` : 'My Personalized Roadmap');

    const enriched: AdaptiveRoadmap = {
      ...generated,
      title: resolvedTitle,
      status: 'active',
      isActive: true,
    };

    // Mark any prior locally cached active plans as paused
    const pausedPrior = this.getSavedRoadmaps()
      .filter((r) => r.id !== enriched.id)
      .map((r) => ({ ...r, isActive: false, status: 'paused' as const }));

    if (isAuthenticated) {
      try {
        const res = await apiClient.createNewPersonalizedRoadmap({
          title: resolvedTitle,
          goal: draft.goal || 'product_sde',
          targetDate: draft.targetDeadline,
          dailyMinutes: enriched.feasibility?.weeklyHours
            ? Math.max(30, Math.round((enriched.feasibility.weeklyHours * 60) / 7))
            : 60,
          version: 1,
          planData: enriched,
        });
        const serverSaved: AdaptiveRoadmap = {
          ...enriched,
          id: res.id || enriched.id,
          userId: res.userId || enriched.userId,
          title: res.title || resolvedTitle,
          version: res.version,
          isActive: res.isActive,
          status: res.isActive ? 'active' : 'paused',
          createdAt: res.createdAt || enriched.createdAt,
          updatedAt: res.updatedAt || enriched.updatedAt,
        };
        this.saveRoadmapsList([serverSaved, ...pausedPrior]);
        localStorage.setItem(STORAGE_ACTIVE_ROADMAP, JSON.stringify(serverSaved));
        return serverSaved;
      } catch (err) {
        console.warn('[adaptiveRoadmapService] Failed to create server roadmap, persisted locally:', err);
      }
    }

    this.saveRoadmapsList([enriched, ...pausedPrior]);
    localStorage.setItem(STORAGE_ACTIVE_ROADMAP, JSON.stringify(enriched));
    return enriched;
  },

  /**
   * Toggle roadmap status ('active' | 'paused') on server (if authenticated) and local cache.
   */
  async setRoadmapStatus(
    planId: string,
    status: 'active' | 'paused',
    isAuthenticated: boolean = false
  ): Promise<AdaptiveRoadmap | null> {
    if (isAuthenticated && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(planId)) {
      try {
        const dto = await apiClient.setPersonalizedRoadmapStatus(planId, status);
        await this.fetchServerRoadmapsList();
        const updated = reconcileLegacySavedRoadmap({
          ...dto.planData,
          id: dto.id,
          userId: dto.userId,
          title: dto.title || dto.planData.title,
          isActive: dto.isActive,
          status: dto.isActive ? 'active' : 'paused',
          version: dto.version,
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt,
        });
        return updated;
      } catch (err) {
        console.warn('[adaptiveRoadmapService] Failed to update roadmap status on server:', err);
      }
    }

    const list = this.getSavedRoadmaps().map((r) => {
      if (r.id === planId) {
        return { ...r, isActive: status === 'active', status, updatedAt: new Date().toISOString() };
      }
      if (status === 'active') {
        return { ...r, isActive: false, status: 'paused' as const };
      }
      return r;
    });
    this.saveRoadmapsList(list);
    const active = list.find((r) => r.isActive) || null;
    if (active) {
      localStorage.setItem(STORAGE_ACTIVE_ROADMAP, JSON.stringify(active));
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_ROADMAP);
    }
    return list.find((r) => r.id === planId) || null;
  },

  /**
   * Delete a specific roadmap by ID on server (when UUID) and local cache.
   */
  async deleteRoadmapById(planId: string, isAuthenticated: boolean = false): Promise<void> {
    if (isAuthenticated && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(planId)) {
      try {
        await apiClient.deletePersonalizedRoadmapById(planId);
      } catch (err) {
        console.warn('[adaptiveRoadmapService] Failed to delete roadmap on server:', err);
      }
    }
    const list = this.getSavedRoadmaps().filter((r) => r.id !== planId);
    this.saveRoadmapsList(list);
    const active = this.getActiveRoadmap();
    if (active?.id === planId) {
      const nextActive = list.find((r) => r.isActive) || null;
      if (nextActive) {
        localStorage.setItem(STORAGE_ACTIVE_ROADMAP, JSON.stringify(nextActive));
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_ROADMAP);
      }
    }
  },

  /**
   * Apply approved rescheduling proposal with server persistence.
   */
  async rescheduleOnServer(
    roadmap: AdaptiveRoadmap,
    proposal: ScheduleRecalculationProposal
  ): Promise<AdaptiveRoadmap> {
    const recalculated = applyScheduleProposal(roadmap, proposal);
    try {
      const res = await apiClient.reschedulePersonalizedRoadmap(recalculated, roadmap.version);
      const updated: AdaptiveRoadmap = {
        ...recalculated,
        version: res.version,
        updatedAt: res.updatedAt || new Date().toISOString(),
      };
      this.saveActiveRoadmap(updated);
      return updated;
    } catch (err) {
      console.warn('[adaptiveRoadmapService] Reschedule server save failed, keeping local proposal:', err);
      this.saveActiveRoadmap(recalculated);
      throw err;
    }
  },

  /**
   * Update roadmap preferences on server and preserve completed history.
   */
  async updatePreferencesOnServer(
    roadmap: AdaptiveRoadmap,
    updatedDraft: RoadmapWizardDraft
  ): Promise<AdaptiveRoadmap> {
    // Generate new plan from updated draft
    const newRoadmap = generateAdaptiveRoadmap(updatedDraft);
    if (roadmap.userId) {
      newRoadmap.userId = roadmap.userId;
    }

    // Reconcile with completed tasks from previous roadmap (match by verniqProblemId, problemSlug, or taskId)
    const completedKeys = new Set(
      roadmap.weeks
        .flatMap((w) => w.days.flatMap((d) => d.tasks))
        .filter((t) => t.status === 'completed')
        .flatMap((t) => [t.verniqProblemId, t.problemSlug, t.id].filter(Boolean))
    );

    let recomputedCompleted = 0;
    const reconciledWeeks = newRoadmap.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) => ({
        ...day,
        tasks: day.tasks.map((task) => {
          if (
            (task.verniqProblemId && completedKeys.has(task.verniqProblemId)) ||
            (task.problemSlug && completedKeys.has(task.problemSlug)) ||
            (task.id && completedKeys.has(task.id))
          ) {
            recomputedCompleted++;
            return {
              ...task,
              status: 'completed' as const,
              completedAt: task.completedAt || new Date().toISOString(),
            };
          }
          return task;
        }),
      })),
    }));

    const reconciledRoadmap: AdaptiveRoadmap = {
      ...newRoadmap,
      weeks: reconciledWeeks,
      completedTasks: recomputedCompleted,
      progressPercent:
        newRoadmap.totalTasks > 0
          ? Math.round((recomputedCompleted / newRoadmap.totalTasks) * 100)
          : 0,
      version: roadmap.version,
    };

    return await this.saveServerRoadmap(reconciledRoadmap);
  },

  /**
   * Deactivate roadmap on server and clear local state.
   */
  async deleteServerRoadmap(): Promise<void> {
    try {
      await apiClient.deletePersonalizedRoadmap();
    } catch (e) {
      console.warn('Failed to delete roadmap on server:', e);
    }
    this.deleteActiveRoadmap();
  },
};
