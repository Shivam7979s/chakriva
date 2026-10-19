import React, { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { EASE_DECEL } from '@/lib/motion';

/**
 * LivingLearningGraph — Creative Direction 06
 *
 * A living, interactive learning graph representing algorithmic concepts,
 * problem-solving invariants, and directed dependency progressions.
 *
 * Principles:
 * - Pure SVG-first architecture: sharp at any DPI, zero WebGL crash risk, accessible.
 * - 3-tier visual hierarchy: Focus Node -> Connected Prereqs/Dependents -> Ambient Nodes.
 * - Directional traveling pulses along active dependency edges.
 * - Hybrid 2D/3D depth with subtle pointer-responsive parallax tilt.
 * - Full keyboard navigation (Tab / Enter / Space / Escape).
 * - Full reduced-motion awareness.
 */

export interface GraphNode {
  id: string;
  label: string;
  shortCode: string;
  tier: 'foundation' | 'core' | 'advanced' | 'mastery';
  tierLabel: string;
  x: number;
  y: number;
  prerequisites: string[];
  dependents: string[];
  invariant: string;
  problemCount: number;
  description: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// Canonical demonstration dataset representing real algorithmic learning dependencies
export const DEMO_GRAPH_NODES: GraphNode[] = [
  {
    id: 'arrays',
    label: 'Arrays & Hashing',
    shortCode: 'ARR',
    tier: 'foundation',
    tierLabel: 'Foundational',
    x: 90,
    y: 140,
    prerequisites: [],
    dependents: ['two-pointers', 'sliding-window'],
    invariant: 'Contiguous memory addressing & O(1) expected hash lookups.',
    problemCount: 42,
    description:
      'Master key-value hashing, prefix sums, and frequency maps before progressing to multi-index traversal.',
  },
  {
    id: 'two-pointers',
    label: 'Two Pointers',
    shortCode: '2PT',
    tier: 'core',
    tierLabel: 'Core Invariant',
    x: 210,
    y: 75,
    prerequisites: ['arrays'],
    dependents: ['binary-search'],
    invariant: 'Monotonic index convergence eliminating brute-force search space.',
    problemCount: 28,
    description:
      'Opposite-direction and fast-slow pointer invariants on sorted sequences, reducing O(N²) to O(N).',
  },
  {
    id: 'sliding-window',
    label: 'Sliding Window',
    shortCode: 'WIN',
    tier: 'core',
    tierLabel: 'Core Invariant',
    x: 240,
    y: 235,
    prerequisites: ['arrays'],
    dependents: ['trees'],
    invariant: 'Dynamic contiguous subsegment state preservation across bounds.',
    problemCount: 24,
    description:
      'Maintain running sum, window character frequencies, or monotonic deques across variable boundaries.',
  },
  {
    id: 'binary-search',
    label: 'Binary Search',
    shortCode: 'BIN',
    tier: 'core',
    tierLabel: 'Core Invariant',
    x: 360,
    y: 95,
    prerequisites: ['two-pointers'],
    dependents: ['trees', 'dp'],
    invariant: 'Monotonic predicate boundary partitioning in logarithmic steps.',
    problemCount: 36,
    description:
      'Partitioning solution spaces via predicate tests: f(mid) is monotonic, pruning half the candidate space each step.',
  },
  {
    id: 'trees',
    label: 'Binary Trees & BST',
    shortCode: 'TRE',
    tier: 'advanced',
    tierLabel: 'Hierarchical',
    x: 400,
    y: 265,
    prerequisites: ['sliding-window', 'binary-search'],
    dependents: ['graphs'],
    invariant: 'Recursive subtree divide-and-conquer & BST ordering properties.',
    problemCount: 48,
    description:
      'Structural recursion, lowest common ancestors, tree diameter, and balanced search invariants.',
  },
  {
    id: 'graphs',
    label: 'Graph Traversals',
    shortCode: 'GRP',
    tier: 'advanced',
    tierLabel: 'Topological',
    x: 520,
    y: 225,
    prerequisites: ['trees'],
    dependents: ['dp'],
    invariant: 'State-space exploration, topological sorting & cycle detection.',
    problemCount: 39,
    description:
      'Breadth-first shortest paths, depth-first cycle pruning, and DAG dependency evaluation.',
  },
  {
    id: 'dp',
    label: 'Dynamic Programming',
    shortCode: 'DP',
    tier: 'mastery',
    tierLabel: 'Mastery',
    x: 588,
    y: 120,
    prerequisites: ['binary-search', 'graphs'],
    dependents: [],
    invariant: 'Optimal substructure & memoized acyclic state transitions.',
    problemCount: 52,
    description:
      'State formulation, topological transition orders, space optimization from O(N) to O(1) variables.',
  },
  {
    id: 'invariants',
    label: 'State Invariants',
    shortCode: 'INV',
    tier: 'foundation',
    tierLabel: 'Meta Principle',
    x: 270,
    y: 385,
    prerequisites: [],
    dependents: ['sliding-window', 'trees'],
    invariant: 'Loop induction proofs: holds before loop, preserved across steps.',
    problemCount: 18,
    description:
      'The foundational mathematical lens connecting every pattern in the Chakriva curriculum.',
  },
];

export const DEMO_GRAPH_EDGES: GraphEdge[] = [
  { id: 'e-arr-2pt', source: 'arrays', target: 'two-pointers' },
  { id: 'e-arr-win', source: 'arrays', target: 'sliding-window' },
  { id: 'e-2pt-bin', source: 'two-pointers', target: 'binary-search' },
  { id: 'e-win-tre', source: 'sliding-window', target: 'trees' },
  { id: 'e-bin-tre', source: 'binary-search', target: 'trees' },
  { id: 'e-bin-dp', source: 'binary-search', target: 'dp' },
  { id: 'e-tre-grp', source: 'trees', target: 'graphs' },
  { id: 'e-grp-dp', source: 'graphs', target: 'dp' },
  { id: 'e-inv-win', source: 'invariants', target: 'sliding-window' },
  { id: 'e-inv-tre', source: 'invariants', target: 'trees' },
];

interface LivingLearningGraphProps {
  className?: string;
  onSelectNode?: (node: GraphNode | null) => void;
}

export const LivingLearningGraph: React.FC<LivingLearningGraphProps> = ({
  className = '',
  onSelectNode,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('binary-search');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const filterId = useId();

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Subtle parallax tilt tracking (damped)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    // Keep tilt restrained: max +/- 4 degrees
    setTilt({
      rx: -y * 6,
      ry: x * 8,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setHoveredNodeId(null);
  };

  const activeNodeId = hoveredNodeId || selectedNodeId;
  const activeNode = DEMO_GRAPH_NODES.find((n) => n.id === activeNodeId);
  const selectedNode = DEMO_GRAPH_NODES.find((n) => n.id === selectedNodeId);

  // Notify parent if callback provided
  useEffect(() => {
    if (onSelectNode) {
      onSelectNode(selectedNode || null);
    }
  }, [selectedNode, onSelectNode]);

  // Keyboard navigation handler for escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeId('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNodeClick = (nodeId: string) => {
    if (selectedNodeId === nodeId) {
      // Toggle selection or re-focus
      setSelectedNodeId(nodeId);
    } else {
      setSelectedNodeId(nodeId);
    }
  };

  // Helper to determine edge relationship with active node
  const isEdgeHighlighted = (edge: GraphEdge) => {
    if (!activeNodeId) return false;
    return edge.source === activeNodeId || edge.target === activeNodeId;
  };

  // Compute curved SVG path between two nodes
  const getCurvePath = (sourceId: string, targetId: string) => {
    const s = DEMO_GRAPH_NODES.find((n) => n.id === sourceId);
    const t = DEMO_GRAPH_NODES.find((n) => n.id === targetId);
    if (!s || !t) return '';

    const dx = t.x - s.x;
    // Cubic bezier curve with horizontal control bias for directed flow
    const cx1 = s.x + dx * 0.45;
    const cy1 = s.y;
    const cx2 = t.x - dx * 0.45;
    const cy2 = t.y;

    return `M ${s.x} ${s.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${t.x} ${t.y}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none flex flex-col items-center justify-center ${className}`}
      style={{
        perspective: '1200px',
      }}
    >
      {/* 1. Ambient Illumination Layer (Sapphire / Cyan Radial Bloom) */}
      <div
        className="absolute inset-0 pointer-events-none -z-10 rounded-2xl opacity-75 transition-opacity duration-700"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 55% 45%, rgba(37,99,235,0.14) 0%, rgba(6,182,212,0.06) 45%, transparent 75%)',
        }}
      />

      {/* 2. Graph Surface with 3D Tilt Transform */}
      <div
        className="w-full relative transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: prefersReducedMotion
            ? 'none'
            : `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
        }}
      >
        {/* SVG Living Graph Canvas */}
        <div className="relative w-full aspect-[680/460] max-h-[500px] overflow-hidden rounded-xl border border-white/[0.05] bg-[#070A10]/50 backdrop-blur-sm">
          <svg
            viewBox="0 0 680 460"
            className="w-full h-full overflow-hidden"
            role="region"
            aria-label="Interactive Algorithmic Learning Graph"
          >
            <defs>
              {/* Subtle localized glow filter for focus nodes */}
              <filter id={`${filterId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Edge Gradient for highlighted transitions */}
              <linearGradient id={`${filterId}-active-edge`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.9" />
              </linearGradient>

              {/* Background grid pattern */}
              <pattern
                id={`${filterId}-grid`}
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="16" cy="16" r="0.75" fill="rgba(255,255,255,0.08)" />
              </pattern>
            </defs>

            {/* Subtle Datum Grid Background */}
            <rect width="680" height="460" fill={`url(#${filterId}-grid)`} opacity="0.6" />

            {/* Subtle Horizon / Depth Guide Ring */}
            <ellipse
              cx="350"
              cy="230"
              rx="280"
              ry="180"
              fill="none"
              stroke="rgba(56,189,248,0.04)"
              strokeDasharray="4 8"
            />

            {/* ── EDGES / DEPENDENCY CONNECTOR PATHS ─────────────────── */}
            <g className="edges-layer" role="presentation">
              {DEMO_GRAPH_EDGES.map((edge) => {
                const pathD = getCurvePath(edge.source, edge.target);
                const isHighlighted = isEdgeHighlighted(edge);

                return (
                  <g key={edge.id} className="transition-all duration-300">
                    {/* Background wider hit stroke */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={
                        isHighlighted
                          ? 'rgba(56,189,248,0.25)'
                          : 'rgba(255,255,255,0.04)'
                      }
                      strokeWidth={isHighlighted ? 4 : 2}
                      strokeLinecap="round"
                    />

                    {/* Crisp foreground connector line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={
                        isHighlighted
                          ? `url(#${filterId}-active-edge)`
                          : 'rgba(255,255,255,0.13)'
                      }
                      strokeWidth={isHighlighted ? 2 : 1.25}
                      strokeDasharray={isHighlighted ? 'none' : '3 3'}
                      className="transition-all duration-300"
                    />

                    {/* Traveling Directional Light Pulse along highlighted edge */}
                    {isHighlighted && !prefersReducedMotion && (
                      <circle r="3" fill="#38BDF8" className="filter drop-shadow-[0_0_6px_#38BDF8]">
                        <animateMotion
                          path={pathD}
                          dur="2.4s"
                          repeatCount="indefinite"
                          keyPoints="0;1"
                          keyTimes="0;1"
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </g>

            {/* ── NODES / PROGRAMMING INVARIANT NODES ─────────────────── */}
            <g className="nodes-layer">
              {DEMO_GRAPH_NODES.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isPrereq =
                  activeNode && activeNode.prerequisites.includes(node.id);
                const isDependent =
                  activeNode && activeNode.dependents.includes(node.id);
                const isConnected = isSelected || isHovered || isPrereq || isDependent;

                // Visual tiering
                let textColor = '#64748B'; // slate-500
                let borderColor = 'rgba(255,255,255,0.08)';
                let bgFill = '#0A0D14';
                let glowFilter = '';

                if (isSelected || isHovered) {
                  textColor = '#FFFFFF';
                  borderColor = '#38BDF8';
                  bgFill = '#0E1726';
                  glowFilter = `url(#${filterId}-glow)`;
                } else if (isPrereq) {
                  textColor = '#93C5FD'; // blue-300
                  borderColor = 'rgba(59,130,246,0.6)';
                  bgFill = '#0C1322';
                } else if (isDependent) {
                  textColor = '#67E8F9'; // cyan-300
                  borderColor = 'rgba(6,182,212,0.6)';
                  bgFill = '#081720';
                }

                const nodeWidth =
                  node.id === 'dp' ? 144 : node.id === 'arrays' ? 134 : 126;
                const nodeHeight = 36;
                const x = node.x - nodeWidth / 2;
                const y = node.y - nodeHeight / 2;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${x}, ${y})`}
                    onClick={() => handleNodeClick(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNodeClick(node.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Node ${node.label}, ${node.tierLabel}. ${
                      isSelected ? 'Currently selected.' : 'Click to select.'
                    }`}
                    aria-pressed={isSelected}
                    className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 group"
                  >
                    {/* Outer Focus Glow for Selected */}
                    {isSelected && (
                      <rect
                        x="-3"
                        y="-3"
                        width={nodeWidth + 6}
                        height={nodeHeight + 6}
                        rx="12"
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        filter={glowFilter}
                        className="animate-pulse"
                      />
                    )}

                    {/* Node Background Surface */}
                    <rect
                      x="0"
                      y="0"
                      width={nodeWidth}
                      height={nodeHeight}
                      rx="9"
                      fill={bgFill}
                      stroke={borderColor}
                      strokeWidth={isSelected ? 1.75 : 1}
                      className="transition-colors duration-200"
                    />

                    {/* Left Tier Indicator Badge */}
                    <rect
                      x="6"
                      y="6"
                      width="26"
                      height="24"
                      rx="5"
                      fill={
                        isSelected
                          ? 'rgba(56,189,248,0.2)'
                          : isConnected
                          ? 'rgba(37,99,235,0.15)'
                          : 'rgba(255,255,255,0.04)'
                      }
                    />
                    <text
                      x="19"
                      y="21"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill={isSelected ? '#38BDF8' : isConnected ? '#93C5FD' : '#64748B'}
                    >
                      {node.shortCode}
                    </text>

                    {/* Node Text Label */}
                    <text
                      x="38"
                      y="22"
                      fontSize={node.id === 'dp' ? '10' : '11'}
                      fontWeight={isSelected ? '600' : '500'}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fill={textColor}
                      className="transition-colors duration-200"
                    >
                      {node.label}
                    </text>

                    {/* Status Dot on Right */}
                    <circle
                      cx={nodeWidth - 10}
                      cy={nodeHeight / 2}
                      r={isSelected ? 3.5 : 2}
                      fill={
                        isSelected
                          ? '#38BDF8'
                          : isPrereq
                          ? '#3B82F6'
                          : isDependent
                          ? '#06B6D4'
                          : 'rgba(255,255,255,0.2)'
                      }
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* 3. Interactive Detail Panel Overlay (Docked Bottom-Right) */}
        <AnimatePresence mode="wait">
          {selectedNode && (
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: EASE_DECEL }}
              className="mt-3 w-full bg-[#0B0F19]/95 backdrop-blur-xl border border-white/[0.1] rounded-xl p-3.5 sm:p-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-400/20 text-sky-400 font-semibold uppercase tracking-wider">
                      {selectedNode.tierLabel}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {selectedNode.problemCount} Invariant Problems
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>{selectedNode.label}</span>
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNodeId('')}
                  aria-label="Clear node detail view"
                  className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Invariant Rule Spec Box */}
              <div className="mt-2.5 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.05] text-[11px] font-mono text-sky-200/90 leading-snug">
                <span className="text-sky-400/80 font-bold mr-1.5">&gt;_ INVARIANT:</span>
                {selectedNode.invariant}
              </div>

              {/* Concept Description */}
              <p className="mt-2 text-xs text-neutral-300/80 leading-relaxed font-sans">
                {selectedNode.description}
              </p>

              {/* Prerequisites & Dependents Navigation Pills */}
              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-neutral-500 font-mono text-[10px] uppercase">
                    Prereqs:
                  </span>
                  {selectedNode.prerequisites.length > 0 ? (
                    selectedNode.prerequisites.map((pId) => {
                      const pNode = DEMO_GRAPH_NODES.find((n) => n.id === pId);
                      return (
                        <button
                          key={pId}
                          type="button"
                          onClick={() => setSelectedNodeId(pId)}
                          className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-mono text-[10px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 cursor-pointer"
                        >
                          ← {pNode?.label || pId}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-neutral-500 text-[10px] italic">Root Foundation</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-neutral-500 font-mono text-[10px] uppercase">
                    Leads to:
                  </span>
                  {selectedNode.dependents.length > 0 ? (
                    selectedNode.dependents.map((dId) => {
                      const dNode = DEMO_GRAPH_NODES.find((n) => n.id === dId);
                      return (
                        <button
                          key={dId}
                          type="button"
                          onClick={() => setSelectedNodeId(dId)}
                          className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-[10px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 cursor-pointer"
                        >
                          {dNode?.label || dId} →
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-emerald-400 text-[10px] font-mono">Mastery Target</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Graph Legend & Demonstration Label */}
        <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-neutral-500 px-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>Active Focus</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>Prerequisite</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Dependent</span>
            </span>
          </div>
          <span className="text-neutral-400/80 hidden sm:inline">
            Interactive Dependency DAG • Select Node to Explore
          </span>
        </div>
      </div>
    </div>
  );
};

export default LivingLearningGraph;
