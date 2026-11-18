import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { Sun, Moon, Search, Menu, X } from 'lucide-react';
import { Button } from '../actions/Button';
import { IconButton } from '../actions/IconButton';
import { useLiquidGlass } from '@/hooks/useLiquidGlass';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  // Initialize liquid glass refraction effect on sticky platform header
  useLiquidGlass({
    target: '#chakriva-global-header',
    snapshot: 'body',
    engine: 'auto',
    resolution: 2.0,
    refraction: 0.012,
    aberration: 0.008,
    bevelDepth: 0.05,
    bevelWidth: 0.12,
    frost: 0.8,
    shadow: false,
    specular: true,
    reveal: 'fade',
    tint: theme === 'dark' ? 'rgba(8, 11, 17, 0.55)' : 'rgba(255, 255, 255, 0.65)',
  });

  const navLinks = [
    { label: 'Roadmaps', href: '/roadmaps' },
    { label: 'Problems', href: '/problems' },
    { label: 'Online IDE', href: '/ide' },
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'Courses', href: '/courses' },
    { label: 'Architecture', href: '/architecture' },
    { label: 'Tokens', href: '/foundation' },
  ];

  return (
    <header
      id="chakriva-global-header"
      data-liquid-lens="true"
      className="sticky top-0 z-dock w-full border-b border-border bg-surface/90 backdrop-blur-sm transition-colors"
    >
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between relative z-10 pointer-events-auto">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-text-primary">
            <img
              src="/chakriva-logo.svg"
              alt="CHAKRIVA Logo"
              className="w-7 h-7 object-contain shrink-0"
            />
            <span className="text-base tracking-wider font-mono font-bold">CHAKRIVA</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'px-3 py-1.5 rounded text-[13px] font-medium transition-colors',
                    isActive
                      ? 'text-primary bg-primary/10 font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Command Palette Trigger */}
          <button
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              );
            }}
            className="hidden sm:flex items-center gap-2 h-8 px-2.5 rounded border border-border bg-surface-subtle text-text-muted hover:text-text-primary text-[12px] transition-colors"
            title="Open command palette (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <kbd className="px-1 py-0.2 rounded border border-border/80 bg-surface font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle */}
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Toggle theme"
            icon={theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
            onClick={toggleTheme}
          />

          {/* App / Auth Link */}
          {user ? (
            <Link to="/app/home">
              <Button size="sm" variant="primary" className="text-xs font-mono">
                {profile?.full_name || profile?.username || 'Launch App'}
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-neutral-400 bg-white/[0.04] border border-white/[0.08]">
                Guest Developer
              </span>
              <Link to="/login">
                <Button size="sm" variant="secondary" className="text-xs">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" className="hidden sm:inline-block">
                <Button size="sm" variant="primary" className="text-xs">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu trigger */}
          <div className="md:hidden">
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Toggle mobile menu"
              icon={mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              onClick={() => setMobileMenuOpen((p) => !p)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          data-liquid-ignore="true"
          className="md:hidden border-b border-border bg-surface px-4 py-3 flex flex-col gap-1 animate-in slide-in-from-top-2 relative z-20 pointer-events-auto"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 mt-1 border-t border-border flex flex-col gap-1.5">
            {user ? (
              <Link
                to="/app/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded text-[13px] font-medium text-primary hover:bg-surface-subtle text-left"
              >
                Go to Workspace ({profile?.username || 'Dashboard'})
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-1.5 rounded text-[13px] font-medium border border-border text-text-primary text-center hover:bg-surface-subtle"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-1.5 rounded text-[13px] font-medium bg-primary text-text-inverse text-center"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
