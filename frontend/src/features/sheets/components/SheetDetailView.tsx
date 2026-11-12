import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { useProblems } from '@/hooks/useProblems';
import { useUserProgress } from '@/hooks/useUserProgress';
import { cn } from '@/lib/utils';
import {
  SHEETS_CATALOG,
  getSheetById,
  resolveSheetSummary,
  saveLastSheetId,
} from '../data/sheetsCatalog';

export const SheetDetailView: React.FC = () => {
  const { sheetId } = useParams<{ sheetId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const sheetDef = useMemo(
    () => getSheetById(sheetId) || SHEETS_CATALOG[0],
    [sheetId]
  );

  const { problems, loading: problemsLoading, refetch } = useProblems();
  const { progressMap, revisionMap, toggleRevision } = useUserProgress();

  const summary = useMemo(
    () => resolveSheetSummary(sheetDef, problems, progressMap, revisionMap),
    [sheetDef, problems, progressMap, revisionMap]
  );

  useEffect(() => {
    saveLastSheetId(sheetDef.id);
  }, [sheetDef.id]);

  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'solved' | 'bookmarked'>('all');
  const [showInvariants, setShowInvariants] = useState(true);

  const openParam = searchParams.get('steps');
  const expandedStepIds = useMemo(() => {
    if (openParam === 'none') return new Set<string>();
    if (openParam === 'all') return new Set(summary.steps.map((s) => s.definition.id));
    if (openParam) return new Set(openParam.split(',').filter(Boolean));
    return new Set(summary.steps.slice(0, 2).map((s) => s.definition.id));
  }, [openParam, summary.steps]);

  const setExpandedSteps = (nextSet: Set<string>) => {
    const next = new URLSearchParams(searchParams);
    if (nextSet.size === 0) {
      next.set('steps', 'none');
    } else if (nextSet.size === summary.steps.length) {
      next.set('steps', 'all');
    } else {
      next.set('steps', Array.from(nextSet).join(','));
    }
    setSearchParams(next, { replace: true });
  };

  const toggleStep = (stepId: string) => {
    const next = new Set(expandedStepIds);
    if (next.has(stepId)) next.delete(stepId);
    else next.add(stepId);
    setExpandedSteps(next);
  };

  const handleToggleAll = () => {
    if (expandedStepIds.size === summary.steps.length) {
      setExpandedSteps(new Set());
    } else {
      setExpandedSteps(new Set(summary.steps.map((s) => s.definition.id)));
    }
  };

  const handlePickRandomUnsolved = () => {
    const unsolved = summary.allProblems.filter((item) => item.status !== 'solved');
    const pool = unsolved.length > 0 ? unsolved : summary.allProblems;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    navigate(`/app/practice/${pick.problem.slug}`);
  };

  const filteredSteps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return summary.steps
      .map((step) => {
        const items = step.problems.filter((item) => {
          if (difficultyFilter !== 'all' && item.problem.difficulty !== difficultyFilter) {
            return false;
          }
          if (statusFilter === 'todo' && item.status === 'solved') {
            return false;
          }
          if (statusFilter === 'solved' && item.status !== 'solved') {
            return false;
          }
          if (statusFilter === 'bookmarked' && !item.isBookmarked) {
            return false;
          }
          if (q) {
            const hay = `${item.problem.title} ${item.problem.verniq_id || ''} ${(item.problem.tags || []).join(' ')} ${item.keyInvariant || ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });

        return {
          ...step,
          filteredProblems: items,
        };
      })
      .filter((step) => step.filteredProblems.length > 0 || (!q && difficultyFilter === 'all' && statusFilter === 'all'));
  }, [summary.steps, searchQuery, difficultyFilter, statusFilter]);

  const totalMatchedProblems = filteredSteps.reduce(
    (acc, step) => acc + step.filteredProblems.length,
    0
  );

  const easyTotal = summary.difficultyCounts.easy.total;
  const medTotal = summary.difficultyCounts.medium.total;
  const hardTotal = summary.difficultyCounts.hard.total;
  const easyPct = summary.totalCount > 0 ? (easyTotal / summary.totalCount) * 100 : 0;
  const medPct = summary.totalCount > 0 ? (medTotal / summary.totalCount) * 100 : 0;
  const hardPct = summary.totalCount > 0 ? (hardTotal / summary.totalCount) * 100 : 0;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Sheets', href: '/app/sheets' },
        { label: sheetDef.title },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6 text-left text-[#F3F6FF]">
        <div>
          <Link
            to="/app/sheets"
            className="inline-flex items-center text-xs font-medium text-[#8E9BB3] hover:text-[#F8FAFF] transition-colors"
          >
            Back to All Sheets
          </Link>
        </div>

        {/* Sheet Dossier Hero Card (Matches CodeSpace/Home/Roadmap Palette, Zero Card Icons) */}
        <section className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-semibold text-[#F8FAFF] tracking-tight">
                  {sheetDef.title}
                </h1>
                <span className="text-[11px] font-mono text-[#94A3B8] px-2.5 py-0.5 rounded-full bg-[#0B0E16] border border-[#1B2234] tabular-nums">
                  {summary.totalCount} problems
                </span>
                <span className="text-[11px] font-mono text-[#60A5FA] px-2.5 py-0.5 rounded-full bg-[#152443] border border-[#243B6B]">
                  {sheetDef.estHours}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#8E9BB3] max-w-2xl leading-relaxed">
                {sheetDef.description}
              </p>
              <p className="text-xs text-[#6E7D98]">
                Recommended for: <span className="text-[#CBD5E1]">{sheetDef.recommendedFor}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handlePickRandomUnsolved}
                disabled={summary.allProblems.length === 0}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-50 text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer"
              >
                Pick Random Unsolved
              </button>

              <button
                type="button"
                onClick={handleToggleAll}
                className="px-3.5 py-2 rounded-xl border border-[#212B42] bg-[#0B0E16] hover:bg-[#141A29] text-xs font-medium text-[#D5E1F7] transition-colors cursor-pointer"
              >
                {expandedStepIds.size === summary.steps.length ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          </div>

          {/* Progress & Difficulty Telemetry Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-5 border-t border-[#171D2D]">
            <div className="lg:col-span-5 rounded-xl bg-[#0B0E16] border border-[#171D2D] p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8E9BB3] font-medium">Sheet Mastery</span>
                <span className="font-mono font-semibold text-[#F8FAFF] tabular-nums">
                  {summary.solvedCount} / {summary.totalCount}{' '}
                  <span className="text-[#22D3EE]">({summary.completionPercent}%)</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#151B2B] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] transition-all duration-300"
                  style={{ width: `${summary.completionPercent}%` }}
                />
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl bg-[#0B0E16] border border-[#171D2D] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums text-[#CBD5E1]">
                <span>Easy {summary.difficultyCounts.easy.solved}/{easyTotal}</span>
                <span>Med {summary.difficultyCounts.medium.solved}/{medTotal}</span>
                <span>Hard {summary.difficultyCounts.hard.solved}/{hardTotal}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#151B2B] flex overflow-hidden">
                <div style={{ width: `${easyPct}%` }} className="bg-[#22D3EE]/55" />
                <div style={{ width: `${medPct}%` }} className="bg-[#3B82F6]/70" />
                <div style={{ width: `${hardPct}%` }} className="bg-[#93C5FD]" />
              </div>
            </div>

            <div className="lg:col-span-2 rounded-xl bg-[#0B0E16] border border-[#171D2D] p-4 flex items-center justify-between lg:flex-col lg:items-start lg:justify-center gap-1">
              <span className="text-xs text-[#8E9BB3]">Bookmarked</span>
              <span className="text-sm font-mono font-semibold text-[#93C5FD] tabular-nums">
                {summary.bookmarkedCount}
              </span>
            </div>
          </div>
        </section>

        {/* Filter & Search Control Rail */}
        <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-3.5 sm:px-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="w-full xl:w-80">
            <input
              id="sheet-problems-search"
              name="sheet-problems-search"
              type="text"
              aria-label="Filter problems inside sheet"
              placeholder="Filter problems, IDs, or invariant hints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/50 rounded-xl px-3.5 py-2 text-xs text-[#E2E8F5] placeholder-[#5B6882] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[#0B0E16] p-1 rounded-xl border border-[#181F30]">
              {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => {
                const active = difficultyFilter === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficultyFilter(diff)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer',
                      active
                        ? 'bg-[#152443] text-[#60A5FA]'
                        : 'text-[#7C8BA6] hover:text-[#E2E8F5]'
                    )}
                  >
                    {diff === 'medium' ? 'Med' : diff}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 bg-[#0B0E16] p-1 rounded-xl border border-[#181F30]">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'todo', label: 'Unsolved' },
                  { id: 'solved', label: 'Solved' },
                  { id: 'bookmarked', label: 'Saved' },
                ] as const
              ).map((st) => {
                const active = statusFilter === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                      active
                        ? 'bg-[#0C2629] text-[#22D3EE]'
                        : 'text-[#7C8BA6] hover:text-[#E2E8F5]'
                    )}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowInvariants((prev) => !prev)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer',
                showInvariants
                  ? 'bg-[#152443] text-[#93C5FD] border-[#3B82F6]/35'
                  : 'bg-[#0B0E16] text-[#7C8BA6] border-[#181F30] hover:text-[#E2E8F5]'
              )}
            >
              Invariant Hints
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-xl bg-[#0B0E16] border border-[#181F30] hover:border-[#29344E] text-xs font-medium text-[#7C8BA6] hover:text-[#E2E8F5] transition-colors cursor-pointer"
            >
              {problemsLoading ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </section>

        {/* Collapsible Step Accordions */}
        {filteredSteps.length === 0 || totalMatchedProblems === 0 ? (
          <div className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-10 text-center space-y-3">
            <p className="text-sm font-medium text-[#E2E8F5]">
              No problems match your active sheet filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDifficultyFilter('all');
                setStatusFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-[#152443] border border-[#3B82F6]/35 text-xs font-medium text-[#93C5FD] hover:text-white transition-colors cursor-pointer"
            >
              Reset Sheet Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSteps.map((step) => {
              const isOpen = expandedStepIds.has(step.definition.id) || Boolean(searchQuery.trim());
              const pct =
                step.totalCount > 0
                  ? Math.round((step.solvedCount / step.totalCount) * 100)
                  : 0;

              return (
                <section
                  key={step.definition.id}
                  className="rounded-2xl border border-[#181F30] bg-[#0F131D] overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleStep(step.definition.id)}
                    className="w-full px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#101624] hover:bg-[#131B2D] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-[#0B0E16] border border-[#212B42] text-xs font-mono font-semibold text-[#22D3EE] flex items-center justify-center shrink-0 tabular-nums">
                        {step.definition.stepNumber}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-semibold text-[#F8FAFF] truncate">
                          {step.definition.title}
                        </h2>
                        <p className="text-xs text-[#8E9BB3] truncate mt-0.5">
                          {step.definition.focus}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                      <div className="flex items-center gap-2.5">
                        <div className="w-24 h-1.5 rounded-full bg-[#0B0E16] overflow-hidden hidden sm:block">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-[#CBD5E1] tabular-nums">
                          {step.solvedCount}/{step.totalCount}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-[#8E9BB3] w-4 text-center">
                        {isOpen ? '−' : '+'}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-[#171D2D] border-t border-[#171D2D]">
                      {step.filteredProblems.map((item, idx) => {
                        const { problem, status, isBookmarked, keyInvariant } = item;
                        const isSolved = status === 'solved';
                        const isAttempted = status === 'attempted';
                        const targetHref = `/app/practice/${problem.slug}`;

                        return (
                          <div
                            key={problem.id}
                            className="px-4 sm:px-5 py-3.5 hover:bg-[#131928]/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span
                                title={`Status: ${status}`}
                                className={cn(
                                  'mt-1.5 w-2 h-2 rounded-full shrink-0',
                                  isSolved
                                    ? 'bg-[#00B8A3]'
                                    : isAttempted
                                    ? 'bg-[#60A5FA]'
                                    : 'bg-[#334155]'
                                )}
                              />

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-mono text-[#64748B] tabular-nums">
                                    {problem.verniq_id || `#${idx + 1}`}
                                  </span>
                                  <Link
                                    to={targetHref}
                                    className="text-sm font-medium text-[#F8FAFF] hover:text-[#22D3EE] transition-colors truncate"
                                  >
                                    {problem.title}
                                  </Link>
                                  {!problem.is_published && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B0E16] text-[#8E9BB3] border border-[#1B2234]">
                                      Draft
                                    </span>
                                  )}
                                </div>

                                {showInvariants && keyInvariant && (
                                  <p className="text-xs text-[#8E9BB3] leading-snug line-clamp-1">
                                    {keyInvariant}
                                  </p>
                                )}

                                {(problem.tags || []).length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {(problem.tags || []).slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0E16] border border-[#1B2234] text-[#94A3B8]"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-3 pl-5 md:pl-0 shrink-0">
                              <div className="flex items-center gap-3">
                                <DifficultyBadge difficulty={problem.difficulty} />

                                <span className="text-xs font-mono text-[#7C8BA6] tabular-nums hidden sm:inline-block w-10 text-right">
                                  {problem.acceptance_rate > 0
                                    ? `${problem.acceptance_rate.toFixed(0)}%`
                                    : '—'}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => toggleRevision(problem.id)}
                                  className={cn(
                                    'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer',
                                    isBookmarked
                                      ? 'bg-[#152443] border-[#3B82F6]/35 text-[#93C5FD]'
                                      : 'bg-[#0B0E16] border-[#181F30] text-[#7C8BA6] hover:text-[#E2E8F5]'
                                  )}
                                >
                                  {isBookmarked ? 'Saved' : 'Save'}
                                </button>
                              </div>

                              <Link
                                to={targetHref}
                                className={cn(
                                  'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                                  isSolved
                                    ? 'bg-[#0C2629] border-[#22D3EE]/30 text-[#22D3EE] hover:bg-[#103338]'
                                    : 'bg-[#152443] border-[#243B6B] text-[#93C5FD] hover:bg-[#2563EB] hover:border-[#3B82F6] hover:text-white'
                                )}
                              >
                                {isSolved ? 'Review' : 'Solve'}
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SheetDetailView;
