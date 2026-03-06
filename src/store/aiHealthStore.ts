import { create } from 'zustand';

export type AIHealthStatus = 'healthy' | 'degraded' | 'down';

interface AICallResult {
  success: boolean;
  latencyMs: number;
  errorCode: number | null;
  timestamp: number;
}

interface AIHealthState {
  results: AICallResult[];
  lastProviderUsed: string | null;
  recordSuccess: (latencyMs: number) => void;
  recordFailure: (errorCode: number) => void;
  recordProvider: (provider: string) => void;
}

const MAX_RESULTS = 5;

export const useAIHealthStore = create<AIHealthState>((set) => ({
  results: [],
  lastProviderUsed: null,
  recordSuccess: (latencyMs: number) =>
    set((state) => ({
      results: [...state.results, { success: true, latencyMs, errorCode: null, timestamp: Date.now() }].slice(-MAX_RESULTS),
    })),
  recordFailure: (errorCode: number) =>
    set((state) => ({
      results: [...state.results, { success: false, latencyMs: 0, errorCode, timestamp: Date.now() }].slice(-MAX_RESULTS),
    })),
  recordProvider: (provider: string) =>
    set({ lastProviderUsed: provider }),
}));

/** Derive health status from recent results */
export function deriveHealthStatus(results: AICallResult[]): AIHealthStatus {
  if (results.length === 0) return 'healthy'; // optimistic default
  const successes = results.filter((r) => r.success).length;
  if (successes === results.length) return 'healthy';
  if (successes > 0) return 'degraded';
  return 'down';
}

export function deriveLatency(results: AICallResult[]): number | null {
  const successful = results.filter((r) => r.success && r.latencyMs > 0);
  if (successful.length === 0) return null;
  return Math.round(successful.reduce((sum, r) => sum + r.latencyMs, 0) / successful.length);
}

export function deriveLastChecked(results: AICallResult[]): Date | null {
  if (results.length === 0) return null;
  return new Date(results[results.length - 1].timestamp);
}

export function deriveErrorCode(results: AICallResult[]): number | null {
  const lastFailure = [...results].reverse().find((r) => !r.success);
  return lastFailure?.errorCode ?? null;
}

export function deriveLastProvider(lastProviderUsed: string | null): string {
  if (!lastProviderUsed) return '—';
  const map: Record<string, string> = {
    'lovable': 'WiseResume AI',
    'lovable-gateway': 'WiseResume AI',
    'gemini': 'Gemini BYOK',
    'gemini-byok': 'Gemini BYOK',
    'ollama': 'Ollama',
    'lovable-fallback': 'WiseResume (Fallback)',
    'lovable_fallback': 'WiseResume (Fallback)',
    'deterministic': 'Local',
  };
  return map[lastProviderUsed.toLowerCase()] || lastProviderUsed;
}
