import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { SafeMarkdownRenderer } from './SafeMarkdownRenderer';
import { Link } from 'react-router-dom';
import { Save, Check, RefreshCw, Star, Edit3, Eye, Lock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProblemNotesTabProps {
  problemId: string;
  problemTitle: string;
}

export const ProblemNotesTab: React.FC<ProblemNotesTabProps> = ({ problemId, problemTitle }) => {
  const { user } = useAuth();
  const [noteId, setNoteId] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isStarred, setIsStarred] = useState<boolean>(false);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // References for debouncing, dirty state, and race-condition prevention
  const noteIdRef = useRef<string | null>(null);
  const contentRef = useRef<string>('');
  const isStarredRef = useRef<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);
  const saveReqCounterRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  noteIdRef.current = noteId;
  contentRef.current = content;
  isStarredRef.current = isStarred;

  const localKey = user && problemId ? `chakriva_note_${user.id}_${problemId}` : null;

  // Load existing note from Supabase (with fallback to local draft if offline)
  const loadNote = useCallback(async () => {
    if (!user || !isSupabaseConfigured() || !problemId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('id, markdown_content, is_starred, updated_at')
        .eq('problem_id', problemId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setNoteId(data.id);
        noteIdRef.current = data.id;
        setContent(data.markdown_content || '');
        setIsStarred(Boolean(data.is_starred));
        isDirtyRef.current = false;
        setSaveStatus('saved');
      } else {
        // Fallback to local draft if one exists
        if (localKey) {
          try {
            const raw = localStorage.getItem(localKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              setContent(parsed.content || '');
              setIsStarred(Boolean(parsed.isStarred));
            } else {
              setContent('');
              setIsStarred(false);
            }
          } catch {
            setContent('');
            setIsStarred(false);
          }
        }
        setNoteId(null);
        noteIdRef.current = null;
        isDirtyRef.current = false;
        setSaveStatus('saved');
      }
    } catch (err) {
      console.warn('Failed to load note from Supabase, checking local cache:', err);
      if (localKey) {
        try {
          const raw = localStorage.getItem(localKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            setContent(parsed.content || '');
            setIsStarred(Boolean(parsed.isStarred));
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, problemId, localKey]);

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  // Authoritative Save function matching public.user_notes schema (insert or update by id)
  const executeSave = useCallback(async (contentToSave: string, starredToSave: boolean) => {
    if (!user || !problemId) return;

    // Instant local backup
    if (localKey) {
      try {
        localStorage.setItem(localKey, JSON.stringify({ content: contentToSave, isStarred: starredToSave }));
      } catch {
        // quota exceeded or storage blocked
      }
    }

    const currentReqVersion = ++saveReqCounterRef.current;
    setSaveStatus('saving');
    setErrorMsg(null);

    try {
      const existingId = noteIdRef.current;
      const now = new Date().toISOString();

      if (existingId) {
        // Update existing note by primary key
        const { error } = await supabase
          .from('user_notes')
          .update({
            title: `${problemTitle} — Invariant Notes`,
            markdown_content: contentToSave,
            is_starred: starredToSave,
            updated_at: now,
          })
          .eq('id', existingId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new note and save generated UUID
        const { data, error } = await supabase
          .from('user_notes')
          .insert({
            user_id: user.id,
            problem_id: problemId,
            title: `${problemTitle} — Invariant Notes`,
            markdown_content: contentToSave,
            is_starred: starredToSave,
            updated_at: now,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) {
          setNoteId(data.id);
          noteIdRef.current = data.id;
        }
      }

      // Only mark as saved if no newer save request was initiated in parallel
      if (currentReqVersion === saveReqCounterRef.current) {
        isDirtyRef.current = false;
        setSaveStatus('saved');
      }
    } catch (err: unknown) {
      console.error('Failed to save note to Supabase:', err);
      if (currentReqVersion === saveReqCounterRef.current) {
        setSaveStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Save failed');
      }
    }
  }, [user, problemId, problemTitle, localKey]);

  // Debounced autosave trigger
  const triggerDebouncedSave = useCallback((newContent: string, newStarred: boolean) => {
    isDirtyRef.current = true;
    setSaveStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSave(newContent, newStarred);
    }, 1200);
  }, [executeSave]);

  // Flush unsaved changes on unmount or before switching
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (isDirtyRef.current && user && problemId) {
        executeSave(contentRef.current, isStarredRef.current);
      }
    };
  }, [executeSave, user, problemId]);

  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    triggerDebouncedSave(newVal, isStarred);
  };

  const handleToggleStar = () => {
    const nextStarred = !isStarred;
    setIsStarred(nextStarred);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    executeSave(content, nextStarred);
  };

  const handleManualSave = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    executeSave(content, isStarred);
  };

  if (!user) {
    return (
      <div className="p-6 text-center rounded-xl border border-[#1C2230] bg-[#0B0F19] space-y-3 my-4">
        <div className="w-9 h-9 rounded-lg bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center mx-auto text-cyan-400">
          <Lock className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">Private Notes Authentication</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Sign in to record and persist your private proof notes, edge-case reminders, and loop invariants across devices.
          </p>
        </div>
        <Link to="/login" className="inline-block pt-1">
          <button className="px-4 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#1D68FE] hover:bg-blue-600 text-white transition-colors shadow-sm">
            Sign In to Record Notes
          </button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-mono text-zinc-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        <span>Loading problem notes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 flex flex-col h-full text-left">
      {/* Notes Sub-Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1C2230] shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-[#0A0D14] p-0.5 rounded-lg border border-[#1C2230]">
          <button
            onClick={() => setMode('write')}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-colors",
              mode === 'write' ? "bg-[#111521] text-cyan-300 shadow-xs" : "text-zinc-400 hover:text-white"
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Write</span>
          </button>
          <button
            onClick={() => setMode('preview')}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-colors",
              mode === 'preview' ? "bg-[#111521] text-cyan-300 shadow-xs" : "text-zinc-400 hover:text-white"
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Autosave Status Badge */}
          <div className="text-[11px] font-mono flex items-center gap-1 select-none pr-1">
            {saveStatus === 'saving' && (
              <span className="text-zinc-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-[#00B8A3] flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Unsaved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={handleManualSave}
                className="text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                title="Save error. Click to retry."
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Retry save</span>
              </button>
            )}
          </div>

          {/* Star Note */}
          <button
            onClick={handleToggleStar}
            className={cn(
              "p-1.5 rounded-md border border-[#1C2230] bg-[#0A0D14] transition-colors",
              isStarred ? "text-[#FFC01E] border-amber-500/30 bg-amber-950/20" : "text-zinc-400 hover:text-white"
            )}
            title={isStarred ? "Starred note (click to unstar)" : "Mark note as starred"}
          >
            <Star className={cn("w-3.5 h-3.5", isStarred && "fill-[#FFC01E]")} />
          </button>

          {/* Manual Save Force Button */}
          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-xs border",
              saveStatus === 'saved'
                ? "bg-[#111521] text-zinc-300 border-[#1C2230] hover:text-white"
                : "bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/40"
            )}
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="text-[11px] font-mono text-[#FF375F] bg-rose-950/30 border border-rose-800/40 p-2 rounded-md">
          {errorMsg}
        </div>
      )}

      {/* Editor / Preview Body */}
      <div className="flex-1 min-h-[260px] flex flex-col">
        {mode === 'write' ? (
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Document key invariants, edge cases, space/time trade-offs, and boundary assumptions in Markdown..."
            className="w-full flex-1 p-3 rounded-lg border border-[#1C2230] bg-[#0A0D14] text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
          />
        ) : (
          <div className="w-full flex-1 p-4 rounded-lg border border-[#1C2230] bg-[#0A0D14] overflow-y-auto custom-scrollbar max-h-[500px]">
            {content.trim() ? (
              <SafeMarkdownRenderer content={content} />
            ) : (
              <p className="text-xs font-mono text-zinc-500 italic">No notes written yet. Switch to Write mode to add notes.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 border-t border-[#1C2230]/60 shrink-0">
        <span>{content.length} characters</span>
        <span>Markdown supported</span>
      </div>
    </div>
  );
};
