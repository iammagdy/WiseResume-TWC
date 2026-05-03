import React from 'react';
import { router, Stack } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

const TRACKS = ['behavioral', 'technical', 'product', 'phone-screen'] as const;

export default function NewInterview() {
  const theme = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Start practice' }} />
      <Screen>
        <Text style={[typography.body, { color: theme.textMuted }]}>Choose a track:</Text>
        {TRACKS.map((t) => (
          <Pressable key={t} onPress={() => router.replace({ pathname: '/interview/[track]', params: { track: t } })}>
            <Card>
              <Text style={[typography.heading, { color: theme.text, textTransform: 'capitalize' }]}>{t}</Text>
            </Card>
          </Pressable>
        ))}
        <Text style={[typography.small, { color: theme.textMuted, marginTop: spacing.lg }]}>
          Voice answers and AI feedback are unlocked on Pro.
        </Text>
      </Screen>
    </>
  );
}
