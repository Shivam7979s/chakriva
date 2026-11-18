import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#05070D] text-white relative overflow-x-hidden selection:bg-[#00d2ff]/30">
      {/* Lower-intensity ambient blue aura background matching Chakriva */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] bg-gradient-to-tr from-[#00d2ff]/[0.07] via-[#0055ff]/[0.05] to-transparent blur-[140px] pointer-events-none rounded-full"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-1/4 w-[360px] h-[240px] bg-gradient-to-br from-[#7928ca]/[0.05] via-[#00d2ff]/[0.03] to-transparent blur-[130px] pointer-events-none rounded-full"
        aria-hidden="true"
      />

      {/* Standardized Auth Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.06] bg-[#05070D]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Logo & Orbital Mark matching Landing Page */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none"
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

          {/* Subtle Back to Home Link */}
          <Link
            to="/"
            className="text-xs sm:text-[13px] text-[#8C909F] hover:text-[#F8FAFC] transition-colors flex items-center gap-1.5 font-medium group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      {/* Main Authentication Flow Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 relative z-10 w-full">
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
