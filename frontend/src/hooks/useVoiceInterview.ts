import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { ResumeData } from '@/types/resume';
import { useElevenLabsScribe } from './useElevenLabsScribe';

export type InterviewStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'ready';

export type VoiceGender = 'male' | 'female';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'interviewer';
  text: string;
  timestamp: Date;
}

export interface AnswerScore {
  questionIndex: number;
  score: number;
  tip: string;
  improvedAnswer: string;
}

export interface RoleAnalysis {
  title: string;
  keySkills: string[];
  questionCategories: string[];
  industryInsights: string;
}

const SILENCE_TIMEOUT_MS = 1500; // Reduced from 3000 for faster response
const MAX_TEXT_LENGTH = 2000;
const COUNTDOWN_SECONDS = 1; // Reduced from 3 for snappier flow

// Keywords for voice gender selection
const FEMALE_VOICE_KEYWORDS = ['female', 'samantha', 'zira', 'karen', 'fiona', 'moira', 'tessa', 'victoria', 'google uk english female', 'google us english female', 'microsoft zira'];
const MALE_VOICE_KEYWORDS = ['male', 'daniel', 'david', 'james', 'alex', 'fred', 'google uk english male', 'google us english male', 'microsoft david'];

function pickBestVoice(gender: VoiceGender): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  if (englishVoices.length === 0) return null;

  const keywords = gender === 'female' ? FEMALE_VOICE_KEYWORDS : MALE_VOICE_KEYWORDS;
  
  for (const voice of englishVoices) {
    const name = voice.name.toLowerCase();
    if (keywords.some(k => name.includes(k))) {
      return voice;
    }
  }
  
  const premiumVoice = englishVoices.find(v => {
    const n = v.name.toLowerCase();
    return n.includes('google') || n.includes('microsoft') || n.includes('natural');
  });
  return premiumVoice || englishVoices[0];
}

function playBeep(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 660;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
      setTimeout(() => {
        ctx.close();
        resolve();
      }, 250);
    } catch {
      resolve();
    }
  });
}

function parseScoreBlock(text: string): { cleanText: string; score: AnswerScore | null } {
  const scoreRegex = /---SCORE---\s*(\{[\s\S]*?\})\s*---END_SCORE---/;
  const match = text.match(scoreRegex);
  if (!match) return { cleanText: text, score: null };

  const cleanText = text.replace(scoreRegex, '').trim();
  try {
    const parsed = JSON.parse(match[1]);
    return {
      cleanText,
      score: {
        questionIndex: 0,
        score: parsed.score || 0,
        tip: parsed.tip || '',
        improvedAnswer: parsed.improved_answer || '',
      },
    };
  } catch {
    return { cleanText, score: null };
  }
}

export function useVoiceInterview(resumeData: ResumeData | null) {
  const [status, setStatus] = useState<InterviewStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [silenceDetected, setSilenceDetected] = useState(false);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('female');
  const [scores, setScores] = useState<AnswerScore[]>([]);
  const [latestScore, setLatestScore] = useState<AnswerScore | null>(null);
  const [roleAnalysis, setRoleAnalysis] = useState<RoleAnalysis | null>(null);
  const [isAnalyzingRole, setIsAnalyzingRole] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const messagesRef = useRef<{ role: string; content: string }[]>([]);
  const jobDescriptionRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const finalTextRef = useRef('');
  const isListeningRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopListeningRef = useRef<() => Promise<void>>();
  const startListeningAfterSpeakRef = useRef<() => Promise<void>>();
  const answerCountRef = useRef(0);

  // ElevenLabs Scribe hook
  const scribe = useElevenLabsScribe({
    onPartialTranscript: (text) => {
      setInterimText(text);
      // Reset silence timer on partial transcripts
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
        setSilenceDetected(false);
      }
    },
    onCommittedTranscript: (text) => {
      setInterimText('');
      finalTextRef.current += text + ' ';

      // Check max length
      if (finalTextRef.current.length > MAX_TEXT_LENGTH) {
        stopListeningRef.current?.();
        return;
      }

      // Start silence timer
      setSilenceDetected(true);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        stopListeningRef.current?.();
      }, SILENCE_TIMEOUT_MS);
    },
    onError: (msg) => {
      console.error('Scribe error:', msg);
      setError(msg);
    },
    onAudioLevel: (level) => {
      setAudioLevel(level);
    },
  });

  // Speech is always supported with ElevenLabs Scribe (just needs mic)
  const speechSupported = true;

  useEffect(() => {
    // Pre-load voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
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
      
      const voice = pickBestVoice(voiceGender);
      if (voice) utterance.voice = voice;
      
      utterance.rate = 0.95;
      utterance.pitch = voiceGender === 'female' ? 1.05 : 0.9;
      utterance.lang = 'en-US';
      utteranceRef.current = utterance;

      utterance.onend = async () => {
        // Reduced countdown for snappier experience
        for (let i = COUNTDOWN_SECONDS; i >= 1; i--) {
          setCountdown(i);
          await new Promise(r => setTimeout(r, 1000));
        }
        setCountdown(null);
        await playBeep();
        // Auto-start listening after beep (user's turn)
        startListeningAfterSpeakRef.current?.();
        resolve();
      };
      utterance.onerror = () => {
        setStatus('idle');
        resolve();
      };

      setStatus('speaking');
      window.speechSynthesis.speak(utterance);
    });
  }, [voiceGender]);

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

        const rawReply = data.reply as string;
        const { cleanText: reply, score } = parseScoreBlock(rawReply);
        
        if (score) {
          answerCountRef.current++;
          const fullScore = { ...score, questionIndex: answerCountRef.current };
          setScores(prev => [...prev, fullScore]);
          setLatestScore(fullScore);
        }
        
        messagesRef.current.push({ role: 'assistant', content: rawReply });

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
    clearSilenceTimer();
    isListeningRef.current = false;
    scribe.disconnect();

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
  }, [addEntry, callAI, clearSilenceTimer, scribe]);

  useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  const startListening = useCallback(async () => {
    window.speechSynthesis.cancel();
    finalTextRef.current = '';
    clearSilenceTimer();
    isListeningRef.current = true;

    setStatus('listening');
    setInterimText('');

    await scribe.connect();
  }, [clearSilenceTimer, scribe]);

  useEffect(() => {
    startListeningAfterSpeakRef.current = startListening;
  }, [startListening]);

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      addEntry('user', text);
      messagesRef.current.push({ role: 'user', content: text });
      await callAI();
    },
    [addEntry, callAI]
  );

  const analyzeRole = useCallback(async (jobDescription: string) => {
    setIsAnalyzingRole(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('interview-chat', {
        body: {
          analyzeRole: true,
          resumeData,
          jobDescription,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.roleAnalysis) {
        setRoleAnalysis(data.roleAnalysis);
      }
    } catch (err: any) {
      console.error('Role analysis error:', err);
      setError(err.message || 'Failed to analyze role');
    } finally {
      setIsAnalyzingRole(false);
    }
  }, [resumeData]);

  const startInterview = useCallback(
    async (jobDescription?: string) => {
      setError(null);
      setSummary(null);
      setTranscript([]);
      setElapsedSeconds(0);
      setScores([]);
      setLatestScore(null);
      setAudioLevel(0);
      answerCountRef.current = 0;
      messagesRef.current = [];
      jobDescriptionRef.current = jobDescription || '';
      setIsStarted(true);

      // Pre-fetch token while AI is generating first question
      scribe.prefetchToken();

      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);

      messagesRef.current.push({ role: 'user', content: 'Start the interview. Introduce yourself and ask your first question.' });
      await callAI();
    },
    [callAI, scribe]
  );

  const endInterviewFn = useCallback(async () => {
    isListeningRef.current = false;
    clearSilenceTimer();
    scribe.disconnect();
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
  }, [callAI, clearSilenceTimer, scribe]);

  const resetInterview = useCallback(() => {
    isListeningRef.current = false;
    clearSilenceTimer();
    scribe.disconnect();
    window.speechSynthesis.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('idle');
    setTranscript([]);
    setIsStarted(false);
    setSummary(null);
    setError(null);
    setInterimText('');
    setElapsedSeconds(0);
    setScores([]);
    setLatestScore(null);
    setRoleAnalysis(null);
    setCountdown(null);
    setAudioLevel(0);
    answerCountRef.current = 0;
    messagesRef.current = [];
    jobDescriptionRef.current = '';
    finalTextRef.current = '';
  }, [clearSilenceTimer, scribe]);

  const dismissScore = useCallback(() => {
    setLatestScore(null);
  }, []);

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
    voiceGender,
    setVoiceGender,
    scores,
    latestScore,
    dismissScore,
    countdown,
    audioLevel,
    roleAnalysis,
    isAnalyzingRole,
    analyzeRole,
    startInterview,
    startListening,
    stopListening,
    sendTextMessage,
    endInterview: endInterviewFn,
    resetInterview,
  };
}
