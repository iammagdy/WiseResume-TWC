import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/hooks/useAuth';

// Extend ServiceWorkerRegistration to include PushManager (not in all TS libs)
declare global {
  interface ServiceWorkerRegistration {
    pushManager: PushManager;
  }
}

// Publishable VAPID key – safe to embed in frontend
const VAPID_PUBLIC_KEY = 'BJUSBRC5npkRn-z1die5GrM_3kl88ngw8IeikAsRiXtCXXPW2oO0IqJNiCdBpMXkc5VdP1tSOy2APxNyhIsXCWg';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isiOS, setIsiOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsiOS(isIOSDevice);

    const isPWAMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    setIsPWA(isPWAMode);

    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;

    // iOS: push only works when installed as PWA
    if (isIOSDevice && !isPWAMode) {
      setIsSupported(false);
    } else {
      setIsSupported(hasServiceWorker && hasPushManager && hasNotification);
    }

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    }).catch(() => setIsSubscribed(false));
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) throw new Error('Push notifications are not supported');
    if (!user) throw new Error('User not authenticated');

    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') throw new Error('Notification permission denied');

      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      if (!p256dhKey || !authKey) throw new Error('Failed to get subscription keys');

      const p256dh = arrayBufferToBase64(p256dhKey);
      const auth = arrayBufferToBase64(authKey);

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) throw error;
      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);
        }
      }
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const sendTest = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'WiseResume Test 🎉',
          body: 'Push notifications are working! You\'re all set.',
          url: '/settings',
        },
      });
      if (error) throw error;
      return data;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    isiOS,
    isPWA,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
