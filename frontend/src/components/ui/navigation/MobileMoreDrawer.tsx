import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Code2,
  Terminal,
  BookOpen,
  Layers,
  Trophy,
  BarChart3,
  User,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export interface MobileMoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMoreDrawer: React.FC<MobileMoreDrawerProps> = ({ isOpen, onClose }) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string) || 'Engineer';
  const email = profile?.username ? `@${profile.username}` : user?.email || 'engineer@chakriva.io';

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate('/login', { replace: true });
  };

  // Mobile destinations: Practice Library followed immediately by Open IDE near top!
  const menuItems = [
    { label: 'Practice Library', href: '/app/practice', icon: <Code2 className="w-4 h-4 text-cyan-400" />, desc: 'All problems, topics & patterns' },
    { label: 'Open IDE', href: '/ide', icon: <Terminal className="w-4 h-4 text-emerald-400" />, desc: 'Standalone Cloud Monaco scratchpad' },
    { label: 'Learn', href: '/app/learn', icon: <BookOpen className="w-4 h-4 text-amber-400" />, desc: 'Core CS & DSA learning tracks' },
    { label: 'Sheets', href: '/app/sheets', icon: <Layers className="w-4 h-4 text-indigo-400" />, desc: 'Chakriva 100/200/300 & master sheets' },
    { label: 'Contests', href: '/app/contests', icon: <Trophy className="w-4 h-4 text-yellow-400" />, desc: 'Timed algorithmic challenges' },
    { label: 'Progress', href: '/app/progress', icon: <BarChart3 className="w-4 h-4 text-rose-400" />, desc: 'Mastery metrics & leaderboards' },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Card */}
      <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto bg-[#090D16] border-t border-white/10 rounded-t-3xl shadow-[0_-12px_48px_rgba(0,0,0,0.8)] pb-safe animate-slideUp text-left">
        {/* Drag Handle / Bar */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 py-3 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#1E293B] via-[#94A3B8]/50 to-[#F8FAFC] flex items-center justify-center p-[1px]">
              <div className="w-full h-full bg-[#050608] rounded-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#F8FAFC]" />
              </div>
            </div>
            <span className="text-xs font-mono font-bold tracking-widest text-white uppercase">
              CHAKRIVA NAVIGATION
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <p className="text-[11px] text-white/40 truncate mt-0.5">{email}</p>
          </div>
          <Link
            to="/app/profile"
            onClick={onClose}
            className="text-xs text-[#00d2ff] font-medium hover:underline flex items-center gap-1"
          >
            <span>Profile</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Primary Destinations */}
        <div className="p-3 space-y-1">
          <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white/40">
            Platform Sections
          </p>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-colors group ${
                item.label === 'Open IDE'
                  ? 'bg-[#00d2ff]/[0.05] border border-[#00d2ff]/20 hover:bg-[#00d2ff]/[0.1]'
                  : 'hover:bg-white/[0.05]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  item.label === 'Open IDE'
                    ? 'bg-[#00d2ff]/10 border-[#00d2ff]/30 text-[#00d2ff]'
                    : 'bg-white/[0.04] border-white/[0.08]'
                }`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white group-hover:text-[#00d2ff] transition-colors">
                    {item.label}
                  </p>
                  {item.label === 'Open IDE' && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#00d2ff]/20 text-[#00d2ff]">
                      Scratchpad
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/40 truncate">{item.desc}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white transition-colors" />
            </Link>
          ))}
        </div>

        {/* Account & Settings */}
        <div className="p-3 border-t border-white/[0.06] space-y-1">
          <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white/40">
            Account Preferences
          </p>
          <Link
            to="/app/profile"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] text-xs text-white/80 hover:text-white transition-colors"
          >
            <User className="w-4 h-4 text-white/40" />
            <span>Profile & Account</span>
          </Link>
          <Link
            to="/app/settings"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] text-xs text-white/80 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4 text-white/40" />
            <span>Platform Settings</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-xs text-red-400 hover:text-red-300 transition-colors text-left font-medium"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sign out of CHAKRIVA</span>
          </button>
        </div>

        {/* Mobile Legal & Regulatory Disclosures */}
        <div className="px-5 py-3 border-t border-white/[0.06] text-center bg-white/[0.01]">
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-white/40">
            <Link to="/privacy" onClick={onClose} className="hover:text-white transition-colors">Privacy</Link>
            <span>&bull;</span>
            <Link to="/terms" onClick={onClose} className="hover:text-white transition-colors">Terms</Link>
            <span>&bull;</span>
            <Link to="/cookies" onClick={onClose} className="hover:text-white transition-colors">Cookies</Link>
            <span>&bull;</span>
            <Link to="/refunds" onClick={onClose} className="hover:text-white transition-colors">Refunds</Link>
          </div>
          <div className="text-[10px] text-white/30 font-mono mt-1.5">
            DPDP Act 2023 Compliant &bull; Chakriva Labs
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMoreDrawer;
