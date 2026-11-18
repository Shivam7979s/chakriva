import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, GitBranch, Cpu, Scale, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-surface text-text-secondary mt-auto">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-10 text-left">
          {/* Col 1: Brand & Identity */}
          <div className="lg:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2 font-mono font-bold text-text-primary text-base">
              <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/30 text-primary flex items-center justify-center text-xs">
                <span>&gt;_</span>
              </div>
              <span>CHAKRIVA</span>
            </div>
            <p className="text-[12px] text-text-muted leading-relaxed max-w-sm">
              Intelligent coding-learning and interview-preparation platform. Built on first principles of systems architecture, isolated single-container Docker execution, and DPDP-compliant data governance.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>DPDP Act 2023 Compliant</span>
              </span>
              <span className="text-text-muted">Chakriva Labs &bull; Bengaluru</span>
            </div>
          </div>

          {/* Col 2: Platform & Curriculum */}
          <div className="space-y-3">
            <h6 className="text-[12px] font-semibold uppercase tracking-wider text-text-primary font-mono">
              Curriculum &amp; Labs
            </h6>
            <ul className="space-y-2 text-[12px]">
              <li>
                <Link to="/problems" className="hover:text-text-primary transition-colors">
                  Problem Bank (3,392+)
                </Link>
              </li>
              <li>
                <Link to="/roadmaps" className="hover:text-text-primary transition-colors">
                  Curriculum DAGs
                </Link>
              </li>
              <li>
                <Link to="/sheets" className="hover:text-text-primary transition-colors">
                  Curated Sheets (100 / 450)
                </Link>
              </li>
              <li>
                <Link to="/ide" className="hover:text-text-primary transition-colors">
                  Standalone Cloud IDE
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-text-primary transition-colors">
                  Campus Leaderboards
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: System Architecture */}
          <div className="space-y-3">
            <h6 className="text-[12px] font-semibold uppercase tracking-wider text-text-primary font-mono">
              Architecture Specs
            </h6>
            <ul className="space-y-2 text-[12px]">
              <li className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Isolated Docker Sandbox</span>
              </li>
              <li className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Socratic AI Mentorship</span>
              </li>
              <li className="flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Directed Mastery Graphs</span>
              </li>
              <li>
                <Link to="/architecture" className="hover:text-text-primary transition-colors inline-flex items-center gap-1 text-[11px] text-primary">
                  <span>Architecture Whitepaper</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform Legal & Compliance (Required for Payment Gateways & DPDP) */}
          <div className="space-y-3">
            <h6 className="text-[12px] font-semibold uppercase tracking-wider text-text-primary font-mono flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-primary" />
              <span>Legal &amp; Policy</span>
            </h6>
            <ul className="space-y-2 text-[12px]">
              <li>
                <Link to="/privacy" className="hover:text-text-primary transition-colors">
                  Privacy Policy (DPDP 2023)
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-text-primary transition-colors">
                  Terms of Service &amp; AUP
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-text-primary transition-colors">
                  Cookie &amp; Local Storage
                </Link>
              </li>
              <li>
                <Link to="/refunds" className="hover:text-text-primary transition-colors">
                  Pricing &amp; Refund Policy
                </Link>
              </li>
              <li>
                <a
                  href="mailto:grievance@chakriva.com"
                  className="text-text-muted hover:text-text-primary transition-colors text-[11px] font-mono flex items-center gap-1"
                >
                  <span>Grievance Officer &rarr;</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Datum Row */}
        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between text-[11px] text-text-muted gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Chakriva Labs Private Limited. All rights reserved.</span>
            <span className="hidden sm:inline">&bull;</span>
            <span>CIN: EdTech Educational Software as a Service</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-text-muted font-mono">
            <Link to="/privacy" className="hover:text-text-primary transition-colors">
              Privacy
            </Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-text-primary transition-colors">
              Terms
            </Link>
            <span>&bull;</span>
            <Link to="/cookies" className="hover:text-text-primary transition-colors">
              Cookies
            </Link>
            <span>&bull;</span>
            <Link to="/refunds" className="hover:text-text-primary transition-colors">
              Refunds
            </Link>
            <span>&bull;</span>
            <a href="mailto:grievance@chakriva.com" className="hover:text-primary transition-colors">
              Grievance Desk
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
