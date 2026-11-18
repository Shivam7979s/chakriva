import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Play,
  Send,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Terminal,
  Code2,
  Database,
  Cpu,
  BarChart3,
  Flame,
  Square,
  Zap,
  Info,
} from 'lucide-react';
import { SubmissionVerdict, ExecutionTelemetry, FailedTestCaseInfo } from '@/types';

export type ConsoleTab = 'testcases' | 'custom_input' | 'result';

export type ExecutionVerdict = SubmissionVerdict | 'idle';

export interface TestCaseItem {
  id: number;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  verdict?: 'ac' | 'wa' | 'accepted' | 'wrong_answer';
}

interface TestCaseConsoleProps {
  testCases: TestCaseItem[];
  customInput: string;
  onCustomInputChange: (val: string) => void;
  onRunCode: () => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isExecuting?: boolean;
  verdict?: ExecutionVerdict;
  executionMode?: 'run' | 'submit' | null;
  submittingState?: 'idle' | 'submitting' | 'queued' | 'judging' | 'completed' | 'error';
  requestId?: string | null;
  canonicalTestCount?: number;
  sampleTestCount?: number;
  runtimeMs?: number;
  memoryMb?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  stdoutLogs?: string;
  stderrLogs?: string;
  compileOutput?: string;
  telemetry?: ExecutionTelemetry | null;
  firstFailedTest?: FailedTestCaseInfo | null;
  className?: string;
}

export const TestCaseConsole: React.FC<TestCaseConsoleProps> = ({
  testCases,
  customInput,
  onCustomInputChange,
  onRunCode,
  onSubmit,
  onCancel,
  isExecuting = false,
  verdict = 'idle',
  executionMode = null,
  submittingState = 'idle',
  requestId = null,
  canonicalTestCount = 0,
  sampleTestCount = 0,
  runtimeMs = 0,
  memoryMb = 0,
  testCasesPassed = 0,
  totalTestCases = 0,
  stdoutLogs = '',
  stderrLogs = '',
  compileOutput = '',
  telemetry = null,
  firstFailedTest = null,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('testcases');
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isFailedTestCollapsed, setIsFailedTestCollapsed] = useState<boolean>(false);
  const [consoleHeight, setConsoleHeight] = useState<number>(270);
  const [isDraggingHeight, setIsDraggingHeight] = useState<boolean>(false);
  const dragStartY = React.useRef<number>(0);
  const startHeight = React.useRef<number>(270);

  // Auto-switch to 'result' tab when execution triggers or finishes
  useEffect(() => {
    if (verdict !== 'idle') {
      setActiveTab('result');
      setIsCollapsed(false);
      setIsFailedTestCollapsed(false);
    }
  }, [verdict]);

  // Handle vertical resizing of console panel
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingHeight(true);
    dragStartY.current = e.clientY;
    startHeight.current = consoleHeight;
  };

  const handleTouchResizeStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDraggingHeight(true);
      dragStartY.current = e.touches[0].clientY;
      startHeight.current = consoleHeight;
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingHeight) return;
      const delta = dragStartY.current - e.clientY; // dragging upwards expands console
      const newHeight = Math.max(140, Math.min(550, startHeight.current + delta));
      setConsoleHeight(newHeight);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingHeight || e.touches.length === 0) return;
      const delta = dragStartY.current - e.touches[0].clientY;
      const newHeight = Math.max(140, Math.min(550, startHeight.current + delta));
      setConsoleHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDraggingHeight(false);
    };

    if (isDraggingHeight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingHeight]);

  const selectedCase = testCases[selectedCaseIndex] || testCases[0];

  const isSubmitMode =
    executionMode === 'submit' ||
    (executionMode === null && totalTestCases > (sampleTestCount || 4));
  const isRunMode =
    executionMode === 'run' ||
    (executionMode === null && totalTestCases <= (sampleTestCount || 4));

  const getVerdictDetails = (v: ExecutionVerdict) => {
    switch (v) {
      case 'ac':
      case 'accepted':
        return {
          pill: 'AC',
          title: isRunMode ? 'Sample Tests Passed' : 'Accepted',
          desc: isRunMode
            ? 'All visible sample test cases verified. Run Code evaluates sample tests for quick feedback. Submit runs the full canonical test suite.'
            : 'All canonical test cases verified successfully against strict time and memory bounds.',
          color: 'text-[#00B8A3] bg-[#00B8A3]/10 border-[#00B8A3]/30',
          badgeColor: 'bg-[#00B8A3] text-black font-bold',
          icon: <CheckCircle2 className="w-5 h-5 text-[#00B8A3]" />,
          isPositive: true,
        };
      case 'wa':
      case 'wrong_answer':
        return {
          pill: 'WA',
          title: isRunMode ? 'Sample Test Failed' : 'Wrong Answer',
          desc: isRunMode
            ? 'Output mismatch on visible sample test vector evaluated against expected returns.'
            : 'Output mismatch on canonical test vector. Hidden test data remains protected.',
          color: 'text-[#FF375F] bg-[#FF375F]/10 border-[#FF375F]/30',
          badgeColor: 'bg-[#FF375F] text-white font-bold',
          icon: <XCircle className="w-5 h-5 text-[#FF375F]" />,
          isPositive: false,
        };
      case 'tle':
      case 'time_limit_exceeded':
        return {
          pill: 'TLE',
          title: 'Time Limit Exceeded',
          desc: 'Execution exceeded 2.0s sandbox CPU threshold.',
          color: 'text-[#FFC01E] bg-[#FFC01E]/10 border-[#FFC01E]/30',
          badgeColor: 'bg-[#FFC01E] text-black font-bold',
          icon: <Clock className="w-5 h-5 text-[#FFC01E]" />,
          isPositive: false,
        };
      case 'mle':
      case 'memory_limit_exceeded':
        return {
          pill: 'MLE',
          title: 'Memory Limit Exceeded',
          desc: 'Heap memory usage exceeded 256MB threshold.',
          color: 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30',
          badgeColor: 'bg-[#8B5CF6] text-white font-bold',
          icon: <Database className="w-5 h-5 text-[#8B5CF6]" />,
          isPositive: false,
        };
      case 'ce':
      case 'compilation_error':
        return {
          pill: 'CE',
          title: 'Compilation Error',
          desc: 'Compiler returned non-zero exit code during build phase.',
          color: 'text-[#F97316] bg-[#F97316]/10 border-[#F97316]/30',
          badgeColor: 'bg-[#F97316] text-white font-bold',
          icon: <AlertTriangle className="w-5 h-5 text-[#F97316]" />,
          isPositive: false,
        };
      case 're':
      case 'runtime_error':
        return {
          pill: 'RE',
          title: 'Runtime Error',
          desc: 'Process terminated unexpectedly during evaluation.',
          color: 'text-[#F97316] bg-[#F97316]/10 border-[#F97316]/30',
          badgeColor: 'bg-[#F97316] text-white font-bold',
          icon: <AlertTriangle className="w-5 h-5 text-[#F97316]" />,
          isPositive: false,
        };
      case 'cancelled':
        return {
          pill: 'CAN',
          title: 'Execution Cancelled',
          desc: 'Execution was terminated by user request.',
          color: 'text-neutral-400 bg-neutral-800/30 border-neutral-700/50',
          badgeColor: 'bg-neutral-700 text-white font-bold',
          icon: <XCircle className="w-5 h-5 text-neutral-400" />,
          isPositive: false,
        };
      case 'running':
      case 'pending': {
        const isSubmitting = submittingState === 'submitting';
        const isQueued = submittingState === 'queued';
        const isJudging = submittingState === 'judging';

        let pill = isRunMode ? 'RUN' : 'SUBMIT';
        let title = isRunMode ? 'Evaluating Sample Tests...' : 'Evaluating Canonical Test Suite...';
        let desc = isRunMode
          ? 'Compiling source and verifying visible sample test vectors for fast feedback.'
          : 'Compiling source and executing full test matrix across isolated containers.';

        if (isSubmitting) {
          pill = 'DISPATCH';
          title = 'Submitting Solution...';
          desc = 'Contacting Verniq submission control plane...';
        } else if (isQueued) {
          pill = 'QUEUED';
          title = 'Queued for Evaluation';
          desc = 'Submission is enqueued in Redis. Waiting for isolated judge worker...';
        } else if (isJudging) {
          pill = 'JUDGING';
          title = 'Judging Solution...';
          desc = 'Isolated judge sandbox is executing canonical test vectors...';
        }

        return {
          pill,
          title,
          desc,
          color: 'text-primary bg-primary/10 border-primary/30',
          badgeColor: 'bg-primary text-white font-bold',
          icon: <Clock className="w-5 h-5 animate-spin text-primary" />,
          isPositive: false,
        };
      }
      case 'system_error':
      case 'internal_error':
        return {
          pill: 'SYS_ERR',
          title: 'System Error',
          desc: 'An error occurred during submission evaluation. Your source code has been preserved.',
          color: 'text-rose-400 bg-rose-950/30 border-rose-800/40',
          badgeColor: 'bg-rose-600 text-white font-bold',
          icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
          isPositive: false,
        };
      default:
        return null;
    }
  };

  const verdictMeta = getVerdictDetails(verdict);

  // Runtime comparison percentile benchmark (derived realistically from ms)
  const runtimePercentile = Math.max(12, Math.min(99, Math.round(100 - (runtimeMs / 50) * 80)));
  const memoryPercentile = Math.max(15, Math.min(98, Math.round(100 - (memoryMb / 32) * 70)));

  return (
    <div
      style={isCollapsed ? undefined : { height: `${consoleHeight}px` }}
      className={cn(
        'flex flex-col border-t border-[#1C2230] bg-[#0B0F19] text-[#F3F4F6] shrink-0 transition-none select-none relative',
        isCollapsed ? 'h-10' : '',
        className
      )}
    >
      {/* Draggable resize handle */}
      <div
        onMouseDown={handleResizeStart}
        onTouchStart={handleTouchResizeStart}
        onDoubleClick={() => setConsoleHeight(270)}
        className={cn(
          'w-full h-1.5 hover:h-2 cursor-row-resize transition-all select-none group flex items-center justify-center shrink-0 z-20',
          isDraggingHeight ? 'bg-cyan-500/40' : 'bg-[#1C2230] hover:bg-cyan-500/30'
        )}
        title="Drag to resize console (double-click to reset)"
      >
        <div
          className={cn(
            'w-8 h-0.5 rounded-full transition-colors',
            isDraggingHeight ? 'bg-cyan-400' : 'bg-zinc-600 group-hover:bg-cyan-400'
          )}
        />
      </div>

      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-[#1C2230] bg-[#0B0F19] shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab('testcases');
            }}
            className={cn(
              'px-2.5 py-1 text-xs font-mono font-medium rounded-md flex items-center gap-1.5 transition-colors',
              activeTab === 'testcases' && !isCollapsed
                ? 'bg-[#111521] text-cyan-300 border border-[#1C2230] font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Test Cases</span>
            {sampleTestCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                {sampleTestCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab('custom_input');
            }}
            className={cn(
              'px-2.5 py-1 text-xs font-mono font-medium rounded-md flex items-center gap-1.5 transition-colors',
              activeTab === 'custom_input' && !isCollapsed
                ? 'bg-[#111521] text-cyan-300 border border-[#1C2230] font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Custom Input</span>
          </button>

          <button
            onClick={() => {
              setIsCollapsed(false);
              setActiveTab('result');
            }}
            className={cn(
              'px-2.5 py-1 text-xs font-mono font-medium rounded-md flex items-center gap-1.5 transition-colors relative',
              activeTab === 'result' && !isCollapsed
                ? 'bg-[#111521] text-cyan-300 border border-[#1C2230] font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Result</span>
            {verdict !== 'idle' && (
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  verdict === 'ac' || verdict === 'accepted'
                    ? 'bg-[#00B8A3]'
                    : verdict === 'running' || verdict === 'pending'
                    ? 'bg-cyan-400'
                    : 'bg-[#FF375F]'
                )}
              />
            )}
          </button>
        </div>


        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            title={isCollapsed ? 'Expand Console' : 'Collapse Console'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isExecuting && onCancel && (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 transition-colors"
              title="Stop execution and release isolated sandbox resources"
            >
              <Square className="w-3 h-3 fill-current text-rose-400" />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={onRunCode}
            disabled={isExecuting || submittingState === 'submitting' || submittingState === 'queued' || submittingState === 'judging'}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium bg-[#111521] hover:bg-[#181F30] text-zinc-200 hover:text-white border border-[#1C2230] transition-colors shadow-xs disabled:opacity-50"
            title="Compile & run against sample test cases (Ctrl + Enter)"
          >
            <Play className="w-3 h-3 fill-current text-cyan-400" />
            <span>{executionMode === 'run' && isExecuting ? 'Running...' : 'Run Code'}</span>
            <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 ml-0.5 px-1 py-0.2 rounded bg-black/40 border border-white/5">Ctrl+↵</span>
          </button>

          <button
            onClick={onSubmit}
            disabled={isExecuting || submittingState === 'submitting' || submittingState === 'queued' || submittingState === 'judging'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-md text-xs font-mono font-semibold bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)] disabled:opacity-50"
            title="Submit solution to remote judge sandbox"
          >
            <Send className="w-3 h-3 text-black" />
            <span>
              {submittingState === 'submitting'
                ? 'Submitting...'
                : submittingState === 'queued'
                ? 'Queued...'
                : submittingState === 'judging'
                ? 'Judging...'
                : 'Submit'}
            </span>
          </button>
        </div>
      </div>

      {/* Console Content Area */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 text-xs font-mono bg-[#08090B] select-text">
          {/* TAB 1: TESTCASE */}
          {activeTab === 'testcases' && (
            <div className="space-y-3">
              {/* Informational Banner */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-[11px] font-sans text-neutral-400 bg-white/[0.02] border border-white/[0.06] px-3 py-1.5 rounded">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">Run Code tests visible samples. Submit verifies against the full canonical test suite.</span>
                </span>
                <span className="font-mono text-[10px] text-cyan-300/80 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06] shrink-0 whitespace-nowrap">
                  Sample: {testCases.length} (Visible) / Canonical:{' '}
                  {canonicalTestCount > testCases.length
                    ? `${canonicalTestCount}`
                    : 'Full Suite (Protected)'}
                </span>
              </div>

              {/* Case selector pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {testCases.map((tc, idx) => (
                  <button
                    key={tc.id}
                    onClick={() => setSelectedCaseIndex(idx)}
                    className={cn(
                      'px-2.5 py-1 rounded border text-xs font-mono font-medium flex items-center gap-1.5 transition-colors',
                      selectedCaseIndex === idx
                        ? 'border-white/[0.2] bg-[#1F2433] text-white font-bold'
                        : 'border-white/[0.08] bg-[#12151E] text-neutral-400 hover:text-white'
                    )}
                  >
                    <span>Case {idx + 1}</span>
                    {(tc.verdict === 'ac' || tc.verdict === 'accepted') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00B8A3]" />
                    )}
                    {(tc.verdict === 'wa' || tc.verdict === 'wrong_answer') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF375F]" />
                    )}
                  </button>
                ))}
              </div>

              {selectedCase && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-neutral-400 block mb-1">
                      Input Parameters
                    </label>
                    <pre className="p-2.5 rounded bg-[#12151E] border border-white/[0.08] text-neutral-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {selectedCase.input}
                    </pre>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-400 block mb-1">
                      Expected Return Value
                    </label>
                    <pre className="p-2.5 rounded bg-[#12151E] border border-white/[0.08] text-[#00B8A3] overflow-x-auto whitespace-pre-wrap leading-relaxed font-semibold">
                      {selectedCase.expectedOutput}
                    </pre>
                  </div>

                  {selectedCase.actualOutput !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-neutral-400">
                          Actual Output
                        </label>
                        {selectedCase.verdict && (
                          <span
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase',
                              selectedCase.verdict === 'ac' || selectedCase.verdict === 'accepted'
                                ? 'bg-[#00B8A3]/20 text-[#00B8A3]'
                                : 'bg-[#FF375F]/20 text-[#FF375F]'
                            )}
                          >
                            {selectedCase.verdict === 'ac' || selectedCase.verdict === 'accepted' ? 'Passed' : 'Mismatch'}
                          </span>
                        )}
                      </div>
                      <pre
                        className={cn(
                          'p-2.5 rounded bg-[#12151E] border overflow-x-auto whitespace-pre-wrap leading-relaxed font-semibold',
                          selectedCase.verdict === 'ac' || selectedCase.verdict === 'accepted'
                            ? 'border-[#00B8A3]/30 text-[#00B8A3]'
                            : 'border-[#FF375F]/30 text-[#FF375F]'
                        )}
                      >
                        {selectedCase.actualOutput || '(no output / empty string)'}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CUSTOM TESTCASE */}
          {activeTab === 'custom_input' && (
            <div className="h-full flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">
                  Interactive Custom Testcase Vector
                </span>
                <span className="text-[11px] text-neutral-500">Passed directly to stdin</span>
              </div>
              <textarea
                value={customInput}
                onChange={(e) => onCustomInputChange(e.target.value)}
                placeholder="Enter custom input vector (e.g. nums = [2,7,11,15], target = 9)..."
                className="w-full flex-1 p-2.5 rounded bg-[#12151E] border border-white/[0.08] text-neutral-200 font-mono text-xs resize-none focus:outline-none focus:border-blue-500"
                rows={5}
              />
            </div>
          )}

          {/* TAB 3: RESULT */}
          {activeTab === 'result' && (
            <div className="space-y-3">
              {verdictMeta ? (
                <div className="space-y-3">
                  {/* Verdict Headline Banner */}
                  <div className={cn('p-3.5 rounded-lg border flex items-start justify-between gap-3', verdictMeta.color)}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{verdictMeta.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn('px-2 py-0.5 text-[11px] rounded font-mono', verdictMeta.badgeColor)}>
                            {verdictMeta.pill}
                          </span>
                          <h4 className="font-bold font-sans text-base leading-tight text-white">
                            {verdictMeta.title}
                          </h4>
                        </div>
                        <p className="text-xs font-sans opacity-85 mt-1">{verdictMeta.desc}</p>
                      </div>
                    </div>

                    {/* Test Cases Passed Ratio */}
                    {totalTestCases > 0 && verdict !== 'running' && verdict !== 'pending' && (
                      <div className="flex flex-col items-end shrink-0">
                        {isSubmitMode ? (
                          <>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-blue-400 font-semibold mb-1">
                              <Zap className="w-3 h-3 fill-current" />
                              <span>Canonical Test Suite</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-white bg-black/40 px-2.5 py-1 rounded border border-white/10">
                              Canonical Tests: {testCasesPassed} / {totalTestCases} Passed
                            </span>
                            <div className="w-32 h-1.5 bg-black/40 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all duration-500',
                                  testCasesPassed === totalTestCases ? 'bg-[#00B8A3]' : 'bg-[#FF375F]'
                                )}
                                style={{ width: `${(testCasesPassed / (totalTestCases || 1)) * 100}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 mt-1">
                              <span>Canonical Tests: {totalTestCases}</span>
                              {sampleTestCount > 0 && totalTestCases > sampleTestCount && (
                                <>
                                  <span>•</span>
                                  <span>Sample: {sampleTestCount}</span>
                                  <span>•</span>
                                  <span>Hidden/Edge: {totalTestCases - sampleTestCount}</span>
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-300 font-medium mb-1">
                              <span>Sample Tests</span>
                              <span className="text-neutral-500">•</span>
                              <span className="text-emerald-400 text-[10px]">Quick Feedback</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-white bg-black/40 px-2.5 py-1 rounded border border-white/10">
                              Sample Tests: {testCasesPassed} / {totalTestCases} Passed
                            </span>
                            <div className="w-32 h-1.5 bg-black/40 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all duration-500',
                                  testCasesPassed === totalTestCases ? 'bg-[#00B8A3]' : 'bg-[#FF375F]'
                                )}
                                style={{ width: `${(testCasesPassed / (totalTestCases || 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400 mt-1">
                              Full suite: {canonicalTestCount > testCases.length ? `${canonicalTestCount} canonical tests` : 'Complete canonical suite (Protected)'} on Submit
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* First Failed Test Panel (WA, RE, TLE) */}
                  {firstFailedTest && (
                    <div className="rounded-lg border border-[#FF375F]/30 bg-[#141824] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-[#FF375F]/10 border-b border-[#FF375F]/20">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-[#FF375F]/20 text-[#FF375F] border border-[#FF375F]/30">
                            {firstFailedTest.failure_type === 'runtime_error'
                              ? 'RE'
                              : firstFailedTest.failure_type === 'time_limit_exceeded'
                              ? 'TLE'
                              : 'WA'}
                          </span>
                          <span className="font-semibold text-xs text-white">First Failed Test</span>
                          <span className="text-neutral-400 text-xs font-mono">
                            Test Case #{firstFailedTest.test_number || firstFailedTest.testNumber || 1}
                          </span>
                        </div>
                        <button
                          onClick={() => setIsFailedTestCollapsed(!isFailedTestCollapsed)}
                          className="text-[11px] font-mono text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <span>{isFailedTestCollapsed ? 'Expand' : 'Collapse'}</span>
                          {isFailedTestCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {!isFailedTestCollapsed && (
                        <div className="p-3 space-y-3 text-xs font-mono">
                          {/* Input */}
                          {firstFailedTest.input ? (
                            <div>
                              <label className="text-xs font-medium text-neutral-400 block mb-1">
                                Input
                              </label>
                              <pre className="p-2.5 rounded bg-[#0E1117] border border-white/[0.08] text-neutral-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36">
                                {firstFailedTest.input}
                              </pre>
                            </div>
                          ) : isSubmitMode ? (
                            <div className="p-2.5 rounded bg-[#0E1117] border border-white/[0.08] text-neutral-400 text-xs leading-relaxed">
                              <span className="text-neutral-300 font-semibold">Test #{firstFailedTest.test_number || 1} failed.</span> Canonical test input and expected output remain protected to maintain evaluation integrity.
                            </div>
                          ) : null}

                          {/* Your Output */}
                          {firstFailedTest.actual_output && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-[#FF375F]">
                                  Your Output
                                </label>
                                {firstFailedTest.normalized && (
                                  <span className="text-[10px] font-sans text-neutral-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08]">
                                    Judge normalized whitespace / line endings
                                  </span>
                                )}
                              </div>
                              <pre className="p-2.5 rounded bg-[#0E1117] border border-[#FF375F]/30 text-[#FF375F] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36 font-semibold">
                                {firstFailedTest.actual_output}
                              </pre>
                            </div>
                          )}

                          {/* Expected Output */}
                          {firstFailedTest.expected_output !== undefined && firstFailedTest.expected_output !== null && (
                            <div>
                              <label className="text-xs font-medium text-[#00B8A3] block mb-1">
                                Expected Output
                              </label>
                              <pre className="p-2.5 rounded bg-[#0E1117] border border-[#00B8A3]/30 text-[#00B8A3] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36 font-semibold">
                                {firstFailedTest.expected_output}
                              </pre>
                            </div>
                          )}

                          {/* Error Diagnostic (if RE / TLE) */}
                          {firstFailedTest.error_message && (
                            <div>
                              <label className="text-xs font-medium text-[#F97316] block mb-1">
                                Error Diagnostic
                              </label>
                              <pre className="p-2.5 rounded bg-[#0E1117] border border-[#F97316]/30 text-[#F97316] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-36">
                                {firstFailedTest.error_message}
                              </pre>
                            </div>
                          )}

                          {/* Anti-Leak Security: Remaining Hidden Tests Protected Notice */}
                          {isSubmitMode && totalTestCases > (firstFailedTest.test_number || firstFailedTest.testNumber || 1) && (
                            <div className="flex items-center gap-1.5 text-[11px] font-sans text-neutral-400 pt-1 border-t border-white/[0.06]">
                              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>
                                Remaining hidden test cases ({totalTestCases - (firstFailedTest.test_number || firstFailedTest.testNumber || 1)} tests) remain protected and unexposed.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Request ID for support / debugging */}
                  {requestId && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#12151E] border border-white/[0.08] text-xs font-mono text-neutral-400 select-all">
                      <div className="flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-neutral-500 font-sans">Request ID:</span>
                        <span className="text-blue-400 font-mono font-semibold">{requestId}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500">System trace</span>
                    </div>
                  )}

                  {/* Runtime & Memory Distribution Cards */}
                  {verdict !== 'running' && verdict !== 'pending' && runtimeMs > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Runtime Benchmark Card */}
                      <div className="p-3 rounded-lg bg-[#12151E] border border-white/[0.08] flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-2">
                          <span className="text-neutral-400 font-sans text-xs flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-warning" />
                            Runtime
                          </span>
                          <span className="text-[11px] text-[#00B8A3] font-semibold flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            Beats {runtimePercentile}%
                          </span>
                        </div>
                        <div className="text-lg font-bold font-mono text-white mb-2">
                          {runtimeMs} <span className="text-xs text-neutral-400 font-normal">ms</span>
                        </div>
                        {/* Percentile distribution bar */}
                        <div className="w-full bg-[#181C28] h-2 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className="h-full bg-[#00B8A3] rounded-full transition-all duration-500"
                            style={{ width: `${runtimePercentile}%` }}
                          />
                        </div>
                      </div>

                      {/* Memory Benchmark Card */}
                      <div className="p-3 rounded-lg bg-[#12151E] border border-white/[0.08] flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-2">
                          <span className="text-neutral-400 font-sans text-xs flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-indigo-400" />
                            Memory Peak
                          </span>
                          <span className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            Beats {memoryPercentile}%
                          </span>
                        </div>
                        <div className="text-lg font-bold font-mono text-white mb-2">
                          {memoryMb.toFixed(1)} <span className="text-xs text-neutral-400 font-normal">MB</span>
                        </div>
                        {/* Percentile distribution bar */}
                        <div className="w-full bg-[#181C28] h-2 rounded-full overflow-hidden border border-white/[0.05]">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${memoryPercentile}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Execution Pipeline Telemetry */}
                  {verdict !== 'running' && verdict !== 'pending' && telemetry && (
                    <div className="p-2.5 rounded-lg bg-[#12151E] border border-white/[0.08] flex items-center justify-between text-xs font-mono text-neutral-400">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1 text-white font-semibold">
                          <Cpu className="w-3.5 h-3.5 text-blue-400" />
                          Pipeline: {telemetry.total_ms || 0}ms
                        </span>
                        <span>•</span>
                        <span>Compile: {telemetry.compile_ms || 0}ms</span>
                        <span>•</span>
                        <span>Execution: {telemetry.execution_ms || 0}ms</span>
                      </div>
                      {telemetry.cached_compilation ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                          <Zap className="w-3 h-3 fill-current" />
                          Cached Artifact
                        </span>
                      ) : (
                        <span className="text-neutral-500 text-[11px]">
                          Cold Build
                        </span>
                      )}
                    </div>
                  )}

                  {/* Compilation Output (if CE) */}
                  {compileOutput && (
                    <div>
                      <label className="text-xs font-medium text-[#F97316] block mb-1">
                        Compilation Output
                      </label>
                      <pre className="p-2.5 rounded bg-[#181C28] border border-[#F97316]/30 text-[#F97316] overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                        {compileOutput}
                      </pre>
                    </div>
                  )}

                  {/* Stderr Output (if RE / TLE) */}
                  {stderrLogs && (
                    <div>
                      <label className="text-xs font-medium text-[#FF375F] block mb-1">
                        Error Diagnostic Logs
                      </label>
                      <pre className="p-2.5 rounded bg-[#181C28] border border-[#FF375F]/30 text-[#FF375F] overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                        {stderrLogs}
                      </pre>
                    </div>
                  )}

                  {/* Stdout Output */}
                  {stdoutLogs && (
                    <div>
                      <label className="text-xs font-medium text-neutral-400 block mb-1">
                        Standard Output
                      </label>
                      <pre className="p-2.5 rounded bg-[#12151E] border border-white/[0.08] text-neutral-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {stdoutLogs}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-lg border border-white/[0.08] bg-[#12151E] text-neutral-400 text-center flex flex-col items-center justify-center space-y-2">
                  <Cpu className="w-7 h-7 text-neutral-500 mb-1" />
                  <p className="text-sm font-sans font-medium text-neutral-200">Ready to Evaluate Solution</p>
                  <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
                    <strong className="text-white">Run Code</strong> evaluates visible sample tests ({sampleTestCount || testCases.length || 0}) for fast feedback.
                    <br />
                    <strong className="text-cyan-400">Submit</strong> validates against the full canonical test suite ({canonicalTestCount > testCases.length ? `${canonicalTestCount} tests` : 'Protected Canonical Suite'}).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
