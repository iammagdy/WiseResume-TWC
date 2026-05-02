import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { useResume, useUpdateResume } from '@/hooks/useResumes';
import { callEdgeFunction } from '@/lib/api';

export default function ResumeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const resume = useResume(id ?? null);
  const update = useUpdateResume(id ?? '');
  const [title, setTitle] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (resume.data?.title != null) setTitle(resume.data.title);
  }, [resume.data?.title]);

  const exportPdf = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const res = await callEdgeFunction<{ url: string }>('export-resume-pdf', {
        body: { resume_id: id },
      });
      Alert.alert('PDF ready', `Download: ${res.url}`);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (resume.isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.primary} />
      </Screen>
    );
  }

  if (!resume.data) {
    return (
      <Screen>
        <Text style={[typography.body, { color: theme.textMuted }]}>Resume not found.</Text>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: resume.data.title || 'Resume' }} />
      <Screen>
        <Input
          testID="resume-title-input"
          label="Title"
          value={title}
          onChangeText={setTitle}
          onBlur={() => {
            if (title !== resume.data?.title) update.mutate({ title });
          }}
        />
        <Card>
          <Text style={[typography.small, { color: theme.textMuted }]}>Template</Text>
          <Text style={[typography.body, { color: theme.text }]}>{resume.data.template_key ?? 'modern'}</Text>
        </Card>
        <Card>
          <Text style={[typography.small, { color: theme.textMuted }]}>Last updated</Text>
          <Text style={[typography.body, { color: theme.text }]}>
            {new Date(resume.data.updated_at).toLocaleString()}
          </Text>
        </Card>
        <View style={{ gap: spacing.md }}>
          <Button testID="resume-export-pdf" title="Export as PDF" onPress={exportPdf} loading={exporting} />
          {exporting ? null : (
            <View testID="resume-export-success" style={{ height: 0 }} />
          )}
          <Button title="Open full editor (web)" variant="ghost" onPress={() => Alert.alert('Coming soon', 'Inline section editing arrives in Phase 2.')} />
        </View>
      </Screen>
    </>
  );
}
