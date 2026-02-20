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
        let pathname: string;
        let search = '';
        let hash = '';

        // Custom schemes (e.g. com.wiseresume.app://) cause new URL() to
        // misparse the pathname — the host eats the first path segment.
        // Manually extract the path for these URLs.
        const customSchemeMatch = event.url.match(/^[a-z][a-z0-9+.\-]*:\/\/(.*)$/i);
        if (customSchemeMatch && !event.url.startsWith('http')) {
          const rest = customSchemeMatch[1]; // e.g. "auth/callback?code=abc#hash"
          const [withoutHash, hashPart] = rest.split('#');
          const [pathPart, queryPart] = (withoutHash || '').split('?');
          pathname = '/' + (pathPart || '');
          search = queryPart ? '?' + queryPart : '';
          hash = hashPart ? '#' + hashPart : '';
        } else {
          const url = new URL(event.url);
          pathname = url.pathname;
          search = url.search;
          hash = url.hash;
        }

        if (pathname && pathname !== '/') {
          navigate(pathname + search + hash, {
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
