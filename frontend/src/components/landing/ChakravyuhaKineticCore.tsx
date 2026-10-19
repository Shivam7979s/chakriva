import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface OrbitNode {
  id: string;
  label: string;
  category: string;
  angleDeg: number;
  radius: number;
  pulseColor: string;
}

const ORBIT_NODES: OrbitNode[] = [
  {
    id: 'monotonic',
    label: 'Monotonic Bounds',
    category: 'INVARIANT 01',
    angleDeg: 35,
    radius: 175,
    pulseColor: '#60A5FA',
  },
  {
    id: 'halving',
    label: 'Logarithmic Halving',
    category: 'INVARIANT 02',
    angleDeg: 145,
    radius: 235,
    pulseColor: '#34D399',
  },
  {
    id: 'dag',
    label: 'Optimal Substructure',
    category: 'INVARIANT 03',
    angleDeg: 215,
    radius: 295,
    pulseColor: '#818CF8',
  },
  {
    id: 'topo',
    label: 'Topological Order',
    category: 'INVARIANT 04',
    angleDeg: 320,
    radius: 235,
    pulseColor: '#F59E0B',
  },
];

/**
 * ChakravyuhaKineticCore — The Living Concentric Algorithmic Labyrinth
 * 
 * Replaces clunky code blocks with an elite, hypnotic visual artifact:
 * - Concentric precision datum rings representing the 7 concentric tiers of algorithmic mastery.
 * - Interactive magnetic mouse-tilt physics with damped inertia.
 * - Orbital synaptic nodes that pulse light across concentric tracks.
 * - Central Core Sanctum representing the verified algorithmic invariant.
 * - 100% SVG/WebGL-grade precision: crisp at any retina resolution, zero layout clutter.
 */
export const ChakravyuhaKineticCore: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tilt physics using Motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 24, stiffness: 120, mass: 0.6 };
  const tiltX = useSpring(useTransform(mouseY, [-300, 300], [8, -8]), springConfig);
  const tiltY = useSpring(useTransform(mouseX, [-300, 300], [-8, 8]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-4xl mx-auto flex items-center justify-center my-4 sm:my-8 select-none"
      style={{ perspective: 1200 }}
    >
      <motion.div
        style={{
          rotateX: tiltX,
          rotateY: tiltY,
          transformStyle: 'preserve-3d',
        }}
        className="relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] md:w-[560px] md:h-[560px] flex items-center justify-center"
      >
        {/* Ambient Core Backing Glow */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.14)_0%,rgba(56,189,248,0.06)_40%,transparent_70%)] blur-2xl pointer-events-none -z-10" />

        {/* Concentric SVG Astrolabe Labyrinth */}
        <svg
          viewBox="-300 -300 600 600"
          className="w-full h-full overflow-visible pointer-events-auto"
        >
          <defs>
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#4F46E5" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="ringShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.03" />
            </linearGradient>

            <filter id="bloom" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Outermost Ambient Ring (Radius: 295) */}
          <circle
            r="295"
            cx="0"
            cy="0"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
            strokeDasharray="4 8"
          />

          {/* 2. Ring 04 with Precision Ticks (Radius: 265) */}
          <circle
            r="265"
            cx="0"
            cy="0"
            fill="none"
            stroke="url(#ringShine)"
            strokeWidth="1"
          />
          {Array.from({ length: 48 }).map((_, i) => {
            const angle = (i * 360) / 48;
            const isMajor = i % 4 === 0;
            const r1 = 265;
            const r2 = isMajor ? 257 : 261;
            const rad = (angle * Math.PI) / 180;
            const x1 = Math.cos(rad) * r1;
            const y1 = Math.sin(rad) * r1;
            const x2 = Math.cos(rad) * r2;
            const y2 = Math.sin(rad) * r2;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.07)'}
                strokeWidth={isMajor ? 1.5 : 0.75}
              />
            );
          })}

          {/* 3. Ring 03: Rotating Kinetic Arc (Radius: 215) */}
          <g className="animate-[spin_48s_linear_infinite]">
            <circle
              r="215"
              cx="0"
              cy="0"
              fill="none"
              stroke="rgba(99, 102, 241, 0.25)"
              strokeWidth="1.5"
              strokeDasharray="140 38 60 70"
            />
            <circle
              r="215"
              cx="0"
              cy="0"
              fill="none"
              stroke="#A5B4FC"
              strokeWidth="2.5"
              strokeDasharray="24 600"
              filter="url(#bloom)"
            />
          </g>

          {/* 4. Ring 02: Counter-Rotating Arc (Radius: 165) */}
          <g className="animate-[spin_36s_linear_infinite_reverse]">
            <circle
              r="165"
              cx="0"
              cy="0"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
              strokeDasharray="8 6"
            />
            <circle
              r="165"
              cx="0"
              cy="0"
              fill="none"
              stroke="rgba(56, 189, 248, 0.6)"
              strokeWidth="2"
              strokeDasharray="40 400"
              filter="url(#bloom)"
            />
          </g>

          {/* 5. Ring 01: Inner Resonant Orbit (Radius: 115) */}
          <circle
            r="115"
            cx="0"
            cy="0"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1"
          />

          {/* Coordinate Crosshairs (Subtle technical registration lines) */}
          <line
            x1="-140"
            y1="0"
            x2="140"
            y2="0"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="0.75"
            strokeDasharray="4 6"
          />
          <line
            x1="0"
            y1="-140"
            x2="0"
            y2="140"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="0.75"
            strokeDasharray="4 6"
          />

          {/* 6. Central Invariant Sanctum (Radius: 64) */}
          <circle r="64" cx="0" cy="0" fill="url(#coreGlow)" />
          <circle
            r="56"
            cx="0"
            cy="0"
            fill="#080C16"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1.5"
          />
          <circle
            r="42"
            cx="0"
            cy="0"
            fill="none"
            stroke="rgba(99, 102, 241, 0.4)"
            strokeWidth="1"
            strokeDasharray="6 4"
            className="animate-[spin_20s_linear_infinite]"
          />

          {/* Central Sanctum Icon Glyph */}
          <g className="translate-x-[-12px] translate-y-[-12px]">
            <circle cx="12" cy="12" r="6" fill="#F8FAFC" filter="url(#bloom)" />
            <circle cx="12" cy="12" r="14" fill="none" stroke="#6366F1" strokeWidth="1" />
          </g>

          {/* Synaptic Orbital Nodes */}
          {ORBIT_NODES.map((node) => {
            const rad = (node.angleDeg * Math.PI) / 180;
            const x = Math.cos(rad) * node.radius;
            const y = Math.sin(rad) * node.radius;
            const isHovered = activeNode === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
                className="cursor-pointer group"
              >
                {/* Connecting Synaptic Tether back to center */}
                <line
                  x1={0}
                  y1={0}
                  x2={-x * 0.75}
                  y2={-y * 0.75}
                  stroke={isHovered ? node.pulseColor : 'rgba(255, 255, 255, 0.05)'}
                  strokeWidth={isHovered ? 1.5 : 0.75}
                  strokeDasharray="2 4"
                  className="transition-colors duration-300"
                />

                {/* Node Outer Ripple Ring */}
                <circle
                  r={isHovered ? 16 : 10}
                  fill={isHovered ? `${node.pulseColor}22` : 'rgba(8, 12, 22, 0.8)'}
                  stroke={isHovered ? node.pulseColor : 'rgba(255, 255, 255, 0.25)'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-300"
                  filter={isHovered ? 'url(#bloom)' : undefined}
                />

                {/* Node Inner Core Dot */}
                <circle
                  r="3"
                  fill={isHovered ? '#FFFFFF' : node.pulseColor}
                  className="transition-colors duration-200"
                />

                {/* Micro Label Pill Tag (Pure SVG Typography) */}
                <g transform="translate(18, -12)">
                  <rect
                    x="-6"
                    y="-4"
                    width={node.label.length * 6.8 + 24}
                    height="24"
                    rx="12"
                    fill="#080C15"
                    stroke={isHovered ? node.pulseColor : 'rgba(255, 255, 255, 0.12)'}
                    strokeWidth="1"
                    className="transition-colors duration-300"
                  />
                  <text
                    x="8"
                    y="12"
                    fill="#F8FAFC"
                    fontSize="10"
                    fontFamily="Inter, sans-serif"
                    fontWeight="500"
                    letterSpacing="0.02em"
                  >
                    {node.label}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Floating Specular Glass HUD Card (Subtle, luxury hardware plaque) */}
        <div className="absolute -bottom-6 sm:-bottom-8 px-5 py-2.5 rounded-full bg-[#080B14]/85 border border-white/[0.1] shadow-[0_12px_40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl flex items-center gap-3 text-xs font-mono text-neutral-300 z-20">
          <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818CF8] animate-pulse" />
          <span className="text-neutral-400 font-medium">CHAKRAVYUHA:</span>
          <span className="text-white font-semibold">7-TIER CONCENTRIC INVARIANT ENGINE</span>
          <span className="text-white/20 hidden sm:inline">•</span>
          <span className="text-emerald-400 hidden sm:inline font-mono">DAG SYNC ACTIVE</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ChakravyuhaKineticCore;
