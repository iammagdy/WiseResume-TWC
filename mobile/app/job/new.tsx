import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { rest } from '@/lib/api';
import { useAuthStore } from '@/state/authStore';

interface SavedJob { id: string }

/**
 * Prod table is `job_applications` (NOT saved_jobs). Columns used here:
 * job_title, company, url, status. Verified 2026-05-03 against Supabase
 * project jnsfmkzgxsviuthaqlyy.
 */
export default function NewJob() {
  const userId = useAuthStore((s) => s.identity?.userId);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!userId || !jobTitle.trim() || !company.trim()) {
      Alert.alert('Missing info', 'Job title and company are required.');
      return;
    }
    setBusy(true);
    try {
      const rows = await rest<SavedJob[]>('job_applications', {
        method: 'POST',
        body: {
          user_id: userId,
          job_title: jobTitle.trim(),
          company: company.trim(),
          url: url.trim() || null,
          status: 'saved',
        },
        select: 'id',
        extraHeaders: { Prefer: 'return=representation' },
      });
      const id = rows[0]?.id;
      if (id) router.replace(`/job/${id}`);
    } catch (err) {
      Alert.alert('Could not save job', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Save a job' }} />
      <Screen>
        <Input testID="job-title-input" label="Job title" value={jobTitle} onChangeText={setJobTitle} autoFocus />
        <Input testID="job-company-input" label="Company" value={company} onChangeText={setCompany} />
        <Input label="Posting URL (optional)" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" />
        <Button testID="job-save-button" title="Save job" onPress={save} loading={busy} />
      </Screen>
    </>
  );
}
