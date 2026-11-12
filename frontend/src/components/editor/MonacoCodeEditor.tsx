import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

export interface MonacoCodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language: string;
  height?: string;
  readOnly?: boolean;
  onCursorChange?: (line: number, col: number) => void;
  onRunShortcut?: () => void;
  className?: string;
}

// Normalize language identifier for Monaco
const normalizeMonacoLanguage = (lang: string): string => {
  const l = (lang || '').toLowerCase().trim();
  switch (l) {
    case 'c++':
    case 'cpp':
      return 'cpp';
    case 'py':
    case 'python':
    case 'python3':
      return 'python';
    case 'java':
      return 'java';
    case 'ts':
    case 'typescript':
      return 'typescript';
    case 'js':
    case 'javascript':
      return 'javascript';
    case 'go':
    case 'golang':
      return 'go';
    default:
      return 'plaintext';
  }
};

export const MonacoCodeEditor: React.FC<MonacoCodeEditorProps> = ({
  value,
  onChange,
  language,
  height = '100%',
  readOnly = false,
  onCursorChange,
  onRunShortcut,
  className,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define VERNIQ Obsidian Dark theme
    monaco.editor.defineTheme('verniq-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C678DD', fontStyle: 'bold' },
        { token: 'type', foreground: 'E5C07B' },
        { token: 'string', foreground: '98C379' },
        { token: 'number', foreground: 'D19A66' },
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'delimiter', foreground: 'ABB2BF' },
        { token: 'operator', foreground: '56B6C2' },
        { token: 'function', foreground: '61AFEF' },
        { token: 'variable', foreground: 'E06C75' },
      ],
      colors: {
        'editor.background': '#080B12',
        'editor.foreground': '#F3F6FF',
        'editor.lineHighlightBackground': '#111827',
        'editorCursor.foreground': '#60A5FA',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#94A3B8',
        'editor.selectionBackground': '#3B82F62E',
        'editor.inactiveSelectionBackground': '#3B82F618',
        'editorBracketMatch.background': '#3B82F626',
        'editorBracketMatch.border': '#3B82F680',
        'editorGutter.background': '#080B12',
      },
    });

    monaco.editor.setTheme('verniq-dark');

    // Track cursor movements
    if (onCursorChange) {
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange(e.position.lineNumber, e.position.column);
      });
    }

    // Ctrl+Enter / Cmd+Enter run code shortcut
    if (onRunShortcut) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRunShortcut();
      });
    }
  };

  return (
    <div className={className || 'w-full h-full min-h-[200px] overflow-hidden'}>
      <Editor
        height={height}
        language={normalizeMonacoLanguage(language)}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          readOnly,
          fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
          fontSize: 13,
          lineHeight: 21,
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          bracketPairColorization: { enabled: true },
          renderLineHighlight: 'all',
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          tabSize: 4,
          wordWrap: 'on',
          padding: { top: 12, bottom: 12 },
          folding: true,
          renderWhitespace: 'none',
          contextmenu: true,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
        loading={
          <div className="w-full h-full flex items-center justify-center bg-[#0E1117] text-text-muted font-mono text-xs">
            Loading Monaco Syntax Engine...
          </div>
        }
      />
    </div>
  );
};
