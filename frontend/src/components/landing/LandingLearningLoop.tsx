import React, { useState, useEffect } from 'react';
import { ArrowRight, RotateCcw, CheckCircle2, ChevronRight, Sparkles, Layers } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

type StageId = 'practice' | 'understand' | 'improve';
type ConceptNodeId = 'twosum' | 'threesum' | 'slidingwindow';

type PracticePhase = 'drawing' | 'sum' | 'evaluated' | 'settled';
type UnderstandPhase =
  | 'compare_initial'
  | 'eliminate'
  | 'pointer_moving'
  | 'match_connected'
  | 'settled';

interface StageConfig {
  id: StageId;
  tabLabel: string;
  tabSublabel: string;
  headline: string;
  explanation: string;
  takeaway: string;
}

const STAGES: StageConfig[] = [
  {
    id: 'practice',
    tabLabel: '01 • Practice',
    tabSublabel: 'Attempt & Friction',
    headline: 'Brute force checks every pair. Practice exposes where intuition wastes work.',
    explanation:
      'In a sorted 6-element list, there are 15 distinct pairs to evaluate. A brute-force search tests combinations point by point, spending operations on pairs that could not possibly equal the target. Seeing where this redundant exploration happens is the first step toward a better approach.',
    takeaway: 'Without the sorted invariant, every pair must be examined independently.',
  },
  {
    id: 'understand',
    tabLabel: '02 • Understand',
    tabSublabel: 'The Invariant',
    headline: 'Sorted order lets you eliminate an entire element with each comparison.',
    explanation:
      'With the array sorted, comparing the two endpoints provides an immediate bound. Because 1 + 15 = 16 is greater than 13, 15 is too large to pair with any number in the list. Moving the right pointer left to 12 finds 1 + 12 = 13 on the very next comparison.',
    takeaway: 'Each comparison either finds the target or eliminates an entire endpoint from search.',
  },
  {
    id: 'improve',
    tabLabel: '03 • Improve',
    tabSublabel: 'The Next Step',
    headline: 'Once you master two pointers, your next problem builds directly on it.',
    explanation:
      'Chakriva maps your practice onto a concept dependency graph. Having mastered boundary pointer contraction on a sorted array, you advance directly to 3Sum (fixing one element and running two pointers) and Sliding Window problems without starting from scratch.',
    takeaway: 'Mastering the sorted two-pointer invariant prepares you for multi-pointer and window techniques.',
  },
];

const ARRAY_ELEMENTS = [
  { index: 0, val: 1 },
  { index: 1, val: 3 },
  { index: 2, val: 5 },
  { index: 3, val: 8 },
  { index: 4, val: 12 },
  { index: 5, val: 15 },
];

const CONCEPT_PROGRESSION: Record<
  ConceptNodeId,
  {
    title: string;
    stepTag: string;
    complexity: string;
    subtitle: string;
    invariantLink: string;
  }
> = {
  twosum: {
    title: 'Two-Pointer Two Sum',
    stepTag: 'Foundation',
    complexity: 'O(n) Time · O(1) Space',
    subtitle: 'Boundary contraction on sorted array',
    invariantLink:
      'Monotonic sorted endpoints establish mathematical bounds: comparing extremes eliminates an endpoint each step.',
  },
  threesum: {
    title: '3Sum Triplet Bounds',
    stepTag: 'Active Next Target',
    complexity: 'O(n²) Time · Direct Transfer',
    subtitle: 'Fix one element · Run two pointers',
    invariantLink:
      'Fix one element in an outer scan, then apply the identical Two-Pointer routine on the remaining subarray.',
  },
  slidingwindow: {
    title: 'Sliding Window',
    stepTag: 'Future Horizon',
    complexity: 'O(n) Time · Dynamic Bounds',
    subtitle: 'Dynamic interval expansion & contraction',
    invariantLink:
      'Extends boundary pointer contraction from fixed endpoints to dynamic contiguous intervals that expand and contract on running criteria.',
  },
};

export const LandingLearningLoop: React.FC = () => {
  const [activeStageId, setActiveStageId] = useState<StageId>('practice');
  const [selectedConcept, setSelectedConcept] = useState<ConceptNodeId>('threesum');
  const [replayKey, setReplayKey] = useState<number>(0);

  // Dedicated choreographed phases for Practice and Understand
  const [practicePhase, setPracticePhase] = useState<PracticePhase>('drawing');
  const [understandPhase, setUnderstandPhase] = useState<UnderstandPhase>('compare_initial');

  const shouldReduceMotion = useReducedMotion();
  const currentStage = STAGES.find((s) => s.id === activeStageId) || STAGES[0];

  // Node centers for SVG arc drawing in a 760 x 210 coordinate system
  const getNodeCenterX = (idx: number) => 80 + idx * 120;
  const nodeCenterY = 80;

  // 1. PRACTICE Choreography: Path drawing -> Tracer -> Two beats evaluation -> Settle
  useEffect(() => {
    if (activeStageId !== 'practice') return;

    if (shouldReduceMotion) {
      setPracticePhase('settled');
      return;
    }

    setPracticePhase('drawing');

    // Beat 1: Compute sum at 950ms when tracer reaches 15
    const t1 = setTimeout(() => {
      setPracticePhase('sum');
    }, 950);

    // Beat 2: Reveal evaluation "> 13 (Too large)" at 1700ms
    const t2 = setTimeout(() => {
      setPracticePhase('evaluated');
    }, 1700);

    // Settled: Restrained red trace settles at 2400ms
    const t3 = setTimeout(() => {
      setPracticePhase('settled');
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeStageId, replayKey, shouldReduceMotion]);

  // 2. UNDERSTAND Choreography:
  // compare_initial -> eliminate 15 -> physical pointer slide to 12 -> green connection & 1+12=13 -> success pulse
  useEffect(() => {
    if (activeStageId !== 'understand') return;

    if (shouldReduceMotion) {
      setUnderstandPhase('settled');
      return;
    }

    setUnderstandPhase('compare_initial');

    // Step 1 elimination decision at 1800ms: 15 dims & strikethrough appears
    const t1 = setTimeout(() => {
      setUnderstandPhase('eliminate');
    }, 1800);

    // Physical pointer movement begins at 2500ms (slides left from 15 to 12 over 750ms)
    const t2 = setTimeout(() => {
      setUnderstandPhase('pointer_moving');
    }, 2500);

    // Pointer reaches 12 at 3250ms: green connection draws and 1+12=13 revealed
    const t3 = setTimeout(() => {
      setUnderstandPhase('match_connected');
    }, 3250);

    // Single visible success pulse plays at 3900ms and settles into final state
    const t4 = setTimeout(() => {
      setUnderstandPhase('settled');
    }, 3900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [activeStageId, replayKey, shouldReduceMotion]);

  const handleStageSelect = (stageId: StageId) => {
    setActiveStageId(stageId);
  };

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
  };

  // Helper for manual step toggle in Understand
  const handleUnderstandStepJump = (step: 1 | 2) => {
    if (step === 1) {
      setUnderstandPhase('compare_initial');
    } else {
      setUnderstandPhase('pointer_moving');
      setTimeout(() => {
        setUnderstandPhase('match_connected');
      }, 750);
      setTimeout(() => {
        setUnderstandPhase('settled');
      }, 1400);
    }
  };

  return (
    <section
      id="learning-loop"
      className="relative w-full py-20 sm:py-28 lg:py-32 bg-[#07090E] border-t border-white/[0.06] scroll-mt-20 overflow-hidden"
      aria-label="The Learning Loop"
    >
      {/* Ambient Atmospheric Depth Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.03)_0%,rgba(148,163,184,0.01)_45%,transparent_75%)] pointer-events-none blur-[150px]"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        {/* Eyebrow & Header Hierarchy */}
        <div className="flex flex-col items-center text-center max-w-3xl mb-10 sm:mb-12">
          {/* Eyebrow badge matching Google Stitch original */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
            <span className="font-mono text-[11px] text-sky-400 uppercase tracking-[0.2em] font-medium">
              THE LEARNING LOOP
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-[#F8FAFC] leading-[1.15] font-sans">
            Practice is the input.{' '}
            <span className="text-[#CBD5E1]">
              Progress is the output.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#94A3B8] font-normal leading-relaxed max-w-2xl mx-auto font-sans">
            Every problem reveals something. Chakriva helps you understand your patterns, close your gaps, and choose what to work on next.
          </p>

          {/* Unified Stage Switcher Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-full bg-[#080B12] border border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            {STAGES.map((stage) => {
              const isActive = activeStageId === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => handleStageSelect(stage.id)}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs font-sans transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-white/[0.08] text-white border border-white/[0.14] shadow-[0_2px_12px_rgba(255,255,255,0.06)]'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="font-semibold">{stage.tabLabel}</span>
                  <span className="text-[11px] text-[#64748B] hidden md:inline">
                    ({stage.tabSublabel})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ONE Unified Interactive Visualization Scene */}
        <div
          key={`scene-${replayKey}`}
          className="w-full rounded-2xl bg-[#080B12]/90 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-7 lg:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.7)] relative overflow-hidden"
        >
          {/* Top Telemetry & Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#CBD5E1]">
                <span className="font-semibold text-white">Sorted Two Sum</span>
                <span className="text-[#64748B]">•</span>
                <span>Array: [1, 3, 5, 8, 12, 15]</span>
                <span className="text-[#64748B]">•</span>
                <span className="text-sky-400 font-semibold">Target: 13</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleReplay}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-[#94A3B8] hover:text-white border border-white/[0.08] text-xs font-mono flex items-center gap-1.5 transition-all"
                title="Replay Animation"
              >
                <RotateCcw className="w-3 h-3 text-sky-400" />
                <span>Replay</span>
              </button>
            </div>
          </div>

          {/* Shared Stage Visual Canvas */}
          <div className="relative min-h-[300px] sm:min-h-[320px] flex flex-col justify-center items-center py-4">
            <AnimatePresence initial={false}>
              {/* STAGE 1: PRACTICE */}
              {activeStageId === 'practice' && (
                <motion.div
                  key="stage-practice"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                  className="w-full flex flex-col items-center"
                >
                  <p className="text-xs font-mono text-[#94A3B8] mb-6 text-center">
                    Brute Force: Illustrative search space across 15 possible combinations
                  </p>

                  {/* SVG Canvas for Connectors & Array Nodes */}
                  <div className="w-full max-w-3xl relative">
                    <svg
                      viewBox="0 0 760 210"
                      className="w-full h-auto overflow-visible"
                      aria-hidden="true"
                    >
                      {/* Subtle Grid dots */}
                      <defs>
                        <pattern id="grid-practice" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="0.75" fill="#334155" opacity="0.4" />
                        </pattern>
                      </defs>
                      <rect x="0" y="0" width="760" height="210" fill="url(#grid-practice)" opacity="0.3" rx="12" />

                      {/* Dotted ghost arcs showing redundant brute-force pairs */}
                      <path
                        d="M 80 80 Q 200 135 320 80"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        opacity="0.35"
                      />
                      <path
                        d="M 80 80 Q 260 150 440 80"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        opacity="0.35"
                      />
                      <path
                        d="M 80 80 Q 320 165 560 80"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        opacity="0.35"
                      />

                      {/* Comparison Arc from 1 (idx 0) to 15 (idx 5) */}
                      <motion.path
                        d="M 80 80 Q 380 200 680 80"
                        fill="none"
                        stroke={practicePhase === 'settled' ? '#F43F5E' : '#FB7185'}
                        strokeWidth={practicePhase === 'settled' ? 1.75 : 2.5}
                        strokeOpacity={practicePhase === 'settled' ? 0.65 : 1}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.9, ease: 'easeInOut' }}
                      />

                      {/* Visible light tracer moving along the comparison path */}
                      {!shouldReduceMotion && practicePhase === 'drawing' && (
                        <motion.circle
                          r="4.5"
                          fill="#FDA4AF"
                          filter="drop-shadow(0 0 8px #F43F5E)"
                          initial={{ cx: 80, cy: 80, opacity: 1 }}
                          animate={{
                            cx: [80, 230, 380, 530, 680],
                            cy: [80, 125, 140, 125, 80],
                            opacity: [1, 1, 1, 1, 0.6],
                          }}
                          transition={{
                            duration: 0.9,
                            ease: 'easeInOut',
                          }}
                        />
                      )}

                      {/* Array Nodes */}
                      {ARRAY_ELEMENTS.map((elem) => {
                        const cx = getNodeCenterX(elem.index);
                        const isLeft = elem.index === 0;
                        const isRight = elem.index === 5;

                        return (
                          <g key={`p-node-${elem.index}`}>
                            {/* Outer Node Box */}
                            <rect
                              x={cx - 24}
                              y={nodeCenterY - 24}
                              width={48}
                              height={48}
                              rx={10}
                              fill={isLeft || isRight ? '#0F172A' : '#0B0F19'}
                              stroke={isLeft ? '#38BDF8' : isRight ? '#F43F5E' : '#334155'}
                              strokeWidth={isLeft || isRight ? 2 : 1}
                              className="transition-all"
                            />
                            {/* Value Text */}
                            <text
                              x={cx}
                              y={nodeCenterY + 5}
                              textAnchor="middle"
                              fill={isLeft ? '#38BDF8' : isRight ? '#F43F5E' : '#94A3B8'}
                              fontSize="14"
                              fontFamily="monospace"
                              fontWeight="600"
                            >
                              {elem.val}
                            </text>

                            {/* Pointer Pill: left = 0 */}
                            {isLeft && (
                              <g>
                                <rect
                                  x={cx - 28}
                                  y={nodeCenterY - 50}
                                  width={56}
                                  height={20}
                                  rx={6}
                                  fill="#0284C7"
                                  opacity="0.9"
                                />
                                <text
                                  x={cx}
                                  y={nodeCenterY - 36}
                                  textAnchor="middle"
                                  fill="#FFFFFF"
                                  fontSize="10"
                                  fontFamily="monospace"
                                  fontWeight="600"
                                >
                                  left = 0
                                </text>
                              </g>
                            )}

                            {/* Pointer Pill: right = 5 */}
                            {isRight && (
                              <g>
                                <rect
                                  x={cx - 30}
                                  y={nodeCenterY - 50}
                                  width={60}
                                  height={20}
                                  rx={6}
                                  fill="#E11D48"
                                  opacity="0.9"
                                />
                                <text
                                  x={cx}
                                  y={nodeCenterY - 36}
                                  textAnchor="middle"
                                  fill="#FFFFFF"
                                  fontSize="10"
                                  fontFamily="monospace"
                                  fontWeight="600"
                                >
                                  right = 5
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Comparison Status Callout — Evaluated in two distinct beats */}
                  <div className="mt-4 px-4 py-2 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 font-mono text-xs text-center flex items-center justify-center gap-2 min-h-[38px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e] shrink-0" />
                    <span>
                      {practicePhase === 'drawing' && 'Evaluating pair: 1 + 15...'}
                      {practicePhase === 'sum' && 'Comparing pair: 1 + 15 = 16'}
                      {(practicePhase === 'evaluated' || practicePhase === 'settled') &&
                        'Comparing pair: 1 + 15 = 16 > 13 (Too large)'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#64748B] text-center max-w-lg font-sans">
                    Without sorted order, an algorithm evaluates combinations that could never equal 13.
                  </p>
                </motion.div>
              )}

              {/* STAGE 2: UNDERSTAND */}
              {activeStageId === 'understand' && (
                <motion.div
                  key="stage-understand"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                  className="w-full flex flex-col items-center"
                >
                  {/* Step Control Buttons */}
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-xs font-mono text-[#94A3B8]">
                      Step:{' '}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnderstandStepJump(1)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                        understandPhase === 'compare_initial' || understandPhase === 'eliminate'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-white/[0.04] text-[#64748B] hover:text-[#94A3B8]'
                      }`}
                    >
                      Step 1 (1 + 15 = 16)
                    </button>
                    <span className="text-[#475569]">&rarr;</span>
                    <button
                      type="button"
                      onClick={() => handleUnderstandStepJump(2)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                        understandPhase === 'pointer_moving' ||
                        understandPhase === 'match_connected' ||
                        understandPhase === 'settled'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/[0.04] text-[#64748B] hover:text-[#94A3B8]'
                      }`}
                    >
                      Step 2 (1 + 12 = 13 Match!)
                    </button>
                  </div>

                  {/* SVG Canvas for Invariant Transformation */}
                  <div className="w-full max-w-3xl relative">
                    <svg
                      viewBox="0 0 760 210"
                      className="w-full h-auto overflow-visible"
                      aria-hidden="true"
                    >
                      {/* Grid background */}
                      <defs>
                        <pattern id="grid-understand" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="0.75" fill="#334155" opacity="0.4" />
                        </pattern>
                      </defs>
                      <rect x="0" y="0" width="760" height="210" fill="url(#grid-understand)" opacity="0.3" rx="12" />

                      {/* Step 1 Arc (1 to 15, too large) — active before pointer moves */}
                      {(understandPhase === 'compare_initial' || understandPhase === 'eliminate') && (
                        <motion.path
                          d="M 80 80 Q 380 200 680 80"
                          fill="none"
                          stroke="#F43F5E"
                          strokeWidth="2"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
                        />
                      )}

                      {/* Faded historical dashed trace of 1 to 15 after elimination */}
                      {(understandPhase === 'pointer_moving' ||
                        understandPhase === 'match_connected' ||
                        understandPhase === 'settled') && (
                        <path
                          d="M 80 80 Q 380 200 680 80"
                          fill="none"
                          stroke="#F43F5E"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                          opacity="0.25"
                        />
                      )}

                      {/* Step 2 Green Arc (1 to 12) — drawn only when pointer reaches 12 */}
                      {(understandPhase === 'match_connected' || understandPhase === 'settled') && (
                        <motion.path
                          d="M 80 80 Q 320 180 560 80"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="2.5"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: 'easeOut' }}
                        />
                      )}

                      {/* Array Nodes */}
                      {ARRAY_ELEMENTS.map((elem) => {
                        const cx = getNodeCenterX(elem.index);
                        const isLeft = elem.index === 0;

                        // 15 is eliminated only after the elimination decision
                        const isEliminated =
                          elem.index === 5 &&
                          (understandPhase === 'eliminate' ||
                            understandPhase === 'pointer_moving' ||
                            understandPhase === 'match_connected' ||
                            understandPhase === 'settled');

                        // Match state on 1 (idx 0) and 12 (idx 4)
                        const isMatch =
                          (understandPhase === 'match_connected' || understandPhase === 'settled') &&
                          (elem.index === 0 || elem.index === 4);

                        return (
                          <g key={`u-node-${elem.index}`}>
                            {/* Single visible success pulse ring on match */}
                            {isMatch && !shouldReduceMotion && understandPhase === 'settled' && (
                              <motion.circle
                                cx={cx}
                                cy={nodeCenterY}
                                r="28"
                                fill="none"
                                stroke="#10B981"
                                strokeWidth="2"
                                initial={{ scale: 1, opacity: 0.8 }}
                                animate={{ scale: 1.3, opacity: 0 }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            )}

                            {/* Node Box */}
                            <rect
                              x={cx - 24}
                              y={nodeCenterY - 24}
                              width={48}
                              height={48}
                              rx={10}
                              fill={
                                isEliminated
                                  ? '#05070B'
                                  : isMatch
                                  ? '#064E3B'
                                  : '#0B0F19'
                              }
                              stroke={
                                isEliminated
                                  ? '#334155'
                                  : isMatch
                                  ? '#10B981'
                                  : isLeft
                                  ? '#38BDF8'
                                  : '#334155'
                              }
                              strokeWidth={isMatch || isLeft ? 2 : 1}
                              opacity={isEliminated ? 0.35 : 1}
                              className="transition-all duration-300"
                            />

                            {/* Diagonal strikethrough line on eliminated node (animated) */}
                            {isEliminated && (
                              <motion.line
                                x1={cx - 18}
                                y1={nodeCenterY + 18}
                                x2={cx + 18}
                                y2={nodeCenterY - 18}
                                stroke="#F43F5E"
                                strokeWidth="2"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.35 }}
                                opacity="0.8"
                              />
                            )}

                            {/* Value Text */}
                            <text
                              x={cx}
                              y={nodeCenterY + 5}
                              textAnchor="middle"
                              fill={
                                isEliminated
                                  ? '#475569'
                                  : isMatch
                                  ? '#A7F3D0'
                                  : isLeft
                                  ? '#38BDF8'
                                  : '#94A3B8'
                              }
                              fontSize="14"
                              fontFamily="monospace"
                              fontWeight="600"
                            >
                              {elem.val}
                            </text>

                            {/* Stationary Left Pointer: left = 0 */}
                            {isLeft && (
                              <g>
                                <rect
                                  x={cx - 28}
                                  y={nodeCenterY - 50}
                                  width={56}
                                  height={20}
                                  rx={6}
                                  fill={isMatch ? '#059669' : '#0284C7'}
                                  className="transition-colors duration-300"
                                />
                                <text
                                  x={cx}
                                  y={nodeCenterY - 36}
                                  textAnchor="middle"
                                  fill="#FFFFFF"
                                  fontSize="10"
                                  fontFamily="monospace"
                                  fontWeight="600"
                                >
                                  left = 0
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* PHYSICALLY ANIMATED RIGHT POINTER */}
                      {/* Starts at index 5 (x=680) and physically translates left to index 4 (x=560) */}
                      {(() => {
                        const targetX =
                          understandPhase === 'compare_initial' || understandPhase === 'eliminate'
                            ? 680
                            : 560;
                        const isMatch =
                          understandPhase === 'match_connected' || understandPhase === 'settled';

                        return (
                          <motion.g
                            animate={{ x: targetX }}
                            transition={{
                              duration: shouldReduceMotion ? 0 : 0.75,
                              ease: [0.25, 0.1, 0.25, 1],
                            }}
                          >
                            <rect
                              x={-30}
                              y={nodeCenterY - 50}
                              width={60}
                              height={20}
                              rx={6}
                              fill={isMatch ? '#059669' : '#E11D48'}
                              className="transition-colors duration-300"
                            />
                            <text
                              x={0}
                              y={nodeCenterY - 36}
                              textAnchor="middle"
                              fill="#FFFFFF"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight="600"
                            >
                              {targetX === 680 ? 'right = 5' : 'right = 4'}
                            </text>
                          </motion.g>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Step Feedback Status Callout */}
                  <div className="mt-4 px-4 py-2.5 rounded-xl border text-xs font-mono text-center flex items-center justify-center gap-2 min-h-[42px] transition-all">
                    {understandPhase === 'compare_initial' && (
                      <div className="text-rose-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]" />
                        <span>Comparing endpoints: 1 + 15 = 16 &gt; 13 (Too large)</span>
                      </div>
                    )}
                    {understandPhase === 'eliminate' && (
                      <div className="text-amber-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                        <span>15 cannot pair with any number &rarr; 15 eliminated by monotonic invariant</span>
                      </div>
                    )}
                    {understandPhase === 'pointer_moving' && (
                      <div className="text-sky-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8] animate-pulse" />
                        <span>Advancing right pointer leftward to index 4 (value 12)...</span>
                      </div>
                    )}
                    {(understandPhase === 'match_connected' || understandPhase === 'settled') && (
                      <div className="text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-semibold">
                          Right pointer at 12: 1 + 12 = 13 (Target matched in 2 steps!)
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-[#64748B] text-center max-w-lg font-sans">
                    {understandPhase === 'compare_initial' || understandPhase === 'eliminate'
                      ? 'Because 1 is the minimum value in the array, 15 cannot pair with any remaining candidate. Moving right pointer left.'
                      : 'By applying monotonic bounding, the target is located in O(n) linear steps without brute-force combinatorial waste.'}
                  </p>
                </motion.div>
              )}

              {/* STAGE 3: IMPROVE (Connected Concept Nodes with Directional Links) */}
              {activeStageId === 'improve' && (
                <motion.div
                  key="stage-improve"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                  className="w-full flex flex-col items-center"
                >
                  <p className="text-xs font-mono text-[#94A3B8] mb-6 text-center">
                    Concept Progression: Monotonic Invariant Transfer
                  </p>

                  {/* Sleek Connected Concept Nodes */}
                  <div className="w-full max-w-3xl py-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 relative items-stretch">
                      {/* Node 1: Two Sum (Foundation) */}
                      <button
                        type="button"
                        onClick={() => setSelectedConcept('twosum')}
                        className={`text-left p-4 rounded-xl border transition-all duration-200 relative group flex flex-col justify-between ${
                          selectedConcept === 'twosum'
                            ? 'bg-sky-950/20 border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
                            : 'bg-[#0A0E17] border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                              Foundation
                            </span>
                            <CheckCircle2 className="w-4 h-4 text-sky-400" />
                          </div>
                          <h4 className="text-sm font-semibold text-white font-sans group-hover:text-sky-300 transition-colors">
                            Two-Pointer Two Sum
                          </h4>
                          <p className="mt-1 text-xs text-[#94A3B8] font-sans">
                            Boundary contraction on sorted array
                          </p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-white/[0.04] text-[10px] font-mono text-[#64748B]">
                          O(n) Time · O(1) Space
                        </div>
                      </button>

                      {/* Directional Connector 1: Signal from Two Sum to 3Sum */}
                      <div className="hidden md:flex absolute left-[31%] top-1/2 -translate-y-1/2 z-10 pointer-events-none items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#080B12] border border-sky-500/40 flex items-center justify-center relative shadow-lg overflow-hidden">
                          {!shouldReduceMotion && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400/40 to-transparent"
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          )}
                          <ChevronRight className="w-4 h-4 text-sky-400 relative z-10" />
                        </div>
                      </div>

                      {/* Node 2: 3Sum (Active Next Target) */}
                      <button
                        type="button"
                        onClick={() => setSelectedConcept('threesum')}
                        className={`text-left p-4 rounded-xl border transition-all duration-200 relative group flex flex-col justify-between ${
                          selectedConcept === 'threesum'
                            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                            : 'bg-[#0A0E17] border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              Active Next Target
                            </span>
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                          </div>
                          <h4 className="text-sm font-semibold text-white font-sans group-hover:text-emerald-300 transition-colors">
                            3Sum Triplet Bounds
                          </h4>
                          <p className="mt-1 text-xs text-[#94A3B8] font-sans">
                            Fix one element · Run two pointers
                          </p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-white/[0.04] text-[10px] font-mono text-[#64748B]">
                          O(n²) Time · Direct Transfer
                        </div>
                      </button>

                      {/* Directional Connector 2: Leading to Sliding Window */}
                      <div className="hidden md:flex absolute left-[64%] top-1/2 -translate-y-1/2 z-10 pointer-events-none items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#080B12] border border-purple-500/30 flex items-center justify-center relative shadow-lg">
                          <ChevronRight className="w-4 h-4 text-purple-400" />
                        </div>
                      </div>

                      {/* Node 3: Sliding Window (Future Related Concept) */}
                      <button
                        type="button"
                        onClick={() => setSelectedConcept('slidingwindow')}
                        className={`text-left p-4 rounded-xl border transition-all duration-200 relative group flex flex-col justify-between ${
                          selectedConcept === 'slidingwindow'
                            ? 'bg-purple-950/20 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.12)]'
                            : 'bg-[#0A0E17] border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                              Future Horizon
                            </span>
                            <Layers className="w-4 h-4 text-purple-400" />
                          </div>
                          <h4 className="text-sm font-semibold text-white font-sans group-hover:text-purple-300 transition-colors">
                            Sliding Window
                          </h4>
                          <p className="mt-1 text-xs text-[#94A3B8] font-sans">
                            Dynamic interval expansion &amp; contraction
                          </p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-white/[0.04] text-[10px] font-mono text-[#64748B]">
                          O(n) Time · Dynamic Bounds
                        </div>
                      </button>
                    </div>

                    {/* Single Concise Editorial Explanation */}
                    <div className="mt-5 w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0 shadow-[0_0_6px_#38BDF8]" />
                      <div className="text-xs font-sans leading-relaxed text-[#CBD5E1]">
                        <span className="font-semibold text-white font-mono mr-2">
                          {CONCEPT_PROGRESSION[selectedConcept].title}:
                        </span>
                        {CONCEPT_PROGRESSION[selectedConcept].invariantLink}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Explanation Footer with Editorial Narrative */}
          <div className="w-full pt-6 mt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="max-w-2xl space-y-1">
              <h3 className="text-base sm:text-lg font-semibold text-[#F8FAFC] font-sans">
                {currentStage.headline}
              </h3>
              <p className="text-xs sm:text-sm text-[#94A3B8] font-sans leading-relaxed">
                {currentStage.explanation}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const ids: StageId[] = ['practice', 'understand', 'improve'];
                const nextIndex = (ids.indexOf(activeStageId) + 1) % ids.length;
                handleStageSelect(ids[nextIndex]);
              }}
              className="group self-end sm:self-center shrink-0 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-[#F8FAFC] border border-white/[0.08] flex items-center gap-2 text-xs font-sans transition-all"
            >
              <span>Next Stage</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </div>

          {/* Pedagogical Grounding Statement */}
          <div className="mt-4 text-center">
            <p className="text-xs text-[#64748B] font-sans">
              Key insight: <span className="text-[#94A3B8]">{currentStage.takeaway}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingLearningLoop;
