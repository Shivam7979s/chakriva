import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/layout/Container';
import { PageHeader } from '@/components/ui/layout/PageHeader';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { Input } from '@/components/ui/forms/Input';
import { Select } from '@/components/ui/forms/Select';
import { Button } from '@/components/ui/actions/Button';
import { useProblems } from '@/hooks/useProblems';
import { useUserProgress } from '@/hooks/useUserProgress';
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
} from 'lucide-react';

export const ProblemsView: React.FC = () => {
  const { problems, loading, refetch } = useProblems();
  const { progressMap, revisionMap, toggleRevision } = useUserProgress();

  const [search, setSearch] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [revisionOnly, setRevisionOnly] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'id' | 'title' | 'acceptance' | 'difficulty'>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  // Dynamically extract all available tags from the problem set
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
  }, [search, selectedDifficulty, selectedDomain, selectedStatus, selectedWorkflow, selectedTag, revisionOnly]);

  const filteredProblems = useMemo(() => {
    const q = search.toLowerCase().trim();

    let result = problems.filter((prob) => {
      const status = progressMap[prob.id] || (prob.verniq_id ? progressMap[prob.verniq_id] : undefined) || 'todo';
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

      const matchesDifficulty =
        selectedDifficulty === 'all' || prob.difficulty === selectedDifficulty;

      const matchesDomain =
        selectedDomain === 'all' || prob.domain === selectedDomain;

      const matchesWorkflow =
        selectedWorkflow === 'all' ||
        (selectedWorkflow === 'published' && (prob.is_published || prob.workflow_status === 'published')) ||
        (selectedWorkflow === 'draft' && (!prob.is_published || prob.workflow_status === 'draft'));

      const matchesStatus =
        selectedStatus === 'all' || status === selectedStatus;

      const matchesTag =
        selectedTag === 'all' || (prob.tags || []).includes(selectedTag);

      const matchesRevision = !revisionOnly || isRevision;

      return (
        matchesSearch &&
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
        return sortAsc ? idA.localeCompare(idB) : idB.localeCompare(idA);
      }
      if (sortField === 'title') {
        return sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      if (sortField === 'acceptance') {
        return sortAsc
          ? a.acceptance_rate - b.acceptance_rate
          : b.acceptance_rate - a.acceptance_rate;
      }
      if (sortField === 'difficulty') {
        const order = { easy: 1, medium: 2, hard: 3 };
        return sortAsc
          ? order[a.difficulty] - order[b.difficulty]
          : order[b.difficulty] - order[a.difficulty];
      }
      return 0;
    });

    return result;
  }, [
    problems,
    progressMap,
    revisionMap,
    search,
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

  const solvedCount = problems.filter((p) => progressMap[p.id] === 'solved').length;
  const revisionCount = problems.filter((p) => Boolean(revisionMap[p.id])).length;
  const draftCount = problems.filter((p) => !p.is_published || p.workflow_status === 'draft').length;

  return (
    <div className="py-8 space-y-8 text-left bg-background min-h-screen text-text-primary">
      <Container size="xl">
        {/* Standardized Sleek Page Header */}
        <PageHeader
          badge="Problem Catalog"
          title="Engineering Problems & Challenges"
          subtitle="Dense 3,392-problem catalog repository classified by hierarchical domain taxonomy, with mathematical proofs, sandbox test vectors, and spaced-repetition revision cycles."
          actions={
            <div className="flex items-center gap-4 bg-[#181C28] p-3 rounded-lg border border-white/[0.08]">
              <div className="text-center px-4 border-r border-white/[0.08]">
                <div className="text-xl font-bold font-mono text-white tabular-nums">{problems.length}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Catalog Total</div>
              </div>
              <div className="text-center px-4 border-r border-white/[0.08]">
                <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">{draftCount}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Draft Index</div>
              </div>
              <div className="text-center px-4 border-r border-white/[0.08]">
                <div className="text-xl font-bold font-mono text-[#00B8A3] tabular-nums">{solvedCount}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Solved</div>
              </div>
              <div className="text-center px-4">
                <div className="text-xl font-bold font-mono text-[#FFC01E] tabular-nums">{revisionCount}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Revision Due</div>
              </div>
            </div>
          }
        />

        {/* Dense Filters Bar */}
        <div className="p-4 rounded-lg border border-white/[0.08] bg-[#12151E] flex flex-col gap-3">
          <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
            <div className="w-full md:w-96">
              <Input
                placeholder="Search by title, Verniq ID (e.g. VRQ-000001), domain, or topic..."
                leftIcon={<Search className="w-4 h-4 text-text-secondary" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Domain Selector */}
              <div className="w-36">
                <Select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Domains' },
                    ...availableDomains.map((dom) => ({ value: dom, label: dom })),
                  ]}
                />
              </div>

              {/* Difficulty Selector */}
              <div className="w-36">
                <Select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Difficulties' },
                    { value: 'easy', label: 'Easy' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'hard', label: 'Hard' },
                  ]}
                />
              </div>

              {/* Tag / Topic Selector */}
              <div className="w-44">
                <Select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Topics' },
                    ...availableTags.map((tag) => ({ value: tag, label: tag })),
                  ]}
                />
              </div>

              {/* Workflow Status Selector */}
              <div className="w-36">
                <Select
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Catalog' },
                    { value: 'published', label: 'Published Only' },
                    { value: 'draft', label: 'Draft / In Review' },
                  ]}
                />
              </div>

              {/* Progress Status Selector */}
              <div className="w-32">
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'solved', label: 'Solved' },
                    { value: 'attempted', label: 'Attempted' },
                    { value: 'todo', label: 'Todo' },
                  ]}
                />
              </div>

              {/* Revision Toggle */}
              <Button
                size="sm"
                variant={revisionOnly ? 'primary' : 'secondary'}
                onClick={() => setRevisionOnly(!revisionOnly)}
                leftIcon={<Star className="w-3.5 h-3.5 text-[#FFC01E]" />}
                className="text-xs font-mono"
              >
                Revision ({revisionCount})
              </Button>

              {/* Refetch */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetch()}
                title="Refresh from Supabase"
                className="h-8 px-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : 'text-text-secondary'}`} />
              </Button>
            </div>
          </div>

          {/* Active Filter Metrics & Clear */}
          <div className="flex items-center justify-between text-xs text-text-secondary font-mono pt-1 border-t border-white/[0.04]">
            <div className="flex items-center gap-2">
              <span>Matching: <strong className="text-white">{filteredProblems.length}</strong> problems</span>
              {(search || selectedDifficulty !== 'all' || selectedDomain !== 'all' || selectedTag !== 'all' || selectedWorkflow !== 'all' || revisionOnly) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedDifficulty('all');
                    setSelectedDomain('all');
                    setSelectedTag('all');
                    setSelectedWorkflow('all');
                    setRevisionOnly(false);
                  }}
                  className="text-primary hover:underline ml-2"
                >
                  Reset filters
                </button>
              )}
            </div>
            <div>
              Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
            </div>
          </div>
        </div>

        {/* Dense Table View - LeetCode Style */}
        <div className="border border-border rounded-lg bg-surface overflow-hidden shadow-elevation-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-surface-elevated border-b border-border text-text-secondary h-11">
                  <th className="py-2.5 px-3 w-28">
                    <button
                      onClick={() => {
                        if (sortField === 'id') setSortAsc(!sortAsc);
                        else {
                          setSortField('id');
                          setSortAsc(true);
                        }
                      }}
                      className="flex items-center gap-1.5 hover:text-text-primary uppercase tracking-wider font-semibold"
                    >
                      <span>ID</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 w-28 text-center">Status</th>
                  <th className="py-2.5 px-4">
                    <button
                      onClick={() => {
                        if (sortField === 'title') setSortAsc(!sortAsc);
                        else {
                          setSortField('title');
                          setSortAsc(true);
                        }
                      }}
                      className="flex items-center gap-1.5 hover:text-text-primary uppercase tracking-wider font-semibold"
                    >
                      <span>Title & Domain</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 w-32">
                    <button
                      onClick={() => {
                        if (sortField === 'acceptance') setSortAsc(!sortAsc);
                        else {
                          setSortField('acceptance');
                          setSortAsc(false);
                        }
                      }}
                      className="flex items-center gap-1.5 hover:text-text-primary uppercase tracking-wider font-semibold"
                    >
                      <span>Acceptance</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 w-28">
                    <button
                      onClick={() => {
                        if (sortField === 'difficulty') setSortAsc(!sortAsc);
                        else {
                          setSortField('difficulty');
                          setSortAsc(true);
                        }
                      }}
                      className="flex items-center gap-1.5 hover:text-text-primary uppercase tracking-wider font-semibold"
                    >
                      <span>Difficulty</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4 hidden md:table-cell">Topics</th>
                  <th className="py-2.5 px-3 w-20 text-center">Revision</th>
                  <th className="py-2.5 px-4 w-24 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedProblems.length > 0 ? (
                  paginatedProblems.map((prob) => {
                    const status = progressMap[prob.id] || (prob.verniq_id ? progressMap[prob.verniq_id] : undefined) || 'todo';
                    const isMarked = Boolean(revisionMap[prob.id]);
                    const isDraft = !prob.is_published || prob.workflow_status === 'draft';

                    return (
                      <tr
                        key={prob.id}
                        className="h-11 hover:bg-white/[0.02] bg-[#12151E] transition-colors group"
                      >
                        {/* Verniq ID */}
                        <td className="py-2 px-3 text-text-secondary font-mono text-[11px] whitespace-nowrap">
                          <span className="bg-white/[0.04] text-text-secondary px-1.5 py-0.5 rounded border border-white/[0.06]">
                            {prob.verniq_id || 'VRQ-INDEX'}
                          </span>
                        </td>

                        {/* Status Indicator */}
                        <td className="py-2 px-3 text-center">
                          {status === 'solved' && (
                            <span
                              role="status"
                              aria-label="Solved"
                              title="Solved"
                              className="inline-flex items-center gap-1.5 text-[#00B8A3] text-xs font-mono font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>Solved</span>
                            </span>
                          )}
                          {status === 'attempted' && (
                            <span
                              role="status"
                              aria-label="Attempted"
                              title="Attempted"
                              className="inline-flex items-center gap-1.5 text-[#FFC01E] text-xs font-mono font-medium"
                            >
                              <span className="w-2 h-2 rounded-full bg-[#FFC01E] shrink-0" aria-hidden="true" />
                              <span>Attempted</span>
                            </span>
                          )}
                          {status === 'todo' && (
                            <span
                              role="status"
                              aria-label="Unattempted"
                              title="Unattempted"
                              className="text-text-muted text-xs font-mono select-none"
                            >
                              —
                            </span>
                          )}
                        </td>

                        {/* Title & Domain & Badges */}
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/problems/${prob.slug}`}
                              className="font-sans font-medium text-text-primary hover:text-blue-400 transition-colors text-sm hover:underline truncate max-w-sm"
                            >
                              {prob.title}
                            </Link>

                            {/* Domain Pill */}
                            {prob.domain && prob.domain !== 'DSA' && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40">
                                {prob.domain}
                              </span>
                            )}

                            {/* Draft Catalog Badge */}
                            {isDraft && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                                DRAFT
                              </span>
                            )}

                            <Link
                              to={`/problems/${prob.slug}`}
                              title="View catalog record & editorial"
                              className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-blue-400 transition-opacity"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>

                        {/* Acceptance Rate (JetBrains Mono tabular-nums) */}
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-surface-subtle h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-primary h-full"
                                style={{ width: `${Math.min(100, Math.max(0, prob.acceptance_rate))}%` }}
                              />
                            </div>
                            <span className="font-mono tabular-nums text-text-secondary">{prob.acceptance_rate}%</span>
                          </div>
                        </td>

                        {/* Difficulty Pill */}
                        <td className="py-2 px-4">
                          <DifficultyBadge difficulty={prob.difficulty} />
                        </td>

                        {/* Topic Tags */}
                        <td className="py-2 px-4 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1.5">
                            {(prob.tags || []).slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="bg-[#1E2330] text-[#8F96A8] text-xs px-2 py-0.5 rounded font-mono border border-white/[0.04]"
                              >
                                {tag}
                              </span>
                            ))}
                            {(prob.tags || []).length > 3 && (
                              <span className="text-[10px] text-text-secondary font-mono self-center">
                                +{(prob.tags || []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Revision Star Action */}
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleRevision(prob.id);
                            }}
                            className="p-1 rounded hover:bg-surface-elevated transition-colors"
                            title={isMarked ? 'In Revision Queue (Click to remove)' : 'Mark for Spaced Repetition Revision'}
                          >
                            <Star
                              className={`w-4 h-4 transition-colors ${
                                isMarked
                                  ? 'fill-[#FFC01E] text-[#FFC01E]'
                                  : 'text-text-secondary hover:text-[#FFC01E]'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Action Link */}
                        <td className="py-2 px-4 text-right">
                          <Link to={`/problems/${prob.slug}`}>
                            <Button
                              size="sm"
                              variant={isDraft ? 'ghost' : 'secondary'}
                              className="h-7 px-2.5 text-xs font-mono"
                              leftIcon={isDraft ? <BookOpen className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
                            >
                              {isDraft ? 'Review' : 'Solve'}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-secondary font-mono">
                      {loading ? 'Loading problems from Supabase...' : 'No problems match your current search and filter parameters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border bg-surface-elevated text-xs font-mono text-text-secondary gap-3">
              <div className="text-text-secondary">
                Showing{' '}
                <strong className="text-white">
                  {(currentPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-white">
                  {Math.min(currentPage * pageSize, filteredProblems.length)}
                </strong>{' '}
                of <strong className="text-white">{filteredProblems.length}</strong> catalog records
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-7 px-2"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                <div className="px-3 py-1 bg-surface rounded border border-border text-white text-xs font-mono">
                  {currentPage} / {totalPages}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 px-2"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-7 px-2"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

