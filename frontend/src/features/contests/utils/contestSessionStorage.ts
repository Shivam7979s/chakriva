import type { ActiveContestSession } from '../types/contest';

export function getContestSavedKey(userId?: string): string {
  return `chakriva_contest_saved_v1_${userId || 'guest'}`;
}

export function getContestSessionKey(userId?: string): string {
  return `chakriva_contest_session_v1_${userId || 'guest'}`;
}

export function readContestSavedIds(userId?: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(getContestSavedKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function writeContestSavedIds(
  ids: Record<string, boolean>,
  userId?: string
): void {
  try {
    localStorage.setItem(getContestSavedKey(userId), JSON.stringify(ids));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function readActiveContestSession(
  userId?: string
): ActiveContestSession | null {
  try {
    const raw = localStorage.getItem(getContestSessionKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveContestSession;
    return parsed?.contestId && parsed?.startedAtMs ? parsed : null;
  } catch {
    return null;
  }
}

export function writeActiveContestSession(
  session: ActiveContestSession | null,
  userId?: string
): void {
  try {
    const key = getContestSessionKey(userId);
    if (session) {
      localStorage.setItem(key, JSON.stringify(session));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

