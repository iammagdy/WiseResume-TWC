import { useAIHealthStore, deriveHealthStatus, deriveLatency, deriveLastChecked, deriveErrorCode } from '@/store/aiHealthStore';

export type AIHealthStatus = 'healthy' | 'degraded' | 'down';

export interface AIHealthData {
  status: AIHealthStatus;
  latencyMs: number | null;
  lastChecked: Date | null;
  provider: 'wiseresume';
  errorCode: number | null;
}

export function useAIHealth() {
  const results = useAIHealthStore((s) => s.results);

  return {
    status: deriveHealthStatus(results),
    latencyMs: deriveLatency(results),
    lastChecked: deriveLastChecked(results),
    provider: 'wiseresume' as const,
    errorCode: deriveErrorCode(results),
    refetch: () => { },
  };
}
