import React from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { CommandPalette } from '@/components/ui/actions/CommandPalette';
import { LandingLearningLoop } from '@/components/landing/LandingLearningLoop';
import { LandingRoadmapSection } from '@/components/landing/LandingRoadmapSection';
import { LandingPracticeSection } from '@/components/landing/LandingPracticeSection';
import { LandingAiSection } from '@/components/landing/LandingAiSection';
import { LandingSheetsSection } from '@/components/landing/LandingSheetsSection';
import { LandingCtaSection } from '@/components/landing/LandingCtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export const LandingView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#08090C] text-neutral-100 flex flex-col selection:bg-blue-500/20 selection:text-blue-300 overflow-x-hidden w-full max-w-full">
      {/* Real Command Palette (⌘K / Ctrl+K) */}
      <CommandPalette />

      {/* 1. Architectural Header */}
      <LandingHeader />

      {/* 2. Main Product Storyline */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {/* HERO: The Living Learning Graph + Developer Eyebrow & CTAs */}
        <LandingHero />

        {/* PRODUCT STORY: The 7-Stage Closed Learning Loop */}
        <LandingLearningLoop />

        {/* SYSTEM 01: Adaptive Curriculum DAGs & Non-Punitive Rebalancer */}
        <LandingRoadmapSection />

        {/* SYSTEM 02: Isolated Docker Sandbox & Multi-Language Execution */}
        <div id="practice-simulator" className="scroll-mt-28 sm:scroll-mt-32">
          <LandingPracticeSection />
        </div>

        {/* SYSTEM 03: Socratic AI Mentorship & 4-Tier Invariant Hint Ladder */}
        <div id="ai-coprocessor" className="scroll-mt-28 sm:scroll-mt-32">
          <LandingAiSection />
        </div>

        {/* SYSTEM 04: Curated Problem Sheets & Invariant Taxonomy */}
        <LandingSheetsSection />

        {/* FINAL DEVELOPER CALL TO ACTION */}
        <LandingCtaSection />
      </main>

      {/* 3. Engineering Footer & System Specifications */}
      <LandingFooter />
    </div>
  );
};
export default LandingView;
