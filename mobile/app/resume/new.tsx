import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { rest } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';
import type { ResumeRow } from '@/hooks/useResumes';

export default function NewResume() {
  const userId = useAuthStore((s) => s.identity?.userId);
  const [title, setTitle] = useState('Untitled resume');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      // Prod `resumes` columns: template_id (text), title (text), and
      // section columns (contact_info, summary, experience, education,
      // skills, …) — all jsonb. There is NO `content` or `data` column.
      // Verified 2026-05-03 against Supabase project jnsfmkzgxsviuthaqlyy.
      const created = await rest<ResumeRow[]>('resumes', {
        method: 'POST',
        body: { user_id: userId, title, template_id: 'modern' },
        select: '*',
        extraHeaders: { Prefer: 'return=representation' },
      });
      const newId = created[0]?.id;
      if (newId) router.replace(`/resume/${newId}`);
    } catch (err) {
      Alert.alert('Could not create resume', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New resume' }} />
      <Screen>
        <Input label="Title" value={title} onChangeText={setTitle} autoFocus />
        <Button title="Create" onPress={create} loading={busy} />
      </Screen>
    </>
  );
}
