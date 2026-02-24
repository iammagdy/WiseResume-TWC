import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';

interface UseElevenLabsScribeOptions {
  onPartialTranscript?: (text: string) => void;
  onCommittedTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
  onConnected?: () => void;
}

const CONNECTION_TIMEOUT_MS = 5000;
const DEV = import.meta.env.DEV;

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
      audioContextRef.current.close().catch(() => { });
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
  // The edge function now retrieves the ElevenLabs key server-side from user_api_keys;
  // no API key is ever sent in the request body.
  const prefetchToken = useCallback(async () => {
    // Return cached token if still valid (with 30s buffer)
    if (tokenCacheRef.current && tokenCacheRef.current.expiresAt > Date.now() + 30000) {
      if (DEV) console.log('[ElevenLabs] Using cached token');
      return tokenCacheRef.current.token;
    }

    try {
      if (DEV) console.log('[ElevenLabs] Fetching scribe token...');
      // No customApiKey in body — server looks up user's key from encrypted DB store
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token', {
        body: {},
      });

      if (error || !data?.token) {
        const msg = error?.message || data?.error || 'Failed to get scribe token';
        console.error('[ElevenLabs] Token fetch failed:', msg);
        throw new Error(msg);
      }

      if (DEV) console.log('[ElevenLabs] Token fetched successfully');
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
      if (DEV) console.log('[ElevenLabs] Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      if (DEV) console.log('[ElevenLabs] Microphone acquired');

      // Open WebSocket with connection timeout
      if (DEV) console.log('[ElevenLabs] Opening WebSocket...');
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
        if (DEV) console.log('[ElevenLabs] WebSocket connected');
        setIsConnected(true);
        setConnectionFailed(false);
        optionsRef.current.onConnected?.();

        // Create AudioContext at native sample rate — don't force 16kHz (many browsers ignore it)
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const nativeRate = audioContext.sampleRate;
        const targetRate = 16000;
        const ratio = nativeRate / targetRate;

        if (DEV) console.log(`[ElevenLabs] Native sample rate: ${nativeRate}, downsample ratio: ${ratio.toFixed(2)}`);

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

          // Downsample from native rate to 16kHz if needed
          let samples: Float32Array;
          if (Math.abs(ratio - 1) < 0.01) {
            // Already at target rate
            samples = inputData;
          } else {
            // Simple linear interpolation downsampling
            const outputLength = Math.floor(inputData.length / ratio);
            samples = new Float32Array(outputLength);
            for (let i = 0; i < outputLength; i++) {
              const srcIndex = i * ratio;
              const srcFloor = Math.floor(srcIndex);
              const srcCeil = Math.min(srcFloor + 1, inputData.length - 1);
              const t = srcIndex - srcFloor;
              samples[i] = inputData[srcFloor] * (1 - t) + inputData[srcCeil] * t;
            }
          }

          // Convert float32 to int16
          const int16 = new Int16Array(samples.length);
          for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
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
            // DEV-only: transcript text is sensitive user speech data
            if (DEV) console.log('[ElevenLabs] Committed transcript:', msg.text);
            setPartialTranscript('');
            optionsRef.current.onCommittedTranscript?.(msg.text);
          } else if (msg.type === 'session_started') {
            if (DEV) console.log('[ElevenLabs] Session started:', msg);
          }
        } catch { }
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
        if (DEV) console.log('[ElevenLabs] WebSocket closed, code:', event.code, 'reason:', event.reason);
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
