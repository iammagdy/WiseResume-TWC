import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/tokens';
import { rest, callEdgeFunction } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

interface ResignationRow { id: string; title: string | null; body: string | null }

export default function ResignationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.identity?.userId);
  const [busy, setBusy] = useState(false);

  const letter = useQuery({
    queryKey: ['resignation-letter', id],
    enabled: !!id && !!userId,
    queryFn: async () => {
      const rows = await rest<ResignationRow[]>('resignation_letters', {
        method: 'GET',
        select: '*',
        query: { id: `eq.${id}`, user_id: `eq.${userId}`, limit: 1 },
      });
      return rows[0] ?? null;
    },
  });

  const exportPdf = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const res = await callEdgeFunction<{ url: string }>('export-resignation-letter-pdf', {
        body: { resignation_letter_id: id },
      });
      Alert.alert('PDF ready', `Download: ${res.url}`);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (letter.isLoading) return <Screen><ActivityIndicator color={theme.primary} /></Screen>;
  if (!letter.data) return <Screen><Text style={[typography.body, { color: theme.textMuted }]}>Not found.</Text></Screen>;

  return (
    <>
      <Stack.Screen options={{ title: letter.data.title || 'Resignation letter' }} />
      <Screen>
        <Card>
          <Text style={[typography.body, { color: theme.text, lineHeight: 22 }]}>{letter.data.body ?? ''}</Text>
        </Card>
        <Button title="Export as PDF" onPress={exportPdf} loading={busy} />
      </Screen>
    </>
  );
}
