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

/**
 * Prod `job_applications` columns: id, user_id, job_title, company,
 * status, url, notes, applied_at, deadline, … Verified 2026-05-03.
 * There is no `position` / `job_url` / `job_description` column on this
 * table — the description is pasted into `notes`.
 */
interface JobRow {
  id: string;
  job_title: string;
  company: string;
  status: string;
  url: string | null;
  notes: string | null;
  updated_at: string;
}

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.identity?.userId);
  const job = useQuery({
    queryKey: ['job', id],
    enabled: !!id && !!userId,
    queryFn: async () => {
      const rows = await rest<JobRow[]>('job_applications', {
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
          <Text style={[typography.title, { color: theme.text }]}>{job.data.job_title}</Text>
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
        {job.data.notes ? (
          <Card>
            <Text style={[typography.small, { color: theme.textMuted, marginBottom: spacing.sm }]}>Notes</Text>
            <Text style={[typography.body, { color: theme.text }]}>{job.data.notes}</Text>
          </Card>
        ) : null}
      </Screen>
    </>
  );
}
