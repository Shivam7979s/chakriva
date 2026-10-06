import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  apiClient,
  type AnalyticsOverviewDto,
  type TopicAnalyticsDto,
  type CompanyAnalyticsDto,
  type TrendPointDto,
  type DeterministicInsightDto,
} from '@/lib/apiClient';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Award,
  Layers,
  Building2,
  ArrowRight,
  RefreshCw,
  Compass,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/actions/Button';

interface AnalyticsDashboardProps {
  onRefreshParent?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = () => {
  const [data, setData] = useState<AnalyticsOverviewDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getAnalyticsOverview();
      setData(res);
    } catch (err: any) {
      console.error('[AnalyticsDashboard] Failed to fetch analytics overview:', err);
      setError(err?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-sm font-mono tracking-wider text-neutral-300">
          DERIVING SERVER-AUTHORITATIVE METRICS...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center my-6">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-rose-300">Unable to load intelligence metrics</h3>
        <p className="text-xs text-rose-200/70 mt-1 max-w-md mx-auto">{error || 'Unknown error occurred.'}</p>
        <Button variant="secondary" size="sm" onClick={fetchAnalytics} className="mt-4 gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </Button>
      </div>
    );
  }

  const { coding, difficulty, topics, companies, velocity, trends, insights } = data;
  const isBrandNewUser = coding.problemsAttempted === 0 && coding.totalSubmissions === 0;

  const getAssessmentBadge = (assessment: TopicAnalyticsDto['assessment']) => {
    switch (assessment) {
      case 'STRONG':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Strong (≥70%)
          </span>
        );
      case 'DEVELOPING':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            Developing (40-69%)
          </span>
        );
      case 'NEEDS_PRACTICE':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Needs Practice (&lt;40%)
          </span>
        );
      case 'EXPLORING':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30" title="Fewer than 3 attempts; more sample size needed before flagging weakness">
            Exploring (&lt;3 att.)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Deterministic Insights Banner */}
      {insights && insights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Deterministic Learning Insights</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins: DeterministicInsightDto) => (
              <div
                key={ins.id}
                className="relative overflow-hidden p-5 rounded-2xl bg-[#0D0F15]/90 border border-white/[0.08] backdrop-blur-xl shadow-lg flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
                      {ins.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white tracking-tight">{ins.title}</h4>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{ins.description}</p>
                </div>
                {ins.actionUrl && ins.suggestedAction && (
                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-end">
                    <Link
                      to={ins.actionUrl}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {ins.suggestedAction} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brand New User Empty State Callout */}
      {isBrandNewUser && (
        <div className="p-8 rounded-2xl bg-[#0D0F15] border border-cyan-500/20 text-center relative overflow-hidden">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3">
            <Compass className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-base font-semibold text-white">Start Your Learning Journey</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mt-2 leading-relaxed">
            Your intelligence profile is server-derived directly from verified submissions and roadmap progress.
            Solve your first problem or explore the structured DSA roadmap to ignite your analytics.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Link to="/roadmaps/dsa-mastery">
              <Button size="sm" variant="primary" className="gap-2">
                <Compass className="w-4 h-4" /> Open DSA Roadmap
              </Button>
            </Link>
            <Link to="/problems">
              <Button size="sm" variant="secondary" className="gap-2">
                Browse Problems
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Problems Solved */}
        <div className="p-5 rounded-2xl bg-[#0D0F15] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
            <span>PROBLEMS SOLVED</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{coding.problemsSolved}</span>
            <span className="text-xs text-neutral-500">/ {coding.problemsAttempted} att.</span>
          </div>
          <div className="mt-3 w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, coding.problemSolveRate)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-400 mt-2 font-mono">
            <span>Solve Rate</span>
            <span className="text-emerald-400 font-semibold">{coding.problemSolveRate}%</span>
          </div>
        </div>

        {/* Submissions & Acceptance */}
        <div className="p-5 rounded-2xl bg-[#0D0F15] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
            <span>SUBMISSIONS</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{coding.totalSubmissions}</span>
            <span className="text-xs text-neutral-500">({coding.acceptedSubmissions} AC)</span>
          </div>
          <div className="mt-3 w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, coding.submissionAcceptanceRate)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-400 mt-2 font-mono">
            <span>Acceptance Rate</span>
            <span className="text-cyan-400 font-semibold">{coding.submissionAcceptanceRate}%</span>
          </div>
        </div>

        {/* 7-Day Velocity */}
        <div className="p-5 rounded-2xl bg-[#0D0F15] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
            <span>7-DAY VELOCITY</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{velocity.problemsSolvedLast7Days}</span>
            <span className="text-xs text-neutral-500">solved this week</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-3 font-mono">
            <span>{velocity.submissionsLast7Days} total submissions (7d)</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1 font-mono">
            <span>{velocity.problemsSolvedLast30Days} solved last 30 days</span>
          </div>
        </div>

        {/* Active Roadmap Progression */}
        <div className="p-5 rounded-2xl bg-[#0D0F15] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
            <span>ROADMAP VELOCITY</span>
            <Compass className="w-4 h-4 text-purple-400" />
          </div>
          {velocity.activeRoadmap ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {velocity.activeRoadmap.progressPercent}%
                </span>
                <span className="text-xs text-neutral-500">
                  {velocity.activeRoadmap.completedItems}/{velocity.activeRoadmap.totalItems} items
                </span>
              </div>
              <div className="mt-3 w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, velocity.activeRoadmap.progressPercent)}%` }}
                />
              </div>
              <div className="text-[11px] text-neutral-400 mt-2 truncate font-mono">
                {velocity.activeRoadmap.currentSprintTitle || velocity.activeRoadmap.roadmapTitle}
              </div>
            </>
          ) : (
            <div className="py-2 text-xs text-neutral-500">
              No active roadmap enrolled yet.
            </div>
          )}
        </div>
      </div>

      {/* Grid: Verdict Distribution & Difficulty Solve Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verdict Distribution */}
        <div className="p-6 rounded-2xl bg-[#0D0F15] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Verdict Breakdown
            </h3>
            <span className="text-xs font-mono text-neutral-400">
              {coding.verdictDistribution.total} Total Judged
            </span>
          </div>

          <div className="space-y-3">
            {/* Accepted */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Accepted (AC)
                </span>
                <span className="font-mono text-neutral-300">
                  {coding.verdictDistribution.accepted} (
                  {coding.verdictDistribution.total > 0
                    ? Math.round((coding.verdictDistribution.accepted / coding.verdictDistribution.total) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      coding.verdictDistribution.total > 0
                        ? (coding.verdictDistribution.accepted / coding.verdictDistribution.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Wrong Answer */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-400 flex items-center gap-1.5 font-medium">
                  <XCircle className="w-3.5 h-3.5" /> Wrong Answer (WA)
                </span>
                <span className="font-mono text-neutral-300">
                  {coding.verdictDistribution.wrongAnswer} (
                  {coding.verdictDistribution.total > 0
                    ? Math.round((coding.verdictDistribution.wrongAnswer / coding.verdictDistribution.total) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-400 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      coding.verdictDistribution.total > 0
                        ? (coding.verdictDistribution.wrongAnswer / coding.verdictDistribution.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Time Limit Exceeded */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" /> Time Limit Exceeded (TLE)
                </span>
                <span className="font-mono text-neutral-300">{coding.verdictDistribution.timeLimitExceeded}</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      coding.verdictDistribution.total > 0
                        ? (coding.verdictDistribution.timeLimitExceeded / coding.verdictDistribution.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Compilation Error */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-purple-400 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Compilation Error (CE)
                </span>
                <span className="font-mono text-neutral-300">{coding.verdictDistribution.compilationError}</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-400 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      coding.verdictDistribution.total > 0
                        ? (coding.verdictDistribution.compilationError / coding.verdictDistribution.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Runtime Error */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-orange-400 flex items-center gap-1.5 font-medium">
                  <Cpu className="w-3.5 h-3.5" /> Runtime Error (RE)
                </span>
                <span className="font-mono text-neutral-300">{coding.verdictDistribution.runtimeError}</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-orange-400 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      coding.verdictDistribution.total > 0
                        ? (coding.verdictDistribution.runtimeError / coding.verdictDistribution.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Difficulty Breakdown */}
        <div className="p-6 rounded-2xl bg-[#0D0F15] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Difficulty Mastery
            </h3>
            <span className="text-xs font-mono text-neutral-400">
              {difficulty.totalSolved} / {difficulty.totalCatalog} Catalog Solved
            </span>
          </div>

          <div className="space-y-4">
            {/* Easy */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-emerald-400 font-bold uppercase tracking-wider">Easy</span>
                <span className="font-mono text-neutral-300">
                  {difficulty.easy.solved} solved / {difficulty.easy.attempted} att. ({difficulty.easy.total} total)
                </span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      difficulty.easy.total > 0 ? (difficulty.easy.solved / difficulty.easy.total) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1.5 font-mono">
                <span>Catalog Solved: {difficulty.easy.total > 0 ? Math.round((difficulty.easy.solved / difficulty.easy.total) * 100) : 0}%</span>
                <span>Solve Rate: {difficulty.easy.solveRate}%</span>
              </div>
            </div>

            {/* Medium */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-amber-400 font-bold uppercase tracking-wider">Medium</span>
                <span className="font-mono text-neutral-300">
                  {difficulty.medium.solved} solved / {difficulty.medium.attempted} att. ({difficulty.medium.total} total)
                </span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      difficulty.medium.total > 0 ? (difficulty.medium.solved / difficulty.medium.total) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1.5 font-mono">
                <span>Catalog Solved: {difficulty.medium.total > 0 ? Math.round((difficulty.medium.solved / difficulty.medium.total) * 100) : 0}%</span>
                <span>Solve Rate: {difficulty.medium.solveRate}%</span>
              </div>
            </div>

            {/* Hard */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-rose-400 font-bold uppercase tracking-wider">Hard</span>
                <span className="font-mono text-neutral-300">
                  {difficulty.hard.solved} solved / {difficulty.hard.attempted} att. ({difficulty.hard.total} total)
                </span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-400 h-full rounded-full transition-all"
                  style={{
                    width: `${
                      difficulty.hard.total > 0 ? (difficulty.hard.solved / difficulty.hard.total) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1.5 font-mono">
                <span>Catalog Solved: {difficulty.hard.total > 0 ? Math.round((difficulty.hard.solved / difficulty.hard.total) * 100) : 0}%</span>
                <span>Solve Rate: {difficulty.hard.solveRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Topic Strengths & Weaknesses (Sample-Size Safe) */}
      <div className="p-6 rounded-2xl bg-[#0D0F15] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              Topic Analytics & Assessment
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Sample-size safe classification prevents false weakness flagging on single attempts.
            </p>
          </div>
        </div>

        {topics && topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((t: TopicAnalyticsDto) => (
              <div
                key={t.slug}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between hover:border-white/[0.12] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-white tracking-tight truncate">{t.name}</span>
                    {getAssessmentBadge(t.assessment)}
                  </div>
                  <div className="flex items-baseline justify-between text-xs text-neutral-400 mt-2 font-mono">
                    <span>Solved: {t.solved}/{t.attempted} att.</span>
                    <span className="font-bold text-neutral-200">{t.solveRate}%</span>
                  </div>
                  <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="bg-cyan-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, t.solveRate)}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-white/[0.04] text-[10px] text-neutral-500 font-mono flex justify-between">
                  <span>Catalog total: {t.total} problems</span>
                  <Link
                    to={`/problems?topic=${t.slug}`}
                    className="text-cyan-400 hover:text-cyan-300 font-sans font-medium"
                  >
                    Practice →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-neutral-500 py-6 text-center">
            No topic activity recorded yet. Start solving problems to establish topic performance.
          </div>
        )}
      </div>

      {/* Grid: Company Alignment & Weekly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Analytics */}
        <div className="p-6 rounded-2xl bg-[#0D0F15] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              Company Alignment
            </h3>
            <span className="text-xs font-mono text-neutral-400">Target Readiness</span>
          </div>

          {companies && companies.length > 0 ? (
            <div className="space-y-3">
              {companies.map((c: CompanyAnalyticsDto) => (
                <div key={c.slug} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-white font-medium">{c.name}</span>
                    <span className="font-mono text-neutral-300">
                      {c.solved} solved / {c.total} tagged ({c.solveRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, c.total > 0 ? (c.solved / c.total) * 100 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-neutral-500 py-6 text-center">
              No company-tagged activity yet.
            </div>
          )}
        </div>

        {/* Weekly Trend Chart (Rolling 6 Weeks) */}
        <div className="p-6 rounded-2xl bg-[#0D0F15] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Weekly Activity Trends (Last 6 Weeks)
            </h3>
            <span className="text-xs font-mono text-neutral-400">Rolling 7-day windows</span>
          </div>

          {trends && trends.length > 0 ? (
            <div className="space-y-3">
              {trends.map((pt: TrendPointDto) => {
                const maxVal = Math.max(1, ...trends.map((t) => Math.max(t.solvedCount, t.submissionCount)));
                return (
                  <div key={pt.periodLabel} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="text-neutral-300 font-mono text-[11px]">{pt.periodLabel}</span>
                      <span className="font-mono text-xs text-neutral-400">
                        <span className="text-emerald-400 font-semibold">{pt.solvedCount} Solved</span> ·{' '}
                        <span>{pt.submissionCount} Subs</span>
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden flex gap-0.5">
                      <div
                        className="bg-emerald-400 h-full rounded-l-full transition-all"
                        style={{ width: `${(pt.solvedCount / maxVal) * 50}%` }}
                        title={`${pt.solvedCount} solved`}
                      />
                      <div
                        className="bg-cyan-500/60 h-full rounded-r-full transition-all"
                        style={{ width: `${(pt.submissionCount / maxVal) * 50}%` }}
                        title={`${pt.submissionCount} submissions`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-neutral-500 py-6 text-center">
              No trend data recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
