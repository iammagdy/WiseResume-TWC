import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { useAuthStore } from '@/state/authStore';
import { signOut } from '@/lib/auth';

export default function ProfileTab() {
  const theme = useTheme();
  const identity = useAuthStore((s) => s.identity);
  const setIdentity = useAuthStore((s) => s.setIdentity);

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          setIdentity(null);
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const links: Array<{ key: string; title: string; href: string }> = [
    { key: 'settings', title: 'Settings', href: '/settings' },
    { key: 'paywall', title: 'Manage subscription', href: '/paywall' },
    { key: 'cover-letters', title: 'Cover letters', href: '/cover-letter' },
    { key: 'resignation', title: 'Resignation letters', href: '/resignation-letter' },
  ];

  return (
    <Screen>
      <Card elevated>
        <Text style={[typography.heading, { color: theme.text }]}>{identity?.name ?? 'Signed in'}</Text>
        <Text style={[typography.small, { color: theme.textMuted, marginTop: spacing.xs }]}>{identity?.email}</Text>
      </Card>

      <View style={{ gap: spacing.sm }}>
        {links.map((l) => (
          <Pressable
            key={l.key}
            onPress={() => router.push(l.href as never)}
            style={({ pressed }) => ({
              padding: spacing.lg,
              borderRadius: 12,
              backgroundColor: theme.surfaceElevated,
              borderWidth: 1,
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={[typography.body, { color: theme.text, fontWeight: '600' }]}>{l.title}</Text>
          </Pressable>
        ))}
      </View>

      <Button title="Sign out" variant="destructive" onPress={confirmSignOut} />
    </Screen>
  );
}
