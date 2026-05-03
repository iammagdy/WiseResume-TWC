import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { callEdgeFunction } from '@/lib/api';

interface GenerateResponse { id: string }

/**
 * Body shape matches the deployed `generate-resignation-letter` web caller:
 * camelCase keys (position, recipientName, noticePeriod). Verified
 * 2026-05-03 against supabase/functions/generate-resignation-letter/index.ts.
 */
export default function NewResignationLetter() {
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [noticeDays, setNoticeDays] = useState('14');
  const [tone, setTone] = useState('professional');
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!position.trim() || !company.trim()) {
      Alert.alert('Missing info', 'Role and company are required.');
      return;
    }
    setBusy(true);
    try {
      const days = Number(noticeDays) || 14;
      const noticePeriod =
        days <= 7 ? '1_week' : days <= 14 ? '2_weeks' : days <= 21 ? '3_weeks' : days <= 31 ? '1_month' : '2_months';
      const res = await callEdgeFunction<GenerateResponse>('generate-resignation-letter', {
        body: {
          position: position.trim(),
          company: company.trim(),
          recipientName: recipientName.trim() || 'Hiring Manager',
          noticePeriod,
          tone,
        },
      });
      router.replace(`/resignation-letter/${res.id}`);
    } catch (err) {
      Alert.alert('Generation failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New resignation letter' }} />
      <Screen>
        <Input label="Your role" value={position} onChangeText={setPosition} autoFocus />
        <Input label="Company" value={company} onChangeText={setCompany} />
        <Input label="Manager name (optional)" value={recipientName} onChangeText={setRecipientName} />
        <Input label="Notice period (days)" value={noticeDays} onChangeText={setNoticeDays} keyboardType="number-pad" />
        <Input label="Tone" value={tone} onChangeText={setTone} />
        <Button title="Generate" onPress={generate} loading={busy} />
      </Screen>
    </>
  );
}
