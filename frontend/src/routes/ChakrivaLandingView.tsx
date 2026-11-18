import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChakrivaLiquidSilkCanvas } from '../components/landing/ChakrivaLiquidSilkCanvas';
import {
  ChevronRight,
  Sparkles,
  Check,
  Menu,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Code2,
  Calendar,
  BookOpen,
  Zap,
  Activity,
  Trophy,
  Users,
  ChevronDown,
  Compass,
  Cpu,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                              SHARED PRIMITIVES                             */
/* -------------------------------------------------------------------------- */

export const ChakrivaLogoMark: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <img
    src="/chakriva-logo.svg"
    alt="CHAKRIVA"
    className={`${className} object-contain transition-transform duration-300 group-hover:scale-105 flex-shrink-0`}
  />
);



const gradientStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, #091020 0%, #0B2551 12.5%, #A4F4FD 32.5%, #00d2ff 50%, #0B2551 67.5%, #091020 87.5%, #091020 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  filter: 'url(#c3-noise)',
};

/* -------------------------------------------------------------------------- */
/*                            MAIN LANDING VIEW                               */
/* -------------------------------------------------------------------------- */

export const ChakrivaLandingView: React.FC = () => {
  const [yearly, setYearly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCodeLang, setActiveCodeLang] = useState<'java' | 'cpp' | 'python'>('java');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const navLinks = [
    { name: 'Problems', href: '/problems' },
    { name: 'Roadmap', href: '/roadmaps' },
    { name: 'Sheets', href: '/sheets' },
    { name: 'Learn', href: '/learn' },
    { name: 'Chakriva AI', href: '/ai' },
    { name: 'Contests', href: '/contests' },
  ];

  const targetCompanies = [
    'Google',
    'Meta',
    'Apple',
    'Amazon',
    'Microsoft',
    'Uber',
    'Stripe',
    'Atlassian',
  ];

  const codeSnippets = {
    java: [
      { text: 'class Solution {', indent: 0, color: 'text-purple-400' },
      { text: '    public int trap(int[] height) {', indent: 1, color: 'text-blue-400' },
      { text: '        int left = 0, right = height.length - 1;', indent: 2, color: 'text-white/80' },
      { text: '        int leftMax = 0, rightMax = 0, water = 0;', indent: 2, color: 'text-white/80' },
      { text: '        while (left < right) {', indent: 2, color: 'text-purple-400' },
      { text: '            if (height[left] < height[right]) {', indent: 3, color: 'text-purple-400' },
      { text: '                if (height[left] >= leftMax) leftMax = height[left];', indent: 4, color: 'text-cyan-300' },
      { text: '                else water += leftMax - height[left];', indent: 4, color: 'text-cyan-300' },
      { text: '                left++;', indent: 4, color: 'text-white/70' },
      { text: '            } else {', indent: 3, color: 'text-purple-400' },
      { text: '                if (height[right] >= rightMax) rightMax = height[right];', indent: 4, color: 'text-cyan-300' },
      { text: '                else water += rightMax - height[right];', indent: 4, color: 'text-cyan-300' },
      { text: '                right--;', indent: 4, color: 'text-white/70' },
      { text: '            }', indent: 3, color: 'text-purple-400' },
      { text: '        }', indent: 2, color: 'text-purple-400' },
      { text: '        return water;', indent: 2, color: 'text-emerald-300' },
      { text: '    }', indent: 1, color: 'text-blue-400' },
      { text: '}', indent: 0, color: 'text-purple-400' },
    ],
    cpp: [
      { text: 'class Solution {', indent: 0, color: 'text-purple-400' },
      { text: 'public:', indent: 0, color: 'text-purple-400' },
      { text: '    int trap(vector<int>& height) {', indent: 1, color: 'text-blue-400' },
      { text: '        int l = 0, r = height.size() - 1;', indent: 2, color: 'text-white/80' },
      { text: '        int lMax = 0, rMax = 0, ans = 0;', indent: 2, color: 'text-white/80' },
      { text: '        while (l < r) {', indent: 2, color: 'text-purple-400' },
      { text: '            if (height[l] < height[r]) {', indent: 3, color: 'text-purple-400' },
      { text: '                height[l] >= lMax ? lMax = height[l] : ans += lMax - height[l];', indent: 4, color: 'text-cyan-300' },
      { text: '                l++;', indent: 4, color: 'text-white/70' },
      { text: '            } else {', indent: 3, color: 'text-purple-400' },
      { text: '                height[r] >= rMax ? rMax = height[r] : ans += rMax - height[r];', indent: 4, color: 'text-cyan-300' },
      { text: '                r--;', indent: 4, color: 'text-white/70' },
      { text: '            }', indent: 3, color: 'text-purple-400' },
      { text: '        }', indent: 2, color: 'text-purple-400' },
      { text: '        return ans;', indent: 2, color: 'text-emerald-300' },
      { text: '    }', indent: 1, color: 'text-blue-400' },
      { text: '};', indent: 0, color: 'text-purple-400' },
    ],
    python: [
      { text: 'class Solution:', indent: 0, color: 'text-purple-400' },
      { text: '    def trap(self, height: list[int]) -> int:', indent: 1, color: 'text-blue-400' },
      { text: '        l, r = 0, len(height) - 1', indent: 2, color: 'text-white/80' },
      { text: '        l_max, r_max, water = 0, 0, 0', indent: 2, color: 'text-white/80' },
      { text: '        while l < r:', indent: 2, color: 'text-purple-400' },
      { text: '            if height[l] < height[r]:', indent: 3, color: 'text-purple-400' },
      { text: '                l_max = max(l_max, height[l])', indent: 4, color: 'text-cyan-300' },
      { text: '                water += l_max - height[l]', indent: 4, color: 'text-cyan-300' },
      { text: '                l += 1', indent: 4, color: 'text-white/70' },
      { text: '            else:', indent: 3, color: 'text-purple-400' },
      { text: '                r_max = max(r_max, height[r])', indent: 4, color: 'text-cyan-300' },
      { text: '                water += r_max - height[r]', indent: 4, color: 'text-cyan-300' },
      { text: '                r -= 1', indent: 4, color: 'text-white/70' },
      { text: '        return water', indent: 2, color: 'text-emerald-300' },
    ],
  };

  const comparisonRows = [
    {
      feature: 'Weekly Schedule Adaptation',
      staticSheets: 'Rigid checklist; builds guilt when you miss a day',
      traditional: 'No schedule engine; random problem grinding',
      chakriva: 'Dynamic Mon–Sun rollover based on your true hours',
      highlight: true,
    },
    {
      feature: 'Test Suite Rigor',
      staticSheets: 'None (manual checkbox)',
      traditional: 'Often weak corner cases & hidden random limits',
      chakriva: '80 / 150 / 200 Canonical Test Suites per problem',
      highlight: true,
    },
    {
      feature: 'AI Mistake Intelligence',
      staticSheets: 'None',
      traditional: 'Raw stdout error or generic ChatGPT sidebar',
      chakriva: 'Tracks recurring boundary & memory patterns over time',
      highlight: true,
    },
    {
      feature: 'Prerequisite Concept Graph',
      staticSheets: 'Linear unguided rows',
      traditional: 'Isolated problems without dependency flow',
      chakriva: 'Interactive DAG showing what concepts unlock next',
      highlight: false,
    },
    {
      feature: 'Sandboxed Multi-Language Judge',
      staticSheets: 'Manual IDE testing',
      traditional: 'Shared containers with unpredictable GC pauses',
      chakriva: 'Strictly isolated runner workers with durable recovery',
      highlight: false,
    },
  ];

  const faqs = [
    {
      q: 'How does the Adaptive Roadmap reschedule when I miss a day?',
      a: "Unlike static sheets that mark you as 'behind schedule,' Chakriva's capacity engine redistributes incomplete tasks across your upcoming high-availability days (e.g. your weekend buffer). It recalibrates daily velocity so you stay on track for your target company deadline without burnout.",
    },
    {
      q: 'What programming languages does the Chakriva judge support?',
      a: 'Java 21 serves as our primary anchor language with optimized JVM memory boundaries. We also provide full isolated sandboxing for C++20 (GCC) and Python 3.12, each evaluated under language-specific resource and timeout constraints.',
    },
    {
      q: 'What are the 80 / 150 / 200 canonical test suites?',
      a: 'Traditional platforms often test code against only 15–30 sample inputs, allowing inefficient or buggy solutions to pass. Chakriva evaluates Easy problems against 80 canonical tests, Medium against 150, and Hard against 200 tests—including extreme boundary values, max-constraint arrays, and adversarial edge cases.',
    },
    {
      q: 'Can I use Chakriva for free?',
      a: 'Yes. The Explorer tier is 100% free forever. It includes access to 500+ curated problems, standard judge execution, community discussion, streak tracking, and the Chakriva 100 foundational sheet.',
    },
    {
      q: 'How does Chakriva AI give code feedback without hallucinating?',
      a: 'Chakriva AI does not guess. It inspects your actual compilation artifacts, runtime memory allocations, test failure vectors, and historical submission telemetry to isolate the exact algorithmic invariant that failed.',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0c0c] text-white selection:bg-brand/30">
      {/* Root SVG Noise Filter for Headings */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <filter id="c3-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
          <feComposite in2="SourceGraphic" operator="in" result="noise" />
          <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
        </filter>
      </svg>

      {/* Global Interactive 3D Liquid Silk Mesh (Three.js Custom Engine) */}
      <ChakrivaLiquidSilkCanvas opacity={0.55} />

      {/* Subtle Ambient Radial Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,0.08),transparent_70%)]" />

      {/* Deep Void Edge Dissolve */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-[#0c0c0c]" />

      {/* Vertical Guide Lines at 36rem Container Edges */}
      <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2 -translate-x-[calc(50%+36rem)] w-px bg-white/10 z-[5]" />
      <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2 translate-x-[calc(-50%+36rem)] w-px bg-white/10 z-[5]" />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ================================================================== */}
        {/* SECTION 1 — NAVBAR                                                */}
        {/* ================================================================== */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-6xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between"
        >
          {/* Brand Mark + Name */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <ChakrivaLogoMark className="w-6 h-6" />
            <span className="text-[14px] tracking-[0.2em] uppercase font-bold text-white">
              CHAKRIVA
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, idx) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + idx * 0.05, ease: 'easeOut' }}
              >
                <Link
                  to={link.href}
                  className="text-white/70 text-sm font-medium hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-white/70 text-sm font-medium hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-5 py-2.5 transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg shadow-white/10"
            >
              <span>Start Free</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[2px]" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </motion.nav>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 border-b border-white/10 bg-black/85 backdrop-blur-md">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/80 text-sm font-medium py-1"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/login" className="text-white/70 text-sm font-medium py-2 text-center">
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-5 py-2.5"
              >
                <span>Start Free</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 2 — HERO                                                  */}
        {/* ================================================================== */}
        <section className="pt-20 md:pt-32 pb-20 text-center flex flex-col items-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-7xl font-semibold tracking-tight leading-[0.95]"
          >
            <span className="block text-white">Your preparation.</span>
            <span className="animate-shiny block mt-2" style={gradientStyle}>
              Engineered.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: 'easeOut' }}
            className="mt-8 text-white/60 max-w-xl text-base leading-[1.6]"
          >
            Chakriva combines 3,392+ problems, high-assurance sandboxed judging, an adaptive roadmap
            engine, and an AI mentor that pinpoints why your solutions fail.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: 'easeOut' }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-7 py-3.5 transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg shadow-white/10"
            >
              <span>Start Your Journey</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[2px]" />
            </Link>
            <Link
              to="/problems"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] text-white/90 text-sm font-medium px-6 py-3.5 hover:bg-white/[0.08] transition-colors"
            >
              <Code2 className="w-4 h-4 text-[#A4F4FD]" />
              <span>Browse 3,392+ Problems</span>
            </Link>
          </motion.div>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="text-xs text-white/40 mt-4"
          >
            Zero credit card required · Free tier available · Sandboxed execution
          </motion.span>
        </section>

        {/* ================================================================== */}
        {/* SECTION 3 — CENTRAL MOCKUP: PROBLEM WORKSPACE & AI DIAGNOSTICS    */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl overflow-hidden border border-white/10 liquid-glass backdrop-blur-2xl shadow-[0_32px_100px_rgba(0,0,0,0.85)]"
          >
            {/* Title Bar — Minimalist Architectural Header (No Toy macOS Dots) */}
            <div className="h-11 px-5 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse" />
                  <span className="text-[11px] font-mono text-white/50 tracking-wider uppercase font-semibold">
                    CHAKRIVA KERNEL
                  </span>
                </div>
                <span className="text-white/20">│</span>
                <span className="text-xs text-white/40 font-mono hidden sm:inline">VRQ-000042</span>
                <span className="text-xs text-white/90 font-medium tracking-tight">Trapping Rain Water</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70 font-mono">
                  Hard
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-white/40 hidden md:flex">
                <span>Canonical Invariant Suite</span>
                <span className="text-white/20">│</span>
                <span className="text-[#A4F4FD]">200 / 200 Tests</span>
              </div>
            </div>

            {/* Mockup Body Grid */}
            <div className="grid grid-cols-12 h-[540px]">
              {/* Left Pane (col-span-3): Invariant Navigator */}
              <div className="col-span-3 border-r border-white/10 bg-black/25 p-4 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <button
                    type="button"
                    className="group w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-3.5 py-2.5 transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#A4F4FD] transition-transform group-hover:scale-110" />
                    <span>Run Invariant Proof</span>
                  </button>

                  <div>
                    <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase mb-2 font-mono">
                      Active Invariant Task
                    </div>
                    <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03] space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-white">
                        <span>Trapping Rain Water</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                          Ready
                        </span>
                      </div>
                      <div className="text-[11px] text-white/60">Two Pointers · Monotonic Folds</div>
                      <div className="text-[10px] text-white/40 pt-1 flex items-center gap-1.5 font-mono">
                        <Check className="w-3 h-3 text-[#A4F4FD]" />
                        <span>Target SLA: &lt; 25 mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Algorithmic Patterns (Cohesive Monochromatic / Cyan Tone) */}
                  <div>
                    <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase mb-2 font-mono">
                      Pattern Invariants
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                          <span className="font-medium">Two Pointers</span>
                        </div>
                        <span className="text-[10px] text-[#A4F4FD] font-mono">Active</span>
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] text-white/60 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                          <span>Sliding Window</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">8 Solved</span>
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] text-white/60 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                          <span>Monotonic Stack</span>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">5 Solved</span>
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] text-white/60 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                          <span>Graph BFS / DFS</span>
                        </div>
                        <span className="text-[10px] text-white/30 font-mono">Next</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 text-[11px] text-white/40 font-mono flex items-center justify-between">
                  <span>Weekly Velocity:</span>
                  <span className="text-white/80 font-medium">12 / 14 Solved</span>
                </div>
              </div>

              {/* Center Pane (col-span-5): Code Editor & Harness */}
              <div className="col-span-5 border-r border-white/10 flex flex-col overflow-hidden bg-black/15">
                {/* Editor Header with Glass Language Tabs */}
                <div className="p-2.5 border-b border-white/10 flex items-center justify-between text-xs bg-black/30">
                  <div className="flex items-center gap-1.5">
                    {(['java', 'cpp', 'python'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveCodeLang(lang)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                          activeCodeLang === lang
                            ? 'border border-white/15 bg-white/10 text-white font-medium shadow-sm'
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        {lang === 'java' ? 'Java 21' : lang === 'cpp' ? 'C++20' : 'Python 3'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-mono">
                    <Terminal className="w-3 h-3 text-[#A4F4FD]" />
                    <span>Deterministic Sandbox</span>
                  </div>
                </div>

                {/* Code Window */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-[1.65] select-none bg-black/10">
                  {codeSnippets[activeCodeLang].map((line, idx) => (
                    <div key={idx} className={`${line.color} pl-${line.indent * 3}`}>
                      {line.text}
                    </div>
                  ))}
                </div>

                {/* Execution Results Footer — Refined Glass Telemetry */}
                <div className="p-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-white text-xs">Verdict: ACCEPTED</span>
                    <span className="text-white/20">│</span>
                    <span className="text-white/50 text-[11px]">200/200 Tests</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/50">
                    <span className="text-emerald-400 font-medium">1ms P99</span>
                    <span className="text-white/20">·</span>
                    <span>42.1MB</span>
                  </div>
                </div>
              </div>

              {/* Right Pane (col-span-4): Chakriva Intelligence Diagnostics */}
              <div className="col-span-4 flex flex-col overflow-hidden bg-black/25">
                {/* AI Toolbar */}
                <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between bg-black/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#A4F4FD]" />
                    <span className="text-xs font-semibold text-white">Chakriva Intelligence</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono">
                    Proof Validated
                  </span>
                </div>

                {/* AI Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  <div className="rounded-xl p-3.5 border border-white/10 bg-white/[0.03] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A4F4FD]">
                      <Sparkles className="w-3.5 h-3.5 text-[#A4F4FD]" />
                      <span>Complexity Invariant Verified</span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Optimal <strong className="text-white">O(N)</strong> Time and{' '}
                      <strong className="text-white">O(1)</strong> Space. Two-pointer boundary contraction
                      avoids allocating prefix arrays, keeping runtime latency below 1.2ms.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-white/60">Time Complexity:</span>
                      <span className="font-mono text-emerald-400 font-semibold">O(N) [Optimal]</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-white/60">Space Complexity:</span>
                      <span className="font-mono text-emerald-400 font-semibold">O(1) [Zero Alloc]</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                      <span className="text-white/60">Edge Case Rigor:</span>
                      <span className="font-mono text-white/80">height = [] &amp; [1] Pass</span>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-white/60 leading-relaxed">
                    <span className="text-white/90 font-medium">Recommended Next:</span> Try{' '}
                    <span className="text-[#00d2ff] font-mono">VRQ-000016 (3Sum Closest)</span> to reinforce
                    multi-pointer convergence under bounded targets.
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.04] text-[10px] text-white/60 font-mono">
                    <ShieldCheck className="w-3 h-3 text-[#A4F4FD]" />
                    <span>verified_canonical_200.sig</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 w-full" id="how-it-works">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
              The continuous preparation loop.
              <br />
              Designed for interview certainty.
            </h2>
            <p className="mt-4 text-white/60 text-sm leading-relaxed">
              Replace disorganized problem grinding with an intelligent five-stage progression that
              adapts directly to your schedule and performance telemetry.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: 'Calibrate',
                desc: 'Specify your target company, role level, and Monday–Sunday available study hours.',
                icon: Compass,
                color: 'text-[#00d2ff]',
              },
              {
                step: '02',
                title: 'Schedule',
                desc: 'Receive a feasibility-tested roadmap that calculates prerequisite concept trees.',
                icon: Calendar,
                color: 'text-[#A4F4FD]',
              },
              {
                step: '03',
                title: 'Execute',
                desc: 'Solve canonical problems verified against 80–200 adversarial test suites.',
                icon: Cpu,
                color: 'text-yellow-400',
              },
              {
                step: '04',
                title: 'Diagnose',
                desc: 'Chakriva AI detects recurring boundary off-by-one errors and memory leaks.',
                icon: Zap,
                color: 'text-emerald-400',
              },
              {
                step: '05',
                title: 'Master',
                desc: 'Missed days automatically rebalance into weekend buffers without backlog guilt.',
                icon: Trophy,
                color: 'text-purple-400',
              },
            ].map((card, i) => (
              <motion.div
                key={card.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="liquid-glass rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs text-white/40">{card.step}</span>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <h3 className="text-base font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-xs text-white/60 leading-relaxed">{card.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-white/40 uppercase">
                  Stage {card.step}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 6 — PILLAR 1: ADAPTIVE ROADMAP ENGINE                      */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 w-full" id="roadmap">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02]">
                Your path. Engineered.
                <br />
                From skill to target ready.
              </h2>
              <p className="mt-6 text-white/60 text-base leading-[1.6] max-w-md">
                Chakriva analyzes every boundary bug, TLE, and runtime failure. It continuously
                recalculates your daily workload against available hours so you never burn out or fall
                behind.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  'Dynamic Rollover',
                  'Mistake Pattern Detection',
                  'Prerequisite Mapping',
                  'Capacity-Aware Schedules',
                ].map((chip) => (
                  <span
                    key={chip}
                    className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Liquid-Glass Weekly Capacity Rebalancing Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              className="liquid-glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white mb-4">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#A4F4FD]" />
                  <span>Mon–Sun Capacity Balancer</span>
                </span>
                <span className="text-emerald-400 font-mono text-[11px]">Auto-Balancing Active</span>
              </div>

              {/* Weekly Hours Allocation Bars */}
              <div className="grid grid-cols-7 gap-2 mb-5 text-center">
                {[
                  { day: 'M', hours: '2h', active: true },
                  { day: 'T', hours: '2h', active: true },
                  { day: 'W', hours: '1.5h', active: true },
                  { day: 'T', hours: '0h', active: false, flag: 'Midterms' },
                  { day: 'F', hours: '3h', active: true, rebalanced: true },
                  { day: 'S', hours: '4h', active: true, rebalanced: true },
                  { day: 'S', hours: '2.5h', active: true },
                ].map((slot, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border text-xs ${
                      slot.flag
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        : slot.rebalanced
                        ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                        : 'border-white/10 bg-white/[0.03] text-white/80'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">{slot.day}</div>
                    <div className="font-mono text-[10px] mt-1">{slot.hours}</div>
                    {slot.flag && <div className="text-[9px] text-rose-400 mt-0.5">Exam</div>}
                  </div>
                ))}
              </div>

              {/* Status Breakdown */}
              <div className="space-y-2.5">
                <div className="liquid-glass rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Ready to Advance (Mastered)</span>
                    </span>
                    <span className="text-white/40 font-mono">100%</span>
                  </div>
                  <div className="text-xs text-white/70">Monotonic Stack &amp; Two Pointers Invariants</div>
                </div>

                <div className="liquid-glass rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#e5e5e5] mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span>Needs Reinforcement</span>
                    </span>
                    <span className="text-white/40 font-mono">68%</span>
                  </div>
                  <div className="text-xs text-white/70">Graph Cycle Detection (Topological Sort)</div>
                </div>

                <div className="liquid-glass rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#a3a3a3] mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Common Pitfall Detected</span>
                    </span>
                    <span className="text-white/40 font-mono">Alert</span>
                  </div>
                  <div className="text-xs text-white/70">Off-by-one boundary check on empty array input</div>
                </div>

                <div className="liquid-glass rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#525252] mb-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Auto-Rescheduled Rollover</span>
                    </span>
                    <span className="text-cyan-300 font-mono text-[11px]">Rebalanced</span>
                  </div>
                  <div className="text-xs text-white/70">
                    2 tasks carried forward from midterms week into weekend schedule
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 7 — PILLAR 2: CURATED SHEETS SHOWCASE                      */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 w-full" id="sheets">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Master high-frequency patterns.
              <br />
              One curated sheet at a time.
            </h2>
            <p className="mt-4 text-white/60 text-sm leading-relaxed">
              Curated problem collections that you can conquer independently of your adaptive roadmap.
              Complete with pattern tags, difficulty filters, and real-time completion tracking.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Sheet 1: Chakriva 100 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#A4F4FD]">Core 100</span>
                  <span className="text-xs font-semibold text-white/60">100 Problems</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Chakriva 100</h3>
                <p className="mt-2 text-xs text-white/60 leading-relaxed">
                  The foundational 100 problems covering all recurring interview invariants: Two Pointers,
                  Trees, Binary Search, and Linked Lists.
                </p>
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-[11px] text-white/60 font-mono">
                    <span>Progress: 72 / 100</span>
                    <span className="text-emerald-400">72%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>Easy 40 · Med 50 · Hard 10</span>
                <Link to="/sheets" className="text-white hover:text-[#A4F4FD] transition-colors font-medium">
                  Open Sheet →
                </Link>
              </div>
            </motion.div>

            {/* Sheet 2: Master DSA Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">Master 450</span>
                  <span className="text-xs font-semibold text-white/60">450 Problems</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Master DSA 450</h3>
                <p className="mt-2 text-xs text-white/60 leading-relaxed">
                  The comprehensive curriculum for deep algorithmic mastery. Covers Dynamic Programming,
                  Graph Theory, Segment Trees, and Tries.
                </p>
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-[11px] text-white/60 font-mono">
                    <span>Progress: 184 / 450</span>
                    <span className="text-cyan-400">41%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: '41%' }} />
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>Easy 110 · Med 260 · Hard 80</span>
                <Link to="/sheets" className="text-white hover:text-cyan-400 transition-colors font-medium">
                  Open Sheet →
                </Link>
              </div>
            </motion.div>

            {/* Sheet 3: Company Target Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-yellow-400">Company Target</span>
                  <span className="text-xs font-semibold text-white/60">Top 50</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Google Core 50</h3>
                <p className="mt-2 text-xs text-white/60 leading-relaxed">
                  High-frequency questions tagged by recent Google L3/L4/L5 rounds. Strict constraints,
                  hard corner cases, and scale-oriented solutions.
                </p>
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-[11px] text-white/60 font-mono">
                    <span>Progress: 31 / 50</span>
                    <span className="text-yellow-400">62%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: '62%' }} />
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                <span>Easy 5 · Med 30 · Hard 15</span>
                <Link to="/sheets" className="text-white hover:text-yellow-400 transition-colors font-medium">
                  Open Sheet →
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 8 — PILLAR 3: CHAKRIVA AI CODE INTELLIGENCE                */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 w-full" id="ai">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Left Column: Diagnostics Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02]">
                An AI mentor that learns
                <br />
                how you solve problems.
              </h2>
              <p className="mt-6 text-white/60 text-base leading-[1.6]">
                Not just a sidebar chatbot. Chakriva AI analyzes every submission attempt, tracks recurring
                syntactic and algorithmic patterns across problems, and alerts you to systemic blind spots.
              </p>

              <div className="mt-8 space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-[#A4F4FD]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Mistake Pattern Detection</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      Identifies why you consistently miss boundary conditions or allocate redundant memory.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Time &amp; Space Complexity Radar</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      Explains asymptotic trade-offs between iterative pointers and recursive memoization.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Monthly Skill Intelligence Reports</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      Delivers personalized month-over-month telemetry so you can measurably see your growth.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Interactive Code Diagnosis Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="liquid-glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between text-xs font-mono text-white/60 pb-3 border-b border-white/10">
                <span className="text-white font-semibold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#A4F4FD]" />
                  <span>Telemetry Audit: VRQ-000560</span>
                </span>
                <span className="text-rose-400">TLE on Test #174/200</span>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs font-mono space-y-1">
                <div className="text-rose-300 font-semibold">Diagnosis: Subarray Sum Equals K</div>
                <div className="text-white/60 text-[11px]">
                  Brute force nested O(N²) loop timed out at N = 100,000 constraint.
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold text-[#A4F4FD]">
                  <span>AI Invariant Prescribed: Prefix Sum + Hash Map</span>
                  <span className="font-mono text-emerald-400">O(N) Time</span>
                </div>
                <p className="text-white/70 text-xs leading-relaxed">
                  Store cumulative frequencies in a single pass. If <code className="text-cyan-300">sum - k</code>{' '}
                  exists in the map, increment count. Space trade-off is O(N), cutting execution from 2.1s to 12ms.
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10 text-xs text-white/50">
                <span>Verified across 150 canonical tests</span>
                <span className="text-emerald-400 font-mono">100% Correctness</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 9 — CONTESTS & COLLEGE LEADERBOARD                         */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 w-full" id="contests">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Left: Contests Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02]">
                Timed battle grounds.
                <br />
                Rank among your campus peers.
              </h2>
              <p className="mt-6 text-white/60 text-base leading-[1.6]">
                Simulate real Online Assessments under strict time pressure. Compete in weekly scheduled
                contests with live scoring and climb the dedicated College Leaderboard.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="liquid-glass rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#A4F4FD]">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span>Weekly Virtual Contests</span>
                  </div>
                  <div className="text-lg font-bold text-white mt-2">Bi-Weekly #14</div>
                  <div className="text-[11px] text-white/50 mt-1">Saturday · 8:00 PM IST · 90 Mins</div>
                </div>

                <div className="liquid-glass rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Users className="w-4 h-4" />
                    <span>Campus Chapters</span>
                  </div>
                  <div className="text-lg font-bold text-white mt-2">140+ Colleges</div>
                  <div className="text-[11px] text-white/50 mt-1">Verified student ranking pools</div>
                </div>
              </div>
            </motion.div>

            {/* Right: Live Leaderboard Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="liquid-glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span>College Leaderboard · Live Top 4</span>
                </div>
                <span className="text-[11px] text-white/40 font-mono">IIT Delhi Chapter</span>
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  { rank: '01', user: 'aditya_sharma', solved: '342 solved', streak: '48d streak', rating: '2,180' },
                  { rank: '02', user: 'priya_v', solved: '318 solved', streak: '32d streak', rating: '2,094' },
                  { rank: '03', user: 'rohit_kumar', solved: '294 solved', streak: '27d streak', rating: '2,040' },
                  { rank: '04', user: 'sneha_patel', solved: '276 solved', streak: '19d streak', rating: '1,985' },
                ].map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] font-bold text-yellow-400/80">{item.rank}</span>
                      <span className="font-medium text-white">{item.user}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-white/50 font-mono">
                      <span>{item.solved}</span>
                      <span className="hidden sm:inline">{item.streak}</span>
                      <span className="text-[#A4F4FD] font-semibold">{item.rating}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
                <span>Anti-cheat verified executions</span>
                <Link to="/leaderboard" className="text-white hover:text-emerald-400 transition-colors font-medium">
                  View Full Standings →
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 10 — THE COMPARISON MATRIX (vs. TRADITIONAL PLATFORMS)     */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 w-full" id="compare">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Why engineers choose Chakriva
              <br />
              over traditional platforms.
            </h2>
            <p className="mt-4 text-white/60 text-sm leading-relaxed">
              Traditional platforms treat preparation as an unstructured, brute-force checklist.
              Chakriva turns it into an engineered, measurable science.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="liquid-glass rounded-2xl overflow-hidden border border-white/10"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="py-4 px-5 font-semibold text-white/50 uppercase tracking-wider text-[11px]">
                      Capability
                    </th>
                    <th className="py-4 px-5 font-semibold text-white/50 uppercase tracking-wider text-[11px]">
                      Static Sheets (PDFs/Excel)
                    </th>
                    <th className="py-4 px-5 font-semibold text-white/50 uppercase tracking-wider text-[11px]">
                      Traditional Platforms
                    </th>
                    <th className="py-4 px-5 font-bold text-[#A4F4FD] uppercase tracking-wider text-[11px] bg-white/[0.04]">
                      CHAKRIVA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {comparisonRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.highlight ? 'bg-white/[0.015]' : ''}
                    >
                      <td className="py-4 px-5 font-medium text-white font-sans text-xs">
                        {row.feature}
                      </td>
                      <td className="py-4 px-5 text-white/40 text-[11px]">
                        {row.staticSheets}
                      </td>
                      <td className="py-4 px-5 text-white/50 text-[11px]">
                        {row.traditional}
                      </td>
                      <td className="py-4 px-5 text-[#A4F4FD] font-semibold text-[11px] bg-white/[0.03]">
                        <span className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{row.chakriva}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 11 — TARGET TECH TEAMS (LOGO CLOUD)                        */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20 w-full text-center">
          <div className="text-xs uppercase tracking-widest text-white/40">
            PREPARE FOR INTERVIEWS AT THE WORLD'S LEADING ENGINEERING TEAMS
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 items-center">
            {targetCompanies.map((company, idx) => (
              <motion.div
                key={company}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="text-sm font-semibold tracking-tight text-white/50 hover:text-white transition-colors cursor-default"
              >
                {company}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 12 — TESTIMONIALS                                         */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 w-full">
          <div className="grid md:grid-cols-3 gap-6">
            <motion.figure
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
            >
              <blockquote className="text-sm text-white/80 leading-[1.6]">
                &ldquo;Chakriva’s AI caught my recurring recursive stack memory issue that traditional
                platforms never diagnosed. Cleared my Google L4 interview in 6 weeks.&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/10">
                <div className="text-sm font-semibold text-white">Parker Wilf</div>
                <div className="text-xs text-white/50">Software Engineer II</div>
                <div className="text-xs text-white font-semibold tracking-wide uppercase mt-1">
                  GOOGLE
                </div>
              </figcaption>
            </motion.figure>

            <motion.figure
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
            >
              <blockquote className="text-sm text-white/80 leading-[1.6]">
                &ldquo;The adaptive roadmap actually adjusted when I had university midterms. No burnout,
                no guilt of missed days—just automated, intelligent rebalancing.&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/10">
                <div className="text-sm font-semibold text-white">Andrew von Rosenbach</div>
                <div className="text-xs text-white/50">Senior Engineering Lead</div>
                <div className="text-xs text-white font-semibold tracking-wide uppercase mt-1">
                  ATLASSIAN
                </div>
              </figcaption>
            </motion.figure>

            <motion.figure
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
            >
              <blockquote className="text-sm text-white/80 leading-[1.6]">
                &ldquo;The canonical 200-test judge suite is brutal in the best way. If your solution
                passes Chakriva, it will never TLE in an actual assessment.&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/10">
                <div className="text-sm font-semibold text-white">Mathies Christensen</div>
                <div className="text-xs text-white/50">ICPC Regional Finalist</div>
                <div className="text-xs text-white font-semibold tracking-wide uppercase mt-1">
                  LUNAR
                </div>
              </figcaption>
            </motion.figure>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 13 — PRICING                                              */}
        {/* ================================================================== */}
        <section className="c3-pricing-section" id="pricing">
          {/* Pricing Noise Filter */}
          <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <filter id="c3-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" stitchTiles="stitch" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.075" />
              </feComponentTransfer>
              <feComposite in2="SourceGraphic" operator="in" result="noise" />
              <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
            </filter>
          </svg>

          {/* Watermark */}
          <div className="c3-watermark-container">
            <div className="c3-watermark-main">
              <span className="c3-watermark-line-1">Your preparation.</span>
              <span className="c3-watermark-line-2">Engineered.</span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="c3-grid">
            {/* Free */}
            <div className="c3-card">
              <span className="c3-tier-small">Free</span>
              <div className="c3-tier-large">Free</div>
              <p className="c3-desc">For developers building foundational problem-solving fluency.</p>
              <ul className="c3-list list-none p-0 m-0">
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>500+ Curated DSA Problems</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Sandboxed Judge Execution</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Daily Streaks &amp; Rolling Heatmap</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Chakriva Core 100 Pattern Sheet</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Runtime &amp; Memory Telemetry</span>
                </li>
              </ul>
              <Link to="/register" className="c3-btn inline-block text-center no-underline">
                Choose Plan
              </Link>
            </div>

            {/* Standard */}
            <div className="c3-card">
              <span className="c3-tier-small">Standard</span>
              <div className="c3-tier-large">{yearly ? '$99.99/y' : '$9.99/m'}</div>
              <p className="c3-desc">
                For candidates actively targeting top-tier tech interview rounds.
              </p>
              <ul className="c3-list list-none p-0 m-0">
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Full Bank of 3,392+ Problems</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Canonical 200-Test Edge Case Suites</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Company-Specific Invariant Sheets</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Sub-Millisecond Execution Profiling</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Submission History &amp; Mistake Tracking</span>
                </li>
              </ul>
              <Link to="/register" className="c3-btn inline-block text-center no-underline">
                Choose Plan
              </Link>
            </div>

            {/* Pro */}
            <div className="c3-card c3-card-pro">
              <span className="c3-tier-small">Pro</span>
              <div className="c3-tier-large">{yearly ? '$199.99/y' : '$19.99/m'}</div>
              <p className="c3-desc">
                For engineers wanting an adaptive roadmap engine and diagnostic mentoring.
              </p>
              <ul className="c3-list list-none p-0 m-0">
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Fully Adaptive Milestone Roadmap Engine</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Socratic Diagnostic Code Mentoring</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Mistake Pattern &amp; Invariant Detection</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Automated Space-Time Complexity Audits</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Dedicated High-Priority Judge Workers</span>
                </li>
              </ul>
              <Link to="/register" className="c3-btn inline-block text-center no-underline">
                Choose Plan
              </Link>
            </div>
          </div>

          {/* Toggle Wrap */}
          <div className="c3-toggle-wrap">
            <span className="text-sm font-medium text-white/80">Yearly</span>
            <button
              type="button"
              className={`c3-toggle ${yearly ? 'active' : ''}`}
              onClick={() => setYearly(!yearly)}
              aria-label="Toggle annual pricing"
            >
              <span className="c3-toggle-knob" />
            </button>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 14 — INTERACTIVE FAQ ACCORDION                            */}
        {/* ================================================================== */}
        <section className="max-w-4xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 w-full" id="faq">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Questions &amp; Answers
            </h2>
            <p className="mt-4 text-white/60 text-sm leading-relaxed">
              Everything you need to know about the adaptive roadmap engine, canonical test suites, and judge.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="liquid-glass rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="text-sm font-semibold text-white/90">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-white/50 flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-[#A4F4FD]' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 text-xs text-white/60 leading-relaxed border-t border-white/5">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 15 — FINAL CALL-TO-ACTION                                 */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-32 w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-24 text-center"
          >
            {/* Radial Glow Overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.15), transparent 70%)',
                opacity: 0.3,
              }}
            />

            <h2 className="relative z-10 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02]">
              <div>Stop grinding blindly.</div>
              <div className="mt-2 text-[#A4F4FD]">Start building mastery.</div>
            </h2>

            <p className="relative z-10 mt-6 text-white/60 max-w-md mx-auto text-sm leading-[1.6]">
              Join thousands of engineers who replaced static problem lists with an intelligent,
              adaptive preparation engine.
            </p>

            <div className="relative z-10 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-7 py-3.5 transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg shadow-white/10"
              >
                <span>Get Started Free</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[2px]" />
              </Link>
              <Link
                to="/sheets"
                className="rounded-full border border-white/15 text-white text-sm font-medium px-5 py-3.5 hover:bg-white/5 inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Explore Curated Sheets</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 16 — 4-COLUMN DEVELOPER FOOTER                            */}
        {/* ================================================================== */}
        <footer className="w-full max-w-6xl mx-auto px-6 py-14 border-t border-white/10 text-xs text-white/40">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Col 1: Product */}
            <div>
              <div className="text-white font-semibold mb-3 tracking-wider uppercase text-[11px]">
                Product
              </div>
              <div className="flex flex-col gap-2">
                <Link to="/problems" className="hover:text-white transition-colors">
                  Problem Bank (3,392+)
                </Link>
                <Link to="/roadmaps" className="hover:text-white transition-colors">
                  Adaptive Roadmap Engine
                </Link>
                <Link to="/sheets" className="hover:text-white transition-colors">
                  Curated Sheets (100 / 450)
                </Link>
                <Link to="/ai" className="hover:text-white transition-colors">
                  Chakriva AI Mentor
                </Link>
                <Link to="/contests" className="hover:text-white transition-colors">
                  Timed Contests
                </Link>
              </div>
            </div>

            {/* Col 2: Curriculum */}
            <div>
              <div className="text-white font-semibold mb-3 tracking-wider uppercase text-[11px]">
                Curriculum
              </div>
              <div className="flex flex-col gap-2">
                <Link to="/learn" className="hover:text-white transition-colors">
                  DSA Topic Library
                </Link>
                <Link to="/sheets" className="hover:text-white transition-colors">
                  Company Target Sheets
                </Link>
                <Link to="/learn" className="hover:text-white transition-colors">
                  Algorithm Visualizations
                </Link>
                <Link to="/problems" className="hover:text-white transition-colors">
                  Monotonic Invariants
                </Link>
                <Link to="/problems" className="hover:text-white transition-colors">
                  Dynamic Programming Mastery
                </Link>
              </div>
            </div>

            {/* Col 3: Community */}
            <div>
              <div className="text-white font-semibold mb-3 tracking-wider uppercase text-[11px]">
                Community
              </div>
              <div className="flex flex-col gap-2">
                <Link to="/leaderboard" className="hover:text-white transition-colors">
                  Campus Leaderboards
                </Link>
                <Link to="/leaderboard" className="hover:text-white transition-colors">
                  Global Ratings Pool
                </Link>
                <a href="#discord" className="hover:text-white transition-colors">
                  Developer Discord
                </a>
                <a href="#github" className="hover:text-white transition-colors">
                  Canonical Test Repo
                </a>
                <Link to="/contests" className="hover:text-white transition-colors">
                  Weekly Assessment League
                </Link>
              </div>
            </div>

            {/* Col 4: Platform & Legal (Required for Payment Gateways & DPDP) */}
            <div>
              <div className="text-white font-semibold mb-3 tracking-wider uppercase text-[11px]">
                Platform &amp; Legal
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Judge Kernel: 99.98% Healthy</span>
                </span>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy (DPDP 2023)
                </Link>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms of Service &amp; AUP
                </Link>
                <Link to="/cookies" className="hover:text-white transition-colors">
                  Cookie &amp; Storage Policy
                </Link>
                <Link to="/refunds" className="hover:text-white transition-colors">
                  Refund &amp; Cancellation
                </Link>
                <a href="mailto:grievance@chakriva.com" className="hover:text-sky-400 transition-colors text-[11px] font-mono">
                  Grievance Officer &rarr;
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <ChakrivaLogoMark className="w-4 h-4" />
              <span className="font-semibold text-white/80">CHAKRIVA</span>
              <span>&copy; {new Date().getFullYear()} Chakriva Labs Private Limited. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-white/40 font-mono">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <span>&bull;</span>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <span>&bull;</span>
              <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
              <span>&bull;</span>
              <Link to="/refunds" className="hover:text-white transition-colors">Refunds</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
