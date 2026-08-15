import * as completionHealth from '../../../appwrite-hubs/admin-devkit-data/src/completion-health.js';

export interface CompletionStatusEntry {
  status?: string;
  latencyMs?: number;
}

export function formatCompletionStatus(healthStatus: string | undefined, results: CompletionStatusEntry[]) {
  const summary = completionHealth.classifyCompletionStatuses(results);

  if (summary.status === 'no_recorded_probe') {
    return { label: healthStatus === 'error' ? 'Unavailable' : 'No recorded probe', tone: 'text-white/35' };
  }
  if (summary.status === 'healthy') {
    return { label: `Healthy${summary.healthyLatencyMs ? ` (${summary.healthyLatencyMs}ms)` : ''}`, tone: 'text-emerald-400' };
  }
  if (summary.status === 'mixed') return { label: 'Degraded / Mixed', tone: 'text-amber-400' };

  const status = summary.status.replaceAll('_', ' ');
  return { label: status.charAt(0).toUpperCase() + status.slice(1), tone: 'text-amber-400' };
}
