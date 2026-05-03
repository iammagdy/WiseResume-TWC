import React from 'react';
import { Text } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/tokens';

export default function NotFound() {
  const theme = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen>
        <Text style={[typography.heading, { color: theme.text }]}>This screen doesn&apos;t exist.</Text>
        <Link href="/(tabs)/dashboard">
          <Text style={[typography.body, { color: theme.primary }]}>Back to dashboard</Text>
        </Link>
      </Screen>
    </>
  );
}
