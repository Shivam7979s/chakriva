import React from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/seo/SEOHead';
import {
  Cpu,
  Compass,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Sparkles,
  Activity,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  const leadershipSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About CHAKRIVA — Founder Shivam Singh & Architectural Mission',
    description:
      'Learn about CHAKRIVA, founded and architected by Shivam Singh. An intelligent coding-learning and interview-preparation platform featuring adaptive roadmaps, curated sheets, and isolated code judge.',
    url: 'https://verniq.vercel.app/about',
    mainEntity: {
      '@type': 'Person',
      '@id': 'https://verniq.vercel.app/#founder',
      name: 'Shivam Singh',
      jobTitle: 'Founder & Lead Architect',
      worksFor: {
        '@type': 'Organization',
        name: 'CHAKRIVA',
        url: 'https://verniq.vercel.app/',
      },
      sameAs: [
        'https://www.linkedin.com/in/shivam-singh-367388327/',
        'https://x.com/ShivamS51270320',
        'https://www.instagram.com/shivam_singh_rajput791/',
      ],
    },
  };

  const corePillars = [
    {
      icon: Compass,
      title: 'Adaptive Capacity Roadmaps',
      badge: 'Dynamic Scheduling',
      description:
        'Directed Acyclic Graphs (DAGs) that dynamically recalculate study pacing when you miss a day. Eliminates schedule guilt by redistributing problem quotas across upcoming high-availability weekend buffers.',
    },
    {
      icon: Terminal,
      title: 'Isolated Multi-Language Judge',
      badge: 'Zero-Pause Workers',
      description:
        'Secure Docker worker nodes evaluating Java 21 (JVM optimized), C++20 (GCC), and Python 3.12 under microsecond telemetry with strict memory quotas and zero persistent disk retention.',
    },
    {
      icon: ShieldCheck,
      title: 'Canonical 80/150/200 Test Suites',
      badge: 'Extreme Rigor',
      description:
        'Unlike conventional platforms testing against only 15–30 inputs, CHAKRIVA subjects Easy problems to 80 tests, Medium to 150, and Hard to 200 adversarial edge cases, max-constraint arrays, and corner overflows.',
    },
    {
      icon: Activity,
      title: 'Decay-Based Spaced Repetition',
      badge: 'Cognitive Science',
      description:
        'Calculates memory retention decay curves (Ebbinghaus algorithm) to resurface solved algorithmic invariants at 3, 7, and 21-day milestones, preventing the common trap of forgetting patterns weeks before the interview.',
    },
    {
      icon: Cpu,
      title: 'Context-Aware AI Mentorship',
      badge: 'Zero Hallucination',
      description:
        'Provides Socratic guidance rooted strictly in compilation vectors, memory profiling, and failed test bounds. Guides learners to deduce invariants without giving away code spoilers.',
    },
    {
      icon: Layers,
      title: 'Curated Invariant Sheets',
      badge: 'Targeted Mastery',
      description:
        'Synchronized sheets including the Chakriva Core 150, SDE Foundations 75 (Blind 75 Alternative), and company invariant packs for Google, Amazon, Meta, and Microsoft.',
    },
  ];

  const targetCompanies = [
    'Google',
    'Amazon',
    'Meta',
    'Microsoft',
    'Apple',
    'Uber',
    'Stripe',
    'Atlassian',
    'Netflix',
    'Palantir',
  ];

  return (
    <div className="relative min-h-screen bg-[#08090B] text-[#F3F4F6] selection:bg-[#22D3EE]/25 selection:text-[#22D3EE]">
      <SEOHead
        title="About CHAKRIVA — Founder Shivam Singh & Architectural Mission"
        description="CHAKRIVA was founded and architected by Shivam Singh to replace fragmented coding sheets with an intelligent, adaptive preparation engine featuring an isolated code judge and retention tracking."
        canonicalPath="/about"
        keywords={[
          'shivam singh',
          'who is the founder of chakriva',
          'founder of chakriva',
          'shivam singh chakriva',
          'about chakriva',
          'chakriva labs',
          'coding interview platform',
          'adaptive coding roadmaps',
          'leetcode alternative founder',
          'technical interview prep',
        ]}
        jsonLd={leadershipSchema}
      />

      {/* Ambient Radial Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.06),transparent_65%)]" />

      {/* Main Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-8">
          <Link to="/" className="hover:text-zinc-300 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#22D3EE]">About Leadership &amp; Architecture</span>
        </div>

        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-20 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-xs font-mono text-[#22D3EE]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Leadership &amp; Mission</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Preparation. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22D3EE] via-[#A4F4FD] to-[#38BDF8]">
              Engineered, Not Improvised.
            </span>
          </h1>

          <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
            CHAKRIVA was founded to solve the chronic fragmentation of tech interview preparation.
            We replace scattered spreadsheets, random video links, and disjointed problem tabs with an
            intelligent, adaptive ecosystem built on engineering-first principles.
          </p>
        </section>

        {/* ================================================================== */}
        {/* FOUNDER & LEADERSHIP DOSSIER (Entity Authority & Google E-E-A-T)    */}
        {/* ================================================================== */}
        <section className="mb-24">
          <div className="rounded-3xl border border-[#1C2230] bg-gradient-to-b from-[#0F1422] to-[#0A0D15] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#22D3EE]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Profile Avatar / Visual */}
              <div className="lg:col-span-4 flex flex-col items-center text-center">
                <div className="relative group">
                  <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl bg-gradient-to-br from-[#22D3EE] to-[#0B2551] p-1 shadow-xl">
                    <img
                      src="/riva-avatar.png"
                      alt="Shivam Singh — Founder & Lead Architect of CHAKRIVA"
                      className="w-full h-full object-cover rounded-[14px] bg-[#0B0F19]"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-[#0B0F19] border border-[#22D3EE] text-[10px] font-mono text-[#22D3EE]">
                    Verified Founder
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mt-4">Shivam Singh</h2>
                <p className="text-xs font-mono text-[#22D3EE] mt-0.5">
                  Founder &amp; Lead Systems Architect
                </p>

                {/* Verified Social Channels */}
                <div className="flex items-center gap-3 mt-4">
                  <a
                    href="https://www.linkedin.com/in/shivam-singh-367388327/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#141A29] hover:bg-[#22D3EE]/20 hover:text-[#22D3EE] text-zinc-400 border border-[#1C2230] transition-colors"
                    title="Shivam Singh on LinkedIn"
                  >
                    <span className="text-xs font-mono font-semibold">LinkedIn &rarr;</span>
                  </a>
                  <a
                    href="https://x.com/ShivamS51270320"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#141A29] hover:bg-white/20 hover:text-white text-zinc-400 border border-[#1C2230] transition-colors"
                    title="Shivam Singh on X / Twitter"
                  >
                    <span className="text-xs font-mono font-semibold">X / Twitter &rarr;</span>
                  </a>
                  <a
                    href="https://www.instagram.com/shivam_singh_rajput791/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#141A29] hover:bg-pink-500/20 hover:text-pink-400 text-zinc-400 border border-[#1C2230] transition-colors"
                    title="Shivam Singh on Instagram"
                  >
                    <span className="text-xs font-mono font-semibold">Instagram &rarr;</span>
                  </a>
                </div>
              </div>

              {/* Founder Narrative & Vision */}
              <div className="lg:col-span-8 space-y-4 text-zinc-300 text-sm leading-relaxed">
                <div className="text-xs font-mono uppercase tracking-wider text-[#22D3EE]">
                  The Founder's Story &amp; Thesis
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-white">
                  "Engineers don't fail interviews due to lack of effort. They fail due to lack of a system."
                </h3>
                <p>
                  I created <strong>CHAKRIVA</strong> after witnessing candidates solve 300+ LeetCode questions
                  yet choke during live FAANG interviews because they couldn't remember fundamental invariants
                  solved two months prior. The industry standard was fundamentally broken: learners were forced
                  to maintain manual Excel sheets, watch uncurated videos, and guess which concepts to revise.
                </p>
                <p>
                  CHAKRIVA merges cognitive science with production infrastructure:
                </p>
                <ul className="space-y-2 list-none p-0">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#22D3EE] mt-0.5 shrink-0" />
                    <span>
                      <strong>Adaptive Capacity Scheduling:</strong> If you miss Tuesday because of production emergencies,
                      the engine dynamically absorbs the deficit across your upcoming weekend hours.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#22D3EE] mt-0.5 shrink-0" />
                    <span>
                      <strong>Extreme Test Rigor:</strong> Solutions must hold against up to 200 adversarial edge cases
                      evaluated by an isolated, sub-millisecond multi-language compiler judge.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#22D3EE] mt-0.5 shrink-0" />
                    <span>
                      <strong>Memory Decay Recalibration:</strong> Automated prompts trigger revision before topic retention
                      fades from your active recall memory.
                    </span>
                  </li>
                </ul>
                <div className="pt-2 text-xs font-mono text-zinc-400">
                  Direct Inquiries: <a href="mailto:grievance@chakriva.com" className="text-[#22D3EE] hover:underline">grievance@chakriva.com</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* PLATFORM ARCHITECTURAL PILLARS (Keyword Density & Deep Authority)  */}
        {/* ================================================================== */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-2xl md:text-4xl font-bold text-white">
              Six Architectural Pillars of CHAKRIVA
            </h2>
            <p className="text-xs md:text-sm text-zinc-400">
              Designed from first principles to outperform static spreadsheets and legacy problem judges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {corePillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#1C2230] bg-[#0B0F19] p-6 space-y-3 hover:border-[#22D3EE]/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#141A29] border border-[#1C2230] flex items-center justify-center text-[#22D3EE] group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#141A29] border border-[#1C2230] text-zinc-400">
                      {p.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{p.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{p.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================== */}
        {/* ENTERPRISE COMPARISON TABLE (SEO / GEO High-Intent Query Capture)  */}
        {/* ================================================================== */}
        <section className="mb-24">
          <div className="rounded-2xl border border-[#1C2230] bg-[#0B0F19] p-6 md:p-8">
            <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
              <h2 className="text-xl md:text-3xl font-bold text-white">
                How CHAKRIVA Compares to Industry Standards
              </h2>
              <p className="text-xs text-zinc-400">
                Detailed comparison vs traditional practice platforms and static PDF/sheets.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1C2230] text-zinc-400 font-mono uppercase tracking-wider">
                    <th className="py-3 px-4">Dimension</th>
                    <th className="py-3 px-4">Traditional (LeetCode, HackerRank)</th>
                    <th className="py-3 px-4">Static Sheets (Striver, NeetCode)</th>
                    <th className="py-3 px-4 text-[#22D3EE] font-bold">CHAKRIVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C2230] text-zinc-300">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Schedule Adaptation</td>
                    <td className="py-3 px-4 text-zinc-500">None; random problem grinding</td>
                    <td className="py-3 px-4 text-zinc-500">Rigid checkbox; creates guilt when behind</td>
                    <td className="py-3 px-4 text-[#22D3EE] font-medium">Dynamic Mon–Sun rollover based on capacity</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Test Suite Rigor</td>
                    <td className="py-3 px-4 text-zinc-500">15–30 tests with hidden runtime limits</td>
                    <td className="py-3 px-4 text-zinc-500">None (manual verification)</td>
                    <td className="py-3 px-4 text-[#22D3EE] font-medium">80 / 150 / 200 Canonical Test Suites</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Spaced Repetition</td>
                    <td className="py-3 px-4 text-zinc-500">None; reliance on user memory</td>
                    <td className="py-3 px-4 text-zinc-500">None</td>
                    <td className="py-3 px-4 text-[#22D3EE] font-medium">Automated 3/7/21 day memory decay tracker</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">Compiler Isolation</td>
                    <td className="py-3 px-4 text-zinc-500">Shared containers; GC pauses</td>
                    <td className="py-3 px-4 text-zinc-500">External IDE only</td>
                    <td className="py-3 px-4 text-[#22D3EE] font-medium">Isolated micro-VM workers (Java, C++, Python)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-white">AI Feedback</td>
                    <td className="py-3 px-4 text-zinc-500">Generic ChatGPT sidebars with spoilers</td>
                    <td className="py-3 px-4 text-zinc-500">None</td>
                    <td className="py-3 px-4 text-[#22D3EE] font-medium">Socratic invariant guidance without hallucination</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* COMPANY PACKS & TARGET TRACKS                                     */}
        {/* ================================================================== */}
        <section className="mb-24 text-center">
          <div className="text-xs font-mono uppercase text-[#22D3EE] mb-2 tracking-wider">
            Target Company Invariant Packs
          </div>
          <h2 className="text-xl md:text-3xl font-bold text-white mb-6">
            Engineered for Top-Tier Tech Interviews
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-3xl mx-auto">
            {targetCompanies.map((c) => (
              <Link
                key={c}
                to="/sheets"
                className="px-4 py-2 rounded-xl bg-[#0B0F19] border border-[#1C2230] text-xs font-mono text-zinc-300 hover:border-[#22D3EE] hover:text-[#22D3EE] transition-colors"
              >
                {c} Invariants &rarr;
              </Link>
            ))}
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="text-center rounded-3xl border border-[#1C2230] bg-gradient-to-b from-[#0F1422] to-[#0A0D15] p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Ready to upgrade from static spreadsheets?
          </h2>
          <p className="text-xs md:text-sm text-zinc-400 max-w-lg mx-auto mb-8 leading-relaxed">
            Join thousands of developers using CHAKRIVA's adaptive roadmap and isolated code judge.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all shadow-lg"
            >
              Get Started Free &rarr;
            </Link>
            <Link
              to="/roadmaps"
              className="px-6 py-3 rounded-full border border-white/20 text-white font-medium text-sm hover:bg-white/5 transition-colors"
            >
              Explore Roadmaps
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutView;
