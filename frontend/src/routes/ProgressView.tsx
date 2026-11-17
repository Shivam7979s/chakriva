import React from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { ProgressNavigationTabs } from '@/features/progress/components/ProgressNavigationTabs';

export const ProgressView: React.FC = () => {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Progress' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Executive Header */}
        <div className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                Progress & Analytics
              </h1>
              <p className="text-sm text-[#7C8BA6] max-w-2xl leading-relaxed">
                Track your problem-solving accuracy, difficulty distribution, topic competence, and submission velocity.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/app/revision"
                className="px-3.5 py-2 rounded-xl border border-[#243B6B] bg-[#0F172A]/60 hover:bg-[#152443] text-xs font-medium text-[#93C5FD] transition-colors"
              >
                Spaced Revision
              </Link>
              <Link
                to="/leaderboard"
                className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white transition-colors"
              >
                Campus Leaderboard
              </Link>
            </div>
          </div>
        </div>

        {/* Unified Navigation Tabs */}
        <ProgressNavigationTabs activeTab="analytics" />

        {/* Analytics Dashboard Content */}
        <AnalyticsDashboard />
      </div>
    </DashboardLayout>
  );
};

export default ProgressView;
