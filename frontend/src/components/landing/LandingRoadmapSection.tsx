import React, { useState, useRef, useId, useMemo, useEffect } from 'react';
import {
  GitBranch,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Compass,
  CornerDownRight,
  Sparkles,
  ShieldCheck,
  Shuffle,
  AlertCircle,
  HelpCircle,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { EASE_DECEL } from '@/lib/motion';
import {
  RAW_CONCEPT_NODES,
  CANONICAL_EDGES,
  DEFAULT_RECOVERY_SCENARIO,
  getNodeRelationships,
  getComputedNodeState,
  ConceptNodeData,
  ConceptEdgeData,
} from './roadmapGraphData';

export const LandingRoadmapSection: React.FC = () => {
  // Active selected node ID — defaults to the recommended next topic
  const [selectedNodeId, setSelectedNodeId] = useState<string>('sliding-window');
  // Interactive mode: 'standard' or 'recovery' (non-punitive adaptation demo)
  const [mode, setMode] = useState<'standard' | 'recovery'>('standard');
  // Mobile presentation mode: 'flow' (cards list) or 'canvas' (interactive diagram)
  const [mobileViewMode, setMobileViewMode] = useState<'flow' | 'canvas'>('flow');
  // Motion preference detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const filterId = useId();

  // Listen for prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Currently selected concept node data
  const selectedNode: ConceptNodeData = useMemo(() => {
    return RAW_CONCEPT_NODES.find((n) => n.id === selectedNodeId) || RAW_CONCEPT_NODES[4];
  }, [selectedNodeId]);

  // Derived relationship details guaranteeing 100% graph and inspector agreement
  const relationships = useMemo(() => {
    return getNodeRelationships(selectedNode.id);
  }, [selectedNode.id]);

  // Derived sets for edge highlighting
  const { directPrereqIds, supportingPrereqIds, transitivePrereqIds, directUnlockIds, activeEdgeIds } =
    useMemo(() => {
      const directPrereqs = new Set<string>(relationships.directPrerequisites.map((n) => n.id));
      const supportingPrereqs = new Set<string>(relationships.supportingConcepts.map((n) => n.id));
      const transitivePrereqs = new Set<string>(relationships.transitiveFoundations.map((n) => n.id));
      const directUnlocks = new Set<string>(relationships.directUnlocks.map((n) => n.id));
      const activeEdges = new Set<string>();

      CANONICAL_EDGES.forEach((edge) => {
        if (mode === 'recovery') {
          // In recovery mode, highlight the recovery arc and the prerequisite being revisited
          if (edge.id === DEFAULT_RECOVERY_SCENARIO.recoveryEdgeId) {
            activeEdges.add(edge.id);
          }
          if (
            edge.source === DEFAULT_RECOVERY_SCENARIO.revisitPrerequisiteId &&
            edge.target === DEFAULT_RECOVERY_SCENARIO.frictionNodeId
          ) {
            activeEdges.add(edge.id);
          }
          return;
        }

        // In standard mode, highlight incoming and outgoing edges for the selected node
        if (edge.type === 'recovery') return;
        if (edge.target === selectedNode.id || edge.source === selectedNode.id) {
          activeEdges.add(edge.id);
        }
      });

      return {
        directPrereqIds: directPrereqs,
        supportingPrereqIds: supportingPrereqs,
        transitivePrereqIds: transitivePrereqs,
        directUnlockIds: directUnlocks,
        activeEdgeIds: activeEdges,
      };
    }, [selectedNode.id, relationships, mode]);

  // Handle switching between standard flow and adaptive recovery mode
  const handleToggleMode = (newMode: 'standard' | 'recovery') => {
    setMode(newMode);
    if (newMode === 'recovery') {
      // Focus on the concept experiencing friction (Dynamic Sliding Window)
      setSelectedNodeId(DEFAULT_RECOVERY_SCENARIO.frictionNodeId);
    } else {
      // Restore standard recommended target
      setSelectedNodeId('sliding-window');
    }
  };

  const handleReset = () => {
    setMode('standard');
    setSelectedNodeId('sliding-window');
  };

  // Helper to compute precise border-to-border curve paths
  const getCurvePath = (edge: ConceptEdgeData) => {
    const s = RAW_CONCEPT_NODES.find((n) => n.id === edge.source);
    const t = RAW_CONCEPT_NODES.find((n) => n.id === edge.target);
    if (!s || !t) return '';

    // Recovery arc: connects bottom of friction node back to bottom of revisited prerequisite
    if (edge.type === 'recovery') {
      const startX = s.x - 24;
      const startY = s.y + 33;
      const endX = t.x + 24;
      const endY = t.y + 33;
      const midX = (startX + endX) / 2;
      const arcY = 280;
      return `M ${startX} ${startY} Q ${midX} ${arcY}, ${endX} ${endY}`;
    }

    // Standard forward flow: right border of source to left border of target
    const startX = s.x + 82;
    const startY = s.y;
    const endX = t.x - 82;
    const endY = t.y;
    const dx = endX - startX;

    const cx1 = startX + dx * 0.45;
    const cy1 = startY;
    const cx2 = endX - dx * 0.45;
    const cy2 = endY;
    return `M ${startX} ${startY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endX} ${endY}`;
  };

  // Group concept nodes by stage for mobile flow view
  const stages = useMemo(() => {
    const stageMap = new Map<string, ConceptNodeData[]>();
    RAW_CONCEPT_NODES.forEach((node) => {
      const group = stageMap.get(node.stageName) || [];
      group.push(node);
      stageMap.set(node.stageName, group);
    });
    return Array.from(stageMap.entries()).map(([stageName, nodes]) => ({
      stageName,
      nodes,
    }));
  }, []);

  return (
    <section
      id="roadmaps"
      className="relative w-full py-16 sm:py-20 md:py-28 bg-[#07090E] border-t border-white/[0.06] overflow-hidden scroll-mt-28 sm:scroll-mt-32"
    >
      {/* Background Ambience: Subtle Obsidian & Sapphire Lighting */}
      <div className="absolute top-1/4 left-1/4 w-[700px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.035)_0%,rgba(59,130,246,0.015)_50%,transparent_70%)] pointer-events-none blur-[140px] -z-10" />
      <div className="absolute bottom-10 right-10 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.025)_0%,transparent_70%)] pointer-events-none blur-[130px] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        {/* ── 1. SECTION EDITORIAL HEADER ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: EASE_DECEL }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
        >
          <div className="space-y-4 max-w-3xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
              <span className="font-mono text-[11px] text-sky-400 uppercase tracking-[0.2em] font-medium">
                03 • CURRICULUM ARCHITECTURE
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.03em] text-[#F8FAFC] leading-[1.15] font-sans">
              Directed Graphs.{' '}
              <span className="text-[#38BDF8]">
                Non-Punitive Pacing.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed font-sans max-w-2xl">
              Algorithmic mastery cannot be taught through an arbitrary flat checklist. Chakriva models concepts as an invariant-driven directed acyclic graph. When friction occurs, the curriculum temporarily branches back to reinforce upstream prerequisites rather than deducting points, breaking streaks, or restarting modules.
            </p>
          </div>

          {/* Interactive Mode Switcher & Controls */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-end">
            <div className="inline-flex p-1 rounded-xl bg-[#0B0F19] border border-white/[0.08] shadow-inner">
              <button
                type="button"
                onClick={() => handleToggleMode('standard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  mode === 'standard'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
                aria-pressed={mode === 'standard'}
              >
                Standard Flow
              </button>
              <button
                type="button"
                onClick={() => handleToggleMode('recovery')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  mode === 'recovery'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
                aria-pressed={mode === 'recovery'}
              >
                <Shuffle className="w-3 h-3 text-amber-400" />
                <span>Simulate Adaptive Recovery</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl bg-[#0B0F19] border border-white/[0.08] text-[#94A3B8] hover:text-white hover:border-white/20 transition-all"
              title="Reset graph view"
              aria-label="Reset graph view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        {/* ── 2. ADAPTIVE RECOVERY CALLOUT BANNER ──────────────────────── */}
        <AnimatePresence mode="wait">
          {mode === 'recovery' ? (
            <motion.div
              key="recovery-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              className="p-4 sm:p-5 rounded-xl bg-amber-950/20 border border-amber-500/35 text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_4px_24px_rgba(245,158,11,0.08)]"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-amber-300 uppercase tracking-wide">
                      Adaptive Recovery Active
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      Deferred Target: Dynamic Sliding Window (COR-02)
                    </span>
                  </div>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed max-w-3xl">
                    <strong className="text-white">Friction point detected:</strong> Learner exhibits repeated boundary contraction mistakes on sliding window problems. Rather than failing the module or penalizing streaks, Chakriva temporarily sets Dynamic Sliding Window as a deferred target and branches to <strong className="text-amber-300">Two-Pointer Bounds (COR-01)</strong> for 2 targeted interval shrinkage drills before resuming.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => handleToggleMode('standard')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-mono transition-all whitespace-nowrap"
                >
                  Return to Standard Flow &rarr;
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── 3. MAIN SECTION BODY: DIRECTED GRAPH + DETAIL PANEL ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT: THE CANONICAL CONCEPT GRAPH (8 of 12 cols) ────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: EASE_DECEL }}
            className="lg:col-span-8 flex flex-col space-y-4"
          >
            {/* Graph Canvas Container */}
            <div
              ref={containerRef}
              className="relative w-full rounded-2xl bg-[#090C15]/90 border border-white/[0.08] backdrop-blur-sm p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {/* Header Telemetry & Status Legend */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] font-mono text-[#64748B] border-b border-white/[0.05] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-neutral-300 font-medium">DSA Invariant Dependency DAG</span>
                  <span className="hidden sm:inline text-neutral-600">•</span>
                  <span className="hidden sm:inline text-neutral-500">8 Concept Nodes · 11 Directed Edges</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-neutral-400">Mastered</span>
                  </span>
                  {mode === 'recovery' ? (
                    <>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-amber-300 font-medium">Revisiting</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full border border-amber-400/80 bg-sky-400/20" />
                        <span className="text-amber-200">Deferred</span>
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      <span className="text-sky-300 font-medium">Active Target</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-neutral-600" />
                    <span className="text-neutral-500">Upcoming</span>
                  </span>
                </div>
              </div>

              {/* Mobile View Switcher (Only visible on small viewports) */}
              <div className="flex lg:hidden items-center justify-between p-1.5 rounded-xl bg-[#0B0F19] border border-white/[0.06] mb-4">
                <span className="text-[11px] font-mono text-neutral-400 pl-2">Layout View:</span>
                <div className="inline-flex gap-1">
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('flow')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                      mobileViewMode === 'flow'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-medium'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Stage Flow</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('canvas')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                      mobileViewMode === 'canvas'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-medium'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>Diagram</span>
                  </button>
                </div>
              </div>

              {/* ── A. MOBILE FLOW VIEW (Readable sequential cards without SVG truncation) ── */}
              <div className={`space-y-4 ${mobileViewMode === 'flow' ? 'block lg:hidden' : 'hidden'}`}>
                {stages.map(({ stageName, nodes }) => (
                  <div key={stageName} className="space-y-2 text-left">
                    <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider px-1">
                      {stageName}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {nodes.map((node) => {
                        const computedState = getComputedNodeState(node, mode);
                        const isSelected = selectedNode.id === node.id;
                        const isFriction = mode === 'recovery' && node.id === DEFAULT_RECOVERY_SCENARIO.frictionNodeId;
                        const isRevisit = mode === 'recovery' && node.id === DEFAULT_RECOVERY_SCENARIO.revisitPrerequisiteId;

                        return (
                          <div
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'bg-[#0E1526] border-sky-400 ring-1 ring-sky-400/50 shadow-md'
                                : isRevisit
                                ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400'
                                : isFriction
                                ? 'bg-amber-950/15 border-amber-500/35 hover:border-amber-400/60'
                                : 'bg-[#0B0F19] border-white/[0.06] hover:border-white/20'
                            }`}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedNodeId(node.id);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <span className="font-mono text-[10px] text-sky-400 font-bold">
                                {node.code}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                  computedState === 'mastered'
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25'
                                    : computedState === 'recommended'
                                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold'
                                    : computedState === 'deferred'
                                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium'
                                    : computedState === 'revisiting'
                                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold'
                                    : 'bg-white/[0.04] text-neutral-400 border border-white/[0.08]'
                                }`}
                              >
                                {computedState === 'mastered'
                                  ? 'Mastered'
                                  : computedState === 'recommended'
                                  ? 'Active Target'
                                  : computedState === 'deferred'
                                  ? 'Deferred'
                                  : computedState === 'revisiting'
                                  ? 'Revisiting'
                                  : 'Upcoming'}
                              </span>
                            </div>

                            <div className="text-sm font-semibold text-white font-sans">
                              {node.title}
                            </div>
                            <div className="text-xs text-[#94A3B8] font-sans mt-1 line-clamp-2">
                              {node.description}
                            </div>

                            {/* Relationship indicator tags on mobile card */}
                            <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
                              <span className="text-[#64748B]">{node.category}</span>
                              <span className="text-sky-400">
                                {isSelected ? 'Selected in inspector' : 'Tap to inspect &rarr;'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── B. DESKTOP & TOGGLED SVG GRAPH VISUALIZATION ───────── */}
              <div
                className={`relative w-full aspect-[840/440] min-h-[340px] select-none ${
                  mobileViewMode === 'flow' ? 'hidden lg:block' : 'block'
                }`}
              >
                <svg
                  viewBox="0 0 840 440"
                  className="w-full h-full overflow-visible"
                  role="region"
                  aria-label="Directed concept graph showing prerequisite relationships and adaptive recovery"
                >
                  <defs>
                    {/* SVG Arrowhead Markers */}
                    <marker
                      id={`${filterId}-arrow-default`}
                      viewBox="0 0 10 10"
                      refX="16"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 2 L 8 5 L 0 8 z" fill="rgba(255,255,255,0.2)" />
                    </marker>

                    <marker
                      id={`${filterId}-arrow-active`}
                      viewBox="0 0 10 10"
                      refX="16"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38BDF8" />
                    </marker>

                    <marker
                      id={`${filterId}-arrow-recovery`}
                      viewBox="0 0 10 10"
                      refX="16"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F59E0B" />
                    </marker>

                    <marker
                      id={`${filterId}-arrow-subtle`}
                      viewBox="0 0 10 10"
                      refX="16"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 2 L 8 5 L 0 8 z" fill="rgba(255,255,255,0.08)" />
                    </marker>

                    {/* Active Edge Gradient */}
                    <linearGradient id={`${filterId}-grad-active`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.9" />
                    </linearGradient>

                    {/* Subtle Datum Grid */}
                    <pattern id={`${filterId}-grid`} width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle cx="20" cy="20" r="0.8" fill="rgba(255,255,255,0.05)" />
                    </pattern>
                  </defs>

                  {/* Datum Grid Backdrop */}
                  <rect width="840" height="440" fill={`url(#${filterId}-grid)`} />

                  {/* Stage Zone Indicators (Upstream to Downstream) */}
                  <text
                    x="100"
                    y="30"
                    fill="rgba(148,163,184,0.4)"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    letterSpacing="0.08em"
                  >
                    UPSTREAM FOUNDATIONS
                  </text>
                  <text
                    x="320"
                    y="30"
                    fill="rgba(148,163,184,0.4)"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    letterSpacing="0.08em"
                  >
                    CORE PATTERNS
                  </text>
                  <text
                    x="540"
                    y="30"
                    fill={mode === 'recovery' ? 'rgba(245,158,11,0.7)' : 'rgba(56,189,248,0.7)'}
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    letterSpacing="0.08em"
                  >
                    {mode === 'recovery' ? 'DEFERRED / BRANCH' : 'RECOMMENDED TARGET'}
                  </text>
                  <text
                    x="740"
                    y="30"
                    fill="rgba(148,163,184,0.3)"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                    letterSpacing="0.08em"
                  >
                    FUTURE HORIZONS
                  </text>

                  {/* ── EDGES LAYER ─────────────────────────────────── */}
                  <g className="edges-layer">
                    {CANONICAL_EDGES.map((edge) => {
                      // Filter out alternative recovery arcs unless recovery mode is active
                      if (edge.type === 'recovery' && mode !== 'recovery') return null;

                      const pathD = getCurvePath(edge);
                      const isRecoveryArc = edge.type === 'recovery';
                      const isHighlighted = activeEdgeIds.has(edge.id);
                      const isTransitive = edge.type === 'transitive';
                      const isSupporting = edge.type === 'supporting';

                      return (
                        <g key={edge.id} className="transition-all duration-300">
                          {/* Wider hit line */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={
                              isRecoveryArc
                                ? 'rgba(245, 158, 11, 0.25)'
                                : isHighlighted
                                ? 'rgba(56, 189, 248, 0.25)'
                                : 'transparent'
                            }
                            strokeWidth={isHighlighted || isRecoveryArc ? 5 : 2}
                            strokeLinecap="round"
                          />

                          {/* Crisp foreground connector path */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke={
                              isRecoveryArc
                                ? '#F59E0B'
                                : isHighlighted
                                ? `url(#${filterId}-grad-active)`
                                : isTransitive
                                ? 'rgba(255, 255, 255, 0.06)'
                                : isSupporting
                                ? 'rgba(148, 163, 184, 0.14)'
                                : 'rgba(255, 255, 255, 0.12)'
                            }
                            strokeWidth={isRecoveryArc ? 2.5 : isHighlighted ? 2 : 1.2}
                            strokeDasharray={
                              isRecoveryArc
                                ? '5 4'
                                : isTransitive
                                ? '3 3'
                                : isSupporting
                                ? '4 3'
                                : undefined
                            }
                            markerEnd={
                              isRecoveryArc
                                ? `url(#${filterId}-arrow-recovery)`
                                : isHighlighted
                                ? `url(#${filterId}-arrow-active)`
                                : isTransitive
                                ? `url(#${filterId}-arrow-subtle)`
                                : `url(#${filterId}-arrow-default)`
                            }
                            className={
                              !prefersReducedMotion && (isHighlighted || isRecoveryArc)
                                ? 'transition-all duration-300'
                                : undefined
                            }
                          />

                          {/* Recovery Route Label Pill */}
                          {isRecoveryArc && (
                            <g transform="translate(430, 276)">
                              <rect
                                x="-82"
                                y="-10"
                                width="164"
                                height="20"
                                rx="10"
                                fill="#2A1604"
                                stroke="#F59E0B"
                                strokeWidth="1"
                              />
                              <text
                                x="0"
                                y="3.5"
                                fill="#FBBF24"
                                fontSize="9"
                                fontFamily="monospace"
                                fontWeight="700"
                                textAnchor="middle"
                              >
                                &larr; ADAPTIVE RE-ROUTE &crarr;
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>

                  {/* ── NODES LAYER ─────────────────────────────────── */}
                  <g className="nodes-layer">
                    {RAW_CONCEPT_NODES.map((node) => {
                      const computedState = getComputedNodeState(node, mode);
                      const isSelected = selectedNode.id === node.id;
                      const isDirectPrereq = directPrereqIds.has(node.id);
                      const isSupportingPrereq = supportingPrereqIds.has(node.id);
                      const isTransitivePrereq = transitivePrereqIds.has(node.id);
                      const isDirectUnlock = directUnlockIds.has(node.id);

                      const isMastered = computedState === 'mastered';
                      const isRecommended = computedState === 'recommended';
                      const isDeferred = computedState === 'deferred';
                      const isRevisiting = computedState === 'revisiting';

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          onClick={() => setSelectedNodeId(node.id)}
                          className="cursor-pointer transition-transform duration-200"
                          style={{
                            transformOrigin: `${node.x}px ${node.y}px`,
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Concept Node: ${node.title}, State: ${computedState}`}
                          aria-pressed={isSelected}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedNodeId(node.id);
                            }
                          }}
                        >
                          {/* Expanded Interactive Hit Area */}
                          <rect
                            x="-84"
                            y="-33"
                            width="168"
                            height="66"
                            rx="14"
                            fill="transparent"
                          />

                          {/* Outer Selection Highlight Ring */}
                          {isSelected && (
                            <rect
                              x="-85"
                              y="-34"
                              width="170"
                              height="68"
                              rx="15"
                              fill="none"
                              stroke={isRevisiting || isDeferred ? '#F59E0B' : '#38BDF8'}
                              strokeWidth="2"
                              strokeDasharray="4 4"
                            />
                          )}

                          {/* Main Node Card Surface */}
                          <rect
                            x="-82"
                            y="-32"
                            width="164"
                            height="64"
                            rx="12"
                            fill={
                              isSelected
                                ? '#0F172A'
                                : isRevisiting
                                ? '#241203'
                                : isDeferred
                                ? '#18120A'
                                : isRecommended
                                ? '#08172E'
                                : isMastered
                                ? '#071510'
                                : '#0A0E1A'
                            }
                            stroke={
                              isSelected
                                ? isRevisiting || isDeferred
                                  ? '#F59E0B'
                                  : '#38BDF8'
                                : isRevisiting
                                ? '#F59E0B'
                                : isDeferred
                                ? 'rgba(245, 158, 11, 0.7)'
                                : isRecommended
                                ? 'rgba(56, 189, 248, 0.8)'
                                : isDirectPrereq
                                ? 'rgba(16, 185, 129, 0.65)'
                                : isSupportingPrereq
                                ? 'rgba(148, 163, 184, 0.4)'
                                : isTransitivePrereq
                                ? 'rgba(255, 255, 255, 0.16)'
                                : isDirectUnlock
                                ? 'rgba(56, 189, 248, 0.4)'
                                : isMastered
                                ? 'rgba(16, 185, 129, 0.35)'
                                : 'rgba(255, 255, 255, 0.08)'
                            }
                            strokeWidth={isSelected || isRecommended || isRevisiting ? 1.75 : 1}
                            className="transition-colors duration-200"
                          />

                          {/* Status Dot */}
                          <circle
                            cx="-68"
                            cy="-17"
                            r="3.5"
                            fill={
                              isRevisiting
                                ? '#F59E0B'
                                : isDeferred
                                ? '#FBBF24'
                                : isMastered
                                ? '#10B981'
                                : isRecommended
                                ? '#38BDF8'
                                : 'rgba(255, 255, 255, 0.25)'
                            }
                          />

                          {/* Code Eyebrow */}
                          <text
                            x="-58"
                            y="-14"
                            fill={
                              isRevisiting || isDeferred
                                ? '#FBBF24'
                                : isRecommended
                                ? '#38BDF8'
                                : isMastered
                                ? '#34D399'
                                : '#94A3B8'
                            }
                            fontSize="8.5"
                            fontFamily="monospace"
                            fontWeight="600"
                            letterSpacing="0.05em"
                          >
                            {node.code}
                          </text>

                          {/* Line 1: Deliberate Two-Line Label (No Ellipsis Truncation) */}
                          <text
                            x="-68"
                            y="4"
                            fill={
                              isSelected || isRecommended
                                ? '#FFFFFF'
                                : isRevisiting
                                ? '#FDE68A'
                                : isMastered
                                ? '#E2E8F0'
                                : '#94A3B8'
                            }
                            fontSize="11"
                            fontFamily="sans-serif"
                            fontWeight={isSelected || isRecommended || isRevisiting ? '600' : '500'}
                          >
                            {node.line1}
                          </text>

                          {/* Line 2: Deliberate Two-Line Label */}
                          <text
                            x="-68"
                            y="18"
                            fill={
                              isSelected || isRecommended
                                ? '#FFFFFF'
                                : isRevisiting
                                ? '#FDE68A'
                                : isMastered
                                ? '#E2E8F0'
                                : '#94A3B8'
                            }
                            fontSize="11"
                            fontFamily="sans-serif"
                            fontWeight={isSelected || isRecommended || isRevisiting ? '600' : '500'}
                          >
                            {node.line2}
                          </text>

                          {/* Tag Badges: Active Recommended, Deferred, or Revisiting */}
                          {isRecommended && (
                            <g transform="translate(18, -31)">
                              <rect
                                x="-4"
                                y="-5"
                                width="66"
                                height="13"
                                rx="6.5"
                                fill="#0369A1"
                                stroke="#38BDF8"
                                strokeWidth="0.5"
                              />
                              <text
                                x="29"
                                y="4.5"
                                fill="#FFFFFF"
                                fontSize="7"
                                fontFamily="monospace"
                                fontWeight="700"
                                textAnchor="middle"
                              >
                                RECOMMENDED
                              </text>
                            </g>
                          )}

                          {isDeferred && (
                            <g transform="translate(20, -31)">
                              <rect
                                x="-4"
                                y="-5"
                                width="64"
                                height="13"
                                rx="6.5"
                                fill="#78350F"
                                stroke="#F59E0B"
                                strokeWidth="0.5"
                              />
                              <text
                                x="28"
                                y="4.5"
                                fill="#FDE68A"
                                fontSize="7"
                                fontFamily="monospace"
                                fontWeight="700"
                                textAnchor="middle"
                              >
                                DEFERRED
                              </text>
                            </g>
                          )}

                          {isRevisiting && (
                            <g transform="translate(18, -31)">
                              <rect
                                x="-4"
                                y="-5"
                                width="66"
                                height="13"
                                rx="6.5"
                                fill="#451A03"
                                stroke="#F59E0B"
                                strokeWidth="0.5"
                              />
                              <text
                                x="29"
                                y="4.5"
                                fill="#FBBF24"
                                fontSize="7"
                                fontFamily="monospace"
                                fontWeight="700"
                                textAnchor="middle"
                              >
                                REVISITING
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>

              {/* Bottom Quick-Select Bar for Desktop & Keyboard Accessible Selection */}
              <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between text-xs font-mono">
                <span className="text-[#64748B] hidden sm:inline">Select Concept:</span>
                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                  {RAW_CONCEPT_NODES.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedNodeId(n.id)}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                        selectedNode.id === n.id
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                          : 'bg-[#0B0F19] text-[#94A3B8] hover:text-white border border-white/[0.04]'
                      }`}
                    >
                      {n.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT: AUTHORITATIVE DETAIL INSPECTOR (4 of 12 cols) ──── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: EASE_DECEL }}
            className="lg:col-span-4 flex flex-col space-y-4"
          >
            <div className="rounded-2xl bg-[#090C15]/95 border border-white/[0.08] backdrop-blur-sm p-6 shadow-xl text-left space-y-5">
              {/* Card Header: Node Code, Category, and State */}
              <div className="flex items-start justify-between border-b border-white/[0.06] pb-4">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-sky-400 font-bold">{selectedNode.code}</span>
                    <span className="text-neutral-500">•</span>
                    <span className="text-neutral-400">{selectedNode.category}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mt-1 font-sans">
                    {selectedNode.title}
                  </h3>
                </div>

                {/* State Badge — Derived to guarantee no node is both Mastered and Recommended */}
                <div className="shrink-0">
                  {(() => {
                    const state = getComputedNodeState(selectedNode, mode);
                    if (state === 'mastered') {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-[11px] font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Mastered</span>
                        </span>
                      );
                    }
                    if (state === 'recommended') {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono text-[11px] font-semibold shadow-sm">
                          <Sparkles className="w-3 h-3 text-sky-400" />
                          <span>Active Target</span>
                        </span>
                      );
                    }
                    if (state === 'deferred') {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-semibold shadow-sm">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          <span>Deferred Target</span>
                        </span>
                      );
                    }
                    if (state === 'revisiting') {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-200 font-mono text-[11px] font-bold shadow-sm">
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Revisiting Prereq</span>
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-neutral-400 font-mono text-[11px]">
                        <span>Upcoming</span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Description & Intuition */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider">
                  Conceptual Role
                </div>
                <p className="text-xs text-[#CBD5E1] leading-relaxed font-sans">
                  {selectedNode.description}
                </p>
              </div>

              {/* Mathematical / Algorithmic Invariant */}
              <div className="p-3.5 rounded-xl bg-[#07090E] border border-white/[0.06] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>CORE INVARIANT</span>
                </div>
                <div className="text-xs font-mono text-[#E2E8F0] leading-relaxed bg-white/[0.02] p-2 rounded border border-white/[0.03]">
                  {selectedNode.invariant}
                </div>
              </div>

              {/* ── PREREQUISITES & RELATIONSHIPS (DERIVED DIRECTLY FROM EDGES) ── */}
              <div className="space-y-3 pt-1 border-t border-white/[0.06]">
                {/* 1. Direct Prerequisites */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                    <span>Direct Prerequisites (Required)</span>
                    <span className="text-neutral-500 font-normal">
                      {relationships.directPrerequisites.length === 0
                        ? 'None (Foundation)'
                        : `${relationships.directPrerequisites.length} Direct`}
                    </span>
                  </div>
                  {relationships.directPrerequisites.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {relationships.directPrerequisites.map((prereq) => (
                        <button
                          key={prereq.id}
                          type="button"
                          onClick={() => setSelectedNodeId(prereq.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono hover:bg-emerald-500/20 transition-all text-left"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{prereq.title}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400 italic">
                      Zero prerequisites. Entry-point sequence foundation.
                    </div>
                  )}
                </div>

                {/* 2. Supporting Concepts (Optional / Auxiliary) */}
                {relationships.supportingConcepts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                      <span>Supporting Concept (Optional)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {relationships.supportingConcepts.map((supp) => (
                        <button
                          key={supp.id}
                          type="button"
                          onClick={() => setSelectedNodeId(supp.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-mono hover:bg-sky-500/20 transition-all text-left"
                        >
                          <HelpCircle className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>{supp.title}</span>
                          <span className="text-[10px] text-sky-400/70">(Multiset state)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Transitive Foundations (Inherited) */}
                {relationships.transitiveFoundations.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                      <span>Transitive Foundation (Inherited)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {relationships.transitiveFoundations.map((trans) => (
                        <button
                          key={trans.id}
                          type="button"
                          onClick={() => setSelectedNodeId(trans.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-400 text-xs font-mono hover:text-white transition-all text-left"
                        >
                          <span>{trans.title}</span>
                          <span className="text-[10px] text-neutral-500">(via Two-Pointers)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Downstream Unlocks */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-[#64748B] uppercase tracking-wider">
                    Downstream Unlocks
                  </div>
                  {relationships.directUnlocks.length > 0 || relationships.supportingUnlocks.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {relationships.directUnlocks.map((dep) => (
                        <button
                          key={dep.id}
                          type="button"
                          onClick={() => setSelectedNodeId(dep.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-300 text-xs font-mono hover:border-sky-500/40 hover:text-white transition-all text-left"
                        >
                          <CornerDownRight className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>{dep.title}</span>
                        </button>
                      ))}
                      {relationships.supportingUnlocks.map((dep) => (
                        <button
                          key={dep.id}
                          type="button"
                          onClick={() => setSelectedNodeId(dep.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-400 text-xs font-mono hover:border-sky-500/40 hover:text-white transition-all text-left"
                        >
                          <CornerDownRight className="w-3 h-3 text-sky-400/60 shrink-0" />
                          <span>{dep.title}</span>
                          <span className="text-[10px] text-neutral-500">(Bridge)</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400 italic">
                      Terminal topic in illustrative DAG segment.
                    </div>
                  )}
                </div>
              </div>

              {/* ── 5. ADAPTIVE RECOVERY EXPLICIT STATE DETAILS ─────── */}
              {mode === 'recovery' ? (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 font-semibold">
                    <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                    <span>EXPLICIT RECOVERY STATE MODEL</span>
                  </div>
                  <div className="text-xs text-[#CBD5E1] space-y-2 leading-relaxed">
                    <div>
                      <span className="text-neutral-400 font-mono text-[10px] uppercase block">
                        Friction Concept:
                      </span>
                      <strong className="text-white">Dynamic Sliding Window</strong> (off-by-one window contraction)
                    </div>
                    <div>
                      <span className="text-neutral-400 font-mono text-[10px] uppercase block">
                        Prerequisite Being Revisited:
                      </span>
                      <strong className="text-amber-300">Two-Pointer Bounds</strong> (re-anchoring monotonic interval shrink)
                    </div>
                    <div>
                      <span className="text-neutral-400 font-mono text-[10px] uppercase block">
                        Alternative Practice Route:
                      </span>
                      <span className="text-neutral-200">
                        {DEFAULT_RECOVERY_SCENARIO.alternativePracticeRoute.title}
                      </span>
                      <ul className="mt-1 list-disc list-inside text-[11px] text-[#94A3B8] space-y-0.5">
                        {DEFAULT_RECOVERY_SCENARIO.alternativePracticeRoute.exercises.map((ex) => (
                          <li key={ex}>{ex}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-neutral-400 font-mono text-[10px] uppercase block">
                        Return Condition:
                      </span>
                      <span className="text-emerald-400 font-mono text-[11px]">
                        {DEFAULT_RECOVERY_SCENARIO.returnCondition}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#070B14] border border-sky-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-400 font-semibold">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>NON-PUNITIVE ADAPTATION</span>
                  </div>
                  <div className="text-xs text-[#94A3B8] leading-relaxed">
                    When a learner struggles with this concept, Chakriva isolates the foundational invariant and offers targeted prerequisite reinforcement without deducting points, breaking streaks, or restarting modules.
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Link to Full Curriculum */}
            <Link to="/roadmaps" className="block w-full">
              <motion.button
                whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                type="button"
                className="w-full py-3 px-4 rounded-xl bg-[#0D111B] border border-white/[0.1] hover:border-sky-500/40 text-neutral-200 hover:text-white text-xs font-mono font-medium transition-all shadow-md flex items-center justify-center gap-2 group"
              >
                <GitBranch className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-12 transition-transform duration-200" />
                <span>Explore Full Curriculum DAGs</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 text-neutral-400 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingRoadmapSection;
