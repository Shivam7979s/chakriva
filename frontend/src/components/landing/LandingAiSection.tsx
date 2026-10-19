import React, { useState } from 'react';
import { Brain, Sparkles, Check, ShieldAlert, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface HintTier {
  tier: number;
  name: string;
  badge: string;
  color: string;
  sampleQuestion: string;
  sampleAnswer: string;
  codeAssertion: {
    line: number;
    code: string;
    annotation: string;
    status: 'warn' | 'pass' | 'invariant';
  };
  rationale: string;
}

const HINT_TIERS: HintTier[] = [
  {
    tier: 1,
    name: 'Conceptual Invariant',
    badge: 'Tier 1 // Invariant Discovery',
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    sampleQuestion: 'How should I define the search space for this rotated array problem?',
    sampleAnswer:
      'Notice that even when rotated, at least one half of the array [left...mid] or [mid...right] remains strictly monotonically sorted. Which half can you definitively check in O(1)?',
    codeAssertion: {
      line: 8,
      code: 'if (nums[left] <= nums[mid]) // Monotonic left half',
      annotation: 'Invariant: Left partition sorted iff nums[left] <= nums[mid]',
      status: 'invariant',
    },
    rationale: 'Guides mental model formation without revealing comparison logic.',
  },
  {
    tier: 2,
    name: 'Boundary Invariant',
    badge: 'Tier 2 // Edge Protection',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    sampleQuestion: 'Why is my solution failing when nums has duplicates?',
    sampleAnswer:
      'When nums[left] == nums[mid] == nums[right], can you determine whether the pivot is in the left or right half? What safe O(1) pointer adjustment preserves the invariant?',
    codeAssertion: {
      line: 14,
      code: 'left++; right--; // Duplicate resolution fallback',
      annotation: 'Degenerate Boundary: Shrinks search space without losing pivot',
      status: 'warn',
    },
    rationale: 'Directs attention to tricky corner cases and degenerate inputs.',
  },
  {
    tier: 3,
    name: 'Complexity & State Bounds',
    badge: 'Tier 3 // Asymptotic Target',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    sampleQuestion: 'Is it possible to solve this in O(1) auxiliary space?',
    sampleAnswer:
      'Yes. Instead of building a secondary hash map, consider encoding visited state using sign bit manipulation or in-place index negation.',
    codeAssertion: {
      line: 22,
      code: 'nums[abs(val) - 1] *= -1; // In-place bit negation',
      annotation: 'O(1) Memory Guarantee: Uses array index space as hash set',
      status: 'pass',
    },
    rationale: 'Pushes candidates toward optimal production-grade space/time tradeoffs.',
  },
  {
    tier: 4,
    name: 'Formal Invariant Proof',
    badge: 'Tier 4 // Mathematical Closure',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    sampleQuestion: 'Can you verify my loop termination condition?',
    sampleAnswer:
      'Loop Invariant: The target value, if present, is strictly contained within [left, right]. Because mid = left + (right - left) // 2 and pointers strictly contract, the search space strictly decreases by at least 1 each iteration, guaranteeing termination.',
    codeAssertion: {
      line: 30,
      code: 'while (left <= right) // Strict monotonic contraction',
      annotation: 'Termination Proof: |right - left| decreases strictly monotonically',
      status: 'invariant',
    },
    rationale: 'Teaches formal correctness proofs valued by staff-level interviewers.',
  },
];

export const LandingAiSection: React.FC = () => {
  const [activeTierIdx, setActiveTierIdx] = useState(0);
  const activeTier = HINT_TIERS[activeTierIdx];

  return (
    <section className="py-20 md:py-28 border-b border-white/[0.06] bg-[#07090D] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-sky-500/5 rounded-full blur-[140px] pointer-events-none" />

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
              CHAKRIVA AI // SOCRATIC MENTORSHIP
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-sans">
              No Vibe-Coding. Real Invariant Reasoning.
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-sans">
              Copy-pasting AI code ruins interview performance. CHAKRIVA AI operates as a strict Socratic technical interviewer: challenging your loop invariants, validating edge conditions, and guiding you through a 4-tier ladder without revealing solutions.
            </p>
          </div>

          <Link to="/chakriva-ai" className="self-start lg:self-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111420] border border-white/[0.1] hover:border-sky-500/40 text-neutral-200 hover:text-white text-xs font-mono font-medium transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            >
              <Brain className="w-3.5 h-3.5 text-sky-400" />
              <span>Test Socratic AI Mentor</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-neutral-400" />
            </motion.button>
          </Link>
        </motion.div>

        {/* Studio Workspace: 4-Tier Ladder (Left) + Socratic Code Review Cockpit (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: 4-Tier Interactive Ladder (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5 text-left">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
              <span className="uppercase tracking-wider">Progressive Hint Ladder</span>
              <span className="text-sky-400 font-semibold">Tier {activeTier.tier} of 4</span>
            </div>

            {HINT_TIERS.map((tier, idx) => {
              const isSelected = idx === activeTierIdx;
              return (
                <motion.div
                  key={tier.tier}
                  onClick={() => setActiveTierIdx(idx)}
                  whileHover={{ x: 3 }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#121624] border-sky-500/60 shadow-[0_0_24px_rgba(56,189,248,0.2)] ring-1 ring-sky-500/30'
                      : 'bg-[#0B0E16] border-white/[0.07] hover:border-white/20 hover:bg-[#0E121D]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-sky-500 text-white border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                          : 'bg-white/[0.04] border-white/[0.08] text-neutral-400'
                      }`}
                    >
                      T{tier.tier}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white font-sans">{tier.name}</h4>
                        {isSelected && (
                          <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.2 rounded border border-sky-500/20">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 font-sans line-clamp-1">{tier.rationale}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Anti-Spoil Guardrails Box */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-300 font-sans leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>Anti-Spoil Guardrail:</strong> CHAKRIVA AI never outputs full solution code before you submit a valid attempt with measurable invariant boundaries.
              </span>
            </div>
          </div>

          {/* Right: Interactive Socratic Reasoning Console (7 cols - Framer & Raycast style) */}
          <div className="lg:col-span-7 bg-[#0B0E16] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl text-left">
            {/* Console Header Bar */}
            <div className="px-5 py-3.5 border-b border-white/[0.07] bg-[#0E121D] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-sky-400 font-semibold">
                <Brain className="w-4 h-4" />
                <span>{activeTier.badge}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px]">SOCRATIC KERNEL ACTIVE</span>
              </div>
            </div>

            {/* Invariant Code Assertion Specimen */}
            <div className="p-5 border-b border-white/[0.07] bg-[#080A10] font-mono text-xs">
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Candidate Code Snippet Inspection</span>
                <span className="text-neutral-400">Line {activeTier.codeAssertion.line}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0E121B] border border-white/[0.06] text-neutral-200">
                <code>{activeTier.codeAssertion.code}</code>
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-sky-300 bg-sky-500/10 p-2 rounded border border-sky-500/20">
                <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{activeTier.codeAssertion.annotation}</span>
              </div>
            </div>

            {/* Interactive Socratic Dialogue Flow */}
            <div className="p-6 space-y-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTier.tier}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-4"
                >
                  {/* Candidate Question */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neutral-400" />
                      <span>CANDIDATE INQUIRY</span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#111420] border border-white/[0.07] text-sm text-neutral-200 font-sans">
                      &ldquo;{activeTier.sampleQuestion}&rdquo;
                    </div>
                  </div>

                  {/* Socratic AI Prompt */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-sky-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>CHAKRIVA SOCRATIC GUIDANCE</span>
                    </div>
                    <div className="p-4 rounded-xl bg-sky-950/25 border border-sky-500/30 text-sm text-sky-100 font-sans leading-relaxed shadow-[0_0_20px_rgba(56,189,248,0.08)]">
                      {activeTier.sampleAnswer}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Status and Anti-Hallucination verification */}
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-neutral-400 font-mono">
                <span>Pacing: {activeTier.rationale}</span>
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Zero Hallucinations</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingAiSection;
