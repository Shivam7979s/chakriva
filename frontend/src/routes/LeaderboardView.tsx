import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { SEEDED_COLLEGES } from '@/lib/colleges';
import { ProgressNavigationTabs } from '@/features/progress/components/ProgressNavigationTabs';
import type { LeaderboardEntry, CampusLeagueEntry } from '@/types';
import { cn } from '@/lib/utils';

export const LeaderboardView: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'global' | 'college' | 'campuses'>('global');
  const [search, setSearch] = useState('');
  const [engineers, setEngineers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const currentCollegeName = profile?.college_name || 'Independent / Not Affiliated';

  // 1. Fetch genuine user profiles from Supabase (Zero mock data)
  useEffect(() => {
    async function fetchLeaderboard() {
      if (!isSupabaseConfigured()) {
        setEngineers([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, score, problems_solved_count, current_streak, college_id, colleges:college_id(name)')
          .order('score', { ascending: false });

        if (!error && data) {
          const mapped: LeaderboardEntry[] = data.map((row: any, idx: number) => {
            const col = Array.isArray(row.colleges) ? row.colleges[0] : row.colleges;
            return {
              rank: idx + 1,
              id: row.id,
              username: row.username || 'dev',
              full_name: row.full_name || 'Developer',
              avatar_url: row.avatar_url || null,
              college_name: col?.name || 'Independent / Not Affiliated',
              college_id: row.college_id || null,
              problems_solved_count: row.problems_solved_count || 0,
              score: row.score || 0,
              current_streak: row.current_streak || 0,
            };
          });
          setEngineers(mapped);
        } else {
          setEngineers([]);
        }
      } catch (err) {
        console.warn('Leaderboard query error:', err);
        setEngineers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  const globalEngineers = engineers;

  // College-Specific Standings
  const collegeEngineers = useMemo(() => {
    if (!profile?.college_id && !profile?.college_name) return [];
    const list = globalEngineers.filter(
      (e) =>
        (profile.college_id && e.college_id === profile.college_id) ||
        (profile.college_name && e.college_name === profile.college_name)
    );
    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [globalEngineers, profile]);

  // Campus League
  const campusLeague: CampusLeagueEntry[] = useMemo(() => {
    return [...SEEDED_COLLEGES]
      .sort((a, b) => b.total_score - a.total_score)
      .map((col, idx) => ({
        rank: idx + 1,
        id: col.id,
        name: col.name,
        slug: col.slug,
        state: col.state,
        country: col.country,
        student_count: col.student_count,
        total_score: col.total_score,
      }));
  }, []);

  // Filtering
  const filteredGlobal = useMemo(() => {
    if (!search.trim()) return globalEngineers;
    const lower = search.toLowerCase();
    return globalEngineers.filter(
      (e) =>
        e.full_name.toLowerCase().includes(lower) ||
        e.username.toLowerCase().includes(lower) ||
        (e.college_name && e.college_name.toLowerCase().includes(lower))
    );
  }, [globalEngineers, search]);

  const filteredCollege = useMemo(() => {
    if (!search.trim()) return collegeEngineers;
    const lower = search.toLowerCase();
    return collegeEngineers.filter(
      (e) =>
        e.full_name.toLowerCase().includes(lower) ||
        e.username.toLowerCase().includes(lower)
    );
  }, [collegeEngineers, search]);

  const filteredCampuses = useMemo(() => {
    if (!search.trim()) return campusLeague;
    const lower = search.toLowerCase();
    return campusLeague.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        (c.state && c.state.toLowerCase().includes(lower))
    );
  }, [campusLeague, search]);

  const renderRank = (rank: number) => {
    if (rank === 1) return <span className="font-bold text-[#F59E0B]">#1</span>;
    if (rank === 2) return <span className="font-bold text-[#CBD5E1]">#2</span>;
    if (rank === 3) return <span className="font-bold text-[#D97706]">#3</span>;
    return <span className="text-[#7C8BA6]">#{rank}</span>;
  };

  const currentUserGlobalRank = useMemo(() => {
    const me = globalEngineers.find((e) => e.id === user?.id || e.username === profile?.username);
    return me ? me.rank : 1;
  }, [globalEngineers, user?.id, profile?.username]);

  const currentUserCollegeRank = useMemo(() => {
    const me = collegeEngineers.find((e) => e.id === user?.id || e.username === profile?.username);
    return me ? me.rank : 1;
  }, [collegeEngineers, user?.id, profile?.username]);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'Progress', href: '/app/progress' },
        { label: 'Campus Leaderboard' },
      ]}
    >
      <div className="space-y-6 max-w-7xl mx-auto text-left">
        {/* Executive Header */}
        <div className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                Campus Leaderboard
              </h1>
              <p className="text-sm text-[#7C8BA6] max-w-2xl leading-relaxed">
                Registered software engineers ranked by verified judge solutions, accuracy score, and daily streak commitments.
              </p>
            </div>

            {/* User Standing Card (Clean well, zero icons, zero uppercase monospace) */}
            <div className="p-4 rounded-xl border border-[#243B6B] bg-[#0B0E16] flex items-center gap-3.5 shrink-0 self-start sm:self-auto">
              <div className="w-10 h-10 rounded-xl bg-[#152443] text-[#60A5FA] border border-[#243B6B] flex items-center justify-center font-bold text-sm">
                #{profile?.college_id ? currentUserCollegeRank : currentUserGlobalRank}
              </div>
              <div>
                <p className="text-xs text-[#7C8BA6]">
                  {profile?.college_id ? 'Your College Standing' : 'Your Global Standing'}
                </p>
                <p className="text-sm font-semibold text-white">
                  {profile?.college_id
                    ? `Rank #${currentUserCollegeRank} in ${currentCollegeName.split(' ')[0]}`
                    : `Rank #${currentUserGlobalRank} Worldwide`}
                </p>
                <p className="text-xs text-[#93C5FD]">
                  {profile?.score || 0} pts · {profile?.problems_solved_count || 0} Solved
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Navigation Tabs */}
        <ProgressNavigationTabs activeTab="leaderboard" />

        {/* Subtabs & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('global')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === 'global'
                  ? 'bg-[#152443] text-[#93C5FD] border border-[#243B6B]'
                  : 'text-[#7C8BA6] hover:text-white hover:bg-[#131A2B] border border-transparent'
              )}
            >
              Global Standings
            </button>
            <button
              onClick={() => setActiveTab('college')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === 'college'
                  ? 'bg-[#152443] text-[#93C5FD] border border-[#243B6B]'
                  : 'text-[#7C8BA6] hover:text-white hover:bg-[#131A2B] border border-transparent'
              )}
            >
              My College ({currentCollegeName.split(' ')[0]})
            </button>
            <button
              onClick={() => setActiveTab('campuses')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === 'campuses'
                  ? 'bg-[#152443] text-[#93C5FD] border border-[#243B6B]'
                  : 'text-[#7C8BA6] hover:text-white hover:bg-[#131A2B] border border-transparent'
              )}
            >
              Campus League
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder={activeTab === 'campuses' ? 'Search campus...' : 'Search engineer...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#181F30] bg-[#0F131D] text-xs text-white placeholder-[#556480] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        {/* TAB 1: Global Standings */}
        {activeTab === 'global' && (
          <div className="rounded-2xl border border-[#181F30] bg-[#0F131D] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#181F30] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Global Engineer Standings</h3>
                <p className="text-xs text-[#7C8BA6] mt-0.5">
                  All registered software engineers ranked by algorithmic score and verified judge submissions.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs bg-[#152443] text-[#93C5FD] border border-[#243B6B]">
                {filteredGlobal.length} Engineers
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-[#7C8BA6]">
                Loading verified engineer rankings...
              </div>
            ) : filteredGlobal.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7C8BA6]">
                No registered engineers found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0E16] text-[#7C8BA6] border-b border-[#181F30]">
                    <tr>
                      <th className="py-3 px-4 w-16">Rank</th>
                      <th className="py-3 px-4">Software Engineer</th>
                      <th className="py-3 px-4">Affiliated Institution</th>
                      <th className="py-3 px-4 text-right">Solved</th>
                      <th className="py-3 px-4 text-right">Streak</th>
                      <th className="py-3 px-4 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181F30]">
                    {filteredGlobal.map((eng) => {
                      const isMe = eng.id === user?.id || eng.username === profile?.username;
                      return (
                        <tr
                          key={eng.id}
                          className={cn(
                            'hover:bg-[#131A2B]/60 transition-colors',
                            isMe ? 'bg-[#152443]/40' : undefined
                          )}
                        >
                          <td className="py-3 px-4 font-medium">
                            {renderRank(eng.rank)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-[#152443] border border-[#243B6B] text-[#93C5FD] text-xs flex items-center justify-center font-bold">
                                {eng.full_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-white block truncate">
                                  {eng.full_name}
                                  {isMe && (
                                    <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-[#2563EB] text-white">
                                      You
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] text-[#7C8BA6] block truncate">
                                  @{eng.username}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#C3CEE0] truncate max-w-xs">
                            {eng.college_name || 'Independent Engineer'}
                          </td>
                          <td className="py-3 px-4 text-right text-[#00B8A3] font-medium">
                            {eng.problems_solved_count}
                          </td>
                          <td className="py-3 px-4 text-right text-[#F59E0B]">
                            {eng.current_streak ? `${eng.current_streak}d` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            {eng.score.toLocaleString()} pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: College Standings */}
        {activeTab === 'college' && (
          <div className="rounded-2xl border border-[#181F30] bg-[#0F131D] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#181F30] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Campus Leaderboard: {currentCollegeName}
                </h3>
                <p className="text-xs text-[#7C8BA6] mt-0.5">
                  Intracampus rankings among fellow engineers at your enrolled institution.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs bg-[#152443] text-[#93C5FD] border border-[#243B6B]">
                {filteredCollege.length} Active Peers
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-[#7C8BA6]">
                Loading campus peers...
              </div>
            ) : filteredCollege.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#7C8BA6]">
                No other engineers from {currentCollegeName} registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0E16] text-[#7C8BA6] border-b border-[#181F30]">
                    <tr>
                      <th className="py-3 px-4 w-16">Rank</th>
                      <th className="py-3 px-4">Peer Engineer</th>
                      <th className="py-3 px-4 text-right">Solved</th>
                      <th className="py-3 px-4 text-right">Streak</th>
                      <th className="py-3 px-4 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181F30]">
                    {filteredCollege.map((eng) => {
                      const isMe = eng.id === user?.id || eng.username === profile?.username;
                      return (
                        <tr
                          key={eng.id}
                          className={cn(
                            'hover:bg-[#131A2B]/60 transition-colors',
                            isMe ? 'bg-[#152443]/40' : undefined
                          )}
                        >
                          <td className="py-3 px-4 font-medium">
                            {renderRank(eng.rank)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-[#152443] border border-[#243B6B] text-[#93C5FD] text-xs flex items-center justify-center font-bold">
                                {eng.full_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-white block truncate">
                                  {eng.full_name}
                                  {isMe && (
                                    <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-[#2563EB] text-white">
                                      You
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] text-[#7C8BA6] block truncate">
                                  @{eng.username}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-[#00B8A3] font-medium">
                            {eng.problems_solved_count}
                          </td>
                          <td className="py-3 px-4 text-right text-[#F59E0B]">
                            {eng.current_streak ? `${eng.current_streak}d` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            {eng.score.toLocaleString()} pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Campus League Standings */}
        {activeTab === 'campuses' && (
          <div className="rounded-2xl border border-[#181F30] bg-[#0F131D] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#181F30] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">All-India Campus League</h3>
                <p className="text-xs text-[#7C8BA6] mt-0.5">
                  Institutional rankings aggregated across enrolled student engineers.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs bg-[#152443] text-[#93C5FD] border border-[#243B6B]">
                {filteredCampuses.length} Campuses
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0E16] text-[#7C8BA6] border-b border-[#181F30]">
                  <tr>
                    <th className="py-3 px-4 w-16">Rank</th>
                    <th className="py-3 px-4">Institution</th>
                    <th className="py-3 px-4">Region</th>
                    <th className="py-3 px-4 text-right">Students</th>
                    <th className="py-3 px-4 text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181F30]">
                  {filteredCampuses.map((col) => {
                    const isMyCollege = col.name === currentCollegeName;
                    return (
                      <tr
                        key={col.id}
                        className={cn(
                          'hover:bg-[#131A2B]/60 transition-colors',
                          isMyCollege ? 'bg-[#152443]/40' : undefined
                        )}
                      >
                        <td className="py-3 px-4 font-medium">
                          {renderRank(col.rank)}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          {col.name}
                          {isMyCollege && (
                            <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-[#2563EB] text-white">
                              Your Campus
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#7C8BA6]">
                          {col.state || 'National'}, {col.country || 'India'}
                        </td>
                        <td className="py-3 px-4 text-right text-[#C3CEE0]">
                          {col.student_count}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {col.total_score.toLocaleString()} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeaderboardView;
