import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { rest } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

interface JobRow {
  id: string; title: string; company: string; status: string;
  url: string | null; description: string | null; updated_at: string;
}

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.identity?.userId);
  const job = useQuery({
    queryKey: ['job', id],
    enabled: !!id && !!userId,
    queryFn: async () => {
      const rows = await rest<JobRow[]>('saved_jobs', {
        method: 'GET',
        select: '*',
        query: { id: `eq.${id}`, user_id: `eq.${userId}`, limit: 1 },
      });
      return rows[0] ?? null;
    },
  });

  if (job.isLoading) return <Screen><ActivityIndicator color={theme.primary} /></Screen>;
  if (!job.data) return <Screen><Text style={[typography.body, { color: theme.textMuted }]}>Job not found.</Text></Screen>;

  return (
    <>
      <Stack.Screen options={{ title: job.data.company }} />
      <Screen>
        <View>
          <Text style={[typography.title, { color: theme.text }]}>{job.data.title}</Text>
          <Text style={[typography.body, { color: theme.textMuted }]}>{job.data.company}</Text>
        </View>
        <Card>
          <Text style={[typography.small, { color: theme.textMuted }]}>Status</Text>
          <Text style={[typography.body, { color: theme.text }]}>{job.data.status}</Text>
        </Card>
        {job.data.url ? (
          <Card>
            <Text style={[typography.small, { color: theme.textMuted }]}>Posting URL</Text>
            <Text style={[typography.body, { color: theme.primary }]}>{job.data.url}</Text>
          </Card>
        ) : null}
        {job.data.description ? (
          <Card>
            <Text style={[typography.small, { color: theme.textMuted, marginBottom: spacing.sm }]}>Description</Text>
            <Text style={[typography.body, { color: theme.text }]}>{job.data.description}</Text>
          </Card>
        ) : null}
      </Screen>
    </>
  );
}
