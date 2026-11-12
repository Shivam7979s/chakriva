import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, RotateCcw, Play } from 'lucide-react';
import type { InteractiveStepFrame } from '../types/learn';
import { cn } from '@/lib/utils';

export interface InteractiveTraceStepperProps {
  title: string;
  subtitle: string;
  steps: InteractiveStepFrame[];
}

const TONE_CLASSES: Record<'sapphire' | 'teal' | 'amber' | 'violet', string> = {
  sapphire: 'bg-[#12203B] border-[#3B82F6]/35 text-[#93C5FD]',
  teal: 'bg-[#0C2624] border-[#00B8A3]/35 text-[#5EEAD4]',
  amber: 'bg-[#291E0B] border-[#F59E0B]/35 text-[#FCD34D]',
  violet: 'bg-[#1C1633] border-[#8B5CF6]/35 text-[#C4B5FD]',
};

export const InteractiveTraceStepper: React.FC<InteractiveTraceStepperProps> = ({
  title,
  subtitle,
  steps,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  if (!steps.length) return null;

  const active = steps[Math.min(stepIdx, steps.length - 1)];

  return (
    <div className="rounded-2xl border border-[#192033] bg-[#0B0E16] overflow-hidden">
      {/* Stepper Header */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#0F131D] border-b border-[#171D2D] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F3F6FF]">
            <Play className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>{title}</span>
          </div>
          <p className="text-[11px] text-[#7C8BA6] mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStepIdx(0)}
            disabled={stepIdx === 0}
            className="p-1.5 rounded-lg border border-[#1B2234] bg-[#0B0E16] text-[#8592A8] hover:text-[#F3F6FF] disabled:opacity-30 cursor-pointer transition-colors"
            title="Reset dry run"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx === 0}
            className="px-2 py-1 rounded-lg border border-[#1B2234] bg-[#0B0E16] text-xs text-[#94A1B8] hover:text-[#F3F6FF] disabled:opacity-30 inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <span className="px-2 text-[11px] font-mono text-[#94A1B8] tabular-nums">
            {stepIdx + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.min(steps.length - 1, i + 1))}
            disabled={stepIdx === steps.length - 1}
            className="px-2.5 py-1 rounded-lg border border-[#243B6B] bg-[#152443] text-xs text-[#E2E8F5] hover:bg-[#1C3159] disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step Selector Track */}
      <div className="px-4 sm:px-5 pt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {steps.map((s, idx) => {
          const isCur = idx === stepIdx;
          return (
            <button
              key={s.stepNumber}
              type="button"
              onClick={() => setStepIdx(idx)}
              className={cn(
                'relative px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer shrink-0',
                isCur ? 'text-[#F3F6FF] font-semibold' : 'text-[#6D7B94] hover:text-[#B8C2D4]'
              )}
            >
              {isCur && (
                <motion.span
                  layoutId="traceStepPill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#152443] border border-[#3B82F6]/35"
                />
              )}
              <span className="relative z-10">Step {s.stepNumber}</span>
            </button>
          );
        })}
      </div>

      {/* Active Step State Frame */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.stepNumber}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="p-4 sm:p-5 space-y-3.5"
        >
          <div>
            <div className="text-sm font-medium text-[#F3F6FF]">{active.title}</div>
            <p className="text-xs text-[#9AB0D1] mt-1 leading-relaxed">{active.stateSummary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {active.highlights.map((h) => (
              <div
                key={h.label}
                className={cn(
                  'rounded-xl border px-3 py-2.5 space-y-1',
                  TONE_CLASSES[h.tone || 'sapphire']
                )}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">
                  {h.label}
                </div>
                <div className="text-xs font-mono font-semibold break-words">{h.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[#0F131D] border border-[#171D2D] px-3.5 py-2.5 text-[11px] text-[#94A1B8]">
            <span className="text-[#00B8A3] font-semibold mr-1.5">Invariant Note:</span>
            {active.pointerNote}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
