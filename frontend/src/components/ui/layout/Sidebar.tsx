import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NavItem } from '../navigation/NavItem';
import {
  Home,
  Compass,
  BookOpen,
  Code2,
  Layers,
  Sparkles,
  Terminal,
  Trophy,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Moon,
  Sun,
  FileEdit,
  X,
} from 'lucide-react';
import { IconButton } from '../actions/IconButton';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [pendingTasksCount, setPendingTasksCount] = useState<number | undefined>(undefined);
  const [dueRevisionCount, setDueRevisionCount] = useState<number | undefined>(undefined);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || (user?.user_metadata?.full_name as string) || 'Engineer Account';
  const roleName = profile?.role || 'student';
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'CK';

  // Fetch pending sprint tasks & due revision counts
  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    let isMounted = true;
    const fetchCounters = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Pending tasks for today
        const { count: tasksCount } = await supabase
          .from('sprint_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('scheduled_date', today)
          .eq('is_completed', false);

        if (isMounted && tasksCount !== null && tasksCount > 0) {
          setPendingTasksCount(tasksCount);
        }

        // 2. Spaced revision due count
        const { count: revCount } = await supabase
          .from('user_revision_queue')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .lte('next_review_at', new Date().toISOString());

        if (isMounted && revCount !== null && revCount > 0) {
          setDueRevisionCount(revCount);
        }
      } catch (err) {
        console.error('Sidebar counters error:', err);
      }
    };

    fetchCounters();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isUserMenuOpen) setIsUserMenuOpen(false);
        if (mobileOpen && onCloseMobile) onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUserMenuOpen, mobileOpen, onCloseMobile]);

  // The 9 Canonical Primary Navigation Items
  const primaryNavItems = [
    {
      to: '/app/home',
      label: 'Home',
      icon: <Home className="w-4 h-4 text-blue-400" />,
      badge: pendingTasksCount,
      badgeVariant: 'primary' as const,
    },
    {
      to: '/app/roadmap',
      label: 'Roadmap',
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
    },
    {
      to: '/app/learn',
      label: 'Learn',
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
    },
    {
      to: '/app/practice',
      label: 'Practice',
      icon: <Code2 className="w-4 h-4 text-cyan-400" />,
    },
    {
      to: '/app/sheets',
      label: 'Sheets',
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
    },
    {
      to: '/app/chakriva',
      label: 'Chakriva',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    },
    {
      to: '/app/codespace',
      label: 'CodeSpace',
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
    },
    {
      to: '/app/contests',
      label: 'Contests',
      icon: <Trophy className="w-4 h-4 text-yellow-400" />,
    },
    {
      to: '/app/progress',
      label: 'Progress',
      icon: <BarChart3 className="w-4 h-4 text-rose-400" />,
      badge: dueRevisionCount,
      badgeVariant: 'warning' as const,
    },
  ];

  const renderNavContent = (isMobile: boolean = false) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div className="flex flex-col justify-between h-full select-none">
        {/* Brand Header */}
        <div>
          <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.08]">
            <Link
              to="/app/home"
              onClick={isMobile ? onCloseMobile : undefined}
              className="flex items-center gap-2.5 font-mono font-bold text-white group"
              aria-label="CHAKRIVA Home"
            >
              <img
                src="/chakriva-logo.svg"
                alt="CHAKRIVA Logo"
                className="w-7 h-7 object-contain group-hover:scale-105 transition-transform shrink-0"
              />
              {!isCollapsed && (
                <div className="flex items-center gap-1.5">
                  <span className="tracking-wider text-sm font-bold text-white">CHAKRIVA</span>
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3B82F6]"
                    title="System Nominal"
                  />
                </div>
              )}
            </Link>

            {/* Collapse toggle (desktop) or Close button (mobile) */}
            {isMobile ? (
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Close navigation menu"
                icon={<X className="w-4 h-4 text-neutral-400 hover:text-white" />}
                onClick={onCloseMobile}
              />
            ) : (
              onToggleCollapse &&
              !collapsed && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Collapse sidebar"
                  icon={<PanelLeftClose className="w-4 h-4 text-neutral-400 hover:text-white" />}
                  onClick={onToggleCollapse}
                />
              )
            )}
          </div>

          {/* Canonical 9 Primary Navigation Items */}
          <nav aria-label="Main Navigation" className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] no-scrollbar">
            {!isCollapsed && (
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 text-left">
                Navigation
              </div>
            )}
            {primaryNavItems.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                badgeVariant={item.badgeVariant}
                collapsed={isCollapsed}
                onClick={isMobile ? onCloseMobile : undefined}
              />
            ))}
          </nav>
        </div>

        {/* Bottom User Area & Popover */}
        <div className="p-2 border-t border-white/[0.08] relative" ref={userMenuRef}>
          {!isMobile && onToggleCollapse && collapsed && (
            <div className="flex justify-center mb-2">
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="Expand sidebar"
                icon={<PanelLeftOpen className="w-4 h-4 text-neutral-400 hover:text-white" />}
                onClick={onToggleCollapse}
              />
            </div>
          )}

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div
              role="menu"
              aria-label="Account Menu"
              className={`absolute bottom-full mb-2 bg-[#161A26] border border-white/[0.12] rounded-xl p-2 shadow-2xl z-50 text-xs font-sans ${
                isCollapsed ? 'left-2 w-52' : 'left-2 right-2'
              } animate-in fade-in slide-in-from-bottom-2`}
            >
              <div className="px-2.5 py-2 border-b border-white/[0.06] mb-1 text-left">
                <p className="font-semibold text-white truncate">{displayName}</p>
                <p className="text-[10px] font-mono text-neutral-400 tracking-wider">
                  CHAKRIVA • <span className="capitalize">{roleName}</span>
                </p>
              </div>

              <button
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  if (isMobile && onCloseMobile) onCloseMobile();
                  navigate('/app/profile');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
              >
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Profile Cockpit</span>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  if (isMobile && onCloseMobile) onCloseMobile();
                  navigate('/app/settings');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-400" />
                <span>Account Settings</span>
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  if (isMobile && onCloseMobile) onCloseMobile();
                  navigate('/app/authoring');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
              >
                <FileEdit className="w-3.5 h-3.5 text-amber-400" />
                <span>Authoring Studio</span>
              </button>

              {/* Theme Selector inside popover */}
              <div className="flex items-center justify-between px-2.5 py-1.5 text-neutral-400 border-t border-white/[0.06] mt-1 pt-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-2 text-[11px] text-neutral-300 hover:text-white transition-colors"
                >
                  {theme === 'dark' ? <Moon className="w-3 h-3 text-blue-400" /> : <Sun className="w-3 h-3 text-amber-400" />}
                  <span>Theme</span>
                </button>
                <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 capitalize">
                  {theme === 'dark' ? 'Obsidian' : 'Porcelain'}
                </span>
              </div>

              <button
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  if (isMobile && onCloseMobile) onCloseMobile();
                  signOut();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left mt-1 border-t border-white/[0.06] pt-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* User Node Trigger */}
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
              isUserMenuOpen ? 'bg-white/[0.06]' : ''
            }`}
            title="Account Menu"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                {initials}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 text-left">
                  <p className="text-[12px] font-semibold text-white tracking-tight truncate">{displayName}</p>
                  <p className="text-[10px] text-neutral-400 font-mono truncate capitalize">
                    {roleName}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                  isUserMenuOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Desktop Sticky Rail */}
      <aside
        className={`hidden md:flex flex-col justify-between h-screen sticky top-0 border-r border-white/[0.08] bg-[#0D0F15] transition-all duration-150 z-30 select-none ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile Drawer (Overlay + Off-canvas panel) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="fixed inset-y-0 left-0 w-64 bg-[#0D0F15] border-r border-white/[0.08] shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200"
          >
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
