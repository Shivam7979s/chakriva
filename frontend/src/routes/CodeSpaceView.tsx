import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { UserCodespace } from '@/types';
import { useToast } from '@/components/ui/feedback/Toast';
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
} from 'lucide-react';

const DEFAULT_TEMPLATES: Record<string, string> = {
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("CHAKRIVA Scratchpad - Java 21");
    }
}`,
  cpp: `#include <iostream>
#include <vector>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    cout << "CHAKRIVA Scratchpad - C++ 14\\n";
    return 0;
}`,
  python: `def solve():
    print("CHAKRIVA Scratchpad - Python 3.12")

if __name__ == "__main__":
    solve()`,
  typescript: `function main(): void {
    console.log("CHAKRIVA Scratchpad - TypeScript 5.7");
}

main();`,
  go: `package main

import "fmt"

func main() {
    fmt.Println("CHAKRIVA Scratchpad - Go 1.23")
}`,
};

const LANGUAGE_BADGES: Record<string, { label: string; color: string; border: string }> = {
  java: { label: 'Java 21', color: 'text-amber-400 bg-amber-500/10', border: 'border-amber-500/20' },
  cpp: { label: 'C++ 14', color: 'text-blue-400 bg-blue-500/10', border: 'border-blue-500/20' },
  python: { label: 'Python 3.12', color: 'text-emerald-400 bg-emerald-500/10', border: 'border-emerald-500/20' },
  typescript: { label: 'TypeScript 5.7', color: 'text-cyan-400 bg-cyan-500/10', border: 'border-cyan-500/20' },
  go: { label: 'Go 1.23', color: 'text-teal-400 bg-teal-500/10', border: 'border-teal-500/20' },
};

export const CodeSpaceView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [codespaces, setCodespaces] = useState<UserCodespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // New Snippet Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLanguage, setNewLanguage] = useState('java');
  const [newCode, setNewCode] = useState(DEFAULT_TEMPLATES.java);
  const [newStdin, setNewStdin] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newPinned, setNewPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch codespaces
  const fetchCodespaces = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCodespaces();
  }, [fetchCodespaces]);

  // Toggle Pin
  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    // Optimistic update
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
        message: !currentPinned ? 'Prioritized at the top of your vault.' : 'Restored to standard chronological list.',
      });
      fetchCodespaces();
    } catch (err) {
      console.error('Failed to update pin state:', err);
      fetchCodespaces();
    }
  };

  // Delete Codespace
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete snippet "${title}" from your personal vault?`)) {
      return;
    }
    setCodespaces((prev) => prev.filter((cs) => cs.id !== id));
    try {
      const { error } = await supabase.from('user_codespaces').delete().eq('id', id);
      if (error) throw error;
      toast({
        type: 'success',
        title: 'Snippet Deleted',
        message: `Removed "${title}" from your vault.`,
      });
    } catch (err) {
      console.error('Failed to delete codespace:', err);
      toast({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Could not remove snippet from database.',
      });
      fetchCodespaces();
    }
  };

  // Open in Standalone IDE
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

  // Open Modal with defaults
  const handleOpenCreateModal = () => {
    setNewTitle('');
    setNewLanguage('java');
    setNewCode(DEFAULT_TEMPLATES.java);
    setNewStdin('');
    setNewTags('');
    setNewPinned(false);
    setIsModalOpen(true);
  };

  // Handle language change in modal
  const handleModalLangChange = (lang: string) => {
    setNewLanguage(lang);
    if (!newCode || Object.values(DEFAULT_TEMPLATES).includes(newCode)) {
      setNewCode(DEFAULT_TEMPLATES[lang] || '');
    }
  };

  // Create New Codespace
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newTitle.trim()) {
      toast({
        type: 'warning',
        title: 'Title Required',
        message: 'Please provide a descriptive name for your snippet.',
      });
      return;
    }

    setIsSubmitting(true);
    const parsedTags = newTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    try {
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
        message: `"${newTitle}" committed to your Obsidian vault.`,
      });

      setIsModalOpen(false);
      fetchCodespaces();
    } catch (err) {
      console.error('Failed to create codespace:', err);
      toast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not commit codespace to database.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered list
  const filteredCodespaces = codespaces.filter((cs) => {
    const matchesSearch =
      cs.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cs.tags && cs.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesLang = languageFilter === 'all' || cs.language.toLowerCase() === languageFilter.toLowerCase();
    const matchesPinned = !showPinnedOnly || cs.is_pinned;
    return matchesSearch && matchesLang && matchesPinned;
  });

  return (
    <div className="min-h-screen bg-[#08090C] text-neutral-100 flex flex-col">
      {/* Top Header Horizon */}
      <header className="border-b border-white/[0.08] bg-[#0D0F15] sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                CodeSpace Vault
              </h1>
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 px-2.5 py-0.5 rounded-full bg-[#12151D] border border-white/[0.08]">
                {codespaces.length} {codespaces.length === 1 ? 'Snippet' : 'Snippets'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans">
              Personal code storage, algorithmic scratchpads, and reusable templates synchronized to your cloud vault.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Snippet / Folder</span>
            </button>
          </div>
        </div>
      </header>

      {/* Control Bar: Filters & Search */}
      <div className="border-b border-white/[0.06] bg-[#0A0C10] py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title or #tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#12151D] border border-white/[0.08] focus:border-blue-500/50 rounded-lg pl-9 pr-4 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar py-1">
            <button
              onClick={() => setLanguageFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors shrink-0 ${
                languageFilter === 'all'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'bg-[#12151D] text-neutral-400 border border-white/[0.06] hover:text-white'
              }`}
            >
              All Languages
            </button>
            {['java', 'cpp', 'python', 'typescript', 'go'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguageFilter(lang)}
                className={`px-3 py-1 rounded-md text-xs font-mono uppercase transition-colors shrink-0 ${
                  languageFilter === lang
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'bg-[#12151D] text-neutral-400 border border-white/[0.06] hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}

            <button
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
              className={`px-3 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 transition-colors shrink-0 ${
                showPinnedOnly
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold'
                  : 'bg-[#12151D] text-neutral-400 border border-white/[0.06] hover:text-white'
              }`}
            >
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Snippets Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-[#12151D] border border-white/[0.06] rounded-xl p-5 h-64 animate-pulse"
              />
            ))}
          </div>
        ) : filteredCodespaces.length === 0 ? (
          <div className="bg-[#0D0F15] border border-white/[0.08] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 my-12">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">
                {searchQuery || languageFilter !== 'all' || showPinnedOnly
                  ? 'No matching codespaces found'
                  : 'Your CodeSpace Vault is Empty'}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {searchQuery || languageFilter !== 'all' || showPinnedOnly
                  ? 'Try adjusting your search keywords or active language filters.'
                  : 'Save algorithmic boilerplates, fast I/O templates, and scratchpads directly to your authenticated cloud vault.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Snippet</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCodespaces.map((cs) => {
              const langConfig = LANGUAGE_BADGES[cs.language.toLowerCase()] || {
                label: cs.language.toUpperCase(),
                color: 'text-neutral-300 bg-neutral-800',
                border: 'border-white/[0.1]',
              };

              const previewLines = cs.code_buffer
                .split('\n')
                .slice(0, 6)
                .join('\n');

              const formattedDate = new Date(cs.updated_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={cs.id}
                  className="bg-[#12151D] border border-white/[0.08] hover:border-white/[0.16] rounded-xl p-5 flex flex-col justify-between transition-all group hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative"
                >
                  {/* Card Header */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${langConfig.color} ${langConfig.border}`}
                          >
                            {langConfig.label}
                          </span>
                          {cs.is_pinned && (
                            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5" />
                              <span>Pinned</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white tracking-tight mt-1.5 truncate group-hover:text-blue-400 transition-colors">
                          {cs.title}
                        </h3>
                      </div>

                      {/* Header Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleTogglePin(cs.id, cs.is_pinned)}
                          title={cs.is_pinned ? 'Unpin snippet' : 'Pin snippet'}
                          className={`p-1.5 rounded hover:bg-white/[0.06] transition-colors ${
                            cs.is_pinned ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cs.id, cs.title)}
                          title="Delete snippet"
                          className="p-1.5 rounded hover:bg-rose-500/10 text-neutral-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Code Preview Box */}
                    <div className="bg-[#090B0E] border border-white/[0.05] rounded-lg p-3 text-[11px] font-mono text-neutral-300 overflow-hidden line-clamp-5 select-none leading-relaxed">
                      <pre className="whitespace-pre-wrap font-mono">{previewLines}</pre>
                    </div>

                    {/* Tags */}
                    {cs.tags && cs.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {cs.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono text-neutral-400 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between gap-3 text-xs">
                    <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </span>

                    <button
                      onClick={() => handleOpenInIde(cs)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <span>Open in IDE</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* NEW SNIPPET MODAL DIALOG */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#181C26] border border-white/[0.12] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Create New CodeSpace</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                  Snippet Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Binary Search Monotonic Predicate"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#12151D] border border-white/[0.08] focus:border-blue-500/50 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Target Runtime Language
                  </label>
                  <select
                    value={newLanguage}
                    onChange={(e) => handleModalLangChange(e.target.value)}
                    className="w-full bg-[#12151D] border border-white/[0.08] focus:border-blue-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="java">Java (OpenJDK 21)</option>
                    <option value="cpp">C++ (GCC 14)</option>
                    <option value="python">Python 3.12</option>
                    <option value="typescript">TypeScript 5.7</option>
                    <option value="go">Go 1.23</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Tags (Comma Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="dp, graphs, template"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full bg-[#12151D] border border-white/[0.08] focus:border-blue-500/50 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                  Starter Code Buffer
                </label>
                <textarea
                  rows={7}
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-[#090B0E] border border-white/[0.08] focus:border-blue-500/50 rounded-lg p-3 text-xs font-mono text-neutral-200 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                  Optional Stdin Test Input
                </label>
                <input
                  type="text"
                  placeholder="Test arguments or input stream..."
                  value={newStdin}
                  onChange={(e) => setNewStdin(e.target.value)}
                  className="w-full bg-[#12151D] border border-white/[0.08] focus:border-blue-500/50 rounded-lg px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinSnippet"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  className="rounded border-white/20 bg-[#12151D] text-blue-500 focus:ring-0"
                />
                <label htmlFor="pinSnippet" className="text-xs text-neutral-300 cursor-pointer font-sans">
                  Pin this snippet to top of vault
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                >
                  <span>{isSubmitting ? 'Saving...' : 'Commit to Vault'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CodeSpaceView;
