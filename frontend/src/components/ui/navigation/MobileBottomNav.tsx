import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, Code2, Sparkles, MoreHorizontal } from 'lucide-react';

export interface MobileBottomNavProps {
  onOpenMore: () => void;
  isMoreOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMore, isMoreOpen }) => {
  const location = useLocation();
  const pathname = location.pathname;

  const isHomeActive = pathname === '/app/home' || pathname === '/app/dashboard' || pathname === '/dashboard';
  const isRoadmapActive = pathname.startsWith('/app/roadmap') || pathname.startsWith('/roadmaps');
  const isPracticeActive = pathname.startsWith('/app/practice') || pathname.startsWith('/problems');
  const isAiActive = pathname.startsWith('/app/chakriva') || pathname.startsWith('/app/ai');

  const navItems = [
    { label: 'Home', href: '/app/home', icon: <Home className="w-5 h-5" />, isActive: isHomeActive },
    { label: 'Roadmap', href: '/app/roadmap', icon: <Compass className="w-5 h-5" />, isActive: isRoadmapActive },
    { label: 'Practice', href: '/app/practice', icon: <Code2 className="w-5 h-5" />, isActive: isPracticeActive },
    { label: 'AI', href: '/app/chakriva', icon: <Sparkles className="w-5 h-5" />, isActive: isAiActive },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#080B11]/92 backdrop-blur-xl border-t border-white/[0.08] shadow-[0_-8px_32px_rgba(0,0,0,0.6)] px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-5 items-center justify-between max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative select-none ${
              item.isActive
                ? 'text-[#00d2ff]'
                : 'text-white/40 hover:text-white/80 active:scale-95'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00d2ff] shadow-[0_0_6px_#00d2ff]" />
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight mt-1 leading-none">
              {item.label}
            </span>
          </NavLink>
        ))}

        {/* More Button */}
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="More navigation options"
          aria-expanded={isMoreOpen}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative select-none ${
            isMoreOpen
              ? 'text-[#00d2ff]'
              : 'text-white/40 hover:text-white/80 active:scale-95'
          }`}
        >
          <div className="relative">
            <MoreHorizontal className="w-5 h-5" />
            {isMoreOpen && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00d2ff] shadow-[0_0_6px_#00d2ff]" />
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-1 leading-none">
            More
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
