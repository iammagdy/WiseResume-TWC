import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useSettingsStore } from '@/store/settingsStore';

export type AIHealthStatus = 'healthy' | 'degraded' | 'down' | 'checking';

export interface AIHealthData {
  status: AIHealthStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
  provider: 'wiseresume' | 'gemini';
  errorCode: number | null;
}

const POLL_INTERVAL = 60_000; // 60s

export function useAIHealth() {
  const [health, setHealth] = useState<AIHealthData>({
    status: 'checking',
    latencyMs: null,
    lastChecked: null,
    provider: 'wiseresume',
    errorCode: null,
  });

  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const geminiApiKey = useSettingsStore((s) => s.geminiApiKey);
  const geminiKeyValidated = useSettingsStore((s) => s.geminiKeyValidated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastShownRef = useRef(false);

  const fetchHealth = useCallback(async () => {
    try {
      const useGemini = aiProvider === 'gemini' && geminiApiKey && geminiKeyValidated;

      const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-health`);
      if (useGemini) {
        url.searchParams.set('userGeminiKey', geminiApiKey);
      }

      const resp = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });

      if (!resp.ok) {
        setHealth({
          status: 'down',
          latencyMs: null,
          lastChecked: new Date(),
          provider: useGemini ? 'gemini' : 'wiseresume',
          errorCode: resp.status,
        });
        return;
      }

      const data = await resp.json();
      setHealth({
        status: data.status as AIHealthStatus,
        latencyMs: data.latencyMs,
        lastChecked: new Date(data.timestamp),
        provider: data.provider,
        errorCode: data.errorCode,
      });
    } catch {
      setHealth((prev) => ({
        ...prev,
        status: 'down',
        lastChecked: new Date(),
        errorCode: 0,
      }));
    }
  }, [aiProvider, geminiApiKey, geminiKeyValidated]);

  useEffect(() => {
    fetchHealth();

    intervalRef.current = setInterval(fetchHealth, POLL_INTERVAL);

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        fetchHealth();
        intervalRef.current = setInterval(fetchHealth, POLL_INTERVAL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchHealth]);

  return { ...health, refetch: fetchHealth, toastShownRef };
}
