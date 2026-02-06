import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsStore } from '@/store/settingsStore';

interface UseElevenLabsScribeOptions {
  onPartialTranscript?: (text: string) => void;
  onCommittedTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useElevenLabsScribe(options: UseElevenLabsScribeOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const optionsRef = useRef(options);
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
  }, []);

  const connect = useCallback(async () => {
    cleanup();

    const { elevenlabsApiKey } = useSettingsStore.getState();

    try {
      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token', {
        body: { customApiKey: elevenlabsApiKey || undefined },
      });

      if (error || !data?.token) {
        const msg = error?.message || data?.error || 'Failed to get scribe token';
        optionsRef.current.onError?.(msg);
        return;
      }

      const token = data.token;

      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Open WebSocket
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=en&sample_rate=16000&token=${token}`
      );
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);

        // Set up AudioContext + ScriptProcessor for PCM capture
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);

        // Use ScriptProcessorNode (widely supported) for PCM capture
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);
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
        // Store processor ref for cleanup
        workletNodeRef.current = processor as any;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'partial_transcript' && msg.text) {
            setPartialTranscript(msg.text);
            optionsRef.current.onPartialTranscript?.(msg.text);
          } else if (msg.type === 'committed_transcript' && msg.text) {
            setPartialTranscript('');
            optionsRef.current.onCommittedTranscript?.(msg.text);
          }
        } catch {}
      };

      ws.onerror = () => {
        optionsRef.current.onError?.('WebSocket connection error');
        cleanup();
      };

      ws.onclose = () => {
        setIsConnected(false);
      };
    } catch (err: any) {
      const msg = err.message || 'Failed to connect to speech recognition';
      if (msg.includes('Permission denied') || msg.includes('NotAllowedError')) {
        optionsRef.current.onError?.('Microphone access denied. Please allow microphone access and try again.');
      } else {
        optionsRef.current.onError?.(msg);
      }
      cleanup();
    }
  }, [cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    connect,
    disconnect,
    isConnected,
    partialTranscript,
  };
}
