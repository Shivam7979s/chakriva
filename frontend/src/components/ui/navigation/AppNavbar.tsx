import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon, ChevronDown, Menu, X } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationMenu } from './NotificationMenu';
import { UserAccountMenu } from './UserAccountMenu';

export interface AppNavbarProps {
  className?: string;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({ className = '' }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const pathname = location.pathname;

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow dropdown & mobile menu on outside click or route change
  useEffect(() => {
    setOverflowOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active state matching rules
  const isTabActive = (tabKey: string) => {
    switch (tabKey) {
      case 'home':
        return pathname === '/app/home' || pathname === '/app/dashboard' || pathname === '/dashboard';
      case 'roadmap':
        return pathname.startsWith('/app/roadmap') || pathname.startsWith('/roadmaps');
      case 'learn':
        return pathname.startsWith('/app/learn') || pathname.startsWith('/courses');
      case 'practice':
        return (
          pathname === '/app/practice' ||
          pathname.startsWith('/app/practice/') ||
          pathname === '/problems' ||
          pathname.startsWith('/problems/')
        );
      case 'ide':
        return pathname === '/ide' || pathname === '/app/ide' || pathname.startsWith('/app/codespace');
      case 'sheets':
        return pathname.startsWith('/app/sheets') || pathname.startsWith('/sheets');
      case 'ai':
        return pathname.startsWith('/app/chakriva') || pathname.startsWith('/app/ai');
      case 'contests':
        return pathname.startsWith('/app/contests');
      case 'progress':
        return pathname.startsWith('/app/progress') || pathname.startsWith('/leaderboard');
      default:
        return false;
    }
  };

  // Final Desktop Order:
  // 1. Home, 2. Roadmap, 3. Learn, 4. Practice, 5. CodeSpace, 6. Sheets, 7. Chakriva AI, 8. Contests, 9. Progress
  const primaryTabs = [
    { key: 'home', label: 'Home', href: '/app/home' },
    { key: 'roadmap', label: 'Roadmap', href: '/app/roadmap' },
    { key: 'learn', label: 'Learn', href: '/app/learn' },
    { key: 'practice', label: 'Practice', href: '/app/practice' },
    { key: 'ide', label: 'CodeSpace', href: '/ide' },
    { key: 'sheets', label: 'Sheets', href: '/app/sheets' },
    { key: 'ai', label: 'Mentor', href: '/app/chakriva' },
    { key: 'contests', label: 'Contests', href: '/app/contests' },
    { key: 'progress', label: 'Progress', href: '/app/progress' },
  ];

  // Core learning & practice destinations visible on medium desktop; secondary links (Contests, Progress) in overflow
  const visibleTabs = primaryTabs.slice(0, 7);
  const overflowTabs = primaryTabs.slice(7);

  return (
    <header
      className={`sticky top-0 z-30 w-full h-14 bg-[#080B11]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 select-none ${className}`}
    >
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-4">
        {/* Left Side: Brand Logo + Primary Product Navigation */}
        <div className="flex items-center gap-5 xl:gap-6 min-w-0">
          {/* Exact Concentric Orbital Brand Logo */}
          <Link
            to="/app/home"
            className="flex items-center gap-2.5 group focus:outline-none shrink-0"
            aria-label="CHAKRIVA Home"
          >
            <img
              src="/chakriva-logo.svg"
              alt="CHAKRIVA Logo"
              className="w-6 h-6 object-contain transition-transform duration-300 group-hover:scale-105 shrink-0"
            />
            <span className="text-[13px] tracking-[0.18em] uppercase font-semibold text-[#F8FAFC]">
              CHAKRIVA
            </span>
          </Link>

          {/* Desktop Primary Navigation Tabs */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar py-1"
          >
            {/* Standard Desktop (xl screens): Show all 9 tabs */}
            <div className="hidden xl:flex items-center gap-1">
              {primaryTabs.map((tab) => {
                const active = isTabActive(tab.key);
                return (
                  <Link
                    key={tab.key}
                    to={tab.href}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00d2ff] ${
                      active
                        ? 'text-[#00d2ff] bg-[#002B36] border border-[#00d2ff]/30 shadow-[0_0_12px_rgba(0,210,255,0.15)] font-semibold'
                        : 'text-zinc-400 hover:text-white font-medium'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            {/* Medium Desktop / Laptops (md to xl): Show first 5 tabs + overflow dropdown */}
            <div className="flex xl:hidden items-center gap-1">
              {visibleTabs.map((tab) => {
                const active = isTabActive(tab.key);
                return (
                  <Link
                    key={tab.key}
                    to={tab.href}
                    className={`px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                      active
                        ? 'text-[#00d2ff] bg-[#002B36] border border-[#00d2ff]/30 font-semibold'
                        : 'text-zinc-400 hover:text-white font-medium'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}

              {/* Overflow Trigger */}
              <div className="relative" ref={overflowRef}>
                <button
                  type="button"
                  onClick={() => setOverflowOpen(!overflowOpen)}
                  aria-expanded={overflowOpen}
                  aria-label="More navigation items"
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                    overflowTabs.some((t) => isTabActive(t.key))
                      ? 'text-[#00d2ff] bg-white/[0.06]'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <span>More</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {overflowOpen && (
                  <div className="absolute left-0 mt-2 w-40 rounded-xl border border-white/10 bg-[#090D16]/95 backdrop-blur-xl shadow-xl py-1 z-50 text-left">
                    {overflowTabs.map((tab) => (
                      <Link
                        key={tab.key}
                        to={tab.href}
                        onClick={() => setOverflowOpen(false)}
                        className={`block px-3 py-2 text-xs transition-colors ${
                          isTabActive(tab.key)
                            ? 'text-[#00d2ff] bg-white/[0.04] font-semibold'
                            : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        {tab.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* Right Side: Global Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Command Search */}
          <GlobalSearch />

          {/* Notifications Menu */}
          <NotificationMenu />

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.18] flex items-center justify-center text-white/60 hover:text-white transition-all select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00d2ff]"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-blue-400" />
            )}
          </button>

          {/* User Account Dropdown */}
          <UserAccountMenu />

          {/* Mobile Navigation Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="md:hidden w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center text-white/70 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00d2ff]"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-[#00d2ff]" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 w-full bg-[#080B11]/98 backdrop-blur-2xl border-b border-white/10 px-4 py-3 shadow-2xl transition-all">
          <nav className="flex flex-col space-y-1">
            {primaryTabs.map((tab) => {
              const active = isTabActive(tab.key);
              return (
                <Link
                  key={tab.key}
                  to={tab.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    active
                      ? 'text-[#00d2ff] bg-white/[0.06] border border-[#00d2ff]/30 font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};

export default AppNavbar;
