import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Square,
  RotateCcw,
  Code2,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  Compass,
  FileCheck2,
  ShieldAlert,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SafeMarkdownRenderer } from '../SafeMarkdownRenderer';
import { RivaAvatar } from './RivaAvatar';
import {
  sendAiQuery,
  getAiServiceStatus,
  type AiChatMessage,
  type AiAssistantRequest,
} from '@/services/aiAssistantService';

export interface ChakrivaAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  problemId: string;
  problemVerniqId?: string;
  problemTitle: string;
  problemDifficulty?: string;
  problemStatement?: string;
  constraints?: string;
  sampleExamples?: Array<{ input: string; output: string }>;
  isDraftProblem?: boolean;
  language: string;
  code: string;
}

const STORAGE_WIDTH_KEY = 'chakriva_ai_drawer_width';
const MIN_DRAWER_WIDTH = 350;
const MAX_DRAWER_WIDTH = 680;
const DEFAULT_DRAWER_WIDTH = 440;

interface ProblemCacheEntry {
  messages: AiChatMessage[];
}

/**
 * Automatically determines if active editor code context is relevant to the user query.
 * Code is included for reviews, debugging, syntax, runtime/memory optimization, and implementation checks.
 * Code is omitted for general conceptual questions, progressive hints from scratch, problem constraints, etc.
 */
export function isCodeContextRelevant(query: string, code: string): boolean {
  if (!code || !code.trim()) return false;
  const q = query.toLowerCase();
  const signals = [
    'code', 'my code', 'review', 'debug', 'error', 'bug', 'fix', 'why',
    'fail', 'wrong', 'solution', 'implementation', 'line', 'syntax',
    'test', 'run', 'slow', 'tle', 'compile', 'optimize', 'rate',
    'issue', 'exception', 'pointer', 'loop', 'approach', 'memory',
    'look at', 'is this right', 'check this', 'what is wrong', 'help me fix',
    'what did i do wrong', 'runtime', 'mle'
  ];
  return signals.some((s) => q.includes(s));
}

export const ChakrivaAiDrawer: React.FC<ChakrivaAiDrawerProps> = ({
  isOpen,
  onClose,
  problemId,
  problemVerniqId,
  problemTitle,
  problemDifficulty,
  problemStatement,
  constraints,
  sampleExamples,
  isDraftProblem,
  language,
  code,
}) => {
  // Drawer width state with persistence
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WIDTH_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= MIN_DRAWER_WIDTH && parsed <= MAX_DRAWER_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // ignore quota / security errors
    }
    return DEFAULT_DRAWER_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);

  // Single unified conversation state
  const [messages, setMessages] = useState<AiChatMessage[]>([]);

  // Viewport width tracking for responsive single-instance drawer (prevents duplicate ref collisions)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Composer & request state
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Layout-level scroll engine references
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesContentRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const userHasScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const isProgrammaticScrollRef = useRef(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Per-problem cache ref to prevent stale response attachment and preserve state
  const problemCacheRef = useRef<Record<string, ProblemCacheEntry>>({});
  const lastProblemIdRef = useRef<string>(problemId);

  // Active abort controller for in-flight cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // AI Service configuration status
  const serviceStatus = getAiServiceStatus();

  // Scroll to bottom helper using container scrollTop directly
  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'auto') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    userHasScrolledUpRef.current = false;
    setShowJumpToBottom(false);
    isProgrammaticScrollRef.current = true;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const effectiveBehavior = prefersReducedMotion ? 'auto' : behavior;

    if (effectiveBehavior === 'auto') {
      container.scrollTop = container.scrollHeight;
      lastScrollTopRef.current = container.scrollTop;
    } else {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // Handle user scroll events to update tracking
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      lastScrollTopRef.current = container.scrollTop;
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceToBottom <= 80;

    if (atBottom) {
      userHasScrolledUpRef.current = false;
      setShowJumpToBottom(false);
    } else {
      // User has manually scrolled up away from bottom
      if (scrollTop < lastScrollTopRef.current && scrollHeight > clientHeight) {
        userHasScrolledUpRef.current = true;
        setShowJumpToBottom(true);
      }
    }

    lastScrollTopRef.current = scrollTop;
  }, []);

  // Synchronous layout scroll when messages, loading state, or viewport layout changes
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (!userHasScrolledUpRef.current) {
      isProgrammaticScrollRef.current = true;
      container.scrollTop = container.scrollHeight;
      lastScrollTopRef.current = container.scrollTop;
    }
  }, [messages, isLoading, isMobile]);

  // Robust height change observer on message content wrapper
  // Automatically follows Markdown rendering, code block expansion, and streaming reflows
  useLayoutEffect(() => {
    const contentEl = messagesContentRef.current;
    if (!contentEl) return;

    const resizeObserver = new ResizeObserver(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      if (!userHasScrolledUpRef.current) {
        isProgrammaticScrollRef.current = true;
        container.scrollTop = container.scrollHeight;
        lastScrollTopRef.current = container.scrollTop;
      }
    });

    resizeObserver.observe(contentEl);
    return () => {
      resizeObserver.disconnect();
    };
  }, [isMobile]);

  // 1. Problem Isolation: Handle problem switching cleanly without leaking state or position
  useEffect(() => {
    if (lastProblemIdRef.current !== problemId) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsLoading(false);

      const cached = problemCacheRef.current[problemId];
      if (cached) {
        setMessages(cached.messages);
      } else {
        setMessages([]);
      }

      setInputText('');
      setShowResetConfirm(false);
      lastProblemIdRef.current = problemId;
      userHasScrolledUpRef.current = false;
      setShowJumpToBottom(false);

      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      });
    }
  }, [problemId]);

  // Synchronize per-problem cache
  useEffect(() => {
    problemCacheRef.current[problemId] = {
      messages,
    };
  }, [problemId, messages]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Save drawer width
  const handleWidthChange = useCallback((newWidth: number) => {
    const clamped = Math.max(MIN_DRAWER_WIDTH, Math.min(MAX_DRAWER_WIDTH, newWidth));
    setDrawerWidth(clamped);
    try {
      localStorage.setItem(STORAGE_WIDTH_KEY, clamped.toString());
    } catch {
      // quota or blocked
    }
  }, []);

  // Desktop drag resize handler
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = drawerWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      handleWidthChange(startWidth + deltaX);
      window.dispatchEvent(new Event('resize'));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Core Dispatch Engine (Unified Riva Assistant)
  const dispatchAiQuery = async ({
    textToSend,
    actionType = 'custom',
    forcedIncludeCode,
    isRetry = false,
  }: {
    textToSend?: string;
    actionType?: AiAssistantRequest['actionType'];
    forcedIncludeCode?: boolean;
    isRetry?: boolean;
  }) => {
    const rawQuery = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!rawQuery || isLoading) return;

    // Automatic code relevance detection (unless explicitly forced by suggestion chips)
    const shouldAttachCode =
      forcedIncludeCode !== undefined ? forcedIncludeCode : isCodeContextRelevant(rawQuery, code);

    const codeLines = code.split('\n').length;

    // Only create a new user bubble if this is NOT an in-place retry
    if (!isRetry) {
      const userMessageId = `msg-user-${Date.now()}`;
      const newUserMessage: AiChatMessage = {
        id: userMessageId,
        sender: 'user',
        content: rawQuery,
        timestamp: Date.now(),
        mode: 'chat',
        actionType,
        contextSnapshot: {
          problemId: problemVerniqId || problemId,
          problemTitle,
          language: shouldAttachCode ? language : undefined,
          codeShared: shouldAttachCode,
          codeLineCount: shouldAttachCode ? codeLines : undefined,
        },
      };

      setMessages((prev) => [...prev, newUserMessage]);

      // Bring user message into view immediately
      userHasScrolledUpRef.current = false;
      setShowJumpToBottom(false);
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
    }

    setInputText('');
    setIsLoading(true);

    // Keep active exchange visible when Riva begins responding
    if (!userHasScrolledUpRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });
    }

    // Abort controller for cancellation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Prepare bounded conversation history
    const historyPayload = messages
      .filter((m) => !m.isError)
      .slice(-6)
      .map((m) => ({
        role: m.sender,
        content: m.content,
      }));

    const req: AiAssistantRequest = {
      problemId,
      problemVerniqId,
      problemTitle,
      problemDifficulty,
      problemStatement: isDraftProblem
        ? `[CATALOG DRAFT] ${problemStatement || 'Problem statement quarantined pending verification.'}`
        : problemStatement,
      constraints,
      sampleExamples: sampleExamples?.slice(0, 3),
      language: shouldAttachCode ? language : undefined,
      code: shouldAttachCode ? code : undefined,
      userMessage: rawQuery,
      mode: 'chat',
      actionType,
      history: historyPayload,
      isDraftProblem,
    };

    const res = await sendAiQuery(req, controller.signal);

    // Guard against stale response if user cancelled or switched problems
    if (controller.signal.aborted || lastProblemIdRef.current !== problemId) {
      setIsLoading(false);
      return;
    }

    const assistantMessageId = `msg-ai-${Date.now()}`;

    if (res.success && res.reply) {
      const assistantMessage: AiChatMessage = {
        id: assistantMessageId,
        sender: 'assistant',
        content: res.reply,
        timestamp: Date.now(),
        mode: 'chat',
        actionType,
        tokensUsed: res.tokensUsed,
        promptTokens: res.promptTokens,
        completionTokens: res.completionTokens,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Ensure latest response is visible without manual scrolling
      if (!userHasScrolledUpRef.current) {
        requestAnimationFrame(() => {
          scrollToBottom('auto');
        });
      }
    } else {
      const errorMessage: AiChatMessage = {
        id: assistantMessageId,
        sender: 'assistant',
        content: res.error || 'The assistant encountered an unexpected failure.',
        timestamp: Date.now(),
        mode: 'chat',
        isError: true,
        canRetry: true,
        actionType,
      };

      setMessages((prev) => [...prev, errorMessage]);

      if (!userHasScrolledUpRef.current) {
        requestAnimationFrame(() => {
          scrollToBottom('auto');
        });
      }
    }

    setIsLoading(false);
    abortControllerRef.current = null;
  };

  // Trigger from user input
  const handleSendMessage = (textToSend?: string) => {
    if (isLoading) return;
    dispatchAiQuery({
      textToSend,
      actionType: 'custom',
    });
  };

  // Stop/Cancel active in-flight generation
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Reset active conversation
  const handleResetConversation = () => {
    if (messages.length === 0) return;
    setShowResetConfirm(true);
  };

  const confirmResetConversation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    problemCacheRef.current[problemId] = { messages: [] };
    setIsLoading(false);
    setShowResetConfirm(false);
    userHasScrolledUpRef.current = false;
    setShowJumpToBottom(false);

    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    });
  };

  // Clean Retry: replaces the failed error message without duplicating the user turn
  const handleRetryLast = () => {
    if (isLoading) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
    if (!lastUserMsg) return;

    // Remove the failed error message
    setMessages((prev) => prev.filter((m) => !m.isError));

    dispatchAiQuery({
      textToSend: lastUserMsg.content,
      actionType: lastUserMsg.actionType,
      forcedIncludeCode: lastUserMsg.contextSnapshot?.codeShared,
      isRetry: true,
    });
  };

  if (!isOpen) {
    return null;
  }

  const displayId = problemVerniqId
    ? problemVerniqId.replace(/^VRQ-/, 'CKR-')
    : `CKR-${problemId.slice(0, 6).toUpperCase()}`;

  const DrawerContent = (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-[#0B0F19] text-[#F3F4F6] relative select-text">
      {/* 1. Header with Riva Identity & Controls (Fixed-size flex child that does not shrink) */}
      <div className="flex items-center justify-between px-3.5 h-12 border-b border-[#1C2230] bg-[#0B0F19] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <RivaAvatar
            size={30}
            state={isLoading ? 'thinking' : serviceStatus.isConfigured ? 'idle' : 'offline'}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-sm text-[#F3F4F6] tracking-tight">Riva</span>
              {isLoading ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-ping" />
                  <span>Thinking...</span>
                </span>
              ) : serviceStatus.isConfigured ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#00B8A3]/10 text-[#00B8A3] border border-[#00B8A3]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B8A3]" />
                  <span>Live</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FFC01E]/10 text-[#FFC01E] border border-[#FFC01E]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC01E]" />
                  <span>Offline</span>
                </span>
              )}

              {isDraftProblem && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40 truncate">
                  Draft
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-[#94A3B8] truncate">
              {problemTitle || displayId}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleResetConversation}
              disabled={isLoading}
              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-[#111521] border border-transparent hover:border-[#1C2230] transition-colors disabled:opacity-50 cursor-pointer"
              title="New Conversation"
              aria-label="Start new conversation with Riva"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F3F4F6] hover:bg-[#111521] border border-transparent hover:border-[#1C2230] transition-colors cursor-pointer"
            title="Close Riva (Esc)"
            aria-label="Close Riva side panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Conversation Region (flex: 1; min-height: 0; overflow-y: auto) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3.5 text-[13px] sm:text-sm font-sans relative"
      >
        <div ref={messagesContentRef} className="space-y-3">
          {/* Compact Integrated Empty State (hidden once messages exist) */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-8 px-4 my-auto space-y-3">
              <div className="w-9 h-9 rounded-full bg-[#111521] border border-[#1C2230] flex items-center justify-center">
                <RivaAvatar
                  size={24}
                  state={isLoading ? 'thinking' : serviceStatus.isConfigured ? 'idle' : 'offline'}
                  showHalo={false}
                />
              </div>

              <div className="space-y-1 max-w-xs">
                <h3 className="font-sans font-semibold text-sm text-[#F3F4F6] tracking-tight">
                  What are we working on?
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Ask about your code, debugging, algorithms, or this problem.
                </p>
              </div>

              {/* Compact Inline Suggestion Chips */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 max-w-sm">
                <button
                  type="button"
                  onClick={() =>
                    dispatchAiQuery({
                      textToSend: `Review my current ${language.toUpperCase()} implementation for ${problemTitle}. Identify potential invariant violations, off-by-one bounds, or logical flaws.`,
                      actionType: 'review',
                      forcedIncludeCode: true,
                    })
                  }
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-[#111521] hover:bg-[#161D2B] text-[#94A3B8] hover:text-[#22D3EE] border border-[#1C2230] hover:border-[#22D3EE]/30 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-[#00B8A3]" />
                  <span>Review my code</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    dispatchAiQuery({
                      textToSend: `Give me a progressive hint for ${problemTitle} to guide my thinking without giving away the full solution.`,
                      actionType: 'hint',
                      forcedIncludeCode: false,
                    })
                  }
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-[#111521] hover:bg-[#161D2B] text-[#94A3B8] hover:text-[#FFC01E] border border-[#1C2230] hover:border-[#FFC01E]/30 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#FFC01E]" />
                  <span>Give me a hint</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    dispatchAiQuery({
                      textToSend: `Guide me through formulating an approach and analyzing edge cases for ${problemTitle}.`,
                      actionType: 'approach',
                      forcedIncludeCode: false,
                    })
                  }
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-[#111521] hover:bg-[#161D2B] text-[#94A3B8] hover:text-[#22D3EE] border border-[#1C2230] hover:border-[#22D3EE]/30 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>Explain the approach</span>
                </button>
              </div>
            </div>
          )}

          {/* Message Thread */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col space-y-1 group",
                msg.sender === 'user' ? "items-end" : "items-start w-full"
              )}
            >
              {/* Sender / Meta row (No visible token counters) */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#94A3B8] px-1">
                {msg.sender === 'assistant' ? (
                  <>
                    <RivaAvatar size="xs" state={msg.isError ? 'error' : 'idle'} showHalo={false} />
                    <span className="text-[#F3F4F6] font-semibold">Riva</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·
                    </span>
                    <span className="text-[#94A3B8]">You</span>
                    {msg.contextSnapshot?.codeShared && (
                      <>
                        <span>·</span>
                        <span className="text-[#22D3EE] flex items-center gap-0.5">
                          <Code2 className="w-2.5 h-2.5" />
                          {msg.contextSnapshot.language?.toUpperCase()} ({msg.contextSnapshot.codeLineCount}L)
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Bubble Content */}
              <div
                className={cn(
                  "rounded-lg text-[13px] sm:text-sm leading-[1.5] break-words",
                  msg.sender === 'user'
                    ? "bg-[#161D2B] text-[#F3F4F6] border border-[#232F46] px-3.5 py-2 max-w-[85%] whitespace-pre-wrap"
                    : msg.isError
                    ? "bg-[#FB4765]/10 text-[#FB4765] border border-[#FB4765]/30 p-3 sm:p-3.5 w-full"
                    : "bg-[#111521] text-[#F3F4F6] border border-[#1C2230] p-3 sm:p-3.5 w-full"
                )}
              >
                {msg.sender === 'user' ? (
                  <div>{msg.content}</div>
                ) : (
                  <SafeMarkdownRenderer content={msg.content} />
                )}

                {/* Actionable Error Banner with Clean Retry */}
                {msg.isError && msg.canRetry && (
                  <div className="pt-2 mt-2 border-t border-[#FB4765]/20 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#FB4765] flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Service notice
                    </span>
                    <button
                      type="button"
                      onClick={handleRetryLast}
                      disabled={isLoading}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono bg-[#FB4765]/20 hover:bg-[#FB4765]/30 text-[#FB4765] border border-[#FB4765]/40 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading in-flight indicator */}
          {isLoading && (
            <div className="flex flex-col items-start space-y-1.5 w-full">
              <div className="text-[10px] font-mono text-[#94A3B8] px-1 flex items-center gap-2">
                <RivaAvatar size="xs" state="thinking" showHalo={false} />
                <span className="text-[#F3F4F6] font-semibold">Riva</span>
                <span>·</span>
                <span className="text-[#22D3EE]">Thinking...</span>
              </div>
              <div className="p-3 rounded-lg bg-[#111521] border border-[#1C2230] text-xs text-[#94A3B8] flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#22D3EE]" />
                  <span className="font-mono text-[11px] text-[#F3F4F6]">
                    Generating response...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelGeneration}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-[#161D2B] hover:bg-[#1C2230] text-[#FB4765] border border-[#FB4765]/30 transition-colors cursor-pointer"
                  title="Cancel generation"
                >
                  <Square className="w-2.5 h-2.5 fill-current text-[#FB4765]" />
                  <span>Stop</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sentinel div for layout boundary anchor */}
        <div ref={messagesEndRef} className="h-px w-full shrink-0 pointer-events-none" />
      </div>

      {/* Floating Jump-to-Latest Button */}
      {showJumpToBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-20 right-5 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161F33] hover:bg-[#1E2B47] text-[#22D3EE] border border-[#22D3EE]/30 shadow-xl text-xs font-mono transition-all animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
          aria-label="Jump to latest message"
        >
          <span>Latest</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 3. Anchored Composer (Fixed-size flex child that does not shrink, outside the conversation scroll region) */}
      <div className="p-3 border-t border-[#1C2230] bg-[#0B0F19] shrink-0 space-y-2">
        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask Riva about invariants, bugs, approaches, or code..."
            disabled={isLoading}
            rows={2}
            className="w-full p-2.5 rounded-lg border border-[#1C2230] bg-[#08090B] text-[13px] font-mono text-[#F3F4F6] placeholder-zinc-500 focus:outline-none focus:border-[#22D3EE]/50 max-h-[120px] min-h-[44px] resize-none leading-relaxed disabled:opacity-50"
          />
        </div>

        {/* Composer Footer: char count & send action */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
          <span className="text-[10px] text-zinc-500">
            {inputText.length}/2000 chars · Enter to send
          </span>

          <div className="flex items-center gap-1.5">
            {isLoading ? (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-[#111521] hover:bg-[#1C2230] text-[#FB4765] border border-[#FB4765]/30 transition-colors cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current text-[#FB4765]" />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer",
                  inputText.trim()
                    ? "bg-[#22D3EE] hover:bg-[#06B6D4] text-[#08090B] font-semibold shadow-xs"
                    : "bg-[#111521] text-zinc-500 border border-[#1C2230] cursor-not-allowed"
                )}
              >
                <span>Send</span>
                <Send className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Modal: Reset Conversation */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0B0F19] border border-[#1C2230] rounded-xl max-w-xs w-full p-4 shadow-2xl space-y-3 text-left">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FB4765]/10 border border-[#FB4765]/20 flex items-center justify-center shrink-0 text-[#FB4765]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-[#F3F4F6]">
                  Start New Conversation?
                </h4>
                <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
                  Your conversation history for this problem will be cleared. (Editor code is preserved).
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C2230]">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2.5 py-1 rounded text-xs font-mono text-[#94A3B8] hover:text-[#F3F4F6] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetConversation}
                className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-[#FB4765]/20 hover:bg-[#FB4765]/30 text-[#FB4765] border border-[#FB4765]/40 transition-colors cursor-pointer"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Responsive single-instance drawer (ensures refs always point to the single visible container)
  if (isMobile) {
    return (
      <div
        data-testid="mobile-riva-drawer"
        className="fixed inset-0 z-50 bg-[#08090B] flex flex-col min-h-0 overflow-hidden"
      >
        {DrawerContent}
      </div>
    );
  }

  return (
    <div
      data-testid="desktop-riva-drawer"
      style={{ width: `${drawerWidth}px` }}
      className={cn(
        "flex flex-col h-full min-h-0 border-l border-[#1C2230] shrink-0 relative overflow-hidden transition-none z-20",
        isResizing ? "select-none" : ""
      )}
    >
      {/* Drag handle on left border */}
      <div
        onMouseDown={handleMouseDownResize}
        onDoubleClick={() => handleWidthChange(DEFAULT_DRAWER_WIDTH)}
        className={cn(
          "absolute top-0 bottom-0 -left-1 w-2 hover:w-2.5 cursor-col-resize transition-all z-30 group flex items-center justify-center",
          isResizing ? "bg-cyan-500/40" : "bg-transparent hover:bg-cyan-500/30"
        )}
        title="Drag to resize Riva (double-click to reset)"
      >
        <div
          className={cn(
            "w-0.5 h-8 rounded-full transition-colors",
            isResizing ? "bg-cyan-400" : "bg-transparent group-hover:bg-cyan-400"
          )}
        />
      </div>

      {DrawerContent}
    </div>
  );
};
