import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/layout/PageHeader';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { useRoadmap as useLegacyRoadmap } from '@/hooks/useRoadmap';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useAuth } from '@/hooks/useAuth';
import {
  RoadmapOverviewPage,
  AdaptiveRoadmapView,
  RoadmapCreationWizard,
  RoadmapLandingView,
  adaptiveRoadmapService,
  type AdaptiveRoadmap,
} from '@/features/roadmap';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const RoadmapsView: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [savedRoadmaps, setSavedRoadmaps] = useState<AdaptiveRoadmap[]>(() => {
    return adaptiveRoadmapService.getSavedRoadmaps();
  });
  const [adaptiveRoadmap, setAdaptiveRoadmap] = useState<AdaptiveRoadmap | null>(() => {
    return adaptiveRoadmapService.getActiveRoadmap();
  });
  const { progressMap } = useUserProgress();

  // Load multi-roadmap list + active roadmap from server on mount or auth change
  useEffect(() => {
    let isMounted = true;
    async function loadServerPlans() {
      if (user) {
        try {
          const allPlans = await adaptiveRoadmapService.fetchServerRoadmapsList();
          if (isMounted) {
            if (allPlans.length > 0) {
              setSavedRoadmaps(allPlans);
              const active = allPlans.find((p) => p.isActive) || allPlans[0];
              setAdaptiveRoadmap(active);
            } else {
              const single = await adaptiveRoadmapService.fetchServerRoadmap();
              if (isMounted && single) {
                setAdaptiveRoadmap(single);
                setSavedRoadmaps([single]);
              }
            }
          }
        } catch (err) {
          console.warn('[RoadmapsView] Could not load server roadmaps:', err);
        }
      }
    }
    loadServerPlans();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Synchronize adaptive roadmaps with platform's authoritative judge progress
  useEffect(() => {
    if (adaptiveRoadmap) {
      const synced = adaptiveRoadmapService.syncWithProgressMap(adaptiveRoadmap, progressMap);
      setAdaptiveRoadmap(synced);
      setSavedRoadmaps((prev) =>
        prev.map((r) => (r.id === synced.id ? synced : r))
      );
    }
  }, [progressMap]);

  const hasAdaptive = Boolean(adaptiveRoadmap);
  const activeSlug = slug || 'landing';

  const handleRoadmapGenerated = () => {
    setIsWizardOpen(false);
    const all = adaptiveRoadmapService.getSavedRoadmaps();
    const active = adaptiveRoadmapService.getActiveRoadmap() || all[0] || null;
    setSavedRoadmaps(all);
    setAdaptiveRoadmap(active);
    if (active) {
      navigate('/app/roadmap/adaptive');
    }
  };

  const handleOpenRoadmap = async (roadmapId?: string) => {
    if (roadmapId) {
      const found = savedRoadmaps.find((r) => r.id === roadmapId);
      if (found) {
        setAdaptiveRoadmap(found);
        adaptiveRoadmapService.saveActiveRoadmap(found);
      }
    }
    navigate('/app/roadmap/adaptive');
  };

  const handleToggleStatus = async (roadmapId: string, nextStatus: 'active' | 'paused') => {
    await adaptiveRoadmapService.setRoadmapStatus(roadmapId, nextStatus, Boolean(user));
    const refreshed = adaptiveRoadmapService.getSavedRoadmaps();
    setSavedRoadmaps(refreshed);
    const current = refreshed.find((r) => r.id === roadmapId) || refreshed.find((r) => r.isActive) || null;
    setAdaptiveRoadmap(current);
  };

  const handleDeletePlan = async (roadmapId: string) => {
    await adaptiveRoadmapService.deleteRoadmapById(roadmapId, Boolean(user));
    const remaining = adaptiveRoadmapService.getSavedRoadmaps();
    setSavedRoadmaps(remaining);
    const nextActive = remaining.find((r) => r.isActive) || remaining[0] || null;
    setAdaptiveRoadmap(nextActive);
    if (!nextActive || adaptiveRoadmap?.id === roadmapId) {
      navigate('/app/roadmap');
    }
  };

  const breadcrumbs = [
    { label: 'CHAKRIVA', href: '/app/home' },
    { label: 'Roadmap', href: '/app/roadmap' },
    ...(isWizardOpen
      ? [{ label: 'Build Your Roadmap' }]
      : activeSlug === 'dsa-mastery'
      ? [{ label: 'DSA Interview Mastery' }]
      : activeSlug === 'dsa-problem-solving'
      ? [{ label: 'Topic Graph Index (Legacy A2Z)' }]
      : activeSlug === 'adaptive'
      ? [{ label: adaptiveRoadmap?.title || 'Active Roadmap' }]
      : []),
  ];

  return (
    <DashboardLayout breadcrumbs={breadcrumbs}>
      <div className="w-full">
        {/* Secondary Track Navigation Bar (only displayed on secondary tracks when wizard closed) */}
        {!isWizardOpen && (activeSlug === 'dsa-mastery' || activeSlug === 'dsa-problem-solving') && (
          <div className="max-w-6xl mx-auto mb-6 rounded-xl border border-[#192033] bg-[#0F131D] px-4 py-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2">
              <Link
                to={hasAdaptive ? '/app/roadmap/adaptive' : '/app/roadmap'}
                className="flex items-center gap-1.5 text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
              >
                <span>← Back to Roadmap</span>
              </Link>
              <div className="flex items-center gap-4 text-[#8592A8]">
                <Link
                  to="/roadmaps/dsa-mastery"
                  className={activeSlug === 'dsa-mastery' ? 'text-[#F3F6FF] font-bold' : 'hover:text-[#F3F6FF] transition-colors'}
                >
                  DSA Interview Mastery
                </Link>
                <span className="text-[#27314A]">•</span>
                <Link
                  to="/roadmaps/dsa-problem-solving"
                  className={activeSlug === 'dsa-problem-solving' ? 'text-[#F3F6FF] font-bold' : 'hover:text-[#F3F6FF] transition-colors'}
                >
                  Topic Graph Index (Legacy A2Z)
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Pages 2-6 Creation Experience OR View Switcher */}
        {isWizardOpen ? (
          <RoadmapCreationWizard
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onGenerated={handleRoadmapGenerated}
          />
        ) : activeSlug === 'adaptive' && adaptiveRoadmap ? (
          <AdaptiveRoadmapView
            roadmap={adaptiveRoadmap}
            onRoadmapUpdated={(updated) => {
              setAdaptiveRoadmap(updated);
              setSavedRoadmaps((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            }}
            onCreateNew={() => setIsWizardOpen(true)}
            onBackToOverview={() => navigate('/app/roadmap')}
            onToggleStatus={handleToggleStatus}
            onDeletePlan={handleDeletePlan}
          />
        ) : activeSlug === 'landing' ? (
          <RoadmapLandingView
            activeRoadmap={adaptiveRoadmap}
            savedRoadmaps={savedRoadmaps}
            onCreateRoadmap={() => setIsWizardOpen(true)}
            onAdjustPlan={() => {
              if (adaptiveRoadmap) {
                navigate('/app/roadmap/adaptive');
              } else {
                setIsWizardOpen(true);
              }
            }}
            onViewRoadmap={handleOpenRoadmap}
            onToggleRoadmapStatus={handleToggleStatus}
            onDeleteRoadmap={handleDeletePlan}
          />
        ) : activeSlug === 'dsa-problem-solving' ? (
          <LegacyRoadmapView />
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            {!hasAdaptive && (
              <div className="p-4 rounded border border-primary/30 bg-primary-subtle/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold font-mono text-text-primary uppercase">
                      Adaptive Learning Plan Available
                    </h4>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Create a personalized schedule calibrated to your target companies, daily availability (Mon–Sun), and weak topics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-primary hover:bg-primary-hover text-white text-xs font-mono font-bold transition-colors shrink-0 cursor-pointer"
                >
                  <span>Build My Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <RoadmapOverviewPage slug={activeSlug} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const LegacyRoadmapView: React.FC = () => {
  const { roadmap, loading, refetch } = useLegacyRoadmap('dsa-problem-solving');
  const { progressMap, revisionMap } = useUserProgress();

  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: prev[stepId] === undefined ? false : !prev[stepId],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    (roadmap.steps || []).forEach((s) => {
      next[s.id] = true;
    });
    setExpandedSteps(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    (roadmap.steps || []).forEach((s) => {
      next[s.id] = false;
    });
    setExpandedSteps(next);
  };

  const allProblems = useMemo(() => {
    return (roadmap.steps || []).flatMap((step) =>
      (step.topics || []).flatMap((sub) => sub.problems || [])
    );
  }, [roadmap]);

  const totalProblemsCount = allProblems.length;
  const completedProblemsCount = allProblems.filter((p) => progressMap[p.id] === 'solved').length;
  const overallPercentage =
    totalProblemsCount > 0 ? Math.round((completedProblemsCount / totalProblemsCount) * 100) : 0;
  const revisionActiveCount = allProblems.filter((p) => Boolean(revisionMap[p.id])).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left text-text-primary">
      {/* Header Banner */}
      <PageHeader
        badge="Topic Graph (A2Z)"
        title={roadmap.title}
        subtitle={roadmap.description}
        actions={
          <div className="p-3.5 rounded-xl border border-[#1B2234] bg-[#0F131D] w-full md:w-72 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-medium">
              <span className="text-[#94A1B8]">Total Completion</span>
              <span className="text-[#00B8A3] font-bold tabular-nums">
                {completedProblemsCount} / {totalProblemsCount} ({overallPercentage}%)
              </span>
            </div>
            <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#3B82F6] to-[#00B8A3] h-full transition-all duration-300"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#94A1B8] font-mono">
              <span>Ebbinghaus Revision</span>
              <span className="text-[#FFC01E] tabular-nums font-semibold">
                {revisionActiveCount} Active
              </span>
            </div>
          </div>
        }
      />

      {/* Stepper Controls */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#171D2D]">
        <div className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span>Topic Graph Tree (Step → Topic → Problem Nodes)</span>
          {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="text-xs font-mono text-text-secondary hover:text-text-primary px-2.5 py-1 rounded hover:bg-surface-elevated transition-colors flex items-center gap-1.5"
            title="Refresh Curriculum"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={expandAll}
            className="text-xs font-mono text-text-secondary hover:text-text-primary px-2.5 py-1 rounded hover:bg-surface-elevated transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs font-mono text-text-secondary hover:text-text-primary px-2.5 py-1 rounded hover:bg-surface-elevated transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {(roadmap.steps || []).map((step, idx) => {
          const isExpanded = expandedSteps[step.id] ?? true;
          const stepProblems = (step.topics || []).flatMap((sub) => sub.problems || []);
          const stepTotal = stepProblems.length;
          const stepCompleted = stepProblems.filter((p) => progressMap[p.id] === 'solved').length;
          const stepPercentage = stepTotal > 0 ? Math.round((stepCompleted / stepTotal) * 100) : 0;

          return (
            <div
              key={step.id}
              className="border border-[#192033] rounded-xl bg-[#0F131D] overflow-hidden"
            >
              <button
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center justify-between p-4 bg-[#121724] hover:bg-[#161D2E] transition-colors text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="text-[#7C8BA6]">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#3B82F6]" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#60A5FA]">
                        STEP {idx + 1}
                      </span>
                      <span className="text-xs font-mono text-[#7C8BA6]">
                        ({stepTotal} Problems)
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#F3F6FF] mt-0.5">
                      {step.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="text-xs font-mono text-[#94A1B8]">
                      {stepCompleted} / {stepTotal} Solved
                    </span>
                    <div className="w-24 bg-[#141A29] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#3B82F6] to-[#00B8A3] h-full transition-all duration-300"
                        style={{ width: `${stepPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 space-y-4 bg-[#0B0E16] border-t border-[#171D2D]">
                  {(step as any).description && (
                    <p className="text-xs text-[#8592A8]">{(step as any).description}</p>
                  )}
                  <div className="space-y-4">
                    {(step.topics || []).map((topic) => (
                      <div key={topic.id} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono font-semibold text-[#94A1B8]">
                          <span>{topic.title}</span>
                          <span>{topic.problems?.length || 0} items</span>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {(topic.problems || []).map((problem) => {
                            const isSolved = progressMap[problem.id] === 'solved';
                            return (
                              <div
                                key={problem.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F131D] border border-[#181F30] hover:border-[#2B3754] transition-colors text-xs"
                              >
                                <div className="flex items-center gap-2.5">
                                  {isSolved ? (
                                    <CheckCircle2 className="w-4 h-4 text-[#00B8A3]" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-[#2C3752]" />
                                  )}
                                  <Link
                                    to={`/problems/${problem.slug}`}
                                    className="font-medium text-[#E2E8F5] hover:text-[#60A5FA] transition-colors"
                                  >
                                    {problem.title}
                                  </Link>
                                </div>
                                <div className="flex items-center gap-2">
                                  <DifficultyBadge difficulty={problem.difficulty} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
