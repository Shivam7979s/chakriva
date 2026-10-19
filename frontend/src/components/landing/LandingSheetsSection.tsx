import React, { useState } from 'react';
import { Layers, ArrowRight, Target, CheckCircle2, Table } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface Sheet {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  problemCount: number;
  estHours: string;
  description: string;
  corePatterns: string[];
  invariants: Array<{
    domain: string;
    invariantSpec: string;
    distribution: { easy: number; med: number; hard: number };
    targetTime: string;
  }>;
}

const FEATURED_SHEETS: Sheet[] = [
  {
    id: 'chakriva-150',
    title: 'Chakriva 150 Core Canonical',
    badge: 'CANONICAL SYLLABUS',
    badgeColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    problemCount: 150,
    estHours: '65 Hours',
    description:
      'The definitive algorithmic syllabus. Structured strictly by mathematical recurrence trees, pointer monotonicities, and state boundary criteria.',
    corePatterns: ['Two Pointers & Sliding Window', 'Monotonic Stacks & Deques', 'Graph Kahn Topo Sort', '2D State Space DP'],
    invariants: [
      { domain: 'Arrays & Two Pointers', invariantSpec: 'Window boundary monotonicity: [L, R] contraction', distribution: { easy: 6, med: 18, hard: 4 }, targetTime: '15m' },
      { domain: 'Monotonic Stacks & Deques', invariantSpec: 'Strictly decreasing order; O(1) sliding extrema', distribution: { easy: 2, med: 12, hard: 6 }, targetTime: '20m' },
      { domain: 'Binary Trees & Traversals', invariantSpec: 'Subtree invariants & ancestor path bounds', distribution: { easy: 8, med: 20, hard: 6 }, targetTime: '20m' },
      { domain: 'Dynamic Programming', invariantSpec: 'Optimal substructure & DAG topological state space', distribution: { easy: 4, med: 24, hard: 12 }, targetTime: '25m' },
    ],
  },
  {
    id: 'blind-75',
    title: 'Blind 75 Invariant Edition',
    badge: 'HIGH-FREQUENCY SPRINT',
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    problemCount: 75,
    estHours: '32 Hours',
    description:
      'The classic 75 interview benchmark rigorously annotated with loop invariant proofs and hard asymptotic memory/time bounds.',
    corePatterns: ['Prefix Sums & In-Place Hashing', 'Binary Search Boundaries', 'Interval Sweeps', 'Graph Cycle Invariants'],
    invariants: [
      { domain: 'Binary Search Criteria', invariantSpec: 'Preserves target ∈ [left, right] until termination', distribution: { easy: 4, med: 10, hard: 2 }, targetTime: '15m' },
      { domain: 'Interval Merging', invariantSpec: 'Sort by start; active interval covers max reach', distribution: { easy: 2, med: 8, hard: 3 }, targetTime: '18m' },
      { domain: 'Tree DFS / BFS', invariantSpec: 'Level-order queue invariant; depth property', distribution: { easy: 5, med: 12, hard: 3 }, targetTime: '20m' },
      { domain: 'State Compression DP', invariantSpec: 'Bitmask representations of visited subsets', distribution: { easy: 1, med: 9, hard: 6 }, targetTime: '30m' },
    ],
  },
  {
    id: 'tier1-faang',
    title: 'Tier-1 FAANG Calibrated',
    badge: 'STAFF BENCHMARK',
    badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    problemCount: 120,
    estHours: '55 Hours',
    description:
      'Calibrated against real Google, Meta, and Uber L5/L6 loops from the past 12 months with emphasis on zero-allocation invariants.',
    corePatterns: ['Distributed System Invariants', 'Segment Trees & Fenwick', 'Shortest Path Variants', 'Trie & State Compression'],
    invariants: [
      { domain: 'Segment Trees & Fenwick', invariantSpec: 'O(log N) point update & range sum invariant', distribution: { easy: 0, med: 8, hard: 10 }, targetTime: '30m' },
      { domain: 'Shortest Path Variations', invariantSpec: 'Dijkstra non-negative edge relaxation invariant', distribution: { easy: 1, med: 14, hard: 9 }, targetTime: '25m' },
      { domain: 'Union-Find & Disjoint Sets', invariantSpec: 'Rank & path compression tree depth ≤ 4', distribution: { easy: 2, med: 11, hard: 5 }, targetTime: '20m' },
      { domain: 'Flow Networks & Matching', invariantSpec: 'Residual network augmentation path conservation', distribution: { easy: 0, med: 6, hard: 8 }, targetTime: '35m' },
    ],
  },
];

export const LandingSheetsSection: React.FC = () => {
  const [selectedSheetId, setSelectedSheetId] = useState<string>('chakriva-150');
  const currentSheet = FEATURED_SHEETS.find((s) => s.id === selectedSheetId) || FEATURED_SHEETS[0];

  return (
    <section className="py-20 md:py-28 border-b border-white/[0.06] bg-[#07090D] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[350px] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
        >
          <div className="space-y-4 max-w-2xl text-left">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3.5 py-1 rounded-full inline-block backdrop-blur-md">
              INVARIANT TAXONOMY & SYLLABUS
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-sans">
              Curated Sheets. Zero Random Noise.
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-sans">
              Solving 1,000 disconnected problems yields diminishing returns. CHAKRIVA curates strict, invariant-annotated problem sheets designed for pattern transferability and interview confidence.
            </p>
          </div>

          <Link to="/sheets" className="self-start lg:self-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111420] border border-white/[0.1] hover:border-sky-500/40 text-neutral-200 hover:text-white text-xs font-mono font-medium transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Browse All Canonical Sheets</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-neutral-400" />
            </motion.button>
          </Link>
        </motion.div>

        {/* Sheet Selector Tabs (Framer / Raycast style) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {FEATURED_SHEETS.map((sheet) => {
            const isSelected = sheet.id === selectedSheetId;
            return (
              <button
                key={sheet.id}
                type="button"
                onClick={() => setSelectedSheetId(sheet.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2.5 shrink-0 border ${
                  isSelected
                    ? 'bg-[#141926] border-sky-500/50 text-white shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                    : 'bg-[#0B0E16] border-white/[0.07] text-neutral-400 hover:text-neutral-200 hover:border-white/15'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? 'bg-sky-400 shadow-[0_0_8px_#38BDF8]' : 'bg-neutral-600'
                  }`}
                />
                <span>{sheet.title}</span>
                <span className="text-[10px] text-neutral-500">({sheet.problemCount})</span>
              </button>
            );
          })}
        </div>

        {/* Studio Matrix Layout: Active Sheet Showcase + Invariant Specimen Table */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSheet.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left"
          >
            {/* Left: Active Sheet Dossier Card (4 cols) */}
            <div className="lg:col-span-4 bg-[#0B0E16] border border-white/[0.08] p-6 sm:p-7 rounded-2xl shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-0.5 rounded border ${currentSheet.badgeColor}`}>
                  {currentSheet.badge}
                </span>
                <span className="font-mono text-xs text-neutral-400">{currentSheet.estHours}</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-sans">{currentSheet.title}</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
                  {currentSheet.description}
                </p>
              </div>

              {/* Core Patterns */}
              <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                  Target Invariant Modules:
                </div>
                <ul className="space-y-2 font-mono text-xs text-neutral-300">
                  {currentSheet.corePatterns.map((pat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{pat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <Link
                  to="/sheets"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-xs font-mono font-medium text-sky-200 transition-colors"
                >
                  <Target className="w-3.5 h-3.5 text-sky-400" />
                  <span>Start Syllabus Verification</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>
            </div>

            {/* Right: Invariant Specimen Table (8 cols - Raycast & Linear style) */}
            <div className="lg:col-span-8 bg-[#0B0E16] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 border-b border-white/[0.07] bg-[#0E121D] flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs text-neutral-300 font-semibold">
                  <Table className="w-4 h-4 text-sky-400" />
                  <span>INVARIANT TAXONOMY SPECIFICATION</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-400 inline-block" />Easy</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-400 inline-block" />Med</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-400 inline-block" />Hard</span>
                </div>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {currentSheet.invariants.map((item, idx) => {
                  const total = item.distribution.easy + item.distribution.med + item.distribution.hard;
                  const easyPct = (item.distribution.easy / total) * 100;
                  const medPct = (item.distribution.med / total) * 100;
                  const hardPct = (item.distribution.hard / total) * 100;

                  return (
                    <div key={idx} className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 sm:max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">{item.domain}</span>
                          <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.2 rounded border border-sky-500/20">
                            {item.targetTime}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                          {item.invariantSpec}
                        </p>
                      </div>

                      {/* Difficulty distribution bar */}
                      <div className="space-y-1.5 sm:w-48 shrink-0">
                        <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                          <span>{item.distribution.easy}E / {item.distribution.med}M / {item.distribution.hard}H</span>
                          <span className="text-neutral-300 font-semibold">{total} Problems</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-800 rounded-full flex overflow-hidden">
                          <div style={{ width: `${easyPct}%` }} className="bg-emerald-400" />
                          <div style={{ width: `${medPct}%` }} className="bg-amber-400" />
                          <div style={{ width: `${hardPct}%` }} className="bg-rose-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-3 border-t border-white/[0.06] bg-[#0E121D]/60 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>Total Annotated Problems: {currentSheet.problemCount}</span>
                <span className="text-emerald-400 font-semibold">100% Invariant Validation Verified</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default LandingSheetsSection;
