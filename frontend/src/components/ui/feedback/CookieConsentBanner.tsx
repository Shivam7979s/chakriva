import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, X, Sliders } from 'lucide-react';

const CONSENT_STORAGE_KEY = 'chakriva_cookie_consent_v1';

export interface CookiePreferences {
  strictlyNecessary: boolean; // Always true
  functional: boolean;
  analytics: boolean;
  timestamp: string;
}

export const CookieConsentBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [functionalAllowed, setFunctionalAllowed] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!stored) {
        // Show lightweight discrete banner on first visit
        setIsOpen(true);
      } else {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setAnalyticsAllowed(!!parsed.analytics);
        setFunctionalAllowed(!!parsed.functional);
      }
    } catch {
      // ignore
    }

    // Listen for custom event if user clicks "Manage Cookie Preferences" anywhere
    const handleOpenPreferences = () => {
      setShowPreferencesModal(true);
    };
    window.addEventListener('chakriva:open-cookie-preferences', handleOpenPreferences);
    return () => {
      window.removeEventListener('chakriva:open-cookie-preferences', handleOpenPreferences);
    };
  }, []);

  const savePreferences = (analytics: boolean, functional: boolean) => {
    const prefs: CookiePreferences = {
      strictlyNecessary: true,
      functional,
      analytics,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
    setAnalyticsAllowed(analytics);
    setFunctionalAllowed(functional);
    setIsOpen(false);
    setShowPreferencesModal(false);
  };

  const handleAcceptAll = () => {
    savePreferences(true, true);
  };

  const handleNecessaryOnly = () => {
    savePreferences(false, true);
  };

  if (!isOpen && !showPreferencesModal) {
    return null;
  }

  return (
    <>
      {/* Lightweight Bottom Non-Blocking Consent Bar */}
      {isOpen && !showPreferencesModal && (
        <aside
          aria-label="Cookie and Privacy Consent"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-lg z-50 animate-fadeIn"
        >
          <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0A0D15]/95 backdrop-blur-md shadow-2xl text-white text-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 font-mono font-semibold text-xs text-white">
                <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Cookie className="w-3.5 h-3.5" />
                </div>
                <span>Privacy &amp; Local Storage</span>
              </div>
              <button
                type="button"
                onClick={handleNecessaryOnly}
                aria-label="Dismiss banner"
                className="text-white/40 hover:text-white transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-white/70 leading-relaxed text-[11px] sm:text-xs">
              Chakriva uses strictly necessary session tokens (<code className="text-white/90 font-mono">sb-*-auth-token</code>) and local IDE preferences to keep you signed in and preserve code drafts. We do not use third-party advertising cookies. Read our{' '}
              <Link to="/cookies" className="text-sky-400 hover:underline font-medium">
                Cookie Policy
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-sky-400 hover:underline font-medium">
                DPDP Privacy Policy
              </Link>.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPreferencesModal(true)}
                className="text-[11px] text-white/50 hover:text-white transition-colors underline flex items-center gap-1"
              >
                <Sliders className="w-3 h-3" />
                <span>Customize Choices</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleNecessaryOnly}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white/80 hover:text-white text-[11px] font-medium transition-colors"
                >
                  Strictly Necessary Only
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-all shadow-sm"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0A0D15] p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                <h3 id="cookie-preferences-title" className="text-sm font-semibold tracking-wide">
                  Storage &amp; Cookie Preferences
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferencesModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Strictly Necessary */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Strictly Necessary Storage</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Always Active
                  </span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Required for Supabase authentication, secure session tokens, and Row Level Security. Cannot be disabled.
                </p>
              </div>

              {/* Functional */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Functional &amp; IDE Preferences</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={functionalAllowed}
                      onChange={(e) => setFunctionalAllowed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Remembers your Monaco editor settings (font, tab spacing, minimap) and light/dark theme preference.
                </p>
              </div>

              {/* Analytics */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Performance Analytics (Opt-In)</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsAllowed}
                      onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Anonymous compiler performance metrics and page-load timings to help us optimize worker dispatch speeds.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleNecessaryOnly}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-white/80 transition-colors"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={() => savePreferences(analyticsAllowed, functionalAllowed)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-sm"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsentBanner;
