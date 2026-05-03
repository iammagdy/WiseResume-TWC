import React from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { useMe } from '@/hooks/useMe';
import { useResumes } from '@/hooks/useResumes';
import { useAuthStore } from '@/state/authStore';

const QUICK_ACTIONS = [
  { key: 'new-resume', label: 'New resume', icon: '📄', href: '/resume/new' as const },
  { key: 'practice', label: 'Practice interview', icon: '🎤', href: '/interview/new' as const },
  { key: 'cover-letter', label: 'Cover letter', icon: '✉️', href: '/cover-letter/new' as const },
  { key: 'job', label: 'Save a job', icon: '💼', href: '/job/new' as const },
];

export default function Dashboard() {
  const theme = useTheme();
  const identity = useAuthStore((s) => s.identity);
  const me = useMe();
  const resumes = useResumes();

  const refreshing = me.isFetching || resumes.isFetching;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            me.refetch();
            resumes.refetch();
          }}
          tintColor={theme.primary}
        />
      }
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.small, { color: theme.textMuted }]}>Welcome back</Text>
        <Text style={[typography.title, { color: theme.text }]}>
          {identity?.name ?? identity?.email ?? 'You'}
        </Text>
      </View>

      <Card elevated>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[typography.small, { color: theme.textMuted }]}>Plan</Text>
            <Text style={[typography.heading, { color: theme.text }]}>
              {me.data?.plan ? me.data.plan.toUpperCase() : 'FREE'}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/paywall')}>
            <Text style={[typography.body, { color: theme.primary, fontWeight: '600' }]}>Upgrade →</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.grid}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.key}
            onPress={() => router.push(a.href)}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={{ fontSize: 28 }}>{a.icon}</Text>
            <Text style={[typography.body, { color: theme.text, fontWeight: '600' }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        <Text style={[typography.heading, { color: theme.text }]}>Recent resumes</Text>
        {resumes.data && resumes.data.length > 0 ? (
          resumes.data.slice(0, 3).map((r) => (
            <Pressable key={r.id} onPress={() => router.push(`/resume/${r.id}`)}>
              <Card>
                <Text style={[typography.body, { color: theme.text, fontWeight: '600' }]}>
                  {r.title || 'Untitled resume'}
                </Text>
                <Text style={[typography.small, { color: theme.textMuted }]}>
                  Updated {new Date(r.updated_at).toLocaleDateString()}
                </Text>
              </Card>
            </Pressable>
          ))
        ) : (
          <Card>
            <Text style={[typography.body, { color: theme.textMuted }]}>
              You don&apos;t have any resumes yet. Create your first one to get started.
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '47%',
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    minHeight: 100,
  },
});
