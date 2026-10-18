'use client';

import { useState, useEffect, useCallback } from 'react';

export type DashboardMode = 'simple' | 'advanced';

const STORAGE_KEY = 'zernio_dashboard_mode';
const CHANGE_EVENT = 'zernio_dashboard_mode_change';

export function useDashboardMode(): {
  mode: DashboardMode;
  setMode: (nextMode: DashboardMode) => void;
  toggleMode: () => void;
  isSimple: boolean;
  isAdvanced: boolean;
  isHydrated: boolean;
} {
  const [mode, setModeState] = useState<DashboardMode>('simple');
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as DashboardMode | null;
      if (stored === 'simple' || stored === 'advanced') {
        setModeState(stored);
      } else {
        // Default fallback for new users is 'simple'
        window.localStorage.setItem(STORAGE_KEY, 'simple');
      }
    } catch {
      // Graceful fallback if localStorage is disabled or restricted
      setModeState('simple');
    } finally {
      setIsHydrated(true);
    }

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<DashboardMode>;
      if (customEvent.detail === 'simple' || customEvent.detail === 'advanced') {
        setModeState(customEvent.detail);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'simple' || e.newValue === 'advanced')) {
        setModeState(e.newValue);
      }
    };

    window.addEventListener(CHANGE_EVENT, handleCustomChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(CHANGE_EVENT, handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setMode = useCallback((nextMode: DashboardMode) => {
    setModeState(nextMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: nextMode }));
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const toggleMode = useCallback(() => {
    const next = mode === 'simple' ? 'advanced' : 'simple';
    setMode(next);
  }, [mode, setMode]);

  return {
    mode,
    setMode,
    toggleMode,
    isSimple: mode === 'simple',
    isAdvanced: mode === 'advanced',
    isHydrated,
  };
}
