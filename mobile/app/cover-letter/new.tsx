import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { callEdgeFunction } from '@/lib/api';
import { useResumes } from '@/hooks/useResumes';

interface GenerateResponse { id: string }

/**
 * The deployed `generate-cover-letter` edge function (web flavour) requires
 * a full `resume` object plus a `jobDescription` string. Mobile lets the
 * user pick from their existing resumes and paste a JD. The body shape is
 * intentionally camelCase to match the web caller — verified by reading
 * supabase/functions/generate-cover-letter/index.ts on 2026-05-03.
 */
export default function NewCoverLetter() {
  const theme = useTheme();
  const resumes = useResumes();
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [tone, setTone] = useState('professional');
  const [jobDescription, setJobDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => resumes.data ?? [], [resumes.data]);
  useEffect(() => {
    if (!resumeId && list.length > 0) setResumeId(list[0].id);
  }, [list, resumeId]);

  const generate = async () => {
    if (!jobTitle.trim() || !company.trim()) {
      Alert.alert('Missing info', 'Job title and company are required.');
      return;
    }
    if (!jobDescription.trim()) {
      Alert.alert('Missing info', 'Paste the job description so we can tailor the letter.');
      return;
    }
    if (!resumeId) {
      Alert.alert('No resume', 'Create a resume first so we can pull your details into the letter.');
      return;
    }
    const picked = list.find((r) => r.id === resumeId);
    if (!picked) {
      Alert.alert('Resume not found', 'Please pick a resume.');
      return;
    }
    setBusy(true);
    try {
      // Prod resumes are stored as section columns (contact_info, summary,
      // experience, …) — repackage them into the shape the edge function
      // expects (`resume.contactInfo`, `resume.experience`, etc).
      const resumePayload = {
        contactInfo: picked.contact_info ?? {},
        summary: picked.summary ?? '',
        experience: picked.experience ?? [],
        education: picked.education ?? [],
        skills: picked.skills ?? [],
        certifications: picked.certifications ?? [],
      };
      const res = await callEdgeFunction<GenerateResponse>('generate-cover-letter', {
        body: {
          resume: resumePayload,
          resumeId,
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          jobDescription: jobDescription.trim(),
          tone,
        },
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
        <Input
          label="Job description"
          value={jobDescription}
          onChangeText={setJobDescription}
          multiline
          numberOfLines={6}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        <Card>
          <Text style={[typography.small, { color: theme.textMuted, marginBottom: spacing.sm }]}>
            Resume to tailor from
          </Text>
          {list.length === 0 ? (
            <Text style={[typography.body, { color: theme.textMuted }]}>
              You have no resumes yet. Create one first.
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {list.map((r) => {
                const selected = resumeId === r.id;
                return (
                  <Pressable key={r.id} onPress={() => setResumeId(r.id)}>
                    <View
                      style={{
                        padding: spacing.md,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: selected ? theme.primary : theme.border ?? '#444',
                        backgroundColor: selected ? theme.primary + '22' : 'transparent',
                      }}
                    >
                      <Text style={[typography.body, { color: theme.text }]}>
                        {r.title || 'Untitled resume'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
        <Button title="Generate" onPress={generate} loading={busy} />
      </Screen>
    </>
  );
}
