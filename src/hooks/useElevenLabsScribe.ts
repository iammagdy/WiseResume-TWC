import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useSettingsStore } from '@/store/settingsStore';

interface UseElevenLabsScribeOptions {
  onPartialTranscript?: (text: string) => void;
  onCommittedTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
  onConnected?: () => void;
}

const CONNECTION_TIMEOUT_MS = 5000;

export function useElevenLabsScribe(options: UseElevenLabsScribeOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionFailed, setConnectionFailed] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const optionsRef = useRef(options);
  const tokenCacheRef = useRef<{ token: string; expiresAt: number } | null>(null);
  optionsRef.current = options;

  const cleanup = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setPartialTranscript('');
    setAudioLevel(0);
  }, []);

  // Pre-fetch token (can be called before connect for faster startup)
  const prefetchToken = useCallback(async () => {
    const { elevenlabsApiKey } = useSettingsStore.getState();
    
    // Return cached token if still valid (with 30s buffer)
    if (tokenCacheRef.current && tokenCacheRef.current.expiresAt > Date.now() + 30000) {
      console.log('[ElevenLabs] Using cached token');
      return tokenCacheRef.current.token;
    }

    try {
      console.log('[ElevenLabs] Fetching scribe token...');
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token', {
        body: { customApiKey: elevenlabsApiKey || undefined },
      });

      if (error || !data?.token) {
        const msg = error?.message || data?.error || 'Failed to get scribe token';
        console.error('[ElevenLabs] Token fetch failed:', msg);
        throw new Error(msg);
      }

      console.log('[ElevenLabs] Token fetched successfully');
      // Cache token for 14 minutes (tokens expire in 15 min)
      tokenCacheRef.current = {
        token: data.token,
        expiresAt: Date.now() + 14 * 60 * 1000,
      };

      return data.token;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get scribe token';
      console.error('[ElevenLabs] Token error:', errorMessage);
      optionsRef.current.onError?.(errorMessage);
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    cleanup();
    setConnectionFailed(false);

    try {
      // Get token (use cache if available)
      const token = await prefetchToken();
      if (!token) {
        setConnectionFailed(true);
        return;
      }

      // Request microphone
      console.log('[ElevenLabs] Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      console.log('[ElevenLabs] Microphone acquired');

      // Open WebSocket with connection timeout
      console.log('[ElevenLabs] Opening WebSocket...');
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=en&sample_rate=16000&token=${token}`
      );
      wsRef.current = ws;

      // Connection timeout
      const timeoutId = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('[ElevenLabs] WebSocket connection timeout after 5s');
          setConnectionFailed(true);
          optionsRef.current.onError?.('ElevenLabs connection timed out');
          cleanup();
        }
      }, CONNECTION_TIMEOUT_MS);

      ws.onopen = async () => {
        clearTimeout(timeoutId);
        console.log('[ElevenLabs] WebSocket connected');
        setIsConnected(true);
        setConnectionFailed(false);
        optionsRef.current.onConnected?.();

        // Set up AudioContext + ScriptProcessor for PCM capture
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);

        // Use ScriptProcessorNode (widely supported) for PCM capture
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate RMS for audio level visualization
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          const normalizedLevel = Math.min(1, rms * 5);
          setAudioLevel(normalizedLevel);
          optionsRef.current.onAudioLevel?.(normalizedLevel);
          
          // Convert float32 to int16
          const int16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          // Convert to base64
          const bytes = new Uint8Array(int16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          ws.send(JSON.stringify({ audio: base64 }));
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
        workletNodeRef.current = processor as any;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'partial_transcript' && msg.text) {
            setPartialTranscript(msg.text);
            optionsRef.current.onPartialTranscript?.(msg.text);
          } else if (msg.type === 'committed_transcript' && msg.text) {
            console.log('[ElevenLabs] Committed transcript:', msg.text);
            setPartialTranscript('');
            optionsRef.current.onCommittedTranscript?.(msg.text);
          } else if (msg.type === 'session_started') {
            console.log('[ElevenLabs] Session started:', msg);
          }
        } catch {}
      };

      ws.onerror = (event) => {
        clearTimeout(timeoutId);
        console.error('[ElevenLabs] WebSocket error:', event);
        setConnectionFailed(true);
        optionsRef.current.onError?.('WebSocket connection error');
        cleanup();
      };

      ws.onclose = (event) => {
        clearTimeout(timeoutId);
        console.log('[ElevenLabs] WebSocket closed, code:', event.code, 'reason:', event.reason);
        setIsConnected(false);
        setAudioLevel(0);
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to speech recognition';
      console.error('[ElevenLabs] Connect error:', errorMessage);
      setConnectionFailed(true);
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        optionsRef.current.onError?.('Microphone access denied. Please allow microphone access and try again.');
      } else {
        optionsRef.current.onError?.(errorMessage);
      }
      cleanup();
    }
  }, [cleanup, prefetchToken]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    connect,
    disconnect,
    prefetchToken,
    isConnected,
    partialTranscript,
    audioLevel,
    connectionFailed,
  };
}
