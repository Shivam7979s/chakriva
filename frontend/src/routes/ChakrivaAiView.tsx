import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/data/Card';
import { Button } from '@/components/ui/actions/Button';
import { Badge } from '@/components/ui/data/Badge';
import {
  Brain,
  Sparkles,
  Repeat,
  Send,
} from 'lucide-react';
import { classifySocraticQuery } from '@/lib/socraticClassifier';

export const ChakrivaAiView: React.FC = () => {
  const [promptInput, setPromptInput] = useState('');
  const [activeQueryResponse, setActiveQueryResponse] = useState<string | null>(null);

  const samplePrompts = [
    'Explain the invariant condition for Search in Rotated Sorted Array',
    'Why does the two-pointer approach work in Container With Most Water?',
    'How do I prove that dynamic programming applies to this problem?',
    'Analyze my common time complexity regressions in Tree traversals',
  ];

  const handleSimulatePrompt = (p: string) => {
    setPromptInput(p);
    const result = classifySocraticQuery(p);
    setActiveQueryResponse(result.guidance);
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Chakriva AI' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                Cognitive Architecture
              </span>
              <span className="text-xs font-mono text-neutral-400">
                Connected to Invariant Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Chakriva AI — Learner Intelligence
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
              Continuous Socratic guidance grounded in your execution telemetry, diagnostic error vectors, and code invariant analysis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/app/diagnostic">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Brain className="w-4 h-4" />}
                className="text-xs"
              >
                Diagnostic Test
              </Button>
            </Link>
          </div>
        </div>

        {/* 4-Step Intelligence Loop Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0F121A] border border-white/[0.08] space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold">
              <span className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">1</span>
              <span>CODE & EXECUTE</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every submission run through the isolated container judge generates runtime, memory, and failure telemetry.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F121A] border border-white/[0.08] space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold">
              <span className="w-5 h-5 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">2</span>
              <span>ANALYZE INVARIANTS</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Identifies invariant breakdowns (off-by-one bounds, stack order, memory leaks) without spoiling full code solutions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F121A] border border-white/[0.08] space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold">
              <span className="w-5 h-5 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">3</span>
              <span>LEARNER INSIGHTS</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Constructs your empirical cognitive vector across Arrays, Graphs, DP, and Mathematical invariants.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F121A] border border-white/[0.08] space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
              <span className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">4</span>
              <span>ADAPTIVE ROADMAP</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Auto-schedules revision intervals and reshuffles weekly sprints to target discovered weaknesses.
            </p>
          </div>
        </div>

        {/* Interactive Socratic Mentor Console */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-[#0F121A] border-white/[0.08]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <CardTitle className="text-base text-white">Socratic Conceptual Mentor</CardTitle>
                  </div>
                  <Badge variant="neutral" className="text-[10px] font-mono">
                    Deterministic Invariant Model • Zero Spoilers
                  </Badge>
                </div>
                <CardDescription className="text-xs text-neutral-400">
                  Ask targeted conceptual questions about algorithmic patterns, invariant proofs, and complexity bounds.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Sample Prompt Pills */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                    Suggested Exploration Questions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {samplePrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSimulatePrompt(p)}
                        className="text-left text-[11px] font-sans px-2.5 py-1 rounded bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-neutral-300 hover:text-white transition-all"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated response window */}
                {activeQueryResponse && (
                  <div className="p-3.5 rounded-lg bg-black/40 border border-purple-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-purple-300 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Chakriva Socratic Invariant Engine</span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed font-mono">
                      {activeQueryResponse}
                    </p>
                  </div>
                )}

                {/* Input form */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && promptInput) {
                        handleSimulatePrompt(promptInput);
                      }
                    }}
                    placeholder="Ask about an algorithmic invariant or edge case..."
                    className="flex-1 bg-white/[0.03] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => promptInput && handleSimulatePrompt(promptInput)}
                    rightIcon={<Send className="w-3.5 h-3.5" />}
                    className="text-xs shrink-0"
                  >
                    Ask
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Rail: Quick Actions & Intelligence Anchors */}
          <div className="space-y-4">
            <Card className="bg-[#0F121A] border-white/[0.08]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-white">Diagnostic Skill Vector</CardTitle>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">Uncalibrated Demo</span>
                </div>
                <CardDescription className="text-xs text-neutral-400">
                  Assess your foundational mental models across core invariant domains. Sample profile shown below:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono space-y-1 text-neutral-300">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Array Invariants (Sample)</span>
                    <span className="text-emerald-400">85% Proficient</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Binary Search (Sample)</span>
                    <span className="text-amber-400">65% Developing</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Dynamic Programming (Sample)</span>
                    <span className="text-blue-400">70% Calibrating</span>
                  </div>
                </div>
                <Link to="/app/diagnostic">
                  <Button variant="secondary" size="sm" className="w-full text-xs justify-center">
                    Calibrate Vector
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-[#0F121A] border-white/[0.08]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white">Active Recall Checkpoints</CardTitle>
                <CardDescription className="text-xs text-neutral-400">
                  Spaced-repetition invariant checkpoints scheduled by the AI engine.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-neutral-400">
                  Daily spaced repetition ensures algorithmic patterns transition from short-term memory to permanent intuition.
                </p>
                <Link to="/app/revision">
                  <Button variant="outline" size="sm" className="w-full text-xs justify-center" leftIcon={<Repeat className="w-3.5 h-3.5" />}>
                    Open Revision Deck
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChakrivaAiView;
