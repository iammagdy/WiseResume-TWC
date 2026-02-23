import { useAIHealthStore, deriveHealthStatus, deriveLatency, deriveLastChecked, deriveErrorCode } from '@/store/aiHealthStore';
import { useSettingsStore } from '@/store/settingsStore';

export type AIHealthStatus = 'healthy' | 'degraded' | 'down';

export interface AIHealthData {
  status: AIHealthStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
  provider: 'wiseresume' | 'gemini';
  errorCode: number | null;
}

export function useAIHealth() {
  const results = useAIHealthStore((s) => s.results);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const geminiApiKey = useSettingsStore((s) => s.geminiApiKey);
  const geminiKeyValidated = useSettingsStore((s) => s.geminiKeyValidated);

  const provider: 'wiseresume' | 'gemini' =
    aiProvider === 'gemini' && geminiKeyValidated ? 'gemini' : 'wiseresume';

  return {
    status: deriveHealthStatus(results),
    latencyMs: deriveLatency(results),
    lastChecked: deriveLastChecked(results),
    provider,
    errorCode: deriveErrorCode(results),
    refetch: () => { }, // no-op — status is derived from real calls
  };
}
