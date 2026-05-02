import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { callEdgeFunction } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * On sign-in, asks the OS for notification permission, retrieves an
 * Expo push token, and posts it to the new `register-push-token` edge
 * function. Silently no-ops on simulators (no APNs/FCM).
 */
export function usePushRegistration() {
  const identity = useAuthStore((s) => s.identity);

  useEffect(() => {
    if (!identity) return;
    let cancelled = false;

    (async () => {
      if (!Device.isDevice) return;
      const settings = await Notifications.getPermissionsAsync();
      let granted = settings.granted;
      if (!granted) {
        const ask = await Notifications.requestPermissionsAsync();
        granted = ask.granted;
      }
      if (!granted) return;

      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
        const tokenRes = await Notifications.getExpoPushTokenAsync();
        const expoPushToken = tokenRes.data;
        if (cancelled) return;
        await callEdgeFunction('register-push-token', {
          body: {
            token: expoPushToken,
            platform: Platform.OS,
            app_version: '1.0.0',
          },
        });
      } catch (err) {
        // Push registration failures are non-fatal — surface in dev only.
        console.warn('[push] registration failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identity]);
}
