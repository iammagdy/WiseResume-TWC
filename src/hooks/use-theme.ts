import { useSettingsStore } from '@/store/settingsStore';
import { useIsDark } from './useIsDark';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useTheme() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const isDark = useIsDark();

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(isDark ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    resolvedTheme: isDark ? 'dark' : 'light',
  } as const;
}
