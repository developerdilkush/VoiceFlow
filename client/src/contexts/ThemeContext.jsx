import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeCtx = createContext(null);
const KEY = 'vf-theme';
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(KEY) || 'system');
  const apply = useCallback((t) => document.documentElement.classList.toggle('dark', t === 'dark' || (t === 'system' && systemDark())), []);

  useEffect(() => {
    apply(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = () => apply('system');
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, [theme, apply]);

  const setTheme = useCallback((t) => { localStorage.setItem(KEY, t); setThemeState(t); }, []);
  const isDark = theme === 'dark' || (theme === 'system' && systemDark());
  const toggle = useCallback(() => setTheme(isDark ? 'light' : 'dark'), [isDark, setTheme]);
  const value = useMemo(() => ({ theme, setTheme, toggle, isDark }), [theme, setTheme, toggle, isDark]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);
