import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const getSupabaseUrl = (): string => {
  const envUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  if (envUrl) {
    if (import.meta.env.PROD && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return 'https://cisddayhekkktcomnqhz.supabase.co';
    }
    return envUrl;
  }
  return import.meta.env.DEV ? 'http://127.0.0.1:54321' : 'https://cisddayhekkktcomnqhz.supabase.co';
};

const supabaseUrl = getSupabaseUrl();

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_KY6C_OH6GHS4rvRSofxw_Q_T3NZeLKx';

/**
 * Standard Supabase client for browser-side queries.
 * Operates strictly with the public anonymous key subject to Row Level Security (RLS).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to check whether real Supabase credentials have been configured.
 */
export const isSupabaseConfigured = (): boolean => {
  const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const key =
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    supabaseAnonKey;
  return (
    !!url &&
    url !== 'https://placeholder.supabase.co' &&
    !!key &&
    key !== 'placeholder-anon-key'
  );
};
