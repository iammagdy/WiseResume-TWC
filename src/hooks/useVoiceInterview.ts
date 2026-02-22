import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { ResumeData } from '@/types/resume';
import { useElevenLabsScribe } from './useElevenLabsScribe';
import { useWebSpeechFallback, isWebSpeechSupported } from './useWebSpeechFallback';
import { useAICreditsMutations } from './useAICredits';
import { toast } from 'sonner';


export type InterviewStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'ready';

export type VoiceGender = 'male' | 'female';

export type SttEngine = 'elevenlabs' | 'webspeech' | 'none';

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

const SILENCE_TIMEOUT_MS = 5000;
const MAX_TEXT_LENGTH = 2000;
const COUNTDOWN_SECONDS = 2;
const NO_SPEECH_TIMEOUT_MS = 10000;

const FEMALE_VOICE_KEYWORDS = ['female', 'samantha', 'zira', 'karen', 'fiona', 'moira', 'tessa', 'victoria', 'google uk english female', 'google us english female', 'microsoft zira'];
const MALE_VOICE_KEYWORDS = ['male', 'daniel', 'david', 'james', 'alex', 'fred', 'google uk english male', 'google us english male', 'microsoft david'];

function pickBestVoice(gender: VoiceGender): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
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

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!sharedAudioContext) {
    const ContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (ContextClass) sharedAudioContext = new ContextClass();
  }
  return sharedAudioContext;
}

function ensureAudioReady(ctx: AudioContext): Promise<AudioContext> {
  if (ctx.state === 'suspended') return ctx.resume().then(() => ctx);
  return Promise.resolve(ctx);
}

function playBeep(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) { resolve(); return; }

      const play = () => {
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
        setTimeout(() => { oscillator.disconnect(); gain.disconnect(); resolve(); }, 250);
      };

      ensureAudioReady(ctx).then(play).catch(() => resolve());
    } catch { resolve(); }
  });
}

function playDoubleBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  ensureAudioReady(ctx).then(() => {
    // First beep
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.connect(g1); g1.connect(ctx.destination);
    osc1.frequency.value = 440; osc1.type = 'sine';
    g1.gain.setValueAtTime(0.2, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.15);

    // Second beep (lower pitch, slight delay)
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.frequency.value = 350; osc2.type = 'sine';
    g2.gain.setValueAtTime(0.2, ctx.currentTime + 0.2);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc2.start(ctx.currentTime + 0.2); osc2.stop(ctx.currentTime + 0.35);

    setTimeout(() => {
      osc1.disconnect(); g1.disconnect();
      osc2.disconnect(); g2.disconnect();
    }, 500);
  }).catch(() => {});
}

function parseScoreBlock(text: string): { cleanText: string; score: AnswerScore | null } {
  const scoreRegex = /---SCORE---\s*([\s\S]*?)\s*---END_SCORE---/;
  const match = text.match(scoreRegex);
  const cleanText = match ? text.replace(scoreRegex, '').trim() : text;

  if (match) {
    // Try robust JSON extraction (handles code blocks, nested objects, etc.)
    try {
      // First try direct parse
      let parsed = null;
      try {
        parsed = JSON.parse(match[1].trim());
      } catch {
        // Try extracting JSON from within the block (handles markdown wrapping)
        const jsonMatch = match[1].match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        }
      }
      if (parsed && typeof parsed.score === 'number') {
        return {
          cleanText,
          score: {
            questionIndex: 0,
            score: Math.min(10, Math.max(0, parsed.score)),
            tip: parsed.tip || '',
            improvedAnswer: parsed.improved_answer || '',
          },
        };
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: try to extract score from the text itself (e.g. "Score: 7/10" or "**Score: 8/10**")
  const fallbackScoreMatch = cleanText.match(/\bscore[:\s]*\*?\*?(\d{1,2})\s*\/\s*10/i);
  if (fallbackScoreMatch) {
    const score = Math.min(10, Math.max(0, parseInt(fallbackScoreMatch[1], 10)));
    return {
      cleanText,
      score: {
        questionIndex: 0,
        score,
        tip: '',
        improvedAnswer: '',
      },
    };
  }

  return { cleanText, score: null };
}

export function useVoiceInterview(resumeData: ResumeData | null) {
  const { checkCredits, incrementUsage } = useAICreditsMutations();
  const [status, setStatus] = useState<InterviewStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [silenceDetected, setSilenceDetected] = useState(false);
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('wiseresume_interview_voice') : null;
    return (saved === 'male' || saved === 'female') ? saved : 'female';
  });
  const setVoiceGender = useCallback((gender: VoiceGender) => {
    setVoiceGenderState(gender);
    localStorage.setItem('wiseresume_interview_voice', gender);
  }, []);
  const [scores, setScores] = useState<AnswerScore[]>([]);
  const [latestScore, setLatestScore] = useState<AnswerScore | null>(null);
  const [roleAnalysis, setRoleAnalysis] = useState<RoleAnalysis | null>(null);
  const [isAnalyzingRole, setIsAnalyzingRole] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sttEngine, setSttEngine] = useState<SttEngine>('none');

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
  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usingFallbackRef = useRef(false);
  const quickPracticeRef = useRef(false);
  const noSpeechCountRef = useRef(0);

  // Shared transcript handlers
  const handlePartialTranscript = useCallback((text: string) => {
    setInterimText(text);
    // Reset silence timer on partial transcripts
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      setSilenceDetected(false);
    }
    // Reset no-speech timer
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
  }, []);

  const handleCommittedTranscript = useCallback((text: string) => {
    setInterimText('');
    finalTextRef.current += text + ' ';

    if (finalTextRef.current.length > MAX_TEXT_LENGTH) {
      stopListeningRef.current?.();
      return;
    }

    setSilenceDetected(true);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stopListeningRef.current?.();
    }, SILENCE_TIMEOUT_MS);
  }, []);

  const handleSttError = useCallback((msg: string) => {
    console.error('STT error:', msg);
    setError(msg);
  }, []);

  const handleAudioLevel = useCallback((level: number) => {
    setAudioLevel(level);
  }, []);

  const handleNoSpeechEscalateRef = useRef<() => void>();
  
  const handleNoSpeech = useCallback(() => {
    noSpeechCountRef.current++;
    if (noSpeechCountRef.current === 1) {
      // First timeout: gentle nudge + audio cue
      toast.info('Take your time, I\'m still listening...', {
        description: 'Speak when you\'re ready, or tap the Type button.',
        duration: 4000,
      });
      playDoubleBeep();
      // Set another timeout for second escalation
      noSpeechTimerRef.current = setTimeout(() => {
        if (isListeningRef.current && !finalTextRef.current.trim()) {
          handleNoSpeechEscalateRef.current?.();
        }
      }, NO_SPEECH_TIMEOUT_MS);
    } else {
      handleNoSpeechEscalateRef.current?.();
    }
  }, []);

  // ElevenLabs Scribe hook
  const scribe = useElevenLabsScribe({
    onPartialTranscript: handlePartialTranscript,
    onCommittedTranscript: handleCommittedTranscript,
    onError: (msg) => {
      handleSttError(msg);
      // If ElevenLabs fails on connect, try fallback
      if (!usingFallbackRef.current && isWebSpeechSupported()) {
        console.log('[VoiceInterview] ElevenLabs failed, switching to Web Speech API fallback');
        usingFallbackRef.current = true;
        setSttEngine('webspeech');
        toast.info('Switched to browser speech recognition');
        if (isListeningRef.current) {
          webSpeech.connect();
        }
      }
    },
    onAudioLevel: handleAudioLevel,
    onConnected: () => {
      console.log('[VoiceInterview] ElevenLabs connected successfully');
      setSttEngine('elevenlabs');
    },
  });

  // Web Speech fallback hook
  const webSpeech = useWebSpeechFallback({
    onPartialTranscript: handlePartialTranscript,
    onCommittedTranscript: handleCommittedTranscript,
    onError: handleSttError,
    onAudioLevel: handleAudioLevel,
    onNoSpeech: handleNoSpeech,
  });

  // Check if speech is actually supported
  const speechSupported = isWebSpeechSupported() || !!navigator.mediaDevices?.getUserMedia;

  useEffect(() => {
    // Pre-load voices
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis?.getVoices();
      };
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
      window.speechSynthesis?.cancel();
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
      try {
        if (!window.speechSynthesis) {
          resolve();
          return;
        }
        window.speechSynthesis?.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        const voice = pickBestVoice(voiceGender);
        if (voice) utterance.voice = voice;
        
        utterance.rate = 0.95;
        utterance.pitch = voiceGender === 'female' ? 1.05 : 0.9;
        utterance.lang = 'en-US';
        utteranceRef.current = utterance;

        utterance.onend = async () => {
          if (ttsSafetyTimer) clearTimeout(ttsSafetyTimer);
          try {
            for (let i = COUNTDOWN_SECONDS; i >= 1; i--) {
              setCountdown(i);
              await new Promise(r => setTimeout(r, 1000));
            }
            setCountdown(null);
            await playBeep();
            startListeningAfterSpeakRef.current?.();
          } catch (e) {
            console.error('Error in speak onend:', e);
          }
          resolve();
        };
        utterance.onerror = () => {
          if (ttsSafetyTimer) clearTimeout(ttsSafetyTimer);
          setStatus('idle');
          resolve();
        };

        // Fix #10: TTS onend safety timeout — auto-resolve if onend doesn't fire
        const wordCount = text.split(/\s+/).length;
        const estimatedDurationMs = Math.max(3000, (wordCount / 2.5) * 1000 + 2000);
        const ttsSafetyTimer = setTimeout(async () => {
          console.warn('[VoiceInterview] TTS onend safety timeout triggered after', estimatedDurationMs, 'ms');
          window.speechSynthesis?.cancel();
          try {
            for (let i = COUNTDOWN_SECONDS; i >= 1; i--) {
              setCountdown(i);
              await new Promise(r => setTimeout(r, 1000));
            }
            setCountdown(null);
            await playBeep();
            startListeningAfterSpeakRef.current?.();
          } catch (e) {
            console.error('Error in TTS safety timeout:', e);
          }
          resolve();
        }, estimatedDurationMs);

        setStatus('speaking');
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Error in speak:', e);
        setStatus('idle');
        resolve();
      }
    });
  }, [voiceGender]);

  const callAI = useCallback(
    async (endInterview = false) => {
      const hasCredits = await checkCredits();
      if (!hasCredits) {
        setStatus('idle');
        return;
      }
      setStatus('thinking');

      // Show "taking longer" toast after 8 seconds
      const slowTimer = setTimeout(() => {
        toast.info('Taking longer than usual...', {
          description: 'Wise AI is thinking hard. Hang tight!',
          duration: 3000,
        });
      }, 8000);

      try {
        // Fix #5: Sliding window — keep first 2 messages + last 16 to manage context size
        const allMessages = messagesRef.current;
        const windowedMessages = allMessages.length > 18
          ? [...allMessages.slice(0, 2), ...allMessages.slice(-16)]
          : allMessages;

        const aiPromise = supabase.functions.invoke('interview-chat', {
          body: {
            messages: windowedMessages,
            resumeData,
            jobDescription: jobDescriptionRef.current || undefined,
            endInterview,
            quickPractice: quickPracticeRef.current || undefined,
          },
        });

        // 60-second safety timeout (edge function has its own retry logic)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI response timed out. Please try again.')), 60000)
        );

        const { data, error: fnError } = await Promise.race([aiPromise, timeoutPromise]);

        // Extract actual error message from response body (supabase client puts parsed body in data even on error)
        if (fnError) {
          const msg = data?.error || data?.message || fnError?.message || 'Interview request failed';
          throw new Error(typeof msg === 'string' ? msg : 'Interview request failed');
        }
        if (data?.error) throw new Error(data.error);

        incrementUsage.mutate();

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
      } catch (err: unknown) {
        console.error('AI call error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
        setError(errorMessage);
        toast.error('Interview error', { description: errorMessage });
        setStatus('idle');
      } finally {
        clearTimeout(slowTimer);
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

  const disconnectCurrentSTT = useCallback(() => {
    scribe.disconnect();
    webSpeech.disconnect();
  }, [scribe, webSpeech]);

  // Wire up the escalation ref now that all dependencies are declared
  useEffect(() => {
    handleNoSpeechEscalateRef.current = () => {
      if (isListeningRef.current) {
        clearSilenceTimer();
        isListeningRef.current = false;
        disconnectCurrentSTT();
        finalTextRef.current = '';
        setInterimText('');
        addEntry('user', '(no response)');
        messagesRef.current.push({ role: 'user', content: '(no response)' });
        callAI();
      }
    };
  }, [addEntry, callAI, clearSilenceTimer, disconnectCurrentSTT]);

  const stopListening = useCallback(async () => {
    clearSilenceTimer();
    isListeningRef.current = false;
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
    disconnectCurrentSTT();

    const userText = finalTextRef.current.trim();
    finalTextRef.current = '';
    setInterimText('');

    if (!userText) {
      // Send silence marker so AI re-prompts naturally
      addEntry('user', '(silence)');
      messagesRef.current.push({ role: 'user', content: '(silence)' });
      await callAI();
      return;
    }

    addEntry('user', userText);
    messagesRef.current.push({ role: 'user', content: userText });
    await callAI();
  }, [addEntry, callAI, clearSilenceTimer, disconnectCurrentSTT]);

  useEffect(() => {
    stopListeningRef.current = stopListening;
  }, [stopListening]);

  const startListening = useCallback(async () => {
    window.speechSynthesis?.cancel();
    finalTextRef.current = '';
    clearSilenceTimer();
    isListeningRef.current = true;
    noSpeechCountRef.current = 0;

    setStatus('listening');
    setInterimText('');

    // Start no-speech timeout
    noSpeechTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && !finalTextRef.current.trim()) {
        handleNoSpeech();
      }
    }, NO_SPEECH_TIMEOUT_MS);

    // Try ElevenLabs first, unless we already know it failed
    if (usingFallbackRef.current) {
      console.log('[VoiceInterview] Using Web Speech fallback');
      setSttEngine('webspeech');
      await webSpeech.connect();
    } else {
      console.log('[VoiceInterview] Trying ElevenLabs Scribe...');
      await scribe.connect();
    }
  }, [clearSilenceTimer, scribe, webSpeech, handleNoSpeech]);

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
    const hasCredits = await checkCredits();
    if (!hasCredits) return;
    setIsAnalyzingRole(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('interview-chat', {
        body: {
          analyzeRole: true,
          resumeData,
          jobDescription,
        },
      });
      if (fnError) {
        const msg = data?.error || data?.message || fnError?.message || 'Role analysis failed';
        throw new Error(typeof msg === 'string' ? msg : 'Role analysis failed');
      }
      if (data?.error) throw new Error(data.error);
      if (data?.roleAnalysis) {
        setRoleAnalysis(data.roleAnalysis);
        incrementUsage.mutate();
      }
    } catch (err: unknown) {
      console.error('Role analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze role';
      setError(errorMessage);
      toast.error('Role analysis failed', { description: errorMessage });
    } finally {
      setIsAnalyzingRole(false);
    }
  }, [resumeData]);

  const startInterview = useCallback(
    async (jobDescription?: string, quickPractice?: boolean) => {
      setError(null);
      setSummary(null);
      setTranscript([]);
      setElapsedSeconds(0);
      setScores([]);
      setLatestScore(null);
      setAudioLevel(0);
      setSttEngine('none');
      usingFallbackRef.current = false;
      noSpeechCountRef.current = 0;
      answerCountRef.current = 0;
      messagesRef.current = [];
      jobDescriptionRef.current = jobDescription || '';
      quickPracticeRef.current = !!quickPractice;
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
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
    disconnectCurrentSTT();
    window.speechSynthesis?.cancel();
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
  }, [callAI, clearSilenceTimer, disconnectCurrentSTT]);

  const resetInterview = useCallback(() => {
    isListeningRef.current = false;
    clearSilenceTimer();
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
    disconnectCurrentSTT();
    window.speechSynthesis?.cancel();
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
    setSttEngine('none');
    usingFallbackRef.current = false;
    quickPracticeRef.current = false;
    answerCountRef.current = 0;
    messagesRef.current = [];
    jobDescriptionRef.current = '';
    finalTextRef.current = '';
  }, [clearSilenceTimer, disconnectCurrentSTT]);

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
    sttEngine,
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
