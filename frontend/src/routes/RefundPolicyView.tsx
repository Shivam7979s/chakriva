import React from 'react';
import { LegalLayout, type TocItem } from '@/components/legal/LegalLayout';
import {
  CheckCircle2,
  Clock,
  FileCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const REFUND_TOC: TocItem[] = [
  { id: 'kyc-compliance', label: '1. Payment Gateway KYC Disclosures' },
  { id: 'plans-pricing', label: '2. Subscription Plans & Pricing' },
  { id: 'cancellation-policy', label: '3. Cancellation Policy & Access Continuity' },
  { id: 'refund-eligibility', label: '4. 7-Day Refund Policy & Eligibility Rules' },
  { id: 'non-refundable', label: '5. Non-Refundable Exceptions & AUP Violations' },
  { id: 'settlement-timeline', label: '6. Settlement Mode & Timelines (RBI & PG Norms)' },
  { id: 'how-to-request', label: '7. Step-by-Step Refund Request Process' },
  { id: 'merchant-contact', label: '8. Billing Contact & Dispute Escalation' },
];

export const RefundPolicyView: React.FC = () => {
  return (
    <LegalLayout
      title="Pricing, Cancellation & Refund Policy"
      subtitle="Transparent billing terms, subscription cancellation rules, and 7-day refund guidelines compliant with Indian Payment Gateway (Razorpay, Cashfree, PhonePe) KYC regulations."
      badge="Payment Gateway KYC Compliant"
      lastUpdated="November 18, 2026"
      currentPolicy="refunds"
      toc={REFUND_TOC}
    >
      {/* Payment Gateway Merchant KYC Badge */}
      <section className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.04] space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold uppercase tracking-wider">
          <FileCheck className="w-4 h-4 text-cyan-400" />
          <span>Statutory Merchant Disclosure • Razorpay / Cashfree / PhonePe PG Ready</span>
        </div>
        <p className="text-text-primary font-medium text-sm leading-relaxed">
          This Cancellation &amp; Refund Policy is published by <strong>Chakriva Labs</strong> to satisfy merchant verification standards mandated by Indian payment gateways, aggregator platforms, and the Reserve Bank of India (RBI). All transactions are processed in Indian Rupees (INR &#8377;) for domestic customers and US Dollars ($) for international subscribers.
        </p>
      </section>

      {/* Section 1: Merchant Disclosures */}
      <section id="kyc-compliance" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            1
          </span>
          <span>Payment Gateway KYC Disclosures</span>
        </h2>
        <div className="p-4 rounded-xl border border-border bg-surface text-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-mono text-text-muted">Legal Entity Name:</span>
              <div className="font-semibold text-text-primary text-sm">Chakriva Labs Private Limited</div>
            </div>
            <div>
              <span className="text-[11px] font-mono text-text-muted">Platform Name:</span>
              <div className="font-semibold text-text-primary text-sm">CHAKRIVA (formerly VERNIQ)</div>
            </div>
            <div>
              <span className="text-[11px] font-mono text-text-muted">Merchant Business Category:</span>
              <div className="font-semibold text-text-primary">EdTech Software as a Service (Educational SaaS)</div>
            </div>
            <div>
              <span className="text-[11px] font-mono text-text-muted">Registered Office:</span>
              <div className="text-text-primary">Bengaluru Tech Hub, Karnataka 560103, India</div>
            </div>
            <div>
              <span className="text-[11px] font-mono text-text-muted">Direct Billing Support:</span>
              <a href="mailto:billing@chakriva.com" className="font-mono text-cyan-400 font-semibold hover:underline">
                billing@chakriva.com
              </a>
            </div>
            <div>
              <span className="text-[11px] font-mono text-text-muted">Supported Payment Methods:</span>
              <div className="text-text-primary">UPI (GPay, PhonePe, Paytm), Net Banking, Cards, EMI</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Plans & Pricing */}
      <section id="plans-pricing" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            2
          </span>
          <span>Subscription Plans &amp; Pricing</span>
        </h2>
        <p>
          Chakriva operates on a transparent freemium structure. You will never be charged without explicit affirmative authorization:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary text-sm font-mono">Community Tier</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Free Forever
              </span>
            </div>
            <div className="text-2xl font-bold text-text-primary font-mono">&#8377;0 <span className="text-xs text-text-muted font-normal">/ month</span></div>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
              <li>Full access to standard problem catalog</li>
              <li>Core directed curriculum DAGs</li>
              <li>Public community leaderboards &amp; basic submission queue</li>
              <li>Standalone Monaco Cloud IDE</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl border border-primary/30 bg-primary/[0.02] space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary text-sm font-mono">Chakriva Pro / Fellowship</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/20 text-primary border border-primary/30">
                Premium
              </span>
            </div>
            <div className="text-2xl font-bold text-text-primary font-mono">&#8377;899 <span className="text-xs text-text-muted font-normal">/ month (or &#8377;7,999 / year)</span></div>
            <ul className="text-xs text-text-secondary space-y-1.5 list-disc list-inside">
              <li>Full 3,392+ problems with 80–200 canonical test suites</li>
              <li>Sub-150ms pre-warmed priority Docker worker dispatch</li>
              <li>Socratic AI Mentor sessions for live hints &amp; invariant proofs</li>
              <li>Curated Top-Tier Company Target Sheets (FAANG / Startups)</li>
              <li>Ebbinghaus retention scheduler &amp; full diagnostics</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3: Cancellation Policy */}
      <section id="cancellation-policy" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            3
          </span>
          <span>Cancellation Policy &amp; Access Continuity</span>
        </h2>
        <div className="p-5 rounded-xl border border-border bg-surface space-y-3 text-xs leading-relaxed">
          <div className="flex items-center gap-2 font-mono font-semibold text-text-primary text-sm">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Cancel Anytime — No Auto-Renewal Penalties</span>
          </div>
          <p>
            You may cancel your paid subscription at any moment with a single click. There are no cancellation fees, lock-in periods, or phone calls required.
          </p>
          <ul className="space-y-2 list-disc list-inside text-text-secondary">
            <li>
              <strong>Self-Service Cancellation:</strong> Simply visit <Link to="/app/settings" className="text-primary hover:underline font-mono">Platform Settings &rarr; Billing</Link> and select <strong>&quot;Cancel Subscription&quot;</strong>.
            </li>
            <li>
              <strong>Access Continuity:</strong> When you cancel, you will <strong>retain uninterrupted access</strong> to all Pro features until the end of your paid billing cycle (e.g., if you cancel 10 days into a 30-day monthly plan, you remain Pro for the remaining 20 days).
            </li>
            <li>
              <strong>No Subsequent Charges:</strong> Your subscription will terminate at the cycle end and will not auto-renew. An immediate email confirmation will be delivered to your registered email.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4: Refund Eligibility */}
      <section id="refund-eligibility" className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono flex items-center justify-center border border-emerald-500/20">
              4
            </span>
            <span>7-Day Refund Policy &amp; Eligibility Rules</span>
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Fair Play Guarantee
          </span>
        </div>
        <p>
          We stand firmly behind the algorithmic rigor and engineering quality of Chakriva. If you find the platform is not the right fit for your preparation, we offer a transparent refund window:
        </p>

        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] space-y-3 text-xs leading-relaxed">
          <div className="flex items-center gap-2 font-mono font-bold text-emerald-400 uppercase tracking-wider text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>The 7-Day &amp; 10% Fair-Use Window</span>
          </div>
          <p className="text-text-primary font-medium text-sm">
            You are eligible for a <strong>100% full refund</strong> within <strong>7 calendar days</strong> of your initial subscription purchase, provided that <strong>less than 10% of Pro-exclusive content</strong> has been accessed.
          </p>
          <div className="pt-2 border-t border-emerald-500/20 space-y-1.5 text-text-secondary">
            <div className="font-semibold text-text-primary font-mono text-xs">10% Fair-Use Metric Defined:</div>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              <li>Less than 10 problems solved in Pro-exclusive company target sheets.</li>
              <li>Fewer than 15 Socratic AI Mentor hints/proof inquiries generated.</li>
              <li>Fewer than 2 full-length diagnostic assessment runs completed.</li>
            </ul>
          </div>
          <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-text-muted">
            <strong>Annual Subscriptions:</strong> For annual commitments, subscribers can request a pro-rated refund within <strong>14 calendar days</strong> of initial payment, subject to the same fair-use threshold.
          </div>
        </div>
      </section>

      {/* Section 5: Non-Refundable */}
      <section id="non-refundable" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            5
          </span>
          <span>Non-Refundable Exceptions &amp; AUP Violations</span>
        </h2>
        <p>
          Refunds will <strong>not</strong> be granted under the following circumstances:
        </p>
        <div className="p-4 rounded-xl border border-red-500/20 bg-surface text-xs space-y-2">
          <ul className="space-y-1.5 list-disc list-inside text-text-secondary">
            <li>Requests submitted after the expiration of the 7-day window.</li>
            <li>Accounts that have exceeded the 10% fair-use consumption threshold.</li>
            <li>
              <strong>Acceptable Use Policy Violations:</strong> Any account suspended or banned for attempting compiler sandbox breakouts, submitting fork bombs, launching crypto miners, or scraping the problem catalog forfeits all refund rights.
            </li>
            <li>Contest cheating, plagiarism, or leaderboard manipulation.</li>
            <li>Disputed charges initiated without first contacting our billing desk at <code className="bg-surface-elevated px-1 py-0.5 rounded font-mono text-text-primary">billing@chakriva.com</code>.</li>
          </ul>
        </div>
      </section>

      {/* Section 6: Settlement Timelines */}
      <section id="settlement-timeline" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            6
          </span>
          <span>Settlement Mode &amp; Timelines (RBI &amp; PG Norms)</span>
        </h2>
        <p>
          In accordance with Reserve Bank of India (RBI) mandates and payment gateway settlement standards (Razorpay, Cashfree, PhonePe):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl border border-border bg-surface space-y-1.5">
            <div className="font-semibold text-text-primary font-mono">UPI &amp; Net Banking</div>
            <div className="text-primary font-bold font-mono text-base">2 to 5 Days</div>
            <p className="text-text-muted text-[11px]">Direct credit back to the originating VPA / bank account via NPCI.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface space-y-1.5">
            <div className="font-semibold text-text-primary font-mono">Credit / Debit Cards</div>
            <div className="text-primary font-bold font-mono text-base">5 to 7 Days</div>
            <p className="text-text-muted text-[11px]">Reversal credited to the originating Visa, Mastercard, or RuPay card statement.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface space-y-1.5">
            <div className="font-semibold text-text-primary font-mono">International Cards</div>
            <div className="text-primary font-bold font-mono text-base">7 to 10 Days</div>
            <p className="text-text-muted text-[11px]">Cross-border card refund timeline depending on your issuing bank&apos;s cycle.</p>
          </div>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          <strong>Original Payment Source Rule:</strong> In compliance with anti-money laundering (AML) regulations, refunds cannot be issued in cash or redirected to third-party bank accounts. Refunds will exclusively be credited back to the original funding source.
        </p>
      </section>

      {/* Section 7: How to Request */}
      <section id="how-to-request" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            7
          </span>
          <span>Step-by-Step Refund Request Process</span>
        </h2>
        <div className="p-4 rounded-xl border border-border bg-surface text-xs space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-text-secondary">
            <li>
              Send an email to{' '}
              <a href="mailto:billing@chakriva.com" className="text-primary font-mono font-semibold hover:underline">
                billing@chakriva.com
              </a>{' '}
              from the email address associated with your Chakriva account.
            </li>
            <li>
              Include your <strong>Registered Email</strong>, <strong>Payment Gateway Transaction ID / Order ID</strong> (found in your receipt), and a brief note explaining the reason for your refund.
            </li>
            <li>
              Our billing desk verifies your account metrics against the 10% fair-use criteria and issues an approval or status update within <strong>24 to 48 business hours</strong>.
            </li>
            <li>
              Once approved, the refund instruction is immediately passed to the payment gateway (Razorpay / Cashfree / PhonePe), and you receive a payment reversal ARN / reference tracking number.
            </li>
          </ol>
        </div>
      </section>

      {/* Section 8: Merchant Contact */}
      <section id="merchant-contact" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            8
          </span>
          <span>Billing Contact &amp; Dispute Escalation</span>
        </h2>
        <p>
          Have a question about an invoice, dual debit, or gateway timeout? Contact our dedicated finance and merchant support desk:
        </p>

        <div className="p-5 rounded-xl border border-cyan-500/20 bg-surface space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-mono text-text-muted">Billing Support Email:</div>
              <a href="mailto:billing@chakriva.com" className="font-mono text-cyan-400 font-semibold hover:underline text-sm">
                billing@chakriva.com
              </a>
            </div>
            <div>
              <div className="text-[11px] font-mono text-text-muted">Escalation Email:</div>
              <a href="mailto:grievance@chakriva.com" className="font-mono text-primary font-semibold hover:underline text-sm">
                grievance@chakriva.com
              </a>
            </div>
            <div>
              <div className="text-[11px] font-mono text-text-muted">Support Hours:</div>
              <div className="text-text-primary">Monday through Friday, 10:00 AM &ndash; 6:00 PM IST</div>
            </div>
            <div>
              <div className="text-[11px] font-mono text-text-muted">Response Guarantee:</div>
              <div className="text-text-primary font-mono">Guaranteed 48-hour response for billing issues</div>
            </div>
          </div>
        </div>
      </section>
    </LegalLayout>
  );
};

export default RefundPolicyView;
