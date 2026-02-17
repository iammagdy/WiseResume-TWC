import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export function useDeepLinking() {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', (event) => {
        const slug = event.url.split('.app').pop();
        if (slug) {
          navigate(slug);
        }
      });
    }
  }, [navigate]);
}
