import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export function useDeepLinking() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('appUrlOpen', (event) => {
      try {
        // Robust URL parse — works for both https:// and custom schemes
        const url = new URL(event.url);
        const pathname = url.pathname;
        if (pathname && pathname !== '/') {
          navigate(pathname + url.search + url.hash);
        }
      } catch {
        // Malformed URL — ignore
        console.warn('Deep link URL could not be parsed:', event.url);
      }
    });

    return () => {
      listener.then((handle) => handle.remove());
    };
  }, [navigate]);
}
