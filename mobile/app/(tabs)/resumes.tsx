import React from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { useResumes } from '@/hooks/useResumes';

export default function ResumesTab() {
  const theme = useTheme();
  const resumes = useResumes();

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.title, { color: theme.text }]}>Resumes</Text>
        <Button title="New" onPress={() => router.push('/resume/new')} />
      </View>
      <FlatList
        data={resumes.data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl * 2 }}
        refreshControl={
          <RefreshControl refreshing={resumes.isFetching} onRefresh={resumes.refetch} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          resumes.isLoading ? null : (
            <EmptyState
              title="No resumes yet"
              description="Create your first resume from a template, or import an existing PDF."
              actionLabel="Create resume"
              onAction={() => router.push('/resume/new')}
            />
          )
        }
        renderItem={({ item, index: i }) => (
          <Pressable testID={`resume-row-${i}`} onPress={() => router.push(`/resume/${item.id}`)}>
            <Card>
              <Text style={[typography.body, { color: theme.text, fontWeight: '600' }]}>
                {item.title || 'Untitled resume'}
              </Text>
              <Text style={[typography.small, { color: theme.textMuted }]}>
                Updated {new Date(item.updated_at).toLocaleDateString()} · {item.template_key ?? 'modern'}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
