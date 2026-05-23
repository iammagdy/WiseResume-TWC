import { useSettingsStore } from '@/store/settingsStore';
import { useIsDark } from './useIsDark';

export type ThemeMode = 'light' | 'dark' | 'system';

function applyResolvedTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

export function useTheme() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const isDark = useIsDark();

  const toggleTheme = () => {
    if (typeof document === 'undefined') return;
    const nextTheme: Exclude<ThemeMode, 'system'> =
      theme === 'system' ? (isDark ? 'light' : 'dark') : theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = (document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    }).startViewTransition;

    const apply = () => {
      root.classList.add('theme-transitioning');
      applyResolvedTheme(nextTheme);
      setTheme(nextTheme);
    };

    if (!prefersReducedMotion && startViewTransition) {
      startViewTransition.call(document, apply).finished.finally(() => {
        root.classList.remove('theme-transitioning');
      });
      return;
    }

    apply();
    window.setTimeout(() => root.classList.remove('theme-transitioning'), 180);
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    resolvedTheme: isDark ? 'dark' : 'light',
  } as const;
}
