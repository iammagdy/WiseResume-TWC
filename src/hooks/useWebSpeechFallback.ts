import { useState, useRef, useCallback, useEffect } from 'react';

interface WebSpeechFallbackOptions {
  onPartialTranscript?: (text: string) => void;
  onCommittedTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
  onNoSpeech?: () => void;
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function isWebSpeechSupported(): boolean {
  return !!SpeechRecognitionAPI;
}

export function useWebSpeechFallback(options: WebSpeechFallbackOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const restartingRef = useRef(false);
  const optionsRef = useRef(options);
  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  optionsRef.current = options;

  const NO_SPEECH_TIMEOUT = 10000;

  const clearNoSpeechTimer = useCallback(() => {
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
  }, []);

  const startNoSpeechTimer = useCallback(() => {
    clearNoSpeechTimer();
    noSpeechTimerRef.current = setTimeout(() => {
      console.log('[WebSpeech] No speech detected after 10s');
      optionsRef.current.onNoSpeech?.();
    }, NO_SPEECH_TIMEOUT);
  }, [clearNoSpeechTimer]);

  const stopAudioAnalysis = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        const level = Math.min(1, avg * 3);
        setAudioLevel(level);
        optionsRef.current.onAudioLevel?.(level);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Audio analysis is optional; proceed without it
    }
  }, []);

  const safeRestartRecognition = useCallback(() => {
    if (!recognitionRef.current || !isListeningRef.current || restartingRef.current) return;
    restartingRef.current = true;
    try {
      recognitionRef.current.start();
      console.log('[WebSpeech] Recognition restarted');
    } catch (e) {
      console.warn('[WebSpeech] Failed to restart recognition:', e);
      // If start fails, try after a brief delay
      setTimeout(() => {
        if (isListeningRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            console.log('[WebSpeech] Recognition restarted (delayed)');
          } catch (e2) {
            console.warn('[WebSpeech] Delayed restart also failed:', e2);
            setIsConnected(false);
          }
        }
        restartingRef.current = false;
      }, 200);
      return;
    }
    restartingRef.current = false;
  }, []);

  const cleanup = useCallback(() => {
    console.log('[WebSpeech] Cleanup');
    isListeningRef.current = false;
    restartingRef.current = false;
    clearNoSpeechTimer();
    stopAudioAnalysis();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsConnected(false);
    setPartialTranscript('');
    setAudioLevel(0);
  }, [clearNoSpeechTimer, stopAudioAnalysis]);

  const connect = useCallback(async () => {
    cleanup();

    if (!SpeechRecognitionAPI) {
      console.error('[WebSpeech] SpeechRecognition API not supported');
      optionsRef.current.onError?.('Speech recognition is not supported in this browser. Please use text input.');
      return;
    }

    console.log('[WebSpeech] Starting recognition');
    isListeningRef.current = true;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log('[WebSpeech] Recognition started');
      setIsConnected(true);
      startNoSpeechTimer();
    };

    recognition.onresult = (event: any) => {
      clearNoSpeechTimer();
      startNoSpeechTimer();

      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) {
        setPartialTranscript(interim);
        optionsRef.current.onPartialTranscript?.(interim);
      }

      if (finalText) {
        console.log('[WebSpeech] Final transcript:', finalText);
        setPartialTranscript('');
        optionsRef.current.onCommittedTranscript?.(finalText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[WebSpeech] Error:', event.error);
      clearNoSpeechTimer();

      switch (event.error) {
        case 'not-allowed':
          optionsRef.current.onError?.('Microphone blocked. Please allow microphone access in your browser settings.');
          cleanup();
          break;
        case 'no-speech':
          // Chrome stops recognition on no-speech — explicitly restart it
          console.log('[WebSpeech] No speech detected, restarting recognition...');
          if (isListeningRef.current) {
            startNoSpeechTimer();
            // Chrome fires onend after no-speech error, which triggers restart
            // But add a safety timeout in case onend doesn't fire
            setTimeout(() => {
              if (isListeningRef.current && !restartingRef.current) {
                safeRestartRecognition();
              }
            }, 500);
          }
          break;
        case 'network':
          optionsRef.current.onError?.('Speech recognition service unavailable. Please check your connection or use text input.');
          cleanup();
          break;
        case 'aborted':
          // Intentional abort, do nothing
          break;
        default:
          optionsRef.current.onError?.(`Speech recognition error: ${event.error}`);
          break;
      }
    };

    recognition.onend = () => {
      console.log('[WebSpeech] Recognition ended, isListening:', isListeningRef.current);
      if (isListeningRef.current) {
        // Auto-restart if user still wants to listen
        safeRestartRecognition();
      } else {
        setIsConnected(false);
      }
    };

    try {
      await startAudioAnalysis();
      recognition.start();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start speech recognition';
      console.error('[WebSpeech] Start error:', msg);
      optionsRef.current.onError?.(msg);
      cleanup();
    }
  }, [cleanup, clearNoSpeechTimer, startNoSpeechTimer, startAudioAnalysis]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    connect,
    disconnect,
    isConnected,
    partialTranscript,
    audioLevel,
  };
}
