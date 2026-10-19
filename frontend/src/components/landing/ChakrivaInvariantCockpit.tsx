import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  CheckCircle2,
  Cpu,
  Terminal,
  Network,
  Sparkles,
  Layers,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useLiquidGlass } from '@/hooks/useLiquidGlass';

type InvariantParadigmId = 'two_pointers' | 'binary_search' | 'dp';

interface InvariantParadigm {
  id: InvariantParadigmId;
  label: string;
  category: string;
  invariantTitle: string;
  invariantFormula: string;
  reductionInsight: string;
  codeSnippet: string[];
  complexity: string;
  cgroupMemory: string;
  executionLatency: string;
  confidence: number;
}

const PARADIGMS: InvariantParadigm[] = [
  {
    id: 'two_pointers',
    label: 'Boundary Contraction',
    category: 'Monotonic Invariant',
    invariantTitle: 'Sorted Monotonic Pair Bound',
    invariantFormula: 'nums[L] + nums[R] > target ⟹ R eliminates all lower pairs',
    reductionInsight: 'Eliminates 1 candidate per step — O(N²) search space collapses to O(N)',
    codeSnippet: [
      'def two_sum_sorted(nums: list[int], target: int) -> tuple[int, int]:',
      '    L, R = 0, len(nums) - 1',
      '    while L < R:  # Invariant: solution must lie in [L, R]',
      '        curr = nums[L] + nums[R]',
      '        if curr == target: return (L, R) # ✦ Optimal match',
      '        elif curr > target: R -= 1       # Invariant: R too large',
      '        else: L += 1                     # Invariant: L too small',
      '    return (-1, -1)',
    ],
    complexity: 'O(N) Time • O(1) Space',
    cgroupMemory: '14.2 MB',
    executionLatency: '1.2 ms',
    confidence: 99.2,
  },
  {
    id: 'binary_search',
    label: 'Logarithmic Halving',
    category: 'Predicate Invariant',
    invariantTitle: 'Monotonic Predicate Partition',
    invariantFormula: 'P(mid) == True ⟹ ∀ x ≥ mid, P(x) is Invariant',
    reductionInsight: 'Halves the remaining search manifold each iteration — Logarithmic converge',
    codeSnippet: [
      'def find_boundary(nums: list[int], target: int) -> int:',
      '    low, high = 0, len(nums) - 1',
      '    while low <= high:  # Invariant: boundary in [low, high]',
      '        mid = low + (high - low) // 2',
      '        if predicate(nums[mid]):',
      '            high = mid - 1  # ✦ Invariant: discard right partition',
      '        else: low = mid + 1 # Invariant: discard left partition',
      '    return low',
    ],
    complexity: 'O(log N) Time • O(1) Space',
    cgroupMemory: '12.8 MB',
    executionLatency: '0.8 ms',
    confidence: 98.7,
  },
  {
    id: 'dp',
    label: 'DAG Substructure',
    category: 'Inductive Invariant',
    invariantTitle: 'Optimal Overlapping Substructure',
    invariantFormula: 'OPT(i) = min(OPT(i - c) + 1) ∀ c ∈ Coins',
    reductionInsight: 'Inductive memoization converts exponential recursion to acyclic DAG topo-order',
    codeSnippet: [
      'def coin_change(coins: list[int], amount: int) -> int:',
      '    dp = [0] + [float("inf")] * amount',
      '    for a in range(1, amount + 1):  # Topological state order',
      '        for c in coins:',
      '            if a >= c: dp[a] = min(dp[a], dp[a - c] + 1)',
      '    # ✦ Verified invariant: dp[a] contains minimal sub-problem',
      '    return dp[amount] if dp[amount] != float("inf") else -1',
    ],
    complexity: 'O(N · A) Time • O(A) Space',
    cgroupMemory: '18.4 MB',
    executionLatency: '3.4 ms',
    confidence: 96.5,
  },
];

export const ChakrivaInvariantCockpit: React.FC = () => {
  const [activeParadigmId, setActiveParadigmId] = useState<InvariantParadigmId>('two_pointers');
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const activeParadigm = PARADIGMS.find((p) => p.id === activeParadigmId) || PARADIGMS[0];
  const cockpitRef = useRef<HTMLDivElement>(null);

  // Liquid glass refraction on floating cockpit HUD lenses
  useLiquidGlass({
    target: '#cockpit-floating-lens',
    snapshot: 'body',
    engine: 'auto',
    resolution: 2.0,
    refraction: 0.015,
    bevelDepth: 0.07,
    bevelWidth: 0.14,
    frost: 1.2,
    shadow: true,
    specular: true,
    tint: 'rgba(10, 14, 24, 0.55)',
  });

  // Physical 3D perspective mouse tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cockpitRef.current) return;
    const rect = cockpitRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -3.5;
    const rotateY = ((x - centerX) / centerX) * 3.5;
    setTilt({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const triggerSandboxRun = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setHasExecuted(false);
    setTimeout(() => {
      setIsExecuting(false);
      setHasExecuted(true);
    }, 650);
  };

  // Keyboard shortcut ⌘↵ or Ctrl+Enter to run in sandbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        triggerSandboxRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExecuting]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 relative z-20 my-6 sm:my-8">
      {/* 3D Perspective Chassis Wrapper */}
      <div
        ref={cockpitRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          perspective: 1200,
        }}
        className="relative group transition-transform duration-200 ease-out"
      >
        {/* Dynamic Cursor Spotlight Mesh */}
        <div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
          style={{
            background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.12), transparent 75%)`,
          }}
        />

        {/* Physical Cockpit Chassis */}
        <div
          style={{
            transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
            transformStyle: 'preserve-3d',
          }}
          className="rounded-2xl sm:rounded-3xl bg-[#090C15]/95 border border-white/[0.08] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.95),inset_0_1px_0_0_rgba(255,255,255,0.12)] overflow-hidden transition-all duration-300 backdrop-blur-2xl"
        >
          {/* Cockpit Window Titlebar / Telemetry Strip */}
          <div className="px-5 py-3 border-b border-white/[0.06] bg-[#070911]/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left: Hardware Status Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_#10B981] animate-pulse" />
                <span className="font-mono text-[11px] font-semibold text-neutral-300 tracking-wider">
                  SANDBOX CGROUP v2
                </span>
              </div>
              <span className="text-white/20 hidden sm:inline">|</span>
              <span className="hidden sm:inline font-mono text-[11px] text-neutral-500">
                HOST: 256MB MEMORY ISOLATED
              </span>
            </div>

            {/* Paradigm Mode Selector Tabs */}
            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
              {PARADIGMS.map((p) => {
                const isActive = p.id === activeParadigmId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActiveParadigmId(p.id);
                      setHasExecuted(false);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-mono transition-all ${
                      isActive
                        ? 'bg-[#6366F1] text-white font-semibold shadow-[0_0_16px_rgba(99,102,241,0.5)]'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Right: Quick Benchmark Latency Indicator */}
            <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-neutral-400">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>ISOLATION LATENCY:</span>
              <span className="text-emerald-400 font-semibold">{activeParadigm.executionLatency}</span>
            </div>
          </div>

          {/* Cockpit Split Body: Radar + Probe */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
            {/* LEFT COLUMN: Invariant Radar & Topological Orbit (5 cols) */}
            <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-b from-[#090C15] to-[#0B0F1B]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-400" />
                    <span className="text-[11px] font-mono tracking-widest uppercase text-neutral-400 font-semibold">
                      INVARIANT TOPOLOGY
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                    DAG LAYER 02
                  </span>
                </div>

                {/* Algorithmic Invariant Radar Card */}
                <div className="rounded-xl border border-white/[0.06] bg-[#070911]/90 p-4 mb-4 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        {activeParadigm.category}
                      </span>
                      <h4 className="text-base font-semibold text-neutral-100 mt-0.5 tracking-tight">
                        {activeParadigm.invariantTitle}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {activeParadigm.confidence}%
                      </span>
                      <span className="block text-[9px] font-mono text-neutral-500 uppercase">
                        CONFIDENCE
                      </span>
                    </div>
                  </div>

                  {/* Mathematical Invariant Formula Box */}
                  <div className="mt-3.5 px-3 py-2 rounded-lg bg-black/50 border border-white/[0.08] font-mono text-[12px] text-amber-300/95 leading-relaxed tracking-tight">
                    {activeParadigm.invariantFormula}
                  </div>

                  {/* Reduction Proof Statement */}
                  <div className="mt-3 flex items-start gap-2 text-xs text-neutral-400 leading-relaxed">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{activeParadigm.reductionInsight}</span>
                  </div>
                </div>

                {/* Subordinate Pattern Nodes (Connected Synapses) */}
                <div className="space-y-2">
                  <div className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
                    CONNECTED COGNITIVE PREREQUISITES
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.015] flex items-center justify-between">
                      <span className="font-mono text-neutral-300 text-[11px]">Sorted Array Monotonicity</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.015] flex items-center justify-between">
                      <span className="font-mono text-neutral-300 text-[11px]">Boundary Convergence</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Telemetry Mini-Stat Strip */}
              <div className="pt-4 mt-6 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>COMPLEXITY:</span>
                  <span className="text-neutral-200">{activeParadigm.complexity}</span>
                </span>
                <span className="text-neutral-500">CGROUP: {activeParadigm.cgroupMemory}</span>
              </div>
            </div>

            {/* RIGHT COLUMN: Monospaced Code Engine & Micro-Judge (7 cols) */}
            <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between bg-[#060810]">
              {/* Header Bar: File Name & Run CTA */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="font-mono text-xs text-neutral-300 font-medium">
                    solution.py
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-neutral-400">
                    Python 3.12 (Isolated)
                  </span>
                </div>

                {/* Primary Interactive Sandbox Trigger */}
                <button
                  type="button"
                  onClick={triggerSandboxRun}
                  disabled={isExecuting}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm ${
                    isExecuting
                      ? 'bg-indigo-600/50 text-indigo-200 cursor-wait'
                      : hasExecuted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-[#F8FAFC] text-[#07090E] hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isExecuting ? (
                    <>
                      <RotateCcw className="w-3 h-3 animate-spin" />
                      <span>Executing in Docker...</span>
                    </>
                  ) : hasExecuted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Re-Run Sandbox (⌘↵)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run in Sandbox (⌘↵)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Snippet Editor Gutter */}
              <div className="font-mono text-[12px] sm:text-[13px] leading-relaxed select-text py-2 overflow-x-auto">
                {activeParadigm.codeSnippet.map((line, idx) => {
                  const isComment = line.trim().startsWith('#');
                  const isInvariantHighlight = line.includes('✦');
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 px-2 py-0.5 rounded transition-colors ${
                        isInvariantHighlight
                          ? 'bg-indigo-500/15 border-l-2 border-indigo-400 text-indigo-200 font-medium'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <span className="w-5 text-right text-neutral-600 text-[11px] select-none shrink-0 font-mono">
                        {idx + 1}
                      </span>
                      <span
                        className={`${
                          isInvariantHighlight
                            ? 'text-indigo-200'
                            : isComment
                            ? 'text-neutral-500 italic'
                            : 'text-neutral-300'
                        }`}
                      >
                        {line}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Micro-Judge Real-Time Execution Console */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] bg-[#040509]/80 rounded-xl p-3 border border-white/[0.04]">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">TEST RUNNER:</span>
                    <span className="text-neutral-300 font-medium">Suite 01 (100% Invariant Pass)</span>
                  </div>
                  <AnimatePresence mode="wait">
                    {isExecuting ? (
                      <motion.span
                        key="executing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-amber-400 flex items-center gap-1 font-semibold"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        AUDITING INVARIANTS...
                      </motion.span>
                    ) : hasExecuted ? (
                      <motion.span
                        key="passed"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-emerald-400 flex items-center gap-1 font-semibold"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        VERIFIED ({activeParadigm.executionLatency})
                      </motion.span>
                    ) : (
                      <span className="text-neutral-500">PRESS ⌘↵ TO EVALUATE</span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Subordinate Execution Benchmarks */}
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04] text-center">
                    <span className="text-neutral-500 block">MEMORY LEASE</span>
                    <span className="text-neutral-200 font-medium">{activeParadigm.cgroupMemory}</span>
                  </div>
                  <div className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04] text-center">
                    <span className="text-neutral-500 block">LATENCY BENCH</span>
                    <span className="text-emerald-400 font-medium">{activeParadigm.executionLatency}</span>
                  </div>
                  <div className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04] text-center">
                    <span className="text-neutral-500 block">SECURITY CGROUP</span>
                    <span className="text-neutral-200 font-medium">NO ESCAPES</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Liquid-Glass Refractive HUD Lens (Crafted with liquidGL) */}
        <div
          id="cockpit-floating-lens"
          className="hidden sm:flex absolute -bottom-5 right-8 rounded-full bg-[#080B15]/85 border border-white/[0.12] shadow-[0_16px_36px_rgba(0,0,0,0.8)] px-4 py-1.5 items-center gap-2 text-xs font-mono z-30 transition-transform group-hover:-translate-y-1"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-neutral-300">Adaptive Rebalancer:</span>
          <span className="text-emerald-400 font-semibold">Non-Punitive DAG Sync Active</span>
        </div>
      </div>
    </div>
  );
};

export default ChakrivaInvariantCockpit;
