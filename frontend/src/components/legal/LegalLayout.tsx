import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Cookie,
  CreditCard,
  Printer,
  Copy,
  Check,
  Scale,
  Building2,
  Calendar,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/feedback/Toast';

export interface TocItem {
  id: string;
  label: string;
}

export interface LegalLayoutProps {
  title: string;
  subtitle: string;
  badge: string;
  lastUpdated: string;
  currentPolicy: 'privacy' | 'terms' | 'cookies' | 'refunds';
  toc?: TocItem[];
  children: React.ReactNode;
}

const POLICY_TABS = [
  {
    id: 'privacy',
    label: 'Privacy Policy',
    href: '/privacy',
    icon: ShieldCheck,
    tag: 'DPDP 2023',
  },
  {
    id: 'terms',
    label: 'Terms of Service',
    href: '/terms',
    icon: FileText,
    tag: 'Judge AUP',
  },
  {
    id: 'cookies',
    label: 'Cookie & Storage',
    href: '/cookies',
    icon: Cookie,
    tag: 'No Tracking',
  },
  {
    id: 'refunds',
    label: 'Cancellation & Refunds',
    href: '/refunds',
    icon: CreditCard,
    tag: 'KYC Ready',
  },
] as const;

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  badge,
  lastUpdated,
  currentPolicy,
  toc = [],
  children,
}) => {
  const { toast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast({
      type: 'success',
      title: 'Email Copied',
      message: `${email} copied to clipboard.`,
      duration: 2500,
    });
    setTimeout(() => setCopiedEmail(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-primary/20 selection:text-primary">
      {/* Decorative subtle ambient backdrop */}
      <div className="relative overflow-hidden border-b border-border bg-surface/60 backdrop-blur-md">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-40">
          <div className="absolute -top-32 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -top-32 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 relative z-10">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-text-muted">
            <Link to="/" className="hover:text-text-primary transition-colors">
              Chakriva Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-text-secondary font-medium">Legal & Compliance</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-primary font-medium">{title}</span>
          </nav>

          {/* Top Compliance Badge */}
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              <Scale className="w-3 h-3" />
              <span>{badge}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Chakriva Labs • Statutory Disclosures</span>
            </span>
          </div>

          {/* Header Title & Subtitle */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
                {title}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-text-secondary max-w-3xl leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Quick Actions (Print / Copy Link) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors shadow-sm"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-text-muted" />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-text-muted font-mono">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-secondary" />
              <span>Last Revised: <strong className="text-text-primary">{lastUpdated}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-text-secondary" />
              <span>Entity: <strong className="text-text-primary">Chakriva Labs</strong> (Bengaluru, India)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Jurisdiction: <strong className="text-text-primary">Republic of India</strong></span>
            </div>
          </div>

          {/* Horizontal Policy Tabs */}
          <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border">
            {POLICY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentPolicy === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.href}
                  className={cn(
                    'group flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-medium transition-all whitespace-nowrap border-b-2 -mb-[1px]',
                    isActive
                      ? 'border-primary text-primary bg-primary/5 font-semibold'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary')} />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1.5 py-0.2 rounded',
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : 'bg-surface-elevated text-text-muted group-hover:text-text-secondary'
                    )}
                  >
                    {tab.tag}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Layout with Sidebar TOC */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Policy Body */}
          <article className="lg:col-span-8 min-w-0 space-y-8 text-sm leading-relaxed text-text-secondary">
            {children}
          </article>

          {/* Right Sidebar: Table of Contents & Contact Cards */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Table of Contents */}
            {toc.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-text-primary mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Table of Contents</span>
                </h2>
                <nav className="space-y-1.5 text-xs">
                  {toc.map((item, idx) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block py-1 px-2 rounded hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors truncate"
                    >
                      <span className="font-mono text-text-muted mr-1.5">{idx + 1}.</span>
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Statutory Grievance Redressal Officer Card */}
            <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider font-mono">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Data Grievance Officer (DPDP)</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Under the <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>, Indian users can submit data access, correction, consent withdrawal, or erasure requests directly to our Grievance Officer.
              </p>
              <div className="pt-2 border-t border-border/60 space-y-2 text-xs">
                <div>
                  <div className="text-[11px] text-text-muted font-mono">Designated Officer:</div>
                  <div className="font-medium text-text-primary">Grievance & Privacy Officer, Chakriva Labs</div>
                </div>
                <div>
                  <div className="text-[11px] text-text-muted font-mono">Contact Email:</div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <a
                      href="mailto:grievance@chakriva.com"
                      className="font-mono text-xs text-primary hover:underline font-semibold truncate"
                    >
                      grievance@chakriva.com
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyEmail('grievance@chakriva.com')}
                      aria-label="Copy grievance email"
                      className="p-1 rounded hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"
                    >
                      {copiedEmail === 'grievance@chakriva.com' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-text-muted">
                  SLA: Acknowledged within <strong>24 hrs</strong> • Resolved within <strong>7–15 days</strong>
                </div>
              </div>
            </div>

            {/* Payment Gateway & Billing Support Card */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-text-primary font-semibold text-xs uppercase tracking-wider font-mono">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Billing & Merchant Inquiries</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                For subscription inquiries, refund verifications, or payment disputes (Razorpay, Cashfree, PhonePe PG):
              </p>
              <div className="pt-2 border-t border-border space-y-2 text-xs">
                <div>
                  <div className="text-[11px] text-text-muted font-mono">Billing Support:</div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <a
                      href="mailto:billing@chakriva.com"
                      className="font-mono text-xs text-cyan-400 hover:underline font-semibold truncate"
                    >
                      billing@chakriva.com
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyEmail('billing@chakriva.com')}
                      aria-label="Copy billing email"
                      className="p-1 rounded hover:bg-cyan-500/10 text-text-muted hover:text-cyan-400 transition-colors"
                    >
                      {copiedEmail === 'billing@chakriva.com' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-text-muted">
                  Support Hours: Mon – Fri, 10:00 AM – 6:00 PM IST
                </div>
              </div>
            </div>

            {/* Code Judge Security Alert Box */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-xs text-text-secondary space-y-2">
              <div className="flex items-center gap-2 font-mono font-semibold text-amber-400 uppercase tracking-wider text-[11px]">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Judge Sandbox Security Notice</span>
              </div>
              <p className="text-[12px] leading-relaxed">
                Chakriva employs real-time kernel telemetry on Docker worker runners. Fork bombs, crypto mining, network probing, or container breakouts trigger immediate permanent bans.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
