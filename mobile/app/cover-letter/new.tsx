import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { callEdgeFunction } from '@/lib/api';

interface GenerateResponse { id: string }

export default function NewCoverLetter() {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [tone, setTone] = useState('professional');
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!jobTitle.trim() || !company.trim()) {
      Alert.alert('Missing info', 'Job title and company are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await callEdgeFunction<GenerateResponse>('generate-cover-letter', {
        body: { job_title: jobTitle.trim(), company: company.trim(), tone },
      });
      router.replace(`/cover-letter/${res.id}`);
    } catch (err) {
      Alert.alert('Generation failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New cover letter' }} />
      <Screen>
        <Input label="Job title" value={jobTitle} onChangeText={setJobTitle} autoFocus />
        <Input label="Company" value={company} onChangeText={setCompany} />
        <Input label="Tone" value={tone} onChangeText={setTone} />
        <Button title="Generate" onPress={generate} loading={busy} />
      </Screen>
    </>
  );
}
