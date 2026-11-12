import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { UserNote, Problem } from '@/types';
import { useToast } from '@/components/ui/feedback/Toast';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { CodeSpaceNavTabs } from '@/features/codespace/components/CodeSpaceNavTabs';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Plus,
  Star,
  Trash2,
  Edit3,
  Search,
  Clock,
  FileText,
  X,
  ArrowRight,
  TerminalSquare,
  AlertCircle,
} from 'lucide-react';

const DIFFICULTY_STYLES: Record<string, { label: string; badge: string }> = {
  easy: { label: 'Easy', badge: 'text-[#00B8A3] bg-[#0B2421] border-[#15423D]' },
  medium: { label: 'Medium', badge: 'text-[#FBBF24] bg-[#241A08] border-[#422F0F]' },
  hard: { label: 'Hard', badge: 'text-[#F43F5E] bg-[#241017] border-[#4C1D2A]' },
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 text-xs text-[#C3CEE0] leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xs font-semibold text-[#F8FAFF] tracking-tight pt-1">
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-sm font-semibold text-[#F8FAFF] tracking-tight pt-1.5">
              {trimmed.replace('## ', '')}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-sm font-bold text-[#F8FAFF] tracking-tight pt-2">
              {trimmed.replace('# ', '')}
            </h2>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-[#60A5FA] font-mono text-[10px] mt-0.5">•</span>
              <span>{trimmed.substring(2)}</span>
            </div>
          );
        }
        if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length > 2) {
          return (
            <code
              key={idx}
              className="block font-mono text-[11px] bg-[#080B12] border border-[#171D2D] p-2 rounded-lg text-[#00B8A3] overflow-x-auto"
            >
              {trimmed.replace(/`/g, '')}
            </code>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="pl-3 border-l-2 border-[#3B82F6]/50 text-[#8E9BB3] italic text-[11px]"
            >
              {trimmed.replace('> ', '')}
            </blockquote>
          );
        }
        return <p key={idx}>{line}</p>;
      })}
    </div>
  );
};

export const NoteSpaceView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<UserNote[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [selectedProblemFilter, setSelectedProblemFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalProblemId, setModalProblemId] = useState<string>('');
  const [modalContent, setModalContent] = useState('');
  const [modalStarred, setModalStarred] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select(`
          id,
          user_id,
          problem_id,
          title,
          markdown_content,
          is_starred,
          created_at,
          updated_at,
          problems:problem_id (
            id,
            title,
            slug,
            difficulty
          )
        `)
        .eq('user_id', user.id)
        .order('is_starred', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes((data as unknown as UserNote[]) || []);
    } catch (err) {
      console.error('Failed to load user notes:', err);
      setLoadError('Unable to sync notes from cloud storage right now.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchProblems = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('problems')
        .select('id, title, slug, difficulty')
        .order('title', { ascending: true })
        .limit(100);

      if (error) throw error;
      setProblems((data as Problem[]) || []);
    } catch (err) {
      console.error('Failed to fetch problems for notes:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    fetchProblems();
  }, [fetchNotes, fetchProblems]);

  const handleToggleStar = async (id: string, currentStarred: boolean) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_starred: !currentStarred } : n))
    );
    try {
      const { error } = await supabase
        .from('user_notes')
        .update({ is_starred: !currentStarred, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast({
        type: 'info',
        title: !currentStarred ? 'Note Starred' : 'Note Unstarred',
        message: !currentStarred
          ? 'Pinned to prioritized revision notes.'
          : 'Returned to chronological ordering.',
      });
      fetchNotes();
    } catch (err) {
      console.error('Failed to star note:', err);
      fetchNotes();
    }
  };

  const handleConfirmDeleteNote = async (id: string, title: string) => {
    setConfirmDeleteId(null);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      const { error } = await supabase.from('user_notes').delete().eq('id', id);
      if (error) throw error;
      toast({
        type: 'success',
        title: 'Note Deleted',
        message: `Removed "${title}" from NoteSpace.`,
      });
    } catch (err) {
      console.error('Failed to delete note:', err);
      fetchNotes();
    }
  };

  const handleOpenCreateModal = () => {
    setEditingNoteId(null);
    setModalTitle('');
    setModalProblemId('');
    setModalContent(`### Algorithmic Invariant Proof
- **Loop Invariant:** The search space [left, right] always contains the target index if it exists.
- **Termination Condition:** When left > right, search space is exhausted.

### Edge Case Analysis
1. Empty input or single-element boundary.
2. Monotonic condition holds under duplicate values.`);
    setModalStarred(false);
    setActiveTab('write');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: UserNote) => {
    setEditingNoteId(note.id);
    setModalTitle(note.title);
    setModalProblemId(note.problem_id || '');
    setModalContent(note.markdown_content);
    setModalStarred(note.is_starred);
    setActiveTab('write');
    setIsModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!modalTitle.trim()) {
      toast({
        type: 'warning',
        title: 'Title Required',
        message: 'Please provide a title for your invariant note.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingNoteId) {
        const { error } = await supabase
          .from('user_notes')
          .update({
            title: modalTitle.trim(),
            problem_id: modalProblemId || null,
            markdown_content: modalContent,
            is_starred: modalStarred,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingNoteId);

        if (error) throw error;
        toast({
          type: 'success',
          title: 'Note Updated',
          message: 'Changes saved to NoteSpace.',
        });
      } else {
        const { error } = await supabase.from('user_notes').insert({
          user_id: user.id,
          title: modalTitle.trim(),
          problem_id: modalProblemId || null,
          markdown_content: modalContent,
          is_starred: modalStarred,
        });

        if (error) throw error;
        toast({
          type: 'success',
          title: 'Note Created',
          message: `"${modalTitle.trim()}" saved to NoteSpace.`,
        });
      }

      setIsModalOpen(false);
      fetchNotes();
    } catch (err) {
      console.error('Failed to save note:', err);
      toast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not commit note to cloud storage.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const starredCount = useMemo(() => notes.filter((n) => n.is_starred).length, [notes]);
  const linkedCount = useMemo(() => notes.filter((n) => Boolean(n.problem_id)).length, [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((n) => {
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.markdown_content.toLowerCase().includes(q) ||
        (n.problems?.title && n.problems.title.toLowerCase().includes(q));

      const matchesStarred = !showStarredOnly || n.is_starred;
      const matchesProblem =
        selectedProblemFilter === 'all' ||
        (selectedProblemFilter === 'linked' && Boolean(n.problem_id)) ||
        (selectedProblemFilter === 'general' && !n.problem_id);

      return matchesSearch && matchesStarred && matchesProblem;
    });
  }, [notes, searchQuery, showStarredOnly, selectedProblemFilter]);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'CodeSpace', href: '/app/codespace' },
        { label: 'NoteSpace' },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6 text-left text-[#F3F6FF]">
        {/* HEADER */}
        <section className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#0B2421] border border-[#15423D] text-[#00B8A3] flex items-center justify-center shrink-0">
                <BookOpen className="w-4.5 h-4.5" />
              </span>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-semibold text-[#F8FAFF] tracking-tight">
                    NoteSpace Vault
                  </h1>
                  <span className="text-[11px] font-mono text-[#7C8BA6] px-2.5 py-0.5 rounded-full bg-[#0B0E16] border border-[#1B2234] tabular-nums">
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#8E9BB3] mt-0.5">
                  Algorithmic invariant proofs, edge-case lemmas, and complexity breakdowns linked to canonical problems.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <CodeSpaceNavTabs activeTab="notes" />

              <button
                type="button"
                onClick={() => navigate('/ide')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#212B42] bg-[#0B0E16] hover:bg-[#141A29] hover:border-[#3B82F6]/40 text-xs font-medium text-[#D5E1F7] transition-colors cursor-pointer"
              >
                <TerminalSquare className="w-3.5 h-3.5 text-[#00B8A3]" />
                <span>Open Studio</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Note</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-[#171D2D]">
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#7C8BA6]">Total Invariant Notes</span>
              <span className="text-sm font-mono font-semibold text-[#F8FAFF] tabular-nums">
                {notes.length}
              </span>
            </div>
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#7C8BA6]">Starred for Revision</span>
              <span className="text-sm font-mono font-semibold text-[#FBBF24] tabular-nums">
                {starredCount}
              </span>
            </div>
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#7C8BA6]">Problem-Linked</span>
              <span className="text-sm font-mono font-semibold text-[#00B8A3] tabular-nums">
                {linkedCount}
              </span>
            </div>
          </div>
        </section>

        {/* FILTER BAR */}
        <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-3.5 sm:px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-[#5B6882] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes, proofs, problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/50 rounded-xl pl-9 pr-4 py-2 text-xs text-[#E2E8F5] placeholder-[#5B6882] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Notes' },
              { id: 'linked', label: 'Problem Linked' },
              { id: 'general', label: 'General Patterns' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedProblemFilter(item.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer',
                  selectedProblemFilter === item.id
                    ? 'bg-[#152443] text-[#60A5FA] border-[#3B82F6]/35 font-semibold'
                    : 'bg-[#0B0E16] text-[#7C8BA6] border-[#181F30] hover:text-[#E2E8F5]'
                )}
              >
                {item.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono border inline-flex items-center gap-1.5 transition-colors cursor-pointer',
                showStarredOnly
                  ? 'bg-[#241A08] text-[#FBBF24] border-[#422F0F] font-semibold'
                  : 'bg-[#0B0E16] text-[#7C8BA6] border-[#181F30] hover:text-[#E2E8F5]'
              )}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Starred</span>
            </button>
          </div>
        </section>

        {loadError && (
          <div className="rounded-xl border border-[#422F0F] bg-[#1C1408] px-4 py-3 flex items-center gap-2.5 text-xs text-[#FBBF24]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* NOTES GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-[#0F131D] border border-[#181F30] p-5 h-64 animate-pulse"
              />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-8 sm:p-10 text-center space-y-5"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#0B2421] border border-[#15423D] text-[#00B8A3] flex items-center justify-center mx-auto">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h2 className="text-base font-semibold text-[#F8FAFF]">
                {searchQuery || selectedProblemFilter !== 'all' || showStarredOnly
                  ? 'No matching notes found'
                  : 'Your NoteSpace Vault is Empty'}
              </h2>
              <p className="text-xs sm:text-sm text-[#8E9BB3] leading-relaxed">
                {searchQuery || selectedProblemFilter !== 'all' || showStarredOnly
                  ? 'Try adjusting your search query or clearing active filters.'
                  : 'Document loop invariants, state transitions, and edge-case proofs to accelerate interview revision.'}
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write First Note</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNotes.map((note, idx) => {
              const diffConfig = note.problems?.difficulty
                ? DIFFICULTY_STYLES[note.problems.difficulty]
                : null;
              const formattedDate = new Date(note.updated_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const isConfirmingDelete = confirmDeleteId === note.id;

              return (
                <motion.article
                  key={note.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.24) }}
                  className={cn(
                    'rounded-2xl border p-5 flex flex-col justify-between transition-all duration-150 group',
                    note.is_starred
                      ? 'border-[#253A63] bg-gradient-to-b from-[#101728] to-[#0B0E16] hover:border-[#3B82F6]/45'
                      : 'border-[#181F30] bg-[#0F131D] hover:bg-[#121826] hover:border-[#29344E]'
                  )}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {note.problems ? (
                            <Link
                              to={`/app/practice/${note.problems.slug}`}
                              className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#D5E1F7] hover:text-[#F8FAFF] bg-[#0B0E16] border border-[#1B2234] px-2 py-0.5 rounded-md transition-colors"
                            >
                              <FileText className="w-3 h-3 text-[#60A5FA]" />
                              <span className="truncate max-w-[140px]">{note.problems.title}</span>
                              {diffConfig && (
                                <span
                                  className={cn(
                                    'text-[9px] uppercase px-1 rounded border',
                                    diffConfig.badge
                                  )}
                                >
                                  {diffConfig.label}
                                </span>
                              )}
                            </Link>
                          ) : (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#A78BFA] bg-[#1A162B] border border-[#2D244C] px-2 py-0.5 rounded-md">
                              Pattern Lemma
                            </span>
                          )}

                          {note.is_starred && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#FBBF24] bg-[#241A08] border border-[#422F0F] px-2 py-0.5 rounded-md">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              <span>Starred</span>
                            </span>
                          )}
                        </div>

                        <h2 className="text-sm font-semibold text-[#F8FAFF] truncate group-hover:text-[#00B8A3] transition-colors">
                          {note.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleStar(note.id, note.is_starred)}
                          title={note.is_starred ? 'Unstar note' : 'Star note'}
                          className={cn(
                            'p-1.5 rounded-lg hover:bg-[#172033] transition-colors cursor-pointer',
                            note.is_starred ? 'text-[#FBBF24]' : 'text-[#64748B] hover:text-[#E2E8F5]'
                          )}
                        >
                          <Star className={cn('w-3.5 h-3.5', note.is_starred && 'fill-current')} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(note)}
                          title="Edit note"
                          className="p-1.5 rounded-lg hover:bg-[#172033] text-[#64748B] hover:text-[#60A5FA] transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDeleteId(isConfirmingDelete ? null : note.id)
                          }
                          title="Delete note"
                          className="p-1.5 rounded-lg hover:bg-[#2A1219] text-[#64748B] hover:text-[#F43F5E] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isConfirmingDelete && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-xl bg-[#241017] border border-[#4C1D2A] px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-[#FDA4AF]">Delete this invariant note?</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-md text-[#94A1B8] hover:text-[#F8FAFF] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmDeleteNote(note.id, note.title)}
                                className="px-2.5 py-1 rounded-md bg-[#E11D48] hover:bg-[#F43F5E] text-[#F8FAFF] font-medium cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="bg-[#080B12] border border-[#171D2D] rounded-xl p-3 max-h-48 overflow-y-auto no-scrollbar">
                      <MarkdownRenderer content={note.markdown_content} />
                    </div>
                  </div>

                  <div className="pt-3.5 mt-4 border-t border-[#171D2D] flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5 tabular-nums">
                      <Clock className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </span>

                    {note.problems ? (
                      <Link
                        to={`/app/practice/${note.problems.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00B8A3] hover:text-[#F8FAFF] bg-[#0B2421] hover:bg-[#123834] border border-[#15423D] px-3 py-1.5 rounded-xl transition-colors"
                      >
                        <span>Open Problem</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(note)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C3CEE0] hover:text-[#F8FAFF] bg-[#0B0E16] hover:bg-[#171F30] border border-[#1B2234] px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        <span>Read / Edit</span>
                      </button>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      {/* WRITE / EDIT NOTE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04060A]/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18 }}
              className="bg-[#0F131D] border border-[#212B42] rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-[#171D2D]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-[#0B2421] border border-[#15423D] text-[#00B8A3] flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-semibold text-[#F8FAFF]">
                    {editingNoteId ? 'Edit Invariant Note' : 'Document Algorithmic Invariant'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#7C8BA6] hover:text-[#F8FAFF] p-1.5 rounded-lg hover:bg-[#171F30] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#94A1B8] mb-1.5">
                      Note Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Monotonic Stack Invariant Proof"
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#00B8A3]/60 rounded-xl px-3.5 py-2 text-xs text-[#F8FAFF] placeholder-[#5B6882] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#94A1B8] mb-1.5">
                      Linked Problem (Optional)
                    </label>
                    <select
                      value={modalProblemId}
                      onChange={(e) => setModalProblemId(e.target.value)}
                      className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#00B8A3]/60 rounded-xl px-3 py-2 text-xs text-[#F8FAFF] focus:outline-none transition-colors"
                    >
                      <option value="">General Pattern (No Specific Problem)</option>
                      {problems.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.difficulty})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#94A1B8]">
                      Markdown Proof / Content
                    </label>
                    <div className="flex items-center gap-1 bg-[#0B0E16] p-0.5 rounded-lg border border-[#1B2234]">
                      <button
                        type="button"
                        onClick={() => setActiveTab('write')}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer',
                          activeTab === 'write'
                            ? 'bg-[#152443] text-[#F8FAFF] font-semibold'
                            : 'text-[#7C8BA6] hover:text-[#F8FAFF]'
                        )}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer',
                          activeTab === 'preview'
                            ? 'bg-[#152443] text-[#F8FAFF] font-semibold'
                            : 'text-[#7C8BA6] hover:text-[#F8FAFF]'
                        )}
                      >
                        Preview
                      </button>
                    </div>
                  </div>

                  {activeTab === 'write' ? (
                    <textarea
                      rows={8}
                      required
                      value={modalContent}
                      onChange={(e) => setModalContent(e.target.value)}
                      placeholder="Write invariant lemmas, recurrence relations, complexity proofs..."
                      className="w-full bg-[#080B12] border border-[#1B2234] focus:border-[#00B8A3]/60 rounded-xl p-3 text-xs font-mono text-[#D5E1F7] focus:outline-none transition-colors leading-relaxed"
                    />
                  ) : (
                    <div className="w-full bg-[#080B12] border border-[#1B2234] rounded-xl p-3 min-h-[190px] max-h-72 overflow-y-auto">
                      <MarkdownRenderer content={modalContent || '*No content provided yet*'} />
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={modalStarred}
                    onChange={(e) => setModalStarred(e.target.checked)}
                    className="rounded border-[#243B6B] bg-[#0B0E16] text-[#F59E0B] focus:ring-0"
                  />
                  <span className="text-xs text-[#C3CEE0]">
                    Star this note for prioritized revision
                  </span>
                </label>

                <div className="pt-3.5 border-t border-[#171D2D] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#8E9BB3] hover:text-[#F8FAFF] hover:bg-[#171F30] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#3B82F6] disabled:opacity-50 text-[#F8FAFF] px-5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>
                      {isSubmitting
                        ? 'Saving...'
                        : editingNoteId
                        ? 'Update Note'
                        : 'Save to NoteSpace'}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default NoteSpaceView;
