import React from 'react';
import { LegalLayout, type TocItem } from '@/components/legal/LegalLayout';
import {
  ShieldCheck,
  Database,
  UserCheck,
  Server,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PRIVACY_TOC: TocItem[] = [
  { id: 'statutory-scope', label: 'Statutory Scope & DPDP Act Alignment' },
  { id: 'data-collected', label: 'Personal Data We Collect' },
  { id: 'pedagogical-analytics', label: 'Problem-Solving & Spaced-Repetition Analytics' },
  { id: 'third-party-processors', label: 'Third-Party Data Processors (Supabase & Cloud)' },
  { id: 'code-privacy', label: 'Submitted Code & Execution Sandboxing' },
  { id: 'data-principal-rights', label: 'Data Principal Rights Under DPDP Act 2023' },
  { id: 'withdrawal-deletion', label: 'Consent Withdrawal & Account Deletion Protocol' },
  { id: 'grievance-officer', label: 'Grievance Redressal Mechanism & Officer Details' },
  { id: 'security-retention', label: 'Data Security, Encryption & Retention Schedule' },
];

export const PrivacyPolicyView: React.FC = () => {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="Comprehensive data governance and privacy practices compliant with India's Digital Personal Data Protection (DPDP) Act, 2023 and the Information Technology Act, 2000."
      badge="DPDP Act 2023 Compliant"
      lastUpdated="November 18, 2026"
      currentPolicy="privacy"
      toc={PRIVACY_TOC}
    >
      {/* Executive Summary Card */}
      <section className="p-5 rounded-2xl border border-primary/20 bg-primary/[0.03] space-y-3">
        <div className="flex items-center gap-2 text-primary font-mono text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>DPDP Act 2023 • Educational Data Charter</span>
        </div>
        <p className="text-text-primary font-medium text-sm leading-relaxed">
          Chakriva Labs (&quot;Chakriva&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates an advanced engineering learning platform. We collect only what is strictly required to deliver personalized adaptive roadmaps, evaluate submitted code in isolated environments, and compute cognitive retention curves. We do not sell your personal data, we do not monetize via advertising networks, and we never use your private code solutions to train commercial public foundation models.
        </p>
      </section>

      {/* Section 1 */}
      <section id="statutory-scope" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            1
          </span>
          <span>Statutory Scope &amp; DPDP Act 2023 Alignment</span>
        </h2>
        <p>
          This Privacy Policy governs the processing of digital personal data by Chakriva Labs under the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act 2023)</strong> and the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules</strong>.
        </p>
        <p>
          For the purposes of the DPDP Act 2023, Chakriva Labs serves as the <strong>Data Fiduciary</strong> in determining the purpose and means of educational data processing. You, the registered user or student, are the <strong>Data Principal</strong>. Processing occurs solely upon receiving your free, specific, informed, unconditional, and unambiguous consent, or under applicable legitimate pedagogical uses as defined by Indian law.
        </p>
      </section>

      {/* Section 2 */}
      <section id="data-collected" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            2
          </span>
          <span>Personal Data We Collect</span>
        </h2>
        <p>
          We strictly adhere to data minimization. The categories of digital personal data collected across the platform include:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
            <div className="flex items-center gap-2 font-semibold text-text-primary text-xs font-mono">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Identity &amp; Profile Data</span>
            </div>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
              <li>Full Name and preferred username/handle</li>
              <li>Verified email address</li>
              <li>Hashed cryptographic credentials (managed via Supabase Auth; Chakriva staff never see plaintext passwords)</li>
              <li>Institutional affiliation (college/university, graduation year) for campus leaderboards</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
            <div className="flex items-center gap-2 font-semibold text-text-primary text-xs font-mono">
              <Layers className="w-4 h-4 text-primary" />
              <span>OAuth 2.0 Third-Party Profiles</span>
            </div>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
              <li>GitHub Profile Data: Public ID, avatar URL, public username, verified primary email</li>
              <li>Google OAuth Data: Account identifier, verified email, profile picture</li>
              <li>We request minimal OAuth scopes (read-only identity). We never request repo write privileges or private email access.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section id="pedagogical-analytics" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            3
          </span>
          <span>Problem-Solving &amp; Spaced-Repetition Analytics</span>
        </h2>
        <p>
          To calibrate your personalized roadmap and calculate memory decay intervals, our engine computes and persists structured behavioral analytics:
        </p>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-elevated text-text-primary font-mono font-semibold">
                <th className="p-3">Data Point</th>
                <th className="p-3">Pedagogical Purpose</th>
                <th className="p-3">Storage &amp; Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text-secondary">
              <tr>
                <td className="p-3 font-mono text-text-primary">Ebbinghaus Retention Stats</td>
                <td className="p-3">Models memory decay curves to trigger targeted revision reminders at optimal intervals (1d, 3d, 7d, 21d).</td>
                <td className="p-3 font-mono">Row Level Security (Private to your User ID)</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-text-primary">Problem Streak &amp; Velocity</td>
                <td className="p-3">Calculates daily practice consistency, pace adherence, and sprint completion telemetry.</td>
                <td className="p-3 font-mono">Public profile or anonymous option in settings</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-text-primary">Runtime Telemetry</td>
                <td className="p-3">Records execution runtime (ms) and RAM consumption (KB) to benchmark algorithmic complexity against optimal curves.</td>
                <td className="p-3 font-mono">Row Level Security (`submissions` table)</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-text-primary">Diagnostic Baseline</td>
                <td className="p-3">Evaluates mastery across Dynamic Programming, Graphs, Arrays, and Monotonic Invariants.</td>
                <td className="p-3 font-mono">Row Level Security (`user_diagnostics` table)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4 */}
      <section id="third-party-processors" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            4
          </span>
          <span>Third-Party Data Processors</span>
        </h2>
        <p>
          In accordance with Section 8(1) of the DPDP Act 2023, we explicitly disclose the third-party infrastructure and sub-processors engaged to process user data:
        </p>

        <div className="space-y-3">
          {/* Supabase */}
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-mono text-xs font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary text-sm">Supabase Inc. (Database &amp; Authentication)</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Primary Data Store
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                All relational user data, credentials, profiles, submissions, roadmap states, and NoteSpace documents are stored in managed PostgreSQL clusters hosted via Supabase. All tables enforce <strong>Row Level Security (RLS)</strong> with strict tenant isolation (`auth.uid() = user_id`). Supabase maintains SOC2 Type II, ISO 27001, and HIPAA compliance certifications.
              </p>
            </div>
          </div>

          {/* Cloud Judge Runners */}
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 font-mono text-xs font-bold">
              <Server className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary text-sm">Sandboxed Code Judge Infrastructure (AWS / Cloud Compute)</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Ephemeral Execution
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                When you submit code for evaluation, your source code is securely transferred via encrypted mTLS queues to pre-warmed, single-container worker nodes. Code is executed under ephemeral, network-disabled Linux containers with cgroup resource ceilings (256MB RAM / 2.0s CPU) and immediately wiped upon verdict completion.
              </p>
            </div>
          </div>

          {/* AI Mentorship */}
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 font-mono text-xs font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary text-sm">Chakriva Socratic AI Mentor (Enterprise LLM Gateways)</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Zero Data Retention
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                When you request hints or Socratic analysis from the AI Mentor, queries are processed via enterprise API agreements (Google Cloud Vertex / Anthropic / OpenAI API). These agreements explicitly stipulate <strong>zero data retention</strong>: your code snippets, problem context, and conversational prompts are never used to train or fine-tune public foundation models.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 */}
      <section id="code-privacy" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            5
          </span>
          <span>Submitted Code &amp; Execution Sandboxing</span>
        </h2>
        <p>
          You retain complete intellectual property ownership over the source code you author. When submitted for testing:
        </p>
        <ul className="text-xs space-y-2 list-disc list-inside">
          <li><strong>Confidentiality:</strong> Your code is private to your account. Other users cannot view your submissions unless you voluntarily share an exported snippet or participate in an opt-in public code review.</li>
          <li><strong>Zero Network Egress:</strong> The judge sandbox operates with complete network isolation. Your code cannot ping external servers, and external actors cannot intercept compiler streams.</li>
          <li><strong>Anti-Cheating Telemetry:</strong> In competitive timed contests, submission hashes are evaluated for automated plagiarism and collusion detection to protect leaderboard fairness.</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section id="data-principal-rights" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            6
          </span>
          <span>Data Principal Rights Under DPDP Act 2023</span>
        </h2>
        <p>
          Under Chapter III of the DPDP Act 2023, Indian users possess statutory rights regarding their personal data:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <h3 className="font-semibold text-text-primary">1. Right to Access Information</h3>
            <p className="text-text-secondary">Request a readable summary of personal data collected, processing activities undertaken, and identities of all third-party sub-processors.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <h3 className="font-semibold text-text-primary">2. Right to Correction &amp; Erasure</h3>
            <p className="text-text-secondary">Correct inaccurate profile data, update institutional links, or request complete irreversible erasure of your educational account.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <h3 className="font-semibold text-text-primary">3. Right of Grievance Redressal</h3>
            <p className="text-text-secondary">Expeditious redressal of any privacy disputes or data-handling grievances via our designated Grievance Officer.</p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <h3 className="font-semibold text-text-primary">4. Right to Nominate</h3>
            <p className="text-text-secondary">Designate an individual who will exercise data principal rights on your behalf in the event of death or incapacity.</p>
          </div>
        </div>
      </section>

      {/* Section 7 */}
      <section id="withdrawal-deletion" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            7
          </span>
          <span>Consent Withdrawal &amp; Account Deletion Protocol</span>
        </h2>
        <p>
          Consent withdrawal is straightforward and free. You have the right to withdraw consent at any time:
        </p>
        <div className="p-4 rounded-xl border border-border bg-surface space-y-3 text-xs">
          <div className="font-semibold text-text-primary font-mono">How to Request Erasure or Withdraw Consent:</div>
          <ol className="list-decimal list-inside space-y-1.5 text-text-secondary">
            <li>
              <strong>Self-Service:</strong> Navigate to <Link to="/app/settings" className="text-primary hover:underline font-mono">Settings &rarr; Account</Link> to update personal information or initiate account deactivation.
            </li>
            <li>
              <strong>Direct Request:</strong> Email our Grievance Officer at{' '}
              <a href="mailto:grievance@chakriva.com" className="text-primary font-mono hover:underline">
                grievance@chakriva.com
              </a>{' '}
              from your registered email address with the subject line <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-text-primary">&quot;DPDP Data Erasure Request&quot;</code>.
            </li>
          </ol>
          <div className="p-3 rounded-lg bg-surface-elevated border border-border text-[11px] text-text-muted leading-relaxed">
            <strong>Effect of Withdrawal:</strong> Upon verifying your identity, our automated deletion pipeline cascades across database tables, purging your profile, code submissions, Ebbinghaus retention stats, and notes within <strong>7 business days</strong>. Anonymous, aggregated platform benchmarks (e.g., overall problem difficulty percentages) that cannot identify you may be retained for system calibration.
          </div>
        </div>
      </section>

      {/* Section 8 */}
      <section id="grievance-officer" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            8
          </span>
          <span>Grievance Redressal Mechanism &amp; Officer Details</span>
        </h2>
        <p>
          Under Section 13 of the DPDP Act 2023, Chakriva Labs has designated a primary Grievance Officer to address user data inquiries and security concerns.
        </p>

        <div className="p-5 rounded-xl border border-primary/20 bg-surface space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-mono text-text-muted">Designation:</div>
              <div className="font-semibold text-text-primary text-sm">Data Protection Grievance Officer</div>
              <div className="text-text-muted text-[11px]">Chakriva Labs Private Limited</div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-text-muted">Direct Email:</div>
              <a href="mailto:grievance@chakriva.com" className="font-mono text-primary font-semibold hover:underline text-sm">
                grievance@chakriva.com
              </a>
              <div className="text-text-muted text-[11px]">CC: privacy@chakriva.com</div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-text-muted">Operational Office:</div>
              <div className="text-text-primary">Bengaluru Tech Hub, Karnataka 560103, India</div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-text-muted">Statutory Response SLA:</div>
              <div className="text-text-primary font-mono">Acknowledgement &le; 24h &bull; Redressal &le; 15 days</div>
            </div>
          </div>
          <p className="text-[11px] text-text-muted border-t border-border pt-2 leading-relaxed">
            If a grievance is not resolved within the statutory period, users have the right to file an appeal before the <strong>Data Protection Board of India (DPBI)</strong> in accordance with Section 13(4) of the DPDP Act 2023.
          </p>
        </div>
      </section>

      {/* Section 9 */}
      <section id="security-retention" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            9
          </span>
          <span>Data Security, Encryption &amp; Retention Schedule</span>
        </h2>
        <p>
          We employ state-of-the-art defense-in-depth security measures to protect your educational assets:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-border bg-surface">
            <div className="font-semibold text-text-primary mb-1">In Transit</div>
            <p className="text-text-muted">All web and API traffic is encrypted using TLS 1.3 with strict HSTS headers.</p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-surface">
            <div className="font-semibold text-text-primary mb-1">At Rest</div>
            <p className="text-text-muted">PostgreSQL storage and backups are encrypted via industry-standard AES-256 keys.</p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-surface">
            <div className="font-semibold text-text-primary mb-1">In Memory / Sandbox</div>
            <p className="text-text-muted">Docker judge worker nodes execute code ephemerally with zero persistent disk retention.</p>
          </div>
        </div>
      </section>
    </LegalLayout>
  );
};

export default PrivacyPolicyView;
