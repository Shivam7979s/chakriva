import React, { useState, useRef } from 'react';
import { Terminal, Shield, CheckCircle2, Zap, ArrowRight, Play, Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const LandingPracticeSection: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<'cpp' | 'java' | 'py' | 'ts'>('py');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTimestamp, setExecutionTimestamp] = useState('0.008s');

  // Spotlight tracking on editor container
  const editorRef = useRef<HTMLDivElement>(null);
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });
  const [isEditorHovered, setIsEditorHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    const rect = editorRef.current.getBoundingClientRect();
    setSpotlightPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleRunSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setExecutionTimestamp(`${(Math.random() * 0.005 + 0.006).toFixed(4)}s`);
    }, 450);
  };

  const codeSnippets = {
    py: `# Python 3.12: Two-Pointer Monotonic Invariant Proof
def two_sum_sorted(nums: list[int], target: int) -> list[int]:
    left, right = 0, len(nums) - 1
    # Invariant: nums[left] + nums[right] covers the search window
    while left < right:
        curr = nums[left] + nums[right]
        if curr == target:
            return [left, right]
        elif curr < target:
            left += 1  # nums[left] cannot pair with any valid right
        else:
            right -= 1 # nums[right] cannot pair with any valid left
    return []`,
    cpp: `// GCC 14: Two-Pointer Monotonic Invariant Proof
#include <vector>
using namespace std;

vector<int> twoSumSorted(const vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    while (left < right) {
        int curr = nums[left] + nums[right];
        if (curr == target) return {left, right};
        if (curr < target) ++left;
        else --right;
    }
    return {};
}`,
    java: `// OpenJDK 21: Two-Pointer Monotonic Invariant Proof
class Solution {
    public int[] twoSumSorted(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left < right) {
            int curr = nums[left] + nums[right];
            if (curr == target) return new int[]{left, right};
            if (curr < target) left++;
            else right--;
        }
        return new int[]{};
    }
}`,
    ts: `// TypeScript 5.7: Two-Pointer Monotonic Invariant Proof
function twoSumSorted(nums: number[], target: number): [number, number] | [] {
  let left = 0, right = nums.length - 1;
  while (left < right) {
    const curr = nums[left] + nums[right];
    if (curr === target) return [left, right];
    if (curr < target) left++;
    else right--;
  }
  return [];
}`,
  };

  return (
    <section className="py-20 md:py-28 border-b border-white/[0.06] bg-[#07090D] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

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
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-full inline-block backdrop-blur-md">
              ISOLATED EXECUTION SANDBOX
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-sans">
              Zero Synthetic Tests. Real Containers.
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-sans">
              No browser-evaluated approximations or synthetic mocks. Every single submission executes inside an isolated Docker sandbox with kernel cgroup resource controls and microsecond runtime instrumentation.
            </p>
          </div>

          <Link to="/ide" className="self-start lg:self-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111420] border border-white/[0.1] hover:border-emerald-500/40 text-neutral-200 hover:text-white text-xs font-mono font-medium transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Launch Monaco Cloud IDE</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-neutral-400" />
            </motion.button>
          </Link>
        </motion.div>

        {/* Studio Sandbox Stage (Raycast & Linear Workstation Chassis) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Code Editor Terminal Window with Pointer Spotlight (7 cols) */}
          <div
            ref={editorRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsEditorHovered(true)}
            onMouseLeave={() => setIsEditorHovered(false)}
            className="lg:col-span-7 bg-[#0B0E16] border border-white/[0.09] rounded-2xl overflow-hidden shadow-2xl text-left relative group ring-1 ring-white/[0.05]"
          >
            {/* Interactive Spotlight Overlay */}
            {isEditorHovered && (
              <div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-100 transition-opacity duration-300 z-10"
                style={{
                  background: `radial-gradient(500px circle at ${spotlightPos.x}px ${spotlightPos.y}px, rgba(16, 185, 129, 0.08), transparent 60%)`,
                }}
              />
            )}

            {/* Header controls & language tabs */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#0E121D] relative z-20">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]/80" />
                <span className="font-mono text-[11px] text-neutral-400 ml-2 hidden sm:inline flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>INTERACTIVE PREVIEW // CGROUP_V2</span>
                </span>
              </div>

              {/* Language Switcher Tabs & Run Button */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#080A10] p-1 rounded-lg border border-white/[0.06]">
                  {(['py', 'cpp', 'java', 'ts'] as const).map((lang) => {
                    const labels = {
                      py: 'Python 3.12',
                      cpp: 'C++ 14',
                      java: 'Java 21',
                      ts: 'TS 5.7',
                    };
                    const isSelected = selectedLang === lang;
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSelectedLang(lang)}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-colors relative ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {labels[lang]}
                      </button>
                    );
                  })}
                </div>

                {/* Interactive Simulated Run Trigger */}
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={isRunning}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                  title="Execute in isolated Docker sandbox"
                >
                  {isRunning ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 fill-current" />
                  )}
                  <span>{isRunning ? 'Compiling...' : 'Run Proof'}</span>
                </button>
              </div>
            </div>

            {/* Code Content with AnimatePresence */}
            <div className="p-4 sm:p-6 font-mono text-xs text-neutral-200 overflow-x-auto bg-[#07090F] min-h-[250px] relative z-20">
              <AnimatePresence mode="wait">
                <motion.pre
                  key={selectedLang}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="leading-relaxed whitespace-pre font-mono"
                >
                  {codeSnippets[selectedLang]}
                </motion.pre>
              </AnimatePresence>
            </div>

            {/* Simulated Live Execution Output Drawer */}
            <div className="border-t border-white/[0.07] bg-[#0E121D] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono relative z-20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-emerald-400 font-semibold">VERDICT: ACCEPTED (AC)</span>
                <span className="text-neutral-500">•</span>
                <span className="text-neutral-400">80/80 Test Cases Passed</span>
              </div>
              <div className="flex items-center gap-4 text-neutral-400 text-[11px]">
                <span>Runtime: <strong className="text-emerald-300">{executionTimestamp}</strong></span>
                <span>RAM: <strong className="text-neutral-200">16.4MB / 256MB</strong></span>
              </div>
            </div>
          </div>

          {/* Right: Technical Spec Metrics (5 cols) with Staggered In-View Animations */}
          <div className="lg:col-span-5 space-y-4 text-left">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.015 }}
              className="bg-[#0B0E16] border border-white/[0.08] hover:border-emerald-500/30 p-5 rounded-2xl space-y-2 transition-colors shadow-lg"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <Zap className="w-4 h-4" />
                <span>WARM POOL RUNTIME</span>
              </div>
              <h4 className="text-base font-bold text-white font-sans">Sub-150ms Pre-Warmed Execution</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Pre-warmed single-container workers and compilation caching eliminate cold-start lag. User code compiles and executes with sub-second feedback.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              whileHover={{ scale: 1.015 }}
              className="bg-[#0B0E16] border border-white/[0.08] hover:border-sky-500/30 p-5 rounded-2xl space-y-2 transition-colors shadow-lg"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-sky-400">
                <Shield className="w-4 h-4" />
                <span>HARD CGROUP BOUNDARIES</span>
              </div>
              <h4 className="text-base font-bold text-white font-sans">256MB Hard RAM & 2.0s Hard CPU</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Prevents runaway memory allocations or quadratic time loops from masquerading as accepted solutions. Enforces real production discipline.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              whileHover={{ scale: 1.015 }}
              className="bg-[#0B0E16] border border-white/[0.08] hover:border-indigo-500/30 p-5 rounded-2xl space-y-2 transition-colors shadow-lg"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>UNBUFFERED STDIO TELEMETRY</span>
              </div>
              <h4 className="text-base font-bold text-white font-sans">Canonical Invariant Test Suites</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Tests edge cases including 64-bit integer overflow, degenerate bounds, empty inputs, unicode strings, and deep recursion stacks.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingPracticeSection;
