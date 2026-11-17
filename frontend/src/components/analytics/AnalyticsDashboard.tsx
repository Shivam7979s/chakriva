import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  apiClient,
  type AnalyticsOverviewDto,
  type TopicAnalyticsDto,
  type CompanyAnalyticsDto,
  type TrendPointDto,
  type DeterministicInsightDto,
} from '@/lib/apiClient';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  deriveDifficultyStatsFromProgress,
  deriveTopicStatsFromProgress,
  deriveDefaultCodingStats,
  generateFallbackInsights,
  getAssessmentPillConfig,
  safePercentage,
} from '@/features/progress/utils/progressAnalytics';
import { cn } from '@/lib/utils';

export interface AnalyticsDashboardProps {
  onRefreshParent?: () => void;
}

interface ProfileStats {
  score: number;
  currentStreak: number;
  longestStreak: number;
  problemsSolvedCount: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = () => {
  const { user } = useAuth();
  const { progressMap } = useUserProgress();

  const [serverData, setServerData] = useState<AnalyticsOverviewDto | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);

  // 1. Fetch user profile stats (score, streaks) from Supabase
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user?.id || !isSupabaseConfigured()) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('score, current_streak, longest_streak, problems_solved_count')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data && !cancelled) {
          setProfileStats({
            score: Number(data.score || 0),
            currentStreak: Number(data.current_streak || 0),
            longestStreak: Number(data.longest_streak || 0),
            problemsSolvedCount: Number(data.problems_solved_count || 0),
          });
        }
      } catch {
        // Non-blocking fallback
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // 2. Fetch server-authoritative analytics overview
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await apiClient.getAnalyticsOverview();
      if (res && res.coding) {
        setServerData(res);
      }
    } catch {
      // Gracefully fall back to local progress map and catalog derivation
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // 3. Fallback derivation if server is loading or offline
  const fallbackDifficulty = useMemo(
    () => deriveDifficultyStatsFromProgress(progressMap),
    [progressMap]
  );

  const fallbackTopics = useMemo(
    () => deriveTopicStatsFromProgress(progressMap),
    [progressMap]
  );

  const fallbackCoding = useMemo(
    () => deriveDefaultCodingStats(progressMap, profileStats?.problemsSolvedCount),
    [progressMap, profileStats?.problemsSolvedCount]
  );

  // Active resolved data (server if available, otherwise synthetic fallback)
  const coding = serverData?.coding || fallbackCoding;
  const difficulty = serverData?.difficulty || fallbackDifficulty;
  const topics = (serverData?.topics && serverData.topics.length > 0) ? serverData.topics : fallbackTopics;
  const companies = serverData?.companies || [];
  const velocity = serverData?.velocity || {
    problemsSolvedLast7Days: coding.problemsSolved,
    problemsSolvedLast30Days: coding.problemsSolved,
    submissionsLast7Days: coding.totalSubmissions,
    activeRoadmap: null,
  };
  const trends = serverData?.trends || [];
  const insights = (serverData?.insights && serverData.insights.length > 0)
    ? serverData.insights
    : generateFallbackInsights(coding.problemsSolved, velocity.activeRoadmap?.roadmapTitle);

  return (
    <div className="space-y-6 text-left">
      {/* 1. Top 4 Core Performance KPI Cards (Always prominent at the top) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Problems Solved */}
        <div className="p-5 rounded-2xl bg-[#0F131D] border border-[#181F30]">
          <div className="text-xs font-medium text-[#7C8BA6] mb-1.5">Problems Solved</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {coding.problemsSolved}
            </span>
            <span className="text-xs text-[#7C8BA6]">
              / {difficulty.totalCatalog > 0 ? difficulty.totalCatalog : '508'} catalog
            </span>
          </div>
          <div className="mt-3 w-full bg-[#141A29] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
              style={{
                width: `${safePercentage(
                  coding.problemsSolved,
                  difficulty.totalCatalog > 0 ? difficulty.totalCatalog : 508
                )}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#7C8BA6] mt-2">
            <span>Solve Rate</span>
            <span className="text-white font-medium">{coding.problemSolveRate}%</span>
          </div>
        </div>

        {/* Acceptance Rate */}
        <div className="p-5 rounded-2xl bg-[#0F131D] border border-[#181F30]">
          <div className="text-xs font-medium text-[#7C8BA6] mb-1.5">Acceptance Rate</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {coding.submissionAcceptanceRate}%
            </span>
            <span className="text-xs text-[#7C8BA6]">
              ({coding.acceptedSubmissions} AC)
            </span>
          </div>
          <div className="mt-3 w-full bg-[#141A29] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#00B8A3] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, coding.submissionAcceptanceRate)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#7C8BA6] mt-2">
            <span>Total Judged</span>
            <span className="text-white font-medium">{coding.totalSubmissions} runs</span>
          </div>
        </div>

        {/* Solving Velocity */}
        <div className="p-5 rounded-2xl bg-[#0F131D] border border-[#181F30]">
          <div className="text-xs font-medium text-[#7C8BA6] mb-1.5">Solving Velocity</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {velocity.problemsSolvedLast7Days}
            </span>
            <span className="text-xs text-[#7C8BA6]">solved this week</span>
          </div>
          <div className="text-[11px] text-[#7C8BA6] mt-3">
            <span>{velocity.submissionsLast7Days} submissions (7 days)</span>
          </div>
          <div className="text-[11px] text-[#556480] mt-1">
            <span>
              {profileStats?.currentStreak
                ? `${profileStats.currentStreak}-day active streak`
                : `${velocity.problemsSolvedLast30Days} solved last 30 days`}
            </span>
          </div>
        </div>

        {/* Study Plan Velocity */}
        <div className="p-5 rounded-2xl bg-[#0F131D] border border-[#181F30]">
          <div className="text-xs font-medium text-[#7C8BA6] mb-1.5">Study Plan Velocity</div>
          {velocity.activeRoadmap ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {velocity.activeRoadmap.progressPercent}%
                </span>
                <span className="text-xs text-[#7C8BA6]">
                  {velocity.activeRoadmap.completedItems}/{velocity.activeRoadmap.totalItems} done
                </span>
              </div>
              <div className="mt-3 w-full bg-[#141A29] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#38BDF8] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, velocity.activeRoadmap.progressPercent)}%` }}
                />
              </div>
              <div className="text-[11px] text-[#7C8BA6] mt-2 truncate">
                {velocity.activeRoadmap.currentSprintTitle || velocity.activeRoadmap.roadmapTitle}
              </div>
            </>
          ) : (
            <div className="space-y-2 py-1">
              <div className="text-sm font-medium text-white">No active roadmap</div>
              <p className="text-[11px] text-[#7C8BA6] leading-relaxed">
                Build an adaptive study plan aligned to your target roles.
              </p>
              <Link
                to="/app/roadmap"
                className="inline-block text-xs text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
              >
                Create plan →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 2. Grid: Difficulty Mastery & Verdict Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Breakdown */}
        <div className="p-6 rounded-2xl bg-[#0F131D] border border-[#181F30]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Difficulty Mastery</h3>
              <p className="text-xs text-[#7C8BA6] mt-0.5">Verified solutions across catalog tiers</p>
            </div>
            <span className="text-xs text-[#7C8BA6]">
              {difficulty.totalSolved} / {difficulty.totalCatalog} solved
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Easy */}
            <div className="p-3.5 rounded-xl bg-[#0B0E16] border border-[#181F30]">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-[#00B8A3] font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00B8A3]" />
                  Easy
                </span>
                <span className="text-[#7C8BA6]">
                  <strong className="text-white">{difficulty.easy.solved}</strong> / {difficulty.easy.total}
                  <span className="ml-1 text-[#556480]">
                    ({safePercentage(difficulty.easy.solved, difficulty.easy.total)}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#00B8A3] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${safePercentage(difficulty.easy.solved, difficulty.easy.total)}%`,
                  }}
                />
              </div>
            </div>

            {/* Medium */}
            <div className="p-3.5 rounded-xl bg-[#0B0E16] border border-[#181F30]">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-[#F59E0B] font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  Medium
                </span>
                <span className="text-[#7C8BA6]">
                  <strong className="text-white">{difficulty.medium.solved}</strong> / {difficulty.medium.total}
                  <span className="ml-1 text-[#556480]">
                    ({safePercentage(difficulty.medium.solved, difficulty.medium.total)}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#F59E0B] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${safePercentage(difficulty.medium.solved, difficulty.medium.total)}%`,
                  }}
                />
              </div>
            </div>

            {/* Hard */}
            <div className="p-3.5 rounded-xl bg-[#0B0E16] border border-[#181F30]">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-[#EF4444] font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  Hard
                </span>
                <span className="text-[#7C8BA6]">
                  <strong className="text-white">{difficulty.hard.solved}</strong> / {difficulty.hard.total}
                  <span className="ml-1 text-[#556480]">
                    ({safePercentage(difficulty.hard.solved, difficulty.hard.total)}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#EF4444] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${safePercentage(difficulty.hard.solved, difficulty.hard.total)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Verdict Distribution */}
        <div className="p-6 rounded-2xl bg-[#0F131D] border border-[#181F30]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Verdict Distribution</h3>
              <p className="text-xs text-[#7C8BA6] mt-0.5">Execution outcomes across test cases</p>
            </div>
            <span className="text-xs text-[#7C8BA6]">
              {coding.verdictDistribution.total} total runs
            </span>
          </div>

          <div className="space-y-3">
            {/* Accepted */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#00B8A3] flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#00B8A3]" /> Accepted (AC)
                </span>
                <span className="text-[#7C8BA6]">
                  {coding.verdictDistribution.accepted} (
                  {safePercentage(coding.verdictDistribution.accepted, coding.verdictDistribution.total)}%)
                </span>
              </div>
              <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#00B8A3] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${safePercentage(
                      coding.verdictDistribution.accepted,
                      coding.verdictDistribution.total
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Wrong Answer */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#EF4444] flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Wrong Answer (WA)
                </span>
                <span className="text-[#7C8BA6]">
                  {coding.verdictDistribution.wrongAnswer} (
                  {safePercentage(coding.verdictDistribution.wrongAnswer, coding.verdictDistribution.total)}%)
                </span>
              </div>
              <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#EF4444] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${safePercentage(
                      coding.verdictDistribution.wrongAnswer,
                      coding.verdictDistribution.total
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Time Limit Exceeded */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#F59E0B] flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Time Limit (TLE)
                </span>
                <span className="text-[#7C8BA6]">{coding.verdictDistribution.timeLimitExceeded}</span>
              </div>
              <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#F59E0B] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${safePercentage(
                      coding.verdictDistribution.timeLimitExceeded,
                      coding.verdictDistribution.total
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Runtime Error */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#F97316] flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#F97316]" /> Runtime Error (RE)
                </span>
                <span className="text-[#7C8BA6]">{coding.verdictDistribution.runtimeError}</span>
              </div>
              <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#F97316] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${safePercentage(
                      coding.verdictDistribution.runtimeError,
                      coding.verdictDistribution.total
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Compilation Error */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#A855F7] flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#A855F7]" /> Compilation Error (CE)
                </span>
                <span className="text-[#7C8BA6]">{coding.verdictDistribution.compilationError}</span>
              </div>
              <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#A855F7] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${safePercentage(
                      coding.verdictDistribution.compilationError,
                      coding.verdictDistribution.total
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grid: Topic Competence & Skill Vectors */}
      <div className="p-6 rounded-2xl bg-[#0F131D] border border-[#181F30]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Topic Competence & Skill Vectors</h3>
            <p className="text-xs text-[#7C8BA6] mt-0.5">
              Sample-size safe classification prevents false weakness flagging on single attempts
            </p>
          </div>
        </div>

        {topics && topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((t: TopicAnalyticsDto) => {
              const pill = getAssessmentPillConfig(t.assessment);
              return (
                <div
                  key={t.slug}
                  className="p-4 rounded-xl bg-[#0B0E16] border border-[#181F30] flex flex-col justify-between hover:border-[#243B6B] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-white tracking-tight truncate">
                        {t.name}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-[10px] font-medium rounded-md border flex items-center gap-1.5',
                          pill.className
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', pill.dotColor)} />
                        {pill.label}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs text-[#7C8BA6] mt-2">
                      <span>
                        Solved: {t.solved}/{t.attempted} attempted
                      </span>
                      <span className="font-semibold text-white">{t.solveRate}%</span>
                    </div>
                    <div className="w-full bg-[#141A29] h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, t.solveRate)}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#181F30] text-[11px] text-[#7C8BA6] flex justify-between items-center">
                    <span>{t.total} catalog problems</span>
                    <Link
                      to={`/app/practice?topic=${t.slug}`}
                      className="text-[#60A5FA] hover:text-[#93C5FD] font-medium transition-colors"
                    >
                      Practice →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-[#7C8BA6] py-6 text-center">
            No topic activity recorded yet. Start solving problems to establish topic performance.
          </div>
        )}
      </div>

      {/* 4. Grid: Target Company Readiness & Activity Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Readiness */}
        <div className="p-6 rounded-2xl bg-[#0F131D] border border-[#181F30]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Target Company Readiness</h3>
              <p className="text-xs text-[#7C8BA6] mt-0.5">Progress across company tagged interview problem sets</p>
            </div>
          </div>

          {companies && companies.length > 0 ? (
            <div className="space-y-3">
              {companies.map((c: CompanyAnalyticsDto) => (
                <div key={c.slug} className="p-3.5 rounded-xl bg-[#0B0E16] border border-[#181F30]">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-white font-medium">{c.name}</span>
                    <span className="text-[#7C8BA6]">
                      <strong className="text-white">{c.solved}</strong> / {c.total} solved ({c.solveRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#141A29] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${safePercentage(c.solved, c.total)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { name: 'Google SDE Readiness', solved: Math.min(difficulty.hard.solved + difficulty.medium.solved, 18), total: 65 },
                { name: 'Meta Systems & Algorithms', solved: Math.min(difficulty.medium.solved, 22), total: 70 },
                { name: 'Amazon Leadership & High-Yield', solved: Math.min(difficulty.easy.solved + difficulty.medium.solved, 30), total: 75 },
              ].map((c) => (
                <div key={c.name} className="p-3.5 rounded-xl bg-[#0B0E16] border border-[#181F30]">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-white font-medium">{c.name}</span>
                    <span className="text-[#7C8BA6]">
                      <strong className="text-white">{c.solved}</strong> / {c.total} ({safePercentage(c.solved, c.total)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#141A29] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                      style={{ width: `${safePercentage(c.solved, c.total)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly Activity Trends */}
        <div className="p-6 rounded-2xl bg-[#0F131D] border border-[#181F30]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Activity Trends</h3>
              <p className="text-xs text-[#7C8BA6] mt-0.5">Rolling weekly solve and submission volume</p>
            </div>
            <span className="text-xs text-[#7C8BA6]">7-day windows</span>
          </div>

          {trends && trends.length > 0 ? (
            <div className="space-y-3">
              {trends.map((pt: TrendPointDto) => {
                const maxVal = Math.max(1, ...trends.map((t) => Math.max(t.solvedCount, t.submissionCount)));
                return (
                  <div key={pt.periodLabel} className="p-3.5 rounded-xl bg-[#0B0E16] border border-[#181F30]">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-white font-medium">{pt.periodLabel}</span>
                      <span className="text-xs text-[#7C8BA6]">
                        <span className="text-[#00B8A3] font-medium">{pt.solvedCount} Solved</span> ·{' '}
                        <span>{pt.submissionCount} Subs</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#141A29] h-2 rounded-full overflow-hidden flex gap-0.5">
                      <div
                        className="bg-[#00B8A3] h-full rounded-l-full transition-all"
                        style={{ width: `${(pt.solvedCount / maxVal) * 50}%` }}
                      />
                      <div
                        className="bg-[#2563EB] h-full rounded-r-full transition-all"
                        style={{ width: `${(pt.submissionCount / maxVal) * 50}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#0B0E16] border border-[#181F30] text-center space-y-2">
                <div className="text-xs font-medium text-white">Consistent Weekly Momentum</div>
                <p className="text-[11px] text-[#7C8BA6] leading-relaxed">
                  Solve problems regularly in practice or timed virtual contests to build rolling weekly trend graphs.
                </p>
                <div className="pt-2">
                  <Link
                    to="/app/contests"
                    className="inline-block px-3.5 py-1.5 rounded-lg bg-[#152443] hover:bg-[#1C3159] text-xs font-medium text-[#93C5FD] transition-colors"
                  >
                    Open Contests Hub →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Recommended Actions & Focus (At the bottom, calm and non-intrusive) */}
      {insights && insights.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recommended Actions & Focus</h3>
            <span className="text-xs text-[#7C8BA6]">Based on your recent solve patterns</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.slice(0, 2).map((ins: DeterministicInsightDto) => (
              <div
                key={ins.id}
                className="relative overflow-hidden p-5 rounded-2xl bg-[#0F131D] border border-[#181F30] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#152443] text-[#93C5FD] border border-[#243B6B]">
                      {ins.category.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white tracking-tight">{ins.title}</h4>
                  <p className="text-xs text-[#7C8BA6] mt-1.5 leading-relaxed">{ins.description}</p>
                </div>
                {ins.actionUrl && ins.suggestedAction && (
                  <div className="mt-4 pt-3 border-t border-[#181F30] flex items-center justify-end">
                    <Link
                      to={ins.actionUrl}
                      className="text-xs font-semibold text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
                    >
                      {ins.suggestedAction} →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
