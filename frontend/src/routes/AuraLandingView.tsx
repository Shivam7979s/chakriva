import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ChevronRight,
  Sparkles,
  Inbox,
  Star,
  Send,
  FileText,
  Archive,
  Trash2,
  Search,
  Reply,
  Forward,
  MoreHorizontal,
  Paperclip,
  Menu,
  Check,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                              SHARED PRIMITIVES                             */
/* -------------------------------------------------------------------------- */

export const AppleLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 384 512"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 256 256"
    fill="#ffffff"
    className={className}
    aria-hidden="true"
  >
    <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
  </svg>
);

export interface AppleButtonProps {
  label?: string;
  full?: boolean;
  className?: string;
}

export const AppleButton: React.FC<AppleButtonProps> = ({
  label = 'Download Aura',
  full = false,
  className = '',
}) => (
  <button
    type="button"
    className={`group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-medium text-sm px-5 py-3 transition-all hover:bg-white/90 active:scale-[0.98] ${
      full ? 'w-full' : ''
    } ${className}`}
  >
    <AppleLogo className="w-4 h-4 flex-shrink-0" />
    <span>{label}</span>
    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-[1px]" />
  </button>
);

export const SectionEyebrow: React.FC<{ label: string; tag?: string }> = ({ label, tag }) => (
  <div className="inline-flex items-center gap-2 text-xs font-medium text-white/80">
    <span className="w-1.5 h-1.5 rounded-full bg-white" />
    <span>{label}</span>
    {tag && (
      <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/50 text-[11px]">
        {tag}
      </span>
    )}
  </div>
);

const gradientStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, #091020 0%, #0B2551 12.5%, #A4F4FD 32.5%, #00d2ff 50%, #0B2551 67.5%, #091020 87.5%, #091020 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  filter: 'url(#c3-noise)',
};

/* -------------------------------------------------------------------------- */
/*                                MAIN COMPONENT                              */
/* -------------------------------------------------------------------------- */

export const AuraLandingView: React.FC = () => {
  const [yearly, setYearly] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = ['Solutions', 'Pricing', 'Blog', 'Documentation', 'Careers'];
  const menuBarItems = ['File', 'Edit', 'View', 'Go', 'Window', 'Help'];
  const logos = ['Linear', 'Vercel', 'Figma', 'Stripe', 'Ramp', 'Notion', 'Loom', 'Arc'];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0c0c] text-white selection:bg-brand/30">
      {/* Root SVG Noise Filter */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <filter id="c3-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
          <feComposite in2="SourceGraphic" operator="in" result="noise" />
          <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
        </filter>
      </svg>

      {/* Global Background Video */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4"
        />
      </div>

      {/* Vertical Guide Lines */}
      <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2 -translate-x-[calc(50%+36rem)] w-px bg-white/10 z-[5]" />
      <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2 translate-x-[calc(-50%+36rem)] w-px bg-white/10 z-[5]" />

      {/* Content wrapper sitting over video */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ================================================================== */}
        {/* SECTION 1 — NAVBAR                                                */}
        {/* ================================================================== */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-6xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between"
        >
          {/* Left: Just LogoMark (NO "Aura" word) */}
          <div className="flex items-center">
            <LogoMark className="w-8 h-8" />
          </div>

          {/* Center: Desktop links with staggered animation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, idx) => (
              <motion.a
                key={link}
                href={`#${link.toLowerCase()}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + idx * 0.05, ease: 'easeOut' }}
                className="text-white/70 text-sm font-medium hover:text-white transition-colors"
              >
                {link}
              </motion.a>
            ))}
          </div>

          {/* Right Desktop */}
          <div className="hidden md:flex items-center">
            <AppleButton label="Download Aura" />
          </div>

          {/* Mobile Right Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </motion.nav>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 border-b border-white/10 bg-black/60 backdrop-blur-md">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/80 text-sm font-medium py-1"
              >
                {link}
              </a>
            ))}
            <div className="pt-2">
              <AppleButton full label="Download Aura" />
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* SECTION 2 — HERO                                                  */}
        {/* ================================================================== */}
        <section className="pt-16 md:pt-28 pb-20 text-center flex flex-col items-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-7xl font-semibold tracking-tight leading-[0.9]"
          >
            <span className="block text-white">Your email.</span>
            <span
              className="animate-shiny block mt-2"
              style={gradientStyle}
            >
              Revitalized
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: 'easeOut' }}
            className="mt-8 text-white/60 max-w-md text-base leading-[1.5]"
          >
            Aura is the premier inbox platform for the current era. It leverages powerful AI to organize,
            prioritize, and refine your messages into total clarity.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: 'easeOut' }}
            className="mt-8 flex flex-col items-center gap-2"
          >
            <AppleButton />
            <span className="text-xs text-white/40">Download for Intel / Apple Silicon</span>
          </motion.div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 3 — macOS MENU BAR STRIP                                  */}
        {/* ================================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9, ease: 'easeOut' }}
          className="w-full h-10 bg-black/40 backdrop-blur-md border-t border-b border-white/10"
        >
          <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <AppleLogo className="w-3.5 h-3.5 text-white" />
              <span className="font-semibold text-white">Aura</span>
              <div className="flex items-center gap-4 text-white/70">
                {menuBarItems.map((item, idx) => (
                  <span
                    key={item}
                    className={`cursor-default hover:text-white transition-colors ${
                      idx > 3 ? 'hidden md:inline' : idx > 2 ? 'hidden sm:inline' : 'inline'
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-white/70">
              <Search className="w-3.5 h-3.5" />
              <span>Wed May 6 1:09 PM</span>
            </div>
          </div>
        </motion.div>

        {/* ================================================================== */}
        {/* SECTION 4 — INBOX MOCKUP                                          */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0e1014]/90 backdrop-blur-2xl shadow-2xl shadow-black/80"
          >
            {/* Title Bar */}
            <div className="h-10 px-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="text-xs text-white/50 font-medium">Aura — Inbox</div>
              <div className="w-12" /> {/* spacer */}
            </div>

            {/* Mockup Body Grid */}
            <div className="grid grid-cols-12 h-[520px]">
              {/* Sidebar (col-span-3) */}
              <div className="col-span-3 border-r border-white/10 bg-black/30 p-4 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-white text-black text-xs font-semibold px-3 py-2 shadow hover:bg-white/90 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Compose with Aura</span>
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/10 text-white cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Inbox className="w-3.5 h-3.5" />
                        <span>Inbox</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10">12</span>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5" />
                        <span>Starred</span>
                      </div>
                      <span className="text-[10px] text-white/40">3</span>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <Send className="w-3.5 h-3.5" />
                        <span>Sent</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Drafts</span>
                      </div>
                      <span className="text-[10px] text-white/40">2</span>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-white/60 hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Trash</span>
                      </div>
                    </div>
                  </div>

                  {/* Labels Section */}
                  <div>
                    <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase mb-2 px-2.5">
                      Labels
                    </div>
                    <div className="space-y-1.5 px-2.5 text-xs text-white/70">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00d2ff]" />
                        <span>Work</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#A4F4FD]" />
                        <span>Personal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                        <span>Travel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                        <span>Finance</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message List (col-span-4) */}
              <div className="col-span-4 border-r border-white/10 flex flex-col overflow-hidden bg-black/10">
                {/* Search Header */}
                <div className="p-3 border-b border-white/10">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-white/50">
                    <Search className="w-3.5 h-3.5" />
                    <span>Search mail</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                  {/* Linear - unread + active */}
                  <div className="p-3 bg-white/[0.07] border-l-2 border-brand cursor-pointer">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                        <span className="font-semibold text-white">Linear</span>
                      </div>
                      <span className="text-[11px] text-white/50">9:41 AM</span>
                    </div>
                    <div className="text-xs font-medium text-white/90 mt-1 truncate">
                      Weekly product digest
                    </div>
                    <div className="text-[11px] text-white/50 mt-0.5 line-clamp-1">
                      Your team shipped 23 issues this week...
                    </div>
                  </div>

                  {/* Sophia Chen - unread */}
                  <div className="p-3 hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff]" />
                        <span className="font-semibold text-white">Sophia Chen</span>
                      </div>
                      <span className="text-[11px] text-white/50">8:12 AM</span>
                    </div>
                    <div className="text-xs font-medium text-white/90 mt-1 truncate">
                      Re: Q3 roadmap review
                    </div>
                    <div className="text-[11px] text-white/50 mt-0.5 line-clamp-1">
                      Thanks for sending the deck over. I had a few thoughts...
                    </div>
                  </div>

                  {/* Figma */}
                  <div className="p-3 hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white/80">Figma</span>
                      <span className="text-[11px] text-white/40">Yesterday</span>
                    </div>
                    <div className="text-xs text-white/70 mt-1 truncate">
                      Marcus commented on your file
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5 line-clamp-1">
                      Love the new direction on the landing hero.
                    </div>
                  </div>

                  {/* Stripe */}
                  <div className="p-3 hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white/80">Stripe</span>
                      <span className="text-[11px] text-white/40">Yesterday</span>
                    </div>
                    <div className="text-xs text-white/70 mt-1 truncate">
                      Payout of $12,480.00 sent
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5 line-clamp-1">
                      Your payout is on its way to your bank...
                    </div>
                  </div>

                  {/* Vercel */}
                  <div className="p-3 hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white/80">Vercel</span>
                      <span className="text-[11px] text-white/40">Mon</span>
                    </div>
                    <div className="text-xs text-white/70 mt-1 truncate">
                      Deployment ready for aura-web
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5 line-clamp-1">
                      Preview is live at aura-web-g3f.vercel.app
                    </div>
                  </div>

                  {/* GitHub */}
                  <div className="p-3 hover:bg-white/[0.03] cursor-pointer transition-colors">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white/80">GitHub</span>
                      <span className="text-[11px] text-white/40">Mon</span>
                    </div>
                    <div className="text-xs text-white/70 mt-1 truncate">
                      [aura/core] PR #482 approved
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5 line-clamp-1">
                      david-lim approved your pull request.
                    </div>
                  </div>
                </div>
              </div>

              {/* Reader (col-span-5) */}
              <div className="col-span-5 flex flex-col overflow-hidden bg-black/20">
                {/* Toolbar */}
                <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between text-white/60">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors"
                      title="Forward"
                    >
                      <Forward className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors"
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors"
                      title="Trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors"
                    title="More options"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reader Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Subject and Sender */}
                  <div>
                    <h3 className="text-base font-semibold text-white">Weekly product digest</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] flex items-center justify-center text-xs font-semibold text-white">
                          L
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white">Linear</div>
                          <div className="text-[10px] text-white/50">to me · 9:41 AM</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#00d2ff]/30 text-[#00d2ff] bg-[#00d2ff]/10">
                        Work
                      </span>
                    </div>
                  </div>

                  {/* Summary by Aura Card */}
                  <div className="rounded-xl p-3 border border-white/10 bg-white/[0.03] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A4F4FD]">
                      <Sparkles className="w-3.5 h-3.5 text-[#A4F4FD]" />
                      <span>Summary by Aura</span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Your team closed 23 issues, merged 14 PRs, and shipped 2 features. Top contributor:
                      Marcus. No action needed.
                    </p>
                  </div>

                  {/* Body Paragraphs */}
                  <div className="text-xs text-white/70 space-y-3 leading-relaxed">
                    <p>Hi team,</p>
                    <p>
                      Here is your weekly digest of everything happening across your projects. This was a
                      strong week with significant progress on the Q3 roadmap.
                    </p>
                    <p>
                      Twenty-three issues were closed, fourteen pull requests were merged, and two
                      customer-facing features went out. The velocity trend continues to climb.
                    </p>
                    <p>
                      Let me know if you would like a deeper breakdown by project or contributor.
                    </p>
                    <p className="text-white/50">— The Linear team</p>
                  </div>

                  {/* Attachment Pill */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] text-xs text-white/70 hover:bg-white/[0.08] cursor-pointer transition-colors">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>digest-may-6.pdf</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 5 — FEATURE TRIAGE                                        */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 w-full">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <SectionEyebrow label="Triage" tag="AI-native" />
              <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02]">
                Clear your inbox
                <br />
                in a single pass.
              </h2>
              <p className="mt-6 text-white/60 text-base leading-[1.6] max-w-md">
                Aura reads every message, understands intent, and routes the noise away from the
                signal. Focus on what moves your day forward — the rest handles itself.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  'Auto-categorize',
                  'Snooze for later',
                  'Silent newsletters',
                  'One-tap unsubscribe',
                ].map((chip) => (
                  <span
                    key={chip}
                    className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Right Column: Liquid-Glass Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              className="liquid-glass rounded-2xl p-5"
            >
              <div className="text-xs text-white/50 font-medium mb-4">
                Today · 42 messages triaged
              </div>

              <div className="space-y-3">
                {/* Priority */}
                <div className="liquid-glass rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#ffffff] mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#ffffff]" />
                      <span>Priority</span>
                    </div>
                    <span className="text-white/40">4</span>
                  </div>
                  <div className="space-y-1 text-xs text-white/80">
                    <div>Sophia Chen — Q3 review</div>
                    <div>David Lim — contract signoff</div>
                  </div>
                </div>

                {/* Follow-up */}
                <div className="liquid-glass rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#e5e5e5] mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#e5e5e5]" />
                      <span>Follow-up</span>
                    </div>
                    <span className="text-white/40">7</span>
                  </div>
                  <div className="space-y-1 text-xs text-white/80">
                    <div>Marcus — design review</div>
                    <div>Figma — comment thread</div>
                  </div>
                </div>

                {/* Updates */}
                <div className="liquid-glass rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#a3a3a3] mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#a3a3a3]" />
                      <span>Updates</span>
                    </div>
                    <span className="text-white/40">18</span>
                  </div>
                  <div className="space-y-1 text-xs text-white/80">
                    <div>Vercel — deploy ready</div>
                    <div>GitHub — PR #482 merged</div>
                  </div>
                </div>

                {/* Archived */}
                <div className="liquid-glass rounded-lg p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#525252] mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#525252]" />
                      <span>Archived</span>
                    </div>
                    <span className="text-white/40">13</span>
                  </div>
                  <div className="text-xs text-white/70">
                    Stripe payout · Newsletter · Receipts
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 6 — LOGO CLOUD                                            */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20 w-full text-center">
          <div className="text-xs uppercase tracking-widest text-white/40">
            Trusted by the world's most thoughtful teams
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 items-center">
            {logos.map((logo, idx) => (
              <motion.div
                key={logo}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="text-sm font-semibold tracking-tight text-white/50 hover:text-white transition-colors cursor-default"
              >
                {logo}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 7 — TESTIMONIALS                                          */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 w-full">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <motion.figure
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
            >
              <blockquote className="text-sm text-white/80 leading-[1.6]">
                &ldquo;Aura gave our leadership team four hours of their week back. It reads like email
                from the future.&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/10">
                <div className="text-sm font-semibold text-white">Parker Wilf</div>
                <div className="text-xs text-white/50">Group Product Manager</div>
                <div className="text-xs text-white font-semibold tracking-wide uppercase mt-1">
                  MERCURY
                </div>
              </figcaption>
            </motion.figure>

            {/* Testimonial 2 */}
            <motion.figure
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
            >
              <blockquote className="text-sm text-white/80 leading-[1.6]">
                &ldquo;The command palette alone has changed how I process messages. I can't imagine
                going back to a traditional client.&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/10">
                <div className="text-sm font-semibold text-white">Andrew von Rosenbach</div>
                <div className="text-xs text-white/50">Senior Engineering Program Manager</div>
                <div className="text-xs text-white font-semibold tracking-wide uppercase mt-1">
                  COHERE
                </div>
              </figcaption>
            </motion.figure>

            {/* Testimonial 3 */}
            <motion.figure
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
            >
              <blockquote className="text-sm text-white/80 leading-[1.6]">
                &ldquo;Triage that actually understands context. Our team stopped dreading Monday
                morning inboxes.&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-white/10">
                <div className="text-sm font-semibold text-white">Mathies Christensen</div>
                <div className="text-xs text-white/50">Engineering Manager</div>
                <div className="text-xs text-white font-semibold tracking-wide uppercase mt-1">
                  LUNAR
                </div>
              </figcaption>
            </motion.figure>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 8 — PRICING                                               */}
        {/* ================================================================== */}
        <section className="c3-pricing-section" id="pricing">
          {/* Pricing Noise Filter */}
          <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <filter id="c3-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="2" stitchTiles="stitch" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.075" />
              </feComponentTransfer>
              <feComposite in2="SourceGraphic" operator="in" result="noise" />
              <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
            </filter>
          </svg>

          {/* Watermark */}
          <div className="c3-watermark-container">
            <div className="c3-watermark-main">
              <span className="c3-watermark-line-1">Your email.</span>
              <span className="c3-watermark-line-2">Revitalized</span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="c3-grid">
            {/* Free */}
            <div className="c3-card">
              <span className="c3-tier-small">Free</span>
              <div className="c3-tier-large">Free</div>
              <p className="c3-desc">For creators taking their first steps with Forma.</p>
              <ul className="c3-list list-none p-0 m-0">
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Up to 3 projects in the cloud</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Image export up to 1080p</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Basic editing tools</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Free templates and icons</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Access via web and mobile app</span>
                </li>
              </ul>
              <button type="button" className="c3-btn">
                Choose Plan
              </button>
            </div>

            {/* Standard */}
            <div className="c3-card">
              <span className="c3-tier-small">Standard</span>
              <div className="c3-tier-large">{yearly ? '$99,99/y' : '$9,99/m'}</div>
              <p className="c3-desc">
                For freelancers and small teams who need more freedom and flexibility.
              </p>
              <ul className="c3-list list-none p-0 m-0">
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Up to 50 projects in the cloud</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Export up to 4K</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Advanced editing toolkit</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Team collaboration (up to 5 members)</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Access to premium template library</span>
                </li>
              </ul>
              <button type="button" className="c3-btn">
                Choose Plan
              </button>
            </div>

            {/* Pro */}
            <div className="c3-card c3-card-pro">
              <span className="c3-tier-small">Pro</span>
              <div className="c3-tier-large">{yearly ? '$199,99/y' : '$19,99/m'}</div>
              <p className="c3-desc">
                For studios, agencies, and professional creators working with brands.
              </p>
              <ul className="c3-list list-none p-0 m-0">
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Unlimited projects</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Export up to 8K + animations</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>AI-powered content generation tools</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Unlimited team members</span>
                </li>
                <li>
                  <span className="c3-check">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span>Brand customization</span>
                </li>
              </ul>
              <button type="button" className="c3-btn">
                Choose Plan
              </button>
            </div>
          </div>

          {/* Toggle Wrap */}
          <div className="c3-toggle-wrap">
            <span className="text-sm font-medium text-white/80">Yearly</span>
            <button
              type="button"
              className={`c3-toggle ${yearly ? 'active' : ''}`}
              onClick={() => setYearly(!yearly)}
              aria-label="Toggle annual pricing"
            >
              <span className="c3-toggle-knob" />
            </button>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 9 — FINAL CTA                                             */}
        {/* ================================================================== */}
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-32 w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-24 text-center"
          >
            {/* Radial Glow Overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.15), transparent 70%)',
                opacity: 0.3,
              }}
            />

            <h2 className="relative z-10 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02]">
              <div>Close the tabs.</div>
              <div className="mt-2">Open your day.</div>
            </h2>

            <p className="relative z-10 mt-6 text-white/60 max-w-md mx-auto text-sm leading-[1.6]">
              Join thousands of builders, founders, and operators who treat email like a tool — not an
              obligation.
            </p>

            <div className="relative z-10 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <AppleButton label="Download Aura" />
              <button
                type="button"
                className="rounded-full border border-white/15 text-white text-sm font-medium px-5 py-3 hover:bg-white/5 inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Talk to sales</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </section>

        {/* Footer info */}
        <footer className="w-full max-w-6xl mx-auto px-6 py-8 border-t border-white/10 text-xs text-white/40 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-2">
            <LogoMark className="w-4 h-4" />
            <span>&copy; {new Date().getFullYear()} Chakriva Labs Private Limited. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <span>&bull;</span>
            <Link to="/cookies" className="hover:text-white transition-colors">
              Cookies
            </Link>
            <span>&bull;</span>
            <Link to="/refunds" className="hover:text-white transition-colors">
              Refunds
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
};
