import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { rest } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

interface CoverLetterRow { id: string; title: string | null; updated_at: string }

export default function CoverLettersList() {
  const theme = useTheme();
  const userId = useAuthStore((s) => s.identity?.userId);
  const list = useQuery({
    queryKey: ['cover-letters', userId],
    enabled: !!userId,
    queryFn: () =>
      rest<CoverLetterRow[]>('cover_letters', {
        method: 'GET',
        select: '*',
        query: { user_id: `eq.${userId}`, order: 'updated_at.desc' },
      }),
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Cover letters' }} />
      <Screen scroll={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[typography.heading, { color: theme.text }]}>All</Text>
          <Button title="New" onPress={() => router.push('/cover-letter/new')} />
        </View>
        <FlatList
          data={list.data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
          ListEmptyComponent={
            list.isLoading ? null : (
              <EmptyState
                title="No cover letters yet"
                description="Generate a tailored cover letter from any saved job."
                actionLabel="Create one"
                onAction={() => router.push('/cover-letter/new')}
              />
            )
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/cover-letter/${item.id}`)}>
              <Card>
                <Text style={[typography.body, { color: theme.text, fontWeight: '600' }]}>{item.title || 'Untitled'}</Text>
                <Text style={[typography.small, { color: theme.textMuted }]}>
                  Updated {new Date(item.updated_at).toLocaleDateString()}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      </Screen>
    </>
  );
}
