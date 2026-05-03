import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type ThemeTokens } from './tokens';
import { useSettingsStore } from '@/state/settingsStore';

type ThemeContextValue = {
  theme: ThemeTokens;
  scheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  scheme: 'dark',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themePref = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    themePref === 'system' ? (systemScheme ?? 'dark') : themePref,
  );

  useEffect(() => {
    if (themePref === 'system') {
      setResolved(systemScheme ?? 'dark');
    } else {
      setResolved(themePref);
    }
  }, [themePref, systemScheme]);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme: resolved === 'dark' ? darkTheme : lightTheme,
      scheme: resolved,
    };
  }, [resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext).theme;
}

export function useColorSchemeResolved(): 'light' | 'dark' {
  return useContext(ThemeContext).scheme;
}
