import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data/Card';
import { Badge } from '@/components/ui/data/Badge';
import { Button } from '@/components/ui/actions/Button';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { FALLBACK_PROBLEMS } from '@/lib/curriculumData';
import {
  ArrowRight,
  Code2,
} from 'lucide-react';

interface SheetMeta {
  id: string;
  category: 'chakriva' | 'company' | 'topic' | 'goal' | 'beginner';
  title: string;
  subtitle: string;
  description: string;
  problemCount: number;
  difficultyFocus: string;
  badge: string;
  highlightedSlugs: string[];
}

const SHEETS_CATALOG: SheetMeta[] = [
  {
    id: 'chakriva-core-150',
    category: 'chakriva',
    title: 'Chakriva Core 150 Invariants',
    subtitle: 'The Master Algorithmic Pathway',
    description: '150 hand-curated problem patterns spanning arrays, invariant bounds, tree recursion, dynamic programming, and graphs.',
    problemCount: 150,
    difficultyFocus: '30% Easy • 55% Medium • 15% Hard',
    badge: 'Flagship Track',
    highlightedSlugs: ['two-sum', 'best-time-to-buy-and-sell-stock', '3sum', 'search-in-rotated-sorted-array'],
  },
  {
    id: 'sde-foundations-75',
    category: 'chakriva',
    title: 'SDE High-Yield 75',
    subtitle: 'High-Frequency Interview Classics',
    description: 'Essential 75 patterns universally asked across top product engineering interviews and online assessments.',
    problemCount: 75,
    difficultyFocus: '40% Easy • 50% Medium • 10% Hard',
    badge: 'High Yield',
    highlightedSlugs: ['two-sum', 'valid-anagram', 'container-with-most-water', 'trapping-rain-water'],
  },
  {
    id: 'company-google',
    category: 'company',
    title: 'Google SDE Readiness',
    subtitle: 'Deep Algorithmic Rigor',
    description: 'Focus on boundary conditions, invariants, monotonic structures, graph traversals, and dynamic programming.',
    problemCount: 65,
    difficultyFocus: '15% Easy • 60% Medium • 25% Hard',
    badge: 'Tier-1 Target',
    highlightedSlugs: ['search-in-rotated-sorted-array', 'trapping-rain-water', '3sum'],
  },
  {
    id: 'company-amazon',
    category: 'company',
    title: 'Amazon Online Assessment & Rounds',
    subtitle: 'High-Volume Systems & Patterns',
    description: 'Top recurring problems from Amazon campus and off-campus assessments: BFS/DFS, Trees, and Sliding Window.',
    problemCount: 50,
    difficultyFocus: '35% Easy • 55% Medium • 10% Hard',
    badge: 'Assessment Prep',
    highlightedSlugs: ['best-time-to-buy-and-sell-stock', 'two-sum', 'container-with-most-water'],
  },
  {
    id: 'topic-dp',
    category: 'topic',
    title: 'Dynamic Programming Invariants',
    subtitle: 'Optimal Substructure & Overlapping Subproblems',
    description: 'From 1D linear recurrence to 2D grid DP, knapsack variations, and state-compression bitmasks.',
    problemCount: 45,
    difficultyFocus: '10% Easy • 65% Medium • 25% Hard',
    badge: 'Pattern Mastery',
    highlightedSlugs: ['best-time-to-buy-and-sell-stock', 'trapping-rain-water'],
  },
  {
    id: 'topic-binary-search',
    category: 'topic',
    title: 'Monotonic Search Spaces & Binary Search',
    subtitle: 'Predicate Bisection Invariants',
    description: 'Master binary search on values, rotated arrays, and finding lower/upper bounds without off-by-one errors.',
    problemCount: 30,
    difficultyFocus: '25% Easy • 60% Medium • 15% Hard',
    badge: 'Mathematical Invariant',
    highlightedSlugs: ['search-in-rotated-sorted-array'],
  },
  {
    id: 'goal-30-day-sprint',
    category: 'goal',
    title: '30-Day Intensive Sprint',
    subtitle: 'Time-Boxed Interview Ramp-Up',
    description: 'Designed for candidates with upcoming interview loops within 4 weeks. Covers core algorithmic fundamentals daily.',
    problemCount: 60,
    difficultyFocus: '40% Easy • 50% Medium • 10% Hard',
    badge: 'Accelerated',
    highlightedSlugs: ['two-sum', '3sum', 'container-with-most-water'],
  },
  {
    id: 'beginner-foundations',
    category: 'beginner',
    title: 'Algorithmic Zero-to-One',
    subtitle: 'For Beginners & Core Engineering Transition',
    description: 'Step-by-step introduction to computational complexity, dual pointers, basic hash maps, and recursion.',
    problemCount: 40,
    difficultyFocus: '75% Easy • 25% Medium • 0% Hard',
    badge: 'Foundations',
    highlightedSlugs: ['two-sum', 'valid-anagram', 'best-time-to-buy-and-sell-stock'],
  },
];

export const SheetsView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'chakriva' | 'company' | 'topic' | 'goal' | 'beginner'
  >('all');

  const filteredSheets =
    selectedCategory === 'all'
      ? SHEETS_CATALOG
      : SHEETS_CATALOG.filter((s) => s.category === selectedCategory);

  const getProblem = (slug: string) =>
    FALLBACK_PROBLEMS.find((p) => p.slug === slug);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Sheets' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Hub Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                Curated Discovery
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {SHEETS_CATALOG.length} Verified Master Sheets
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Curated Preparation Sheets
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
              Targeted collections organized by mathematical invariants, hiring patterns, and time horizons. Pick a sheet to begin focused preparation.
            </p>
          </div>

          <Link to="/problems">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Code2 className="w-4 h-4 text-neutral-400" />}
              className="text-xs"
            >
              Browse All Problems
            </Button>
          </Link>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar border-b border-white/[0.06]">
          {[
            { id: 'all', label: 'All Sheets', count: SHEETS_CATALOG.length },
            { id: 'chakriva', label: 'Chakriva Master', count: 2 },
            { id: 'company', label: 'Company Targeted', count: 2 },
            { id: 'topic', label: 'Topic Invariants', count: 2 },
            { id: 'goal', label: 'Goal Sprints', count: 1 },
            { id: 'beginner', label: 'Beginner 0→1', count: 1 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 shrink-0 ${
                selectedCategory === tab.id
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono text-[10px] text-neutral-400">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Sheets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSheets.map((sheet) => (
            <Card
              key={sheet.id}
              className="hover:border-white/[0.18] transition-all bg-[#0F121A] flex flex-col justify-between"
            >
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="primary" className="text-[10px] font-mono">
                    {sheet.badge}
                  </Badge>
                  <span className="text-xs font-mono text-neutral-400">
                    {sheet.problemCount} Problems
                  </span>
                </div>
                <div>
                  <CardTitle className="text-lg text-white font-bold">{sheet.title}</CardTitle>
                  <p className="text-xs font-mono text-blue-400/90 mt-0.5">{sheet.subtitle}</p>
                </div>
                <CardDescription className="text-xs text-neutral-400 leading-relaxed">
                  {sheet.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Difficulty distribution indicator */}
                <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-neutral-300">
                  <span className="text-neutral-400">Difficulty Focus:</span>
                  <span>{sheet.difficultyFocus}</span>
                </div>

                {/* Sample Problems preview */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                    Core Invariant Previews:
                  </span>
                  <div className="space-y-1.5">
                    {sheet.highlightedSlugs.map((slug) => {
                      const prob = getProblem(slug);
                      if (!prob) return null;
                      return (
                        <Link
                          key={slug}
                          to={`/problems/${slug}`}
                          className="flex items-center justify-between px-3 py-1.5 rounded bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-blue-500/30 transition-all text-xs group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-neutral-400 font-mono text-[10px]">
                              {prob.verniq_id || 'PROB'}
                            </span>
                            <span className="text-neutral-200 group-hover:text-white truncate font-medium">
                              {prob.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <DifficultyBadge difficulty={prob.difficulty} />
                            <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2">
                  <Link to="/problems">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs font-medium justify-center"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Start Practicing Sheet
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SheetsView;
