import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/actions/Button';
import { useToast } from '@/components/ui/feedback/Toast';
import { supabase } from '@/lib/supabaseClient';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Download,
  FolderOpen,
  Share2,
  Trash2,
  Code2,
  Plus,
  X,
  Clock,
  HardDrive,
  CheckCircle2,
  FileCode2,
  Terminal,
  Loader2,
  AlertTriangle,
  Bookmark,
  RefreshCw,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { MonacoCodeEditor } from '@/components/editor/MonacoCodeEditor';
import { runCode } from '@/lib/submissionService';
import { useSubmissionRealtime } from '@/hooks/useSubmissionRealtime';
import { useAuth } from '@/hooks/useAuth';
import { ProgrammingLanguage } from '@/types';
import {
  getLocalIdeState,
  saveLocalIdeState,
  ScratchTab,
} from '@/lib/ideDraftService';
import { CodeSpaceNavTabs } from '@/features/codespace/components/CodeSpaceNavTabs';
import {
  CODESPACE_LANGUAGES,
  QUICK_STARTER_TEMPLATES,
  getLanguageSpec,
} from '@/features/codespace/data/codespaceTemplates';

export type { ScratchTab };
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export const StandaloneIdeView: React.FC = () => {
  const { toast } = useToast();
  const { user, preferredLanguage, updatePreferredLanguage } = useAuth();
  const location = useLocation();

  const [tabs, setTabs] = useState<ScratchTab[]>(() => {
    const savedState = getLocalIdeState(user?.id);
    if (savedState && savedState.tabs.length > 0) {
      return savedState.tabs;
    }
    const defaultLang = preferredLanguage || 'java';
    const langSpec = getLanguageSpec(defaultLang);
    return [
      {
        id: 'tab-1',
        title: `Main.${langSpec.ext}`,
        language: langSpec.id,
        code: langSpec.defaultTemplate,
        stdin: 'Hello World 42',
      },
      {
        id: 'tab-2',
        title: 'scratch.py',
        language: 'python',
        code: CODESPACE_LANGUAGES.python.defaultTemplate,
        stdin: 'Python Stdin Stream',
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedState = getLocalIdeState(user?.id);
    if (savedState && savedState.activeTabId) {
      return savedState.activeTabId;
    }
    return 'tab-1';
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [loadedCodespaceId, setLoadedCodespaceId] = useState<string | null>(null);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [isSavingVault, setIsSavingVault] = useState(false);

  const revisionRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tabsRef = useRef<ScratchTab[]>(tabs);
  const activeTabIdRef = useRef<string>(activeTabId);
  const userIdRef = useRef<string | undefined>(user?.id);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tabsRef.current = tabs;
    activeTabIdRef.current = activeTabId;
  }, [tabs, activeTabId]);

  useEffect(() => {
    userIdRef.current = user?.id;
    if (user?.id) {
      saveLocalIdeState(user.id, tabsRef.current, activeTabIdRef.current, ++revisionRef.current);
    }
  }, [user?.id]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setTemplateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const triggerAutosave = useCallback(
    (updatedTabs: ScratchTab[], activeId: string, immediate: boolean = false) => {
      tabsRef.current = updatedTabs;
      activeTabIdRef.current = activeId;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const nextRev = ++revisionRef.current;

      if (immediate) {
        setSaveStatus('saving');
        const ok = saveLocalIdeState(userIdRef.current, updatedTabs, activeId, nextRev);
        setSaveStatus(ok ? 'saved' : 'error');
        return;
      }

      setSaveStatus('unsaved');
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        setSaveStatus('saving');
        const ok = saveLocalIdeState(userIdRef.current, updatedTabs, activeId, nextRev);
        setSaveStatus(ok ? 'saved' : 'error');
      }, 500);
    },
    []
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      saveLocalIdeState(
        userIdRef.current,
        tabsRef.current,
        activeTabIdRef.current,
        ++revisionRef.current
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      saveLocalIdeState(
        userIdRef.current,
        tabsRef.current,
        activeTabIdRef.current,
        ++revisionRef.current
      );
    };
  }, []);

  // Handle incoming codespace snippet or template from route state
  useEffect(() => {
    const stateData = location.state as {
      code?: string;
      language?: string;
      title?: string;
      stdin?: string;
      codespaceId?: string;
    } | null;

    if (stateData && stateData.code !== undefined) {
      const lang = stateData.language || 'java';
      const title = stateData.title || 'Snippet';
      setLoadedCodespaceId(stateData.codespaceId || null);
      setTabs((prev) => {
        const nextTabs = [
          {
            id: 'tab-codespace',
            title,
            language: lang,
            code: stateData.code || '',
            stdin: stateData.stdin || '',
          },
          ...prev.filter((t) => t.id !== 'tab-codespace'),
        ];
        triggerAutosave(nextTabs, 'tab-codespace', true);
        return nextTabs;
      });
      setActiveTabId('tab-codespace');
      toast({
        type: 'info',
        title: stateData.codespaceId ? 'Vault Snippet Loaded' : 'Template Loaded',
        message: `Opened "${title}" in CodeSpace Studio.`,
      });
    }
  }, [location.state, triggerAutosave, toast]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const { submission: liveSubmission } = useSubmissionRealtime(activeSubmissionId);

  const [executionResult, setExecutionResult] = useState<{
    status: 'idle' | 'running' | 'success' | 'ce' | 're';
    stdout: string;
    runtimeMs: number;
    memoryKb: number;
  }>({
    status: 'idle',
    stdout: '',
    runtimeMs: 0,
    memoryKb: 0,
  });

  useEffect(() => {
    if (liveSubmission) {
      if (liveSubmission.verdict === 'pending' || liveSubmission.verdict === 'running') {
        setIsExecuting(true);
        setExecutionResult({
          status: 'running',
          stdout:
            liveSubmission.verdict === 'pending'
              ? 'Submitting job to judge queue...\nWaiting for isolated execution container...'
              : 'Compiling code in isolated container...\nEvaluating standard stream...',
          runtimeMs: 0,
          memoryKb: 0,
        });
      } else {
        setIsExecuting(false);
        const isSuccess = liveSubmission.verdict === 'accepted';
        let fullOutput = liveSubmission.stdout_output || '';
        if (liveSubmission.stderr_output) {
          fullOutput +=
            (fullOutput ? '\n\n' : '') + '[STDERR / DIAGNOSTICS]\n' + liveSubmission.stderr_output;
        }
        if (liveSubmission.compile_output) {
          fullOutput +=
            (fullOutput ? '\n\n' : '') + '[COMPILATION OUTPUT]\n' + liveSubmission.compile_output;
        }
        setExecutionResult({
          status: isSuccess
            ? 'success'
            : liveSubmission.verdict === 'compilation_error'
            ? 'ce'
            : 're',
          stdout: fullOutput || 'Program execution completed with no output.',
          runtimeMs: liveSubmission.runtime_ms,
          memoryKb: liveSubmission.memory_kb,
        });
      }
    }
  }, [liveSubmission]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const lineCount = useMemo(() => activeTab.code.split('\n').length, [activeTab.code]);
  const activeLangSpec = useMemo(
    () => getLanguageSpec(activeTab.language),
    [activeTab.language]
  );

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    triggerAutosave(tabsRef.current, tabId, true);
  };

  const retrySave = () => {
    triggerAutosave(tabsRef.current, activeTabIdRef.current, true);
  };

  const updateActiveTabCode = (newCode: string) => {
    setTabs((prev) => {
      const updated = prev.map((t) => (t.id === activeTab.id ? { ...t, code: newCode } : t));
      triggerAutosave(updated, activeTab.id, false);
      return updated;
    });
  };

  const updateActiveTabStdin = (newStdin: string) => {
    setTabs((prev) => {
      const updated = prev.map((t) => (t.id === activeTab.id ? { ...t, stdin: newStdin } : t));
      triggerAutosave(updated, activeTab.id, false);
      return updated;
    });
  };

  const commitRenameTab = (tabId: string) => {
    const clean = renameDraft.trim();
    setRenamingTabId(null);
    if (!clean) return;
    setTabs((prev) => {
      const updated = prev.map((t) => (t.id === tabId ? { ...t, title: clean } : t));
      triggerAutosave(updated, activeTabIdRef.current, true);
      return updated;
    });
  };

  const handleLanguageChange = (newLang: string) => {
    updatePreferredLanguage(newLang);
    const nextSpec = getLanguageSpec(newLang);
    setTabs((prev) => {
      const updated = prev.map((t) => {
        if (t.id === activeTab.id) {
          return {
            ...t,
            language: newLang,
            code: nextSpec.defaultTemplate || t.code,
          };
        }
        return t;
      });
      triggerAutosave(updated, activeTab.id, true);
      return updated;
    });
  };

  const handleAddTab = (preset?: {
    title: string;
    language: string;
    code: string;
    stdin: string;
  }) => {
    const nextIdx = tabs.length + 1;
    const newId = `tab-${Date.now()}`;
    const newTab: ScratchTab = preset
      ? {
          id: newId,
          title: preset.title,
          language: preset.language,
          code: preset.code,
          stdin: preset.stdin,
        }
      : {
          id: newId,
          title: `scratch-${nextIdx}.cpp`,
          language: 'cpp',
          code: CODESPACE_LANGUAGES.cpp.defaultTemplate,
          stdin: '',
        };
    const nextTabs = [...tabs, newTab];
    setTabs(nextTabs);
    setActiveTabId(newId);
    setTemplateMenuOpen(false);
    triggerAutosave(nextTabs, newId, true);
  };

  const handleCloseTab = (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const nextTabs = tabs.filter((t) => t.id !== idToClose);
    const nextActiveId = activeTabId === idToClose ? nextTabs[0].id : activeTabId;
    setTabs(nextTabs);
    if (activeTabId === idToClose) {
      setActiveTabId(nextActiveId);
    }
    triggerAutosave(nextTabs, nextActiveId, true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeTab.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleCopyInput = () => {
    navigator.clipboard.writeText(activeTab.stdin);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 1800);
  };

  const handleResetCode = () => {
    const template = getLanguageSpec(activeTab.language).defaultTemplate;
    if (template) {
      updateActiveTabCode(template);
      toast({
        type: 'info',
        title: 'Buffer Reset',
        message: `Restored clean ${activeLangSpec.label} template.`,
      });
    }
  };

  const handleFormatCode = () => {
    const lines = activeTab.code.split('\n');
    let indent = 0;
    const formatted = lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
          indent = Math.max(0, indent - 1);
        }
        const indentedLine = '    '.repeat(indent) + trimmed;
        if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
          indent++;
        }
        return indentedLine;
      })
      .join('\n');

    updateActiveTabCode(formatted);
    toast({
      type: 'success',
      title: 'Formatted',
      message: 'Indentation normalized to 4 spaces.',
    });
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setExecutionResult({
      status: 'running',
      stdout: 'Compiling code in isolated remote container...\nEvaluating stdin stream...',
      runtimeMs: 0,
      memoryKb: 0,
    });

    try {
      const res = await runCode(
        activeTab.code,
        activeTab.language as ProgrammingLanguage,
        activeTab.stdin
      );
      setActiveSubmissionId(res.submissionId);
    } catch (err) {
      setIsExecuting(false);
      setExecutionResult({
        status: 're',
        stdout: `Execution dispatch failed: ${String(err)}`,
        runtimeMs: 0,
        memoryKb: 0,
      });
    }
  };

  const handleDownloadCode = () => {
    const ext = activeLangSpec.ext || 'txt';
    const blob = new Blob([activeTab.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solution.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        updateActiveTabCode(content);
        toast({
          type: 'success',
          title: 'File Loaded',
          message: `Opened "${file.name}" into ${activeTab.title}.`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      type: 'success',
      title: 'Studio Link Copied',
      message: 'Copied current CodeSpace Studio route to clipboard.',
    });
  };

  const handleSaveToVault = async () => {
    if (!user) {
      toast({
        type: 'warning',
        title: 'Sign In Required',
        message: 'Sign in to sync snippets to your CodeSpace Vault.',
      });
      return;
    }

    setIsSavingVault(true);
    try {
      if (loadedCodespaceId && activeTab.id === 'tab-codespace') {
        const { error } = await supabase
          .from('user_codespaces')
          .update({
            title: activeTab.title,
            language: activeTab.language,
            code_buffer: activeTab.code,
            stdin_buffer: activeTab.stdin || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', loadedCodespaceId);
        if (error) throw error;
        toast({
          type: 'success',
          title: 'Vault Snippet Updated',
          message: `Synced changes for "${activeTab.title}" in CodeSpace Vault.`,
        });
      } else {
        const { data, error } = await supabase
          .from('user_codespaces')
          .insert({
            user_id: user.id,
            title: activeTab.title,
            language: activeTab.language,
            code_buffer: activeTab.code,
            stdin_buffer: activeTab.stdin || null,
            tags: ['studio'],
          })
          .select('id')
          .single();
        if (error) throw error;
        if (data?.id) {
          setLoadedCodespaceId(data.id);
        }
        toast({
          type: 'success',
          title: 'Saved to Vault',
          message: `"${activeTab.title}" committed to your CodeSpace Vault.`,
        });
      }
    } catch (err) {
      console.error('Failed to save to vault:', err);
      toast({
        type: 'error',
        title: 'Vault Save Failed',
        message: 'Could not commit scratchpad to cloud storage.',
      });
    } finally {
      setIsSavingVault(false);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-[#08090C] text-zinc-100 transition-all duration-150',
        isFullscreen
          ? 'fixed inset-0 z-modal'
          : 'min-h-[calc(100vh-3.5rem)] border-t border-[#171D2D]'
      )}
    >
      {/* 1. UNIFIED WORKSPACE BAR & MULTI-TAB STRIP */}
      <div className="bg-[#0B0E16] border-b border-[#171D2D] px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 select-none">
        {/* Left: Workspace Switcher + Tab Strip */}
        <div className="flex items-center gap-3 min-w-0 overflow-x-auto no-scrollbar">
          <CodeSpaceNavTabs activeTab="studio" compact />

          <div className="h-5 w-px bg-[#171D2D] shrink-0 hidden sm:block" />

          <div className="flex items-center gap-1 min-w-0">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab.id;
              const isRenaming = renamingTabId === tab.id;
              const tabLang = getLanguageSpec(tab.language);

              return (
                <div
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  onDoubleClick={() => {
                    setRenamingTabId(tab.id);
                    setRenameDraft(tab.title);
                  }}
                  className={cn(
                    'h-8 px-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors text-xs font-mono shrink-0 border',
                    isActive
                      ? 'bg-[#152443] text-white border-blue-500/40 shadow-sm font-medium'
                      : 'bg-[#0F131D] text-zinc-400 border-[#181F30] hover:bg-[#141A29] hover:text-zinc-200'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', tabLang.dotClass)} />
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => commitRenameTab(tab.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRenameTab(tab.id);
                        if (e.key === 'Escape') setRenamingTabId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-24 bg-[#080B12] border border-blue-500/60 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                    />
                  ) : (
                    <span className="max-w-[130px] truncate">{tab.title}</span>
                  )}

                  {isActive && !isRenaming && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingTabId(tab.id);
                        setRenameDraft(tab.title);
                      }}
                      title="Rename tab"
                      className="p-0.5 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  )}

                  {tabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="p-0.5 rounded hover:bg-[#1E335E] text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      title="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add Blank Tab */}
            <button
              type="button"
              onClick={() => handleAddTab()}
              className="w-8 h-8 rounded-lg border border-[#181F30] hover:border-blue-500/40 bg-[#0F131D] hover:bg-[#152443] text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="New scratchpad tab"
              aria-label="New scratchpad tab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Blueprints + Language + Save Telemetry + Toolbar + Run CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
          {/* Quick Starter Blueprint Menu (Integrated with Toolbar Controls) */}
          <div className="relative shrink-0" ref={templateMenuRef}>
            <button
              type="button"
              onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
              className="h-8 px-2.5 rounded-lg border border-[#181F30] hover:border-blue-500/40 bg-[#0F131D] hover:bg-[#141A29] text-xs font-mono text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Insert starter blueprint tab"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Blueprints</span>
            </button>

            <AnimatePresence>
              {templateMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 z-40 w-72 rounded-xl border border-[#212B42] bg-[#0F131D] shadow-2xl p-1.5 space-y-1 text-left"
                >
                  <div className="px-2.5 py-1 text-xs font-medium text-zinc-400">
                    Open Starter Blueprint
                  </div>
                  {QUICK_STARTER_TEMPLATES.map((tpl) => {
                    const spec = getLanguageSpec(tpl.language);
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          handleAddTab({
                            title: `${tpl.id}.${spec.ext}`,
                            language: tpl.language,
                            code: tpl.code,
                            stdin: tpl.stdin,
                          })
                        }
                        className="w-full rounded-lg px-2.5 py-2 hover:bg-[#152443] transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-white">{tpl.title}</span>
                          <span className="text-xs font-mono text-blue-400">
                            {spec.shortLabel}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          {tpl.description}
                        </p>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <select
            aria-label="Target runtime language"
            value={activeTab.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="h-8 px-2.5 rounded-lg bg-[#0F131D] border border-[#181F30] text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500/60 cursor-pointer"
          >
            {Object.values(CODESPACE_LANGUAGES).map((val) => (
              <option key={val.id} value={val.id} className="bg-[#0F131D] text-zinc-200">
                {val.label}
              </option>
            ))}
          </select>

          <div
            id="autosave-status"
            className="flex items-center gap-1.5 text-xs font-mono px-2 select-none"
            aria-live="polite"
          >
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-zinc-400">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Unsaved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={retrySave}
                className="flex items-center gap-1 text-rose-400 hover:underline cursor-pointer"
                title="Save failed. Click to retry."
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Save failed</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetCode}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-[#181F30] flex items-center justify-center transition-colors cursor-pointer"
            title="Reset to boilerplate"
            aria-label="Reset to boilerplate"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFormatCode}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-[#181F30] flex items-center justify-center transition-colors cursor-pointer"
            title="Format indentation"
            aria-label="Format indentation"
          >
            <Code2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-[#181F30] flex items-center justify-center transition-colors cursor-pointer"
            title="Copy source buffer"
            aria-label="Copy source buffer"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleSaveToVault}
            disabled={isSavingVault}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#181F30] bg-[#0F131D] hover:bg-[#152443] hover:border-blue-500/40 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Save or update snippet in CodeSpace Vault"
          >
            <Bookmark className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">
              {isSavingVault ? 'Syncing...' : loadedCodespaceId ? 'Update Vault' : 'Save to Vault'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-[#181F30] flex items-center justify-center transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <Button
            onClick={handleRunCode}
            disabled={isExecuting}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 h-8 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-blue-400/30 shadow-sm cursor-pointer"
            title="Compile & Run Code (Ctrl + Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
          </Button>
        </div>
      </div>

      {/* 2. SPLIT WORKSPACE (8 Cols Monaco Editor / 4 Cols Stdin & Output) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT: MONACO CODE EDITOR */}
        <div className="lg:col-span-8 flex flex-col border-b lg:border-b-0 lg:border-r border-[#171D2D] bg-[#080B12] overflow-hidden min-h-[380px]">
          <div className="px-4 py-1.5 bg-[#0B0E16] border-b border-[#171D2D] flex items-center justify-between text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-zinc-200">{activeTab.title}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">{activeLangSpec.runtimeLabel}</span>
            </div>
            <span className="hidden sm:inline text-zinc-500">Ctrl + Enter to run</span>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <MonacoCodeEditor
              value={activeTab.code}
              onChange={updateActiveTabCode}
              language={activeTab.language}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
              onRunShortcut={handleRunCode}
            />
          </div>
        </div>

        {/* RIGHT: STDIN & EXECUTION CONSOLE */}
        <div className="lg:col-span-4 flex flex-col bg-[#0B0E16] divide-y divide-[#171D2D] overflow-hidden">
          {/* STDIN INPUT */}
          <div className="h-44 sm:h-52 flex flex-col p-3.5 bg-[#0B0E16] shrink-0">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Standard Input (stdin)</span>
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyInput}
                  className="w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
                  title="Copy Stdin"
                  aria-label="Copy Stdin"
                >
                  {copiedInput ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => updateActiveTabStdin('')}
                  className="w-7 h-7 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                  title="Clear Stdin"
                  aria-label="Clear Stdin"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              value={activeTab.stdin}
              onChange={(e) => updateActiveTabStdin(e.target.value)}
              placeholder="Provide standard input stream here..."
              aria-label="Standard input stream"
              className="flex-1 w-full bg-[#080B12] border border-[#181F30] focus:border-blue-500/60 text-zinc-200 placeholder-zinc-500 font-mono text-xs p-3.5 rounded-xl focus:outline-none resize-none leading-relaxed transition-colors"
            />
          </div>

          {/* STDOUT / STDERR CONSOLE */}
          <div className="flex-1 flex flex-col p-3.5 bg-[#0F131D] overflow-hidden min-h-[220px]">
            <div className="flex items-center justify-between pb-2.5 shrink-0 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Console Output</span>
                </span>

                {isExecuting ? (
                  <span className="text-xs font-mono font-medium text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Running Sandbox</span>
                  </span>
                ) : executionResult.status === 'success' ? (
                  <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Exit 0</span>
                  </span>
                ) : executionResult.status === 'ce' ? (
                  <span className="text-xs font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Compile Error</span>
                  </span>
                ) : executionResult.status === 're' ? (
                  <span className="text-xs font-mono font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Runtime Error</span>
                  </span>
                ) : null}
              </div>

              {executionResult.runtimeMs > 0 && (
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 tabular-nums">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <strong className="text-zinc-200">{executionResult.runtimeMs}</strong> ms
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-blue-400" />
                    <strong className="text-zinc-200">{executionResult.memoryKb}</strong> KB
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 bg-[#080B12] border border-[#181F30] rounded-xl p-3.5 font-mono text-xs text-zinc-200 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text">
              {executionResult.status === 'idle' && !isExecuting ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 space-y-1.5">
                  <Terminal className="w-5 h-5 text-zinc-500" />
                  <p className="text-xs font-medium text-zinc-200">Ready to Execute</p>
                  <p className="text-xs text-zinc-400">
                    Press <span className="text-blue-400 font-medium">Run Code</span> or{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-[#0F131D] border border-[#1B2234] text-xs font-mono text-zinc-300">
                      Ctrl+Enter
                    </kbd>{' '}
                    to evaluate.
                  </p>
                </div>
              ) : (
                <div className="text-zinc-200">{executionResult.stdout}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. STUDIO STATUS FOOTER BAR */}
      <div className="min-h-[36px] h-9 bg-[#08090C] border-t border-[#171D2D] px-4 text-xs text-zinc-400 font-mono flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3 tabular-nums text-xs">
          <span>UTF-8</span>
          <span className="text-zinc-600">•</span>
          <span>Spaces: 4</span>
          <span className="text-zinc-600">•</span>
          <span>
            Ln <strong className="text-zinc-200">{cursorPos.line}</strong>, Col{' '}
            <strong className="text-zinc-200">{cursorPos.col}</strong>
          </span>
          <span className="text-zinc-600">•</span>
          <span>{lineCount} lines</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleOpenFile}
            className="hidden"
            accept=".java,.cpp,.cc,.c,.py,.ts,.js,.go,.txt"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 px-2.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Open local source file"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCode}
            className="h-7 px-2.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download source file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="h-7 px-2.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Share studio URL"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};
