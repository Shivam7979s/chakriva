/**
 * VERNIQ Standalone IDE Draft Persistence Service
 * Scoped by (userId || 'anonymous').
 * Provides synchronous localStorage persistence for zero-latency instant restoration
 * of tabs, active tab selection, user-written code, and stdin buffers across page refreshes.
 */

export interface ScratchTab {
  id: string;
  title: string;
  language: string;
  code: string;
  stdin: string;
  updatedAt?: string;
}

export interface IdeStateRecord {
  tabs: ScratchTab[];
  activeTabId: string;
  updatedAt: string;
  revision?: number;
}

export const IDE_STORAGE_PREFIX = 'chakriva_ide_state';
export const LEGACY_STORAGE_PREFIX = 'verniq_ide_state';

export function getIdeStorageKey(userId?: string): string {
  const normalizedUser = userId || 'anonymous';
  return `${IDE_STORAGE_PREFIX}_${normalizedUser}`;
}

export function getLegacyIdeStorageKey(userId?: string): string {
  const normalizedUser = userId || 'anonymous';
  return `${LEGACY_STORAGE_PREFIX}_${normalizedUser}`;
}

/**
 * Loads the saved IDE state (tabs and activeTabId) for the given user.
 * Checks user-specific key first, then falls back to anonymous key if authenticated.
 */
export function getLocalIdeState(
  userId?: string
): { tabs: ScratchTab[]; activeTabId: string } | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const key = getIdeStorageKey(userId);
    let raw = localStorage.getItem(key);

    // Legacy migration: Check legacy verniq_ide_state key
    if (!raw) {
      const legacyKey = getLegacyIdeStorageKey(userId);
      raw = localStorage.getItem(legacyKey);
      if (!raw && userId) {
        raw = localStorage.getItem(getLegacyIdeStorageKey(undefined));
      }
      if (raw) {
        try {
          localStorage.setItem(key, raw);
        } catch {
          // ignore
        }
      }
    }

    // Fallback: If user is authenticated but has no draft yet under their user ID,
    // check if an anonymous draft exists and migrate it.
    if (!raw && userId) {
      const anonKey = getIdeStorageKey(undefined);
      raw = localStorage.getItem(anonKey);
      if (raw) {
        try {
          localStorage.setItem(key, raw);
        } catch {
          // Ignore quota error
        }
      }
    }

    if (!raw) return null;

    const parsed: IdeStateRecord = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.tabs) &&
      parsed.tabs.length > 0 &&
      typeof parsed.activeTabId === 'string'
    ) {
      // Validate tab structure
      const validTabs = parsed.tabs.filter(
        (t) =>
          t &&
          typeof t.id === 'string' &&
          typeof t.title === 'string' &&
          typeof t.language === 'string' &&
          typeof t.code === 'string'
      );

      if (validTabs.length > 0) {
        const sanitizedTabs = validTabs.map((t) => ({
          ...t,
          code: t.code.replace(/VERNIQ Online IDE/g, 'Chakriva Online IDE').replace(/VERNIQ/g, 'CHAKRIVA'),
        }));
        const activeExists = sanitizedTabs.some((t) => t.id === parsed.activeTabId);
        return {
          tabs: sanitizedTabs,
          activeTabId: activeExists ? parsed.activeTabId : sanitizedTabs[0].id,
        };
      }
    }
  } catch (err) {
    console.warn('[VERNIQ IDE DRAFT] Failed to read localStorage state:', err);
  }

  return null;
}

/**
 * Immediately saves the IDE state (tabs and activeTabId) to localStorage.
 * Includes revision tracking to protect against stale overwrite races.
 */
export function saveLocalIdeState(
  userId: string | undefined,
  tabs: ScratchTab[],
  activeTabId: string,
  revision?: number
): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }
  if (!Array.isArray(tabs) || tabs.length === 0) {
    return false;
  }

  try {
    const key = getIdeStorageKey(userId);
    const now = new Date().toISOString();

    if (revision !== undefined) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const existing = JSON.parse(raw);
          if (
            existing &&
            typeof existing.revision === 'number' &&
            existing.revision > revision
          ) {
            // Stale save protection: A newer revision is already saved locally
            return true;
          }
        } catch {
          // Ignore parse errors on existing
        }
      }
    }

    const payload: IdeStateRecord = {
      tabs,
      activeTabId,
      updatedAt: now,
      revision,
    };

    localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[VERNIQ IDE DRAFT] localStorage write failed:', err);
    return false;
  }
}

/**
 * Deletes saved IDE state for the given user (e.g. on full reset).
 */
export function clearLocalIdeState(userId?: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    const key = getIdeStorageKey(userId);
    localStorage.removeItem(key);
    if (userId) {
      localStorage.removeItem(getIdeStorageKey(undefined));
    }
  } catch {
    // Ignore
  }
}
