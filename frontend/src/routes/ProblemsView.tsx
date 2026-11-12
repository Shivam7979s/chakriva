import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { useProblems } from '@/hooks/useProblems';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useAuth } from '@/hooks/useAuth';
import type { Problem } from '@/types';
import {
  Search,
  CheckCircle2,
  Star,
  ArrowUpDown,
  BookOpen,
  Code2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  X,
  Layers,
  Cpu,
  Boxes,
  Database,
  Server,
  Monitor,
  Network,
  Box,
  Binary,
  Building2,
  Trophy,
  Clock,
  Bookmark,
  ArrowRight,
} from 'lucide-react';

export const ProblemsView: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isAppRoute = location.pathname.startsWith('/app');

  const { user } = useAuth();
  const { problems, loading, refetch } = useProblems();
  const { progressMap, revisionMap, toggleRevision } = useUserProgress();

  // Initialize filters with URL params if available, else defaults
  const [search, setSearch] = useState(searchParams.get('q') || searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(searchParams.get('difficulty') || 'all');
  const [selectedDomain, setSelectedDomain] = useState<string>(searchParams.get('domain') || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>(searchParams.get('workflow') || 'all');
  const [selectedTag, setSelectedTag] = useState<string>(searchParams.get('topic') || searchParams.get('tag') || 'all');
  const [revisionOnly, setRevisionOnly] = useState<boolean>(searchParams.get('revision') === 'true');
  const [sortField, setSortField] = useState<'id' | 'title' | 'acceptance' | 'difficulty'>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Dynamically extract all available tags
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) => {
      (p.tags || []).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [problems]);

  // Dynamically extract domains
  const availableDomains = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) => {
      if (p.domain) set.add(p.domain);
    });
    return Array.from(set).sort();
  }, [problems]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedCategory,
    selectedDifficulty,
    selectedDomain,
    selectedStatus,
    selectedWorkflow,
    selectedTag,
    revisionOnly,
    pageSize,
  ]);

  // Handle category selection from left rail
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'all') {
      setSelectedDomain('all');
      setSelectedTag('all');
      setRevisionOnly(false);
    } else if (categoryId === 'dsa') {
      setSelectedDomain('DSA');
      setSelectedTag('all');
      setRevisionOnly(false);
    } else if (categoryId === 'database') {
      setSelectedDomain('Database');
      setSelectedTag('all');
      setRevisionOnly(false);
    } else if (categoryId === 'revision' || categoryId === 'bookmarks') {
      setRevisionOnly(true);
    } else {
      setSelectedDomain('all');
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedCategory !== 'all' ||
      selectedDifficulty !== 'all' ||
      selectedDomain !== 'all' ||
      selectedStatus !== 'all' ||
      selectedWorkflow !== 'all' ||
      selectedTag !== 'all' ||
      revisionOnly
  );

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setSelectedDomain('all');
    setSelectedStatus('all');
    setSelectedWorkflow('all');
    setSelectedTag('all');
    setRevisionOnly(false);
  };

  // Helper matching functions for categories
  const checkMatchesCategory = (prob: Problem, cat: string): boolean => {
    if (cat === 'all') return true;
    if (cat === 'dsa') {
      return !prob.domain || prob.domain.toLowerCase() === 'dsa';
    }
    if (cat === 'algorithms') {
      const algoKeywords = [
        'dynamic programming',
        'binary search',
        'sorting',
        'greedy',
        'two pointers',
        'backtracking',
        'divide and conquer',
        'recursion',
        'bit manipulation',
        'algorithm',
      ];
      return (prob.tags || []).some((t) =>
        algoKeywords.some((kw) => t.toLowerCase().includes(kw))
      );
    }
    if (cat === 'data-structures') {
      const dsKeywords = [
        'array',
        'string',
        'hash',
        'tree',
        'graph',
        'stack',
        'queue',
        'linked list',
        'heap',
        'trie',
        'matrix',
      ];
      return (prob.tags || []).some((t) =>
        dsKeywords.some((kw) => t.toLowerCase().includes(kw))
      );
    }
    if (cat === 'database') {
      return (
        prob.domain === 'Database' ||
        (prob.tags || []).some(
          (t) => t.toLowerCase().includes('database') || t.toLowerCase().includes('sql')
        )
      );
    }
    if (cat === 'system-design') {
      return (
        prob.domain === 'Design' ||
        (prob.tags || []).some((t) => t.toLowerCase().includes('design'))
      );
    }
    if (cat === 'os') {
      return (
        prob.domain === 'Concurrency' ||
        prob.domain === 'Shell' ||
        (prob.tags || []).some(
          (t) =>
            t.toLowerCase().includes('concurrency') ||
            t.toLowerCase().includes('operating') ||
            t.toLowerCase().includes('shell')
        )
      );
    }
    if (cat === 'networks') {
      return (prob.tags || []).some((t) => t.toLowerCase().includes('network'));
    }
    if (cat === 'oop') {
      return (prob.tags || []).some(
        (t) => t.toLowerCase().includes('oop') || t.toLowerCase().includes('class')
      );
    }
    if (cat === 'sql') {
      return (prob.tags || []).some(
        (t) => t.toLowerCase().includes('sql') || t.toLowerCase().includes('query')
      );
    }
    return true;
  };

  // Category counts calculated from real catalog data
  const categoryCounts = useMemo(() => {
    return {
      all: problems.length,
      dsa: problems.filter((p) => checkMatchesCategory(p, 'dsa')).length,
      algorithms: problems.filter((p) => checkMatchesCategory(p, 'algorithms')).length,
      dataStructures: problems.filter((p) => checkMatchesCategory(p, 'data-structures')).length,
      database: problems.filter((p) => checkMatchesCategory(p, 'database')).length,
      systemDesign: problems.filter((p) => checkMatchesCategory(p, 'system-design')).length,
      os: problems.filter((p) => checkMatchesCategory(p, 'os')).length,
      networks: problems.filter((p) => checkMatchesCategory(p, 'networks')).length,
      oop: problems.filter((p) => checkMatchesCategory(p, 'oop')).length,
      sql: problems.filter((p) => checkMatchesCategory(p, 'sql')).length,
    };
  }, [problems]);

  // Main filter pipeline
  const filteredProblems = useMemo(() => {
    const q = search.toLowerCase().trim();

    const result = problems.filter((prob) => {
      // Authoritative status resolution: strictly check solved vs attempted
      const statusRaw =
        progressMap[prob.id] ||
        (prob.verniq_id ? progressMap[prob.verniq_id] : undefined);
      const isSolved = statusRaw === 'solved';
      const isAttempted = statusRaw === 'attempted' && !isSolved;
      const status = isSolved ? 'solved' : isAttempted ? 'attempted' : 'todo';

      const isRevision = Boolean(revisionMap[prob.id]);

      const tokens = q.split(/\s+/).filter(Boolean);
      const matchesSearch =
        tokens.length === 0 ||
        tokens.every((tok) =>
          prob.title.toLowerCase().includes(tok) ||
          (prob.verniq_id && prob.verniq_id.toLowerCase().includes(tok)) ||
          (prob.domain && prob.domain.toLowerCase().includes(tok)) ||
          (prob.tags || []).some((t) => t.toLowerCase().includes(tok))
        );

      const matchesCategory = checkMatchesCategory(prob, selectedCategory);

      const matchesDifficulty =
        selectedDifficulty === 'all' || prob.difficulty === selectedDifficulty;

      const matchesDomain =
        selectedDomain === 'all' || prob.domain === selectedDomain;

      const matchesWorkflow =
        selectedWorkflow === 'all' ||
        (selectedWorkflow === 'published' &&
          (prob.is_published || prob.workflow_status === 'published')) ||
        (selectedWorkflow === 'draft' &&
          (!prob.is_published || prob.workflow_status === 'draft'));

      const matchesStatus =
        selectedStatus === 'all' || status === selectedStatus;

      const matchesTag =
        selectedTag === 'all' || (prob.tags || []).includes(selectedTag);

      const matchesRevision = !revisionOnly || isRevision;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDifficulty &&
        matchesDomain &&
        matchesWorkflow &&
        matchesStatus &&
        matchesTag &&
        matchesRevision
      );
    });

    result.sort((a, b) => {
      if (sortField === 'id') {
        const idA = a.verniq_id || a.id;
        const idB = b.verniq_id || b.id;
        return sortAsc
          ? idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
          : idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortField === 'title') {
        return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      if (sortField === 'acceptance') {
        const accA = a.acceptance_rate ?? -1;
        const accB = b.acceptance_rate ?? -1;
        return sortAsc ? accA - accB : accB - accA;
      }
      if (sortField === 'difficulty') {
        const order: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
        const diffA = order[a.difficulty] || 0;
        const diffB = order[b.difficulty] || 0;
        return sortAsc ? diffA - diffB : diffB - diffA;
      }
      return 0;
    });

    return result;
  }, [
    problems,
    progressMap,
    revisionMap,
    search,
    selectedCategory,
    selectedDifficulty,
    selectedDomain,
    selectedWorkflow,
    selectedStatus,
    selectedTag,
    revisionOnly,
    sortField,
    sortAsc,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / pageSize));
  const paginatedProblems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProblems.slice(start, start + pageSize);
  }, [filteredProblems, currentPage, pageSize]);

  // Real progress and telemetry figures (strictly derived from authoritative submission results)
  const solvedCount = useMemo(
    () =>
      problems.filter(
        (p) =>
          progressMap[p.id] === 'solved' ||
          (p.verniq_id && progressMap[p.verniq_id] === 'solved')
      ).length,
    [problems, progressMap]
  );


  const revisionCount = useMemo(
    () => problems.filter((p) => Boolean(revisionMap[p.id])).length,
    [problems, revisionMap]
  );

  // Breakdown for Right Rail progress card
  const easyStats = useMemo(() => {
    const total = problems.filter((p) => p.difficulty === 'easy').length;
    const solved = problems.filter(
      (p) =>
        p.difficulty === 'easy' &&
        (progressMap[p.id] === 'solved' ||
          (p.verniq_id && progressMap[p.verniq_id] === 'solved'))
    ).length;
    return { solved, total };
  }, [problems, progressMap]);

  const mediumStats = useMemo(() => {
    const total = problems.filter((p) => p.difficulty === 'medium').length;
    const solved = problems.filter(
      (p) =>
        p.difficulty === 'medium' &&
        (progressMap[p.id] === 'solved' ||
          (p.verniq_id && progressMap[p.verniq_id] === 'solved'))
    ).length;
    return { solved, total };
  }, [problems, progressMap]);

  const hardStats = useMemo(() => {
    const total = problems.filter((p) => p.difficulty === 'hard').length;
    const solved = problems.filter(
      (p) =>
        p.difficulty === 'hard' &&
        (progressMap[p.id] === 'solved' ||
          (p.verniq_id && progressMap[p.verniq_id] === 'solved'))
    ).length;
    return { solved, total };
  }, [problems, progressMap]);

  // Dynamic trending topics from real problem tags
  const trendingTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    problems.forEach((p) => {
      (p.tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [problems]);

  // Target curated companies for Right Rail linking to sheets
  const targetCompanies = [
    { name: 'Amazon', count: 442 },
    { name: 'Google', count: 471 },
    { name: 'Microsoft', count: 470 },
    { name: 'Meta', count: 346 },
    { name: 'Uber', count: 438 },
  ];

  // Smart pagination page numbers (inspired by TakeUForward & LeetCode)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  // Radial chart values for progress donut
  const circleRadius = 38;
  const circumference = 2 * Math.PI * circleRadius;
  const progressRatio = problems.length > 0 ? solvedCount / problems.length : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Left rail category list
  const categoryNavItems = [
    { id: 'all', label: 'All Problems', icon: Layers, count: categoryCounts.all },
    { id: 'dsa', label: 'DSA', icon: Code2, count: categoryCounts.dsa },
    { id: 'algorithms', label: 'Algorithms', icon: Cpu, count: categoryCounts.algorithms },
    { id: 'data-structures', label: 'Data Structures', icon: Boxes, count: categoryCounts.dataStructures },
    { id: 'database', label: 'Database', icon: Database, count: categoryCounts.database },
    { id: 'system-design', label: 'System Design', icon: Server, count: categoryCounts.systemDesign },
    { id: 'os', label: 'Operating Systems', icon: Monitor, count: categoryCounts.os },
    { id: 'networks', label: 'Computer Networks', icon: Network, count: categoryCounts.networks },
    { id: 'oop', label: 'OOP', icon: Box, count: categoryCounts.oop },
    { id: 'sql', label: 'SQL', icon: Binary, count: categoryCounts.sql },
  ];

  // Active filter label helpers for chips
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (search.trim()) {
      chips.push({
        key: 'search',
        label: `Search: "${search}"`,
        onRemove: () => setSearch(''),
      });
    }
    if (selectedCategory !== 'all') {
      const match = categoryNavItems.find((c) => c.id === selectedCategory);
      chips.push({
        key: 'category',
        label: `Category: ${match?.label || selectedCategory}`,
        onRemove: () => handleSelectCategory('all'),
      });
    }
    if (selectedDifficulty !== 'all') {
      chips.push({
        key: 'difficulty',
        label: `Difficulty: ${selectedDifficulty.toUpperCase()}`,
        onRemove: () => setSelectedDifficulty('all'),
      });
    }
    if (selectedStatus !== 'all') {
      chips.push({
        key: 'status',
        label: `Status: ${selectedStatus.toUpperCase()}`,
        onRemove: () => setSelectedStatus('all'),
      });
    }
    if (selectedDomain !== 'all') {
      chips.push({
        key: 'domain',
        label: `Domain: ${selectedDomain}`,
        onRemove: () => setSelectedDomain('all'),
      });
    }
    if (selectedTag !== 'all') {
      chips.push({
        key: 'tag',
        label: `Topic: ${selectedTag}`,
        onRemove: () => setSelectedTag('all'),
      });
    }
    if (selectedWorkflow !== 'all') {
      chips.push({
        key: 'workflow',
        label: `Scope: ${selectedWorkflow}`,
        onRemove: () => setSelectedWorkflow('all'),
      });
    }
    if (revisionOnly) {
      chips.push({
        key: 'revision',
        label: 'Revision Only',
        onRemove: () => setRevisionOnly(false),
      });
    }
    return chips;
  }, [
    search,
    selectedCategory,
    selectedDifficulty,
    selectedStatus,
    selectedDomain,
    selectedTag,
    selectedWorkflow,
    revisionOnly,
    categoryNavItems,
  ]);

  const content = (
    <div className="w-full max-w-[1780px] mx-auto flex flex-col flex-1 min-h-0 lg:h-full space-y-2.5 lg:overflow-hidden">
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
      {/* Mobile/Tablet Horizontal Category Strip */}
      <div className="lg:hidden shrink-0 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs font-mono">
        {categoryNavItems.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/40 font-medium'
                  : 'bg-[#0B0F19] text-[#94A3B8] border-[#1C2230] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-[#22D3EE]/25 text-[#22D3EE]' : 'bg-[#111521] text-[#717B8D]'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3-Column Structured Layout */}
      <div className="flex items-stretch gap-3.5 lg:gap-4.5 w-full min-w-0 flex-1 min-h-0 lg:overflow-hidden">
        {/* ================================================================== */}
        {/* 1. LEFT CONTEXTUAL CATEGORY RAIL (Desktop Only: ~192–208px)        */}
        {/* ================================================================== */}
        <aside
          className="w-48 xl:w-52 shrink-0 hidden lg:flex flex-col gap-3 h-full min-h-0 overflow-y-auto no-scrollbar pb-2 overscroll-contain"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] px-2.5 pb-2 select-none">
              Practice
            </h3>

            {/* Category Navigation Items */}
            <div className="space-y-0.5">
              {categoryNavItems.map((cat) => {
                const isActive = selectedCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30 shadow-sm'
                        : 'text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                          isActive ? 'text-[#22D3EE]' : 'text-[#717B8D] group-hover:text-zinc-300'
                        }`}
                      />
                      <span className="truncate">{cat.label}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full shrink-0 ${
                        isActive
                          ? 'bg-[#22D3EE]/20 text-[#22D3EE]'
                          : 'text-[#717B8D] group-hover:text-zinc-400'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Secondary Rails: Curated Tracks & Revision */}
            <div className="pt-3 mt-3 border-t border-[#1C2230] space-y-0.5">
              <Link
                to="/app/sheets?category=company"
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#717B8D] group-hover:text-zinc-300" />
                  <span>Companies</span>
                </div>
                <ChevronRight className="w-3 h-3 text-[#717B8D] group-hover:text-zinc-300" />
              </Link>

              <Link
                to="/contests"
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-[#717B8D] group-hover:text-zinc-300" />
                  <span>Contests</span>
                </div>
                <ChevronRight className="w-3 h-3 text-[#717B8D] group-hover:text-zinc-300" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setRevisionOnly(!revisionOnly);
                  setSelectedCategory(revisionOnly ? 'all' : 'revision');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                  revisionOnly
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock
                    className={`w-3.5 h-3.5 ${
                      revisionOnly ? 'text-amber-400' : 'text-[#717B8D] group-hover:text-zinc-300'
                    }`}
                  />
                  <span>Revision</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 tabular-nums">
                  {user ? revisionCount : '—'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRevisionOnly(!revisionOnly);
                  setSelectedCategory(revisionOnly ? 'all' : 'bookmarks');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                  revisionOnly
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      revisionOnly ? 'text-amber-400' : 'text-[#717B8D] group-hover:text-zinc-300'
                    }`}
                  />
                  <span>Bookmarks</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 tabular-nums">
                  {user ? revisionCount : '—'}
                </span>
              </button>
            </div>
          </div>

          {/* Need a Plan Card */}
          <div className="bg-[#0B0F19] border border-[#1C2230] rounded-xl p-3.5 space-y-2 shadow-sm mt-auto">
            <div>
              <h4 className="text-xs font-semibold text-white">Need a plan?</h4>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed mt-0.5">
                Create a personalized roadmap based on your goal and time.
              </p>
            </div>
            <Link
              to="/app/plan"
              className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-[#22D3EE]/10 hover:bg-[#22D3EE] text-[#22D3EE] hover:text-black border border-[#22D3EE]/30 text-xs font-mono font-medium transition-all group shadow-sm"
            >
              <span>Create Roadmap</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </aside>

        {/* ================================================================== */}
        {/* 2. MAIN CENTER COLUMN: Catalog Header, Search, Filters & Table     */}
        {/* ================================================================== */}
        <div className="flex-1 min-w-0 flex flex-col h-full min-h-0 space-y-2.5 lg:overflow-hidden">
          {/* Header (Pinned, Non-scrolling) */}
          <div className="shrink-0 space-y-0.5 pb-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
              Practice Library
            </h1>
            <p className="text-xs text-[#94A3B8] max-w-xl leading-relaxed">
              Curated algorithmic patterns and verified canonical test suites across all difficulty tiers.
            </p>
          </div>

          {/* Compact Search & Filter Toolbar (Pinned, Non-scrolling) */}
          <div className="shrink-0 p-2.5 sm:p-3 rounded-xl border border-[#1C2230] bg-[#0B0F19] space-y-2 shadow-md">
            {/* Search Input Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#717B8D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title, topic, or ID (e.g. CKR-000001)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#111521] border border-[#1C2230] focus:border-[#22D3EE]/50 focus:ring-1 focus:ring-[#22D3EE]/30 rounded-lg pl-8 pr-8 py-1.5 text-xs text-[#F3F4F6] placeholder-[#717B8D] transition-all font-sans outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#717B8D] hover:text-white rounded transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                title="Refresh problem catalog"
                className="p-2 rounded-lg bg-[#111521] hover:bg-white/[0.08] border border-[#1C2230] text-[#94A3B8] hover:text-white transition-all shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#22D3EE]' : ''}`} />
              </button>
            </div>

            {/* Segmented Controls & Dropdowns */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              {/* Left: Quick Pill Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Difficulty Segmented Filter */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[#111521] border border-[#1C2230]">
                  {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => {
                    const isActive = selectedDifficulty === diff;
                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all capitalize ${
                          isActive
                            ? diff === 'easy'
                              ? 'bg-[#00B8A3]/20 text-[#00B8A3] border border-[#00B8A3]/40 shadow-sm'
                              : diff === 'medium'
                              ? 'bg-[#FFC01E]/20 text-[#FFC01E] border border-[#FFC01E]/40 shadow-sm'
                              : diff === 'hard'
                              ? 'bg-[#FB4765]/20 text-[#FB4765] border border-[#FB4765]/40 shadow-sm'
                              : 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40 shadow-sm'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        {diff === 'easy' && <span className="w-1.5 h-1.5 rounded-full bg-[#00B8A3]" />}
                        {diff === 'medium' && <span className="w-1.5 h-1.5 rounded-full bg-[#FFC01E]" />}
                        {diff === 'hard' && <span className="w-1.5 h-1.5 rounded-full bg-[#FB4765]" />}
                        <span>{diff === 'all' ? 'All' : diff}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Status Segmented Filter */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[#111521] border border-[#1C2230]">
                  {(['all', 'todo', 'attempted', 'solved'] as const).map((st) => {
                    const isActive = selectedStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedStatus(st)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all capitalize ${
                          isActive
                            ? st === 'solved'
                              ? 'bg-[#00B8A3]/20 text-[#00B8A3] border border-[#00B8A3]/40 shadow-sm'
                              : st === 'attempted'
                              ? 'bg-[#FFC01E]/20 text-[#FFC01E] border border-[#FFC01E]/40 shadow-sm'
                              : 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40 shadow-sm'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        {st === 'all' ? 'All' : st}
                      </button>
                    );
                  })}
                </div>

                {/* Revision Pill */}
                <button
                  type="button"
                  onClick={() => setRevisionOnly(!revisionOnly)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border transition-all ${
                    revisionOnly
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-[#111521] text-[#94A3B8] border-[#1C2230] hover:text-white'
                  }`}
                >
                  <Star className={`w-3 h-3 ${revisionOnly ? 'fill-amber-400 text-amber-400' : 'text-[#717B8D]'}`} />
                  <span>Revision ({user ? revisionCount : '—'})</span>
                </button>
              </div>

              {/* Right: Topic, Domain, Scope Dropdowns */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="relative min-w-[120px]">
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full bg-[#111521] border border-[#1C2230] text-[11px] font-mono text-[#94A3B8] rounded-lg px-2.5 py-1.5 appearance-none focus:outline-none focus:border-[#22D3EE]/40 transition-colors pr-7 cursor-pointer"
                  >
                    <option value="all">All Topics</option>
                    {availableTags.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#717B8D] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative min-w-[110px]">
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full bg-[#111521] border border-[#1C2230] text-[11px] font-mono text-[#94A3B8] rounded-lg px-2.5 py-1.5 appearance-none focus:outline-none focus:border-[#22D3EE]/40 transition-colors pr-7 cursor-pointer"
                  >
                    <option value="all">All Domains</option>
                    {availableDomains.map((dom) => (
                      <option key={dom} value={dom}>
                        {dom}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#717B8D] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative min-w-[105px]">
                  <select
                    value={selectedWorkflow}
                    onChange={(e) => setSelectedWorkflow(e.target.value)}
                    className="w-full bg-[#111521] border border-[#1C2230] text-[11px] font-mono text-[#94A3B8] rounded-lg px-2.5 py-1.5 appearance-none focus:outline-none focus:border-[#22D3EE]/40 transition-colors pr-7 cursor-pointer"
                  >
                    <option value="all">All Catalog</option>
                    <option value="published">Published</option>
                    <option value="draft">Drafts</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#717B8D] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Active Filter Chips & Live Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1C2230]/50 text-xs font-mono">
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#111521] border border-[#1C2230] text-[#F3F4F6] text-[10px] font-mono shadow-sm"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      className="text-[#717B8D] hover:text-[#22D3EE] transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[#22D3EE] hover:text-cyan-300 hover:underline text-[10px] font-mono ml-1"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="text-[#94A3B8] text-[10px]">
                Showing{' '}
                <strong className="text-white">
                  {filteredProblems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </strong>
                –
                <strong className="text-white">
                  {Math.min(currentPage * pageSize, filteredProblems.length)}
                </strong>{' '}
                of <strong className="text-white">{filteredProblems.length}</strong> problems
              </div>
            </div>
          </div>

          {/* Problem Catalog Table Card — Bounded Internal Scroll with Sticky Header & Docked Pagination */}
          <div className="flex-1 min-h-0 flex flex-col border border-[#1C2230] rounded-xl bg-[#0B0F19] overflow-hidden shadow-xl w-full">
            {/* Scrollable Table Viewport (Sole Owner of Vertical Scrolling for Problem Rows) */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-auto lg:overflow-x-hidden no-scrollbar w-full relative overscroll-contain"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <table className="w-full table-fixed text-left border-collapse text-xs font-mono">
                <thead className="sticky top-0 z-20 bg-[#111521] border-b border-[#1C2230] text-[#717B8D] select-none text-[10px] uppercase tracking-wider font-semibold">
                  <tr className="h-9">
                    {/* Row Index # */}
                    <th className="py-2 px-1 w-9 text-center text-[#717B8D] shrink-0">
                      #
                    </th>

                    {/* Status Column */}
                    <th className="py-2 px-1 w-12 text-center shrink-0 uppercase tracking-wider font-semibold">
                      Status
                    </th>

                    {/* Canonical ID Column */}
                    <th className="py-2 px-2 w-20 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortField === 'id') setSortAsc(!sortAsc);
                          else {
                            setSortField('id');
                            setSortAsc(true);
                          }
                        }}
                        className="flex items-center gap-1 hover:text-white uppercase tracking-wider font-semibold"
                      >
                        <span>ID</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'id' ? 'text-[#22D3EE]' : 'text-[#717B8D]'}`} />
                      </button>
                    </th>

                    {/* Title Column (Auto-expanding, takes remaining width) */}
                    <th className="py-2 px-3 w-auto min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortField === 'title') setSortAsc(!sortAsc);
                          else {
                            setSortField('title');
                            setSortAsc(true);
                          }
                        }}
                        className="flex items-center gap-1 hover:text-white uppercase tracking-wider font-semibold"
                      >
                        <span>Title & Topic</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'title' ? 'text-[#22D3EE]' : 'text-[#717B8D]'}`} />
                      </button>
                    </th>

                    {/* Difficulty Column */}
                    <th className="py-2 px-2 w-24 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortField === 'difficulty') setSortAsc(!sortAsc);
                          else {
                            setSortField('difficulty');
                            setSortAsc(true);
                          }
                        }}
                        className="flex items-center gap-1 hover:text-white uppercase tracking-wider font-semibold"
                      >
                        <span>Difficulty</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'difficulty' ? 'text-[#22D3EE]' : 'text-[#717B8D]'}`} />
                      </button>
                    </th>

                    {/* Acceptance Column */}
                    <th className="py-2 px-2 w-24 shrink-0 hidden sm:table-cell">
                      <button
                        type="button"
                        onClick={() => {
                          if (sortField === 'acceptance') setSortAsc(!sortAsc);
                          else {
                            setSortField('acceptance');
                            setSortAsc(false);
                          }
                        }}
                        className="flex items-center gap-1 hover:text-white uppercase tracking-wider font-semibold"
                      >
                        <span>Acceptance</span>
                        <ArrowUpDown className={`w-3 h-3 ${sortField === 'acceptance' ? 'text-[#22D3EE]' : 'text-[#717B8D]'}`} />
                      </button>
                    </th>

                    {/* Tags Column */}
                    <th className="py-2 px-2 w-28 xl:w-32 shrink-0 hidden md:table-cell uppercase tracking-wider font-semibold">
                      Tags
                    </th>

                    {/* Saved Star Column */}
                    <th className="py-2 px-1 w-10 text-center shrink-0 uppercase tracking-wider font-semibold">
                      Saved
                    </th>

                    {/* Action Column */}
                    <th className="py-2 px-2 w-20 text-right pr-2 shrink-0 uppercase tracking-wider font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#1C2230]/40">
                  {loading && paginatedProblems.length === 0 ? (
                    // Skeleton loading rows
                    Array.from({ length: 8 }).map((_, idx) => (
                      <tr key={idx} className="h-[52px] bg-[#0B0F19] animate-pulse">
                        <td className="py-2 px-1 text-center"><div className="h-3 w-4 bg-white/[0.06] rounded mx-auto" /></td>
                        <td className="py-2 px-1 text-center"><div className="h-3.5 w-3.5 bg-white/[0.06] rounded-full mx-auto" /></td>
                        <td className="py-2 px-2"><div className="h-4 w-14 bg-white/[0.06] rounded" /></td>
                        <td className="py-2 px-3 min-w-0 max-w-0 overflow-hidden"><div className="h-4 w-40 bg-white/[0.06] rounded" /></td>
                        <td className="py-2 px-2"><div className="h-4 w-14 bg-white/[0.06] rounded-full" /></td>
                        <td className="py-2 px-2 hidden sm:table-cell"><div className="h-4 w-14 bg-white/[0.06] rounded" /></td>
                        <td className="py-2 px-2 hidden md:table-cell max-w-0 overflow-hidden"><div className="h-4 w-16 bg-white/[0.06] rounded" /></td>
                        <td className="py-2 px-1 text-center"><div className="h-3.5 w-3.5 bg-white/[0.06] rounded mx-auto" /></td>
                        <td className="py-2 px-2 text-right pr-2"><div className="h-5 w-12 bg-white/[0.06] rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : paginatedProblems.length > 0 ? (
                    paginatedProblems.map((prob, index) => {
                      // Authoritative status derived strictly from verified submissions
                      const statusRaw =
                        progressMap[prob.id] ||
                        (prob.verniq_id ? progressMap[prob.verniq_id] : undefined);
                      const isSolved = statusRaw === 'solved';
                      const isAttempted = statusRaw === 'attempted' && !isSolved;
                      const status = isSolved ? 'solved' : isAttempted ? 'attempted' : 'todo';

                      const isMarked = Boolean(revisionMap[prob.id]);
                      const isDraft = !prob.is_published || prob.workflow_status === 'draft';
                      const problemTargetUrl = isAppRoute
                        ? (prob.slug ? `/app/practice/${prob.slug}` : `/app/practice/${prob.id}`)
                        : (prob.slug ? `/problems/${prob.slug}` : `/problems/${prob.id}`);

                      const rowNumber = (currentPage - 1) * pageSize + index + 1;

                      // Format canonical CKR ID
                      const displayId = prob.verniq_id
                        ? prob.verniq_id.replace(/^VRQ-/, 'CKR-')
                        : prob.id
                        ? `CKR-${String(prob.id).slice(0, 6).toUpperCase().padStart(6, '0')}`
                        : 'CKR-PROB';

                      return (
                        <tr
                          key={prob.id}
                          className="hover:bg-[#111521]/70 bg-[#0B0F19] transition-colors group h-[52px]"
                        >
                          {/* Row Index # */}
                          <td className="py-2 px-1 text-center text-[#717B8D] font-mono text-[11px] tabular-nums select-none">
                            {rowNumber}
                          </td>

                          {/* Authoritative Status Indicator */}
                          <td className="py-2 px-1 text-center">
                            {status === 'solved' && (
                              <span
                                role="status"
                                aria-label="Solved"
                                title="Solved — Verified Accepted Submission"
                                className="inline-flex items-center justify-center p-0.5 rounded-full bg-[#00B8A3]/10 text-[#00B8A3]"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </span>
                            )}
                            {status === 'attempted' && (
                              <span
                                role="status"
                                aria-label="Attempted"
                                title="Attempted — Code submitted without Accepted verdict"
                                className="inline-flex items-center justify-center p-0.5 rounded-full bg-[#FFC01E]/10 text-[#FFC01E]"
                              >
                                <span className="w-2 h-2 rounded-full bg-[#FFC01E] ring-2 ring-[#FFC01E]/20" aria-hidden="true" />
                              </span>
                            )}
                            {status === 'todo' && (
                              <span
                                role="status"
                                aria-label="Unattempted"
                                title="Todo — No qualifying submission recorded"
                                className="text-[#717B8D] text-xs font-mono select-none"
                              >
                                —
                              </span>
                            )}
                          </td>

                          {/* Canonical ID */}
                          <td className="py-2 px-2 text-[#717B8D] font-mono text-[10px] whitespace-nowrap">
                            <span className="bg-[#111521] text-[#94A3B8] px-1.5 py-0.5 rounded border border-[#1C2230] text-[10px] tracking-tight">
                              {displayId}
                            </span>
                          </td>

                          {/* Title & Topic - Single-line with accessible tooltip */}
                          <td className="py-2 px-3 min-w-0 max-w-0 overflow-hidden">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Link
                                to={problemTargetUrl}
                                title={prob.title}
                                className="font-sans font-medium text-white hover:text-[#22D3EE] transition-colors text-xs truncate min-w-0 flex-1"
                              >
                                {prob.title}
                              </Link>

                              {/* Specialized Domain Pill */}
                              {prob.domain && prob.domain !== 'DSA' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 shrink-0 select-none">
                                  {prob.domain}
                                </span>
                              )}

                              {/* Draft Badge */}
                              {isDraft && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40 shrink-0 select-none">
                                  Draft
                                </span>
                              )}

                              {/* Hover Quick Link affordance */}
                              <Link
                                to={problemTargetUrl}
                                title="Open problem workspace"
                                className="opacity-0 group-hover:opacity-100 text-[#717B8D] hover:text-[#22D3EE] transition-opacity ml-0.5 shrink-0"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>

                          {/* Difficulty Badge */}
                          <td className="py-2 px-2">
                            <DifficultyBadge difficulty={prob.difficulty} className="text-[11px] px-2 py-0.2" />
                          </td>

                          {/* Acceptance Rate Progress Bar */}
                          <td className="py-2 px-2 hidden sm:table-cell">
                            {prob.acceptance_rate != null && prob.acceptance_rate > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-8 bg-[#1C2230] h-1.5 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className="bg-[#22D3EE] h-full rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(0, prob.acceptance_rate))}%` }}
                                  />
                                </div>
                                <span className="font-mono tabular-nums text-[#94A3B8] text-[10px]">
                                  {prob.acceptance_rate}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#717B8D] font-mono text-[10px]">—</span>
                            )}
                          </td>

                          {/* Topic Tags - Compact chips with max-w and truncation */}
                          <td className="py-2 px-2 hidden md:table-cell max-w-0 overflow-hidden">
                            <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                              {(prob.tags || []).slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  title={tag}
                                  className="bg-[#111521] text-[#94A3B8] text-[9px] px-1.5 py-0.2 rounded font-mono border border-[#1C2230] truncate max-w-[44px] shrink-0"
                                >
                                  {tag}
                                </span>
                              ))}
                              {(prob.tags || []).length > 2 && (
                                <span
                                  title={(prob.tags || []).slice(2).join(', ')}
                                  className="text-[9px] text-[#717B8D] font-mono bg-[#111521] px-1 py-0.2 rounded border border-[#1C2230] shrink-0"
                                >
                                  +{(prob.tags || []).length - 2}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Saved Revision Star */}
                          <td className="py-2 px-1 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleRevision(prob.id);
                              }}
                              className="p-1 rounded-md hover:bg-white/[0.08] transition-colors"
                              title={
                                isMarked
                                  ? 'In Revision Queue (Click to remove)'
                                  : 'Bookmark for Spaced Repetition Revision'
                              }
                            >
                              <Star
                                className={`w-3.5 h-3.5 transition-colors ${
                                  isMarked
                                    ? 'fill-[#FFC01E] text-[#FFC01E]'
                                    : 'text-[#717B8D] hover:text-[#FFC01E]'
                                }`}
                              />
                            </button>
                          </td>

                          {/* Action Solve Link */}
                          <td className="py-2 px-2 text-right pr-2">
                            <Link
                              to={problemTargetUrl}
                              className="inline-flex items-center justify-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#22D3EE]/10 hover:bg-[#22D3EE] text-[#22D3EE] hover:text-black border border-[#22D3EE]/30 transition-all shadow-sm"
                            >
                              <span>{isDraft ? 'Review' : 'Solve'}</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    // Empty state row
                    <tr>
                      <td colSpan={9} className="py-12 px-4 text-center">
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="w-10 h-10 rounded-full bg-[#111521] border border-[#1C2230] flex items-center justify-center mx-auto text-[#717B8D]">
                            <Search className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-semibold text-white">No matching problems found</div>
                          <p className="text-xs text-[#94A3B8] leading-relaxed">
                            We couldn&apos;t find any problems matching your current search and filter combination.
                          </p>
                          {hasActiveFilters && (
                            <div className="pt-1.5">
                              <button
                                type="button"
                                onClick={resetFilters}
                                className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/30 transition-all inline-flex items-center gap-1.5"
                              >
                                <X className="w-3 h-3" />
                                <span>Clear all filters</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (Pinned at bottom of table card, never obscuring rows) */}
            {totalPages > 1 && (
              <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between px-3.5 sm:px-4 py-2 border-t border-[#1C2230] bg-[#111521] text-xs font-mono text-[#94A3B8] gap-2">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-[#0B0F19] border border-[#1C2230] text-[#94A3B8] text-xs rounded-lg px-2.5 py-1 pr-6 appearance-none cursor-pointer focus:outline-none focus:border-[#22D3EE]/40"
                    >
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-[#717B8D] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Smart Page Controls */}
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="p-1 rounded-lg bg-[#0B0F19] hover:bg-white/[0.08] border border-[#1C2230] text-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg bg-[#0B0F19] hover:bg-white/[0.08] border border-[#1C2230] text-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Page Numbers */}
                  {getPageNumbers().map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-[#717B8D] font-mono select-none">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = currentPage === pageNum;
                    return (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => setCurrentPage(Number(pageNum))}
                        className={`w-6 h-6 rounded-md text-xs font-mono font-medium transition-all ${
                          isCurrent
                            ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40 shadow-sm'
                            : 'bg-[#0B0F19] text-[#94A3B8] border border-[#1C2230] hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-lg bg-[#0B0F19] hover:bg-white/[0.08] border border-[#1C2230] text-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="p-1 rounded-lg bg-[#0B0F19] hover:bg-white/[0.08] border border-[#1C2230] text-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* 3. RIGHT CONTEXTUAL RAIL: Progress, Topics, & Target Tracks        */}
        {/* ================================================================== */}
        <aside
          className="w-60 xl:w-64 shrink-0 hidden min-[1380px]:flex flex-col gap-3 h-full min-h-0 overflow-y-auto no-scrollbar pb-2 overscroll-contain"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Card 1: Your Progress */}
          <div className="bg-[#0B0F19] border border-[#1C2230] rounded-xl p-3.5 sm:p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Your Progress
              </h4>
              <Link
                to="/app/progress"
                className="text-[11px] font-mono text-[#22D3EE] hover:text-cyan-300 inline-flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {user ? (
              <>
                {/* Circular Donut Meter */}
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                    <circle
                      cx="48"
                      cy="48"
                      r={circleRadius}
                      className="text-[#1C2230]"
                      strokeWidth="6"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r={circleRadius}
                      className="text-[#22D3EE] transition-all duration-700 ease-out"
                      strokeWidth="6"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-bold font-mono text-white leading-none">
                      {solvedCount}
                    </span>
                    <span className="text-[10px] font-mono text-[#717B8D] mt-1">
                      / {problems.length}
                    </span>
                  </div>
                </div>

                {/* Difficulty Breakdown Bars */}
                <div className="space-y-2 pt-1 border-t border-[#1C2230]/60 text-xs font-mono">
                  {/* Easy */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 text-[#00B8A3]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00B8A3]" />
                        Easy
                      </span>
                      <span className="text-[#94A3B8] tabular-nums text-[10px]">
                        {easyStats.solved} / {easyStats.total}
                      </span>
                    </div>
                    <div className="w-full bg-[#1C2230] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#00B8A3] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${easyStats.total > 0 ? (easyStats.solved / easyStats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Medium */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 text-[#FFC01E]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFC01E]" />
                        Medium
                      </span>
                      <span className="text-[#94A3B8] tabular-nums text-[10px]">
                        {mediumStats.solved} / {mediumStats.total}
                      </span>
                    </div>
                    <div className="w-full bg-[#1C2230] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#FFC01E] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${mediumStats.total > 0 ? (mediumStats.solved / mediumStats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Hard */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 text-[#FB4765]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FB4765]" />
                        Hard
                      </span>
                      <span className="text-[#94A3B8] tabular-nums text-[10px]">
                        {hardStats.solved} / {hardStats.total}
                      </span>
                    </div>
                    <div className="w-full bg-[#1C2230] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#FB4765] h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${hardStats.total > 0 ? (hardStats.solved / hardStats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-4 text-center space-y-2.5">
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Sign in to track your personal solved problems, submission history, and spaced repetition queue.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/30 text-xs font-mono font-medium transition-all"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Card 2: Trending Topics */}
          <div className="bg-[#0B0F19] border border-[#1C2230] rounded-xl p-3.5 sm:p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Trending Topics
              </h4>
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className="text-[11px] font-mono text-[#22D3EE] hover:text-cyan-300 inline-flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1">
              {trendingTopics.map((topic, idx) => {
                const isSelected = selectedTag === topic.name;
                return (
                  <button
                    key={topic.name}
                    type="button"
                    onClick={() => {
                      if (isSelected) setSelectedTag('all');
                      else setSelectedTag(topic.name);
                    }}
                    className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-medium transition-all group ${
                      isSelected
                        ? 'bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30'
                        : 'text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-4 h-4 rounded bg-[#111521] border border-[#1C2230] flex items-center justify-center font-mono text-[9px] text-[#717B8D] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{topic.name}</span>
                    </div>

                    <span className="text-[10px] font-mono text-[#717B8D] group-hover:text-zinc-300 tabular-nums shrink-0">
                      {topic.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Top Companies */}
          <div className="bg-[#0B0F19] border border-[#1C2230] rounded-xl p-3.5 sm:p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Top Companies
              </h4>
              <Link
                to="/app/sheets?category=company"
                className="text-[11px] font-mono text-[#22D3EE] hover:text-cyan-300 inline-flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-1">
              {targetCompanies.map((comp, idx) => (
                <Link
                  key={comp.name}
                  to="/app/sheets?category=company"
                  className="w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-4 h-4 rounded bg-[#111521] border border-[#1C2230] flex items-center justify-center font-mono text-[9px] text-[#717B8D] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{comp.name}</span>
                  </div>

                  <span className="text-[10px] font-mono text-[#717B8D] group-hover:text-zinc-300 tabular-nums shrink-0">
                    {comp.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  // If accessed at /app/practice, render inside standard DashboardLayout with global AppNavbar
  if (isAppRoute) {
    return (
      <DashboardLayout
        breadcrumbs={[
          { label: 'CHAKRIVA', href: '/app/home' },
          { label: 'Practice', href: '/app/practice' },
        ]}
        disableMainScroll={true}
      >
        {content}
      </DashboardLayout>
    );
  }

  // Fallback for public /problems route
  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6 max-w-[1780px] mx-auto w-full text-left bg-[#08090B] min-h-screen text-[#F3F4F6]">
      {content}
    </div>
  );
};

export default ProblemsView;
