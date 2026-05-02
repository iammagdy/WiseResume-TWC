import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';

const TRACKS = [
  { key: 'behavioral', title: 'Behavioral', body: 'STAR-format coaching for the classics: tell me about a time…' },
  { key: 'technical', title: 'Technical', body: 'Role-aware system design and concept questions.' },
  { key: 'product', title: 'Product / case', body: 'Estimation, design and trade-off questions.' },
  { key: 'phone-screen', title: 'Phone screen', body: 'Quick warm-ups so the first call feels easy.' },
];

export default function InterviewTab() {
  const theme = useTheme();
  return (
    <Screen>
      <Text style={[typography.title, { color: theme.text }]}>Interview practice</Text>
      <Text style={[typography.body, { color: theme.textMuted }]}>
        Pick a track and rehearse out loud. WiseResume listens, transcribes,
        and coaches you on every answer.
      </Text>

      <View style={{ gap: spacing.md }}>
        {TRACKS.map((t) => (
          <Pressable
            key={t.key}
            testID={`interview-track-${t.key}`}
            onPress={() => router.push({ pathname: '/interview/[track]', params: { track: t.key } })}
          >
            <Card elevated>
              <Text style={[typography.heading, { color: theme.text }]}>{t.title}</Text>
              <Text style={[typography.small, { color: theme.textMuted, marginTop: spacing.xs }]}>{t.body}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
