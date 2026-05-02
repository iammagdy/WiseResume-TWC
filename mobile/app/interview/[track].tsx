import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { decode as decodeBase64 } from 'base-64';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme/tokens';
import { callEdgeFunction } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';

interface Question {
  id: string;
  prompt: string;
}
interface Feedback {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

const RECORDING_BUCKET = 'interview-audio';

/**
 * Uploads a local file:// recording to private Storage and returns
 * the storage path (NOT a signed URL — the edge function will sign
 * it server-side with the service role). This avoids the original
 * bug where we were sending a `file://` URI to a server that has no
 * way to read it.
 */
async function uploadRecording(localUri: string, userId: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = decodeBase64(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const path = `${userId}/${Date.now()}.m4a`;
  const { error } = await supabase.storage.from(RECORDING_BUCKET).upload(path, bytes, {
    contentType: 'audio/m4a',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export default function InterviewSession() {
  const { track } = useLocalSearchParams<{ track: string }>();
  const theme = useTheme();
  const userId = useAuthStore((s) => s.identity?.userId);
  const [question, setQuestion] = useState<Question | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchQuestion = async () => {
    setBusy(true);
    setFeedback(null);
    setTranscript('');
    try {
      const q = await callEdgeFunction<Question>('interview-next-question', {
        body: { track },
      });
      setQuestion(q);
    } catch (err) {
      Alert.alert('Could not load question', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone needed', 'Enable mic access in Settings to practice out loud.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const r = new Audio.Recording();
      await r.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await r.startAsync();
      setRecording(r);
    } catch (err) {
      Alert.alert('Recording failed', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const gradeWithTranscript = async (text: string, audioPath?: string) => {
    if (!question) return;
    const fb = await callEdgeFunction<Feedback>('interview-grade-answer', {
      body: {
        question_id: question.id,
        prompt: question.prompt,
        track,
        transcript: text,
        audio_path: audioPath,
      },
    });
    setFeedback(fb);
  };

  const stopRecording = async () => {
    if (!recording || !question || !userId) return;
    setBusy(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      let audioPath: string | undefined;
      if (uri) {
        try {
          audioPath = await uploadRecording(uri, userId);
        } catch (err) {
          console.warn('[interview] audio upload failed; falling back to transcript-only', err);
        }
      }
      const note = transcript.trim();
      if (!note && !audioPath) {
        Alert.alert(
          'No transcript',
          'We couldn’t upload the recording. Please type a brief summary of your answer below and try again.',
        );
        return;
      }
      await gradeWithTranscript(note || '(audio recording — see audio_path)', audioPath);
    } catch (err) {
      Alert.alert('Grading failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const gradeTextOnly = async () => {
    if (!question || !transcript.trim()) {
      Alert.alert('Type your answer', 'Add a transcript or recording before grading.');
      return;
    }
    setBusy(true);
    try {
      await gradeWithTranscript(transcript.trim());
    } catch (err) {
      Alert.alert('Grading failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: typeof track === 'string' ? track.replace('-', ' ') : 'Practice' }} />
      <Screen>
        {question ? (
          <Card elevated testID="interview-question-card">
            <Text style={[typography.small, { color: theme.textMuted }]}>Question</Text>
            <Text
              testID="interview-question-prompt"
              style={[typography.heading, { color: theme.text, marginTop: spacing.sm }]}
            >
              {question.prompt}
            </Text>
          </Card>
        ) : (
          <Card>
            <Text style={[typography.body, { color: theme.textMuted }]}>
              Tap “Next question” to begin. Speak your answer out loud or type it below.
            </Text>
          </Card>
        )}

        <Input
          label="Transcript (optional — fall-back if mic upload fails)"
          value={transcript}
          onChangeText={setTranscript}
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />

        <View style={{ gap: spacing.md }}>
          <Button
            testID="interview-next-button"
            title="Next question"
            onPress={fetchQuestion}
            loading={busy && !recording}
          />
          {recording ? (
            <Button title="Stop & grade" variant="destructive" onPress={stopRecording} />
          ) : (
            <>
              <Button title="Record answer" variant="secondary" onPress={startRecording} disabled={!question} />
              <Button
                title="Grade typed answer"
                variant="ghost"
                onPress={gradeTextOnly}
                disabled={!question || !transcript.trim() || busy}
              />
            </>
          )}
        </View>

        {feedback ? (
          <Card testID="interview-feedback-card">
            <Text style={[typography.small, { color: theme.textMuted }]}>Score: {feedback.score}/100</Text>
            <Text style={[typography.body, { color: theme.text, marginTop: spacing.sm }]}>{feedback.summary}</Text>
          </Card>
        ) : null}
      </Screen>
    </>
  );
}
