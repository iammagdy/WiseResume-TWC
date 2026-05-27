// `@expo/metro-runtime` enables Fast Refresh and the URL/error overlay for
// the Expo Router web target. It is a no-op on native, so importing it
// unconditionally at the root keeps the web entry-point happy.
import '@expo/metro-runtime';
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
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
