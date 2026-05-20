// `@expo/metro-runtime` enables Fast Refresh and the URL/error overlay for
// the Expo Router web target. It is a no-op on native, so importing it
// unconditionally at the root keeps the web entry-point happy.
import '@expo/metro-runtime';
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Slot, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ThemeProvider, useColorSchemeResolved } from '@/theme/ThemeProvider';
import { queryClient, queryPersister } from '@/state/queryClient';
import { useAuthStore } from '@/state/authStore';
import { getStoredIdentity } from '@/lib/auth';
import { BiometricLockOverlay } from '@/components/BiometricLockOverlay';

SplashScreen.preventAutoHideAsync().catch(() => {});

async function configureRevenueCatForUser(userId: string) {
  try {
    const Purchases = (await import('react-native-purchases')).default;
    const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
    const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
    const apiKey = Platform.OS === 'ios' ? iosKey : androidKey;
    if (!apiKey) return; // keys not set in dev
    Purchases.configure({ apiKey, appUserID: userId });
  } catch {
    // react-native-purchases not available or keys missing — silent fail
  }
}

function ThemedShell({ children }: { children: React.ReactNode }) {
  const scheme = useColorSchemeResolved();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  );
}

export default function RootLayout() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const setIdentity = useAuthStore((s) => s.setIdentity);
  const setReady = useAuthStore((s) => s.setReady);

  useEffect(() => {
    (async () => {
      try {
        const id = await getStoredIdentity();
        if (id) {
          setIdentity(id);
          await configureRevenueCatForUser(id.userId);
        }
      } finally {
        setReady(true);
        setBootstrapped(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    })();
  }, [setIdentity, setReady]);

  if (!bootstrapped) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: queryPersister }}
        >
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ThemedShell>
                <Slot />
                <BiometricLockOverlay />
              </ThemedShell>
            </ThemeProvider>
          </QueryClientProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
