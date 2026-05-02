import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { callEdgeFunction } from '@/lib/api';

interface GenerateResponse { id: string }

export default function NewResignationLetter() {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [noticeDays, setNoticeDays] = useState('14');
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (!role.trim() || !company.trim()) {
      Alert.alert('Missing info', 'Role and company are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await callEdgeFunction<GenerateResponse>('generate-resignation-letter', {
        body: { role: role.trim(), company: company.trim(), notice_days: Number(noticeDays) || 14 },
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
        <Input label="Your role" value={role} onChangeText={setRole} autoFocus />
        <Input label="Company" value={company} onChangeText={setCompany} />
        <Input label="Notice period (days)" value={noticeDays} onChangeText={setNoticeDays} keyboardType="number-pad" />
        <Button title="Generate" onPress={generate} loading={busy} />
      </Screen>
    </>
  );
}
