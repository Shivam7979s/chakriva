import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/data/Card';
import { Badge } from '@/components/ui/data/Badge';
import { Button } from '@/components/ui/actions/Button';
import {
  Trophy,
  Clock,
  ArrowRight,
  Check,
  CheckCircle2,
} from 'lucide-react';

interface ContestItem {
  id: string;
  title: string;
  subtitle: string;
  startTime: string;
  duration: string;
  status: 'upcoming' | 'live' | 'past';
  problemsCount: number;
  eligibility: string;
  sandboxEnv: string;
}

const CONTESTS_LIST: ContestItem[] = [
  {
    id: 'chakriva-biweekly-01',
    title: 'Chakriva Bi-Weekly Round 01',
    subtitle: 'Algorithmic Invariant Sprint',
    startTime: 'Saturday, 8:00 PM IST',
    duration: '90 Minutes',
    status: 'upcoming',
    problemsCount: 4,
    eligibility: 'Open Division • All Engineers',
    sandboxEnv: 'OpenJDK 21 / GCC 14 / Py 3.12',
  },
  {
    id: 'systems-codesprint-01',
    title: 'Systems & Concurrency Sprint',
    subtitle: 'Multithreading & Data Structure Invariants',
    startTime: 'Next Wednesday, 7:00 PM IST',
    duration: '120 Minutes',
    status: 'upcoming',
    problemsCount: 3,
    eligibility: 'Advanced Systems Track',
    sandboxEnv: 'Isolated Docker Container',
  },
  {
    id: 'warmup-round-00',
    title: 'Campus Diagnostic Warm-Up',
    subtitle: 'Array & Binary Search Rapid Verification',
    startTime: 'Completed Session',
    duration: '60 Minutes',
    status: 'past',
    problemsCount: 3,
    eligibility: 'All Enrolled Batches',
    sandboxEnv: 'Standard Judge Sandbox',
  },
];

export const ContestsView: React.FC = () => {
  const [registeredIds, setRegisteredIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('chakriva_registered_contests');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toggleRegistration = (id: string) => {
    setRegisteredIds((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('chakriva_registered_contests', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Contests' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">
                Competitive Arena
              </span>
              <span className="text-xs font-mono text-neutral-400">
                Isolated Docker Sandboxes
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Algorithmic Contests
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
              Time-boxed algorithmic rounds evaluated against isolated container judge test suites. Compete for campus rankings and verified badge achievements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/leaderboard">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Trophy className="w-4 h-4 text-yellow-400" />}
                className="text-xs"
              >
                Campus Leaderboards
              </Button>
            </Link>
          </div>
        </div>

        {/* Contests Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-300 font-semibold">
              Upcoming & Active Rounds
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CONTESTS_LIST.filter((c) => c.status !== 'past').map((contest) => {
              const isRegistered = Boolean(registeredIds[contest.id]);
              return (
                <Card
                  key={contest.id}
                  className="bg-[#0F121A] border-white/[0.08] hover:border-white/[0.18] transition-all"
                >
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning" className="text-[10px] font-mono uppercase">
                          Scheduled Round
                        </Badge>
                        {isRegistered && (
                          <Badge variant="success" className="text-[10px] font-mono uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Registered
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{contest.duration}</span>
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white font-bold">{contest.title}</CardTitle>
                      <p className="text-xs font-mono text-neutral-400 mt-0.5">{contest.subtitle}</p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-3 rounded-lg bg-black/40 border border-white/[0.06]">
                      <div>
                        <span className="text-neutral-500 block">START TIME</span>
                        <span className="text-neutral-200 font-semibold">{contest.startTime}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block">ELIGIBILITY</span>
                        <span className="text-sky-400 font-semibold">{contest.eligibility}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-neutral-400 font-mono">
                        {contest.problemsCount} Invariant Problems
                      </span>
                      {isRegistered ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs border-emerald-500/30 text-emerald-300 hover:text-white"
                          leftIcon={<Check className="w-3.5 h-3.5 text-emerald-400" />}
                          onClick={() => toggleRegistration(contest.id)}
                        >
                          Seat Reserved (Click to Cancel)
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-xs"
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          onClick={() => toggleRegistration(contest.id)}
                        >
                          Register Slot
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Past Rounds Archive */}
        <div className="pt-4 space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-300 font-semibold">
            Past Rounds Archive
          </h2>

          <div className="space-y-3">
            {CONTESTS_LIST.filter((c) => c.status === 'past').map((past) => (
              <div
                key={past.id}
                className="flex items-center justify-between p-4 rounded-xl bg-[#0F121A] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{past.title}</span>
                    <Badge variant="neutral" className="text-[10px] font-mono">
                      Archived
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono">{past.subtitle}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Link to="/leaderboard">
                    <Button variant="ghost" size="sm" className="text-xs text-neutral-400 hover:text-white">
                      Standings
                    </Button>
                  </Link>
                  <Link to="/problems">
                    <Button variant="secondary" size="sm" className="text-xs">
                      Practice Problems
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContestsView;
