import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NavItem } from '../navigation/NavItem';
import {
  LayoutDashboard,
  BookOpen,
  Code2,
  CalendarCheck2,
  Repeat,
  Trophy,
  Settings,
  Terminal,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  Brain,
  Layers,
  ChevronDown,
  Moon,
  Bookmark,
  FileEdit,
  BarChart3,
} from 'lucide-react';
import { IconButton } from '../actions/IconButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const { profile, user, signOut } = useAuth();
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
      .toUpperCase() || 'VN';

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

  return (
    <aside
      className={`h-screen sticky top-0 border-r border-white/[0.08] bg-[#0D0F15] flex flex-col justify-between transition-all duration-150 z-30 select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.08]">
          <Link to="/" className="flex items-center gap-2 font-mono font-bold text-white group">
            <span className="text-blue-500 font-extrabold group-hover:scale-105 transition-transform">&gt;_</span>
            {!collapsed && (
              <span className="tracking-wider text-sm flex items-center gap-1.5">
                <span>VERNIQ</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3B82F6]" />
              </span>
            )}
          </Link>
          {onToggleCollapse && !collapsed && (
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Collapse sidebar"
              icon={<PanelLeftClose className="w-4 h-4 text-neutral-400 hover:text-white" />}
              onClick={onToggleCollapse}
            />
          )}
        </div>

        {/* Navigation Categories */}
        <div className="p-2 space-y-5 overflow-y-auto max-h-[calc(100vh-130px)] no-scrollbar">
          {/* SECTION: WORKSPACE */}
          <div className="space-y-0.5">
            {!collapsed && (
              <span className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 block mb-1 text-left">
                Workspace
              </span>
            )}
            <NavItem
              to="/app/dashboard"
              icon={<LayoutDashboard className="w-4 h-4 text-blue-400" />}
              label="Mission Control"
              collapsed={collapsed}
            />
            <NavItem
              to="/app/plan"
              icon={<CalendarCheck2 className="w-4 h-4 text-emerald-400" />}
              label="Daily Sprints"
              badge={pendingTasksCount}
              badgeVariant="primary"
              collapsed={collapsed}
            />
            <NavItem
              to="/app/diagnostic"
              icon={<Brain className="w-4 h-4 text-purple-400" />}
              label="Diagnostic Test"
              collapsed={collapsed}
            />
            <NavItem
              to="/app/analytics"
              icon={<BarChart3 className="w-4 h-4 text-cyan-400" />}
              label="Intelligence & Analytics"
              collapsed={collapsed}
            />
          </div>

          {/* SECTION: CURRICULUM & PRACTICE */}
          <div className="space-y-0.5">
            {!collapsed && (
              <span className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 block mb-1 text-left">
                Curriculum & Practice
              </span>
            )}
            <NavItem
              to="/problems"
              icon={<Code2 className="w-4 h-4 text-neutral-400" />}
              label="Problem Index"
              collapsed={collapsed}
            />
            <NavItem
              to="/authoring"
              icon={<FileEdit className="w-4 h-4 text-amber-400" />}
              label="Authoring Studio"
              collapsed={collapsed}
            />
            <NavItem
              to="/roadmaps"
              icon={<Layers className="w-4 h-4 text-neutral-400" />}
              label="Roadmap DAG"
              collapsed={collapsed}
            />
            <NavItem
              to="/courses"
              icon={<BookOpen className="w-4 h-4 text-neutral-400" />}
              label="Engineering Courses"
              collapsed={collapsed}
            />
          </div>

          {/* SECTION: ENGINEERING LABS */}
          <div className="space-y-0.5">
            {!collapsed && (
              <span className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 block mb-1 text-left">
                Engineering Labs
              </span>
            )}
            <NavItem
              to="/ide"
              icon={<Terminal className="w-4 h-4 text-neutral-400" />}
              label="Dev Tools IDE"
              collapsed={collapsed}
            />
            <NavItem
              to="/leaderboard"
              icon={<Trophy className="w-4 h-4 text-neutral-400" />}
              label="Leaderboards"
              collapsed={collapsed}
            />
          </div>

          {/* SECTION: PERSONAL VAULT */}
          <div className="space-y-0.5">
            {!collapsed && (
              <span className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 block mb-1 text-left">
                Personal Vault
              </span>
            )}
            <NavItem
              to="/app/codespace"
              icon={<Bookmark className="w-4 h-4 text-neutral-400" />}
              label="CodeSpace"
              collapsed={collapsed}
            />
            <NavItem
              to="/app/notespace"
              icon={<BookOpen className="w-4 h-4 text-neutral-400" />}
              label="NoteSpace"
              collapsed={collapsed}
            />
            <NavItem
              to="/app/revision"
              icon={<Repeat className="w-4 h-4 text-neutral-400" />}
              label="Revision Deck"
              badge={dueRevisionCount}
              badgeVariant="warning"
              collapsed={collapsed}
            />
          </div>
        </div>
      </div>

      {/* Bottom User Node with Popover Menu */}
      <div className="p-2 border-t border-white/[0.08] relative" ref={userMenuRef}>
        {onToggleCollapse && collapsed && (
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

        {/* Popover Dropdown Menu */}
        {isUserMenuOpen && (
          <div
            className={`absolute bottom-full mb-2 bg-[#181C26] border border-white/[0.12] rounded-xl p-2 shadow-2xl z-50 text-xs font-sans ${
              collapsed ? 'left-2 w-48' : 'left-2 right-2'
            } animate-in fade-in slide-in-from-bottom-2`}
          >
            <div className="px-2.5 py-2 border-b border-white/[0.06] mb-1">
              <p className="font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                Status: Verified {roleName}
              </p>
            </div>

            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                navigate('/app/profile');
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Profile Cockpit</span>
            </button>

            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                navigate('/app/settings');
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-400" />
              <span>Account Settings</span>
            </button>

            <div className="flex items-center justify-between px-2.5 py-1.5 text-neutral-400 border-t border-white/[0.06] mt-1 pt-1">
              <span className="flex items-center gap-2 text-[11px]">
                <Moon className="w-3 h-3 text-blue-400" />
                <span>Theme</span>
              </span>
              <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                Obsidian Carbon
              </span>
            </div>

            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left mt-1 border-t border-white/[0.06] pt-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* User Card Trigger */}
        <div
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors ${
            isUserMenuOpen ? 'bg-white/[0.06]' : ''
          }`}
          title="Account Menu"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 text-left">
                <p className="text-[12px] font-semibold text-white tracking-tight truncate">{displayName}</p>
                <p className="text-[10px] text-neutral-400 font-mono truncate capitalize">
                  {roleName}
                </p>
              </div>
            )}
          </div>

          {!collapsed && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                isUserMenuOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          )}
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
