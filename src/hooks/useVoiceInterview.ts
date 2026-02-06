import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ResumeData } from '@/types/resume';

export type InterviewStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'interviewer';
  text: string;
  timestamp: Date;
}

interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string }; isFinal?: boolean }; length: number };
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const SILENCE_TIMEOUT_MS = 3000;
const MAX_TEXT_LENGTH = 2000;

export function useVoiceInterview(resumeData: ResumeData | null) {
  const [status, setStatus] = useState<InterviewStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [silenceDetected, setSilenceDetected] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const messagesRef = useRef<{ role: string; content: string }[]>([]);
  const jobDescriptionRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const finalTextRef = useRef('');
  const isListeningRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopListeningRef = useRef<() => Promise<void>>();

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  const addEntry = useCallback((role: 'user' | 'interviewer', text: string) => {
    const entry: TranscriptEntry = {
      id: crypto.randomUUID(),
      role,
      text,
      timestamp: new Date(),
    };
    setTranscript((prev) => [...prev, entry]);
    return entry;
  }, []);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      utteranceRef.current = utterance;

      utterance.onend = () => {
        setStatus('idle');
        resolve();
      };
      utterance.onerror = () => {
        setStatus('idle');
        resolve();
      };

      setStatus('speaking');
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const callAI = useCallback(
    async (endInterview = false) => {
      setStatus('thinking');
      try {
        const { data, error: fnError } = await supabase.functions.invoke('interview-chat', {
          body: {
            messages: messagesRef.current,
            resumeData,
            jobDescription: jobDescriptionRef.current || undefined,
            endInterview,
          },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        const reply = data.reply as string;
        messagesRef.current.push({ role: 'assistant', content: reply });

        if (endInterview) {
          setSummary(reply);
          addEntry('interviewer', reply);
          setStatus('idle');
        } else {
          addEntry('interviewer', reply);
          await speak(reply);
        }
      } catch (err: any) {
        console.error('AI call error:', err);
        setError(err.message || 'Failed to get AI response');
        setStatus('idle');
      }
    },
    [resumeData, addEntry, speak]
  );

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setSilenceDetected(false);
  }, []);

  const stopListening = useCallback(async () => {
    if (!recognitionRef.current && !finalTextRef.current.trim()) return;

    // Clear silence timer
    clearSilenceTimer();
    isListeningRef.current = false;

    // Use abort() for instant stop — don't wait for more results
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    const userText = finalTextRef.current.trim();
    finalTextRef.current = '';
    setInterimText('');

    if (!userText) {
      setStatus('idle');
      return;
    }

    addEntry('user', userText);
    messagesRef.current.push({ role: 'user', content: userText });
    await callAI();
  }, [addEntry, callAI, clearSilenceTimer]);

  // Keep ref in sync so silence timer can call it
  useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    window.speechSynthesis.cancel();
    finalTextRef.current = '';
    clearSilenceTimer();

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    isListeningRef.current = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if ((event.results[i] as any).isFinal) {
          finalTextRef.current += text + ' ';

          // Reset silence timer on every final result
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setSilenceDetected(false);

          // Max-length guard
          if (finalTextRef.current.length > MAX_TEXT_LENGTH) {
            stopListeningRef.current?.();
            return;
          }

          // Start silence countdown
          setSilenceDetected(true);
          silenceTimerRef.current = setTimeout(() => {
            // Auto-submit after silence
            stopListeningRef.current?.();
          }, SILENCE_TIMEOUT_MS);
        } else {
          interim = text;
          // Any interim result means user is still speaking — reset silence
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
            setSilenceDetected(false);
          }
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // Only restart if still actively listening AND silence timer hasn't auto-stopped
      if (isListeningRef.current && silenceTimerRef.current !== null) {
        try {
          recognition.start();
        } catch {
          // already started or disposed
        }
      } else if (isListeningRef.current && !finalTextRef.current.trim()) {
        // No speech captured yet and browser timed out — restart to keep listening
        try {
          recognition.start();
        } catch {
          // already started or disposed
        }
      }
    };

    recognition.start();
    setStatus('listening');
    setInterimText('');
  }, [clearSilenceTimer]);

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      addEntry('user', text);
      messagesRef.current.push({ role: 'user', content: text });
      await callAI();
    },
    [addEntry, callAI]
  );

  const startInterview = useCallback(
    async (jobDescription?: string) => {
      setError(null);
      setSummary(null);
      setTranscript([]);
      setElapsedSeconds(0);
      messagesRef.current = [];
      jobDescriptionRef.current = jobDescription || '';
      setIsStarted(true);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);

      messagesRef.current.push({ role: 'user', content: 'Start the interview. Introduce yourself and ask your first question.' });
      await callAI();
    },
    [callAI]
  );

  const endInterview = useCallback(async () => {
    isListeningRef.current = false;
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    window.speechSynthesis.cancel();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    messagesRef.current.push({
      role: 'user',
      content: 'The interview is now over. Please provide your summary and feedback.',
    });
    await callAI(true);
    setIsStarted(false);
  }, [callAI, clearSilenceTimer]);

  const resetInterview = useCallback(() => {
    isListeningRef.current = false;
    clearSilenceTimer();
    if (recognitionRef.current) recognitionRef.current.abort();
    window.speechSynthesis.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('idle');
    setTranscript([]);
    setIsStarted(false);
    setSummary(null);
    setError(null);
    setInterimText('');
    setElapsedSeconds(0);
    messagesRef.current = [];
    jobDescriptionRef.current = '';
    finalTextRef.current = '';
  }, [clearSilenceTimer]);

  return {
    status,
    transcript,
    isStarted,
    summary,
    error,
    interimText,
    speechSupported,
    elapsedSeconds,
    silenceDetected,
    startInterview,
    startListening,
    stopListening,
    sendTextMessage,
    endInterview,
    resetInterview,
  };
}
