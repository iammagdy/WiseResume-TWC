import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { databases } from '@/lib/appwrite';
import { localeFromPublicPath } from './core';
import { useLocale } from './LocaleProvider';
import {
  loadLocalePreference,
  saveLocalePreference,
  type LocalePreferenceDatabase,
} from './localePreference';

export function LocaleAccountSync() {
  const { user, authReady, isAuthenticated } = useAuth();
  const { locale, setLocale } = useLocale();
  const loadedUserId = useRef<string | null>(null);
  const remoteLocale = useRef<string | null>(null);
  const localeRef = useRef(locale);
  const [readyUserId, setReadyUserId] = useState<string | null>(null);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user?.id) {
      loadedUserId.current = null;
      remoteLocale.current = null;
      setReadyUserId(null);
      return;
    }

    let cancelled = false;
    void loadLocalePreference(databases as unknown as LocalePreferenceDatabase, user.id)
      .then((storedLocale) => {
        if (cancelled) return;
        loadedUserId.current = user.id;
        remoteLocale.current = storedLocale;
        setReadyUserId(user.id);
        const pathLocale = localeFromPublicPath(window.location.pathname);
        if (storedLocale && !pathLocale && storedLocale !== localeRef.current) setLocale(storedLocale);
      })
      .catch((error) => {
        if (!cancelled) {
          loadedUserId.current = user.id;
          setReadyUserId(user.id);
          console.warn('[LocaleAccountSync] Could not load locale preference:', error);
        }
      });
    return () => { cancelled = true; };
  }, [authReady, isAuthenticated, setLocale, user?.id]);

  useEffect(() => {
    if (!user?.id || readyUserId !== user.id || loadedUserId.current !== user.id || remoteLocale.current === locale) return;
    let cancelled = false;
    void saveLocalePreference(databases as unknown as LocalePreferenceDatabase, user.id, locale)
      .then(() => {
        if (!cancelled) remoteLocale.current = locale;
      })
      .catch((error) => {
        if (!cancelled) console.warn('[LocaleAccountSync] Could not save locale preference:', error);
      });
    return () => { cancelled = true; };
  }, [locale, readyUserId, user?.id]);

  return null;
}
