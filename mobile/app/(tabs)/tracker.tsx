import React from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { rest } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

/**
 * Prod table is `job_applications` (NOT saved_jobs). Columns: id, user_id,
 * job_title, company, status, url, applied_at, deadline, … Verified
 * 2026-05-03 against project jnsfmkzgxsviuthaqlyy.
 */
interface JobRow {
  id: string;
  user_id: string;
  job_title: string;
  company: string;
  status: string;
  applied_at: string | null;
  updated_at: string;
}

export default function TrackerTab() {
  const theme = useTheme();
  const userId = useAuthStore((s) => s.identity?.userId);
  const jobs = useQuery({
    queryKey: ['jobs', userId],
    enabled: !!userId,
    queryFn: () =>
      rest<JobRow[]>('job_applications', {
        method: 'GET',
        select: '*',
        query: { user_id: `eq.${userId}`, order: 'updated_at.desc' },
      }),
  });

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.title, { color: theme.text }]}>Tracker</Text>
        <Button testID="new-job-button" title="Save job" onPress={() => router.push('/job/new')} />
      </View>
      <FlatList
        data={jobs.data ?? []}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl * 2 }}
        refreshControl={
          <RefreshControl refreshing={jobs.isFetching} onRefresh={jobs.refetch} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          jobs.isLoading ? null : (
            <EmptyState
              title="No applications yet"
              description="Save a job from a posting URL or paste a description to get started."
              actionLabel="Save your first job"
              onAction={() => router.push('/job/new')}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/job/${item.id}`)}>
            <Card>
              <Text style={[typography.body, { color: theme.text, fontWeight: '600' }]}>{item.job_title}</Text>
              <Text style={[typography.small, { color: theme.textMuted }]}>
                {item.company} · {item.status}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
