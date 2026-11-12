import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Activity,
  Award,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export interface UserAccountMenuProps {
  className?: string;
}

export const UserAccountMenu: React.FC<UserAccountMenuProps> = ({ className = '' }) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string) || 'Engineer';
  const email = profile?.username ? `@${profile.username}` : user?.email || 'engineer@chakriva.io';
  const roleName = profile?.role || 'student';
  const avatarUrl = profile?.avatar_url;

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'CK';

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleHelp = () => {
    setIsOpen(false);
    // Dispatch keyboard shortcut to open search command palette with help/shortcuts
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true })
    );
  };

  // Outside click & Escape key listeners
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="User account menu"
        className="flex items-center gap-1.5 p-0.5 rounded-full border border-white/[0.1] hover:border-white/[0.25] transition-all select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00d2ff]"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#1D68FE] flex items-center justify-center text-white font-sans font-bold text-xs shadow-sm">
            {initials ? initials[0] : 'D'}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-white/10 bg-[#090D16]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] py-2 z-50 text-left animate-fadeIn">
          {/* User Info Header */}
          <div className="px-3.5 py-2.5 border-b border-white/[0.08]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white truncate">{displayName}</p>
              <span className="text-[10px] font-mono capitalize px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70 border border-white/[0.08]">
                {roleName}
              </span>
            </div>
            <p className="text-[11px] text-white/40 truncate mt-0.5">{email}</p>
          </div>

          {/* Core Destinations */}
          <div className="py-1.5 text-xs">
            <Link
              to="/app/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <User className="w-3.5 h-3.5 text-white/40" />
              <span>Profile</span>
            </Link>

            <Link
              to="/app/home"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-white/40" />
              <span>Activity</span>
            </Link>

            <Link
              to="/app/progress"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-white/40" />
              <span>Achievements</span>
            </Link>

            <Link
              to="/app/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-white/40" />
              <span>Settings</span>
            </Link>

            <button
              type="button"
              onClick={handleHelp}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
            >
              <HelpCircle className="w-3.5 h-3.5 text-white/40" />
              <span>Help & Shortcuts</span>
            </button>
          </div>

          {/* Sign Out / Sign In Section */}
          <div className="pt-1.5 border-t border-white/[0.08]">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-xs font-medium text-left"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>Sign out</span>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#00d2ff] hover:bg-white/[0.05] transition-colors text-xs font-medium text-left"
              >
                <span>Sign in / Register</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccountMenu;
