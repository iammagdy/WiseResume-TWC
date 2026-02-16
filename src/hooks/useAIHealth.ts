import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export type AIHealthStatus = 'healthy' | 'degraded' | 'down' | 'checking';

export interface AIHealthData {
  status: AIHealthStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
  provider: 'wiseresume' | 'gemini';
  errorCode: number | null;
}

// Adaptive intervals
const POLL_HEALTHY = 300_000;  // 5 min
const POLL_DEGRADED = 60_000;  // 1 min
const POLL_DOWN = 30_000;      // 30s
const CONSECUTIVE_FAILS_THRESHOLD = 2;

function getInterval(status: AIHealthStatus) {
  if (status === 'down') return POLL_DOWN;
  if (status === 'degraded') return POLL_DEGRADED;
  return POLL_HEALTHY;
}

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
  const failCountRef = useRef(0);
  const hasEverBeenHealthyRef = useRef(false);
  const isInitialCheckRef = useRef(true);

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
        failCountRef.current++;
        const resolvedStatus = failCountRef.current >= CONSECUTIVE_FAILS_THRESHOLD ? 'down' : 'degraded';
        setHealth({
          status: resolvedStatus,
          latencyMs: null,
          lastChecked: new Date(),
          provider: useGemini ? 'gemini' : 'wiseresume',
          errorCode: resp.status,
        });
        isInitialCheckRef.current = false;
        return;
      }

      const data = await resp.json();
      const incomingStatus = data.status as AIHealthStatus;

      // On success, reset fail count
      failCountRef.current = 0;
      if (incomingStatus === 'healthy') {
        hasEverBeenHealthyRef.current = true;
      }

      setHealth({
        status: incomingStatus,
        latencyMs: data.latencyMs,
        lastChecked: new Date(data.timestamp),
        provider: data.provider,
        errorCode: data.errorCode,
      });
    } catch {
      failCountRef.current++;
      const resolvedStatus = failCountRef.current >= CONSECUTIVE_FAILS_THRESHOLD ? 'down' : 'degraded';
      setHealth((prev) => ({
        ...prev,
        status: resolvedStatus,
        lastChecked: new Date(),
        errorCode: 0,
      }));
    }
    isInitialCheckRef.current = false;
  }, [aiProvider, geminiApiKey, geminiKeyValidated]);

  // Adaptive polling: restart interval whenever status changes
  useEffect(() => {
    fetchHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchHealth]);

  useEffect(() => {
    if (health.status === 'checking') return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchHealth, getInterval(health.status));

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        fetchHealth();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(fetchHealth, getInterval(health.status));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [health.status, fetchHealth]);

  return { ...health, refetch: fetchHealth, hasEverBeenHealthyRef };
}
