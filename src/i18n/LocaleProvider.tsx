import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import i18next, { type i18n } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import {
  LOCALE_STORAGE_KEY,
  directionForLocale,
  getCatalogs,
  resolveLocale,
  translate,
  type SupportedLocale,
  type TextDirection,
} from './core';

interface LocaleContextValue {
  locale: SupportedLocale;
  direction: TextDirection;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function createI18nInstance(): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    resources: {
      en: { translation: getCatalogs().en },
      ar: { translation: getCatalogs().ar },
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'translation',
    initImmediate: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

const i18nInstance = createI18nInstance();

function readPersistedLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getInitialLocale(initialLocale?: SupportedLocale): SupportedLocale {
  if (initialLocale) return initialLocale;
  return resolveLocale({
    pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
    persistedPreference: typeof window !== 'undefined' ? readPersistedLocale() : null,
    browserLanguages: typeof navigator !== 'undefined' ? navigator.languages : [],
  });
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => getInitialLocale(initialLocale));
  const direction = directionForLocale(locale);

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Locale still applies for the current session when storage is unavailable.
    }
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = direction;
    root.dataset.locale = locale;
    document.body.dataset.locale = locale;
    void i18nInstance.changeLanguage(locale);
  }, [direction, locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    direction,
    setLocale,
    t: (key, variables) => translate(key, locale, variables),
  }), [direction, locale, setLocale]);

  return (
    <I18nextProvider i18n={i18nInstance}>
      <DirectionProvider dir={direction}>
        <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
      </DirectionProvider>
    </I18nextProvider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used within LocaleProvider');
  return value;
}
