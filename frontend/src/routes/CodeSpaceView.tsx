import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { UserCodespace } from '@/types';
import { useToast } from '@/components/ui/feedback/Toast';
import { DashboardLayout } from '@/components/ui/layout/DashboardLayout';
import { CodeSpaceNavTabs } from '@/features/codespace/components/CodeSpaceNavTabs';
import {
  CODESPACE_LANGUAGES,
  QUICK_STARTER_TEMPLATES,
  getLanguageSpec,
  type QuickStarterTemplate,
} from '@/features/codespace/data/codespaceTemplates';
import { cn } from '@/lib/utils';
import {
  Code2,
  Plus,
  Pin,
  Trash2,
  Search,
  Clock,
  X,
  FileCode2,
  ArrowRight,
  Copy,
  Check,
  Pencil,
  TerminalSquare,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const CodeSpaceView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [codespaces, setCodespaces] = useState<UserCodespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<'recent' | 'alpha'>('recent');

  // Inline states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create / Edit Snippet Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newLanguage, setNewLanguage] = useState<string>('java');
  const [newCode, setNewCode] = useState(CODESPACE_LANGUAGES.java.defaultTemplate);
  const [newStdin, setNewStdin] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCodespaces = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('user_codespaces')
        .select('*')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCodespaces(data || []);
    } catch (err) {
      console.error('Failed to load user codespaces:', err);
      setLoadError('Unable to sync snippets from cloud storage right now.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCodespaces();
  }, [fetchCodespaces]);

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    setCodespaces((prev) =>
      prev.map((cs) => (cs.id === id ? { ...cs, is_pinned: !currentPinned } : cs))
    );
    try {
      const { error } = await supabase
        .from('user_codespaces')
        .update({ is_pinned: !currentPinned, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast({
        type: 'info',
        title: !currentPinned ? 'Snippet Pinned' : 'Snippet Unpinned',
        message: !currentPinned
          ? 'Prioritized at the top of your vault.'
          : 'Returned to standard vault ordering.',
      });
      fetchCodespaces();
    } catch (err) {
      console.error('Failed to update pin state:', err);
      fetchCodespaces();
    }
  };

  const handleConfirmDelete = async (id: string, title: string) => {
    setConfirmDeleteId(null);
    setCodespaces((prev) => prev.filter((cs) => cs.id !== id));
    try {
      const { error } = await supabase.from('user_codespaces').delete().eq('id', id);
      if (error) throw error;
      toast({
        type: 'success',
        title: 'Snippet Removed',
        message: `Deleted "${title}" from your CodeSpace Vault.`,
      });
    } catch (err) {
      console.error('Failed to delete codespace:', err);
      toast({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Could not delete snippet from cloud storage.',
      });
      fetchCodespaces();
    }
  };

  const handleCopySnippet = async (cs: UserCodespace) => {
    try {
      await navigator.clipboard.writeText(cs.code_buffer);
      setCopiedId(cs.id);
      setTimeout(() => setCopiedId((prev) => (prev === cs.id ? null : prev)), 1600);
    } catch {
      toast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Clipboard access was denied.',
      });
    }
  };

  const handleOpenInIde = (cs: UserCodespace) => {
    navigate('/ide', {
      state: {
        code: cs.code_buffer,
        language: cs.language,
        title: cs.title,
        stdin: cs.stdin_buffer || '',
        codespaceId: cs.id,
      },
    });
  };

  const handleLaunchTemplateInIde = (tpl: QuickStarterTemplate) => {
    navigate('/ide', {
      state: {
        code: tpl.code,
        language: tpl.language,
        title: tpl.title,
        stdin: tpl.stdin,
      },
    });
  };

  const handleOpenCreateModal = (template?: QuickStarterTemplate) => {
    setEditingSnippetId(null);
    if (template) {
      setNewTitle(template.title);
      setNewLanguage(template.language);
      setNewCode(template.code);
      setNewStdin(template.stdin);
      setNewTags(template.tags.join(', '));
      setNewPinned(false);
    } else {
      setNewTitle('');
      setNewLanguage('java');
      setNewCode(CODESPACE_LANGUAGES.java.defaultTemplate);
      setNewStdin('');
      setNewTags('');
      setNewPinned(false);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cs: UserCodespace) => {
    setEditingSnippetId(cs.id);
    setNewTitle(cs.title);
    setNewLanguage(cs.language);
    setNewCode(cs.code_buffer);
    setNewStdin(cs.stdin_buffer || '');
    setNewTags((cs.tags || []).join(', '));
    setNewPinned(cs.is_pinned);
    setIsModalOpen(true);
  };

  const handleModalLangChange = (lang: string) => {
    setNewLanguage(lang);
    const defaultBuffers = Object.values(CODESPACE_LANGUAGES).map((l) => l.defaultTemplate);
    if (!newCode || defaultBuffers.includes(newCode)) {
      setNewCode(getLanguageSpec(lang).defaultTemplate);
    }
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        type: 'warning',
        title: 'Sign In Required',
        message: 'Authenticate to save snippets in your personal vault.',
      });
      return;
    }
    if (!newTitle.trim()) {
      toast({
        type: 'warning',
        title: 'Title Required',
        message: 'Provide a descriptive name for this snippet.',
      });
      return;
    }

    setIsSubmitting(true);
    const parsedTags = newTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    try {
      if (editingSnippetId) {
        const { error } = await supabase
          .from('user_codespaces')
          .update({
            title: newTitle.trim(),
            language: newLanguage,
            code_buffer: newCode,
            stdin_buffer: newStdin.trim() || null,
            tags: parsedTags,
            is_pinned: newPinned,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSnippetId);

        if (error) throw error;
        toast({
          type: 'success',
          title: 'Snippet Updated',
          message: `Updated "${newTitle.trim()}" in your vault.`,
        });
      } else {
        const { error } = await supabase
          .from('user_codespaces')
          .insert({
            user_id: user.id,
            title: newTitle.trim(),
            language: newLanguage,
            code_buffer: newCode,
            stdin_buffer: newStdin.trim() || null,
            tags: parsedTags,
            is_pinned: newPinned,
          })
          .select()
          .single();

        if (error) throw error;
        toast({
          type: 'success',
          title: 'Snippet Saved',
          message: `"${newTitle.trim()}" committed to your CodeSpace Vault.`,
        });
      }

      setIsModalOpen(false);
      fetchCodespaces();
    } catch (err) {
      console.error('Failed to save codespace:', err);
      toast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not write snippet to cloud storage.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pinnedCount = useMemo(
    () => codespaces.filter((cs) => cs.is_pinned).length,
    [codespaces]
  );

  const uniqueLanguageCount = useMemo(
    () => new Set(codespaces.map((cs) => cs.language.toLowerCase())).size,
    [codespaces]
  );

  const filteredCodespaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = codespaces.filter((cs) => {
      const matchesSearch =
        !q ||
        cs.title.toLowerCase().includes(q) ||
        cs.code_buffer.toLowerCase().includes(q) ||
        (cs.tags && cs.tags.some((t) => t.toLowerCase().includes(q)));
      const matchesLang =
        languageFilter === 'all' || cs.language.toLowerCase() === languageFilter.toLowerCase();
      const matchesPinned = !showPinnedOnly || cs.is_pinned;
      return matchesSearch && matchesLang && matchesPinned;
    });

    if (sortOrder === 'alpha') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [codespaces, searchQuery, languageFilter, showPinnedOnly, sortOrder]);

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'CHAKRIVA', href: '/app/home' },
        { label: 'CodeSpace' },
      ]}
    >
      <div className="max-w-7xl mx-auto space-y-6 text-left text-[#F3F6FF]">
        {/* TOP WORKSPACE HEADER */}
        <section className="rounded-2xl border border-[#181F30] bg-gradient-to-b from-[#0F1422] to-[#0B0E16] p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-[#152443] border border-[#243B6B] text-[#60A5FA] flex items-center justify-center shrink-0">
                  <Code2 className="w-4.5 h-4.5" />
                </span>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-semibold text-[#F8FAFF] tracking-tight">
                      CodeSpace Vault
                    </h1>
                    <span className="text-[11px] font-mono text-[#7C8BA6] px-2.5 py-0.5 rounded-full bg-[#0B0E16] border border-[#1B2234] tabular-nums">
                      {codespaces.length} {codespaces.length === 1 ? 'snippet' : 'snippets'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#8E9BB3] mt-0.5">
                    Reusable algorithmic templates, fast I/O harnesses, and scratchpads synced across your live studio.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <CodeSpaceNavTabs activeTab="vault" />

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
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Snippet</span>
              </button>
            </div>
          </div>

          {/* COMPACT TELEMETRY STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-[#171D2D]">
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#7C8BA6]">Saved Scratchpads</span>
              <span className="text-sm font-mono font-semibold text-[#F8FAFF] tabular-nums">
                {codespaces.length}
              </span>
            </div>
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#7C8BA6]">Pinned Templates</span>
              <span className="text-sm font-mono font-semibold text-[#FBBF24] tabular-nums">
                {pinnedCount}
              </span>
            </div>
            <div className="rounded-xl bg-[#0B0E16] border border-[#171D2D] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-[#7C8BA6]">Active Runtimes</span>
              <span className="text-sm font-mono font-semibold text-[#00B8A3] tabular-nums">
                {uniqueLanguageCount} / 5
              </span>
            </div>
          </div>
        </section>

        {/* FILTER & SEARCH CONTROL RAIL */}
        <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-3.5 sm:px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-[#5B6882] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search snippets, code, or #tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/50 rounded-xl pl-9 pr-4 py-2 text-xs text-[#E2E8F5] placeholder-[#5B6882] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguageFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer',
                languageFilter === 'all'
                  ? 'bg-[#152443] text-[#60A5FA] border-[#3B82F6]/35 font-semibold'
                  : 'bg-[#0B0E16] text-[#7C8BA6] border-[#181F30] hover:text-[#E2E8F5]'
              )}
            >
              All
            </button>

            {Object.values(CODESPACE_LANGUAGES).map((lang) => {
              const active = languageFilter === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguageFilter(lang.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer',
                    active
                      ? 'bg-[#152443] text-[#60A5FA] border-[#3B82F6]/35 font-semibold'
                      : 'bg-[#0B0E16] text-[#7C8BA6] border-[#181F30] hover:text-[#E2E8F5]'
                  )}
                >
                  {lang.shortLabel}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-mono border inline-flex items-center gap-1.5 transition-colors cursor-pointer',
                showPinnedOnly
                  ? 'bg-[#241A08] text-[#FBBF24] border-[#422F0F] font-semibold'
                  : 'bg-[#0B0E16] text-[#7C8BA6] border-[#181F30] hover:text-[#E2E8F5]'
              )}
            >
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </button>

            <select
              aria-label="Sort snippets"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'recent' | 'alpha')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-[#0B0E16] border border-[#181F30] text-[#94A1B8] focus:outline-none focus:border-[#3B82F6]/50 cursor-pointer"
            >
              <option value="recent">Sort: Recent</option>
              <option value="alpha">Sort: A-Z</option>
            </select>
          </div>
        </section>

        {/* HONEST SYNC ERROR BANNER IF ANY */}
        {loadError && (
          <div className="rounded-xl border border-[#422F0F] bg-[#1C1408] px-4 py-3 flex items-center gap-2.5 text-xs text-[#FBBF24]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* MAIN VAULT GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-[#0F131D] border border-[#181F30] p-5 h-64 animate-pulse"
              />
            ))}
          </div>
        ) : filteredCodespaces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-8 sm:p-10 text-center space-y-5"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#152443] border border-[#243B6B] text-[#60A5FA] flex items-center justify-center mx-auto">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h2 className="text-base font-semibold text-[#F8FAFF]">
                {searchQuery || languageFilter !== 'all' || showPinnedOnly
                  ? 'No matching snippets found'
                  : 'Build your personal CodeSpace Vault'}
              </h2>
              <p className="text-xs sm:text-sm text-[#8E9BB3] leading-relaxed">
                {searchQuery || languageFilter !== 'all' || showPinnedOnly
                  ? 'Adjust your active language filter or search terms to view stored snippets.'
                  : 'Save reusable DSA boilerplates, custom test harnesses, and solution drafts—or start immediately from a verified template below.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-xs font-semibold text-[#F8FAFF] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Snippet</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/ide')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#212B42] bg-[#0B0E16] hover:bg-[#141A29] text-xs font-medium text-[#D5E1F7] transition-colors cursor-pointer"
              >
                <TerminalSquare className="w-3.5 h-3.5 text-[#00B8A3]" />
                <span>Launch Blank Studio</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCodespaces.map((cs, idx) => {
              const langSpec = getLanguageSpec(cs.language);
              const previewLines = cs.code_buffer.split('\n').slice(0, 6);
              const formattedDate = new Date(cs.updated_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const isConfirmingDelete = confirmDeleteId === cs.id;

              return (
                <motion.article
                  key={cs.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.24) }}
                  className={cn(
                    'rounded-2xl border p-5 flex flex-col justify-between transition-all duration-150 group',
                    cs.is_pinned
                      ? 'border-[#253A63] bg-gradient-to-b from-[#101728] to-[#0B0E16] hover:border-[#3B82F6]/45'
                      : 'border-[#181F30] bg-[#0F131D] hover:bg-[#121826] hover:border-[#29344E]'
                  )}
                >
                  <div className="space-y-3.5">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md border',
                              langSpec.badgeClass
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', langSpec.dotClass)} />
                            <span>{langSpec.shortLabel}</span>
                          </span>

                          {cs.is_pinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#FBBF24] bg-[#241A08] border border-[#422F0F] px-2 py-0.5 rounded-md">
                              <Pin className="w-2.5 h-2.5" />
                              <span>Pinned</span>
                            </span>
                          )}
                        </div>

                        <h2 className="text-sm font-semibold text-[#F8FAFF] truncate group-hover:text-[#93C5FD] transition-colors">
                          {cs.title}
                        </h2>
                      </div>

                      {/* Card Controls */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(cs)}
                          title="Copy code buffer"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#E2E8F5] hover:bg-[#172033] transition-colors cursor-pointer"
                        >
                          {copiedId === cs.id ? (
                            <Check className="w-3.5 h-3.5 text-[#00B8A3]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cs)}
                          title="Edit snippet"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#60A5FA] hover:bg-[#172033] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePin(cs.id, cs.is_pinned)}
                          title={cs.is_pinned ? 'Unpin snippet' : 'Pin snippet'}
                          className={cn(
                            'p-1.5 rounded-lg hover:bg-[#172033] transition-colors cursor-pointer',
                            cs.is_pinned ? 'text-[#FBBF24]' : 'text-[#64748B] hover:text-[#E2E8F5]'
                          )}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDeleteId(isConfirmingDelete ? null : cs.id)
                          }
                          title="Delete snippet"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F43F5E] hover:bg-[#2A1219] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Delete Confirm Strip */}
                    <AnimatePresence>
                      {isConfirmingDelete && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-xl bg-[#241017] border border-[#4C1D2A] px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-[#FDA4AF]">Remove this snippet permanently?</span>
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
                                onClick={() => handleConfirmDelete(cs.id, cs.title)}
                                className="px-2.5 py-1 rounded-md bg-[#E11D48] hover:bg-[#F43F5E] text-[#F8FAFF] font-medium cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Recessed Monospace Code Preview */}
                    <div className="rounded-xl bg-[#080B12] border border-[#171D2D] p-3 font-mono text-[11px] leading-relaxed overflow-hidden select-none">
                      {previewLines.map((line, lineIdx) => (
                        <div key={lineIdx} className="flex items-baseline gap-2.5 truncate">
                          <span className="w-4 text-right text-[10px] text-[#3F4A61] shrink-0 tabular-nums">
                            {lineIdx + 1}
                          </span>
                          <span className="text-[#C3CEE0] truncate">{line || ' '}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    {cs.tags && cs.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cs.tags.map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            className="text-[10px] font-mono text-[#8E9BB3] bg-[#0B0E16] border border-[#181F30] px-2 py-0.5 rounded-md"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3.5 mt-4 border-t border-[#171D2D] flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5 tabular-nums">
                      <Clock className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenInIde(cs)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#93C5FD] hover:text-[#F8FAFF] bg-[#152443] hover:bg-[#1E335E] border border-[#243B6B] px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <span>Open in Studio</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* QUICK-START ALGORITHMIC STARTERS STRIP */}
        <section className="rounded-2xl border border-[#181F30] bg-[#0F131D] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00B8A3]" />
              <h2 className="text-sm font-semibold text-[#F8FAFF]">
                Verified Starter Blueprints
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#64748B]">
              1-click launch in Studio IDE or clone into your Vault
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUICK_STARTER_TEMPLATES.map((tpl) => {
              const langSpec = getLanguageSpec(tpl.language);
              return (
                <div
                  key={tpl.id}
                  className="rounded-xl border border-[#181F30] bg-[#0B0E16] hover:border-[#29344E] p-4 flex flex-col justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md border',
                          langSpec.badgeClass
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', langSpec.dotClass)} />
                        <span>{langSpec.shortLabel}</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#5B6882]">
                        {tpl.tags.map((t) => `#${t}`).join(' ')}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#E2E8F5]">{tpl.title}</h3>
                    <p className="text-xs text-[#7C8BA6] leading-relaxed">{tpl.description}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#171D2D]">
                    <button
                      type="button"
                      onClick={() => handleLaunchTemplateInIde(tpl)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#152443] hover:bg-[#1E335E] border border-[#243B6B] text-[11px] font-medium text-[#93C5FD] transition-colors cursor-pointer"
                    >
                      <TerminalSquare className="w-3 h-3" />
                      <span>Run in Studio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateModal(tpl)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F131D] hover:bg-[#161D2E] border border-[#1B2234] text-[11px] font-medium text-[#C3CEE0] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Save Copy</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* CREATE / EDIT SNIPPET MODAL */}
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
              className="bg-[#0F131D] border border-[#212B42] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-[#171D2D]">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-[#152443] border border-[#243B6B] text-[#60A5FA] flex items-center justify-center">
                    <FileCode2 className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-semibold text-[#F8FAFF]">
                    {editingSnippetId ? 'Edit Vault Snippet' : 'Create Vault Snippet'}
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

              <form onSubmit={handleSubmitModal} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1.5">
                    Snippet Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Binary Search Monotonic Predicate"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/60 rounded-xl px-3.5 py-2 text-xs text-[#F8FAFF] placeholder-[#5B6882] focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1.5">
                      Runtime Language
                    </label>
                    <select
                      value={newLanguage}
                      onChange={(e) => handleModalLangChange(e.target.value)}
                      className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/60 rounded-xl px-3 py-2 text-xs text-[#F8FAFF] focus:outline-none transition-colors"
                    >
                      {Object.values(CODESPACE_LANGUAGES).map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1.5">
                      Tags (Comma Separated)
                    </label>
                    <input
                      type="text"
                      placeholder="dp, graphs, template"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/60 rounded-xl px-3.5 py-2 text-xs text-[#F8FAFF] placeholder-[#5B6882] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1.5">
                    Code Buffer
                  </label>
                  <textarea
                    rows={7}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-[#080B12] border border-[#1B2234] focus:border-[#3B82F6]/60 rounded-xl p-3 text-xs font-mono text-[#D5E1F7] focus:outline-none transition-colors leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/80 mb-1.5">
                    Optional Stdin Test Stream
                  </label>
                  <input
                    type="text"
                    placeholder="Test arguments or standard input..."
                    value={newStdin}
                    onChange={(e) => setNewStdin(e.target.value)}
                    className="w-full bg-[#0B0E16] border border-[#1B2234] focus:border-[#3B82F6]/60 rounded-xl px-3.5 py-2 text-xs font-mono text-[#F8FAFF] placeholder-[#5B6882] focus:outline-none transition-colors"
                  />
                </div>

                <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newPinned}
                    onChange={(e) => setNewPinned(e.target.checked)}
                    className="rounded border-[#243B6B] bg-[#0B0E16] text-[#3B82F6] focus:ring-0"
                  />
                  <span className="text-xs text-[#C3CEE0]">Pin this snippet to top of vault</span>
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
                        : editingSnippetId
                        ? 'Save Changes'
                        : 'Save to Vault'}
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

export default CodeSpaceView;
