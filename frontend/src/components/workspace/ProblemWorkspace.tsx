import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SplitPane } from './SplitPane';
import { TestCaseConsole, type TestCaseItem, type ExecutionVerdict } from './TestCaseConsole';
import { SafeMarkdownRenderer, decodeHtmlEntities } from './SafeMarkdownRenderer';
import { ProblemNotesTab } from './ProblemNotesTab';
import { DifficultyBadge } from '@/components/learning/DifficultyBadge';
import { Badge } from '@/components/ui/data/Badge';
import { useProblemBySlug } from '@/hooks/useProblemBySlug';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useAuth } from '@/hooks/useAuth';
import { useAppLayout } from '@/components/ui/layout/AppLayout';
import {
  ChevronLeft,
  ArrowLeft,
  RotateCcw,
  Copy,
  Check,
  FileCode,
  History,
  BookOpen,
  Timer as TimerIcon,
  Play,
  Pause,
  RefreshCw,
  Lightbulb,
  Star,
  AlertTriangle,
  Maximize2,
  Minimize2,
  StickyNote,
  Terminal,
  Code2,
  ChevronDown,
  CheckCircle2,
  Circle,
  ListTodo,
} from 'lucide-react';
import { adaptiveRoadmapService } from '@/features/roadmap';
import { MonacoCodeEditor } from '@/components/editor/MonacoCodeEditor';
import { ChakrivaAiDrawer } from './ai/ChakrivaAiDrawer';
import { RivaAvatar } from './ai/RivaAvatar';

import { runCode, submitSolution, cancelExecution, mapDtoToSubmission } from '@/lib/submissionService';
import { apiClient, ApiClientError } from '@/lib/apiClient';
import { syncAcceptedSubmissionToSprintAndDiagnostics } from '@/lib/telemetryFeedback';
import { useSubmissionRealtime } from '@/hooks/useSubmissionRealtime';
import { useAutosave } from '@/hooks/useAutosave';
import { getLocalDraft, fetchRemoteDraft } from '@/lib/draftService';
import { ProgrammingLanguage, Submission, ExecutionTelemetry, FailedTestCaseInfo } from '@/types';

const DEFAULT_TEMPLATES: Record<string, string> = {
  cpp: `#include <vector>\n\nclass Solution {\npublic:\n    // Implement your solution\n};`,
  python: `class Solution:\n    # Implement your solution\n    pass`,
  java: `class Solution {\n    // Implement your solution\n}`,
  typescript: `function solution() {\n    // Implement your solution\n}`,
  go: `package main\n\n// Implement your solution\nfunc solve() {\n}`,
};

export const ProblemWorkspace: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const activeSlug = slug || 'two-sum';

  const [searchParams] = useSearchParams();
  const fromRoadmap = searchParams.get('fromRoadmap');

  const { problem, testCases: sampleTestCases, canonicalTestCount, loading } = useProblemBySlug(activeSlug);
  const { progressMap, revisionMap, updateProgress, toggleRevision, refreshProgress } = useUserProgress();
  const { user, preferredLanguage, updatePreferredLanguage } = useAuth();
  const { setDisableMainScroll } = useAppLayout();

  // Ensure workspace owns its own viewport scroll containment
  useEffect(() => {
    setDisableMainScroll(true);
    return () => setDisableMainScroll(false);
  }, [setDisableMainScroll]);

  const [language, setLanguage] = useState<string>(preferredLanguage || 'java');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isPlanMenuOpen, setIsPlanMenuOpen] = useState<boolean>(false);
  const planMenuRef = useRef<HTMLDivElement>(null);

  const todayPlanTasks = React.useMemo(() => {
    const plan = adaptiveRoadmapService.getActiveRoadmap();
    if (!plan) return [];
    const synced = adaptiveRoadmapService.syncWithProgressMap(plan, progressMap);
    const todayIso = new Date().toISOString().split('T')[0];
    for (const w of synced.weeks) {
      const found = w.days.find((d) => d.date === todayIso);
      if (found && found.tasks.length > 0) return found.tasks;
    }
    const firstActive = synced.weeks[0]?.days.find((d) => !d.isRestDay && d.tasks.length > 0);
    return firstActive?.tasks || [];
  }, [progressMap]);

  useEffect(() => {
    if (!isPlanMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (planMenuRef.current && !planMenuRef.current.contains(e.target as Node)) {
        setIsPlanMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isPlanMenuOpen]);

  // Keyboard shortcut Ctrl+I / Cmd+I for Riva AI Companion
  useEffect(() => {
    const handleWorkspaceKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsAiDrawerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleWorkspaceKey);
    return () => window.removeEventListener('keydown', handleWorkspaceKey);
  }, []);

  // Relayout editor when AI drawer opens or closes
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    return () => clearTimeout(timer);
  }, [isAiDrawerOpen]);

  const [code, setCode] = useState<string>('');
  const [leftTab, setLeftTab] = useState<'description' | 'editorial' | 'solutions' | 'submissions' | 'notes'>('description');
  const [mobileView, setMobileView] = useState<'problem' | 'code' | 'console'>('problem');
  const [isEditorExpanded, setIsEditorExpanded] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Execution state
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<Submission[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [selectedHistorySub, setSelectedHistorySub] = useState<Submission | null>(null);
  const [submittingState, setSubmittingState] = useState<'idle' | 'submitting' | 'queued' | 'judging' | 'completed' | 'error'>('idle');
  const [submissionRequestId, setSubmissionRequestId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<ExecutionVerdict>('idle');
  const [executionMode, setExecutionMode] = useState<'run' | 'submit' | null>(null);
  const [runtimeMs, setRuntimeMs] = useState<number>(0);
  const [memoryMb, setMemoryMb] = useState<number>(0);
  const [testCasesPassed, setTestCasesPassed] = useState<number>(0);
  const [totalTestCases, setTotalTestCases] = useState<number>(0);
  const [stdoutLogs, setStdoutLogs] = useState<string>('');
  const [stderrLogs, setStderrLogs] = useState<string>('');
  const [compileOutput, setCompileOutput] = useState<string>('');
  const [telemetry, setTelemetry] = useState<ExecutionTelemetry | null>(null);
  const [firstFailedTest, setFirstFailedTest] = useState<FailedTestCaseInfo | null>(null);
  const [sampleTestOutputs, setSampleTestOutputs] = useState<Record<number, { actualOutput?: string; verdict?: 'ac' | 'wa' }>>({});

  // Live Supabase Realtime verdict updates
  const { submission: liveSubmission, isRunning, isPending } = useSubmissionRealtime(activeSubmissionId);

  useEffect(() => {
    if (liveSubmission) {
      setVerdict(liveSubmission.verdict);
      if (liveSubmission.is_custom_run !== undefined) {
        setExecutionMode(liveSubmission.is_custom_run ? 'run' : 'submit');
      }
      if (liveSubmission.runtime_ms) setRuntimeMs(liveSubmission.runtime_ms);
      if (liveSubmission.memory_kb) setMemoryMb(liveSubmission.memory_kb / 1024);
      if (liveSubmission.stdout_output) setStdoutLogs(liveSubmission.stdout_output);
      if (liveSubmission.stderr_output) setStderrLogs(liveSubmission.stderr_output);
      if (liveSubmission.compile_output) setCompileOutput(liveSubmission.compile_output);
      if (liveSubmission.test_cases_passed !== undefined) setTestCasesPassed(liveSubmission.test_cases_passed);
      if (liveSubmission.total_test_cases !== undefined) setTotalTestCases(liveSubmission.total_test_cases);
      if (liveSubmission.telemetry) setTelemetry(liveSubmission.telemetry);
      if (liveSubmission.first_failed_test || liveSubmission.firstFailedTest) {
        setFirstFailedTest(liveSubmission.first_failed_test || liveSubmission.firstFailedTest || null);
      }

      // On official accepted submission, notify user progress and mutate sprint tasks + diagnostics
      if (liveSubmission.verdict === 'accepted' && !liveSubmission.is_custom_run && problem) {
        updateProgress(problem.id, 'solved');
        if (user) {
          syncAcceptedSubmissionToSprintAndDiagnostics(user.id, problem.id, problem.difficulty);
        }
      }

      // Record to history if terminal verdict reached
      if (liveSubmission.verdict !== 'pending' && liveSubmission.verdict !== 'running') {
        setSubmissionHistory((prev) => {
          if (prev.some((s) => s.id === liveSubmission.id)) {
            return prev.map((s) => (s.id === liveSubmission.id ? liveSubmission : s));
          }
          return [liveSubmission, ...prev];
        });
      }
    }
  }, [liveSubmission, problem, updateProgress, user]);

  // Load real submission history from Spring Boot API
  const fetchSubmissionHistory = useCallback(async () => {
    if (!problem) return;
    setHistoryLoading(true);
    try {
      const targetId = problem.verniq_id || problem.slug || problem.id;
      const resp = await apiClient.listUserSubmissions({ problemId: targetId });
      if (resp && resp.content) {
        const mappedList = resp.content.map((dto) => mapDtoToSubmission(dto));
        setSubmissionHistory(mappedList);
      }
    } catch (err) {
      console.warn('Could not fetch user submission history from Spring Boot API:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [problem]);

  useEffect(() => {
    if (leftTab === 'submissions') {
      fetchSubmissionHistory();
    }
  }, [leftTab, fetchSubmissionHistory]);

  // Stopwatch state
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(true);

  // Autosave hook
  const {
    saveStatus,
    onCodeChange,
    flushSave,
    initCode,
    resetDraft,
    retrySave,
  } = useAutosave({
    userId: user?.id,
    problemId: problem?.id,
    language,
    debounceMs: 800,
  });

  // Track loaded session to guarantee user code is never overwritten by starter code during rerenders/remounts
  const loadedSessionRef = useRef<{ problemId?: string; language?: string }>({});

  // Load saved draft or starter template when problem or language changes
  useEffect(() => {
    if (!problem?.id) return;

    // Guard: If this exact problem and language session is already loaded, do NOT overwrite it!
    if (
      loadedSessionRef.current.problemId === problem.id &&
      loadedSessionRef.current.language === language
    ) {
      return;
    }

    let isCancelled = false;

    // 1. Instant synchronous restoration from local storage
    const localDraft = getLocalDraft(user?.id, problem.id, language);
    const starterTemplate =
      problem.starter_templates?.[language] ||
      DEFAULT_TEMPLATES[language] ||
      '// Write code here';

    const initialCode = localDraft !== null ? localDraft : starterTemplate;
    loadedSessionRef.current = { problemId: problem.id, language };
    setCode(initialCode);
    initCode(initialCode);

    // 2. Asynchronous remote check if user is authenticated and localDraft wasn't found
    if (user?.id && localDraft === null) {
      fetchRemoteDraft(user.id, problem.id, language).then((remoteCode) => {
        if (
          !isCancelled &&
          remoteCode !== null &&
          loadedSessionRef.current.problemId === problem.id &&
          loadedSessionRef.current.language === language
        ) {
          setCode(remoteCode);
          initCode(remoteCode);
        }
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [problem?.id, language, user?.id, initCode]);

  // Set default custom input when test cases load
  useEffect(() => {
    if (sampleTestCases && sampleTestCases.length > 0 && !customInput) {
      setCustomInput(sampleTestCases[0].input);
    }
  }, [sampleTestCases, customInput]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleLanguageChange = (lang: string) => {
    if (lang === language) return;
    flushSave();

    const nextDraft = problem?.id ? getLocalDraft(user?.id, problem.id, lang) : null;
    const nextTemplate =
      problem?.starter_templates?.[lang] ||
      DEFAULT_TEMPLATES[lang] ||
      '// Write code here';
    const nextCode = nextDraft !== null ? nextDraft : nextTemplate;

    if (problem?.id) {
      loadedSessionRef.current = { problemId: problem.id, language: lang };
    }
    setCode(nextCode);
    initCode(nextCode);
    setLanguage(lang);
    updatePreferredLanguage(lang);
  };

  // Run code against sample visible test cases (fast ephemeral feedback)
  const handleRunCode = async () => {
    if (verdict === 'running') return;

    // Quarantined draft catalog check
    if (!problem?.is_published || problem?.workflow_status === 'draft') {
      setVerdict('cancelled');
      setStdoutLogs(
        `[CATALOG INDEX RECORD — DRAFT / CONTENT REVIEW]\n\n` +
        `Execution Sandbox Quarantined:\n` +
        `This record (${problem?.verniq_id ? problem.verniq_id.replace(/^VRQ-/, 'CKR-') : 'CKR-INDEX'}) is indexed in the Chakriva catalog but has not yet passed formal content review.\n` +
        `Verified test cases, constraints, and sandbox execution are enabled only for published problems.`
      );
      return;
    }

    setExecutionMode('run');
    setVerdict('running');
    setStdoutLogs('Compiling solution in isolated sandbox...\nVerifying visible test vectors...');
    setStderrLogs('');
    setCompileOutput('');
    setTelemetry(null);
    setFirstFailedTest(null);
    setSampleTestOutputs({});

    const visibleCases = sampleTestCases && sampleTestCases.length > 0
      ? sampleTestCases.map((tc) => ({ input: tc.input, expected_output: tc.expected_output, is_sample: true }))
      : undefined;

    const targetProblemId = problem?.verniq_id || problem?.slug || problem?.id || 'VRQ-000001';
    const res = await runCode(
      code,
      language as ProgrammingLanguage,
      customInput || '',
      visibleCases,
      undefined,
      targetProblemId,
      (interimSub) => {
        setActiveSubmissionId(interimSub.id);
        setVerdict(interimSub.verdict);
        if (interimSub.verdict === 'pending') {
          setStdoutLogs('Run submission enqueued in Redis. Waiting for isolated judge worker...');
        } else if (interimSub.verdict === 'running') {
          setStdoutLogs('Executing visible sample test cases in isolated sandbox...');
        }
      }
    );

    if (res.submissionId) {
      setActiveSubmissionId(res.submissionId);
    }

    if (res.submission) {
      setVerdict(res.submission.verdict);
      setRuntimeMs(res.submission.runtime_ms);
      setMemoryMb(res.submission.memory_kb / 1024);
      setStdoutLogs(res.submission.stdout_output || '');
      setStderrLogs(res.submission.stderr_output || '');
      setCompileOutput(res.submission.compile_output || '');
      setTestCasesPassed(res.submission.test_cases_passed);
      setTotalTestCases(res.submission.total_test_cases);
      if (res.submission.telemetry) {
        setTelemetry(res.submission.telemetry);
      }
      const failed = res.submission.first_failed_test || res.submission.firstFailedTest || null;
      setFirstFailedTest(failed);
      if (res.submission.sample_test_results) {
        const map: Record<number, { actualOutput?: string; verdict?: 'ac' | 'wa' }> = {};
        res.submission.sample_test_results.forEach((st) => {
          map[st.test_number] = {
            actualOutput: st.actual_output || '',
            verdict: st.passed ? 'ac' : 'wa',
          };
        });
        setSampleTestOutputs(map);
      }
    }
  };

  // Submit code against all hidden test cases (canonical evaluation via Spring Boot)
  const handleSubmitCode = async () => {
    if (!problem || submittingState === 'submitting' || submittingState === 'queued' || submittingState === 'judging') return;

    // Quarantined draft catalog check
    if (!problem.is_published || problem.workflow_status === 'draft') {
      setVerdict('cancelled');
      setStdoutLogs(
        `[CATALOG INDEX RECORD — DRAFT / CONTENT REVIEW]\n\n` +
        `Execution Sandbox Quarantined:\n` +
        `This record (${problem.verniq_id ? problem.verniq_id.replace(/^VRQ-/, 'CKR-') : 'CKR-INDEX'}) is indexed in the Chakriva catalog but has not yet passed formal content review.\n` +
        `Verified test cases, constraints, and sandbox execution are enabled only for published problems.`
      );
      return;
    }

    setExecutionMode('submit');
    setSubmittingState('submitting');
    setVerdict('pending');
    setSubmissionRequestId(null);
    setStdoutLogs('Creating official submission record and dispatching to Spring Boot...');
    setStderrLogs('');
    setCompileOutput('');
    setTelemetry(null);
    setFirstFailedTest(null);

    const targetProblemId = problem.verniq_id || problem.slug || problem.id;

    try {
      const res = await submitSolution(
        targetProblemId,
        code,
        language as ProgrammingLanguage,
        user?.id,
        undefined,
        undefined,
        canonicalTestCount,
        (interimSub) => {
          setActiveSubmissionId(interimSub.id);
          setVerdict(interimSub.verdict);
          if (interimSub.verdict === 'pending') {
            setSubmittingState('queued');
            setStdoutLogs('Submission enqueued in Redis. Waiting for isolated judge worker...');
          } else if (interimSub.verdict === 'running') {
            setSubmittingState('judging');
            setStdoutLogs('Judge worker executing canonical test suite inside isolated sandbox...');
          } else {
            setSubmittingState('completed');
          }
        }
      );

      const finalSub = res.submission;
      if (finalSub) {
        setSubmittingState('completed');
        setActiveSubmissionId(finalSub.id);
        setVerdict(finalSub.verdict);
        setRuntimeMs(finalSub.runtime_ms);
        setMemoryMb(finalSub.memory_kb / 1024);
        setStdoutLogs(finalSub.stdout_output || '');
        setStderrLogs(finalSub.stderr_output || '');
        setCompileOutput(finalSub.compile_output || '');
        setTestCasesPassed(finalSub.test_cases_passed);
        setTotalTestCases(finalSub.total_test_cases);
        setFirstFailedTest(finalSub.first_failed_test || finalSub.firstFailedTest || null);

        // Prepend to submission history
        setSubmissionHistory((prev) => [finalSub, ...prev.filter((s) => s.id !== finalSub.id)]);

        // Refresh server-authoritative progress from Spring Boot control plane
        refreshProgress();

        if (finalSub.verdict === 'accepted') {
          updateProgress(problem.id, 'solved');
          if (user) {
            syncAcceptedSubmissionToSprintAndDiagnostics(user.id, problem.id, problem.difficulty);
          }
        }
      }
    } catch (err: unknown) {
      setSubmittingState('error');
      const apiErr = err instanceof ApiClientError ? err : null;
      const status = apiErr?.status;
      const reqId = apiErr?.requestId;
      const msg = apiErr?.message || (err instanceof Error ? err.message : 'Submission failed');

      setVerdict('system_error');
      setSubmissionRequestId(reqId || null);

      if (status === 401) {
        setStderrLogs(
          `[AUTHENTICATION REQUIRED]\n\n${msg}\nYour source code has been preserved intact. Please sign in to submit official solutions.`
        );
      } else {
        setStderrLogs(
          `[SUBMISSION ERROR]\n\n${msg}${reqId ? `\n\nRequest ID: ${reqId}` : ''}\n\nYour source code is safe and has NOT been modified.`
        );
      }
    }
  };

  // Cancel active execution
  const handleCancelExecution = async () => {
    if (activeSubmissionId && verdict === 'running') {
      await cancelExecution(activeSubmissionId);
      setVerdict('cancelled');
      setStdoutLogs((prev) => (prev ? prev + '\n[CANCELLED] Execution stopped by user.' : '[CANCELLED] Execution stopped by user.'));
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleResetCode = () => {
    const starter =
      problem?.starter_templates?.[language] ||
      DEFAULT_TEMPLATES[language] ||
      '// Write code here';
    setCode(starter);
    resetDraft(starter);
  };

  if (loading && !problem) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] bg-[#08090B]">
        <div className="flex items-center gap-2 font-mono text-sm text-[#94A3B8]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#22D3EE]" />
          <span>Loading problem specification...</span>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="p-8 text-center bg-[#08090B] min-h-screen text-[#94A3B8] font-mono">
        <p className="text-sm">Problem not found.</p>
        <Link to="/problems" className="text-[#22D3EE] font-mono text-xs underline mt-2 inline-block">
          Return to Problem Catalog
        </Link>
      </div>
    );
  }

  const isRevisionMarked = Boolean(revisionMap[problem.id]);
  const isSolved = progressMap[problem.id] === 'solved' || (problem.verniq_id ? progressMap[problem.verniq_id] === 'solved' : false);
  const isAttempted = !isSolved && (progressMap[problem.id] === 'attempted' || (problem.verniq_id ? progressMap[problem.verniq_id] === 'attempted' : false));
  const isDraft = !problem.is_published || problem.workflow_status === 'draft';
  const displayId = problem.verniq_id ? problem.verniq_id.replace(/^VRQ-/, 'CKR-') : `CKR-${problem.id.slice(0, 6).toUpperCase()}`;

  // Map test cases to TestCaseConsole format
  const consoleTestCases: TestCaseItem[] = sampleTestCases.map((tc, idx) => {
    const sampleRes = sampleTestOutputs[idx + 1];
    return {
      id: idx + 1,
      input: tc.input,
      expectedOutput: tc.expected_output,
      actualOutput: sampleRes?.actualOutput,
      verdict: sampleRes?.verdict,
    };
  });

  // Left Pane: Description, Editorial, Solutions, Submissions, Notes
  const LeftPane = (
    <div className="flex flex-col h-full bg-[#0B0F19] text-[#F3F4F6] border-r border-[#1C2230]">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-[#1C2230] bg-[#0B0F19] shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setLeftTab('description')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              leftTab === 'description'
                ? 'bg-[#111521] text-[#F3F4F6] border border-[#1C2230] shadow-xs'
                : 'text-[#94A3B8] hover:text-[#F3F4F6]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Description</span>
          </button>

          <button
            onClick={() => setLeftTab('editorial')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              leftTab === 'editorial'
                ? 'bg-[#111521] text-[#F3F4F6] border border-[#1C2230] shadow-xs'
                : 'text-[#94A3B8] hover:text-[#F3F4F6]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>Editorial</span>
          </button>

          <button
            onClick={() => setLeftTab('solutions')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              leftTab === 'solutions'
                ? 'bg-[#111521] text-[#F3F4F6] border border-[#1C2230] shadow-xs'
                : 'text-[#94A3B8] hover:text-[#F3F4F6]'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-[#FFC01E]" />
            <span>Solutions</span>
          </button>

          <button
            onClick={() => setLeftTab('submissions')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              leftTab === 'submissions'
                ? 'bg-[#111521] text-[#F3F4F6] border border-[#1C2230] shadow-xs'
                : 'text-[#94A3B8] hover:text-[#F3F4F6]'
            }`}
          >
            <History className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span>Submissions</span>
          </button>

          <button
            onClick={() => setLeftTab('notes')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              leftTab === 'notes'
                ? 'bg-[#111521] text-[#F3F4F6] border border-[#1C2230] shadow-xs'
                : 'text-[#94A3B8] hover:text-[#F3F4F6]'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Notes</span>
          </button>
        </div>
      </div>

      {/* Pane Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden p-4 sm:p-5 space-y-6 text-left select-text">
        {/* TAB 1: DESCRIPTION */}
        {leftTab === 'description' && (
          <div className="space-y-6">
            {/* Draft Catalog Quarantine Banner */}
            {isDraft && (
              <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    Catalog Index Record — Draft / Content Review
                  </span>
                  <span className="bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded border border-amber-700/50 text-[11px]">
                    {displayId}
                  </span>
                </div>
                <p className="text-[#94A3B8] leading-relaxed font-sans text-xs">
                  This problem record was ingested as part of catalog normalization. Algorithmic statement, test vectors, constraints, and sandbox execution are quarantined pending formal content review.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] text-[#94A3B8] pt-2 border-t border-amber-500/10">
                  <div className="flex items-center gap-4">
                    <span>Domain: <strong className="text-gray-300">{problem.domain || 'DSA'}</strong></span>
                    <span>Workflow: <strong className="text-amber-400">DRAFT</strong></span>
                  </div>
                  {problem.verniq_id && (
                    <Link
                      to={`/authoring?vrq=${problem.verniq_id}`}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/40 flex items-center gap-1 font-sans text-xs transition-colors font-medium shadow-xs"
                    >
                      <span>Author in Studio</span>
                      <span>→</span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {fromRoadmap && (
              <div className="mb-2">
                <Link
                  to={
                    fromRoadmap === 'adaptive'
                      ? '/app/roadmap/adaptive'
                      : `/roadmaps/${encodeURIComponent(fromRoadmap)}`
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#22D3EE] hover:underline px-2.5 py-1 rounded bg-[#22D3EE]/10 border border-[#22D3EE]/20"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>
                    Back to Roadmap (
                    {fromRoadmap === 'dsa-mastery'
                      ? 'DSA Interview Mastery'
                      : fromRoadmap === 'adaptive'
                      ? 'Active Study Plan'
                      : fromRoadmap}
                    )
                  </span>
                </Link>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="bg-white/[0.06] text-gray-300 text-xs px-2 py-0.5 rounded font-mono border border-[#1C2230]">
                  {displayId}
                </span>
                {problem.domain && problem.domain !== 'DSA' && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40">
                    {problem.domain}
                  </span>
                )}
                <DifficultyBadge difficulty={problem.difficulty} />
                <Badge variant="neutral">Acceptance: {problem.acceptance_rate}%</Badge>
                {isSolved && <Badge variant="success">✓ Solved</Badge>}
                {isAttempted && <Badge variant="warning">○ Attempted</Badge>}
                {(problem.topics || problem.tags || []).map((topic) => (
                  <span
                    key={topic}
                    className="bg-[#111521] text-[#22D3EE] text-xs px-2 py-0.5 rounded font-mono border border-[#1C2230]"
                  >
                    {topic}
                  </span>
                ))}
                {(problem.companies || []).map((comp) => (
                  <span
                    key={comp}
                    className="bg-[#2A2315] text-amber-300 text-xs px-2 py-0.5 rounded font-mono border border-amber-800/30"
                  >
                    🏢 {comp}
                  </span>
                ))}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-[-0.025em]">{problem.title}</h1>
            </div>

            {/* Markdown Problem Statement */}
            <div className="text-sm text-[#F3F4F6] leading-relaxed">
              <SafeMarkdownRenderer content={problem.description_markdown} />
            </div>

            {/* Sample Examples */}
            {sampleTestCases.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xs font-sans font-semibold text-[#94A3B8]">
                  Verified Test Vectors & Examples
                </h3>
                {sampleTestCases.map((tc, idx) => (
                  <div key={tc.id || idx} className="p-3.5 rounded-lg border border-[#1C2230] bg-[#111521] space-y-2">
                    <div className="font-mono text-xs font-bold text-[#94A3B8]">Example {idx + 1}:</div>
                    <div className="space-y-1 font-mono text-xs">
                      <div>
                        <span className="text-[#94A3B8]">Input: </span>
                        <span className="text-white font-semibold">{tc.input}</span>
                      </div>
                      <div>
                        <span className="text-[#94A3B8]">Expected Output: </span>
                        <span className="text-[#00B8A3] font-semibold">{tc.expected_output}</span>
                      </div>
                      {tc.explanation && (
                        <div className="pt-1 text-[#94A3B8] font-sans text-xs">
                          <span>Explanation: </span>
                          <span>{decodeHtmlEntities(tc.explanation)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-xs font-sans font-semibold text-[#94A3B8]">
                  Test Vectors & Examples
                </h3>
                <div className="p-3.5 rounded-lg border border-[#1C2230] bg-[#111521] text-xs font-mono text-[#94A3B8]">
                  Test vectors are quarantined for this catalog record pending verification.
                </div>
              </div>
            )}

            {/* Constraints */}
            {problem.constraints_markdown && (
              <div className="space-y-2">
                <h3 className="text-xs font-sans font-semibold text-[#94A3B8]">
                  Constraints & Mathematical Bounds
                </h3>
                <div className="text-xs font-mono text-[#94A3B8] bg-[#111521] p-3 rounded-lg border border-[#1C2230]">
                  <SafeMarkdownRenderer content={problem.constraints_markdown} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EDITORIAL */}
        {leftTab === 'editorial' && (
          <div className="space-y-4">
            {problem.editorial_markdown ? (
              <div className="p-4 rounded-lg border border-[#1C2230] bg-[#111521] space-y-3">
                <h3 className="font-sans font-semibold text-base text-white tracking-[-0.015em] flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#22D3EE]" />
                  <span>Authoritative Editorial</span>
                </h3>
                <SafeMarkdownRenderer content={problem.editorial_markdown} />
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-[#1C2230] bg-[#111521]">
                <h3 className="font-sans font-semibold text-base text-white tracking-[-0.015em] mb-2 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#22D3EE]" />
                  <span>Formal Editorial & Invariant Analysis</span>
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                  Rigorous algorithmic analysis demonstrating deterministic transition states that guarantee correct execution and complexity bounds.
                </p>
                <div className="space-y-3">
                  <div className="p-3 rounded bg-[#0B0F19] border border-[#1C2230] text-xs leading-relaxed font-sans text-[#F3F4F6]">
                    <strong className="font-mono text-[#22D3EE]">Invariant Formulation:</strong> During state transitions, the candidate space is contracted monotonically without skipping any possible valid configuration.
                  </div>
                  <div className="p-3 rounded bg-[#0B0F19] border border-[#1C2230] text-xs leading-relaxed font-sans text-[#F3F4F6]">
                    <strong className="font-mono text-[#22D3EE]">Complexity Verification:</strong> Time complexity is proven to be strictly bounded by constraints, preventing Time Limit Exceeded (TLE) under adversarial test vectors.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SOLUTIONS */}
        {leftTab === 'solutions' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-[#1C2230] bg-[#111521] space-y-3">
              <h3 className="font-sans font-semibold text-base text-white tracking-[-0.015em] flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#FFC01E]" />
                <span>Canonical Approaches & Proofs</span>
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded bg-[#0B0F19] border border-[#1C2230] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#F3F4F6]">Approach 1: Hash Map / Two Pointers</span>
                    <span className="font-mono text-[11px] text-[#00B8A3]">O(n) Time • O(n) Space</span>
                  </div>
                  <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                    Trade auxiliary memory for linear time execution by storing past observations or contracting two sorted pointers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SUBMISSIONS */}
        {leftTab === 'submissions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-sans font-semibold text-[#94A3B8]">
                Official Submission History
              </h3>
              <button
                onClick={fetchSubmissionHistory}
                disabled={historyLoading}
                className="flex items-center gap-1 text-[11px] font-mono text-[#94A3B8] hover:text-[#F3F4F6] px-2 py-0.5 rounded border border-[#1C2230] bg-[#111521] transition-colors"
                title="Refresh submission history"
              >
                <RefreshCw className={cn("w-3 h-3", historyLoading && "animate-spin text-[#22D3EE]")} />
                <span>Refresh</span>
              </button>
            </div>

            {historyLoading && submissionHistory.length === 0 ? (
              <div className="p-8 text-center text-[#94A3B8] font-mono text-xs flex items-center justify-center gap-2 border border-[#1C2230] rounded-lg bg-[#111521]">
                <RefreshCw className="w-4 h-4 animate-spin text-[#22D3EE]" />
                <span>Loading submissions...</span>
              </div>
            ) : !user ? (
              <div className="p-6 text-center text-[#94A3B8] font-mono text-xs border border-[#1C2230] rounded-lg bg-[#111521] space-y-2">
                <p>Sign in to record and inspect your canonical submissions.</p>
                <Link to="/login" className="inline-block px-3 py-1 bg-[#22D3EE] text-black font-semibold rounded text-xs">
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="border border-[#1C2230] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#111521] border-b border-[#1C2230] text-[#94A3B8]">
                    <tr>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Language</th>
                      <th className="p-2.5">Runtime</th>
                      <th className="p-2.5">Passed</th>
                      <th className="p-2.5">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2230]">
                    {submissionHistory.length > 0 ? (
                      submissionHistory.map((sub) => {
                        const isSelected = selectedHistorySub?.id === sub.id;
                        return (
                          <React.Fragment key={sub.id}>
                            <tr
                              onClick={() => setSelectedHistorySub(isSelected ? null : sub)}
                              className={cn(
                                "cursor-pointer transition-colors",
                                isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                              )}
                            >
                              <td className="p-2.5">
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                                    sub.verdict === 'accepted'
                                      ? 'bg-[#00B8A3]/10 text-[#00B8A3] border border-[#00B8A3]/30'
                                      : sub.verdict === 'pending' || sub.verdict === 'running'
                                      ? 'bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30'
                                      : 'bg-[#FF4765]/10 text-[#FF4765] border border-[#FF4765]/30'
                                  )}
                                >
                                  {sub.verdict.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-2.5 text-[#94A3B8]">
                                {sub.is_custom_run ? 'Run' : 'Submit'}
                              </td>
                              <td className="p-2.5 font-mono text-[#F3F4F6] uppercase">
                                {sub.language}
                              </td>
                              <td className="p-2.5 text-[#F3F4F6]">
                                {sub.runtime_ms > 0 ? `${sub.runtime_ms} ms` : '—'}
                              </td>
                              <td className="p-2.5 text-[#94A3B8] font-mono text-[11px]">
                                {sub.test_cases_passed}/{sub.total_test_cases}
                              </td>
                              <td className="p-2.5 text-[#94A3B8]">
                                {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                            {isSelected && (
                              <tr>
                                <td colSpan={6} className="p-3 bg-black/40 border-b border-[#1C2230]">
                                  <div className="space-y-2 text-xs font-mono">
                                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                                      <span>Submission ID: <strong className="text-[#F3F4F6]">{sub.id}</strong></span>
                                      <span>Memory: <strong className="text-[#F3F4F6]">{sub.memory_kb ? `${(sub.memory_kb / 1024).toFixed(1)} MB` : '—'}</strong></span>
                                    </div>
                                    {sub.first_failed_test && (
                                      <div className="p-2 rounded bg-rose-950/20 border border-rose-800/30 text-rose-300 text-[11px]">
                                        Failed Test Case #{sub.first_failed_test.test_number} (Canonical test data protected)
                                      </div>
                                    )}
                                    {sub.compile_output && (
                                      <pre className="p-2 rounded bg-black/60 border border-orange-800/40 text-orange-300 text-[11px] whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {sub.compile_output}
                                      </pre>
                                    )}
                                    {sub.stderr_output && (
                                      <pre className="p-2 rounded bg-black/60 border border-rose-800/40 text-rose-300 text-[11px] whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {sub.stderr_output}
                                      </pre>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-[#94A3B8]">
                          No submissions recorded yet for this problem.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: NOTES */}
        <div className={cn("h-full", leftTab === 'notes' ? "block" : "hidden")}>
          <ProblemNotesTab
            problemId={problem.id}
            problemTitle={problem.title}
          />
        </div>
      </div>
    </div>
  );

  // Right Pane: Code Editor & Console
  const RightPane = (
    <div className="flex flex-col h-full bg-[#0B0F19] text-[#F3F4F6]">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-[#1C2230] bg-[#0B0F19] shrink-0">
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="h-7 px-2 text-xs font-mono font-medium rounded border border-[#1C2230] bg-[#111521] text-[#F3F4F6] focus:outline-none focus:border-[#22D3EE]"
          >
            <option value="cpp">C++ (GCC 14)</option>
            <option value="python">Python 3.12</option>
            <option value="java">Java 21</option>
            <option value="typescript">TypeScript 5.4</option>
            <option value="go">Go 1.23</option>
          </select>

          {/* Autosave Status Indicator */}
          <div
            id="autosave-status"
            className="flex items-center gap-1.5 text-xs font-mono ml-2 select-none"
            aria-live="polite"
          >
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-[#94A3B8]">
                <RefreshCw className="w-3 h-3 animate-spin text-[#22D3EE]" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-[#00B8A3]">
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-[#94A3B8]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Unsaved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={retrySave}
                className="flex items-center gap-1 text-[#FF4765] hover:underline cursor-pointer"
                title="Save failed. Click to retry."
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Save failed</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Expanded Editor Toggle (Desktop) */}
          <button
            onClick={() => setIsEditorExpanded(!isEditorExpanded)}
            className="hidden lg:flex p-1.5 rounded text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04] transition-colors"
            title={isEditorExpanded ? "Restore split view" : "Maximize editor"}
          >
            {isEditorExpanded ? <Minimize2 className="w-3.5 h-3.5 text-[#22D3EE]" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04] transition-colors"
            title="Copy code"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-[#00B8A3]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Code with Confirmation */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="p-1.5 rounded text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-white/[0.04] transition-colors"
            title="Reset to starter template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="flex-1 flex overflow-hidden relative bg-[#08090B]">
        <MonacoCodeEditor
          value={code}
          onChange={(newCode) => {
            setCode(newCode);
            onCodeChange(newCode);
          }}
          language={language}
          onRunShortcut={handleRunCode}
        />
      </div>

      {/* Bottom Console */}
      <TestCaseConsole
        testCases={consoleTestCases}
        customInput={customInput}
        onCustomInputChange={setCustomInput}
        onRunCode={handleRunCode}
        onSubmit={handleSubmitCode}
        onCancel={handleCancelExecution}
        isExecuting={isPending || isRunning || verdict === 'running' || submittingState === 'submitting' || submittingState === 'queued' || submittingState === 'judging'}
        verdict={verdict}
        executionMode={executionMode}
        submittingState={submittingState}
        requestId={submissionRequestId}
        canonicalTestCount={canonicalTestCount}
        sampleTestCount={sampleTestCases?.length || 0}
        runtimeMs={runtimeMs}
        memoryMb={memoryMb}
        testCasesPassed={testCasesPassed}
        totalTestCases={totalTestCases}
        stdoutLogs={stdoutLogs}
        stderrLogs={stderrLogs}
        compileOutput={compileOutput}
        telemetry={liveSubmission?.telemetry || telemetry}
        firstFailedTest={firstFailedTest}
      />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[#08090B]">
      {/* Top Problem Workspace Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 h-11 border-b border-[#1C2230] bg-[#0B0F19] shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/problems"
            className="flex items-center gap-1 text-xs font-mono text-[#94A3B8] hover:text-[#F3F4F6] transition-colors shrink-0"
            title="Return to Problem Index"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Problems</span>
          </Link>

          <span className="text-[#1C2230] hidden sm:inline">|</span>

          <span className="text-[11px] font-mono text-[#94A3B8] bg-white/[0.04] px-1.5 py-0.5 rounded border border-[#1C2230] shrink-0">
            {displayId}
          </span>

          <span className="text-xs font-mono font-bold text-[#F3F4F6] truncate max-w-[120px] sm:max-w-xs md:max-w-md">
            {problem.title}
          </span>

          <div className="shrink-0">
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>

          {isDraft && (
            <span className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40 shrink-0">
              DRAFT
            </span>
          )}
        </div>

        {/* Mobile View Switcher (Visible on < lg) */}
        <div className="flex lg:hidden items-center p-0.5 rounded-md bg-[#111521] border border-[#1C2230] shrink-0">
          <button
            onClick={() => setMobileView('problem')}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1",
              mobileView === 'problem' ? "bg-[#22D3EE] text-black font-semibold" : "text-[#94A3B8] hover:text-[#F3F4F6]"
            )}
          >
            <BookOpen className="w-3 h-3" />
            <span>Problem</span>
          </button>
          <button
            onClick={() => setMobileView('code')}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1",
              mobileView === 'code' ? "bg-[#22D3EE] text-black font-semibold" : "text-[#94A3B8] hover:text-[#F3F4F6]"
            )}
          >
            <Code2 className="w-3 h-3" />
            <span>Code</span>
          </button>
          <button
            onClick={() => setMobileView('console')}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1",
              mobileView === 'console' ? "bg-[#22D3EE] text-black font-semibold" : "text-[#94A3B8] hover:text-[#F3F4F6]"
            )}
          >
            <Terminal className="w-3 h-3" />
            <span>Console</span>
          </button>
        </div>

        {/* Right Actions: Revision Star & Timer */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Ask Riva Action */}
          <button
            onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors border",
              isAiDrawerOpen
                ? "bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/50 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                : "bg-[#111521] hover:bg-[#181F30] text-[#22D3EE] border-[#22D3EE]/30 hover:border-[#22D3EE]/60"
            )}
            title="Ask Riva (Ctrl+I)"
            aria-label="Ask Riva AI Companion"
          >
            <RivaAvatar size="xs" state="idle" showHalo={false} />
            <span className="hidden sm:inline">Ask Riva</span>
          </button>

          {/* Spaced-Repetition Revision Star */}
          <button
            onClick={() => toggleRevision(problem.id)}
            className={`p-1.5 rounded transition-colors ${
              isRevisionMarked
                ? 'text-[#FFC01E] bg-[#FFC01E]/10'
                : 'text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-[#111521]'
            }`}
            title="Spaced repetition: review problem later"
          >
            <Star className={`w-3.5 h-3.5 ${isRevisionMarked ? 'fill-[#FFC01E]' : ''}`} />
          </button>

          {/* Active Roadmap Today's Tasks Dropdown (Planly-style IDE integration) */}
          {todayPlanTasks.length > 0 && (
            <div className="hidden md:block relative" ref={planMenuRef}>
              <button
                type="button"
                onClick={() => setIsPlanMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#1C2230] bg-[#111521] hover:border-[#3B82F6]/50 text-xs font-mono text-[#E2E8F0] transition-colors cursor-pointer"
                title="Today's Roadmap Tasks"
              >
                <ListTodo className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>
                  Task {todayPlanTasks.filter((t) => t.status === 'completed').length}/
                  {todayPlanTasks.length}
                </span>
                <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
              </button>

              {isPlanMenuOpen && (
                <div className="absolute right-0 top-9 w-80 rounded-xl border border-[#1F2937] bg-[#0F131D] shadow-2xl z-50 p-3 space-y-2 text-left">
                  <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pb-1.5 border-b border-[#1F2937]">
                    <span className="font-medium text-white/90">Today&apos;s plan</span>
                    <Link
                      to="/app/roadmap/adaptive"
                      onClick={() => setIsPlanMenuOpen(false)}
                      className="text-[#3B82F6] hover:underline"
                    >
                      Open roadmap
                    </Link>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {todayPlanTasks.map((t) => {
                      const isCurrent = t.problemSlug === activeSlug;
                      const isDone = t.status === 'completed';
                      const rowContent = (
                        <div
                          className={cn(
                            'flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors',
                            isCurrent
                              ? 'bg-[#172033] border border-[#3B82F6]/40 text-white'
                              : 'hover:bg-[#151A26] text-[#CBD5E1]'
                          )}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#00B8A3] shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                            )}
                            <span className={cn('truncate', isDone && 'line-through text-[#64748B]')}>
                              {t.title}
                            </span>
                          </span>
                          <span className="text-[10px] font-mono text-[#94A3B8] shrink-0">
                            {isCurrent ? 'Active' : `${t.estimatedMinutes}m`}
                          </span>
                        </div>
                      );

                      return t.problemSlug ? (
                        <Link
                          key={t.id}
                          to={`/app/practice/${t.problemSlug}?fromRoadmap=adaptive`}
                          onClick={() => setIsPlanMenuOpen(false)}
                          className="block"
                        >
                          {rowContent}
                        </Link>
                      ) : (
                        <div key={t.id}>{rowContent}</div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stopwatch */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#1C2230] bg-[#111521] font-mono text-xs text-[#94A3B8]">
            <TimerIcon className="w-3 h-3 text-[#94A3B8]" />
            <span className="tabular-nums font-mono text-[11px]">{formatTimer(timerSeconds)}</span>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="ml-1 text-[#94A3B8] hover:text-[#F3F4F6]"
              title={timerRunning ? "Pause stopwatch" : "Start stopwatch"}
            >
              {timerRunning ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-hidden relative flex">
        {/* Desktop View (lg and above) */}
        <div className="hidden lg:flex flex-1 overflow-hidden relative">
          {isEditorExpanded ? (
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center justify-between px-3 py-1 bg-[#111521] border-b border-[#1C2230] text-xs font-mono text-[#94A3B8]">
                <span className="flex items-center gap-1.5 text-[#22D3EE]">
                  <Maximize2 className="w-3 h-3" />
                  <span>Expanded Editor Mode</span>
                </span>
                <button
                  onClick={() => setIsEditorExpanded(false)}
                  className="text-xs text-[#22D3EE] hover:underline flex items-center gap-1"
                >
                  <span>Restore Split View</span>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {RightPane}
              </div>
            </div>
          ) : (
            <SplitPane left={LeftPane} right={RightPane} defaultSplit={45} />
          )}
        </div>

        {/* Mobile View (< lg) */}
        <div className="flex lg:hidden flex-1 overflow-hidden flex-col">
        {mobileView === 'problem' && (
          <div className="flex-1 overflow-hidden">
            {LeftPane}
          </div>
        )}

        {mobileView === 'code' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#08090B]">
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-3 h-9 border-b border-[#1C2230] bg-[#0B0F19] shrink-0">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="h-6 px-1.5 text-xs font-mono rounded border border-[#1C2230] bg-[#111521] text-[#F3F4F6]"
              >
                <option value="cpp">C++ (GCC 14)</option>
                <option value="python">Python 3.12</option>
                <option value="java">Java 21</option>
                <option value="typescript">TypeScript 5.4</option>
                <option value="go">Go 1.23</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyCode}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#F3F4F6]"
                  title="Copy"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-[#00B8A3]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#F3F4F6]"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <MonacoCodeEditor
                value={code}
                onChange={(newCode) => {
                  setCode(newCode);
                  onCodeChange(newCode);
                }}
                language={language}
                onRunShortcut={handleRunCode}
              />
            </div>
          </div>
        )}

        {mobileView === 'console' && (
          <div className="flex-1 overflow-hidden">
            <TestCaseConsole
              testCases={consoleTestCases}
              customInput={customInput}
              onCustomInputChange={setCustomInput}
              onRunCode={handleRunCode}
              onSubmit={handleSubmitCode}
              onCancel={handleCancelExecution}
              isExecuting={isPending || isRunning || verdict === 'running' || submittingState === 'submitting' || submittingState === 'queued' || submittingState === 'judging'}
              verdict={verdict}
              executionMode={executionMode}
              submittingState={submittingState}
              requestId={submissionRequestId}
              canonicalTestCount={canonicalTestCount}
              sampleTestCount={sampleTestCases?.length || 0}
              runtimeMs={runtimeMs}
              memoryMb={memoryMb}
              testCasesPassed={testCasesPassed}
              totalTestCases={totalTestCases}
              stdoutLogs={stdoutLogs}
              stderrLogs={stderrLogs}
              compileOutput={compileOutput}
              telemetry={liveSubmission?.telemetry || telemetry}
              firstFailedTest={firstFailedTest}
            />
          </div>
        )}

        {/* Mobile Sticky Action Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#1C2230] bg-[#0B0F19] shrink-0 mb-14 md:mb-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#94A3B8] uppercase">{language}</span>
            {verdict !== 'idle' && (
              <span className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase",
                verdict === 'accepted' ? "text-[#00B8A3] bg-[#00B8A3]/10" : "text-amber-400 bg-amber-400/10"
              )}>
                {verdict.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMobileView('console');
                handleRunCode();
              }}
              disabled={verdict === 'running' || submittingState === 'submitting'}
              className="px-3 py-1.5 text-xs font-mono font-medium rounded border border-[#1C2230] bg-[#111521] text-[#F3F4F6] hover:bg-white/[0.04] transition-colors"
            >
              Run Code
            </button>
            <button
              onClick={() => {
                setMobileView('console');
                handleSubmitCode();
              }}
              disabled={submittingState === 'submitting' || submittingState === 'queued' || submittingState === 'judging'}
              className="px-3.5 py-1.5 text-xs font-mono font-bold rounded bg-[#22D3EE] text-black hover:bg-[#22D3EE]/90 transition-colors shadow-xs"
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* Chakriva AI Drawer (Desktop resizable side panel / Mobile full-screen overlay) */}
      <ChakrivaAiDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        problemId={problem.id}
        problemVerniqId={problem.verniq_id}
        problemTitle={problem.title}
        problemDifficulty={problem.difficulty}
        problemStatement={problem.description_markdown}
        constraints={problem.constraints_markdown}
        sampleExamples={sampleTestCases.map((tc) => ({ input: tc.input, output: tc.expected_output }))}
        isDraftProblem={isDraft}
        language={language}
        code={code}
      />
    </div>

    {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#0B0F19] border border-[#1C2230] rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white">Reset to Starter Code?</h4>
                <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                  This will overwrite your current solution for <span className="text-[#22D3EE] font-mono font-medium">{language.toUpperCase()}</span> with the initial template. Unsaved changes will be discarded.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C2230]">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded text-xs font-mono text-[#94A3B8] hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResetCode();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-[#FF4765]/20 hover:bg-[#FF4765]/30 text-[#FF4765] border border-[#FF4765]/40 transition-colors shadow-xs"
              >
                Reset Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
