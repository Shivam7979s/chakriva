import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { SafeMarkdownRenderer } from '@/components/workspace/SafeMarkdownRenderer';
import { useAuth } from '@/hooks/useAuth';
import { useProblems } from '@/hooks/useProblems';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useUserTelemetry } from '@/hooks/useUserTelemetry';
import { adaptiveRoadmapService } from '@/features/roadmap/services/adaptiveRoadmapService';
import { learnProgressService } from '@/features/learn/services/learnProgressService';
import { LEARN_TRACKS } from '@/features/learn/data/learnCatalog';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { sendAiQuery, type AiAssistantRequest } from '@/services/aiAssistantService';
import { cn } from '@/lib/utils';
import {
  COACHING_MODES,
  GENERAL_FOCUS_ID,
  buildCoachStarters,
  buildFallbackMentorReply,
  buildFocusProblemOptions,
  buildFollowUpPrompts,
  deriveTopicFocusSignals,
  extractRoadmapFocus,
  formatVerdictLabel,
  type CoachingModeId,
} from '@/features/mentor/utils/mentorInsights';

interface MentorThreadMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modeId: CoachingModeId;
  modeLabel: string;
  hintStep?: number;
  codeLineCount?: number;
  language?: string;
}

interface SelectedProblemDetails {
  descriptionMarkdown?: string;
  constraintsMarkdown?: string;
  lastSubmission?: {
    sourceCode: string;
    language: string;
    verdict: string;
    runtimeMs?: number;
    createdAt: string;
  } | null;
}

const SESSIONS_STORAGE_PREFIX = 'chakriva_mentor_sessions_v1_';
const MAX_STORED_MESSAGES = 24;

function getSessionStorageKey(userId?: string): string {
  return `${SESSIONS_STORAGE_PREFIX}${userId || 'guest'}`;
}

function readStoredSessions(storageKey: string): Record<string, MentorThreadMessage[]> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MentorThreadMessage[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredSessions(
  storageKey: string,
  sessions: Record<string, MentorThreadMessage[]>
): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(sessions));
  } catch {
    // Ignore storage quota / privacy mode failures
  }
}

export const ChakrivaAiView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, preferredLanguage } = useAuth();
  const { problems } = useProblems();
  const { progressMap, revisionMap, toggleRevision } = useUserProgress();
  const {
    recentSubmissions,
    solvedCount,
    difficultyBreakdown,
    loading: telemetryLoading,
  } = useUserTelemetry();

  const sessionStorageKey = getSessionStorageKey(user?.id);
  const loadedStorageKeyRef = useRef<string>(sessionStorageKey);

  const [selectedFocusId, setSelectedFocusId] = useState<string>(GENERAL_FOCUS_ID);
  const [activeMode, setActiveMode] = useState<CoachingModeId>('hint');
  const [sessionsByFocus, setSessionsByFocus] = useState<Record<string, MentorThreadMessage[]>>(() =>
    readStoredSessions(sessionStorageKey)
  );
  const [inputText, setInputText] = useState('');
  const [showCodeDrawer, setShowCodeDrawer] = useState(false);
  const [snippetCode, setSnippetCode] = useState('');
  const [snippetLanguage, setSnippetLanguage] = useState<string>(
    preferredLanguage || 'python'
  );
  const [isSending, setIsSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [problemDetails, setProblemDetails] = useState<SelectedProblemDetails | null>(null);
  const [roadmapVersion, setRoadmapVersion] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const deepLinkAppliedRef = useRef<string>('');

  useEffect(() => {
    if (loadedStorageKeyRef.current !== sessionStorageKey) {
      loadedStorageKeyRef.current = sessionStorageKey;
      setSessionsByFocus(readStoredSessions(sessionStorageKey));
    }
  }, [sessionStorageKey]);

  useEffect(() => {
    writeStoredSessions(sessionStorageKey, sessionsByFocus);
  }, [sessionStorageKey, sessionsByFocus]);

  useEffect(() => {
    if (preferredLanguage) {
      setSnippetLanguage(preferredLanguage);
    }
  }, [preferredLanguage]);

  useEffect(() => {
    const bumpRoadmap = () => setRoadmapVersion((v) => v + 1);
    window.addEventListener('focus', bumpRoadmap);
    window.addEventListener('storage', bumpRoadmap);
    return () => {
      window.removeEventListener('focus', bumpRoadmap);
      window.removeEventListener('storage', bumpRoadmap);
    };
  }, []);

  const focusProblemOptions = useMemo(
    () => buildFocusProblemOptions(problems, progressMap, revisionMap, recentSubmissions, 40),
    [problems, progressMap, revisionMap, recentSubmissions]
  );

  useEffect(() => {
    const paramProblem = searchParams.get('problem');
    const paramTopic = searchParams.get('topic');
    const linkKey = `${paramProblem || ''}|${paramTopic || ''}`;
    if (!linkKey || linkKey === '|' || deepLinkAppliedRef.current === linkKey) return;

    if (paramProblem && problems.length > 0) {
      const normalized = paramProblem.trim().toLowerCase();
      const matched = problems.find(
        (p) =>
          p.slug.toLowerCase() === normalized ||
          p.id.toLowerCase() === normalized ||
          (p.verniq_id ? p.verniq_id.toLowerCase() === normalized : false)
      );
      if (matched) {
        deepLinkAppliedRef.current = linkKey;
        setSelectedFocusId(matched.id);
        return;
      }
    }

    if (paramTopic) {
      deepLinkAppliedRef.current = linkKey;
      setSelectedFocusId(GENERAL_FOCUS_ID);
      setInputText(
        `Let's debrief ${paramTopic.trim()}: walk me through the core loop invariant and common traps.`
      );
    }
  }, [searchParams, problems]);

  const selectedProblem = useMemo(() => {
    if (selectedFocusId === GENERAL_FOCUS_ID) return null;
    const fromRanked = focusProblemOptions.find((opt) => opt.id === selectedFocusId);
    if (fromRanked) return fromRanked;

    const fromCatalog = problems.find((p) => p.id === selectedFocusId);
    if (!fromCatalog) return null;
    return (
      buildFocusProblemOptions([fromCatalog], progressMap, revisionMap, recentSubmissions, 1)[0] ||
      null
    );
  }, [selectedFocusId, focusProblemOptions, problems, progressMap, revisionMap, recentSubmissions]);

  useEffect(() => {
    if (!selectedProblem) {
      setProblemDetails(null);
      return;
    }

    let cancelled = false;
    const problem = selectedProblem.problem;
    const baseDetails: SelectedProblemDetails = {
      descriptionMarkdown: problem.description_markdown || undefined,
      constraintsMarkdown: problem.constraints_markdown || undefined,
      lastSubmission: null,
    };

    if (!isSupabaseConfigured()) {
      setProblemDetails(baseDetails);
      return;
    }

    const loadProblemDetails = async () => {
      try {
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let desc = problem.description_markdown || undefined;
        let constraints = problem.constraints_markdown || undefined;
        let resolvedUuid = UUID_REGEX.test(problem.id) ? problem.id : '';

        if (!desc || !resolvedUuid) {
          const { data: pRow } = await supabase
            .from('problems')
            .select('id, description_markdown, constraints_markdown')
            .or(`id.eq.${problem.id},slug.eq.${problem.slug}`)
            .maybeSingle();

          if (pRow) {
            if (!desc && pRow.description_markdown) desc = pRow.description_markdown;
            if (!constraints && pRow.constraints_markdown) constraints = pRow.constraints_markdown;
            if (!resolvedUuid && pRow.id) resolvedUuid = pRow.id;
          }
        }

        let lastSubmission: SelectedProblemDetails['lastSubmission'] = null;
        if (user?.id && resolvedUuid) {
          const { data: subRow } = await supabase
            .from('submissions')
            .select('source_code, language, verdict, runtime_ms, created_at')
            .eq('user_id', user.id)
            .eq('problem_id', resolvedUuid)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (subRow?.source_code) {
            lastSubmission = {
              sourceCode: subRow.source_code,
              language: subRow.language || 'python',
              verdict: subRow.verdict || 'unknown',
              runtimeMs: subRow.runtime_ms ?? undefined,
              createdAt: subRow.created_at,
            };
          }
        }

        if (!cancelled) {
          setProblemDetails({
            descriptionMarkdown: desc,
            constraintsMarkdown: constraints,
            lastSubmission,
          });
        }
      } catch {
        if (!cancelled) {
          setProblemDetails(baseDetails);
        }
      }
    };

    loadProblemDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedProblem, user?.id]);

  const topicFocusSignals = useMemo(
    () => deriveTopicFocusSignals(problems, progressMap, revisionMap, recentSubmissions, 5),
    [problems, progressMap, revisionMap, recentSubmissions]
  );

  const roadmapFocus = useMemo(
    () => extractRoadmapFocus(adaptiveRoadmapService.getActiveRoadmap()),
    [roadmapVersion]
  );

  const learnSummary = useMemo(() => {
    const state = learnProgressService.getState();
    let completed = 0;
    let total = 0;
    for (const track of LEARN_TRACKS) {
      const stats = learnProgressService.getTrackCompletion(track, state);
      completed += stats.completed;
      total += stats.total;
    }
    return { completed, total };
  }, []);

  const attemptedFollowUpCount = useMemo(
    () => Object.values(progressMap).filter((status) => status === 'attempted').length,
    [progressMap]
  );

  const revisionCount = useMemo(
    () => Object.values(revisionMap).filter(Boolean).length,
    [revisionMap]
  );

  const activeModeConfig = useMemo(
    () => COACHING_MODES.find((m) => m.id === activeMode) || COACHING_MODES[0],
    [activeMode]
  );

  const activeMessages = useMemo(
    () => sessionsByFocus[selectedFocusId] || [],
    [sessionsByFocus, selectedFocusId]
  );

  const starters = useMemo(
    () => buildCoachStarters(selectedProblem, topicFocusSignals, activeMode, roadmapFocus),
    [selectedProblem, topicFocusSignals, activeMode, roadmapFocus]
  );

  const latestAssistantMsg = useMemo(() => {
    for (let i = activeMessages.length - 1; i >= 0; i -= 1) {
      if (activeMessages[i].sender === 'assistant') return activeMessages[i];
    }
    return null;
  }, [activeMessages]);

  const followUps = useMemo(
    () => buildFollowUpPrompts(selectedProblem?.title, latestAssistantMsg?.modeId || activeMode),
    [selectedProblem?.title, latestAssistantMsg?.modeId, activeMode]
  );

  const selectedInRevision = useMemo(() => {
    if (!selectedProblem) return false;
    const p = selectedProblem.problem;
    return Boolean(
      revisionMap[p.id] ||
        (p.verniq_id ? revisionMap[p.verniq_id] : false) ||
        revisionMap[p.slug]
    );
  }, [selectedProblem, revisionMap]);

  useEffect(() => {
    if (activeMessages.length > 0) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeMessages.length, isSending]);

  const handleSelectFocusContext = (nextId: string) => {
    setSelectedFocusId(nextId);
    const nextParams = new URLSearchParams(searchParams);
    if (nextId === GENERAL_FOCUS_ID) {
      nextParams.delete('problem');
    } else {
      const target = problems.find((p) => p.id === nextId);
      if (target?.slug) {
        nextParams.set('problem', target.slug);
      }
      nextParams.delete('topic');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const appendMessage = useCallback(
    (focusKey: string, msg: MentorThreadMessage) => {
      setSessionsByFocus((prev) => {
        const nextList = [...(prev[focusKey] || []), msg].slice(-MAX_STORED_MESSAGES);
        return {
          ...prev,
          [focusKey]: nextList,
        };
      });
    },
    []
  );

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSending(false);
  };

  const handleClearSession = () => {
    handleStopGeneration();
    setSessionsByFocus((prev) => {
      const next = { ...prev };
      delete next[selectedFocusId];
      return next;
    });
  };

  const handleLoadLastSubmission = () => {
    const sub = problemDetails?.lastSubmission;
    if (!sub?.sourceCode) return;
    setSnippetLanguage(sub.language || preferredLanguage || 'python');
    setSnippetCode(sub.sourceCode);
    setShowCodeDrawer(true);
    setActiveMode('review');
    if (!inputText.trim() && selectedProblem) {
      setInputText(
        `My latest attempt on "${selectedProblem.title}" got ${formatVerdictLabel(
          sub.verdict
        )}. Spot the concrete bug or asymptotic bottleneck in my code.`
      );
    }
    composerInputRef.current?.focus();
  };

  const handleCopyReply = async (msgId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgId(msgId);
      setTimeout(() => {
        setCopiedMsgId((prev) => (prev === msgId ? null : prev));
      }, 1800);
    } catch {
      // Clipboard blocked in non-HTTPS or denied permission
    }
  };

  const handleSendQuery = async (overridePrompt?: string, overrideModeId?: CoachingModeId) => {
    const rawQuery = (overridePrompt !== undefined ? overridePrompt : inputText).trim();
    if (!rawQuery || isSending) return;

    const effectiveModeId = overrideModeId || activeMode;
    if (overrideModeId && overrideModeId !== activeMode) {
      setActiveMode(overrideModeId);
    }

    const focusKey = selectedFocusId;
    const modeConfig =
      COACHING_MODES.find((m) => m.id === effectiveModeId) || activeModeConfig;
    const trimmedCode = showCodeDrawer ? snippetCode.trim() : '';
    const hasAttachedCode = trimmedCode.length > 0;
    const codeLineCount = hasAttachedCode ? trimmedCode.split('\n').length : undefined;

    const currentThread = sessionsByFocus[focusKey] || [];
    const priorHintMessages = currentThread
      .filter((m) => m.sender === 'assistant' && m.modeId === 'hint')
      .map((m) => m.content.slice(0, 240));
    const nextHintStep = modeConfig.id === 'hint' ? priorHintMessages.length + 1 : undefined;

    const userMessage: MentorThreadMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      content: rawQuery,
      timestamp: Date.now(),
      modeId: modeConfig.id,
      modeLabel: modeConfig.label,
      codeLineCount,
      language: hasAttachedCode ? snippetLanguage : undefined,
    };

    appendMessage(focusKey, userMessage);
    if (overridePrompt === undefined) {
      setInputText('');
    }
    setIsSending(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const problemCtx = selectedProblem?.problem;
    const historyPayload = currentThread.slice(-6).map((m) => ({
      role: m.sender,
      content: m.content,
    }));

    const requestPayload: AiAssistantRequest = {
      problemId: problemCtx?.id || GENERAL_FOCUS_ID,
      problemVerniqId: problemCtx?.verniq_id,
      problemTitle: problemCtx?.title || 'CHAKRIVA Algorithm & Engineering Mentor',
      problemDifficulty: problemCtx?.difficulty || 'General',
      problemStatement:
        problemDetails?.descriptionMarkdown || problemCtx?.description_markdown || undefined,
      constraints:
        problemDetails?.constraintsMarkdown || problemCtx?.constraints_markdown || undefined,
      language: hasAttachedCode ? snippetLanguage : undefined,
      code: hasAttachedCode ? trimmedCode : undefined,
      userMessage: rawQuery,
      mode: 'mentor',
      mentorAction:
        hasAttachedCode && modeConfig.id === 'review' ? 'clarify' : modeConfig.mentorAction,
      hintLevel: nextHintStep ? Math.min(nextHintStep, 10) : undefined,
      priorHints: modeConfig.id === 'hint' ? priorHintMessages : undefined,
      actionType: hasAttachedCode ? 'review' : modeConfig.actionType,
      history: historyPayload,
    };

    const res = await sendAiQuery(requestPayload, controller.signal);

    if (controller.signal.aborted) {
      setIsSending(false);
      return;
    }

    if (res.success && res.reply) {
      appendMessage(focusKey, {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        content: res.reply,
        timestamp: Date.now(),
        modeId: modeConfig.id,
        modeLabel: modeConfig.label,
        hintStep: nextHintStep,
      });
      setIsSending(false);
      return;
    }

    const fallbackContent = buildFallbackMentorReply(
      rawQuery,
      modeConfig.id,
      selectedProblem
        ? {
            title: selectedProblem.title,
            topic: selectedProblem.topic,
            difficulty: selectedProblem.difficulty,
          }
        : undefined,
      res.errorCode,
      nextHintStep
    );

    appendMessage(focusKey, {
      id: `a-${Date.now()}`,
      sender: 'assistant',
      content: fallbackContent,
      timestamp: Date.now(),
      modeId: modeConfig.id,
      modeLabel: modeConfig.label,
      hintStep: nextHintStep,
    });
    setIsSending(false);
  };

  const handleLoadTopicPrompt = (prompt: string, leadProblemSlug?: string) => {
    if (leadProblemSlug) {
      const match = focusProblemOptions.find((opt) => opt.slug === leadProblemSlug);
      if (match) {
        handleSelectFocusContext(match.id);
      }
    }
    setInputText(prompt);
    composerInputRef.current?.focus();
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[{ label: 'CHAKRIVA', href: '/app/home' }, { label: 'Mentor' }]}
    >
      <div className="max-w-7xl mx-auto space-y-6 text-left text-[#F3F6FF]">
        {/* Top Workspace Header Card */}
        <section className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-[#F8FAFF] tracking-tight">
                Engineering Mentor
              </h1>
              <p className="text-xs sm:text-sm text-[#8E9BB3] max-w-2xl leading-relaxed">
                Work through algorithmic invariants, debug bottlenecks, and get step-by-step hints
                grounded in your active problem history and roadmap.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5 mt-5 border-t border-[#171D2D]">
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs text-[#7C8BA6] block">Problems Solved</span>
                <span className="text-[11px] font-mono text-[#5B6882]">
                  {difficultyBreakdown.easy}E • {difficultyBreakdown.medium}M •{' '}
                  {difficultyBreakdown.hard}H
                </span>
              </div>
              <span className="text-sm font-mono font-semibold text-[#22D3EE] tabular-nums">
                {telemetryLoading ? '...' : solvedCount}
              </span>
            </div>

            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs text-[#7C8BA6] block">Attempted</span>
                <span className="text-[11px] text-[#5B6882]">Needs follow-up</span>
              </div>
              <span className="text-sm font-mono font-semibold text-[#F8FAFF] tabular-nums">
                {attemptedFollowUpCount}
              </span>
            </div>

            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs text-[#7C8BA6] block">Revision Queue</span>
                <span className="text-[11px] text-[#5B6882]">Saved for recall</span>
              </div>
              <span className="text-sm font-mono font-semibold text-[#93C5FD] tabular-nums">
                {revisionCount}
              </span>
            </div>

            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs text-[#7C8BA6] block">
                  {roadmapFocus ? 'Active Roadmap' : 'Learn Lessons'}
                </span>
                <span className="text-[11px] text-[#5B6882]">
                  {roadmapFocus
                    ? `${roadmapFocus.completedTasks}/${roadmapFocus.totalTasks} tasks`
                    : `${learnSummary.completed}/${learnSummary.total} completed`}
                </span>
              </div>
              <span className="text-sm font-mono font-semibold text-[#60A5FA] tabular-nums">
                {roadmapFocus
                  ? `${roadmapFocus.progressPercent}%`
                  : `${learnSummary.completed}`}
              </span>
            </div>
          </div>
        </section>

        {/* Main 2-Column Mentor Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Primary Column: Coaching Console */}
          <section className="lg:col-span-8 rounded-2xl border border-[#181F30] bg-[#0F131D] flex flex-col overflow-hidden">
            {/* Context & Mode Controls */}
            <div className="p-4 sm:p-5 border-b border-[#181F30] space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor="mentor-focus-context"
                    className="block text-xs font-medium text-[#8E9BB3] mb-1.5"
                  >
                    Problem or Topic
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <select
                      id="mentor-focus-context"
                      value={selectedFocusId}
                      onChange={(e) => handleSelectFocusContext(e.target.value)}
                      className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/50 rounded-xl px-3 py-2 text-xs text-[#E2E8F5] focus:outline-none transition-colors"
                    >
                      <option value={GENERAL_FOCUS_ID}>
                        General DSA, Invariants & System Design
                      </option>
                      {focusProblemOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          [{opt.signalLabel}] {opt.title} ({opt.difficulty})
                        </option>
                      ))}
                    </select>

                    {selectedProblem && (
                      <Link
                        to={`/problems/${selectedProblem.slug}`}
                        className="px-3 py-2 rounded-xl bg-[#0B0E16] border border-[#1B2234] hover:border-[#3B82F6]/40 text-xs font-medium text-[#93C5FD] whitespace-nowrap transition-colors"
                      >
                        Open Problem
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSession}
                      className="px-3 py-2 rounded-xl bg-[#0B0E16] border border-[#1B2234] hover:border-[#29344E] text-xs font-medium text-[#9BA8C2] hover:text-[#F8FAFF] transition-colors cursor-pointer"
                    >
                      New Session
                    </button>
                  )}
                </div>
              </div>

              {/* Selected Problem Context Strip */}
              {selectedProblem && (
                <div className="rounded-xl border border-[#171D2D] bg-[#0B0E16] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="capitalize font-medium text-[#22D3EE]">
                      {selectedProblem.difficulty}
                    </span>
                    <span className="text-[#475569]">•</span>
                    <span className="text-[#D5E1F7]">{selectedProblem.topic}</span>
                    <span className="text-[#475569]">•</span>
                    <span className="text-[#9BA8C2]">{selectedProblem.signalLabel}</span>
                    {problemDetails?.lastSubmission && (
                      <>
                        <span className="text-[#475569]">•</span>
                        <span className="text-[#93C5FD]">
                          Last: {formatVerdictLabel(problemDetails.lastSubmission.verdict)} (
                          {problemDetails.lastSubmission.language})
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {problemDetails?.lastSubmission && (
                      <button
                        type="button"
                        onClick={handleLoadLastSubmission}
                        className="px-2.5 py-1 rounded-lg bg-[#152443] border border-[#3B82F6]/35 hover:bg-[#1B2F56] text-[11px] font-medium text-[#E2E8F5] transition-colors cursor-pointer"
                      >
                        Load Last Attempt
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleRevision(selectedProblem.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer',
                        selectedInRevision
                          ? 'bg-[#10203A] border-[#22D3EE]/35 text-[#22D3EE]'
                          : 'bg-[#0F131D] border-[#1F273B] text-[#9BA8C2] hover:text-[#F8FAFF]'
                      )}
                    >
                      {selectedInRevision ? 'Queued for Revision' : 'Queue for Revision'}
                    </button>
                  </div>
                </div>
              )}

              {/* Coaching Mode Tabs */}
              <div className="space-y-1.5">
                <div
                  role="tablist"
                  aria-label="Coaching Mode"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {COACHING_MODES.map((mode) => {
                    const isActive = activeMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveMode(mode.id)}
                        className={cn(
                          'relative px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer',
                          isActive
                            ? 'text-[#F8FAFF]'
                            : 'text-[#7C8BA6] hover:text-[#D5E1F7]'
                        )}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="mentorCoachingModePill"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            className="absolute inset-0 rounded-xl bg-[#152443] border border-[#3B82F6]/35"
                          />
                        )}
                        <span className="relative z-10">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-[#7C8BA6]">
                  {activeModeConfig.tagline}
                  {selectedProblem ? ` Context pinned to "${selectedProblem.title}".` : ''}
                </p>
              </div>
            </div>

            {/* Thread Canvas */}
            <div className="min-h-[360px] max-h-[540px] overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#0B0E16]/50">
              {activeMessages.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#181F30] bg-[#0F131D] p-4 sm:p-5 space-y-1.5">
                    <h2 className="text-sm sm:text-base font-semibold text-[#F8FAFF]">
                      {selectedProblem
                        ? `Debriefing "${selectedProblem.title}"`
                        : 'Ask Riva about an invariant, bottleneck, or approach'}
                    </h2>
                    <p className="text-xs text-[#9BA8C2] leading-relaxed">
                      {!user
                        ? 'Sign in to sync problem submissions and consult live Riva AI; Socratic invariant guidance works right away.'
                        : 'Riva guides you with progressive hints, state invariants, and complexity checks instead of spoiling full solutions.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-[#8E9BB3]">
                      Suggested questions
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {starters.map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => handleSendQuery(starter)}
                          className="text-left rounded-xl border border-[#181F30] bg-[#0B0E16] hover:bg-[#111827] hover:border-[#3B82F6]/40 px-4 py-3 text-xs text-[#D5E1F7] transition-colors cursor-pointer"
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {activeMessages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'rounded-xl border p-3.5 sm:p-4',
                          isUser
                            ? 'bg-[#121D34]/65 border-[#253A63] ml-4 sm:ml-10'
                            : 'bg-[#0F131D] border-[#181F30] mr-2 sm:mr-6'
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'text-xs font-semibold',
                                isUser ? 'text-[#93C5FD]' : 'text-[#22D3EE]'
                              )}
                            >
                              {isUser ? 'You' : 'Riva'}
                            </span>
                            <span className="text-[11px] text-[#64748B]">
                              • {msg.modeLabel}
                              {msg.hintStep ? ` #${msg.hintStep}` : ''}
                            </span>
                            {msg.codeLineCount ? (
                              <span className="px-2 py-0.5 rounded-md bg-[#0B0E16] border border-[#1F273B] text-[11px] font-mono text-[#9BA8C2]">
                                {msg.codeLineCount} lines ({msg.language})
                              </span>
                            ) : null}
                          </div>

                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => handleCopyReply(msg.id, msg.content)}
                              className="text-[11px] text-[#7C8BA6] hover:text-[#F8FAFF] transition-colors cursor-pointer"
                            >
                              {copiedMsgId === msg.id ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>

                        {isUser ? (
                          <p className="text-xs sm:text-sm text-[#F8FAFF] whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>
                        ) : (
                          <div className="text-xs sm:text-sm text-[#D5E1F7] leading-relaxed">
                            <SafeMarkdownRenderer content={msg.content} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!isSending && latestAssistantMsg && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-[#64748B] mr-1">Follow up:</span>
                      {followUps.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleSendQuery(item.prompt, item.modeId)}
                          className="px-2.5 py-1 rounded-lg border border-[#1B2234] bg-[#0F131D] hover:border-[#3B82F6]/45 text-[11px] font-medium text-[#D5E1F7] transition-colors cursor-pointer"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {isSending && (
                    <div className="rounded-xl border border-[#181F30] bg-[#0F131D] p-3.5 mr-6">
                      <span className="text-xs text-[#60A5FA]">
                        Analyzing invariants and constraints...
                      </span>
                    </div>
                  )}
                  <div ref={threadEndRef} />
                </div>
              )}
            </div>

            {/* Composer Dock */}
            <div className="p-4 sm:p-5 border-t border-[#181F30] bg-[#0F131D] space-y-3">
              {showCodeDrawer && (
                <div className="rounded-xl border border-[#1B2234] bg-[#0B0E16] p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#8E9BB3]">
                      Code Snippet
                    </span>
                    <div className="flex items-center gap-2">
                      {problemDetails?.lastSubmission && (
                        <button
                          type="button"
                          onClick={handleLoadLastSubmission}
                          className="px-2 py-1 rounded-lg bg-[#152443] border border-[#3B82F6]/35 text-[11px] font-medium text-[#93C5FD] cursor-pointer"
                        >
                          Load Last Attempt ({formatVerdictLabel(problemDetails.lastSubmission.verdict)})
                        </button>
                      )}
                      <select
                        aria-label="Snippet Language"
                        value={snippetLanguage}
                        onChange={(e) => setSnippetLanguage(e.target.value)}
                        className="bg-[#0F131D] border border-[#1F273B] rounded-lg px-2 py-1 text-[11px] font-mono text-[#D5E1F7] focus:outline-none"
                      >
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                        <option value="typescript">TypeScript</option>
                        <option value="go">Go</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setSnippetCode('');
                          setShowCodeDrawer(false);
                        }}
                        className="text-xs text-[#7C8BA6] hover:text-[#F8FAFF] cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={5}
                    value={snippetCode}
                    onChange={(e) => setSnippetCode(e.target.value)}
                    placeholder="Paste your current attempt or failing helper function for targeted debugging..."
                    className="w-full bg-[#0F131D] border border-[#1B2234] focus:border-[#3B82F6]/50 rounded-lg p-2.5 text-xs font-mono text-[#E2E8F5] placeholder-[#5B6882] focus:outline-none resize-y"
                  />
                </div>
              )}

              <textarea
                ref={composerInputRef}
                id="mentor-prompt-input"
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={
                  selectedProblem
                    ? `Ask about invariants, edge cases, or complexity for ${selectedProblem.title}...`
                    : 'Ask about an invariant, complexity bottleneck, or algorithmic pattern...'
                }
                className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#E2E8F5] placeholder-[#5B6882] focus:outline-none resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCodeDrawer((prev) => !prev)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer',
                      showCodeDrawer
                        ? 'bg-[#152443] border-[#3B82F6]/40 text-[#93C5FD]'
                        : 'bg-[#0B0E16] border-[#1B2234] text-[#9BA8C2] hover:text-[#F8FAFF]'
                    )}
                  >
                    {showCodeDrawer
                      ? snippetCode.trim()
                        ? `Code Attached (${snippetCode.trim().split('\n').length} lines)`
                        : 'Hide Code Box'
                      : 'Attach Code Snippet'}
                  </button>
                  <span className="hidden sm:inline text-xs text-[#5B6882]">
                    Enter to send • Shift+Enter for newline
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isSending ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="px-4 py-2 rounded-xl border border-[#29344E] bg-[#0B0E16] hover:bg-[#141A29] text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!inputText.trim()}
                      onClick={() => handleSendQuery()}
                      className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-45 disabled:hover:bg-[#2563EB] text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      Ask Mentor
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Right Rail: Context & Next Actions (Clean Typography, Zero Icons) */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Focus Topics */}
            <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[#F8FAFF]">Focus Topics</h2>

              {topicFocusSignals.length > 0 ? (
                <div className="space-y-2">
                  {topicFocusSignals.map((signal) => (
                    <button
                      key={signal.topic}
                      type="button"
                      onClick={() =>
                        handleLoadTopicPrompt(signal.suggestedPrompt, signal.leadProblemSlug)
                      }
                      className="w-full text-left rounded-xl border border-[#181F30] bg-[#0B0E16] hover:bg-[#12192A] hover:border-[#3B82F6]/40 p-3.5 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#F8FAFF]">
                          {signal.topic}
                        </span>
                        <span className="text-[11px] font-mono text-[#22D3EE] tabular-nums">
                          {[
                            signal.attemptedCount > 0 ? `${signal.attemptedCount} attempted` : null,
                            signal.revisionCount > 0 ? `${signal.revisionCount} revision` : null,
                            signal.nonAcceptedCount > 0 ? `${signal.nonAcceptedCount} misses` : null,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </span>
                      </div>
                      {signal.leadProblemTitle && (
                        <p className="text-[11px] text-[#7C8BA6] truncate">
                          {signal.leadProblemTitle}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-[#171D2D] bg-[#0B0E16] p-4 space-y-3">
                  <p className="text-xs text-[#9BA8C2] leading-relaxed">
                    Attempted problems and revision items will appear here automatically. Pick a
                    core pattern below to start a quick check-in.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Arrays & Hashing', 'Sliding Window', 'Binary Search'].map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() =>
                          handleLoadTopicPrompt(
                            `Test my understanding of the core loop invariant in ${topic}.`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-[#1F273B] bg-[#0F131D] hover:border-[#3B82F6]/40 text-xs font-medium text-[#D5E1F7] transition-colors cursor-pointer"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Active Roadmap */}
            <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#F8FAFF]">Roadmap Focus</h2>
                {roadmapFocus && (
                  <span className="text-xs font-mono font-semibold text-[#22D3EE] tabular-nums">
                    {roadmapFocus.progressPercent}%
                  </span>
                )}
              </div>

              {roadmapFocus ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-[#171D2D] bg-[#0B0E16] p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#F8FAFF] truncate">
                        {roadmapFocus.roadmapTitle}
                      </span>
                      <span className="text-[11px] capitalize text-[#7C8BA6] shrink-0">
                        {roadmapFocus.goalLabel}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#171D2D] overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB] rounded-full transition-all"
                        style={{ width: `${Math.min(100, roadmapFocus.progressPercent)}%` }}
                      />
                    </div>
                    {roadmapFocus.nextTask && (
                      <p className="text-[11px] text-[#9BA8C2] leading-relaxed">
                        Next due:{' '}
                        <span className="text-[#E2E8F5]">{roadmapFocus.nextTask.title}</span> (
                        {roadmapFocus.nextTask.topic})
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {roadmapFocus.nextTask && (
                      <button
                        type="button"
                        onClick={() =>
                          handleLoadTopicPrompt(
                            `Coach me through my next roadmap milestone: "${roadmapFocus.nextTask?.title}" (${roadmapFocus.nextTask?.topic}).`,
                            roadmapFocus.nextTask?.problemSlug
                          )
                        }
                        className="flex-1 px-3 py-2 rounded-xl bg-[#152443] border border-[#3B82F6]/35 hover:bg-[#1B2F56] text-xs font-medium text-[#F8FAFF] transition-colors cursor-pointer"
                      >
                        Coach Next Task
                      </button>
                    )}
                    <Link
                      to="/app/roadmap"
                      className="px-3 py-2 rounded-xl border border-[#212B42] bg-[#0B0E16] hover:border-[#3B82F6]/40 text-xs font-medium text-[#D5E1F7] transition-colors"
                    >
                      Open Plan
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[#171D2D] bg-[#0B0E16] p-4 space-y-3">
                  <p className="text-xs text-[#9BA8C2] leading-relaxed">
                    No active adaptive roadmap saved yet. Build a study plan to sync milestones
                    here.
                  </p>
                  <Link
                    to="/app/roadmap"
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors"
                  >
                    Build Adaptive Roadmap
                  </Link>
                </div>
              )}
            </section>

            {/* Practice & Study Tools */}
            <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[#F8FAFF]">Practice & Study Tools</h2>

              <div className="space-y-2">
                <Link
                  to="/app/diagnostic"
                  className="block rounded-xl border border-[#181F30] bg-[#0B0E16] hover:bg-[#12192A] hover:border-[#3B82F6]/40 p-3.5 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F8FAFF]">
                      Diagnostic Quiz
                    </span>
                    <span className="text-[11px] font-mono text-[#60A5FA]">Start</span>
                  </div>
                  <p className="text-[11px] text-[#7C8BA6] leading-relaxed">
                    Test loop invariants and complexity proofs under timed pressure.
                  </p>
                </Link>

                <Link
                  to="/app/revision"
                  className="block rounded-xl border border-[#181F30] bg-[#0B0E16] hover:bg-[#12192A] hover:border-[#3B82F6]/40 p-3.5 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F8FAFF]">
                      Revision Queue
                    </span>
                    <span className="text-[11px] font-mono text-[#22D3EE] tabular-nums">
                      {revisionCount} due
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7C8BA6] leading-relaxed">
                    Review key pattern invariants for bookmarked problems.
                  </p>
                </Link>

                <Link
                  to="/app/learn"
                  className="block rounded-xl border border-[#181F30] bg-[#0B0E16] hover:bg-[#12192A] hover:border-[#3B82F6]/40 p-3.5 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F8FAFF]">
                      Learn Studio
                    </span>
                    <span className="text-[11px] font-mono text-[#93C5FD] tabular-nums">
                      {learnSummary.completed}/{learnSummary.total}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7C8BA6] leading-relaxed">
                    Study DSA patterns, System Design, OS, and DBMS tracks.
                  </p>
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};
