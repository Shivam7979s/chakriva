import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Button } from '@/components/ui/actions/Button';
import {
  BarChart3,
  Repeat,
  Brain,
  Trophy,
  ArrowRight,
} from 'lucide-react';

export const ProgressView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'analytics';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Progress' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                Telemetry & Mastery
              </span>
              <span className="text-xs font-mono text-neutral-400">
                Empirical Competence Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Learner Progress & Skill Vectors
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
              Track your algorithmic problem-solving accuracy, runtime execution efficiency, active recall revision cycles, and diagnostic competence vectors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/app/revision">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Repeat className="w-4 h-4 text-amber-400" />}
                className="text-xs"
              >
                Revision Deck
              </Button>
            </Link>
            <Link to="/app/diagnostic">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Brain className="w-4 h-4" />}
                className="text-xs"
              >
                Take Diagnostic
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleTabChange('analytics')}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview & Analytics</span>
          </button>

          <Link
            to="/app/revision"
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.03] transition-colors flex items-center gap-2"
          >
            <Repeat className="w-3.5 h-3.5 text-amber-400" />
            <span>Spaced Revision Queue</span>
            <ArrowRight className="w-3 h-3 text-neutral-500" />
          </Link>

          <Link
            to="/app/diagnostic"
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.03] transition-colors flex items-center gap-2"
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>Empirical Diagnostics</span>
            <ArrowRight className="w-3 h-3 text-neutral-500" />
          </Link>

          <Link
            to="/leaderboard"
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.03] transition-colors flex items-center gap-2"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>Campus Leaderboard</span>
            <ArrowRight className="w-3 h-3 text-neutral-500" />
          </Link>
        </div>

        {/* Tab Content */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsDashboard />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProgressView;
