import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiquidGlass } from '@/hooks/useLiquidGlass';

type NavSection = 'product' | 'curriculum' | 'practice' | 'intelligence';

/**
 * LandingHeader — Original Google Stitch Navbar Restoration
 * 
 * Exact reproduction of line 31 in `reference/stitch-landing-page/screen.html`:
 * - Fixed, pointer-events-none outer header with anim-nav entrance.
 * - Floating rounded-full capsule: max-w-5xl, bg-[#080B11]/85, backdrop-blur-xl, border border-white/[0.08].
 * - Pure-CSS concentric orbital brand mark: w-6 h-6 with radial gradient border & center white core.
 * - Exact typography: CHAKRIVA (text-[13px] tracking-[0.18em]) + LABS (text-[10px] text-[#8C909F] font-mono).
 * - Exact navigation links: Product, Curriculum, Practice, Intelligence (text-[13px] font-medium).
 * - Active indicator: 1.5px #CBD5E1 underline bar.
 * - Right actions: Sign in (text-[13px] text-[#8C909F]) + "Build your roadmap ↗" (bg-[#F8FAFC] pill).
 * - Clean responsive mobile drawer.
 */
export const LandingHeader: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>('product');

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Section scroll spy to update active indicator
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowH = window.innerHeight;

      const roadmapsEl = document.getElementById('roadmaps');
      const practiceEl = document.getElementById('practice-simulator');
      const aiEl = document.getElementById('ai-coprocessor');

      const roadmapsTop = roadmapsEl ? roadmapsEl.offsetTop - windowH * 0.4 : Infinity;
      const practiceTop = practiceEl ? practiceEl.offsetTop - windowH * 0.4 : Infinity;
      const aiTop = aiEl ? aiEl.offsetTop - windowH * 0.4 : Infinity;

      if (scrollY >= aiTop) {
        setActiveSection('intelligence');
      } else if (scrollY >= practiceTop) {
        setActiveSection('practice');
      } else if (scrollY >= roadmapsTop) {
        setActiveSection('curriculum');
      } else {
        setActiveSection('product');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll handler for anchor links
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string, section: NavSection) => {
    e.preventDefault();
    setActiveSection(section);
    setMobileMenuOpen(false);

    if (targetId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Initialize liquid glass refraction effect on floating navbar capsule
  useLiquidGlass({
    target: '#chakriva-landing-navbar',
    snapshot: 'body',
    engine: 'auto',
    resolution: 2.0,
    refraction: 0.015,
    aberration: 0.012,
    bevelDepth: 0.08,
    bevelWidth: 0.16,
    frost: 1.0,
    shadow: true,
    specular: true,
    reveal: 'fade',
    tint: 'rgba(8, 11, 17, 0.45)',
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 sm:px-6 anim-nav">
      <div
        id="chakriva-landing-navbar"
        data-liquid-lens="true"
        className="pointer-events-auto max-w-5xl mx-auto my-3 md:my-4 rounded-full bg-[#080B11]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)] px-5 sm:px-6 py-2.5 flex items-center justify-between transition-all duration-300 relative"
      >
        {/* Left Side: Brand Logo + Desktop Nav */}
        <div className="flex items-center gap-7 relative z-10 pointer-events-auto">
          {/* Exact Google Stitch Logo Mark */}
          <Link
            to="/"
            onClick={(e) => handleScrollTo(e, 'hero', 'product')}
            className="flex items-center gap-2.5 group focus:outline-none"
            data-path="product"
            aria-label="CHAKRIVA Home"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#1E293B] via-[#94A3B8]/50 to-[#F8FAFC] flex items-center justify-center p-[1px] transition-transform duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-[#050608] rounded-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#F8FAFC] group-hover:scale-125 transition-transform" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] tracking-[0.18em] uppercase font-semibold text-[#F8FAFC]">
                CHAKRIVA
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            <a
              href="#hero"
              onClick={(e) => handleScrollTo(e, 'hero', 'product')}
              data-path="product"
              className={`text-[13px] font-medium transition-colors relative ${
                activeSection === 'product'
                  ? 'text-[#F8FAFC] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[1.5px] after:bg-[#CBD5E1] after:rounded-full'
                  : 'text-[#8C909F] hover:text-[#F8FAFC] hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
              }`}
            >
              Product
            </a>
            <a
              href="#roadmaps"
              onClick={(e) => handleScrollTo(e, 'roadmaps', 'curriculum')}
              data-path="curriculum"
              className={`text-[13px] font-medium transition-colors relative ${
                activeSection === 'curriculum'
                  ? 'text-[#F8FAFC] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[1.5px] after:bg-[#CBD5E1] after:rounded-full'
                  : 'text-[#8C909F] hover:text-[#F8FAFC] hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
              }`}
            >
              Curriculum
            </a>
            <a
              href="#practice-simulator"
              onClick={(e) => handleScrollTo(e, 'practice-simulator', 'practice')}
              data-path="practice"
              className={`text-[13px] font-medium transition-colors relative ${
                activeSection === 'practice'
                  ? 'text-[#F8FAFC] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[1.5px] after:bg-[#CBD5E1] after:rounded-full'
                  : 'text-[#8C909F] hover:text-[#F8FAFC] hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
              }`}
            >
              Practice
            </a>
            <a
              href="#ai-coprocessor"
              onClick={(e) => handleScrollTo(e, 'ai-coprocessor', 'intelligence')}
              data-path="intelligence"
              className={`text-[13px] font-medium transition-colors relative ${
                activeSection === 'intelligence'
                  ? 'text-[#F8FAFC] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[1.5px] after:bg-[#CBD5E1] after:rounded-full'
                  : 'text-[#8C909F] hover:text-[#F8FAFC] hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
              }`}
            >
              Intelligence
            </a>
          </nav>
        </div>

        {/* Right Side: Sign in & Primary CTA */}
        <div className="flex items-center gap-4 relative z-10 pointer-events-auto">
          {user ? (
            <Link
              to="/app/home"
              className="text-[13px] font-medium text-[#8C909F] hover:text-[#F8FAFC] transition-colors hidden sm:block"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              data-path="login"
              className="text-[13px] font-medium text-[#8C909F] hover:text-[#F8FAFC] transition-colors hidden sm:block"
            >
              Sign in
            </Link>
          )}

          {/* Exact Stitch CTA Button */}
          <Link
            to="/app/diagnostic"
            data-path="roadmaps"
            className="hidden sm:flex bg-[#F8FAFC] text-[#07090E] hover:bg-[#E2E8F0] font-semibold text-[12px] px-4 py-1.5 rounded-full shadow-[0_2px_12px_rgba(255,255,255,0.18)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all items-center gap-1 group focus:outline-none"
          >
            <span>Build your roadmap</span>
            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              ↗
            </span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1 text-[#8C909F] hover:text-[#F8FAFC] transition-colors focus:outline-none"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Styled identically to Stitch design language) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            data-liquid-ignore="true"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="pointer-events-auto max-w-5xl mx-auto mt-2 rounded-2xl bg-[#080B11]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.8)] p-4 md:hidden flex flex-col gap-3 text-left"
          >
            <nav className="flex flex-col gap-2">
              <a
                href="#hero"
                onClick={(e) => handleScrollTo(e, 'hero', 'product')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'product'
                    ? 'text-[#F8FAFC] bg-white/[0.06]'
                    : 'text-[#8C909F] hover:text-[#F8FAFC]'
                }`}
              >
                Product
              </a>
              <a
                href="#roadmaps"
                onClick={(e) => handleScrollTo(e, 'roadmaps', 'curriculum')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'curriculum'
                    ? 'text-[#F8FAFC] bg-white/[0.06]'
                    : 'text-[#8C909F] hover:text-[#F8FAFC]'
                }`}
              >
                Curriculum
              </a>
              <a
                href="#practice-simulator"
                onClick={(e) => handleScrollTo(e, 'practice-simulator', 'practice')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'practice'
                    ? 'text-[#F8FAFC] bg-white/[0.06]'
                    : 'text-[#8C909F] hover:text-[#F8FAFC]'
                }`}
              >
                Practice
              </a>
              <a
                href="#ai-coprocessor"
                onClick={(e) => handleScrollTo(e, 'ai-coprocessor', 'intelligence')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'intelligence'
                    ? 'text-[#F8FAFC] bg-white/[0.06]'
                    : 'text-[#8C909F] hover:text-[#F8FAFC]'
                }`}
              >
                Intelligence
              </a>
            </nav>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              {user ? (
                <Link
                  to="/app/home"
                  className="text-xs font-medium text-[#8C909F] hover:text-white px-3 py-1.5"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="text-xs font-medium text-[#8C909F] hover:text-white px-3 py-1.5"
                >
                  Sign in
                </Link>
              )}
              <Link
                to="/app/diagnostic"
                className="bg-[#F8FAFC] text-[#07090E] font-semibold text-[11px] px-3.5 py-1.5 rounded-full"
              >
                Build your roadmap ↗
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default LandingHeader;
