import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, GitBranch, Cpu, Terminal, ArrowUpRight, Scale } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.06] bg-[#07090D] text-neutral-400 py-16 text-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 text-left">
          {/* Brand Col */}
          <div className="sm:col-span-2 md:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2.5 font-mono font-bold text-white text-base">
              <img
                src="/chakriva-logo.svg"
                alt="CHAKRIVA Logo"
                className="w-7 h-7 object-contain shrink-0"
              />
              <span className="tracking-wider">CHAKRIVA</span>
            </div>
            <p className="text-[12px] text-neutral-400 leading-relaxed font-sans max-w-sm">
              Serious engineering learning and interview-preparation platform. Rooted in mathematical loop invariants, isolated single-container execution, and DPDP-compliant data governance.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-neutral-400 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_#34D399]" />
              <span>CHAKRIVA Labs &bull; DPDP Act 2023 Compliant</span>
            </div>
          </div>

          {/* System Pillars Col */}
          <div className="space-y-3">
            <h6 className="text-[12px] font-semibold uppercase tracking-wider text-white font-mono">
              System Pillars
            </h6>
            <ul className="space-y-2.5 text-[12px] font-sans">
              <li className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span>Isolated Docker Sandbox</span>
              </li>
              <li className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>Socratic AI Mentorship</span>
              </li>
              <li className="flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-sky-400" />
                <span>Directed Curriculum DAGs</span>
              </li>
              <li className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                <span>Monaco Engineering Studio</span>
              </li>
            </ul>
          </div>

          {/* Navigation & Resources */}
          <div className="space-y-3">
            <h6 className="text-[12px] font-semibold uppercase tracking-wider text-white font-mono">
              Navigation
            </h6>
            <ul className="space-y-2 text-[12px] font-mono">
              <li>
                <Link to="/roadmaps" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>Curriculum DAGs</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-600 group-hover:text-sky-400 transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/sheets" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>Curated Sheets</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-600 group-hover:text-sky-400 transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/ide" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>Standalone Cloud IDE</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-600 group-hover:text-sky-400 transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/app/diagnostic" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>Empirical Diagnostic</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-600 group-hover:text-sky-400 transition-colors" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Policy (Mandatory for Indian Payment Gateways & DPDP) */}
          <div className="space-y-3">
            <h6 className="text-[12px] font-semibold uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-sky-400" />
              <span>Legal &amp; Policy</span>
            </h6>
            <ul className="space-y-2 text-[12px] font-mono">
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>Privacy Policy (DPDP)</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-600 group-hover:text-sky-400 transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>Terms of Service &amp; AUP</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-600 group-hover:text-sky-400 transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>Cookie &amp; Storage</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-600 group-hover:text-sky-400 transition-colors" />
                </Link>
              </li>
              <li>
                <Link to="/refunds" className="hover:text-white transition-colors flex items-center justify-between group">
                  <span>Refund &amp; Cancellation</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-600 group-hover:text-sky-400 transition-colors" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Datum Row */}
        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-neutral-500 gap-3">
          <span>&copy; {new Date().getFullYear()} Chakriva Labs Private Limited. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <span>&bull;</span>
            <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
            <span>&bull;</span>
            <Link to="/refunds" className="hover:text-white transition-colors">Refunds</Link>
            <span>&bull;</span>
            <a href="mailto:grievance@chakriva.com" className="hover:text-sky-400 transition-colors">Grievance Desk</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
