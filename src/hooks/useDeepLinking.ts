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
        const url = new URL(event.url);
        const pathname = url.pathname;
        if (pathname && pathname !== '/') {
          // Preserve query + hash — critical for OAuth callback tokens
          navigate(pathname + url.search + url.hash, {
            replace: pathname.startsWith('/auth/callback'),
          });
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
