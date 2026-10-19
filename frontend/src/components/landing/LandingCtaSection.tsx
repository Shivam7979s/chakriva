import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Code2, Terminal, ShieldCheck, Cpu } from 'lucide-react';
import { motion } from 'motion/react';

export const LandingCtaSection: React.FC = () => {
  return (
    <section className="py-24 md:py-32 bg-[#07090D] relative overflow-hidden border-t border-white/[0.06]">
      {/* Restrained subtle ambient radial illumination */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.06)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-9"
      >
        {/* Terminal Header Micro Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#101420] border border-white/[0.08] text-xs font-mono text-neutral-300 backdrop-blur-md">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span>EVALUATION ENGINE // READY</span>
        </div>

        {/* Big Authoritative Header */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-sans leading-[1.1]">
            Master Complexity. <br className="hidden sm:inline" />
            Build with Mathematical Precision.
          </h2>
          <p className="text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed font-sans">
            Calibrate your algorithmic invariant competence with a rigorous empirical diagnostic. Zero marketing fluff, 100% engineering integrity.
          </p>
        </div>

        {/* Technical Sandbox Specification Strip (authentic developer telemetry) */}
        <div className="max-w-xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#0B0E16] border border-white/[0.08] text-left font-mono text-xs text-neutral-300">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
              <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-500 block">EXECUTION</span>
                <span className="text-neutral-200 text-[11px] font-semibold">Docker Sandbox</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-500 block">SECURITY</span>
                <span className="text-neutral-200 text-[11px] font-semibold">Zero Net Egress</span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 p-2 rounded-lg bg-white/[0.02]">
              <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-500 block">TEST VECTORS</span>
                <span className="text-neutral-200 text-[11px] font-semibold">Sub-millisecond</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button Group */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/app/diagnostic" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F8FAFC] hover:bg-white text-[#07090E] px-7 py-3 rounded-full text-sm font-semibold transition-all shadow-[0_4px_24px_rgba(255,255,255,0.18)] hover:shadow-[0_6px_32px_rgba(255,255,255,0.28)] cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>Take Diagnostic Assessment</span>
              <ArrowRight className="w-4 h-4 ml-1 text-[#07090E]" />
            </motion.button>
          </Link>

          <Link to="/ide" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#080B12]/80 backdrop-blur-md border border-white/[0.14] hover:border-white/[0.3] text-[#CBD5E1] hover:text-[#F8FAFC] px-6 py-3 rounded-full text-sm font-medium transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-[#CBD5E1]" />
              <span>Open Standalone Monaco IDE</span>
            </motion.button>
          </Link>
        </div>

        {/* Terminal Status Footnote */}
        <div className="pt-6 font-mono text-[11px] text-neutral-500 flex items-center justify-center gap-4 flex-wrap">
          <span>OpenJDK 21 • GCC 14 • Python 3.12 • TypeScript 5.7</span>
          <span>•</span>
          <span>Zero Telemetry Leaks</span>
        </div>
      </motion.div>
    </section>
  );
};

export default LandingCtaSection;
