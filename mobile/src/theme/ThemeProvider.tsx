import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, ThemeColors } from './tokens';
import { getJSON, setJSON } from '../state/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  system: '시스템 설정',
  light: '라이트',
  dark: '다크',
};

const MODE_KEY = 'theme:mode';

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Restore the saved choice. Until it lands we render 'system', which is the
  // same thing this provider did before the switch existed, so the first frame
  // is never wrong for anyone who hasn't overridden it.
  useEffect(() => {
    let alive = true;
    getJSON<ThemeMode>(MODE_KEY).then((saved) => {
      if (alive && (saved === 'light' || saved === 'dark' || saved === 'system')) setModeState(saved);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setMode = useMemo(
    () => (m: ThemeMode) => {
      // Same pattern as ChartContext.createChart and daylog's save: commit to
      // state immediately so the UI repaints on tap, and let the slower write
      // settle behind it.
      setModeState(m);
      setJSON(MODE_KEY, m).catch((e) => console.warn('[theme] mode not persisted:', e));
    },
    [],
  );

  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors: scheme === 'dark' ? dark : light, scheme, mode, setMode }),
    [scheme, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
