import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { typography, spacing } from '@/theme/tokens';
import { rest, callMobileAction } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

/**
 * Prod `cover_letters` columns: id, user_id, title, content (TEXT),
 * job_title, company, position, tone, template_style, … Verified
 * 2026-05-03. `content` is plain text (not jsonb) but legacy rows from
 * the newer schema attempt may store `{text: …}`, so coerce both shapes.
 */
interface CoverLetterRow {
  id: string;
  title: string | null;
  content: string | { text?: string } | null;
  updated_at: string;
}

function pickText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'object' && content !== null) {
    const obj = content as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
  }
  return '';
}

export default function CoverLetterDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.identity?.userId);
  const [busy, setBusy] = useState(false);

  const letter = useQuery({
    queryKey: ['cover-letter', id],
    enabled: !!id && !!userId,
    queryFn: async () => {
      const rows = await rest<CoverLetterRow[]>('cover_letters', {
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
      const res = await callMobileAction<{ url: string }>('export-pdf', {
        kind: 'cover_letter',
        id,
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
      <Stack.Screen options={{ title: letter.data.title || 'Cover letter' }} />
      <Screen>
        <Card>
          <Text style={[typography.body, { color: theme.text, lineHeight: 22 }]}>
            {pickText(letter.data.content)}
          </Text>
        </Card>
        <Button title="Export as PDF" onPress={exportPdf} loading={busy} />
        <Text style={[typography.small, { color: theme.textMuted, marginTop: spacing.lg }]}>
          Inline editing arrives in Phase 2 — for now, edit on the web and pull to refresh.
        </Text>
      </Screen>
    </>
  );
}
