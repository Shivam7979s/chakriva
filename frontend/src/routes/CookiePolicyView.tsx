import React, { useState, useEffect } from 'react';
import { LegalLayout, type TocItem } from '@/components/legal/LegalLayout';
import {
  ShieldCheck,
  HardDrive,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/components/ui/feedback/Toast';

const COOKIE_TOC: TocItem[] = [
  { id: 'storage-overview', label: 'Local Storage & Cookie Architecture' },
  { id: 'strictly-necessary', label: 'Strictly Necessary Session Tokens & Preferences' },
  { id: 'analytics-tracking', label: 'Analytics Cookies & The Banner Rule' },
  { id: 'storage-inspector', label: 'Live Browser Storage Inspector' },
  { id: 'browser-controls', label: 'Managing Storage in Your Browser' },
  { id: 'consent-updates', label: 'Policy Updates & Inquiries' },
];

interface StorageAuditItem {
  key: string;
  category: 'Strictly Necessary' | 'Functional Preference' | 'Session Cache';
  purpose: string;
  present: boolean;
  sizeBytes?: number;
}

const AUDITED_KEYS: Omit<StorageAuditItem, 'present' | 'sizeBytes'>[] = [
  {
    key: 'sb-*-auth-token',
    category: 'Strictly Necessary',
    purpose: 'Supabase JWT authentication token ensuring authenticated API requests and database Row Level Security (RLS) enforcement.',
  },
  {
    key: 'chakriva_theme',
    category: 'Functional Preference',
    purpose: 'Stores your display preference between Obsidian Carbon (dark mode) and Alpine Porcelain (light mode) to prevent visual flashing.',
  },
  {
    key: 'theme',
    category: 'Functional Preference',
    purpose: 'Fallback theme preference token for high-contrast accessibility.',
  },
  {
    key: 'chakriva_mentor_sessions_v1_*',
    category: 'Session Cache',
    purpose: 'Caches ongoing Socratic AI Mentor conversational state per problem so guidance is not lost on page refresh.',
  },
  {
    key: 'chakriva_cookie_consent_v1',
    category: 'Functional Preference',
    purpose: 'Persists your consent preferences and privacy acknowledgements.',
  },
  {
    key: 'chakriva_editor_settings',
    category: 'Functional Preference',
    purpose: 'Retains Monaco Editor settings (font size, minimap, tab size, keybinding modes).',
  },
];

export const CookiePolicyView: React.FC = () => {
  const { toast } = useToast();
  const [inspectedKeys, setInspectedKeys] = useState<StorageAuditItem[]>([]);
  const [totalLocalStorageSize, setTotalLocalStorageSize] = useState<number>(0);

  const runStorageAudit = () => {
    try {
      const items: StorageAuditItem[] = [];
      let totalBytes = 0;

      // Scan all keys in localStorage
      const foundKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          foundKeys.push(k);
          const val = localStorage.getItem(k) || '';
          totalBytes += (k.length + val.length) * 2; // UTF-16
        }
      }
      setTotalLocalStorageSize(totalBytes);

      AUDITED_KEYS.forEach((spec) => {
        let isPresent = false;
        let size = 0;

        if (spec.key.includes('*')) {
          const prefix = spec.key.split('*')[0];
          const matchedKey = foundKeys.find((k) => k.startsWith(prefix));
          if (matchedKey) {
            isPresent = true;
            size = (matchedKey.length + (localStorage.getItem(matchedKey)?.length || 0)) * 2;
          }
        } else {
          isPresent = foundKeys.includes(spec.key);
          if (isPresent) {
            size = (spec.key.length + (localStorage.getItem(spec.key)?.length || 0)) * 2;
          }
        }

        items.push({
          ...spec,
          present: isPresent,
          sizeBytes: size,
        });
      });

      setInspectedKeys(items);
    } catch {
      // In restricted iframes or disabled storage environments
    }
  };

  useEffect(() => {
    runStorageAudit();
  }, []);

  const handleClearSessionCache = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('chakriva_mentor_sessions_v1_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      runStorageAudit();
      toast({
        type: 'info',
        title: 'Cache Cleared',
        message: 'Ephemeral Socratic mentor session cache was purged from local storage.',
        duration: 2500,
      });
    } catch {
      // ignore
    }
  };

  return (
    <LegalLayout
      title="Cookie & Local Storage Policy"
      subtitle="Transparent disclosure regarding our minimal token architecture: zero advertising trackers, strictly necessary authentication keys, and local IDE preferences."
      badge="Zero Tracking Policy"
      lastUpdated="November 18, 2026"
      currentPolicy="cookies"
      toc={COOKIE_TOC}
    >
      {/* Policy Guarantee Banner */}
      <section className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] space-y-2.5">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Zero Behavioral Tracking Guarantee</span>
        </div>
        <p className="text-text-primary text-sm leading-relaxed">
          Chakriva does <strong>not</strong> sell your data, does <strong>not</strong> install cross-site advertising cookies, and does <strong>not</strong> profile your browsing activity outside our engineering platform. We rely on lightweight browser <code className="bg-surface-elevated px-1.5 py-0.5 rounded text-xs text-text-primary font-mono">localStorage</code> tokens strictly required to authenticate your session and remember your Monaco IDE preferences.
        </p>
      </section>

      {/* Section 1 */}
      <section id="storage-overview" className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            1
          </span>
          <span>Local Storage &amp; Cookie Architecture</span>
        </h2>
        <p>
          Modern single-page applications (SPAs) utilize client-side storage technologies such as HTML5 <code className="text-xs font-mono bg-surface-elevated px-1.5 py-0.5 rounded">localStorage</code> and encrypted HTTP-only session tokens rather than intrusive tracking cookies.
        </p>
        <p>
          These storage mechanisms enable seamless transitions across the <strong>Problem Workspace</strong>, <strong>Curriculum DAGs</strong>, and <strong>Cloud IDE</strong> without disconnecting your compiler stream or losing uncommitted code edits.
        </p>
      </section>

      {/* Section 2 */}
      <section id="strictly-necessary" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            2
          </span>
          <span>Strictly Necessary Session Tokens &amp; Preferences</span>
        </h2>
        <p>
          These tokens are indispensable for the core security, authentication, and state rendering of the platform. Under global data protection frameworks (including India&apos;s DPDP Act and the EU ePrivacy Directive), strictly necessary functional tokens do not require prior consent because the service cannot function without them:
        </p>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-elevated text-text-primary font-mono font-semibold">
                <th className="p-3">Token / Key Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Mechanism</th>
                <th className="p-3">Operational Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text-secondary">
              <tr>
                <td className="p-3 font-mono text-text-primary">sb-*-auth-token</td>
                <td className="p-3 font-semibold text-emerald-400">Strictly Necessary</td>
                <td className="p-3 font-mono">localStorage</td>
                <td className="p-3">Cryptographic JWT bearer token issued by Supabase Auth to authenticate API calls and verify Row Level Security rules.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-text-primary">chakriva_theme / theme</td>
                <td className="p-3 font-semibold text-cyan-400">Functional Preference</td>
                <td className="p-3 font-mono">localStorage</td>
                <td className="p-3">Preserves your visual interface setting (Obsidian Slate or Alpine Porcelain) across browser reloads.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-text-primary">chakriva_editor_settings</td>
                <td className="p-3 font-semibold text-cyan-400">Functional Preference</td>
                <td className="p-3 font-mono">localStorage</td>
                <td className="p-3">Remembers Monaco Editor configuration: tab width, indentation rules, font size, minimap visibility, and keybindings.</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-text-primary">chakriva_mentor_sessions_*</td>
                <td className="p-3 font-semibold text-purple-400">Session Cache</td>
                <td className="p-3 font-mono">localStorage</td>
                <td className="p-3">Temporarily preserves Socratic AI Mentor conversation context for active problems during a coding session.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3 */}
      <section id="analytics-tracking" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            3
          </span>
          <span>Analytics Cookies &amp; The Banner Rule</span>
        </h2>
        <div className="p-4 rounded-xl border border-border bg-surface space-y-3 text-xs">
          <div className="flex items-center gap-2 font-mono font-semibold text-text-primary">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>The Banner Rule Disclosed</span>
          </div>
          <p className="leading-relaxed">
            Many websites bombard users with intrusive pop-up banners even when using only basic session storage. In adherence to legal best practices:
          </p>
          <ul className="space-y-2 list-disc list-inside text-text-secondary">
            <li>
              <strong>Default State (Current):</strong> Because Chakriva exclusively utilizes strictly necessary Supabase auth session tokens and local IDE preferences—with zero third-party tracking scripts—an intrusive, viewport-blocking modal is unnecessary. Full disclosure in this policy satisfies transparency mandates.
            </li>
            <li>
              <strong>Conditional Analytics Banner:</strong> If any third-party behavioral analytics tools (such as Google Analytics 4, PostHog, or Mixpanel) are enabled, the platform automatically presents an explicit <strong>&quot;Accept / Reject&quot;</strong> consent banner. In such cases, non-essential tracking scripts remain completely blocked until affirmative user opt-in is registered.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4: Live Storage Inspector */}
      <section id="storage-inspector" className="space-y-4 pt-4 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
                4
              </span>
              <span>Live Browser Storage Inspector</span>
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Verify the exact tokens Chakriva is currently storing in your active browser session.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={runStorageAudit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
              <span>Rescan Storage</span>
            </button>
            <button
              type="button"
              onClick={handleClearSessionCache}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-medium text-purple-300 transition-colors"
              title="Clear ephemeral mentor chat transcripts"
            >
              <Trash2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Purge Mentor Cache</span>
            </button>
          </div>
        </div>

        {/* Live Storage Table */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-border bg-surface-elevated flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-primary" />
              <span className="font-semibold text-text-primary">Client-Side Storage Scan</span>
            </div>
            <div className="text-text-muted">
              Total Space Utilized: <span className="font-semibold text-text-primary font-mono">{(totalLocalStorageSize / 1024).toFixed(2)} KB</span>
            </div>
          </div>

          <div className="divide-y divide-border text-xs">
            {inspectedKeys.map((item) => (
              <div key={item.key} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-text-primary">{item.key}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-elevated text-text-muted border border-border">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed max-w-xl">
                    {item.purpose}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  {item.present ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Active ({item.sizeBytes || 0} B)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full border border-border">
                      <XCircle className="w-3 h-3 text-text-muted" />
                      <span>Not Set</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 */}
      <section id="browser-controls" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            5
          </span>
          <span>Managing Storage in Your Browser</span>
        </h2>
        <p>
          You have full control over client-side storage through standard browser developer tools and privacy settings:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <div className="font-semibold text-text-primary font-mono">Google Chrome &amp; Brave</div>
            <p className="text-text-muted">
              Settings &rarr; Privacy and security &rarr; Third-party cookies &rarr; See all site data and permissions &rarr; Search &quot;chakriva&quot;.
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <div className="font-semibold text-text-primary font-mono">Mozilla Firefox</div>
            <p className="text-text-muted">
              Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data &rarr; Manage Data &rarr; Search &quot;chakriva&quot;.
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <div className="font-semibold text-text-primary font-mono">Apple Safari</div>
            <p className="text-text-muted">
              Preferences &rarr; Privacy &rarr; Manage Website Data &rarr; Search &quot;chakriva&quot; &rarr; Remove.
            </p>
          </div>
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-1">
            <div className="font-semibold text-text-primary font-mono">Microsoft Edge</div>
            <p className="text-text-muted">
              Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies and site data.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6 */}
      <section id="consent-updates" className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-text-primary tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-surface-elevated text-text-secondary text-xs font-mono flex items-center justify-center border border-border">
            6
          </span>
          <span>Policy Updates &amp; Inquiries</span>
        </h2>
        <p>
          We review our storage footprint regularly as new features are engineered. Any technical addition of persistent tokens will be reflected immediately in this table.
        </p>
        <p className="text-xs text-text-muted">
          For technical questions regarding token handling, reach our security engineering desk at{' '}
          <a href="mailto:privacy@chakriva.com" className="text-primary font-mono hover:underline">
            privacy@chakriva.com
          </a>.
        </p>
      </section>
    </LegalLayout>
  );
};

export default CookiePolicyView;
