import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { UserProfile } from '@/types';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    username: string,
    fullName: string,
    collegeId?: string,
    collegeName?: string
  ) => Promise<{ error: Error | null }>;
  signInWithGitHub: () => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateCollege: (collegeId: string, collegeName: string) => Promise<{ error: Error | null }>;
  preferredLanguage: string;
  updatePreferredLanguage: (lang: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Purge any legacy mock session on load
try {
  localStorage.removeItem('verniq_mock_auth_session');
} catch {
  // Ignore in SSR
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  const fetchProfile = useCallback(async (userId: string, userMeta?: Record<string, unknown>, userEmail?: string) => {
    try {
      // 1. Query public.profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*, colleges:college_id(name)')
        .eq('id', userId)
        .single();

      // 2. Query actual problems solved from public.user_problem_progress
      let realSolvedCount = 0;
      try {
        const { count } = await supabase
          .from('user_problem_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'solved');
        if (count !== null && count !== undefined) {
          realSolvedCount = count;
        }
      } catch {
        realSolvedCount = data?.problems_solved_count || 0;
      }

      if (error || !data) {
        // Fallback to metadata from auth session if profile row trigger is still executing
        setProfile({
          id: userId,
          username: (userMeta?.username as string) || (userEmail ? userEmail.split('@')[0] : 'dev'),
          full_name: (userMeta?.full_name as string) || (userEmail ? userEmail.split('@')[0] : 'Developer'),
          avatar_url: (userMeta?.avatar_url as string) || null,
          role: 'student',
          bio: null,
          github_username: null,
          linkedin_url: null,
          college_id: (userMeta?.college_id as string) || null,
          college_name: (userMeta?.college_name as string) || null,
          score: 0,
          problems_solved_count: realSolvedCount,
          current_streak: 0,
          max_streak: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        const collegeObj = data.colleges as { name?: string } | null;
        if (data.preferred_language && typeof window !== 'undefined') {
          localStorage.setItem('verniq_pref_lang', data.preferred_language);
        }
        setProfile({
          ...(data as UserProfile),
          problems_solved_count: realSolvedCount || data.problems_solved_count || 0,
          college_name: collegeObj?.name || null,
        });
      }
    } catch (err) {
      console.warn('Error fetching Supabase profile:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchProfile(
          initialSession.user.id,
          initialSession.user.user_metadata,
          initialSession.user.email
        );
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await fetchProfile(
            currentSession.user.id,
            currentSession.user.user_metadata,
            currentSession.user.email
          );
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithEmail = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };
      if (data.user) {
        await fetchProfile(data.user.id, data.user.user_metadata, data.user.email);
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    username: string,
    fullName: string,
    collegeId?: string,
    collegeName?: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username,
            college_id: collegeId,
            college_name: collegeName,
          },
        },
      });

      if (error) return { error };
      if (data.user) {
        await fetchProfile(data.user.id, data.user.user_metadata, data.user.email);
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithGitHub = async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin + '/app/dashboard',
        },
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const resetPasswordForEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    if (user?.id) {
      try {
        localStorage.removeItem(`verniq_user_progress_cache_${user.id}`);
        localStorage.removeItem(`verniq_user_revision_cache_${user.id}`);
      } catch {
        // ignore
      }
    }
    try {
      localStorage.removeItem('verniq_user_progress_cache');
      localStorage.removeItem('verniq_user_revision_cache');
    } catch {
      // ignore
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.user_metadata, user.email);
    }
  };

  const updateCollege = async (collegeId: string, collegeName: string): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          college_id: collegeId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) return { error };

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              college_id: collegeId,
              college_name: collegeName,
            }
          : null
      );
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const preferredLanguage =
    profile?.preferred_language ||
    (typeof window !== 'undefined' ? localStorage.getItem('verniq_pref_lang') : null) ||
    'java';

  const updatePreferredLanguage = async (lang: string): Promise<{ error: Error | null }> => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('verniq_pref_lang', lang);
      }
      setProfile((prev) => (prev ? { ...prev, preferred_language: lang } : null));

      if (user && isSupabaseConfigured()) {
        const { error } = await supabase
          .from('profiles')
          .update({ preferred_language: lang, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (error) return { error };
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error: Error | null }> => {
    try {
      if (updates.preferred_language && typeof window !== 'undefined') {
        localStorage.setItem('verniq_pref_lang', updates.preferred_language);
      }
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));

      if (user && isSupabaseConfigured()) {
        const { college_name, ...dbUpdates } = updates as any;
        const { error } = await supabase
          .from('profiles')
          .update({
            ...dbUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        if (error) return { error };
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: configured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGitHub,
        resetPasswordForEmail,
        signOut,
        refreshProfile,
        updateCollege,
        preferredLanguage,
        updatePreferredLanguage,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
