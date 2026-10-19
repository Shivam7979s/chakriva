import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Activity, Zap, ShieldCheck } from 'lucide-react';
import { ChakravyuhaKineticCore } from './ChakravyuhaKineticCore';

/**
 * LandingHero — High-Craft Editorial Architecture
 * 
 * Embodies the true identity of Chakriva:
 * - Authoritative editorial positioning: "Master the Invariant."
 * - Architectural kicker: [ CHAKRIVA LABS • COGNITIVE REASONING ARCHITECTURE ]
 * - The Centerpiece: The "Chakravyuha Kinetic Core" — a hypnotic, concentric orbital art piece representing algorithmic mastery.
 * - Deep Zinc Obsidian void (#040508 / #07080C) with generous, luxury negative space.
 * - Tactile, chiseled CTAs that guide engineers naturally into the platform.
 */
export const LandingHero: React.FC = () => {
  const [mouseGlow, setMouseGlow] = useState({ x: 50, y: 35 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMouseGlow({ x, y });
  };

  const handleScrollToPlatform = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('learning-loop');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      id="hero"
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-[92vh] lg:min-h-[98vh] pt-28 sm:pt-32 lg:pt-36 pb-8 sm:pb-12 flex flex-col justify-between items-center overflow-hidden bg-[#040508] border-b border-white/[0.06]"
    >
      {/* 1. Deep Atmospheric Radial Lights & Mouse-Tracked Halo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-700 -z-10"
        style={{
          background: `radial-gradient(950px circle at ${mouseGlow.x}% ${mouseGlow.y}%, rgba(99, 102, 241, 0.07), transparent 70%)`,
        }}
      />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-[radial-gradient(ellipse_at_center,#0C1124_0%,rgba(4,5,8,0)_75%)] pointer-events-none blur-[150px] opacity-80 -z-10" />

      {/* 2. Hero Headline Lockup (Bold, Confident, Generous Negative Space) */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center mt-2 mb-4">
        {/* Architectural Kicker Plaque */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#090C16]/90 border border-white/[0.08] text-neutral-400 text-[11px] font-mono tracking-wider mb-6 shadow-[0_4px_24px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#6366F1] animate-pulse shrink-0" />
          <span className="tracking-widest uppercase text-neutral-300 font-semibold">
            CHAKRIVA LABS
          </span>
          <span className="text-white/20 shrink-0">•</span>
          <span className="text-neutral-400 tracking-widest uppercase font-mono">
            COGNITIVE REASONING ARCHITECTURE
          </span>
        </div>

        {/* Master Headline: Two Intentional, Powerful Lines */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-semibold tracking-[-0.038em] text-[#F8FAFC] leading-[1.04] max-w-4xl mx-auto font-sans drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
          <span>Master the Invariant.</span>
          <span className="block mt-1 bg-gradient-to-r from-[#FFFFFF] via-[#E2E8F0] to-[#94A3B8] bg-clip-text text-transparent">
            Break the algorithmic loop.
          </span>
        </h1>

        {/* Subtitle: High-Precision Domain Positioning */}
        <p className="mt-5 text-base sm:text-lg md:text-[19px] text-[#94A3B8] font-normal max-w-2xl mx-auto leading-relaxed tracking-[-0.012em]">
          An intelligent reasoning system for mastering algorithms, directed dependency DAGs, and systems engineering standards.
        </p>

        {/* Tactile CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          {/* Primary CTA: High-contrast off-white pill */}
          <Link
            to="/app/diagnostic"
            className="group bg-[#F8FAFC] text-[#07090E] font-medium px-6 py-3 rounded-full text-sm hover:bg-white shadow-[0_4px_24px_rgba(255,255,255,0.22)] hover:shadow-[0_6px_32px_rgba(255,255,255,0.32)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer font-sans"
          >
            <span>Take Diagnostic Test</span>
            <ArrowRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Secondary CTA: Translucent dark obsidian glass pill */}
          <a
            href="#learning-loop"
            onClick={handleScrollToPlatform}
            className="bg-[#0A0D18]/85 backdrop-blur-md text-[#CBD5E1] hover:text-[#F8FAFC] border border-white/[0.12] hover:border-white/[0.28] px-6 py-3 rounded-full text-sm hover:bg-white/[0.04] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer font-sans"
          >
            <span>Explore Chakriva</span>
            <ArrowDown className="w-4 h-4 text-[#94A3B8]" />
          </a>
        </div>
      </div>

      {/* 3. The Centerpiece: The Living Concentric Labyrinth (Chakravyuha Core) */}
      <ChakravyuhaKineticCore />

      {/* 4. Grounding Technical Telemetry Bridge into Section 2 */}
      <div className="w-full border-t border-white/[0.06] bg-[#070911]/80 backdrop-blur-md relative z-20 mt-4 sm:mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-white/[0.05]">
            {/* Metric 1 */}
            <div className="flex flex-col items-center justify-center py-0.5 sm:px-4">
              <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-indigo-400" />
                <span>ADAPTIVE DIAGNOSTIC</span>
              </span>
              <span className="text-xs font-mono text-neutral-300 font-semibold mt-0.5">
                14 COGNITIVE SIGNALS
              </span>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col items-center justify-center py-0.5 sm:px-4 pt-2 sm:pt-0.5">
              <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>ISOLATED SANDBOX RUNTIME</span>
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold mt-0.5">
                256MB DOCKER CGROUP v2
              </span>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col items-center justify-center py-0.5 sm:px-4 pt-2 sm:pt-0.5">
              <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-sky-400" />
                <span>CURRICULUM ENGINE</span>
              </span>
              <span className="text-xs font-mono text-sky-400 font-semibold mt-0.5">
                DIRECTED INVARIANT DAG
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
