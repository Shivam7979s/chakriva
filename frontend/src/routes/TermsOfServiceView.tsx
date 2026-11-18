import React from 'react';
import { SEOHead } from '@/components/seo/SEOHead';
import { LegalLayout, type TocItem } from '@/components/legal/LegalLayout';
import {
  ShieldAlert,
  Cpu,
  Ban,
  AlertTriangle,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

const TERMS_TOC: TocItem[] = [
  { id: 'contractual-agreement', label: '1. Acceptance of Terms & Eligibility' },
  { id: 'judge-aup', label: '2. Acceptable Use Policy (AUP) for Code Judge' },
  { id: 'security-sanctions', label: '3. Zero-Tolerance Security Sanctions' },
  { id: 'code-ownership', label: '4. Intellectual Property & Code Ownership' },
  { id: 'platform-assets', label: '5. Chakriva Proprietary Assets & Content' },
  { id: 'anti-scraping', label: '6. Anti-Scraping & Credential Sharing Prohibitions' },
  { id: 'contest-integrity', label: '7. Contest Integrity & Anti-Cheating Protocol' },
  { id: 'termination-suspension', label: '8. Account Termination Rights' },
  { id: 'disclaimers-liability', label: '9. Disclaimers & Limitation of Liability' },
  { id: 'governing-law', label: '10. Governing Law & Dispute Resolution' },
];

export const TermsOfServiceView: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Terms of Service & Code Execution AUP"
        description="Legally binding terms governing CHAKRIVA platform access, isolated compiler sandbox utilization, intellectual property ownership, and acceptable conduct."
        canonicalPath="/terms"
      />
      <LegalLayout
      title="Terms of Service"
      subtitle="Legally binding terms governing platform access, isolated compiler sandbox utilization, intellectual property ownership, and acceptable conduct."
      badge="Code Execution Governance"
      lastUpdated="November 18, 2026"
      currentPolicy="terms"
      toc={TERMS_TOC}
    >
      {/* High-Alert AUP Warning Banner */}
      <section className="p-5 rounded-2xl border border-red-500/30 bg-red-500/[0.04] space-y-3">
        <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-semibold uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Critical Warning — Code Execution Sandbox Integrity</span>
        </div>
        <p className="text-text-primary font-medium text-sm leading-relaxed">
          Chakriva provides isolated containerized execution environments to compile and test code solutions. Submitting malicious software, fork bombs, crypto miners, network probes, or attempting container breakouts results in an <strong>immediate, permanent account ban without appeal</strong>, IP blacklisting, and reporting to legal authorities under the <strong>Indian Information Technology Act, 2000</strong>.
        </p>
      </section>

      {/* Section 1 */}
      <section id="contractual-agreement" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            1
          </span>
          <span>Acceptance of Terms &amp; Eligibility</span>
        </h2>
        <p>
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;) and <strong>Chakriva Labs Private Limited</strong> (&quot;Chakriva Labs&quot;, &quot;we&quot;, &quot;our&quot;). By creating an account, browsing our problem catalog, or dispatching code to our execution judge, you signify unconditional acceptance of these Terms.
        </p>
        <p>
          <strong>Eligibility:</strong> You must be at least 18 years of age (or have verified consent from a parent or legal guardian if between 13 and 17) to register. The platform is designed for engineering students, software professionals, and technical interview candidates.
        </p>
      </section>

      {/* Section 2: Code Execution Judge AUP */}
      <section id="judge-aup" className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-red-500/10 text-red-400 text-xs font-mono flex items-center justify-center border border-red-500/20">
              2
            </span>
            <span>Acceptable Use Policy (AUP) for the Code Execution Judge</span>
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">
            Strict Zero-Tolerance
          </span>
        </div>
        <p>
          Our cloud judge executes submitted user code within isolated Linux containers governed by cgroup resource controllers (256MB RAM / 2.0s CPU), non-root execution profiles, and seccomp syscall filtering. You explicitly agree <strong>never</strong> to submit, compile, or execute any of the following:
        </p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-red-500/20 bg-surface space-y-2">
            <div className="flex items-center gap-2 font-mono font-semibold text-xs text-red-400">
              <Ban className="w-4 h-4 text-red-400" />
              <span>A. Denial of Service &amp; Resource Depletion Attacks</span>
            </div>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
              <li>Fork bombs, thread-spawning recursion bombs, or infinite process generation designed to crash container nodes.</li>
              <li>Intentional memory exhaustion payloads aimed at circumventing cgroup memory limits or destabilizing host daemons.</li>
              <li>Cryptocurrency mining scripts, distributed compute hijacking, or unauthorized long-running worker background jobs.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-red-500/20 bg-surface space-y-2">
            <div className="flex items-center gap-2 font-mono font-semibold text-xs text-red-400">
              <Terminal className="w-4 h-4 text-red-400" />
              <span>B. Network Scanning, Sockets &amp; Command-and-Control</span>
            </div>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
              <li>Attempting to open raw network sockets, establish outbound reverse shells, or initiate HTTP/TCP requests from the container.</li>
              <li>Scanning local subnet IP ranges (<code className="bg-surface-elevated px-1 py-0.5 rounded font-mono">10.0.0.0/8</code>, <code className="bg-surface-elevated px-1 py-0.5 rounded font-mono">172.16.0.0/12</code>, <code className="bg-surface-elevated px-1 py-0.5 rounded font-mono">192.168.0.0/16</code>) or attempting to reach internal cloud metadata endpoints.</li>
              <li>Hosting server daemons or socket listeners inside worker runners.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-red-500/20 bg-surface space-y-2">
            <div className="flex items-center gap-2 font-mono font-semibold text-xs text-red-400">
              <Cpu className="w-4 h-4 text-red-400" />
              <span>C. Sandbox Breakout &amp; Host Privilege Escalation</span>
            </div>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
              <li>Attempting to break out of Docker, gVisor, or nsjail containment; probing <code className="bg-surface-elevated px-1 py-0.5 rounded font-mono">/proc</code>, <code className="bg-surface-elevated px-1 py-0.5 rounded font-mono">/sys</code>, or kernel memory structures.</li>
              <li>Seeking to access the Docker daemon socket (<code className="bg-surface-elevated px-1 py-0.5 rounded font-mono">/var/run/docker.sock</code>) or host environment variables.</li>
              <li>Attempting to read hidden canonical test suite files directly from the execution runner filesystem rather than processing standard input.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3: Sanctions */}
      <section id="security-sanctions" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            3
          </span>
          <span>Zero-Tolerance Security Sanctions</span>
        </h2>
        <p>
          Chakriva deploys real-time anomaly detection across compiler dispatches. Any attempt to exploit, breach, or tamper with the judge infrastructure triggers automated containment protocols:
        </p>
        <div className="p-4 rounded-xl border border-border bg-surface text-xs space-y-2.5">
          <div className="flex items-center gap-2 font-mono font-semibold text-text-primary">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Automated Sanction Protocol:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-text-secondary">
            <li><strong>Immediate Account Revocation:</strong> Immediate and irreversible termination of user account and all active tokens without prior notice.</li>
            <li><strong>Forfeiture of Fees:</strong> Complete forfeiture of any paid subscription fees or balances without eligibility for refund.</li>
            <li><strong>Network Blacklisting:</strong> Permanent blacklisting of associated IP blocks, device fingerprints, and verified OAuth identities.</li>
            <li><strong>Statutory Prosecution:</strong> Mandatory escalation to cybercrime investigative cells under Section 43 (Damage to computer systems) and Section 66 (Hacking) of the Indian Information Technology Act, 2000.</li>
          </ol>
        </div>
      </section>

      {/* Section 4: Code Ownership */}
      <section id="code-ownership" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono flex items-center justify-center border border-emerald-500/20">
            4
          </span>
          <span>Intellectual Property &amp; Code Ownership</span>
        </h2>
        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] space-y-3 text-xs leading-relaxed">
          <div className="flex items-center gap-2 font-mono font-semibold text-emerald-400 uppercase tracking-wider text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>You Own 100% of the Code You Write</span>
          </div>
          <p className="text-text-primary text-sm font-medium">
            Chakriva Labs claims zero intellectual property rights over original algorithms, source code solutions, or study notes authored by you on the platform.
          </p>
          <p className="text-text-secondary">
            <strong>Limited Operational License:</strong> By submitting source code to our judge, you grant Chakriva Labs a non-exclusive, worldwide, royalty-free, limited license strictly and exclusively to compile, execute, benchmark, and evaluate your code against canonical test fixtures to return execution verdicts (Accepted, Wrong Answer, TLE, MLE) and compute your personalized mastery telemetry. We will never sell, publish, or sublicense your solutions without your explicit written authorization.
          </p>
        </div>
      </section>

      {/* Section 5: Chakriva Proprietary Assets */}
      <section id="platform-assets" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            5
          </span>
          <span>Chakriva Proprietary Assets &amp; Content</span>
        </h2>
        <p>
          Except for user-authored code solutions, all elements of the Chakriva platform are the exclusive intellectual property of <strong>Chakriva Labs Private Limited</strong>:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <div className="font-semibold text-text-primary">Problem Catalog &amp; Metadata</div>
            <p className="text-text-muted">Our 3,392+ custom VRQ problem statements, constraints, edge case formulations, and editorial guides.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <div className="font-semibold text-text-primary">Curriculum DAGs &amp; Algorithms</div>
            <p className="text-text-muted">Directed acyclic prerequisite graphs, Ebbinghaus spaced-repetition models, and adaptive roadmap engines.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <div className="font-semibold text-text-primary">Canonical Test Suites</div>
            <p className="text-text-muted">Proprietary test fixtures (80 to 200 edge tests per problem), automated input generators, and benchmarking suites.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <div className="font-semibold text-text-primary">UI Architecture &amp; Shaders</div>
            <p className="text-text-muted">Design system tokens, liquid glass visual refraction shaders, and Monaco integration extensions.</p>
          </div>
        </div>
      </section>

      {/* Section 6: Anti-Scraping */}
      <section id="anti-scraping" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            6
          </span>
          <span>Anti-Scraping &amp; Credential Sharing Prohibitions</span>
        </h2>
        <p>
          To safeguard platform integrity and protect our educational datasets:
        </p>
        <ul className="text-xs text-text-secondary space-y-2 list-disc list-inside">
          <li>
            <strong>Scraping Prohibition:</strong> You may not use automated bots, spiders, crawlers, headless scripts, or data-extraction tools to scrape, mirror, or bulk-harvest our 3,392+ problem catalog, test cases, or editorial materials.
          </li>
          <li>
            <strong>Credential Integrity:</strong> Accounts are granted for single-individual usage. Sharing login credentials, reselling account access, or pooling subscriptions across multiple students is strictly prohibited.
          </li>
          <li>
            <strong>Rate Limits:</strong> Chakriva enforces automated request rate limits across compiler dispatch endpoints. Bypassing rate limits via proxy rotation or automated scripts results in immediate IP blacklisting.
          </li>
        </ul>
      </section>

      {/* Section 7: Contest Integrity */}
      <section id="contest-integrity" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            7
          </span>
          <span>Contest Integrity &amp; Anti-Cheating Protocol</span>
        </h2>
        <p>
          In timed contests, weekly leagues, and campus leaderboard assessments:
        </p>
        <div className="p-4 rounded-xl border border-border bg-surface text-xs space-y-2">
          <p>
            All submitted solutions are evaluated by automated code similarity detectors (MOSS algorithms and AST structural hashing). The following constitute cheating:
          </p>
          <ul className="list-disc list-inside space-y-1 text-text-secondary">
            <li>Submitting solutions authored by another participant or generated verbatim via public AI tools during an active contest window.</li>
            <li>Collaborating across Discord, Telegram, WhatsApp, or private channels during real-time timed contests.</li>
            <li>Creating multiple accounts to inflate campus leaderboard scores or test edge cases in advance.</li>
          </ul>
          <p className="text-text-muted text-[11px] pt-1 border-t border-border">
            Confirmed violations result in disqualification from the contest, zeroing of contest rating, and potential campus reporting where institutional agreements exist.
          </p>
        </div>
      </section>

      {/* Section 8: Termination */}
      <section id="termination-suspension" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            8
          </span>
          <span>Account Termination Rights</span>
        </h2>
        <p>
          Chakriva Labs reserves the right to suspend or permanently terminate access to any account, with or without notice, in the event of:
        </p>
        <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
          <li>Violations of the Acceptable Use Policy (malicious code, sandbox escape attempts).</li>
          <li>Automated scraping or unauthorized mass download of problems and test suites.</li>
          <li>Account credential sharing or payment fraud.</li>
          <li>Extended account dormancy exceeding 24 consecutive months (following email notice).</li>
        </ul>
      </section>

      {/* Section 9: Disclaimers */}
      <section id="disclaimers-liability" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            9
          </span>
          <span>Disclaimers &amp; Limitation of Liability</span>
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          The Chakriva platform, online IDE, compiler workers, and AI mentorship tools are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. While we maintain a 99.9% uptime target for judge dispatch, we do not warrant that execution will be uninterrupted or error-free. To the maximum extent permitted under applicable law, Chakriva Labs shall not be liable for any indirect, incidental, special, or consequential damages resulting from compiler downtime, internet disruptions, or lost contest submissions. In no event shall our total liability exceed the subscription fees paid by you in the three (3) months preceding the claim.
        </p>
      </section>

      {/* Section 10: Governing Law */}
      <section id="governing-law" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            10
          </span>
          <span>Governing Law &amp; Dispute Resolution</span>
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          These Terms are governed by and construed in accordance with the laws of the Republic of India, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023. Any dispute arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts in <strong>Bengaluru, Karnataka, India</strong>.
        </p>
        <div className="pt-2 text-xs text-text-muted">
          For legal notices or service of process, address correspondence to:{' '}
          <a href="mailto:legal@chakriva.com" className="text-primary font-mono hover:underline font-semibold">
            legal@chakriva.com
          </a>
        </div>
      </section>
    </LegalLayout>
  </>
);
};

export default TermsOfServiceView;
