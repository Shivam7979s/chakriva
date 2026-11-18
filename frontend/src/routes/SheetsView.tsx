import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { SEOHead } from '@/components/seo/SEOHead';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { useProblems } from '@/hooks/useProblems';
import { useUserProgress } from '@/hooks/useUserProgress';
import { cn } from '@/lib/utils';
import {
  SHEET_CATEGORY_TABS,
  SHEETS_CATALOG,
  getSavedLastSheetId,
  getSheetById,
  resolveSheetCategoryQuery,
  resolveSheetSummary,
} from '@/features/sheets/data/sheetsCatalog';
import type { SheetCategory } from '@/features/sheets/types/sheet';

const CATEGORY_LABEL_MAP: Record<SheetCategory, string> = {
  chakriva: 'Flagship',
  company: 'Company',
  topic: 'Topic',
  goal: 'Sprint',
  beginner: 'Beginner',
};

export const SheetsView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = resolveSheetCategoryQuery(searchParams.get('category'));
  const [searchQuery, setSearchQuery] = useState('');

  const { problems, loading: problemsLoading, refetch } = useProblems();
  const { progressMap, revisionMap } = useUserProgress();

  const handleSelectCategory = (catId: 'all' | SheetCategory) => {
    const next = new URLSearchParams(searchParams);
    if (catId === 'all') {
      next.delete('category');
    } else {
      next.set('category', catId);
    }
    setSearchParams(next, { replace: true });
  };

  const resolvedSheets = useMemo(
    () =>
      SHEETS_CATALOG.map((sheet) =>
        resolveSheetSummary(sheet, problems, progressMap, revisionMap)
      ),
    [problems, progressMap, revisionMap]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: resolvedSheets.length };
    for (const s of resolvedSheets) {
      counts[s.definition.category] = (counts[s.definition.category] || 0) + 1;
    }
    return counts;
  }, [resolvedSheets]);

  const filteredSheets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resolvedSheets.filter((entry) => {
      const def = entry.definition;
      if (activeCategory !== 'all' && def.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      const stepTitles = def.steps.map((s) => s.title).join(' ');
      const haystack = `${def.title} ${def.subtitle} ${def.description} ${def.recommendedFor} ${stepTitles}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [resolvedSheets, activeCategory, searchQuery]);

  const globalSheetStats = useMemo(() => {
    const uniqueProblemIds = new Set<string>();
    const solvedIds = new Set<string>();
    const starredIds = new Set<string>();

    for (const sheet of resolvedSheets) {
      for (const item of sheet.allProblems) {
        uniqueProblemIds.add(item.problem.id);
        if (item.status === 'solved') solvedIds.add(item.problem.id);
        if (item.isBookmarked) starredIds.add(item.problem.id);
      }
    }

    return {
      totalSheets: resolvedSheets.length,
      uniqueSolved: solvedIds.size,
      uniqueTotal: uniqueProblemIds.size,
      uniqueStarred: starredIds.size,
    };
  }, [resolvedSheets]);

  const lastOpenedSheet = useMemo(() => {
    const id = getSavedLastSheetId();
    return getSheetById(id);
  }, []);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Sheets' },
      ]}
    >
      <SEOHead
        title="Curated Coding Interview Sheets — Blind 75, NeetCode & Company Invariants"
        description="Structured problem sets and company-specific invariant sheets mapped to automated test suites and progress telemetry."
        canonicalPath="/sheets"
        keywords={[
          'blind 75 sheet',
          'neetcode 150 tracker',
          'striver sde sheet',
          'faang interview sheets',
          'dsa problem list',
          'coding practice sheets'
        ]}
      />
      <div className="max-w-7xl mx-auto space-y-6 text-left text-[#F3F6FF]">
        {/* Top Workspace Header Card (Matches CodeSpace / Home / Roadmap Palette, Zero Icons) */}
        <section className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-semibold text-[#F8FAFF] tracking-tight">
                  Preparation Sheets
                </h1>
                <span className="text-[11px] font-mono text-[#7C8BA6] px-2.5 py-0.5 rounded-full bg-[#0B0E16] border border-[#1B2234] tabular-nums">
                  {globalSheetStats.totalSheets} tracks
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#8E9BB3] max-w-2xl leading-relaxed">
                Structured problem pathways organized by algorithmic invariants, company hiring patterns, and preparation sprints.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {lastOpenedSheet && (
                <Link
                  to={`/app/sheets/${lastOpenedSheet.id}`}
                  title={lastOpenedSheet.title}
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors max-w-[250px]"
                >
                  <span className="truncate">Resume: {lastOpenedSheet.title}</span>
                </Link>
              )}

              <Link
                to="/app/practice"
                className="inline-flex items-center px-3.5 py-2 rounded-xl border border-[#212B42] bg-[#0B0E16] hover:bg-[#141A29] hover:border-[#3B82F6]/40 text-xs font-medium text-[#D5E1F7] transition-colors"
              >
                Browse All Problems
              </Link>
            </div>
          </div>

          {/* Compact Telemetry Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-[#171D2D]">
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#7C8BA6]">Curated Pathways</span>
              <span className="text-sm font-mono font-semibold text-[#F8FAFF] tabular-nums">
                {globalSheetStats.totalSheets}
              </span>
            </div>
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#7C8BA6]">Sheet Problems Solved</span>
              <span className="text-sm font-mono font-semibold text-[#22D3EE] tabular-nums">
                {globalSheetStats.uniqueSolved} / {globalSheetStats.uniqueTotal}
              </span>
            </div>
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#7C8BA6]">Revision Bookmarks</span>
              <span className="text-sm font-mono font-semibold text-[#93C5FD] tabular-nums">
                {globalSheetStats.uniqueStarred}
              </span>
            </div>
          </div>
        </section>

        {/* Category Tabs & Search Rail */}
        <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-3.5 sm:px-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Sheet Categories"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0"
            >
              {SHEET_CATEGORY_TABS.map((tab) => {
                const isActive = activeCategory === tab.id;
                const count = categoryCounts[tab.id] || 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectCategory(tab.id)}
                    className={cn(
                      'relative px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5',
                      isActive
                        ? 'text-[#F8FAFF]'
                        : 'text-[#7C8BA6] hover:text-[#D5E1F7]'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sheetsCategoryPill"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        className="absolute inset-0 rounded-xl bg-[#152443] border border-[#3B82F6]/35"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                    <span className="relative z-10 font-mono text-[10px] text-[#94A3B8] tabular-nums">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-full sm:w-72">
                <input
                  id="sheets-catalog-search"
                  name="sheets-catalog-search"
                  type="text"
                  aria-label="Search preparation sheets"
                  placeholder="Search sheets, companies, topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/50 rounded-xl px-3.5 py-2 text-xs text-[#E2E8F5] placeholder-[#5B6882] focus:outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-2 rounded-xl bg-[#0B0E16] border border-[#181F30] hover:border-[#29344E] text-[11px] font-medium text-[#7C8BA6] hover:text-[#E2E8F5] transition-colors cursor-pointer shrink-0"
              >
                {problemsLoading ? 'Syncing...' : 'Sync'}
              </button>
            </div>
          </div>
        </section>

        {/* Curated Sheets Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCategory}-${searchQuery ? 'filtered' : 'all'}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {filteredSheets.length === 0 ? (
              <div className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-12 text-center space-y-3">
                <p className="text-sm font-medium text-[#E2E8F5]">
                  No preparation sheets matched your search.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    handleSelectCategory('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#152443] border border-[#3B82F6]/35 text-xs font-medium text-[#93C5FD] hover:text-white transition-colors cursor-pointer"
                >
                  Show All Sheets
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredSheets.map((summary) => {
                  const def = summary.definition;
                  const total = summary.totalCount;
                  const easyTotal = summary.difficultyCounts.easy.total;
                  const medTotal = summary.difficultyCounts.medium.total;
                  const hardTotal = summary.difficultyCounts.hard.total;

                  const easyPct = total > 0 ? (easyTotal / total) * 100 : 0;
                  const medPct = total > 0 ? (medTotal / total) * 100 : 0;
                  const hardPct = total > 0 ? (hardTotal / total) * 100 : 0;

                  return (
                    <Link
                      key={def.id}
                      to={`/app/sheets/${def.id}`}
                      className="group rounded-2xl border border-[#181F30] bg-[#0F131D] hover:bg-[#131928] hover:border-[#29344E] p-5 sm:p-6 flex flex-col justify-between gap-5 transition-all duration-150"
                    >
                      <div className="space-y-4">
                        {/* Header Row (Zero Card Icons) */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-semibold text-[#F8FAFF] group-hover:text-[#93C5FD] transition-colors leading-snug">
                              {def.title}
                            </h2>
                            <p className="text-xs font-mono text-[#7C8BA6] mt-0.5 truncate">
                              {def.subtitle}
                            </p>
                          </div>

                          <span className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-full bg-[#0B0E16] border border-[#1B2234] text-[#94A3B8] shrink-0">
                            {CATEGORY_LABEL_MAP[def.category]}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-[#8E9BB3] leading-relaxed line-clamp-2">
                          {def.description}
                        </p>

                        {/* Step Focus Preview Pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {summary.steps.slice(0, 3).map((step) => (
                            <span
                              key={step.definition.id}
                              className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-[#0B0E16] border border-[#171D2D] text-[#94A3B8]"
                            >
                              {step.definition.title.split(':')[0].split(',')[0]}
                            </span>
                          ))}
                          {summary.steps.length > 3 && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-[#0B0E16] border border-[#171D2D] text-[#64748B]">
                              +{summary.steps.length - 3} more
                            </span>
                          )}
                        </div>

                        {/* Restrained Brand-Unified Distribution Bar */}
                        <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] p-3 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#8E9BB3]">
                            <span>Difficulty Mix</span>
                            <span>
                              {easyTotal} Easy · {medTotal} Med · {hardTotal} Hard
                            </span>
                          </div>
                          <div className="h-1 w-full rounded-full bg-[#151B2B] flex overflow-hidden">
                            <div style={{ width: `${easyPct}%` }} className="bg-[#22D3EE]/55" />
                            <div style={{ width: `${medPct}%` }} className="bg-[#3B82F6]/70" />
                            <div style={{ width: `${hardPct}%` }} className="bg-[#93C5FD]" />
                          </div>
                        </div>
                      </div>

                      {/* Progress + Footer CTA */}
                      <div className="space-y-3 pt-1 border-t border-[#171D2D]">
                        <div className="flex items-center justify-between text-xs pt-2">
                          <span className="text-[#8E9BB3]">Progress</span>
                          <span className="font-mono font-semibold text-[#F8FAFF] tabular-nums">
                            {summary.solvedCount} / {total}{' '}
                            <span className="text-[#22D3EE]">({summary.completionPercent}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#0B0E16] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] transition-all duration-300"
                            style={{ width: `${summary.completionPercent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-mono text-[#7C8BA6] tabular-nums">
                            {summary.steps.length} Steps · {def.estHours}
                          </span>

                          <span className="px-3 py-1.5 rounded-xl bg-[#152443] border border-[#243B6B] group-hover:bg-[#2563EB] group-hover:border-[#3B82F6] text-xs font-medium text-[#93C5FD] group-hover:text-white transition-colors">
                            Open Sheet
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default SheetsView;
