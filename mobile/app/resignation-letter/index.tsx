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

interface ResignationRow { id: string; title: string | null; updated_at: string }

export default function ResignationLettersList() {
  const theme = useTheme();
  const userId = useAuthStore((s) => s.identity?.userId);
  const list = useQuery({
    queryKey: ['resignation-letters', userId],
    enabled: !!userId,
    queryFn: () =>
      rest<ResignationRow[]>('resignation_letters', {
        method: 'GET',
        select: '*',
        query: { user_id: `eq.${userId}`, order: 'updated_at.desc' },
      }),
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Resignation letters' }} />
      <Screen scroll={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[typography.heading, { color: theme.text }]}>All</Text>
          <Button title="New" onPress={() => router.push('/resignation-letter/new')} />
        </View>
        <FlatList
          data={list.data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}
          ListEmptyComponent={
            list.isLoading ? null : (
              <EmptyState
                title="No resignation letters yet"
                description="Draft a respectful resignation letter in seconds."
                actionLabel="Create one"
                onAction={() => router.push('/resignation-letter/new')}
              />
            )
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/resignation-letter/${item.id}`)}>
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
