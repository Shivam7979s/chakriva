import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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

export type { ScratchTab };
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

const DEFAULT_TEMPLATES: Record<string, { label: string; ext: string; template: string }> = {
  java: {
    label: 'Java (OpenJDK 21)',
    ext: 'java',
    template: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("Hello, Chakriva Online IDE!");
        
        // Echo input from stdin
        if (scanner.hasNextLine()) {
            System.out.println("Input received: " + scanner.nextLine());
        }
    }
}`,
  },
  cpp: {
    label: 'C++ (GCC 14)',
    ext: 'cpp',
    template: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    cout << "Hello, Chakriva Online IDE (GCC 14)!" << "\\n";
    
    string inputLine;
    if (getline(cin, inputLine)) {
        cout << "Input received: " << inputLine << "\\n";
    }
    return 0;
}`,
  },
  python: {
    label: 'Python 3.12',
    ext: 'py',
    template: `import sys

def main():
    print("Hello, Chakriva Online IDE (Python 3.12)!")
    
    # Process standard input
    input_data = sys.stdin.read().strip()
    if input_data:
        print(f"Input received:\\n{input_data}")

if __name__ == "__main__":
    main()`,
  },
  typescript: {
    label: 'TypeScript 5.7',
    ext: 'ts',
    template: `function solve(input: string): void {
    console.log("Hello, Chakriva Online IDE (TypeScript)!");
    if (input.trim()) {
        const lines = input.trim().split("\\n");
        console.log(\`Processed \${lines.length} lines of input.\`);
        lines.forEach((l, i) => console.log(\`[\${i + 1}] \${l}\`));
    }
}

// Sample Stdin execution
const stdinInput = "Sample Test Input";
solve(stdinInput);`,
  },
  go: {
    label: 'Go 1.23',
    ext: 'go',
    template: `package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	fmt.Println("Hello, Chakriva Online IDE (Go 1.23)!")
	scanner := bufio.NewScanner(os.Stdin)
	if scanner.Scan() {
		fmt.Printf("Input received: %s\\n", scanner.Text())
	}
}`,
  },
};

export const StandaloneIdeView: React.FC = () => {
  const { toast } = useToast();
  const { user, preferredLanguage, updatePreferredLanguage } = useAuth();
  const location = useLocation();

  // Tab State with Zero-Latency Synchronous LocalStorage Restoration
  const [tabs, setTabs] = useState<ScratchTab[]>(() => {
    const savedState = getLocalIdeState(user?.id);
    if (savedState && savedState.tabs.length > 0) {
      return savedState.tabs;
    }
    const defaultLang = preferredLanguage || 'java';
    return [
      {
        id: 'tab-1',
        title: 'Code 1',
        language: defaultLang,
        code: (DEFAULT_TEMPLATES[defaultLang] || DEFAULT_TEMPLATES.java).template,
        stdin: 'Hello World 42',
      },
      {
        id: 'tab-2',
        title: 'Code 2',
        language: 'python',
        code: DEFAULT_TEMPLATES.python.template,
        stdin: 'Python Stdin Vector',
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

  // Monotonic revision and autosave refs
  const revisionRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tabsRef = useRef<ScratchTab[]>(tabs);
  const activeTabIdRef = useRef<string>(activeTabId);
  const userIdRef = useRef<string | undefined>(user?.id);

  // Keep refs in sync
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

  // Trigger autosave (debounced for rapid typing, immediate for structural changes)
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

  // Synchronously flush pending code on browser window beforeunload or pagehide
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

  // Handle incoming codespace snippet from route navigation
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
      const title = stateData.title || 'Code 1';
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
        title: 'CodeSpace Loaded',
        message: `Opened "${title}" from your cloud vault.`,
      });
    }
  }, [location.state, triggerAutosave, toast]);

  // Active Tab Derived
  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  // Editor and Console States
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Execution Output State
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

  // Sync Supabase Realtime updates into terminal
  useEffect(() => {
    if (liveSubmission) {
      if (liveSubmission.verdict === 'pending' || liveSubmission.verdict === 'running') {
        setIsExecuting(true);
        setExecutionResult({
          status: 'running',
          stdout:
            liveSubmission.verdict === 'pending'
              ? 'Submitting job to judge queue...\nWaiting for execution container worker...'
              : 'Compiling code in isolated remote container...\nEvaluating test stream...',
          runtimeMs: 0,
          memoryKb: 0,
        });
      } else {
        setIsExecuting(false);
        const isSuccess = liveSubmission.verdict === 'accepted';
        let fullOutput = liveSubmission.stdout_output || '';
        if (liveSubmission.stderr_output) {
          fullOutput += (fullOutput ? '\n\n' : '') + '[STDERR / DIAGNOSTICS]\n' + liveSubmission.stderr_output;
        }
        if (liveSubmission.compile_output) {
          fullOutput += (fullOutput ? '\n\n' : '') + '[COMPILATION OUTPUT]\n' + liveSubmission.compile_output;
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

  // Line count
  const lineCount = useMemo(() => {
    return activeTab.code.split('\n').length;
  }, [activeTab.code]);

  // Select tab
  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    triggerAutosave(tabsRef.current, tabId, true);
  };

  // Retry save
  const retrySave = () => {
    triggerAutosave(tabsRef.current, activeTabIdRef.current, true);
  };

  // Update active tab code
  const updateActiveTabCode = (newCode: string) => {
    setTabs((prev) => {
      const updated = prev.map((t) => (t.id === activeTab.id ? { ...t, code: newCode } : t));
      triggerAutosave(updated, activeTab.id, false);
      return updated;
    });
  };

  // Update active tab stdin
  const updateActiveTabStdin = (newStdin: string) => {
    setTabs((prev) => {
      const updated = prev.map((t) => (t.id === activeTab.id ? { ...t, stdin: newStdin } : t));
      triggerAutosave(updated, activeTab.id, false);
      return updated;
    });
  };

  // Change language
  const handleLanguageChange = (newLang: string) => {
    updatePreferredLanguage(newLang);
    setTabs((prev) => {
      const updated = prev.map((t) => {
        if (t.id === activeTab.id) {
          return {
            ...t,
            language: newLang,
            code: DEFAULT_TEMPLATES[newLang]?.template || t.code,
          };
        }
        return t;
      });
      triggerAutosave(updated, activeTab.id, true);
      return updated;
    });
  };

  // Add new tab
  const handleAddTab = () => {
    const nextIdx = tabs.length + 1;
    const newId = `tab-${Date.now()}`;
    const newTab: ScratchTab = {
      id: newId,
      title: `Code ${nextIdx}`,
      language: 'cpp',
      code: DEFAULT_TEMPLATES.cpp.template,
      stdin: '',
    };
    const nextTabs = [...tabs, newTab];
    setTabs(nextTabs);
    setActiveTabId(newId);
    triggerAutosave(nextTabs, newId, true);
  };

  // Close tab
  const handleCloseTab = (idToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Keep at least one tab
    const nextTabs = tabs.filter((t) => t.id !== idToClose);
    const nextActiveId = activeTabId === idToClose ? nextTabs[0].id : activeTabId;
    setTabs(nextTabs);
    if (activeTabId === idToClose) {
      setActiveTabId(nextActiveId);
    }
    triggerAutosave(nextTabs, nextActiveId, true);
  };


  // Copy Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeTab.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy Input
  const handleCopyInput = () => {
    navigator.clipboard.writeText(activeTab.stdin);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  // Reset Code
  const handleResetCode = () => {
    const template = DEFAULT_TEMPLATES[activeTab.language]?.template;
    if (template) {
      updateActiveTabCode(template);
      toast({
        type: 'info',
        title: 'Code Reset',
        message: `Restored default ${DEFAULT_TEMPLATES[activeTab.language].label} boilerplate.`,
      });
    }
  };

  // Format Code (lightweight indentation beautifier)
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
      message: 'Indentation standardized to 4 spaces.',
    });
  };

  // Run Code Execution via Isolated Judge Service
  const handleRunCode = async () => {
    setIsExecuting(true);
    setExecutionResult({
      status: 'running',
      stdout: 'Compiling code in isolated remote container...\nEvaluating test stream...',
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

  // Download code as file
  const handleDownloadCode = () => {
    const ext = DEFAULT_TEMPLATES[activeTab.language]?.ext || 'txt';
    const blob = new Blob([activeTab.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solution.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Open file from local disk
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

  // Share code snippet
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      type: 'success',
      title: 'Workspace Link Copied',
      message: 'Share this link with your peers or interview mentor.',
    });
  };

  // Save active scratchpad to CodeSpace Vault
  const handleSaveToVault = async () => {
    if (!user) {
      toast({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Sign in to commit scratchpads to your cloud CodeSpace vault.',
      });
      return;
    }
    try {
      const { error } = await supabase.from('user_codespaces').insert({
        user_id: user.id,
        title: activeTab.title,
        language: activeTab.language,
        code_buffer: activeTab.code,
        stdin_buffer: activeTab.stdin || null,
        tags: ['scratchpad'],
      });
      if (error) throw error;
      toast({
        type: 'success',
        title: 'Saved to CodeSpace',
        message: `"${activeTab.title}" committed to your personal vault.`,
      });
    } catch (err) {
      console.error('Failed to save to vault:', err);
      toast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not commit scratchpad to database.',
      });
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0B0D13] text-text-primary transition-all duration-150',
        isFullscreen
          ? 'fixed inset-0 z-modal'
          : 'min-h-[calc(100vh-3.5rem)] border-t border-white/[0.08]'
      )}
    >
      {/* ============================================================== */}
      {/* 1. WORKSPACE TOP BAR & MULTI-TAB STRIP */}
      {/* ============================================================== */}
      <div className="h-12 bg-[#12151E] border-b border-white/[0.08] px-3 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Tab Strip */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <div
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  'h-8 px-3 rounded-md flex items-center gap-2 cursor-pointer transition-colors text-xs font-mono group shrink-0 border',
                  isActive
                    ? 'bg-[#181C28] text-white border-white/[0.12] font-semibold shadow-xs'
                    : 'bg-transparent text-text-secondary border-transparent hover:bg-white/[0.03] hover:text-text-primary'
                )}
              >
                <FileCode2 className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : 'text-text-muted')} />
                <span>{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 rounded hover:bg-white/[0.1] text-text-muted hover:text-white transition-colors"
                    title="Close tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Tab Button */}
          <button
            onClick={handleAddTab}
            className="w-7 h-7 rounded-md border border-white/[0.06] hover:border-white/[0.12] bg-[#181C28] text-text-muted hover:text-white flex items-center justify-center transition-colors"
            title="Open new scratchpad tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Action Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Language Selector Dropdown */}
          <select
            value={activeTab.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="h-8 px-3 rounded-md bg-[#181C28] border border-white/[0.08] text-xs font-mono text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {Object.entries(DEFAULT_TEMPLATES).map(([key, val]) => (
              <option key={key} value={key} className="bg-[#181C28] text-white">
                {val.label}
              </option>
            ))}
          </select>

          {/* Autosave Status Indicator */}
          <div
            id="autosave-status"
            className="flex items-center gap-1.5 text-xs font-mono px-2 select-none"
            aria-live="polite"
          >
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-text-tertiary">
                <RefreshCw className="w-3 h-3 animate-spin text-primary" />
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
              <span className="flex items-center gap-1 text-text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Unsaved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={retrySave}
                className="flex items-center gap-1 text-[#FF375F] hover:underline cursor-pointer"
                title="Save failed. Click to retry."
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Save failed</span>
              </button>
            )}
          </div>

          {/* Reset Code */}
          <button
            onClick={handleResetCode}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            title="Reset to boilerplate"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Format / Beautify */}
          <button
            onClick={handleFormatCode}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            title="Format code (auto-indent)"
          >
            <Code2 className="w-4 h-4" />
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            title="Copy code"
          >
            {copiedCode ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Save to CodeSpace Vault */}
          <button
            onClick={handleSaveToVault}
            className="p-1.5 rounded-md text-neutral-400 hover:text-blue-400 hover:bg-white/[0.04] transition-colors"
            title="Commit to CodeSpace Vault"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* High-Contrast Primary Run Action */}
          <Button
            onClick={handleRunCode}
            disabled={isExecuting}
            size="sm"
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-1.5 rounded-md text-sm font-medium transition-all shadow-sm flex items-center gap-1.5"
            title="Compile & Run Code (Ctrl + Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SPLIT LAYOUT (65% Editor / 35% Input & Output Rails) */}
      {/* ============================================================== */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* ------------------------------------------------------------ */}
        {/* LEFT PANE: CODE EDITOR (65% / 8 cols) */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-8 flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#0E1117] overflow-hidden">
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

        {/* ------------------------------------------------------------ */}
        {/* RIGHT PANE: INPUT & OUTPUT RAILS (35% / 4 cols) */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-4 flex flex-col bg-[#12151E] divide-y divide-white/[0.08] overflow-hidden">
          {/* TOP BOX: INPUT (stdin) */}
          <div className="h-44 sm:h-52 flex flex-col p-3 bg-[#12151E] shrink-0">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                Input (stdin)
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyInput}
                  className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
                  title="Copy Stdin"
                >
                  {copiedInput ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => updateActiveTabStdin('')}
                  className="p-1 rounded text-neutral-400 hover:text-error transition-colors"
                  title="Clear Stdin"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              value={activeTab.stdin}
              onChange={(e) => updateActiveTabStdin(e.target.value)}
              placeholder="Provide program standard input here..."
              className="flex-1 w-full bg-[#181C28] border border-white/[0.08] text-neutral-200 font-mono text-xs sm:text-sm p-2.5 rounded-lg focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* BOTTOM BOX: OUTPUT (stdout / stderr) */}
          <div className="flex-1 flex flex-col p-3 bg-[#0E1117] overflow-hidden">
            <div className="flex items-center justify-between pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-[#00B8A3]" />
                  Output (stdout / stderr)
                </span>
                {isExecuting ? (
                  <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    Running in Sandbox
                  </span>
                ) : executionResult.status === 'success' ? (
                  <span className="text-[10px] font-mono font-bold text-[#00B8A3] bg-[#00B8A3]/10 border border-[#00B8A3]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Success (0)
                  </span>
                ) : executionResult.status === 'ce' ? (
                  <span className="text-[10px] font-mono font-bold text-[#F97316] bg-[#F97316]/10 border border-[#F97316]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Compilation Error
                  </span>
                ) : executionResult.status === 're' ? (
                  <span className="text-[10px] font-mono font-bold text-[#FF375F] bg-[#FF375F]/10 border border-[#FF375F]/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Runtime Error / TLE
                  </span>
                ) : null}
              </div>

              {/* Execution telemetry duration & memory */}
              {executionResult.runtimeMs > 0 && (
                <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-warning" />
                    <strong className="text-white">{executionResult.runtimeMs}</strong> ms
                  </span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-primary" />
                    <strong className="text-white">{executionResult.memoryKb}</strong> KB
                  </span>
                </div>
              )}
            </div>

            {/* Output terminal display */}
            <div className="flex-1 bg-[#12151E] border border-white/[0.08] rounded-lg p-3 font-mono text-xs sm:text-sm text-neutral-200 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text">
              {executionResult.status === 'idle' && !isExecuting ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 space-y-1">
                  <Terminal className="w-6 h-6 text-neutral-600 mb-1" />
                  <p className="text-xs">Ready to Run</p>
                  <p className="text-[11px] text-neutral-600">
                    Write your code and click <strong className="text-neutral-400">Run Code</strong> (Ctrl+Enter) to evaluate.
                  </p>
                </div>
              ) : (
                <div className="text-neutral-100">{executionResult.stdout}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. EDITOR STATUS FOOTER BAR */}
      {/* ============================================================== */}
      <div className="h-7 bg-[#0B0D13] border-t border-white/[0.08] px-4 text-[11px] text-neutral-400 font-mono flex items-center justify-between shrink-0 select-none">
        {/* Left Status info */}
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span className="text-neutral-600">•</span>
          <span>Spaces: 4</span>
          <span className="text-neutral-600">•</span>
          <span>
            Ln <strong className="text-neutral-300">{cursorPos.line}</strong>, Col{' '}
            <strong className="text-neutral-300">{cursorPos.col}</strong>
          </span>
          <span className="text-neutral-600">•</span>
          <span>{lineCount} lines</span>
        </div>

        {/* Right utility actions */}
        <div className="flex items-center gap-3">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleOpenFile}
            className="hidden"
            accept=".java,.cpp,.cc,.c,.py,.ts,.js,.go,.txt"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="hover:text-white transition-colors flex items-center gap-1"
            title="Open local source file"
          >
            <FolderOpen className="w-3 h-3" />
            <span>Open</span>
          </button>

          <button
            onClick={handleDownloadCode}
            className="hover:text-white transition-colors flex items-center gap-1"
            title="Download source code"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </button>

          <button
            onClick={handleShare}
            className="hover:text-white transition-colors flex items-center gap-1"
            title="Share workspace link"
          >
            <Share2 className="w-3 h-3" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};
